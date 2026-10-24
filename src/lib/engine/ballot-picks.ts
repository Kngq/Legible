// The ballot as For you's main content: every question, the ones that reach the
// person first, each with one reason it is there. The same reason opens the
// question's page, so the page reads as the recommendation continued. Built on
// buildCards (which answers touch a question, which subjects are on the list);
// nothing here adds a match. Pure TypeScript; runs in the browser.
import { appliesIf } from "./timeline";
import { canAskInCard, type Profile } from "./profile";
import type { FeedItem } from "./feed";
import type { Card } from "./types";
import { questionBecause } from "./update-copy";

/**
 * Why a question is where it is:
 * - direct: an answer in the profile matches one of its rules ("Touches you");
 * - interest: it is on a subject the person follows, and no answer matches;
 * - open: one unanswered question decides whether it reaches them;
 * - everyone: it applies to every voter, and nothing in the profile narrows it;
 * - none: nothing in the profile points to it.
 */
export type BallotReasonKind = "direct" | "interest" | "open" | "everyone" | "none";

export interface BallotReason {
  kind: BallotReasonKind;
  /** The short label: "Touches you", "On your list". */
  label: string;
  /** One sentence, from the profile's own words: "Because you rent." */
  text: string;
}

export const REASON_LABEL: Record<BallotReasonKind, string> = {
  direct: "Touches you",
  interest: "On your list",
  open: "May apply to you",
  everyone: "Applies to every voter",
  none: "Not matched to your answers",
};

/** A question is put forward when an answer touches it or it is on the person's list. */
export const isRecommended = (r: BallotReason) => r.kind === "direct" || r.kind === "interest";

export function ballotReason(card: Card, profile: Profile): BallotReason {
  const because = questionBecause(card);
  if (card.relevance === "touches" && because) return { kind: "direct", label: REASON_LABEL.direct, text: `${because}.` };
  if (card.onYourList && because) return { kind: "interest", label: REASON_LABEL.interest, text: `${because}.` };
  // Only facts the card may still ask (never one already answered or declined twice).
  const askable = new Set(card.pendingQuestions.filter((f) => canAskInCard(profile, f)));
  const open = card.measure.rules.filter((r) => askable.has(r.fact)).map((r) => ({ fact: r.fact, when: r.when ?? true }));
  if (open.length) return { kind: "open", label: REASON_LABEL.open, text: `${appliesIf(open)}.` };
  if (card.relevance === "everyone") return { kind: "everyone", label: REASON_LABEL.everyone, text: "It applies to everyone in Massachusetts. Nothing in your answers points to it directly." };
  return { kind: "none", label: REASON_LABEL.none, text: "Nothing in your answers points to this question." };
}

export interface BallotPick {
  card: Card;
  reason: BallotReason;
}

const facts = (c: Card) => c.because.filter((b) => b.kind === "fact").length;

/**
 * For you's ballot: `recommended` holds the questions an answer touches, then the
 * ones on the person's list, in buildCards order with two tie-breaks (a question
 * both touching and on the list first, then the one more answers match). `others`
 * holds the rest in ballot order, so all nine are always one tap away. Nothing is
 * pinned: with no profile, nothing is recommended.
 */
export function ballotPicks(item: FeedItem, profile: Profile): { recommended: BallotPick[]; others: BallotPick[] } {
  const picks = item.cards.map((card, i) => ({ card, reason: ballotReason(card, profile), i }));
  const recommended = picks
    .filter((p) => isRecommended(p.reason))
    .sort(
      (a, b) =>
        Number(b.reason.kind === "direct") - Number(a.reason.kind === "direct") ||
        Number(b.card.onYourList) - Number(a.card.onYourList) ||
        facts(b.card) - facts(a.card) ||
        a.i - b.i,
    );
  const others = picks.filter((p) => !isRecommended(p.reason)).sort((a, b) => Number(a.card.measure.number) - Number(b.card.measure.number));
  const strip = ({ card, reason }: (typeof picks)[number]) => ({ card, reason });
  return { recommended: recommended.map(strip), others: others.map(strip) };
}

/** The upcoming ballot in the feed, if there is one. */
export function upcomingBallot(items: FeedItem[]): FeedItem | undefined {
  return items.find((i) => i.doc.docType === "ballot" && i.status === "upcoming");
}

/** The next recommended question after this one, for "Next for you" at the end of a page. */
export function nextPick(item: FeedItem, profile: Profile, measureId: string): BallotPick | undefined {
  const { recommended, others } = ballotPicks(item, profile);
  const list = [...recommended, ...others];
  const at = list.findIndex((p) => p.card.measure.id === measureId);
  return at >= 0 ? list[at + 1] : undefined;
}
