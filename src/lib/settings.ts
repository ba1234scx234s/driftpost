// Reader preferences, stored locally in IndexedDB. Theme lives in next-themes (localStorage).

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";

/** A built-in font id ("geist", "serif"…) or a Google font as "g:Family Name". See fonts.ts. */
export type FontId = string;

export const SIZES = {
  s: { label: "S", name: "Small", px: 14 },
  m: { label: "M", name: "Default", px: 16 },
  l: { label: "L", name: "Large", px: 18 },
  xl: { label: "XL", name: "Extra large", px: 20 },
} as const;
export type SizeId = keyof typeof SIZES;

export interface Settings {
  font: FontId;
  size: SizeId;
  /** Posts whose title contains one of these words are hidden. */
  keywords: string[];
  /** Only show unread posts in lists. */
  hideRead: boolean;
  /** Show post images next to titles in lists. */
  showThumbnails: boolean;
  /** Show the short description under each title in lists. */
  showSummaries: boolean;
  /** How an article opens: in Driftpost's reader column, or the website in a new browser tab. */
  openIn: OpenIn;
}

export const OPEN_IN = {
  reader: { label: "In app", hint: "The article's text, in Driftpost's own layout." },
  tab: { label: "New tab", hint: "The article's website in a new browser tab." },
} as const;
export type OpenIn = keyof typeof OPEN_IN;

export const DEFAULT_SETTINGS: Settings = {
  font: "geist",
  size: "m",
  keywords: [],
  hideRead: false,
  showThumbnails: true,
  showSummaries: true,
  openIn: "reader",
};

const KEY = "prefs";

export function useSettings(): Settings {
  const row = useLiveQuery(() => db.settings.get(KEY), []);
  const settings: Settings = { ...DEFAULT_SETTINGS, ...row?.value };
  // An "in-app browser" option existed briefly; anything unknown falls back to the reader.
  if (!(settings.openIn in OPEN_IN)) settings.openIn = "reader";
  return settings;
}

export async function updateSettings(changes: Partial<Settings>): Promise<void> {
  await db.transaction("rw", db.settings, async () => {
    const current = (await db.settings.get(KEY))?.value ?? {};
    await db.settings.put({ key: KEY, value: { ...DEFAULT_SETTINGS, ...current, ...changes } });
  });
}

export async function getSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...(await db.settings.get(KEY))?.value };
}

/** Cleans up a typed keyword: trims and collapses spaces. Empty means "ignore". */
export function normaliseKeyword(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/**
 * Builds a title test for the keyword filter. Whole words only and case-insensitive,
 * so "AI" hides "New AI model" but not "Maintain".
 */
export function makeTitleFilter(keywords: string[]): (title: string) => boolean {
  const words = keywords.map(normaliseKeyword).filter(Boolean);
  if (!words.length) return () => false;
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(?:${escaped.join("|")})(?![\\p{L}\\p{N}])`, "iu");
  return (title) => re.test(title);
}
