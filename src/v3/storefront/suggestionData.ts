import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { Product } from "../types";

/** Suggestions from the shop's own paid orders (spin-hobby-server: src/modules/catalog/recommendations.service.ts). */

const NONE: Product[] = [];
/** These come from past orders and change slowly: an answer is good for five minutes. */
const FRESH_MS = 5 * 60_000;

/** Items bought in the same orders as `itemId`: up to 3, empty until orders share items. */
export function useBoughtTogether(itemId: string) {
  const { data } = useQuery({
    queryKey: ["products", "bought-together", itemId.toLowerCase()],
    queryFn: async () => (await api<{ items: Product[] }>(`/products/${encodeURIComponent(itemId)}/bought-together`)).items,
    staleTime: FRESH_MS,
  });
  return data ?? NONE;
}

/** Cheap add-ons for a cart (item ids): bought with it first, then the best sellers. Reloads when the cart's items change. */
export function useAddOns(itemIds: string[]) {
  const key = [...new Set(itemIds)].sort().join(",");
  const { data } = useQuery({
    queryKey: ["products", "add-ons", key],
    queryFn: async () => (await api<{ items: Product[] }>(`/products/add-ons?${new URLSearchParams({ ids: key })}`)).items,
    staleTime: FRESH_MS,
    placeholderData: keepPreviousData, // the last picks stay while the cart's new ones load
  });
  return data ?? NONE;
}
