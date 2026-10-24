"use client";

// Feed photos: loaded once for the whole catalog (never per town), shown on
// update cards with a credit, and filled in by the "Fetch photos" button.
// A card whose photo is missing or fails to load shows no image at all.
import Image from "next/image";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { FeedPhoto } from "@/lib/photos/pick";
import { SECONDARY } from "./updates";
import { FOCUS } from "./ui";

type PhotosState = {
  photos: Map<string, FeedPhoto>;
  configured: boolean;
  setPhotos: (list: FeedPhoto[]) => void;
};

const PhotosContext = createContext<PhotosState>({ photos: new Map(), configured: false, setPhotos: () => {} });

export function PhotosProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<FeedPhoto[]>([]);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/api/photos")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { photos?: FeedPhoto[]; configured?: boolean } | null) => {
        if (!live || !d) return;
        setList(d.photos ?? []);
        setConfigured(Boolean(d.configured));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const setPhotos = useCallback((next: FeedPhoto[]) => setList(next), []);
  const value = useMemo(() => ({ photos: new Map(list.map((p) => [p.key, p])), configured, setPhotos }), [list, configured, setPhotos]);
  return <PhotosContext.Provider value={value}>{children}</PhotosContext.Provider>;
}

/**
 * One entry's photo, or null when there is none or its file failed to load.
 * The card uses it for both the thumbnail and the credit, so they hide together.
 */
export function useEntryPhoto(entryKey: string) {
  const photo = useContext(PhotosContext).photos.get(entryKey);
  const [failed, setFailed] = useState(false);
  return { photo: photo && !failed ? photo : null, onError: () => setFailed(true) };
}

/** A small rounded thumbnail beside the card title. */
export function PhotoThumb({ photo, onError }: { photo: FeedPhoto; onError: () => void }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <span className={`relative block size-18 shrink-0 overflow-hidden rounded-md bg-surface-muted ${loaded ? "" : "animate-pulse"}`}>
      <Image
        src={photo.url}
        alt={photo.alt}
        fill
        unoptimized
        sizes="72px"
        className={`object-cover transition-opacity duration-(--duration) ease-legible ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
        onError={onError}
      />
    </span>
  );
}

export function PhotoCredit({ photo }: { photo: FeedPhoto }) {
  return (
    <p className="mt-2 text-small text-muted-foreground">
      Photo: {photo.contributor} ·{" "}
      <a href={photo.sourceUrl} target="_blank" rel="noreferrer" className={`underline underline-offset-4 ${FOCUS}`}>
        Pixabay
        <span className="sr-only"> (opens the photo&apos;s page)</span>
      </a>
    </p>
  );
}

type Outcome = "added" | "no_result" | "rate_limited" | "error";
type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "success"; added: number; none: number; failed: number }
  | { kind: "error"; message: string };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Fills in photos for items that have none. Items with a photo are skipped on the server. */
export function FetchPhotosButton() {
  const { setPhotos } = useContext(PhotosContext);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const run = async () => {
    setStatus({ kind: "loading" });
    try {
      const res = await fetch("/api/photos", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        photos?: FeedPhoto[];
        results?: { outcome: Outcome }[];
        retryAfter?: number;
        code?: string;
      };
      if (!res.ok) {
        setStatus({ kind: "error", message: data.code === "not_configured" ? "Photos aren't set up on this server yet." : "Couldn't fetch photos. Try again." });
        return;
      }
      if (data.photos) setPhotos(data.photos);
      const results = data.results ?? [];
      const count = (o: Outcome) => results.filter((r) => r.outcome === o).length;
      const added = count("added");
      if (results.length === 0) setStatus({ kind: "empty" });
      else if (data.retryAfter !== undefined)
        setStatus({
          kind: "error",
          message: `Pixabay's limit was reached${added ? ` after ${plural(added, "photo", "photos")}` : ""}. Try again in ${plural(data.retryAfter, "second", "seconds")}.`,
        });
      else if (added === 0 && count("error") > 0) setStatus({ kind: "error", message: "Couldn't fetch photos. Try again." });
      else setStatus({ kind: "success", added, none: count("no_result"), failed: count("error") });
    } catch {
      setStatus({ kind: "error", message: "Couldn't reach the server. Check your connection and try again." });
    }
  };

  let message: string | null = null;
  if (status.kind === "loading") message = "Fetching photos…";
  else if (status.kind === "empty") message = "Every update already has a photo.";
  else if (status.kind === "error") message = status.message;
  else if (status.kind === "success") {
    const parts = [status.added ? `Added ${plural(status.added, "photo", "photos")}.` : "No new photos added."];
    if (status.none) parts.push(`${plural(status.none, "update has", "updates have")} no matching photo.`);
    if (status.failed) parts.push(`${plural(status.failed, "photo", "photos")} couldn't be saved.`);
    message = parts.join(" ");
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <button type="button" onClick={run} disabled={status.kind === "loading"} aria-busy={status.kind === "loading"} className={`${SECONDARY} disabled:opacity-60`}>
        {status.kind === "loading" && <span aria-hidden="true" className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
        Fetch photos
      </button>
      <p role="status" aria-live="polite" className={`text-small ${status.kind === "error" ? "rounded-sm bg-attention-soft px-2 py-0.5 text-foreground" : "text-muted-foreground"}`}>
        {message}
      </p>
    </div>
  );
}
