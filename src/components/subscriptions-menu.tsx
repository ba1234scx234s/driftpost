import { useRef, useState, type ChangeEvent } from "react";
import { DownloadIcon, EllipsisIcon, UploadIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportOpml, importOpml } from "@/lib/feeds";

const MAX_FILE_BYTES = 2 * 1024 * 1024;

export function SubscriptionsMenu() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast.error("That file is too large to be an OPML file");
      return;
    }

    setBusy(true);
    const id = toast.loading("Reading subscriptions…");
    try {
      const result = await importOpml(await file.text(), (done, total) => {
        if (total) toast.loading(`Fetching feeds… ${done} of ${total}`, { id });
      });
      toast.success(importSummary(result), { id });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed", { id });
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    const { text, count } = await exportOpml();
    if (!count) {
      toast("You don't follow any feeds yet");
      return;
    }
    const url = URL.createObjectURL(new Blob([text], { type: "text/x-opml;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `driftpost-subscriptions-${new Date().toISOString().slice(0, 10)}.opml`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success(`Exported ${count} ${count === 1 ? "feed" : "feeds"}`);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Subscriptions menu" disabled={busy}>
            <EllipsisIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>Subscriptions</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => fileInput.current?.click()}>
            <UploadIcon />
            Import OPML…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleExport}>
            <DownloadIcon />
            Export OPML
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={fileInput}
        type="file"
        accept=".opml,.xml,text/x-opml,text/xml,application/xml"
        className="hidden"
        onChange={handleFile}
      />
    </>
  );
}

function importSummary({ added, skipped, failed }: { added: number; skipped: number; failed: number }): string {
  if (!added) return skipped ? "You already follow every feed in that file" : "Nothing to import";
  const parts = [`Imported ${added} ${added === 1 ? "feed" : "feeds"}`];
  if (skipped) parts.push(`${skipped} already followed`);
  if (failed) parts.push(`${failed} couldn't load right now`);
  return parts.join(" · ");
}
