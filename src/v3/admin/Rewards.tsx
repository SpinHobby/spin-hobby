import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../../lib/api";
import { dateLabel, money } from "../format";
import { Banner, Button, Card, DataTable, EmptyState, Stats, Switch, TextField, type Column } from "../../components";
import type { Ctx } from "./Screens";

interface Settings {
  enabled: boolean;
  pointsPerDollar: number;
  centsPer100Points: number;
  minRedeemPoints: number;
}
interface RewardApp {
  slug: string;
  name: string;
  daily_cap: number;
  active: boolean;
  created_at: string;
  last_used_at: string | null;
  members: number;
}
interface Entry {
  id: string;
  email: string | null;
  app: string;
  points: number;
  reason: string;
  created_at: string;
}
interface Overview {
  settings: Settings;
  apps: RewardApp[];
  totals: { outstandingPoints: number; outstandingCents: number; members: number; earned30: number; spent30: number };
  recent: Entry[];
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
const pts = (n: number) => n.toLocaleString("en-CA");
const signed = (n: number) => (n > 0 ? `+${pts(n)}` : pts(n));

/**
 * Admin > Rewards (owner only): one points balance per customer, shared by the shop and every connected Spin Hobby app. Switch it on, set
 * what points are worth, connect apps (each gets a key, shown once), and give or take points by hand. How apps connect: docs/REWARDS.md
 * in the server.
 */
export function RewardsScreen({ ctx }: { ctx: Ctx }) {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api<Overview>("/admin/rewards")
      .then(setData)
      .catch((e) => setError(errMsg(e)));
  }, []);
  useEffect(load, [load]);

  const t = data?.totals;
  return (
    <>
      <p className="ad-muted" style={{ margin: 0 }}>
        Customers earn points on paid orders and in other Spin Hobby apps, all in one balance on their account. They turn points into a
        one-time discount code from their Rewards page. Refunds take back the points the order earned.
      </p>
      {error && (
        <Banner tone="error" action={{ label: "Try again", onClick: load }}>
          {error}
        </Banner>
      )}
      {t && (
        <Stats
          items={[
            { label: "Points not yet used", value: pts(t.outstandingPoints), note: `worth ${money(t.outstandingCents)}` },
            { label: "Customers with points", value: pts(t.members) },
            { label: "Given, last 30 days", value: pts(t.earned30) },
            { label: "Used or taken back, 30 days", value: pts(t.spent30) },
          ]}
        />
      )}
      {data && (
        <SettingsCard
          settings={data.settings}
          onSaved={(settings) => {
            setData((d) => (d ? { ...d, settings } : d));
            ctx.flash(settings.enabled ? "Rewards saved. They are on." : "Rewards saved. They are off.");
          }}
        />
      )}
      {data && <AppsCard apps={data.apps} onChanged={load} flash={ctx.flash} />}
      <AdjustCard
        onDone={(msg) => {
          ctx.flash(msg);
          load();
        }}
      />
      <Card title="Latest changes">
        <DataTable
          label="Latest rewards changes"
          columns={ENTRY_COLUMNS}
          rows={data?.recent ?? []}
          rowKey={(e) => e.id}
          loading={!data && !error}
          minWidth={620}
          empty={<EmptyState>No points given or used yet.</EmptyState>}
        />
      </Card>
    </>
  );
}

const ENTRY_COLUMNS: Column<Entry>[] = [
  { key: "when", header: "When", width: "120px", render: (e) => <span className="ad-sm">{dateLabel(e.created_at)}</span> },
  { key: "who", header: "Customer", width: "minmax(160px, 2fr)", render: (e) => e.email ?? "—" },
  { key: "app", header: "From", width: "110px", render: (e) => <span className="ad-sm">{e.app}</span> },
  { key: "reason", header: "What", width: "minmax(160px, 2fr)", render: (e) => e.reason },
  {
    key: "points",
    header: "Points",
    width: "90px",
    align: "right",
    render: (e) => <b className={e.points < 0 ? "ad-muted" : undefined}>{signed(e.points)}</b>,
  },
];

function SettingsCard({ settings, onSaved }: { settings: Settings; onSaved: (s: Settings) => void }) {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [perDollar, setPerDollar] = useState(String(settings.pointsPerDollar));
  const [value, setValue] = useState((settings.centsPer100Points / 100).toFixed(2));
  const [min, setMin] = useState(String(settings.minRedeemPoints));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const perDollarN = Number(perDollar) || 0;
  const valueCents = Math.round(Number(value) * 100) || 0;
  // what a customer gets back, as a share of what they spend
  const back = perDollarN && valueCents ? ((perDollarN * valueCents) / 100 / 100) * 100 : 0;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const r = await api<{ settings: Settings }>("/admin/rewards/settings", {
        method: "PUT",
        body: JSON.stringify({
          enabled,
          pointsPerDollar: perDollarN,
          centsPer100Points: valueCents,
          minRedeemPoints: Number(min) || 0,
        }),
      });
      onSaved(r.settings);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Settings" padded>
      <form className="ad-discount-form" onSubmit={save}>
        <div style={{ gridColumn: "1 / -1" }}>
          <Switch checked={enabled} onChange={() => setEnabled((on) => !on)} label={enabled ? "Rewards are on" : "Rewards are off"} />
          <p className="ad-muted ad-sm" style={{ margin: "6px 0 0" }}>
            While off, nothing is earned or used, in the shop or in the apps. Balances are kept.
          </p>
        </div>
        <TextField
          label="Points per dollar spent"
          inputMode="numeric"
          value={perDollar}
          onChange={(e) => setPerDollar(e.target.value.replace(/\D/g, ""))}
          hint="On the goods, after any discount. Not shipping or tax."
        />
        <TextField
          label="What 100 points are worth"
          inputMode="decimal"
          prefix="$"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ""))}
          hint={back ? `Customers get about ${back.toFixed(1)}% back.` : " "}
        />
        <TextField
          label="Fewest points to use at once"
          inputMode="numeric"
          value={min}
          onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))}
          hint={valueCents ? `${pts(Number(min) || 0)} points = ${money(Math.floor(((Number(min) || 0) * valueCents) / 100))} off` : " "}
        />
        <div className="ad-discount-form__actions">
          <Button type="submit" loading={saving}>
            Save settings
          </Button>
          {error && <span className="ad-discount-form__error">{error}</span>}
        </div>
      </form>
    </Card>
  );
}

function AppsCard({ apps, onChanged, flash }: { apps: RewardApp[]; onChanged: () => void; flash: (m: string) => void }) {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [cap, setCap] = useState("500");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** A key just made: shown once, here. */
  const [key, setKey] = useState<{ slug: string; key: string } | null>(null);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const r = await api<{ key: string; app: RewardApp }>("/admin/rewards/apps", {
        method: "POST",
        body: JSON.stringify({ slug: slug.trim(), name: name.trim(), dailyCap: Number(cap) || 500 }),
      });
      setKey({ slug: r.app.slug, key: r.key });
      setSlug("");
      setName("");
      onChanged();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (a: RewardApp) => {
    setBusy(a.slug);
    try {
      await api(`/admin/rewards/apps/${a.slug}`, { method: "PATCH", body: JSON.stringify({ active: !a.active }) });
      flash(`${a.name} is ${a.active ? "off" : "on"}`);
      onChanged();
    } catch (err) {
      flash(errMsg(err));
    } finally {
      setBusy(null);
    }
  };

  const newKey = async (a: RewardApp) => {
    if (!window.confirm(`Make a new key for ${a.name}? The old key stops working straight away.`)) return;
    setBusy(a.slug);
    try {
      const r = await api<{ key: string }>(`/admin/rewards/apps/${a.slug}/key`, { method: "POST" });
      setKey({ slug: a.slug, key: r.key });
    } catch (err) {
      flash(errMsg(err));
    } finally {
      setBusy(null);
    }
  };

  const columns: Column<RewardApp>[] = [
    {
      key: "name",
      header: "App",
      width: "minmax(160px, 2fr)",
      render: (a) => (
        <span className="ad-acct__who">
          <b>{a.name}</b>
          <span className="ad-muted ad-sm">{a.slug}</span>
        </span>
      ),
    },
    { key: "members", header: "Linked", width: "80px", align: "right", render: (a) => pts(a.members) },
    { key: "cap", header: "Daily cap", width: "90px", align: "right", render: (a) => pts(a.daily_cap) },
    {
      key: "used",
      header: "Last used",
      width: "120px",
      render: (a) => <span className="ad-sm">{a.last_used_at ? dateLabel(a.last_used_at) : "Never"}</span>,
    },
    {
      key: "key",
      header: "",
      width: "100px",
      render: (a) => (
        <button type="button" className="ad-link" onClick={() => newKey(a)} disabled={busy === a.slug}>
          New key
        </button>
      ),
    },
    {
      key: "on",
      header: "On",
      width: "70px",
      render: (a) => (
        <Switch
          checked={a.active}
          disabled={busy === a.slug}
          onChange={() => toggle(a)}
          label={<span className="sh-visually-hidden">{`${a.name} on`}</span>}
          size="sm"
        />
      ),
    },
  ];

  return (
    <Card title="Apps" padded>
      <p className="ad-muted ad-sm" style={{ marginTop: 0 }}>
        Other Spin Hobby apps (Gleamshelf, the games) can give and spend points once a customer links them from their Rewards page. Each app
        gets a key. The developer guide is docs/REWARDS.md in the server.
      </p>
      {key && (
        <Banner tone="success" action={{ label: "Done", onClick: () => setKey(null) }}>
          <span>
            Key for <b>{key.slug}</b>, shown only this once. Put it in the app's server settings, never in a page or game build:
            <br />
            <code style={{ wordBreak: "break-all", userSelect: "all" }}>{key.key}</code>{" "}
            <button
              type="button"
              className="ad-link"
              onClick={() => navigator.clipboard?.writeText(key.key).then(() => flash("Key copied"))}
            >
              Copy
            </button>
          </span>
        </Banner>
      )}
      <DataTable
        label="Connected apps"
        columns={columns}
        rows={apps}
        rowKey={(a) => a.slug}
        minWidth={620}
        empty={<EmptyState>No apps connected yet.</EmptyState>}
      />
      <form className="ad-discount-form" onSubmit={add} style={{ marginTop: 16 }}>
        <TextField
          label="Short name"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
          placeholder="hangout"
          maxLength={32}
          hint="Lowercase letters, numbers or -. Can't be changed."
        />
        <TextField label="Name customers see" value={name} onChange={(e) => setName(e.target.value)} placeholder="Hangout" maxLength={80} />
        <TextField
          label="Most points a day, per customer"
          inputMode="numeric"
          value={cap}
          onChange={(e) => setCap(e.target.value.replace(/\D/g, ""))}
          hint="Stops a bug or a cheat from giving away too much."
        />
        <div className="ad-discount-form__actions">
          <Button type="submit" loading={saving} disabled={!slug || !name.trim()}>
            Connect app
          </Button>
          {error && <span className="ad-discount-form__error">{error}</span>}
        </div>
      </form>
    </Card>
  );
}

function AdjustCard({ onDone }: { onDone: (msg: string) => void }) {
  const [email, setEmail] = useState("");
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const n = Number(points);
      const r = await api<{ balance: number }>("/admin/rewards/adjust", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), points: n, reason: reason.trim() }),
      });
      onDone(`${n > 0 ? "Gave" : "Took"} ${pts(Math.abs(n))} points. ${email.trim()} now has ${pts(r.balance)}.`);
      setPoints("");
      setReason("");
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Give or take points" padded>
      <form className="ad-discount-form" onSubmit={submit}>
        <TextField label="Customer's email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField
          label="Points"
          inputMode="numeric"
          value={points}
          onChange={(e) => setPoints(e.target.value.replace(/[^\d-]/g, ""))}
          placeholder="200"
          hint="A minus sign takes points away (never below 0)."
        />
        <TextField
          label="Reason the customer sees"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Sorry about the late parcel"
          maxLength={200}
        />
        <div className="ad-discount-form__actions">
          <Button type="submit" loading={saving} disabled={!email.trim() || !Number(points) || !reason.trim()}>
            Save
          </Button>
          {error && <span className="ad-discount-form__error">{error}</span>}
        </div>
      </form>
    </Card>
  );
}
