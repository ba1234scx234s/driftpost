import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Item } from "@/lib/db";
import { makePostFilter, useSettings } from "@/lib/settings";
import { startOfToday, type View } from "@/lib/views";

const PAGE = 200;

/**
 * The posts a list shows, newest first, after the keyword filter and "hide read posts".
 * `keepIds` are posts read while this list is open: they stay visible until you leave it.
 * Returns undefined while loading.
 */
export function useVisibleItems(view: View, keepIds: ReadonlySet<number>): Item[] | undefined {
  const today = startOfToday();
  const { keywords, hiddenTopics, hiddenTags, hideRead } = useSettings();
  const hidden = useMemo(
    () => makePostFilter(keywords, hiddenTopics, hiddenTags),
    [keywords, hiddenTopics, hiddenTags],
  );

  return useLiveQuery(() => {
    const base =
      view === "all"
        ? db.items.orderBy("published").reverse()
        : view === "today"
          ? db.items.where("published").aboveOrEqual(today).reverse()
          : db.items
              .where("[feedId+published]")
              .between([view, -Infinity], [view, Infinity])
              .reverse();
    return base
      // Posts opened in this list stay put, even if a new filter or "hide read" would hide them,
      // so stepping through with the arrow keys keeps working.
      .filter((it) => keepIds.has(it.id) || (!hidden(it) && (!hideRead || !it.read)))
      .limit(PAGE)
      .toArray();
  }, [view, today, hidden, hideRead, keepIds]);
}
