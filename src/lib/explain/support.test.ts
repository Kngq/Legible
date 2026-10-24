import { describe, expect, it } from "vitest";
import { BANNED_WORDS } from "@/lib/vocab";
import { applySupport, claimsOf, SUPPORT_SYSTEM, supportPrompt, type Judgment } from "./support";
import type { ExplainerDraft } from "./types";

const draft: ExplainerDraft = {
  author: "model",
  quotes: [
    { id: "duplex", text: "Cities shall allow duplexes on residential lots." },
    { id: "start", text: "This act shall take effect one year after passage." },
  ],
  proposes: [{ text: "Cities would have to allow duplexes.", quote: "duplex" }],
  changes: [{ heading: "Homes", lines: [{ text: "Every city would have to allow triplexes.", quote: "duplex" }, { text: "Duplexes could go on residential lots.", quote: "duplex" }] }],
  affects: [],
  personal: [{ fact: "rents", when: true, effect: "possible", lines: [{ text: "More duplexes could be allowed near you.", quote: "duplex" }], notStated: { text: "It does not mention tenants or rent.", terms: ["tenant"] } }],
  takesEffect: [{ label: "1 year", line: { text: "It would start a year later.", quote: "start" } }],
  versionNotes: [{ text: "The House passed a different version.", action: "House insisted on its amendment" }],
};
const history = [{ date: "2026-05-20", branch: "House", action: "House insisted on its amendment" }];

describe("claimsOf", () => {
  it("pairs every line, note, and version note with its evidence", () => {
    const c = claimsOf(draft, history);
    expect(c.map((x) => [x.key, x.kind])).toEqual([
      ["proposes.0", "line"],
      ["changes.0.0", "line"],
      ["changes.0.1", "line"],
      ["personal.0.0", "possible"],
      ["personal.0.notStated", "notStated"],
      ["takesEffect.0", "line"],
      ["versionNotes.0", "versionNote"],
    ]);
    expect(c[0].evidence).toBe("Cities shall allow duplexes on residential lots.");
    expect(c[4].evidence).toContain('"tenant"');
    expect(c[6].evidence).toContain("2026-05-20, House: House insisted on its amendment");
  });

  it("builds a prompt with each key, and rules that name the banned words", () => {
    const p = supportPrompt("S1", claimsOf(draft, history));
    expect(p).toContain('<claim key="changes.0.0" kind="line">');
    for (const w of BANNED_WORDS) expect(SUPPORT_SYSTEM).toContain(w);
  });
});

describe("applySupport", () => {
  const ok = (key: string): Judgment => ({ key, verdict: "backed", reason: "Stated." });

  it("keeps supported claims and removes partly, unsupported, and unchecked ones", () => {
    const judgments: Judgment[] = [
      ok("proposes.0"),
      { key: "changes.0.0", verdict: "partly", reason: "Adds triplexes and every city." },
      ok("changes.0.1"),
      ok("personal.0.0"),
      { key: "personal.0.notStated", verdict: "partly", reason: "Rent is not a searched word." },
      ok("versionNotes.0"),
      // takesEffect.0 was never judged.
    ];
    const { draft: d, removed } = applySupport(draft, judgments);
    expect(d.proposes).toHaveLength(1);
    expect(d.changes[0].lines.map((l) => l.text)).toEqual(["Duplexes could go on residential lots."]);
    expect(d.personal[0].lines).toHaveLength(1);
    expect(d.personal[0].notStated).toBeUndefined();
    expect(d.takesEffect).toEqual([]);
    expect(d.versionNotes).toHaveLength(1);
    expect(removed.map((r) => r.key)).toEqual(["changes.0.0", "personal.0.notStated", "takesEffect.0"]);
  });

  it("drops a change group and a personal rule left with no lines", () => {
    const { draft: d } = applySupport(draft, [ok("proposes.0")]);
    expect(d.changes).toEqual([]);
    expect(d.personal).toEqual([]);
  });
});
