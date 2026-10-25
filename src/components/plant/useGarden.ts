"use client";

// The one garden for every view: the header's garden button, the For you
// plant, and the garden page all read this store, so they always show the same
// stage and water and animate together.
//
// It lives in memory. LegibleApp starts it once the profile is read, and it is
// written to localStorage only while "Remember on this device" is on (never in
// demo mode). Turning Remember off removes the stored copy; the garden stays for
// the rest of the visit.
import { useSyncExternalStore } from "react";
import { earn, emptyGarden, GARDEN_STORAGE_KEY, gardenStage, parseGarden, pour, storedGardenJSON, wear, type AccessoryId, type GardenState, type PourResult, type RewardKind } from "@/lib/garden";
import type { GrowthStage } from "@/lib/growth";

/** The latest reward, for the quiet "+3" by the garden button. `n` counts rewards this visit. */
export type EarnNote = { n: number; drops: number; kind?: RewardKind };

type Snapshot = { ready: boolean; state: GardenState; stage: GrowthStage; persisted: boolean; earned: EarnNote };

const PRERENDER = emptyGarden("1970-01-01");
let snap: Snapshot = { ready: false, state: PRERENDER, stage: 1, persisted: false, earned: { n: 0, drops: 0 } };
let today = "1970-01-01";
let persist = false;
// Demo mode never touches storage, not even to remove.
let demo = false;
const listeners = new Set<() => void>();

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function write() {
  if (!persist) return;
  try {
    storage()?.setItem(GARDEN_STORAGE_KEY, storedGardenJSON(snap.state));
  } catch {
    // Storage full or blocked: keep growing in memory.
  }
}

function set(next: Partial<Snapshot>) {
  const state = next.state ?? snap.state;
  snap = { ...snap, ...next, state, stage: gardenStage(state), persisted: persist };
  write();
  listeners.forEach((l) => l());
}

/**
 * Starts the garden once the profile and preferences are read. With `persist`,
 * a stored garden is read back; otherwise every visit starts fresh.
 */
export function startGarden(opts: { today: string; persist: boolean; demo: boolean }) {
  today = opts.today;
  demo = opts.demo;
  if (snap.ready) return setGardenPersist(opts.persist && !demo);
  persist = opts.persist && !demo;
  let stored: GardenState | null = null;
  if (persist) {
    try {
      stored = parseGarden(storage()?.getItem(GARDEN_STORAGE_KEY) ?? null);
    } catch {}
  }
  set({ ready: true, state: stored ?? emptyGarden(today) });
}

/** Follows "Remember on this device": on writes the garden, off removes the stored copy. */
export function setGardenPersist(on: boolean) {
  if (on === persist) return;
  persist = on;
  if (!on && !demo) {
    try {
      storage()?.removeItem(GARDEN_STORAGE_KEY);
    } catch {}
  }
  set({});
}

/** Pays a reward once per page. Returns the drops earned (0 if paid before or not started). */
export function rewardGarden(kind: RewardKind, id: string): number {
  if (!snap.ready) return 0;
  const r = earn(snap.state, kind, id);
  if (r.drops) set({ state: r.state, earned: { n: snap.earned.n + 1, drops: r.drops, kind } });
  return r.drops;
}

/** Pours up to `n` drops. */
export function waterGarden(n: number): PourResult {
  const r = pour(snap.state, n, today);
  if (r.poured) set({ state: r.state });
  return r;
}

/** The latest state, for event handlers that run between renders. */
export function gardenNow(): GardenState {
  return snap.state;
}

/** Puts on an accessory (or "none"); a locked one changes nothing. */
export function wearAccessory(id: AccessoryId) {
  const next = wear(snap.state, id);
  if (next !== snap.state) set({ state: next });
}

export function finishGardenIntro() {
  if (!snap.state.introDone) set({ state: { ...snap.state, introDone: true } });
}

/** "Clear my information": the garden goes too, back to a new seed. */
export function resetGarden() {
  if (!demo) {
    try {
      storage()?.removeItem(GARDEN_STORAGE_KEY);
    } catch {}
  }
  set({ state: emptyGarden(today), earned: { n: 0, drops: 0 } });
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const serverSnap = snap;

export function useGarden(): Snapshot {
  return useSyncExternalStore(
    subscribe,
    () => snap,
    () => serverSnap,
  );
}
