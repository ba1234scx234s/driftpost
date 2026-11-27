// The occasional Ko-fi prompt under "You're all caught up". It shows every 5th time that
// message appears, and not at all for 180 days after someone follows the link.

export const KOFI_URL = "https://ko-fi.com/W2X42BCT3X";

const COUNT_KEY = "driftpost:caught-up-count";
const SNOOZE_KEY = "driftpost:kofi-snoozed-until";
const EVERY = 5;
const SNOOZE_DAYS = 180;

/** Counts one sighting of "You're all caught up" and says whether to ask this time. */
export function countCaughtUp(): boolean {
  try {
    const count = Number(localStorage.getItem(COUNT_KEY) ?? 0) + 1;
    localStorage.setItem(COUNT_KEY, String(count));
    if (Date.now() < Number(localStorage.getItem(SNOOZE_KEY) ?? 0)) return false;
    return count % EVERY === 0;
  } catch {
    return false;
  }
}

/** The link was followed: don't ask again for 180 days. */
export function snoozeKofi() {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000));
  } catch {
    // storage unavailable: the prompt may show again
  }
}
