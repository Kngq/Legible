// Screens that hide the Ask Kiro launcher while they are up. "always" for first
// run (Kiro is not part of getting started); "narrow" for full-width sheets on a
// phone, whose footers the launcher would cover. Counters, so overlapping
// screens cannot unhide it early. The dock stays mounted, so a conversation
// survives being hidden. Browser only.
export type DockHide = "always" | "narrow";

const count: Record<DockHide, number> = { always: 0, narrow: 0 };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Hide the launcher; returns the release, shaped for a useEffect cleanup. */
export function hideChatDock(how: DockHide = "always"): () => void {
  count[how] += 1;
  emit();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    count[how] -= 1;
    emit();
  };
}

export function subscribeChatDock(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** The strongest hide in force, or null when the launcher shows everywhere. */
export const chatDockHidden = (): DockHide | null => (count.always > 0 ? "always" : count.narrow > 0 ? "narrow" : null);
