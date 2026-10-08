import { useEffect, useMemo, useRef, useState } from "react";
import { seriesKey, type SeriesOption } from "./seriesList";

const matches = (s: SeriesOption, text: string) => {
  const k = seriesKey(text);
  return !k || seriesKey(s.name).includes(k) || s.aliases.some((a) => seriesKey(a).includes(k)) || s.name.toLowerCase().includes(text.toLowerCase());
};

/**
 * Pick the anime / franchise from the list, or type a new one. A series is optional: "None" (or an empty box)
 * means the product has no series. A name that is not in the list yet is added to it when the product is saved.
 */
export function SeriesSelect({ value, onChange, list, label = "Series" }: {
  value: string; onChange: (name: string) => void; list: SeriesOption[]; label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => setText(value), [value]);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) { setOpen(false); setText(value); } };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open, value]);

  const shown = useMemo(() => list.filter((s) => matches(s, text)).slice(0, 8), [list, text]);
  const typed = text.trim();
  const exact = list.find((s) => seriesKey(s.name) === seriesKey(typed) || s.aliases.some((a) => seriesKey(a) === seriesKey(typed)));
  const pick = (name: string) => { onChange(name); setText(name); setOpen(false); };
  const isNew = value.trim() !== "" && !list.some((s) => seriesKey(s.name) === seriesKey(value) || s.aliases.some((a) => seriesKey(a) === seriesKey(value)));

  return (
    <div className="ad-field ad-series" ref={box}>
      <span className="ad-field__top">{label} <small>optional</small></span>
      <input className="sh-input" role="combobox" aria-expanded={open} aria-autocomplete="list" placeholder="e.g. Re:Zero (leave empty if none)" maxLength={120}
        value={text}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setText(e.target.value); setOpen(true); if (e.target.value.trim() === "") onChange(""); }}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setOpen(false); setText(value); }
          if (e.key === "Enter") { e.preventDefault(); if (exact) pick(exact.name); else if (typed) pick(typed); else pick(""); }
        }} />
      {isNew && !open && <span className="ad-series__new">New: it will be added to the series list when you save</span>}
      {open && (
        <ul className="ad-series__menu" role="listbox">
          <li><button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick("")}>None / not applicable</button></li>
          {shown.map((s) => (
            <li key={s.id}><button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(s.name)}>
              {s.name}<small>{s.productCount} product{s.productCount === 1 ? "" : "s"}</small>
            </button></li>
          ))}
          {typed && !exact && (
            <li><button type="button" className="ad-series__add" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(typed)}>＋ Add “{typed}” as a new series</button></li>
          )}
        </ul>
      )}
    </div>
  );
}
