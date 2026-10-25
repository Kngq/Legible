import { describe, expect, it } from "vitest";
import { parentRoute, parseRoute, routeHash, screenRoute, type Route } from "./route";

describe("routes", () => {
  it("round-trips every screen", () => {
    const routes: Route[] = [
      { kind: "feed" },
      { kind: "explore" },
      { kind: "doc", docId: "ballot-2026" },
      { kind: "measure", docId: "ballot-2026", measureId: "ballot-2026-q7" },
      { kind: "item", itemId: "cam-council-2026-11-02" },
      { kind: "stories", over: "feed" },
      { kind: "stories", over: "explore" },
      { kind: "garden" },
    ];
    for (const r of routes) expect(parseRoute(routeHash(r))).toEqual(r);
  });

  it("falls back to the feed on anything unknown", () => {
    for (const h of ["", "#", "#/", "#/nope", "#/doc", "#/measure/x"]) expect(parseRoute(h)).toEqual({ kind: "feed" });
  });

  it("opens Ballot stories over the page that asked for them", () => {
    expect(routeHash({ kind: "stories", over: "explore" })).toBe("#/explore/stories");
    expect(routeHash({ kind: "stories", over: "feed" })).toBe("#/stories");
    // The first address of the story still opens it, over For you.
    expect(parseRoute("#/wrapped")).toEqual({ kind: "stories", over: "feed" });
    expect(screenRoute({ kind: "stories", over: "explore" })).toEqual({ kind: "explore" });
    expect(screenRoute({ kind: "stories", over: "feed" })).toEqual({ kind: "feed" });
    expect(screenRoute({ kind: "explore" })).toEqual({ kind: "explore" });
  });

  it("goes up one level from a pasted link", () => {
    expect(parentRoute({ kind: "measure", docId: "d", measureId: "m" })).toEqual({ kind: "doc", docId: "d" });
    expect(parentRoute({ kind: "item", itemId: "i" })).toEqual({ kind: "feed" });
    expect(parentRoute({ kind: "garden" })).toEqual({ kind: "feed" });
  });
});
