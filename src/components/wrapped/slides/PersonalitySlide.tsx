// Personality Slide (Req 9.1, 9.3): the one Civic_Personality of the Top_Topic.
import { CIVIC_PERSONALITIES, WRAPPED_STRINGS } from "@/lib/vocab/wrapped";
import { WRAP_STYLE, type SlideProps } from "./types";

export function PersonalitySlide({ summary, foreground }: SlideProps) {
  const personality = summary.topTopic ? CIVIC_PERSONALITIES[summary.topTopic] : undefined;
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-8 px-6 text-center"
      style={{ color: foreground, ...WRAP_STYLE }}
    >
      <p className="text-title max-w-full">{WRAPPED_STRINGS.personalityHeading}</p>
      {personality && (
        <>
          <h2 className="text-display max-w-full">{personality.name}</h2>
          <p className="text-body max-w-[32ch]">{personality.description}</p>
        </>
      )}
    </div>
  );
}
