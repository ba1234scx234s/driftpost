/** What the post list shows: everything, today's posts, or one feed (by id). */
export type View = "all" | "today" | number;

/** Midnight at the start of today, in the reader's own time zone. */
export function startOfToday(now = new Date()): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}
