import { useCallback, useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { CheckCheckIcon, CompassIcon, RefreshCwIcon, SettingsIcon } from "lucide-react";
import { toast } from "sonner";
import { AddFeedForm } from "@/components/add-feed-form";
import { FeedMenu } from "@/components/feed-menu";
import { FeedSidebar, SidebarRow } from "@/components/feed-sidebar";
import { ItemList } from "@/components/item-list";
import { Reader } from "@/components/reader";
import { Logo } from "@/components/logo";
import { DiscoverPage } from "@/components/discover-page";
import { Welcome } from "@/components/welcome";
import { BackupReminder } from "@/components/backup-reminder";
import { SettingsPage } from "@/components/settings-page";
import { SubscriptionsMenu } from "@/components/subscriptions-menu";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { useVisibleItems } from "@/hooks/use-visible-items";
import { db, requestPersistence, type Item } from "@/lib/db";
import { markAllRead, markUnread, unreadInView } from "@/lib/feeds";
import { fontStack, googleFamily, loadGoogleFont } from "@/lib/fonts";
import { makePostFilter, SIZES, useSettings } from "@/lib/settings";
import { relativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Screen, View } from "@/lib/views";

export default function App() {
  const [screen, setScreenState] = useState<Screen>("all");
  // The article open in the reader column, if any.
  const [selected, setSelected] = useState<Item | null>(null);
  // Posts read while this list is open stay visible even with "hide read posts" on.
  const [keepIds, setKeepIds] = useState<ReadonlySet<number>>(new Set());
  const { refreshing, refreshNow } = useAutoRefresh();
  const settings = useSettings();
  const hidden = useMemo(
    () => makePostFilter(settings.keywords, settings.hiddenTopics, settings.hiddenTags),
    [settings.keywords, settings.hiddenTopics, settings.hiddenTags],
  );

  const feeds = useLiveQuery(() => db.feeds.toArray(), []);
  const selectedFeed = typeof screen === "number" ? feeds?.find((f) => f.id === screen) : undefined;
  const lastFetched = feeds?.length ? Math.max(...feeds.map((f) => f.lastFetched ?? 0)) : undefined;
  // The post list being shown, or null on the Settings and Discover pages.
  const view: View | null = screen === "settings" || screen === "discover" ? null : screen;
  const isList = view !== null;
  const items = useVisibleItems(view ?? "all", keepIds);

  const setScreen = useCallback((next: Screen) => {
    setScreenState(next);
    setSelected(null);
    setKeepIds(new Set());
  }, []);

  const openIn = settings.openIn;
  const readerOpen = !!selected && openIn !== "tab" && isList;

  const markRead = useCallback((item: Item) => {
    // Keep every opened post in this list until you leave it (see useVisibleItems).
    setKeepIds((prev) => (prev.has(item.id) ? prev : new Set(prev).add(item.id)));
    if (!item.read) void db.items.update(item.id, { read: 1 });
  }, []);

  /** Posts scrolled past in the list: mark them read but keep them in view until you leave. */
  const markScrolledPast = useCallback((ids: number[]) => {
    setKeepIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    void db.items.bulkUpdate(ids.map((key) => ({ key, changes: { read: 1 as const } })));
  }, []);

  /** Opens an article the way the "Open articles" setting says. */
  const openItem = useCallback(
    (item: Item) => {
      setSelected(item);
      markRead(item);
      if (openIn === "tab" && item.link) window.open(item.link, "_blank", "noopener,noreferrer");
    },
    [openIn, markRead],
  );

  const index = selected && items ? items.findIndex((it) => it.id === selected.id) : -1;
  const prevItem = index > 0 ? items![index - 1] : undefined;
  const nextItem = index >= 0 && items ? items[index + 1] : undefined;

  // ← and → step through the list; Esc closes the article.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || !isList) return;
      const target = e.target;
      if (target instanceof Element && target.closest("input, textarea, select, [contenteditable=true]")) return;
      if (document.querySelector("[role=dialog], [role=alertdialog], [role=menu], [role=listbox]")) return;

      // With "New tab", arrows only move the highlight; Enter opens it. Browsers block
      // tabs that open without a click or key press of their own, and a tab per key
      // press would be a lot.
      const go = (item: Item) => (openIn === "tab" ? setSelected(item) : openItem(item));

      if (e.key === "ArrowRight") {
        const next = selected ? nextItem : items?.[0];
        if (next) {
          e.preventDefault();
          go(next);
        }
      } else if (e.key === "ArrowLeft" && prevItem) {
        e.preventDefault();
        go(prevItem);
      } else if (e.key === "Enter" && openIn === "tab" && selected && !(target instanceof HTMLButtonElement)) {
        e.preventDefault();
        openItem(selected);
      } else if (e.key === "Escape" && selected) {
        setSelected(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, selected, items, prevItem, nextItem, openItem, openIn]);

  useEffect(() => {
    void requestPersistence();
  }, []);

  // Font and text size apply to the whole app: Tailwind sizes are in rem, so everything scales.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--app-font", fontStack(settings.font));
    const family = googleFamily(settings.font);
    if (family) void loadGoogleFont(family);
    root.style.fontSize = `${SIZES[settings.size].px}px`;
  }, [settings.font, settings.size]);

  const unreadHere =
    useLiveQuery(() => (view === null ? 0 : unreadInView(view, hidden).count()), [view, hidden]) ?? 0;

  async function handleMarkAllRead() {
    if (view === null) return;
    const ids = await markAllRead(view, hidden);
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
      : screen === "discover"
        ? "Discover"
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
        <div className="flex flex-col gap-0.5 p-2">
          <SidebarRow
            active={screen === "discover"}
            onClick={() => setScreen("discover")}
            icon={<CompassIcon className="size-4" />}
            label="Discover"
          />
          <SidebarRow
            active={screen === "settings"}
            onClick={() => setScreen("settings")}
            icon={<SettingsIcon className="size-4" />}
            label="Settings"
          />
        </div>
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1">
        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-col",
            // With an article open: list becomes a column on wide screens, hidden on narrow ones.
            readerOpen ? "hidden lg:flex lg:w-[24rem] lg:shrink-0 lg:border-r xl:w-[28rem]" : "flex-1",
          )}
        >
        <header className="flex min-h-12 items-center gap-3 border-b px-4 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-1">
            <h2 className="truncate text-sm font-medium">{title}</h2>
            {selectedFeed && <FeedMenu feed={selectedFeed} onUnfollowed={() => setScreen("all")} />}
          </div>
          {isList && (
            <div className="text-muted-foreground ml-auto flex items-center gap-2 text-xs">
              {lastFetched && !readerOpen ? <span className="hidden sm:inline">Updated {relativeTime(lastFetched)}</span> : null}
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
        {screen === "settings" ? (
          <SettingsPage />
        ) : screen === "discover" ? (
          <DiscoverPage onShowFeed={setScreen} />
        ) : feeds && feeds.length === 0 ? (
          <Welcome onDiscover={() => setScreen("discover")} onSettings={() => setScreen("settings")} />
        ) : (
          <ItemList
            view={view ?? "all"}
            items={items}
            selectedId={selected?.id ?? null}
            onSelect={openItem}
            compact={readerOpen}
            onScrolledPast={markScrolledPast}
          />
        )}
        </div>
        {readerOpen && selected && (
          <Reader
            item={selected}
            onClose={() => setSelected(null)}
            onPrev={prevItem && (() => openItem(prevItem))}
            onNext={nextItem && (() => openItem(nextItem))}
          />
        )}
      </main>
      <BackupReminder />
    </div>
  );
}
