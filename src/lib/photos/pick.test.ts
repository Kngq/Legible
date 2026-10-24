import { describe, expect, it } from "vitest";
import ballot from "@/data/ballot-2026.json";
import civicData from "@/data/civic-ma.json";
import type { CivicItem } from "@/lib/engine/civic";
import type { DocumentData } from "@/lib/engine/types";
import { altText, isFresh, isLandscape, photoTargets, pickLandscape, SEARCH_TTL_MS, storagePath, type PixabayHit } from "./pick";

const hit = (over: Partial<PixabayHit>): PixabayHit => ({
  id: 1,
  pageURL: "https://pixabay.com/photos/x-1/",
  tags: "ballot, box, vote",
  largeImageURL: "https://pixabay.com/get/abc_1280.jpg",
  imageWidth: 4000,
  imageHeight: 2600,
  user: "someone",
  ...over,
});

describe("photoTargets", () => {
  const targets = photoTargets(civicData as unknown as CivicItem[], [ballot as unknown as DocumentData]);

  it("covers every item with keys that match timeline entries", () => {
    expect(targets).toHaveLength(civicData.length + 1);
    expect(targets[0].key).toBe(`d:${ballot.id}`);
    expect(targets.every((t) => /^[cd]:/.test(t.key))).toBe(true);
    expect(new Set(targets.map((t) => t.key)).size).toBe(targets.length);
  });

  it("never searches an item's title or town", () => {
    for (const t of targets) {
      expect(civicData.some((i) => t.query.includes(i.title))).toBe(false);
      expect(civicData.some((i) => i.place.kind === "town" && t.query.includes(i.place.name))).toBe(false);
    }
  });
});

describe("pickLandscape", () => {
  it("skips portrait, small, and side-taking results", () => {
    const hits = [
      hit({ id: 1, imageWidth: 2000, imageHeight: 3000 }),
      hit({ id: 2, imageWidth: 640, imageHeight: 400 }),
      hit({ id: 3, tags: "election, protest, crowd" }),
      hit({ id: 4 }),
    ];
    expect(pickLandscape(hits, new Set())?.id).toBe(4);
  });

  it("prefers a photo no other item uses, then reuses one", () => {
    const hits = [hit({ id: 1 }), hit({ id: 2 })];
    expect(pickLandscape(hits, new Set([1]))?.id).toBe(2);
    expect(pickLandscape(hits, new Set([1, 2]))?.id).toBe(1);
  });

  it("returns null when nothing fits", () => {
    expect(pickLandscape([], new Set())).toBeNull();
    expect(pickLandscape([hit({ imageWidth: 1000, imageHeight: 1000 })], new Set())).toBeNull();
  });
});

describe("helpers", () => {
  it("isLandscape needs width and ratio", () => {
    expect(isLandscape({ imageWidth: 1920, imageHeight: 1080 })).toBe(true);
    expect(isLandscape({ imageWidth: 1600, imageHeight: 1400 })).toBe(false);
  });

  it("alt text names it a stock photo", () => {
    expect(altText({ tags: "State House, Boston, dome, gold, sky" })).toBe("Stock photo: state house, boston, dome, gold");
    expect(altText({ tags: "" })).toBe("Stock photo");
  });

  it("storage path holds only the Pixabay id", () => {
    expect(storagePath(hit({ id: 42 }))).toBe("pixabay/42.jpg");
    expect(storagePath(hit({ id: 7, largeImageURL: "https://x/y_1280.png" }))).toBe("pixabay/7.png");
  });

  it("search cache stays fresh for 24 hours", () => {
    const now = Date.parse("2026-10-24T12:00:00Z");
    expect(isFresh(new Date(now - SEARCH_TTL_MS + 1000).toISOString(), now)).toBe(true);
    expect(isFresh(new Date(now - SEARCH_TTL_MS - 1000).toISOString(), now)).toBe(false);
    expect(isFresh("garbage", now)).toBe(false);
  });
});
