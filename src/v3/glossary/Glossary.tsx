import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./glossary.scss";
import { Banner, Skeleton } from "../../components";
import { useDocumentHead } from "../seo";
import { fetchGlossary, type GlossaryTerm } from "./glossaryApi";

/** /glossary: words collectors meet on product pages, read from the API. */
export default function Glossary() {
  const { pathname } = useLocation();
  // null while loading; an error message if the request failed.
  const [terms, setTerms] = useState<GlossaryTerm[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useDocumentHead({
    title: "Collector's Glossary | Spin Hobby",
    description: "What Nendoroid, scale figure, prize figure, blind box and other anime collecting words mean.",
    path: pathname,
  });

  const load = useCallback(() => {
    setError(null);
    setTerms(null);
    fetchGlossary()
      .then(setTerms)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "The glossary could not be loaded."));
  }, []);

  useEffect(load, [load]);

  return (
    <main className="gl-wrap">
      <Link to="/" className="gl-back">
        ← Back to the store
      </Link>
      <h1>Collector&apos;s glossary</h1>
      <p className="gl-lead">New to anime figures? Here is what the words on our product pages mean.</p>

      {error ? (
        <Banner tone="error" action={{ label: "Try again", onClick: load }}>
          {error}
        </Banner>
      ) : terms === null ? (
        <div className="gl-list" aria-busy>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={56} />
          ))}
        </div>
      ) : terms.length === 0 ? (
        <p className="gl-note">No terms yet. Check back soon.</p>
      ) : (
        <dl className="gl-list">
          {terms.map((t) => (
            <div key={t.id} className="gl-item">
              <dt>{t.term}</dt>
              <dd>{t.meaning}</dd>
            </div>
          ))}
        </dl>
      )}
    </main>
  );
}
