# Contributing

How we work on the website. Short on purpose; the server repo's `CONTRIBUTING.md` and `docs/INTERNS.md` say more about
the team's habits.

## The flow

```
your branch ──► pull request into `staging` ──► check it on the staging site ──► the owner releases it to the live site
```

- **`production`** is the live site (spinhobby.com): real customers and real money. Only the owner merges into it, and
  the owner publishes it by hand, so nothing reaches customers by accident.
- **`staging`** builds automatically as the staging site (https://spin-hobby-staging.netlify.app: test data, sandbox
  payments), so merged work can be tried there.

## Step by step

1. **Start from the latest `staging`:**
   ```sh
   git switch staging && git pull
   git switch -c your-name/short-description      # e.g. aki/wishlist-page
   ```
2. **Make a small change.** One pull request does one thing; small ones get reviewed quickly.
3. **Check it** (below), in the browser at http://localhost:3000 with the API running (`npm run dev:local` in the server
   repo), on a phone-sized window and in dark mode.
4. **Commit** with a message that says what the change does: one short line, present tense, starting with a capital
   (`Add the wishlist page`, `Fix the cart total on phones`). Add a few sentences after a blank line if the reason isn't
   obvious.
5. **Push your branch and open a pull request into `staging`:**
   ```sh
   git push -u origin your-name/short-description
   ```
   GitHub shows a **Compare & pull request** button. The base is **`staging`** (the default). Fill in the template:
   what changed, how you checked it, and a screenshot for anything visible.
6. **Ask for a review.** Reply to every comment and push fixes to the same branch: the pull request updates itself.
7. **The owner merges it.** Don't merge your own pull request, even though GitHub shows you the button.
8. After it's merged, check it on the staging site, then delete your branch (the pull request has a button for it).

If `staging` moved on while you worked and GitHub reports conflicts:

```sh
git fetch origin
git merge origin/staging     # fix the conflicts, commit
git push                     # the pull request updates
```

## Branches: what you may and may not do

You can push to this repo, so these rules are what keep everyone's work safe:

- **Do** work on your own branch (`your-name/...`), push it as often as you like, and open pull requests into `staging`.
- **Never** push, merge or open a pull request into **`production`**.
- **Never** push directly to **`staging`**: changes reach it only through a reviewed pull request.
- **Never** force-push (`git push --force`) to `staging`, `production` or anyone else's branch: it deletes other people's
  work. On your own branch it is fine.
- **Never** delete a branch that isn't yours.
- Made a mistake on one of these? Say so straight away. It is easy to put right when we know quickly.

## Before you push

```sh
npm run lint && npm run format:check && npx tsc -p . --noEmit && npm run build
```

`npm run format` fixes formatting. Every file is already formatted, and VS Code formats a file when you save it (open
this folder itself so `.vscode/` applies), so formatting only ever touches what you changed.

## Building pages

- **Build from the shared pieces** in `src/components` (buttons, fields, tables, drawers, dialogs, tabs…). See them live at
  http://localhost:3000/ui-kit, and read `src/components/README.md`. If a page needs something they don't have, add it
  there (with a sample on `/ui-kit`) rather than styling it inside your page.
- **No new colours or sizes in a page:** use the tokens (`var(--primary)`, `var(--surface)`…).
- **One primary button per screen;** `danger` for anything that deletes or refunds; every list says something when empty.
- **Check phones (about 390 px wide) and dark mode** before asking for review.
- **Features not ready for customers** go behind a feature flag: see [Feature flags](#feature-flags) below.

## Feature flags

A feature flag lets unfinished work be merged and tried on staging while the live site doesn't show it yet. The flags are
one file, `src/features.ts`: one line per feature, saying where it is on.

| Where | What it is |
| --- | --- |
| `local` | `npm run dev` on your own computer |
| `staging` | https://spin-hobby-staging.netlify.app (test data, sandbox payments) |
| `production` | spinhobby.com, the live site |

**Use one when** a page or a piece of one isn't ready for customers but should be merged (so it doesn't drift away from
`staging`) and tried by the team. **Don't use one** for settings (prices, shipping, the shop playlist: those belong in Admin
→ Settings), for secrets, or to keep something private (see step 4).

### Adding a flag

1. **Add one line to `FEATURES`** in `src/features.ts`, with a comment saying what it hides and what it's waiting for. A new
   feature is usually on locally and on staging, off on the live site:

   ```ts
   const FEATURES = {
     // ...the existing flags
     /** /gift-cards and the "Gift cards" link in the footer: waiting for the payment provider to support them. */
     giftCards: { local: true, staging: true, production: false },
   } satisfies Record<string, Record<Environment, boolean>>;
   ```

2. **Check it everywhere the feature shows up** with `isOn("giftCards")`. TypeScript only accepts names that are in the
   file, so a typo won't compile.

   ```tsx
   import { isOn } from "./features"; // the path from your file to src/features.ts

   // the route, in App.tsx
   {isOn("giftCards") && <Route path="/gift-cards" element={<GiftCards />} />}

   // and every link, button or menu item that leads to it
   {isOn("giftCards") && <a href="/gift-cards">Gift cards</a>}
   ```

   Hiding the route but not the links leaves a dead link on the live site, so search for the path
   (`git grep -n "/gift-cards"`) and wrap every place.

3. **Don't check the environment yourself** (`import.meta.env.PROD`, `import.meta.env.DEV`, the hostname): staging is a
   production build too, so those checks can't tell staging from the live site, and a typo in them (`PRO` for `PROD`)
   compiles silently. `isOn` is the one place that knows.

4. **A flag only hides things in the browser.** Anyone can read the website's code and call the API directly. If the
   feature must not work on the live site (it changes data, costs money, shows private information), the API has to
   refuse it too: the server keeps its own settings in `src/config` (see the server repo's `CONTRIBUTING.md`).

### Turning it on, and removing it

- **Turning a flag on or off** somewhere is a change to its line, made in a pull request like any other change. Turning it on
  for `production` is the owner's decision.
- **When the feature is live for good, remove the flag:** delete its line and every `isOn("…")` check (keep what was inside
  them). Old flags pile up into code nobody dares touch. A flag's comment saying what it's waiting for makes this easy to
  spot.

## Never

- Commit keys, passwords or tokens. Settings live in `.env` files, which git ignores.
- Point the website at the live API while developing: locally it uses `http://localhost:8080`.

## Releasing to the live site (owner only)

The steps, and what to do if something goes wrong, are in the server repo's `CONTRIBUTING.md` under **Releasing**: merge
`staging` into `production`, then **Netlify → Deploys → the newest production deploy → Publish deploy** (automatic
publishing is off).
