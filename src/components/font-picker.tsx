import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Row } from "@/components/settings-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BUILT_IN_FONTS,
  fontStack,
  GOOGLE_FONT_IDEAS,
  googleFamily,
  googleFontId,
  loadGoogleFont,
  normaliseFamily,
  SUGGESTED_GOOGLE_FONTS,
  titleCase,
} from "@/lib/fonts";
import { updateSettings } from "@/lib/settings";

const CUSTOM = "__custom";

/** Font setting: built-in fonts, Atkinson Hyperlegible, or any family from Google Fonts. */
export function FontPicker({ font }: { font: string }) {
  const current = googleFamily(font);
  const isCustom = !!current && !(SUGGESTED_GOOGLE_FONTS as readonly string[]).includes(current);
  const [choosing, setChoosing] = useState(false);

  // Preview the suggested Google fonts in the menu.
  useEffect(() => {
    SUGGESTED_GOOGLE_FONTS.forEach((f) => void loadGoogleFont(f));
  }, []);

  function choose(value: string) {
    if (value === CUSTOM) {
      setChoosing(true);
      return;
    }
    setChoosing(false);
    void updateSettings({ font: value });
  }

  return (
    <>
      <Row
        label="Font"
        htmlFor="font"
        hint={current ? "Loaded from Google Fonts, so Google sees your IP address when it loads." : undefined}
      >
        <Select value={choosing ? CUSTOM : font} onValueChange={choose}>
          <SelectTrigger id="font" className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Built in</SelectLabel>
              {Object.entries(BUILT_IN_FONTS).map(([id, f]) => (
                <SelectItem key={id} value={id} style={{ fontFamily: f.stack }}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>Google Fonts</SelectLabel>
              {SUGGESTED_GOOGLE_FONTS.map((family) => (
                <SelectItem key={family} value={googleFontId(family)} style={{ fontFamily: fontStack(googleFontId(family)) }}>
                  {family}
                </SelectItem>
              ))}
              {isCustom && (
                <SelectItem value={font} style={{ fontFamily: fontStack(font) }}>
                  {current}
                </SelectItem>
              )}
              <SelectItem value={CUSTOM}>Another Google font…</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Row>
      {choosing && <GoogleFontForm onDone={() => setChoosing(false)} />}
    </>
  );
}

function GoogleFontForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const family = normaliseFamily(name);
  const inputRef = useRef<HTMLInputElement>(null);

  // The font menu hands focus back to its button as it closes; take it after that.
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  async function apply(e?: FormEvent, value = family) {
    e?.preventDefault();
    if (!value || busy) return;
    setBusy(true);
    // Google's names are case-sensitive and nearly all In Title Case: try that first, then as typed
    // (for names like "IBM Plex Sans" that title case doesn't produce from lowercase).
    const attempts = [...new Set([titleCase(value), value])];
    for (const attempt of attempts) {
      if (await loadGoogleFont(attempt)) {
        await updateSettings({ font: googleFontId(attempt) });
        toast.success(`Font set to ${attempt}`);
        setBusy(false);
        onDone();
        return;
      }
    }
    setBusy(false);
    toast.error(`Couldn't find “${value}” on Google Fonts. Check the spelling on fonts.google.com.`);
  }

  return (
    <div className="bg-muted/50 flex flex-col gap-3 rounded-lg border p-3">
      <form onSubmit={apply} className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Font name, e.g. Lora"
          aria-label="Google Fonts family name"
          ref={inputRef}
          autoComplete="off"
          spellCheck={false}
          disabled={busy}
        />
        <Button type="submit" disabled={!family || busy}>
          {busy && <Loader2Icon className="animate-spin" />}
          Use font
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </form>
      <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
        <span>Try:</span>
        {GOOGLE_FONT_IDEAS.map((idea) => (
          <Button key={idea} type="button" variant="outline" size="xs" disabled={busy} onClick={() => void apply(undefined, idea)}>
            {idea}
          </Button>
        ))}
        <span>
          or browse{" "}
          <a href="https://fonts.google.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            fonts.google.com
          </a>
        </span>
      </div>
    </div>
  );
}
