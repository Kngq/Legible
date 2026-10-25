"use client";

// Explore: everything coming up near the person and across Massachusetts, for
// browsing. Same ranked order as Home (buildTimeline with includeOthers), plus
// decided items and the one note on how Legible works. Ballot stories lead the
// page, before the list, as the place to start for anyone new to the ballot. Runs in the browser.
import { useState } from "react";
import type { CivicCard } from "@/lib/engine/civic";
import type { Feed } from "@/lib/engine/feed";
import type { Profile } from "@/lib/engine/profile";
import { buildTimeline } from "@/lib/engine/timeline";
import { Glyph } from "./icons";
import type { SheetView } from "./ProfileSheet";
import { townName } from "./profile-steps";
import { FOCUS } from "./ui";
import { FeedRow, HowItWorks, SECONDARY, UpdateCard } from "./updates";
import { StoriesFeature } from "./wrapped/StoriesEntry";

const SHOWN = 8;

export function Explore({
  feed,
  civic,
  today,
  profile,
  onOpenDoc,
  onOpenMeasure,
  onOpenItem,
  onOpenProfile,
  onOpenStories,
}: {
  feed: Feed;
  civic: CivicCard[];
  today: string;
  profile: Profile;
  /** Kept for callers; the site header now owns the For you tab. */
  onHome?: () => void;
  onOpenDoc: (id: string) => void;
  onOpenMeasure: (docId: string, measureId: string) => void;
  onOpenItem: (id: string) => void;
  onOpenProfile: (v: SheetView) => void;
  /** Opens Ballot stories over Explore. Passed only while the stories are enabled. */
  onOpenStories?: () => void;
}) {
  const [all, setAll] = useState(false);
  const town = townName(profile.townId);
  const entries = buildTimeline(feed.items, civic, today, { includeOthers: true });
  const decided = feed.items.filter((i) => i.status === "decided");
  const noTownDocs = town !== undefined && !feed.items.some((i) => i.scope === "town");
  const cardProps = { today, onOpenItem, onOpenDoc, onOpenMeasure };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 sm:px-6">
      <header className="pt-6 sm:pt-10">
        <h1 className="type-page">Explore</h1>
        <p className="mt-3 text-body text-muted-foreground">
          Deadlines, meetings, and proposals in {town ?? "your area"} and across Massachusetts. Updates that may affect you come first, then the soonest.
        </p>
      </header>

      {/* A story-led way into the ballot, before the full list. */}
      {onOpenStories && <StoriesFeature onOpen={onOpenStories} />}

      <ul className="mt-8 space-y-4">
        {(all ? entries : entries.slice(0, SHOWN)).map((e) => (
          <UpdateCard key={e.key} entry={e} {...cardProps} />
        ))}
      </ul>
      {entries.length > SHOWN && (
        <button type="button" onClick={() => setAll(!all)} aria-expanded={all} className={`mt-4 ${SECONDARY}`}>
          {all ? "Show fewer" : `Show all ${entries.length} updates`}
        </button>
      )}

      {noTownDocs && (
        <p className="mt-6 type-secondary text-muted-foreground">
          <span className="font-semibold text-foreground">More {town} updates are coming.</span> We&apos;re still adding local decisions. For now, you can explore
          important updates across Massachusetts.
        </p>
      )}

      {decided.length > 0 && (
        <details className="group mt-10">
          <summary className={`flex min-h-12 cursor-pointer list-none items-center justify-between rounded-md border border-border px-5 ${FOCUS}`}>
            <span className="text-body font-semibold">
              Already decided <span className="text-muted-foreground">{decided.length}</span>
            </span>
            <span className="transition-transform duration-(--duration) ease-legible group-open:rotate-180">
              <Glyph name="chevron" />
            </span>
          </summary>
          <ul className="mt-2 divide-y divide-border">
            {decided.map((i) => (
              <li key={i.doc.id}>
                <FeedRow item={i} today={today} onOpen={() => onOpenDoc(i.doc.id)} />
              </li>
            ))}
          </ul>
        </details>
      )}

      <HowItWorks onOpenProfile={onOpenProfile} />
    </div>
  );
}
