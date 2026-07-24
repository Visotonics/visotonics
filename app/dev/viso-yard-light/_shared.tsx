import type { CSSProperties } from "react";

/* ---------------------------------------------------------------------------
   Viso Yard LIGHT — dev-only light-theme alternative. NOT routed from nav/
   sitemap; noindex. Same export names as ./platform/viso-yard/_shared.tsx so
   every section/rail/convert file ports over unchanged — only the values
   here are inverted:
     - main canvas: dark -> light (charcoal ink text, not pure black)
     - the alternating "light band" (Tank, PlatformBand) inverts too: it was
       light-on-dark, so it becomes dark-on-light, preserving the same
       alternating contrast rhythm the original page has.
     - grid/cross/border hairlines: swapped from white-tinted rgba to a
       charcoal-tinted rgba (not a flat pale gray), per explicit request.
--------------------------------------------------------------------------- */

export const CANVAS_DARK = "#ECEDEF"; // main canvas — now light
export const CANVAS_LIGHT = "#0A0B0E"; // alternating band — now dark (was the light band)
export const SURFACE_DARK = "#101216"; // unchanged — the alternating band's own surface stays dark-canvas
export const TXT_D1 = "#13151A"; // primary text on main canvas — charcoal, not pure black
export const TXT_D2 = "#5A5F6A"; // secondary text on main canvas — charcoal-gray
export const TXT_L1 = "#F4F5F7"; // primary text on the alternating (now-dark) band
export const TXT_L2 = "#A6ADB8"; // secondary text on the alternating (now-dark) band
export const GRID_D = "rgba(19,21,26,0.16)"; // main-canvas gridlines — charcoal-tinted, not flat pale gray
export const GRID_D_DIM = "rgba(19,21,26,0.07)";
export const GRID_L = "rgba(244,245,247,0.08)"; // alternating band's own gridlines
export const CROSS_D = "rgba(19,21,26,0.4)"; // main-canvas registration crosses — charcoal
export const CROSS_L = "rgba(244,245,247,0.4)"; // alternating band's crosses — light-on-dark
export const BORDER_D = "rgba(19,21,26,0.14)";
export const BORDER_D_STRONG = "rgba(19,21,26,0.22)"; // strong-rule frame (Section 01 only)
export const SIGNAL = "#ED510C"; // accent unchanged — the one deliberate constant across both themes

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

// 9px registration cross, anchored to a corner / rule endpoint.
export function Cross({ color, style }: { color: string; style: CSSProperties }) {
  return (
    <div aria-hidden="true" style={{ position: "absolute", width: 9, height: 9, ...style }}>
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
export function Verticals({ color }: { color: string }) {
  return (
    <>
      {V_X.map((x, i) => (
        <div
          key={i}
          aria-hidden="true"
          style={{ position: "absolute", top: 0, bottom: 0, left: x, width: 1, background: color }}
        />
      ))}
    </>
  );
}
