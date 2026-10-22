# Spin Hobby website

The shop at [spinhobby.com](https://spinhobby.com): the storefront, checkout, and the staff admin (`/admin`). React, TypeScript and Vite, styled with
SCSS. The API it talks to is the separate `spin-hobby-server` repo.

## Run it on your computer

1. Start the API with sample data: in the `spin-hobby-server` folder, `npm run dev:local` (its `docs/INTERNS.md` explains the first-time setup). Wait for
   it to say it is ready.
2. Here: `npm ci`, then `npm run dev`, and open http://localhost:3000. The admin is at http://localhost:3000/admin (sign in with the test account
   `dev:local` prints).

In development the website calls the API at `http://localhost:8080`; set `VITE_API_URL` to use another one.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | The website at http://localhost:3000, reloading as you edit |
| `npm run build` | Typecheck, build to `dist/`, and write the pages search engines read (`scripts/generate-seo.mjs`) |
| `npm run lint` | ESLint; must pass with no warnings |
| `npm run format` / `npm run format:check` | Prettier: fix / check the formatting of every file |
| `npm run preview` | Serve the built `dist/` locally |

Before pushing: `npm run lint && npm run format:check && npx tsc --noEmit`.

Open this folder itself in VS Code (or the workspace file one level up) so its settings apply: Prettier formats a file when you save it, and every file
is already formatted, so a save changes only what you typed. The commit that formatted everything is listed in `.git-blame-ignore-revs`; run
`git config blame.ignoreRevsFile .git-blame-ignore-revs` once so `git blame` skips it.

## Where things are

| Path | What |
| --- | --- |
| `src/components/` | The shared building blocks (buttons, fields, tables, drawers…). Build pages from these: see its README and http://localhost:3000/ui-kit |
| `src/v3/storefront/` | The shop: home, section, category, series and product pages, cart |
| `src/v3/admin/` | The staff admin |
| `src/v3/checkout/` | Checkout and payments |
| `src/features.ts` | Features that are on locally, on staging, or on the live site |
| `docs/SEO.md` | How the shop gets found on Google |

## Branches and deploys

Work on a branch from `staging` and open a pull request into `staging`: step by step, and what you may and may not do
with branches, in [CONTRIBUTING.md](CONTRIBUTING.md). Netlify builds the `staging` branch as the staging site
(https://spin-hobby-staging.netlify.app, test data and sandbox payments) and `production` as the live site. Changes reach the live site when `staging` is merged
into `production`.
