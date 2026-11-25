import { useState, type FormEvent } from "react";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { subscribe } from "@/lib/feeds";
import type { Feed } from "@/lib/db";

export function AddFeedForm({ onAdded }: { onAdded: (feed: Feed) => void }) {
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
      toast.error(err instanceof Error ? err.message : "Couldn't add that feed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={value}
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
