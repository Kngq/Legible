// Feed copy for deadlines. States who decides and when, as a fact; never urgency.
import { daysBetween } from "./feed";
import type { DecideBy, DocType } from "./types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-11-03" -> "Nov 3" */
export function shortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

/** "Voters decide", "Town Meeting votes", "Comments close" */
export function verb(d: DecideBy): string {
  if (d.how === "comment") return "Comments close";
  // "Voters decide", but "Town Meeting votes": a body votes, people decide.
  return d.how === "vote" ? `${d.who} decide` : `${d.who} votes`;
}

/** "Voters decide Nov 3", "Town Meeting votes May 4", "Comments close Feb 10" */
export function decideByLine(d: DecideBy): string {
  return `${verb(d)} ${shortDate(d.date)}`;
}

/** "Voters decide in 10 days", "... tomorrow", "... today" */
export function decideByRelative(d: DecideBy, today: string): string {
  const n = daysBetween(today, d.date);
  const when = n <= 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`;
  return `${verb(d)} ${when}`;
}

/** "Decided May 4" */
export function decidedLine(d: DecideBy): string {
  return `Decided ${shortDate(d.date)}`;
}

export const DOC_TYPE_LABEL: Record<DocType, string> = {
  ballot: "Ballot",
  warrant: "Warrant",
  budget: "Budget",
  hearing: "Hearing",
  agenda: "Agenda",
  other: "Document",
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2026-11-03" -> "Tuesday, November 3" */
export function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}, ${MONTHS_LONG[m - 1]} ${d}`;
}

/** What one measure is called in this kind of document. */
export function measureNoun(t: DocType, n: number): string {
  const one = t === "ballot" ? "question" : t === "warrant" ? "article" : "item";
  return n === 1 ? one : `${one}s`;
}
