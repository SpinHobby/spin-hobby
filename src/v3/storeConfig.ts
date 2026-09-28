import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { storeFormat } from "./format";

export interface StoreConfig {
  provider: "paypal" | "square";
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
}

let cached: Promise<StoreConfig | null> | null = null;

/** Loads the public store settings once per page and applies them to shared formatting. */
export function loadStoreConfig() {
  cached ??= api<StoreConfig & { success: true }>("/checkout/config")
    .then((c) => {
      Object.assign(storeFormat, {
        fxCadUsd: Number(c.fxCadUsd) || storeFormat.fxCadUsd,
        handlingDaysMin: c.handlingDaysMin ?? storeFormat.handlingDaysMin,
        handlingDaysMax: c.handlingDaysMax ?? storeFormat.handlingDaysMax,
        freeShippingThresholdCents: c.freeShippingThresholdCents ?? storeFormat.freeShippingThresholdCents,
      });
      return c;
    })
    .catch(() => null);
  return cached;
}

/** Re-renders once settings arrive so money/status copy pick them up. */
export function useStoreConfig() {
  const [config, setConfig] = useState<StoreConfig | null>(null);
  useEffect(() => { let on = true; loadStoreConfig().then((c) => on && setConfig(c)); return () => { on = false; }; }, []);
  return config;
}

export function freeShippingLabel() {
  const dollars = storeFormat.freeShippingThresholdCents / 100;
  return `$${Number.isInteger(dollars) ? dollars : dollars.toFixed(2)}`;
}
