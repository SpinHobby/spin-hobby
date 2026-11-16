import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { queryClient } from "../lib/query";
import { storeFormat } from "./format";
import { setShopBackground } from "./photo";
import type { StorefrontLayout } from "./storefront/layout";

export interface StoreConfig {
  /** `test`: a local copy of the shop with no payment keys; checkout completes with a test payment, no money involved. */
  provider: "paypal" | "square" | "test";
  paypalClientId: string | null;
  paypalEnv: "live" | "sandbox";
  squareApplicationId: string | null;
  squareLocationId: string | null;
  squareEnv: "production" | "sandbox";
  shippingStandardCents: number;
  shippingExpressCents: number;
  freeShippingThresholdCents: number;
  handlingDaysMin: number;
  handlingDaysMax: number;
  fxCadUsd: number;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  /** The Shop playlist button's YouTube playlist (null: no button). */
  musicPlaylistId?: string | null;
  /** The shop background behind every transparent product photo (null: plain white). */
  productBackground?: { id: string; url: string } | null;
  /** The storefront layout (Admin > Homepage > Page layout), always complete. */
  layout?: StorefrontLayout;
  /** The storefront's look (Admin > Homepage > Theme); see storefront/themes.ts. */
  theme?: string;
}

/** One saved answer for the whole site (src/lib/query.ts); asked again when it is older than five minutes. */
const storeConfigQuery = {
  queryKey: ["store-config"] as const,
  staleTime: 5 * 60_000,
  queryFn: async (): Promise<StoreConfig> => {
    const c = await api<StoreConfig & { success: true }>("/checkout/config");
    Object.assign(storeFormat, {
      fxCadUsd: Number(c.fxCadUsd) || storeFormat.fxCadUsd,
      handlingDaysMin: c.handlingDaysMin ?? storeFormat.handlingDaysMin,
      handlingDaysMax: c.handlingDaysMax ?? storeFormat.handlingDaysMax,
      freeShippingThresholdCents: c.freeShippingThresholdCents ?? storeFormat.freeShippingThresholdCents,
      shippingStandardCents: c.shippingStandardCents ?? storeFormat.shippingStandardCents,
      paypal: c.provider === "paypal" && !!c.paypalClientId,
    });
    setShopBackground(c.productBackground?.url ?? null);
    return c;
  },
};

/** Loads the public store settings and applies them to shared formatting (`null`: they could not be read). */
export function loadStoreConfig(): Promise<StoreConfig | null> {
  return queryClient.fetchQuery(storeConfigQuery).catch(() => null);
}

/** The store settings: `undefined` while loading, `null` when they could not be read. */
export function useStoreConfigState(): StoreConfig | null | undefined {
  const q = useQuery(storeConfigQuery);
  return q.data ?? (q.isError ? null : undefined);
}

/** Re-renders once settings arrive so money/status copy pick them up (`null` until then). */
export function useStoreConfig() {
  return useStoreConfigState() ?? null;
}

export function freeShippingLabel() {
  const dollars = storeFormat.freeShippingThresholdCents / 100;
  return `$${Number.isInteger(dollars) ? dollars : dollars.toFixed(2)} CAD`;
}
