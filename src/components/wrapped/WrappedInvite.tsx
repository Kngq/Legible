"use client";

// For you's quiet invitation to "Your ballot, wrapped" (W10): an editorial aside
// after "Decisions for you", with a text link, never a filled button, so it does
// not compete with the decisions. Three small story sheets, in line weight.
import { WRAPPED_STRINGS as S } from "@/lib/vocab/wrapped";
import { FOCUS } from "../ui";

function Sheets() {
  return (
    <span aria-hidden="true" className="relative block h-[76px] w-[64px] shrink-0">
      <span className="absolute left-1 top-2 h-[64px] w-[40px] -rotate-6 rounded-sm bg-surface-muted shadow-hairline" />
      <span className="absolute left-4 top-1 h-[64px] w-[40px] rotate-3 rounded-sm bg-surface shadow-hairline" />
      <span className="absolute left-[22px] top-0 flex h-[64px] w-[40px] flex-col gap-1 rounded-sm bg-surface p-1.5 shadow-hairline">
        <span className="flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`h-[2px] flex-1 rounded-full ${i === 0 ? "bg-foreground" : "bg-border"}`} />
          ))}
        </span>
        <span className="mt-1 h-[3px] w-[80%] rounded-full bg-foreground/70" />
        <span className="h-[3px] w-[55%] rounded-full bg-foreground/70" />
        <span className="mt-auto font-display text-[1.0625rem] leading-none">9</span>
      </span>
    </span>
  );
}

export function WrappedInvite({ onOpen }: { onOpen: () => void }) {
  return (
    <aside aria-labelledby="h-wrapped" className="mt-section flex items-center gap-4 border-y border-border py-5">
      <Sheets />
      <div className="min-w-0">
        <p id="h-wrapped" className="text-small font-semibold text-muted-foreground">
          {S.inviteKicker}
        </p>
        <p className="mt-1 font-display text-[1.25rem] leading-snug text-balance">{S.inviteLine}</p>
        <button
          type="button"
          onClick={onOpen}
          className={`group mt-1 inline-flex min-h-11 items-center gap-1.5 text-body font-semibold underline decoration-border underline-offset-4 interactive hover:decoration-foreground ${FOCUS}`}
        >
          {S.inviteLink}
          <span aria-hidden="true" className="nudge">
            →
          </span>
        </button>
      </div>
    </aside>
  );
}
