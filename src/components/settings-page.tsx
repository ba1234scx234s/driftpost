import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { ArchiveIcon, ArrowDownUpIcon, BookOpenIcon, ChevronDownIcon, CircleHelpIcon, EyeIcon, EyeOffIcon, FilterIcon, InfoIcon, Rows3Icon, MonitorIcon, MoonIcon, PaletteIcon, PlusIcon, ShieldIcon, SunIcon, XIcon } from "lucide-react";
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
import { Acknowledgement } from "@/components/acknowledgement";
import { KofiButton } from "@/components/kofi-note";
import { KOFI_URL } from "@/lib/kofi";
import { FontPicker } from "@/components/font-picker";
import { ListItemPreview } from "@/components/item-list";
import { useIsMobile, useIsTablet } from "@/hooks/use-is-mobile";
import {
  normaliseKeyword,
  OPEN_IN,
  unhideTag,
  SIZES,
  THUMBNAILS,
  type Thumbnails,
  LINE_HEIGHTS,
  CUSTOM_LINE_HEIGHT,
  type LineHeightId,
  updateSettings,
  useSettings,
  type SizeId,
} from "@/lib/settings";

/** The parts of Configure, in the order the side nav lists them. */
export const SETTINGS_SECTIONS = [
  { id: "appearance", label: "Appearance", icon: PaletteIcon },
  { id: "article-list", label: "Article list", icon: Rows3Icon },
  { id: "reading", label: "Reading", icon: BookOpenIcon },
  { id: "filters", label: "Filters", icon: FilterIcon },
  { id: "import-export", label: "Import & export feeds", icon: ArrowDownUpIcon },
  { id: "backup", label: "Backup & restore", icon: ArchiveIcon },
  { id: "privacy", label: "Privacy", icon: ShieldIcon },
  { id: "faq", label: "FAQ", icon: CircleHelpIcon },
  { id: "about", label: "About", icon: InfoIcon },
] as const;
export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]["id"];

let lastJump = 0;

/**
 * Configure as one long page. On wider screens a nav beside it jumps to each part and
 * highlights the one you're reading; phones just scroll.
 */
export function SettingsPage({ jump }: { jump?: { section: SettingsSectionId; n: number } }) {
  const settings = useSettings();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  const content: Record<SettingsSectionId, ReactNode> = {
    "appearance": (
      <Section title="Appearance">
        <Row label="Theme" htmlFor="theme" wide>
          <ThemePicker />
        </Row>
        <FontPicker font={settings.font} />
        <Row label="Text size" htmlFor="size" hint="For all text in Driftpost." wide>
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
    ),
    "article-list": (
      <Section title="Article list">
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
        <Row label="Show descriptions" htmlFor="summaries" hint="The short text under each title in your lists.">
          <Switch
            id="summaries"
            checked={settings.showSummaries}
            onCheckedChange={(showSummaries) => void updateSettings({ showSummaries })}
          />
        </Row>
        <Row label="Thumbnails" htmlFor="thumbnails" hint={THUMBNAILS[settings.thumbnails].hint} wide>
          <ToggleGroup
            id="thumbnails"
            type="single"
            variant="outline"
            value={settings.thumbnails}
            onValueChange={(thumbnails) => thumbnails && void updateSettings({ thumbnails: thumbnails as Thumbnails })}
          >
            {Object.entries(THUMBNAILS).map(([id, t]) => (
              <ToggleGroupItem key={id} value={id} className="px-3">
                {t.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Row>
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-xs">Preview</p>
          <ListItemPreview />
        </div>
      </Section>
    ),
    "reading": (
      <Section title="Reading">
        <Row
          label="Open articles in app"
          htmlFor="open-in"
          hint={settings.openIn === "reader" ? OPEN_IN.reader.hint : OPEN_IN.tab.hint}
        >
          <Switch
            id="open-in"
            checked={settings.openIn === "reader"}
            onCheckedChange={(inApp) => void updateSettings({ openIn: inApp ? "reader" : "tab" })}
          />
        </Row>
        {!isMobile && (
          <Row
            label="Hide sidebar while reading"
            htmlFor="hide-sidebar"
            hint="With an article open, the list and the article get the whole screen. Your feeds are in the menu."
          >
            <Switch
              id="hide-sidebar"
              checked={settings.hideSidebarWhenReading ?? isTablet}
              onCheckedChange={(hideSidebarWhenReading) => void updateSettings({ hideSidebarWhenReading })}
            />
          </Row>
        )}
        <Row
          label="Load pictures"
          htmlFor="load-images"
          hint="Pictures in articles load from the sites that publish them, so those sites see your IP address."
        >
          <Switch
            id="load-images"
            checked={settings.loadImages}
            onCheckedChange={(loadImages) => void updateSettings({ loadImages })}
          />
        </Row>
        <LineHeightPicker lineHeight={settings.lineHeight} custom={settings.customLineHeight} />
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-xs">Preview</p>
          {/* Set like an article's body text, so the line height shows as it will when reading. */}
          <div inert aria-label="Preview of an article's text" className="bg-muted/50 rounded-lg border px-4 py-3">
            <p className="prose prose-neutral dark:prose-invert max-w-none leading-(--article-leading)">
              The tide goes out slowly in the late afternoon, leaving the sand smooth and dark. Gulls walk the water's
              edge in no particular hurry, and the light turns from white to gold. There's nothing to catch up on here,
              only the next wave, and the one after that.
            </p>
          </div>
        </div>
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
        title="Import & export feeds"
        description="Move your subscriptions between Driftpost and other feed readers with an OPML file. Only the feeds come along, not posts or settings."
      >
        <OpmlSection />
      </Section>
    ),
    "backup": (
      <Section
        title="Backup & restore"
        description="Everything in one file: your feeds, every post with its read status, your settings and filters. Driftpost only keeps your data in this browser, so a backup is how you move it or keep it safe."
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
    "faq": (
      <Section title="FAQ">
        <Faq />
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
  // Each request is followed once, so opening Configure later starts at the top again.
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
      <nav aria-label="Configure" className="hidden w-56 shrink-0 flex-col gap-1 border-r p-3 md:flex">
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
      <ScrollArea ref={scroller} className="min-h-0 min-w-0 flex-1">
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
  const inline = "text-foreground underline underline-offset-4";
  return (
    <div className="text-muted-foreground flex flex-col gap-3 text-sm">
      <p>
        Driftpost {__APP_VERSION__}. Free and open source under the MIT licence.
      </p>
      <p>
        For questions or feedback, please reach out to{" "}
        <a href="mailto:driftpost_app@pm.me" className="text-foreground underline underline-offset-4">
          driftpost_app@pm.me
        </a>{" "}
        or{" "}
        <a href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer" className={inline}>
          submit an issue
        </a>{" "}
        on GitHub.
      </p>
      <div>
        <KofiButton />
      </div>
      <Acknowledgement />
    </div>
  );
}

const FAQ: { q: string; a: ReactNode }[] = [
  {
    q: "Where are my feeds kept?",
    a: "Only in this browser, on this device. There's no account and no copy on a server, so nobody else can see what you follow or read.",
  },
  {
    q: "What happens if I clear my browsing data?",
    a: "Your feeds, read status and settings are erased with it. Download a backup now and then (Configure → Backup & restore) and restore it if that happens.",
  },
  {
    q: "Can my browser remove my feeds on its own?",
    a: (
      <>
        It depends on the browser:
        <span className="mt-2 flex flex-col gap-1.5">
          <span>
            <strong className="text-foreground font-medium">Chrome, Edge and Android:</strong> Driftpost asks to keep
            its data for good, so it's only removed if you clear it yourself.
          </span>
          <span>
            <strong className="text-foreground font-medium">Firefox:</strong> the same, though Firefox may ask you
            first.
          </span>
          <span>
            <strong className="text-foreground font-medium">Safari on Mac, iPhone and iPad:</strong> Safari clears a
            site's data when you haven't opened it for 7 days. Open Driftpost at least once a week, or add it to your
            Home Screen, where that rule doesn't apply.
          </span>
        </span>
        <span className="mt-2 block">A backup keeps you safe in every browser.</span>
      </>
    ),
  },
  {
    q: "How long are posts kept?",
    a: "Unread posts stay until you unfollow their feed. Read posts are removed 90 days after they were published, once the feed itself no longer lists them, so Driftpost doesn't fill up your device.",
  },
  {
    q: "Can I use Driftpost on my phone and computer together?",
    a: "Yes, but they don't sync: each browser keeps its own feeds and read status. To move everything across, download a backup on one and restore it on the other.",
  },
  {
    q: "How do I follow a site that isn't in Discover?",
    a: "Press + next to the logo and paste the site's address. Driftpost finds its feed for you. Sites without an RSS, Atom or JSON feed can't be followed.",
  },
  {
    q: "Can I bring my feeds from another reader?",
    a: "Yes. Export an OPML file from Feedly, Inoreader, NetNewsWire or most other readers and import it under Configure → Import & export feeds.",
  },
  {
    q: "How often do feeds update?",
    a: "While Driftpost is open, each feed is checked on its own schedule: busy news sites every 30 minutes, quieter blogs every few hours. The refresh button at the top of the list checks them all straight away.",
  },
  {
    q: "Why do some articles only show a summary?",
    a: "Some feeds only include a preview. Driftpost then tries to load the full text from the site, but some sites block that. \"Open original\" always takes you to the article itself.",
  },
  {
    q: "What does the red warning next to a feed mean?",
    a: "Its last refresh failed: the site may be down, or the feed may have moved. Hover over the warning for details. Driftpost keeps trying, waiting a little longer each time.",
  },
  {
    q: "Can I install Driftpost as an app?",
    a: "Yes. On iPhone and iPad, tap Share → Add to Home Screen in Safari. On Android and on desktop Chrome or Edge, choose Install app from the browser menu.",
  },
  {
    q: "Is Driftpost really free?",
    a: (
      <>
        Yes, and open source. There are no ads or paid plans. If you'd like to help with the server costs, you can{" "}
        <a href={KOFI_URL} target="_blank" rel="noreferrer" className="text-foreground underline underline-offset-4">
          buy me an iced coffee
        </a>
        .
      </>
    ),
  },
];

/** Common questions, each one opening to its answer. */
function Faq() {
  return (
    <div className="flex max-w-prose flex-col">
      {FAQ.map(({ q, a }) => (
        <details key={q} className="group border-b last:border-b-0">
          <summary className="hover:text-foreground flex cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
            {q}
            <ChevronDownIcon className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <p className="text-muted-foreground pb-4 text-sm">{a}</p>
        </details>
      ))}
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
      <p>
        If you pick a Google font under Appearance, it's loaded from Google, which then sees your IP address. The
        built-in fonts don't contact anyone, and nothing is loaded from Google unless you choose one of its fonts.
      </p>
      <p>
        Post thumbnails and the pictures in articles load straight from the sites that publish them, so those sites
        see your IP address, just as when you visit them. To stop that, turn off Load pictures under Reading and set
        Thumbnails to Feed icon or None under Article list.
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
  return (
    <PresetOrCustom
      id="line-height"
      label="Line height"
      hint="Space between lines in an article's text."
      options={Object.entries(LINE_HEIGHTS).map(([id, l]) => ({ id, label: l.label }))}
      value={lineHeight}
      onChoose={(value) => void updateSettings({ lineHeight: value as LineHeightId })}
      custom={custom}
      onCustom={(customLineHeight) => void updateSettings({ customLineHeight })}
      range={CUSTOM_LINE_HEIGHT}
      customName="Custom line height"
    />
  );
}

/** A row of preset choices plus "Custom", which shows a number field for the reader's own value. */
function PresetOrCustom(props: {
  id: string;
  label: string;
  hint: string;
  options: { id: string; label: string; name?: string }[];
  value: string;
  onChoose: (value: string) => void;
  custom: number;
  onCustom: (value: number) => void;
  range: { min: number; max: number; step: number };
  customName: string;
}) {
  const { custom, range } = props;
  const [draft, setDraft] = useState(String(custom));
  useEffect(() => setDraft(String(custom)), [custom]);

  const commit = () => {
    const n = Number(draft.replace(",", "."));
    if (!draft.trim() || !Number.isFinite(n)) return setDraft(String(custom));
    const value = Math.round(Math.min(range.max, Math.max(range.min, n)) * 100) / 100;
    setDraft(String(value));
    if (value !== custom) props.onCustom(value);
  };

  return (
    <Row label={props.label} htmlFor={props.id} hint={props.hint} wide>
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          id={props.id}
          type="single"
          variant="outline"
          value={props.value}
          onValueChange={(value) => value && props.onChoose(value)}
        >
          {props.options.map((o) => (
            <ToggleGroupItem key={o.id} value={o.id} aria-label={o.name} className="px-3">
              {o.label}
            </ToggleGroupItem>
          ))}
          <ToggleGroupItem value="custom" className="px-3">
            Custom
          </ToggleGroupItem>
        </ToggleGroup>
        {props.value === "custom" && (
          <Input
            type="number"
            inputMode="decimal"
            aria-label={props.customName}
            min={range.min}
            max={range.max}
            step={range.step}
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

/**
 * A setting: its name and hint on the left, the control on the right. The hint wraps
 * rather than pushing a switch onto a line of its own. Wide controls (button rows, menus)
 * move under the text only when there isn't room beside it, and their buttons wrap too,
 * so nothing runs off a narrow screen at any text size.
 */
export function Row({
  label,
  htmlFor,
  hint,
  wide,
  stacked,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  wide?: boolean;
  /** Always put the control under the label, at full width up to its own size. */
  stacked?: boolean;
  children: ReactNode;
}) {
  if (stacked) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Label htmlFor={htmlFor}>{label}</Label>
          {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
        </div>
        <div className="max-w-full">{children}</div>
      </div>
    );
  }
  return (
    <div className={cn("flex items-center justify-between gap-x-6 gap-y-2", wide && "flex-wrap")}>
      <div className={cn("flex min-w-0 flex-col gap-0.5", wide ? "flex-[1_1_14rem]" : "flex-1")}>
        <Label htmlFor={htmlFor}>{label}</Label>
        {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      </div>
      <div className={wide ? "max-w-full [&_[data-slot=toggle-group]]:flex-wrap" : "shrink-0"}>{children}</div>
    </div>
  );
}
