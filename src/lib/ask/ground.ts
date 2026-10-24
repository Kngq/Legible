// Server side: what Kiro may answer from. For a source, collect its official
// quotes; if a passage was highlighted, find it word for word in the saved
// original (the booklet's law text, the saved bill, or the booklet quote) and add
// the text around it, so Kiro can tell who a rule applies to. A passage that is not
// found is never treated as official. Reads only Legible's own saved files.
import fs from "node:fs";
import path from "node:path";
import ballotData from "@/data/ballot-2026.json";
import civicData from "@/data/civic-ma.json";
import type { CivicItem } from "@/lib/engine/civic";
import type { DocumentData, Quote } from "@/lib/engine/types";
import { normalize } from "@/lib/verify/normalize";
import type { AskSource } from "./context";

const BALLOT = ballotData as unknown as DocumentData;
const CIVIC = civicData as unknown as CivicItem[];
const WINDOW = 700;

export interface Grounding {
  /** What the document is, so answers keep proposed and existing law apart. */
  status: string;
  title: string;
  url?: string;
  quotes: Quote[];
  /** The quote holding the highlighted words, when they were found. */
  passageQuoteId?: string;
  /** False when a passage was sent but is not in the official text. */
  passageFound: boolean;
}

const quote = (id: string, text: string, locator: string, page?: number): Quote => ({ id, text, locator, page, status: "verified" });

/** The text around the passage, on word boundaries, from normalized official text. */
export function around(official: string, passage: string, window = WINDOW): string | null {
  const text = normalize(official);
  const p = normalize(passage);
  const at = p ? text.indexOf(p) : -1;
  if (at < 0) return null;
  let start = Math.max(0, at - window);
  let end = Math.min(text.length, at + p.length + window);
  if (start > 0) start = text.indexOf(" ", start) + 1;
  if (end < text.length) end = Math.max(at + p.length, text.lastIndexOf(" ", end));
  return `${start > 0 ? "… " : ""}${text.slice(start, end).trim()}${end < text.length ? " …" : ""}`;
}

function readPublic(rel: string): unknown | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", rel), "utf8"));
  } catch {
    return null;
  }
}

export function ground(source: AskSource, passage?: string): Grounding | null {
  const p = passage?.trim() ? passage : undefined;

  if (source.kind === "ballot") {
    const m = BALLOT.measures.find((x) => x.id === source.id);
    if (!m) return null;
    const quotes: Quote[] = [...m.quotes];
    let passageQuoteId: string | undefined;
    if (p) {
      const hit = quotes.find((q) => normalize(q.text).includes(normalize(p)));
      if (hit) passageQuoteId = hit.id;
      else if (m.fullText) {
        const file = readPublic(m.fullText.pageText) as { label: string; pages: { page: number; text: string }[] } | null;
        for (const pg of file?.pages ?? []) {
          const ctx = around(pg.text, p);
          if (ctx) {
            passageQuoteId = `${m.id}-law-p${pg.page}`;
            quotes.push(quote(passageQuoteId, ctx, file!.label, pg.page));
            break;
          }
        }
      }
    }
    return {
      status:
        m.kind === "referendum"
          ? "a law already in effect, on the ballot as a referendum: a YES vote keeps it and a NO vote repeals it"
          : "a proposed law on the November 3, 2026 ballot: a YES vote would enact it and a NO vote would leave current law as it is",
      title: `Question ${m.number}: ${m.title}`,
      url: m.sourceUrl ?? BALLOT.source.url,
      quotes,
      passageQuoteId,
      passageFound: !p || Boolean(passageQuoteId),
    };
  }

  if (source.kind === "bill") {
    if (!/^[HS]\d+$/.test(source.id)) return null;
    const bill = readPublic(`official/bills/${source.id}.json`) as {
      title?: string;
      pinslip: string | null;
      text: string;
      history: { date: string; branch: string; action: string }[];
    } | null;
    if (!bill) return null;
    const item = CIVIC.find((i) => i.original?.file === `/official/bills/${source.id}.json`);
    const quotes: Quote[] = [];
    if (bill.pinslip) quotes.push(quote(`bill-${source.id}-description`, normalize(bill.pinslip), "Official description"));
    const last = bill.history[bill.history.length - 1];
    if (last) quotes.push(quote(`bill-${source.id}-latest`, `${last.date}, ${last.branch}: ${last.action}`, "Latest official action"));
    const ctx = p ? around(bill.text, p) : null;
    quotes.push(quote(`bill-${source.id}-text`, ctx ?? normalize(bill.text).slice(0, 2400), "Bill text"));
    return {
      status: "a bill in the Massachusetts Legislature. It is not law; it would need to pass both chambers and be signed",
      title: `Bill ${source.id}${bill.title ? `: ${bill.title.trim()}` : ""}`,
      url: item?.source.url ?? `https://malegislature.gov/Bills/194/${source.id}`,
      quotes,
      passageQuoteId: ctx ? `bill-${source.id}-text` : undefined,
      passageFound: !p || Boolean(ctx),
    };
  }

  const item = CIVIC.find((i) => i.id === source.id);
  if (!item?.original?.text) return null;
  const q = quote(`${item.id}-official`, item.original.text, item.original.label);
  const found = !p || normalize(item.original.text).includes(normalize(p));
  return {
    status: "an official election date or deadline, stated in the state's voter booklet",
    title: item.title,
    url: item.source.url,
    quotes: [q],
    passageQuoteId: p && found ? q.id : undefined,
    passageFound: found,
  };
}
