import { useState, type FormEvent, type Ref } from "react";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlreadyFollowingError } from "@/lib/discover";
import { subscribe } from "@/lib/feeds";
import type { Feed } from "@/lib/db";

export function AddFeedForm({
  onAdded,
  onShowFeed,
  onCancel,
  inputRef,
}: {
  onAdded: (feed: Feed) => void;
  onShowFeed: (feedId: number) => void;
  /** Esc in the field: close the form. */
  onCancel?: () => void;
  inputRef?: Ref<HTMLInputElement>;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim() || busy) return;
    setBusy(true);
    try {
      const feed = await subscribe(value);
      toast.success(`Following ${feed.title}`);
      setValue("");
      onAdded(feed);
    } catch (err) {
      if (err instanceof AlreadyFollowingError) {
        // Not an error as such: point to the feed you already have.
        const { id } = err.feed;
        toast.info(err.message, { action: { label: "Show", onClick: () => onShowFeed(id) } });
        setValue("");
        return;
      }
      toast.error(err instanceof Error ? err.message : "Couldn't add that feed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        ref={inputRef}
        value={value}
        onKeyDown={(e) => {
          if (e.key === "Escape" && onCancel) {
            setValue("");
            onCancel();
          }
        }}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Website or feed address"
        aria-label="Website or feed address"
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        disabled={busy}
      />
      <Button type="submit" size="icon" disabled={busy || !value.trim()} aria-label="Follow">
        {busy ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
      </Button>
    </form>
  );
}
