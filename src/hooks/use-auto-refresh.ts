import { useCallback, useEffect, useState } from "react";
import { db } from "@/lib/db";
import { refreshAll, REFRESH_INTERVAL_MS } from "@/lib/feeds";

/**
 * Refreshes all feeds every 30 minutes while the app is open,
 * and when the tab comes back into view after being away that long.
 */
export function useAutoRefresh() {
  const [refreshing, setRefreshing] = useState(false);

  const run = useCallback(async () => {
    setRefreshing(true);
    try {
      return await refreshAll();
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const refreshIfStale = async () => {
      if (document.visibilityState !== "visible") return;
      const feeds = await db.feeds.toArray();
      const oldest = Math.min(...feeds.map((f) => f.lastFetched ?? 0));
      if (feeds.length && Date.now() - oldest >= REFRESH_INTERVAL_MS) void run();
    };

    void refreshIfStale();
    const timer = window.setInterval(refreshIfStale, 60_000);
    document.addEventListener("visibilitychange", refreshIfStale);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshIfStale);
    };
  }, [run]);

  return { refreshing, refreshNow: run };
}
