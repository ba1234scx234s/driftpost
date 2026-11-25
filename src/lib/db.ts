import Dexie, { type EntityTable } from "dexie";

export interface Feed {
  id: number;
  url: string;
  title: string;
  siteUrl?: string;
  /** Folder name from an OPML import; folders get their own UI in a later milestone. */
  folder?: string;
  etag?: string;
  lastModified?: string;
  lastFetched?: number;
  lastError?: string;
  addedAt: number;
}

export interface Item {
  id: number;
  feedId: number;
  guid: string;
  title: string;
  link?: string;
  author?: string;
  /** Publish time, or the time we first saw it when the feed gives no date. */
  published: number;
  summary?: string;
  content?: string;
  image?: string;
  /** 0 or 1: IndexedDB can't index booleans. */
  read: 0 | 1;
  starred: 0 | 1;
  addedAt: number;
}

export interface SettingRow {
  key: string;
  value: any;
}

export const db = new Dexie("driftpost") as Dexie & {
  feeds: EntityTable<Feed, "id">;
  items: EntityTable<Item, "id">;
  settings: EntityTable<SettingRow, "key">;
};

db.version(1).stores({
  feeds: "++id, &url, addedAt",
  items: "++id, feedId, &[feedId+guid], published, [feedId+published], read, starred",
});

db.version(2).stores({
  settings: "key",
});

/** Ask the browser not to clear our data under storage pressure. */
export async function requestPersistence(): Promise<void> {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    // not supported; nothing to do
  }
}
