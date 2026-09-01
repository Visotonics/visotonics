import type { CSSProperties } from "react";

/* ---------------------------------------------------------------------------
   Viso Yard — shared drafting-sheet primitives + tokens.
   Used by the page shell and every section module so the sheet reads as one
   continuous drawing. Colours are the literal v0.2 hex values (matching the
   approved exports and the home port), not CSS vars, so section files stay
   self-contained.
--------------------------------------------------------------------------- */

export const CANVAS_DARK = "#0A0B0E";
export const CANVAS_LIGHT = "#ECEDEF";
export const SURFACE_DARK = "#101216";
export const TXT_D1 = "#F4F5F7";
export const TXT_D2 = "#A6ADB8";
export const TXT_L1 = "#13151A";
export const TXT_L2 = "#5A5F6A";
export const GRID_D = "rgba(244,245,247,0.08)";
export const GRID_D_DIM = "rgba(244,245,247,0.03)"; // under schematic/slot zones
export const GRID_L = "#D4D6DB";
export const CROSS_D = "rgba(244,245,247,0.4)";
export const CROSS_L = "rgba(19,21,26,0.30)";
export const BORDER_D = "rgba(244,245,247,0.10)";
export const BORDER_D_STRONG = "rgba(244,245,247,0.18)"; // strong-rule frame (Section 01 only)
export const SIGNAL = "#ED510C";

export const mono = "var(--font-plex-mono)";
export const sans = "var(--font-archivo)";

// scroll-margin so anchors clear the sticky chrome: 72 nav (desktop),
// 64 nav + 44 ruler = 108 (mobile).
export const ANCHOR_OFFSET = "scroll-mt-[108px] md:scroll-mt-[72px]";

// the drawing sheet: centred, max 1440, scales down responsively
export const SHEET: CSSProperties = { position: "relative", flex: "1 1 auto", minWidth: 0, maxWidth: 1440 };

export const eyebrow = (color: string): CSSProperties => ({
  fontFamily: mono,
  fontSize: 13,
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color,
});

/* 9px registration cross, anchored to a corner / rule endpoint.

   `className` is optional and additive — every existing caller passes only
   colour+style and is unaffected. It exists so these marks can take the
   wireframe activation classes (.hero-wire-activate / .wire-activate, see
   app/globals.css), which is how the home page's identical primitive already
   works; the platform copy simply never had the hook. */
export function Cross({
  color,
  style,
  className,
}: {
  color: string;
  style: CSSProperties;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={className} style={{ position: "absolute", width: 9, height: 9, ...style }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 4, height: 1, background: color }} />
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 4, width: 1, background: color }} />
    </div>
  );
}

// 3px signal-orange registration dot.
export function Dot({ style }: { style: CSSProperties }) {
  return <div aria-hidden="true" style={{ position: "absolute", width: 3, height: 3, background: SIGNAL, ...style }} />;
}

// The 5 page-wide verticals: margins at 64 / (100%-64), interiors dividing the
// inset content into 4 equal columns. Identical coordinates everywhere so the
// sheet reads continuous. Colour follows the band's theme.
export const V_X = [
  "64px",
  "calc(64px + (100% - 128px) * 0.25)",
  "50%",
  "calc(64px + (100% - 128px) * 0.75)",
  "calc(100% - 64px)",
];
/* `className` is applied to EVERY line, not to a wrapper — this returns a
   fragment, so there is no single element to hang it on, and the activation
   CSS keys off the class on the animated element itself. Optional and
   additive; existing callers pass colour only.

   SCATTERING THE SWEEP. When the class is `wire-sweep`, each line also gets
   its own duration and a NEGATIVE delay, which is what makes the pulses look
   independent: a negative delay starts an animation partway through, so the
   very first painted frame already has pulses at different heights instead of
   every line firing in unison from the top.

   The values are DERIVED FROM THE INDEX, not Math.random(). This renders on
   the server as well as the client, and a random value would differ between
   the two and trip a hydration mismatch. Multiplying by irrationals and
   taking the fractional part gives a sequence with no visible period across
   the handful of lines here — deterministic, identical on both passes, and
   still reads as scattered. The two multipliers are unrelated so a line's
   delay does not correlate with its duration. */
export function Verticals({ color, className }: { color: string; className?: string }) {
  const isSweep = className?.includes("wire-sweep");
  return (
    <>
      {V_X.map((x, i) => {
        const frac = (n: number) => n - Math.floor(n);
        /* SPEED AND SPACING MOVE TOGETHER, because with a scrolled repeating
           band they are not independent: the band advances exactly one PERIOD
           per DURATION, so
             speed        = period / duration   (how fast a pulse travels)
             gap in time  = duration            (how often one passes a point)

           Making it "much faster" by shortening the duration alone would also
           make pulses arrive more often — the opposite of "too many". So both
           scale up together: period 3600–6000px over 4.5–7.5s holds the speed
           at roughly 800px/s (fast — it crosses a ~700px viewport in about a
           second, which is the "visible for a second max" ask) while spacing
           pulses 4.5–7.5s apart on a given line instead of the previous
           ~0.9s. Far fewer on screen, each one quicker.

           Varying the period as well as the duration is what stops the set
           reading as a rank marching in formation: with different spacings
           the lines never align horizontally. */
        /* MEASURED, then corrected. The first cut at these numbers gave
           1.5–2.5s of visibility, not the ~1s intended — the estimate assumed
           a ~700px viewport and a tall window (1280px here) keeps the pulse
           on screen proportionally longer. Speed raised to ~1500px/s, which
           puts (viewportHeight + pulseHeight) / speed at roughly 1s on a
           1280px window and well under it on a laptop. Duration is kept long
           so the GAP between pulses does not shrink with the speed. */
        const period = 7000 + frac((i + 1) * 0.4142135624) * 4000;
        const dur = 4.6 + frac((i + 1) * 0.6180339887) * 2.8;
        // negative: start mid-cycle, so the first painted frame is already scattered
        const delay = -frac((i + 1) * 0.7548776662) * dur;
        return (
          <div
            key={i}
            aria-hidden="true"
            className={className}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: x,
              width: 1,
              background: color,
              ...(isSweep
                ? ({
                    "--wire-sweep-dur": `${dur.toFixed(2)}s`,
                    "--wire-sweep-delay": `${delay.toFixed(2)}s`,
                    "--wire-sweep-period": `${period.toFixed(0)}px`,
                  } as CSSProperties)
                : {}),
            }}
          />
        );
      })}
    </>
  );
}
