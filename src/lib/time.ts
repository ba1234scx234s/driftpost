const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

export function relativeTime(ms: number, now = Date.now()): string {
  const diff = (ms - now) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return "just now";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), "day");
  return new Date(ms).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: new Date(ms).getFullYear() === new Date(now).getFullYear() ? undefined : "numeric",
  });
}
