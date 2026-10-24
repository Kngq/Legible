// Top_Topic_Reveal Slide: 96 px pictogram, Top_Topic label, reveal sentence (Req 5.1, 5.2, 5.4, 5.7).
import { Part } from "@/components/icons";
import { TOPIC_VISUALS, WRAPPED_STRINGS } from "@/lib/vocab/wrapped";
import { WRAP_STYLE, type SlideProps } from "./types";

export function RevealSlide({ slide, summary, foreground }: SlideProps) {
  const part = summary.topTopic ? TOPIC_VISUALS[summary.topTopic].part : undefined;
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-8 px-6 text-center"
      style={{ color: foreground, ...WRAP_STYLE }}
    >
      {/* Part renders aria-hidden with one stroke width throughout. */}
      {part && <Part name={part} size={96} strokeWidth={1.6} />}
      <h2 className="text-display max-w-full">{slide.heading}</h2>
      <p className="text-body max-w-[32ch]">{WRAPPED_STRINGS.revealSentence}</p>
    </div>
  );
}
