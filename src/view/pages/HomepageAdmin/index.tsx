import React, { useEffect, useState } from "react";
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

type Tab = "homepage" | "ops";

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

        {tab === "ops" && <OpsSection />}
      </div>
    </div>
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
