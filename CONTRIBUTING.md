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
- **Features not ready for customers** go behind a flag in `src/features.ts` (on locally and on staging, off on the
  live site).

## Never

- Commit keys, passwords or tokens. Settings live in `.env` files, which git ignores.
- Point the website at the live API while developing: locally it uses `http://localhost:8080`.

## Releasing to the live site (owner only)

The steps, and what to do if something goes wrong, are in the server repo's `CONTRIBUTING.md` under **Releasing**: merge
`staging` into `production`, then **Netlify → Deploys → the newest production deploy → Publish deploy** (automatic
publishing is off).
