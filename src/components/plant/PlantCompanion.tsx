"use client";

// The top of Civic Profile: the plant as the person's avatar, their name (the
// existing profile name, edited in place), and a link to the garden. The name
// never affects growth; watering and growth happen only in the garden.
import { useState } from "react";
import { FOCUS } from "../ui";
import { CivicPlant, type PlantSignal } from "./CivicPlant";
import { useGarden } from "./useGarden";
import { useGrowth } from "./useGrowth";

export function PlantCompanion({
  name,
  onNameChange,
  onOpenGarden,
  signal,
  plantSize = 140,
}: {
  /** The saved profile name, if any. */
  name?: string;
  /** Saves the profile name (undefined clears it). Absent hides the name controls. */
  onNameChange?: (name: string | undefined) => void;
  /** Opens the garden. Absent hides the link. */
  onOpenGarden?: () => void;
  signal?: PlantSignal;
  /** Width in px; the plant stands about 1.3 times as tall. */
  plantSize?: number;
}) {
  const g = useGrowth();
  const { state } = useGarden();
  if (!g.enabled) return null;
  // No card: the plant sits on the page background as the profile's centrepiece.
  return (
    <section aria-labelledby="plant-h" className="-mt-3 flex flex-col items-center text-center">
      <CivicPlant stage={g.stage} size={plantSize} signal={signal} accessory={state.accessory} ground label="Your plant" className="cursor-pointer select-none" />
      <Identity name={name?.trim() || undefined} onNameChange={onNameChange} />
      {/* Watering and growth live in the garden; the profile only links to it. */}
      {onOpenGarden && (
        <button
          type="button"
          onClick={onOpenGarden}
          className={`mt-1 inline-flex min-h-10 items-center gap-1 rounded-md px-2 text-small font-semibold text-primary underline-offset-4 hover:underline ${FOCUS}`}
        >
          Visit your garden <span aria-hidden="true">→</span>
        </button>
      )}
    </section>
  );
}

/** The name under the plant, or "Your civic journey" without one, with an inline editor. */
function Identity({ name, onNameChange }: { name?: string; onNameChange?: (name: string | undefined) => void }) {
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
      <p className="mt-1 type-secondary text-muted-foreground">Your Civic Profile. It stays in this browser.</p>
    </>
  ) : (
    <>
      <h3 id="plant-h" className="mt-4 type-page">
        Your Civic Profile
      </h3>
      <p className="mt-1 type-secondary text-muted-foreground">Your answers and the subjects you follow, kept in this browser.</p>
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
