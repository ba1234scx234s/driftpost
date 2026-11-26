import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { CheckCheckIcon, CompassIcon, MenuIcon, PlusIcon, RefreshCwIcon, SettingsIcon, UploadIcon, XIcon } from "lucide-react";
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
import { SettingsPage, type SettingsSectionId } from "@/components/settings-page";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useVisibleItems } from "@/hooks/use-visible-items";
import { db, requestPersistence, type Item } from "@/lib/db";
import { markAllRead, markUnread, unreadInView } from "@/lib/feeds";
import { fontStack, googleFamily, loadGoogleFont } from "@/lib/fonts";
import { lineHeightOf, makePostFilter, SIZES, useSettings } from "@/lib/settings";
import { relativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Screen, View } from "@/lib/views";
import { EndCard } from "@/components/end-card";

export default function App() {
  const [screen, setScreenState] = useState<Screen>("all");
  // The article open in the reader column, if any.
  const [selected, setSelected] = useState<Item | null>(null);
  // Went past the last article: the reader shows the end card instead.
  const [atEnd, setAtEnd] = useState(false);
  // Posts read while this list is open stay visible even with "hide read posts" on.
  const [keepIds, setKeepIds] = useState<ReadonlySet<number>>(new Set());
  const { refreshing, refreshNow } = useAutoRefresh();
  const settings = useSettings();
  const hidden = useMemo(
    () => makePostFilter(settings.keywords, settings.hiddenTopics, settings.hiddenTags),
    [settings.keywords, settings.hiddenTopics, settings.hiddenTags],
  );

  const feeds = useLiveQuery(() => db.feeds.toArray(), []);
  const [addOpen, setAddOpen] = useState(false);
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  /** Go somewhere from the sidebar; on phones that also closes the menu. */
  const go = useCallback((next: Screen) => {
    setScreen(next);
    setMenuOpen(false);
  }, []);
  const addInput = useRef<HTMLInputElement>(null);
  // A request to open Settings at one part; n changes so the same part can be asked for again.
  const [settingsJump, setSettingsJump] = useState<{ section: SettingsSectionId; n: number }>();
  // Opens Settings at Import and export.
  const showImportExport = useCallback(() => {
    setSettingsJump((prev) => ({ section: "import-export", n: (prev?.n ?? 0) + 1 }));
    setScreen("settings");
  }, []);
  // Opening the "follow a site" field puts the cursor in it.
  useEffect(() => {
    if (addOpen) addInput.current?.focus();
  }, [addOpen]);
  const selectedFeed = typeof screen === "number" ? feeds?.find((f) => f.id === screen) : undefined;
  const lastFetched = feeds?.length ? Math.max(...feeds.map((f) => f.lastFetched ?? 0)) : undefined;
  // The post list being shown, or null on the Settings and Discover pages.
  const view: View | null = screen === "settings" || screen === "discover" ? null : screen;
  const isList = view !== null;
  const items = useVisibleItems(view ?? "all", keepIds);

  const setScreen = useCallback((next: Screen) => {
    setScreenState(next);
    setSelected(null);
    setAtEnd(false);
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
      setAtEnd(false);
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
        } else if (selected && readerOpen && !atEnd) {
          e.preventDefault();
          setAtEnd(true);
        }
      } else if (e.key === "ArrowLeft" && atEnd) {
        e.preventDefault();
        setAtEnd(false);
      } else if (e.key === "ArrowLeft" && prevItem) {
        e.preventDefault();
        go(prevItem);
      } else if (e.key === "Enter" && openIn === "tab" && selected && !(target instanceof HTMLButtonElement)) {
        e.preventDefault();
        openItem(selected);
      } else if (e.key === "Escape" && selected) {
        setSelected(null);
        setAtEnd(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, selected, items, prevItem, nextItem, openItem, openIn, readerOpen, atEnd]);

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
    root.style.setProperty("--article-leading", String(lineHeightOf(settings)));
  }, [settings.font, settings.size, settings.lineHeight, settings.customLineHeight]);

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

  // The sidebar: a column on wider screens, a slide-in menu on phones.
  const sidebar = (
    <>
      {/* Same height and padding as the list header next to it, so their bottom lines meet. */}
      <div className="flex min-h-12 shrink-0 items-center justify-between border-b px-3 py-2.5">
          <h1 className="font-heading flex items-center gap-2 px-1 text-lg font-semibold tracking-tight">
            <Logo className="size-6" aria-hidden title="" />
            Driftpost
          </h1>
          {feeds && feeds.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={addOpen ? "Close" : "Follow a site"}
                  aria-expanded={addOpen}
                  onClick={() => setAddOpen((open) => !open)}
                >
                  {addOpen ? <XIcon /> : <PlusIcon />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{addOpen ? "Close" : "Follow a site"}</TooltipContent>
            </Tooltip>
          )}
      </div>
      {/* Always there until you follow something; after that, behind the + button. */}
      {(addOpen || feeds?.length === 0) && (
        <div className="flex flex-col gap-3 border-b p-3">
          <AddFeedForm
            inputRef={addInput}
            onAdded={(feed) => {
              setAddOpen(false);
              go(feed.id);
            }}
            onShowFeed={(id) => {
              setAddOpen(false);
              go(id);
            }}
            onCancel={feeds?.length ? () => setAddOpen(false) : undefined}
          />
          {/* Discover lives with "follow a site": the other way to find something new. */}
          <div className="-mx-1 -mt-1 flex flex-col gap-0.5">
            <SidebarRow
              active={screen === "discover"}
              onClick={() => go("discover")}
              icon={<CompassIcon className="size-4" />}
              label="Discover"
            />
            <SidebarRow
              active={false}
              onClick={() => {
              setMenuOpen(false);
              showImportExport();
            }}
              icon={<UploadIcon className="size-4" />}
              label="Import OPML"
            />
          </div>
        </div>
      )}
      <FeedSidebar selected={screen} onSelect={go} hidden={hidden} />
      <Separator />
      <div className="flex flex-col gap-0.5 p-2">
        <SidebarRow
          active={screen === "settings"}
          onClick={() => go("settings")}
          icon={<SettingsIcon className="size-4" />}
          label="Settings"
        />
      </div>
    </>
  );

  return (
    <div className="bg-background text-foreground flex h-dvh">
      {isMobile ? (
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="bg-sidebar w-[85vw] max-w-80 gap-0 p-0"
            // Don't jump focus to the + button (and pop its tooltip) when the menu opens.
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SheetDescription className="sr-only">Your feeds, Discover and Settings</SheetDescription>
            {sidebar}
          </SheetContent>
        </Sheet>
      ) : (
        <aside className="bg-sidebar flex w-72 shrink-0 flex-col border-r">{sidebar}</aside>
      )}

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
            {isMobile && (
              <Button variant="ghost" size="icon-sm" className="-ml-2" onClick={() => setMenuOpen(true)} aria-label="Open menu">
                <MenuIcon />
              </Button>
            )}
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
          <SettingsPage jump={settingsJump} />
        ) : screen === "discover" ? (
          <DiscoverPage onShowFeed={setScreen} />
        ) : feeds && feeds.length === 0 ? (
          <Welcome
            onDiscover={() => setScreen("discover")}
            onSettings={showImportExport}
            onOpenMenu={isMobile ? () => setMenuOpen(true) : undefined}
          />
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
            onClose={() => {
              setSelected(null);
              setAtEnd(false);
            }}
            onPrev={atEnd ? () => setAtEnd(false) : prevItem && (() => openItem(prevItem))}
            onNext={atEnd ? undefined : nextItem ? () => openItem(nextItem) : () => setAtEnd(true)}
            end={
              atEnd ? (
                <EndCard
                  view={view ?? "all"}
                  hidden={hidden}
                  onOpen={(feedId, item) => {
                    setScreen(feedId);
                    openItem(item);
                  }}
                  onBackToList={() => {
                    setSelected(null);
                    setAtEnd(false);
                  }}
                />
              ) : undefined
            }
          />
        )}
      </main>
      <BackupReminder />
    </div>
  );
}
