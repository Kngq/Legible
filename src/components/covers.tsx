// Pictures for decisions without stock photos: the subject's line pictogram on a
// flat token fill, with a dot pattern. Colour follows the subject, never a side.
import type { DocType, Measure } from "@/lib/engine/types";
import { TOPIC_DEFS, type TopicId } from "@/lib/vocab";
import { Part } from "./icons";

type Fill = "accent" | "info" | "attention" | "positive";

const FILL_CLASS: Record<Fill, string> = {
  accent: "bg-accent",
  info: "bg-info",
  attention: "bg-attention",
  positive: "bg-positive",
};

const TOPIC_FILL: Record<TopicId, Fill> = {
  housing_costs: "attention",
  local_control: "attention",
  roads_transit: "attention",
  open_space: "positive",
  schools: "positive",
  voting_access: "info",
  elections: "info",
  government_transparency: "info",
  taxes: "accent",
  labor: "accent",
  criminal_justice: "accent",
  cannabis_policy: "positive",
  gun_policy: "info",
  public_safety: "info",
};

export function coverFill(m: Measure): Fill {
  return m.topics[0] ? TOPIC_FILL[m.topics[0]] : "accent";
}

/** A measure's cover. `size` sets the pictogram; the box fills its parent. */
export function Cover({ measure, label, size = 64, className = "" }: { measure: Measure; label?: string; size?: number; className?: string }) {
  const topic = measure.topics[0];
  return (
    <div className={`relative overflow-hidden text-on-strong ${FILL_CLASS[coverFill(measure)]} ${className}`} aria-hidden="true">
      <svg className="absolute inset-0 h-full w-full opacity-25" preserveAspectRatio="xMidYMid slice" viewBox="0 0 200 120">
        {Array.from({ length: 9 }, (_, r) =>
          Array.from({ length: 16 }, (_, c) => <circle key={`${r}-${c}`} cx={8 + c * 13} cy={8 + r * 13} r={1.3} fill="currentColor" />),
        )}
      </svg>
      <div className="absolute right-[-6%] bottom-[-14%] opacity-90">
        {topic && <Part name={TOPIC_DEFS[topic].avatarPart} size={size * 2.2} strokeWidth={0.9} />}
      </div>
      {label && <span className="absolute left-4 top-3 text-title">{label}</span>}
    </div>
  );
}

const DOC_PART: Record<DocType, string> = {
  ballot: "ballot",
  warrant: "town_hall",
  budget: "coin",
  hearing: "podium",
  agenda: "book",
  other: "book",
};

/** Square tile for a document, like a publication's logo in a reading list. */
export function DocTile({ docType, size = 56 }: { docType: DocType; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"
      style={{ width: size, height: size }}
    >
      <Part name={DOC_PART[docType]} size={Math.round(size * 0.55)} />
    </span>
  );
}
