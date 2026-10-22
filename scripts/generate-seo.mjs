// Post-build step for search engines and link previews. Writes, into dist/:
//   - a static page per address shoppers can land on: the home page, each section (/figures), category (/category/…), series
//     (/series/…), product and help page. Each has its real <title>, description, canonical address, Open Graph tags and
//     structured data, and the page's text and links inside #root, so crawlers that don't run JavaScript (Bing, link unfurlers,
//     Google's first pass) read real content. React replaces that content when the app starts.
//   - app.html: the untouched app, served for every other address (see netlify.toml / public/_redirects).
//   - sitemap.xml, and google-shopping.xml (a product feed for Google Merchant Center's free listings).
// See src/v3/seo.ts and src/v3/storefront/landing.ts (the in-app equivalents; keep the copy and addresses in step).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const DIST = join(process.cwd(), "dist");
const API_URL = (process.env.VITE_API_URL || "https://spin-hobby-server.onrender.com").replace(/\/$/, "");
const IS_STAGING = process.env.VITE_APP_ENV === "staging";
// Keep in sync with src/v3/seo.ts.
const SITE_URL = process.env.VITE_SITE_URL || (IS_STAGING ? "https://spin-hobby-staging.netlify.app" : "https://spinhobby.com");
const COPY = JSON.parse(await readFile(join(process.cwd(), "src/seo/sections.json"), "utf8"));
const LIST_LIMIT = 60; // products listed on a section / category / series page

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// Keep in sync with slugify() in src/v3/storefront/data.ts and the API's src/modules/catalog/slug.ts.
function slugify(name) {
  return name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}
const productPath = (p) => {
  const slug = slugify(p.name);
  return `/product/${encodeURIComponent(p.id)}${slug ? `/${slug}` : ""}`;
};
const seriesPath = (name) => `/series/${slugify(name)}`;

function normalizeStatus(status) {
  return status === "in" || status === "low" || status === "pre" || status === "out" ? status : "out";
}
const money = (cents) => `$${(cents / 100).toFixed(2)}`;
const monthName = (iso) => (iso ? new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-CA", { month: "long", year: "numeric", timeZone: "UTC" }) : "");
function statusText(p) {
  const s = normalizeStatus(p.status);
  if (s === "pre") return `Pre-order${p.releaseMonth ? `, releases ${monthName(p.releaseMonth)}` : ""}`;
  if (s === "out") return p.status === "closed" ? "Pre-order closed" : "Sold out";
  return s === "low" ? `Only ${p.stockCount ?? "a few"} left` : "In stock";
}

async function getJson(path) {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

/** Every visible product with its description and JAN code; an older API without /products/feed gets the plain list. */
async function fetchAllProducts() {
  try {
    return (await getJson("/products/feed")).items;
  } catch {
    const items = [];
    let cursor;
    for (;;) {
      const page = await getJson(`/products?${new URLSearchParams({ limit: "60", sort: "new", ...(cursor ? { cursor } : {}) })}`);
      items.push(...page.items);
      if (!page.cursor || page.items.length === 0) break;
      cursor = page.cursor;
    }
    return items;
  }
}

// ---------------------------------------------------------------- page building
function withPage(template, { title, description, path, image, jsonLd, body, ogType }) {
  const url = `${SITE_URL}${path}`;
  const ld = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];
  const extra = [
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:type" content="${ogType ?? (image ? "product" : "website")}" />`,
    `<meta property="og:locale" content="en_CA" />`,
    image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : "",
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" />`,
    ...ld.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`),
    body ? `<style>.seo-pre{max-width:1100px;margin:0 auto;padding:24px 16px 48px;font-family:"Plus Jakarta Sans",system-ui,sans-serif;color:var(--text,#1d2a53);line-height:1.55}.seo-pre a{color:var(--blue,#3557c5)}.seo-pre ul{padding-left:18px}.seo-pre li{margin:4px 0}.seo-pre nav{font-size:14px;margin:8px 0}</style>` : "",
  ].filter(Boolean).join("\n    ");
  let html = template
    .replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/s, `<meta name="description" content="${escapeHtml(description)}" />`)
    .replace("</head>", `  ${extra}\n  </head>`);
  if (body) html = html.replace('<div id="root"></div>', `<div id="root"><main class="seo-pre">${body}</main></div>`);
  return html;
}

const link = (path, text) => `<a href="${escapeHtml(path)}">${escapeHtml(text)}</a>`;
const crumbsHtml = (crumbs) => `<nav aria-label="Breadcrumb">${[{ name: "Shop", path: "/" }, ...crumbs].map((c) => link(c.path, c.name)).join(" › ")}</nav>`;
const productList = (items) => `<ul>${items.map((p) => `<li>${link(productPath(p), p.name)} — ${money(p.priceCents)} CAD · ${escapeHtml(statusText(p))}</li>`).join("")}</ul>`;
const sectionLinks = () => `<nav aria-label="Shop sections">${COPY.sections.map((s) => link(s.path, s.h1)).join(" · ")}</nav>`;

function breadcrumbJsonLd(crumbs) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Shop", path: "/" }, ...crumbs].map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: `${SITE_URL}${c.path}` })),
  };
}

// Keep in sync with productJsonLd() in src/v3/storefront/ProductPage.tsx.
function productJsonLd(p) {
  const s = normalizeStatus(p.status);
  const gtin = p.janCode && /^\d{13}$/.test(p.janCode) ? p.janCode : null;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    image: p.images,
    ...(p.description ? { description: p.description } : {}),
    sku: p.id,
    ...(gtin ? { gtin13: gtin } : {}),
    ...(p.manufacturer ? { brand: { "@type": "Brand", name: p.manufacturer } } : {}),
    ...(p.category ? { category: p.category } : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: p.currency,
      price: (p.priceCents / 100).toFixed(2),
      availability: s === "out" ? "https://schema.org/OutOfStock" : s === "pre" ? "https://schema.org/PreOrder" : "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      url: `${SITE_URL}${productPath(p)}`,
      seller: { "@type": "Organization", name: "Spin Hobby" },
    },
  };
}

const productDescription = (p) => (p.description ? p.description.replace(/\s+/g, " ").slice(0, 160)
  : `Buy ${p.name}${p.series ? ` (${p.series})` : ""} at Spin Hobby: authentic, officially licensed anime merch, shipped across Canada & the US.`);

// A page is written as a file (dist/support.html), never as a folder (dist/support/index.html): Netlify serves /support from support.html as it is,
// but answers /support with a redirect to the folder, /support/, lowercased on the way, which broke every product link (Square's ids are upper case).
async function writePage(path, html) {
  const file = join(DIST, path === "/" ? "index.html" : `${path}.html`);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html, "utf8");
}

// ---------------------------------------------------------------- Google Merchant Center feed
function merchantFeed(products) {
  const x = escapeHtml;
  const items = products.filter((p) => p.images?.length && p.priceCents > 0).map((p) => {
    const s = normalizeStatus(p.status);
    const availability = s === "pre" ? "preorder" : s === "out" ? "out_of_stock" : "in_stock";
    const onSale = p.compareAtCents && p.compareAtCents > p.priceCents;
    const gtin = p.janCode && /^\d{13}$/.test(p.janCode) ? p.janCode : null;
    return [
      "<item>",
      `<g:id>${x(p.id)}</g:id>`,
      `<g:title>${x(p.name.slice(0, 150))}</g:title>`,
      `<g:description>${x((p.description || productDescription(p)).slice(0, 5000))}</g:description>`,
      `<g:link>${SITE_URL}${productPath(p)}</g:link>`,
      `<g:image_link>${x(p.images[0])}</g:image_link>`,
      ...p.images.slice(1, 11).map((src) => `<g:additional_image_link>${x(src)}</g:additional_image_link>`),
      `<g:availability>${availability}</g:availability>`,
      s === "pre" && p.releaseMonth ? `<g:availability_date>${p.releaseMonth.slice(0, 10)}T00:00:00-05:00</g:availability_date>` : "",
      `<g:price>${((onSale ? p.compareAtCents : p.priceCents) / 100).toFixed(2)} CAD</g:price>`,
      onSale ? `<g:sale_price>${(p.priceCents / 100).toFixed(2)} CAD</g:sale_price>` : "",
      "<g:condition>new</g:condition>",
      p.manufacturer ? `<g:brand>${x(p.manufacturer.slice(0, 70))}</g:brand>` : "",
      gtin ? `<g:gtin>${gtin}</g:gtin>` : "<g:identifier_exists>no</g:identifier_exists>",
      p.categoryPath || p.category ? `<g:product_type>${x((p.categoryPath || p.category).replace(/ › /g, " > "))}</g:product_type>` : "",
      p.series ? `<g:custom_label_0>${x(p.series.slice(0, 100))}</g:custom_label_0>` : "",
      "</item>",
    ].filter(Boolean).join("");
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>Spin Hobby</title><link>${SITE_URL}</link><description>Authentic anime merch from Spin Hobby, Canada</description>\n${items.join("\n")}\n</channel></rss>\n`;
}

// ---------------------------------------------------------------- main
async function main() {
  const template = await readFile(join(DIST, "index.html"), "utf8");
  // every address without a page of its own gets the plain app (Netlify falls back to it); index.html becomes the home page
  await writeFile(join(DIST, "app.html"), template, "utf8");

  let products = [];
  let categories = [];
  let freeShippingCents = 7500;
  try {
    products = await fetchAllProducts();
  } catch (error) {
    console.warn(`[generate-seo] Could not fetch products (${error.message}); skipping product, category and series pages.`);
  }
  try { categories = (await getJson("/homepage")).categories ?? []; } catch { /* no category pages */ }
  try { freeShippingCents = (await getJson("/checkout/config")).freeShippingThresholdCents ?? freeShippingCents; } catch { /* default */ }
  const freeShipping = `$${Number.isInteger(freeShippingCents / 100) ? freeShippingCents / 100 : (freeShippingCents / 100).toFixed(2)}`;
  const fill = (text) => text.replace(/\{freeShipping\}/g, freeShipping);

  if (IS_STAGING) await writeFile(join(DIST, "robots.txt"), "User-agent: *\nDisallow: /\n", "utf8");

  const urls = []; // for the sitemap
  const sell = (list) => [...list.filter((p) => normalizeStatus(p.status) !== "out"), ...list.filter((p) => normalizeStatus(p.status) === "out")];

  // categories: full paths, addresses, and which ones are twins of a section (they point search engines at the section)
  const byId = new Map(categories.map((c) => [c.id, c]));
  const pathOf = (id) => { const names = []; for (let at = byId.get(id), g = 0; at && g < 50; at = byId.get(at.parentId), g++) names.unshift(at); return names; };
  const categoryPathOf = (id) => `/category/${slugify(pathOf(id).map((c) => c.name).join(" "))}`;
  const sectionTwin = (c) => (!c.parentId ? COPY.sections.find((s) => s.path === `/${slugify(c.name)}`)?.path : undefined);

  // ---- home
  const home = COPY.home;
  const seriesCounts = new Map();
  for (const p of products) if (p.series) seriesCounts.set(p.series, (seriesCounts.get(p.series) ?? 0) + 1);
  const topSeries = [...seriesCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([name]) => name);
  await writePage("/", withPage(template, {
    title: home.title,
    description: fill(home.description),
    path: "/",
    jsonLd: [{
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Spin Hobby",
      alternateName: ["Spin Hobby Canada", "spinhobby.com"],
      url: `${SITE_URL}/`,
    }],
    body: `<h1>${escapeHtml(home.h1)}</h1><p>${escapeHtml(home.intro)}</p>${sectionLinks()}`
      + (topSeries.length ? `<h2>Popular series</h2><nav aria-label="Series">${topSeries.map((n) => link(seriesPath(n), n)).join(" · ")}</nav>` : "")
      + (products.length ? `<h2>New in the shop</h2>${productList(sell(products).slice(0, 24))}` : ""),
  }));
  urls.push({ path: "/" });

  // ---- sections (/figures …): the server decides what belongs in each
  const GROUP = { Figures: "figures", Plushies: "plushies", "Trading Cards": "cards", Goods: "goods", "Books & Media": "media", "New Arrivals": "new", "Pre-Orders": "preorders", Sale: "sale" };
  for (const s of COPY.sections) {
    let items = [];
    try { items = (await getJson(`/products?${new URLSearchParams({ group: GROUP[s.nav], limit: String(LIST_LIMIT), sort: "featured" })}`)).items; } catch { /* list stays empty */ }
    await writePage(s.path, withPage(template, {
      title: s.title,
      description: fill(s.description),
      path: s.path,
      jsonLd: breadcrumbJsonLd([{ name: s.h1, path: s.path }]),
      body: `${crumbsHtml([{ name: s.h1, path: s.path }])}<h1>${escapeHtml(s.h1)}</h1><p>${escapeHtml(fill(s.intro))}</p>${items.length ? productList(sell(items)) : "<p>New stock is added every week.</p>"}${sectionLinks()}`,
    }));
    urls.push({ path: s.path });
  }

  // ---- categories with something in them
  for (const c of categories) {
    let page;
    try { page = await getJson(`/products?${new URLSearchParams({ categoryId: c.id, limit: String(LIST_LIMIT), sort: "featured" })}`); } catch { continue; }
    if (!page.items.length) continue;
    const trail = pathOf(c.id).map((n) => ({ name: n.name, path: categoryPathOf(n.id) }));
    const path = categoryPathOf(c.id);
    const twin = sectionTwin(c);
    const name = c.name;
    await writePage(path, withPage(template, {
      title: `${name} | Authentic Anime ${name} in Canada | Spin Hobby`,
      description: `Shop authentic, officially licensed anime ${name.toLowerCase()} at Spin Hobby, a Canadian anime shop. Shipped across Canada & the US, free shipping over ${freeShipping}.`,
      path: twin ?? path,
      jsonLd: breadcrumbJsonLd(trail),
      body: `${crumbsHtml(trail)}<h1>${escapeHtml(name)}</h1><p>Authentic, officially licensed ${escapeHtml(name.toLowerCase())} from your favourite anime and games, priced in Canadian dollars and shipped with tracking across Canada and the US.</p>${productList(sell(page.items))}${sectionLinks()}`,
    }));
    if (!twin) urls.push({ path });
  }

  // ---- series with at least two products (a single item makes a thin page; its product page covers it)
  const bySeries = new Map();
  for (const p of products) if (p.series) (bySeries.get(slugify(p.series)) ?? bySeries.set(slugify(p.series), []).get(slugify(p.series))).push(p);
  for (const [slug, items] of bySeries) {
    if (items.length < 2 || !slug) continue;
    const name = items[0].series;
    const path = `/series/${slug}`;
    const crumbs = [{ name: `${name} merch`, path }];
    await writePage(path, withPage(template, {
      title: `${name} Merch & Figures in Canada | Spin Hobby`,
      description: `Official ${name} figures, plushies and goods at Spin Hobby, a Canadian anime shop. Authentic and licensed, free shipping over ${freeShipping}.`,
      path,
      jsonLd: breadcrumbJsonLd(crumbs),
      body: `${crumbsHtml(crumbs)}<h1>${escapeHtml(name)} merch</h1><p>Official ${escapeHtml(name)} merchandise, authentic and officially licensed, priced in Canadian dollars and shipped across Canada and the US.</p>${productList(sell(items).slice(0, LIST_LIMIT))}${sectionLinks()}`,
    }));
    urls.push({ path, lastmod: items.map((p) => p.updatedAt ?? p.createdAt).filter(Boolean).sort().pop() });
  }

  // ---- products
  for (const p of products) {
    const trail = p.categoryId && byId.has(p.categoryId) ? pathOf(p.categoryId).map((n) => ({ name: n.name, path: categoryPathOf(n.id) })) : [];
    const crumbs = [...trail, { name: p.name, path: productPath(p) }];
    const sameSeries = p.series ? (bySeries.get(slugify(p.series)) ?? []).filter((x) => x.id !== p.id).slice(0, 8) : [];
    const body = [
      crumbsHtml(crumbs),
      `<h1>${escapeHtml(p.name)}</h1>`,
      `<p><strong>${money(p.priceCents)} CAD</strong>${p.compareAtCents > p.priceCents ? ` (was ${money(p.compareAtCents)})` : ""} · ${escapeHtml(statusText(p))}</p>`,
      p.series ? `<p>Series: ${(bySeries.get(slugify(p.series)) ?? []).length >= 2 ? link(seriesPath(p.series), p.series) : escapeHtml(p.series)}</p>` : "",
      p.description ? `<p>${escapeHtml(p.description)}</p>` : `<p>${escapeHtml(productDescription(p))}</p>`,
      `<p>Authentic and officially licensed. Ships with tracking across Canada and the US; free shipping over ${freeShipping}.</p>`,
      sameSeries.length ? `<h2>More ${escapeHtml(p.series)}</h2>${productList(sameSeries)}` : "",
      sectionLinks(),
    ].join("");
    await writePage(productPath(p), withPage(template, {
      title: `${p.name} | Spin Hobby Canada`,
      description: productDescription(p),
      path: productPath(p),
      // a transparent cut-out is shown on white or black by link previews: they get it on the shop background instead
      image: p.images[0] ? (p.cutouts?.includes(p.images[0]) ? `${API_URL}/product-photos/on-background?src=${encodeURIComponent(p.images[0])}` : p.images[0]) : null,
      jsonLd: [productJsonLd(p), breadcrumbJsonLd(crumbs)],
      body,
    }));
    urls.push({ path: productPath(p), lastmod: p.updatedAt ?? p.createdAt ?? undefined });
  }

  // ---- help pages (their text comes from the app)
  const staticPages = [
    { path: "/events", title: "Anime Convention Events in Canada | Spin Hobby", description: "Find Spin Hobby at anime conventions and community events across Canada: dates, venues and links." },
    { path: "/support", title: "Help & Support | Spin Hobby", description: "Contact Spin Hobby and find answers on shipping, pre-orders, order status, returns and restock alerts." },
    { path: "/legal/terms", title: "Terms of Service | Spin Hobby", description: "Spin Hobby's terms of service: shipping, pre-orders, payments and more." },
    { path: "/legal/privacy", title: "Privacy Policy | Spin Hobby", description: "Spin Hobby's privacy policy: what we collect and how we use it." },
  ];
  for (const page of staticPages) {
    await writePage(page.path, withPage(template, page));
    urls.push({ path: page.path });
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${
    urls.map((u) => `  <url><loc>${SITE_URL}${u.path}</loc>${u.lastmod ? `<lastmod>${u.lastmod.slice(0, 10)}</lastmod>` : ""}</url>`).join("\n")
  }\n</urlset>\n`;
  await writeFile(join(DIST, "sitemap.xml"), sitemap, "utf8");
  await writeFile(join(DIST, "google-shopping.xml"), merchantFeed(products), "utf8");

  console.log(`[generate-seo] ${urls.length} pages in sitemap.xml (${products.length} products, ${bySeries.size} series, ${categories.length} categories); google-shopping.xml has ${products.filter((p) => p.images?.length).length} products${IS_STAGING ? " [staging: robots.txt disallows all]" : ""}.`);
}

main().catch((error) => {
  console.error("[generate-seo] Failed:", error);
  process.exitCode = 1;
});
