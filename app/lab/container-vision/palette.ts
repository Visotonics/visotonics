/* ---------------------------------------------------------------------------
   Container Vision — palette.

   Apple product-studio × Anduril/Palantir industrial. A graphite-steel subject
   lit against a dark cyclorama, one cool signal accent, one warm warning.
   Values are deliberately *lifted* off pure black so the subject separates and
   the scene reads rich rather than crushed.
--------------------------------------------------------------------------- */

export const PALETTE = {
  // cyclorama backdrop — deep navy through blue, no grey anywhere
  bgTop: "#16305C",
  bgMid: "#0A1730",
  bgBottom: "#03070F",
  bgGlow: "#2F7FC9",

  // subject — navy painted steel
  steel: "#2C3A63",
  steelDark: "#161E36",
  steelSpec: "#5C7BC0",
  rust: "#7A4A30",
  rustHot: "#A2653D",

  // cool signal accent
  accent: "#5CC8FF",
  accentText: "#B6E4FF",
  accentDeep: "#0E4A6E",
  accentBloom: "#8FDCFF",

  // reserved warm — severity only
  warn: "#FFB020",
  warnSoft: "#FFCF6B",

  // type
  ink: "#FFFFFF",
  inkDim: "rgba(255,255,255,0.55)",

  // glass surfaces
  glass: "rgba(20,26,36,0.55)",
  glassEdge: "rgba(255,255,255,0.14)",
} as const;

export const mono = "var(--font-plex-mono)";
export const sans = "var(--font-archivo)";
