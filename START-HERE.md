# Start here

New to the website? Read this page first. It is short, and it points to the longer guides in the order you'll need them.

## 1. Get it running (day 1)

Follow [SETUP.md](SETUP.md). In short, with two terminals:

```bash
# the API, with sample products and orders (leave it running)
cd spin-hobby-server && npm ci && cp .env.intern .env && npm run dev:local

# the website
cd spin-hobby && npm ci && npm run dev
```

Then open:

| Address | What it is |
| --- | --- |
| http://localhost:3000 | The shop |
| http://localhost:3000/admin | The staff admin. Sign in as `owner@spinhobby.test` / `spinhobby` (or `staff@spinhobby.test`) |
| http://localhost:3000/ui-kit | Every shared building block, live: start here when you build a page |
| http://localhost:3000/account | A shopper's own page (orders, wishlist...), still being built |

Stuck? [SETUP.md → When something goes wrong](SETUP.md#when-something-goes-wrong). The server repo's
`docs/INTERNS.md` explains how the whole system fits together; read its "mental model" section once.

## 2. Find your way around

| Folder | What's in it |
| --- | --- |
| `src/components/` | The shared building blocks: buttons, fields, tables, drawers, tabs, product cards... ([its README](src/components/README.md)) |
| `src/v3/storefront/` | The shop: homepage, sections, categories, product pages, the cart |
| `src/v3/account/` | A shopper's account page (orders, wishlist) |
| `src/v3/admin/` | The staff admin |
| `src/v3/checkout/` | Checkout and payments |
| `src/features.ts` | Feature flags: what is switched on locally, on staging and on the live site |

The full list is in the [README](README.md#where-things-are).

## 3. Build a page

1. **Look at `/ui-kit` first.** If a piece you need is there, use it; don't restyle it inside your page.
2. **Read the [components README](src/components/README.md):** what each piece is and its options, plus two recipes:
   - [a page like the admin](src/components/README.md#recipe-a-page-like-the-admin-for-example-the-account-page) (tabs on the left),
   - [a wishlist page](src/components/README.md#shop-pieces-product-cards) with the horizontal product card.
3. **Missing a piece?** Add it to `src/components` with a sample on `/ui-kit`, so the next person can use it too.
4. **Use the tokens** for colours and sizes (`var(--surface)`, `var(--primary)`...), never new hex codes.
5. **Check a phone-sized window (about 390 px) and dark mode** (the ☀ / ☾ button).

The rules behind these are in [CONTRIBUTING.md → Building pages](CONTRIBUTING.md#building-pages).

## 4. Not ready for customers? Use a feature flag

Merge unfinished work behind a flag so it shows locally and on staging but not on the live site. How to add one, and the
two mistakes to avoid (forgetting the links, and checking the environment yourself):
[CONTRIBUTING.md → Feature flags](CONTRIBUTING.md#feature-flags).

## 5. Make a pull request

```bash
git switch staging && git pull
git switch -c your-name/short-description       # e.g. aki/wishlist-page
# ...make one small change, check it in the browser...
npm run lint && npm run format:check && npx tsc -p . --noEmit && npm run build
git push -u origin your-name/short-description  # then "Compare & pull request" on GitHub, into staging
```

Fill in the pull request template (what changed, how you checked it, a screenshot), ask for a review, and let the owner
merge. Never push to `staging` or `production` directly. Every step, and what to do about conflicts, is in
[CONTRIBUTING.md → Step by step](CONTRIBUTING.md#step-by-step).

## 6. Rules that never bend

- No keys, passwords or tokens in the code: they live in `.env` files, which git ignores.
- Only the owner merges, and only the owner releases to the live site.
- Made a mistake (pushed to the wrong branch, committed a key)? Say so straight away; it's easy to fix when we know quickly.
