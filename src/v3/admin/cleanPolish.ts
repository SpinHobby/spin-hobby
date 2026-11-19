import { useEffect, useState } from "react";

/**
 * How the photo computer polishes a clean product photo (spin-hobby-server photo-job-options.ts, PolishOptions). It decides for each photo
 * whether the box is printed (the character is artwork on the cover) or a window box, bag or blister (the real figure behind plastic):
 * a printed box keeps the cover's art around the character, and a window box becomes the figure alone.
 */
export interface CleanPolish {
  printed: "boxart" | "figure";
  removeText: boolean;
  backdrop: "artwork" | "dark" | "white";
  makerPhotos: boolean;
}

export const DEFAULT_POLISH: CleanPolish = { printed: "boxart", removeText: true, backdrop: "artwork", makerPhotos: true };

const KEY = "spin.admin.cleanPolish";

/** The admin's last choices, remembered on this browser only (a convenience: the defaults are used when nothing is stored). */
export function useCleanPolish(): [CleanPolish, (next: CleanPolish) => void] {
  const [polish, setPolish] = useState<CleanPolish>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<CleanPolish> | null;
      return saved && typeof saved === "object" ? { ...DEFAULT_POLISH, ...saved } : DEFAULT_POLISH;
    } catch {
      return DEFAULT_POLISH;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(polish));
    } catch {
      // private window or storage blocked: the choice lasts until the page is closed
    }
  }, [polish]);
  return [polish, setPolish];
}
