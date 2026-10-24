import { describe, expect, it } from "vitest";
import { locateQuote, normalize } from "./normalize";

describe("normalize", () => {
  it("collapses whitespace and straightens quotes and dashes", () => {
    expect(normalize("a  “quoted”\n\tword – here")).toBe('a "quoted" word - here');
  });
  it("joins words hyphenated across line breaks", () => {
    expect(normalize("govern-\nment")).toBe("government");
  });
});

describe("locateQuote", () => {
  const pages = ["Page one text.", "The pro-\nposed law would take\neffect on January 1, 2028."];
  it("finds an exact match on the stated page", () => {
    expect(locateQuote("Page one text.", pages, 1)).toEqual({ page: 1, index: 0 });
  });
  it("tolerates whitespace and hyphenation differences", () => {
    const found = locateQuote("The proposed law would take effect on January 1, 2028.", pages, 2);
    expect(found?.page).toBe(2);
  });
  it("corrects a wrong stated page", () => {
    expect(locateQuote("Page one text.", pages, 2)?.page).toBe(1);
  });
  it("fails a paraphrase", () => {
    expect(locateQuote("The law takes effect in 2028.", pages, 2)).toBeNull();
  });
});
