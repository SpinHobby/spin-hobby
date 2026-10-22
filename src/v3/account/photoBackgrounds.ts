import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";

export interface Background { id: string; name: string; imageUrl: string; isDefault: boolean }
/** How many product photos are transparent (shown on the shop background), and how many older ones have a background baked in. */
export interface PhotoCounts { transparent: number; older: number }

/**
 * The shop's own backgrounds for product photos, kept in our storage (not Square). The one in use (the default) is the shop background: a photo from
 * the photo computer is saved transparent, and the website shows every such photo on it, so changing it changes every product at once.
 */
export function useBackgrounds() {
  const [list, setList] = useState<Background[]>([]);
  const [photos, setPhotos] = useState<PhotoCounts>({ transparent: 0, older: 0 });
  const [loaded, setLoaded] = useState(false);
  const reload = useCallback(async () => {
    try {
      const r = await api<{ backgrounds: Background[]; photos?: PhotoCounts }>("/admin/photo-backgrounds");
      setList(r.backgrounds);
      if (r.photos) setPhotos(r.photos);
    }
    catch { /* the previews just show white */ }
    finally { setLoaded(true); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  const shop = list.find((b) => b.isDefault) ?? null;
  return { list, photos, loaded, reload, shop, defaultId: shop?.id ?? null, setList };
}
