import { useEffect, useRef, useState, type RefObject } from "react";
import { FilterIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getSettings, normaliseKeyword, updateSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

const MAX_CHARS = 40;
const MAX_WORDS = 4;

interface Popup {
  word: string;
  x: number;
  y: number;
  /** Under the selection (touch), where it doesn't clash with the phone's own Copy menu. */
  below: boolean;
}

/** How long a touch selection must stay still before the button shows. */
const TOUCH_SETTLE_MS = 350;

/**
 * Select a word (or a few) in the article and an "Add filter" button appears: above it with a
 * mouse, below it on touch screens (once the selection handles stop moving). Clicking it adds
 * the words to the keyword filters in Configure.
 */
export function SelectionFilter({ containerRef }: { containerRef: RefObject<HTMLElement | null> }) {
  const [popup, setPopup] = useState<Popup | null>(null);
  // Tapping the button clears the selection before the tap lands; don't hide it for that.
  const pressing = useRef(false);

  useEffect(() => {
    let lastPointer = "mouse";
    let settle: ReturnType<typeof setTimeout> | undefined;

    function update() {
      const container = containerRef.current;
      const sel = window.getSelection();
      if (!container || !sel || sel.isCollapsed || sel.rangeCount === 0) return setPopup(null);
      const range = sel.getRangeAt(0);
      if (!container.contains(range.commonAncestorContainer)) return setPopup(null);

      // Trim punctuation around the selection: "AI," becomes "AI".
      const word = normaliseKeyword(sel.toString()).replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
      if (!word || word.length > MAX_CHARS || word.split(" ").length > MAX_WORDS) return setPopup(null);

      const rect = range.getBoundingClientRect();
      // Keep the button inside the window near the edges.
      const x = Math.min(Math.max(rect.left + rect.width / 2, 130), window.innerWidth - 130);
      const below = lastPointer !== "mouse";
      // On touch, leave room for the selection handles under the text.
      const y = below ? Math.min(rect.bottom + 24, window.innerHeight - 56) : Math.max(rect.top, 48);
      setPopup({ word, x, y, below });
    }
    const hide = () => {
      if (!pressing.current) setPopup(null);
    };
    const onPointerDown = (e: PointerEvent) => {
      lastPointer = e.pointerType;
    };

    // Wait for the selection to settle after the mouse or keyboard finishes.
    const onUp = () => setTimeout(update, 0);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("keyup", onUp);
    const onSelectionChange = () => {
      clearTimeout(settle);
      if (window.getSelection()?.isCollapsed) return hide();
      // Touch selections have no mouseup: show the button once the handles stop moving.
      if (lastPointer !== "mouse") settle = setTimeout(update, TOUCH_SETTLE_MS);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("selectionchange", onSelectionChange);
    // The article scrolls inside its own panel; capture catches that scroll too.
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("keyup", onUp);
      document.removeEventListener("selectionchange", onSelectionChange);
      document.removeEventListener("pointerdown", onPointerDown, true);
      clearTimeout(settle);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [containerRef]);

  if (!popup) return null;

  async function addFilter(word: string) {
    pressing.current = false;
    setPopup(null);
    window.getSelection()?.removeAllRanges();
    const { keywords } = await getSettings();
    if (keywords.some((k) => k.toLowerCase() === word.toLowerCase())) {
      toast(`“${word}” is already in your filters`);
      return;
    }
    await updateSettings({ keywords: [...keywords, word] });
    toast.success(`Hiding posts with “${word}” in the title`, {
      action: {
        label: "Undo",
        onClick: async () => {
          const current = (await getSettings()).keywords;
          await updateSettings({ keywords: current.filter((k) => k !== word) });
        },
      },
      duration: 8000,
    });
  }

  return (
    <div
      className={cn("fixed z-50 -translate-x-1/2", popup.below ? "pt-2" : "-translate-y-full pb-2")}
      style={{ left: popup.x, top: popup.y }}
      role="toolbar"
      aria-label="Add filter"
      // Keep the text selected while clicking the button.
      onMouseDown={(e) => e.preventDefault()}
      onPointerDown={() => {
        pressing.current = true;
        // In case the tap turns into a scroll and never clicks.
        setTimeout(() => {
          pressing.current = false;
          if (window.getSelection()?.isCollapsed) setPopup(null);
        }, 800);
      }}
    >
      <Button size="sm" className="shadow-md" onClick={() => void addFilter(popup.word)}>
        <FilterIcon />
        Add filter “{popup.word.length > 24 ? `${popup.word.slice(0, 23)}…` : popup.word}”?
      </Button>
    </div>
  );
}
