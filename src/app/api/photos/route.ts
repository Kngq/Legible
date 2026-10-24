import { NextResponse } from "next/server";
import ballot from "@/data/ballot-2026.json";
import civicData from "@/data/civic-ma.json";
import type { CivicItem } from "@/lib/engine/civic";
import type { DocumentData } from "@/lib/engine/types";
import { altText, photoTargets, pickLandscape, storagePath } from "@/lib/photos/pick";
import { downloadImage, photoConfig, RateLimited, rowsToPhotos, searchPixabay } from "@/lib/photos/server";

/**
 * Feed photos (see docs/DECISIONS.md, "Feed photos").
 *
 * GET lists saved photos for every item. POST fills in items that have none:
 * Pixabay search (cached 24 hours), a landscape pick, download, upload to our
 * Supabase bucket (or .photos/ with PHOTO_STORE=local), and a row with our URL
 * and the credit. Neither method takes
 * a body: the server works over the whole catalog, so it never learns a town.
 */

export const maxDuration = 60;

const TARGETS = photoTargets(civicData as unknown as CivicItem[], [ballot as unknown as DocumentData]);

export type PhotoOutcome = "added" | "no_result" | "rate_limited" | "error";

const NOT_CONFIGURED = { error: "Photos are not configured on this server.", code: "not_configured" } as const;

export async function GET() {
  const c = photoConfig();
  if (!c) return NextResponse.json({ photos: [], configured: false });
  try {
    return NextResponse.json({ photos: rowsToPhotos(await c.store.listRows()), configured: true });
  } catch {
    return NextResponse.json({ error: "Could not load photos." }, { status: 502 });
  }
}

export async function POST() {
  const c = photoConfig();
  if (!c) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  let rows;
  try {
    rows = await c.store.listRows();
  } catch {
    return NextResponse.json({ error: "Could not read saved photos." }, { status: 502 });
  }
  const have = new Set(rows.map((r) => r.item_key));
  const used = new Set(rows.map((r) => r.pixabay_id));
  const todo = TARGETS.filter((t) => !have.has(t.key));
  const results: { key: string; outcome: PhotoOutcome }[] = [];
  let retryAfter: number | undefined;

  for (const t of todo) {
    if (retryAfter !== undefined) {
      results.push({ key: t.key, outcome: "rate_limited" });
      continue;
    }
    try {
      const pick = pickLandscape(await searchPixabay(c, t.query), used, t.tag);
      if (!pick) {
        results.push({ key: t.key, outcome: "no_result" });
        continue;
      }
      const { body, contentType } = await downloadImage(pick.largeImageURL);
      const url = await c.store.saveImage(storagePath(pick), body, contentType);
      const row = {
        item_key: t.key,
        url,
        alt: altText(pick),
        contributor: pick.user,
        source_url: pick.pageURL,
        pixabay_id: pick.id,
        fetched_at: new Date().toISOString(),
      };
      await c.store.saveRow(row);
      rows.push(row);
      used.add(pick.id);
      results.push({ key: t.key, outcome: "added" });
    } catch (err) {
      if (err instanceof RateLimited) {
        retryAfter = err.retryAfter;
        results.push({ key: t.key, outcome: "rate_limited" });
      } else {
        console.error(`photos: ${t.key}: ${err instanceof Error ? err.message : "failed"}`);
        results.push({ key: t.key, outcome: "error" });
      }
    }
  }

  return NextResponse.json({ photos: rowsToPhotos(rows), skipped: have.size, results, retryAfter });
}
