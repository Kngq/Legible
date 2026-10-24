// Plain wording for Home's update cards: what kind of thing it is, when, and why
// it is shown to this person. Dates are Boston time. Pure TypeScript.
import { FACT_DEFS, TOPIC_DEFS } from "@/lib/vocab";
import type { CivicCard, CivicKind } from "./civic";

const TZ = "America/New_York";

/** "Proposed bill" makes the status plain; nothing on Home is labeled approved unless it is. */
export const KIND_LABEL: Record<CivicKind, string> = {
  deadline: "Deadline",
  window: "Voting",
  election: "Election",
  meeting: "Public meeting",
  bill: "Proposed bill",
};

function parts(iso: string) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }).formatToParts(new Date(iso));
  const get = (t: string) => f.find((p) => p.type === t)?.value ?? "";
  return { month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), period: get("dayPeriod") };
}

/** "5 PM", "11:59 PM", "7 AM". */
function time(iso: string): string {
  const p = parts(iso);
  return `${p.hour}${p.minute === "00" ? "" : `:${p.minute}`} ${p.period}`;
}

/** "October 27 · 5 PM", "October 17–30", "No vote scheduled yet". */
export function friendlyWhen(c: CivicCard): string {
  const i = c.item;
  if (!i.at) return i.kind === "bill" ? "No vote scheduled yet" : "Date not set";
  const a = parts(i.at);
  if (i.until) {
    const b = parts(i.until);
    return a.month === b.month ? `${a.month} ${a.day}–${b.day}` : `${a.month} ${a.day} – ${b.month} ${b.day}`;
  }
  return `${a.month} ${a.day} · ${time(i.at)}`;
}

/** Why a card is shown to this person, or null when it is shown to everyone. */
export function whyLine(c: CivicCard): string | null {
  if (c.because.length) {
    const why = c.because.map((b) => (b.value ? FACT_DEFS[b.fact].because.yes : FACT_DEFS[b.fact].because.no));
    return `You told us ${why.join(" and ")}.`;
  }
  if (c.onYourList) {
    const t = c.item.topics.find(Boolean);
    return t ? `You follow ${TOPIC_DEFS[t].label.toLowerCase()}.` : null;
  }
  return null;
}
