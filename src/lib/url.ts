// Comparing feed addresses: two URLs that differ only in ways that don't change
// the feed (http vs https, www, trailing slash, tracking parameters) count as the same.

const TRACKING = /^(utm_\w+|fbclid|gclid|mc_cid|mc_eid|ref)$/i;

export function feedKey(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw.trim().replace(/^feed:\/\//i, "https://").replace(/^feed:/i, ""));
  } catch {
    return raw.trim().toLowerCase();
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const port = url.port && url.port !== "80" && url.port !== "443" ? `:${url.port}` : "";
  const path = url.pathname.replace(/\/+$/, "") || "";
  const params = [...url.searchParams]
    .filter(([k]) => !TRACKING.test(k))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  return `${host}${port}${path}${params ? `?${params}` : ""}`;
}
