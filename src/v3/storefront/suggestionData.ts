import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { Product } from "../types";

/** Suggestions from the shop's own paid orders (spin-hobby-server: src/modules/catalog/recommendations.service.ts). */

/** Items bought in the same orders as `itemId`: up to 3, empty until orders share items. */
export function useBoughtTogether(itemId: string) {
  const [items, setItems] = useState<Product[]>([]);
  useEffect(() => {
    let live = true;
    setItems([]);
    api<{ items: Product[] }>(`/products/${encodeURIComponent(itemId)}/bought-together`)
      .then((r) => live && setItems(r.items))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [itemId]);
  return items;
}

/** Cheap add-ons for a cart (item ids): bought with it first, then the best sellers. Reloads when the cart's items change. */
export function useAddOns(itemIds: string[]) {
  const key = [...new Set(itemIds)].sort().join(",");
  const [items, setItems] = useState<Product[]>([]);
  useEffect(() => {
    let live = true;
    api<{ items: Product[] }>(`/products/add-ons?${new URLSearchParams({ ids: key })}`)
      .then((r) => live && setItems(r.items))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [key]);
  return items;
}
