import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";

export interface Background { id: string; name: string; imageUrl: string; isDefault: boolean }

/**
 * The shop's own backgrounds for product photos. They are kept in our storage (not Square); a photo from the photo computer comes with the product
 * cut out on a transparent background, and the server places it on the background chosen here before the photo goes to Square.
 */
export function useBackgrounds() {
  const [list, setList] = useState<Background[]>([]);
  const [loaded, setLoaded] = useState(false);
  const reload = useCallback(async () => {
    try { setList((await api<{ backgrounds: Background[] }>("/admin/photo-backgrounds")).backgrounds); }
    catch { /* the pickers just show white */ }
    finally { setLoaded(true); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  return { list, loaded, reload, defaultId: list.find((b) => b.isDefault)?.id ?? null, setList };
}
