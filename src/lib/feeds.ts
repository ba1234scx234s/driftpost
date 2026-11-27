// Subscribing, refreshing and removing feeds.

import { db, type Feed, type Item } from "./db";
import { AlreadyFollowingError, discoverFeed, type FindKnown } from "./discover";
import { feedKey } from "./url";
import { buildOpml, OpmlError, parseOpml } from "./opml";
import { parseFeed, type ParsedFeed } from "./parse";
import type { FilterablePost } from "./settings";
import { startOfToday, type View } from "./views";
import { FetchError, fetchViaProxy } from "./proxy";

/** The shortest wait between refreshes of a feed. */
export const REFRESH_INTERVAL_MS = 30 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
/** The longest wait for a feed that still posts, and for one that has gone quiet. */
const MAX_INTERVAL_MS = 4 * HOUR;
const QUIET_INTERVAL_MS = 12 * HOUR;
/** The longest wait after repeated failures. */
const MAX_BACKOFF_MS = 24 * HOUR;
const CONCURRENCY = 4;

/** Finds a followed feed by address, ignoring http/https, www, trailing slashes and tracking tags. */
const findKnown: FindKnown = async (url, asSite) => {
  const key = feedKey(url);
  const feeds = await db.feeds.toArray();
  const hit =
    feeds.find((f) => feedKey(f.url) === key || (f.sourceUrl && feedKey(f.sourceUrl) === key)) ??
    (asSite ? feeds.find((f) => f.siteUrl && feedKey(f.siteUrl) === key) : undefined);
  return hit && { id: hit.id, title: hit.title };
};

export async function subscribe(input: string): Promise<Feed> {
  const { url, feed, response } = await discoverFeed(input, findKnown);

  // The feed may have redirected to a URL we already follow.
  const known = await findKnown(url, false);
  if (known) throw new AlreadyFollowingError(known);
  // The same feed under another address (RSS and Atom versions, a FeedBurner copy…).
  const same = matchFeed(await fingerprints(), feed);
  if (same) throw new AlreadyFollowingError(same);

  const now = Date.now();
  const id = await db.feeds.add({
    url,
    title: feed.title,
    siteUrl: feed.siteUrl,
    // What was typed or picked, so Discover can tell the feed is followed even after a redirect.
    sourceUrl: input.trim(),
    etag: response.etag,
    lastModified: response.lastModified,
    lastFetched: now,
    addedAt: now,
  } as Feed);
  await storeItems(id, feed, now);
  return (await db.feeds.get(id))!;
}

export const MAX_TITLE_LENGTH = 120;

/** Gives a feed your own name. Refreshes won't overwrite it. */
export async function renameFeed(feedId: number, title: string): Promise<void> {
  const clean = title.trim().replace(/\s+/g, " ").slice(0, MAX_TITLE_LENGTH);
  if (!clean) throw new Error("Give the feed a name");
  await db.feeds.update(feedId, { title: clean, renamed: true });
}

export async function unsubscribe(feedId: number): Promise<void> {
  await db.transaction("rw", db.feeds, db.items, async () => {
    await db.items.where("feedId").equals(feedId).delete();
    await db.feeds.delete(feedId);
  });
}

/** When a feed is next due a refresh. */
export function dueAt(feed: Feed): number {
  return feed.nextFetch ?? (feed.lastFetched ?? 0) + REFRESH_INTERVAL_MS;
}

/**
 * How long to wait before fetching a feed again, from how often it posts: a quarter of
 * the usual gap between its last ten posts, at least 30 minutes and at most 4 hours.
 * Feeds quiet for a month wait 12 hours. A feed's own <ttl> is honoured when longer.
 */
async function intervalFor(feedId: number, ttlMinutes: number | undefined, now: number): Promise<number> {
  const recent = await db.items.where("[feedId+published]").between([feedId, -Infinity], [feedId, Infinity]).reverse().limit(10).toArray();
  let wait = REFRESH_INTERVAL_MS;
  if (recent.length >= 2) {
    const newest = recent[0].published;
    const gap = (newest - recent[recent.length - 1].published) / (recent.length - 1);
    wait = now - newest > 30 * 24 * HOUR ? QUIET_INTERVAL_MS : Math.min(MAX_INTERVAL_MS, Math.max(REFRESH_INTERVAL_MS, gap / 4));
  }
  if (ttlMinutes) wait = Math.max(wait, Math.min(ttlMinutes * 60 * 1000, MAX_BACKOFF_MS));
  return wait;
}

/** Fetches one feed and stores new items. Returns how many were new. */
export async function refreshFeed(feed: Feed): Promise<number> {
  const now = Date.now();
  try {
    const res = await fetchViaProxy(feed.url, { etag: feed.etag, lastModified: feed.lastModified });
    if (res.notModified) {
      const wait = await intervalFor(feed.id, feed.ttlMinutes, now);
      await db.feeds.update(feed.id, { lastFetched: now, lastError: undefined, failures: 0, nextFetch: now + wait });
      return 0;
    }
    const parsed = parseFeed(res.text, res.finalUrl);
    // Re-read: the feed may have been renamed or unfollowed while we were fetching.
    const current = await db.feeds.get(feed.id);
    if (!current) return 0;
    const added = await storeItems(feed.id, parsed, now);
    await pruneOldPosts(feed.id, parsed, now);
    const wait = await intervalFor(feed.id, parsed.ttlMinutes, now);
    await db.feeds.update(feed.id, {
      // Keep the feed's own title fresh, unless you renamed it.
      title: current.renamed ? current.title : parsed.title || current.title,
      siteUrl: parsed.siteUrl ?? feed.siteUrl,
      etag: res.etag,
      lastModified: res.lastModified,
      lastFetched: now,
      lastError: undefined,
      ttlMinutes: parsed.ttlMinutes,
      failures: 0,
      nextFetch: now + wait,
    });
    return added;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Refresh failed";
    if (err instanceof FetchError && /offline/i.test(message)) {
      // Our connection, not the feed's fault: try again at the usual time.
      await db.feeds.update(feed.id, { nextFetch: now + REFRESH_INTERVAL_MS });
      return 0;
    }
    // Wait longer after each failure in a row: 1, 2, 4, 8, 16 hours, then once a day.
    const failures = (feed.failures ?? 0) + 1;
    await db.feeds.update(feed.id, {
      lastFetched: now,
      lastError: message,
      failures,
      nextFetch: now + Math.min(MAX_BACKOFF_MS, HOUR * 2 ** (failures - 1)),
    });
    return 0;
  }
}

/**
 * Unread items in a view: everything, today's posts, or one feed.
 * `hidden` is the keyword filter; posts it hides don't count.
 */
export function unreadInView(view: View, hidden: (post: FilterablePost) => boolean = () => false) {
  const since = view === "today" ? startOfToday() : 0;
  return db.items
    .where("read")
    .equals(0)
    .filter(
      (it) =>
        (view === "all" || (view === "today" ? it.published >= since : it.feedId === view)) && !hidden(it),
    );
}

/** Marks every visible unread item in the view as read. Returns their ids so it can be undone. */
export async function markAllRead(view: View, hidden?: (post: FilterablePost) => boolean): Promise<number[]> {
  return db.transaction("rw", db.items, async () => {
    const ids = (await unreadInView(view, hidden).primaryKeys()) as number[];
    await db.items.bulkUpdate(ids.map((key) => ({ key, changes: { read: 1 as const } })));
    return ids;
  });
}

export async function markUnread(ids: number[]): Promise<void> {
  await db.items.bulkUpdate(ids.map((key) => ({ key, changes: { read: 0 as const } })));
}

export interface ImportResult {
  added: number;
  /** Titles of feeds skipped because you already follow them (or the file listed them twice). */
  duplicates: string[];
  failed: number;
}

/**
 * Adds every feed in an OPML file that isn't followed yet.
 * Duplicates are caught three ways: against feeds you follow, within the file
 * itself, and after redirects (two addresses that lead to the same feed).
 * Feeds that fail to load are still added, marked with the error, so a site
 * that is briefly down isn't lost; you can unfollow them afterwards.
 */
export async function importOpml(
  text: string,
  onProgress?: (done: number, total: number) => void,
): Promise<ImportResult> {
  const entries = parseOpml(text);
  if (!entries.length) throw new OpmlError("No feeds found in that file");

  const existing = await db.feeds.toArray();
  // Every address we know, mapped to the feed's title, to explain skips.
  const claimed = new Map<string, string>(existing.map((f) => [feedKey(f.url), f.title]));
  for (const f of existing) if (f.sourceUrl) claimed.set(feedKey(f.sourceUrl), f.title);
  // What followed feeds look like, to spot the same feed under another address.
  const prints = await fingerprints();
  const duplicates: string[] = [];

  const fresh = entries.filter((e) => {
    const key = feedKey(e.url);
    if (claimed.has(key)) {
      duplicates.push(claimed.get(key)!);
      return false;
    }
    claimed.set(key, e.title || e.url);
    return true;
  });

  const now = Date.now();
  let done = 0;
  let added = 0;
  let failed = 0;
  onProgress?.(0, fresh.length);

  await runPool(
    fresh.map((e, order) => ({ e, order })),
    async ({ e, order }) => {
      const title = e.title || new URL(e.url).hostname.replace(/^www\./, "");
      const base = { title, siteUrl: e.siteUrl, folder: e.folder, addedAt: now + order };
      let id: number | undefined;
      try {
        const res = await fetchViaProxy(e.url);
        const parsed = parseFeed(res.text, res.finalUrl);
        // Redirected to a feed you already follow, or one added earlier in this import?
        const finalKey = feedKey(res.finalUrl);
        if (finalKey !== feedKey(e.url)) {
          if (claimed.has(finalKey)) {
            duplicates.push(claimed.get(finalKey)!);
            return;
          }
          claimed.set(finalKey, title);
        }
        // Same title and site, or the same latest posts, as a feed you follow or just imported.
        const same = matchFeed(prints, parsed);
        if (same) {
          duplicates.push(same.title);
          return;
        }
        // Claim it now, before the next await, so a parallel import of a copy sees it.
        const print = fingerprintOf(parsed);
        prints.push(print);
        id = await db.feeds.add({
          ...base,
          url: res.finalUrl,
          title: parsed.title || title,
          siteUrl: parsed.siteUrl ?? e.siteUrl,
          etag: res.etag,
          lastModified: res.lastModified,
          lastFetched: Date.now(),
          sourceUrl: e.url,
        } as Feed);
        print.id = id;
        print.title = parsed.title || title;
        await storeItems(id, parsed, Date.now());
      } catch (err) {
        failed++;
        const lastError = err instanceof Error ? err.message : "Couldn't load this feed";
        if (id !== undefined) {
          // The feed was added but its posts couldn't be saved: keep the one row.
          await db.feeds.update(id, { lastError });
        } else {
          await db.feeds
            .add({ ...base, url: e.url, lastFetched: Date.now(), lastError } as Feed)
            .catch(() => undefined); // already there after all: nothing to add
        }
      } finally {
        onProgress?.(++done, fresh.length);
      }
      added++;
    },
  );

  return { added, duplicates, failed };
}

// --- Recognising the same feed under different addresses ---

interface Fingerprint {
  id: number;
  title: string;
  /** Site address plus feed title, e.g. "daringfireball.net|daring fireball". */
  name?: string;
  /** Addresses of the newest posts. */
  links: Set<string>;
}

const LATEST = 10;

function nameKey(siteUrl: string | undefined, title: string | undefined): string | undefined {
  const t = title?.trim().toLowerCase();
  return siteUrl && t ? `${feedKey(siteUrl)}|${t}` : undefined;
}

function fingerprintOf(parsed: ParsedFeed): Fingerprint {
  const newest = [...parsed.items].sort((a, b) => (b.published ?? 0) - (a.published ?? 0)).slice(0, LATEST);
  return {
    id: -1,
    title: parsed.title,
    name: nameKey(parsed.siteUrl, parsed.title),
    links: new Set(newest.flatMap((it) => (it.link ? [feedKey(it.link)] : []))),
  };
}

async function fingerprints(): Promise<Fingerprint[]> {
  const feeds = await db.feeds.toArray();
  return Promise.all(
    feeds.map(async (f) => {
      const newest = await db.items
        .where("[feedId+published]")
        .between([f.id, -Infinity], [f.id, Infinity])
        .reverse()
        .limit(LATEST)
        .toArray();
      return {
        id: f.id,
        title: f.title,
        // A renamed feed's title is yours, not the feed's, so only its posts can match it.
        name: f.renamed ? undefined : nameKey(f.siteUrl, f.title),
        links: new Set(newest.flatMap((it) => (it.link ? [feedKey(it.link)] : []))),
      };
    }),
  );
}

/**
 * A followed feed that is the same as `parsed`: same site and title, or (nearly) the same
 * newest posts. Section feeds of one site (BBC World next to BBC News) share a few posts
 * but not most of them, so they stay separate.
 */
function matchFeed(prints: Fingerprint[], parsed: ParsedFeed): { id: number; title: string } | undefined {
  const mine = fingerprintOf(parsed);
  return prints.find((p) => {
    if (mine.name && p.name === mine.name) return true;
    return overlap(mine.links, p.links) >= 0.8;
  });
}

/** How much two sets of links agree (0–1), measured against the larger set; 0 when either is too small to judge. */
function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size < 3 || b.size < 3) return 0;
  let shared = 0;
  for (const x of a) if (b.has(x)) shared++;
  return shared / Math.max(a.size, b.size);
}

export async function exportOpml(): Promise<{ text: string; count: number }> {
  const feeds = await db.feeds.orderBy("addedAt").toArray();
  return { text: buildOpml(feeds), count: feeds.length };
}

export async function runPool<T>(list: T[], task: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < list.length) await task(list[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, list.length) }, worker));
}

let running: Promise<number> | null = null;

/**
 * Refreshes the feeds that are due (or every feed with `all`, for the refresh button),
 * a few at a time. Overlapping calls share one run.
 */
export function refreshAll({ all = false }: { all?: boolean } = {}): Promise<number> {
  running ??= (async () => {
    try {
      const now = Date.now();
      const feeds = (await db.feeds.toArray()).filter((f) => all || dueAt(f) <= now);
      let total = 0;
      await runPool(feeds, async (feed) => {
        total += await refreshFeed(feed);
      });
      return total;
    } finally {
      running = null;
    }
  })();
  return running;
}

export function isRefreshing(): boolean {
  return running !== null;
}

/** Read posts are kept this long (by publish date) before they're removed. */
export const KEEP_READ_DAYS = 90;

/**
 * Removes read posts older than 90 days, so storage doesn't grow forever. Starred posts
 * stay, and so do posts the feed still lists: removing those would bring them back as
 * unread on the next refresh.
 */
async function pruneOldPosts(feedId: number, feed: ParsedFeed, now: number): Promise<void> {
  const cutoff = now - KEEP_READ_DAYS * 24 * 60 * 60 * 1000;
  const listed = new Set(feed.items.map((it) => it.guid));
  await db.items
    .where("[feedId+published]")
    .between([feedId, -Infinity], [feedId, cutoff])
    .filter((it) => it.read === 1 && it.starred !== 1 && !listed.has(it.guid))
    .delete();
}

async function storeItems(feedId: number, feed: ParsedFeed, now: number): Promise<number> {
  if (!feed.items.length) return 0;

  // Feeds sometimes repeat an entry; keep the first of each guid.
  const byGuid = new Map(feed.items.map((it) => [it.guid, it] as const));
  const guids = [...byGuid.keys()];

  return db.transaction("rw", db.items, async () => {
    const known = await db.items
      .where("[feedId+guid]")
      .anyOf(guids.map((g) => [feedId, g]))
      .toArray();
    const knownGuids = new Set(known.map((k) => k.guid));

    // Posts saved before tags were kept: add the feed's tags to them now.
    const backfill = known
      .filter((k) => !k.categories && byGuid.get(k.guid)?.categories)
      .map((k) => ({ key: k.id, changes: { categories: byGuid.get(k.guid)!.categories } }));
    if (backfill.length) await db.items.bulkUpdate(backfill);

    const fresh = guids
      .filter((g) => !knownGuids.has(g))
      .map((g, i) => {
        const it = byGuid.get(g)!;
        return {
          feedId,
          guid: g,
          title: it.title,
          link: it.link,
          author: it.author,
          // Undated items keep their feed order by stepping back a millisecond each.
          published: it.published ?? now - i,
          summary: it.summary,
          content: it.content,
          image: it.image,
          categories: it.categories,
          read: 0,
          starred: 0,
          addedAt: now,
        } as Omit<Item, "id">;
      });

    if (fresh.length) await db.items.bulkAdd(fresh as Item[]);
    return fresh.length;
  });
}
