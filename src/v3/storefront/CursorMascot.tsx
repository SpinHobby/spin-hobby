import { useEffect, useRef } from "react";
import { MASCOT_FRAMES } from "./mascotFrames.generated";

/** Distance from her face (px) at which she is looking all the way to the side. */
const reach = () => Math.max(260, Math.min(window.innerWidth, window.innerHeight) * 0.45);
/** Inside this radius (unit circle) she looks straight at the visitor. */
const DEADZONE = 0.14;
/** She notices the cursor this long after it moved, like a person reacting a beat late. */
const REACTION_MS = 150;
/**
 * The point she looks at trails the (delayed) cursor on a soft, lightly underdamped spring: a short
 * lag, a gradual catch-up and a small overshoot. Damping under 2 * sqrt(stiffness) keeps the overshoot.
 */
const LOOK_STIFFNESS = 34;
const LOOK_DAMPING = 8.5;
/** However fast the mouse moves, her attention travels at most this fast (units of reach per second). */
const LOOK_MAX_SPEED = 1.8;
/** Motion along the pose path is its own critically damped spring, capped in steps per second, so she
 *  eases into and out of every move and passes through the neutral frame without stopping. */
const PATH_STIFFNESS = 50;
const PATH_DAMPING = 14;
const PATH_MAX_SPEED = 80;
/** A new destination must be this much closer (squared distance ratio) before she changes course. */
const SWITCH_RATIO = 0.7;
/** Crossfade between neighbouring frames, so quick scrubbing reads as motion blur rather than steps. */
const FADE_MS = 120;
/** With no mouse movement for this long she looks back at the visitor. */
const IDLE_MS = 5000;

/** One drawn pose: a frame on the original (+1) or mirrored (-1) side of the path. */
type Pose = { index: number; side: 1 | -1 };

/**
 * The hero mascot as a cursor-following character. public/mascot-frames (built by
 * scripts/mascot-frames.py) holds the clip's own frames in order, forming one path through the poses
 * with the neutral frame somewhere along it. Mirrored, the same path covers the other side. She moves
 * along the path toward whichever pose looks closest to where her attention is, so every move passes
 * through the clip's real in-between frames, and changing sides goes through the neutral frame, which
 * both sides share. Touch devices and reduced-motion users get the neutral frame only.
 */
export function CursorMascot({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { dir, width, height, face, center, frames } = MASCOT_FRAMES;
    canvas.width = width;
    canvas.height = height;
    const n = frames.length;
    const gaze = (p: Pose) => ({ x: frames[p.index].x * p.side, y: frames[p.index].y });
    const flipped = (p: Pose) => p.side < 0 && p.index !== center;

    const images: (HTMLImageElement | null)[] = new Array(n).fill(null);
    const load = (i: number) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => { images[i] = img; resolve(); };
        img.onerror = () => resolve();
        img.src = `${dir}/${frames[i].file}`;
      });

    let shown: Pose | null = null;
    let fadeFrom: Pose | null = null;
    let fadeStart = 0;
    const paint = (p: Pose, alpha: number) => {
      const img = images[p.index];
      if (!img) return;
      ctx.globalAlpha = alpha;
      if (flipped(p)) {
        ctx.save();
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0);
        ctx.restore();
      } else {
        ctx.drawImage(img, 0, 0);
      }
    };
    /** Draws the current pose, crossfading from the previous one; true while still fading. */
    const render = (now: number) => {
      if (!shown) return false;
      const t = fadeFrom ? Math.min(1, (now - fadeStart) / FADE_MS) : 1;
      ctx.clearRect(0, 0, width, height);
      if (fadeFrom && t < 1) paint(fadeFrom, 1 - t);
      paint(shown, fadeFrom ? t : 1);
      ctx.globalAlpha = 1;
      if (t >= 1) fadeFrom = null;
      return t < 1;
    };
    const show = (p: Pose, now: number) => {
      if (shown && shown.index === p.index && flipped(shown) === flipped(p)) return;
      if (!images[p.index]) return; // not loaded yet: keep what is on screen
      fadeFrom = shown;
      shown = p;
      fadeStart = now;
    };

    const isStatic = window.matchMedia("(hover: none)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false;
    load(center).then(() => {
      if (disposed) return;
      show({ index: center, side: 1 }, performance.now());
      render(performance.now());
      if (!isStatic) for (let i = 0; i < n; i++) if (i !== center) load(i);
    });
    if (isStatic) return () => { disposed = true; };

    // Where the cursor has been (unit circle around her face), so she can react to it a beat late.
    const history: { t: number; x: number; y: number }[] = [{ t: 0, x: 0, y: 0 }];
    let lastMove = 0;
    const delayedCursor = (now: number) => {
      const cutoff = now - REACTION_MS;
      let pick = history[0];
      for (const h of history) { if (h.t <= cutoff) pick = h; else break; }
      while (history.length > 1 && history[1].t <= cutoff) history.shift();
      return pick;
    };

    const look = { x: 0, y: 0 };                   // her attention: trails the delayed cursor on the spring
    const lookVel = { x: 0, y: 0 };
    let destination: Pose = { index: center, side: 1 };
    let side: 1 | -1 = 1;                          // which side of the path she is on
    let position: number = center;                 // fractional path index on that side
    let pathVel = 0;                               // steps per second along the path, toward the destination
    let lastDir = 0;                               // direction moved last tick, to notice reversals
    let raf = 0;
    let lastTick = 0;

    const nearest = (): Pose => {
      if (Math.hypot(look.x, look.y) < DEADZONE) return { index: center, side: 1 };
      let best: Pose = destination;
      let bestD = Infinity;
      for (const s of [1, -1] as const) {
        for (let i = 0; i < n; i++) {
          const g = gaze({ index: i, side: s });
          const d = (g.x - look.x) ** 2 + (g.y - look.y) ** 2;
          if (d < bestD) { bestD = d; best = { index: i, side: s }; }
        }
      }
      const cur = gaze(destination);
      const curD = (cur.x - look.x) ** 2 + (cur.y - look.y) ** 2;
      return bestD > curD * SWITCH_RATIO ? destination : best;
    };

    /**
     * Distance left along the path to the destination, and the direction to move in right now.
     * A destination on the other side is reached through the neutral frame, in one continuous move.
     */
    const route = () => {
      if (destination.side === side || position === center) {
        const d = destination.index - position;
        return { remaining: Math.abs(d), dir: Math.sign(d) };
      }
      const toCenter = center - position;
      return { remaining: Math.abs(toCenter) + Math.abs(destination.index - center), dir: Math.sign(toCenter) };
    };

    const tick = (now: number) => {
      raf = 0;
      const dt = Math.min((now - (lastTick || now)) / 1000, 0.05);
      lastTick = now;

      // 1. Attention follows the delayed cursor on a soft spring, no faster than LOOK_MAX_SPEED.
      const c = now - lastMove > IDLE_MS ? { x: 0, y: 0 } : delayedCursor(now);
      lookVel.x += ((c.x - look.x) * LOOK_STIFFNESS - lookVel.x * LOOK_DAMPING) * dt;
      lookVel.y += ((c.y - look.y) * LOOK_STIFFNESS - lookVel.y * LOOK_DAMPING) * dt;
      const lv = Math.hypot(lookVel.x, lookVel.y);
      if (lv > LOOK_MAX_SPEED) { lookVel.x *= LOOK_MAX_SPEED / lv; lookVel.y *= LOOK_MAX_SPEED / lv; }
      look.x += lookVel.x * dt;
      look.y += lookVel.y * dt;
      const looking = Math.hypot(c.x - look.x, c.y - look.y) > 0.003 || lv > 0.01;
      if (!looking) { look.x = c.x; look.y = c.y; lookVel.x = 0; lookVel.y = 0; }

      // 2. Head and body ease along the pose path toward the pose nearest her attention.
      destination = nearest();
      if (position === center) side = destination.side; // at the neutral frame she can leave on either side
      const { remaining, dir } = route();
      // A genuine change of direction (not a pass through the neutral frame) bleeds off speed first.
      if (dir !== 0 && lastDir !== 0 && dir !== lastDir) pathVel *= 0.25;
      pathVel += (remaining * PATH_STIFFNESS - pathVel * PATH_DAMPING) * dt;
      pathVel = Math.max(0, Math.min(PATH_MAX_SPEED, pathVel));
      let move = Math.min(remaining, pathVel * dt);
      let crossed = false;
      if (dir !== 0 && move > 0 && destination.side !== side) {
        // Through the neutral frame and out the other side within this same tick if the move is long enough.
        const toCenter = Math.abs(center - position);
        if (move >= toCenter) {
          side = destination.side;
          position = center + Math.sign(destination.index - center) * (move - toCenter);
          move = 0;
          crossed = true;
        }
      }
      position += dir * move;
      if (remaining - move < 0.01 && destination.side === side) { position = destination.index; pathVel = 0; }
      lastDir = crossed ? Math.sign(destination.index - center) : dir;
      show({ index: Math.round(position), side }, now);

      const fading = render(now);
      const arrived = !looking && position === destination.index && side === destination.side;
      if (!arrived || fading) raf = requestAnimationFrame(tick);
      else lastTick = 0;
    };
    const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = canvas.getBoundingClientRect();
      const range = reach();
      let dx = (e.clientX - (r.left + r.width * face.x)) / range;
      let dy = (e.clientY - (r.top + r.height * face.y)) / range;
      const len = Math.hypot(dx, dy);
      if (len > 1) { dx /= len; dy /= len; }
      const now = performance.now();
      history.push({ t: now, x: dx, y: dy });
      lastMove = now;
      wake();
    };
    // Cursor left the window: look back at the visitor.
    const onOut = (e: MouseEvent) => {
      if (e.relatedTarget) return;
      const now = performance.now();
      history.push({ t: now, x: 0, y: 0 });
      lastMove = now;
      wake();
    };
    // Keep ticking while idle so the idle return still happens after the last movement.
    const idleTimer = window.setInterval(() => { if (lastMove && performance.now() - lastMove > IDLE_MS) wake(); }, 1000);

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("mouseout", onOut);
    return () => {
      disposed = true;
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseout", onOut);
      window.clearInterval(idleTimer);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={ref} className={className} role="img" aria-label="Spin Hobby mascot" />;
}
