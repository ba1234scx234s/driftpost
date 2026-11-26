import { EyeOffIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Item } from "@/lib/db";
import { hideTag, setTopicHidden, unhideTag } from "@/lib/settings";
import { detectTopics, TOPICS, type TopicId } from "@/lib/topics";

/**
 * The post's topic (filled) and the feed's tags (outlined). Hover shows a hide icon;
 * click opens a small menu to hide every post with that topic or tag.
 */
export function PostTags({ item }: { item: Item }) {
  const topics = detectTopics(item);
  // Skip tags that just repeat a topic badge ("Sport" next to Sport).
  const topicLabels = new Set(topics.map((t) => TOPICS[t].label.toLowerCase()));
  const tags = (item.categories ?? []).filter((tag) => !topicLabels.has(tag.toLowerCase()));
  if (!topics.length && !tags.length) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="Tags">
      {topics.map((t) => (
        <HideMenu
          key={t}
          label={TOPICS[t].label}
          kind="topic"
          description="Topic, worked out from the tags and link"
          onHide={() => hideTopic(t)}
        />
      ))}
      {tags.map((tag) => (
        <HideMenu key={tag} label={tag} kind="tag" onHide={() => hideOneTag(tag)} />
      ))}
    </div>
  );
}

function HideMenu(props: {
  label: string;
  kind: "topic" | "tag";
  description?: string;
  onHide: () => void;
}) {
  const isTopic = props.kind === "topic";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Badge
          asChild
          variant={isTopic ? "default" : "outline"}
          className={
            isTopic
              ? "group cursor-pointer rounded-[0.25rem] px-1.5"
              : "text-muted-foreground hover:text-foreground group cursor-pointer font-normal"
          }
        >
          <button type="button" title={props.description} aria-label={`${props.label}: hide options`}>
            {props.label}
            {/* Appears on hover and when the menu is open: a hint that clicking can hide it. */}
            <EyeOffIcon
              aria-hidden
              className="hidden opacity-70 group-hover:inline-block group-focus-visible:inline-block group-data-[state=open]:inline-block"
            />
          </button>
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
          {isTopic ? "Topic" : "Tag from the feed"}
        </DropdownMenuLabel>
        <DropdownMenuItem onSelect={props.onHide}>
          <EyeOffIcon />
          <span className="truncate">
            {isTopic ? `Hide all ${props.label} posts` : `Hide posts tagged “${props.label}”`}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

async function hideTopic(topic: TopicId) {
  await setTopicHidden(topic, true);
  toast.success(`Hiding ${TOPICS[topic].label} posts`, {
    description: "Change this any time in Settings → Filters.",
    action: { label: "Undo", onClick: () => void setTopicHidden(topic, false) },
    duration: 8000,
  });
}

async function hideOneTag(tag: string) {
  const added = await hideTag(tag);
  if (!added) {
    toast(`Posts tagged “${tag}” are already hidden`);
    return;
  }
  toast.success(`Hiding posts tagged “${tag}”`, {
    description: "Change this any time in Settings → Filters.",
    action: { label: "Undo", onClick: () => void unhideTag(tag) },
    duration: 8000,
  });
}
