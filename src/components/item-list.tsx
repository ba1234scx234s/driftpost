import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { db, type Item } from "@/lib/db";
import { makeTitleFilter, useSettings } from "@/lib/settings";
import { relativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { startOfToday, type View } from "@/lib/views";

const PAGE = 200;

export function ItemList({ view }: { view: View }) {
  // Remount per view so "posts read while here" starts fresh each time.
  return <ItemListInner key={String(view)} view={view} />;
}

function ItemListInner({ view }: { view: View }) {
  const today = startOfToday();
  const { keywords, hideRead, showThumbnails, showSummaries } = useSettings();
  const hidden = useMemo(() => makeTitleFilter(keywords), [keywords]);
  // With "hide read posts" on, posts you open stay put until you leave this view.
  const [readHere, setReadHere] = useState<ReadonlySet<number>>(new Set());

  const items = useLiveQuery(() => {
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
      .filter((it) => !hidden(it.title) && (!hideRead || !it.read || readHere.has(it.id)))
      .limit(PAGE)
      .toArray();
  }, [view, today, hidden, hideRead, readHere]);
  const feedTitles = useLiveQuery(async () => new Map((await db.feeds.toArray()).map((f) => [f.id, f.title])), []);
  const showFeed = typeof view !== "number";

  const markRead = (item: Item) => {
    if (item.read) return;
    setReadHere((prev) => new Set(prev).add(item.id));
    void db.items.update(item.id, { read: 1 });
  };

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
    <ScrollArea className="min-h-0 flex-1">
      <ol className="mx-auto flex max-w-2xl flex-col px-4 py-2 sm:px-6">
        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            feedTitle={feedTitles?.get(item.feedId)}
            showFeed={showFeed}
            showThumbnail={showThumbnails}
            showSummary={showSummaries}
            onOpen={() => markRead(item)}
          />
        ))}
      </ol>
    </ScrollArea>
  );
}

function ItemRow({
  item,
  feedTitle,
  showFeed,
  showThumbnail,
  showSummary,
  onOpen,
}: {
  item: Item;
  feedTitle?: string;
  showFeed: boolean;
  showThumbnail: boolean;
  showSummary: boolean;
  onOpen: () => void;
}) {
  return (
    <li className="border-border/60 border-b last:border-b-0">
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onOpen}
        onAuxClick={onOpen}
        className="hover:bg-accent/50 focus-visible:ring-ring -mx-3 flex gap-4 rounded-lg px-3 py-4 outline-none focus-visible:ring-2"
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
          <h2 className={cn("font-heading text-base leading-snug font-medium", item.read && "text-muted-foreground")}>
            {item.title}
          </h2>
          {showSummary && item.summary && (
            <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">{item.summary}</p>
          )}
        </div>
        {showThumbnail && item.image && (
          <img
            src={item.image}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className="bg-muted size-16 shrink-0 rounded-md object-cover sm:size-20"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
      </a>
    </li>
  );
}
