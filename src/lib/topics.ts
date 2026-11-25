// Works out a post's topic from clues the feed already gives: its tags (categories)
// and the words in its link (theguardian.com/sport/…). No guessing from the text yet,
// so posts without these clues have no topic.

import type { Item } from "./db";

interface Topic {
  label: string;
  /** Tag words that mean this topic. Matched as whole words, any case. */
  tags: string[];
  /** Link path segments that mean this topic, e.g. "sport" in /sport/2026/… */
  paths: string[];
}

export const TOPICS = {
  sport: {
    label: "Sport",
    tags: [
      "sport", "sports", "football", "soccer", "afl", "aflw", "nrl", "nrlw", "a-league", "cricket", "tennis", "golf",
      "rugby", "rugby union", "rugby league", "basketball", "nba", "nbl", "nfl", "mlb", "nhl", "baseball", "hockey",
      "formula 1", "formula one", "f1", "motorsport", "motor racing", "supercars", "motogp", "olympics", "olympic games",
      "paralympics", "commonwealth games", "cycling", "tour de france", "boxing", "ufc", "mma", "athletics", "swimming",
      "horse racing", "netball", "premier league", "champions league", "world cup", "matildas", "socceroos", "wimbledon",
      "australian open", "the ashes", "super rugby", "state of origin", "grand prix",
    ],
    paths: [
      "sport", "sports", "football", "soccer", "afl", "nrl", "cricket", "tennis", "golf", "rugby", "rugby-union",
      "rugby-league", "basketball", "nba", "nfl", "motorsport", "formulaone", "formula-one", "f1", "olympics",
      "cycling", "boxing", "athletics", "horse-racing", "netball",
    ],
  },
  politics: {
    label: "Politics",
    tags: ["politics", "australian politics", "us politics", "uk politics", "elections", "election", "government", "parliament", "congress", "senate"],
    paths: ["politics", "elections", "election"],
  },
  business: {
    label: "Business",
    tags: ["business", "economy", "economics", "markets", "finance", "money", "stock market", "investing", "banking"],
    paths: ["business", "economy", "markets", "money", "finance"],
  },
  entertainment: {
    label: "Entertainment",
    tags: ["entertainment", "culture", "film", "movies", "television", "tv", "tv & radio", "music", "celebrity", "gaming", "games", "books", "stage"],
    paths: ["entertainment", "culture", "film", "movies", "tv", "tv-and-radio", "music", "celebrity", "games", "books", "stage"],
  },
  technology: {
    label: "Technology",
    tags: ["technology", "tech", "gadgets", "ai", "artificial intelligence", "software", "apple", "google", "microsoft", "cybersecurity"],
    paths: ["technology", "tech", "gadgets"],
  },
  science: {
    label: "Science & health",
    tags: ["science", "space", "environment", "climate", "climate crisis", "health", "medicine", "biology", "physics"],
    paths: ["science", "space", "environment", "climate", "health"],
  },
} satisfies Record<string, Topic>;

export type TopicId = keyof typeof TOPICS;
export const TOPIC_IDS = Object.keys(TOPICS) as TopicId[];

function normalise(s: string): string {
  return s.toLowerCase().replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

// Tag lookups: exact tag text, plus each word of a tag ("Football – Premier League" → "football").
const tagIndex = new Map<string, TopicId>();
const pathIndex = new Map<string, TopicId>();
for (const id of TOPIC_IDS) {
  for (const t of TOPICS[id].tags) if (!tagIndex.has(t)) tagIndex.set(t, id);
  for (const p of TOPICS[id].paths) if (!pathIndex.has(p)) pathIndex.set(p, id);
}

/**
 * Topics for one tag, e.g. "AFL" → sport. Checks the whole tag, then each part of a
 * "Sport/Cricket"-style tag, then a part's last word, which is what the tag is about:
 * "Women's cricket" → cricket, "Victorian politics" → politics. Earlier words only
 * describe it, so "Science fiction TV" is TV (entertainment), not science.
 */
function topicsForTag(tag: string): TopicId[] {
  const t = normalise(tag).replace(/\s*\([^)]*\)/g, ""); // "AI (artificial intelligence)" → "ai"
  const exact = tagIndex.get(t);
  if (exact) return [exact];
  const found = new Set<TopicId>();
  for (const part of t.split(/\s*[/|:–—]\s*/).filter(Boolean)) {
    const hit = tagIndex.get(part) ?? tagIndex.get(part.split(" ").at(-1)!);
    if (hit) found.add(hit);
  }
  return [...found];
}

/** The topics of a post: from its tags first, then from its link's path. */
export function detectTopics(item: Pick<Item, "categories" | "link">): TopicId[] {
  const found = new Set<TopicId>();
  for (const tag of item.categories ?? []) topicsForTag(tag).forEach((t) => found.add(t));

  if (item.link) {
    try {
      for (const segment of new URL(item.link).pathname.toLowerCase().split("/")) {
        const hit = pathIndex.get(segment);
        if (hit) found.add(hit);
      }
    } catch {
      // not a valid link: tags only
    }
  }
  return [...found];
}
