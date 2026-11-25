/** What the post list shows: everything, today's posts, or one feed (by id). */
export type View = "all" | "today" | number;

/** What the main area shows: a list of posts, the settings page or feeds to discover. */
export type Screen = View | "settings" | "discover";

/** Midnight at the start of today, in the reader's own time zone. */
export function startOfToday(now = new Date()): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}
