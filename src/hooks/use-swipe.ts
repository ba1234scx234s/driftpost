import { useEffect, useRef, type RefObject } from "react";

/** How far the finger must travel sideways to count, unless it flicks quickly. */
const DISTANCE = 70;
const FLICK_DISTANCE = 40;
const FLICK_SPEED = 0.5; // px per ms
/** Movement before deciding whether this is a sideways swipe or a scroll. */
const LOCK = 10;
/** Touches starting this close to the screen edge belong to the phone (back gestures). */
const EDGE = 16;

/**
 * Sideways swipes on a touch screen: finger right-to-left calls `onLeft`, left-to-right
 * calls `onRight`. The element follows the finger a little while dragging. Vertical
 * scrolling, text selection, and content that scrolls sideways (code, tables) are left alone.
 */
export function useSwipe(
  ref: RefObject<HTMLElement | null>,
  handlers: { onLeft?: () => void; onRight?: () => void },
) {
  const latest = useRef(handlers);
  latest.current = handlers;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let start: { x: number; y: number; t: number } | null = null;
    let mode: "undecided" | "swipe" | "scroll" = "undecided";
    let dx = 0;

    const reset = (animate: boolean) => {
      el.style.transition = animate ? "transform 180ms ease-out" : "";
      el.style.transform = "";
    };

    const onStart = (e: TouchEvent) => {
      start = null;
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      if (t.clientX < EDGE || t.clientX > window.innerWidth - EDGE) return;
      if (scrollsSideways(e.target as Element, el)) return;
      start = { x: t.clientX, y: t.clientY, t: e.timeStamp };
      mode = "undecided";
      dx = 0;
    };

    const onMove = (e: TouchEvent) => {
      if (!start || e.touches.length !== 1) return;
      const t = e.touches[0];
      dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (mode === "undecided") {
        if (Math.abs(dx) < LOCK && Math.abs(dy) < LOCK) return;
        const selecting = !window.getSelection()?.isCollapsed;
        mode = !selecting && Math.abs(dx) > Math.abs(dy) * 1.5 ? "swipe" : "scroll";
      }
      if (mode !== "swipe") return;
      // Only follow the finger towards an article that exists.
      const can = dx < 0 ? latest.current.onLeft : latest.current.onRight;
      el.style.transition = "";
      el.style.transform = `translateX(${can ? dx * 0.35 : dx * 0.1}px)`;
    };

    const onEnd = (e: TouchEvent) => {
      if (!start) return;
      const swiped = mode === "swipe";
      const speed = Math.abs(dx) / Math.max(1, e.timeStamp - start.t);
      start = null;
      reset(true);
      if (!swiped) return;
      if (Math.abs(dx) < DISTANCE && !(Math.abs(dx) > FLICK_DISTANCE && speed > FLICK_SPEED)) return;
      if (dx < 0) latest.current.onLeft?.();
      else latest.current.onRight?.();
    };

    const onCancel = () => {
      start = null;
      reset(true);
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onCancel);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onCancel);
      reset(false);
    };
  }, [ref]);
}

/** True when the touch starts inside something that scrolls sideways on its own. */
function scrollsSideways(target: Element | null, stop: Element): boolean {
  for (let node = target; node && node !== stop; node = node.parentElement) {
    if (node.scrollWidth > node.clientWidth + 1) {
      const overflow = getComputedStyle(node).overflowX;
      if (overflow === "auto" || overflow === "scroll") return true;
    }
  }
  return false;
}
