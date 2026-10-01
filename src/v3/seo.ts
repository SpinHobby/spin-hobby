import { useEffect } from "react";
import { IS_STAGING } from "../staging";

// Keep in sync with the default used by scripts/generate-seo.mjs.
export const SITE_URL: string =
  import.meta.env.VITE_SITE_URL || (IS_STAGING ? "https://spin-hobby-staging.netlify.app" : "https://spinhobby.com");

export interface DocumentHead {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  noindex?: boolean;
  jsonLd?: object | null;
  /** Set false when a nested page (e.g. a product page) owns the head instead. Default true. */
  enabled?: boolean;
}

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function removeMeta(attr: "name" | "property", key: string) {
  document.head.querySelector(`meta[${attr}="${key}"]`)?.remove();
}

/** Sets per-page title, description, canonical link, Open Graph/Twitter tags and JSON-LD. */
export function useDocumentHead({ title, description, path, image, noindex, jsonLd, enabled = true }: DocumentHead) {
  useEffect(() => {
    if (!enabled) return;
    const prevTitle = document.title;
    const url = `${SITE_URL}${path}`;
    document.title = title;
    upsertMeta("name", "description", description);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:type", image ? "product" : "website");
    upsertMeta("name", "twitter:card", image ? "summary_large_image" : "summary");
    if (image) upsertMeta("property", "og:image", image);
    else removeMeta("property", "og:image");

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = url;

    if (noindex) upsertMeta("name", "robots", "noindex, nofollow");
    else removeMeta("name", "robots");

    let script = document.head.querySelector<HTMLScriptElement>('script[data-seo="jsonld"]');
    if (jsonLd) {
      if (!script) {
        script = document.createElement("script");
        script.type = "application/ld+json";
        script.dataset.seo = "jsonld";
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(jsonLd);
    } else {
      script?.remove();
    }

    return () => { document.title = prevTitle; };
  }, [enabled, title, description, path, image, noindex, jsonLd]);
}
