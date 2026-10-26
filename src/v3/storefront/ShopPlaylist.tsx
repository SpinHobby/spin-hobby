import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { Collapse } from "../../components/layout/Collapse";

/**
 * The storefront's "Shop playlist" (the owner picks a YouTube playlist in Admin > Settings; without one, nothing shows).
 *
 * - ShopPlaylistNav, in the section tabs: "Shop playlist" opens the player and starts the music; then a play/pause button and
 *   "Close player" take its place.
 * - ShopPlaylistPlayer, a card floating over the page: the video, previous / play-pause / next, and the whole playlist. It can be
 *   minimized to the video alone and dragged anywhere (it remembers where).
 *
 * YouTube's embed rules shape it: the video stays visible while it plays and never smaller than 200 × 200 (so "minimized" is a
 * 200 × 200 video, not a hidden one), nothing is drawn over the video, and our buttons drive YouTube's own player through its API.
 * Music only starts from a shopper's click. Uses YouTube's privacy-enhanced host.
 */

// ---------------------------------------------------------------- shared state (the nav and the card are in different places)

interface Track {
  title: string;
  author: string;
}
interface MusicState {
  open: boolean;
  minimized: boolean;
  listOpen: boolean;
  playing: boolean;
  /** The video ids of the playlist, in order (from YouTube's player once it loads). */
  ids: string[];
  index: number;
  tracks: Record<string, Track>;
  /** The card's top-left corner on screen; null until it has been placed. */
  pos: { x: number; y: number } | null;
}
const POS_KEY = "spinhobby-music-pos";
const readPos = () => {
  try {
    const p = JSON.parse(localStorage.getItem(POS_KEY) ?? "null");
    return p && Number.isFinite(p.x) && Number.isFinite(p.y) ? (p as { x: number; y: number }) : null;
  } catch {
    return null;
  }
};
let state: MusicState = { open: false, minimized: false, listOpen: false, playing: false, ids: [], index: 0, tracks: {}, pos: readPos() };
const listeners = new Set<() => void>();
function set(patch: Partial<MusicState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const useMusic = () => useSyncExternalStore(subscribe, () => state);

// ---------------------------------------------------------------- YouTube's player API

/* eslint-disable @typescript-eslint/no-explicit-any -- YouTube's API script has no types here */
type YTPlayer = any;
let player: YTPlayer | null = null;
let api: Promise<any> | null = null;
function loadApi() {
  const w = window as any;
  if (w.YT?.Player) return Promise.resolve(w.YT);
  api ??= new Promise((resolve) => {
    const before = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      before?.();
      resolve(w.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.head.appendChild(script);
  });
  return api;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
const PLAYING = 1;
const BUFFERING = 3;

const controls = {
  open: () => set({ open: true, minimized: false }),
  close: () => {
    player?.destroy?.();
    player = null;
    set({ open: false, playing: false, listOpen: false });
  },
  toggle: () => {
    if (!player) return;
    if (state.playing) player.pauseVideo();
    else player.playVideo();
  },
  next: () => player?.nextVideo?.(),
  previous: () => player?.previousVideo?.(),
  playAt: (i: number) => player?.playVideoAt?.(i),
};

/** Titles come from YouTube's public oEmbed (no key), a few at a time, and are kept for the visit. */
const TITLES_KEY = "spinhobby-music-titles";
let titleCache: Record<string, Track> = (() => {
  try {
    return JSON.parse(sessionStorage.getItem(TITLES_KEY) ?? "{}");
  } catch {
    return {};
  }
})();
const asked = new Set<string>();
async function loadTitles(ids: string[]) {
  const todo = ids.filter((id) => !titleCache[id] && !asked.has(id));
  todo.forEach((id) => asked.add(id));
  if (Object.keys(titleCache).length) set({ tracks: { ...titleCache } });
  for (let i = 0; i < todo.length; i += 6) {
    const batch = todo.slice(i, i + 6);
    const found = await Promise.all(
      batch.map((id) =>
        fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((o) => (o ? ([id, { title: String(o.title), author: String(o.author_name ?? "") }] as const) : null))
          .catch(() => null),
      ),
    );
    for (const f of found) if (f) titleCache[f[0]] = f[1];
    try {
      sessionStorage.setItem(TITLES_KEY, JSON.stringify(titleCache));
    } catch {
      /* storage full or blocked: titles just load again next time */
    }
    titleCache = { ...titleCache };
    set({ tracks: titleCache });
  }
}

// ---------------------------------------------------------------- the nav buttons

function PlayPauseIcon({ playing }: { playing: boolean }) {
  return (
    <span className={`sf-pp ${playing ? "is-playing" : ""}`} aria-hidden>
      <svg viewBox="0 0 24 24" className="sf-pp__play">
        <path d="M8 5.5v13l11-6.5z" />
      </svg>
      <svg viewBox="0 0 24 24" className="sf-pp__pause">
        <rect x="6.5" y="5" width="4" height="14" rx="1.2" />
        <rect x="13.5" y="5" width="4" height="14" rx="1.2" />
      </svg>
    </span>
  );
}

function Equalizer({ on }: { on: boolean }) {
  return (
    <span className={`sf-eq ${on ? "is-on" : ""}`} aria-hidden>
      <i />
      <i />
      <i />
    </span>
  );
}

/** In the section tabs: "Shop playlist" opens and plays; once open, play/pause and "Close player". */
export function ShopPlaylistNav() {
  const m = useMusic();
  if (!m.open)
    return (
      <button type="button" className="sf-music-btn" onClick={controls.open}>
        <span aria-hidden>🎧</span> Shop playlist
      </button>
    );
  return (
    <span className="sf-music-nav">
      <button
        type="button"
        className={`sf-music-btn sf-music-btn--pp ${m.playing ? "is-on" : ""}`}
        onClick={controls.toggle}
        aria-label={m.playing ? "Pause the shop playlist" : "Play the shop playlist"}
      >
        <PlayPauseIcon playing={m.playing} />
        <Equalizer on={m.playing} />
      </button>
      <button type="button" className="sf-music-btn" onClick={controls.close}>
        Close player
      </button>
    </span>
  );
}

// ---------------------------------------------------------------- the floating player

const MARGIN = 12;
/** Keeps the card on screen. */
function clamp(p: { x: number; y: number }, el: HTMLElement | null) {
  const w = el?.offsetWidth ?? 340;
  const h = el?.offsetHeight ?? 300;
  return {
    x: Math.min(Math.max(MARGIN, p.x), Math.max(MARGIN, window.innerWidth - w - MARGIN)),
    y: Math.min(Math.max(MARGIN, p.y), Math.max(MARGIN, window.innerHeight - h - MARGIN)),
  };
}

export function ShopPlaylistPlayer({ playlistId }: { playlistId: string }) {
  const m = useMusic();
  return m.open ? createPortal(<PlayerCard playlistId={playlistId} />, document.body) : null;
}

function PlayerCard({ playlistId }: { playlistId: string }) {
  const m = useMusic();
  const card = useRef<HTMLElement>(null);
  const mount = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // YouTube's player, made once per opening and kept while minimized (the same video just gets smaller)
  useEffect(() => {
    let gone = false;
    const host = document.createElement("div");
    mount.current?.appendChild(host);
    loadApi()
      .then((YT) => {
        if (gone) return;
        player = new YT.Player(host, {
          host: "https://www.youtube-nocookie.com",
          width: "100%",
          height: "100%",
          playerVars: { listType: "playlist", list: playlistId, autoplay: 1, rel: 0, playsinline: 1 },
          events: {
            onReady: (e: { target: YTPlayer }) => e.target.playVideo(), // the shopper's click asked for music
            onStateChange: (e: { target: YTPlayer; data: number }) => {
              const ids: string[] = e.target.getPlaylist?.() ?? [];
              set({
                playing: e.data === PLAYING || e.data === BUFFERING,
                index: e.target.getPlaylistIndex?.() ?? 0,
                ...(ids.length && ids.length !== state.ids.length ? { ids } : {}),
              });
            },
            onError: () => setError("This track can't play here. Skipping…"),
          },
        });
      })
      .catch(() => setError("YouTube couldn't be reached."));
    return () => {
      gone = true;
      player?.destroy?.();
      player = null;
    };
  }, [playlistId]);

  // the playing track's title straight away; the rest when the list opens
  const currentId = m.ids[m.index];
  useEffect(() => {
    if (currentId) void loadTitles([currentId]);
  }, [currentId]);
  useEffect(() => {
    if (m.listOpen && m.ids.length) void loadTitles(m.ids);
  }, [m.listOpen, m.ids]);
  useEffect(() => {
    if (!error) return;
    const t = window.setTimeout(() => {
      setError(null);
      controls.next();
    }, 1500);
    return () => window.clearTimeout(t);
  }, [error]);

  // first opening: bottom-right; afterwards wherever it was left, kept on screen when the window or card changes size
  useLayoutEffect(() => {
    const place = () => {
      const el = card.current;
      const start = state.pos ?? { x: window.innerWidth, y: window.innerHeight };
      set({ pos: clamp(start, el) });
    };
    place();
    const ro = new ResizeObserver(place);
    if (card.current) ro.observe(card.current);
    window.addEventListener("resize", place);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", place);
    };
  }, []);
  const save = useCallback(() => {
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(state.pos));
    } catch {
      /* not remembered: fine */
    }
  }, []);

  // drag by the handle (mouse, pen or finger); the video ignores the pointer meanwhile so it can't swallow the drag
  const grab = useRef<{ dx: number; dy: number } | null>(null);
  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest("button") || !state.pos) return;
    grab.current = { dx: e.clientX - state.pos.x, dy: e.clientY - state.pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (!grab.current) return;
    set({ pos: clamp({ x: e.clientX - grab.current.dx, y: e.clientY - grab.current.dy }, card.current) });
  };
  const onPointerUp = () => {
    if (!grab.current) return;
    grab.current = null;
    setDragging(false);
    save();
  };
  // and by keyboard: arrows move it (Shift for bigger steps)
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const step = e.shiftKey ? 96 : 24;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d || !state.pos) return;
    e.preventDefault();
    set({ pos: clamp({ x: state.pos.x + d[0], y: state.pos.y + d[1] }, card.current) });
    save();
  };

  const now = currentId ? m.tracks[currentId] : undefined;
  return (
    <aside
      ref={card}
      className={`sf-player ${m.minimized ? "is-mini" : ""} ${dragging ? "is-dragging" : ""} ${m.playing ? "is-playing" : ""}`}
      style={m.pos ? { transform: `translate(${m.pos.x}px, ${m.pos.y}px)` } : { visibility: "hidden" }}
      aria-label="Shop playlist"
    >
      <div
        className="sf-player__head"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <span
          className="sf-player__grip"
          role="button"
          tabIndex={0}
          aria-label="Move the player (drag, or use the arrow keys)"
          onKeyDown={onKeyDown}
        >
          ⠿
        </span>
        {!m.minimized && (
          <span className="sf-player__title">
            <Equalizer on={m.playing} />
            <b>Shop playlist</b>
          </span>
        )}
        <span className="sf-player__head-btns">
          <button
            type="button"
            className="sf-player__icon"
            onClick={() => set({ minimized: !m.minimized, listOpen: false })}
            aria-label={m.minimized ? "Expand the player" : "Minimize the player"}
          >
            {m.minimized ? "⤢" : "–"}
          </button>
          <button type="button" className="sf-player__icon" onClick={controls.close} aria-label="Close the player (stops the music)">
            ×
          </button>
        </span>
      </div>

      <div className="sf-player__video" ref={mount} />

      {!m.minimized && (
        <div className="sf-player__now" title={now?.title}>
          {error ?? (now ? now.title : m.ids.length ? "Loading…" : "Starting the playlist…")}
          {now?.author && !error && <span>{now.author}</span>}
        </div>
      )}

      <div className="sf-player__controls">
        {!m.minimized && (
          <button type="button" className="sf-player__icon" onClick={controls.previous} aria-label="Previous track">
            ⏮
          </button>
        )}
        <button
          type="button"
          className={`sf-player__pp ${m.playing ? "is-on" : ""}`}
          onClick={controls.toggle}
          aria-label={m.playing ? "Pause" : "Play"}
        >
          <PlayPauseIcon playing={m.playing} />
        </button>
        {!m.minimized && (
          <>
            <button type="button" className="sf-player__icon" onClick={controls.next} aria-label="Next track">
              ⏭
            </button>
            <button
              type="button"
              className={`sf-player__list-btn ${m.listOpen ? "is-on" : ""}`}
              aria-expanded={m.listOpen}
              onClick={() => set({ listOpen: !m.listOpen })}
            >
              Playlist{m.ids.length ? ` · ${m.ids.length}` : ""}
            </button>
          </>
        )}
      </div>

      {!m.minimized && (
        <Collapse open={m.listOpen}>
          <ol className="sf-player__list">
            {m.ids.map((id, i) => {
              const t = m.tracks[id];
              return (
                <li key={`${id}-${i}`}>
                  <button
                    type="button"
                    className={i === m.index ? "is-current" : ""}
                    aria-current={i === m.index ? "true" : undefined}
                    onClick={() => controls.playAt(i)}
                  >
                    <img src={`https://i.ytimg.com/vi/${id}/default.jpg`} alt="" loading="lazy" />
                    <span>
                      <b>{t?.title ?? `Track ${i + 1}`}</b>
                      {t?.author && <small>{t.author}</small>}
                    </span>
                    {i === m.index && <Equalizer on={m.playing} />}
                  </button>
                </li>
              );
            })}
          </ol>
        </Collapse>
      )}
    </aside>
  );
}
