// Parses RSS 2.0, RSS 1.0 (RDF), Atom and JSON Feed into one shape.

export interface ParsedItem {
  guid: string;
  title: string;
  link?: string;
  author?: string;
  published?: number;
  summary?: string;
  content?: string;
  image?: string;
}

export interface ParsedFeed {
  title: string;
  siteUrl?: string;
  items: ParsedItem[];
}

export class NotAFeedError extends Error {
  constructor() {
    super("This doesn't look like a feed");
  }
}

const MEDIA_NS = "http://search.yahoo.com/mrss/";

export function parseFeed(text: string, feedUrl: string): ParsedFeed {
  const trimmed = text.trimStart();
  if (trimmed.startsWith("{")) return parseJsonFeed(trimmed, feedUrl);

  const doc = new DOMParser().parseFromString(trimmed, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new NotAFeedError();

  const root = doc.documentElement;
  switch (root.localName) {
    case "rss":
    case "RDF":
      return parseRss(root, feedUrl);
    case "feed":
      return parseAtom(root, feedUrl);
    default:
      throw new NotAFeedError();
  }
}

/** True when the text looks like a feed, without throwing. */
export function looksLikeFeed(text: string, feedUrl: string): ParsedFeed | null {
  try {
    return parseFeed(text, feedUrl);
  } catch {
    return null;
  }
}

// ---------- RSS ----------

function parseRss(root: Element, feedUrl: string): ParsedFeed {
  const channel = child(root, "channel");
  if (!channel) throw new NotAFeedError();

  // RSS 2.0 nests items in <channel>; RSS 1.0 puts them next to it.
  const itemEls = [...children(channel, "item"), ...children(root, "item")];
  const siteUrl = resolve(textOf(child(channel, "link")), feedUrl);

  return {
    title: textOf(child(channel, "title")) || hostOf(siteUrl ?? feedUrl),
    siteUrl,
    items: itemEls.map((el) => {
      const link = resolve(textOf(child(el, "link")), feedUrl);
      const guid = textOf(child(el, "guid"));
      const title = textOf(child(el, "title"));
      const description = textOf(child(el, "description"));
      const encoded = textOf(childNs(el, "encoded"));
      const published = parseDate(
        textOf(child(el, "pubDate")) || textOf(child(el, "date")) || textOf(child(el, "published")),
      );
      return finishItem({
        guid,
        title,
        link,
        author: textOf(child(el, "creator")) || textOf(child(el, "author")),
        published,
        summary: description,
        content: encoded || description,
        image: mediaImage(el, feedUrl),
      });
    }),
  };
}

// ---------- Atom ----------

function parseAtom(root: Element, feedUrl: string): ParsedFeed {
  const siteUrl = atomLink(root, feedUrl);
  const feedAuthor = textOf(child(child(root, "author"), "name"));

  return {
    title: atomText(child(root, "title")) || hostOf(siteUrl ?? feedUrl),
    siteUrl,
    items: children(root, "entry").map((el) => {
      const content = atomText(atomContent(el));
      const summary = atomText(child(el, "summary"));
      return finishItem({
        guid: textOf(child(el, "id")),
        title: atomText(child(el, "title")),
        link: atomLink(el, feedUrl),
        author: textOf(child(child(el, "author"), "name")) || feedAuthor,
        published: parseDate(textOf(child(el, "published")) || textOf(child(el, "updated"))),
        summary: summary || content,
        content: content || summary,
        image: mediaImage(el, feedUrl),
      });
    }),
  };
}

function atomLink(el: Element, base: string): string | undefined {
  const links = children(el, "link");
  const alt =
    links.find((l) => (l.getAttribute("rel") ?? "alternate") === "alternate" && isHtmlType(l)) ??
    links.find((l) => !l.getAttribute("rel"));
  return resolve(alt?.getAttribute("href") ?? undefined, base);
}

function isHtmlType(link: Element): boolean {
  const type = link.getAttribute("type");
  return !type || type.includes("html");
}

function atomContent(el: Element): Element | undefined {
  return Array.from(el.children).find((c) => c.localName === "content" && c.namespaceURI !== MEDIA_NS);
}

/** Atom text constructs: type="xhtml" holds markup as child nodes. */
function atomText(el: Element | undefined): string {
  if (!el) return "";
  if (el.getAttribute("type") === "xhtml") {
    const s = new XMLSerializer();
    const div = Array.from(el.children).find((c) => c.localName === "div") ?? el;
    return Array.from(div.childNodes)
      .map((n) => s.serializeToString(n))
      .join("")
      .replace(/ xmlns(:\w+)?="[^"]*"/g, "")
      .trim();
  }
  return (el.textContent ?? "").trim();
}

// ---------- JSON Feed ----------

interface JsonFeedItem {
  id?: string | number;
  url?: string;
  external_url?: string;
  title?: string;
  content_html?: string;
  content_text?: string;
  summary?: string;
  image?: string;
  banner_image?: string;
  date_published?: string;
  date_modified?: string;
  author?: { name?: string };
  authors?: { name?: string }[];
}

function parseJsonFeed(text: string, feedUrl: string): ParsedFeed {
  let data: { version?: string; title?: string; home_page_url?: string; items?: JsonFeedItem[] };
  try {
    data = JSON.parse(text);
  } catch {
    throw new NotAFeedError();
  }
  if (typeof data.version !== "string" || !data.version.includes("jsonfeed")) throw new NotAFeedError();

  const siteUrl = resolve(data.home_page_url, feedUrl);
  return {
    title: data.title || hostOf(siteUrl ?? feedUrl),
    siteUrl,
    items: (data.items ?? []).map((it) => {
      const content = it.content_html || (it.content_text ? escapeHtml(it.content_text) : "");
      return finishItem({
        guid: it.id != null ? String(it.id) : "",
        title: it.title ?? "",
        link: resolve(it.url || it.external_url, feedUrl),
        author: it.authors?.[0]?.name || it.author?.name,
        published: parseDate(it.date_published || it.date_modified),
        summary: it.summary || content,
        content: content || it.summary,
        image: resolve(it.image || it.banner_image, feedUrl),
      });
    }),
  };
}

// ---------- shared helpers ----------

function finishItem(item: {
  guid: string;
  title: string;
  link?: string;
  author?: string;
  published?: number;
  summary?: string;
  content?: string;
  image?: string;
}): ParsedItem {
  const summaryText = item.summary ? htmlToText(item.summary) : "";
  const title = item.title ? htmlToText(item.title) : summaryText.slice(0, 80) || "Untitled";
  return {
    guid: item.guid || item.link || `${title}|${item.published ?? ""}`,
    title,
    link: item.link,
    author: item.author || undefined,
    published: item.published,
    summary: summaryText ? truncate(summaryText, 300) : undefined,
    content: item.content || undefined,
    image: item.image || firstImage(item.content, item.link),
  };
}

function children(el: Element | undefined, name: string): Element[] {
  if (!el) return [];
  return Array.from(el.children).filter((c) => c.localName === name);
}

function child(el: Element | undefined, name: string): Element | undefined {
  return children(el, name)[0];
}

/** content:encoded and similar namespaced elements, matched by local name only. */
function childNs(el: Element, name: string): Element | undefined {
  return Array.from(el.children).find((c) => c.localName === name && c.prefix !== null);
}

function textOf(el: Element | undefined): string {
  return (el?.textContent ?? "").trim();
}

function mediaImage(el: Element, base: string): string | undefined {
  for (const c of Array.from(el.children)) {
    if (c.namespaceURI === MEDIA_NS && (c.localName === "thumbnail" || c.localName === "content")) {
      const medium = c.getAttribute("medium");
      const type = c.getAttribute("type") ?? "";
      if (c.localName === "thumbnail" || medium === "image" || type.startsWith("image/")) {
        return resolve(c.getAttribute("url") ?? undefined, base);
      }
    }
    if (c.localName === "enclosure" && (c.getAttribute("type") ?? "").startsWith("image/")) {
      return resolve(c.getAttribute("url") ?? undefined, base);
    }
  }
  return undefined;
}

function firstImage(html: string | undefined, base: string | undefined): string | undefined {
  if (!html) return undefined;
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? resolve(m[1], base) : undefined;
}

function parseDate(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const t = Date.parse(value);
  return Number.isNaN(t) ? undefined : t;
}

function resolve(href: string | undefined, base: string | undefined): string | undefined {
  if (!href) return undefined;
  try {
    const url = new URL(href.trim(), base);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Plain text from an HTML string. DOMParser with text/html never runs scripts. */
export function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}
