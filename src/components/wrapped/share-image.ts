// Draws the Ballot Wrapped Summary card to a 1080 by 1920 PNG (Req 11.4, 11.5, 11.6, 13.1).
// Canvas 2D only, no network: Figtree is used only if it is already loaded.
import {
  SHARE_H,
  SHARE_W,
  layoutShareImage,
  type Measure,
  type ShareContent,
  type ShareFont,
} from "@/lib/engine/wrapped-share-layout";

const SYSTEM_SANS =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/**
 * Font stack for the canvas. Uses the next/font Figtree family from `--font-figtree`
 * only when document.fonts.check() says it is ready; never triggers a font load.
 */
function resolveFamily(): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--font-figtree").trim();
  if (raw === "") return SYSTEM_SANS;
  try {
    if (document.fonts && document.fonts.check(`700 48px ${raw}`) && document.fonts.check(`400 48px ${raw}`)) {
      return `${raw}, ${SYSTEM_SANS}`;
    }
  } catch {
    // An unparsable family string falls through to the system stack.
  }
  return SYSTEM_SANS;
}

function cssFont(font: ShareFont, family: string): string {
  return `${font.weight} ${font.sizePx}px ${family}`;
}

/** Renders the share card offscreen. Rejects if no 2D context or no blob is produced. */
export function renderShareImage(content: ShareContent): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = SHARE_W;
    canvas.height = SHARE_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Canvas 2D context unavailable"));
      return;
    }

    const family = resolveFamily();
    const measure: Measure = (text, font) => {
      ctx.font = cssFont(font, family);
      return ctx.measureText(text).width;
    };
    const layout = layoutShareImage(content, measure);

    ctx.fillStyle = layout.background;
    ctx.fillRect(0, 0, SHARE_W, SHARE_H);
    ctx.fillStyle = layout.foreground;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    for (const line of layout.lines) {
      ctx.font = cssFont(line.font, family);
      ctx.fillText(line.text, line.x, line.y);
    }

    try {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas produced no image"));
      }, "image/png");
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

/** Saves `blob` as `filename` through a temporary download link. */
export function downloadBlob(blob: Blob, filename = "ballot-wrapped-2026.png"): void {
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
