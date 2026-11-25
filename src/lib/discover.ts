// Turns whatever the user pasted (a feed URL, a site URL, or a bare domain) into a working feed.

import { looksLikeFeed, type ParsedFeed } from "./parse";
import { fetchViaProxy, FetchError, type ProxyResult } from "./proxy";

export interface DiscoveredFeed {
  url: string;
  feed: ParsedFeed;
  response: ProxyResult;
}

const FEED_TYPES = [
  "application/rss+xml",
  "application/atom+xml",
  "application/feed+json",
  "application/json",
  "application/rdf+xml",
];

const COMMON_PATHS = ["/feed", "/rss.xml", "/feed.xml", "/atom.xml", "/index.xml", "/rss", "/feed.json"];

export function normaliseInput(input: string): string {
  let raw = input.trim();
  if (!raw) throw new FetchError("Enter a website or feed address");
  if (raw.startsWith("feed:")) raw = raw.replace(/^feed:(\/\/)?/, "");
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  try {
    return new URL(raw).toString();
  } catch {
    throw new FetchError("That doesn't look like a web address");
  }
}

export interface KnownFeed {
  id: number;
  title: string;
}

/**
 * Looks up a feed you already follow. `asSite` also matches a feed's website,
 * so pasting the homepage of a site you follow is caught too.
 */
export type FindKnown = (url: string, asSite: boolean) => Promise<KnownFeed | undefined>;

/**
 * Checks for a feed you already follow at every step (what you typed, where it
 * redirected, the feed links on the page, the final feed) so nothing is added twice.
 */
export async function discoverFeed(
  input: string,
  findKnown: FindKnown = async () => undefined,
): Promise<DiscoveredFeed> {
  const start = normaliseInput(input);
  await assertNotKnown([start], findKnown, true);
  const first = await fetchViaProxy(start);
  await assertNotKnown([first.finalUrl], findKnown, true);

  const direct = looksLikeFeed(first.text, first.finalUrl);
  if (direct) return { url: first.finalUrl, feed: direct, response: first };

  // An HTML page: look for <link rel="alternate"> feed links, then try common paths.
  const links = feedLinks(first.text, first.finalUrl);
  await assertNotKnown(links, findKnown, false);
  const candidates = [...links, ...COMMON_PATHS.map((p) => new URL(p, first.finalUrl).toString())];

  for (const candidate of unique(candidates)) {
    try {
      const res = await fetchViaProxy(candidate);
      const feed = looksLikeFeed(res.text, res.finalUrl);
      if (feed) return { url: res.finalUrl, feed, response: res };
    } catch {
      // try the next candidate
    }
  }
  throw new FetchError("Couldn't find a feed on that site");
}

function feedLinks(html: string, base: string): string[] {
  if (!/<html|<head|<link/i.test(html)) return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  return Array.from(doc.querySelectorAll<HTMLLinkElement>('link[rel~="alternate"][href]'))
    .filter((l) => FEED_TYPES.includes((l.getAttribute("type") ?? "").toLowerCase().split(";")[0].trim()))
    .map((l) => {
      try {
        return new URL(l.getAttribute("href")!, base).toString();
      } catch {
        return "";
      }
    })
    .filter(Boolean);
}

export class AlreadyFollowingError extends Error {
  constructor(readonly feed: KnownFeed) {
    super(`You already follow ${feed.title}`);
  }
}

async function assertNotKnown(urls: string[], findKnown: FindKnown, asSite: boolean) {
  for (const url of urls) {
    const known = await findKnown(url, asSite);
    if (known) throw new AlreadyFollowingError(known);
  }
}

function unique<T>(list: T[]): T[] {
  return [...new Set(list)];
}
