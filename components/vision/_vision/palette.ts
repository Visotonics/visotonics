/* ---------------------------------------------------------------------------
   Vision scenes — palette.

   Apple product-studio × Anduril/Palantir industrial. A steel subject lit
   against a neutral graphite cyclorama, one cool signal accent, one warm
   warning. The backdrop's floor value is the site's own dark canvas (#0A0B0E)
   so a scene's frame melts into the page around it.
--------------------------------------------------------------------------- */

export const PALETTE = {
  // Cyclorama backdrop — the site's own dark canvas (#0A0B0E), lifted only
  // enough to separate the subject from it. Held deliberately tight: the frame
  // runs edge-to-edge in the page, so a backdrop lighter than the canvas reads
  // as a grey box sitting ON the site rather than part of it.
  bgTop: "#15181D",
  bgMid: "#0D0F13",
  bgBottom: "#0A0B0E",
  bgGlow: "#2E343D",

  // subject — navy painted steel
  steel: "#2C3A63",
  steelDark: "#161E36",
  rust: "#7A4A30",
  rustHot: "#A2653D",

  // cool signal accent
  accent: "#5CC8FF",
  accentText: "#B6E4FF",
  accentBloom: "#8FDCFF",

  // reserved warm — severity only
  warn: "#FFB020",
} as const;

export const sans = "var(--font-archivo)";
