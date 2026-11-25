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

async function readLimited(res: Response): Promise<Uint8Array | null> {
  if (!res.body) return new Uint8Array();
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
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
