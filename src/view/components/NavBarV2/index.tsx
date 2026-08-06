import React from "react";
import { useNavigate } from "react-router-dom";
import Search from "./Search";
import Commands from "./Commands";
import Navigation from "./Navigation";

export default function NavBar() {
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate("/");
  };

  return (
    <>
      <div className="header">
        <div className="navbar">
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
      <Search onNav={false} />
    </>
  );
}
