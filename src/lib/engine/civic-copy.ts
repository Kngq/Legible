// Wording for civic items: when, and how soon, stated as facts in Boston time.
import type { CivicCard, CivicKind } from "./civic";

export const CIVIC_KIND_LABEL: Record<CivicKind, string> = {
  deadline: "Deadline",
  window: "Voting window",
  election: "Election",
  meeting: "Meeting",
  bill: "Bill",
};

const TZ = "America/New_York";

/** "Mon, Oct 26, 5:30 PM" in Boston time. */
export function dateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

/** "Oct 26" in Boston time. */
export function monthDay(iso: string): { month: string; day: string } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric" }).formatToParts(new Date(iso));
  return { month: parts.find((p) => p.type === "month")!.value, day: parts.find((p) => p.type === "day")!.value };
}

/** Short timing tag: "Today", "Open, closes in 3 days", "In 2 days", or the bill status. */
export function timingTag(c: CivicCard): string {
  if (c.timing === "today") return "Today";
  if (c.timing === "open") return c.days === 0 ? "Open, closes today" : `Open, closes in ${c.days} ${c.days === 1 ? "day" : "days"}`;
  if (c.timing === "upcoming") return c.days === 1 ? "Tomorrow" : `In ${c.days} days`;
  if (c.timing === "past") return "Past";
  return c.item.status ?? "In the Legislature";
}

/** One meta line under the title: who, and when or status. */
export function civicMeta(c: CivicCard): string {
  const i = c.item;
  if (!i.at) return [i.body, i.lastAction && `latest action ${i.lastAction.date}`].filter(Boolean).join(" · ");
  const when = i.until && c.timing === "open" ? `until ${dateTime(i.until)}` : dateTime(i.at);
  return `${i.body} · ${when}`;
}
