import { useEffect, useId, useRef, type InputHTMLAttributes, type ReactNode } from "react";
import { useSlidingIndicator } from "../hooks";
import "../styles/components.scss";

/**
 * A checkbox with its label beside it ("Email me when it's back in stock"). `description` adds a quieter line under the label;
 * `indeterminate` shows a dash (some, not all, of a list are ticked).
 */
export function CheckboxField({ label, description, indeterminate = false, ...input }: {
  label: ReactNode;
  description?: ReactNode;
  indeterminate?: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);
  return (
    <label className={`ui-check ${input.disabled ? "is-disabled" : ""}`}>
      <input ref={ref} type="checkbox" {...input} />
      <span className="ui-check__text"><span>{label}</span>{description && <small>{description}</small>}</span>
    </label>
  );
}

/**
 * An on/off switch for a setting that takes effect at once ("Show on the website", "Maintenance mode"). For a choice saved with a form's
 * Save button, a CheckboxField reads better. `label` beside it (on the left with `labelSide="left"`), `description` under it.
 */
export function Switch({ checked, onChange, label, description, disabled = false, labelSide = "right", size = "md" }: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** What the switch turns on. Without a visible label, pass a short one anyway: screen readers need it. */
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  labelSide?: "left" | "right";
  size?: "sm" | "md";
}) {
  const id = useId();
  const sw = (
    <button id={id} type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
      className={`sh-toggle ${checked ? "is-on" : ""} ${size === "sm" ? "ui-toggle--sm" : ""}`} />
  );
  const text = <span className="ui-check__text"><label htmlFor={id}>{label}</label>{description && <small>{description}</small>}</span>;
  return <div className={`ui-switch ${disabled ? "is-disabled" : ""}`}>{labelSide === "left" ? <>{text}{sw}</> : <>{sw}{text}</>}</div>;
}

export interface Option<V extends string = string> {
  value: V;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

/** One choice out of a few, all visible (shipping: Standard / Express). `direction="row"` puts them side by side. */
export function RadioGroup<V extends string>({ label, options, value, onChange, direction = "column", name }: {
  label: string;
  options: Option<V>[];
  value: V;
  onChange: (value: NoInfer<V>) => void;
  direction?: "column" | "row";
  name?: string;
}) {
  const auto = useId();
  return (
    <fieldset className={`ui-radios ui-radios--${direction}`}>
      <legend className="ui-field__legend">{label}</legend>
      {options.map((o) => (
        <label key={o.value} className={`ui-radio ${value === o.value ? "is-on" : ""} ${o.disabled ? "is-disabled" : ""}`}>
          <input type="radio" name={name ?? auto} value={o.value} checked={value === o.value} disabled={o.disabled} onChange={() => onChange(o.value)} />
          <span className="ui-check__text"><span>{o.label}</span>{o.description && <small>{o.description}</small>}</span>
        </label>
      ))}
    </fieldset>
  );
}

/**
 * A row of joined buttons, one chosen (In stock now | Pre-order, Day | Week | Month). Good for two to four short options that switch
 * what a form or view shows. `fullWidth` shares the width equally.
 */
export function SegmentedControl<V extends string>({ label, options, value, onChange, size = "md", fullWidth = false }: {
  label: string;
  options: Option<V>[];
  value: V;
  onChange: (value: NoInfer<V>) => void;
  size?: "sm" | "md";
  fullWidth?: boolean;
}) {
  const ind = useSlidingIndicator<HTMLDivElement>(value);
  return (
    <div ref={ind.ref} className={`ui-seg ${size === "sm" ? "ui-seg--sm" : ""} ${fullWidth ? "ui-seg--full" : ""}`} role="radiogroup" aria-label={label}>
      <span className={`ui-ind ui-seg__ind ${ind.ready ? "is-ready" : ""}`} style={ind.style} aria-hidden />
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} data-on={value === o.value} disabled={o.disabled}
          className={value === o.value ? "is-on" : ""} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}
