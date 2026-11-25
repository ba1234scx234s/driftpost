import { useState } from "react";
import type { Feed } from "@/lib/db";
import { cn } from "@/lib/utils";

/**
 * A feed's site icon. Icons are fetched through Driftpost's own /api/icon so their
 * pixels can be read: dark icons on a see-through background would vanish in dark mode,
 * so those get a light tile behind them (dark mode only). Without an icon, the feed's
 * first letter in a small round badge.
 */
export function FeedIcon({
  feed,
  className,
}: {
  feed: Pick<Feed, "title" | "url" | "siteUrl">;
  className?: string;
}) {
  const host = hostname(feed.siteUrl ?? feed.url);
  const [state, setState] = useState<"loading" | "ok" | "failed">(host ? "loading" : "failed");
  const [needsTile, setNeedsTile] = useState(() => (host ? (cachedTile(host) ?? false) : false));

  if (!host || state === "failed") return <LetterIcon title={feed.title} className={className} />;

  return (
    <span
      className={cn(
        "grid size-4 shrink-0 place-items-center overflow-hidden rounded-sm",
        needsTile && "dark:bg-neutral-200 dark:p-px",
        className,
      )}
    >
      <img
        src={`/api/icon?host=${encodeURIComponent(host)}`}
        alt=""
        loading="lazy"
        className={cn("size-full object-contain", state === "loading" && "opacity-0")}
        onLoad={(e) => {
          setState("ok");
          let dark = cachedTile(host);
          if (dark === undefined) {
            const look = analyse(e.currentTarget);
            // Some icons draw nothing at all (e.g. old 1-bit .ico files): use the letter.
            if (look === "empty") return setState("failed");
            dark = look === "dark";
            remember(host, dark);
          }
          // Another icon for the same site may have checked it since this one mounted.
          setNeedsTile(dark);
        }}
        onError={() => setState("failed")}
      />
    </span>
  );
}

function LetterIcon({ title, className }: { title: string; className?: string }) {
  const letter = title.trim().match(/[\p{L}\p{N}]/u)?.[0]?.toUpperCase() ?? "•";
  return (
    <span
      aria-hidden
      className={cn(
        "bg-muted-foreground/20 text-foreground/80 grid size-4 shrink-0 place-items-center rounded-full text-[9px] leading-none font-semibold",
        className,
      )}
    >
      {letter}
    </span>
  );
}

/**
 * "dark" when the icon is mostly dark shapes on a see-through background, the kind made
 * for white pages. A dark icon with its own solid background shows fine and is left alone.
 * "empty" when it draws (almost) nothing.
 */
function analyse(img: HTMLImageElement): "dark" | "fine" | "empty" {
  try {
    const size = 32;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return "fine";
    ctx.drawImage(img, 0, 0, size, size);
    const px = ctx.getImageData(0, 0, size, size).data;
    let clear = 0;
    let solid = 0;
    let dark = 0;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 128) {
        clear++;
        continue;
      }
      solid++;
      const lum = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
      if (lum < 0.3) dark++;
    }
    const total = size * size;
    if (solid / total < 0.03) return "empty";
    return clear / total > 0.1 && dark / solid > 0.5 ? "dark" : "fine";
  } catch {
    return "fine"; // couldn't read the pixels: leave it as it is
  }
}

// One check per site, remembered between visits.
const KEY = "driftpost:icon-tiles";
let memo: Record<string, boolean> | undefined;

function load(): Record<string, boolean> {
  if (!memo) {
    try {
      memo = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    } catch {
      memo = {};
    }
  }
  return memo!;
}

function cachedTile(host: string): boolean | undefined {
  return load()[host];
}

function remember(host: string, dark: boolean) {
  load()[host] = dark;
  try {
    localStorage.setItem(KEY, JSON.stringify(memo));
  } catch {
    // storage unavailable: it's checked again next time
  }
}

function hostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
