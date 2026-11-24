import { useState, type FormEvent } from "react";
import { api, getSession } from "../../lib/api";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Please try again.");

/**
 * "Ask us to find one", for a sold item: the shopper leaves an email (filled in when signed in) and an optional note. No payment
 * and no promise; the shop emails back if it finds one (POST /requests; Admin > Requests answers them).
 */
export function AskToFind({ product, className = "" }: { product: { id: string; name: string }; className?: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(() => getSession()?.user.email ?? "");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  const send = async (e: FormEvent) => {
    e.preventDefault();
    setState("sending");
    setError("");
    try {
      await api("/requests", {
        method: "POST",
        body: JSON.stringify({ productId: product.id, email: email.trim(), note: note.trim() || null }),
      });
      setState("sent");
    } catch (err) {
      setError(errMsg(err));
      setState("idle");
    }
  };

  if (state === "sent")
    return (
      <p className={`sf-ask sf-ask--done ${className}`} role="status">
        Got it. We'll email {email.trim()} if we find one.
      </p>
    );
  if (!open)
    return (
      <button
        type="button"
        className={`sf-ask__open ${className}`}
        onClick={() => setOpen(true)}
        aria-label={`Ask us to find another ${product.name}`}
      >
        Ask us to find one
      </button>
    );
  return (
    <form className={`sf-ask ${className}`} onSubmit={send}>
      <p className="sf-ask__line">We'll look for another one and email you. No payment and no promise.</p>
      <input
        className="sh-input"
        type="email"
        required
        autoFocus
        autoComplete="email"
        placeholder="Your email"
        aria-label="Your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="sh-input"
        type="text"
        maxLength={300}
        placeholder="Anything to add? (optional)"
        aria-label="Anything to add (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      {error && (
        <span className="sf-ask__error" role="alert">
          {error}
        </span>
      )}
      <div className="sf-ask__actions">
        <button type="submit" className="sf-buy sf-buy--inline" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Ask"}
        </button>
        <button type="button" className="sf-link" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
