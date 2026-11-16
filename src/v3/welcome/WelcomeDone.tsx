import { useEffect, useRef } from "react";

const MASCOT = "/assets/transparent%20mascot%20chibi%20rotated.png";
/** How long the welcome stays before the shop takes over by itself. */
const STAY_MS = 4500;

// Confetti: each piece flies out at its own angle and distance, then falls. Fixed, not random, so every visit looks the same.
const PIECES = Array.from({ length: 28 }, (_, i) => ({
  angle: (360 / 28) * i + (i % 3) * 7,
  distance: 110 + ((i * 37) % 90),
  spin: ((i * 53) % 360) - 180,
  delay: (i % 5) * 40,
  colour: i % 4,
  round: i % 3 === 0,
}));

/** The end of signing up: the mascot pops in, confetti, and the customer's name. Calm (no movement) for reduced-motion settings. */
export function WelcomeDone({ firstName, onDone }: { firstName: string; onDone: () => void }) {
  const button = useRef<HTMLButtonElement>(null);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    button.current?.focus();
    const t = window.setTimeout(() => done.current(), STAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="sh-welcome-done">
      <div className="sh-welcome-done__burst" aria-hidden="true">
        {PIECES.map((p, i) => (
          <span
            key={i}
            className={`sh-welcome-done__piece c${p.colour} ${p.round ? "is-round" : ""}`}
            style={
              {
                "--angle": `${p.angle}deg`,
                "--distance": `${p.distance}px`,
                "--spin": `${p.spin}deg`,
                "--delay": `${p.delay}ms`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <img className="sh-welcome-done__mascot" src={MASCOT} alt="" />
      <h2 id="welcome-title" className="sh-display sh-welcome-done__title">
        {firstName ? `Welcome to Spin Hobby, ${firstName}!` : "Welcome to Spin Hobby!"}
      </h2>
      <p className="sh-welcome-done__text">Your account is ready. Happy hunting!</p>
      <button ref={button} type="button" className="sh-btn sh-welcome-done__go" onClick={onDone}>
        Start shopping
      </button>
      <span className="sh-welcome-done__timer" aria-hidden="true" style={{ animationDuration: `${STAY_MS}ms` }} />
    </div>
  );
}
