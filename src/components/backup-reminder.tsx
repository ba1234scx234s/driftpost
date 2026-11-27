import { useEffect } from "react";
import { toast } from "sonner";
import { describeBackup, downloadBackup } from "@/lib/backup";
import { db } from "@/lib/db";
import { getSettings, updateSettings } from "@/lib/settings";

const DAY = 24 * 60 * 60 * 1000;
/** How long after the last backup (or first feed) to ask. */
const EVERY = 30 * DAY;
/** "Later" asks again after this long. */
const SNOOZE = 7 * DAY;
const TOAST_ID = "backup-reminder";

/**
 * Every 30 days, a gentle prompt to download a backup, since everything lives only in this
 * browser. Off in Configure → Backup & restore. Renders nothing itself; the prompt is a toast.
 */
export function BackupReminder() {
  useEffect(() => {
    let cancelled = false;

    async function check() {
      const settings = await getSettings();
      if (cancelled || !settings.backupReminder) return;
      const firstFeed = await db.feeds.orderBy("addedAt").first();
      if (!firstFeed) return; // nothing worth backing up yet

      const now = Date.now();
      if (settings.backupSnoozedUntil && now < settings.backupSnoozedUntil) return;
      const since = settings.lastBackupAt ?? firstFeed.addedAt;
      if (now - since < EVERY) return;

      const days = Math.floor((now - since) / DAY);
      toast("Time for a backup", {
        id: TOAST_ID,
        duration: Infinity,
        description: settings.lastBackupAt
          ? `Your last backup was ${days} days ago. Download your feeds, read status and settings in one file, in case this browser's data gets cleared.`
          : "Driftpost keeps everything in this browser only. Download your feeds, read status and settings in one file, in case its data gets cleared.",
        action: {
          label: "Download",
          onClick: async () => {
            try {
              const summary = await downloadBackup();
              toast.success("Backup downloaded", { description: describeBackup(summary) });
            } catch {
              toast.error("Couldn't make the backup");
            }
          },
        },
        cancel: { label: "Later", onClick: () => void snooze() },
        onDismiss: () => void snooze(),
      });
    }

    // Wait a moment so the prompt doesn't greet people the instant the page opens,
    // then look again every few hours for tabs that stay open.
    const first = setTimeout(check, 4000);
    const again = setInterval(check, 6 * 60 * 60 * 1000);
    return () => {
      cancelled = true;
      clearTimeout(first);
      clearInterval(again);
    };
  }, []);

  return null;
}

async function snooze() {
  const { lastBackupAt } = await getSettings();
  // Downloading also dismisses the toast; don't snooze a backup that just happened.
  if (lastBackupAt && Date.now() - lastBackupAt < 60_000) return;
  await updateSettings({ backupSnoozedUntil: Date.now() + SNOOZE });
}
