import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useLiveQuery } from "dexie-react-hooks";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMarkReadOnScroll } from "@/hooks/use-mark-read-on-scroll";
import { Skeleton } from "@/components/ui/skeleton";
import { db, type Feed, type Item } from "@/lib/db";
import { cachedIconColor, dotColor, iconHost, loadIconColor } from "@/lib/icon-color";
import { useSettings } from "@/lib/settings";
import { KofiNote } from "@/components/kofi-note";
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
  const { hideRead, showThumbnails, showSummaries, markReadOnScroll, colorDots } = useSettings();
  const listRef = useRef<HTMLOListElement>(null);
  useMarkReadOnScroll(listRef, items, markReadOnScroll, onScrolledPast);
  const feeds = useLiveQuery(() => db.feeds.toArray(), []);
  const feedTitles = feeds && new Map(feeds.map((f) => [f.id, f.title]));
  const dotColors = useDotColors(feeds, colorDots);
  const showFeed = typeof view !== "number";
  // Keep the picture column for posts without one, so rows line up, but only in lists
  // that have pictures: text-only blogs keep their full width.
  const reserveThumbnail = !!items?.some((it) => it.image);

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
          ? <CaughtUp key={String(view)} />
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
            dotColor={dotColors.get(item.feedId)}
            showFeed={showFeed}
            showThumbnail={showThumbnails}
            reserveThumbnail={reserveThumbnail}
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
  /** Leave an empty space where the picture would be. */
  reserveThumbnail: boolean;
  showSummary: boolean;
  selected: boolean;
  compact: boolean;
  /** The unread dot's colour; the default when not set. */
  dotColor?: string;
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
            {!item.read && (
              <span
                className="bg-primary size-1.5 shrink-0 rounded-full"
                style={props.dotColor ? { backgroundColor: props.dotColor } : undefined}
                aria-label="Unread"
              />
            )}
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
        {props.showThumbnail && (item.image || props.reserveThumbnail) && (
          <div className={cn("shrink-0", compact ? "size-12" : "size-16 sm:size-20")}>
            {item.image && (
              <img
                key={item.image}
                src={item.image}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                className="bg-muted size-full rounded-md object-cover"
                onError={(e) => {
                  // Broken picture: keep the space so the row still lines up.
                  e.currentTarget.style.visibility = "hidden";
                }}
              />
            )}
          </div>
        )}
      </button>
    </li>
  );
}

/**
 * Each feed's unread-dot colour, from the main colour of its icon (worked out once per site
 * and remembered). Feeds whose icon has no clear colour keep the default dot.
 */
function useDotColors(feeds: Feed[] | undefined, enabled: boolean): Map<number, string> {
  const { resolvedTheme } = useTheme();
  const [, setLoaded] = useState(0);

  useEffect(() => {
    if (!enabled || !feeds) return;
    let live = true;
    for (const feed of feeds) {
      const host = iconHost(feed);
      if (host && cachedIconColor(host) === undefined) {
        void loadIconColor(host).then(() => live && setLoaded((n) => n + 1));
      }
    }
    return () => {
      live = false;
    };
  }, [enabled, feeds]);

  const colors = new Map<number, string>();
  if (!enabled || !feeds) return colors;
  for (const feed of feeds) {
    const host = iconHost(feed);
    const color = host ? cachedIconColor(host) : null;
    if (color) colors.set(feed.id, dotColor(color, resolvedTheme === "dark"));
  }
  return colors;
}

/** "You're all caught up", and every 5th time a quiet Ko-fi prompt under it. */
function CaughtUp() {
  return (
    <div className="flex flex-col items-center gap-6">
      <p>You're all caught up.</p>
      <KofiNote />
    </div>
  );
}
