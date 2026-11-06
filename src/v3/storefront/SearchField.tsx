import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { price, type Currency } from "../format";
import { isCutout, photo } from "../photo";
import type { Product } from "../types";
import { clearRecentSearches, recentSearches, useSearchSuggest } from "./searchSuggestData";

type Option =
  | { kind: "recent"; text: string }
  | { kind: "product"; product: Product }
  | { kind: "series"; name: string; count: number }
  | { kind: "category"; id: string; name: string }
  | { kind: "all"; text: string };

/**
 * The header's search box. While typing it offers the first matching products, series and categories; empty and focused it
 * offers this device's recent searches. Arrow keys move through the list, Enter opens the highlighted one (or searches),
 * Escape closes it. The list is an ARIA combobox, so screen readers announce it.
 */
export function SearchField({
  id,
  value,
  placeholder,
  currency,
  onChange,
  onSearch,
  onProduct,
  onSeries,
  onCategory,
}: {
  id: string;
  value: string;
  placeholder: string;
  currency: Currency;
  onChange: (value: string) => void;
  onSearch: (text: string) => void;
  onProduct: (p: Product) => void;
  onSeries: (name: string) => void;
  onCategory: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const listId = useId();
  const box = useRef<HTMLDivElement>(null);
  const { data, loading } = useSearchSuggest(value, open);
  const q = value.trim();

  const options = useMemo<Option[]>(() => {
    if (!q) return recent.map((text) => ({ kind: "recent", text }));
    if (q.length < 2) return [];
    return [
      ...data.series.map((s) => ({ kind: "series" as const, name: s.name, count: s.count })),
      ...data.categories.map((c) => ({ kind: "category" as const, id: c.id, name: c.name })),
      ...data.products.map((product) => ({ kind: "product" as const, product })),
      { kind: "all" as const, text: q },
    ];
  }, [q, recent, data]);

  useEffect(() => setActive(-1), [options]);
  // a click anywhere else closes the list
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  const choose = (o: Option) => {
    setOpen(false);
    if (o.kind === "product") onProduct(o.product);
    else if (o.kind === "series") onSeries(o.name);
    else if (o.kind === "category") onCategory(o.id);
    else {
      onChange(o.text);
      onSearch(o.text);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      if (!options.length) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      // -1 is the box itself: going past either end returns to what was typed
      setActive((i) => ((i + 1 + step + options.length + 1) % (options.length + 1)) - 1);
      return;
    }
    if (e.key === "Enter") {
      // the highlighted suggestion, else the form's own submit (a search for what's typed)
      if (open && active >= 0 && options[active]) {
        e.preventDefault();
        choose(options[active]);
      } else setOpen(false);
    }
  };

  const show = open && options.length > 0;
  const optionId = (i: number) => `${listId}-${i}`;
  const lead = (kind: Option["kind"], i: number) => options.findIndex((o) => o.kind === kind) === i;

  return (
    <div className="sf-suggest" ref={box}>
      <input
        id={id}
        type="search"
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={show && active >= 0 ? optionId(active) : undefined}
        autoComplete="off"
        enterKeyHint="search"
        placeholder={placeholder}
        value={value}
        onFocus={() => {
          setRecent(recentSearches());
          setOpen(true);
        }}
        onChange={(e) => {
          onChange(e.target.value);
          if (!e.target.value) setRecent(recentSearches()); // emptied after a search: offer it back
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
      {show && (
        <ul className="sf-suggest__list" id={listId} role="listbox" aria-label="Search suggestions" aria-busy={loading}>
          {options.map((o, i) => (
            <li
              key={i}
              id={optionId(i)}
              role="option"
              aria-selected={i === active}
              className={`sf-suggest__item sf-suggest__item--${o.kind} ${i === active ? "is-active" : ""}`}
              onPointerDown={(e) => e.preventDefault() /* keep focus in the box */}
              onPointerEnter={() => setActive(i)}
              onClick={() => choose(o)}
            >
              {o.kind !== "all" && lead(o.kind, i) && (
                <span className="sf-suggest__group" aria-hidden>
                  {o.kind === "recent"
                    ? "Recent searches"
                    : o.kind === "series"
                      ? "Series"
                      : o.kind === "category"
                        ? "Categories"
                        : "Products"}
                </span>
              )}
              {o.kind === "recent" && <span className="sf-suggest__text">{o.text}</span>}
              {o.kind === "series" && (
                <span className="sf-suggest__text">
                  {o.name} <small>{o.count} items</small>
                </span>
              )}
              {o.kind === "category" && <span className="sf-suggest__text">{o.name}</span>}
              {o.kind === "product" && (
                <span className="sf-suggest__product">
                  {o.product.images[0] ? (
                    <img
                      {...photo(o.product.images[0], 96, isCutout(o.product, o.product.images[0]))}
                      alt=""
                      width={40}
                      height={40}
                      loading="lazy"
                    />
                  ) : (
                    <span className="sf-suggest__noimg" aria-hidden />
                  )}
                  <span className="sf-suggest__text">{o.product.name}</span>
                  <b>{price(o.product.priceCents, currency)}</b>
                </span>
              )}
              {o.kind === "all" && <span className="sf-suggest__text">See all results for “{o.text}”</span>}
            </li>
          ))}
          {!q && (
            <li className="sf-suggest__foot" role="presentation">
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => {
                  clearRecentSearches();
                  setRecent([]);
                }}
              >
                Clear recent searches
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
