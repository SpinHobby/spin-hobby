# Getting found on Google

The goal: when someone in Canada searches "anime figures Canada", "Frieren merch" or a product's name, Spin Hobby shows up.
The code below gives Google everything it needs to understand and rank the shop. Ranking itself also depends on things
outside the code (see "What only the shop can do").

## What the site does

| Piece | Where | What it gives Google |
| --- | --- | --- |
| A page per section | `/figures`, `/plushies`, `/trading-cards`, `/goods`, `/books-media`, `/new-arrivals`, `/pre-orders`, `/sale` | A page to rank for "anime figures Canada" and the like, with its own heading, intro and title. Copy lives in `src/seo/sections.json`. |
| A page per category | `/category/figures-scale-figures` | Long-tail searches ("scale figures Canada"). A top-level category named like a section points Google at the section page instead, so the two don't compete. |
| A page per series | `/series/frieren-beyond-journey-s-end` | Searches for a show's merch. Written at build time for series with two or more products. |
| A page per product | `/product/<id>/<name>` | Product searches, with price, stock, condition (new) and the JAN barcode (GTIN) as structured data, so Google can show price and availability in results. |
| Real text in every page | `scripts/generate-seo.mjs` | Each page above is written at build time with its heading, intro and links inside the page, so crawlers that don't run JavaScript still read it. The app replaces it when it starts. |
| Breadcrumbs | every landing and product page | "Spin Hobby › Figures › Scale Figures" under the result instead of a bare address. |
| Shop details | `index.html` (OnlineStore) | Name, logo, email, founding year, the countries served and social profiles, for the knowledge panel and site name. |
| Sitemap | `/sitemap.xml` | Every page above with its last-changed date. |
| Google Shopping feed | `/google-shopping.xml` | Every product for Google Merchant Center's free listings (the Shopping tab and product results). |
| Internal links | header menu, sidebar categories, footer, home "Popular series" | Real links between pages, which is how Google discovers and weighs them. |

Staging is never indexed: its build writes a `robots.txt` that disallows everything.

## What only the shop can do (accounts and decisions)

Do these once, in this order. Each needs the shop owner's Google account.

1. **Google Search Console** (https://search.google.com/search-console): add the property `spinhobby.com` as a *Domain*
   property and verify it with the DNS record it gives you (at your domain registrar or Netlify DNS). Then, under
   *Sitemaps*, submit `https://spinhobby.com/sitemap.xml`. Search Console shows which pages are indexed, what people
   searched to find you, and any problems.
2. **Google Merchant Center** (https://merchants.google.com): create the account for Spin Hobby (country: Canada,
   currency: CAD), verify and claim `spinhobby.com` (it can reuse Search Console), set **shipping** (your standard and
   express rates and the free-shipping threshold) and **returns** (match your Terms of Service), then add a product source:
   *scheduled fetch* of `https://spinhobby.com/google-shopping.xml`, daily. Turn on **free listings**.
3. **Google Business Profile** (https://business.google.com), if Spin Hobby has a pickup point or attends events at a set
   area: set it up as a service-area business (you can hide the address) with the website, logo and photos. It helps
   "anime store near me" searches and shows reviews.
4. **Reviews.** Ask happy customers to leave a Google review (Business Profile) and, once Merchant Center is running,
   consider *Google Customer Reviews* (an opt-in survey after checkout). Stars in results lift clicks a lot.
5. **Links from other sites.** Google trusts a shop more when others link to it: convention exhibitor pages (ask each
   event you attend to link your site), local anime clubs and university clubs, Reddit communities where self-promotion
   is allowed, MyFigureCollection's shop listing, and your Instagram and Discord bios.

## Things to fix in the content

- **Terms of Service, section 6** still has placeholders (`[14]` days and others in `src/v3/legal/content.ts`). Google
  and Merchant Center expect a clear returns policy; finish it, then use the same rules in Merchant Center.
- **Product descriptions.** Products with their own description (a few sentences: what it is, size, maker, series,
  character) rank far better than the generic fallback. Gleamshelf can draft them.
- **Maker (brand).** Google Shopping asks for a brand on most products. The public product data has no maker yet; adding
  the manufacturer to `/products/feed` and to the feed's `<g:brand>` is a small follow-up.

## When you change things

- New section or different wording: edit `src/seo/sections.json` (both the app and the build read it).
- New address scheme: keep `slugify` the same in `src/v3/storefront/data.ts`, `scripts/generate-seo.mjs` and the API's
  `src/modules/catalog/slug.ts`.
- Check a page the way Google sees it: Search Console → *URL inspection*, or https://search.google.com/test/rich-results
  for the structured data.
