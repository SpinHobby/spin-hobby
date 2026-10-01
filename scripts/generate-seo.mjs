// Post-build step: writes dist/sitemap.xml and, for crawlers/link-unfurlers that don't execute
// JS (Discord, Twitter/X, Facebook, and non-Google search engines), a static dist/<route>/index.html
// per product and legal page with the real <title>/description/OG tags/JSON-LD baked in. The <body>
// is untouched, so the SPA still mounts and hydrates normally for everyone else. See
// src/v3/seo.ts (the client-side equivalent) and PLAN.md's "lightweight prerendering" decision.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DIST = join(process.cwd(), "dist");
const API_URL = (process.env.VITE_API_URL || "https://spin-hobby-server.onrender.com").replace(/\/$/, "");
const IS_STAGING = process.env.VITE_APP_ENV === "staging";
// Keep in sync with src/v3/seo.ts.
const SITE_URL = process.env.VITE_SITE_URL || (IS_STAGING ? "https://spin-hobby-staging.netlify.app" : "https://spinhobby.com");

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// Keep in sync with productPath() in src/v3/storefront/data.ts.
function slugify(name) {
  return name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}
function productPath(p) {
  const slug = slugify(p.name);
  return `/product/${encodeURIComponent(p.id)}${slug ? `/${slug}` : ""}`;
}

function normalizeStatus(status) {
  return status === "in" || status === "low" || status === "pre" || status === "out" ? status : "out";
}

function withHead(template, { title, description, path, image, jsonLd }) {
  const url = `${SITE_URL}${path}`;
  let html = template
    .replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/, `<meta name="description" content="${escapeHtml(description)}" />`);
  const extra = [
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:type" content="${image ? "product" : "website"}" />`,
    image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : "",
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" />`,
    jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : "",
  ].filter(Boolean).join("\n    ");
  return html.replace("</head>", `  ${extra}\n  </head>`);
}

async function writePage(path, html) {
  const dir = join(DIST, path);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "index.html"), html, "utf8");
}

async function fetchAllProducts() {
  const items = [];
  let cursor;
  for (;;) {
    const qs = new URLSearchParams({ limit: "100", sort: "new", ...(cursor ? { cursor } : {}) });
    const res = await fetch(`${API_URL}/products?${qs}`);
    if (!res.ok) throw new Error(`GET /products failed: ${res.status}`);
    const page = await res.json();
    items.push(...page.items);
    if (!page.cursor || page.items.length === 0) break;
    cursor = page.cursor;
  }
  return items;
}

async function main() {
  const template = await readFile(join(DIST, "index.html"), "utf8");

  let products = [];
  try {
    products = await fetchAllProducts();
  } catch (error) {
    console.warn(`[generate-seo] Could not fetch products (${error.message}); skipping per-product pages and sitemap entries for them.`);
  }

  if (IS_STAGING) {
    await writeFile(join(DIST, "robots.txt"), "User-agent: *\nDisallow: /\n", "utf8");
  }

  for (const p of products) {
    const availability = normalizeStatus(p.status) === "out" ? "https://schema.org/OutOfStock"
      : normalizeStatus(p.status) === "pre" ? "https://schema.org/PreOrder"
      : "https://schema.org/InStock";
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.name,
      image: p.images,
      ...(p.description ? { description: p.description } : {}),
      ...(p.janCode ? { sku: p.janCode } : {}),
      offers: {
        "@type": "Offer",
        priceCurrency: p.currency,
        price: (p.priceCents / 100).toFixed(2),
        availability,
        url: `${SITE_URL}${productPath(p)}`,
      },
    };
    const html = withHead(template, {
      title: `${p.name} | Spin Hobby`,
      description: (p.description && p.description.slice(0, 160)) || `${p.name} — official anime figures, plushies and goods from Spin Hobby.`,
      path: productPath(p),
      image: p.images[0] ?? null,
      jsonLd,
    });
    await writePage(productPath(p), html);
  }

  const legalPages = [
    { path: "/legal/terms", title: "Terms of Service | Spin Hobby", description: "Spin Hobby's terms of service — shipping, pre-orders, payments and more." },
    { path: "/legal/privacy", title: "Privacy Policy | Spin Hobby", description: "Spin Hobby's privacy policy — what we collect and how we use it." },
  ];
  for (const page of legalPages) {
    await writePage(page.path, withHead(template, page));
  }

  const urls = [
    { path: "/" },
    ...legalPages,
    ...products.map((p) => ({ path: productPath(p), lastmod: p.createdAt ?? undefined })),
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${
    urls.map((u) => `  <url><loc>${SITE_URL}${u.path}</loc>${u.lastmod ? `<lastmod>${u.lastmod.slice(0, 10)}</lastmod>` : ""}</url>`).join("\n")
  }\n</urlset>\n`;
  await writeFile(join(DIST, "sitemap.xml"), sitemap, "utf8");

  console.log(`[generate-seo] Wrote sitemap.xml (${urls.length} urls) and ${products.length} product page(s)${IS_STAGING ? " [staging: robots.txt set to disallow all]" : ""}.`);
}

main().catch((error) => {
  console.error("[generate-seo] Failed:", error);
  process.exitCode = 1;
});
