// The preview image a page names for link previews (og:image, twitter:image). Used when
// the reader already fetches an article page for its full text: a post without a picture
// picks it up from there. Driftpost never fetches pages just for pictures.

/** The preview image a page names in its <head>, as a full https address. */
export function imageFromPage(html: string, pageUrl: string): string | undefined {
  // The image is named in the <head>: no need to parse the whole page.
  const head = html.slice(0, html.search(/<\/head>/i) + 1 || 200_000);
  const doc = new DOMParser().parseFromString(head, "text/html");
  const candidates = [
    doc.querySelector('meta[property="og:image:secure_url"]')?.getAttribute("content"),
    doc.querySelector('meta[property="og:image"], meta[name="og:image"]')?.getAttribute("content"),
    doc.querySelector('meta[name="twitter:image"], meta[property="twitter:image"], meta[name="twitter:image:src"]')?.getAttribute("content"),
    doc.querySelector('link[rel="image_src"]')?.getAttribute("href"),
  ];
  for (const raw of candidates) {
    if (!raw?.trim()) continue;
    try {
      const url = new URL(raw.trim(), pageUrl);
      if (url.protocol === "http:") url.protocol = "https:";
      if (url.protocol === "https:") return url.href;
    } catch {
      // not an address: try the next one
    }
  }
  return undefined;
}
