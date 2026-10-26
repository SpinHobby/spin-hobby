# Shared UI: the building blocks for panel pages

The admin is built from these pieces, and any page that works like it should be too: an account page, a settings page, a
staff tool. Using them keeps every page looking and behaving the same (spacing, colours, dark mode, phones, keyboard), and
means a design change happens in one place.

**See them live:** run the site locally (`npm run dev`) and open **http://localhost:3000/ui-kit**. Every piece is there
with made-up data. It's also on staging, never on the live site.

```tsx
// from a page in src/v3/account/ (two folders down from src/)
import { PanelLayout, Card, Toolbar, SearchInput, DataTable, Drawer, Form, TextField, Switch, Button } from "../../components";
```

## Where things are

```
src/components/
  index.ts          everything below, importable from one place
  hooks.ts          useToast, useEscape, useTheme, useSlidingIndicator, useEnterAnimation, useContentSwap, useScrollFade
  layout/           PanelLayout, PanelStatus, Card, CardGrid, Stats, Collapse, ScrollRow
  navigation/       Tabs
  actions/          Button, LinkButton, IconButton
  inputs/           Form, Field, TextField, SelectField, TextareaField, FormRow, SectionLabel        (Form.tsx)
                    CheckboxField, Switch, RadioGroup, SegmentedControl                             (Choice.tsx)
                    NumberStepper; Toolbar, SearchInput, FilterChips, FilterChipsMulti              (Search.tsx)
  data/             DataTable, LineList, Pagination
  overlays/         Drawer, Dialog, ConfirmDialog, Menu
  feedback/         Banner, EmptyState, Skeleton, Spinner, ProgressBar, StatusBadge
  display/          Avatar, Tag
  shop/             ProductCard (vertical / horizontal), PreorderCard, ProductRow, MiniRow, CardAction, PriceTag  (ProductCards.tsx)
  styles/           tokens.scss (the shop's colours, fonts, base controls), components.scss (these pieces),
                    motion.scss (Collapse, ScrollRow, content swaps, scroll fades; light enough for the shop to load),
                    shop.scss (the horizontal card and CardAction; the other cards' styles are in v3/storefront/storefront.scss)
  showcase/         the /ui-kit page
```

## The pieces

| Piece | What it is | Options worth knowing |
| --- | --- | --- |
| `PanelLayout` | Tabs on the left, a bar on top, the content; a ☰ menu on phones. Changing `active` (from a tab or from your own code) scrolls to the top and eases the new content in, so pages don't animate it themselves | `tabs` (with `badge` counts), `footer`, `topActions`, `banner`, `toast` |
| `PanelStatus` | A dot and a short status line at the bottom of the tabs | `color` |
| `Card` | A rounded box, with an optional title row and action | `title`, `action`, `padded` (for text and forms) |
| `ScrollRow` | A sideways row of cards with ‹ › buttons that glide to the next set; faded edges instead of a scrollbar; phones swipe | `label` (required), `className` (lay the cards out there) |
| `Collapse` | Content that slides open and shut (subcategories, "More details"); hidden from the keyboard while shut | `open` |
| `CardGrid`, `Stats` | Cards side by side; summary numbers in a row | `Stats` items can have `note` and `onClick` |
| `Tabs` | Tabs inside a page (Details / Messages / History) | `variant`: `underline` or `pills`; `count`, `disabled` per tab |
| `Button` | The shop's button | `variant`: `primary` (one per screen), `ghost`, `danger`, `gold`; `size`: `sm`/`md`/`lg`; `icon`, `loading`, `fullWidth` |
| `LinkButton` | A button that looks like a link (Edit, See all) | `danger` |
| `IconButton` | A round icon-only button (✎, ×) | `label` (required), `size` |
| `Form` | Fields stacked evenly, buttons at the bottom, Enter submits | `actions`, `actionsAlign`: `end` or `between` |
| `TextField` | A labelled one-line input | `hint`, `error`, `required`, `prefix`/`suffix` ("$" … "CAD"), `showCount` with `maxLength` |
| `SelectField`, `TextareaField` | A drop-down; a multi-line input | `placeholder` (select), `showCount` (textarea) |
| `Field` | Label + hint/error around any other control | `group` for controls made of buttons (stepper, segmented) |
| `FormRow` | Fields side by side (stacked on phones) | `columns`: 2 or 3 |
| `CheckboxField` | A tick box with its label | `description`, `indeterminate` |
| `Switch` | An on/off toggle for a setting that applies at once | `description`, `size`, `labelSide`, `disabled` |
| `RadioGroup` | One of a few choices, all visible | `direction`: `column`/`row`; `description`, `disabled` per option |
| `SegmentedControl` | Joined buttons, one chosen (Day / Week / Month) | `size`, `fullWidth` |
| `NumberStepper` | A number with − and + | `min`, `max`, `step`, `unit`, `size` |
| `Toolbar`, `SearchInput` | The row above a list; its search box (Escape clears) | `shortcut`: "/" jumps to the search |
| `FilterChips`, `FilterChipsMulti` | Filter buttons with counts: one at a time, or several | `count` per option; `allLabel` (multi) |
| `DataTable` | Rows and columns; click a row to open it | `sortable` columns + `sort`/`onSort`; `selection`/`onSelectionChange` for ticks; `loading`, `empty`, `minWidth`, `roomy` |
| `LineList` | A short list of lines inside a card | `id`, `value`, `onClick` |
| `Pagination` | "Showing 51–100 of 128" with page buttons | `page` starts at 1 |
| `Drawer` | A panel sliding in from the right, for one item | `size`: `md`/`lg`; `footer`, `footerSpread` |
| `Dialog` | A box in the middle for a short form or choice | `size`: `sm`/`md`/`lg`; `dismissable={false}` |
| `ConfirmDialog` | "Are you sure?" before something irreversible | `confirmLabel` (name the action), `danger`, `busy` |
| `Menu` | A "⋯" button with a short list of actions | `danger`/`disabled` items, `align`, custom `trigger` |
| `Banner` | A notice across the top | `tone`: `info`/`success`/`error`; `action`, `onDismiss` |
| `EmptyState` | What a list says when it's empty | `title` + `action` for a whole empty page |
| `StatusBadge` | A small coloured status | `tone`: `good`, `warn`, `bad`, `info`, `neutral` |
| `Tag` | A label for something chosen | `onRemove` adds a × |
| `ProgressBar`, `Spinner`, `Skeleton` | Progress; "working on it"; a loading placeholder | `tone`/`note`; `size`; `width`/`height` |
| `Avatar` | A round photo, or initials | `src`, `size` |
| `useToast`, `useTheme`, `useEscape` | A short message; light/dark; close on Escape | |
| `useSlidingIndicator` | The highlight that glides to the chosen tab (used by the side panel, Tabs, SegmentedControl, the shop's section tabs and categories) | `axis`: `x` or `y` |
| `useEnterAnimation` | A short fade-and-rise each time a key changes (a new page or section); put it on the part that changes | `rise` in pixels |
| `useContentSwap` | Replacing a list with another (a tab's products): the old fades out, the new rises in one by one; a placeholder if it's slow. Pair with the `ui-leaving` and `ui-stagger` classes | `slowAfter`, `giveUpAfter` (ms) |
| `useScrollFade` | A scrolling box without a scrollbar: its edges fade while there's more that way. Pair with the `ui-scroll-fade` class | |

## Shop pieces: product cards

The shop's own cards, for any page that shows products (the homepage, a category, search, the wishlist, an account page). Unlike
the pieces above, they take a real `Product` and the shop's `CardActions` (add to cart, wishlist, open the product), so they behave
the same everywhere. See them live on `/ui-kit` → **Shop cards**, and the spec (sizes, behaviour, a wishlist example) in Figma:
https://www.figma.com/design/ktDoGrb7ngNJb7U1mbJucY

| Piece | What it is | Options worth knowing |
| --- | --- | --- |
| `ProductCard` | The main product card. `layout="vertical"` (default): photo on top, for grids. `layout="horizontal"`: photo on the left, price on the right, buttons along the bottom, for lists | horizontal only: `meta` (a line under the status), `actions` (more buttons, made with `CardAction`), `onRemove` (a bin instead of the heart) |
| `CardAction` | A quiet pill button for a horizontal card's `actions` ("Add a note", "Move"), or a round icon button | `icon` + `label` (required with `icon`), `pressed` |
| `PreorderCard` | The slim card in the homepage's New pre-orders row | |
| `ProductRow` | One line in the shop's list view | |
| `MiniRow` | A small line with a thumbnail (weekly ranking, just arrived) | `rank`, `quickAdd` |
| `PriceTag` | A price with its currency ("$55.00 CAD", "≈ $40.15 USD") | `cents`, `currency` |

**Recipe: a wishlist page.** One horizontal card per saved product; the page decides the extra line and buttons:

```tsx
import { CardAction, ProductCard } from "../../components/shop/ProductCards";

{items.map((p) => (
  <ProductCard
    key={p.id}
    p={p}
    a={actions} // the shop's CardActions (the storefront builds one; see Storefront.tsx)
    layout="horizontal"
    meta={`Added ${dayLabel(p.addedAt)}`}
    actions={
      <>
        <CardAction onClick={() => openNote(p)}>Add a note</CardAction>
        <CardAction icon label={`Share ${p.name}`} onClick={() => share(p)}>↗</CardAction>
      </>
    }
    onRemove={(p) => removeFromWishlist(p)}
  />
))}
```

Stack them with a 12 px gap (`display: flex; flex-direction: column; gap: 12px`). On a phone the card rearranges itself.

Open each file for the details: every component explains its props at the top.

## Why the folder has no version in its name

The current look is called "v3" in older code (`src/v3/`). These components are deliberately in `src/components/`, not
`src/components/v3/`:

- **The look lives in the tokens, not in the components.** Colours, fonts, corner radii and shadows come from
  `styles/tokens.scss` (`var(--primary)`, `var(--surface)`...). A redesign ("v4") is mostly a new set of token values, and
  every page built from these pieces changes with it.
- **One copy of each piece.** A `v3/` and a `v4/` folder would mean two Buttons and two DataTables to fix and keep in step,
  and pages slowly mixing the two.
- **If a v4 needs a really different component,** change it here behind an option (`variant="..."`) or replace it in one
  go, with `/ui-kit` showing the result. Git keeps the old version, so nothing is lost.

## Rules that keep pages consistent

1. **Build from these pieces, not from scratch.** If you need something they don't do, add it here (with a sample on
   `/ui-kit`) rather than styling it inside your page. Then the next page gets it too.
2. **No new colours or sizes in a page.** Colours come from the shop's tokens (`var(--surface)`, `var(--muted)`, ...
   in `src/components/styles/tokens.scss`), and spacing comes from the pieces.
3. **One primary button per screen.** The rest are `ghost`. Anything that deletes, refunds or can't be undone is `danger`.
4. **Every list says something when it's empty,** and tells the person what would make something appear.
5. **Check it on a phone** (the browser's device toolbar, about 390px wide) **and in dark mode** (the ☀/☾ button).

## Recipe: a page like the admin (for example, the account page)

Nathan's account menu links to `/account`. A page there could look like this:

```tsx
// src/v3/account/AccountPage.tsx
import { useState } from "react";
import { PanelLayout } from "../../components";

type Tab = "orders" | "wishlist" | "addresses" | "profile";
const TABS = [
  { key: "orders" as const, label: "Orders" },
  { key: "wishlist" as const, label: "Wishlist" },
  { key: "addresses" as const, label: "Addresses" },
  { key: "profile" as const, label: "Profile" },
];

export default function AccountPage() {
  const [tab, setTab] = useState<Tab>("orders");
  return (
    <PanelLayout tag="MY ACCOUNT" tabs={TABS} active={tab} onSelect={setTab} title={TABS.find((t) => t.key === tab)!.label}>
      {tab === "orders" && <OrdersTab />}
      {/* …one component per tab, each built from Card, DataTable, Drawer, Form… */}
    </PanelLayout>
  );
}
```

- **Route:** add it in `src/App.tsx`, lazy-loaded like the admin and the other pages.
- **Sign-in:** `useAuth()` from `../hooks` tells you who is signed in. Show the sign-in panel (`SignInPanel` from `../SignIn`)
  to someone who isn't.
- **Data:** call the server with `api()` from `src/lib/api.ts`. A signed-in shopper can already read `GET /orders`,
  `GET /orders/:id` and `GET /wishlist`; see http://localhost:8080/docs for everything.
- **Each tab:** the "Example page" tab on `/ui-kit` is a good starting point. It has a searchable `DataTable`, a `Drawer`
  for one item's details, and a `Form`.

Draw the page first: the Figma file "Spin Hobby: current screens" has the real admin screens to copy from, and an
"Ideas & proposals" page. Agree on the picture, then build it from these pieces.
