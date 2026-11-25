import { useEffect, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMarkReadOnScroll } from "@/hooks/use-mark-read-on-scroll";
import { Skeleton } from "@/components/ui/skeleton";
import { db, type Item } from "@/lib/db";
import { useSettings } from "@/lib/settings";
import { relativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { View } from "@/lib/views";

interface Props {
  view: View;
  items: Item[] | undefined;
  selectedId: number | null;
  onSelect: (item: Item) => void;
  /** Tighter rows when the reader column is open next to the list. */
  compact: boolean;
  /** Called with posts that scrolled past the top while unread. */
  onScrolledPast: (ids: number[]) => void;
}

export function ItemList({ view, items, selectedId, onSelect, compact, onScrolledPast }: Props) {
  const { hideRead, showThumbnails, showSummaries, markReadOnScroll } = useSettings();
  const listRef = useRef<HTMLOListElement>(null);
  useMarkReadOnScroll(listRef, items, markReadOnScroll, onScrolledPast);
  const feedTitles = useLiveQuery(async () => new Map((await db.feeds.toArray()).map((f) => [f.id, f.title])), []);
  const showFeed = typeof view !== "number";

  if (!items) {
    return (
      <div className="flex flex-col gap-6 p-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center p-8 text-center text-sm">
        {hideRead
          ? "You're all caught up."
          : view === "today"
            ? "Nothing new today yet. Posts from today drift in as your feeds update."
            : "Nothing here yet. New posts drift in as your feeds update."}
      </div>
    );
  }

  return (
    // A new list starts at the top, not where the previous list was scrolled to.
    <ScrollArea key={String(view)} className="min-h-0 flex-1">
      <ol ref={listRef} className={cn("mx-auto flex flex-col py-2", compact ? "px-2" : "max-w-2xl px-4 sm:px-6")}>
        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            feedTitle={feedTitles?.get(item.feedId)}
            showFeed={showFeed}
            showThumbnail={showThumbnails}
            showSummary={showSummaries}
            selected={item.id === selectedId}
            compact={compact}
            onSelect={() => onSelect(item)}
          />
        ))}
      </ol>
    </ScrollArea>
  );
}

function ItemRow(props: {
  item: Item;
  feedTitle?: string;
  showFeed: boolean;
  showThumbnail: boolean;
  showSummary: boolean;
  selected: boolean;
  compact: boolean;
  onSelect: () => void;
}) {
  const { item, feedTitle, showFeed, selected, compact } = props;
  const ref = useRef<HTMLButtonElement>(null);

  // Keep the selected post in view when stepping through with the arrow keys.
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  return (
    <li className="border-border/60 border-b last:border-b-0" data-item-id={item.id} data-unread={!item.read}>
      <button
        ref={ref}
        type="button"
        onClick={props.onSelect}
        aria-current={selected ? "true" : undefined}
        className={cn(
          "focus-visible:ring-ring my-1 flex w-full gap-4 rounded-lg px-3 text-left outline-none focus-visible:ring-2",
          compact ? "py-2.5" : "py-3.5",
          selected ? "bg-accent" : "hover:bg-accent/50",
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            {!item.read && <span className="bg-primary size-1.5 shrink-0 rounded-full" aria-label="Unread" />}
            {showFeed && feedTitle && <span className="truncate">{feedTitle}</span>}
            {showFeed && feedTitle && <span aria-hidden>·</span>}
            <time dateTime={new Date(item.published).toISOString()} className="shrink-0">
              {relativeTime(item.published)}
            </time>
          </div>
          <h2
            className={cn(
              "font-heading leading-snug font-medium",
              compact ? "text-sm" : "text-base",
              item.read && !selected && "text-muted-foreground",
            )}
          >
            {item.title}
          </h2>
          {props.showSummary && item.summary && (
            <p className={cn("text-muted-foreground text-sm leading-relaxed", compact ? "line-clamp-1" : "line-clamp-2")}>
              {item.summary}
            </p>
          )}
        </div>
        {props.showThumbnail && item.image && (
          <img
            src={item.image}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className={cn("bg-muted shrink-0 rounded-md object-cover", compact ? "size-12" : "size-16 sm:size-20")}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
      </button>
    </li>
  );
}
