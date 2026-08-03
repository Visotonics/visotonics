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

  /* Reserved warm — severity only. THERE ARE TWO ORANGES AND THAT IS ON
     PURPOSE. They look like a duplicate and they are not; this comment exists
     because collapsing them was proposed, started, and reverted.

       #FFB020  (this slot)          — the severity LABEL. Callout title type.
       #ED510C  (detect.ts `warn`,   — the severity MARK. Brackets, boxes, the
                 subjects.ts's          drawn conclusion itself.
                 SIGNAL_ORANGE)

     A tier pair, not a redundancy: the amber names the finding and the orange
     points at it, so a severe callout reads as one label attached to one mark
     rather than as two graphics of equal weight shouting the same thing.
     yard-vision ships both together and document-vision followed that
     precedent explicitly — see its note at scene.tsx:172-177, which says in as
     many words that it reused the pair "rather than inventing a third orange."

     So: do not unify these. Flattening them to one value silently changes two
     shipped scenes and throws away the label-vs-mark distinction. If a third
     warm is ever needed, it almost certainly is not — pick whichever of these
     two matches whether the thing being drawn is a NAME or a MARK. */
  warn: "#FFB020",

  /* THE MEASUREMENT GRID — white, and deliberately NOT the accent.
     The slot grid under Yard Vision used to be drawn in `accent`, which quietly
     broke this palette's own rule: accent means THE SYSTEM IS OBSERVING, and a
     floor is not an observation. Drawing the grid white frees the accent to mean
     only one thing again, and gets the look it should always have had — a model
     standing on a ruled measurement surface, the way a 1990s CAD or vector
     display drew one. Cool-neutral rather than paper-white so it reads as
     phosphor on glass, not as a printed sheet.
     `gridMajor` is the heavier every-fifth rule; a grid without a subdivision
     reads as wallpaper, one with it reads as measured. */
  grid: "#DFE6ED",
  gridMajor: "#F1F5F9",
} as const;

export const sans = "var(--font-archivo)";
