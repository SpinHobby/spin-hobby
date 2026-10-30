import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { normalizeStatus, price, type Currency } from "../format";
import { isCutout, photo } from "../photo";
import type { Product } from "../types";
import { productPath } from "./data";
import { useAddOns, useBoughtTogether } from "./suggestionData";
import { PriceTag } from "./ProductViews";

/**
 * Suggestions worked out from the shop's own paid orders (spin-hobby-server: src/modules/catalog/recommendations.service.ts),
 * and the product page's "email me new pre-orders" box (src/modules/reminders).
 */

/** "Frequently bought together" on a product page: this item plus what was bought with it, ticked, and one button for all. */
export function BoughtTogether({ p, currency, onAddAll }: { p: Product; currency: Currency; onAddAll: (products: Product[]) => void }) {
  const others = useBoughtTogether(p.id);
  const [off, setOff] = useState<Set<string>>(new Set());
  useEffect(() => setOff(new Set()), [p.id]);
  if (!others.length || normalizeStatus(p.status) === "out") return null;
  const chosen = [p, ...others.filter((o) => !off.has(o.id))];
  const total = chosen.reduce((s, x) => s + x.priceCents, 0);
  const toggle = (id: string) =>
    setOff((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return (
    <section className="sf-together" aria-labelledby="together-title">
      <h2 id="together-title" className="sh-display">
        Frequently bought together
      </h2>
      <p className="sf-muted sf-together__why">From what other collectors bought with this.</p>
      <div className="sf-together__row">
        {[p, ...others].map((x, i) => (
          <div key={x.id} className="sf-together__item">
            {i > 0 && (
              <span className="sf-together__plus" aria-hidden>
                +
              </span>
            )}
            <Link to={productPath(x)} className={`sh-thumb ${x.images[0] ? "" : "sh-ph sh-ph--sm"}`} aria-label={x.name}>
              {x.images[0] && <img {...photo(x.images[0], 160, isCutout(x, x.images[0]))} alt="" />}
            </Link>
          </div>
        ))}
      </div>
      <ul className="sf-together__list">
        {[p, ...others].map((x, i) => (
          <li key={x.id}>
            <label>
              <input type="checkbox" checked={i === 0 || !off.has(x.id)} disabled={i === 0} onChange={() => toggle(x.id)} />
              <span>
                {i === 0 ? <b>This item: </b> : null}
                {x.name}
              </span>
            </label>
            <PriceTag cents={x.priceCents} currency={currency} />
          </li>
        ))}
      </ul>
      <button type="button" className="sh-btn sf-together__add" onClick={() => onAddAll(chosen)}>
        Add {chosen.length === 1 ? "it" : `all ${chosen.length}`} to cart · {price(total, currency)}
      </button>
    </section>
  );
}

/** Checkout's add-ons: up to 3 cheap extras for this cart, each one click to add. Nothing when there are none. */
export function CheckoutAddOns({ itemIds, currency, onAdd }: { itemIds: string[]; currency: Currency; onAdd: (p: Product) => void }) {
  const items = useAddOns(itemIds);
  if (!items.length) return null;
  return (
    <section className="sf-picks co-addons" aria-labelledby="addons-title">
      <div id="addons-title" className="sf-picks__title">
        Often added at checkout
      </div>
      {items.map((p) => (
        <div key={p.id} className="sf-pick">
          <span className="sf-pick__open">
            <span className={`sh-thumb ${p.images[0] ? "" : "sh-ph sh-ph--sm"}`} style={{ width: 40, height: 40 }}>
              {p.images[0] && <img {...photo(p.images[0], 80, isCutout(p, p.images[0]))} alt="" />}
            </span>
            <span className="sf-pick__name">{p.name}</span>
          </span>
          <button type="button" className="sf-pick__add" onClick={() => onAdd(p)} aria-label={`Add ${p.name} to this order`}>
            + {price(p.priceCents, currency)}
          </button>
        </div>
      ))}
    </section>
  );
}

/**
 * "Email me new pre-orders from Frieren / Good Smile Company": the series and the maker of this product, ticked, and an email
 * (filled in when known). One email per new pre-order batch; every email has a stop link.
 */
export function FollowBox({ p, email }: { p: Product; email: string | null }) {
  const options = [
    p.series ? { kind: "series" as const, name: p.series } : null,
    p.manufacturer ? { kind: "maker" as const, name: p.manufacturer } : null,
  ].filter((o): o is { kind: "series" | "maker"; name: string } => o !== null);
  const [value, setValue] = useState(email ?? "");
  const [picked, setPicked] = useState<Set<string>>(new Set(options.map((o) => o.name)));
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");
  useEffect(() => {
    setState("idle");
    setError("");
    setPicked(new Set([p.series, p.manufacturer].filter((x): x is string => !!x)));
  }, [p.id, p.series, p.manufacturer]);
  useEffect(() => {
    if (email) setValue((cur) => cur || email);
  }, [email]);
  if (!options.length) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const chosen = options.filter((o) => picked.has(o.name));
    if (!chosen.length) return setError("Tick at least one.");
    setState("busy");
    setError("");
    try {
      for (const o of chosen)
        await api("/follows", { method: "POST", body: JSON.stringify({ email: value.trim(), kind: o.kind, name: o.name }) });
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that.");
      setState("idle");
    }
  };

  if (state === "done")
    return (
      <div className="sf-follow is-done" role="status">
        ✓ We'll email {value.trim()} when new pre-orders open for{" "}
        {options
          .filter((o) => picked.has(o.name))
          .map((o) => o.name)
          .join(" and ")}
        .
      </div>
    );
  return (
    <form className="sf-follow" onSubmit={submit} aria-labelledby="follow-title">
      <div id="follow-title" className="sf-follow__title">
        Get new pre-orders first
      </div>
      <p className="sf-muted">An email when a new pre-order opens from:</p>
      <div className="sf-follow__options">
        {options.map((o) => (
          <label key={o.kind}>
            <input
              type="checkbox"
              checked={picked.has(o.name)}
              onChange={() =>
                setPicked((cur) => {
                  const next = new Set(cur);
                  if (next.has(o.name)) next.delete(o.name);
                  else next.add(o.name);
                  return next;
                })
              }
            />
            {o.name} <span className="sf-muted">({o.kind === "series" ? "series" : "maker"})</span>
          </label>
        ))}
      </div>
      <div className="sf-follow__row">
        <input
          className="sh-input"
          type="email"
          required
          placeholder="you@example.com"
          aria-label="Your email"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button className="sh-btn" disabled={state === "busy"}>
          {state === "busy" ? "Saving…" : "Email me"}
        </button>
      </div>
      {error && <span className="sf-error">{error}</span>}
      <span className="sf-muted sf-follow__small">Only pre-order news for what you tick. Every email has a link to stop.</span>
    </form>
  );
}
