import { useRef, useState, type ChangeEvent } from "react";
import { DownloadIcon, Loader2Icon, UploadIcon } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  BackupError,
  describeBackup as describe,
  downloadBackup,
  readBackup,
  restoreBackup,
  summarise,
  type BackupSummary,
} from "@/lib/backup";

type Pending = { backup: ReturnType<typeof readBackup>; summary: BackupSummary };

/** Configure → Backup: download everything as one file, or restore from one. */
export function BackupSection() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [restoring, setRestoring] = useState(false);

  async function download() {
    setSaving(true);
    try {
      const summary = await downloadBackup();
      toast.success("Backup downloaded", { description: describe(summary) });
    } catch {
      toast.error("Couldn't make the backup");
    } finally {
      setSaving(false);
    }
  }

  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // so picking the same file again works
    if (!file) return;
    try {
      const backup = readBackup(await file.text());
      setPending({ backup, summary: summarise(backup) });
    } catch (err) {
      toast.error(err instanceof BackupError ? err.message : "Couldn't read that file");
    }
  }

  async function restore() {
    if (!pending) return;
    setRestoring(true);
    try {
      await restoreBackup(pending.backup);
      toast.success("Backup restored");
      // Start fresh so every screen, the theme and the font pick up the restored state.
      setTimeout(() => window.location.reload(), 600);
    } catch {
      setRestoring(false);
      setPending(null);
      toast.error("Couldn't restore the backup. Nothing was changed.");
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={download} disabled={saving}>
          {saving ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
          Download backup
        </Button>
        <Button variant="outline" onClick={() => fileInput.current?.click()}>
          <UploadIcon />
          Restore from backup…
        </Button>
        <input ref={fileInput} type="file" accept=".json,application/json" className="hidden" onChange={pick} />
      </div>

      <AlertDialog open={!!pending} onOpenChange={(open) => !open && !restoring && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace everything with this backup?</AlertDialogTitle>
            <AlertDialogDescription>
              {pending && describe(pending.summary)}. Your current feeds, posts, read status and settings in this
              browser are replaced by the backup's. Download a backup first if you want to keep them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={restoring}
              onClick={(e) => {
                e.preventDefault(); // keep the dialog open until it's done
                void restore();
              }}
            >
              {restoring && <Loader2Icon className="animate-spin" />}
              Replace and restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
