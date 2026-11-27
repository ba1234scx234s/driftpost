import type { ComponentType, SVGProps } from "react";
import { BookOpenIcon, BotOffIcon, CompassIcon, EyeOffIcon, HardDriveIcon, ListOrderedIcon, UserRoundXIcon } from "lucide-react";
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
    text: "Nobody watches what you read, and nothing on the page is trying to sell you something.",
  },
  {
    icon: ListOrderedIcon,
    title: "No algorithm",
    text: "Just the posts from the sites you choose, newest first. Nothing is ranked, boosted or buried.",
  },
  {
    icon: BotOffIcon,
    title: "No AI that learns from you",
    text: "No AI agents, and nothing that learns from what you read or builds a profile of you.",
  },
  {
    icon: BookOpenIcon,
    title: "Calm reading",
    text: "Full articles in a clean reader, and filters for topics and words you'd rather skip.",
  },
];

/** What someone sees before they follow anything. */
export function Welcome({
  onDiscover,
  onSettings,
  onOpenMenu,
}: {
  onDiscover: () => void;
  onSettings: () => void;
  /** On phones the address box is inside the menu: this opens it. */
  onOpenMenu?: () => void;
}) {
  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="mx-auto flex max-w-xl flex-col gap-8 px-6 py-12 sm:py-16">
        <div className="flex flex-col gap-3">
          <Logo className="size-10" aria-hidden title="" />
          <h2 className="font-heading text-2xl font-semibold tracking-tight">Welcome to Driftpost</h2>
          <p className="text-muted-foreground">
            A calm reader for blogs and news sites, all in one list.
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
            {onOpenMenu ? (
              <>
                Or{" "}
                <button type="button" onClick={onOpenMenu} className="text-foreground underline underline-offset-4">
                  open the menu
                </button>{" "}
                and paste any website's address.
              </>
            ) : (
              "Or paste any website's address in the box at the top left."
            )}{" "}
            Coming from another reader?{" "}
            <button type="button" onClick={onSettings} className="text-foreground underline underline-offset-4">
              Import an OPML file or restore a Driftpost backup
            </button>{" "}
            in Configure.
          </p>
        </div>

        <p className="text-muted-foreground border-t pt-4 text-xs">
          Because everything lives in this browser, clearing your browsing data erases it too. Download a backup in
          Configure now and then to keep it safe.
        </p>
      </div>
    </ScrollArea>
  );
}
