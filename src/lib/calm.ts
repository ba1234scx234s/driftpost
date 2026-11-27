// A short calm line under "You're all caught up", picked at random each time the end of a
// list shows. Written for Driftpost; nothing is fetched.

const LINES = [
  "Breathe in. Breathe out.",
  "The tide can wait.",
  "Time to look out the window.",
  "Go stretch your legs.",
  "The internet will still be here later.",
  "Maybe make a cup of tea.",
  "Nothing to chase.",
  "Rest your eyes.",
  "Have a glass of water.",
  "Enough for now.",
  "Step outside.",
  "Calm is fine.",
  "Put your feet up.",
  "Quiet is good too.",
  "Let your thoughts drift.",
];

const LAST_KEY = "driftpost:calm-line";

/** A calm line, never the same as the one shown last time. */
export function pickCalmLine(): string {
  let last = -1;
  try {
    last = Number(localStorage.getItem(LAST_KEY) ?? -1);
  } catch {
    // Private windows can refuse storage; a repeat now and then is fine.
  }
  let i = Math.floor(Math.random() * LINES.length);
  if (i === last) i = (i + 1) % LINES.length;
  try {
    localStorage.setItem(LAST_KEY, String(i));
  } catch {
    // As above.
  }
  return LINES[i];
}
