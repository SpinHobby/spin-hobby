import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { dateLabel, money } from "../format";
import {
  Banner,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  Drawer,
  EmptyState,
  FilterChips,
  LineList,
  Pagination,
  RadioGroup,
  SearchInput,
  SegmentedControl,
  StatusBadge,
  Switch,
  TextField,
  Toolbar,
  type Column,
} from "../../components";
import type { Ctx } from "./Screens";

/** A role as the API describes it (lowest first). New roles on the server show up here by themselves. */
interface RoleInfo {
  key: string;
  label: string;
  description: string;
  rank: number;
}
type Restriction =
  { kind: "suspended"; until: string; lastDay: string; reason: string | null } | { kind: "banned"; since: string; reason: string | null };
interface Account {
  id: string;
  email: string;
  name: string | null;
  role: string;
  canAudit: boolean;
  createdAt: string;
  status: "active" | "suspended" | "banned";
  restriction: Restriction | null;
  roleFromEnv: string | null;
  orders: number;
  spentCents: number;
  history?: { action: string; data: Record<string, unknown>; created_at: string; by: string | null }[];
}
type StatusFilter = "all" | "active" | "suspended" | "banned";
const PAGE = 50;
const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
/** A calendar day (YYYY-MM-DD) as "Nov 25, 2026", exactly as written (no time zone shift). */
const dayLabelOf = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("en-CA", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" });
/** "Oct 1, 2026" in the shop's time zone. */
const shopDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "short", day: "numeric" });

/**
 * Admin > Accounts (owner only): every account, its role and its standing. Promote or demote, suspend until a day, ban for good,
 * or lift either. The API enforces the rules (owner only, never your own account, a role from the server's email lists stays);
 * this screen explains them.
 */
export function AccountsScreen({ ctx, myId }: { ctx: Ctx; myId: string | null }) {
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [list, setList] = useState<{ total: number; accounts: Account[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    api<{ roles: RoleInfo[] }>("/admin/accounts/roles")
      .then((r) => setRoles(r.roles))
      .catch((e) => setError(errMsg(e)));
  }, []);

  const load = useCallback(() => {
    const q = new URLSearchParams({ limit: String(PAGE), offset: String((page - 1) * PAGE) });
    if (query.trim()) q.set("q", query.trim());
    if (role !== "all") q.set("role", role);
    if (status !== "all") q.set("status", status);
    setError(null);
    api<{ total: number; accounts: Account[] }>(`/admin/accounts?${q}`)
      .then(setList)
      .catch((e) => setError(errMsg(e)));
  }, [query, role, status, page]);
  useEffect(() => {
    const t = window.setTimeout(load, 200); // typing in the search box
    return () => window.clearTimeout(t);
  }, [load]);

  const roleLabel = (key: string) => roles.find((r) => r.key === key)?.label ?? key;
  const columns: Column<Account>[] = [
    {
      key: "who",
      header: "Account",
      width: "minmax(220px, 3fr)",
      render: (a) => (
        <span className="ad-acct__who">
          <b>{a.email}</b>
          {a.name && <span className="ad-muted ad-sm">{a.name}</span>}
        </span>
      ),
    },
    { key: "role", header: "Role", width: "110px", render: (a) => roleLabel(a.role) },
    { key: "status", header: "Standing", width: "170px", render: (a) => <Standing a={a} /> },
    {
      key: "orders",
      header: "Orders",
      width: "130px",
      align: "right",
      render: (a) => (a.orders ? `${a.orders} · ${money(a.spentCents)}` : "—"),
    },
    { key: "joined", header: "Joined", width: "120px", render: (a) => dateLabel(a.createdAt) },
  ];

  return (
    <>
      <p className="ad-muted" style={{ margin: 0 }}>
        Everyone with an account. Change someone's role, suspend them until a date, or ban them. They're locked out straight away, even if
        they're signed in, and every change is logged.
      </p>
      <Toolbar>
        <SearchInput
          label="Search accounts"
          value={query}
          onChange={(v) => {
            setQuery(v);
            setPage(1);
          }}
          placeholder="Email or name"
        />
        <FilterChips
          label="Role"
          value={role}
          onChange={(v) => {
            setRole(v);
            setPage(1);
          }}
          options={[{ key: "all", label: "All roles" }, ...[...roles].reverse().map((r) => ({ key: r.key, label: r.label }))]}
        />
        <FilterChips<StatusFilter>
          label="Standing"
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={[
            { key: "all", label: "Any standing" },
            { key: "active", label: "Active" },
            { key: "suspended", label: "Suspended" },
            { key: "banned", label: "Banned" },
          ]}
        />
      </Toolbar>
      {error && (
        <Banner tone="error" action={{ label: "Try again", onClick: load }}>
          {error}
        </Banner>
      )}
      <Card>
        <DataTable
          label="Accounts"
          columns={columns}
          rows={list?.accounts ?? []}
          rowKey={(a) => a.id}
          loading={!list && !error}
          onRowClick={(a) => setOpenId(a.id)}
          selectedKey={openId}
          minWidth={760}
          empty={<EmptyState>No accounts match.</EmptyState>}
        />
        {list && list.total > PAGE && <Pagination page={page} pageSize={PAGE} total={list.total} onPage={setPage} label="accounts" />}
      </Card>
      {openId && (
        <AccountDrawer
          id={openId}
          roles={roles}
          isMe={openId === myId}
          flash={ctx.flash}
          onClose={() => setOpenId(null)}
          onChanged={load}
        />
      )}
    </>
  );
}

function Standing({ a }: { a: Account }) {
  if (a.restriction?.kind === "banned") return <StatusBadge tone="bad">Banned</StatusBadge>;
  if (a.restriction?.kind === "suspended") return <StatusBadge tone="warn">Suspended to {dayLabelOf(a.restriction.lastDay)}</StatusBadge>;
  return <StatusBadge tone="good">Active</StatusBadge>;
}

type Length = "1w" | "1m" | "3m" | "6m" | "1y" | "date";
const LENGTHS: { value: Length; label: string }[] = [
  { value: "1w", label: "1 week" },
  { value: "1m", label: "1 month" },
  { value: "3m", label: "3 months" },
  { value: "6m", label: "6 months" },
  { value: "1y", label: "1 year" },
  { value: "date", label: "Until…" },
];
/** The last day of a suspension of that length, from today (YYYY-MM-DD). */
function lastDay(length: Exclude<Length, "date">) {
  const d = new Date();
  if (length === "1w") d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + { "1m": 1, "3m": 3, "6m": 6, "1y": 12 }[length]);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; // the local calendar day
}

function AccountDrawer({
  id,
  roles,
  isMe,
  flash,
  onClose,
  onChanged,
}: {
  id: string;
  roles: RoleInfo[];
  isMe: boolean;
  flash: (m: string) => void;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState("");
  const [length, setLength] = useState<Length>("1m");
  const [until, setUntil] = useState(lastDay("1m"));
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState<null | "owner" | "ban">(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<{ account: Account }>(`/admin/accounts/${id}`)
      .then((r) => {
        setAccount(r.account);
        setRole(r.account.role);
      })
      .catch((e) => setError(errMsg(e)));
  }, [id]);
  useEffect(load, [load]);

  const run = async (label: string, path: string, body: object) => {
    setBusy(true);
    try {
      await api(path, { method: "PUT", body: JSON.stringify(body) });
      flash(label);
      setReason("");
      load();
      onChanged();
    } catch (e) {
      flash(errMsg(e));
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };
  const roleInfo = (key: string) => roles.find((r) => r.key === key);
  const ownerRank = roleInfo("owner")?.rank ?? Infinity;
  const staffRank = roleInfo("staff")?.rank ?? Infinity;
  const rankOf = (key: string) => roleInfo(key)?.rank ?? -1;
  const saveRole = () => run(`${account!.email} is now ${roleInfo(role)?.label ?? role}`, `/admin/accounts/${id}/role`, { role });

  return (
    <Drawer title={account?.email ?? "Account"} onClose={onClose} size="lg">
      {error && <Banner tone="error">{error}</Banner>}
      {account && (
        <div className="ad-acct">
          <dl className="ad-acct__facts">
            <dt>Name</dt>
            <dd>{account.name ?? "—"}</dd>
            <dt>Joined</dt>
            <dd>{dateLabel(account.createdAt)}</dd>
            <dt>Orders</dt>
            <dd>{account.orders ? `${account.orders} paid · ${money(account.spentCents)}` : "None yet"}</dd>
            <dt>Standing</dt>
            <dd>
              <Standing a={account} />
            </dd>
          </dl>

          {isMe && <Banner tone="info">This is your own account. To keep the shop safe, another owner has to change it.</Banner>}

          <section className="ad-acct__section">
            <h3 className="ad-h3">Role</h3>
            {account.roleFromEnv && (
              <p className="ad-muted ad-sm" style={{ margin: 0 }}>
                The server's {account.roleFromEnv === "owner" ? "OWNER_EMAILS" : "STAFF_EMAILS"} list makes this account at least{" "}
                {roleInfo(account.roleFromEnv)?.label ?? account.roleFromEnv}, so it can't go below that here.
              </p>
            )}
            <RadioGroup
              label="Role"
              value={role}
              onChange={setRole}
              options={[...roles].reverse().map((r) => ({
                value: r.key,
                label: r.label,
                description: r.description,
                disabled: isMe || (account.roleFromEnv ? r.rank < rankOf(account.roleFromEnv) : false),
              }))}
            />
            <div>
              <Button
                size="sm"
                disabled={isMe || busy || role === account.role}
                onClick={() => (rankOf(role) >= ownerRank && rankOf(account.role) < ownerRank ? setConfirm("owner") : saveRole())}
              >
                {rankOf(role) > rankOf(account.role) ? "Promote" : "Change role"}
              </Button>
            </div>
            {rankOf(account.role) >= staffRank && rankOf(account.role) < ownerRank && (
              <Switch
                checked={account.canAudit}
                disabled={isMe || busy}
                onChange={(v) =>
                  run(v ? "They can now open Audit" : "They can no longer open Audit", `/admin/audit/access/${id}`, { canAudit: v })
                }
                label="Can open Audit"
                description="Audit documents and sales records"
              />
            )}
          </section>

          <section className="ad-acct__section">
            <h3 className="ad-h3">Standing</h3>
            {account.restriction ? (
              <>
                <Banner tone="error">
                  {account.restriction.kind === "banned"
                    ? `Banned since ${shopDate(account.restriction.since)}.`
                    : `Suspended until the end of ${dayLabelOf(account.restriction.lastDay)}.`}
                  {account.restriction.reason && ` Reason: ${account.restriction.reason}`}
                </Banner>
                <div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isMe || busy}
                    onClick={() =>
                      run(
                        account.restriction!.kind === "banned" ? "Ban lifted" : "Suspension lifted",
                        `/admin/accounts/${id}/restriction`,
                        { action: "lift" },
                      )
                    }
                  >
                    {account.restriction.kind === "banned" ? "Lift the ban" : "Lift the suspension"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <SegmentedControl<Length>
                  label="Suspend for"
                  size="sm"
                  value={length}
                  onChange={(v) => {
                    setLength(v);
                    if (v !== "date") setUntil(lastDay(v));
                  }}
                  options={LENGTHS}
                />
                {length === "date" && <TextField label="Last day" type="date" value={until} onChange={(e) => setUntil(e.target.value)} />}
                <TextField
                  label="Reason"
                  hint="Shown to them when they try to sign in, and kept in the log."
                  maxLength={300}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <div className="ad-acct__actions">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isMe || busy || !until}
                    onClick={() =>
                      run(`Suspended until the end of ${dayLabelOf(until)}`, `/admin/accounts/${id}/restriction`, {
                        action: "suspend",
                        until,
                        reason,
                      })
                    }
                  >
                    Suspend until the end of {until ? dayLabelOf(until) : "…"}
                  </Button>
                  <Button size="sm" variant="danger" disabled={isMe || busy} onClick={() => setConfirm("ban")}>
                    Ban permanently
                  </Button>
                </div>
              </>
            )}
          </section>

          {!!account.history?.length && (
            <section className="ad-acct__section">
              <h3 className="ad-h3">History</h3>
              <LineList
                rows={account.history}
                rowKey={(h) => `${h.action}-${h.created_at}`}
                id={(h) => dateLabel(h.created_at)}
                main={(h) => describe(h, (k) => roleInfo(k)?.label ?? k)}
                value={(h) => <span className="ad-muted ad-sm">{h.by ?? ""}</span>}
                empty="No changes yet."
              />
            </section>
          )}
        </div>
      )}
      {confirm === "owner" && account && (
        <ConfirmDialog
          title="Make them an owner?"
          message={`${account.email} will be able to change everything, including settings, payments and other accounts (yours too).`}
          confirmLabel="Make owner"
          busy={busy}
          onConfirm={saveRole}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === "ban" && account && (
        <ConfirmDialog
          title="Ban this account?"
          message={`${account.email} won't be able to sign in or use their account until you lift the ban. Their past orders stay.`}
          confirmLabel="Ban permanently"
          danger
          busy={busy}
          onConfirm={() => run("Account banned", `/admin/accounts/${id}/restriction`, { action: "ban", reason })}
          onCancel={() => setConfirm(null)}
        />
      )}
    </Drawer>
  );
}

/** One line of an account's history, in words. */
function describe(h: { action: string; data: Record<string, unknown> }, label: (role: string) => string) {
  const reason = h.data.reason ? ` (${String(h.data.reason)})` : "";
  switch (h.action) {
    case "account.role_changed":
      return `Role: ${label(String(h.data.from))} → ${label(String(h.data.to))}`;
    case "account.suspended":
      return `Suspended until the end of ${dayLabelOf(String(h.data.until))}${reason}`;
    case "account.banned":
      return `Banned${reason}`;
    case "account.restriction_lifted":
      return "Suspension or ban lifted";
    case "audit.access_granted":
      return "Allowed into Audit";
    case "audit.access_removed":
      return "Audit access removed";
    default:
      return h.action;
  }
}
