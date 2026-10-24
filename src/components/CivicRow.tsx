// A civic item as a reading-list row: a date tile, the title, who and when, and tags.
// Used in the feed and in "Related" sections.
import type { CivicCard } from "@/lib/engine/civic";
import { civicMeta, monthDay, timingTag } from "@/lib/engine/civic-copy";
import { Part } from "./icons";
import { FOCUS, Tag } from "./ui";

const KIND_PART = { deadline: "ballot", window: "ballot_box", election: "ballot_box", meeting: "town_hall", bill: "book" } as const;

/** Calendar tile for dated items, a pictogram tile for bills. */
export function CivicTile({ card, size = 56 }: { card: CivicCard; size?: number }) {
  const at = card.item.at;
  const small = size < 40;
  if (!at || small) {
    return (
      <span aria-hidden="true" className="flex shrink-0 items-center justify-center rounded-md bg-info text-info-foreground" style={{ width: size, height: size }}>
        <Part name={KIND_PART[card.item.kind]} size={Math.round(size * 0.55)} />
      </span>
    );
  }
  const { month, day } = monthDay(at);
  return (
    <span aria-hidden="true" className="flex shrink-0 flex-col items-center justify-center rounded-md bg-surface leading-none shadow-card" style={{ width: size, height: size }}>
      <span className="text-small font-semibold uppercase text-muted-foreground">{month}</span>
      <span className="mt-0.5 text-title">{day}</span>
    </span>
  );
}

export function CivicRow({ card, onOpen }: { card: CivicCard; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className={`flex w-full gap-4 rounded-md py-4 text-left hover:bg-surface-muted/60 ${FOCUS}`}>
      <CivicTile card={card} />
      <span className="min-w-0 flex-1 space-y-1">
        <span className="line-clamp-2 block text-body font-semibold">{card.item.title}</span>
        <span className="block text-small text-muted-foreground">{civicMeta(card)}</span>
        <span className="flex flex-wrap items-center gap-2 pt-1">
          {card.relevance === "touches" && <Tag pop="accent">Touches you</Tag>}
          {card.onYourList && <Tag>On your list</Tag>}
          <Tag pop={card.timing === "today" || card.timing === "open" ? "attention" : "muted"}>{timingTag(card)}</Tag>
        </span>
      </span>
    </button>
  );
}
