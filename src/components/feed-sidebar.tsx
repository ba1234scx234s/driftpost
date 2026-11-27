import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { CircleAlertIcon, InboxIcon, SunIcon } from "lucide-react";
import { FeedIcon } from "@/components/feed-icon";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { db, type Feed } from "@/lib/db";
import { cn } from "@/lib/utils";
import { type FilterablePost } from "@/lib/settings";
import { startOfToday, type Screen } from "@/lib/views";

interface Props {
  selected: Screen;
  onSelect: (screen: Screen) => void;
  /** Keyword filter: hidden posts don't count as unread. */
  hidden: (post: FilterablePost) => boolean;
}

export function FeedSidebar({ selected, onSelect, hidden }: Props) {
  const feeds = useLiveQuery(() => db.feeds.orderBy("addedAt").toArray(), []) ?? [];
  // Unread counts stay small and quiet on purpose.
  const today = startOfToday();
  const unread = useLiveQuery(async () => {
    const counts = new Map<number, number>();
    let todayCount = 0;
    await db.items.where("read").equals(0).each((it) => {
      if (hidden(it)) return;
      counts.set(it.feedId, (counts.get(it.feedId) ?? 0) + 1);
      if (it.published >= today) todayCount++;
    });
    return { counts, today: todayCount };
  }, [today, hidden]);

  // Feeds with nothing unread go behind a "N feeds read" link, except the one you're in.
  const [showReadFeeds, setShowReadFeeds] = useState(false);
  const isRead = (feed: Feed) => !!unread && !unread.counts.get(feed.id) && selected !== feed.id;
  const readFeedCount = feeds.filter(isRead).length;
  const shownFeeds = readFeedCount && !showReadFeeds ? feeds.filter((f) => !isRead(f)) : feeds;

  return (
    <ScrollArea className="min-h-0 flex-1">
      <nav className="flex flex-col gap-0.5 p-2" aria-label="Feeds">
        <SidebarRow
          active={selected === "all"}
          onClick={() => onSelect("all")}
          icon={<InboxIcon className="size-4" />}
          label="All posts"
          count={unread ? [...unread.counts.values()].reduce((a, b) => a + b, 0) : undefined}
        />
        <SidebarRow
          active={selected === "today"}
          onClick={() => onSelect("today")}
          icon={<SunIcon className="size-4" />}
          label="Today"
          count={unread?.today}
        />
        {feeds.length > 0 && <p className="text-muted-foreground px-2 pt-4 pb-1 text-xs font-medium">Feeds</p>}
        {shownFeeds.map((feed) => (
          <SidebarRow
            key={feed.id}
            active={selected === feed.id}
            onClick={() => onSelect(feed.id)}
            icon={<FeedIcon feed={feed} />}
            label={feed.title}
            count={unread?.counts.get(feed.id)}
            error={feed.lastError}
          />
        ))}
        {readFeedCount > 0 && (
          <button
            type="button"
            onClick={() => setShowReadFeeds((v) => !v)}
            aria-expanded={showReadFeeds}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 mt-1 self-start rounded-sm px-2 py-1 text-xs underline-offset-2 outline-none hover:underline focus-visible:ring-[3px]"
          >
            {showReadFeeds
              ? "Hide read feeds"
              : `${readFeedCount} ${readFeedCount === 1 ? "feed" : "feeds"} read`}
          </button>
        )}
        {feeds.length === 0 && (
          <p className="text-muted-foreground px-2 pt-4 text-sm">Add a site above to start reading.</p>
        )}
      </nav>
    </ScrollArea>
  );
}

export function SidebarRow(props: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
  error?: string;
}) {
  return (
    <div
      className={cn(
        "group hover:bg-accent flex items-center rounded-md pr-1 transition-colors",
        props.active && "bg-accent",
      )}
    >
      <button
        type="button"
        onClick={props.onClick}
        aria-current={props.active ? "page" : undefined}
        className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm"
      >
        <span className="text-muted-foreground flex size-4 shrink-0 items-center justify-center">{props.icon}</span>
        <span className="truncate" title={props.label}>{props.label}</span>
        {props.error && (
          <Tooltip>
            <TooltipTrigger asChild>
              <CircleAlertIcon className="text-destructive size-3.5 shrink-0" aria-label="Last refresh failed" />
            </TooltipTrigger>
            <TooltipContent>{props.error}</TooltipContent>
          </Tooltip>
        )}
        {!!props.count && (
          <span className="text-muted-foreground ml-auto pl-2 text-xs tabular-nums">{props.count}</span>
        )}
      </button>
    </div>
  );
}
