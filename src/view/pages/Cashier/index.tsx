import React, { useRef, useState } from "react";
import { identifyPhoto, recordItem, PRODUCT_CATEGORIES } from "api/cashier";
import "./cashier.scss";

const CASHIER_PASSWORD = "spinedm26";
const AUTH_STORAGE_KEY = "spinhobby_cashier_unlocked";

type Step = "capture" | "loading" | "review" | "saving" | "final" | "error";
type Mode = "website" | "pos";
type Condition = "sealed" | "used";

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
  const [mode, setMode] = useState<Mode>("website");
  const [condition, setCondition] = useState<Condition>("sealed");
  const [step, setStep] = useState<Step>("capture");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(PRODUCT_CATEGORIES[0]);
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
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
      setCategory(
        (PRODUCT_CATEGORIES as readonly string[]).includes(result.category)
          ? result.category
          : PRODUCT_CATEGORIES[0]
      );
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
    setCategory(PRODUCT_CATEGORIES[0]);
    setPrice("");
    setQuantity("");
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
        category,
        condition,
        price: priceValue,
        hidden: mode === "pos",
        quantity: mode === "website" ? quantityValue : undefined,
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
  const quantityValue = parseInt(quantity, 10);
  const quantityIsValid = mode === "pos" || (!isNaN(quantityValue) && quantityValue >= 0);
  const canSave = !!title && priceIsValid && quantityIsValid;

  return (
    <div className="cashier-page">
      <div className="cashier-container">
        <h1>Cashier</h1>

        {step !== "saving" && step !== "final" && (
          <div className="cashier-mode-toggle">
            <button
              className={mode === "website" ? "active" : ""}
              onClick={() => setMode("website")}
            >
              Add to Website
            </button>
            <button
              className={mode === "pos" ? "active" : ""}
              onClick={() => setMode("pos")}
            >
              Convention (POS)
            </button>
          </div>
        )}

        {step === "capture" && (
          <div className="cashier-step cashier-capture">
            <div className="cashier-condition-toggle">
              <button
                className={condition === "sealed" ? "active" : ""}
                onClick={() => setCondition("sealed")}
              >
                Sealed
              </button>
              <button
                className={condition === "used" ? "active" : ""}
                onClick={() => setCondition("used")}
              >
                Opened / Used
              </button>
            </div>
            <p className="cashier-hint">
              {condition === "sealed"
                ? "Take a close-up photo of the box's front artwork (not the whole box) — that's the manufacturer's own product photo, so it'll look sharp without showing anything that isn't accurate to what's sealed inside."
                : "Take a clear, well-lit photo of the actual item."}{" "}
              We'll draft a title and description for you to review.
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
              <span>Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
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

            {mode === "website" && (
              <label className="cashier-field">
                <span>Stock Count</span>
                <input
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="How many do you have?"
                />
              </label>
            )}

            <div className="cashier-actions">
              <button className="cashier-btn cashier-btn-ghost" onClick={startOver}>
                Retake Photo
              </button>
              <button
                className="cashier-btn cashier-btn-primary"
                disabled={!canSave}
                onClick={confirmAndSave}
              >
                {mode === "website" ? "Add to Website" : "Ready to Charge"}
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
            ) : mode === "website" ? (
              <p className="cashier-final-instructions">
                Added to the website with <strong>{quantityValue}</strong> in stock.
                It's live on spinhobby.com now.
              </p>
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
