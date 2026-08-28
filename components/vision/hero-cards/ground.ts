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
  /** Present only when `opts.surface` was supplied: the solid floor plane
      under the grid, and the setter for its opacity ramp. A later pass wires
      these into a scene's intro fade the same way `setGroundOpacity` already
      drives the grid. Both are optional so every existing caller — which
      passes no `surface` — is completely unaffected. */
  surfaceMesh?: THREE.Mesh;
  setSurfaceOpacity?: (o: number) => void;
  /** Present only when `opts.vignette` was supplied: the radial falloff mesh
      drawn just above the surface, and its opacity setter. */
  vignetteMesh?: THREE.Mesh;
  setVignetteOpacity?: (o: number) => void;
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
  /* OPTIONAL SOLID FLOOR, under the grid. Every subject on the home hero
     currently floats in black void because the grid alone at opacity
     0.11–0.20 has nothing to sit on — it is measurement lines with no
     surface for them to measure. Passing a material here adds a second plane
     just below the grid, same size, same radial framing, so the grid reads
     as "lines drawn on a floor" instead of "lines drawn on nothing". Caller
     owns the material (dispose it themselves); this function only positions
     it and hands back an opacity setter matching `setGroundOpacity`'s shape,
     for a later pass to ramp on the same intro fade.

     NOT wired to any subject by this pass — see the file header. */
  surface?: THREE.Material;
  /* OPTIONAL VIGNETTE: a second, unlit falloff plane drawn just ABOVE the
     surface (and above the grid) that fades from fully transparent at the
     centre to the given colour at the edge. This is what turns "floor
     plane that stops at a rectangle" into "floor that dissolves into the
     backdrop" — the same fog trick lead-card/site.ts leans on, done here
     with an explicit colour since these cards have no scene fog to lean on.
     `color` should be the scene's own backdrop colour so the seam is
     invisible; `start`/`end` are fractions of the plane's half-size, same
     convention as `fadeStart`/`fadeEnd` above. */
  vignette?: { color: string; start?: number; end?: number };
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

  const groundY = opts?.y ?? -1.0;
  let surfaceMesh: THREE.Mesh | undefined;
  let setSurfaceOpacity: ((o: number) => void) | undefined;
  if (opts?.surface) {
    // BELOW the grid line-for-line: same plane size so its own edge (if it
    // has one — most callers will hand in a repeating map with no fade of
    // its own) sits exactly where the grid's edge does, and a hair lower in
    // Y so it never z-fights the lines drawn over it.
    const surfGeo = new THREE.PlaneGeometry(size, size);
    surfaceMesh = new THREE.Mesh(surfGeo, opts.surface);
    surfaceMesh.rotation.x = -Math.PI / 2;
    surfaceMesh.position.y = groundY - 0.008;
    surfaceMesh.renderOrder = -3;
    surfaceMesh.castShadow = false;
    surfaceMesh.receiveShadow = false;

    /* RADIAL DISSOLVE, injected into whatever material the caller handed in.
       This is what actually hides the plane's edge, and it replaced a flat
       coloured `vignette` plane that could not.

       Why the old approach could not work: the vignette painted ONE colour
       over the floor's outer ring, chosen to match the backdrop. But the
       backdrop is not one colour — studio.ts's cyclorama composites a glow
       pool over its ramp (`col + cGlow*g*0.55`, with g falling off as
       pow(dot(...), 3.4)), so what sits behind the floor's edge is a
       GRADIENT, brightest directly behind the subject and decaying toward
       the frame edges. A flat fill matched against a gradient leaves a seam
       somewhere by construction — tuning the hex only moved which part of
       the arc showed it. On these cameras (looking down ~6.7deg through a
       30deg vfov) that seam lands near frame CENTRE, which is why it read as
       a hard horizon line straight across every card.

       Fading the surface's own alpha instead means the cyclorama shows
       through it directly, so the match is exact everywhere for free, with
       no colour to keep in sync if the backdrop is ever re-graded.

       Implemented via onBeforeCompile rather than a bespoke ShaderMaterial so
       the caller keeps its MeshStandardMaterial — its map, roughness and the
       scene's real lighting all still apply; only alpha is modified. World
       position is taken from the plane's own local xy (it is a flat,
       axis-aligned plane, so local radius IS world radius) which avoids
       depending on any varying three may or may not provide. */
    const surfMat = opts.surface as THREE.Material & {
      transparent?: boolean;
      onBeforeCompile?: (shader: { vertexShader: string; fragmentShader: string; uniforms: Record<string, { value: unknown }> }) => void;
      customProgramCacheKey?: () => string;
    };
    const fadeStart = opts.vignette?.start ?? 0.55;
    const fadeEnd = opts.vignette?.end ?? 1.0;
    surfMat.transparent = true;
    surfMat.onBeforeCompile = (shader) => {
      shader.uniforms.uFadeSize = { value: size };
      shader.uniforms.uFadeStart = { value: fadeStart };
      shader.uniforms.uFadeEnd = { value: fadeEnd };
      shader.vertexShader =
        "varying vec2 vGroundXY;\n" +
        shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n  vGroundXY = position.xy;");
      shader.fragmentShader =
        "varying vec2 vGroundXY;\nuniform float uFadeSize;\nuniform float uFadeStart;\nuniform float uFadeEnd;\n" +
        shader.fragmentShader.replace(
          "#include <dithering_fragment>",
          "#include <dithering_fragment>\n" +
            "  float gd = length(vGroundXY) / (uFadeSize * 0.5);\n" +
            "  gl_FragColor.a *= 1.0 - smoothstep(uFadeStart, uFadeEnd, gd);"
        );
    };
    // three caches compiled programs by material type + defines; this material
    // now has injected code, so give it its own key or a sibling Standard
    // material could be handed this program (or this one theirs).
    surfMat.customProgramCacheKey = () => `ground-radial-fade-${size}-${fadeStart}-${fadeEnd}`;
    setSurfaceOpacity = (o: number) => {
      const m = opts.surface as THREE.Material & { opacity?: number };
      if (typeof m.opacity === "number") m.opacity = o;
    };
  }

  let vignetteMesh: THREE.Mesh | undefined;
  let setVignetteOpacity: ((o: number) => void) | undefined;
  /* The flat coloured vignette plane is SUPERSEDED by the radial alpha
     dissolve injected into the surface material above, and is now built only
     when there is no surface to dissolve. Running both would be actively
     worse than either: the surface would correctly fade to transparent, and
     then this plane would paint an opaque flat colour back over the same
     ring, reintroducing exactly the seam the dissolve exists to remove.

     `opts.vignette` is still read — its `start`/`end` now drive the dissolve
     (see above), so no caller has to change. Callers that pass `vignette`
     WITHOUT a `surface` (none today, but the option is public) keep the old
     behaviour, which is correct for them: with no surface there is no alpha
     to fade, so a painted falloff is the only tool available. */
  if (opts?.vignette && !opts?.surface) {
    // Same radial distance field as the grid's own fade, reused rather than
    // reinvented, but driving a flat colour fill instead of line alpha —
    // this plane's job is to COVER the surface's edge, not measure it.
    const vColor = new THREE.Color(opts.vignette.color);
    const vMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uColor: { value: vColor },
        uSize: { value: size },
        uOpacity: { value: 0 },
        uStart: { value: opts.vignette.start ?? 0.55 },
        uEnd: { value: opts.vignette.end ?? 1.0 },
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
        uniform float uSize, uOpacity, uStart, uEnd;
        void main() {
          float d = length(vP) / (uSize * 0.5);
          float a = smoothstep(uStart, uEnd, d) * uOpacity;
          if (a < 0.002) discard;
          gl_FragColor = vec4(uColor, a);
        }`,
    });
    const vGeo = new THREE.PlaneGeometry(size, size);
    vignetteMesh = new THREE.Mesh(vGeo, vMaterial);
    vignetteMesh.rotation.x = -Math.PI / 2;
    /* BELOW THE GRID, not above it. At groundY + 0.002 / renderOrder 0 this
       plane sorted as ordinary transparent geometry and painted over anything
       else drawn at ground level — most visibly Factory's sight-cone footprint
       pool, which is exactly the "black thing on top of the scan line". It
       only ever needed to cover the SURFACE's edge, so it belongs between the
       surface and the grid, and drawn before either. */
    vignetteMesh.position.y = groundY - 0.004;
    vignetteMesh.renderOrder = -2;
    vignetteMesh.castShadow = false;
    vignetteMesh.receiveShadow = false;
    setVignetteOpacity = (o: number) => { vMaterial.uniforms.uOpacity.value = o; };
  }

  return { mesh, material, surfaceMesh, setSurfaceOpacity, vignetteMesh, setVignetteOpacity };
}

/** Ramp the grid with the scene's intro fade. */
export function setGroundOpacity(ground: Ground, o: number) {
  (ground.material as THREE.ShaderMaterial).uniforms.uOpacity.value = o;
}
