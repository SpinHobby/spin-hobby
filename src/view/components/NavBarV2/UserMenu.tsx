import React, { useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { FiUser, FiLogOut, FiPackage, FiSun, FiMoon } from "react-icons/fi";
import { useUserSelector, useThemeSelector } from "../../../selectors";
import { requestLogout, toggleTheme } from "../../../reducers";
import useOutsideClick from "../../../utils/useOutsideClick";

// Shared dropdown row for this menu - not important enough to be its own
// navbar icon, so it lives here instead, available whether signed in or
// not (it's a browser preference, not account data).
function ThemeMenuItem({ onSelect }: { onSelect: () => void }) {
  const dispatch = useDispatch();
  const theme = useThemeSelector();
  const isDark = theme === "dark";

  return (
    <button
      className="navbar-user-dropdown-item"
      onClick={() => {
        dispatch(toggleTheme());
        onSelect();
      }}
    >
      {isDark ? <FiSun size={16} /> : <FiMoon size={16} />}
      {isDark ? "Light Mode" : "Dark Mode"}
    </button>
  );
}

// Merchant ("square") sessions are a separate trust domain (homepage-admin /
// cashier login) and never show as a signed-in customer here.
export default function UserMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useUserSelector();
  const isCustomer = isAuthenticated && user?.authType !== "square";
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useOutsideClick(menuRef, () => setOpen(false));

  if (!isCustomer) {
    return (
      <div className="navbar-user-menu" ref={menuRef}>
        <div className="navbar-command" onClick={() => setOpen((o) => !o)}>
          <span className="navbar-command-icon-wrap">
            <FiUser className="navbar-command-icon" size={"1.5em"} />
          </span>
          <label>Account</label>
        </div>

        {open && (
          <div className="navbar-user-dropdown">
            <button
              className="navbar-user-dropdown-item"
              onClick={() => {
                setOpen(false);
                navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
              }}
            >
              <FiUser size={16} />
              Sign In
            </button>
            <ThemeMenuItem onSelect={() => setOpen(false)} />
          </div>
        )}
      </div>
    );
  }

  const displayName = user?.fname || user?.email?.split("@")[0] || "Account";
  const initial = (user?.fname || user?.email || "?").charAt(0).toUpperCase();

  function handleLogout() {
    setOpen(false);
    dispatch(requestLogout());
    navigate("/");
  }

  return (
    <div className="navbar-user-menu" ref={menuRef}>
      <div className="navbar-user-trigger" onClick={() => setOpen((o) => !o)}>
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={displayName}
            className="navbar-user-avatar"
          />
        ) : (
          <span className="navbar-user-avatar navbar-user-avatar-fallback">
            {initial}
          </span>
        )}
        <label className="navbar-user-name">{displayName}</label>
      </div>

      {open && (
        <div className="navbar-user-dropdown">
          <button
            className="navbar-user-dropdown-item"
            onClick={() => {
              setOpen(false);
              navigate("/account");
            }}
          >
            <FiUser size={16} />
            My Account
          </button>
          <button
            className="navbar-user-dropdown-item"
            onClick={() => {
              setOpen(false);
              navigate("/account?tab=history");
            }}
          >
            <FiPackage size={16} />
            Order History
          </button>
          <ThemeMenuItem onSelect={() => setOpen(false)} />
          <button
            className="navbar-user-dropdown-item navbar-user-dropdown-item-danger"
            onClick={handleLogout}
          >
            <FiLogOut size={16} />
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}
