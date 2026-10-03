import { useState, type InputHTMLAttributes } from "react";

const EYE = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const EYE_OFF = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17.94 17.94A10.9 10.9 0 0 1 12 19C5 19 1 12 1 12a19.8 19.8 0 0 1 5.06-5.94M9.9 4.24A10.7 10.7 0 0 1 12 4c7 0 11 8 11 8a19.9 19.9 0 0 1-3.17 4.19M14.12 14.12a3 3 0 1 1-4.24-4.24" /><path d="M1 1l22 22" />
  </svg>
);

/** A password field with a show/hide toggle. Takes the usual input props (except type). */
export default function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className">) {
  const [shown, setShown] = useState(false);
  return (
    <div className="sh-pw">
      <input {...props} className="sh-input" type={shown ? "text" : "password"} />
      <button
        type="button"
        className="sh-pw__toggle"
        onClick={() => setShown((s) => !s)}
        onMouseDown={(e) => e.preventDefault()} // keep the cursor in the field when clicking the eye
        aria-pressed={shown}
        aria-label={shown ? "Hide password" : "Show password"}
        title={shown ? "Hide password" : "Show password"}
      >
        {shown ? EYE_OFF : EYE}
      </button>
    </div>
  );
}
