// Gets an article's full text for the in-app reader, and makes HTML safe to show.

import DOMPurify from "dompurify";
import { Readability } from "@mozilla/readability";
import { db, type Feed, type Item } from "./db";
import { htmlToText } from "./parse";
import { fetchViaProxy } from "./proxy";
import { imageFromPage } from "./preview-image";

/** Feed content with at least this much text is treated as the full article. */
const FULL_TEXT_CHARS = 1500;

export interface ArticleContent {
  html: string;
  source: "feed" | "page";
}

/** True when the feed itself carries the whole article, so no page fetch is needed. */
export function feedHasFullText(item: Item): boolean {
  return !!item.content && htmlToText(item.content).length >= FULL_TEXT_CHARS;
}

/**
 * Whether to fetch the web page for the full text. Only when the feed's text is
 * short and the link goes to the feed's own site: then it's a cut-off preview.
 * Link blogs (like Daring Fireball) point to other sites, and their short feed
 * text is the actual post, so we keep it.
 */
export function shouldLoadFullText(item: Item, feed: Feed | undefined): boolean {
  if (!item.link || item.fullContent || feedHasFullText(item)) return false;
  const site = feed?.siteUrl ?? feed?.url;
  return !!site && hostOf(item.link) === hostOf(site);
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Fetches the article page and pulls out the main text with Mozilla Readability
 * (the engine behind Firefox Reader View). The result is cached on the item.
 * Returns null when the page can't be loaded or has less text than the feed.
 */
export async function loadFullArticle(item: Item): Promise<string | null> {
  if (item.fullContent) return item.fullContent;
  if (!item.link) return null;

  const res = await fetchViaProxy(item.link);
  if (!res.contentType.includes("html") && !/<html|<body/i.test(res.text.slice(0, 2000))) return null;

  // The page is here anyway: pick up its preview image for the list if the post has none.
  if (!item.image && !item.imageChecked) {
    const image = imageFromPage(res.text, res.finalUrl);
    await db.items.update(item.id, image ? { image, imageChecked: 1 } : { imageChecked: 1 });
  }

  const doc = new DOMParser().parseFromString(res.text, "text/html");
  // Let Readability turn relative links and images into full addresses.
  const base = doc.createElement("base");
  base.href = res.finalUrl;
  doc.head.prepend(base);

  const parsed = new Readability(doc, { keepClasses: false }).parse();
  if (!parsed?.content) return null;

  const pageText = htmlToText(parsed.content).length;
  const feedText = item.content ? htmlToText(item.content).length : 0;
  if (pageText <= feedText) return null;

  await db.items.update(item.id, { fullContent: parsed.content });
  return parsed.content;
}

const FORBID_TAGS = ["style", "script", "iframe", "object", "embed", "form", "input", "button", "textarea", "select"];
const FORBID_ATTR = ["style", "class", "id", "srcset", "sizes", "width", "height"];

/**
 * Cleans article HTML for display: removes scripts, embeds, forms and inline styles,
 * makes links and images absolute, opens links in a new tab, and loads images lazily
 * without telling the site where you're reading.
 */
export function sanitiseArticle(html: string, baseUrl?: string): string {
  const absolute = (value: string | null) => {
    if (!value) return null;
    try {
      const url = new URL(value, baseUrl);
      return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:" ? url.toString() : null;
    } catch {
      return null;
    }
  };

  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") {
      const href = absolute(node.getAttribute("href"));
      if (href) {
        node.setAttribute("href", href);
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer");
      } else {
        node.removeAttribute("href");
      }
    }
    if (node.tagName === "IMG") {
      const src = absolute(node.getAttribute("src") ?? node.getAttribute("data-src"));
      if (src) node.setAttribute("src", src);
      else node.remove();
      node.setAttribute("loading", "lazy");
      node.setAttribute("decoding", "async");
      node.setAttribute("referrerpolicy", "no-referrer");
    }
  });
  try {
    return DOMPurify.sanitize(html, { FORBID_TAGS, FORBID_ATTR });
  } finally {
    DOMPurify.removeHook("afterSanitizeAttributes");
  }
}
