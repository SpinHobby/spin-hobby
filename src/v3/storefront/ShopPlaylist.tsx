import {
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useStoreConfig } from "../storeConfig";
import { Collapse } from "../../components/layout/Collapse";

/**
 * The storefront's "Shop playlist" (the owner picks a YouTube playlist in Admin > Settings; without one, nothing shows).
 *
 * - ShopPlaylistNav, in the section tabs: "Shop playlist" opens the player and starts the music (shuffled); then previous,
 *   play/pause, next and "Close player" take its place.
 * - ShopPlaylistPlayer, a see-through card floating over the page: the video, the controls, volume, shuffle and the whole
 *   playlist. It can be minimized to the video alone and dragged anywhere (it remembers where, and goes back there when the
 *   playlist panel closes).
 *
 * YouTube's embed rules shape it: the video stays visible while it plays, fully opaque and never smaller than 200 × 200 (so
 * "minimized" is a 200 × 200 video, not a hidden one, and only the card around the video is see-through), nothing is drawn over
 * the video, and our buttons drive YouTube's own player through its API. Music only starts from a shopper's click. Uses YouTube's
 * privacy-enhanced host.
 */

// ---------------------------------------------------------------- shared state (the nav and the card are in different places)

interface Track {
  title: string;
  author: string;
}
interface Prefs {
  volume: number;
  muted: boolean;
  shuffle: boolean;
}
interface MusicState extends Prefs {
  open: boolean;
  minimized: boolean;
  listOpen: boolean;
  playing: boolean;
  /** The video ids in play order (shuffled when shuffle is on), from YouTube's player once it loads. */
  ids: string[];
  index: number;
  tracks: Record<string, Track>;
  /** Where the shopper put the card (top-left corner). It is shown kept on screen, without forgetting this spot. */
  pos: { x: number; y: number } | null;
}

/** Read and write a remembered setting; private browsing or blocked storage just means it isn't remembered. */
function stored<T>(key: string, fallback: T, valid: (v: unknown) => boolean): T {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "null");
    return valid(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}
function remember(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* not remembered: fine */
  }
}
const POS_KEY = "spinhobby-music-pos";
const PREFS_KEY = "spinhobby-music-prefs";
const isPos = (p: unknown) => !!p && Number.isFinite((p as { x: number }).x) && Number.isFinite((p as { y: number }).y);
const isPrefs = (p: unknown) => !!p && typeof (p as Prefs).volume === "number" && typeof (p as Prefs).shuffle === "boolean";

let state: MusicState = {
  open: false,
  minimized: false,
  listOpen: false,
  playing: false,
  ids: [],
  index: 0,
  tracks: {},
  pos: stored(POS_KEY, null, isPos),
  ...stored<Prefs>(PREFS_KEY, { volume: 70, muted: false, shuffle: true }, isPrefs),
};
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
const savePrefs = () => remember(PREFS_KEY, { volume: state.volume, muted: state.muted, shuffle: state.shuffle });

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

/** The play order and position as YouTube's player has them now (the order changes when shuffle is switched). */
function syncOrder() {
  if (!player) return;
  const ids: string[] = player.getPlaylist?.() ?? [];
  const index: number = player.getPlaylistIndex?.() ?? 0;
  set({ index, ...(ids.length && ids.join() !== state.ids.join() ? { ids } : {}) });
}

const controls = {
  open: () => set({ open: true, minimized: false }),
  close: () => {
    player?.destroy?.();
    player = null;
    set({ open: false, playing: false, listOpen: false, ids: [], index: 0 });
  },
  /** Minimized: just the video, at YouTube's smallest allowed size (200 × 200); playing or paused stays as it was. */
  minimize: () => set({ minimized: true, listOpen: false }),
  expand: () => set({ minimized: false }),
  toggle: () => {
    if (!player) return;
    if (state.playing) player.pauseVideo();
    else player.playVideo();
  },
  next: () => player?.nextVideo?.(),
  previous: () => player?.previousVideo?.(),
  playAt: (i: number) => player?.playVideoAt?.(i),
  volume: (volume: number) => {
    player?.setVolume?.(volume);
    if (volume > 0 && state.muted) player?.unMute?.();
    set({ volume, muted: volume === 0 ? state.muted : false });
    savePrefs();
  },
  mute: () => {
    const muted = !state.muted;
    if (muted) player?.mute?.();
    else player?.unMute?.();
    set({ muted });
    savePrefs();
  },
  shuffle: () => {
    const shuffle = !state.shuffle;
    player?.setShuffle?.(shuffle);
    set({ shuffle });
    savePrefs();
    window.setTimeout(syncOrder, 300); // YouTube reorders the list a moment later
  },
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

// ---------------------------------------------------------------- icons

function PlayPauseIcon({ playing }: { playing: boolean }) {
  return (
    <span className={`sf-playicon ${playing ? "is-playing" : ""}`} aria-hidden>
      <svg viewBox="0 0 24 24" className="sf-playicon__play">
        <path d="M8 5.5v13l11-6.5z" />
      </svg>
      <svg viewBox="0 0 24 24" className="sf-playicon__pause">
        <rect x="6.5" y="5" width="4" height="14" rx="1.2" />
        <rect x="13.5" y="5" width="4" height="14" rx="1.2" />
      </svg>
    </span>
  );
}
const SkipIcon = ({ back = false }: { back?: boolean }) => (
  <svg viewBox="0 0 24 24" className="sf-skipicon" aria-hidden style={back ? { transform: "scaleX(-1)" } : undefined}>
    <path d="M5 6v12l9-6z" />
    <rect x="15.5" y="6" width="3" height="12" rx="1" />
  </svg>
);
function VolumeIcon({ level }: { level: number }) {
  return (
    <svg viewBox="0 0 24 24" className="sf-volicon" aria-hidden>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      {level > 0 && <path d="M15 9.2a4 4 0 0 1 0 5.6" />}
      {level > 50 && <path d="M17.6 6.8a7.5 7.5 0 0 1 0 10.4" />}
      {level === 0 && <path d="M16 9.5l5 5m0-5-5 5" />}
    </svg>
  );
}
function ShuffleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="sf-volicon" aria-hidden>
      <path d="M4 7h3.5c2 0 3 1 4 2.5l2 3c1 1.5 2 2.5 4 2.5H20m0 0-2.5-2.5M20 15l-2.5 2.5M4 17h3.5c1.2 0 2-.4 2.7-1M20 9h-2.5c-1.2 0-2 .4-2.7 1M20 9l-2.5-2.5M20 9l-2.5 2.5" />
    </svg>
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

/** The volume slider (in the card, and in the navbar's volume pop-up). */
function VolumeSlider({ level }: { level: number }) {
  return (
    <input
      type="range"
      className="sf-volrange"
      min={0}
      max={100}
      step={1}
      value={level}
      aria-label="Volume"
      style={{ ["--level" as string]: `${level}%` }}
      onChange={(e: ChangeEvent<HTMLInputElement>) => controls.volume(Number(e.target.value))}
    />
  );
}

// ---------------------------------------------------------------- the nav buttons

/** In the section tabs: "Shop playlist" opens and plays; once open, previous, play/pause, next and "Close player". */
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
      <button type="button" className="sf-music-btn sf-music-btn--icon" onClick={controls.previous} aria-label="Previous track">
        <SkipIcon back />
      </button>
      <button
        type="button"
        className={`sf-music-btn sf-music-btn--pp ${m.playing ? "is-on" : ""}`}
        onClick={controls.toggle}
        aria-label={m.playing ? "Pause the shop playlist" : "Play the shop playlist"}
      >
        <PlayPauseIcon playing={m.playing} />
        <Equalizer on={m.playing} />
      </button>
      <button type="button" className="sf-music-btn sf-music-btn--icon" onClick={controls.next} aria-label="Next track">
        <SkipIcon />
      </button>
      {/* volume: the button mutes; hovering or tabbing to it shows the slider */}
      <span className="sf-music-vol">
        <button
          type="button"
          className="sf-music-btn sf-music-btn--icon"
          onClick={controls.mute}
          aria-label={m.muted || m.volume === 0 ? "Unmute" : "Mute"}
          aria-pressed={m.muted}
        >
          <VolumeIcon level={m.muted ? 0 : m.volume} />
        </button>
        <span className="sf-music-vol__pop">
          <VolumeSlider level={m.muted ? 0 : m.volume} />
          <span className="sf-music-vol__value">{m.muted ? 0 : m.volume}</span>
        </span>
      </span>
      <button type="button" className="sf-music-btn" onClick={controls.close} aria-label="Close player">
        <span className="sf-music-nav__close-x" aria-hidden>
          ×
        </span>
        <span className="sf-music-nav__close-label">Close player</span>
      </button>
    </span>
  );
}

// ---------------------------------------------------------------- the floating player

const MARGIN = 12;
/** Where to show the card so it is fully on screen, given where the shopper wants it. */
function onScreen(p: { x: number; y: number }, el: HTMLElement | null) {
  const w = el?.offsetWidth ?? 340;
  const h = el?.offsetHeight ?? 300;
  return {
    x: Math.min(Math.max(MARGIN, p.x), Math.max(MARGIN, window.innerWidth - w - MARGIN)),
    y: Math.min(Math.max(MARGIN, p.y), Math.max(MARGIN, window.innerHeight - h - MARGIN)),
  };
}

/** The one container the player lives in: made once, straight in <body>, so changing pages never removes it. `sh` gives it the
 *  shop's colours and fonts (light and dark), whatever page is showing. */
let musicRoot: HTMLElement | null = null;
function getMusicRoot() {
  if (!musicRoot) {
    musicRoot = document.createElement("div");
    musicRoot.className = "sh sf-music-root";
    document.body.appendChild(musicRoot);
  }
  return musicRoot;
}

/**
 * The player, for the whole app: put it once in App.tsx, outside the routes. It reads the playlist from the shop's settings and
 * keeps playing while the shopper moves between pages (the shop, /account, /support...). While it's open, clicks on links to
 * other pages of the site switch pages in place instead of reloading (a reload would stop the music); ctrl/cmd-click, links that
 * open a new tab and links to files behave as usual.
 */
export function ShopMusicHost() {
  const m = useMusic();
  const config = useStoreConfig();
  const navigate = useNavigate();
  const playlistId = config?.musicPlaylistId ?? null;

  useEffect(() => {
    if (!m.open) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!(a instanceof HTMLAnchorElement)) return;
      if ((a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (/\.[a-z0-9]+$/i.test(url.pathname)) return; // a file (sitemap.xml, a photo), not a page
      if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return; // same page
      e.preventDefault();
      navigate(url.pathname + url.search + url.hash);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [m.open, navigate]);

  // the shop's owner switched the playlist off: close the player
  useEffect(() => {
    if (config && !playlistId && state.open) controls.close();
  }, [config, playlistId]);

  return m.open && playlistId ? createPortal(<PlayerCard playlistId={playlistId} />, getMusicRoot()) : null;
}

function PlayerCard({ playlistId }: { playlistId: string }) {
  const m = useMusic();
  const card = useRef<HTMLElement>(null);
  const mount = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, remeasure] = useReducer((n: number) => n + 1, 0);

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
            // the shopper's click asked for music: at their volume, from a random track when shuffling
            onReady: (e: { target: YTPlayer }) => {
              e.target.setVolume(state.volume);
              if (state.muted) e.target.mute();
              if (state.shuffle) {
                e.target.setShuffle(true);
                e.target.playVideoAt(0);
              } else e.target.playVideo();
            },
            onStateChange: (e: { data: number }) => {
              set({ playing: e.data === PLAYING || e.data === BUFFERING });
              syncOrder();
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

  // Shown where the shopper put it, nudged on screen when it grows (the playlist opens) or the window shrinks, and back to
  // their spot when it shrinks again. The spot itself only changes when they move it.
  useLayoutEffect(() => {
    if (!state.pos) set({ pos: { x: window.innerWidth, y: window.innerHeight } }); // first time: bottom-right
    const ro = new ResizeObserver(remeasure);
    if (card.current) ro.observe(card.current);
    window.addEventListener("resize", remeasure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", remeasure);
    };
  }, []);
  const shown = m.pos ? onScreen(m.pos, card.current) : null;
  const moveTo = (p: { x: number; y: number }) => set({ pos: onScreen(p, card.current) });

  // drag by the handle (mouse, pen or finger); the video ignores the pointer meanwhile so it can't swallow the drag
  const grab = useRef<{ dx: number; dy: number } | null>(null);
  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest("button") || !shown) return;
    grab.current = { dx: e.clientX - shown.x, dy: e.clientY - shown.y };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (grab.current) moveTo({ x: e.clientX - grab.current.dx, y: e.clientY - grab.current.dy });
  };
  const onPointerUp = () => {
    if (!grab.current) return;
    grab.current = null;
    setDragging(false);
    remember(POS_KEY, state.pos);
  };
  // and by keyboard: arrows move it (Shift for bigger steps)
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const step = e.shiftKey ? 96 : 24;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d || !shown) return;
    e.preventDefault();
    moveTo({ x: shown.x + d[0], y: shown.y + d[1] });
    remember(POS_KEY, state.pos);
  };

  const now = currentId ? m.tracks[currentId] : undefined;
  const level = m.muted ? 0 : m.volume;
  const volume = (
    <span className="sf-player__volume">
      <button
        type="button"
        className="sf-player__icon"
        onClick={controls.mute}
        aria-label={m.muted || m.volume === 0 ? "Unmute" : "Mute"}
        aria-pressed={m.muted}
      >
        <VolumeIcon level={level} />
      </button>
      {!m.minimized && <VolumeSlider level={level} />}
    </span>
  );
  return (
    <aside
      ref={card}
      className={`sf-player ${m.minimized ? "is-mini" : ""} ${dragging ? "is-dragging" : ""} ${m.playing ? "is-playing" : ""}`}
      style={shown ? { transform: `translate(${shown.x}px, ${shown.y}px)` } : { visibility: "hidden" }}
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
            onClick={m.minimized ? controls.expand : controls.minimize}
            aria-label={m.minimized ? "Expand the player" : "Minimize to the video"}
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

      {!m.minimized && (
        <div className="sf-player__controls">
          {!m.minimized && (
            <button
              type="button"
              className={`sf-player__icon sf-player__shuffle ${m.shuffle ? "is-on" : ""}`}
              onClick={controls.shuffle}
              aria-pressed={m.shuffle}
              aria-label="Shuffle"
              title={m.shuffle ? "Shuffle is on" : "Shuffle is off"}
            >
              <ShuffleIcon />
            </button>
          )}
          <button type="button" className="sf-player__icon" onClick={controls.previous} aria-label="Previous track">
            <SkipIcon back />
          </button>
          <button
            type="button"
            className={`sf-player__pp ${m.playing ? "is-on" : ""}`}
            onClick={controls.toggle}
            aria-label={m.playing ? "Pause" : "Play"}
          >
            <PlayPauseIcon playing={m.playing} />
          </button>
          <button type="button" className="sf-player__icon" onClick={controls.next} aria-label="Next track">
            <SkipIcon />
          </button>
        </div>
      )}

      {!m.minimized && (
        <div className="sf-player__row">
          {volume}
          <button
            type="button"
            className={`sf-player__list-btn ${m.listOpen ? "is-on" : ""}`}
            aria-expanded={m.listOpen}
            onClick={() => set({ listOpen: !m.listOpen })}
          >
            Playlist{m.ids.length ? ` · ${m.ids.length}` : ""}
          </button>
        </div>
      )}

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
