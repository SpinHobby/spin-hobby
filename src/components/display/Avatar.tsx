import "../styles/components.scss";

/** A round picture of a person, or their initials when there is no picture. `size` in pixels. */
export function Avatar({ name, src, size = 32 }: { name: string; src?: string | null; size?: number }) {
  const initials =
    name
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "?";
  return (
    <span className="ui-avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }} title={name} aria-label={name}>
      {src ? <img src={src} alt="" /> : initials}
    </span>
  );
}
