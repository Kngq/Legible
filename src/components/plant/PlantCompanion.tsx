"use client";

// The top of Civic Profile: the plant as the person's avatar, their name (the
// existing profile name, edited in place), their totals, and the way into the
// Growth Story. The name never affects growth. Stage and totals come from useGrowth, the same
// source as the header avatar. Counts show only when a history exists; nothing
// here invents activity.
import { useState, type ReactNode } from "react";
import type { GrowthTotals } from "@/lib/growth";
import { FOCUS } from "../ui";
import { CivicPlant } from "./CivicPlant";
import { useGrowth } from "./useGrowth";

const ICON: Record<keyof GrowthTotals, ReactNode> = {
  decisions: <path d="M12 6.5C10.3 5 7.8 4.5 4 4.5v14c3.8 0 6.3.5 8 2 1.7-1.5 4.2-2 8-2v-14c-3.8 0-6.3.5-8 2ZM12 6.5v14" />,
  sources: <path d="M14 3.5H7a1.5 1.5 0 0 0-1.5 1.5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8ZM14 3.5V8h4.5M9 12h6M9 15.5h6" />,
  followed: <path d="M5 19c0-8 5-13.5 14.5-14-.3 9.5-6 14.5-14.5 14Zm0 0 7.5-7.5" />,
};

const LABEL: Record<keyof GrowthTotals, [string, string]> = {
  decisions: ["decision explored", "decisions explored"],
  sources: ["source opened", "sources opened"],
  followed: ["issue followed", "issues followed"],
};

export function PreviewTag() {
  return <span className="shrink-0 whitespace-nowrap rounded-full bg-info-soft px-2 py-0.5 text-small text-muted-foreground">Preview data</span>;
}

export function PlantCompanion({
  name,
  onNameChange,
  onSeeGrowth,
  signal,
  plantSize = 140,
}: {
  /** The saved profile name, if any. */
  name?: string;
  /** Saves the profile name (undefined clears it). Absent hides the name controls. */
  onNameChange?: (name: string | undefined) => void;
  /** Opens the Growth Story. Absent hides the link. */
  onSeeGrowth?: () => void;
  signal?: { tap: number; milestone: number };
  /** Width in px; the plant stands about 1.3 times as tall. */
  plantSize?: number;
}) {
  const g = useGrowth();
  if (!g.enabled) return null;
  const totals = g.history?.totals;
  // No card: the plant sits on the page background as the profile's centrepiece.
  return (
    <section aria-labelledby="plant-h" className="-mt-3 flex flex-col items-center text-center">
      {/* As a companion the plant is announced plainly, never by a stage name. */}
      <CivicPlant stage={g.stage} size={plantSize} signal={signal} {...(g.tracking ? {} : { label: "Your plant" })} className="cursor-pointer select-none" />
      <Identity name={name?.trim() || undefined} onNameChange={onNameChange} tracking={g.tracking} />
      {onSeeGrowth && (
        <button
          type="button"
          onClick={onSeeGrowth}
          className={`mt-1 inline-flex min-h-10 items-center gap-1 rounded-md px-2 text-small font-semibold text-primary underline-offset-4 hover:underline ${FOCUS}`}
        >
          See your journey <span aria-hidden="true">→</span>
        </button>
      )}
      {totals && (
        <ul aria-label="Your totals" className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-small text-muted-foreground">
          {(Object.keys(LABEL) as (keyof GrowthTotals)[]).map((k) => (
            <li key={k} className="inline-flex items-center gap-1">
              <svg
                viewBox="0 0 24 24"
                width={14}
                height={14}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="shrink-0"
              >
                {ICON[k]}
              </svg>
              <span>
                <span className="font-semibold text-foreground">{totals[k]}</span> {LABEL[k][totals[k] === 1 ? 0 : 1]}
              </span>
            </li>
          ))}
          {g.preview && (
            <li>
              <PreviewTag />
            </li>
          )}
        </ul>
      )}
      {!totals && g.preview && (
        <p className="mt-1">
          <PreviewTag />
        </p>
      )}
    </section>
  );
}

/** The name under the plant, or "Your civic journey" without one, with an inline editor. */
function Identity({ name, onNameChange, tracking }: { name?: string; onNameChange?: (name: string | undefined) => void; tracking: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const start = () => {
    setDraft(name ?? "");
    setEditing(true);
  };
  const save = () => {
    onNameChange?.(draft.trim().slice(0, 40) || undefined);
    setEditing(false);
  };

  if (editing && onNameChange) {
    return (
      <form
        className="mt-2 flex w-full max-w-xs flex-col items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <label htmlFor="profile-name" className="sr-only">
          Your first name or nickname
        </label>
        <input
          id="profile-name"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, 40))}
          onKeyDown={(e) => {
            // Escape cancels the edit instead of closing the profile.
            if (e.key === "Escape") {
              e.stopPropagation();
              setEditing(false);
            }
          }}
          maxLength={40}
          autoComplete="given-name"
          placeholder="Your first name or nickname"
          autoFocus
          className={`h-11 w-full rounded-md bg-surface-muted px-4 text-center text-body placeholder:text-muted-foreground ${FOCUS}`}
        />
        <p className="type-secondary text-muted-foreground">Optional. For a friendly hello, and it stays in this browser.</p>
        <div className="flex gap-2">
          <button type="submit" className={`min-h-10 rounded-md bg-primary px-4 text-small font-semibold text-primary-foreground hover:bg-primary-hover ${FOCUS}`}>
            Save
          </button>
          <button type="button" onClick={() => setEditing(false)} className={`min-h-10 rounded-md px-3 text-small font-semibold text-muted-foreground hover:text-foreground ${FOCUS}`}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return name ? (
    <>
      <div className="mt-4 flex items-baseline justify-center gap-2">
        <h3 id="plant-h" className="type-page">
          {name}
        </h3>
        {onNameChange && (
          <button
            type="button"
            onClick={start}
            aria-label="Edit your name"
            className={`rounded-sm px-1 text-small font-semibold text-primary underline-offset-4 hover:underline ${FOCUS}`}
          >
            Edit
          </button>
        )}
      </div>
      <p className="mt-1 type-secondary text-muted-foreground">{tracking ? "Your civic journey, growing with you." : "Your Civic Profile. It stays in this browser."}</p>
    </>
  ) : (
    <>
      <h3 id="plant-h" className="mt-4 type-page">
        {tracking ? "Your civic journey" : "Your Civic Profile"}
      </h3>
      <p className="mt-1 type-secondary text-muted-foreground">{tracking ? "Every decision you explore helps your plant grow." : "Your answers and the subjects you follow, kept in this browser."}</p>
      {onNameChange && (
        <button
          type="button"
          onClick={start}
          className={`mt-0.5 rounded-sm px-1 text-small text-muted-foreground underline underline-offset-4 hover:text-foreground ${FOCUS}`}
        >
          Add your name
        </button>
      )}
    </>
  );
}
