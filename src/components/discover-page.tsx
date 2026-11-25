import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { CheckIcon, Loader2Icon, PlusIcon, SearchIcon } from "lucide-react";
import { toast } from "sonner";
import { FeedIcon } from "@/components/feed-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CATALOG, type CatalogFeed } from "@/lib/catalog";
import { db } from "@/lib/db";
import { AlreadyFollowingError } from "@/lib/discover";
import { subscribe } from "@/lib/feeds";
import { feedKey } from "@/lib/url";
import { cn } from "@/lib/utils";

/** Popular feeds by category, each one click away from following. */
export function DiscoverPage({ onShowFeed }: { onShowFeed: (feedId: number) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");

  // Followed feeds by address, so cards can say "Following" and link to them.
  const followed = useLiveQuery(async () => {
    const map = new Map<string, number>();
    for (const f of await db.feeds.toArray()) {
      map.set(feedKey(f.url), f.id);
      if (f.sourceUrl) map.set(feedKey(f.sourceUrl), f.id);
    }
    return map;
  }, []);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATALOG.filter((c) => category === "all" || c.id === category)
      .map((c) => ({
        ...c,
        feeds: q
          ? c.feeds.filter((f) => `${f.title} ${f.about} ${c.label}`.toLowerCase().includes(q))
          : c.feeds,
      }))
      .filter((c) => c.feeds.length);
  }, [query, category]);

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <p className="text-muted-foreground max-w-prose text-sm">
          Popular feeds to get you started. Follow a few, then come back any time.
        </p>

        <div className="relative mt-4">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search feeds"
            aria-label="Search feeds"
            className="pl-8"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Categories">
          {[{ id: "all", label: "All" }, ...CATALOG].map((c) => (
            <Button
              key={c.id}
              size="sm"
              variant={category === c.id ? "default" : "outline"}
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
              className="h-7 rounded-full px-3 text-xs"
            >
              {c.label}
            </Button>
          ))}
        </div>

        {sections.length === 0 && (
          <p className="text-muted-foreground mt-10 text-center text-sm">
            No feeds match “{query}”. You can still paste any site's address in the box at the top left.
          </p>
        )}

        {sections.map((c) => (
          <section key={c.id} className="mt-8" aria-labelledby={`discover-${c.id}`}>
            <h3 id={`discover-${c.id}`} className="mb-3 text-sm font-medium">
              {c.label}
            </h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {c.feeds.map((f) => (
                <FeedCard
                  key={f.url}
                  feed={f}
                  followedId={followed?.get(feedKey(f.url))}
                  onShowFeed={onShowFeed}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </ScrollArea>
  );
}

function FeedCard(props: { feed: CatalogFeed; followedId?: number; onShowFeed: (id: number) => void }) {
  const { feed, followedId } = props;
  const [busy, setBusy] = useState(false);

  async function follow() {
    setBusy(true);
    try {
      const added = await subscribe(feed.url);
      toast.success(`Following ${added.title}`, {
        action: { label: "Show", onClick: () => props.onShowFeed(added.id) },
      });
    } catch (err) {
      if (err instanceof AlreadyFollowingError) {
        toast(`You already follow ${err.feed.title}`, {
          action: { label: "Show", onClick: () => props.onShowFeed(err.feed.id) },
        });
      } else {
        toast.error(`Couldn't follow ${feed.title}`, {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <li
      className={cn(
        "bg-card flex items-center gap-3 rounded-lg border p-3",
        followedId && "bg-muted/40",
      )}
    >
      <FeedIcon feed={{ title: feed.title, url: feed.url, siteUrl: feed.site }} className="size-6" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{feed.title}</p>
        <p className="text-muted-foreground truncate text-xs">{feed.about}</p>
      </div>
      {followedId ? (
        <Button variant="ghost" size="sm" onClick={() => props.onShowFeed(followedId)} aria-label={`Show ${feed.title}`}>
          <CheckIcon />
          Following
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={follow} disabled={busy} aria-label={`Follow ${feed.title}`}>
          {busy ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
          Follow
        </Button>
      )}
    </li>
  );
}
