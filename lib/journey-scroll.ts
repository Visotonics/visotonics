/* ---------------------------------------------------------------------------
   Journey scroll singleton — PROTOTYPE (see app/dev/journey).

   Ported from the sibling 3d project's `lib/scroll.ts`. The idea, and the only
   part worth porting: ONE pinned scrubbed ScrollTrigger writes a single 0..1
   number into module state, and everything on the page — WebGL camera, DOM
   captions — is a pure function of that number. No per-element ScrollTriggers,
   no per-element tweens, so scenes stay scrubbable in both directions and
   adding a caption costs a subscription, not another trigger.

   WHY a singleton rather than React state: this value changes every frame.
   Routing it through setState would re-render the tree at 60Hz for a number
   that only ever feeds imperative writes (camera matrices, style properties).
   The module object IS the shared frame state; React never sees it change.

   WHY `p` is damped and `raw` is not: ScrollTrigger's scrub already smooths
   the scrollbar, but wheel/trackpad input still arrives in steps. The second
   damper is what makes the camera feel weighted rather than glued to the
   input. Consumers read `p`; only ScrollManager writes `raw`.
--------------------------------------------------------------------------- */

/** Global scroll state. `raw` is set by ScrollTrigger, `p` is what you read. */
export const journey = { raw: 0, p: 0 };

type Fn = (p: number) => void;
const subs = new Set<Fn>();

/** Subscribe to the damped value. Returns an unsubscribe — call it in the
    effect cleanup, or a unmounted component keeps being ticked forever. */
export function subscribe(fn: Fn): () => void {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Remap the slice [a,b] of global progress onto a local 0..1. The whole
    choreography is written in terms of this, so a scene's timing can be
    retuned by editing two numbers instead of rewriting its maths. */
export const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

/** Smoothstep — kills the velocity discontinuity at a segment boundary that
    a linear ramp leaves behind (visible as a camera "tick" mid-scroll). */
export const smooth = (t: number) => t * t * (3 - 2 * t);

/** 0->1->0 window with soft edges, for fading a caption in and back out over
    its own slice of the scroll. `f` is the fade width in progress units. */
export const window01 = (p: number, a: number, b: number, f = 0.03) =>
  Math.min(seg(p, a, a + f), 1 - seg(p, b - f, b));

/* ---- the damper -----------------------------------------------------------
   Runs on gsap.ticker rather than its own rAF loop so it shares one clock with
   Lenis and ScrollTrigger — two independent rAF loops would let `p` be read a
   frame stale, which shows up as jitter at high scroll speed.

   `1 - Math.exp(-9 * dt)` is a framerate-independent exponential approach: the
   same perceived weight on a 60Hz and a 120Hz display, unlike a fixed lerp
   factor. dt is capped at 1/30 so a stalled tab does not resume with one giant
   step that teleports the camera. The tiny-delta snap stops `p` from creeping
   toward `raw` forever and re-rendering a frame that is visually identical. */
type Ticker = { add: (fn: (t: number, dt: number) => void) => void; remove: (fn: (t: number, dt: number) => void) => void };
type TickFn = (t: number, dtMs: number) => void;

/** Starts the damper and returns a stopper. UNLIKE the sibling project's
    module-level `ticking` latch, this hands the function back so the manager
    can remove it on unmount — this prototype must not leave a ticker callback
    running over the rest of the site after the page is navigated away from. */
export function startDamper(gsap: { ticker: Ticker }): () => void {
  const tick: TickFn = (_t, dtMs) => {
    const dt = Math.min(dtMs / 1000, 1 / 30);
    journey.p += (journey.raw - journey.p) * (1 - Math.exp(-9 * dt));
    if (Math.abs(journey.raw - journey.p) < 0.00005) journey.p = journey.raw;
    subs.forEach((f) => f(journey.p));
  };
  gsap.ticker.add(tick);
  return () => gsap.ticker.remove(tick);
}

/** Reduced-motion path: pin `p` mid-journey and notify once, so subscribers
    render a static, representative frame instead of nothing. Kept here (not in
    the manager) because the scene must be able to do this with no Lenis, no
    ScrollTrigger and no ticker running at all. */
export function freezeAt(p: number): void {
  journey.raw = p;
  journey.p = p;
  subs.forEach((f) => f(p));
}
