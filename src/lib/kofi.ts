// The occasional Ko-fi prompt under "You're all caught up". It shows every 5th time that
// message appears, and not for 180 days after someone follows a Ko-fi link. When they did
// is kept with the settings, so it travels in backups and the 180 days keep counting.

import { getSettings, updateSettings } from "./settings";

export const KOFI_URL = "https://ko-fi.com/driftpost/tip";

const COUNT_KEY = "driftpost:caught-up-count";
/** Earlier versions only paused the prompt for 180 days, in localStorage. */
const OLD_SNOOZE_KEY = "driftpost:kofi-snoozed-until";
const EVERY = 5;
const PAUSE_MS = 180 * 24 * 60 * 60 * 1000;

/** Counts one sighting of "You're all caught up" and says whether to ask this time. */
export async function countCaughtUp(): Promise<boolean> {
  if (await hasFollowedKofi()) return false;
  try {
    const count = Number(localStorage.getItem(COUNT_KEY) ?? 0) + 1;
    localStorage.setItem(COUNT_KEY, String(count));
    return count % EVERY === 0;
  } catch {
    return false;
  }
}

/** A Ko-fi link was followed: don't ask for the next 180 days. */
export function rememberKofiFollowed() {
  void updateSettings({ kofiFollowedAt: Date.now() });
}

/** Whether a Ko-fi link was followed in the last 180 days. */
async function hasFollowedKofi(): Promise<boolean> {
  let followedAt = (await getSettings()).kofiFollowedAt;
  try {
    // Earlier versions kept the end of the pause in localStorage: move it into the settings.
    const until = Number(localStorage.getItem(OLD_SNOOZE_KEY));
    if (until) {
      localStorage.removeItem(OLD_SNOOZE_KEY);
      if (!followedAt) {
        followedAt = until - PAUSE_MS;
        await updateSettings({ kofiFollowedAt: followedAt });
      }
    }
  } catch {
    // storage unavailable: nothing older to carry over
  }
  return !!followedAt && Date.now() - followedAt < PAUSE_MS;
}
