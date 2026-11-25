import { useLiveQuery } from "dexie-react-hooks";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { db, type Item } from "@/lib/db";
import { relativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { startOfToday, type View } from "@/lib/views";

const PAGE = 200;

export function ItemList({ view }: { view: View }) {
  const today = startOfToday();
  const items = useLiveQuery(() => {
    if (view === "all") return db.items.orderBy("published").reverse().limit(PAGE).toArray();
    if (view === "today") return db.items.where("published").aboveOrEqual(today).reverse().limit(PAGE).toArray();
    return db.items
      .where("[feedId+published]")
      .between([view, -Infinity], [view, Infinity])
      .reverse()
      .limit(PAGE)
      .toArray();
  }, [view, today]);
  const showFeed = typeof view !== "number";
  const feedTitles = useLiveQuery(async () => new Map((await db.feeds.toArray()).map((f) => [f.id, f.title])), []);

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
        {view === "today"
          ? "Nothing new today yet. Posts from today drift in as your feeds update."
          : "Nothing here yet. New posts drift in as your feeds update."}
      </div>
    );
  }

  return (
    <ScrollArea className="min-h-0 flex-1">
      <ol className="mx-auto flex max-w-2xl flex-col px-4 py-2 sm:px-6">
        {items.map((item) => (
          <ItemRow key={item.id} item={item} feedTitle={feedTitles?.get(item.feedId)} showFeed={showFeed} />
        ))}
      </ol>
    </ScrollArea>
  );
}

function ItemRow({ item, feedTitle, showFeed }: { item: Item; feedTitle?: string; showFeed: boolean }) {
  const markRead = () => {
    if (!item.read) void db.items.update(item.id, { read: 1 });
  };

  return (
    <li className="border-border/60 border-b last:border-b-0">
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={markRead}
        onAuxClick={markRead}
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
          {item.summary && (
            <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">{item.summary}</p>
          )}
        </div>
        {item.image && (
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
