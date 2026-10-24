// Dig_In Slide (Req 10.1 to 10.7). "See your full ballot" closes the player to the ballot;
// the Voter_Info_Link is the fixed ballot.source.url and opens in a new tab.
import { Button, FOCUS } from "@/components/ui";
import { WRAPPED_STRINGS } from "@/lib/vocab/wrapped";
import { WRAP_STYLE, type DigInSlideProps } from "./types";

export function DigInSlide({ slide, foreground, onFullBallot, onOutbound, voterInfoUrl }: DigInSlideProps) {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-8 px-6 text-center"
      style={{ color: foreground, ...WRAP_STYLE }}
    >
      <h2 className="text-title max-w-full">{slide.heading}</h2>
      {/* Button primary is min-h-12 (48 px). */}
      <Button variant="primary" className="min-w-11" onClick={onFullBallot}>
        {WRAPPED_STRINGS.fullBallot}
      </Button>
      <a
        href={voterInfoUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={WRAPPED_STRINGS.voterInfoAria}
        onClick={onOutbound}
        className={`text-body inline-flex min-h-11 min-w-11 max-w-[32ch] items-center justify-center rounded-sm px-2 font-semibold underline underline-offset-4 ${FOCUS}`}
        style={{ color: foreground }}
      >
        {WRAPPED_STRINGS.voterInfoText}
      </a>
    </div>
  );
}
