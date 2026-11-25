// Fonts: the built-in ones, plus any family from Google Fonts.
// A Google font is stored in settings as "g:Family Name".

export const BUILT_IN_FONTS = {
  geist: { label: "Geist", stack: "'Geist Variable', sans-serif" },
  system: { label: "System", stack: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
  serif: { label: "Serif", stack: "ui-serif, 'New York', Charter, Georgia, 'Times New Roman', serif" },
  mono: { label: "Mono", stack: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace" },
} as const;

/** Ready-made Google Fonts choices shown in the font menu. */
export const SUGGESTED_GOOGLE_FONTS = ["Atkinson Hyperlegible"] as const;

/** A few well-known families to try, shown under the custom font field. */
export const GOOGLE_FONT_IDEAS = ["Inter", "Lora", "Literata", "Source Serif 4", "IBM Plex Sans", "Merriweather"];

const PREFIX = "g:";

export function googleFontId(family: string): string {
  return `${PREFIX}${family}`;
}

/** The Google family in a font id, or null for a built-in font. */
export function googleFamily(fontId: string): string | null {
  return fontId.startsWith(PREFIX) ? fontId.slice(PREFIX.length) : null;
}

export function fontLabel(fontId: string): string {
  return googleFamily(fontId) ?? BUILT_IN_FONTS[fontId as keyof typeof BUILT_IN_FONTS]?.label ?? "Geist";
}

export function fontStack(fontId: string): string {
  const family = googleFamily(fontId);
  if (family) return `'${family.replace(/'/g, "")}', system-ui, sans-serif`;
  return (BUILT_IN_FONTS[fontId as keyof typeof BUILT_IN_FONTS] ?? BUILT_IN_FONTS.geist).stack;
}

/** Tidies a typed family name: extra spaces and stray characters go, letters stay as typed. */
export function normaliseFamily(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N} ]/gu, "");
}

/** "source serif 4" becomes "Source Serif 4": a second try when the typed case doesn't match. */
export function titleCase(family: string): string {
  return family.replace(/(^|\s)\p{L}/gu, (c) => c.toUpperCase());
}

const loaded = new Map<string, Promise<boolean>>();

/**
 * Loads a family from Google Fonts. Tries regular to bold plus italic first, and falls
 * back to the plain family for fonts that don't have all those styles.
 * Resolves false when Google Fonts doesn't know the family.
 */
export function loadGoogleFont(family: string): Promise<boolean> {
  let hit = loaded.get(family);
  if (!hit) {
    hit = (async () => {
      const name = encodeURIComponent(family).replace(/%20/g, "+");
      const candidates = [
        `https://fonts.googleapis.com/css2?family=${name}:ital,wght@0,400;0,700;1,400;1,700&display=swap`,
        `https://fonts.googleapis.com/css2?family=${name}:wght@400;700&display=swap`,
        `https://fonts.googleapis.com/css2?family=${name}&display=swap`,
      ];
      for (const href of candidates) {
        try {
          const res = await fetch(href);
          if (!res.ok) continue;
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = href;
          link.dataset.googleFont = family;
          document.head.append(link);
          return true;
        } catch {
          // offline or blocked: try the next form, then give up
        }
      }
      return false;
    })();
    loaded.set(family, hit);
    // Let a failed name be tried again later (for example after going back online).
    void hit.then((ok) => !ok && loaded.delete(family));
  }
  return hit;
}
