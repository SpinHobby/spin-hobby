import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
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
  const q = text.trim();
  // the pause after the last key; text typed before (a letter deleted again) has its answer already and needs no pause
  const [paused, setPaused] = useState(q);
  useEffect(() => {
    const timer = window.setTimeout(() => setPaused(q), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [q]);
  const client = useQueryClient();
  const seen = client.getQueryData(suggestKey(q)) !== undefined;
  const asked = seen ? q : paused;
  const wanted = enabled && asked.length >= MIN_CHARS;
  const answer = useQuery({
    queryKey: suggestKey(asked),
    enabled: wanted,
    staleTime: 60_000,
    queryFn: () => api<SearchSuggestions>(`/products/suggest?q=${encodeURIComponent(asked)}`).catch(() => EMPTY),
    placeholderData: keepPreviousData,
  });
  const ready = q.length >= MIN_CHARS && !!answer.data;
  return { data: ready && answer.data ? answer.data : EMPTY, loading: ready && (asked !== q || answer.isPlaceholderData) };
}
const suggestKey = (q: string) => ["products", "suggest", q.toLowerCase()] as const;

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
