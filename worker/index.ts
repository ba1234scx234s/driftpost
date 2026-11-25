// Driftpost Worker: serves the app's static files and a small fetch proxy.
// The proxy exists only because browsers block most cross-site feed requests (CORS).
// It stores and logs nothing; all reader data stays in the user's browser.

interface Env {
  ASSETS: Fetcher;
}

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 15_000;
const USER_AGENT = "Driftpost/0.1 (feed reader; +https://github.com/ba1234scx234s/driftpost)";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/fetch") return proxy(request, url);
    if (url.pathname === "/api/icon") return icon(request, url);
    if (url.pathname.startsWith("/api/")) return text("Not found", 404);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

async function proxy(request: Request, url: URL): Promise<Response> {
  if (request.method !== "GET") return text("Method not allowed", 405);

  // Only serve the Driftpost page itself, so the proxy isn't an open relay for other sites.
  const site = request.headers.get("Sec-Fetch-Site");
  if (site && site !== "same-origin") return text("Forbidden", 403);

  const target = parseTarget(url.searchParams.get("url"));
  if (!target) return text("Invalid or disallowed URL", 400);

  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept:
      "application/rss+xml, application/atom+xml, application/feed+json, application/json, application/xml;q=0.9, text/xml;q=0.9, text/html;q=0.8, */*;q=0.5",
  };
  const etag = request.headers.get("X-If-None-Match");
  const modified = request.headers.get("X-If-Modified-Since");
  if (etag) headers["If-None-Match"] = etag;
  if (modified) headers["If-Modified-Since"] = modified;

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return text(timedOut ? "The site took too long to respond" : "Could not reach the site", 502);
  }

  const out = new Headers({
    "Cache-Control": "no-store",
    "X-Upstream-Status": String(upstream.status),
    "X-Final-Url": upstream.url || target.toString(),
  });
  for (const [from, to] of [
    ["Content-Type", "X-Content-Type"],
    ["ETag", "X-ETag"],
    ["Last-Modified", "X-Last-Modified"],
  ]) {
    const value = upstream.headers.get(from);
    if (value) out.set(to, value);
  }

  if (upstream.status === 304) return new Response(null, { status: 200, headers: out });

  const length = Number(upstream.headers.get("Content-Length") ?? 0);
  if (length > MAX_BYTES) return text("Feed is too large", 413);

  const body = await readLimited(upstream);
  if (body === null) return text("Feed is too large", 413);

  // Always 200 to the app; the real status travels in X-Upstream-Status.
  return new Response(body, { status: 200, headers: out });
}

const MAX_ICON_BYTES = 256 * 1024;
const ICON_TYPES = /^image\/(x-icon|vnd\.microsoft\.icon|png|gif|jpeg|webp|svg\+xml|avif)$/;

/**
 * A site's icon, served from Driftpost's own address so the app can look at its pixels
 * (to tell whether it needs a light tile in dark mode). Tries /favicon.ico, then the
 * icon the homepage links to.
 */
async function icon(request: Request, url: URL): Promise<Response> {
  if (request.method !== "GET") return text("Method not allowed", 405);
  const site = request.headers.get("Sec-Fetch-Site");
  if (site && site !== "same-origin") return text("Forbidden", 403);
  const home = parseTarget(`https://${url.searchParams.get("host") ?? ""}/`);
  if (!home || !url.searchParams.get("host")) return text("Invalid or disallowed host", 400);

  const found =
    (await fetchImage(new URL("/favicon.ico", home))) ?? (await fetchImage(await linkedIcon(home)));
  if (!found) {
    return new Response("No icon", {
      status: 404,
      headers: { "Content-Type": "text/plain", "Cache-Control": "public, max-age=86400" },
    });
  }
  return new Response(found.body, {
    headers: {
      "Content-Type": found.type,
      "Cache-Control": "public, max-age=604800",
      // An SVG opened on its own must not run anything on Driftpost's address.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function fetchImage(target: URL | null): Promise<{ body: Uint8Array; type: string } | null> {
  if (!target || !parseTarget(target.toString())) return null;
  try {
    const res = await fetch(target.toString(), {
      headers: { "User-Agent": USER_AGENT, Accept: "image/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    let type = (res.headers.get("Content-Type") ?? "").split(";")[0].trim().toLowerCase();
    if (!res.ok) return null;
    // Some servers send .ico files as octet-stream.
    if (!ICON_TYPES.test(type) && /\.ico($|\?)/i.test(target.pathname)) type = "image/x-icon";
    if (!ICON_TYPES.test(type)) return null;
    const body = await readLimited(res, MAX_ICON_BYTES);
    return body && body.byteLength ? { body, type } : null;
  } catch {
    return null;
  }
}

/** The icon a homepage links to, preferring small ones. */
async function linkedIcon(home: URL): Promise<URL | null> {
  try {
    const res = await fetch(home.toString(), {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await readStart(res, 512 * 1024);
    const end = html.search(/<\/head>/i);
    const head = end > 0 ? html.slice(0, end) : html;
    let best: { href: string; score: number } | null = null;
    for (const tag of head.match(/<link\b[^>]*>/gi) ?? []) {
      const rel = attr(tag, "rel")?.toLowerCase() ?? "";
      const href = attr(tag, "href");
      if (!href || !/\bicon\b/.test(rel)) continue;
      const size = Number(attr(tag, "sizes")?.match(/\d+/)?.[0] ?? 0);
      // Prefer a plain icon near 32px over a large apple-touch-icon.
      const score = (rel.includes("apple") ? 0 : 1000) - Math.abs((size || 32) - 32);
      if (!best || score > best.score) best = { href, score };
    }
    return best ? new URL(best.href.replace(/&amp;/g, "&"), res.url || home) : null;
  } catch {
    return null;
  }
}

/** The first `max` bytes of a page as text: icon links sit in the head, near the top. */
async function readStart(res: Response, max: number): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let html = "";
  let total = 0;
  while (total < max) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    html += decoder.decode(value, { stream: true });
    if (/<\/head>/i.test(html)) break;
  }
  await reader.cancel().catch(() => {});
  return html;
}

function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? (m[1] ?? m[2] ?? m[3]) : undefined;
}

function parseTarget(raw: string | null): URL | null {
  if (!raw) return null;
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return null;
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") return null;
  if (target.username || target.password) return null;
  const host = target.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    isPrivateIp(host)
  ) {
    return null;
  }
  return target;
}

function isPrivateIp(host: string): boolean {
  if (host.startsWith("[")) return true; // no IPv6 literals
  const m = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

async function readLimited(res: Response, max = MAX_BYTES): Promise<Uint8Array | null> {
  if (!res.body) return new Uint8Array();
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

function text(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
