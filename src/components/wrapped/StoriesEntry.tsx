"use client";

// The two ways into Ballot stories. Explore leads with a featured section, before
// its list of decisions: what the stories are, how many, and a small preview of the
// story frames, so a person knows what they open before they open it. For you keeps
// only a quiet text link under its decisions, so the stories never compete with
// what is personal. Same paper as the opening story, so the hand-off feels continuous.
import { SLIDE_COUNT } from "@/lib/engine/wrapped-slides";
import { WRAPPED_STRINGS as S } from "@/lib/vocab/wrapped";
import { FOCUS } from "../ui";
import { PRIMARY } from "../updates";

/** Three story frames, fanned like a deck: the top one shows six progress segments and the nine questions. */
function Frames() {
  const frame = "absolute inset-0 rounded-md shadow-hairline";
  return (
    <span aria-hidden="true" className="relative block h-[118px] w-[86px] shrink-0 sm:h-[150px] sm:w-[108px]">
      <span className={`${frame} translate-x-[14px] translate-y-[2px] rotate-[7deg] bg-surface-muted`} />
      <span className={`${frame} translate-x-[7px] rotate-[3deg] bg-surface`} />
      <span className={`${frame} flex -rotate-2 flex-col bg-surface p-2 sm:p-2.5`}>
        <span className="flex gap-[3px]">
          {Array.from({ length: SLIDE_COUNT }, (_, i) => (
            <span key={i} className={`h-[2px] flex-1 rounded-full ${i === 0 ? "bg-foreground" : "bg-border"}`} />
          ))}
        </span>
        <span className="mt-2 font-display text-[0.8125rem] leading-[1.05] tracking-[-0.01em] sm:text-[1rem]">{S.openingHeading}</span>
        <span className="mt-auto grid w-[70%] grid-cols-3 gap-[3px]">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className="aspect-square rounded-[2px] shadow-[inset_0_0_0_1px_var(--foreground)]" />
          ))}
        </span>
      </span>
    </span>
  );
}

/** Explore's featured section. */
export function StoriesFeature({ onOpen }: { onOpen: () => void }) {
  return (
    <section aria-labelledby="h-stories" className="mt-8 rounded-lg bg-surface-muted p-5 sm:p-6">
      <div className="flex items-start gap-4 sm:gap-6">
        <div className="min-w-0 flex-1">
          <p className="text-small font-semibold text-muted-foreground">{S.featureKicker}</p>
          <h2 id="h-stories" className="mt-1 type-feature">
            {S.featureHeading}
          </h2>
          <p className="mt-2 max-w-[28em] text-body text-muted-foreground">{S.featureIntro}</p>
        </div>
        <Frames />
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-small font-semibold text-muted-foreground">
        {[S.featureCount, S.featurePace, S.featureSource].map((t, i) => (
          <li key={t} className="flex items-center gap-3">
            {i > 0 && (
              <span aria-hidden="true" className="size-1 rounded-full bg-muted-foreground/60" />
            )}
            {t}
          </li>
        ))}
      </ul>
      <button type="button" onClick={onOpen} className={`group mt-4 ${PRIMARY} interactive press`}>
        {S.featureAction}
        <span aria-hidden="true" className="nudge">
          →
        </span>
      </button>
    </section>
  );
}

/** For you's secondary link, near the ballot questions. */
export function StoriesLink({ onOpen }: { onOpen: () => void }) {
  return (
    <p className="mt-3 text-small text-muted-foreground">
      {S.homeLead}{" "}
      <button
        type="button"
        onClick={onOpen}
        className={`group inline-flex min-h-11 items-center gap-1 font-semibold text-foreground underline decoration-border underline-offset-4 interactive hover:decoration-foreground ${FOCUS}`}
      >
        {S.homeLink}
        <span aria-hidden="true" className="nudge">
          →
        </span>
      </button>
    </p>
  );
}
