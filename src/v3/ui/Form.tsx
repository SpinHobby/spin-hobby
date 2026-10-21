import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import "./ui.scss";

/**
 * A labelled form field: the label on top, an optional hint on the right of it, the control, and a red error under the label when the
 * value is wrong. Use TextField / SelectField / TextareaField for the common cases, or wrap any control in Field.
 */
export function Field({ label, hint, error, required, children }: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={`ui-field ${error ? "has-error" : ""}`}>
      <span className="ui-field__top">
        <span>{label}{required && <em aria-hidden> *</em>}</span>
        {error ? <em role="alert">{error}</em> : hint ? <small>{hint}</small> : null}
      </span>
      {children}
    </label>
  );
}

type Common = { label: string; hint?: ReactNode; error?: string | null };

export function TextField({ label, hint, error, ...input }: Common & InputHTMLAttributes<HTMLInputElement>) {
  return <Field label={label} hint={hint} error={error} required={input.required}><input className="sh-input" {...input} /></Field>;
}

export function SelectField({ label, hint, error, options, ...select }: Common & SelectHTMLAttributes<HTMLSelectElement> & {
  options: { value: string; label: string }[];
}) {
  return (
    <Field label={label} hint={hint} error={error} required={select.required}>
      <select className="sh-input" {...select}>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
    </Field>
  );
}

export function TextareaField({ label, hint, error, rows = 4, ...area }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <Field label={label} hint={hint} error={error} required={area.required}><textarea className="sh-input" rows={rows} {...area} /></Field>;
}

/** A checkbox with its label beside it ("Email me when it's back in stock"). */
export function CheckboxField({ label, ...input }: { label: ReactNode } & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return <label className="ui-check"><input type="checkbox" {...input} />{label}</label>;
}

/** Two fields side by side (first and last name, city and postal code); one column on a phone. */
export function FormRow({ children }: { children: ReactNode }) {
  return <div className="ui-grid2">{children}</div>;
}

/**
 * A form: fields stacked with even spacing, and its buttons at the bottom right. Submitting (Enter in a field, or a `type="submit"` button)
 * calls `onSubmit`; the page reload a browser would do is prevented.
 */
export function Form({ onSubmit, actions, children }: { onSubmit: () => void; actions?: ReactNode; children: ReactNode }) {
  return (
    <form className="ui-form" onSubmit={(e) => { e.preventDefault(); onSubmit(); }} noValidate>
      {children}
      {actions && <div className="ui-form-actions">{actions}</div>}
    </form>
  );
}

/** A small uppercase heading inside a card or drawer ("Shipping address"). */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="ui-label">{children}</div>;
}
