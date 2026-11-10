import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { Product } from "../types";

/** What GET /products/suggest returns while someone types. */
export interface SearchSuggestions {
  products: Product[];
  series: { name: string; slug: string; count: number }[];
  categories: { id: string; name: string }[];
}

const EMPTY: SearchSuggestions = { products: [], series: [], categories: [] };
/** Letters typed before suggestions appear, and the pause after the last key before asking the server. */
const MIN_CHARS = 2;
const DEBOUNCE_MS = 140;

/** Suggestions for the text in the search box (nothing for one letter). Keeps the last answer while the next one loads. */
export function useSearchSuggest(text: string, enabled: boolean) {
  const [state, setState] = useState<{ for: string; data: SearchSuggestions }>({ for: "", data: EMPTY });
  const q = text.trim();
  useEffect(() => {
    if (!enabled || q.length < MIN_CHARS) return;
    let on = true;
    const timer = window.setTimeout(() => {
      api<SearchSuggestions>(`/products/suggest?q=${encodeURIComponent(q)}`)
        .then((data) => on && setState({ for: q, data }))
        .catch(() => on && setState({ for: q, data: EMPTY }));
    }, DEBOUNCE_MS);
    return () => {
      on = false;
      window.clearTimeout(timer);
    };
  }, [q, enabled]);
  const ready = q.length >= MIN_CHARS && !!state.for;
  return { data: ready ? state.data : EMPTY, loading: ready && state.for !== q };
}

// ---------------------------------------------------------------- recent searches (this device only)
const RECENT_KEY = "spinhobby-recent-searches";
const RECENT_MAX = 6;

export function recentSearches(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(list) ? list.filter((s): s is string => typeof s === "string").slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

/** Puts a search at the top of this device's recent searches (no duplicates, whatever the case). */
export function rememberSearch(text: string) {
  const q = text.trim().slice(0, 100);
  if (!q) return;
  try {
    const next = [q, ...recentSearches().filter((s) => s.toLowerCase() !== q.toLowerCase())].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* private window: nothing remembered */
  }
}

export function clearRecentSearches() {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    /* nothing to clear */
  }
}
