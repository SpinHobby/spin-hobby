import React from "react";
import { Link } from "react-router-dom";
import "./about.scss";

export default function About() {
  return (
    <div className="about-page">
      <div className="about-header">
        <div className="about-header-content">
          <h1>About Spin Hobby</h1>
          <p>Bringing authentic anime merchandise to Canada and the US</p>
        </div>
      </div>

      <div className="about-content">
        <section className="about-section">
          <h2>Our Story</h2>
          <p>
            Spin Hobby started in 2022 out of a simple love for anime and the
            collectibles that come with it. We wanted a place where fans could
            find figures, badges, plushies, and more without the guesswork of
            importing from overseas — everything we carry is sourced directly
            and shipped from Canada.
          </p>
        </section>

        <section className="about-section">
          <h2>What We Stand For</h2>
          <div className="about-values">
            <div className="about-value">
              <span className="about-value-icon">✅</span>
              <h3>Authenticity</h3>
              <p>Every item we sell is 100% official, licensed merchandise.</p>
            </div>
            <div className="about-value">
              <span className="about-value-icon">📦</span>
              <h3>Fast Shipping</h3>
              <p>Orders ship within 2-3 business days from our Canadian warehouse.</p>
            </div>
            <div className="about-value">
              <span className="about-value-icon">💬</span>
              <h3>Real Community</h3>
              <p>Join our Discord for restock alerts, giveaways, and fellow fans.</p>
            </div>
          </div>
        </section>

        <section className="about-section about-cta">
          <h2>Have Questions?</h2>
          <p>We're happy to help before or after your order.</p>
          <Link to="/contact" className="btn-primary">
            Contact Us
          </Link>
        </section>
      </div>
    </div>
  );
}
