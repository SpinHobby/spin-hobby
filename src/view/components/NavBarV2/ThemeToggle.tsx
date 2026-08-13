import React from "react";
import { FiSun, FiMoon } from "react-icons/fi";
import { useDispatch } from "react-redux";
import { toggleTheme } from "../../../reducers";
import { useThemeSelector } from "../../../selectors";

export default function ThemeToggle() {
  const dispatch = useDispatch();
  const theme = useThemeSelector();
  const isDark = theme === "dark";

  return (
    <div
      className="navbar-command navbar-command-theme"
      onClick={() => dispatch(toggleTheme())}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className="navbar-command-icon-wrap">
        {isDark ? (
          <FiSun className="navbar-command-icon" size={"1.5em"} />
        ) : (
          <FiMoon className="navbar-command-icon" size={"1.5em"} />
        )}
      </span>
      <label>{isDark ? "Light" : "Dark"}</label>
    </div>
  );
}
