import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { dateLabel } from "../format";
import { resized } from "../photo";
import { Banner, Button, Card, EmptyState } from "../../components";
import { productPath } from "../storefront/data";
import type { Product } from "../types";
import type { Ctx } from "./Screens";

/** One item shoppers asked for, as GET /admin/requests returns it. */
interface RequestedItem {
  productId: string;
  name: string;
  image: string | null;
  status: string | null;
  count: number;
  latestAt: string;
  requests: { id: string; email: string; note: string | null; createdAt: string }[];
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
const canBuy = (status: string | null | undefined) => ["in", "low", "pre"].includes(String(status));

/**
 * Admin > Requests: "Ask us to find one" requests shoppers left on sold items, the most wanted first. One answer goes to everyone
 * waiting for an item: found (with a note and the listing to buy), or not found. Answering emails them and closes their requests.
 */
export function RequestsScreen({ ctx }: { ctx: Ctx }) {
  const [items, setItems] = useState<RequestedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api<{ items: RequestedItem[] }>("/admin/requests")
      .then((r) => setItems(r.items))
      .catch((e) => setError(errMsg(e)));
  }, []);
  useEffect(load, [load]);

  const waiting = items?.reduce((n, i) => n + i.count, 0) ?? 0;
  return (
    <div className="ad-requests">
      <p className="ad-muted">
        Shoppers press "Ask us to find one" on a sold item and leave their email. Nobody has paid and nothing is promised. The items asked
        for most are first: that is what to look for at the next buy. Your answer is emailed to everyone waiting for that item, once.
        {items && waiting > 0 && ` ${waiting} request${waiting === 1 ? "" : "s"} waiting.`}
      </p>
      {error && (
        <Banner tone="error" action={{ label: "Retry", onClick: load }}>
          {error}
        </Banner>
      )}
      {items === null ? (
        !error && <div className="sh-skeleton" style={{ height: 120 }} />
      ) : items.length === 0 ? (
        <EmptyState title="Nothing waiting">Requests from sold items show up here.</EmptyState>
      ) : (
        items.map((item) => <RequestCard key={item.productId} item={item} ctx={ctx} onDone={load} />)
      )}
    </div>
  );
}

function RequestCard({ item, ctx, onDone }: { item: RequestedItem; ctx: Ctx; onDone: () => void }) {
  const [message, setMessage] = useState("");
  const [find, setFind] = useState("");
  // the listing shoppers are sent to: the item itself once it is back in stock, or another listing picked here
  const [listing, setListing] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  const back = canBuy(item.status);
  const words = find.trim().toLowerCase();
  const found = useMemo(
    () =>
      words.length < 2
        ? []
        : ctx.data.products
            .filter((p) => p.id !== item.productId && canBuy(p.status) && `${p.name} ${p.series ?? ""}`.toLowerCase().includes(words))
            .slice(0, 6),
    [words, ctx.data.products, item.productId],
  );

  const answer = async (isFound: boolean) => {
    const people = `${item.count} shopper${item.count === 1 ? "" : "s"}`;
    if (!window.confirm(isFound ? `Email ${people} that you have one?` : `Email ${people} that it could not be found?`)) return;
    setBusy(true);
    try {
      const r = await api<{ sent: number }>(`/admin/requests/${encodeURIComponent(item.productId)}/answer`, {
        method: "POST",
        body: JSON.stringify({ found: isFound, message: message.trim() || null, buyProductId: isFound ? (listing?.id ?? null) : null }),
      });
      ctx.flash(`Emailed ${r.sent} shopper${r.sent === 1 ? "" : "s"}`);
      onDone();
    } catch (e) {
      ctx.flash(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title={
        <span className="ad-request__title">
          {item.image ? <img src={resized(item.image, 96)} alt="" /> : <i aria-hidden />}
          <span>
            {item.name}
            <b>
              {item.count} asked · latest {dateLabel(item.latestAt)}
            </b>
          </span>
        </span>
      }
      action={
        item.status ? (
          <a className="ad-muted ad-sm" href={productPath({ id: item.productId, name: item.name })} target="_blank" rel="noreferrer">
            Open ↗
          </a>
        ) : (
          <span className="ad-muted ad-sm">No longer in the shop</span>
        )
      }
    >
      <div className="ad-request">
        <ul className="ad-request__people">
          {item.requests.map((r) => (
            <li key={r.id}>
              <span>{r.email}</span>
              {r.note && <em>"{r.note}"</em>}
              <span className="ad-muted ad-sm">{dateLabel(r.createdAt)}</span>
            </li>
          ))}
        </ul>
        <label className="ad-request__field">
          <span className="ad-sm">A line for the shopper (optional): the price and when, or why not</span>
          <textarea className="sh-input" rows={2} maxLength={600} value={message} onChange={(e) => setMessage(e.target.value)} />
        </label>
        <div className="ad-request__field">
          <span className="ad-sm">
            {back
              ? "This item is back in stock, so the email links to it. Or pick another listing:"
              : "The email needs a listing a shopper can buy. This item is still sold out, so pick the new listing:"}
          </span>
          {listing ? (
            <span className="ad-request__picked">
              {listing.name}
              <button type="button" className="ad-link" onClick={() => setListing(null)}>
                Change
              </button>
            </span>
          ) : (
            <>
              <input
                className="sh-input"
                value={find}
                onChange={(e) => setFind(e.target.value)}
                placeholder="Find a listing in stock by name or series"
                aria-label="Find a listing in stock"
              />
              {found.length > 0 && (
                <ul className="ad-ads__found">
                  {found.map((p) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => setListing(p)}>
                        {p.images[0] ? <img src={resized(p.images[0], 96)} alt="" /> : <i aria-hidden />}
                        <span>{p.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {words.length >= 2 && found.length === 0 && <span className="ad-muted ad-sm">No listing in stock matches.</span>}
            </>
          )}
        </div>
        <div className="ad-review__actions">
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => void answer(false)}>
            Could not find it
          </Button>
          <Button
            size="sm"
            disabled={busy || (!back && !listing)}
            title={!back && !listing ? "Pick the listing a shopper can buy first" : undefined}
            onClick={() => void answer(true)}
          >
            We have one: email {item.count}
          </Button>
        </div>
      </div>
    </Card>
  );
}
