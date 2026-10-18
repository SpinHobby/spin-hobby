// External links used across the storefront. Override per deploy with Vite env vars.
export const DISCORD_URL: string = import.meta.env.VITE_DISCORD_URL ?? "https://discord.gg/7wGWc7AGcd";
export const INSTAGRAM_URL: string = import.meta.env.VITE_INSTAGRAM_URL ?? "https://www.instagram.com/spinhobby";
export const EBAY_URL: string = import.meta.env.VITE_EBAY_URL ?? "https://www.ebay.ca/usr/spin-hobby";
// Feature flag: the "eBay store" links. Hidden on the live site until the eBay store is connected and kept in step with the shop; shown on
// staging (VITE_APP_ENV=staging) and when running locally. VITE_SHOW_EBAY_STORE=true or false at build time overrides either way.
const ebayFlag = import.meta.env.VITE_SHOW_EBAY_STORE;
export const SHOW_EBAY_STORE: boolean =
  ebayFlag === "true" || (ebayFlag !== "false" && (import.meta.env.DEV || import.meta.env.VITE_APP_ENV === "staging"));
export const SUPPORT_EMAIL: string = import.meta.env.VITE_SUPPORT_EMAIL ?? "info@spinhobby.com";
