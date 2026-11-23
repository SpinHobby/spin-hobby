import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../../lib/api";
import { dateLabel, money } from "../format";
import { Banner, Button, Card, DataTable, Drawer, EmptyState, SegmentedControl, Switch, TextField, type Column } from "../../components";
import type { Ctx } from "./Screens";

/** A code as GET /admin/discounts returns it. */
interface DiscountCode {
  id: string;
  code: string;
  kind: "percent" | "amount";
  value: number;
  min_subtotal_cents: number;
  starts_at: string | null;
  ends_at: string | null;
  max_uses: number | null;
  uses: number;
  active: boolean;
  note: string | null;
  created_at: string;
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
const label = (c: Pick<DiscountCode, "kind" | "value">) => (c.kind === "percent" ? `${c.value}% off` : `${money(c.value)} off`);
/** A day from the date picker, as the start or end of that day in the browser's time zone. */
const dayStart = (d: string) => (d ? new Date(`${d}T00:00:00`).toISOString() : null);
const dayEnd = (d: string) => (d ? new Date(`${d}T23:59:59`).toISOString() : null);
/** An instant back into a date-input value ("yyyy-mm-dd" in the browser's time zone), or "" for none. */
const dayInput = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-CA") : "");

function state(c: DiscountCode) {
  const now = Date.now();
  if (!c.active) return "Off";
  if (c.starts_at && Date.parse(c.starts_at) > now) return `Starts ${dateLabel(c.starts_at)}`;
  if (c.ends_at && Date.parse(c.ends_at) <= now) return "Expired";
  if (c.max_uses != null && c.uses >= c.max_uses) return "Used up";
  return c.ends_at ? `On until ${dateLabel(c.ends_at)}` : "On";
}

/** Admin > Discounts (owner only): codes shoppers type at checkout. */
export function DiscountsScreen({ ctx }: { ctx: Ctx }) {
  const [codes, setCodes] = useState<DiscountCode[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<DiscountCode | null>(null);

  const load = useCallback(() => {
    setError(null);
    api<{ codes: DiscountCode[] }>("/admin/discounts")
      .then((r) => setCodes(r.codes))
      .catch((e) => setError(errMsg(e)));
  }, []);
  useEffect(load, [load]);

  const toggle = async (c: DiscountCode) => {
    setBusy(c.id);
    try {
      const r = await api<{ code: DiscountCode }>(`/admin/discounts/${c.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !c.active }),
      });
      setCodes((list) => list?.map((x) => (x.id === c.id ? r.code : x)) ?? null);
      ctx.flash(`${c.code} is ${r.code.active ? "on" : "off"}`);
    } catch (e) {
      ctx.flash(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const columns: Column<DiscountCode>[] = [
    {
      key: "code",
      header: "Code",
      width: "minmax(160px, 2fr)",
      render: (c) => (
        <span className="ad-acct__who">
          <b>{c.code}</b>
          {c.note && <span className="ad-muted ad-sm">{c.note}</span>}
        </span>
      ),
    },
    {
      key: "what",
      header: "Discount",
      width: "minmax(150px, 2fr)",
      render: (c) => (
        <span>
          {label(c)}
          {c.min_subtotal_cents > 0 && <span className="ad-muted ad-sm"> · orders of {money(c.min_subtotal_cents)}+</span>}
        </span>
      ),
    },
    { key: "uses", header: "Used", width: "90px", align: "right", render: (c) => (c.max_uses ? `${c.uses} / ${c.max_uses}` : c.uses) },
    { key: "state", header: "Status", width: "150px", render: (c) => <span className="ad-sm">{state(c)}</span> },
    {
      key: "edit",
      header: "",
      width: "70px",
      render: (c) => (
        <button type="button" className="ad-link" onClick={() => setEditing(c)}>
          Edit
        </button>
      ),
    },
    {
      key: "on",
      header: "On",
      width: "70px",
      render: (c) => (
        <Switch
          checked={c.active}
          disabled={busy === c.id}
          onChange={() => toggle(c)}
          label={<span className="sh-visually-hidden">{`${c.code} on`}</span>}
          size="sm"
        />
      ),
    },
  ];

  return (
    <>
      <p className="ad-muted" style={{ margin: 0 }}>
        Codes shoppers type at checkout for money off their goods (not shipping). Tax is worked out on the lower price. Switch a code off to
        stop it straight away; its past orders keep their discount.
      </p>
      <NewCode
        onMade={(c) => {
          setCodes((list) => [c, ...(list ?? [])]);
          ctx.flash(`${c.code} created`);
        }}
      />
      {error && (
        <Banner tone="error" action={{ label: "Try again", onClick: load }}>
          {error}
        </Banner>
      )}
      <Card>
        <DataTable
          label="Discount codes"
          columns={columns}
          rows={codes ?? []}
          rowKey={(c) => c.id}
          loading={!codes && !error}
          minWidth={620}
          empty={<EmptyState>No codes yet. Make one above.</EmptyState>}
        />
      </Card>
      {editing && (
        <EditDrawer
          code={editing}
          onClose={() => setEditing(null)}
          onSaved={(c) => {
            setCodes((list) => list?.map((x) => (x.id === c.id ? c : x)) ?? null);
            ctx.flash(`${c.code} saved`);
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function NewCode({ onMade }: { onMade: (c: DiscountCode) => void }) {
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"percent" | "amount">("percent");
  const [value, setValue] = useState("");
  const [min, setMin] = useState("");
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const n = Number(value);
    if (!code.trim() || !(n > 0)) {
      setError("Enter a code and how much it takes off.");
      return;
    }
    setSaving(true);
    try {
      const r = await api<{ code: DiscountCode }>("/admin/discounts", {
        method: "POST",
        body: JSON.stringify({
          code: code.trim(),
          kind,
          value: kind === "percent" ? Math.round(n) : Math.round(n * 100),
          minSubtotalCents: min ? Math.round(Number(min) * 100) : 0,
          startsAt: dayStart(starts),
          endsAt: dayEnd(ends),
          maxUses: maxUses ? Number(maxUses) : null,
          note: note.trim() || null,
        }),
      });
      onMade(r.code);
      setCode("");
      setValue("");
      setMin("");
      setStarts("");
      setEnds("");
      setMaxUses("");
      setNote("");
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="New code" padded>
      <form className="ad-discount-form" onSubmit={submit}>
        <TextField
          label="Code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
          placeholder="SPRING10"
          maxLength={32}
          hint="What shoppers type. Letters, numbers, - or _."
        />
        <div className="ad-discount-form__value">
          <SegmentedControl
            label="Kind"
            value={kind}
            onChange={setKind}
            options={[
              { value: "percent", label: "% off" },
              { value: "amount", label: "$ off" },
            ]}
            size="sm"
          />
          <TextField
            label={kind === "percent" ? "Percent off" : "Dollars off"}
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder={kind === "percent" ? "10" : "5.00"}
            suffix={kind === "percent" ? "%" : undefined}
            prefix={kind === "amount" ? "$" : undefined}
          />
        </div>
        <TextField
          label="Minimum order (optional)"
          inputMode="decimal"
          prefix="$"
          value={min}
          onChange={(e) => setMin(e.target.value.replace(/[^\d.]/g, ""))}
          hint="The goods must come to at least this."
        />
        <TextField label="Starts (optional)" type="date" value={starts} onChange={(e) => setStarts(e.target.value)} />
        <TextField
          label="Ends (optional)"
          type="date"
          value={ends}
          min={starts || undefined}
          onChange={(e) => setEnds(e.target.value)}
          hint="Works until the end of this day."
        />
        <TextField
          label="Use limit (optional)"
          inputMode="numeric"
          value={maxUses}
          onChange={(e) => setMaxUses(e.target.value.replace(/\D/g, ""))}
          hint="How many paid orders may use it."
        />
        <TextField
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Given out at Otafest"
          maxLength={200}
        />
        <div className="ad-discount-form__actions">
          <Button type="submit" loading={saving}>
            Create code
          </Button>
          {error && <span className="ad-discount-form__error">{error}</span>}
        </div>
      </form>
    </Card>
  );
}

/** Editing a code: its end date, use limit and note only — the code, kind and amount stay fixed because past orders depend on them. */
function EditDrawer({ code, onClose, onSaved }: { code: DiscountCode; onClose: () => void; onSaved: (c: DiscountCode) => void }) {
  const [ends, setEnds] = useState(dayInput(code.ends_at));
  const [maxUses, setMaxUses] = useState(code.max_uses != null ? String(code.max_uses) : "");
  const [note, setNote] = useState(code.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialEnds = dayInput(code.ends_at);
  const initialMaxUses = code.max_uses != null ? String(code.max_uses) : "";
  const initialNote = code.note ?? "";

  const maxUsesN = maxUses ? Number(maxUses) : null;
  const underUsed = maxUsesN != null && maxUsesN < code.uses;

  const patch: Record<string, unknown> = {};
  if (ends !== initialEnds) patch.endsAt = dayEnd(ends);
  if (maxUses !== initialMaxUses) patch.maxUses = maxUsesN;
  if (note !== initialNote) patch.note = note.trim() || null;
  const dirty = Object.keys(patch).length > 0;

  const save = async () => {
    if (underUsed || !dirty) return;
    setError(null);
    setSaving(true);
    try {
      const r = await api<{ code: DiscountCode }>(`/admin/discounts/${code.id}`, { method: "PATCH", body: JSON.stringify(patch) });
      onSaved(r.code);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      title={`Edit ${code.code}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void save()} loading={saving} disabled={underUsed || !dirty}>
            Save
          </Button>
        </>
      }
    >
      <form
        className="ad-discount-form"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <p className="ad-muted ad-sm" style={{ margin: 0 }}>
          {label(code)} · the code, its kind and its amount can't be changed here — past orders depend on them. You can change its end
          date, use limit and note.
        </p>
        <TextField
          label="Ends (optional)"
          type="date"
          value={ends}
          onChange={(e) => setEnds(e.target.value)}
          hint="Works until the end of this day. Clear it to remove the end date."
        />
        <TextField
          label="Use limit (optional)"
          inputMode="numeric"
          value={maxUses}
          onChange={(e) => setMaxUses(e.target.value.replace(/\D/g, ""))}
          error={underUsed ? `Already used ${code.uses} time${code.uses === 1 ? "" : "s"} — can't set a lower limit.` : undefined}
          hint="How many paid orders may use it. Clear it to remove the limit."
        />
        <TextField label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
        {error && <Banner tone="error">{error}</Banner>}
      </form>
    </Drawer>
  );
}
