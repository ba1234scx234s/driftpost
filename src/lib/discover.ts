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

/**
 * `findKnown` returns an already-followed feed's title for a URL, so pasting
 * a site you follow (which may list several feeds) doesn't add it twice.
 */
export async function discoverFeed(
  input: string,
  findKnown: (url: string) => Promise<string | undefined> = async () => undefined,
): Promise<DiscoveredFeed> {
  const start = normaliseInput(input);
  await assertNotKnown([start], findKnown);
  const first = await fetchViaProxy(start);

  const direct = looksLikeFeed(first.text, first.finalUrl);
  if (direct) return { url: first.finalUrl, feed: direct, response: first };

  // An HTML page: look for <link rel="alternate"> feed links, then try common paths.
  const links = feedLinks(first.text, first.finalUrl);
  await assertNotKnown(links, findKnown);
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
  constructor(title: string) {
    super(`You already follow ${title}`);
  }
}

async function assertNotKnown(urls: string[], findKnown: (url: string) => Promise<string | undefined>) {
  for (const url of urls) {
    const title = await findKnown(url);
    if (title) throw new AlreadyFollowingError(title);
  }
}

function unique<T>(list: T[]): T[] {
  return [...new Set(list)];
}
