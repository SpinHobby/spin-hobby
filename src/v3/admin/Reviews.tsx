import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { dateLabel } from "../format";
import { Banner, Button, Card, EmptyState, SegmentedControl } from "../../components";
import { productPath } from "../storefront/data";
import type { Ctx } from "./Screens";

type Status = "pending" | "approved" | "rejected";

/** A review as GET /admin/reviews returns it (staff see the buyer's order and email; the shop never does). */
interface StaffReview {
  id: string;
  itemId: string;
  productName: string | null;
  orderId: number;
  email: string;
  authorName: string;
  rating: number;
  title: string | null;
  body: string;
  reply: string | null;
  status: Status;
  createdAt: string;
  reviewedAt: string | null;
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
const TABS: { value: Status; label: string }[] = [
  { value: "pending", label: "Waiting" },
  { value: "approved", label: "Shown" },
  { value: "rejected", label: "Hidden" },
];

/**
 * Admin > Reviews: reviews shoppers wrote of things they bought. Nothing shows on the shop until it's approved here; a reply is shown
 * under the review as "Spin Hobby:".
 */
export function ReviewsScreen({ ctx }: { ctx: Ctx }) {
  const [tab, setTab] = useState<Status>("pending");
  const [reviews, setReviews] = useState<StaffReview[] | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    setReviews(null);
    api<{ reviews: StaffReview[]; pendingCount: number }>(`/admin/reviews?status=${tab}`)
      .then((r) => {
        setReviews(r.reviews);
        setPendingCount(r.pendingCount);
      })
      .catch((e) => setError(errMsg(e)));
  }, [tab]);
  useEffect(load, [load]);

  const decide = async (r: StaffReview, status: Status, reply: string) => {
    try {
      await api(`/admin/reviews/${r.id}`, { method: "PUT", body: JSON.stringify({ status, reply: reply.trim() || null }) });
      ctx.flash(
        status === "approved" ? "Review shown on the shop" : status === "rejected" ? "Review hidden" : "Review moved back to Waiting",
      );
      load();
    } catch (e) {
      ctx.flash(errMsg(e));
    }
  };

  return (
    <div className="ad-reviews">
      <p className="ad-muted">
        Only buyers can review an item (checked against their order). Nothing shows on the product page until you approve it here. Hide
        reviews that are spam or share personal details, not ones that are just critical: honest reviews are what make shoppers trust the
        good ones.
      </p>
      <SegmentedControl
        label="Reviews"
        value={tab}
        onChange={setTab}
        options={TABS.map((t) => ({
          value: t.value,
          label: t.value === "pending" && pendingCount ? `${t.label} (${pendingCount})` : t.label,
        }))}
      />
      {error && (
        <Banner tone="error" action={{ label: "Retry", onClick: load }}>
          {error}
        </Banner>
      )}
      {reviews === null ? (
        !error && <div className="sh-skeleton" style={{ height: 120 }} />
      ) : reviews.length === 0 ? (
        <EmptyState title={tab === "pending" ? "Nothing waiting" : "None yet"}>
          {tab === "pending" ? "New reviews from buyers show up here." : "Reviews you decide on show up here."}
        </EmptyState>
      ) : (
        reviews.map((r) => <ReviewCard key={r.id} r={r} onDecide={decide} />)
      )}
    </div>
  );
}

function ReviewCard({ r, onDecide }: { r: StaffReview; onDecide: (r: StaffReview, status: Status, reply: string) => Promise<void> }) {
  const [reply, setReply] = useState(r.reply ?? "");
  const [busy, setBusy] = useState(false);
  const act = async (status: Status) => {
    setBusy(true);
    await onDecide(r, status, reply);
    setBusy(false);
  };
  return (
    <Card
      title={
        <span className="ad-review__title">
          <span className="ad-review__stars" aria-label={`${r.rating} out of 5 stars`}>
            {"★".repeat(r.rating)}
            <span>{"★".repeat(5 - r.rating)}</span>
          </span>
          {r.title ?? "Review"}
        </span>
      }
      action={
        <a className="ad-muted ad-sm" href={productPath({ id: r.itemId, name: r.productName ?? "" })} target="_blank" rel="noreferrer">
          {r.productName ?? r.itemId} ↗
        </a>
      }
    >
      <div className="ad-review">
        <p className="ad-review__body">{r.body}</p>
        <p className="ad-muted ad-sm">
          {r.authorName} · order #{r.orderId} · {r.email} · {dateLabel(r.createdAt)}
          {r.reviewedAt && ` · decided ${dateLabel(r.reviewedAt)}`}
        </p>
        <label className="ad-review__reply">
          <span className="ad-sm">Public reply (optional, shown as "Spin Hobby:")</span>
          <textarea className="sh-input" rows={2} maxLength={1000} value={reply} onChange={(e) => setReply(e.target.value)} />
        </label>
        <div className="ad-review__actions">
          {r.status !== "rejected" && (
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => void act("rejected")}>
              Hide
            </Button>
          )}
          {r.status !== "pending" && (
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => void act("pending")}>
              Back to Waiting
            </Button>
          )}
          <Button size="sm" loading={busy} onClick={() => void act("approved")}>
            {r.status === "approved" ? "Save reply" : "Approve and show"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
