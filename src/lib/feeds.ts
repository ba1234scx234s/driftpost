// Subscribing, refreshing and removing feeds.

import { db, type Feed, type Item } from "./db";
import { AlreadyFollowingError, discoverFeed, type FindKnown } from "./discover";
import { feedKey } from "./url";
import { buildOpml, OpmlError, parseOpml } from "./opml";
import { parseFeed, type ParsedFeed } from "./parse";
import { startOfToday, type View } from "./views";
import { fetchViaProxy } from "./proxy";

export const REFRESH_INTERVAL_MS = 30 * 60 * 1000;
const CONCURRENCY = 4;

/** Finds a followed feed by address, ignoring http/https, www, trailing slashes and tracking tags. */
const findKnown: FindKnown = async (url, asSite) => {
  const key = feedKey(url);
  const feeds = await db.feeds.toArray();
  const hit =
    feeds.find((f) => feedKey(f.url) === key) ??
    (asSite ? feeds.find((f) => f.siteUrl && feedKey(f.siteUrl) === key) : undefined);
  return hit && { id: hit.id, title: hit.title };
};

export async function subscribe(input: string): Promise<Feed> {
  const { url, feed, response } = await discoverFeed(input, findKnown);

  // The feed may have redirected to a URL we already follow.
  const known = await findKnown(url, false);
  if (known) throw new AlreadyFollowingError(known);

  const now = Date.now();
  const id = await db.feeds.add({
    url,
    title: feed.title,
    siteUrl: feed.siteUrl,
    etag: response.etag,
    lastModified: response.lastModified,
    lastFetched: now,
    addedAt: now,
  } as Feed);
  await storeItems(id, feed, now);
  return (await db.feeds.get(id))!;
}

export async function unsubscribe(feedId: number): Promise<void> {
  await db.transaction("rw", db.feeds, db.items, async () => {
    await db.items.where("feedId").equals(feedId).delete();
    await db.feeds.delete(feedId);
  });
}

/** Fetches one feed and stores new items. Returns how many were new. */
export async function refreshFeed(feed: Feed): Promise<number> {
  const now = Date.now();
  try {
    const res = await fetchViaProxy(feed.url, { etag: feed.etag, lastModified: feed.lastModified });
    if (res.notModified) {
      await db.feeds.update(feed.id, { lastFetched: now, lastError: undefined });
      return 0;
    }
    const parsed = parseFeed(res.text, res.finalUrl);
    const added = await storeItems(feed.id, parsed, now);
    await db.feeds.update(feed.id, {
      // Keep the feed's own title fresh; renaming comes in a later milestone.
      title: parsed.title || feed.title,
      siteUrl: parsed.siteUrl ?? feed.siteUrl,
      etag: res.etag,
      lastModified: res.lastModified,
      lastFetched: now,
      lastError: undefined,
    });
    return added;
  } catch (err) {
    await db.feeds.update(feed.id, {
      lastFetched: now,
      lastError: err instanceof Error ? err.message : "Refresh failed",
    });
    return 0;
  }
}

/**
 * Unread items in a view: everything, today's posts, or one feed.
 * `hidden` is the keyword filter; posts it hides don't count.
 */
export function unreadInView(view: View, hidden: (title: string) => boolean = () => false) {
  const since = view === "today" ? startOfToday() : 0;
  return db.items
    .where("read")
    .equals(0)
    .filter(
      (it) =>
        (view === "all" || (view === "today" ? it.published >= since : it.feedId === view)) && !hidden(it.title),
    );
}

/** Marks every visible unread item in the view as read. Returns their ids so it can be undone. */
export async function markAllRead(view: View, hidden?: (title: string) => boolean): Promise<number[]> {
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
        const id = await db.feeds.add({
          ...base,
          url: res.finalUrl,
          title: parsed.title || title,
          siteUrl: parsed.siteUrl ?? e.siteUrl,
          etag: res.etag,
          lastModified: res.lastModified,
          lastFetched: Date.now(),
        } as Feed);
        await storeItems(id, parsed, Date.now());
      } catch (err) {
        failed++;
        await db.feeds
          .add({
            ...base,
            url: e.url,
            lastFetched: Date.now(),
            lastError: err instanceof Error ? err.message : "Couldn't load this feed",
          } as Feed)
          .catch(() => undefined); // already there after all: nothing to add
      } finally {
        onProgress?.(++done, fresh.length);
      }
      added++;
    },
  );

  return { added, duplicates, failed };
}

export async function exportOpml(): Promise<{ text: string; count: number }> {
  const feeds = await db.feeds.orderBy("addedAt").toArray();
  return { text: buildOpml(feeds), count: feeds.length };
}

async function runPool<T>(list: T[], task: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < list.length) await task(list[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, list.length) }, worker));
}

let running: Promise<number> | null = null;

/** Refreshes every feed, a few at a time. Overlapping calls share one run. */
export function refreshAll(): Promise<number> {
  running ??= (async () => {
    try {
      const feeds = await db.feeds.toArray();
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
          read: 0,
          starred: 0,
          addedAt: now,
        } as Omit<Item, "id">;
      });

    if (fresh.length) await db.items.bulkAdd(fresh as Item[]);
    return fresh.length;
  });
}
