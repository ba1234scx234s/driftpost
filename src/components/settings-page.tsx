import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { EyeIcon, EyeOffIcon, MonitorIcon, MoonIcon, PlusIcon, SunIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TOPIC_IDS, TOPICS, type TopicId } from "@/lib/topics";
import { FontPicker } from "@/components/font-picker";
import {
  normaliseKeyword,
  OPEN_IN,
  unhideTag,
  SIZES,
  updateSettings,
  useSettings,
  type OpenIn,
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
          <FontPicker font={settings.font} />
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
          <Row label="Open articles" htmlFor="open-in" hint={OPEN_IN[settings.openIn].hint}>
            <ToggleGroup
              id="open-in"
              type="single"
              variant="outline"
              value={settings.openIn}
              onValueChange={(openIn) => openIn && void updateSettings({ openIn: openIn as OpenIn })}
            >
              {Object.entries(OPEN_IN).map(([id, o]) => (
                <ToggleGroupItem key={id} value={id} className="px-3">
                  {o.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Row>
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
          <Row
            label="Mark as read when scrolled past"
            htmlFor="read-on-scroll"
            hint="Unread posts count as read once they scroll up out of view."
          >
            <Switch
              id="read-on-scroll"
              checked={settings.markReadOnScroll}
              onCheckedChange={(markReadOnScroll) => void updateSettings({ markReadOnScroll })}
            />
          </Row>
          <Row label="Show thumbnails" htmlFor="thumbnails" hint="Post images next to titles in your lists.">
            <Switch
              id="thumbnails"
              checked={settings.showThumbnails}
              onCheckedChange={(showThumbnails) => void updateSettings({ showThumbnails })}
            />
          </Row>
          <Row label="Show descriptions" htmlFor="summaries" hint="The short text under each title in your lists.">
            <Switch
              id="summaries"
              checked={settings.showSummaries}
              onCheckedChange={(showSummaries) => void updateSettings({ showSummaries })}
            />
          </Row>
        </Section>

        <Separator />

        <Section
          title="Filters"
          description="Hidden posts don't show in any list and don't count as unread."
        >
          <TopicFilters hidden={settings.hiddenTopics} />
          {settings.hiddenTags.length > 0 && <HiddenTags tags={settings.hiddenTags} />}
          <div className="flex flex-col gap-2">
            <Label htmlFor="keyword">Words in the title</Label>
            <p className="text-muted-foreground -mt-1 text-xs">Whole words only, upper or lower case doesn't matter.</p>
            <KeywordFilters keywords={settings.keywords} />
          </div>
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

function TopicFilters({ hidden }: { hidden: TopicId[] }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>Topics</Label>
      <p className="text-muted-foreground -mt-1 text-xs">
        Worked out from the tags feeds give their posts and words in the link, like /sport/. Posts without those clues
        aren't sorted yet.
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Topics to hide">
        {TOPIC_IDS.map((id) => {
          const isHidden = hidden.includes(id);
          return (
            <Toggle
              key={id}
              variant="outline"
              size="sm"
              pressed={isHidden}
              onPressedChange={(on) =>
                void updateSettings({ hiddenTopics: on ? [...hidden, id] : hidden.filter((t) => t !== id) })
              }
              aria-label={`Hide ${TOPICS[id].label}`}
              className="data-[state=on]:bg-destructive/10 data-[state=on]:text-destructive data-[state=on]:border-destructive/40"
            >
              {isHidden ? <EyeOffIcon /> : <EyeIcon />}
              {TOPICS[id].label}
            </Toggle>
          );
        })}
      </div>
    </div>
  );
}

function HiddenTags({ tags }: { tags: string[] }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>Tags</Label>
      <p className="text-muted-foreground -mt-1 text-xs">
        Posts with these tags from their feed are hidden. Add more by clicking a tag on an article.
      </p>
      <ul className="flex flex-wrap gap-2" aria-label="Hidden tags">
        {tags.map((tag) => (
          <li
            key={tag}
            className="bg-secondary text-secondary-foreground flex items-center gap-1 rounded-full py-0.5 pr-1 pl-3 text-sm"
          >
            {tag}
            <Button
              variant="ghost"
              size="icon-xs"
              className="rounded-full"
              aria-label={`Show posts tagged ${tag} again`}
              onClick={() => void unhideTag(tag)}
            >
              <XIcon />
            </Button>
          </li>
        ))}
      </ul>
    </div>
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
          id="keyword"
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

export function Row({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: ReactNode }) {
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
