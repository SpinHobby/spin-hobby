// Google OAuth client IDs are meant to be public (they're visible in every
// Sign-In request from the browser regardless) - safe to hardcode like the
// other environment constants (serverUrl, EBAY_STORE_URL) already in this
// codebase, rather than introducing a new frontend env var mechanism.
export const GOOGLE_CLIENT_ID =
  "677543213104-2shi0v6s9k0orbams5qldj61rp5n13sb.apps.googleusercontent.com";

export const DISCORD_CLIENT_ID = "1537311834254876752";
export const DISCORD_REDIRECT_URI =
  process.env.NODE_ENV === "production"
    ? "https://spinhobby.com/auth/discord/callback"
    : "http://localhost:3000/auth/discord/callback";
