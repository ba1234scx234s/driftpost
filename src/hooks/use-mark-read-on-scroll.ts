import { useEffect, useRef, type RefObject } from "react";
import type { Item } from "@/lib/db";

/**
 * Marks unread posts as read once they scroll up past the top of the list.
 * Rows are watched with an IntersectionObserver; a row counts as "passed" when it has
 * left the visible area through the top edge. Marks are batched into one update.
 */
export function useMarkReadOnScroll(
  listRef: RefObject<HTMLElement | null>,
  items: Item[] | undefined,
  enabled: boolean,
  onPassed: (ids: number[]) => void,
) {
  // Always call the latest callback without re-creating the observer.
  const onPassedRef = useRef(onPassed);
  onPassedRef.current = onPassed;

  useEffect(() => {
    const list = listRef.current;
    const root = list?.closest<HTMLElement>("[data-slot=scroll-area-viewport]");
    if (!enabled || !list || !root || !items?.length) return;

    const pending = new Set<number>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const flush = () => {
      timer = undefined;
      if (pending.size) onPassedRef.current([...pending]);
      pending.clear();
    };

    // The observer reports every row once when it starts watching. Rows that are already
    // above the top at that moment weren't scrolled past while you watched (for example
    // after the list re-renders), so the first report of each row is ignored.
    const seen = new WeakSet<Element>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const first = !seen.has(entry.target);
          seen.add(entry.target);
          if (first) continue;
          const top = entry.rootBounds?.top ?? root.getBoundingClientRect().top;
          // Left the view through the top: scrolled past.
          if (!entry.isIntersecting && entry.boundingClientRect.bottom <= top + 1) {
            const id = Number((entry.target as HTMLElement).dataset.itemId);
            if (id) {
              pending.add(id);
              observer.unobserve(entry.target);
            }
          }
        }
        if (pending.size && !timer) timer = setTimeout(flush, 300);
      },
      { root },
    );

    list.querySelectorAll<HTMLElement>("[data-unread='true']").forEach((row) => observer.observe(row));
    return () => {
      observer.disconnect();
      if (timer) {
        clearTimeout(timer);
        flush();
      }
    };
  }, [listRef, items, enabled]);
}
