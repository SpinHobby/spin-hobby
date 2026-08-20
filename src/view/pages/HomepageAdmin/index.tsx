import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  IAdminSlide,
  IAdminFeaturedProduct,
  getAdminSlides,
  createSlide,
  updateSlide,
  deleteSlide,
  getAdminFeaturedProducts,
  addFeaturedProduct,
  updateFeaturedProduct,
  removeFeaturedProduct,
} from "api/homepage";
import { getCatalog } from "api/square";
import { getDatabaseStats, IDatabaseStats, getAiUsage, updateAiBudget, IAiToolBudget } from "api/ops";
import {
  getStoredAdminPassword,
  setStoredAdminPassword,
  clearStoredAdminPassword,
} from "api/adminAuth";
import {
  browseItems,
  getItemForEdit,
  updateItem,
  ISearchResultItem,
  PRODUCT_CATEGORIES,
} from "api/cashier";
import { IMerchPreview } from "../../../ts";
import "./homepageAdmin.scss";

export default function HomepageAdmin() {
  const [unlocked, setUnlocked] = useState(() => !!getStoredAdminPassword());
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [checkingPassword, setCheckingPassword] = useState(false);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setCheckingPassword(true);
    setPasswordError("");
    // Stash the entered password first so the verification call below picks
    // it up via adminAuthHeaders() - the backend is the actual judge now,
    // not a string compare shipped in this bundle.
    setStoredAdminPassword(password);
    try {
      await getDatabaseStats();
      setUnlocked(true);
    } catch {
      clearStoredAdminPassword();
      setPasswordError("Incorrect password");
    } finally {
      setCheckingPassword(false);
    }
  }

  if (!unlocked) {
    return (
      <div className="homepage-admin-page">
        <div className="homepage-admin-container">
          <h1>Homepage Admin</h1>
          <form className="homepage-admin-gate-form" onSubmit={handleUnlock}>
            <label className="homepage-admin-field">
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
            {passwordError && <p className="homepage-admin-error">{passwordError}</p>}
            <button
              type="submit"
              className="homepage-admin-btn homepage-admin-btn-primary"
              disabled={checkingPassword}
            >
              {checkingPassword ? "Checking..." : "Unlock"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <HomepageAdminTool />;
}

type Tab = "homepage" | "items" | "ops";

function HomepageAdminTool() {
  const [tab, setTab] = useState<Tab>("homepage");

  return (
    <div className="homepage-admin-page">
      <div className="homepage-admin-container">
        <h1>Admin</h1>
        <div className="homepage-admin-tabs">
          <button
            className={tab === "homepage" ? "active" : ""}
            onClick={() => setTab("homepage")}
          >
            Homepage
          </button>
          <button className={tab === "items" ? "active" : ""} onClick={() => setTab("items")}>
            Items
          </button>
          <button className={tab === "ops" ? "active" : ""} onClick={() => setTab("ops")}>
            Ops
          </button>
        </div>

        {tab === "homepage" && (
          <>
            <p className="homepage-admin-hint">
              Controls what appears on the live homepage. Changes take effect immediately.
            </p>
            <SlidesSection />
            <FeaturedSection />
          </>
        )}

        {tab === "items" && <ItemsSection />}

        {tab === "ops" && <OpsSection />}
      </div>
    </div>
  );
}

function ItemsSection() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ISearchResultItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState("");

  type VisibilityFilter = "all" | "visible" | "hidden";
  type StockFilter = "all" | "in-stock" | "out-of-stock";
  type SortOption = "name-asc" | "name-desc" | "price-asc" | "price-desc";
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("name-asc");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingItem, setLoadingItem] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [existingCategoryId, setExistingCategoryId] = useState<string | undefined>(undefined);
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [hidden, setHidden] = useState(false);
  const [stockTracked, setStockTracked] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>(undefined);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [removePhoto, setRemovePhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Blank query browses the full catalog page by page (like Square's own
  // item list); a typed query filters it. Runs once on mount so the tab
  // opens straight into a browsable list instead of an empty search box.
  function loadFirstPage(q: string) {
    setSearching(true);
    setError("");
    browseItems({ q: q || undefined })
      .then(({ items, cursor: nextCursor }) => {
        setResults(items);
        setCursor(nextCursor);
        setHasSearched(true);
      })
      .catch((err) => setError(err.message || "Failed to load items"))
      .finally(() => setSearching(false));
  }

  useEffect(() => {
    loadFirstPage("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    loadFirstPage(query.trim());
  }

  function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    setError("");
    browseItems({ q: query.trim() || undefined, cursor })
      .then(({ items, cursor: nextCursor }) => {
        setResults((current) => [...current, ...items]);
        setCursor(nextCursor);
      })
      .catch((err) => setError(err.message || "Failed to load more items"))
      .finally(() => setLoadingMore(false));
  }

  // Category options are derived from whatever's currently loaded, not a
  // fixed list - covers real Square categories beyond our canonical
  // PRODUCT_CATEGORIES set (e.g. legacy/typo categories from years of
  // manual entry).
  const categoryOptions = useMemo(() => {
    const names = new Set<string>();
    results.forEach((item) => item.categoryName && names.add(item.categoryName));
    return Array.from(names).sort();
  }, [results]);

  // Filter/sort run client-side over whatever's currently loaded - simplest
  // approach that still covers this catalog's actual size, and avoids
  // Square's search API not supporting price sort or combined
  // category+hidden filtering in one call.
  const visibleResults = useMemo(() => {
    let list = results;
    if (categoryFilter !== "all") {
      list = list.filter((item) => item.categoryName === categoryFilter);
    }
    if (visibilityFilter !== "all") {
      list = list.filter((item) =>
        visibilityFilter === "hidden" ? item.hidden : !item.hidden
      );
    }
    if (stockFilter !== "all") {
      list = list.filter((item) =>
        stockFilter === "out-of-stock" ? item.stockCount === 0 : item.stockCount !== 0
      );
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sortOption) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "price-asc":
          return a.priceCents - b.priceCents;
        case "price-desc":
          return b.priceCents - a.priceCents;
      }
    });
    return sorted;
  }, [results, categoryFilter, visibilityFilter, stockFilter, sortOption]);

  function selectItem(id: string) {
    setSelectedId(id);
    setSaved(false);
    setSaveError("");
    setPhotoFile(null);
    setPhotoUrl("");
    setRemovePhoto(false);
    setCurrentImageUrl(undefined);
    setLoadingItem(true);
    getItemForEdit(id)
      .then((item) => {
        setTitle(item.name);
        setDescription(item.description || "");
        setCurrentImageUrl(item.imageUrl);
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
    setRemovePhoto(false);
  }

  function handleRemovePhoto() {
    setPhotoFile(null);
    setPhotoUrl("");
    setRemovePhoto(true);
  }

  function undoRemovePhoto() {
    setRemovePhoto(false);
  }

  const priceValue = parseFloat(price);
  const priceIsValid = !isNaN(priceValue) && priceValue > 0;
  const quantityValue = parseInt(quantity, 10);
  const quantityIsValid = hidden || !stockTracked || (!isNaN(quantityValue) && quantityValue >= 0);
  const canSave = !!title && priceIsValid && quantityIsValid;

  function saveChanges() {
    if (!selectedId) return;
    setSaving(true);
    setSaveError("");
    updateItem(selectedId, {
      photo: photoFile || undefined,
      removePhoto,
      title,
      description,
      category,
      categoryId: existingCategoryId,
      price: priceValue,
      hidden,
      quantity: !hidden && quantityValue >= 0 ? quantityValue : undefined,
    })
      .then(() => {
        setSaved(true);
        if (removePhoto) setCurrentImageUrl(undefined);
        setRemovePhoto(false);
        setResults((current) =>
          current.map((r) =>
            r.id === selectedId
              ? {
                  ...r,
                  name: title,
                  priceCents: Math.round(priceValue * 100),
                  hidden,
                  imageUrl: removePhoto ? undefined : photoUrl || r.imageUrl,
                }
              : r
          )
        );
      })
      .catch((err) => setSaveError(err.message || "Could not save changes"))
      .finally(() => setSaving(false));
  }

  function backToSearch() {
    setSelectedId(null);
    setSaved(false);
    setSaveError("");
  }

  if (!selectedId) {
    return (
      <section className="homepage-admin-section">
        <h2>Manage Items</h2>
        <p className="homepage-admin-hint">
          Browse or search the catalog to edit any item, or hide it from the storefront
          without deleting it from Square. Hidden items stay purchasable in-person via the
          cashier tool. Filters and sorting apply to items already loaded below - use Load
          More first if you don't see everything you expect.
        </p>
        {error && <p className="homepage-admin-error">{error}</p>}

        <form className="homepage-admin-add-form" onSubmit={handleSearch}>
          <input
            className="homepage-admin-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items by name (leave blank to browse all)..."
            autoFocus
          />
          <button type="submit" className="homepage-admin-btn homepage-admin-btn-primary">
            {searching ? "Loading..." : "Search"}
          </button>
        </form>

        {results.length > 0 && (
          <div className="homepage-admin-filters">
            <select
              className="homepage-admin-input"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All categories</option>
              {categoryOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <select
              className="homepage-admin-input"
              value={visibilityFilter}
              onChange={(e) => setVisibilityFilter(e.target.value as typeof visibilityFilter)}
            >
              <option value="all">Visible + hidden</option>
              <option value="visible">Visible on site only</option>
              <option value="hidden">Hidden only</option>
            </select>
            <select
              className="homepage-admin-input"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)}
            >
              <option value="all">Any stock level</option>
              <option value="in-stock">In stock</option>
              <option value="out-of-stock">Out of stock</option>
            </select>
            <select
              className="homepage-admin-input"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as typeof sortOption)}
            >
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        )}

        {searching ? (
          <p>Loading items...</p>
        ) : (
          <>
            {hasSearched && results.length === 0 && <p>No items found.</p>}
            {results.length > 0 && visibleResults.length === 0 && (
              <p>No items match the current filters.</p>
            )}
            {visibleResults.length > 0 && (
              <div className="homepage-admin-table">
                {visibleResults.map((item) => (
                  <div
                    className="homepage-admin-row homepage-admin-row-clickable"
                    key={item.id}
                    onClick={() => selectItem(item.id)}
                  >
                    {item.imageUrl ? (
                      <img className="homepage-admin-thumb" src={item.imageUrl} alt="" />
                    ) : (
                      <div className="homepage-admin-thumb homepage-admin-thumb-empty" />
                    )}
                    <span className="homepage-admin-featured-name">{item.name}</span>
                    <span>${(item.priceCents / 100).toFixed(2)}</span>
                    <span>
                      {item.stockCount === 0
                        ? "Out of stock"
                        : item.stockCount != null
                        ? `${item.stockCount} in stock`
                        : "Untracked"}
                    </span>
                    <span>{item.hidden ? "Hidden from site" : "Visible on site"}</span>
                  </div>
                ))}
              </div>
            )}
            {cursor && (
              <button
                className="homepage-admin-btn homepage-admin-btn-ghost"
                onClick={loadMore}
                disabled={loadingMore}
                style={{ marginTop: "0.75rem" }}
              >
                {loadingMore ? "Loading..." : "Load More"}
              </button>
            )}
          </>
        )}
      </section>
    );
  }

  return (
    <section className="homepage-admin-section">
      <button className="homepage-admin-btn homepage-admin-btn-ghost" onClick={backToSearch}>
        ← Back to Search
      </button>

      {loadingItem ? (
        <p>Loading item...</p>
      ) : (
        <>
          {saveError && <p className="homepage-admin-error">{saveError}</p>}
          {saved && <p className="homepage-admin-hint">Saved.</p>}

          {photoUrl ? (
            <img className="homepage-admin-thumb-large" src={photoUrl} alt="New photo" />
          ) : !removePhoto && currentImageUrl ? (
            <img className="homepage-admin-thumb-large" src={currentImageUrl} alt="Current photo" />
          ) : (
            <p className="homepage-admin-hint">
              {removePhoto ? "Photo will be removed on save." : "No photo on this item."}
            </p>
          )}

          <div className="homepage-admin-actions">
            <button
              className="homepage-admin-btn homepage-admin-btn-ghost"
              onClick={() => fileInputRef.current?.click()}
            >
              {photoUrl || currentImageUrl ? "Replace Photo" : "Add Photo"}
            </button>
            {removePhoto ? (
              <button className="homepage-admin-btn homepage-admin-btn-ghost" onClick={undoRemovePhoto}>
                Undo Remove
              </button>
            ) : (
              (photoUrl || currentImageUrl) && (
                <button
                  className="homepage-admin-btn homepage-admin-btn-danger"
                  onClick={handleRemovePhoto}
                >
                  Remove Photo
                </button>
              )
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhoto}
            hidden
          />

          <label className="homepage-admin-field">
            <span>Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <label className="homepage-admin-field">
            <span>Description</span>
            <textarea
              className="homepage-admin-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </label>

          <label className="homepage-admin-field">
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

          <label className="homepage-admin-field">
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

          <label className="homepage-admin-checkbox">
            <input
              type="checkbox"
              checked={hidden}
              onChange={(e) => setHidden(e.target.checked)}
            />
            Hidden from website (Convention/POS only)
          </label>

          {!hidden && (
            <label className="homepage-admin-field">
              <span>Stock Count</span>
              <input
                type="number"
                inputMode="numeric"
                step="1"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={
                  stockTracked ? undefined : "Untracked - leave blank to keep it that way"
                }
              />
            </label>
          )}

          <div className="homepage-admin-actions">
            <button className="homepage-admin-btn homepage-admin-btn-ghost" onClick={backToSearch}>
              Cancel
            </button>
            <button
              className="homepage-admin-btn homepage-admin-btn-primary"
              disabled={!canSave || saving}
              onClick={saveChanges}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = -1;
  do {
    value /= 1024;
    unitIndex++;
  } while (value >= 1024 && unitIndex < units.length - 1);
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

function OpsSection() {
  const [stats, setStats] = useState<IDatabaseStats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDatabaseStats()
      .then(setStats)
      .catch((err) => setError(err.message || "Failed to load database stats"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <AiUsageSection />

      <section className="homepage-admin-section">
        <h2>Database</h2>
        <p className="homepage-admin-hint">
          NeonDB Postgres usage. Free-tier storage limits are enforced by Neon directly -
          check your Neon dashboard for your plan's exact cap.
        </p>
        {error && <p className="homepage-admin-error">{error}</p>}
        {loading ? (
          <p>Loading...</p>
        ) : stats ? (
          <>
            <div className="homepage-admin-ops-gauge">
              <span className="homepage-admin-ops-gauge-value">
                {formatBytes(stats.totalBytes)}
              </span>
              <span className="homepage-admin-ops-gauge-label">total database size</span>
            </div>
            <div className="homepage-admin-table">
              {stats.tables.map((table) => (
                <div className="homepage-admin-row" key={table.name}>
                  <span className="homepage-admin-featured-name">{table.name}</span>
                  <span>{table.rowEstimate.toLocaleString()} rows</span>
                  <span>{formatBytes(table.bytes)}</span>
                </div>
              ))}
            </div>
          </>
        ) : null}

        <p className="homepage-admin-hint" style={{ marginTop: "1.5rem" }}>
          Render (hosting) usage/cost isn't wired up yet - needs an API key from Render's
          dashboard first.
        </p>
      </section>
    </>
  );
}

const AI_TOOL_LABELS: Record<string, string> = {
  anthropic_cashier: "Anthropic (cashier photo identify)",
};

function AiUsageSection() {
  const [tools, setTools] = useState<IAiToolBudget[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingTool, setEditingTool] = useState<string | null>(null);
  const [editWarn, setEditWarn] = useState("");
  const [editStop, setEditStop] = useState("");

  function load() {
    setLoading(true);
    getAiUsage()
      .then(setTools)
      .catch((err) => setError(err.message || "Failed to load AI usage"))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function startEdit(tool: IAiToolBudget) {
    setEditingTool(tool.tool);
    setEditWarn(String(tool.warnThresholdUsd));
    setEditStop(String(tool.stopThresholdUsd));
  }

  function saveEdit(tool: string) {
    updateAiBudget(tool, Number(editWarn) || 0, Number(editStop) || 0)
      .then(() => {
        setEditingTool(null);
        load();
      })
      .catch((err) => setError(err.message || "Failed to update budget"));
  }

  return (
    <section className="homepage-admin-section">
      <h2>AI Tool Usage & Budgets</h2>
      <p className="homepage-admin-hint">
        Estimated spend this calendar month. When a tool hits its stop threshold, it's
        disabled until next month (or until you raise the budget here).
      </p>
      {error && <p className="homepage-admin-error">{error}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="homepage-admin-table">
          {tools.map((tool) => (
            <div className="homepage-admin-row homepage-admin-ai-row" key={tool.tool}>
              <span className="homepage-admin-featured-name">
                {AI_TOOL_LABELS[tool.tool] || tool.tool}
              </span>
              <span className={`homepage-admin-ai-status homepage-admin-ai-status-${tool.status}`}>
                ${tool.spendUsd.toFixed(2)} / ${tool.stopThresholdUsd.toFixed(2)}
                {tool.status === "warn" && " — nearing budget"}
                {tool.status === "blocked" && " — disabled, budget reached"}
              </span>
              {editingTool === tool.tool ? (
                <>
                  <label>
                    Warn at $
                    <input
                      className="homepage-admin-input homepage-admin-input-narrow"
                      type="number"
                      value={editWarn}
                      onChange={(e) => setEditWarn(e.target.value)}
                    />
                  </label>
                  <label>
                    Stop at $
                    <input
                      className="homepage-admin-input homepage-admin-input-narrow"
                      type="number"
                      value={editStop}
                      onChange={(e) => setEditStop(e.target.value)}
                    />
                  </label>
                  <button
                    className="homepage-admin-btn homepage-admin-btn-primary"
                    onClick={() => saveEdit(tool.tool)}
                  >
                    Save
                  </button>
                </>
              ) : (
                <button
                  className="homepage-admin-btn homepage-admin-btn-ghost"
                  onClick={() => startEdit(tool)}
                >
                  Edit budget
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SlidesSection() {
  const [slides, setSlides] = useState<IAdminSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [newHeadline, setNewHeadline] = useState("");
  const [newSubheading, setNewSubheading] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    getAdminSlides()
      .then(setSlides)
      .catch((err) => setError(err.message || "Failed to load slides"))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newHeadline.trim()) return;
    createSlide({
      headline: newHeadline.trim(),
      subheading: newSubheading.trim() || undefined,
      imageUrl: newImageUrl.trim() || undefined,
      sortOrder: slides.length,
    })
      .then(() => {
        setNewHeadline("");
        setNewSubheading("");
        setNewImageUrl("");
        load();
      })
      .catch((err) => setError(err.message || "Failed to add slide"));
  }

  function handleFieldChange(
    slide: IAdminSlide,
    field: "headline" | "subheading" | "image_url" | "sort_order",
    value: string
  ) {
    setSlides((current) =>
      current.map((s) =>
        s.id === slide.id
          ? { ...s, [field]: field === "sort_order" ? Number(value) || 0 : value }
          : s
      )
    );
  }

  function handleSave(slide: IAdminSlide) {
    updateSlide(slide.id, {
      headline: slide.headline,
      subheading: slide.subheading,
      imageUrl: slide.image_url,
      sortOrder: slide.sort_order,
    }).catch((err) => setError(err.message || "Failed to save slide"));
  }

  function handleToggleVisible(slide: IAdminSlide) {
    updateSlide(slide.id, { isVisible: !slide.is_visible })
      .then(load)
      .catch((err) => setError(err.message || "Failed to update slide"));
  }

  function handleDelete(slide: IAdminSlide) {
    deleteSlide(slide.id)
      .then(load)
      .catch((err) => setError(err.message || "Failed to delete slide"));
  }

  return (
    <section className="homepage-admin-section">
      <h2>Hero Slides</h2>
      {error && <p className="homepage-admin-error">{error}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="homepage-admin-table">
          {slides.map((slide) => (
            <div className="homepage-admin-row" key={slide.id}>
              <input
                className="homepage-admin-input"
                value={slide.headline}
                onChange={(e) => handleFieldChange(slide, "headline", e.target.value)}
                placeholder="Headline"
              />
              <input
                className="homepage-admin-input"
                value={slide.subheading || ""}
                onChange={(e) => handleFieldChange(slide, "subheading", e.target.value)}
                placeholder="Subheading"
              />
              <input
                className="homepage-admin-input"
                value={slide.image_url || ""}
                onChange={(e) => handleFieldChange(slide, "image_url", e.target.value)}
                placeholder="Image URL (optional)"
              />
              <input
                className="homepage-admin-input homepage-admin-input-narrow"
                type="number"
                value={slide.sort_order}
                onChange={(e) => handleFieldChange(slide, "sort_order", e.target.value)}
                title="Order"
              />
              <label className="homepage-admin-checkbox">
                <input
                  type="checkbox"
                  checked={slide.is_visible}
                  onChange={() => handleToggleVisible(slide)}
                />
                Visible
              </label>
              <button
                className="homepage-admin-btn homepage-admin-btn-ghost"
                onClick={() => handleSave(slide)}
              >
                Save
              </button>
              <button
                className="homepage-admin-btn homepage-admin-btn-danger"
                onClick={() => handleDelete(slide)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      <form className="homepage-admin-add-form" onSubmit={handleAdd}>
        <h3>Add a slide</h3>
        <input
          className="homepage-admin-input"
          value={newHeadline}
          onChange={(e) => setNewHeadline(e.target.value)}
          placeholder="Headline"
        />
        <input
          className="homepage-admin-input"
          value={newSubheading}
          onChange={(e) => setNewSubheading(e.target.value)}
          placeholder="Subheading (optional)"
        />
        <input
          className="homepage-admin-input"
          value={newImageUrl}
          onChange={(e) => setNewImageUrl(e.target.value)}
          placeholder="Image URL (optional - falls back to a product photo)"
        />
        <button type="submit" className="homepage-admin-btn homepage-admin-btn-primary">
          Add Slide
        </button>
      </form>
    </section>
  );
}

function FeaturedSection() {
  const [featured, setFeatured] = useState<IAdminFeaturedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<IMerchPreview[]>([]);
  const [searching, setSearching] = useState(false);

  function load() {
    setLoading(true);
    getAdminFeaturedProducts()
      .then(setFeatured)
      .catch((err) => setError(err.message || "Failed to load featured products"))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    getCatalog(searchQuery.trim(), undefined, 10)
      .then(({ items }) => setSearchResults(items))
      .catch((err) => setError(err.message || "Search failed"))
      .finally(() => setSearching(false));
  }

  function handleAddFeatured(item: IMerchPreview) {
    if (!item.id) return;
    addFeaturedProduct(item.id, featured.length)
      .then(load)
      .catch((err) => setError(err.message || "Failed to add featured product"));
  }

  function handleToggleVisible(item: IAdminFeaturedProduct) {
    updateFeaturedProduct(item.id, { isVisible: !item.is_visible })
      .then(load)
      .catch((err) => setError(err.message || "Failed to update featured product"));
  }

  function handleSortOrderChange(item: IAdminFeaturedProduct, value: string) {
    const sortOrder = Number(value) || 0;
    updateFeaturedProduct(item.id, { sortOrder })
      .then(load)
      .catch((err) => setError(err.message || "Failed to update order"));
  }

  function handleRemove(item: IAdminFeaturedProduct) {
    removeFeaturedProduct(item.id)
      .then(load)
      .catch((err) => setError(err.message || "Failed to remove"));
  }

  return (
    <section className="homepage-admin-section">
      <h2>Featured Products</h2>
      <p className="homepage-admin-hint">
        If empty, the homepage falls back to showing the general catalog.
      </p>
      {error && <p className="homepage-admin-error">{error}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="homepage-admin-table">
          {featured.map((item) => (
            <div className="homepage-admin-row" key={item.id}>
              <span className="homepage-admin-featured-name">{item.name}</span>
              <input
                className="homepage-admin-input homepage-admin-input-narrow"
                type="number"
                value={item.sort_order}
                onChange={(e) => handleSortOrderChange(item, e.target.value)}
                title="Order"
              />
              <label className="homepage-admin-checkbox">
                <input
                  type="checkbox"
                  checked={item.is_visible}
                  onChange={() => handleToggleVisible(item)}
                />
                Visible
              </label>
              <button
                className="homepage-admin-btn homepage-admin-btn-danger"
                onClick={() => handleRemove(item)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <form className="homepage-admin-add-form" onSubmit={handleSearch}>
        <h3>Add a product</h3>
        <input
          className="homepage-admin-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search products by name..."
        />
        <button type="submit" className="homepage-admin-btn homepage-admin-btn-primary">
          {searching ? "Searching..." : "Search"}
        </button>
      </form>

      {searchResults.length > 0 && (
        <div className="homepage-admin-table">
          {searchResults.map((item) => (
            <div className="homepage-admin-row" key={item.id}>
              <span className="homepage-admin-featured-name">{item.title}</span>
              <button
                className="homepage-admin-btn homepage-admin-btn-ghost"
                onClick={() => handleAddFeatured(item)}
              >
                Add to Featured
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
