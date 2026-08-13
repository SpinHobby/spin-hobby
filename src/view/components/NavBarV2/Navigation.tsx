import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { IoChevronDown } from "react-icons/io5";
import { getDisplayCategories, IDisplayCategory } from "../../../api/square";

export default function Navigation() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<IDisplayCategory[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getDisplayCategories()
      .then((data) => setCategories(data))
      .catch((error) => console.error("Error fetching categories:", error))
      .finally(() => setIsLoading(false));
  }, []);

  const handleCategoryClick = (category: IDisplayCategory) => {
    const params = new URLSearchParams({
      categoryIds: category.categoryIds.join(","),
      categoryName: category.name,
    });
    navigate(`/search?${params.toString()}`);
    setIsDropdownOpen(false);
  };

  return (
    <div className="navigation">
      <div className="nav-container">
        {/* Categories Dropdown */}
        <div
          className="nav-item dropdown"
          onMouseEnter={() => setIsDropdownOpen(true)}
          onMouseLeave={() => setIsDropdownOpen(false)}
        >
          <button className="nav-link dropdown-trigger">
            <span>Categories</span>
            <IoChevronDown
              className={`chevron ${isDropdownOpen ? "open" : ""}`}
            />
          </button>

          {isDropdownOpen && (
            <div className="dropdown-menu categories-dropdown">
              {isLoading ? (
                <div className="dropdown-loading">Loading categories...</div>
              ) : categories.length > 0 ? (
                <div className="categories-grid">
                  {categories.map((category) => (
                    <button
                      key={category.name}
                      className="category-item"
                      onClick={() => handleCategoryClick(category)}
                    >
                      <div className="category-name">{category.name}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="dropdown-empty">No categories available</div>
              )}
            </div>
          )}
        </div>

        {/* Events Link */}
        <a href="/events" className="nav-item">
          <button className="nav-link">Events</button>
        </a>

        {/* Contact Link */}
        <a href="/contact" className="nav-item">
          <button className="nav-link">Contact</button>
        </a>

        {/* Support Link */}
        <a href="/support" className="nav-item">
          <button className="nav-link">Support</button>
        </a>
      </div>
    </div>
  );
}
