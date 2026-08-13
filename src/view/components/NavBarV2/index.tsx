import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiMenu } from "react-icons/fi";
import Search from "./Search";
import Commands from "./Commands";
import Navigation from "./Navigation";
import MobileMenu from "./MobileMenu";

export default function NavBar() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogoClick = () => {
    navigate("/");
  };

  return (
    <>
      <div className="header">
        <div className="navbar">
          <button
            className="navbar-hamburger"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <FiMenu size={22} />
          </button>
          <div className="navbar-title-container">
            <div className="navbar-title" onClick={handleLogoClick}>
              <img src="/assets/spin-hobby-logo.svg" alt="Spin Hobby Logo" />
            </div>
          </div>
          <div className="navbar-search">
            <Search />
          </div>
          <div className="navbar-commands">
            <Commands />
          </div>
        </div>
        <Navigation />
      </div>
      <MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </>
  );
}
