import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PostTags } from "@/components/post-tags";
import { SelectionFilter } from "@/components/selection-filter";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { loadFullArticle, sanitiseArticle, shouldLoadFullText } from "@/lib/article";
import { db, type Feed, type Item } from "@/lib/db";
import { useSwipe } from "@/hooks/use-swipe";

interface Props {
  item: Item;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  /** Shown instead of the article: the card after the last one in the list. */
  end?: ReactNode;
}

/** The third column: one article, shown in the app. */
export function Reader({ item, onClose, onPrev, onNext, end }: Props) {
  const feed = useLiveQuery(() => db.feeds.get(item.feedId), [item.feedId]);
  // Read the live row so a fetched full text shows as soon as it's saved. While the
  // query for a newly opened article is loading it still returns the previous row,
  // so only trust it when the ids match.
  const row = useLiveQuery(() => db.items.get(item.id), [item.id]);
  const live = row?.id === item.id ? row : item;
  // On touch screens: swipe right-to-left for the next article (like →), left-to-right for the previous.
  const swipeArea = useRef<HTMLDivElement>(null);
  useSwipe(swipeArea, { onLeft: onNext, onRight: onPrev });

  return (
    <section className="bg-background flex min-h-0 min-w-0 flex-1 flex-col" aria-label="Article">
      <header className="flex h-13 shrink-0 items-center gap-1 border-b px-2 sm:px-4">
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Back to list" className="lg:hidden">
          <ArrowLeftIcon />
        </Button>
        <NavButton label="Previous article" keyHint="←" onClick={onPrev}>
          <ChevronLeftIcon />
        </NavButton>
        <NavButton label="Next article" keyHint="→" onClick={onNext}>
          <ChevronRightIcon />
        </NavButton>
        <div className="ml-auto flex items-center gap-1">
          {live.link && !end && (
            <Button variant="ghost" size="sm" asChild>
              <a href={live.link} target="_blank" rel="noopener noreferrer">
                <ExternalLinkIcon />
                <span className="hidden sm:inline">Open original</span>
              </a>
            </Button>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                aria-label="Close article"
                className="hidden lg:inline-flex"
              >
                <XIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Close (Esc)</TooltipContent>
          </Tooltip>
        </div>
      </header>

      <div ref={swipeArea} className="flex min-h-0 flex-1 flex-col">
        {end ?? <ArticleView key={live.id} item={item} live={live} feed={feed} />}
      </div>
    </section>
  );
}

type FullState = "idle" | "loading" | "done" | "failed";

/** The article's text in Driftpost's own layout. */
function ArticleView({ item, live, feed }: { item: Item; live: Item; feed: Feed | undefined }) {
  const [full, setFull] = useState<FullState>("idle");

  // When the feed only has a preview of its own article, fetch the page and pull out the text.
  useEffect(() => {
    if (!feed || feed.id !== item.feedId || !shouldLoadFullText(item, feed)) return;
    let cancelled = false;
    setFull("loading");
    loadFullArticle(item)
      .then((html) => !cancelled && setFull(html ? "done" : "failed"))
      .catch(() => !cancelled && setFull("failed"));
    return () => {
      cancelled = true;
    };
    // Only when a different article opens, not on every live update of this one.
  }, [item.id, feed?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const html = useMemo(() => {
    const source = live.fullContent ?? live.content ?? (live.summary ? `<p>${escapeHtml(live.summary)}</p>` : "");
    return sanitiseArticle(source, live.link);
  }, [live.fullContent, live.content, live.summary, live.link]);

  const date = new Date(live.published);
  const articleRef = useRef<HTMLElement>(null);

  return (
    <ScrollArea className="min-h-0 flex-1">
      <SelectionFilter containerRef={articleRef} />
      <article ref={articleRef} className="mx-auto max-w-[68ch] px-5 py-8 sm:px-8">
        <p className="text-muted-foreground mb-2 text-sm">
          {feed?.title}
          {live.author && feed?.title !== live.author && <> · {live.author}</>}
        </p>
        <h1 className="font-heading text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl">
          {live.title}
        </h1>
        <time dateTime={date.toISOString()} className="text-muted-foreground mt-2 block text-sm">
          {date.toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" })}
        </time>
        <PostTags item={live} />

        {full === "loading" && (
          <p className="text-muted-foreground mt-6 flex items-center gap-2 text-sm">
            <Loader2Icon className="size-4 animate-spin" /> Loading the full article…
          </p>
        )}
        {full === "failed" && !live.fullContent && (
          <p className="text-muted-foreground bg-muted mt-6 rounded-md px-3 py-2 text-sm">
            This feed only shares a preview, and the full article couldn't be loaded.{" "}
            {live.link && (
              <a href={live.link} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                Read it on the site
              </a>
            )}
          </p>
        )}

        <div
          className="prose prose-neutral dark:prose-invert prose-img:rounded-md prose-a:underline-offset-2 prose-pre:whitespace-pre-wrap mt-8 leading-(--article-leading) max-w-none break-words"
          // Sanitised by DOMPurify in sanitiseArticle.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </article>
    </ScrollArea>
  );
}

function NavButton(props: { label: string; keyHint: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" onClick={props.onClick} disabled={!props.onClick} aria-label={props.label}>
          {props.children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {props.label} ({props.keyHint})
      </TooltipContent>
    </Tooltip>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}
