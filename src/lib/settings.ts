// Reader preferences, stored locally in IndexedDB. Theme lives in next-themes (localStorage).

import { useLiveQuery } from "dexie-react-hooks";
import { db, type Item } from "./db";
import { detectTopics, type TopicId } from "./topics";

/** A built-in font id ("geist", "serif"…) or a Google font as "g:Family Name". See fonts.ts. */
export type FontId = string;

export const SIZES = {
  s: { label: "S", name: "Small", px: 14 },
  m: { label: "M", name: "Default", px: 16 },
  l: { label: "L", name: "Large", px: 18 },
  xl: { label: "XL", name: "Extra large", px: 20 },
} as const;
export type SizeId = keyof typeof SIZES;

/** Space between lines in an article's body text (not titles or headings). */
export const LINE_HEIGHTS = {
  compact: { label: "Compact", value: 1.5 },
  default: { label: "Default", value: 1.75 },
  relaxed: { label: "Relaxed", value: 2 },
} as const;
export type LineHeightId = keyof typeof LINE_HEIGHTS | "custom";
export const CUSTOM_LINE_HEIGHT = { min: 1, max: 3, step: 0.05 } as const;

/** The line height to use, as a multiple of the text size. */
export function lineHeightOf(settings: Pick<Settings, "lineHeight" | "customLineHeight">): number {
  if (settings.lineHeight === "custom") return settings.customLineHeight;
  return (LINE_HEIGHTS[settings.lineHeight] ?? LINE_HEIGHTS.default).value;
}

export interface Settings {
  font: FontId;
  size: SizeId;
  /** Line height of an article's body text. */
  lineHeight: LineHeightId;
  /** Used when lineHeight is "custom". */
  customLineHeight: number;
  /** Posts whose title contains one of these words are hidden. */
  keywords: string[];
  /** Posts about these topics are hidden (see topics.ts). */
  hiddenTopics: TopicId[];
  /** Posts with one of these feed tags are hidden. Matched on the whole tag, any case. */
  hiddenTags: string[];
  /** Only show unread posts in lists. */
  hideRead: boolean;
  /** Leave feeds with nothing unread out of the sidebar, behind a "N feeds read" link. */
  hideReadFeeds: boolean;
  /** Mark posts read when they scroll up past the top of the list. */
  markReadOnScroll: boolean;
  /** What sits next to each title in lists: the post's picture, the feed's icon, or nothing. */
  thumbnails: Thumbnails;
  /** Show the short description under each title in lists. */
  showSummaries: boolean;
  /** Unread dots take the main colour of each feed's icon. */
  colorDots: boolean;
  /** How an article opens: in Driftpost's reader column, or the website in a new browser tab. */
  openIn: OpenIn;
  /** Every 30 days, ask to download a backup. */
  backupReminder: boolean;
  /** When a backup was last downloaded (ms since 1970). */
  lastBackupAt?: number;
  /** "Later" on the backup reminder: don't ask again before this time. */
  backupSnoozedUntil?: number;
}

export const THUMBNAILS = {
  image: { label: "Image", hint: "The post's picture when it has one, otherwise the feed's icon." },
  icon: { label: "Feed icon", hint: "The feed's icon on a tile in its colour, for every post." },
  none: { label: "None", hint: "Just the text: titles use the full width." },
} as const;
export type Thumbnails = keyof typeof THUMBNAILS;

export const OPEN_IN = {
  reader: { label: "In app", hint: "The article's text, in Driftpost's own layout." },
  tab: { label: "New tab", hint: "The article's website in a new browser tab." },
} as const;
export type OpenIn = keyof typeof OPEN_IN;

export const DEFAULT_SETTINGS: Settings = {
  font: "geist",
  size: "m",
  lineHeight: "default",
  customLineHeight: 1.75,
  keywords: [],
  hiddenTopics: [],
  hiddenTags: [],
  hideRead: true,
  hideReadFeeds: false,
  markReadOnScroll: true,
  thumbnails: "image",
  showSummaries: true,
  colorDots: true,
  openIn: "reader",
  backupReminder: true,
};

const KEY = "prefs";
/**
 * Bumped when a default changes for everyone. Saved prefs from an older version drop the
 * values that were only ever the old default (v2: "Hide read posts" became on by default).
 */
const PREFS_VERSION = 2;

function load(
  value: (Partial<Settings> & { v?: number; showThumbnails?: boolean }) | undefined,
): Settings {
  const saved = { ...value };
  // "Show thumbnails" was an on/off switch before the three choices.
  if (saved.showThumbnails === false && !saved.thumbnails) saved.thumbnails = "none";
  delete saved.showThumbnails;
  if (!(String(saved.thumbnails) in THUMBNAILS)) delete saved.thumbnails;
  if ((saved.v ?? 1) < 2) delete saved.hideRead;
  delete saved.v;
  return { ...DEFAULT_SETTINGS, ...saved };
}

export function useSettings(): Settings {
  const row = useLiveQuery(() => db.settings.get(KEY), []);
  const settings = load(row?.value);
  // An "in-app browser" option existed briefly; anything unknown falls back to the reader.
  if (!(settings.openIn in OPEN_IN)) settings.openIn = "reader";
  return settings;
}

export async function updateSettings(changes: Partial<Settings>): Promise<void> {
  await db.transaction("rw", db.settings, async () => {
    const current = load((await db.settings.get(KEY))?.value);
    await db.settings.put({ key: KEY, value: { ...current, ...changes, v: PREFS_VERSION } });
  });
}

export async function getSettings(): Promise<Settings> {
  return load((await db.settings.get(KEY))?.value);
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

/** The post fields the filters look at. */
export type FilterablePost = Pick<Item, "title" | "categories" | "link">;

/**
 * One check for everything Filters hides: keyword matches in the title and hidden topics.
 * Returns true when the post should be hidden.
 */
export function makePostFilter(
  keywords: string[],
  hiddenTopics: TopicId[],
  hiddenTags: string[] = [],
): (post: FilterablePost) => boolean {
  const titleHidden = makeTitleFilter(keywords);
  const topics = new Set(hiddenTopics);
  const tags = new Set(hiddenTags.map((t) => t.toLowerCase()));
  return (post) =>
    titleHidden(post.title) ||
    (tags.size > 0 && !!post.categories?.some((c) => tags.has(c.toLowerCase()))) ||
    (topics.size > 0 && detectTopics(post).some((t) => topics.has(t)));
}

/** Adds a feed tag to the hidden list. Returns false when it was already there. */
export async function hideTag(tag: string): Promise<boolean> {
  const { hiddenTags } = await getSettings();
  if (hiddenTags.some((t) => t.toLowerCase() === tag.toLowerCase())) return false;
  await updateSettings({ hiddenTags: [...hiddenTags, tag] });
  return true;
}

export async function unhideTag(tag: string): Promise<void> {
  const { hiddenTags } = await getSettings();
  await updateSettings({ hiddenTags: hiddenTags.filter((t) => t.toLowerCase() !== tag.toLowerCase()) });
}

export async function setTopicHidden(topic: TopicId, hidden: boolean): Promise<void> {
  const { hiddenTopics } = await getSettings();
  const next = hidden ? [...new Set([...hiddenTopics, topic])] : hiddenTopics.filter((t) => t !== topic);
  await updateSettings({ hiddenTopics: next });
}
