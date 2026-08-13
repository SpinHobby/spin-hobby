export type ShippingMethod = "standard" | "express";

export interface IShippingOption {
  id: ShippingMethod;
  label: string;
  description: string;
  price: number;
}

// Flat-rate tiers, not live carrier rates. Standard becomes free at the
// threshold advertised on the homepage promo ("Free Shipping on Orders
// $75+") - Express is a paid expedited option and is never discounted by
// that promo, matching how most retailers treat rush shipping.
export const FREE_STANDARD_SHIPPING_THRESHOLD = 75;

export const SHIPPING_OPTIONS: IShippingOption[] = [
  {
    id: "standard",
    label: "Standard Shipping",
    description: "5-7 business days",
    price: 8.99,
  },
  {
    id: "express",
    label: "Express Shipping",
    description: "2-3 business days",
    price: 19.99,
  },
];

export function getShippingCost(method: ShippingMethod, subtotal: number): number {
  if (method === "express") {
    return SHIPPING_OPTIONS.find((o) => o.id === "express")!.price;
  }
  if (subtotal >= FREE_STANDARD_SHIPPING_THRESHOLD) return 0;
  return SHIPPING_OPTIONS.find((o) => o.id === "standard")!.price;
}
