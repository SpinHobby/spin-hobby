import "../styles/components.scss";

/**
 * A number with − and + buttons (stock count, quantity). Typing works too; the value always stays between `min` and `max` and moves by
 * `step`. `unit` is a word shown after it ("in stock"). `label` is what screen readers say; put a visible label around it with Field.
 */
export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 99999,
  step = 1,
  label,
  unit,
  disabled = false,
  size = "md",
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  unit?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));
  return (
    <span className="ui-stepper-row">
      <span className={`ui-stepper ${size === "sm" ? "ui-stepper--sm" : ""}`} aria-disabled={disabled}>
        <button
          type="button"
          onClick={() => onChange(clamp(value - step))}
          disabled={disabled || value <= min}
          aria-label={`Less (${label})`}
        >
          −
        </button>
        <input
          inputMode="numeric"
          value={String(value)}
          disabled={disabled}
          aria-label={label}
          onChange={(e) => onChange(clamp(Number(e.target.value.replace(/[^\d-]/g, "")) || 0))}
        />
        <button
          type="button"
          onClick={() => onChange(clamp(value + step))}
          disabled={disabled || value >= max}
          aria-label={`More (${label})`}
        >
          +
        </button>
      </span>
      {unit && <span className="ui-muted ui-sm">{unit}</span>}
    </span>
  );
}
