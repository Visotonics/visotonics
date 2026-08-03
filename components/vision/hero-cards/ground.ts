/* ---------------------------------------------------------------------------
   Home hero cards — the ground.

   WHY THIS REPLACES THE OLD "ENVIRONMENTS"

   The first attempt at giving each card a place put literal scenery behind the
   subject: distant container rows, racking bays, machine housings, server
   racks. It failed for a reason worth writing down. At ~320px those props are
   too small to identify, so they never read as "a warehouse" or "a factory" —
   they read as grey clutter behind the thing you are supposed to be looking at.
   They also competed with the subject for the eye while adding nothing the
   caption underneath the card wasn't already saying, and they cost geometry on
   the busiest page on the site.

   The site's own visual language is a DRAFTING SHEET: hairline grids,
   registration crosses, everything measured. So the honest way to ground these
   scenes is not fake scenery — it is the drafting sheet itself, laid on the
   floor under the subject and fading out before it reaches an edge. It says
   "this is a measured space" instead of "here are some boxes", it matches the
   page it sits on, and it is one object.

   One grid, one material, no shadows, no lighting cost.
--------------------------------------------------------------------------- */
import * as THREE from "three";

export interface Ground {
  mesh: THREE.Mesh;
  material: THREE.Material;
}

/**
 * A drafting grid on the floor that fades to nothing at the edges.
 *
 * Drawn in a shader rather than as line geometry: a radial fade is what stops
 * the plane having a visible border, and doing that with lines would mean
 * per-line opacity and a lot of draw calls for something that is meant to sit
 * quietly underneath everything.
 */
export function draftingGround(opts?: {
  size?: number;
  y?: number;
  /** world units between gridlines */
  step?: number;
  color?: string;
  opacity?: number;
  /* PHOSPHOR BLEED. How far the soft halo either side of each line reaches,
     as a multiple of the crisp core's width. 1 is off (a hard vector line);
     ~3.5 is a CRT drawing the same line.

     This is the whole of the "analog" in the analog grid, and it is why the
     dark scenes do not just get a white version of the light-card sheet. A
     printed drafting sheet has hard edges because ink either is or is not on
     paper. A phosphor display has a bright core that bleeds into its
     neighbourhood, and reading that bleed is most of how the eye knows it is
     looking at a screen rather than a page. Defaults to 1 so the light hero
     cards — which ARE printed sheets — are unaffected. */
  glow?: number;
  /** weight multiplier for the every-fifth rule; 1.6 for paper, ~2.4 for glass */
  majorBoost?: number;
  /* WHERE THE RADIAL FADE RUNS, as a fraction of the plane's half-size.

     The default 0.35 -> 1.0 pulls the sheet into a tight disc, which is right
     for a hero card: the subject is centred and the grid must die well before
     the card's edge or it shows a seam.

     A full-bleed scene wants the opposite — the grid should still be going when
     it leaves the frame, so it reads as ground that continues past the viewport
     rather than a rug the subject is standing on. That is a matter of pushing
     both numbers out AND making the plane bigger than the visible ground, not of
     literally unbounded geometry. */
  fadeStart?: number;
  fadeEnd?: number;
}): Ground {
  const size = opts?.size ?? 26;
  const step = opts?.step ?? 1;
  /* Dark INK, not cyan. The grid was a pale blue for a charcoal card; on a
     near-white card the drafting sheet has to be drawn the way the site's own
     light sections draw it — GRID_L is rgba(19,21,26,0.06), a near-black at very
     low alpha. A pale line on pale paper is nothing.

     Dark scenes pass PALETTE.grid (white) instead — see the note there on why
     the grid is white and not the accent. */
  const color = new THREE.Color(opts?.color ?? "#1A2733");
  const peak = opts?.opacity ?? 0.16;

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: color },
      uStep: { value: step },
      uSize: { value: size },
      uOpacity: { value: 0 },   // ramped by the scene's intro fade
      uPeak: { value: peak },
      uGlow: { value: Math.max(1, opts?.glow ?? 1) },
      uMajor: { value: opts?.majorBoost ?? 1.6 },
      uFade0: { value: opts?.fadeStart ?? 0.35 },
      uFade1: { value: opts?.fadeEnd ?? 1.0 },
    },
    vertexShader: `
      varying vec2 vP;
      void main() {
        vP = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec2 vP;
      uniform vec3 uColor;
      uniform float uStep, uSize, uOpacity, uPeak, uGlow, uMajor, uFade0, uFade1;
      void main() {
        /* Screen-space derivative keeps every line the same visual weight no
           matter how obliquely the floor is viewed — without this the lines
           near the horizon alias into noise. */
        vec2 g = abs(fract(vP / uStep - 0.5) - 0.5) / fwidth(vP / uStep);
        float core = 1.0 - min(min(g.x, g.y), 1.0);

        /* The halo. Same distance field, divided by uGlow so the line is
           measured as WIDER than it is drawn, then held well under the core so
           it bleeds rather than blurs. At uGlow = 1 this collapses back onto the
           core and costs nothing visually — which is what keeps the light cards
           looking like paper. */
        float halo = (1.0 - min(min(g.x, g.y) / uGlow, 1.0)) * 0.42;
        float line = max(core, halo);

        // heavier rule every 5th line, the way a real drafting sheet is ruled
        vec2 g5 = abs(fract(vP / (uStep * 5.0) - 0.5) - 0.5) / fwidth(vP / (uStep * 5.0));
        float core5 = 1.0 - min(min(g5.x, g5.y), 1.0);
        float halo5 = (1.0 - min(min(g5.x, g5.y) / uGlow, 1.0)) * 0.42;
        line = max(line, max(core5, halo5) * uMajor);

        // radial fade so the plane never shows an edge
        float d = length(vP) / (uSize * 0.5);
        float fade = 1.0 - smoothstep(uFade0, uFade1, d);

        float a = line * fade * uPeak * uOpacity;
        if (a < 0.002) discard;
        gl_FragColor = vec4(uColor, a);
      }`,
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = opts?.y ?? -1.0;
  mesh.renderOrder = -1;   // under everything; it is the floor
  return { mesh, material };
}

/** Ramp the grid with the scene's intro fade. */
export function setGroundOpacity(ground: Ground, o: number) {
  (ground.material as THREE.ShaderMaterial).uniforms.uOpacity.value = o;
}
