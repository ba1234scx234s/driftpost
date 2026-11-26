import { useLiveQuery } from "dexie-react-hooks";
import { ArrowRightIcon, CheckCircle2Icon } from "lucide-react";
import { FeedIcon } from "@/components/feed-icon";
import { KofiNote } from "@/components/kofi-note";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { db, type Feed, type Item } from "@/lib/db";
import { unreadInView } from "@/lib/feeds";
import type { FilterablePost } from "@/lib/settings";
import type { View } from "@/lib/views";

/** The next feed with unread posts, and its newest unread one. */
export interface NextFeed {
  feed: Feed;
  unread: number;
  first: Item;
}

interface Props {
  view: View;
  hidden: (post: FilterablePost) => boolean;
  /** The next feed to offer (worked out by the parent, so → can open it too). */
  next: NextFeed | undefined;
  /** Opens the next feed at its newest unread article. */
  onOpenNext: () => void;
  onBackToList: () => void;
}

/** Shown in the reader after the last article of a list (→ or a swipe past the end). */
export function EndCard({ view, hidden, next, onOpenNext, onBackToList }: Props) {
  const name = useLiveQuery(
    async () => (view === "all" ? "All posts" : view === "today" ? "Today" : (await db.feeds.get(view))?.title),
    [view],
  );
  const leftHere = useLiveQuery(() => unreadInView(view, hidden).count(), [view, hidden]);

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-6 py-16 text-center">
        <CheckCircle2Icon className="text-muted-foreground size-8" aria-hidden />
        <div className="flex w-full flex-col gap-1">
          <h2 className="font-heading text-xl font-semibold tracking-tight">That was the last post</h2>
          {name && (
            <p className="text-muted-foreground line-clamp-2 text-sm break-words" title={name}>
              in {name}
            </p>
          )}
          <p className="text-muted-foreground text-sm">
            {leftHere
              ? `${leftHere} unread ${leftHere === 1 ? "post is" : "posts are"} still further up the list.`
              : "You're all caught up here."}
          </p>
        </div>
        <div className="flex w-full flex-col items-center gap-2">
          {next && (
            <Button onClick={onOpenNext} className="max-w-full" title={`Next: ${next.feed.title} (→)`}>
              <FeedIcon feed={next.feed} />
              <span className="min-w-0 truncate">Next: {next.feed.title}</span>
              <span className="shrink-0 opacity-70">{next.unread}</span>
              <ArrowRightIcon />
            </Button>
          )}
          <Button variant={next ? "ghost" : "outline"} onClick={onBackToList}>
            Back to the list
          </Button>
        </div>
        {!leftHere && !next && <KofiNote />}
      </div>
    </ScrollArea>
  );
}

/** The next feed in the sidebar's order (wrapping round) with unread posts, and its newest one. */
export async function nextFeed(
  current: number,
  hidden: (post: FilterablePost) => boolean,
): Promise<NextFeed | undefined> {
  const feeds = await db.feeds.orderBy("addedAt").toArray();
  const at = feeds.findIndex((f) => f.id === current);
  const order = [...feeds.slice(at + 1), ...feeds.slice(0, Math.max(0, at))];
  for (const feed of order) {
    const unread = (await unreadInView(feed.id, hidden).toArray()).sort((a, b) => b.published - a.published);
    if (unread.length) return { feed, unread: unread.length, first: unread[0] };
  }
  return undefined;
}
