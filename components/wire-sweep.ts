/* ---------------------------------------------------------------------------
   WIRE SWEEP — per-line phase, speed and spacing for the ambient scan pulse
   that rides the background gridlines (.wire-sweep in app/globals.css).

   DELIBERATELY NOT IN components/motion.tsx, and not marked "use client".
   It lived there briefly and broke the home page at runtime: motion.tsx is a
   client module, app/page.tsx is a Server Component, and a Server Component
   may render a client COMPONENT but may not CALL a plain function exported
   from a client module — "Attempted to call wireSweepVars() from the server".
   tsc does not catch that; it only shows up on render. This module has no
   directive and no client-only API, so it is safe from either side, which is
   required because its two callers sit on opposite sides of that boundary.

   It is shared rather than duplicated because the home page and the platform
   pages each draw these gridlines from their own local `Verticals`, and these
   values are what make the pulses look independent rather than a rank
   marching in formation — they have to stay identical in both.

   DERIVED FROM THE INDEX, NOT Math.random(). These render on the server as
   well as the client, and a random value would differ between the two passes
   and trip a hydration mismatch. Multiplying by irrationals and taking the
   fractional part gives a sequence with no visible period across the handful
   of lines in play — deterministic, identical on both passes, still scattered
   to the eye. The three multipliers are unrelated, so a line's spacing does
   not correlate with its speed or its phase.

   Speed and spacing are NOT independent: the band advances exactly one period
   per duration, so speed = period/duration, and the gap between pulses at a
   given point = duration. Both scale together here (7000-11000px over
   4.6-7.4s, about 1100-2000px/s) — fast travel with multi-second gaps.
   Shortening the duration alone would make pulses quicker AND more frequent,
   which is the opposite of what is wanted.
--------------------------------------------------------------------------- */
import type { CSSProperties } from "react";

export function wireSweepVars(i: number): CSSProperties {
  const frac = (n: number) => n - Math.floor(n);
  const period = 7000 + frac((i + 1) * 0.4142135624) * 4000;
  const dur = 4.6 + frac((i + 1) * 0.6180339887) * 2.8;
  const delay = -frac((i + 1) * 0.7548776662) * dur; // negative: start mid-cycle
  return {
    "--wire-sweep-period": `${period.toFixed(0)}px`,
    "--wire-sweep-dur": `${dur.toFixed(2)}s`,
    "--wire-sweep-delay": `${delay.toFixed(2)}s`,
  } as CSSProperties;
}
