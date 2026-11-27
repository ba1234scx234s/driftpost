import { useCallback, useEffect, useState } from "react";
import { db } from "@/lib/db";
import { dueAt, refreshAll } from "@/lib/feeds";

/**
 * While the tab is visible, checks every minute for feeds that are due a refresh (each
 * feed has its own schedule, see refreshFeed) and fetches just those. Hidden tabs don't
 * fetch; they catch up when they come back into view. The refresh button fetches all.
 */
export function useAutoRefresh() {
  const [refreshing, setRefreshing] = useState(false);

  const run = useCallback(async (all = false) => {
    setRefreshing(true);
    try {
      return await refreshAll({ all });
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const refreshIfStale = async () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      const feeds = await db.feeds.toArray();
      if (feeds.some((f) => dueAt(f) <= now)) void run();
    };

    void refreshIfStale();
    const timer = window.setInterval(refreshIfStale, 60_000);
    document.addEventListener("visibilitychange", refreshIfStale);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshIfStale);
    };
  }, [run]);

  const refreshNow = useCallback(() => run(true), [run]);
  return { refreshing, refreshNow };
}
