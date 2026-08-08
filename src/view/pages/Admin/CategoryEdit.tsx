import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";

interface Category {
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
}

const API_BASE =
  process.env.NODE_ENV === "production"
    ? "https://spinhobby.herokuapp.com/api"
    : "http://localhost:8001/api";

export default function CategoryEdit() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    customName: "",
    customDescription: "",
    adminNotes: "",
    isFeatured: false,
    featuredOrder: "",
    isVisible: true,
  });

  useEffect(() => {
    if (categoryId) {
      fetchCategory();
    }
  }, [categoryId]);

  const fetchCategory = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/v1/admin/categories`);
      if (response.data.success) {
        const found = response.data.data.find(
          (cat: Category) => cat.squareId === categoryId
        );
        if (found) {
          setCategory(found);
          setFormData({
            customName: found.customName || "",
            customDescription: found.customDescription || "",
            adminNotes: found.adminNotes || "",
            isFeatured: found.isFeatured,
            featuredOrder: found.featuredOrder?.toString() || "",
            isVisible: found.isVisible,
          });
        } else {
          setError("Category not found");
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) return;

    setSaving(true);
    try {
      // Update custom fields
      await axios.put(
        `${API_BASE}/v1/admin/categories/${category.squareId}/customize`,
        {
          customName: formData.customName || null,
          customDescription: formData.customDescription || null,
          adminNotes: formData.adminNotes || null,
        }
      );

      // Update featured status
      await axios.put(
        `${API_BASE}/v1/admin/categories/${category.squareId}/featured`,
        {
          isFeatured: formData.isFeatured,
          featuredOrder: formData.featuredOrder
            ? parseInt(formData.featuredOrder)
            : null,
        }
      );

      // Update visibility
      await axios.put(
        `${API_BASE}/v1/admin/categories/${category.squareId}/visibility`,
        {
          isVisible: formData.isVisible,
        }
      );

      alert("Category updated successfully!");
      navigate("/admin");
    } catch (err: any) {
      alert(`Failed to update category: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading">Loading category...</div>
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="admin-dashboard">
        <div className="error">Error: {error || "Category not found"}</div>
        <Link to="/admin" className="btn-primary">
          ← Back to Admin
        </Link>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>Edit Category</h1>
        <nav className="admin-nav">
          <Link to="/admin" className="nav-link">
            ← Back to Categories
          </Link>
          <Link to="/" className="nav-link">
            Store
          </Link>
        </nav>
      </header>

      <div className="admin-content">
        <div className="admin-section">
          <div className="section-header">
            <h2>
              {category.customName || category.name}
              <small
                style={{
                  marginLeft: "1rem",
                  color: "#666",
                  fontWeight: "normal",
                }}
              >
                (ID: {category.squareId})
              </small>
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="category-edit-form">
            <div className="form-grid">
              <div className="form-section">
                <h3>Basic Information</h3>

                <div className="form-group">
                  <label>Original Name (from Square)</label>
                  <input type="text" value={category.name} disabled />
                </div>

                <div className="form-group">
                  <label>Custom Display Name</label>
                  <input
                    type="text"
                    name="customName"
                    value={formData.customName}
                    onChange={handleInputChange}
                    placeholder="Leave empty to use original name"
                  />
                </div>

                <div className="form-group">
                  <label>Original Description</label>
                  <textarea value={category.description} disabled rows={3} />
                </div>

                <div className="form-group">
                  <label>Custom Description</label>
                  <textarea
                    name="customDescription"
                    value={formData.customDescription}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="Leave empty to use original description"
                  />
                </div>

                <div className="form-group">
                  <label>Admin Notes</label>
                  <textarea
                    name="adminNotes"
                    value={formData.adminNotes}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Internal notes for administrators"
                  />
                </div>
              </div>

              <div className="form-section">
                <h3>Visibility & Features</h3>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="isVisible"
                      checked={formData.isVisible}
                      onChange={handleInputChange}
                    />
                    Category is visible to customers
                  </label>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="isFeatured"
                      checked={formData.isFeatured}
                      onChange={handleInputChange}
                    />
                    Feature this category
                  </label>
                </div>

                {formData.isFeatured && (
                  <div className="form-group">
                    <label>Featured Order (lower numbers appear first)</label>
                    <input
                      type="number"
                      name="featuredOrder"
                      value={formData.featuredOrder}
                      onChange={handleInputChange}
                      min="1"
                      max="100"
                    />
                  </div>
                )}

                <div className="category-stats">
                  <h4>Category Stats</h4>
                  <p>
                    <strong>Products:</strong> {category.productCount}
                  </p>
                  <p>
                    <strong>Type:</strong>{" "}
                    {category.parentCategoryId
                      ? "Subcategory"
                      : "Main Category"}
                  </p>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <Link to="/admin" className="btn-secondary">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        .category-edit-form {
          padding: 2rem;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .form-section {
          h3 {
            margin: 0 0 1rem 0;
            color: #2c3e50;
            border-bottom: 2px solid #e9ecef;
            padding-bottom: 0.5rem;
          }
        }

        .form-group {
          margin-bottom: 1.5rem;

          label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
            color: #495057;
          }

          input,
          textarea {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #ced4da;
            border-radius: 4px;
            font-size: 1rem;

            &:disabled {
              background: #f8f9fa;
              color: #6c757d;
            }
          }

          .checkbox-label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            cursor: pointer;

            input[type="checkbox"] {
              width: auto;
            }
          }
        }

        .category-stats {
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 4px;
          margin-top: 1rem;

          h4 {
            margin: 0 0 0.5rem 0;
            color: #2c3e50;
          }

          p {
            margin: 0.25rem 0;
            color: #495057;
          }
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e9ecef;

          .btn-primary,
          .btn-secondary {
            padding: 0.75rem 1.5rem;
            border-radius: 4px;
            text-decoration: none;
            font-weight: 500;
            cursor: pointer;
            border: none;
            transition: all 0.2s;

            &:disabled {
              opacity: 0.6;
              cursor: not-allowed;
            }
          }

          .btn-primary {
            background: #007bff;
            color: white;

            &:hover:not(:disabled) {
              background: #0056b3;
            }
          }

          .btn-secondary {
            background: #6c757d;
            color: white;

            &:hover {
              background: #5a6268;
            }
          }
        }

        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
