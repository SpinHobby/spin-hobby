import { SUPPORT_EMAIL } from "../../v3/links";
import type { Product } from "../../v3/types";

/** No online price (Square's "variable price" items arrive as 0): shown as "Ask for price" and never sold online (the API refuses it too). */
export const noPrice = (p: Pick<Product, "priceCents">) => !(p.priceCents > 0);

/** An email to the shop about this product, for items with no online price. */
export const askHref = (p: Pick<Product, "name">) => `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Price: ${p.name}`)}`;
