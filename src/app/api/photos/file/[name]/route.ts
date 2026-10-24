import { readFile } from "node:fs/promises";
import path from "node:path";
import { LOCAL_DIR } from "@/lib/photos/server";

/** Serves photos saved by the local store (PHOTO_STORE=local). 404 otherwise. */

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function GET(_req: Request, ctx: RouteContext<"/api/photos/file/[name]">) {
  const { name } = await ctx.params;
  const m = /^(\d+)\.(jpg|png|webp)$/.exec(name);
  if (process.env.PHOTO_STORE !== "local" || !m) return new Response("Not found", { status: 404 });
  try {
    const body = await readFile(path.join(LOCAL_DIR, "pixabay", name));
    return new Response(body, { headers: { "Content-Type": TYPES[m[2]], "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
