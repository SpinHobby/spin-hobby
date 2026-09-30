/** True on builds made for the staging site (VITE_APP_ENV=staging, set in netlify.toml). */
export const IS_STAGING = import.meta.env.VITE_APP_ENV === "staging";

/** Keeps staging out of search results and makes its tabs easy to tell apart from the live site. */
export function markStaging() {
  const robots = document.createElement("meta");
  robots.name = "robots";
  robots.content = "noindex, nofollow";
  document.head.appendChild(robots);
  document.title = `[STAGING] ${document.title}`;
}
