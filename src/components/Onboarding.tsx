"use client";

// One question per screen: hello, town, one "Pick all that apply" screen per
// life area, subjects, keep it, done. Same screens for every person and document. The avatar gains a part with each answer.
import { useMemo, useState, type ReactNode } from "react";
import towns from "@/data/towns.json";
import { avatarParts } from "@/lib/engine/avatar";
import { personalization } from "@/lib/engine/personalization";
import { answerArea, confirmTopics, declineArea, setTopic, skipFact, type Profile } from "@/lib/engine/profile";
import { FACT_DEFS, LIFE_AREAS, matchTopics, TOPIC_DEFS, TOPIC_IDS, type FactId, type LifeArea } from "@/lib/vocab";
import { Avatar } from "./Avatar";
import { Glyph, Part } from "./icons";
import { Meter } from "./Meter";
import { Button, FOCUS } from "./ui";

type Screen =
  | { kind: "hello" }
  | { kind: "town" }
  | { kind: "area"; area: LifeArea }
  | { kind: "topics" }
  | { kind: "keep" }
  | { kind: "done" };

interface Town {
  id: string;
  name: string;
  type: string;
  county: string;
  aliases: string[];
}
const TOWNS = towns as Town[];
export const townName = (id?: string) => TOWNS.find((t) => t.id === id)?.name;

const OB = { kind: "onboarding" } as const;

export function Onboarding({
  profile,
  setProfile,
  mode,
  canStore,
  onKeep,
  onFinish,
}: {
  profile: Profile;
  setProfile: (p: Profile) => void;
  mode: "first" | "edit";
  canStore: boolean;
  onKeep: (remember: boolean) => void;
  onFinish: (sorted: boolean) => void;
}) {
  const screens = useMemo<Screen[]>(() => {
    const s: Screen[] = mode === "first" ? [{ kind: "hello" }] : [];
    s.push({ kind: "town" });
    for (const area of LIFE_AREAS) s.push({ kind: "area", area });
    s.push({ kind: "topics" });
    if (mode === "first" && canStore) s.push({ kind: "keep" });
    s.push({ kind: "done" });
    return s;
  }, [mode, canStore]);

  const [i, setI] = useState(0);
  const [dir, setDir] = useState<"next" | "back">("next");
  const [newest, setNewest] = useState<string>();
  const screen = screens[i];
  const parts = avatarParts(profile);

  const next = () => {
    setDir("next");
    setI((n) => Math.min(n + 1, screens.length - 1));
  };
  const back = () => {
    setDir("back");
    setI((n) => Math.max(n - 1, 0));
  };

  const answer = (p: Profile, partKey?: string) => {
    setProfile(p);
    setNewest(partKey);
    next();
  };

  const skip = () => {
    if (screen.kind === "area") setProfile(screen.area.facts.reduce((p, f) => skipFact(p, f, OB), profile));
    else if (screen.kind === "town") setProfile({ ...profile, townId: undefined });
    next();
  };

  const showSkip = ["town", "area", "topics"].includes(screen.kind);
  const progress = screens.length > 1 ? i / (screens.length - 1) : 1;

  let body: ReactNode;
  let footer: ReactNode = null;

  switch (screen.kind) {
    case "hello":
      body = (
        <Bubble>
          Your town and state decide things every year that reach your daily life. Let&rsquo;s find the ones that touch you.
        </Bubble>
      );
      footer = (
        <>
          <Button className="w-full" onClick={next}>
            Get started
          </Button>
          <Button variant="text" className="w-full" onClick={() => onFinish(false)}>
            Just show me everything
          </Button>
        </>
      );
      break;

    case "town":
      body = <TownStep profile={profile} setProfile={setProfile} />;
      footer = (
        <Button className="w-full" disabled={!profile.townId} onClick={next}>
          Continue
        </Button>
      );
      break;

    case "area":
      body = (
        <AreaStep
          key={screen.area.id}
          area={screen.area}
          profile={profile}
          onNext={(picked) => answer(answerArea(profile, screen.area.facts, picked, OB), picked.length ? `fact:${picked[picked.length - 1]}` : undefined)}
          onDecline={() => answer(declineArea(profile, screen.area.facts, OB))}
        />
      );
      break;

    case "topics":
      body = <TopicsStep profile={profile} setProfile={(p, k) => (setProfile(p), setNewest(k))} />;
      footer = (
        <Button
          className="w-full"
          onClick={() => {
            setProfile(confirmTopics(profile));
            next();
          }}
        >
          Continue
        </Button>
      );
      break;

    case "keep":
      body = (
        <Bubble sub="It stays in this browser only. Forget me erases it any time.">Want Nine to remember this next time?</Bubble>
      );
      footer = (
        <>
          <Button
            className="w-full"
            onClick={() => {
              onKeep(true);
              next();
            }}
          >
            Keep on this device
          </Button>
          <Button variant="text" className="w-full" onClick={next}>
            Not now
          </Button>
        </>
      );
      break;

    case "done": {
      const m = personalization(profile);
      body = (
        <div className="space-y-6">
          <Bubble>Your feed is ready.</Bubble>
          <div className="space-y-3 rounded-lg bg-surface p-5 shadow-card">
            <Meter m={m} />
            <p className="text-small text-muted-foreground">
              A few narrow questions wait on the cards that use them, with the reason shown there.
            </p>
          </div>
        </div>
      );
      footer = (
        <Button className="w-full" onClick={() => onFinish(true)}>
          Show my decisions
        </Button>
      );
      break;
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col lg:flex-row lg:items-stretch lg:gap-10 lg:px-8 lg:py-8">
      {/* Avatar panel: side on desktop, small strip on mobile */}
      <aside className="hidden lg:flex lg:w-[42%] lg:flex-col lg:items-center lg:justify-center lg:rounded-xl lg:bg-surface lg:shadow-card">
        <Avatar parts={parts} size={280} newest={newest} />
        <p className="mt-6 max-w-64 text-center text-small text-muted-foreground">
          {parts.length ? "Your life profile, drawn from your answers." : "Your avatar gains a part with each answer."}
        </p>
      </aside>

      <section className="flex flex-1 flex-col px-4 pb-4 pt-3 sm:px-6 lg:px-0 lg:py-4">
        <header className="flex h-12 items-center gap-3">
          <button
            type="button"
            onClick={mode === "edit" && i === 0 ? () => onFinish(true) : back}
            aria-label={mode === "edit" && i === 0 ? "Close" : "Back"}
            className={`-ml-2 flex size-12 items-center justify-center rounded-md hover:bg-surface-muted ${FOCUS} ${i === 0 && mode === "first" ? "invisible" : ""}`}
          >
            <Glyph name={mode === "edit" && i === 0 ? "close" : "back"} />
          </button>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
            <div className="h-full rounded-full bg-primary transition-[width] duration-(--duration) ease-nine" style={{ width: `${progress * 100}%` }} />
          </div>
          <span className="sr-only">
            Step {i + 1} of {screens.length}
          </span>
          <button
            type="button"
            onClick={skip}
            className={`min-h-12 rounded-md px-3 text-body font-semibold text-muted-foreground hover:text-foreground ${FOCUS} ${showSkip ? "" : "invisible"}`}
          >
            Skip
          </button>
        </header>

        <div className="flex justify-center pt-4 lg:hidden">
          <Avatar parts={parts} size={screen.kind === "hello" || screen.kind === "done" ? 176 : 120} newest={newest} />
        </div>

        <div key={i} className={`flex-1 pt-6 lg:pt-16 ${dir === "next" ? "animate-slide-next" : "animate-slide-back"}`}>
          {body}
        </div>

        {footer && <footer className="sticky bottom-0 -mx-4 mt-6 space-y-1 bg-background/95 px-4 pb-2 pt-3 backdrop-blur sm:mx-0 sm:px-0">{footer}</footer>}
      </section>
    </div>
  );
}

function Bubble({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className="space-y-3">
      <div className="relative rounded-xl bg-surface p-6 shadow-card">
        <span aria-hidden="true" className="absolute -top-2 left-10 size-4 rotate-45 bg-surface" />
        <p className="text-title">{children}</p>
      </div>
      {sub && <p className="px-2 text-body text-muted-foreground">{sub}</p>}
    </div>
  );
}

function AreaStep({
  area,
  profile,
  onNext,
  onDecline,
}: {
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
        <h1 className="text-title">{area.heading}</h1>
        <p className="text-body font-semibold">Pick all that apply.</p>
        <p className="text-body text-muted-foreground">{area.why}</p>
      </div>
      <div className="grid gap-3">
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
          Next
        </Button>
      </div>
    </div>
  );
}

function Option({ selected, onClick, icon, children }: { selected?: boolean; onClick: () => void; icon?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-h-16 items-center gap-3 rounded-lg border-2 bg-surface px-4 text-left text-body font-semibold shadow-card transition-colors duration-(--duration) ease-nine hover:border-foreground ${FOCUS} ${
        selected ? "border-foreground" : "border-transparent"
      }`}
    >
      {icon && (
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${selected ? "bg-accent text-accent-foreground" : "bg-surface-muted"}`}>
          <Part name={icon} size={22} />
        </span>
      )}
      <span className="flex-1">{children}</span>
      <span
        aria-hidden="true"
        className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
      >
        {selected && <Glyph name="check" size={14} />}
      </span>
    </button>
  );
}

function PreferNot({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`min-h-12 rounded-md px-1 text-body font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline ${FOCUS}`}>
      Prefer not to say
    </button>
  );
}

function TownStep({ profile, setProfile }: { profile: Profile; setProfile: (p: Profile) => void }) {
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
      <div className="space-y-3">
        <h1 className="text-title">What city or town do you live in?</h1>
        <p className="text-body text-muted-foreground">Picks your town&rsquo;s decisions. Stays in your browser.</p>
      </div>
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
            <span className="flex size-6 items-center justify-center rounded-full bg-positive text-on-strong">
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

function TopicsStep({ profile, setProfile }: { profile: Profile; setProfile: (p: Profile, partKey?: string) => void }) {
  const [typed, setTyped] = useState("");
  const suggestions = matchTopics(typed).filter((t) => !profile.topics[t]);
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-title">Pick any subjects you follow.</h1>
        <p className="text-body text-muted-foreground">These add an On your list tag. They never change which questions touch you.</p>
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
              className={`inline-flex min-h-12 items-center gap-2 rounded-full border-2 px-4 text-body font-semibold transition-colors duration-(--duration) ease-nine ${FOCUS} ${
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
