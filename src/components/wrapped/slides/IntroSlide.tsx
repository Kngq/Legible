// Intro Slide: heading, town label (or "Massachusetts"), intro line (Req 4.1, 4.2, 4.4).
import { WRAPPED_STRINGS } from "@/lib/vocab/wrapped";
import { WRAP_STYLE, type SlideProps } from "./types";

export function IntroSlide({ slide, foreground }: SlideProps) {
  // buildSlides puts the town label second in the Intro texts: [heading, town, introLine].
  const town = slide.texts[1] ?? WRAPPED_STRINGS.stateFallback;
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-8 px-6 text-center"
      style={{ color: foreground, ...WRAP_STYLE }}
    >
      <h2 className="text-display max-w-full">{slide.heading}</h2>
      <p className="text-title max-w-full">{town}</p>
      <p className="text-body max-w-[32ch]">{WRAPPED_STRINGS.introLine}</p>
    </div>
  );
}
