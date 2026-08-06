import React, { useState, useEffect } from "react";
import { Link, Routes, Route, useLocation } from "react-router-dom";
import axios from "axios";
import CategoryEdit from "./CategoryEdit";
import NavigationSettings from "./NavigationSettings";
import SquareIntegration from "./SquareIntegration";
import "./admin.scss";

interface AdminCategory {
  id: number;
  squareId: string;
  name: string;
  customName?: string;
  description: string;
  customDescription?: string;
  parentCategoryId?: string;
  isFeatured: boolean;
  featuredOrder?: number;
  isVisible: boolean;
  adminNotes?: string;
  productCount: number;
  subcategoryCount: number;
  createdAt: string;
  updatedAt: string;
}

interface AdminStats {
  total: number;
  featured: number;
  visible: number;
  hidden: number;
}

const API_BASE =
  process.env.NODE_ENV === "production"
    ? "https://spinhobby.herokuapp.com/api"
    : "http://localhost:8001/api";

function CategoryManagement() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/v1/admin/categories`);
      if (response.data.success) {
        setCategories(response.data.data);
        setStats(response.data.meta);
      } else {
        setError("Failed to fetch categories");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch categories");
    } finally {
      setLoading(false);
    }
  };

  const toggleFeatured = async (
    categoryId: string,
    currentFeatured: boolean
  ) => {
    try {
      await axios.put(
        `${API_BASE}/v1/admin/categories/${categoryId}/featured`,
        {
          isFeatured: !currentFeatured,
          featuredOrder: !currentFeatured ? Date.now() % 100 : null,
        }
      );
      fetchCategories();
    } catch (err: any) {
      alert(`Failed to update featured status: ${err.message}`);
    }
  };

  const toggleVisibility = async (
    categoryId: string,
    currentVisible: boolean
  ) => {
    try {
      await axios.put(
        `${API_BASE}/v1/admin/categories/${categoryId}/visibility`,
        {
          isVisible: !currentVisible,
        }
      );
      fetchCategories();
    } catch (err: any) {
      alert(`Failed to update visibility: ${err.message}`);
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedCategories.length === 0) {
      alert("Please select categories and an action");
      return;
    }

    try {
      await axios.post(`${API_BASE}/v1/admin/categories/bulk-actions`, {
        action: bulkAction,
        categoryIds: selectedCategories,
      });
      setSelectedCategories([]);
      setBulkAction("");
      fetchCategories();
    } catch (err: any) {
      alert(`Bulk action failed: ${err.message}`);
    }
  };

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const selectAll = () => {
    setSelectedCategories(categories.map((cat) => cat.squareId));
  };

  const clearSelection = () => {
    setSelectedCategories([]);
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading">Loading admin dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="error">Error: {error}</div>
        <button onClick={fetchCategories}>Retry</button>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>Anime Store Admin</h1>
        <nav className="admin-nav">
          <Link to="/" className="nav-link">
            ← Back to Store
          </Link>
          <Link to="/admin/categories" className="nav-link active">
            Categories
          </Link>
          <Link to="/admin/square" className="nav-link">
            Square Data
          </Link>
          <Link to="/admin/products" className="nav-link">
            Products
          </Link>
          <Link to="/admin/orders" className="nav-link">
            Orders
          </Link>
        </nav>
      </header>

      {stats && (
        <div className="admin-stats">
          <div className="stat-card">
            <h3>{stats.total}</h3>
            <p>Total Categories</p>
          </div>
          <div className="stat-card featured">
            <h3>{stats.featured}</h3>
            <p>Featured</p>
          </div>
          <div className="stat-card visible">
            <h3>{stats.visible}</h3>
            <p>Visible</p>
          </div>
          <div className="stat-card hidden">
            <h3>{stats.hidden}</h3>
            <p>Hidden</p>
          </div>
        </div>
      )}

      <div className="admin-content">
        {/* Navigation Settings Section */}
        <div className="admin-section">
          <NavigationSettings />
        </div>

        {/* Category Management Section */}
        <div className="admin-section">
          <div className="section-header">
            <h2>All Categories Management</h2>
            <button onClick={fetchCategories} className="btn-refresh">
              🔄 Refresh
            </button>
          </div>

          <div className="bulk-actions">
            <div className="selection-controls">
              <button onClick={selectAll} className="btn-secondary">
                Select All
              </button>
              <button onClick={clearSelection} className="btn-secondary">
                Clear ({selectedCategories.length})
              </button>
            </div>

            <div className="bulk-action-controls">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="bulk-select"
              >
                <option value="">Choose Bulk Action</option>
                <option value="feature">Make Featured</option>
                <option value="unfeature">Remove Featured</option>
                <option value="show">Show Categories</option>
                <option value="hide">Hide Categories</option>
              </select>
              <button
                onClick={handleBulkAction}
                disabled={!bulkAction || selectedCategories.length === 0}
                className="btn-primary"
              >
                Apply to {selectedCategories.length} items
              </button>
            </div>
          </div>

          <div className="categories-table">
            <table>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selectedCategories.length === categories.length}
                      onChange={() =>
                        selectedCategories.length === categories.length
                          ? clearSelection()
                          : selectAll()
                      }
                    />
                  </th>
                  <th>Category</th>
                  <th>Products</th>
                  <th>Status</th>
                  <th>Featured</th>
                  <th>Visibility</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr
                    key={category.squareId}
                    className={!category.isVisible ? "hidden-row" : ""}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.squareId)}
                        onChange={() => handleSelectCategory(category.squareId)}
                      />
                    </td>
                    <td>
                      <div className="category-info">
                        <strong>{category.customName || category.name}</strong>
                        {category.customName && (
                          <small>Original: {category.name}</small>
                        )}
                        {category.parentCategoryId && (
                          <span className="subcategory-badge">Subcategory</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="product-count">
                        {category.productCount} products
                      </span>
                      {category.subcategoryCount > 0 && (
                        <span className="subcategory-count">
                          {category.subcategoryCount} subcategories
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="status-badges">
                        {category.isFeatured && (
                          <span className="badge featured">⭐ Featured</span>
                        )}
                        {!category.isVisible && (
                          <span className="badge hidden">👁️ Hidden</span>
                        )}
                        {category.parentCategoryId && (
                          <span className="badge subcategory">🔗 Sub</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={() =>
                          toggleFeatured(category.squareId, category.isFeatured)
                        }
                        className={`btn-toggle ${
                          category.isFeatured ? "active" : ""
                        }`}
                      >
                        {category.isFeatured ? "⭐ Featured" : "☆ Feature"}
                      </button>
                    </td>
                    <td>
                      <button
                        onClick={() =>
                          toggleVisibility(
                            category.squareId,
                            category.isVisible
                          )
                        }
                        className={`btn-toggle ${
                          category.isVisible ? "active" : ""
                        }`}
                      >
                        {category.isVisible ? "👁️ Visible" : "🙈 Hidden"}
                      </button>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <Link
                          to={`/admin/categories/${category.squareId}`}
                          className="btn-small btn-primary"
                        >
                          Edit
                        </Link>
                        <Link
                          to={`/admin/categories/${category.squareId}/products`}
                          className="btn-small btn-secondary"
                        >
                          Products
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const location = useLocation();

  return (
    <Routes>
      <Route path="/" element={<CategoryManagement />} />
      <Route path="/categories" element={<CategoryManagement />} />
      <Route path="/categories/:categoryId" element={<CategoryEdit />} />
      <Route path="/square" element={<SquareIntegration />} />
      <Route
        path="/products"
        element={
          <div className="admin-dashboard">
            <div className="loading">Products management coming soon...</div>
          </div>
        }
      />
      <Route
        path="/orders"
        element={
          <div className="admin-dashboard">
            <div className="loading">Orders management coming soon...</div>
          </div>
        }
      />
      <Route path="*" element={<CategoryManagement />} />
    </Routes>
  );
}
