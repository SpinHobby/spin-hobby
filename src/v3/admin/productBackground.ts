import { useEffect, useState } from "react";
import { api } from "../../lib/api";

/** A product's own choice: the shop background, white, one of the library, or its box art. `null`: no choice, the shop's rule decides. */
export type BackgroundMode = "shop" | "white" | "library" | "box_art";
export type BackgroundRule = "shop" | "box_art";

export interface ProductBackground {
  mode: BackgroundMode | null;
  backgroundId: string | null;
  boxArtUrl: string | null;
  rule: BackgroundRule;
  /** What its transparent photos show on now: its own (`url`, null for white) or the shop background. */
  shows: { own: boolean; url: string | null };
}

/** One product's background, loaded for its Photos section. */
export function useProductBackground(itemId: string) {
  const [state, setState] = useState<ProductBackground | null>(null);
  useEffect(() => {
    let current = true;
    api<{ background: ProductBackground }>(`/admin/products/${encodeURIComponent(itemId)}/background`)
      .then((r) => current && setState(r.background))
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [itemId]);
  return [state, setState] as const;
}
