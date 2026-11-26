// The main colour of a site's icon, for tinting things that belong to that feed (like the
// unread dot). Icons come through Driftpost's own /api/icon, so their pixels can be read.
// Only the hue and saturation are kept: the lightness is picked per theme so the colour
// stays visible on both light and dark backgrounds.

export interface IconColor {
  /** Hue, 0–360. */
  h: number;
  /** Saturation, 0–100. */
  s: number;
}

/** The host whose icon a feed uses (the same one FeedIcon shows). */
export function iconHost(feed: { url: string; siteUrl?: string }): string | null {
  try {
    return new URL(feed.siteUrl ?? feed.url).hostname;
  } catch {
    return null;
  }
}

const KEY = "driftpost:icon-colors";
/** host → colour, or 0 for "no clear colour" (grey, black or white icons). */
let memo: Record<string, [number, number] | 0> | undefined;
const pending = new Map<string, Promise<IconColor | null>>();

function store(): Record<string, [number, number] | 0> {
  if (!memo) {
    try {
      memo = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    } catch {
      memo = {};
    }
  }
  return memo!;
}

/** The remembered colour: undefined when it hasn't been worked out yet. */
export function cachedIconColor(host: string): IconColor | null | undefined {
  const hit = store()[host];
  if (hit === undefined) return undefined;
  return hit ? { h: hit[0], s: hit[1] } : null;
}

/** Works out (once per site, then remembered) the icon's main colour. */
export function loadIconColor(host: string): Promise<IconColor | null> {
  const cached = cachedIconColor(host);
  if (cached !== undefined) return Promise.resolve(cached);
  let job = pending.get(host);
  if (!job) {
    job = new Promise<IconColor | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(mainColor(img));
      img.onerror = () => resolve(null);
      img.src = `/api/icon?host=${encodeURIComponent(host)}`;
    }).then((color) => {
      store()[host] = color ? [color.h, color.s] : 0;
      try {
        localStorage.setItem(KEY, JSON.stringify(memo));
      } catch {
        // storage unavailable: worked out again next time
      }
      pending.delete(host);
      return color;
    });
    pending.set(host, job);
  }
  return job;
}

/** A CSS colour for this hue, light enough for dark mode or dark enough for light mode. */
export function dotColor(color: IconColor, dark: boolean): string {
  const s = Math.min(90, Math.max(45, color.s));
  return `hsl(${Math.round(color.h)} ${Math.round(s)}% ${dark ? 62 : 45}%)`;
}

/**
 * The most common clear colour in the icon. Grey, near-black and near-white pixels are
 * skipped; hues are counted in 24 buckets, weighted by how colourful each pixel is.
 */
function mainColor(img: HTMLImageElement): IconColor | null {
  try {
    const size = 32;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, size, size);
    const px = ctx.getImageData(0, 0, size, size).data;

    const buckets = Array.from({ length: 24 }, () => ({ weight: 0, x: 0, y: 0, s: 0, n: 0 }));
    let solid = 0;
    let colourful = 0;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 128) continue;
      solid++;
      const [h, s, l] = toHsl(px[i], px[i + 1], px[i + 2]);
      if (s < 0.25 || l < 0.12 || l > 0.92) continue;
      colourful++;
      const b = buckets[Math.floor(h / 15) % 24];
      b.weight += s;
      b.x += Math.cos((h * Math.PI) / 180) * s;
      b.y += Math.sin((h * Math.PI) / 180) * s;
      b.s += s;
      b.n++;
    }
    // Mostly grey or monochrome: no colour to speak of.
    if (!solid || colourful / solid < 0.05) return null;
    const best = buckets.reduce((a, b) => (b.weight > a.weight ? b : a));
    const h = ((Math.atan2(best.y, best.x) * 180) / Math.PI + 360) % 360;
    return { h, s: (best.s / best.n) * 100 };
  } catch {
    return null;
  }
}

function toHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return [h, s, l];
}
