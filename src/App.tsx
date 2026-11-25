import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import { AddFeedForm } from "@/components/add-feed-form";
import { FeedSidebar } from "@/components/feed-sidebar";
import { ItemList } from "@/components/item-list";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { db, requestPersistence } from "@/lib/db";
import { relativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export default function App() {
  const [selected, setSelected] = useState<number | "all">("all");
  const { refreshing, refreshNow } = useAutoRefresh();

  const feeds = useLiveQuery(() => db.feeds.toArray(), []);
  const selectedFeed = typeof selected === "number" ? feeds?.find((f) => f.id === selected) : undefined;
  const lastFetched = feeds?.length ? Math.max(...feeds.map((f) => f.lastFetched ?? 0)) : undefined;

  useEffect(() => {
    void requestPersistence();
  }, []);

  async function handleRefresh() {
    const added = await refreshNow();
    toast(added ? `${added} new ${added === 1 ? "post" : "posts"}` : "You're all caught up");
  }

  return (
    <div className="bg-background text-foreground flex h-dvh flex-col md:flex-row">
      <aside className="bg-sidebar flex max-h-[45dvh] shrink-0 flex-col border-b md:max-h-none md:w-72 md:border-r md:border-b-0">
        <div className="flex flex-col gap-3 p-3">
          <h1 className="font-heading px-1 text-lg font-semibold tracking-tight">Driftpost</h1>
          <AddFeedForm onAdded={(feed) => setSelected(feed.id)} />
        </div>
        <Separator />
        <FeedSidebar selected={selected} onSelect={setSelected} />
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b px-4 py-2.5 sm:px-6">
          <h2 className="truncate text-sm font-medium">{selectedFeed?.title ?? "All posts"}</h2>
          <div className="text-muted-foreground ml-auto flex items-center gap-2 text-xs">
            {lastFetched ? <span className="hidden sm:inline">Updated {relativeTime(lastFetched)}</span> : null}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleRefresh}
                  disabled={refreshing || !feeds?.length}
                  aria-label="Refresh feeds"
                >
                  <RefreshCwIcon className={cn(refreshing && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
          </div>
        </header>
        <ItemList feedId={selected} />
      </main>
    </div>
  );
}
