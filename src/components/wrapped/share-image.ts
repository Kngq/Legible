// Draws the share image for "Your ballot, wrapped" on the device (W5): a 1080 by
// 1920 PNG from layoutShareImage(items). Canvas 2D only; no network, no upload.
// Colours are the raw Notebook palette tokens, read from CSS, so the image looks
// the same in light and dark mode. From Layla's branch (f20bfe8), redrawn.
import { layoutShareImage, SHARE_H, SHARE_W, type Measure, type ShareFont, type ShareItem } from "@/lib/engine/wrapped-share-layout";

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
    const apricot = token("--apricot-400", "#d9893f");
    const muted = "rgba(74, 19, 95, 0.66)";
    const hairline = "rgba(74, 19, 95, 0.16)";

    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, SHARE_W, SHARE_H);
    // Faint dot screen, like the paper on the story's slides.
    ctx.fillStyle = "rgba(74, 19, 95, 0.06)";
    for (let y = 24; y < SHARE_H; y += 28) for (let x = 24; x < SHARE_W; x += 28) ctx.fillRect(x, y, 3, 3);

    // The ballot: a second sheet behind, then the card with nine numbered boxes.
    const b = layout.ballot;
    const at = (dx: number, dy: number, angle: number, draw: () => void) => {
      ctx.save();
      ctx.translate(b.x + b.w / 2 + dx, b.y + b.h / 2 + dy);
      ctx.rotate((angle * Math.PI) / 180);
      draw();
      ctx.restore();
    };
    at(-18 * layout.scale, 14 * layout.scale, b.angle - 7, () => {
      ctx.fillStyle = sheet;
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
    });
    at(0, 0, b.angle, () => {
      ctx.shadowColor = "rgba(74, 19, 95, 0.18)";
      ctx.shadowBlur = 40 * layout.scale;
      ctx.shadowOffsetY = 16 * layout.scale;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      ctx.shadowColor = "transparent";
      ctx.strokeStyle = hairline;
      ctx.lineWidth = 2;
      ctx.strokeRect(-b.w / 2, -b.h / 2, b.w, b.h);
      ctx.strokeStyle = ink;
      ctx.fillStyle = ink;
      ctx.lineWidth = 4 * layout.scale;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `400 ${b.cell * 0.5}px ${faces.display}`;
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++) {
          const x = -b.w / 2 + b.inset + c * (b.cell + b.gap);
          const y = -b.h / 2 + b.inset + r * (b.cell + b.gap);
          ctx.strokeRect(x, y, b.cell, b.cell);
          ctx.fillText(String(r * 3 + c + 1), x + b.cell / 2, y + b.cell / 2 + b.cell * 0.04);
        }
      // Two ruled lines under the grid, like a printed form.
      ctx.lineWidth = 3 * layout.scale;
      ctx.strokeStyle = hairline;
      const ly = -b.h / 2 + b.inset + 3 * b.cell + 2 * b.gap + 40 * layout.scale;
      for (const [k, w] of [[0, 0.78], [1, 0.52]] as const) {
        ctx.beginPath();
        ctx.moveTo(-b.w / 2 + b.inset, ly + k * 28 * layout.scale);
        ctx.lineTo(-b.w / 2 + b.inset + (b.w - 2 * b.inset) * w, ly + k * 28 * layout.scale);
        ctx.stroke();
      }
    });

    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    for (const chip of layout.chips) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(chip.x, chip.y, chip.w, chip.h, 14 * layout.scale);
      ctx.fill();
      ctx.strokeStyle = hairline;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    for (const line of layout.lines) {
      ctx.font = css(line.font);
      ctx.fillStyle = line.tone === "muted" ? muted : ink;
      ctx.letterSpacing = line.font.face === "display" && line.font.sizePx > 120 ? "-3px" : "0px";
      ctx.fillText(line.text, line.x, line.y);
    }
    ctx.letterSpacing = "0px";
    ctx.fillStyle = plum;
    ctx.fillRect(layout.rule.x, layout.rule.y, layout.rule.w, layout.rule.h);
    for (const d of layout.dots) {
      ctx.fillStyle = d.tone === "plum" ? plum : apricot;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }

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
