import { useState } from "react";
import { useTheme, useToast } from "../hooks";
import {
  Banner, Button, Card, CardGrid, CheckboxField, DataTable, Drawer, EmptyState, FilterChips, Form, FormRow, LineList, LinkButton,
  PanelLayout, PanelStatus, SearchInput, SectionLabel, SelectField, Skeleton, Stats, StatusBadge, TextareaField, TextField, Toolbar,
  type Column,
} from ".";

/**
 * /ui-kit (local and staging only): every shared building block, live, with made-up data. Open it next to your code when building a page
 * like the admin (an account page, a settings page): copy what you need from here, and look at src/v3/ui/README.md for how to use each one.
 */
type Tab = "layout" | "lists" | "forms" | "feedback" | "example";
const TABS: { key: Tab; label: string; badge?: number }[] = [
  { key: "layout", label: "Layout & cards" },
  { key: "lists", label: "Lists & tables" },
  { key: "forms", label: "Forms" },
  { key: "feedback", label: "Messages & status" },
  { key: "example", label: "Example page", badge: 2 },
];

interface SampleOrder { id: number; placed: string; items: string; status: "paid" | "shipped" | "refunded"; total: string }
const ORDERS: SampleOrder[] = [
  { id: 1042, placed: "Oct 18", items: "Sheryl Nome Figure (Macross Frontier)", status: "shipped", total: "$45.00" },
  { id: 1037, placed: "Oct 12", items: "Rem Animal Parade Figure, Re:Zero Acrylic Stand", status: "paid", total: "$62.50" },
  { id: 1021, placed: "Sep 30", items: "Hatsune Miku Fuwa Fuwa Plush", status: "refunded", total: "$34.00" },
];
const STATUS = { paid: { tone: "info", label: "Paid" }, shipped: { tone: "good", label: "Shipped" }, refunded: { tone: "bad", label: "Refunded" } } as const;

export default function UiKitPage() {
  const [tab, setTab] = useState<Tab>("layout");
  const { theme, toggle } = useTheme();
  const { toast, flash } = useToast();
  const title = TABS.find((t) => t.key === tab)!.label;
  return (
    <PanelLayout
      tag="UI KIT"
      tabs={TABS}
      active={tab}
      onSelect={setTab}
      title={title}
      footer={<><PanelStatus color="var(--gold)">Shared pieces: src/v3/ui</PanelStatus><PanelStatus color="#3fbf92">Local and staging only</PanelStatus></>}
      topActions={<button type="button" className="ui-theme" onClick={toggle} aria-label="Toggle dark mode">{theme === "dark" ? "☀" : "☾"}</button>}
      banner={<Banner>This page shows the building blocks with made-up data. Build real pages from them so the whole shop stays consistent.</Banner>}
      toast={toast}
    >
      {tab === "layout" && <LayoutTab />}
      {tab === "lists" && <ListsTab />}
      {tab === "forms" && <FormsTab onSave={() => flash("Saved (nothing is stored on this page)")} />}
      {tab === "feedback" && <FeedbackTab onToast={() => flash("A toast: a short message that goes away by itself")} />}
      {tab === "example" && <ExampleTab onSaved={(m) => flash(m)} />}
    </PanelLayout>
  );
}

function LayoutTab() {
  return (
    <>
      <Card title="PanelLayout" padded>
        <p style={{ margin: 0 }}>This whole page is a <code>PanelLayout</code>: the tabs on the left (with an optional count, like “Example page”), the bar on top with the title and buttons, and the content. On a phone the tabs move behind the ☰ button.</p>
      </Card>
      <Stats items={[{ label: "Stats", value: "3", note: "summary numbers" }, { label: "Clickable", value: "$120", note: "pass onClick", onClick: () => undefined }, { label: "Empty", value: "0" }]} />
      <CardGrid>
        <Card title="Card with a title" action={<LinkButton>An action</LinkButton>} padded><p style={{ margin: 0 }}>Cards hold everything: text, forms, lists. Use <code>padded</code> for text and forms (wrap text in a <code>&lt;p&gt;</code>: a padded card stacks its children).</p></Card>
        <Card title="Buttons" padded>
          <div className="ui-row-gap" style={{ flexWrap: "wrap" }}>
            <Button>Primary</Button><Button variant="ghost">Ghost</Button><Button variant="danger">Danger</Button><Button small>Small</Button><LinkButton>Link button</LinkButton>
          </div>
        </Card>
      </CardGrid>
    </>
  );
}

function ListsTab() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | SampleOrder["status"]>("all");
  const [open, setOpen] = useState<SampleOrder | null>(null);
  const rows = ORDERS.filter((o) => (filter === "all" || o.status === filter) && (!query || `${o.id} ${o.items}`.toLowerCase().includes(query.toLowerCase())));
  const columns: Column<SampleOrder>[] = [
    { key: "id", header: "Order", width: "90px", render: (o) => <b>#{o.id}</b> },
    { key: "items", header: "Items", width: "minmax(200px, 2fr)", render: (o) => <span className="ui-ellipsis" style={{ display: "block" }}>{o.items}</span> },
    { key: "placed", header: "Placed", width: "100px", render: (o) => <span className="ui-text2">{o.placed}</span> },
    { key: "status", header: "Status", width: "110px", render: (o) => <StatusBadge tone={STATUS[o.status].tone}>{STATUS[o.status].label}</StatusBadge> },
    { key: "total", header: "Total", width: "90px", align: "right", render: (o) => <b>{o.total}</b> },
  ];
  return (
    <>
      <Toolbar>
        <SearchInput label="Search orders" placeholder="Search order # or item…" value={query} onChange={setQuery} />
        <FilterChips label="Status" value={filter} onChange={setFilter} options={[
          { key: "all", label: "All", count: ORDERS.length },
          ...(["paid", "shipped", "refunded"] as const).map((s) => ({ key: s, label: STATUS[s].label, count: ORDERS.filter((o) => o.status === s).length })),
        ]} />
      </Toolbar>
      <DataTable label="Orders" columns={columns} rows={rows} rowKey={(o) => o.id} onRowClick={setOpen} selectedKey={open?.id} minWidth={600} empty="No orders match. Try another search or filter." />
      <Card title="LineList (a short list inside a card)">
        <LineList rows={ORDERS} rowKey={(o) => o.id} id={(o) => `#${o.id}`} main={(o) => o.items} value={(o) => o.total} onClick={setOpen} empty="Nothing yet." />
      </Card>
      {open && (
        <Drawer title={`Order #${open.id}`} onClose={() => setOpen(null)} footer={<Button onClick={() => setOpen(null)}>Close</Button>}>
          <StatusBadge tone={STATUS[open.status].tone}>{STATUS[open.status].label}</StatusBadge>
          <div><SectionLabel>Items</SectionLabel>{open.items}</div>
          <div><SectionLabel>Total</SectionLabel><b>{open.total}</b></div>
        </Drawer>
      )}
    </>
  );
}

function FormsTab({ onSave }: { onSave: () => void }) {
  const [form, setForm] = useState({ first: "", last: "", email: "", country: "CA", note: "", news: true });
  const [tried, setTried] = useState(false);
  const emailError = tried && !/^\S+@\S+\.\S+$/.test(form.email) ? "Enter an email like you@example.com" : null;
  return (
    <Card title="A form" padded>
      <Form onSubmit={() => { setTried(true); if (/^\S+@\S+\.\S+$/.test(form.email)) onSave(); }}
        actions={<><Button variant="ghost" onClick={() => setForm({ first: "", last: "", email: "", country: "CA", note: "", news: true })}>Reset</Button><Button type="submit">Save</Button></>}>
        <FormRow>
          <TextField label="First name" value={form.first} onChange={(e) => setForm({ ...form, first: e.target.value })} autoComplete="given-name" />
          <TextField label="Last name" value={form.last} onChange={(e) => setForm({ ...form, last: e.target.value })} autoComplete="family-name" />
        </FormRow>
        <TextField label="Email" required type="email" hint="for receipts" error={emailError} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
        <SelectField label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} options={[{ value: "CA", label: "Canada" }, { value: "US", label: "United States" }]} />
        <TextareaField label="Note" hint="optional" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        <CheckboxField label="Email me about restocks and events" checked={form.news} onChange={(e) => setForm({ ...form, news: e.target.checked })} />
      </Form>
    </Card>
  );
}

function FeedbackTab({ onToast }: { onToast: () => void }) {
  return (
    <>
      <Banner>An info banner: something worth knowing about this page.</Banner>
      <Banner tone="error" action={{ label: "Retry", onClick: () => undefined }}>An error banner, with an action.</Banner>
      <CardGrid>
        <Card title="Status badges" padded>
          <div className="ui-row-gap" style={{ flexWrap: "wrap" }}>
            <StatusBadge>Neutral</StatusBadge><StatusBadge tone="good">Shipped</StatusBadge><StatusBadge tone="warn">Low stock</StatusBadge><StatusBadge tone="bad">Refunded</StatusBadge><StatusBadge tone="info">Paid</StatusBadge>
          </div>
        </Card>
        <Card title="Loading and empty" padded>
          <Skeleton width="70%" /><Skeleton width="45%" />
          <EmptyState>No addresses yet. Add one at checkout and it appears here.</EmptyState>
        </Card>
      </CardGrid>
      <div><Button variant="ghost" onClick={onToast}>Show a toast</Button></div>
    </>
  );
}

/** How the pieces combine into a page: a searchable list with details in a drawer, and a form, like an account page might have. */
function ExampleTab({ onSaved }: { onSaved: (m: string) => void }) {
  const [open, setOpen] = useState<SampleOrder | null>(null);
  const columns: Column<SampleOrder>[] = [
    { key: "id", header: "Order", width: "90px", render: (o) => <b>#{o.id}</b> },
    { key: "items", header: "Items", width: "minmax(180px, 2fr)", render: (o) => <span className="ui-ellipsis" style={{ display: "block" }}>{o.items}</span> },
    { key: "status", header: "Status", width: "110px", render: (o) => <StatusBadge tone={STATUS[o.status].tone}>{STATUS[o.status].label}</StatusBadge> },
    { key: "total", header: "Total", width: "90px", align: "right", render: (o) => <b>{o.total}</b> },
  ];
  return (
    <>
      <Stats items={[{ label: "Orders", value: ORDERS.length }, { label: "On the way", value: 1 }, { label: "Wishlist", value: 5 }]} />
      <Card title="Recent orders" action={<LinkButton>See all</LinkButton>}>
        <DataTable label="Recent orders" columns={columns} rows={ORDERS} rowKey={(o) => o.id} onRowClick={setOpen} selectedKey={open?.id} minWidth={520} empty="No orders yet." />
      </Card>
      <Card title="Contact details" padded>
        <Form onSubmit={() => onSaved("Details saved (nothing is stored on this page)")} actions={<Button type="submit">Save</Button>}>
          <FormRow><TextField label="Name" defaultValue="Aki Tanaka" /><TextField label="Phone" hint="optional" type="tel" /></FormRow>
        </Form>
      </Card>
      {open && <Drawer title={`Order #${open.id}`} onClose={() => setOpen(null)}><div><SectionLabel>Items</SectionLabel>{open.items}</div></Drawer>}
    </>
  );
}
