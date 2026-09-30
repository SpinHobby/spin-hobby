import { useState } from "react";
import "../tokens.scss";
import "./legal.scss";
import { useTheme } from "../hooks";
import { LAST_UPDATED, PRIVACY_SECTIONS, TERMS_SECTIONS, type LegalSection } from "./content";

const LOGO = "/logo/logo%20cropped.png";

function isPrivacyPath() {
  return window.location.pathname.startsWith("/legal/privacy") || window.location.pathname.startsWith("/privacy");
}

export default function Legal() {
  const { theme, toggle } = useTheme();
  const [privacy, setPrivacy] = useState(isPrivacyPath);
  const sections = privacy ? PRIVACY_SECTIONS : TERMS_SECTIONS;

  function go(path: string, next: boolean) {
    window.history.pushState({}, "", path);
    setPrivacy(next);
    window.scrollTo({ top: 0 });
  }

  return (
    <div className="sh lg">
      <header className="lg-header">
        <a href="/" className="lg-logo"><img src={LOGO} alt="Spin Hobby" /></a>
        <button type="button" className="sh-icon-btn" onClick={toggle} title="Toggle theme" aria-label="Toggle dark mode">
          {theme === "dark" ? "☀" : "☾"}
        </button>
      </header>

      <div className="lg-wrap">
        <a href="/" className="lg-back">← Back to the store</a>

        <div className="lg-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={!privacy} className={!privacy ? "is-active" : ""} onClick={() => go("/legal/terms", false)}>
            Terms of Service
          </button>
          <button type="button" role="tab" aria-selected={privacy} className={privacy ? "is-active" : ""} onClick={() => go("/legal/privacy", true)}>
            Privacy Policy
          </button>
        </div>

        <h1>{privacy ? "Privacy Policy" : "Terms of Service"}</h1>
        <p className="lg-updated">Last updated {LAST_UPDATED}</p>

        <div className="lg-content">
          {sections.map((section: LegalSection) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.body.map((paragraph, i) => (
                <p key={i}>
                  {paragraph.split("\n").map((line, j) => (
                    <span key={j}>
                      {j > 0 && <br />}
                      {line}
                    </span>
                  ))}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
