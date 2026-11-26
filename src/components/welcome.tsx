import type { ComponentType, SVGProps } from "react";
import { BookOpenIcon, CompassIcon, EyeOffIcon, HardDriveIcon, UserRoundXIcon } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const POINTS: { icon: ComponentType<SVGProps<SVGSVGElement>>; title: string; text: string }[] = [
  {
    icon: UserRoundXIcon,
    title: "No account, no login",
    text: "There's nothing to sign up for. Open Driftpost and start reading.",
  },
  {
    icon: HardDriveIcon,
    title: "Nothing saved on a server",
    text: "Your feeds, read status and settings stay in this browser only. Nobody else can see them.",
  },
  {
    icon: EyeOffIcon,
    title: "No ads, no tracking",
    text: "Just the posts from the sites you choose, newest first.",
  },
  {
    icon: BookOpenIcon,
    title: "Calm reading",
    text: "Full articles in a clean reader, and filters for topics and words you'd rather skip.",
  },
];

/** What someone sees before they follow anything. */
export function Welcome({ onDiscover, onSettings }: { onDiscover: () => void; onSettings: () => void }) {
  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="mx-auto flex max-w-xl flex-col gap-8 px-6 py-12 sm:py-16">
        <div className="flex flex-col gap-3">
          <Logo className="size-10" aria-hidden title="" />
          <h2 className="font-heading text-2xl font-semibold tracking-tight">Welcome to Driftpost</h2>
          <p className="text-muted-foreground">
            A calm reader for the blogs, news sites and newsletters you like, all in one list.
          </p>
        </div>

        <ul className="grid gap-5 sm:grid-cols-2">
          {POINTS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3">
              <Icon className="text-muted-foreground mt-0.5 size-5 shrink-0" aria-hidden />
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium">{title}</p>
                <p className="text-muted-foreground text-sm">{text}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-3">
          <div>
            <Button onClick={onDiscover}>
              <CompassIcon />
              Discover feeds to follow
            </Button>
          </div>
          <p className="text-muted-foreground text-sm">
            Or paste any website's address in the box at the top left. Coming from another reader? Import your
            OPML file from the ••• menu, or{" "}
            <button type="button" onClick={onSettings} className="text-foreground underline underline-offset-4">
              restore a Driftpost backup
            </button>
            .
          </p>
        </div>

        <p className="text-muted-foreground border-t pt-4 text-xs">
          Because everything lives in this browser, clearing your browsing data erases it too. Download a backup in
          Settings now and then to keep it safe.
        </p>
      </div>
    </ScrollArea>
  );
}
