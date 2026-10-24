"use client";
// Spotlight Slide (Req 8.1 to 8.8). Copies the Spotlight_Card through spotlightModel and adds
// no sentence of its own. The measure sits on an app-surface card so the Tag, the Sentences
// source link, and the quote view keep their theme contrast on any Slide colour.
// Chips are plain text: as buttons they would open the Profile_Sheet behind the dialog.
import { Sentences } from "@/components/MeasureCard";
import { Tag } from "@/components/ui";
import { spotlightModel } from "@/lib/engine/wrapped-slides";
import { WRAP_STYLE, type SpotlightSlideProps } from "./types";

export function SpotlightSlide({ slide, summary, foreground, onQuote }: SpotlightSlideProps) {
  const card = summary.spotlight;
  const spot = card ? spotlightModel(card) : undefined;
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-16"
      style={{ color: foreground, ...WRAP_STYLE }}
    >
      <h2 className="text-title max-w-full text-center">{slide.heading}</h2>
      {card && spot && (
        <article className="w-full max-w-md rounded-lg bg-surface p-5 text-left text-foreground">
          <p className="text-small font-semibold text-muted-foreground">{spot.number}</p>
          <h3 className="text-title mt-1">{spot.title}</h3>
          <div className="mt-3">
            <Tag pop={spot.label === "Probably not you" ? "muted" : "accent"}>{spot.label}</Tag>
          </div>
          {spot.sentence && (
            <Sentences
              sentences={[spot.sentence]}
              measure={card.measure}
              onShownChange={onQuote}
              sourceClassName="min-h-11 min-w-11 justify-center"
            />
          )}
          {spot.chips.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {spot.chips.map((chip) => (
                <li key={chip}>
                  <span className="inline-flex min-h-9 items-center rounded-md bg-surface-muted px-3 py-1.5 text-small font-semibold">
                    {chip}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
      )}
    </div>
  );
}
