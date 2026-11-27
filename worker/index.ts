// Driftpost Worker: serves the app's static files and a small fetch proxy.
// The proxy exists only because browsers block most cross-site feed requests (CORS).
// It stores and logs nothing; all reader data stays in the user's browser.

interface Limiter {
  limit(opts: { key: string }): Promise<{ success: boolean }>;
}

interface Env {
  ASSETS: Fetcher;
  /** Per-IP limits on requests that reach other sites (see wrangler.jsonc). */
  FETCH_LIMIT?: Limiter;
  ICON_LIMIT?: Limiter;
}

/** How long a fetched feed or page is shared between everyone who asks for it. */
const SHARED_TTL_S = 600;
/** Only text a reader needs: feeds, web pages and JSON. No images, video or downloads. */
const TEXT_TYPES = /^(text\/|application\/([\w.+-]+\+)?(xml|json)\b|application\/(rss|atom|rdf|feed)\b)/i;

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 15_000;
const USER_AGENT = "Driftpost/0.1 (feed reader; +https://github.com/ba1234scx234s/driftpost)";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      const res =
        url.pathname === "/api/fetch"
          ? await proxy(request, url, env, ctx)
          : url.pathname === "/api/icon"
            ? await icon(request, url, env)
            : text("Not found", 404);
      return secure(res);
    }
    return env.ASSETS.fetch(request); // static files get their headers from public/_headers
  },
} satisfies ExportedHandler<Env>;

/**
 * API responses carry other sites' content: never let a browser run or frame it, even if
 * someone opens an /api address directly.
 */
function secure(res: Response): Response {
  const out = new Response(res.body, res);
  out.headers.set("Content-Security-Policy", "default-src 'none'; sandbox; frame-ancestors 'none'");
  out.headers.set("X-Content-Type-Options", "nosniff");
  out.headers.set("X-Frame-Options", "DENY");
  out.headers.set("Referrer-Policy", "no-referrer");
  out.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  return out;
}

/** True when this visitor has made too many requests to other sites in the last minute. */
async function overLimit(limiter: Limiter | undefined, request: Request): Promise<boolean> {
  if (!limiter) return false;
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  try {
    return !(await limiter.limit({ key: ip })).success;
  } catch {
    return false; // never block readers because the limiter itself failed
  }
}

const TOO_MANY = "Too many requests. Wait a minute and try again.";

// Shared cache of fetched feeds and pages: Cloudflare's cache where it's available (custom
// domains), plus a small in-memory copy per Worker instance (works on workers.dev too).
interface Cached {
  body: ArrayBuffer;
  headers: [string, string][];
  expires: number;
}
const memory = new Map<string, Cached>();
const MEMORY_MAX_BYTES = 24 * 1024 * 1024;
let memoryBytes = 0;

function cacheKey(target: URL): Request {
  return new Request(`https://cache.driftpost.invalid/fetch?url=${encodeURIComponent(target.toString())}`);
}

async function readShared(target: URL): Promise<Cached | null> {
  const key = target.toString();
  const hit = memory.get(key);
  if (hit && hit.expires > Date.now()) return hit;
  if (hit) forget(key);
  try {
    const res = await caches.default.match(cacheKey(target));
    if (!res) return null;
    const expires = Number(res.headers.get("X-Expires") ?? 0);
    if (expires <= Date.now()) return null;
    return { body: await res.arrayBuffer(), headers: [...res.headers], expires };
  } catch {
    return null;
  }
}

function writeShared(target: URL, entry: Cached, ctx: ExecutionContext): void {
  const key = target.toString();
  forget(key);
  if (entry.body.byteLength < MEMORY_MAX_BYTES / 8) {
    memory.set(key, entry);
    memoryBytes += entry.body.byteLength;
    // Drop the oldest entries once over budget (a Map keeps insertion order).
    for (const [k] of memory) {
      if (memoryBytes <= MEMORY_MAX_BYTES) break;
      forget(k);
    }
  }
  const headers = new Headers(entry.headers);
  headers.set("X-Expires", String(entry.expires));
  headers.set("Cache-Control", `public, max-age=${SHARED_TTL_S}`);
  ctx.waitUntil(caches.default.put(cacheKey(target), new Response(entry.body, { headers })).catch(() => {}));
}

function forget(key: string): void {
  const old = memory.get(key);
  if (!old) return;
  memoryBytes -= old.body.byteLength;
  memory.delete(key);
}

function fromShared(hit: Cached, etag: string | null): Response {
  const out = new Headers(hit.headers);
  out.delete("X-Expires");
  out.set("Cache-Control", "no-store");
  out.set("X-Driftpost-Cache", "hit");
  // The reader already has this exact version: answer like the site would.
  if (etag && out.get("X-ETag") === etag) {
    out.set("X-Upstream-Status", "304");
    return new Response(null, { status: 200, headers: out });
  }
  return new Response(hit.body, { status: 200, headers: out });
}

async function proxy(request: Request, url: URL, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (request.method !== "GET") return text("Method not allowed", 405);

  // Only serve the Driftpost page itself, so the proxy isn't an open relay for other sites.
  const site = request.headers.get("Sec-Fetch-Site");
  if (site && site !== "same-origin") return text("Forbidden", 403);

  const target = parseTarget(url.searchParams.get("url"));
  if (!target) return text("Invalid or disallowed URL", 400);

  const etag = request.headers.get("X-If-None-Match");
  const modified = request.headers.get("X-If-Modified-Since");

  // Someone fetched this in the last few minutes: share their copy instead of asking the site again.
  const shared = await readShared(target);
  if (shared) return fromShared(shared, etag);

  if (await overLimit(env.FETCH_LIMIT, request)) return text(TOO_MANY, 429);

  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept:
      "application/rss+xml, application/atom+xml, application/feed+json, application/json, application/xml;q=0.9, text/xml;q=0.9, text/html;q=0.8, */*;q=0.5",
  };
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

  // Text only, so the proxy can't be used to pass images, video or downloads through.
  const type = upstream.headers.get("Content-Type");
  if (upstream.ok && type && !TEXT_TYPES.test(type)) {
    await upstream.body?.cancel();
    return text("That address isn't a feed or a web page", 415);
  }

  const length = Number(upstream.headers.get("Content-Length") ?? 0);
  if (length > MAX_BYTES) return text("Feed is too large", 413);

  const body = await readLimited(upstream);
  if (body === null) return text("Feed is too large", 413);

  if (upstream.status === 200) {
    writeShared(target, { body: body.slice().buffer as ArrayBuffer, headers: [...out], expires: Date.now() + SHARED_TTL_S * 1000 }, ctx);
  }
  out.set("X-Driftpost-Cache", "miss");
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
async function icon(request: Request, url: URL, env: Env): Promise<Response> {
  if (request.method !== "GET") return text("Method not allowed", 405);
  const site = request.headers.get("Sec-Fetch-Site");
  if (site && site !== "same-origin") return text("Forbidden", 403);
  const home = parseTarget(`https://${url.searchParams.get("host") ?? ""}/`);
  if (!home || !url.searchParams.get("host")) return text("Invalid or disallowed host", 400);
  if (await overLimit(env.ICON_LIMIT, request)) return text(TOO_MANY, 429);

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
