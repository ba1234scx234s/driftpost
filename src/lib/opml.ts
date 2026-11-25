// OPML: the standard file format for moving subscriptions between feed readers.

import type { Feed } from "./db";

export interface OpmlFeed {
  url: string;
  title?: string;
  siteUrl?: string;
  /** The outline folder it sat in, if any. Kept for the folders milestone. */
  folder?: string;
}

export class OpmlError extends Error {}

export function parseOpml(text: string): OpmlFeed[] {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.getElementsByTagName("parsererror").length || doc.documentElement.localName !== "opml") {
    throw new OpmlError("That file isn't a valid OPML file");
  }
  const body = Array.from(doc.documentElement.children).find((c) => c.localName === "body");
  if (!body) throw new OpmlError("That OPML file has no subscriptions");

  const found = new Map<string, OpmlFeed>();
  const walk = (el: Element, folder?: string) => {
    for (const outline of Array.from(el.children).filter((c) => c.localName === "outline")) {
      const xmlUrl = attr(outline, "xmlUrl");
      const label = attr(outline, "title") || attr(outline, "text");
      if (xmlUrl) {
        const url = httpUrl(xmlUrl);
        if (url && !found.has(url)) {
          found.set(url, { url, title: label, siteUrl: httpUrl(attr(outline, "htmlUrl")), folder });
        }
      }
      // Readers nest folders as outlines without xmlUrl; only the innermost name is kept.
      if (outline.children.length) walk(outline, xmlUrl ? folder : label || folder);
    }
  };
  walk(body);
  return [...found.values()];
}

export function buildOpml(feeds: Feed[], now = new Date()): string {
  const line = (f: Feed, indent: string) =>
    `${indent}<outline type="rss" text="${esc(f.title)}" title="${esc(f.title)}" xmlUrl="${esc(f.url)}"${
      f.siteUrl ? ` htmlUrl="${esc(f.siteUrl)}"` : ""
    }/>`;

  const loose = feeds.filter((f) => !f.folder);
  const folders = new Map<string, Feed[]>();
  for (const f of feeds) if (f.folder) folders.set(f.folder, [...(folders.get(f.folder) ?? []), f]);

  const body = [
    ...loose.map((f) => line(f, "    ")),
    ...[...folders].flatMap(([name, list]) => [
      `    <outline text="${esc(name)}" title="${esc(name)}">`,
      ...list.map((f) => line(f, "      ")),
      "    </outline>",
    ]),
  ];

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<opml version="2.0">',
    "  <head>",
    "    <title>Driftpost subscriptions</title>",
    `    <dateCreated>${now.toUTCString()}</dateCreated>`,
    "  </head>",
    "  <body>",
    ...body,
    "  </body>",
    "</opml>",
    "",
  ].join("\n");
}

function attr(el: Element, name: string): string | undefined {
  // Attribute names vary in case between readers (xmlUrl, xmlurl).
  const hit = Array.from(el.attributes).find((a) => a.name.toLowerCase() === name.toLowerCase());
  return hit?.value.trim() || undefined;
}

function httpUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    // feed://host/path means https; feed:https://… just wraps a normal URL.
    const unwrapped = value.replace(/^feed:\/\//i, "https://").replace(/^feed:/i, "");
    const url = new URL(unwrapped);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function esc(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!,
  );
}
