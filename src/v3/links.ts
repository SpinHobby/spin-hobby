// External links used across the storefront. Override per deploy with Vite env vars.
// NOTE (2026-09-28): the Discord invite below (from the old site code) reports "Invite is expired".
// Replace it with a permanent invite, or set VITE_DISCORD_URL in Netlify.
export const DISCORD_URL: string = import.meta.env.VITE_DISCORD_URL ?? "https://discord.gg/8RM9qPznR";
export const EBAY_URL: string = import.meta.env.VITE_EBAY_URL ?? "https://www.ebay.ca/usr/spin-hobby";
export const SUPPORT_EMAIL: string = import.meta.env.VITE_SUPPORT_EMAIL ?? "support@spinhobby.com";
