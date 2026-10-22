import { useMemo, useState, type ReactNode } from "react";
import {
  Avatar,
  Banner,
  Button,
  Card,
  CardGrid,
  CheckboxField,
  ConfirmDialog,
  DataTable,
  Dialog,
  Drawer,
  EmptyState,
  Field,
  FilterChips,
  FilterChipsMulti,
  Form,
  FormRow,
  IconButton,
  LineList,
  LinkButton,
  Menu,
  NumberStepper,
  Pagination,
  PanelLayout,
  PanelStatus,
  ProgressBar,
  RadioGroup,
  SearchInput,
  SectionLabel,
  SegmentedControl,
  SelectField,
  Skeleton,
  Spinner,
  Stats,
  StatusBadge,
  Switch,
  Tabs,
  Tag,
  TextareaField,
  TextField,
  Toolbar,
  useTheme,
  useToast,
  type Column,
  type SortState,
} from "..";

/**
 * /ui-kit (local and staging only): every shared building block, live, with made-up data. Open it next to your code when building a page
 * like the admin (an account page, a settings page): copy what you need from here, and see src/components/README.md for how to use each one.
 */
type Tab = "layout" | "buttons" | "forms" | "choices" | "lists" | "overlays" | "feedback" | "example";
const TABS: { key: Tab; label: string; badge?: number }[] = [
  { key: "layout", label: "Layout & cards" },
  { key: "buttons", label: "Buttons & menus" },
  { key: "forms", label: "Text fields & forms" },
  { key: "choices", label: "Checkboxes & toggles" },
  { key: "lists", label: "Lists & tables" },
  { key: "overlays", label: "Drawers & dialogs" },
  { key: "feedback", label: "Messages & status" },
  { key: "example", label: "Example page", badge: 2 },
];

interface SampleOrder {
  id: number;
  placed: string;
  items: string;
  status: "paid" | "shipped" | "refunded";
  total: number;
}
const ORDERS: SampleOrder[] = [
  { id: 1042, placed: "2026-10-18", items: "Sheryl Nome Figure (Macross Frontier)", status: "shipped", total: 45 },
  { id: 1037, placed: "2026-10-12", items: "Rem Animal Parade Figure, Re:Zero Acrylic Stand", status: "paid", total: 62.5 },
  { id: 1033, placed: "2026-10-09", items: "Frieren Pop Up Parade", status: "paid", total: 39.99 },
  { id: 1029, placed: "2026-10-04", items: "Chainsaw Man Pochita Plush", status: "shipped", total: 28 },
  { id: 1021, placed: "2026-09-30", items: "Hatsune Miku Fuwa Fuwa Plush", status: "refunded", total: 34 },
  { id: 1017, placed: "2026-09-26", items: "Spy x Family Anya Nendoroid", status: "shipped", total: 71.25 },
  { id: 1012, placed: "2026-09-21", items: "Jujutsu Kaisen Gojo Keychain ×2", status: "paid", total: 18 },
];
const STATUS = {
  paid: { tone: "info", label: "Paid" },
  shipped: { tone: "good", label: "Shipped" },
  refunded: { tone: "bad", label: "Refunded" },
} as const;
const money = (n: number) => `$${n.toFixed(2)}`;
const date = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric" });

export default function ComponentsPage() {
  const [tab, setTab] = useState<Tab>("layout");
  const { theme, toggle } = useTheme();
  const { toast, flash } = useToast();
  return (
    <PanelLayout
      tag="UI KIT"
      tabs={TABS}
      active={tab}
      onSelect={setTab}
      title={TABS.find((t) => t.key === tab)!.label}
      footer={
        <>
          <PanelStatus color="var(--gold)">Shared pieces: src/components</PanelStatus>
          <PanelStatus color="#3fbf92">Local and staging only</PanelStatus>
        </>
      }
      topActions={<IconButton label="Toggle dark mode" icon={theme === "dark" ? "☀" : "☾"} onClick={toggle} className="ui-theme" />}
      banner={
        <Banner>
          This page shows the building blocks with made-up data. Build real pages from them so the whole shop stays consistent.
        </Banner>
      }
      toast={toast}
    >
      {tab === "layout" && <LayoutTab />}
      {tab === "buttons" && <ButtonsTab onDone={flash} />}
      {tab === "forms" && <FormsTab onSave={() => flash("Saved (nothing is stored on this page)")} />}
      {tab === "choices" && <ChoicesTab />}
      {tab === "lists" && <ListsTab onDone={flash} />}
      {tab === "overlays" && <OverlaysTab onDone={flash} />}
      {tab === "feedback" && <FeedbackTab onToast={() => flash("A toast: a short message that goes away by itself")} />}
      {tab === "example" && <ExampleTab onSaved={flash} />}
    </PanelLayout>
  );
}

/** A labelled sample: the component's name, a note on its options, and the live thing. */
function Sample({ name, note, children }: { name: string; note?: ReactNode; children: ReactNode }) {
  return (
    <Card title={<code>{name}</code>} padded>
      {note && (
        <p className="ui-muted ui-sm" style={{ margin: 0 }}>
          {note}
        </p>
      )}
      {children}
    </Card>
  );
}
const Row = ({ children }: { children: ReactNode }) => (
  <div className="ui-row-gap" style={{ flexWrap: "wrap" }}>
    {children}
  </div>
);

function LayoutTab() {
  const [view, setView] = useState("details");
  return (
    <>
      <Sample
        name="PanelLayout"
        note="This whole page: tabs on the left (with an optional count, like “Example page”), the bar on top, the content. On a phone the tabs move behind ☰."
      >
        <p style={{ margin: 0 }}>
          Props: <code>tabs</code>, <code>active</code>, <code>onSelect</code>, <code>title</code>, <code>tag</code>, <code>footer</code>{" "}
          (PanelStatus lines), <code>topActions</code>, <code>banner</code>, <code>toast</code>.
        </p>
      </Sample>
      <Stats
        items={[
          { label: "Stats", value: "3", note: "summary numbers" },
          { label: "Clickable", value: "$120", note: "pass onClick", onClick: () => undefined },
          { label: "Empty", value: "0" },
        ]}
      />
      <CardGrid>
        <Card title="Card with a title" action={<LinkButton>An action</LinkButton>} padded>
          <p style={{ margin: 0 }}>
            Cards hold everything: text, forms, lists. Use <code>padded</code> for text and forms (wrap text in a <code>&lt;p&gt;</code>: a
            padded card stacks its children).
          </p>
        </Card>
        <Card title="Card without padding">
          <LineList
            rows={ORDERS.slice(0, 3)}
            rowKey={(o) => o.id}
            id={(o) => `#${o.id}`}
            main={(o) => o.items}
            value={(o) => money(o.total)}
            empty="Nothing yet."
          />
        </Card>
      </CardGrid>
      <Sample
        name="Tabs"
        note="Switch between views of one thing, inside a page. variant: underline (default) or pills; count and disabled per tab."
      >
        <Tabs
          label="Order views"
          value={view}
          onChange={setView}
          items={[
            { key: "details", label: "Details" },
            { key: "messages", label: "Messages", count: 2 },
            { key: "history", label: "History" },
            { key: "returns", label: "Returns", disabled: true },
          ]}
        />
        <Tabs
          label="Order views (pills)"
          variant="pills"
          value={view}
          onChange={setView}
          items={[
            { key: "details", label: "Details" },
            { key: "messages", label: "Messages", count: 2 },
            { key: "history", label: "History" },
          ]}
        />
        <p className="ui-text2" style={{ margin: 0 }}>
          Showing: <b>{view}</b>
        </p>
      </Sample>
      <Sample name="SectionLabel" note="A small heading inside a card or drawer.">
        <div>
          <SectionLabel>Shipping address</SectionLabel>
          <span className="ui-text2">12 Queen St W, Toronto ON</span>
        </div>
      </Sample>
    </>
  );
}

function ButtonsTab({ onDone }: { onDone: (m: string) => void }) {
  const [saving, setSaving] = useState(false);
  const save = () => {
    setSaving(true);
    window.setTimeout(() => {
      setSaving(false);
      onDone("Saved");
    }, 1200);
  };
  return (
    <>
      <Sample name="Button: variant" note="primary (one per screen), ghost (the rest), danger (deletes, refunds), gold (a rare highlight).">
        <Row>
          <Button>Primary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="gold">Gold</Button>
          <Button disabled>Disabled</Button>
        </Row>
      </Sample>
      <Sample name="Button: size, icon, loading, fullWidth">
        <Row>
          <Button size="sm">Small</Button>
          <Button>Medium</Button>
          <Button size="lg">Large</Button>
        </Row>
        <Row>
          <Button variant="ghost" icon="＋">
            Add address
          </Button>
          <Button variant="ghost" icon="⬇">
            Export
          </Button>
          <Button loading={saving} onClick={save}>
            {saving ? "Saving…" : "Save (click me)"}
          </Button>
        </Row>
        <Button fullWidth variant="ghost">
          Full width
        </Button>
      </Sample>
      <CardGrid>
        <Sample name="LinkButton" note="Small actions in text or a row. danger for Remove.">
          <Row>
            <LinkButton>Edit</LinkButton>
            <LinkButton>See all</LinkButton>
            <LinkButton danger>Remove</LinkButton>
          </Row>
        </Sample>
        <Sample name="IconButton" note="Only an icon; label is required (screen readers, tooltip). size: sm | md.">
          <Row>
            <IconButton label="Edit" icon="✎" />
            <IconButton label="Delete" icon="🗑" />
            <IconButton label="Close" icon="×" size="sm" />
          </Row>
        </Sample>
      </CardGrid>
      <Sample name="Menu" note='A button that opens a short list of actions. danger items are red; align="right" near the right edge.'>
        <Row>
          <Menu
            label="More actions for order 1042"
            items={[
              { label: "View order", onSelect: () => onDone("View order") },
              { label: "Print packing slip", onSelect: () => onDone("Print packing slip") },
              { label: "Refund (disabled)", onSelect: () => undefined, disabled: true },
              { label: "Cancel order", onSelect: () => onDone("Cancel order"), danger: true },
            ]}
          />
          <Menu
            label="Sort"
            trigger="Sort: Newest ▾"
            items={[
              { label: "Newest", onSelect: () => onDone("Newest") },
              { label: "Oldest", onSelect: () => onDone("Oldest") },
            ]}
          />
        </Row>
      </Sample>
    </>
  );
}

function FormsTab({ onSave }: { onSave: () => void }) {
  const empty = { first: "", last: "", email: "", country: "", note: "", price: "", title: "", city: "", province: "ON", postal: "" };
  const [form, setForm] = useState(empty);
  const [tried, setTried] = useState(false);
  const set = (k: keyof typeof empty) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const emailOk = /^\S+@\S+\.\S+$/.test(form.email);
  return (
    <>
      <Card title="Form, FormRow, TextField, SelectField, TextareaField" padded>
        <Form
          onSubmit={() => {
            setTried(true);
            if (emailOk) onSave();
          }}
          actionsAlign="between"
          actions={
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setForm(empty);
                  setTried(false);
                }}
              >
                Reset
              </Button>
              <Button type="submit">Save</Button>
            </>
          }
        >
          <FormRow>
            <TextField label="First name" value={form.first} onChange={set("first")} autoComplete="given-name" />
            <TextField label="Last name" value={form.last} onChange={set("last")} autoComplete="family-name" />
          </FormRow>
          <TextField
            label="Email"
            required
            type="email"
            hint="for receipts"
            error={tried && !emailOk ? "Enter an email like you@example.com" : null}
            value={form.email}
            onChange={set("email")}
            autoComplete="email"
          />
          <FormRow columns={3}>
            <TextField label="City" value={form.city} onChange={set("city")} />
            <SelectField
              label="Province"
              value={form.province}
              onChange={set("province")}
              options={[
                { value: "ON", label: "Ontario" },
                { value: "QC", label: "Quebec" },
                { value: "BC", label: "British Columbia" },
              ]}
            />
            <TextField label="Postal code" value={form.postal} onChange={set("postal")} placeholder="M5H 2N2" />
          </FormRow>
          <SelectField
            label="Country"
            placeholder="Choose a country"
            value={form.country}
            onChange={set("country")}
            options={[
              { value: "CA", label: "Canada" },
              { value: "US", label: "United States" },
            ]}
          />
          <FormRow>
            <TextField
              label="Price"
              prefix="$"
              suffix="CAD"
              inputMode="decimal"
              value={form.price}
              onChange={set("price")}
              placeholder="0.00"
            />
            <TextField label="Listing title" showCount maxLength={80} value={form.title} onChange={set("title")} />
          </FormRow>
          <TextareaField label="Note" hint="optional" showCount maxLength={300} value={form.note} onChange={set("note")} />
        </Form>
      </Card>
      <Sample
        name="TextField options"
        note="prefix / suffix, showCount with maxLength, hint, error, disabled, and anything an <input> takes."
      >
        <FormRow>
          <TextField label="Disabled" disabled value="Can't change this" readOnly />
          <TextField label="With an error" error="That code has expired" defaultValue="FALL10" />
        </FormRow>
      </Sample>
    </>
  );
}

function ChoicesTab() {
  const [news, setNews] = useState(true);
  const [sms, setSms] = useState(false);
  const [visible, setVisible] = useState(true);
  const [maint, setMaint] = useState(false);
  const [ship, setShip] = useState<"standard" | "express" | "pickup">("standard");
  const [size, setSize] = useState<"s" | "m" | "l">("m");
  const [range, setRange] = useState<"day" | "week" | "month">("week");
  const [stock, setStock] = useState(3);
  const [qty, setQty] = useState(1);
  const all = news && sms;
  return (
    <>
      <CardGrid>
        <Sample
          name="CheckboxField"
          note="A choice saved with the form's Save button. description adds a quiet line; indeterminate shows a dash."
        >
          <CheckboxField
            label="All notifications"
            checked={all}
            indeterminate={(news || sms) && !all}
            onChange={() => {
              setNews(!all);
              setSms(!all);
            }}
          />
          <div style={{ paddingLeft: 24, display: "flex", flexDirection: "column", gap: 10 }}>
            <CheckboxField
              label="Email me about restocks"
              description="At most one email a week."
              checked={news}
              onChange={(e) => setNews(e.target.checked)}
            />
            <CheckboxField label="Text me when an order ships" checked={sms} onChange={(e) => setSms(e.target.checked)} />
          </div>
          <CheckboxField label="Disabled" disabled checked readOnly />
        </Sample>
        <Sample name="Switch" note="A setting that takes effect at once. size: sm | md; labelSide: left | right; description.">
          <Switch label="Show on the website" description="Shoppers can find and buy it." checked={visible} onChange={setVisible} />
          <Switch label="Maintenance mode" checked={maint} onChange={setMaint} labelSide="left" />
          <Switch label="Small switch" size="sm" checked={visible} onChange={setVisible} />
          <Switch label="Disabled" checked={false} onChange={() => undefined} disabled />
        </Sample>
      </CardGrid>
      <CardGrid>
        <Sample
          name="RadioGroup"
          note="One choice out of a few, all visible. direction: column | row; description and disabled per option."
        >
          <RadioGroup
            label="Shipping"
            value={ship}
            onChange={setShip}
            options={[
              { value: "standard", label: "Standard · $9.99", description: "3–7 business days" },
              { value: "express", label: "Express · $19.99", description: "1–2 business days" },
              { value: "pickup", label: "Pick up at an event", description: "None scheduled right now", disabled: true },
            ]}
          />
          <RadioGroup
            label="Size"
            direction="row"
            value={size}
            onChange={setSize}
            options={[
              { value: "s", label: "Small" },
              { value: "m", label: "Medium" },
              { value: "l", label: "Large" },
            ]}
          />
        </Sample>
        <Sample name="SegmentedControl" note="Two to four short options that switch a view. size: sm | md; fullWidth.">
          <SegmentedControl
            label="Range"
            value={range}
            onChange={setRange}
            options={[
              { value: "day", label: "Day" },
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
            ]}
          />
          <SegmentedControl
            label="Range (small)"
            size="sm"
            value={range}
            onChange={setRange}
            options={[
              { value: "day", label: "Day" },
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
            ]}
          />
          <SegmentedControl
            label="Range (full width)"
            fullWidth
            value={range}
            onChange={setRange}
            options={[
              { value: "day", label: "Day" },
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
            ]}
          />
        </Sample>
      </CardGrid>
      <Sample
        name="NumberStepper"
        note="A number with − and +. min, max, step, unit, size: sm | md. Wrap it in Field with group for a visible label."
      >
        <Row>
          <Field label="Stock" group>
            <NumberStepper label="Stock" value={stock} onChange={setStock} unit="in stock" />
          </Field>
          <Field label="Quantity (max 5)" group>
            <NumberStepper label="Quantity" value={qty} onChange={setQty} min={1} max={5} size="sm" />
          </Field>
          <Field label="Disabled" group>
            <NumberStepper label="Disabled" value={0} onChange={() => undefined} disabled />
          </Field>
        </Row>
      </Sample>
    </>
  );
}

function ListsTab({ onDone }: { onDone: (m: string) => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | SampleOrder["status"]>("all");
  const [kinds, setKinds] = useState<("figures" | "plush" | "keychains")[]>([]);
  const [sort, setSort] = useState<SortState>({ key: "placed", dir: "desc" });
  const [picked, setPicked] = useState<Set<string | number>>(new Set());
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<SampleOrder | null>(null);
  const PAGE = 4;
  const rows = useMemo(() => {
    const q = query.toLowerCase();
    const list = ORDERS.filter((o) => (filter === "all" || o.status === filter) && (!q || `${o.id} ${o.items}`.toLowerCase().includes(q)));
    const by = (o: SampleOrder) => (sort.key === "total" ? o.total : sort.key === "id" ? o.id : o.placed);
    return [...list].sort((a, b) => (by(a) < by(b) ? -1 : by(a) > by(b) ? 1 : 0) * (sort.dir === "asc" ? 1 : -1));
  }, [query, filter, sort]);
  const shown = rows.slice((page - 1) * PAGE, page * PAGE);
  const columns: Column<SampleOrder>[] = [
    { key: "id", header: "Order", width: "90px", sortable: true, render: (o) => <b>#{o.id}</b> },
    {
      key: "items",
      header: "Items",
      width: "minmax(200px, 2fr)",
      render: (o) => (
        <span className="ui-ellipsis" style={{ display: "block" }}>
          {o.items}
        </span>
      ),
    },
    { key: "placed", header: "Placed", width: "100px", sortable: true, render: (o) => <span className="ui-text2">{date(o.placed)}</span> },
    {
      key: "status",
      header: "Status",
      width: "110px",
      render: (o) => <StatusBadge tone={STATUS[o.status].tone}>{STATUS[o.status].label}</StatusBadge>,
    },
    { key: "total", header: "Total", width: "90px", align: "right", sortable: true, render: (o) => <b>{money(o.total)}</b> },
    {
      key: "more",
      header: "",
      width: "40px",
      render: (o) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Menu
            label={`More actions for order ${o.id}`}
            align="right"
            items={[
              { label: "Open", onSelect: () => setOpen(o) },
              { label: "Print packing slip", onSelect: () => onDone(`Printing #${o.id}`) },
            ]}
          />
        </span>
      ),
    },
  ];
  return (
    <>
      <p className="ui-muted ui-sm" style={{ margin: 0 }}>
        <code>Toolbar</code> + <code>SearchInput</code> (press <kbd>/</kbd> to jump to it) + <code>FilterChips</code>, then a{" "}
        <code>DataTable</code> with sortable headers, ticks, a <code>Menu</code> per row and <code>Pagination</code>. Click a row for the{" "}
        <code>Drawer</code>.
      </p>
      <Toolbar>
        <SearchInput
          label="Search orders"
          placeholder="Search order # or item…"
          shortcut
          value={query}
          onChange={(v) => {
            setQuery(v);
            setPage(1);
          }}
        />
        <FilterChips
          label="Status"
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setPage(1);
          }}
          options={[
            { key: "all", label: "All", count: ORDERS.length },
            ...(["paid", "shipped", "refunded"] as const).map((s) => ({
              key: s,
              label: STATUS[s].label,
              count: ORDERS.filter((o) => o.status === s).length,
            })),
          ]}
        />
      </Toolbar>
      {picked.size > 0 && (
        <Banner action={{ label: "Clear", onClick: () => setPicked(new Set()) }}>
          {picked.size} ticked. Actions for several rows go here (Mark shipped, Export).
        </Banner>
      )}
      <DataTable
        label="Orders"
        columns={columns}
        rows={shown}
        rowKey={(o) => o.id}
        onRowClick={setOpen}
        selectedKey={open?.id}
        sort={sort}
        onSort={setSort}
        selection={picked}
        onSelectionChange={setPicked}
        minWidth={680}
        empty="No orders match. Try another search or filter."
      />
      <Pagination page={page} pageSize={PAGE} total={rows.length} onPage={setPage} />
      <Sample name="FilterChipsMulti" note="Several filters on together; none on means everything.">
        <FilterChipsMulti
          label="Kinds"
          value={kinds}
          onChange={setKinds}
          options={[
            { key: "figures", label: "Figures", count: 4 },
            { key: "plush", label: "Plush", count: 2 },
            { key: "keychains", label: "Keychains", count: 1 },
          ]}
        />
        <Row>
          {kinds.length ? (
            kinds.map((k) => (
              <Tag key={k} onRemove={() => setKinds(kinds.filter((x) => x !== k))}>
                {k}
              </Tag>
            ))
          ) : (
            <span className="ui-muted ui-sm">No filters: showing everything.</span>
          )}
        </Row>
      </Sample>
      <Sample name="DataTable: loading and empty">
        <DataTable label="Loading example" columns={columns.slice(0, 3)} rows={[]} rowKey={(o) => o.id} loading empty="" minWidth={0} />
        <DataTable
          label="Empty example"
          columns={columns.slice(0, 3)}
          rows={[]}
          rowKey={(o) => o.id}
          empty="No orders yet. Your orders appear here after checkout."
          minWidth={0}
        />
      </Sample>
      {open && (
        <Drawer
          title={`Order #${open.id}`}
          onClose={() => setOpen(null)}
          footerSpread
          footer={
            <>
              <Button variant="danger" onClick={() => onDone("Refund: would ask first")}>
                Refund
              </Button>
              <Button onClick={() => setOpen(null)}>Close</Button>
            </>
          }
        >
          <StatusBadge tone={STATUS[open.status].tone}>{STATUS[open.status].label}</StatusBadge>
          <div>
            <SectionLabel>Items</SectionLabel>
            {open.items}
          </div>
          <div>
            <SectionLabel>Placed</SectionLabel>
            {date(open.placed)}
          </div>
          <div>
            <SectionLabel>Total</SectionLabel>
            <b>{money(open.total)}</b>
          </div>
        </Drawer>
      )}
    </>
  );
}

function OverlaysTab({ onDone }: { onDone: (m: string) => void }) {
  const [drawer, setDrawer] = useState<"md" | "lg" | null>(null);
  const [dialog, setDialog] = useState<"sm" | "md" | "lg" | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const remove = () => {
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setConfirm(false);
      onDone("Address deleted (not really)");
    }, 1000);
  };
  return (
    <>
      <CardGrid>
        <Sample name="Drawer" note="Slides in from the right for one item's details. size: md (460px) | lg (640px); footer; footerSpread.">
          <Row>
            <Button variant="ghost" onClick={() => setDrawer("md")}>
              Open a drawer
            </Button>
            <Button variant="ghost" onClick={() => setDrawer("lg")}>
              Open a wide drawer
            </Button>
          </Row>
        </Sample>
        <Sample
          name="Dialog"
          note="A box in the middle for a short form or choice. size: sm | md | lg; dismissable={false} must be answered."
        >
          <Row>
            <Button variant="ghost" onClick={() => setDialog("sm")}>
              Small
            </Button>
            <Button variant="ghost" onClick={() => setDialog("md")}>
              Medium
            </Button>
            <Button variant="ghost" onClick={() => setDialog("lg")}>
              Large
            </Button>
          </Row>
        </Sample>
      </CardGrid>
      <Sample
        name="ConfirmDialog"
        note="“Are you sure?” before something that can't be undone. Name the action on the button; danger makes it red; busy shows it working."
      >
        <div>
          <Button variant="danger" onClick={() => setConfirm(true)}>
            Delete address
          </Button>
        </div>
      </Sample>
      {drawer && (
        <Drawer
          title={drawer === "lg" ? "Edit product" : "Edit address"}
          size={drawer}
          onClose={() => setDrawer(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDrawer(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setDrawer(null);
                  onDone("Saved");
                }}
              >
                Save
              </Button>
            </>
          }
        >
          <TextField label="Name" defaultValue="Aki Tanaka" />
          <TextField label="Street" defaultValue="12 Queen St W" />
          <FormRow>
            <TextField label="City" defaultValue="Toronto" />
            <TextField label="Postal code" defaultValue="M5H 2N2" />
          </FormRow>
        </Drawer>
      )}
      {dialog && (
        <Dialog
          title="Add a note to this order"
          size={dialog}
          onClose={() => setDialog(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setDialog(null);
                  onDone("Note added");
                }}
              >
                Add note
              </Button>
            </>
          }
        >
          <p style={{ margin: 0 }}>
            Only staff see notes. This dialog is <b>{dialog}</b>.
          </p>
          <TextareaField label="Note" rows={3} />
        </Dialog>
      )}
      {confirm && (
        <ConfirmDialog
          title="Delete this address?"
          message="12 Queen St W, Toronto will be removed from your account. Past orders keep their address."
          confirmLabel="Delete address"
          danger
          busy={busy}
          onConfirm={remove}
          onCancel={() => setConfirm(false)}
        />
      )}
    </>
  );
}

function FeedbackTab({ onToast }: { onToast: () => void }) {
  const [shown, setShown] = useState(true);
  const [progress, setProgress] = useState(35);
  return (
    <>
      <Banner>An info banner: something worth knowing about this page.</Banner>
      <Banner tone="success">A success banner: your changes are live.</Banner>
      <Banner tone="error" action={{ label: "Retry", onClick: () => undefined }}>
        An error banner, with an action.
      </Banner>
      {shown && <Banner onDismiss={() => setShown(false)}>A banner that can be dismissed with ×.</Banner>}
      <CardGrid>
        <Sample name="StatusBadge" note="tone by meaning: good, warn, bad, info, neutral.">
          <Row>
            <StatusBadge>Neutral</StatusBadge>
            <StatusBadge tone="good">Shipped</StatusBadge>
            <StatusBadge tone="warn">Low stock</StatusBadge>
            <StatusBadge tone="bad">Refunded</StatusBadge>
            <StatusBadge tone="info">Paid</StatusBadge>
          </Row>
        </Sample>
        <Sample name="Tag" note="Something chosen or attached; onRemove adds a ×.">
          <Row>
            <Tag>Figures</Tag>
            <Tag>Pre-order</Tag>
            <Tag onRemove={() => undefined}>Macross Frontier</Tag>
          </Row>
        </Sample>
      </CardGrid>
      <CardGrid>
        <Sample name="ProgressBar" note="value 0–100; label, note, tone: primary | good | warn.">
          <ProgressBar label="Uploading photos" value={progress} />
          <ProgressBar label="Storage" note="8.2 of 10 GB" value={82} tone="warn" />
          <ProgressBar value={100} tone="good" />
          <Row>
            <Button size="sm" variant="ghost" onClick={() => setProgress((p) => (p >= 100 ? 0 : p + 15))}>
              Advance
            </Button>
          </Row>
        </Sample>
        <Sample name="Spinner, Skeleton" note="Spinner for “working on it” (size sm | md | lg); Skeleton where content will appear.">
          <Row>
            <Spinner size="sm" />
            <Spinner />
            <Spinner size="lg" />
          </Row>
          <Skeleton width="70%" />
          <Skeleton width="45%" />
          <Skeleton height={60} />
        </Sample>
      </CardGrid>
      <CardGrid>
        <Sample
          name="EmptyState"
          note="Say what would make something appear. With title (and action) it becomes a bigger block for an empty page."
        >
          <EmptyState>No addresses yet. Add one at checkout and it appears here.</EmptyState>
          <EmptyState title="Your wishlist is empty" action={<Button size="sm">Browse the shop</Button>}>
            Tap ♡ on any product to save it here.
          </EmptyState>
        </Sample>
        <Sample name="Avatar" note="A picture, or initials when there is none. size in pixels.">
          <Row>
            <Avatar name="Aki Tanaka" />
            <Avatar name="nathan@spinhobby.com" size={40} />
            <Avatar name="Sheryl Nome" size={56} />
          </Row>
        </Sample>
      </CardGrid>
      <div>
        <Button variant="ghost" onClick={onToast}>
          Show a toast
        </Button>
      </div>
    </>
  );
}

/** How the pieces combine into a page: a searchable list with details in a drawer, and a form, like an account page might have. */
function ExampleTab({ onSaved }: { onSaved: (m: string) => void }) {
  const [view, setView] = useState<"orders" | "wishlist">("orders");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<SampleOrder | null>(null);
  const [emails, setEmails] = useState(true);
  const rows = ORDERS.filter((o) => !query || `${o.id} ${o.items}`.toLowerCase().includes(query.toLowerCase()));
  const columns: Column<SampleOrder>[] = [
    { key: "id", header: "Order", width: "90px", render: (o) => <b>#{o.id}</b> },
    {
      key: "items",
      header: "Items",
      width: "minmax(180px, 2fr)",
      render: (o) => (
        <span className="ui-ellipsis" style={{ display: "block" }}>
          {o.items}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "110px",
      render: (o) => <StatusBadge tone={STATUS[o.status].tone}>{STATUS[o.status].label}</StatusBadge>,
    },
    { key: "total", header: "Total", width: "90px", align: "right", render: (o) => <b>{money(o.total)}</b> },
  ];
  return (
    <>
      <div className="ui-row-gap">
        <Avatar name="Aki Tanaka" size={44} />
        <div>
          <div className="ui-strong">Aki Tanaka</div>
          <div className="ui-muted ui-sm">Member since 2025</div>
        </div>
      </div>
      <Stats
        items={[
          { label: "Orders", value: ORDERS.length },
          { label: "On the way", value: 1 },
          { label: "Wishlist", value: 5 },
        ]}
      />
      <Card>
        <div style={{ padding: "4px 12px 0" }}>
          <Tabs
            label="My things"
            value={view}
            onChange={setView}
            items={[
              { key: "orders", label: "Orders", count: ORDERS.length },
              { key: "wishlist", label: "Wishlist", count: 0 },
            ]}
          />
        </div>
        {view === "orders" ? (
          <div className="ui-pad">
            <Toolbar>
              <SearchInput label="Search my orders" placeholder="Search order # or item…" value={query} onChange={setQuery} />
            </Toolbar>
            <DataTable
              label="My orders"
              columns={columns}
              rows={rows}
              rowKey={(o) => o.id}
              onRowClick={setOpen}
              selectedKey={open?.id}
              minWidth={520}
              empty="No orders match that search."
            />
          </div>
        ) : (
          <EmptyState title="Your wishlist is empty" action={<Button size="sm">Browse the shop</Button>}>
            Tap ♡ on any product to save it here.
          </EmptyState>
        )}
      </Card>
      <Card title="Contact details" padded>
        <Form onSubmit={() => onSaved("Details saved (nothing is stored on this page)")} actions={<Button type="submit">Save</Button>}>
          <FormRow>
            <TextField label="Name" defaultValue="Aki Tanaka" autoComplete="name" />
            <TextField label="Phone" hint="optional" type="tel" autoComplete="tel" />
          </FormRow>
          <Switch label="Email me about restocks and events" checked={emails} onChange={setEmails} />
        </Form>
      </Card>
      {open && (
        <Drawer title={`Order #${open.id}`} onClose={() => setOpen(null)}>
          <div>
            <SectionLabel>Items</SectionLabel>
            {open.items}
          </div>
          <div>
            <SectionLabel>Total</SectionLabel>
            <b>{money(open.total)}</b>
          </div>
        </Drawer>
      )}
    </>
  );
}
