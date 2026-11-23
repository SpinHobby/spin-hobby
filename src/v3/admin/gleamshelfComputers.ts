import { useEffect, useState } from "react";
import { api } from "../../lib/api";

/** A connected computer as the shop last heard from it, and what it can do right now. */
export interface GleamshelfComputer {
  id: string;
  label: string;
  lastSeen: string | null;
  online: boolean;
  /** Titles, descriptions and drafts: needs the vision model and web search. */
  canCreateListings: boolean;
  /** The clean product photo model is set up on it. */
  canCleanPhotos?: boolean;
  /** Why it can do less than everything, in its own words. */
  note?: string | null;
  working: number;
}

/** The shop's Gleamshelf computers, asked again every 15 seconds while shown. Null until the first answer. */
export function useGleamshelfComputers(): GleamshelfComputer[] | null {
  const [computers, setComputers] = useState<GleamshelfComputer[] | null>(null);
  useEffect(() => {
    let live = true;
    const load = () =>
      api<{ workers: GleamshelfComputer[] }>("/admin/listing-jobs")
        .then((r) => live && setComputers(r.workers))
        .catch(() => live && setComputers((c) => c ?? []));
    void load();
    const timer = window.setInterval(load, 15000);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, []);
  return computers;
}
