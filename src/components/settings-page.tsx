import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { ArchiveIcon, ArrowDownUpIcon, BookOpenIcon, CodeIcon, CoffeeIcon, EyeIcon, EyeOffIcon, FilterIcon, HeartIcon, InfoIcon, MessageSquareWarningIcon, MonitorIcon, MoonIcon, PaletteIcon, PlusIcon, ShieldIcon, SparklesIcon, SunIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TOPIC_IDS, TOPICS, type TopicId } from "@/lib/topics";
import { BackupSection } from "@/components/backup-section";
import { OpmlSection } from "@/components/opml-section";
import { FontPicker } from "@/components/font-picker";
import {
  normaliseKeyword,
  OPEN_IN,
  unhideTag,
  SIZES,
  LINE_HEIGHTS,
  CUSTOM_LINE_HEIGHT,
  type LineHeightId,
  updateSettings,
  useSettings,
  type OpenIn,
  type SizeId,
} from "@/lib/settings";

/** The parts of Settings, in the order the side nav lists them. */
export const SETTINGS_SECTIONS = [
  { id: "appearance", label: "Appearance", icon: PaletteIcon },
  { id: "reading", label: "Reading", icon: BookOpenIcon },
  { id: "filters", label: "Filters", icon: FilterIcon },
  { id: "import-export", label: "Import and export", icon: ArrowDownUpIcon },
  { id: "backup", label: "Backup", icon: ArchiveIcon },
  { id: "privacy", label: "Privacy", icon: ShieldIcon },
  { id: "about", label: "About", icon: InfoIcon },
] as const;
export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]["id"];

let lastJump = 0;

/**
 * Settings as one long page. On wider screens a nav beside it jumps to each part and
 * highlights the one you're reading; phones just scroll.
 */
export function SettingsPage({ jump }: { jump?: { section: SettingsSectionId; n: number } }) {
  const settings = useSettings();

  const content: Record<SettingsSectionId, ReactNode> = {
    "appearance": (
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
        <LineHeightPicker lineHeight={settings.lineHeight} custom={settings.customLineHeight} />
      </Section>
    ),
    "reading": (
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
          label="Hide read feeds"
          htmlFor="hide-read-feeds"
          hint="Feeds with nothing unread leave the sidebar. A link under the list shows them again."
        >
          <Switch
            id="hide-read-feeds"
            checked={settings.hideReadFeeds}
            onCheckedChange={(hideReadFeeds) => void updateSettings({ hideReadFeeds })}
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
        <Row
          label="Colour unread dots"
          htmlFor="color-dots"
          hint="The dot next to unread posts takes the main colour of the feed's icon."
        >
          <Switch
            id="color-dots"
            checked={settings.colorDots}
            onCheckedChange={(colorDots) => void updateSettings({ colorDots })}
          />
        </Row>
      </Section>
    ),
    "filters": (
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
    ),
    "import-export": (
      <Section
        id="import-export"
        title="Import and export"
        description="Move your subscriptions between Driftpost and other feed readers with an OPML file. Only the feeds come along, not posts or settings."
      >
        <OpmlSection />
      </Section>
    ),
    "backup": (
      <Section
        title="Backup"
        description="Everything in one file: your feeds, every post with its read and starred status, your settings and filters. Driftpost only keeps your data in this browser, so a backup is how you move it or keep it safe."
      >
        <BackupSection />
        <Row
          label="Remind me to back up"
          htmlFor="backup-reminder"
          hint="Every 30 days, Driftpost asks you to download a backup."
        >
          <Switch
            id="backup-reminder"
            checked={settings.backupReminder}
            onCheckedChange={(backupReminder) => void updateSettings({ backupReminder })}
          />
        </Row>
      </Section>
    ),
    "privacy": (
      <Section title="Privacy">
        <PrivacyNote />
      </Section>
    ),
    "about": (
      <Section title="About">
        <About />
      </Section>
    ),
  };

  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<SettingsSectionId>("appearance");
  const viewport = () => scroller.current?.querySelector<HTMLElement>("[data-slot=scroll-area-viewport]");

  // After a jump, the part you picked stays highlighted even if it can't reach the top
  // (short parts near the end), until you scroll yourself.
  const pinned = useRef(false);

  function scrollTo(id: SettingsSectionId, smooth: boolean) {
    pinned.current = true;
    document.getElementById(`settings-${id}`)?.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "auto" });
    setActive(id);
  }

  // Opened from a link that points at a part (like "Import OPML"): go straight there.
  // Each request is followed once, so opening Settings later starts at the top again.
  useEffect(() => {
    if (!jump || jump.n <= lastJump) return;
    lastJump = jump.n;
    scrollTo(jump.section, false);
  }, [jump?.n]); // eslint-disable-line react-hooks/exhaustive-deps

  // Highlight the part at the top of the view; at the very bottom, the last part.
  useEffect(() => {
    const vp = viewport();
    if (!vp) return;
    const update = () => {
      if (pinned.current) return;
      const top = vp.getBoundingClientRect().top + 24;
      let current: SettingsSectionId = SETTINGS_SECTIONS[0].id;
      for (const { id } of SETTINGS_SECTIONS) {
        const el = document.getElementById(`settings-${id}`);
        if (el && el.getBoundingClientRect().top <= top) current = id;
      }
      if (vp.scrollTop + vp.clientHeight >= vp.scrollHeight - 2) current = SETTINGS_SECTIONS.at(-1)!.id;
      setActive(current);
    };
    // Scrolling by hand (wheel, touch, keys) lets the highlight follow again.
    const unpin = () => {
      pinned.current = false;
    };
    vp.addEventListener("scroll", update, { passive: true });
    for (const type of ["wheel", "touchstart", "keydown", "pointerdown"]) vp.addEventListener(type, unpin, { passive: true });
    return () => {
      vp.removeEventListener("scroll", update);
      for (const type of ["wheel", "touchstart", "keydown", "pointerdown"]) vp.removeEventListener(type, unpin);
    };
  }, []);

  return (
    <div className="flex min-h-0 flex-1">
      <nav aria-label="Settings" className="hidden w-56 shrink-0 flex-col gap-1 border-r p-3 md:flex">
        {SETTINGS_SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => scrollTo(id, true)}
            aria-current={active === id ? "location" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm",
              active === id
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        ))}
      </nav>
      <ScrollArea ref={scroller} className="min-h-0 flex-1">
        <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-6 sm:px-6">
          {SETTINGS_SECTIONS.map(({ id }, i) => (
            <div key={id} id={`settings-${id}`} className="flex scroll-mt-6 flex-col gap-8">
              {i > 0 && <Separator />}
              {content[id]}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
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

const REPO_URL = "https://github.com/ba1234scx234s/driftpost";

function About() {
  const link = "text-foreground inline-flex items-center gap-1.5 underline underline-offset-4";
  return (
    <div className="text-muted-foreground flex flex-col gap-3 text-sm">
      <p>Driftpost {__APP_VERSION__}. Free and open source under the MIT licence.</p>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <a href={`${REPO_URL}/releases`} target="_blank" rel="noreferrer" className={link}>
          <SparklesIcon className="size-4" aria-hidden />
          What's new
        </a>
        <a href={REPO_URL} target="_blank" rel="noreferrer" className={link}>
          <CodeIcon className="size-4" aria-hidden />
          Source code on GitHub
        </a>
        <a href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer" className={link}>
          <MessageSquareWarningIcon className="size-4" aria-hidden />
          Report a problem or idea
        </a>
        <a href="https://ko-fi.com/driftpost#checkoutModal" target="_blank" rel="noreferrer" className={link}>
          <CoffeeIcon className="size-4" aria-hidden />
          Buy me a coffee on Ko-fi
        </a>
      </div>
      <p className="flex items-center gap-1">
        Made with <HeartIcon className="size-3.5 fill-current text-red-500" aria-label="love" /> in Melbourne, Australia.
      </p>
    </div>
  );
}

function PrivacyNote() {
  return (
    <div className="text-muted-foreground flex max-w-prose flex-col gap-3 text-sm">
      <p>
        There are no accounts, ads or tracking. Your feeds, posts, read status and settings are stored only in
        this browser, and nobody else can see them.
      </p>
      <p>
        Most sites don't let browsers read their feeds directly, so Driftpost's server fetches feeds, article
        pages and site icons for you. It saves nothing about who asked. Recently fetched feeds are kept for a
        few minutes so they can be shared with other readers, and the number of requests from each internet
        address is counted briefly to stop misuse.
      </p>
      <p>Articles belong to the sites that publish them. Driftpost shows them for personal reading only.</p>
    </div>
  );
}

function Section({
  title,
  description,
  id,
  children,
}: {
  title: string;
  description?: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="flex scroll-mt-6 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="font-heading text-base font-semibold">{title}</h3>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/** Line height of an article's body text: three presets, or any value. */
function LineHeightPicker({ lineHeight, custom }: { lineHeight: LineHeightId; custom: number }) {
  const [draft, setDraft] = useState(String(custom));
  useEffect(() => setDraft(String(custom)), [custom]);
  const { min, max, step } = CUSTOM_LINE_HEIGHT;

  const commit = () => {
    const n = Number(draft.replace(",", "."));
    if (!draft.trim() || !Number.isFinite(n)) return setDraft(String(custom));
    const value = Math.round(Math.min(max, Math.max(min, n)) * 100) / 100;
    setDraft(String(value));
    if (value !== custom) void updateSettings({ customLineHeight: value });
  };

  return (
    <Row label="Line height" htmlFor="line-height" hint="Space between lines in an article's text.">
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          id="line-height"
          type="single"
          variant="outline"
          value={lineHeight}
          onValueChange={(value) => value && void updateSettings({ lineHeight: value as LineHeightId })}
        >
          {Object.entries(LINE_HEIGHTS).map(([id, l]) => (
            <ToggleGroupItem key={id} value={id} className="px-3">
              {l.label}
            </ToggleGroupItem>
          ))}
          <ToggleGroupItem value="custom" className="px-3">
            Custom
          </ToggleGroupItem>
        </ToggleGroup>
        {lineHeight === "custom" && (
          <Input
            type="number"
            inputMode="decimal"
            aria-label="Custom line height"
            min={min}
            max={max}
            step={step}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && commit()}
            className="w-20"
          />
        )}
      </div>
    </Row>
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
