// Hash routes for every screen, so each one has a link and the browser back
// button works. Routes carry only public ids, never the town or a life fact.
export type Route =
  | { kind: "feed" }
  | { kind: "explore" }
  | { kind: "doc"; docId: string }
  | { kind: "measure"; docId: string; measureId: string }
  | { kind: "item"; itemId: string }
  | { kind: "stories"; over: StoriesOver } // Ballot stories, over the page that opened them
  | { kind: "garden" }; // The plant's garden: watering and growth

/** The page Ballot stories play over, and return to when they close. */
export type StoriesOver = "feed" | "explore";

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  if (parts[0] === "explore" && parts[1] === "stories") return { kind: "stories", over: "explore" };
  if (parts[0] === "explore") return { kind: "explore" };
  if (parts[0] === "garden") return { kind: "garden" };
  // "#/wrapped" is the story's first address; links to it still open the stories.
  if (parts[0] === "stories" || parts[0] === "wrapped") return { kind: "stories", over: "feed" };
  if (parts[0] === "doc" && parts[1]) return { kind: "doc", docId: parts[1] };
  if (parts[0] === "measure" && parts[1] && parts[2]) return { kind: "measure", docId: parts[1], measureId: parts[2] };
  if (parts[0] === "item" && parts[1]) return { kind: "item", itemId: parts[1] };
  return { kind: "feed" };
}

export function routeHash(r: Route): string {
  const e = encodeURIComponent;
  if (r.kind === "explore") return "#/explore";
  if (r.kind === "garden") return "#/garden";
  if (r.kind === "stories") return r.over === "explore" ? "#/explore/stories" : "#/stories";
  if (r.kind === "doc") return `#/doc/${e(r.docId)}`;
  if (r.kind === "measure") return `#/measure/${e(r.docId)}/${e(r.measureId)}`;
  if (r.kind === "item") return `#/item/${e(r.itemId)}`;
  return "#/";
}

/** The screen under a route: Ballot stories keep the page they play over. */
export function screenRoute(r: Route): Route {
  return r.kind === "stories" ? { kind: r.over } : r;
}

/** Where the in-page back button goes when there is no in-app history (a pasted link). */
export function parentRoute(r: Route): Route {
  return r.kind === "measure" ? { kind: "doc", docId: r.docId } : { kind: "feed" };
}
