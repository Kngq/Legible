"use client";

// The one-question screens shared by first run and the profile sheet:
// town, one life area ("Pick all that apply"), and subjects. No screen names a
// document, measure, or question number.
import { useMemo, useState, type ReactNode } from "react";
import towns from "@/data/towns.json";
import { setTopic, type Profile } from "@/lib/engine/profile";
import { FACT_DEFS, matchTopics, TOPIC_DEFS, TOPIC_IDS, type FactId, type LifeArea } from "@/lib/vocab";
import { Glyph, Part } from "./icons";
import { Button, FOCUS } from "./ui";

interface Town {
  id: string;
  name: string;
  type: string;
  county: string;
  aliases: string[];
}
const TOWNS = towns as Town[];
export const townName = (id?: string) => TOWNS.find((t) => t.id === id)?.name;

/** Short labels for done rows in the profile sheet: "Rent · Ride transit". */
export const FACT_SHORT: Record<FactId, string> = {
  rents: "Rent",
  owns: "Own",
  lives_with_family: "Live with family",
  kids_in_schools: "Kids in public schools",
  state_employee: "State job",
  runs_business_here: "Business in town",
  drives: "Drive",
  rides_transit: "Ride transit",
  registered_here: "Registered here",
  votes_in_primaries: "Vote in primaries",
  public_defender_contact: "Public defender contact",
  wants_single_family: "Single-family home",
  buys_cannabis: "Buys cannabis",
  owns_firearm: "Owns a firearm",
};

export function Bubble({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className="space-y-3">
      <div className="relative rounded-xl bg-surface p-6 shadow-card">
        <span aria-hidden="true" className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 rotate-45 bg-surface" />
        <p className="text-title">{children}</p>
      </div>
      {sub && <p className="px-2 text-body text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function AreaStep({
  area,
  profile,
  onNext,
  onDecline,
  saveLabel = "Save",
}: {
  saveLabel?: string;
  area: LifeArea;
  profile: Profile;
  onNext: (picked: FactId[]) => void;
  onDecline: () => void;
}) {
  const answered = area.facts.every((f) => profile.facts[f]);
  const [picked, setPicked] = useState<FactId[]>(() => area.facts.filter((f) => profile.facts[f]?.value));
  const [none, setNone] = useState(() => answered && picked.length === 0);
  const toggle = (f: FactId) => {
    setNone(false);
    setPicked((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));
  };
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 id="area-h" className="text-title">{area.heading}</h1>
        <p className="text-body font-semibold">Pick all that apply.</p>
        <p className="text-body text-muted-foreground">{area.why}</p>
      </div>
      <div role="group" aria-labelledby="area-h" className="grid gap-3">
        {area.facts.map((f) => (
          <Option key={f} selected={picked.includes(f)} onClick={() => toggle(f)} icon={FACT_DEFS[f].avatarPart}>
            {FACT_DEFS[f].statement}
          </Option>
        ))}
        <Option
          selected={none}
          onClick={() => {
            setPicked([]);
            setNone(!none);
          }}
        >
          None of these
        </Option>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PreferNot onClick={onDecline} />
        <Button disabled={!picked.length && !none} onClick={() => onNext(picked)} className="min-w-32">
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}

// Selection is one hairline plum border, a lavender wash, and a small mark on the
// right. Keyboard focus keeps its own offset ring (FOCUS), so the two never blur.
export function Option({ selected, onClick, icon, children }: { selected?: boolean; onClick: () => void; icon?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-h-14 items-center gap-3 rounded-lg border px-4 py-3 text-left text-body font-semibold transition-colors duration-(--duration) ease-legible ${FOCUS} ${
        selected ? "border-primary bg-accent-soft" : "border-border bg-surface hover:border-muted-foreground"
      }`}
    >
      {icon && (
        <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-muted-foreground">
          <Part name={icon} size={18} />
        </span>
      )}
      <span className="min-w-0 flex-1">{children}</span>
      <span
        aria-hidden="true"
        className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
      >
        {selected && <Glyph name="check" size={12} />}
      </span>
    </button>
  );
}

export function PreferNot({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`min-h-12 rounded-md px-1 text-body font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline ${FOCUS}`}>
      Prefer not to say
    </button>
  );
}

export function TownStep({
  profile,
  setProfile,
  hideHeading = false,
}: {
  profile: Profile;
  setProfile: (p: Profile) => void;
  /** First run asks the question in the mascot's speech bubble instead. */
  hideHeading?: boolean;
}) {
  const [q, setQ] = useState(() => townName(profile.townId) ?? "");
  const query = q.trim().toLowerCase();
  const matches = useMemo(() => {
    if (query.length < 2) return [];
    const out: { town: Town; via?: string }[] = [];
    for (const t of TOWNS) {
      if (t.name.toLowerCase().startsWith(query)) out.push({ town: t });
      else {
        const a = t.aliases.find((x) => x.toLowerCase().startsWith(query));
        if (a) out.push({ town: t, via: a });
      }
      if (out.length >= 6) break;
    }
    return out;
  }, [query]);
  const chosen = TOWNS.find((t) => t.id === profile.townId);
  const showList = !chosen || chosen.name.toLowerCase() !== query;

  return (
    <div className="space-y-6">
      {!hideHeading && (
        <div className="space-y-3">
          <h1 className="text-title">What city or town do you live in?</h1>
          <p className="text-body text-muted-foreground">Stays in your browser.</p>
        </div>
      )}
      <div className="space-y-3">
        <label htmlFor="town" className="sr-only">
          City, town, or neighborhood
        </label>
        <input
          id="town"
          value={q}
          autoComplete="off"
          placeholder="Somerville, Dorchester, Lowell..."
          onChange={(e) => {
            setQ(e.target.value);
            if (profile.townId) setProfile({ ...profile, townId: undefined });
          }}
          className={`h-14 w-full rounded-md border-2 border-transparent bg-surface px-4 text-body shadow-card placeholder:text-muted-foreground focus:border-foreground ${FOCUS}`}
        />
        {chosen && (
          <p className="flex items-center gap-2 text-body font-semibold">
            <span className="flex size-6 items-center justify-center rounded-full bg-positive text-positive-foreground">
              <Glyph name="check" size={16} />
            </span>
            {chosen.name}, {chosen.county} County
          </p>
        )}
        {showList && matches.length > 0 && (
          <ul className="overflow-hidden rounded-lg bg-surface shadow-card" role="listbox" aria-label="Matching towns">
            {matches.map(({ town, via }) => (
              <li key={town.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => {
                    setQ(town.name);
                    setProfile({ ...profile, townId: town.id });
                  }}
                  className={`flex min-h-12 w-full items-center justify-between gap-3 border-b border-border px-4 text-left text-body last:border-0 hover:bg-surface-muted ${FOCUS}`}
                >
                  <span className="font-semibold">{town.name}</span>
                  <span className="text-small text-muted-foreground">{via ? `${via} is in ${town.name}` : `${town.county} County`}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {showList && query.length >= 2 && matches.length === 0 && (
          <p className="text-small text-muted-foreground">No Massachusetts city or town starts with that.</p>
        )}
      </div>
    </div>
  );
}

export function TopicsStep({ profile, setProfile }: { profile: Profile; setProfile: (p: Profile, partKey?: string) => void }) {
  const [typed, setTyped] = useState("");
  const suggestions = matchTopics(typed).filter((t) => !profile.topics[t]);
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-title">Pick any subjects you follow.</h1>
        <p className="text-body text-muted-foreground">These add an On your list tag. They never change what touches you.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {TOPIC_IDS.map((id) => {
          const on = Boolean(profile.topics[id]);
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              onClick={() => setProfile(setTopic(profile, id, !on, "chip"), on ? undefined : `topic:${id}`)}
              className={`inline-flex min-h-12 items-center gap-2 rounded-full border-2 px-4 text-body font-semibold transition-colors duration-(--duration) ease-legible ${FOCUS} ${
                on ? "border-foreground bg-surface" : "border-transparent bg-surface-muted hover:border-border"
              }`}
            >
              <Part name={TOPIC_DEFS[id].avatarPart} size={18} />
              {TOPIC_DEFS[id].label}
            </button>
          );
        })}
      </div>
      <div className="space-y-2">
        <label htmlFor="topic-typed" className="text-small text-muted-foreground">
          Or type a subject. Matching happens in your browser and the text is not kept.
        </label>
        <input
          id="topic-typed"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="parking, school budget, rent..."
          className={`h-12 w-full rounded-md bg-surface px-4 text-body shadow-card placeholder:text-muted-foreground ${FOCUS}`}
        />
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setProfile(setTopic(profile, id, true, "typed"), `topic:${id}`);
                  setTyped("");
                }}
                className={`min-h-10 rounded-full bg-accent-soft px-3 text-small font-semibold text-foreground ${FOCUS}`}
              >
                Add {TOPIC_DEFS[id].label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
