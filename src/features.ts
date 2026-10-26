// Features that are on in some places and off in others. One line per feature, saying where it is on: "local" (npm run dev on your own
// computer), "staging" (spin-hobby-staging.netlify.app) or "production" (spinhobby.com). To turn a feature on or off somewhere, change its
// line here and deploy. No environment variables.

import { IS_STAGING } from "./staging";

export type Environment = "local" | "staging" | "production";

/** Where this copy of the site is running. */
export const ENVIRONMENT: Environment = import.meta.env.DEV ? "local" : IS_STAGING ? "staging" : "production";

const FEATURES = {
  /** "eBay store" links across the storefront: off on the live site until the eBay store is connected and kept in step with the shop. */
  ebayStore: { local: true, staging: true, production: false },
  /** /ui-kit: the shared building blocks (src/components) shown live, for whoever builds a new page. Not for shoppers. */
  uiKit: { local: true, staging: true, production: false },
  /** /account (a shopper's own page: orders, wishlist...) and the "Your Account" link in the account menu: still being built. */
  account: { local: true, staging: false, production: false },
} satisfies Record<string, Record<Environment, boolean>>;

/** Whether a feature is on where this copy of the site is running. */
export const isOn = (feature: keyof typeof FEATURES): boolean => FEATURES[feature][ENVIRONMENT];
