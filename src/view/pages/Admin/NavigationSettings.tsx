import React, { useState, useEffect } from "react";
import axios from "axios";

interface NavCategory {
  id: string;
  name: string;
  customName?: string;
  productCount: number;
  featured: boolean;
  isVisible: boolean;
  featuredOrder?: number;
  subcategories?: NavCategory[];
}

const API_BASE =
  process.env.NODE_ENV === "production"
    ? "https://spin-hobby-server.onrender.com/api"
    : "http://localhost:8001/api";

export default function NavigationSettings() {
  const [navCategories, setNavCategories] = useState<NavCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    fetchNavigationCategories();
  }, []);

  const fetchNavigationCategories = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_BASE}/v1/categories?featured=true&parent_only=true`
      );
      if (response.data.success) {
        setNavCategories(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching navigation categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategoryInNav = async (
    categoryId: string,
    currentlyFeatured: boolean
  ) => {
    try {
      await axios.put(
        `${API_BASE}/v1/admin/categories/${categoryId}/featured`,
        {
          isFeatured: !currentlyFeatured,
        }
      );
      await fetchNavigationCategories();
    } catch (error) {
      console.error("Error toggling category in navigation:", error);
    }
  };

  const updateFeaturedOrder = async (categoryId: string, newOrder: number) => {
    try {
      await axios.put(
        `${API_BASE}/v1/admin/categories/${categoryId}/customize`,
        {
          featuredOrder: newOrder,
        }
      );
      await fetchNavigationCategories();
    } catch (error) {
      console.error("Error updating featured order:", error);
    }
  };

  const moveCategoryUp = async (index: number) => {
    if (index === 0) return;

    const items = Array.from(navCategories);
    const temp = items[index];
    items[index] = items[index - 1];
    items[index - 1] = temp;

    setNavCategories(items);
    await updateCategoryOrder(items);
  };

  const moveCategoryDown = async (index: number) => {
    if (index === navCategories.length - 1) return;

    const items = Array.from(navCategories);
    const temp = items[index];
    items[index] = items[index + 1];
    items[index + 1] = temp;

    setNavCategories(items);
    await updateCategoryOrder(items);
  };

  const updateCategoryOrder = async (items: NavCategory[]) => {
    try {
      const orderedCategoryIds = items.map((category) => category.id);
      await axios.put(`${API_BASE}/v1/admin/categories/navigation/reorder`, {
        orderedCategoryIds,
      });
    } catch (error) {
      console.error("Error reordering categories:", error);
      // Revert the change on error
      await fetchNavigationCategories();
    }
  };

  if (loading) {
    return <div className="loading">Loading navigation settings...</div>;
  }

  return (
    <div className="navigation-settings">
      <div className="section-header">
        <h2>🧭 Navigation Dropdown Settings</h2>
        <div className="header-actions">
          <button
            onClick={() => setPreviewOpen(!previewOpen)}
            className="btn-preview"
          >
            {previewOpen ? "Hide Preview" : "Show Preview"}
          </button>
          <button onClick={fetchNavigationCategories} className="btn-refresh">
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="navigation-content">
        <div className="navigation-manager">
          <div className="manager-header">
            <h3>Categories in Navigation</h3>
            <p>
              Use ⬆️⬇️ buttons to reorder. Only featured categories appear in
              the navigation dropdown.
            </p>
          </div>

          <div className="nav-categories-list">
            {navCategories.map((category, index) => (
              <div key={category.id} className="nav-category-item">
                <div className="reorder-controls">
                  <button
                    onClick={() => moveCategoryUp(index)}
                    disabled={index === 0}
                    className="btn-reorder"
                    title="Move up"
                  >
                    ⬆️
                  </button>
                  <button
                    onClick={() => moveCategoryDown(index)}
                    disabled={index === navCategories.length - 1}
                    className="btn-reorder"
                    title="Move down"
                  >
                    ⬇️
                  </button>
                </div>
                <div className="category-info">
                  <div className="category-name">
                    {category.customName || category.name}
                  </div>
                  {category.subcategories &&
                    category.subcategories.length > 0 && (
                      <div className="category-details">
                        {category.subcategories.length} subcategories
                      </div>
                    )}
                </div>
                <div className="category-actions">
                  <span className="featured-badge">⭐ Featured</span>
                  <button
                    onClick={() =>
                      toggleCategoryInNav(category.id, category.featured)
                    }
                    className="btn-remove"
                    title="Remove from navigation"
                  >
                    ❌
                  </button>
                </div>
              </div>
            ))}
          </div>

          {navCategories.length === 0 && (
            <div className="empty-state">
              <p>No categories in navigation dropdown.</p>
              <p>
                Go to the Categories table below and click "⭐ Feature" to add
                categories to the navigation.
              </p>
            </div>
          )}
        </div>

        {previewOpen && (
          <div className="navigation-preview">
            <h3>🖼️ Navigation Preview</h3>
            <div className="preview-dropdown">
              <div className="preview-header">Categories</div>
              <div className="preview-items">
                {navCategories.map((category) => (
                  <div key={category.id} className="preview-item">
                    <div className="preview-name">
                      {category.customName || category.name}
                    </div>
                    {category.subcategories &&
                      category.subcategories.length > 0 && (
                        <div className="preview-subcategories">
                          {category.subcategories.map((sub) => (
                            <div key={sub.id} className="preview-subcategory">
                              {sub.name}
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="navigation-help">
        <h4>💡 Quick Guide</h4>
        <ul>
          <li>
            <strong>Featured categories</strong> appear in the navigation
            dropdown
          </li>
          <li>
            <strong>Use ⬆️⬇️ buttons</strong> to reorder categories in the
            dropdown
          </li>
          <li>
            <strong>Click ❌</strong> to remove a category from navigation
          </li>
          <li>
            <strong>Use the preview</strong> to see how it will look to
            customers
          </li>
          <li>
            <strong>Parent categories only</strong> - subcategories appear as
            nested items
          </li>
          <li>
            <strong>Toggle featured status</strong> in the table below to
            add/remove categories
          </li>
        </ul>
      </div>
    </div>
  );
}
