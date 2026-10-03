import { useEffect } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import "./legal.scss";
import { useDocumentHead } from "../seo";
import { LAST_UPDATED, PRIVACY_SECTIONS, TERMS_SECTIONS, type LegalSection } from "./content";

export default function Legal() {
  return (
    <div className="lg-wrap">
      <a href="/" className="lg-back">← Back to the store</a>

      <Routes>
        <Route path="terms" element={<LegalTab privacy={false} />} />
        <Route path="privacy" element={<LegalTab privacy={true} />} />
        <Route path="*" element={<Navigate to="/legal/terms" replace />} />
      </Routes>
    </div>
  );
}

function LegalTab({ privacy }: { privacy: boolean }) {
  const location = useLocation();
  const sections = privacy ? PRIVACY_SECTIONS : TERMS_SECTIONS;
  const title = privacy ? "Privacy Policy" : "Terms of Service";

  useDocumentHead({
    title: `${title} | Spin Hobby`,
    description: `Spin Hobby's ${title.toLowerCase()}, last updated ${LAST_UPDATED}.`,
    path: location.pathname,
  });

  useEffect(() => { window.scrollTo({ top: 0 }); }, [privacy]);

  return (
    <>
      <div className="lg-tabs" role="tablist">
        <Link to="/legal/terms" role="tab" aria-selected={!privacy} className={!privacy ? "is-active" : ""}>
          Terms of Service
        </Link>
        <Link to="/legal/privacy" role="tab" aria-selected={privacy} className={privacy ? "is-active" : ""}>
          Privacy Policy
        </Link>
      </div>

      <h1>{title}</h1>
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
    </>
  );
}
