import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { CheckCheckIcon, RefreshCwIcon, SettingsIcon } from "lucide-react";
import { toast } from "sonner";
import { AddFeedForm } from "@/components/add-feed-form";
import { FeedSidebar, SidebarRow } from "@/components/feed-sidebar";
import { ItemList } from "@/components/item-list";
import { Logo } from "@/components/logo";
import { SettingsPage } from "@/components/settings-page";
import { SubscriptionsMenu } from "@/components/subscriptions-menu";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { db, requestPersistence } from "@/lib/db";
import { markAllRead, markUnread, unreadInView } from "@/lib/feeds";
import { FONTS, makeTitleFilter, SIZES, useSettings } from "@/lib/settings";
import { relativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Screen } from "@/lib/views";

export default function App() {
  const [screen, setScreen] = useState<Screen>("all");
  const { refreshing, refreshNow } = useAutoRefresh();
  const settings = useSettings();
  const hidden = useMemo(() => makeTitleFilter(settings.keywords), [settings.keywords]);

  const feeds = useLiveQuery(() => db.feeds.toArray(), []);
  const selectedFeed = typeof screen === "number" ? feeds?.find((f) => f.id === screen) : undefined;
  const lastFetched = feeds?.length ? Math.max(...feeds.map((f) => f.lastFetched ?? 0)) : undefined;
  const isList = screen !== "settings";

  useEffect(() => {
    void requestPersistence();
  }, []);

  // Font and text size apply to the whole app: Tailwind sizes are in rem, so everything scales.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--app-font", FONTS[settings.font].stack);
    root.style.fontSize = `${SIZES[settings.size].px}px`;
  }, [settings.font, settings.size]);

  const unreadHere =
    useLiveQuery(() => (screen === "settings" ? 0 : unreadInView(screen, hidden).count()), [screen, hidden]) ?? 0;

  async function handleMarkAllRead() {
    if (screen === "settings") return;
    const ids = await markAllRead(screen, hidden);
    if (!ids.length) return;
    toast(`Marked ${ids.length} ${ids.length === 1 ? "post" : "posts"} as read`, {
      action: { label: "Undo", onClick: () => void markUnread(ids) },
      duration: 8000,
    });
  }

  async function handleRefresh() {
    const added = await refreshNow();
    toast(added ? `${added} new ${added === 1 ? "post" : "posts"}` : "You're all caught up");
  }

  const title =
    screen === "settings"
      ? "Settings"
      : (selectedFeed?.title ?? (screen === "today" ? "Today" : "All posts"));

  return (
    <div className="bg-background text-foreground flex h-dvh flex-col md:flex-row">
      <aside className="bg-sidebar flex max-h-[45dvh] shrink-0 flex-col border-b md:max-h-none md:w-72 md:border-r md:border-b-0">
        <div className="flex flex-col gap-3 p-3">
          <div className="flex items-center justify-between">
            <h1 className="font-heading flex items-center gap-2 px-1 text-lg font-semibold tracking-tight">
              <Logo className="size-6" aria-hidden title="" />
              Driftpost
            </h1>
            <SubscriptionsMenu />
          </div>
          <AddFeedForm onAdded={(feed) => setScreen(feed.id)} onShowFeed={setScreen} />
        </div>
        <Separator />
        <FeedSidebar selected={screen} onSelect={setScreen} hidden={hidden} />
        <Separator />
        <div className="p-2">
          <SidebarRow
            active={screen === "settings"}
            onClick={() => setScreen("settings")}
            icon={<SettingsIcon className="size-4" />}
            label="Settings"
          />
        </div>
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex min-h-12 items-center gap-3 border-b px-4 py-2.5 sm:px-6">
          <h2 className="truncate text-sm font-medium">{title}</h2>
          {isList && (
            <div className="text-muted-foreground ml-auto flex items-center gap-2 text-xs">
              {lastFetched ? <span className="hidden sm:inline">Updated {relativeTime(lastFetched)}</span> : null}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleMarkAllRead}
                    disabled={!unreadHere}
                    aria-label="Mark all as read"
                  >
                    <CheckCheckIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Mark all as read</TooltipContent>
              </Tooltip>
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
          )}
        </header>
        {screen === "settings" ? <SettingsPage /> : <ItemList view={screen} />}
      </main>
    </div>
  );
}
