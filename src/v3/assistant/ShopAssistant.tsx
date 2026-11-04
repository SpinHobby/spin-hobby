import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api, API_URL } from "../../lib/api";
import { isOn } from "../../features";
import { productPath } from "../storefront/data";
import "./assistant.scss";

/**
 * The talking shop assistant: a chat button on the storefront. A visitor's question goes to the Spin Hobby server, which hands it to the
 * shop's own computer (Gleamshelf answers there with the shop's avatar, its voice and the catalogue); while that computer is off, the server
 * answers with text from the catalogue and says the talking assistant is away. It is always marked as an AI assistant.
 */

interface Status {
  enabled: boolean;
  online: boolean;
  name: string;
  voice: boolean;
  portrait: boolean;
}

interface Line {
  question: string;
  answer: string | null;
  products: { id: string; name: string; price: string; status: string }[];
  audio: string | null;
  by: "assistant" | "shop" | null;
  failed?: boolean;
}

const KEY = "spinhobby-assistant";
/** Netlify shows its "Powered by Netlify" badge in the bottom right corner of every *.netlify.app address (staging, previews, not
 *  spinhobby.com), above everything: the chat sits above it there. */
const ABOVE_BADGE = typeof window !== "undefined" && window.location.hostname.endsWith(".netlify.app");
const SOUND_KEY = "spinhobby-assistant-sound";

function loadLines(): Line[] {
  try {
    return (JSON.parse(sessionStorage.getItem(KEY) ?? "[]") as Line[]).filter((l) => l.answer).slice(-20);
  } catch {
    return [];
  }
}

export default function ShopAssistant() {
  const { pathname } = useLocation();
  const [status, setStatus] = useState<Status | null>(null);
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>(loadLines);
  const [typed, setTyped] = useState("");
  const [sound, setSound] = useState(() => localStorage.getItem(SOUND_KEY) !== "off");
  const [talking, setTalking] = useState(false);
  const player = useRef<HTMLAudioElement | null>(null);
  const list = useRef<HTMLOListElement>(null);
  const input = useRef<HTMLInputElement>(null);

  // whether it is on the site at all, and whether the talking assistant is answering now (checked again when the chat opens)
  useEffect(() => {
    if (!isOn("shopAssistant")) return;
    let gone = false;
    const read = () =>
      api<Status & { success: boolean }>("/assistant")
        .then((s) => !gone && setStatus(s))
        .catch(() => !gone && setStatus(null));
    void read();
    const timer = setInterval(() => void read(), open ? 30_000 : 120_000);
    return () => {
      gone = true;
      clearInterval(timer);
    };
  }, [open]);

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(lines.filter((l) => l.answer).slice(-20)));
    } catch {
      /* storage blocked: the chat lasts until the page closes */
    }
    list.current?.lastElementChild?.scrollIntoView({ block: "end" });
  }, [lines]);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => () => player.current?.pause(), []);

  if (!status?.enabled || pathname.startsWith("/checkout")) return null;

  const play = (url: string) => {
    player.current?.pause();
    const a = new Audio(`${API_URL}${url}`);
    player.current = a;
    a.onplay = () => setTalking(true);
    a.onended = a.onpause = a.onerror = () => setTalking(false);
    void a.play().catch(() => setTalking(false));
  };

  const ask = async () => {
    const question = typed.trim();
    if (!question) return;
    setTyped("");
    const history = lines
      .filter((l) => l.answer)
      .slice(-4)
      .map((l) => ({ question: l.question, answer: l.answer! }));
    const at = lines.length;
    setLines((ls) => [...ls, { question, answer: null, products: [], audio: null, by: null }]);
    try {
      const r = await api<Omit<Line, "question"> & { success: boolean }>("/assistant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history }),
      });
      setLines((ls) => ls.map((l, i) => (i === at ? { question, answer: r.answer, products: r.products, audio: r.audio, by: r.by } : l)));
      if (r.audio && sound) play(r.audio);
      if (r.by === "shop" && status.online) setStatus({ ...status, online: false });
    } catch (e) {
      const message = e instanceof Error ? e.message : "That did not go through.";
      setLines((ls) => ls.map((l, i) => (i === at ? { ...l, answer: message, failed: true } : l)));
    }
  };

  const portrait = status.portrait ? `${API_URL}/assistant/portrait` : null;

  return (
    // "sh" brings the shop's colours and dark mode (tokens.scss); the widget is outside the storefront's own .sh
    <div className={`sh sa${open ? " is-open" : ""}${ABOVE_BADGE ? " is-above-badge" : ""}`}>
      {open && (
        <section className="sa-panel" role="dialog" aria-label={`Chat with ${status.name}, the shop's AI assistant`}>
          <header className="sa-head">
            <span className={`sa-face${talking ? " is-talking" : ""}`} aria-hidden="true">
              {portrait ? <img src={portrait} alt="" /> : <span>{status.name.slice(0, 1)}</span>}
            </span>
            <span className="sa-who">
              <b>{status.name}</b>
              <span className="sa-ai">AI assistant</span>
              <small>{status.online ? "Answering now, with its voice" : "Text answers: the talking assistant is away"}</small>
            </span>
            {status.online && status.voice && (
              <button
                type="button"
                className="sa-sound"
                aria-pressed={sound}
                onClick={() => {
                  const next = !sound;
                  setSound(next);
                  if (!next) player.current?.pause();
                  try {
                    localStorage.setItem(SOUND_KEY, next ? "on" : "off");
                  } catch {
                    /* kept for this visit */
                  }
                }}
              >
                {sound ? "Voice on" : "Voice off"}
              </button>
            )}
            <button type="button" className="sa-close" aria-label="Close the chat" onClick={() => setOpen(false)}>
              ×
            </button>
          </header>
          <ol className="sa-lines" ref={list} aria-live="polite">
            {lines.length === 0 && (
              <li className="sa-hello">
                Hi! I'm {status.name}, the shop's AI assistant. Ask me about products, prices or what's new. For orders and anything
                personal, the staff will help.
              </li>
            )}
            {lines.map((l, i) => (
              <li key={i}>
                <p className="sa-q">{l.question}</p>
                {l.answer === null ? (
                  <p className="sa-a is-waiting">Thinking…</p>
                ) : (
                  <div className={`sa-a${l.failed ? " is-failed" : ""}`}>
                    <p>{l.answer}</p>
                    {l.products.length > 0 && (
                      <ul className="sa-products">
                        {l.products.slice(0, 4).map((p) => (
                          <li key={p.id}>
                            <Link to={productPath(p)} onClick={() => setOpen(false)}>
                              {p.name}
                            </Link>{" "}
                            <span>{p.price}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {l.audio && (
                      <button type="button" className="sa-replay" onClick={() => play(l.audio!)}>
                        Play again
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ol>
          <form
            className="sa-ask"
            onSubmit={(e) => {
              e.preventDefault();
              void ask();
            }}
          >
            <input
              ref={input}
              value={typed}
              maxLength={300}
              placeholder={`Ask ${status.name} something`}
              aria-label={`Ask ${status.name} something`}
              onChange={(e) => setTyped(e.target.value)}
            />
            <button type="submit" disabled={!typed.trim() || lines.some((l) => l.answer === null)}>
              Ask
            </button>
          </form>
          <p className="sa-note">
            Answers are written by AI and can be wrong. Prices and stock are on each product's page. Chats are not saved:{" "}
            <Link to="/legal/privacy" onClick={() => setOpen(false)}>
              privacy
            </Link>
            .
          </p>
        </section>
      )}
      <button
        type="button"
        className={`sa-button${talking ? " is-talking" : ""}`}
        aria-expanded={open}
        aria-label={open ? "Close the chat" : `Ask ${status.name}, the shop's AI assistant`}
        onClick={() => setOpen(!open)}
      >
        {portrait ? <img src={portrait} alt="" /> : <span>{status.name.slice(0, 1)}</span>}
        {status.online && <i className="sa-dot" aria-hidden="true" />}
      </button>
    </div>
  );
}
