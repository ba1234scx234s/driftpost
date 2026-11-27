import { useEffect, useState } from "react";

/** Whether a media query matches, kept up to date as the window changes size. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return matches;
}

/** Phone-sized screens, where the sidebar moves into a slide-in menu. Matches Tailwind's `md`. */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}

/**
 * Tablets and small laptops (up to the 13-inch iPad Pro in landscape). With an article open,
 * the sidebar moves into the slide-in menu so the list and the article get the room.
 */
export function useIsTablet(): boolean {
  return useMediaQuery("(max-width: 1399px)");
}
