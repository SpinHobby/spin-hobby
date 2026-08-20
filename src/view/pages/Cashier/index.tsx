import React, { useRef, useState } from "react";
import {
  identifyPhoto,
  recordItem,
  PRODUCT_CATEGORIES,
  searchItemsForEdit,
  getItemForEdit,
  updateItem,
  ISearchResultItem,
  IArtworkCrop,
} from "api/cashier";
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

type PageTab = "add" | "edit";

function CashierTool() {
  const [tab, setTab] = useState<PageTab>("add");

  return (
    <div className="cashier-page">
      <div className="cashier-container">
        <h1>Cashier</h1>
        <div className="cashier-page-tabs">
          <button className={tab === "add" ? "active" : ""} onClick={() => setTab("add")}>
            Add New
          </button>
          <button className={tab === "edit" ? "active" : ""} onClick={() => setTab("edit")}>
            Edit Existing
          </button>
        </div>
        {tab === "add" ? <AddNewFlow /> : <EditExistingFlow />}
      </div>
    </div>
  );
}

function AddNewFlow() {
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
  const [artworkCrop, setArtworkCrop] = useState<IArtworkCrop | undefined>(undefined);
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
      const result = await identifyPhoto(file, condition);
      setTitle(result.title);
      setDescription(result.description);
      setCategory(
        (PRODUCT_CATEGORIES as readonly string[]).includes(result.category)
          ? result.category
          : PRODUCT_CATEGORIES[0]
      );
      setPrice("");
      setArtworkCrop(result.artworkCrop);
      setStep("review");
    } catch (err: any) {
      setError(err.message || "Couldn't identify the item. Try again or enter it manually.");
      setTitle("");
      setDescription("");
      setPrice("");
      setArtworkCrop(undefined);
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
    setArtworkCrop(undefined);
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
        artworkCrop,
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
    <>
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
            {condition === "sealed" && (
              <p className="cashier-hint">
                {artworkCrop
                  ? "Found the box artwork — it'll be cropped and straightened automatically for the product photo."
                  : "Couldn't confidently locate the box artwork in this photo — the full photo will be used as-is. Try a closer, more square-on shot if the result looks off."}
              </p>
            )}

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
    </>
  );
}

function EditExistingFlow() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ISearchResultItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingItem, setLoadingItem] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [existingCategoryId, setExistingCategoryId] = useState<string | undefined>(undefined);
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [hidden, setHidden] = useState(false);
  const [stockTracked, setStockTracked] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError("");
    searchItemsForEdit(query.trim())
      .then(setResults)
      .catch((err) => setError(err.message || "Search failed"))
      .finally(() => setSearching(false));
  }

  function selectItem(id: string) {
    setSelectedId(id);
    setSaved(false);
    setSaveError("");
    setPhotoFile(null);
    setPhotoUrl("");
    setLoadingItem(true);
    getItemForEdit(id)
      .then((item) => {
        setTitle(item.name);
        setDescription(item.description || "");
        setCategory(
          item.categoryName &&
            (PRODUCT_CATEGORIES as readonly string[]).includes(item.categoryName)
            ? item.categoryName
            : ""
        );
        setExistingCategoryId(item.categoryId);
        setPrice((item.priceCents / 100).toFixed(2));
        setHidden(item.hidden);
        setStockTracked(item.stockCount != null);
        setQuantity(item.stockCount != null ? String(item.stockCount) : "");
      })
      .catch((err) => setError(err.message || "Could not load item"))
      .finally(() => setLoadingItem(false));
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoFile(file);
    setPhotoUrl(URL.createObjectURL(file));
  }

  function saveChanges() {
    if (!selectedId) return;
    setSaving(true);
    setSaveError("");
    updateItem(selectedId, {
      photo: photoFile || undefined,
      title,
      description,
      category,
      categoryId: existingCategoryId,
      price: priceValue,
      hidden,
      quantity: !hidden && quantityValue >= 0 ? quantityValue : undefined,
    })
      .then(() => setSaved(true))
      .catch((err) => setSaveError(err.message || "Could not save changes"))
      .finally(() => setSaving(false));
  }

  function backToSearch() {
    setSelectedId(null);
    setSaved(false);
    setSaveError("");
  }

  const priceValue = parseFloat(price);
  const priceIsValid = !isNaN(priceValue) && priceValue > 0;
  const quantityValue = parseInt(quantity, 10);
  const quantityIsValid = hidden || !stockTracked || (!isNaN(quantityValue) && quantityValue >= 0);
  const canSave = !!title && priceIsValid && quantityIsValid;

  if (!selectedId) {
    return (
      <div className="cashier-step">
        <form className="cashier-search-form" onSubmit={handleSearch}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items by name..."
            autoFocus
          />
          <button className="cashier-btn cashier-btn-primary" type="submit">
            {searching ? "Searching..." : "Search"}
          </button>
        </form>
        {error && <p className="cashier-error">{error}</p>}
        {results.length > 0 && (
          <div className="cashier-search-results">
            {results.map((item) => (
              <button
                key={item.id}
                className="cashier-search-result"
                onClick={() => selectItem(item.id)}
              >
                <span>{item.name}</span>
                <span className="cashier-search-result-meta">
                  ${(item.priceCents / 100).toFixed(2)}
                  {item.hidden && " · POS only"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (loadingItem) {
    return (
      <div className="cashier-step cashier-loading">
        <div className="cashier-spinner" />
        <p>Loading item...</p>
      </div>
    );
  }

  return (
    <div className="cashier-step cashier-review">
      <button className="cashier-btn cashier-btn-ghost" onClick={backToSearch}>
        ← Back to Search
      </button>

      {saveError && <p className="cashier-error">{saveError}</p>}
      {saved && <p className="cashier-final-instructions">Saved.</p>}

      {photoUrl && <img src={photoUrl} alt="New photo" className="cashier-photo" />}
      <button
        className="cashier-btn cashier-btn-ghost"
        onClick={() => fileInputRef.current?.click()}
      >
        {photoUrl ? "Retake Photo" : "📷 Replace Photo (optional)"}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhoto}
        hidden
      />

      <label className="cashier-field">
        <span>Title</span>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>

      <label className="cashier-field">
        <span>Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </label>

      <label className="cashier-field">
        <span>Category</span>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {!category && (
            <option value="">Keep existing category (not in our list)</option>
          )}
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
        />
      </label>

      <label className="cashier-field cashier-checkbox-field">
        <input
          type="checkbox"
          checked={hidden}
          onChange={(e) => setHidden(e.target.checked)}
        />
        <span>Hidden from website (Convention/POS only)</span>
      </label>

      {!hidden && (
        <label className="cashier-field">
          <span>Stock Count</span>
          <input
            type="number"
            inputMode="numeric"
            step="1"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder={stockTracked ? undefined : "Untracked - leave blank to keep it that way"}
          />
        </label>
      )}

      <div className="cashier-actions">
        <button className="cashier-btn cashier-btn-ghost" onClick={backToSearch}>
          Cancel
        </button>
        <button
          className="cashier-btn cashier-btn-primary"
          disabled={!canSave || saving}
          onClick={saveChanges}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
