// A full backup of Driftpost in one JSON file: every feed, every post (with read and
// starred state, tags and saved full text), all settings and filters, and the theme.
// Restoring replaces what's in this browser with the backup, exactly as it was.

import { db, type Feed, type Item, type SettingRow } from "./db";
import { updateSettings } from "./settings";

const FORMAT = "driftpost-backup";
const VERSION = 1;
/** next-themes keeps the theme in localStorage under this key. */
const THEME_KEY = "theme";

interface Backup {
  format: typeof FORMAT;
  version: number;
  exportedAt: string;
  theme?: string;
  settings: SettingRow[];
  feeds: Feed[];
  items: Item[];
}

export class BackupError extends Error {}

export interface BackupSummary {
  feeds: number;
  posts: number;
  exportedAt: string;
}

/** Builds the backup file's text. */
export async function createBackup(): Promise<{ text: string; summary: BackupSummary }> {
  const [settings, feeds, items] = await db.transaction("r", db.settings, db.feeds, db.items, () =>
    Promise.all([db.settings.toArray(), db.feeds.toArray(), db.items.toArray()]),
  );
  // Leave out posts whose feed is gone (left over from an interrupted unfollow).
  const feedIds = new Set(feeds.map((f) => f.id));
  const kept = items.filter((it) => feedIds.has(it.feedId));
  const backup: Backup = {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    theme: readTheme(),
    settings,
    feeds,
    items: kept,
  };
  return {
    text: JSON.stringify(backup),
    summary: { feeds: feeds.length, posts: kept.length, exportedAt: backup.exportedAt },
  };
}

/** Reads and checks a backup file without changing anything. */
export function readBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError("That file isn't a Driftpost backup");
  }
  const b = data as Partial<Backup>;
  if (!b || b.format !== FORMAT || !Array.isArray(b.feeds) || !Array.isArray(b.items) || !Array.isArray(b.settings)) {
    throw new BackupError("That file isn't a Driftpost backup");
  }
  if ((b.version ?? 0) > VERSION) {
    throw new BackupError("This backup is from a newer version of Driftpost. Reload the page and try again.");
  }
  // Feeds and posts need usable ids; posts whose feed isn't in the backup are left out.
  const feedIds = new Set<number>();
  for (const f of b.feeds) {
    if (!f || typeof f.id !== "number" || typeof f.url !== "string") throw new BackupError("The backup's feeds are damaged");
    feedIds.add(f.id);
  }
  for (const it of b.items) {
    if (!it || typeof it.id !== "number" || typeof it.guid !== "string") {
      throw new BackupError("The backup's posts are damaged");
    }
  }
  return { ...(b as Backup), items: b.items.filter((it) => feedIds.has(it.feedId)) };
}

export function summarise(b: Backup): BackupSummary {
  return { feeds: b.feeds.length, posts: b.items.length, exportedAt: b.exportedAt };
}

/** Replaces everything in this browser with the backup. All or nothing. */
export async function restoreBackup(b: Backup): Promise<void> {
  await db.transaction("rw", db.settings, db.feeds, db.items, async () => {
    await Promise.all([db.settings.clear(), db.feeds.clear(), db.items.clear()]);
    await db.settings.bulkAdd(b.settings);
    await db.feeds.bulkAdd(b.feeds);
    await db.items.bulkAdd(b.items);
  });
  if (b.theme) {
    try {
      localStorage.setItem(THEME_KEY, b.theme);
    } catch {
      // storage unavailable: the theme stays as it is
    }
  }
}

/** Makes the backup, hands it to the browser as a download, and remembers when. */
export async function downloadBackup(): Promise<BackupSummary> {
  const { text, summary } = await createBackup();
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = backupFileName();
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  await updateSettings({ lastBackupAt: Date.now(), backupSnoozedUntil: undefined });
  return summary;
}

export function describeBackup(s: BackupSummary): string {
  const date = new Date(s.exportedAt);
  const when = Number.isNaN(date.getTime())
    ? ""
    : ` from ${date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`;
  return `${s.feeds} ${s.feeds === 1 ? "feed" : "feeds"} and ${s.posts} ${s.posts === 1 ? "post" : "posts"}${when}`;
}

export function backupFileName(date = new Date()): string {
  return `driftpost-backup-${date.toISOString().slice(0, 10)}.json`;
}

function readTheme(): string | undefined {
  try {
    return localStorage.getItem(THEME_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}
