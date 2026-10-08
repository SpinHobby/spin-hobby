import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export interface SeriesOption { id: string; name: string; aliases: string[]; productCount: number }

/** "Re:Zero", "re zero" and "ReZero" are the same series. */
export const seriesKey = (name: string) => name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

/** The list of series for dropdowns and filters. `reload` re-reads it (after a new one may have been added). */
export function useSeriesList(refreshOn?: unknown) {
  const [list, setList] = useState<SeriesOption[]>([]);
  const [loaded, setLoaded] = useState(false);
  const reload = () => api<{ series: SeriesOption[] }>("/admin/series").then((r) => { setList(r.series); setLoaded(true); }).catch(() => setLoaded(true));
  useEffect(() => { void reload(); }, [refreshOn]);
  return { list, loaded, reload };
}

