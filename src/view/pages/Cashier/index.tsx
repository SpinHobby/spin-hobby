import React, { useRef, useState } from "react";
import { identifyPhoto, recordItem } from "api/cashier";
import "./cashier.scss";

const CASHIER_PASSWORD = "spinedm26";
const AUTH_STORAGE_KEY = "spinhobby_cashier_unlocked";

type Step = "capture" | "loading" | "review" | "saving" | "final" | "error";

export default function Cashier() {
  const [unlocked, setUnlocked] = useState(
    () => localStorage.getItem(AUTH_STORAGE_KEY) === "true"
  );
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (password === CASHIER_PASSWORD) {
      localStorage.setItem(AUTH_STORAGE_KEY, "true");
      setUnlocked(true);
    } else {
      setPasswordError("Incorrect password");
    }
  }

  if (!unlocked) {
    return (
      <div className="cashier-page">
        <div className="cashier-container">
          <h1>Cashier</h1>
          <form className="cashier-step" onSubmit={handleUnlock}>
            <label className="cashier-field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError("");
                }}
                autoFocus
              />
            </label>
            {passwordError && <p className="cashier-error">{passwordError}</p>}
            <button type="submit" className="cashier-btn cashier-btn-primary">
              Unlock
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <CashierTool />;
}

function CashierTool() {
  const [step, setStep] = useState<Step>("capture");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setPhotoFile(file);
    setPhotoUrl(URL.createObjectURL(file));
    setStep("loading");
    setError("");

    try {
      const result = await identifyPhoto(file);
      setTitle(result.title);
      setDescription(result.description);
      setPrice("");
      setStep("review");
    } catch (err: any) {
      setError(err.message || "Couldn't identify the item. Try again or enter it manually.");
      setTitle("");
      setDescription("");
      setPrice("");
      setStep("error");
    }
  }

  function startOver() {
    setStep("capture");
    setPhotoFile(null);
    setPhotoUrl("");
    setTitle("");
    setDescription("");
    setPrice("");
    setError("");
    setSaveError("");
  }

  async function confirmAndSave() {
    setStep("saving");
    setSaveError("");
    try {
      await recordItem({
        photo: photoFile || undefined,
        title,
        description,
        price: priceValue,
      });
    } catch (err: any) {
      setSaveError(
        err.message || "Couldn't save to Square. You can still charge the amount manually."
      );
    }
    setStep("final");
  }

  const priceValue = parseFloat(price);
  const priceIsValid = !isNaN(priceValue) && priceValue > 0;

  return (
    <div className="cashier-page">
      <div className="cashier-container">
        <h1>Cashier</h1>

        {step === "capture" && (
          <div className="cashier-step cashier-capture">
            <p className="cashier-hint">
              Take a photo of the item. We'll draft a title and description for you to review.
            </p>
            <button
              className="cashier-btn cashier-btn-primary"
              onClick={() => fileInputRef.current?.click()}
            >
              📷 Take Photo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhoto}
              hidden
            />
          </div>
        )}

        {step === "loading" && (
          <div className="cashier-step cashier-loading">
            {photoUrl && <img src={photoUrl} alt="Captured item" className="cashier-photo" />}
            <div className="cashier-spinner" />
            <p>Identifying item...</p>
          </div>
        )}

        {(step === "review" || step === "error") && (
          <div className="cashier-step cashier-review">
            {photoUrl && <img src={photoUrl} alt="Captured item" className="cashier-photo" />}

            {error && <p className="cashier-error">{error}</p>}

            <label className="cashier-field">
              <span>Title</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Tanjiro Kamado Figure"
              />
            </label>

            <label className="cashier-field">
              <span>Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description"
                rows={3}
              />
            </label>

            <label className="cashier-field">
              <span>Price ($)</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                autoFocus={step === "review"}
              />
            </label>

            <div className="cashier-actions">
              <button className="cashier-btn cashier-btn-ghost" onClick={startOver}>
                Retake Photo
              </button>
              <button
                className="cashier-btn cashier-btn-primary"
                disabled={!title || !priceIsValid}
                onClick={confirmAndSave}
              >
                Ready to Charge
              </button>
            </div>
          </div>
        )}

        {step === "saving" && (
          <div className="cashier-step cashier-loading">
            <div className="cashier-spinner" />
            <p>Saving to Square...</p>
          </div>
        )}

        {step === "final" && (
          <div className="cashier-step cashier-final">
            <div className="cashier-final-title">{title}</div>
            <div className="cashier-final-price">${priceValue.toFixed(2)}</div>
            {saveError ? (
              <p className="cashier-error">{saveError}</p>
            ) : (
              <p className="cashier-final-instructions">
                Saved to Square. In <strong>Square Point of Sale</strong>, search
                "<strong>{title}</strong>" to add it to the sale, then tap the customer's
                card on the reader.
              </p>
            )}
            <button className="cashier-btn cashier-btn-primary" onClick={startOver}>
              Next Item
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
