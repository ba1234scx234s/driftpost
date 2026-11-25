import { useEffect, useState, type RefObject } from "react";
import { FilterIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getSettings, normaliseKeyword, updateSettings } from "@/lib/settings";

const MAX_CHARS = 40;
const MAX_WORDS = 4;

interface Popup {
  word: string;
  x: number;
  y: number;
}

/**
 * Select a word (or a few) in the article and an "Add filter" button appears above it.
 * Clicking it adds the words to the keyword filters in Settings.
 */
export function SelectionFilter({ containerRef }: { containerRef: RefObject<HTMLElement | null> }) {
  const [popup, setPopup] = useState<Popup | null>(null);

  useEffect(() => {
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
      setPopup({ word, x, y: Math.max(rect.top, 48) });
    }
    const hide = () => setPopup(null);

    // Wait for the selection to settle after the mouse or keyboard finishes.
    const onUp = () => setTimeout(update, 0);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("keyup", onUp);
    const onSelectionChange = () => {
      if (window.getSelection()?.isCollapsed) hide();
    };
    document.addEventListener("selectionchange", onSelectionChange);
    // The article scrolls inside its own panel; capture catches that scroll too.
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("keyup", onUp);
      document.removeEventListener("selectionchange", onSelectionChange);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [containerRef]);

  if (!popup) return null;

  async function addFilter(word: string) {
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
      className="fixed z-50 -translate-x-1/2 -translate-y-full pb-2"
      style={{ left: popup.x, top: popup.y }}
      role="toolbar"
      aria-label="Add filter"
      // Keep the text selected while clicking the button.
      onMouseDown={(e) => e.preventDefault()}
    >
      <Button size="sm" className="shadow-md" onClick={() => void addFilter(popup.word)}>
        <FilterIcon />
        Add filter “{popup.word.length > 24 ? `${popup.word.slice(0, 23)}…` : popup.word}”?
      </Button>
    </div>
  );
}
