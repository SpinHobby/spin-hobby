import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { dateLabel } from "../format";
import { useAuth } from "../hooks";
import type { ReviewList, ReviewSummary } from "./reviewData";

// Reviews from verified buyers; the data and the hook that loads it are in reviewData.ts.

/** Five stars, filled to the rating (halves shown as a partly filled star). */
export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="sf-stars" style={{ fontSize: size }} role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className="sf-stars__star" style={{ "--fill": `${Math.max(0, Math.min(1, value - n + 1)) * 100}%` } as never}>
          ★
        </span>
      ))}
    </span>
  );
}

/** The line under the product name: stars and a link down to the reviews (nothing until there is a review). */
export function RatingLine({ summary }: { summary: ReviewSummary | undefined }) {
  if (!summary?.count || summary.average == null) return null;
  return (
    <a
      className="sf-rating-line"
      href="#reviews"
      onClick={(e) => {
        e.preventDefault();
        document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
    >
      <Stars value={summary.average} size={15} />
      <span>
        {summary.average.toFixed(1)} · {summary.count} {summary.count === 1 ? "review" : "reviews"}
      </span>
    </a>
  );
}

/** The product page's reviews: summary, the reviews themselves, and the form to write one. */
export function Reviews({ itemId, list }: { itemId: string; list: ReviewList | null }) {
  const [writing, setWriting] = useState(false);
  const [sent, setSent] = useState(false);
  useEffect(() => {
    setWriting(false);
    setSent(false);
  }, [itemId]);
  const summary = list?.summary;

  return (
    <section className="sf-reviews" id="reviews" aria-labelledby="reviews-title">
      <div className="sf-section-head">
        <h2 id="reviews-title" className="sh-display">
          Reviews
        </h2>
        {!writing && !sent && (
          <button type="button" className="sh-btn sh-btn--ghost" onClick={() => setWriting(true)}>
            Write a review
          </button>
        )}
      </div>

      {sent && (
        <p className="sf-reviews__note" role="status">
          Thanks! Your review shows here once we've read it, usually within a day.
        </p>
      )}
      {writing && (
        <ReviewForm
          itemId={itemId}
          onCancel={() => setWriting(false)}
          onSent={() => {
            setWriting(false);
            setSent(true);
          }}
        />
      )}

      {list === null ? (
        <div className="sh-skeleton" style={{ height: 80 }} />
      ) : summary && summary.count > 0 && summary.average != null ? (
        <div className="sf-reviews__body">
          <div className="sf-reviews__summary">
            <div className="sf-reviews__avg">{summary.average.toFixed(1)}</div>
            <Stars value={summary.average} size={18} />
            <div className="sf-muted">
              {summary.count} {summary.count === 1 ? "review" : "reviews"} from verified buyers
            </div>
            <ul className="sf-reviews__bars" aria-label="Reviews by stars">
              {summary.stars.map((n, i) => (
                <li key={i}>
                  <span>{5 - i}★</span>
                  <span className="sf-reviews__bar">
                    <span style={{ width: `${(n / summary.count) * 100}%` }} />
                  </span>
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </div>
          <ul className="sf-reviews__list">
            {list.items.map((r) => (
              <li key={r.id} className="sf-review">
                <div className="sf-review__head">
                  <Stars value={r.rating} size={14} />
                  {r.title && <b>{r.title}</b>}
                </div>
                <p>{r.body}</p>
                <div className="sf-review__by">
                  {r.authorName} · <span className="sf-review__verified">Verified buyer</span> · {dateLabel(r.createdAt)}
                </div>
                {r.reply && (
                  <div className="sf-review__reply">
                    <b>Spin Hobby:</b> {r.reply}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        !writing && <p className="sf-muted">No reviews yet. Bought this one? Tell other collectors what you think.</p>
      )}
    </section>
  );
}

function ReviewForm({ itemId, onCancel, onSent }: { itemId: string; onCancel: () => void; onSent: () => void }) {
  const auth = useAuth();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const guest = !auth.user;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return setError("Pick from 1 to 5 stars.");
    setBusy(true);
    setError("");
    try {
      await api("/reviews", {
        method: "POST",
        body: JSON.stringify({
          itemId,
          rating,
          title: title.trim() || null,
          body: body.trim(),
          name: name.trim(),
          ...(guest ? { orderId: Number(orderId.replace(/\D/g, "")), email: email.trim() } : {}),
        }),
      });
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send your review.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="sf-review-form" onSubmit={submit}>
      <p className="sf-muted sf-review-form__lead">
        Reviews are from buyers only.{" "}
        {guest
          ? "Give the order number and email from your confirmation email (or sign in)."
          : "We'll match it to your order of this item."}
      </p>
      <fieldset className="sf-review-form__stars">
        <legend>Your rating</legend>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={n <= rating ? "is-on" : ""}>
            <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} />
            <span aria-hidden>★</span>
            <span className="sh-visually-hidden">
              {n} {n === 1 ? "star" : "stars"}
            </span>
          </label>
        ))}
      </fieldset>
      <label>
        <span>Title (optional)</span>
        <input className="sh-input" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label>
        <span>Your review</span>
        <textarea
          className="sh-input"
          required
          rows={4}
          maxLength={2000}
          value={body}
          placeholder="Paint, box condition, how it looks on the shelf…"
          onChange={(e) => setBody(e.target.value)}
        />
      </label>
      <label>
        <span>Name shown with the review</span>
        <input
          className="sh-input"
          required
          maxLength={60}
          value={name}
          placeholder="e.g. Mika T."
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      {guest && (
        <div className="sf-review-form__row">
          <label>
            <span>Order number</span>
            <input className="sh-input" required inputMode="numeric" value={orderId} onChange={(e) => setOrderId(e.target.value)} />
          </label>
          <label>
            <span>Email you ordered with</span>
            <input
              className="sh-input"
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
        </div>
      )}
      {error && (
        <div className="sf-reviews__error" role="alert">
          {error}
        </div>
      )}
      <div className="sf-review-form__actions">
        <button type="button" className="sh-btn sh-btn--ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="sh-btn" disabled={busy}>
          {busy ? "Sending…" : "Send review"}
        </button>
      </div>
    </form>
  );
}
