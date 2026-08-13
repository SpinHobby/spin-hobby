import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { FiX, FiSun, FiMoon, FiUser, FiLogOut, FiPackage } from "react-icons/fi";
import { FaInstagram, FaDiscord } from "react-icons/fa";
import { getDisplayCategories, IDisplayCategory } from "../../../api/square";
import { useUserSelector, useThemeSelector } from "../../../selectors";
import { requestLogout, toggleTheme } from "../../../reducers";

interface Props {
  open: boolean;
  onClose: () => void;
}

// Mobile-only nav drawer. Consolidates what's normally spread across three
// stacked rows on mobile (icon bar, categories/links row, search bar) into
// a single hamburger-triggered panel, matching the compact top bar in
// navbar.scss (hamburger + logo + cart + user, everything else in here).
export default function MobileMenu({ open, onClose }: Props) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useUserSelector();
  const isCustomer = isAuthenticated && user?.authType !== "square";
  const theme = useThemeSelector();
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState<IDisplayCategory[]>([]);

  useEffect(() => {
    if (open && categories.length === 0) {
      getDisplayCategories()
        .then(setCategories)
        .catch((error) => console.error("Error fetching categories:", error));
    }
  }, [open, categories.length]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function go(path: string) {
    onClose();
    navigate(path);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = search.trim();
    if (!trimmed) return;
    go(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function handleCategoryClick(category: IDisplayCategory) {
    const params = new URLSearchParams({
      categoryIds: category.categoryIds.join(","),
      categoryName: category.name,
    });
    go(`/search?${params.toString()}`);
  }

  function handleLogout() {
    onClose();
    dispatch(requestLogout());
    navigate("/");
  }

  if (!open) return null;

  return (
    <div className="mobile-menu-overlay" onClick={onClose}>
      <div className="mobile-menu-panel" onClick={(e) => e.stopPropagation()}>
        <div className="mobile-menu-header">
          <span>Menu</span>
          <button className="mobile-menu-close" onClick={onClose} aria-label="Close menu">
            <FiX size={22} />
          </button>
        </div>

        <form className="mobile-menu-search" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit">Go</button>
        </form>

        {isCustomer ? (
          <div className="mobile-menu-account">
            <button className="mobile-menu-link" onClick={() => go("/account")}>
              <FiUser size={18} /> My Account
            </button>
            <button className="mobile-menu-link" onClick={() => go("/account?tab=history")}>
              <FiPackage size={18} /> Order History
            </button>
            <button className="mobile-menu-link" onClick={handleLogout}>
              <FiLogOut size={18} /> Log Out
            </button>
          </div>
        ) : (
          <div className="mobile-menu-account">
            <button
              className="mobile-menu-link mobile-menu-signin"
              onClick={() => go("/login")}
            >
              <FiUser size={18} /> Sign In
            </button>
          </div>
        )}

        <div className="mobile-menu-section">
          <div className="mobile-menu-section-title">Categories</div>
          <div className="mobile-menu-categories">
            {categories.map((category) => (
              <button
                key={category.name}
                className="mobile-menu-category"
                onClick={() => handleCategoryClick(category)}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mobile-menu-section">
          <button className="mobile-menu-link" onClick={() => go("/events")}>
            Events
          </button>
          <button className="mobile-menu-link" onClick={() => go("/contact")}>
            Contact
          </button>
          <button className="mobile-menu-link" onClick={() => go("/support")}>
            Support
          </button>
        </div>

        <div className="mobile-menu-footer">
          <button
            className="mobile-menu-icon-btn"
            onClick={() =>
              window.open("https://discord.gg/8RM9qPznR", "_blank", "noopener,noreferrer")
            }
            aria-label="Discord"
          >
            <FaDiscord size={20} />
          </button>
          <button
            className="mobile-menu-icon-btn"
            onClick={() =>
              window.open("https://www.instagram.com/spinhobby", "_blank", "noopener,noreferrer")
            }
            aria-label="Instagram"
          >
            <FaInstagram size={20} />
          </button>
          <button
            className="mobile-menu-icon-btn"
            onClick={() => dispatch(toggleTheme())}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <FiSun size={20} /> : <FiMoon size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}
