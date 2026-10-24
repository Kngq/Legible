"use client";
// Summary Slide (Req 11.1 to 11.7). Shows only the share items, top to bottom, then
// "Download image". A render races a 5 s timeout; a request id guard drops results from
// stale or unmounted renders, so only the latest successful render saves a file.
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { shareContent, withTimeout } from "@/lib/engine/wrapped-share-layout";
import { WRAPPED_STRINGS } from "@/lib/vocab/wrapped";
import { downloadBlob, renderShareImage } from "../share-image";
import { WRAP_STYLE, type SummarySlideProps } from "./types";

const RENDER_TIMEOUT_MS = 5000;

export function SummarySlide({ summary, town, foreground }: SummarySlideProps) {
  const content = useMemo(() => shareContent(summary, town), [summary, town]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const busyRef = useRef(false);
  const requestId = useRef(0);

  // Unmounting invalidates any render still in flight.
  useEffect(
    () => () => {
      requestId.current += 1;
    },
    [],
  );

  const download = async () => {
    if (busyRef.current) return; // Req 11.7: ignore activations while rendering
    const id = ++requestId.current;
    busyRef.current = true;
    setBusy(true);
    setFailed(false);
    try {
      const blob = await withTimeout(renderShareImage(content), RENDER_TIMEOUT_MS);
      if (id === requestId.current) downloadBlob(blob);
    } catch {
      if (id === requestId.current) setFailed(true);
    } finally {
      if (id === requestId.current) {
        busyRef.current = false;
        setBusy(false);
      }
    }
  };

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-16 text-center"
      style={{ color: foreground, ...WRAP_STYLE }}
    >
      <h2 className="text-title max-w-full">{content.heading}</h2>
      <p className="text-title max-w-full">{content.town}</p>
      {content.topics.length > 0 && (
        <ol className="flex flex-col gap-1">
          {content.topics.map((t) => (
            <li key={t} className="text-body font-semibold">
              {t}
            </li>
          ))}
        </ol>
      )}
      {content.personalityName && (
        <div className="flex max-w-[32ch] flex-col gap-1">
          <p className="text-title">{content.personalityName}</p>
          <p className="text-body">{content.personalityDescription}</p>
        </div>
      )}
      <p className="text-small font-semibold">{content.appName}</p>
      <Button
        variant="primary"
        className="min-w-11"
        onClick={download}
        disabled={busy}
        aria-busy={busy}
      >
        {WRAPPED_STRINGS.download}
      </Button>
      <p role="status" aria-live="polite" className="text-body min-h-6 max-w-[32ch]">
        {failed ? WRAPPED_STRINGS.downloadError : ""}
      </p>
    </div>
  );
}
