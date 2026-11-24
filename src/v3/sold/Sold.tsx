import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import "../events/events.scss";
import "./sold.scss";
import { api } from "../../lib/api";
import { productPhoto } from "../photo";
import { useDocumentHead } from "../seo";
import { productPath } from "../storefront/data";
import type { Product } from "../types";

/**
 * Pieces that have sold out, grouped by kind. Most stock is one of a kind, so a sold piece never comes back: this page is
 * where a visitor (or a convention's exhibitor team) sees the whole range the shop carries, not only what is left today.
 * Figures come last on purpose: the other kinds are what people do not expect from us.
 * Each group is one search of the public product list (`status=out,closed`); a group with too few photos is left out.
 */
const GROUPS: { id: string; title: string; query: string }[] = [
  { id: "hololive", title: "Hololive and VTubers", query: "q=hololive" },
  { id: "plushies", title: "Plushies", query: "group=plushies" },
  { id: "keychains", title: "Keychains", query: "q=keychain" },
  { id: "acrylic-stands", title: "Acrylic stands", query: "q=acrylic%20stand" },
  { id: "tapestries", title: "Tapestries", query: "q=tapestry" },
  { id: "uma-musume", title: "Uma Musume", query: "q=umamusume" },
  { id: "kuji", title: "Ichiban Kuji prizes", query: "q=kuji" },
  { id: "figures", title: "Figures", query: "group=figures" },
];
const FIRST = 12; // pieces shown per group before "Show more"
const FEWEST = 3; // a group with fewer photos than this is not worth a heading

function Group({ g }: { g: (typeof GROUPS)[number] }) {
  const [all, setAll] = useState(false);
  const { data } = useQuery({
    queryKey: ["products", "sold", g.id],
    queryFn: () => api<{ items: Product[] }>(`/products?status=out,closed&limit=60&${g.query}`),
    staleTime: 5 * 60_000,
  });
  // a piece without a photo proves nothing, so it is left out
  const items = (data?.items ?? []).filter((p) => p.images.length > 0);
  if (data && items.length < FEWEST) return null;
  const shown = all ? items : items.slice(0, FIRST);
  return (
    <section aria-labelledby={`sold-${g.id}`}>
      <h2 id={`sold-${g.id}`} className="ev-h2">
        {g.title}
      </h2>
      {!data ? (
        <ul className="sold-grid" aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="sold-item sold-item--wait" />
          ))}
        </ul>
      ) : (
        <ul className="sold-grid">
          {shown.map((p) => (
            <li key={p.id} className="sold-item">
              <Link to={productPath(p)} className="sold-photo">
                <img {...productPhoto(p, p.images[0], 320)} alt={p.name} loading="lazy" />
                <span className="sold-tag">Sold</span>
              </Link>
              {p.series && <span className="sold-series">{p.series}</span>}
              <span className="sold-name">{p.name}</span>
            </li>
          ))}
        </ul>
      )}
      {!all && items.length > FIRST && (
        <button type="button" className="sold-more" onClick={() => setAll(true)}>
          Show {items.length - FIRST} more
        </button>
      )}
    </section>
  );
}

export default function Sold() {
  const { pathname } = useLocation();

  useDocumentHead({
    title: "Sold pieces | Spin Hobby",
    description:
      "Pieces that found a home: Hololive goods, plushies, keychains, acrylic stands, tapestries and figures sold at our convention tables and online.",
    path: pathname,
  });

  return (
    <main className="ev-wrap sold-wrap">
      <a href="/" className="ev-back">
        ← Back to the store
      </a>
      <h1>Sold pieces</h1>
      <p className="ev-lead">
        Most of what we bring from Japan is one of a kind. These pieces have found a home, at our convention tables and online. New finds
        arrive for every event: see <Link to="/events">where we will be next</Link> or <a href="/new-arrivals">what just came in</a>.
      </p>
      {GROUPS.map((g) => (
        <Group key={g.id} g={g} />
      ))}
    </main>
  );
}
