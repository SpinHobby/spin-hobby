# Shared UI: the building blocks for panel pages

The admin is built from these pieces, and any page that works like it should be too: an account page, a settings page, a
staff tool. Using them keeps every page looking and behaving the same (spacing, colours, dark mode, phones, keyboard), and
means a design change happens in one place.

**See them live:** run the site locally (`npm run dev`) and open **http://localhost:3000/ui-kit**. Every piece is there
with made-up data. It's also on staging, never on the live site.

```tsx
import { PanelLayout, Card, Toolbar, SearchInput, FilterChips, DataTable, Drawer, Form, TextField, Button } from "../ui";
```

## The pieces

| Piece | What it is | Use it for |
| --- | --- | --- |
| `PanelLayout` | Tabs on the left, a bar on top, the content; a ☰ menu on phones | The whole page |
| `PanelStatus` | A dot and a short status line at the bottom of the tabs | "Square connected", "Signed in as…" |
| `Card` | A rounded box, with an optional title row and action | Grouping anything; `padded` for text and forms |
| `CardGrid` | Cards side by side, stacked on phones | Two cards next to each other |
| `Stats` | Summary numbers in a row | "3 orders", "$120 today" |
| `Toolbar` | The row above a list | Holding search, chips and buttons |
| `SearchInput` | The list's search box (Escape clears it) | Filtering a list as you type |
| `FilterChips` | One-of-many filter buttons with counts | "All · 12", "Shipped · 3" |
| `DataTable` | Rows and columns; click a row to open it | Orders, products, addresses |
| `LineList` | A short list of lines inside a card | "Recent orders" |
| `Drawer` | A panel sliding in from the right | The details of one item, an edit form |
| `Form` | Fields stacked evenly, buttons bottom right, Enter submits | Any form |
| `TextField`, `SelectField`, `TextareaField`, `CheckboxField` | A labelled control with a hint or a red error | Form fields |
| `FormRow` | Two fields side by side (one column on phones) | First and last name |
| `SectionLabel` | A small uppercase heading | "Shipping address" inside a card or drawer |
| `Banner` | A notice across the top (info or error, optional action) | "Some data couldn't load. Retry" |
| `EmptyState` | What a list says when it's empty | "No orders yet." |
| `StatusBadge` | A small coloured status label: `good`, `warn`, `bad`, `info`, `neutral` | "Shipped", "Refunded" |
| `Skeleton` | A shimmering placeholder while loading | Before data arrives |
| `Button`, `LinkButton` | `primary` (one per screen), `ghost`, `danger`; `small` | Actions |

Open each file for the details: every component explains its props at the top.

## Rules that keep pages consistent

1. **Build from these pieces, not from scratch.** If you need something they don't do, add it here (with a sample on
   `/ui-kit`) rather than styling it inside your page. Then the next page gets it too.
2. **No new colours or sizes in a page.** Colours come from the shop's tokens (`var(--surface)`, `var(--muted)`, ...
   in `src/v3/tokens.scss`), and spacing comes from the pieces.
3. **One primary button per screen.** The rest are `ghost`. Anything that deletes, refunds or can't be undone is `danger`.
4. **Every list says something when it's empty,** and tells the person what would make something appear.
5. **Check it on a phone** (the browser's device toolbar, about 390px wide) **and in dark mode** (the ☀/☾ button).

## Recipe: a page like the admin (for example, the account page)

Nathan's account menu links to `/account`. A page there could look like this:

```tsx
// src/v3/account/AccountPage.tsx
import { useState } from "react";
import { PanelLayout } from "../ui";

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
