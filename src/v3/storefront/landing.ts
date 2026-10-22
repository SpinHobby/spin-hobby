// The shop's landing pages: one address per section (/figures), category (/category/scale-figures) and series (/series/re-zero),
// each with its own heading, intro and Google title, so search engines have a page to rank for "anime figures Canada" or
// "Frieren merch". The same addresses and copy are written as static pages at build time (scripts/generate-seo.mjs).
import copy from "../../seo/sections.json";
import { freeShippingLabel } from "../storeConfig";
import { SITE_URL } from "../seo";
import type { CategoryTree } from "../categoryTree";
import { slugify, type NavKey } from "./data";

export interface LandingCopy {
  h1: string;
  title: string;
  description: string;
  intro: string;
  crumbs: { name: string; path: string }[];
  /** The address search engines should treat as the original, when another page covers the same thing. */
  canonical?: string;
}
interface SectionCopy {
  nav: NavKey;
  path: string;
  h1: string;
  title: string;
  description: string;
  intro: string;
}

const fill = (text: string) => text.replace(/\{freeShipping\}/g, freeShippingLabel());
export const SECTIONS = copy.sections as SectionCopy[];
const byNav = new Map(SECTIONS.map((s) => [s.nav, s]));
const byPath = new Map(SECTIONS.map((s) => [s.path, s]));

export function homeCopy() {
  return { h1: copy.home.h1, title: copy.home.title, description: fill(copy.home.description), intro: copy.home.intro };
}

/** The address of a menu section ("Figures" → /figures; Home → /). */
export const sectionPath = (nav: NavKey) => byNav.get(nav)?.path ?? "/";
export const categoryPath = (tree: CategoryTree, id: string) => `/category/${slugify(tree.path(id).join(" "))}`;
export const seriesPath = (series: string) => `/series/${slugify(series)}`;

export type Landing =
  { kind: "section"; nav: NavKey; path: string } | { kind: "category"; slug: string } | { kind: "series"; slug: string };

export function landingFromPath(pathname: string): Landing | null {
  // the build writes these pages as files (figures.html), so the .html form of an address can turn up in links too
  const path = pathname.replace(/\.html$/, "").replace(/\/+$/, "") || "/";
  const section = byPath.get(path);
  if (section) return { kind: "section", nav: section.nav, path };
  const m = /^\/(category|series)\/([^/]+)$/.exec(path);
  if (m) return { kind: m[1] as "category" | "series", slug: decodeURIComponent(m[2]).toLowerCase() };
  return null;
}

export function categoryBySlug(tree: CategoryTree, slug: string) {
  return tree.flat.find((n) => slugify(tree.path(n.id).join(" ")) === slug) ?? null;
}

/** A readable name from an address, until a product tells us the real spelling. */
export const titleFromSlug = (slug: string) =>
  slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export function sectionCopy(nav: NavKey): LandingCopy | null {
  const s = byNav.get(nav);
  if (!s) return null;
  return { h1: s.h1, title: s.title, description: fill(s.description), intro: fill(s.intro), crumbs: [{ name: s.h1, path: s.path }] };
}

export function categoryCopy(tree: CategoryTree, id: string): LandingCopy {
  const names = tree.path(id);
  const name = names[names.length - 1] ?? "Category";
  const ids: string[] = [];
  for (let at = tree.byId.get(id); at; at = at.parentId ? tree.byId.get(at.parentId) : undefined) ids.unshift(at.id);
  return {
    h1: name,
    title: `${name} | Authentic Anime ${name} in Canada | Spin Hobby`,
    description: `Shop authentic, officially licensed anime ${name.toLowerCase()} at Spin Hobby, a Canadian anime shop. Shipped across Canada & the US, free shipping over ${freeShippingLabel()}.`,
    intro: `Authentic, officially licensed ${name.toLowerCase()} from your favourite anime and games. Every item is genuine and new, priced in Canadian dollars and shipped with tracking across Canada and the US.`,
    crumbs: ids.map((cid) => ({ name: tree.byId.get(cid)!.name, path: categoryPath(tree, cid) })),
    canonical: sectionTwin(tree, id),
  };
}

/**
 * A top-level category named like a menu section ("Figures") would compete with /figures for the same searches. The section page
 * (which gathers every figure, whatever its category) is the one to rank. Keep in sync with scripts/generate-seo.mjs.
 */
export function sectionTwin(tree: CategoryTree, id: string) {
  const node = tree.byId.get(id);
  if (!node || node.parentId) return undefined;
  return SECTIONS.find((s) => s.path === `/${slugify(node.name)}`)?.path;
}

export function seriesCopy(series: string, slug: string): LandingCopy {
  return {
    h1: `${series} merch`,
    title: `${series} Merch & Figures in Canada | Spin Hobby`,
    description: `Official ${series} figures, plushies and goods at Spin Hobby, a Canadian anime shop. Authentic and licensed, free shipping over ${freeShippingLabel()}.`,
    intro: `Official ${series} merchandise: figures, plushies, acrylic stands, keychains and more, depending on what's in stock. Every item is authentic and officially licensed, priced in Canadian dollars and shipped across Canada and the US.`,
    crumbs: [{ name: `${series} merch`, path: `/series/${slug}` }],
  };
}

/** Breadcrumbs for Google (shown under the result instead of the bare address). */
export function breadcrumbJsonLd(crumbs: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Shop", path: "/" }, ...crumbs].map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${SITE_URL}${c.path}`,
    })),
  };
}
