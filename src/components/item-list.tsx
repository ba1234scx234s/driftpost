import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { useLiveQuery } from "dexie-react-hooks";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FeedIcon, iconNeedsTile } from "@/components/feed-icon";
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
  const { hideRead, thumbnails, showSummaries, markReadOnScroll, colorDots } = useSettings();
  const listRef = useRef<HTMLOListElement>(null);
  useMarkReadOnScroll(listRef, items, markReadOnScroll, onScrolledPast);
  const feeds = useLiveQuery(() => db.feeds.toArray(), []);
  const feedsById = feeds && new Map(feeds.map((f) => [f.id, f]));
  // Feed colours tint the unread dots and the placeholder tiles for posts without a picture.
  const feedColors = useDotColors(feeds, colorDots || thumbnails !== "none");
  const showFeed = typeof view !== "number";
  // Posts without a picture get a tile in their feed's colour, so rows line up, but only in
  // lists that have pictures: text-only blogs keep their full width.
  const reserveThumbnail = thumbnails === "icon" || !!items?.some((it) => it.image);

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
            feed={feedsById?.get(item.feedId)}
            dotColor={colorDots ? feedColors.get(item.feedId) : undefined}
            tileColor={feedColors.get(item.feedId)}
            showFeed={showFeed}
            showThumbnail={thumbnails !== "none"}
            showImage={thumbnails === "image"}
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

// A made-up post for the preview in Settings. The feed has no address, so nothing is fetched:
// its icon is the Driftpost logo and its colour is set here.
const SAMPLE_FEED: Feed = { id: -1, url: "", title: "Driftpost", addedAt: 0 };

/** The Driftpost logo in the text colour; the same shapes as public/favicon.svg. */
function DriftpostLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="343 111 800 800" fill="currentColor" aria-hidden className={className}>
      <mask id="dp-logo-cut" maskUnits="userSpaceOnUse" x="343" y="111" width="800" height="800">
        <rect x="343" y="111" width="800" height="800" fill="#fff" />
        <path d="M369 389 C410 364 440 358 485 358 C580 358 630 409 705 409 C760 409 800 394 836 375 L836 684 C800 703 760 718 705 718 C630 718 580 667 485 667 C440 667 410 673 369 698 Z" fill="#000" />
      </mask>
      <path d="M469 186H792A325.5 325.5 0 0 1 792 837H469Z" mask="url(#dp-logo-cut)" />
      <path d="M369 444 C410 419 440 413 485 413 C580 413 630 464 705 464 C760 464 800 449 836 430 L836 478 C800 497 760 512 705 512 C630 512 580 461 485 461 C440 461 410 467 369 492 Z M369 547 C410 522 440 516 485 516 C580 516 630 567 705 567 C760 567 800 552 836 533 L836 581 C800 600 760 615 705 615 C630 615 580 564 485 564 C440 564 410 570 369 595 Z M369 650 C410 625 440 619 485 619 C580 619 630 670 705 670 C760 670 800 655 836 636 L836 684 C800 703 760 718 705 718 C630 718 580 667 485 667 C440 667 410 673 369 698 Z" />
    </svg>
  );
}
const SAMPLE_COLOR = { h: 172, s: 70 };
// The post's picture: a sunset beach photo with the Driftpost logo in the middle.
const SAMPLE_IMAGE = "/preview-sample.jpg";
const SAMPLE_ITEM: Item = {
  id: -1,
  feedId: -1,
  guid: "sample",
  title: "What the tide left behind",
  summary: "No rush and nothing to keep up with. Make a coffee, find a calm spot and read at the pace of the waves.",
  image: SAMPLE_IMAGE,
  published: 0,
  read: 0,
  starred: 0,
  addedAt: 0,
};

/** One list row drawn with the current Reading settings, for Settings. */
export function ListItemPreview() {
  const { thumbnails, showSummaries, colorDots } = useSettings();
  const { resolvedTheme } = useTheme();
  const color = dotColor(SAMPLE_COLOR, resolvedTheme === "dark");
  // "2 hours ago", whenever Settings is opened.
  const item = useMemo(() => ({ ...SAMPLE_ITEM, published: Date.now() - 2 * 60 * 60 * 1000 }), []);
  return (
    // A picture of a row, not a working one.
    <div inert aria-label="Preview of a post in your lists" className="bg-background rounded-lg border px-3">
      <ol>
        <ItemRow
          item={item}
          feed={SAMPLE_FEED}
          dotColor={colorDots ? color : undefined}
          tileColor={color}
          tileIcon={<DriftpostLogo className="size-7 sm:size-8" />}
          showFeed
          showThumbnail={thumbnails !== "none"}
          showImage={thumbnails === "image"}
          reserveThumbnail
          showSummary={showSummaries}
          selected={false}
          compact={false}
          onSelect={() => {}}
        />
      </ol>
    </div>
  );
}

function ItemRow(props: {
  item: Item;
  feed?: Feed;
  showFeed: boolean;
  showThumbnail: boolean;
  /** Use the post's picture when it has one (otherwise always the feed's tile). */
  showImage: boolean;
  /** Show a placeholder tile when the post has no picture. */
  reserveThumbnail: boolean;
  /** The feed's colour, for the placeholder tile. */
  tileColor?: string;
  /** Drawn on the placeholder tile instead of the feed's icon. */
  tileIcon?: ReactNode;
  showSummary: boolean;
  selected: boolean;
  compact: boolean;
  /** The unread dot's colour; the default when not set. */
  dotColor?: string;
  onSelect: () => void;
}) {
  const { item, feed, showFeed, selected, compact } = props;
  const feedTitle = feed?.title;
  const [broken, setBroken] = useState(false);
  const picture = props.showImage && item.image && !broken ? item.image : undefined;
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
        {props.showThumbnail && (picture || props.reserveThumbnail) && (
          <div className={cn("shrink-0", compact ? "size-12" : "size-16 sm:size-20")}>
            {picture ? (
              <img
                key={picture}
                src={picture}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                className="bg-muted size-full rounded-md object-cover"
                onError={() => setBroken(true)}
              />
            ) : (
              feed && <FeedTile feed={feed} color={props.tileColor} icon={props.tileIcon} compact={compact} />
            )}
          </div>
        )}
      </button>
    </li>
  );
}

/**
 * Stands in for a missing picture: the feed's small icon in the middle of a tile tinted
 * with its colour. Dark icons (dark shapes on see-through) need a light tile in dark mode:
 * a pale tint of their colour, or light grey when they have none.
 */
function FeedTile({ feed, color, icon, compact }: { feed: Feed; color?: string; icon?: ReactNode; compact: boolean }) {
  const light = iconNeedsTile(feed);
  const tint = color && `color-mix(in oklab, ${color} 22%, transparent)`;
  const style = {
    "--tile": tint ?? "var(--muted)",
    "--tile-dark": light ? (color ? `color-mix(in oklab, ${color} 20%, oklch(0.93 0 0))` : "oklch(0.92 0 0)") : (tint ?? "var(--muted)"),
  } as CSSProperties;
  return (
    <div aria-hidden className="grid size-full place-items-center rounded-md bg-(--tile) dark:bg-(--tile-dark)" style={style}>
      {icon ?? <FeedIcon feed={feed} bare className={cn(compact ? "size-5" : "size-6 sm:size-7", "text-xs")} />}
    </div>
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
