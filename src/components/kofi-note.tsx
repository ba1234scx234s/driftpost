import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { countCaughtUp, KOFI_URL, rememberKofiFollowed } from "@/lib/kofi";

/**
 * A quiet Ko-fi prompt for "you've read everything" moments. Each sighting counts; it only
 * shows every 5th time, and not for 180 days after a Ko-fi link is followed (see kofi.ts).
 */
export function KofiNote({ otherwise, className }: { otherwise?: ReactNode; className?: string }) {
  // Not decided yet (null), then whether to ask this time.
  const [ask, setAsk] = useState<boolean | null>(null);
  useEffect(() => {
    // Lists are empty for a moment while they load: only count the message once it stays.
    let cancelled = false;
    const timer = setTimeout(() => void countCaughtUp().then((yes) => !cancelled && setAsk(yes)), 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);
  if (ask === null) return null;
  if (!ask) return otherwise ?? null;
  return (
    <div
      className={cn(
        "text-muted-foreground flex max-w-sm flex-col items-center gap-3 rounded-lg border p-5 text-center text-sm",
        className,
      )}
    >
      <p>
        <span className="text-foreground">Enjoying Driftpost?</span>
        <br />
        It's free, with no ads or tracking. If you'd like to support it, you can buy me an iced coffee.
      </p>
      <KofiButton onClick={() => setAsk(false)} />
    </div>
  );
}

/**
 * Ko-fi's own "Support me on Ko-fi" button. The picture is a copy served by Driftpost, so
 * Ko-fi hears nothing until someone follows the link. Following it pauses the caught-up prompt for 180 days.
 */
export function KofiButton({ onClick }: { onClick?: () => void }) {
  return (
    <a
      href={KOFI_URL}
      target="_blank"
      rel="noreferrer"
      onClick={() => {
        rememberKofiFollowed();
        onClick?.();
      }}
      className="focus-visible:ring-ring/50 inline-block rounded-lg outline-none focus-visible:ring-3"
    >
      {/* A faint edge in dark mode, where the dark button would otherwise melt into the page. */}
      <img
        src="/support-me-on-kofi.png"
        alt="Support me on Ko-fi"
        className="h-9 w-auto rounded-[0.5rem] dark:outline dark:outline-1 dark:outline-white/20"
      />
    </a>
  );
}
