import { FormEvent, useEffect, useState } from "react";
import { isOn } from "../../features";
import { api } from "../../lib/api";
import { PROVINCES, STATES } from "../checkout/regions";
import { useAuth, useEscape } from "../hooks";
import type { AppUser } from "../types";
import { EmailCode } from "./EmailCode";
import { reloadUser } from "./reloadUser";
import { WelcomeDone } from "./WelcomeDone";
import "./welcome.scss";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

interface Address {
  address1: string;
  address2: string;
  city: string;
  province: string;
  postalCode: string;
  country: "CA" | "US";
}
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** Days in a month for a birthday (February has 29: some people are born on the 29th). */
const daysIn = (month: number) => (month ? [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] : 31);
const NO_ADDRESS: Address = { address1: "", address2: "", city: "", province: "ON", postalCode: "", country: "CA" };

/**
 * Right after signing up: 1) confirm the email with the code we sent, 2) a few optional details (name, phone, birthday, a shipping address
 * that checkout fills in, pre-order news), 3) a short welcome. Everything can be skipped; shopping never waits for it. Closing it
 * in any way marks the welcome as seen, so it doesn't come back on every page; the email can still be confirmed later from a limited
 * item (or Rewards, where rewards are on).
 */
export function Welcome({ user, onClose }: { user: AppUser; onClose: () => void }) {
  const [step, setStep] = useState<"code" | "details" | "done">(user.emailVerified ? "details" : "code");
  const [firstName, setFirstName] = useState(user.firstName ?? "");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [addressOpen, setAddressOpen] = useState(false);
  const [address, setAddress] = useState<Address>(NO_ADDRESS);
  const [news, setNews] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const finishWelcome = async () => {
    await reloadUser().catch(() => undefined);
    onClose();
  };
  // × , Escape and the backdrop: marks the welcome as seen and closes at once.
  const close = async () => {
    if (step === "done") return finishWelcome();
    try {
      await api("/account/profile", { method: "PATCH", body: JSON.stringify({}) });
      await reloadUser();
    } catch {
      /* seen or not, the customer carries on shopping */
    }
    onClose();
  };
  useEscape(() => void close());

  const set = (k: keyof Address) => (e: { target: { value: string } }) =>
    setAddress((a) => {
      const next = { ...a, [k]: e.target.value };
      if (k === "country") next.province = e.target.value === "CA" ? "ON" : "WA";
      return next;
    });

  /** Saves what was filled in (nothing, for Skip), then the welcome. */
  const save = async (e?: FormEvent, skip = false) => {
    e?.preventDefault();
    setError("");
    setBusy(true);
    try {
      const body = skip
        ? {}
        : {
            firstName: firstName.trim() || undefined,
            lastName: lastName.trim() || undefined,
            phone: phone.trim(),
            ...(birthMonth && birthDay ? { birthday: { month: Number(birthMonth), day: Number(birthDay) } } : {}),
            ...(addressOpen && address.address1.trim() ? { address } : {}),
          };
      await api("/account/profile", { method: "PATCH", body: JSON.stringify(body) });
      if (!skip && news) await api("/follows", { method: "POST", body: JSON.stringify({ email: user.email, kind: "all", name: "" }) });
      // The account is reloaded when the welcome ends: reloading now would mark it welcomed and the page would close this dialog.
      setBusy(false);
      setStep("done");
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };

  // The browser may have filled the address in before the customer opened it: open it so they can see it.
  useEffect(() => {
    if (!addressOpen && address.address1) setAddressOpen(true);
  }, [address.address1, addressOpen]);

  const regions = address.country === "CA" ? PROVINCES : STATES;
  return (
    <>
      <div className="sh-overlay sh-welcome-backdrop" onClick={() => void close()} />
      <div className={`sh-welcome ${step === "done" ? "is-done" : ""}`} role="dialog" aria-modal="true" aria-labelledby="welcome-title">
        {step !== "done" && (
          <div className="sh-welcome__head">
            <span className="sh-eyebrow">{step === "code" ? "Step 1 of 2" : user.emailVerified ? "Almost done" : "Step 2 of 2"}</span>
            <button type="button" className="sh-icon-btn" onClick={() => void close()} aria-label="Close">
              ×
            </button>
          </div>
        )}

        {step === "code" && (
          <>
            <h2 id="welcome-title" className="sh-display">
              Welcome! Confirm your email
            </h2>
            <p>
              You can shop right away. Confirming your email lets you buy limited releases
              {isOn("rewards") ? " and use rewards points" : ""}.
            </p>
            <EmailCode email={user.email} sent onConfirmed={() => setStep("details")} />
            <button type="button" className="sh-welcome__later" onClick={() => setStep("details")}>
              Do this later
            </button>
          </>
        )}

        {step === "details" && (
          <form className="sh-welcome__form" onSubmit={save}>
            <h2 id="welcome-title" className="sh-display">
              {user.emailVerified ? "Email confirmed. A few optional details" : "A few optional details"}
            </h2>
            <p className="sh-welcome__lead">All optional. They make checkout faster next time.</p>
            <div className="sh-welcome__row">
              <label className="sh-welcome__field">
                First name
                <input
                  className="sh-input"
                  autoComplete="given-name"
                  maxLength={80}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </label>
              <label className="sh-welcome__field">
                Last name
                <input
                  className="sh-input"
                  autoComplete="family-name"
                  maxLength={80}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </label>
            </div>
            <label className="sh-welcome__field">
              Phone
              <input
                className="sh-input"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder="416 555 0123"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <small>Only for delivery questions. We never call to sell.</small>
            </label>
            <fieldset className="sh-welcome__birthday">
              <legend>Birthday</legend>
              <div className="sh-welcome__row">
                <select
                  className="sh-input"
                  aria-label="Birthday month"
                  autoComplete="bday-month"
                  value={birthMonth}
                  onChange={(e) => {
                    setBirthMonth(e.target.value);
                    if (Number(birthDay) > daysIn(Number(e.target.value))) setBirthDay("");
                  }}
                >
                  <option value="">Month</option>
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  className="sh-input"
                  aria-label="Birthday day"
                  autoComplete="bday-day"
                  value={birthDay}
                  onChange={(e) => setBirthDay(e.target.value)}
                >
                  <option value="">Day</option>
                  {Array.from({ length: daysIn(Number(birthMonth)) }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </div>
              <small>Month and day only, never the year.</small>
            </fieldset>

            {addressOpen ? (
              <fieldset className="sh-welcome__address">
                <legend>Shipping address</legend>
                <label className="sh-welcome__field">
                  Street address
                  <input
                    className="sh-input"
                    autoComplete="address-line1"
                    maxLength={120}
                    value={address.address1}
                    onChange={set("address1")}
                  />
                </label>
                <label className="sh-welcome__field">
                  Apartment, suite (optional)
                  <input
                    className="sh-input"
                    autoComplete="address-line2"
                    maxLength={120}
                    value={address.address2}
                    onChange={set("address2")}
                  />
                </label>
                <div className="sh-welcome__row">
                  <label className="sh-welcome__field">
                    City
                    <input className="sh-input" autoComplete="address-level2" maxLength={80} value={address.city} onChange={set("city")} />
                  </label>
                  <label className="sh-welcome__field">
                    {address.country === "CA" ? "Postal code" : "ZIP code"}
                    <input
                      className="sh-input"
                      autoComplete="postal-code"
                      autoCapitalize="characters"
                      maxLength={10}
                      placeholder={address.country === "CA" ? "A1A 1A1" : "12345"}
                      value={address.postalCode}
                      onChange={set("postalCode")}
                    />
                  </label>
                </div>
                <div className="sh-welcome__row">
                  <label className="sh-welcome__field">
                    {address.country === "CA" ? "Province" : "State"}
                    <select className="sh-input" autoComplete="address-level1" value={address.province} onChange={set("province")}>
                      {regions.map(([code, label]) => (
                        <option key={code} value={code}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="sh-welcome__field">
                    Country
                    <select className="sh-input" autoComplete="country" value={address.country} onChange={set("country")}>
                      <option value="CA">Canada</option>
                      <option value="US">United States</option>
                    </select>
                  </label>
                </div>
                <small className="sh-welcome__note">Checkout fills this in for you.</small>
              </fieldset>
            ) : (
              <button type="button" className="sh-welcome__add" onClick={() => setAddressOpen(true)}>
                + Add a shipping address <span>Checkout fills it in for you</span>
              </button>
            )}

            <label className="sh-welcome__check">
              <input type="checkbox" checked={news} onChange={(e) => setNews(e.target.checked)} />
              <span>Email me about new pre-orders. Stop any time.</span>
            </label>
            {error && (
              <span className="sh-code__error" role="alert">
                {error}
              </span>
            )}
            <button className="sh-btn" disabled={busy}>
              {busy ? "Saving…" : "Save and start shopping"}
            </button>
            <button type="button" className="sh-welcome__later" onClick={() => void save(undefined, true)} disabled={busy}>
              Skip
            </button>
          </form>
        )}

        {step === "done" && <WelcomeDone firstName={firstName.trim() || user.firstName || ""} onDone={() => void finishWelcome()} />}
      </div>
    </>
  );
}

/**
 * Shows the welcome step on pages outside the shop (Rewards, support…) for an account that hasn't seen it yet; the shop has its
 * own (Storefront.tsx), which also greets returning customers.
 */
export function WelcomeGate() {
  const { user } = useAuth();
  const [done, setDone] = useState(false);
  if (!user || user.welcomed !== false || done) return null;
  return <Welcome user={user} onClose={() => setDone(true)} />;
}
