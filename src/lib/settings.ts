// Reader preferences, stored locally in IndexedDB. Theme lives in next-themes (localStorage).

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";

export const FONTS = {
  geist: { label: "Geist", stack: "'Geist Variable', sans-serif" },
  system: { label: "System", stack: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
  serif: { label: "Serif", stack: "ui-serif, 'New York', Charter, Georgia, 'Times New Roman', serif" },
  mono: { label: "Mono", stack: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace" },
} as const;
export type FontId = keyof typeof FONTS;

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
}

export const DEFAULT_SETTINGS: Settings = { font: "geist", size: "m", keywords: [], hideRead: false };

const KEY = "prefs";

export function useSettings(): Settings {
  const row = useLiveQuery(() => db.settings.get(KEY), []);
  return { ...DEFAULT_SETTINGS, ...row?.value };
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
