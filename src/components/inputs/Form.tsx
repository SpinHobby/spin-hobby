import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import "../styles/components.scss";

/**
 * A labelled form field: the label on top, an optional hint on its right, the control, and a red error in place of the hint when the
 * value is wrong. TextField / SelectField / TextareaField cover the usual cases; wrap any other control in Field. For a control made of
 * several buttons (NumberStepper, SegmentedControl) pass `group`, so a click on the label text doesn't press the first button.
 */
export function Field({
  label,
  hint,
  error,
  required,
  group = false,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  /** Shows a red * after the label. Checking the value is up to the page. */
  required?: boolean;
  group?: boolean;
  children: ReactNode;
}) {
  const Tag = group ? "div" : "label";
  return (
    <Tag className={`ui-field ${error ? "has-error" : ""}`} role={group ? "group" : undefined} aria-label={group ? label : undefined}>
      <span className="ui-field__top">
        <span>
          {label}
          {required && <em aria-hidden> *</em>}
        </span>
        {error ? <em role="alert">{error}</em> : hint ? <small>{hint}</small> : null}
      </span>
      {children}
    </Tag>
  );
}

type Common = {
  label: string;
  hint?: ReactNode;
  error?: string | null;
};

/**
 * A one-line text field. `prefix` / `suffix` sit inside the box ("$" … "CAD", "@"); `showCount` shows "12/80" as the hint when
 * `maxLength` is set (for titles with a limit, like eBay's 80 characters).
 */
export function TextField({
  label,
  hint,
  error,
  prefix,
  suffix,
  showCount = false,
  ...input
}: Common &
  InputHTMLAttributes<HTMLInputElement> & {
    prefix?: ReactNode;
    suffix?: ReactNode;
    showCount?: boolean;
  }) {
  const count = showCount && input.maxLength ? `${String(input.value ?? "").length}/${input.maxLength}` : null;
  const control = <input className="sh-input" {...input} />;
  return (
    <Field label={label} hint={count ?? hint} error={error} required={input.required}>
      {prefix || suffix ? (
        <span className={`ui-affix ${input.disabled ? "is-disabled" : ""}`}>
          {prefix && <span className="ui-affix__part">{prefix}</span>}
          {control}
          {suffix && <span className="ui-affix__part">{suffix}</span>}
        </span>
      ) : (
        control
      )}
    </Field>
  );
}

/** A drop-down choice. `placeholder` adds a first, empty option ("Choose a country") for when nothing is chosen yet. */
export function SelectField({
  label,
  hint,
  error,
  options,
  placeholder,
  ...select
}: Common &
  SelectHTMLAttributes<HTMLSelectElement> & {
    options: { value: string; label: string; disabled?: boolean }[];
    placeholder?: string;
  }) {
  return (
    <Field label={label} hint={hint} error={error} required={select.required}>
      <select className="sh-input" {...select}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

/** Several lines of text. `showCount` works as in TextField. */
export function TextareaField({
  label,
  hint,
  error,
  rows = 4,
  showCount = false,
  ...area
}: Common & TextareaHTMLAttributes<HTMLTextAreaElement> & { showCount?: boolean }) {
  const count = showCount && area.maxLength ? `${String(area.value ?? "").length}/${area.maxLength}` : null;
  return (
    <Field label={label} hint={count ?? hint} error={error} required={area.required}>
      <textarea className="sh-input" rows={rows} {...area} />
    </Field>
  );
}

/** Two fields side by side (first and last name, city and postal code); one column on a phone. `columns={3}` for three short ones. */
export function FormRow({ columns = 2, children }: { columns?: 2 | 3; children: ReactNode }) {
  return <div className={`ui-grid2 ${columns === 3 ? "ui-grid3" : ""}`}>{children}</div>;
}

/**
 * A form: fields stacked with even spacing, and its buttons at the bottom right. Submitting (Enter in a field, or a `type="submit"`
 * button) calls `onSubmit`; the page reload a browser would do is prevented. `actionsAlign="between"` puts a first button on the left
 * (Delete) and the rest on the right.
 */
export function Form({
  onSubmit,
  actions,
  actionsAlign = "end",
  children,
}: {
  onSubmit: () => void;
  actions?: ReactNode;
  actionsAlign?: "end" | "between";
  children: ReactNode;
}) {
  return (
    <form
      className="ui-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      noValidate
    >
      {children}
      {actions && <div className={`ui-form-actions ${actionsAlign === "between" ? "ui-form-actions--between" : ""}`}>{actions}</div>}
    </form>
  );
}

/** A small uppercase heading inside a card or drawer ("Shipping address"). */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="ui-label">{children}</div>;
}
