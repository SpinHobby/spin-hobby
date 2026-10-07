// Mirrors design_handoff_spinhobby_storefront/shared/api-types.ts and the
// Supabase `store-api` edge function responses.

export type ProductStatus = "in" | "low" | "pre" | "out";
export type SortKey = "new" | "release" | "price_asc" | "price_desc" | "pop";
export type Availability = "auto" | "preorder" | "backorder" | "hidden";

export interface Product {
  id: string;
  variationId: string;
  name: string;
  series: string | null;
  character: string | null;
  category: string | null;
  categoryId?: string | null;
  images: string[];
  priceCents: number;
  compareAtCents: number | null;
  currency: "CAD";
  status: ProductStatus | "closed" | string;
  stockCount: number | null;
  releaseMonth: string | null;
  orderByDate: string | null;
  rank: number | null;
  maxPerCustomer: number | null;
  createdAt?: string | null;
  // Admin-only enrichments (present on /admin/products).
  janCode?: string | null;
  availability?: Availability | null;
  isFeatured?: boolean;
  sortOrder?: number;
  source?: "square" | "manual";
  description?: string | null;
  alertsWaiting?: number;
  // Admin catalog list (/admin/catalog) only.
  state?: AdminState;
  manufacturer?: string | null;
  isActive?: boolean;
  isVisible?: boolean;
  sellable?: boolean;
  sku?: string | null;
  variationCount?: number;
  variations?: ProductVariation[];
  updatedAt?: string | null;
  syncedAt?: string | null;
}

/** What an admin sees an item as: the storefront status, or why shoppers can't see/buy it. */
export type AdminState = "in" | "low" | "out" | "pre" | "closed" | "unavailable" | "hidden" | "retired";

export interface ProductVariation {
  id: string;
  name: string | null;
  sku: string | null;
  priceCents: number;
  sellable: boolean;
  stockCount: number | null;
  isDefault: boolean;
}

export interface ProductPage { success: true; items: Product[]; cursor?: string; total: number }

export interface HeroSlide {
  id: string;
  headline: string;
  subheading: string | null;
  image_url: string | null;
  link_url: string | null;
  sort_order: number;
  is_visible: boolean;
}

export interface StoreEvent {
  id: string;
  name: string;
  city: string | null;
  start_date: string | null;
  end_date: string | null;
  booth_info: string | null;
  is_visible: boolean;
  sort_order: number;
}

export interface ShopCategory {
  id: string;
  parentId: string | null;
  name: string;
  sortOrder: number;
  isVisible?: boolean;     // admin only
  productCount?: number;   // admin only: products directly in this category
}

export interface Homepage {
  success: true;
  slides: HeroSlide[];
  featuredItems: Product[];
  preorders: Product[];
  ranking: Product[];
  newInStock: Product[];
  events: StoreEvent[];
  categories?: ShopCategory[];
}

export type Role = "customer" | "staff" | "owner";
export interface AppUser { id: string; email: string; role: Role; firstName?: string | null }

export type OrderStatus = "pending" | "paid" | "preorder_reserved" | "fulfilled" | "shipped" | "cancelled" | "refunded";

export interface OrderItem {
  id: number;
  square_item_id: string;
  square_variation_id: string;
  name: string;
  image_url: string | null;
  unit_price_cents: number;
  quantity: number;
  is_preorder: boolean;
}

export interface Address {
  firstName?: string; lastName?: string; name?: { first?: string; last?: string };
  address1?: string; address2?: string; address?: { primary?: string; secondary?: string };
  city?: string; province?: string; postalCode?: string; country?: string; phone?: string;
}

export interface Order {
  id: number;
  status: OrderStatus;
  provider: "paypal" | "square";
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  shipping_method: "standard" | "express";
  tracking_number: string | null;
  carrier: string | null;
  shipped_at: string | null;
  billing_email: string;
  billing_address?: Address | null;
  shipping_address?: Address | null;
  created_at: string;
  order_items?: OrderItem[];
}

export interface Dashboard {
  success: true;
  salesTodayCents: number;
  toShip: number;
  oldestToShipDays: number;
  openPreorders: number;
  preorderProducts?: number;
  ordersToday?: number;
  reservedUnits: number;
  lowStock: number;
  alertsWaiting: number;
  toShipList: Pick<Order, "id" | "billing_email" | "total_cents" | "status" | "created_at">[];
  lowStockList: { id: string; name: string; variation_id: string; stock_count: number | null; status: string; order_by_date: string | null }[];
  closingPreorders: { id: string; name: string; variation_id: string; stock_count: number | null; status: string; order_by_date: string | null }[];
}

export interface StoreSettings {
  payment_provider: "paypal" | "square";
  shipping_standard_cents: number;
  shipping_express_cents: number;
  free_shipping_threshold_cents: number;
  low_stock_threshold: number;
  fx_cad_usd: number;
  handling_days_min: number;
  handling_days_max: number;
  maintenance_mode: boolean;
  maintenance_message: string | null;
}

export interface Readiness {
  appAndLocationConnected: boolean;
  catalogAndInventorySyncing: boolean;
  webhookKeySet: boolean;
  /** Square is in live mode, so real cards are charged (false means the sandbox). */
  liveMode: boolean;
  threeDSecureEnabled: boolean;
  activeProvider?: "paypal" | "square";
  lastSyncAt: string | null;
}
