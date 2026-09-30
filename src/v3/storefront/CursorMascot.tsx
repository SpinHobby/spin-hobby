import { useEffect, useRef } from "react";
import { MASCOT_FRAMES } from "./mascotFrames.generated";

/** Distance from her face (px) at which she is looking all the way to the side. */
const reach = () => Math.max(260, Math.min(window.innerWidth, window.innerHeight) * 0.45);
/** Inside this radius (unit circle) she looks straight at the visitor. */
const DEADZONE = 0.14;
/** Scrub speed in path steps per second: quicker when far from the destination, easing in on approach. */
const SPEED_MAX = 110;
const SPEED_MIN = 30;
/**
 * The point she looks at trails the cursor on a damped spring, so she follows with a short delay and a
 * little rubber-band overshoot instead of snapping. Stiffness sets how quickly she catches up; damping
 * below 2 * sqrt(stiffness) leaves some overshoot.
 */
const SPRING_STIFFNESS = 60;
const SPRING_DAMPING = 9;
/** A new destination must be this much closer (squared distance ratio) before she changes course. */
const SWITCH_RATIO = 0.7;
/** Crossfade between neighbouring steps. They are consecutive clip frames, so this only softens the stepping. */
const FADE_MS = 70;

/** One drawn pose: a frame on the original (+1) or mirrored (-1) side of the path. */
type Pose = { index: number; side: 1 | -1 };

/**
 * The hero mascot as a cursor-following character. public/mascot-frames (built by
 * scripts/mascot-frames.py) holds the clip's own frames in order, forming one path through the poses
 * with the neutral frame somewhere along it. Mirrored, the same path covers the other side. She scrubs
 * along the path toward whichever step looks closest to the cursor, so every move passes through the
 * clip's real in-between frames; to change sides she passes through the neutral frame, which is the
 * one frame both sides share. Touch devices and reduced-motion users get the neutral frame only.
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

    const cursor = { x: 0, y: 0 };                 // where the cursor is, on the unit circle around her face
    const follow = { x: 0, y: 0 };                 // where she is looking: trails the cursor on the spring
    const vel = { x: 0, y: 0 };
    let destination: Pose = { index: center, side: 1 };
    let side: 1 | -1 = 1;                            // which side of the path she is on
    let position: number = center;                   // fractional path index on that side
    let raf = 0;
    let lastTick = 0;

    const nearest = (): Pose => {
      if (Math.hypot(follow.x, follow.y) < DEADZONE) return { index: center, side: 1 };
      let best: Pose = destination;
      let bestD = Infinity;
      for (const s of [1, -1] as const) {
        for (let i = 0; i < n; i++) {
          const g = gaze({ index: i, side: s });
          const d = (g.x - follow.x) ** 2 + (g.y - follow.y) ** 2;
          if (d < bestD) { bestD = d; best = { index: i, side: s }; }
        }
      }
      const cur = gaze(destination);
      const curD = (cur.x - follow.x) ** 2 + (cur.y - follow.y) ** 2;
      return bestD > curD * SWITCH_RATIO ? destination : best;
    };

    const tick = (now: number) => {
      raf = 0;
      const dt = Math.min((now - (lastTick || now)) / 1000, 0.05);
      lastTick = now;
      // Spring the followed point toward the cursor (semi-implicit Euler: stable at these rates).
      vel.x += ((cursor.x - follow.x) * SPRING_STIFFNESS - vel.x * SPRING_DAMPING) * dt;
      vel.y += ((cursor.y - follow.y) * SPRING_STIFFNESS - vel.y * SPRING_DAMPING) * dt;
      follow.x += vel.x * dt;
      follow.y += vel.y * dt;
      const springing = Math.hypot(cursor.x - follow.x, cursor.y - follow.y) > 0.003 || Math.hypot(vel.x, vel.y) > 0.01;
      if (!springing) { follow.x = cursor.x; follow.y = cursor.y; vel.x = 0; vel.y = 0; }
      destination = nearest();
      // Changing sides means going to the neutral frame first, then out along the other side.
      const goal = destination.side === side || destination.index === center ? destination.index : center;
      const remaining = goal - position;
      const speed = Math.max(SPEED_MIN, Math.min(SPEED_MAX, Math.abs(remaining) * 6));
      position += Math.min(Math.abs(remaining), speed * dt) * Math.sign(remaining);
      if (Math.abs(goal - position) < 0.01) position = goal;
      if (position === center) side = destination.side;
      show({ index: Math.round(position), side }, now);
      const fading = render(now);
      const arrived = !springing && position === destination.index && side === destination.side;
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
      cursor.x = dx;
      cursor.y = dy;
      wake();
    };
    // Cursor left the window: look back at the visitor.
    const onOut = (e: MouseEvent) => { if (!e.relatedTarget) { cursor.x = 0; cursor.y = 0; wake(); } };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("mouseout", onOut);
    return () => {
      disposed = true;
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseout", onOut);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={ref} className={className} role="img" aria-label="Spin Hobby mascot" />;
}
