import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { MonitorIcon, MoonIcon, PlusIcon, SunIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  FONTS,
  normaliseKeyword,
  SIZES,
  updateSettings,
  useSettings,
  type FontId,
  type SizeId,
} from "@/lib/settings";

export function SettingsPage() {
  const settings = useSettings();

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-6 sm:px-6">
        <Section title="Appearance">
          <Row label="Theme" htmlFor="theme">
            <ThemePicker />
          </Row>
          <Row label="Font" htmlFor="font">
            <Select value={settings.font} onValueChange={(font) => void updateSettings({ font: font as FontId })}>
              <SelectTrigger id="font" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FONTS).map(([id, f]) => (
                  <SelectItem key={id} value={id} style={{ fontFamily: f.stack }}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row label="Text size" htmlFor="size">
            <ToggleGroup
              id="size"
              type="single"
              variant="outline"
              value={settings.size}
              onValueChange={(size) => size && void updateSettings({ size: size as SizeId })}
            >
              {Object.entries(SIZES).map(([id, s]) => (
                <ToggleGroupItem key={id} value={id} aria-label={s.name} className="px-3">
                  {s.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Row>
        </Section>

        <Separator />

        <Section title="Reading">
          <Row
            label="Hide read posts"
            htmlFor="hide-read"
            hint="Posts you open stay visible until you switch to another list."
          >
            <Switch
              id="hide-read"
              checked={settings.hideRead}
              onCheckedChange={(hideRead) => void updateSettings({ hideRead })}
            />
          </Row>
        </Section>

        <Separator />

        <Section
          title="Filters"
          description="Posts with one of these words in the title are hidden from every list. Whole words only, upper or lower case doesn't matter."
        >
          <KeywordFilters keywords={settings.keywords} />
        </Section>
      </div>
    </ScrollArea>
  );
}

function ThemePicker() {
  const { theme, setTheme } = useTheme();
  // next-themes only knows the stored theme after mounting.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <ToggleGroup
      id="theme"
      type="single"
      variant="outline"
      value={mounted ? theme : undefined}
      onValueChange={(value) => value && setTheme(value)}
    >
      <ToggleGroupItem value="light" aria-label="Light" className="gap-1.5 px-3">
        <SunIcon /> Light
      </ToggleGroupItem>
      <ToggleGroupItem value="dark" aria-label="Dark" className="gap-1.5 px-3">
        <MoonIcon /> Dark
      </ToggleGroupItem>
      <ToggleGroupItem value="system" aria-label="System" className="gap-1.5 px-3">
        <MonitorIcon /> System
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

function KeywordFilters({ keywords }: { keywords: string[] }) {
  const [draft, setDraft] = useState("");
  const word = normaliseKeyword(draft);
  const exists = keywords.some((k) => k.toLowerCase() === word.toLowerCase());

  function add(e: FormEvent) {
    e.preventDefault();
    if (!word || exists) return;
    void updateSettings({ keywords: [...keywords, word] });
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={add} className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a word, e.g. crypto"
          aria-label="Keyword to filter out"
          autoComplete="off"
          maxLength={60}
        />
        <Button type="submit" variant="outline" disabled={!word || exists}>
          <PlusIcon /> Add
        </Button>
      </form>
      {exists && <p className="text-muted-foreground text-xs">“{word}” is already in your filters.</p>}
      {keywords.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Filtered words">
          {keywords.map((k) => (
            <li
              key={k}
              className="bg-secondary text-secondary-foreground flex items-center gap-1 rounded-full py-0.5 pr-1 pl-3 text-sm"
            >
              {k}
              <Button
                variant="ghost"
                size="icon-xs"
                className="rounded-full"
                aria-label={`Remove ${k}`}
                onClick={() => void updateSettings({ keywords: keywords.filter((x) => x !== k) })}
              >
                <XIcon />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">No filters yet.</p>
      )}
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="font-heading text-base font-semibold">{title}</h3>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Row({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
      <div className="flex flex-col gap-0.5">
        <Label htmlFor={htmlFor}>{label}</Label>
        {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      </div>
      {children}
    </div>
  );
}
