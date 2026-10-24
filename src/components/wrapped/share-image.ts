// Draws the share image for "Your ballot, wrapped" on the device (W5): a 1080 by
// 1920 PNG from layoutShareImage(items). Canvas 2D only; no network, no upload.
// Colours are the raw Notebook palette tokens, read from CSS, so the image looks
// the same in light and dark mode. From Layla's branch (f20bfe8), redrawn.
import { layoutShareImage, SHARE_H, SHARE_PAD, SHARE_W, type Measure, type ShareFont, type ShareItem } from "@/lib/engine/wrapped-share-layout";

const SYSTEM_SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const SYSTEM_SERIF = '"Iowan Old Style", Georgia, serif';

function token(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/** A next/font family from its CSS variable, only if it is already loaded; never triggers a load. */
function family(variable: string, fallback: string): string {
  const raw = token(variable, "");
  if (!raw) return fallback;
  try {
    if (document.fonts?.check(`400 48px ${raw}`)) return `${raw}, ${fallback}`;
  } catch {
    // An unparsable family string falls through to the system stack.
  }
  return fallback;
}

/** Renders the image offscreen. Rejects if there is no 2D context or no blob. */
export function renderShareImage(items: ShareItem[]): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = SHARE_W;
    canvas.height = SHARE_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return reject(new Error("Canvas 2D context unavailable"));

    const faces = { display: family("--font-fraunces", SYSTEM_SERIF), sans: family("--font-figtree", SYSTEM_SANS) };
    const css = (f: ShareFont) => `${f.italic ? "italic " : ""}${f.weight} ${f.sizePx}px ${faces[f.face]}`;
    const measure: Measure = (text, f) => {
      ctx.font = css(f);
      return ctx.measureText(text).width;
    };
    const layout = layoutShareImage(items, measure);

    // Raw palette tokens (the same in both themes).
    const paper = token("--lilac-100", "#f4eaf5");
    const sheet = token("--purple-100", "#f1e6f3");
    const ink = token("--purple-800", "#4a135f");
    const plum = token("--purple-700", "#5b1a74");
    const muted = "rgba(74, 19, 95, 0.66)";

    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, SHARE_W, SHARE_H);
    // Two layered sheets, slightly turned, like the story's paper.
    ctx.save();
    ctx.translate(SHARE_W * 0.62, SHARE_H * 0.58);
    ctx.rotate((-4 * Math.PI) / 180);
    ctx.fillStyle = sheet;
    ctx.fillRect(-420, -620, 840, 1240);
    ctx.restore();
    ctx.save();
    ctx.translate(SHARE_W * 0.5, SHARE_H * 0.5);
    ctx.rotate((2 * Math.PI) / 180);
    ctx.strokeStyle = "rgba(74, 19, 95, 0.12)";
    ctx.lineWidth = 3;
    ctx.strokeRect(-470, -860, 940, 1720);
    ctx.restore();

    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    for (const line of layout.lines) {
      ctx.font = css(line.font);
      ctx.fillStyle = line.tone === "muted" ? muted : ink;
      if (line.font.face === "display") ctx.letterSpacing = "-2px";
      else ctx.letterSpacing = "0px";
      ctx.fillText(line.text, line.x, line.y);
    }
    // The Legible plum rule under the title.
    ctx.fillStyle = plum;
    ctx.fillRect(layout.rule.x, layout.rule.y, layout.rule.w, 8);
    // The nine questions as a small grid of boxes, single line weight.
    ctx.strokeStyle = ink;
    ctx.lineWidth = 4;
    const cell = 36;
    const gap = 10;
    const gx = SHARE_W - SHARE_PAD - (3 * cell + 2 * gap);
    const gy = SHARE_PAD - 4;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) ctx.strokeRect(gx + c * (cell + gap), gy + r * (cell + gap), cell, cell);

    try {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Canvas produced no image"))), "image/png");
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

/** Saves `blob` through a temporary download link. */
export function downloadBlob(blob: Blob, filename = "my-ballot-wrapped-2026.png"): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  try {
    a.click();
  } finally {
    a.remove();
    // Defer the revoke so the browser has started the download.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
