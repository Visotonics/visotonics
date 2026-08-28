/* ---------------------------------------------------------------------------
   campaign-film/state — a local analog of the source site's `lib/scroll.ts`.

   The ported scene files (Rig, Backdrop, Stage, Gate, Container) were built
   against a page that scrubs a single global progress value `scroll.p` via
   real user scroll (Lenis + GSAP ScrollTrigger). This card has NO scroll — it
   loops on a timer — so `index.tsx` drives `scroll.p` itself from a
   requestAnimationFrame loop instead of a scrollbar. Everything downstream
   (every `range`/`smooth`/`window01` call in every ported file) is IDENTICAL
   to the source; only the thing that sets `scroll.p` changed.

   MODULE-SINGLETON, same as the source. This is safe here for the same
   reason it was safe there: only one <CampaignFilm/> is ever mounted at a
   time (it is a single hero visual on one campaign page, not a repeated
   card). If that ever changes, `scroll` needs to become per-instance state.
--------------------------------------------------------------------------- */

export const scroll = { raw: 0, p: 0 };

type Fn = (p: number) => void;
const subs = new Set<Fn>();

export function subscribe(fn: Fn): () => void {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}

/** Called once per rAF frame by index.tsx after it sets `scroll.p`. */
export function notify(p: number) {
  subs.forEach((f) => f(p));
}

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const range = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
export const smooth = (t: number) => t * t * (3 - 2 * t);
/** 0->1->0 window with fade edges. */
export const window01 = (p: number, a: number, b: number, f = 0.02) =>
  Math.min(range(p, a, a + f), 1 - range(p, b - f, b));

/** "Earned metric": converge toward `final` in visible stepped guesses with hesitations, so a
 *  number reads as computed rather than decorative. Deterministic in `t` (pure function of scroll
 *  progress) so it scrubs cleanly in both directions. Verbatim from the source's lib/scroll.ts. */
export function earn(t: number, final: number, decimals = 1, steps = 4): string {
  const k = clamp01(t);
  if (k >= 1) return final.toFixed(decimals);
  const s = Math.min(steps - 1, Math.floor(k * steps));
  const h = Math.sin(final * 12.9898 + s * 78.233) * 43758.5453;
  const jitter = h - Math.floor(h);
  const err = (1 - (s + 1) / steps) * 0.055 + 0.012 * jitter;
  return (final * (1 - err)).toFixed(decimals);
}

/* ---------------------------------------------------------------------------
   useScrollFn — verbatim port of lib/useScroll.ts. Subscribes a callback to
   the film's progress, run from the rAF loop rather than React render.
--------------------------------------------------------------------------- */
import { useEffect, useRef } from "react";

export function useScrollFn(fn: (p: number) => void) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    const un = subscribe((p) => ref.current(p));
    return () => {
      un();
    };
  }, []);
}

/* ---------------------------------------------------------------------------
   heroScreen — stub of lib/project.ts. The source's Container.tsx writes to
   this every frame past p>0.85 (the finale hero-record projection) and reads
   it in an else-branch below that. Neither branch ever fires in this film:
   the loop never goes past p=0.52 (see index.tsx for why that is the loop's
   natural end point). The object exists only so Container.tsx's unmodified
   code has something to write to — never actually consumed here.
--------------------------------------------------------------------------- */
export const heroScreen = { x: 0, y: 0, vis: false };
