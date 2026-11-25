// Client side of the Worker's /api/fetch proxy.

export interface ProxyResult {
  status: number;
  notModified: boolean;
  text: string;
  contentType: string;
  finalUrl: string;
  etag?: string;
  lastModified?: string;
}

export class FetchError extends Error {}

export async function fetchViaProxy(
  url: string,
  opts: { etag?: string; lastModified?: string } = {},
): Promise<ProxyResult> {
  const headers: Record<string, string> = {};
  if (opts.etag) headers["X-If-None-Match"] = opts.etag;
  if (opts.lastModified) headers["X-If-Modified-Since"] = opts.lastModified;

  let res: Response;
  try {
    res = await fetch(`/api/fetch?url=${encodeURIComponent(url)}`, { headers });
  } catch {
    throw new FetchError("You seem to be offline");
  }
  if (!res.ok) throw new FetchError((await res.text()) || `Request failed (${res.status})`);

  const status = Number(res.headers.get("X-Upstream-Status") ?? 0);
  if (status === 304) {
    return { status, notModified: true, text: "", contentType: "", finalUrl: url };
  }
  if (status >= 400 || status === 0) {
    throw new FetchError(status === 404 ? "Nothing found at that address (404)" : `The site answered with an error (${status})`);
  }

  return {
    status,
    notModified: false,
    text: await res.text(),
    contentType: res.headers.get("X-Content-Type") ?? "",
    finalUrl: res.headers.get("X-Final-Url") ?? url,
    etag: res.headers.get("X-ETag") ?? undefined,
    lastModified: res.headers.get("X-Last-Modified") ?? undefined,
  };
}
