/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Spin Hobby API (NestJS), e.g. https://api.spinhobby.com */
  readonly VITE_API_URL?: string;
  readonly VITE_DISCORD_URL?: string;
  readonly VITE_EBAY_URL?: string;
  readonly VITE_SUPPORT_EMAIL?: string;
  readonly VITE_PAYPAL_CLIENT_ID?: string;
  /** "staging" on the staging site (shows the STAGING badge); unset in production. */
  readonly VITE_APP_ENV?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
