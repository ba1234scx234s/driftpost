import { useEffect, useState, type ReactNode } from "react";
import { CupSodaIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { countCaughtUp, KOFI_URL, snoozeKofi } from "@/lib/kofi";

/**
 * A quiet Ko-fi prompt for "you've read everything" moments. Each sighting counts; it only
 * shows every 5th time, and not for 180 days after the link is followed (see kofi.ts).
 */
export function KofiNote({ otherwise, className }: { otherwise?: ReactNode; className?: string }) {
  // Not decided yet (null), then whether to ask this time.
  const [ask, setAsk] = useState<boolean | null>(null);
  useEffect(() => {
    // Lists are empty for a moment while they load: only count the message once it stays.
    const timer = setTimeout(() => setAsk(countCaughtUp()), 600);
    return () => clearTimeout(timer);
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
        Enjoying Driftpost? It's free, with no ads or tracking. If you'd like to support it, you can buy me an iced
        coffee.
      </p>
      <Button size="sm" asChild>
        <a
          href={KOFI_URL}
          target="_blank"
          rel="noreferrer"
          onClick={() => {
            snoozeKofi();
            setAsk(false);
          }}
        >
          <CupSodaIcon />
          Buy me an iced coffee on Ko-fi
        </a>
      </Button>
    </div>
  );
}
