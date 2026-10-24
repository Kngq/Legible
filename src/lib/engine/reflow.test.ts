import { describe, expect, it } from "vitest";
import { reflow } from "./reflow";

describe("reflow", () => {
  it("drops running headers and joins broken lines", () => {
    const page = "39 \nFull Texts (continued)\nQUESTION 4: Full Text of Proposed Law (continued)\nvoting; am not temporarily or \npermanently disqualified.\n(b) For purposes of this section, the term \nmeans one of the following:";
    expect(reflow(page)).toEqual(["voting; am not temporarily or permanently disqualified.", "(b) For purposes of this section, the term means one of the following:"]);
  });

  it("starts a paragraph at each SECTION and keeps every word", () => {
    const page = "SECTION 1. Chapter 69 is amended:-\nSection 40. (a) For the purposes\nof this section.\nSECTION 2. This act takes effect.";
    const out = reflow(page);
    expect(out[0]).toBe("SECTION 1. Chapter 69 is amended:-");
    expect(out.at(-1)).toBe("SECTION 2. This act takes effect.");
    const words = (s: string) => s.split(/\s+/).filter(Boolean);
    expect(words(out.join(" "))).toEqual(words(page));
  });

  it("rejoins words hyphenated across a line break", () => {
    expect(reflow("self-\ncriticism and well-\nBeing")).toEqual(["self-criticism and well- Being"]);
  });
});
