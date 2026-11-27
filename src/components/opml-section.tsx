import { useRef, useState, type ChangeEvent } from "react";
import { DownloadIcon, Loader2Icon, UploadIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportOpml, importOpml } from "@/lib/feeds";

const MAX_FILE_BYTES = 2 * 1024 * 1024;

/** Configure → Import and export: move subscriptions to and from other feed readers. */
export function OpmlSection() {
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
      toast.success(importSummary(result), {
        id,
        description: duplicateNote(result.duplicates),
        duration: result.duplicates.length ? 8000 : undefined,
      });
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
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => fileInput.current?.click()} disabled={busy}>
        {busy ? <Loader2Icon className="animate-spin" /> : <UploadIcon />}
        Import OPML…
      </Button>
      <Button variant="outline" onClick={handleExport}>
        <DownloadIcon />
        Export OPML
      </Button>
      <input
        ref={fileInput}
        type="file"
        accept=".opml,.xml,text/x-opml,text/xml,application/xml"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

function importSummary({ added, duplicates, failed }: { added: number; duplicates: string[]; failed: number }): string {
  if (!added) return duplicates.length ? "You already follow every feed in that file" : "Nothing to import";
  const parts = [`Imported ${added} ${added === 1 ? "feed" : "feeds"}`];
  if (duplicates.length) parts.push(`${duplicates.length} already followed`);
  if (failed) parts.push(`${failed} couldn't load right now`);
  return parts.join(" · ");
}

/** Names the skipped duplicates so you can see what was left out. */
function duplicateNote(duplicates: string[]): string | undefined {
  if (!duplicates.length) return undefined;
  const names = [...new Set(duplicates)];
  const shown = names.slice(0, 3).join(", ");
  const more = names.length > 3 ? ` and ${names.length - 3} more` : "";
  return `Skipped, already following: ${shown}${more}`;
}
