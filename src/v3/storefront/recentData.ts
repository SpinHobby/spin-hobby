import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { Product } from "../types";

/**
 * Products this shopper opened lately, newest first. Kept only in their own browser (nothing is sent anywhere until a list is shown,
 * and then only the product ids, to get current prices and stock); "Clear" forgets them.
 */
const KEY = "spinhobby-recently-viewed";
const MAX = 12;
const CHANGED = "spinhobby-recently-viewed";

function readIds(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown;
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}
function writeIds(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* private window or storage full: the list just isn't kept */
  }
  window.dispatchEvent(new Event(CHANGED));
}

/** Called when a product page opens. */
export function rememberViewed(id: string) {
  const ids = readIds();
  if (ids[0] === id) return;
  writeIds([id, ...ids.filter((x) => x !== id)].slice(0, MAX));
}

export function clearViewed() {
  writeIds([]);
}

/** The shopper's recently viewed products with today's price and stock (`exclude`: the product on screen). Empty when there are none. */
export function useRecentlyViewed(exclude?: string) {
  const [ids, setIds] = useState(readIds);
  useEffect(() => {
    const update = () => setIds(readIds());
    window.addEventListener(CHANGED, update);
    window.addEventListener("storage", update); // another tab
    return () => {
      window.removeEventListener(CHANGED, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  const wanted = ids.filter((id) => id.toLowerCase() !== exclude?.toLowerCase());
  const key = wanted.join(",");
  // A row already shown (Back from a product) is there at once, so the page below it doesn't jump when it arrives.
  const { data } = useQuery({
    queryKey: ["products", "viewed", key],
    enabled: !!key,
    placeholderData: keepPreviousData, // the row stays as it was while its new answer is on the way
    queryFn: async () => {
      const r = await api<{ items: Product[] }>(`/products?${new URLSearchParams({ ids: key, limit: String(MAX) })}`);
      const byId = new Map(r.items.map((p) => [p.id.toLowerCase(), p]));
      // newest first, as remembered; products no longer for sale drop out
      return key.split(",").flatMap((id) => byId.get(id.toLowerCase()) ?? []);
    },
  });
  return key && data ? data : NONE;
}
const NONE: Product[] = [];
