import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export interface SeriesOption { id: string; name: string; aliases: string[]; productCount: number }

/** "Re:Zero", "re zero" and "ReZero" are the same series. */
export const seriesKey = (name: string) => name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

/** The series the name already is, by name or alias (the same series spelled differently counts). */
export const findSeries = (name: string, list: SeriesOption[]) => {
  const k = seriesKey(name);
  return k ? list.find((s) => seriesKey(s.name) === k || s.aliases.some((a) => seriesKey(a) === k)) : undefined;
};

const distance = (a: string, b: string) => {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const keep = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = keep;
    }
  }
  return row[b.length]!;
};

/** Existing series that a new name is probably another spelling of ("Kantai Collection" and "KanColle", "Date A Live V" and "Date A Live"), closest first. Empty when the name already is a series. */
export function similarSeries(name: string, list: SeriesOption[], max = 3): SeriesOption[] {
  const k = seriesKey(name);
  if (k.length < 3 || findSeries(name, list)) return [];
  const score = (s: SeriesOption) => Math.max(...[s.name, ...s.aliases].map(seriesKey).filter((x) => x.length >= 3).map((x) => {
    if (x.length >= 4 && k.length >= 4 && (x.includes(k) || k.includes(x))) return 0.9;
    return 1 - distance(k, x) / Math.max(k.length, x.length);
  }), 0);
  return list.map((s) => ({ s, v: score(s) })).filter((x) => x.v >= 0.7).sort((a, b) => b.v - a.v).slice(0, max).map((x) => x.s);
}

/** The list of series for dropdowns and filters. `reload` re-reads it (after a new one may have been added). */
export function useSeriesList(refreshOn?: unknown) {
  const [list, setList] = useState<SeriesOption[]>([]);
  const [loaded, setLoaded] = useState(false);
  const reload = () => api<{ series: SeriesOption[] }>("/admin/series").then((r) => { setList(r.series); setLoaded(true); }).catch(() => setLoaded(true));
  useEffect(() => { void reload(); }, [refreshOn]);
  return { list, loaded, reload };
}

