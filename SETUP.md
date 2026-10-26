# Setting up all three repos

Spin Hobby is three repos. This page takes a fresh laptop to all of them running. Each repo's own README has the details.

| Repo | What it is | Runs at |
| --- | --- | --- |
| [`spin-hobby-server`](https://github.com/SpinHobby/spin-hobby-server) | The API: products, orders, payments, accounts | http://localhost:8080 |
| [`spin-hobby`](https://github.com/SpinHobby/spin-hobby) (this one) | The website: storefront, checkout, and the staff admin | http://localhost:3000 |
| [`gleamshelf`](https://github.com/SpinHobby/gleamshelf) | The photo and design editor (2D and 3D), its AI tools, the MCP server | http://localhost:5180 |

You need **spin-hobby-server** and **spin-hobby** to work on the shop. Clone **gleamshelf** only to work on the editor itself: the admin
already has a packed copy of it (see [The editor inside the admin](#the-editor-inside-the-admin)).

## Quick start

```bash
# Node 22+ first, then clone the three repos side by side (step 1)

# 1. The API: leave it running
cd spin-hobby-server && npm ci && cp .env.intern .env && npm run dev:local   # http://localhost:8080

# 2. The website and admin: a second terminal
cd spin-hobby && npm ci && npm run dev                                       # http://localhost:3000/admin
#    sign in: owner@spinhobby.test / spinhobby

# 3. The editor, only to work on Gleamshelf itself: a third terminal
cd gleamshelf && npm ci && npm run dev                                       # http://localhost:5180
```

That is everything except the AI photo tools, which need models downloaded once and one more process: see
[AI features](#ai-features-optional).

## Before you start

- **Node.js 22 or newer**: `node --version` should say `v22` or higher.
  macOS: `brew install node@22` or the installer from nodejs.org. Windows: the installer from nodejs.org. Linux: your package manager or `nvm`.
- **Git**, with access to the SpinHobby repos on GitHub.
- No accounts, keys or paid services. Nothing here needs the shop's real keys, and nobody will send you them.

## 1. Get the code

Put the repos side by side; that is where the commands below expect them.

```bash
mkdir spin && cd spin
git clone git@github.com:SpinHobby/spin-hobby-server.git
git clone git@github.com:SpinHobby/spin-hobby.git
git clone git@github.com:SpinHobby/gleamshelf.git    # only to work on the editor
```

## 2. The API (`spin-hobby-server`)

```bash
cd spin-hobby-server
npm ci
cp .env.intern .env      # holds no keys and is safe to share
npm run dev:local
```

Wait for the box saying **Spin Hobby is running** (the first start takes a minute). It starts a throw-away database full of sample products and
orders; every start begins from the same clean data, and live payment keys are always switched off.

| | |
| --- | --- |
| API | http://localhost:8080 |
| Try any endpoint in the browser | http://localhost:8080/docs |
| Owner login | `owner@spinhobby.test` / `spinhobby` |
| Staff login | `staff@spinhobby.test` / `spinhobby` |

Leave it running. More: `spin-hobby-server/docs/INTERNS.md`.

## 3. The website (`spin-hobby`)

In a second terminal:

```bash
cd spin-hobby
npm ci
npm run dev
```

Open http://localhost:3000. The admin is at http://localhost:3000/admin; sign in with the owner login above. It calls the API at
`localhost:8080` by itself; no settings needed.

## 4. The editor (`gleamshelf`), only to work on it

In a third terminal:

```bash
cd gleamshelf
npm ci
cp .env.intern .env      # optional, holds no keys
npm run dev
```

Open http://localhost:5180: the editor on its own, with sample photos, Edit mode and 3D mode. This is where editor work happens; check it
with `npm run typecheck && npm test`.

## AI features (optional)

`npm run dev` never downloads or starts an AI model. Without them, everything else works: the shop, and in the editor the adjustments, Edit
mode, 3D mode (importing 3D models too) and saving. The AI buttons (cut-out, sticker removal, enlarging, the one-click chain, listings) say
the app is not running or which model is missing.

To use them, in the `gleamshelf` folder:

**1. Download the models, once.** They are free; each command shows the source, size and licence and asks before downloading. They are kept
outside git.

```bash
npm run models                                   # what is installed
npm run models:install                           # cut-out (115 MB)
npm run models:install -- lama-fp32              # removes stickers and lettering (208 MB)
npm run models:install -- ppocr-det-v4           # finds text (5 MB)
npm run models:install -- ppocr-rec-v4           # reads text (11 MB)
npm run models:install -- realplksr-x4           # enlarging (30 MB)
npm run vlm:setup                                # the vision model that reads boxes (about 6 GB), only for listings
npm run search:setup                             # SearXNG, our own free web search, only for listings
npm run python:setup                             # only for SAM (cutting out just the figure) and Stable Diffusion
```

Install only what you need; `gleamshelf/docs/ONBOARDING.md` explains each one.

**2. Run one more process,** next to `npm run dev`:

```bash
npm run local:start
```

It loads the downloaded models itself, and starts the heavy parts (the vision model, the Python model server) only when a job needs them,
stopping them again when idle; there is nothing else to start. It prints a pairing token: paste it into the editor once and the AI buttons
work. The editor finds the app by itself at `http://127.0.0.1:47321`. Use Chrome, Edge or Firefox: Safari does not let a page talk to it.

**For the shop's photo drafts** (the admin's **Imports → Make drafts from photos**), run the worker instead of `local:start`: in the admin,
**Imports → Connect the app** shows an address and a code, then

```bash
npm run connect -- <address> --code <code>
npm run worker
```

The worker turns uploaded photos into drafts and proposes descriptions, starting the models it needs the same way.

## The editor inside the admin

The admin does not use the gleamshelf repo directly. It installs a packed copy kept in this repo,
`vendor/gleamshelf-react-<version>.tgz` (see `"@gleamshelf/react"` in `package.json`), so shop work never needs gleamshelf cloned.

When editor changes should reach the admin:

1. In `gleamshelf`, raise the version in `packages/react/package.json` (for example `0.3.0` to `0.4.0`).
2. Pack it straight into this repo: `node scripts/pack-react.mjs ../spin-hobby/vendor`.
3. Here: delete the old `.tgz` from `vendor/`, point `"@gleamshelf/react"` in `package.json` at the new file, run `npm install` (it updates
   `package-lock.json`), then `npm run build` to check.
4. Commit the new `.tgz`, `package.json` and `package-lock.json` together.

## Everyday commands

| Where | Command | What it does |
| --- | --- | --- |
| spin-hobby-server | `npm run dev:local` | The API with sample data (use this most of the time) |
| spin-hobby | `npm run dev` | The website, reloading as you edit |
| spin-hobby | `npm run lint && npm run format:check && npx tsc --noEmit` | Before pushing |
| gleamshelf | `npm run dev` | The editor on its own |
| gleamshelf | `npm run typecheck && npm test` | Before pushing |
| gleamshelf | `npm run local:start` | The AI tools for the editor (after the models are downloaded) |
| gleamshelf | `npm run worker` | The AI tools for the admin's photo drafts |

**`npm ci` or `npm install`?** Use `npm ci`: it installs exactly what `package-lock.json` says and never changes it, so everyone has the
same versions. Use `npm install` only when you add or upgrade a package on purpose (and commit the lock file it changes).

**Where are the packages (Three.js, React, ...)?** Each package's own `package.json` lists what it uses (gleamshelf's Three.js is in
`gleamshelf/packages/scene3d/package.json`); `npm ci` at the repo's root installs all of them into one `node_modules`.

## When something goes wrong

- **"Port already in use"**: something is still running on 8080, 3000 or 5180. Stop the old terminal (Ctrl C), or close what holds the port.
- **The website shows no products or cannot sign in**: the API is not running, or not yet ready. Start step 2 first and wait for its box.
- **The editor's AI buttons say the app is not running**: start `npm run local:start` in `gleamshelf` and paste its pairing token. If it
  says a model is missing, download that one (`npm run models` lists them).
- **`npm ci` complains about the Node version**: install Node 22 or newer (`node --version`).
- **Anything else**: the instructions are wrong, not you. Tell us, and fix this page in your first pull request.

## Branches

- `spin-hobby` and `spin-hobby-server`: branch from `staging`, open the pull request into `staging`. `production` is what the shop runs.
- `gleamshelf`: branch from `main`, open the pull request into `main` (see its `CONTRIBUTING.md`).
