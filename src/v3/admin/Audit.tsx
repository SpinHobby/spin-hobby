import { useCallback, useEffect, useMemo, useState } from "react";
import { api, apiBlob } from "../../lib/api";
import { dateLabel, money } from "../format";
import type { OrderStatus } from "../types";
import {
  Banner,
  Button,
  Card,
  DataTable,
  Dialog,
  EmptyState,
  LineList,
  SegmentedControl,
  Spinner,
  Stats,
  StatusBadge,
  Switch,
  Tabs,
  TextField,
  type Column,
} from "../../components";
import { ORDER_STATUS } from "./data";
import type { Ctx } from "./Screens";

type AuditTab = "documents" | "sales" | "access";
const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

/**
 * Admin > Audit: the shop's audit documents (one Google Drive folder, read through the API) and sales records for a period, for the
 * owner and the staff they allow. The API refuses everyone else, so this screen only decides what to show.
 */
export function AuditScreen({ ctx }: { ctx: Ctx }) {
  const [tab, setTab] = useState<AuditTab>("documents");
  return (
    <>
      <p className="ad-muted" style={{ margin: 0 }}>
        Records for your accountant or an audit. Only owners and the staff they allow can open this page, and every document opened is
        logged.
      </p>
      <Tabs<AuditTab>
        label="Audit"
        value={tab}
        onChange={setTab}
        items={[
          { key: "documents", label: "Documents" },
          { key: "sales", label: "Sales records" },
          ...(ctx.isOwner ? [{ key: "access" as const, label: "Who can see this" }] : []),
        ]}
      />
      {tab === "documents" && <Documents />}
      {tab === "sales" && <Sales />}
      {tab === "access" && ctx.isOwner && <Access flash={ctx.flash} />}
    </>
  );
}

// ---------------------------------------------------------------- documents (Google Drive)

interface DriveEntry {
  id: string;
  name: string;
  mimeType: string;
  folder: boolean;
  size: number | null;
  modifiedTime: string;
}
type FolderView = { connected: false } | { connected: true; path: { id: string; name: string }[]; files: DriveEntry[] };

function Documents() {
  const [folderId, setFolderId] = useState<string | null>(null);
  const [view, setView] = useState<FolderView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<DriveEntry | null>(null);

  const load = useCallback(() => {
    setError(null);
    setView(null);
    api<FolderView>(folderId ? `/admin/audit/folders/${encodeURIComponent(folderId)}` : "/admin/audit/documents")
      .then(setView)
      .catch((e) => setError(errMsg(e)));
  }, [folderId]);
  useEffect(load, [load]);

  if (error)
    return (
      <Banner tone="error" action={{ label: "Try again", onClick: load }}>
        {error}
      </Banner>
    );
  if (view && !view.connected)
    return (
      <EmptyState title="Google Drive isn't connected yet">
        Put the shop's audit documents in one Google Drive folder and share it (as Viewer) with the shop's Google service account. The
        developer then adds <code>GOOGLE_SERVICE_ACCOUNT_JSON</code> and <code>AUDIT_DRIVE_FOLDER_ID</code> to the API's settings (see its{" "}
        <code>.env.example</code>). Sales records work without it.
      </EmptyState>
    );

  const columns: Column<DriveEntry>[] = [
    {
      key: "name",
      header: "Name",
      width: "minmax(220px, 3fr)",
      render: (f) => (
        <span>
          <span aria-hidden style={{ marginRight: 8 }}>
            {f.folder ? "📁" : f.mimeType === "application/pdf" ? "📄" : f.mimeType.startsWith("image/") ? "🖼" : "📎"}
          </span>
          {f.name}
        </span>
      ),
    },
    { key: "modified", header: "Modified", width: "140px", render: (f) => dateLabel(f.modifiedTime) },
    { key: "size", header: "Size", width: "90px", align: "right", render: (f) => (f.folder ? "" : fileSize(f.size)) },
  ];

  return (
    <Card>
      {view?.connected && (
        <nav className="ad-audit__path" aria-label="Folder">
          {view.path.map((p, i) =>
            i === view.path.length - 1 ? (
              <b key={p.id} aria-current="page">
                {p.name}
              </b>
            ) : (
              <span key={p.id}>
                <button type="button" className="ui-link" onClick={() => setFolderId(i === 0 ? null : p.id)}>
                  {p.name}
                </button>
                <span aria-hidden> › </span>
              </span>
            ),
          )}
        </nav>
      )}
      <DataTable
        label="Documents"
        columns={columns}
        rows={view?.connected ? view.files : []}
        rowKey={(f) => f.id}
        loading={!view}
        minWidth={480}
        onRowClick={(f) => (f.folder ? setFolderId(f.id) : setOpen(f))}
        empty={<EmptyState>This folder is empty.</EmptyState>}
      />
      {open && <DocumentViewer file={open} onClose={() => setOpen(null)} />}
    </Card>
  );
}

/** A document from the audit folder, shown inside the admin: PDFs in the browser's viewer, images as they are, anything else to download. */
function DocumentViewer({ file, onClose }: { file: DriveEntry; onClose: () => void }) {
  const [doc, setDoc] = useState<{ url: string; type: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let url: string | null = null;
    apiBlob(`/admin/audit/documents/${encodeURIComponent(file.id)}`)
      .then((blob) => {
        url = URL.createObjectURL(blob);
        setDoc({ url, type: blob.type });
      })
      .catch((e) => setError(errMsg(e)));
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [file.id]);
  const name = file.mimeType.startsWith("application/vnd.google-apps.") ? `${file.name}.pdf` : file.name;
  return (
    <Dialog
      title={file.name}
      size="lg"
      onClose={onClose}
      footer={
        doc && (
          <a className="sh-btn sh-btn--ghost" href={doc.url} download={name}>
            Download
          </a>
        )
      }
    >
      {error ? (
        <Banner tone="error">{error}</Banner>
      ) : !doc ? (
        <div className="ad-audit__loading">
          <Spinner label="Loading the document" />
        </div>
      ) : doc.type === "application/pdf" ? (
        <iframe className="ad-audit__doc" src={doc.url} title={file.name} />
      ) : doc.type.startsWith("image/") ? (
        <img className="ad-audit__img" src={doc.url} alt={file.name} />
      ) : (
        <p style={{ margin: 0 }}>This kind of file can't be shown here. Use Download to open it.</p>
      )}
    </Dialog>
  );
}

function fileSize(bytes: number | null) {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ---------------------------------------------------------------- sales records

interface SalesOrder {
  id: number;
  paid_at: string;
  status: OrderStatus;
  provider: string;
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  refunded_cents: number;
  country: string | null;
  province: string | null;
  billing_email: string;
}
interface SalesReport {
  from: string;
  to: string;
  totals: {
    orders: number;
    subtotalCents: number;
    shippingCents: number;
    taxCents: number;
    grossCents: number;
    refunds: number;
    refundedCents: number;
    netCents: number;
  };
  taxByRegion: { country: string | null; province: string | null; orders: number; taxCents: number; totalCents: number }[];
  orders: SalesOrder[];
  refunds: { order_id: number; created_at: string; amount_cents: number }[];
}
type Preset = "month" | "lastMonth" | "year" | "custom";

/** A day (YYYY-MM-DD) in the shop's time zone, which is how the API counts days. */
const shopDay = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto" }).format(date);
/** "Oct 1, 2026" in the shop's time zone, so a sale shows on the day the report counts it, wherever the viewer is. */
const shopDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "short", day: "numeric" });
function presetRange(preset: Exclude<Preset, "custom">): [string, string] {
  const [y, m] = shopDay(new Date()).split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (preset === "year") return [`${y}-01-01`, `${y}-12-31`];
  const [yy, mm] = preset === "month" ? [y, m] : m === 1 ? [y - 1, 12] : [y, m - 1];
  return [`${yy}-${pad(mm)}-01`, `${yy}-${pad(mm)}-${pad(lastDay(yy, mm))}`];
}

function Sales() {
  const [preset, setPreset] = useState<Preset>("month");
  const [range, setRange] = useState<[string, string]>(() => presetRange("month"));
  const [report, setReport] = useState<SalesReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!range[0] || !range[1]) return;
    let live = true;
    setError(null);
    setReport(null);
    api<SalesReport>(`/admin/audit/sales?from=${range[0]}&to=${range[1]}`)
      .then((r) => live && setReport(r))
      .catch((e) => live && setError(errMsg(e)));
    return () => {
      live = false;
    };
  }, [range]);

  const choose = (p: Preset) => {
    setPreset(p);
    if (p !== "custom") setRange(presetRange(p));
  };

  const columns = useMemo<Column<SalesOrder>[]>(
    () => [
      { key: "id", header: "Order", width: "80px", render: (o) => `#${o.id}` },
      { key: "paid", header: "Paid", width: "110px", render: (o) => shopDate(o.paid_at) },
      { key: "where", header: "Province", width: "90px", render: (o) => [o.province, o.country].filter(Boolean).join(", ") },
      { key: "sub", header: "Items", width: "90px", align: "right", render: (o) => money(o.subtotal_cents) },
      { key: "ship", header: "Shipping", width: "90px", align: "right", render: (o) => money(o.shipping_cents) },
      { key: "tax", header: "Tax", width: "80px", align: "right", render: (o) => money(o.tax_cents) },
      { key: "total", header: "Total", width: "90px", align: "right", render: (o) => <b>{money(o.total_cents)}</b> },
      {
        key: "refund",
        header: "Refunded",
        width: "90px",
        align: "right",
        render: (o) => (o.refunded_cents ? money(o.refunded_cents) : ""),
      },
      {
        key: "status",
        header: "Status",
        width: "120px",
        render: (o) => (
          <StatusBadge tone={o.status === "refunded" ? "bad" : "neutral"}>{ORDER_STATUS[o.status]?.label ?? o.status}</StatusBadge>
        ),
      },
    ],
    [],
  );

  const t = report?.totals;
  return (
    <>
      <div className="ad-audit__period">
        <SegmentedControl<Preset>
          label="Period"
          value={preset}
          onChange={choose}
          options={[
            { value: "month", label: "This month" },
            { value: "lastMonth", label: "Last month" },
            { value: "year", label: "This year" },
            { value: "custom", label: "Custom" },
          ]}
        />
        {preset === "custom" && (
          <>
            <TextField label="From" type="date" value={range[0]} onChange={(e) => setRange([e.target.value, range[1]])} />
            <TextField label="To" type="date" value={range[1]} onChange={(e) => setRange([range[0], e.target.value])} />
          </>
        )}
        <span className="ad-muted ad-sm">Days in Toronto time · amounts in CAD</span>
        {report && report.orders.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => downloadCsv(report)}>
            Download CSV
          </Button>
        )}
      </div>
      {error && <Banner tone="error">{error}</Banner>}
      <Stats
        items={[
          { label: "Orders paid", value: t ? t.orders : "…" },
          { label: "Items", value: t ? money(t.subtotalCents) : "…" },
          { label: "Shipping", value: t ? money(t.shippingCents) : "…" },
          { label: "Tax collected", value: t ? money(t.taxCents) : "…" },
          {
            label: "Refunded",
            value: t ? money(t.refundedCents) : "…",
            note: t ? `${t.refunds} refund${t.refunds === 1 ? "" : "s"} made in this period` : undefined,
          },
          { label: "Net", value: t ? money(t.netCents) : "…", note: t ? `${money(t.grossCents)} paid, less refunds` : undefined },
        ]}
      />
      {report && report.taxByRegion.length > 0 && (
        <Card title="Tax collected by province">
          <LineList
            rows={report.taxByRegion}
            rowKey={(r) => `${r.country}-${r.province}`}
            id={(r) => [r.province, r.country].filter(Boolean).join(", ") || "Unknown"}
            main={(r) => `${r.orders} order${r.orders === 1 ? "" : "s"} · ${money(r.totalCents)} paid`}
            value={(r) => <b>{money(r.taxCents)}</b>}
            empty="No tax collected."
          />
        </Card>
      )}
      <Card title="Orders paid in this period">
        <DataTable
          label="Orders paid in this period"
          columns={columns}
          rows={report?.orders ?? []}
          rowKey={(o) => o.id}
          loading={!report && !error}
          minWidth={860}
          empty={<EmptyState>No orders were paid in this period.</EmptyState>}
        />
      </Card>
      {report && report.refunds.length > 0 && (
        <Card title="Refunds made in this period">
          <LineList
            rows={report.refunds}
            rowKey={(r) => `${r.order_id}-${r.created_at}`}
            id={(r) => `#${r.order_id}`}
            main={(r) => shopDate(r.created_at)}
            value={(r) => money(r.amount_cents)}
            empty="No refunds."
          />
        </Card>
      )}
    </>
  );
}

/** The period's orders as a spreadsheet, for the accountant. Amounts in dollars (CAD). */
function downloadCsv(report: SalesReport) {
  const dollars = (cents: number) => (cents / 100).toFixed(2);
  const cell = (v: string | number) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const rows = [
    ["Order", "Paid at", "Status", "Payment", "Country", "Province", "Items", "Shipping", "Tax", "Total", "Refunded", "Email"],
    ...report.orders.map((o) => [
      o.id,
      o.paid_at,
      o.status,
      o.provider,
      o.country ?? "",
      o.province ?? "",
      dollars(o.subtotal_cents),
      dollars(o.shipping_cents),
      dollars(o.tax_cents),
      dollars(o.total_cents),
      dollars(o.refunded_cents),
      o.billing_email,
    ]),
  ];
  const blob = new Blob([rows.map((r) => r.map(cell).join(",")).join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `spin-hobby-sales-${report.from}-to-${report.to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------- who can see this (owner)

interface Account {
  id: string;
  email: string;
  role: "staff" | "owner";
  can_audit: boolean;
}

function Access({ flash }: { flash: (m: string) => void }) {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<{ accounts: Account[] }>("/admin/audit/access")
      .then((r) => setAccounts(r.accounts))
      .catch((e) => setError(errMsg(e)));
  }, []);

  const set = async (a: Account, canAudit: boolean) => {
    setAccounts((list) => list?.map((x) => (x.id === a.id ? { ...x, can_audit: canAudit } : x)) ?? null);
    try {
      await api(`/admin/audit/access/${a.id}`, { method: "PUT", body: JSON.stringify({ canAudit }) });
      flash(canAudit ? `${a.email} can now open Audit` : `${a.email} can no longer open Audit`);
    } catch (e) {
      setAccounts((list) => list?.map((x) => (x.id === a.id ? { ...x, can_audit: !canAudit } : x)) ?? null);
      flash(errMsg(e));
    }
  };

  if (error) return <Banner tone="error">{error}</Banner>;
  return (
    <Card title="Who can open Audit" padded>
      <p className="ad-muted" style={{ margin: 0 }}>
        Owners always can. Turn it on for the staff who help with the books; it takes effect the next time they open the admin.
      </p>
      {!accounts ? (
        <Spinner label="Loading accounts" />
      ) : (
        accounts.map((a) =>
          a.role === "owner" ? (
            <div key={a.id} className="ad-audit__account">
              <span>{a.email}</span>
              <span className="ad-muted ad-sm">Owner · always</span>
            </div>
          ) : (
            <Switch key={a.id} checked={a.can_audit} onChange={(v) => set(a, v)} label={a.email} description="Staff" />
          ),
        )
      )}
    </Card>
  );
}
