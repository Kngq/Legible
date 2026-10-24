import type { Personalization } from "@/lib/engine/personalization";

export function Meter({ m, compact = false }: { m: Personalization; compact?: boolean }) {
  const label = m.percent === 100 ? "Every decision in your feed is sorted for you." : `Your feed is ${m.percent}% sorted for you.`;
  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-surface-muted"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={m.percent}
        aria-label="How much of your feed is sorted"
      >
        <div className="h-full rounded-full bg-accent transition-[width] duration-(--duration) ease-nine" style={{ width: `${m.percent}%` }} />
      </div>
      <p className="text-small text-muted-foreground">{label}</p>
    </div>
  );
}
