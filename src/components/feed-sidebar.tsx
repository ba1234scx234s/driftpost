import { useLiveQuery } from "dexie-react-hooks";
import { CircleAlertIcon, InboxIcon, SunIcon, Trash2Icon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { db, type Feed } from "@/lib/db";
import { unsubscribe } from "@/lib/feeds";
import { cn } from "@/lib/utils";
import type { FilterablePost } from "@/lib/settings";
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
        {feeds.map((feed) => (
          <SidebarRow
            key={feed.id}
            active={selected === feed.id}
            onClick={() => onSelect(feed.id)}
            icon={<FeedIcon feed={feed} />}
            label={feed.title}
            count={unread?.counts.get(feed.id)}
            error={feed.lastError}
            action={
              <RemoveFeed
                feed={feed}
                onRemoved={() => {
                  if (selected === feed.id) onSelect("all");
                }}
              />
            }
          />
        ))}
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
  action?: React.ReactNode;
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
          <span
            className={cn(
              "text-muted-foreground ml-auto pl-2 text-xs tabular-nums",
              // Make room for the unfollow button on hover.
              props.action && "group-focus-within:hidden group-hover:hidden",
            )}
          >
            {props.count}
          </span>
        )}
      </button>
      {props.action && <div className="hidden group-focus-within:block group-hover:block">{props.action}</div>}
    </div>
  );
}

function FeedIcon({ feed }: { feed: Feed }) {
  const host = hostname(feed.siteUrl ?? feed.url);
  if (!host) return <span className="bg-muted size-4 rounded-sm" />;
  // Favicons come from the site itself, so no third-party service learns what you follow.
  return (
    <img
      src={`https://${host}/favicon.ico`}
      alt=""
      className="size-4 rounded-sm"
      loading="lazy"
      onError={(e) => {
        e.currentTarget.style.visibility = "hidden";
      }}
    />
  );
}

function RemoveFeed({ feed, onRemoved }: { feed: Feed; onRemoved: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label={`Unfollow ${feed.title}`}>
          <Trash2Icon />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unfollow {feed.title}?</AlertDialogTitle>
          <AlertDialogDescription>
            Its posts are removed from Driftpost, including any you starred. You can follow it again later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={async () => {
              await unsubscribe(feed.id);
              onRemoved();
            }}
          >
            Unfollow
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function hostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
