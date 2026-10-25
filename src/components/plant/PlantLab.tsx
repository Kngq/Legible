"use client";

// Dev preview for the plant, laid out like design-references/garden-concept.png
// so the two can be compared: the five stages, the five expressions, the four
// accessories, and every reaction on demand. The stage here is local to this
// page; the real garden is untouched.
import { useState } from "react";
import { ACCESSORIES, type AccessoryId } from "@/lib/garden";
import type { GrowthStage } from "@/lib/growth";
import { Button } from "../ui";
import { CivicPlant, EXPRESSIONS, STAGES, type Expression, type PlantSignal } from "./CivicPlant";

const chip = (on: boolean) => `min-h-10 rounded-full px-4 text-small font-semibold ${on ? "bg-foreground text-background" : "bg-surface-muted"}`;

export function PlantLab() {
  const [stage, setStage] = useState<GrowthStage>(3);
  const [accessory, setAccessory] = useState<AccessoryId>("none");
  const [expression, setExpression] = useState<Expression | undefined>(undefined);
  const [signal, setSignal] = useState<Required<PlantSignal>>({ tap: 0, milestone: 0, drop: 0, surprise: 0, shake: 0, brace: 0 });
  const [pouring, setPouring] = useState(false);
  const bump = (k: keyof PlantSignal) => setSignal((v) => ({ ...v, [k]: v[k] + 1 }));

  const grow = () => setStage((s) => (s === 5 ? 1 : ((s + 1) as GrowthStage)));
  const replayGrowth = () => {
    if (stage === 1) return setStage(2);
    const target = stage;
    setStage((target - 1) as GrowthStage);
    setTimeout(() => setStage(target), 60);
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <p className="text-small font-semibold uppercase tracking-wide text-muted-foreground">Development preview</p>
      <h1 className="mt-1 font-display text-headline">Your plant</h1>
      <p className="mt-2 max-w-prose text-body text-muted-foreground">Hover to lean, click to tap. Nothing here touches your garden.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_minmax(0,22rem)]">
        <section aria-label="Controls" className="rounded-lg bg-surface p-5 shadow-card">
          <div className="flex justify-center py-4">
            <CivicPlant stage={stage} size={200} signal={signal} pouring={pouring} accessory={accessory} expression={expression} lively className="cursor-pointer select-none" />
          </div>
          <div role="radiogroup" aria-label="Stage" className="mt-2 flex flex-wrap justify-center gap-2">
            {STAGES.map((s) => (
              <button key={s.stage} type="button" role="radio" aria-checked={stage === s.stage} onClick={() => setStage(s.stage)} className={chip(stage === s.stage)}>
                {s.stage}. {s.name}
              </button>
            ))}
          </div>
          <div role="radiogroup" aria-label="Accessory" className="mt-2 flex flex-wrap justify-center gap-2">
            {ACCESSORIES.map((a) => (
              <button key={a.id} type="button" role="radio" aria-checked={accessory === a.id} onClick={() => setAccessory(a.id)} className={chip(accessory === a.id)}>
                {a.name}
              </button>
            ))}
          </div>
          <div role="radiogroup" aria-label="Expression" className="mt-2 flex flex-wrap justify-center gap-2">
            <button type="button" role="radio" aria-checked={!expression} onClick={() => setExpression(undefined)} className={chip(!expression)}>
              Live
            </button>
            {EXPRESSIONS.map((e) => (
              <button key={e} type="button" role="radio" aria-checked={expression === e} onClick={() => setExpression(e)} className={chip(expression === e)}>
                {e}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button variant="secondary" className="min-h-10! px-4" onClick={() => bump("tap")}>
              Tap
            </Button>
            <Button variant="secondary" className="min-h-10! px-4" onClick={grow}>
              {stage === 5 ? "Reset to seed" : "Grow one stage"}
            </Button>
            <Button variant="secondary" className="min-h-10! px-4" onClick={replayGrowth}>
              Replay growth
            </Button>
            <Button variant="secondary" className="min-h-10! px-4" onClick={() => bump("milestone")}>
              Milestone
            </Button>
            <Button variant="secondary" className="min-h-10! px-4" onClick={() => bump("drop")}>
              Drop
            </Button>
            <Button variant="secondary" className="min-h-10! px-4" onClick={() => bump("surprise")}>
              Surprise
            </Button>
            <Button variant="secondary" className="min-h-10! px-4" aria-pressed={pouring} onClick={() => setPouring((p) => !p)}>
              {pouring ? "Stop pouring" : "Pouring"}
            </Button>
          </div>
        </section>

        <section aria-label="Sizes" className="rounded-lg bg-surface p-5 shadow-card">
          <h2 className="text-body font-semibold">Sizes</h2>
          <div className="mt-3 flex items-end justify-around">
            {[120, 64, 34].map((w) => (
              <div key={w} className="flex flex-col items-center gap-2">
                <CivicPlant stage={stage} size={w} accessory={accessory} still />
                <span className="text-small text-muted-foreground">{w}px</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Row title="Growth stages">
        {STAGES.map((s) => (
          <Cell key={s.stage} label={`${s.stage}. ${s.name}`}>
            <CivicPlant stage={s.stage} size={110} still />
          </Cell>
        ))}
      </Row>
      <Row title="Expressions">
        {EXPRESSIONS.map((e) => (
          <Cell key={e} label={e}>
            <CivicPlant stage={2} size={110} expression={e} still />
          </Cell>
        ))}
      </Row>
      <Row title="Accessories">
        {ACCESSORIES.map((a) => (
          <Cell key={a.id} label={a.name}>
            <CivicPlant stage={a.id === "scarf" ? 5 : 3} size={110} accessory={a.id} still />
          </Cell>
        ))}
      </Row>
      <Row title="Accessories at every stage">
        {(["glasses", "bow", "hat", "scarf"] as AccessoryId[]).flatMap((a) =>
          STAGES.map((s) => (
            <Cell key={`${a}-${s.stage}`} label={`${a} ${s.stage}`}>
              <CivicPlant stage={s.stage} size={80} accessory={a} still />
            </Cell>
          )),
        )}
      </Row>
    </main>
  );
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="mt-6 rounded-lg bg-surface p-5 shadow-card">
      <h2 className="text-body font-semibold">{title}</h2>
      <ol className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">{children}</ol>
    </section>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-col items-center gap-2">
      {children}
      <span className="text-small font-semibold capitalize">{label}</span>
    </li>
  );
}
