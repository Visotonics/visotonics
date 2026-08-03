/* ---------------------------------------------------------------------------
   ASCII hero — the render pass. v4: A DENSITY FIELD, NOT A QUANTIZED RENDER.

   WHAT v3 GOT WRONG, and it was a whole-medium mistake rather than a tuning
   one. v3 took a hard-lit 3D render and quantized it: flat faces produced one
   luminance per face, one luminance per face produced uniform slabs of a single
   glyph, and a small centred form inside its own margins produced a museum
   piece — an object in a vitrine, lit, labelled, and dead.

   WHAT THE REFERENCE ACTUALLY IS. A DENSITY FIELD. Soft cloudy mass condensing
   into a silhouette. Internal clusters and voids that flow constantly, so the
   field breathes even while the form holds still. A halo of "?" glyphs
   scattered BEYOND the silhouette edge, thinning outward. "/" streaks through
   the mid-tones. "$" and "@" clumping in the core. And the form HUGE — bleeding
   off-frame, because a field's subject overflows its window.

   HOW v4 IS BUILT. The 3D forms survive only as SILHOUETTE + SHADING sources:
   scene.tsx packs a hard mask in R and its shape-lighting in G. This pass
   blurs R into a soft density envelope, multiplies it by shading times flowing
   fbm to get interior structure, and grows the fringe out of a wide halo tap of
   R. The luminance the ramp quantizes is therefore CONSTRUCTED HERE, the
   reference's way, and is no longer a photograph of a polygon.

   TYPE STAYS LEGIBLE VIA SOLID BLACK CHIPS BEHIND IT, not by dimming the
   field. The reference never dims its field; that is precisely why its field
   can be rich. See the lab page's panel 02.

   WHAT THIS IS. A post-process, not an animation technique. The scene is
   rendered into a tiny offscreen target, one texel per character cell, and a
   fullscreen quad then draws a glyph per texel chosen by that texel's
   brightness. Anything that can be rendered can be ASCII-ified — the pass has
   no opinion about its subject (v1 cycled four subjects, v2 turns one).

   WHY IT IS CHEAPER THAN THE HERO IT REPLACES. The current hero runs five
   separate WebGL contexts at card size. This is ONE context whose 3D pass
   renders at roughly 145x80 — about 12k pixels against the ~2M those five
   cards cover between them — plus a single fullscreen quad. The expensive part
   of a scene here is no longer fill, it is the subject build, and that already
   happens once during idle.

   ONE TEXEL PER CELL is the whole trick. Render at exactly the character grid's
   resolution and the GPU's own bilinear downsample does the luminance averaging
   for free: no manual box filter, no second pass, and the "resolution" of the
   effect is set by one number.

   IT IS ALSO THE SAME AESTHETIC AS THE ANALOG GRID, NOT A PIVOT. A monospace
   phosphor field and a white CAD ruling are the same 1990s technical display;
   the site already speaks it, down to IBM Plex Mono. And it carries a real
   claim rather than a texture: the product reads existing CCTV, so a scene
   resolved into characters is the honest picture of vision-as-data — this is
   what the machine sees.
--------------------------------------------------------------------------- */
import * as THREE from "three";

/* The ramp, darkest to lightest. Still ordered by INK COVERAGE, not by ASCII
   value — the eye reads a character field as a greyscale image, so a glyph that
   is wrong for its slot shows up as noise in a gradient.

   THE VOCABULARY IS NOW THE REFERENCE'S, not a generic coverage ramp. "?" for
   the uncertain fringe, "/" for flow, "$" and "@" for mass. The slash sits
   EARLY on purpose: it is the streak glyph, and streaks belong in the low
   mid-tones where the field is still deciding, not up in the core.

   THERE IS NO SPACE IN IT, and that is the single most important character in
   the ramp — by being absent. A first pass began with " " on the reasoning that
   the darkest level should be genuinely empty, and the result was a black
   rectangle: everything below the first threshold discarded, and since an
   unlit background is most of the frame, most of the frame vanished.

   It is also wrong for the look. The field this is modelled on carries glyphs
   edge to edge — the dark areas are sparse marks, not emptiness, and that
   continuous character field IS the aesthetic. A terminal does not have holes
   in it. So the darkest level is "." and the frame always reads as a display
   with something on it. */
const RAMP = "./?=+*$%@";

/* The "?" slot, addressed DIRECTLY by the fringe logic in the shader rather
   than reached through the luminance ramp — the fringe is not a brightness, it
   is a statement ("something might be here"), so it picks its glyph by name.
   IF THE RAMP CHANGES, THIS MUST FOLLOW IT. */
const Q_IDX = 2.0;

/* Cell metrics. IBM Plex Mono's advance is 0.6em, so 11x18 keeps the character
   very close to its natural proportion (11/18 = 0.611) — a cell that fights the
   font's aspect makes every glyph look stretched and the field reads as a
   bitmap rather than as type.

   BIGGER THAN v3's 8x13, deliberately: chunkier cells make a more ICONIC field,
   and land the hero at roughly the reference's ~90 columns. A finer grid buys
   detail this subject does not have and costs the field its graphic weight. */
export const CELL_W = 11;
export const CELL_H = 18;

/* THE GLYPH ATLAS is generated once and cached for the life of the page. It is
   a canvas, so it follows the house rule: cached module-level, never disposed
   by a scene, and warmed during idle rather than painted on the scroll path.
   No getImageData anywhere in here, so it does NOT need willReadFrequently —
   that flag makes drawing slower and only pays for readback. */
let atlasCache: THREE.CanvasTexture | null = null;

export function asciiAtlas(): THREE.CanvasTexture {
  if (atlasCache) return atlasCache;

  const n = RAMP.length;
  /* 4x supersample. The atlas is sampled with LinearFilter at cell size, and a
     glyph rasterised at exactly 11x18 has no subpixel information left to
     filter — the field ends up crunchy and the lighter glyphs break up. Drawing
     at 4x and letting the GPU minify gives the characters a soft phosphor edge,
     which is the look, and costs one 396x72 canvas. */
  const S = 4;
  const cw = CELL_W * S;
  const ch = CELL_H * S;

  const cv = document.createElement("canvas");
  cv.width = cw * n;
  cv.height = ch;
  const x = cv.getContext("2d")!;

  x.clearRect(0, 0, cv.width, ch);
  x.fillStyle = "#FFFFFF";
  x.textAlign = "center";
  x.textBaseline = "middle";
  /* Named directly rather than through the CSS variable: this canvas is painted
     outside the document's style context, so `var(--font-plex-mono)` would not
     resolve and the browser would silently fall back to a proportional face —
     which in a monospace grid is instantly visible as ragged columns. */
  x.font = `500 ${Math.round(ch * 0.78)}px "IBM Plex Mono", ui-monospace, Menlo, monospace`;

  for (let i = 0; i < n; i++) {
    x.fillText(RAMP[i], i * cw + cw / 2, ch / 2 + ch * 0.02);
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;   // a 1-row atlas has nothing useful to mip
  tex.colorSpace = THREE.SRGBColorSpace;
  atlasCache = tex;
  return tex;
}

/** Generate the atlas ahead of time. Called from the idle warm chain. */
export function warmAsciiAtlas() { asciiAtlas(); }

export interface AsciiPass {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  material: THREE.ShaderMaterial;
  /** call on resize: sets the cell grid and the render target's size */
  setSize: (w: number, h: number, target: THREE.WebGLRenderTarget) => void;
  dispose: () => void;
}

/**
 * The fullscreen pass. `srcA` and `srcB` are the two low-res render targets the
 * 3D was drawn into — the form currently held and the form being morphed into.
 * This reads them one texel per cell, dissolves between them, and writes glyphs.
 */
export function createAsciiPass(
  srcA: THREE.Texture,
  srcB: THREE.Texture,
  tint: THREE.Color,
): AsciiPass {
  const material = new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    transparent: true,
    uniforms: {
      uSrc: { value: srcA },
      uSrcB: { value: srcB },
      uMix: { value: 0 },
      uTime: { value: 0 },
      uAtlas: { value: asciiAtlas() },
      uCells: { value: new THREE.Vector2(1, 1) },
      uRamp: { value: RAMP.length },
      uTint: { value: tint },
      uOpacity: { value: 0 },
      /* 1.0 — v1 ran this at 1.9 to rescue a physically-lit source that came
         back nearly black, and when v2 switched to a shape-lit override that
         outputs bright luminance BY DESIGN, the leftover gain clamped the whole
         subject onto the ramp's top two glyphs: a flat slab, no faces, no
         corrugation. The gain exists to map the SOURCE's real range onto the
         ramp — when the source is authored to already span 0..1, the correct
         gain is none. */
      uGain: { value: 1.0 },
      /* The "?" index, handed to the shader rather than baked into the GLSL, so
         the ramp and the fringe glyph can only ever be edited together. */
      uQ: { value: Q_IDX },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }`,
    fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D uSrc, uSrcB, uAtlas;
      uniform vec2 uCells;
      uniform float uRamp, uOpacity, uGain, uMix, uTime, uQ;
      uniform vec3 uTint;

      float vhash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float vnoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(vhash(i), vhash(i + vec2(1.0, 0.0)), u.x),
                   mix(vhash(i + vec2(0.0, 1.0)), vhash(i + vec2(1.0, 1.0)), u.x), u.y);
      }

      /* Three octaves is all a character grid can spend. Cell coordinates are
         already the coarsest lattice in the pipeline, so a fourth octave lands
         entirely below one cell and averages back out to nothing — paid for,
         invisible. The 2.03 lacunarity is off an exact 2.0 so the octaves do not
         phase-lock into a visible plaid at the cell scale. */
      float fbm(vec2 p) {
        float a = 0.5;
        float r = 0.0;
        for (int i = 0; i < 3; i++) {
          r += a * vnoise(p);
          p = p * 2.03 + vec2(17.3, 9.1);
          a *= 0.5;
        }
        return r;
      }

      /* THE SILHOUETTE, BLURRED. R comes out of the 3D pass as a hard 0/1 mask,
         and a hard step quantizes into the slab-edged shape v3 was made of. A
         five-tap cross over neighbouring CELLS gives the mask soft shoulders, so
         the form has an envelope that fades rather than a boundary that stops —
         which is what lets glyph density, not an outline, draw the edge. */
      float softMask(sampler2D s, vec2 uv, vec2 px) {
        float m = texture2D(s, uv).r * 0.44;
        m += texture2D(s, uv + vec2(px.x, 0.0)).r * 0.14;
        m += texture2D(s, uv - vec2(px.x, 0.0)).r * 0.14;
        m += texture2D(s, uv + vec2(0.0, px.y)).r * 0.14;
        m += texture2D(s, uv - vec2(0.0, px.y)).r * 0.14;
        return m;
      }

      /* THE HALO. A wide ring tap, two to three cells out, deliberately with no
         centre sample: a cell inside the body sees roughly the same value as a
         cell just outside it, so halo alone is useless — it only becomes the
         fringe once the body is SUBTRACTED from it down in main(). */
      float halo(sampler2D s, vec2 uv, vec2 px) {
        float m = 0.0;
        m += texture2D(s, uv + vec2( 3.0 * px.x, 0.0)).r;
        m += texture2D(s, uv - vec2( 3.0 * px.x, 0.0)).r;
        m += texture2D(s, uv + vec2(0.0,  3.0 * px.y)).r;
        m += texture2D(s, uv - vec2(0.0,  3.0 * px.y)).r;
        m += texture2D(s, uv + vec2( 2.2 * px.x,  2.2 * px.y)).r;
        m += texture2D(s, uv + vec2(-2.2 * px.x,  2.2 * px.y)).r;
        m += texture2D(s, uv + vec2( 2.2 * px.x, -2.2 * px.y)).r;
        m += texture2D(s, uv + vec2(-2.2 * px.x, -2.2 * px.y)).r;
        return m * 0.125;
      }

      void main() {
        /* One sample at the CELL CENTRE, not at the fragment. Sampling per
           fragment would read a different value across the glyph and the
           character would be lit unevenly — the cell must be a single tone or
           it stops reading as a character. */
        vec2 cell = floor(vUv * uCells);
        vec2 src  = (cell + 0.5) / uCells;

        /* ONE CELL, IN UV. Every neighbourhood tap below is expressed in these
           units, so the blur and the halo are measured in CHARACTERS rather than
           in pixels and hold their look at any viewport size. */
        vec2 px = 1.0 / uCells;

        /* THE THREE DERIVED FIELDS, per source. mask is the soft envelope, shade
           is the raw shape-lighting from G, hal is the wide ring. */
        float mA = softMask(uSrc,  src, px);
        float sA = texture2D(uSrc,  src).g;
        float hA = halo(uSrc,  src, px);

        /* THE B SIDE IS BRANCHED AWAY AT REST. v3 sampled B unconditionally and
           the note here defended it: one wasted fetch is cheaper than a shader
           variant swap, which is a program recompile, and this repo has paid for
           exactly that on screen before (the seal note in
           container-vision/scene.tsx — 55ms warm, ~2.4s cold).

           That argument still holds and this is NOT a variant swap: it is one
           dynamic branch on a uniform, so there is one program and no recompile
           ever. What changed is the price of being wrong. v4 reads FOURTEEN
           texels per source (5 blur + 1 for G + 8 halo), not one, and paying for
           fourteen dead fetches on every fragment of every resting frame is a
           different order of waste. Uniform-branch coherence means the whole
           draw takes the same side, so the skip is real. */
        float mB = 0.0;
        float sB = 0.0;
        float hB = 0.0;
        if (uMix > 0.001) {
          mB = softMask(uSrcB, src, px);
          sB = texture2D(uSrcB, src).g;
          hB = halo(uSrcB, src, px);
        }

        /* THE MORPH. Not a crossfade — a blotchy noise dissolve, where patches
           of the old form linger while patches of the new one arrive.

           The noise is evaluated on CELL coordinates, not on the fragment, so
           every fragment inside one character gets the same threshold and whole
           characters flip together. A half-morphed glyph is not a thing: the
           cell is the atom of this medium, and a dissolve front that cut through
           the middle of a character would read as a rendering fault.

           e is the softness of the dissolve front — 0 would make it a hard
           travelling edge, large values collapse it back into a crossfade. The
           t2 remap stretches uMix across that softness so that uMix 0 is fully
           A and uMix 1 is fully B even at the noise's extremes; without it the
           cells sitting at n near 0 or 1 would never finish their transition and
           the field would arrive at its dwell still speckled with the last form.

           IT BLENDS THE DERIVED FIELDS, NOT RAW PIXELS — that is the v4 change.
           A dissolving cell now carries a whole density REGION across: its
           envelope, its interior shading and its fringe all arrive together, so
           a mid-morph patch is a piece of coherent field rather than a lone
           texel of somebody else's render. */
        float n  = vnoise(cell * 0.11);
        float e  = 0.22;
        float t2 = uMix * (1.0 + 2.0 * e) - e;
        float m  = smoothstep(n - e, n + e, t2);

        float mask  = mix(mA, mB, m);
        float shade = mix(sA, sB, m);
        float hal   = mix(hA, hB, m);

        /* THE INTERIOR IS SHADING TIMES FLOWING NOISE, and this single line is
           the whole difference between v3 and v4. Shading alone is what a flat
           face gives you: one number across the whole face, one glyph across the
           whole face, a slab. Multiplied into drifting fbm it becomes clusters
           and voids — the field BREATHES even while a form is dwelling and not
           moving at all, which is the reference's constant low churn.

           flow domain-warps clus rather than merely adding to it, and that is
           where the mid-tone STREAKING comes from: warping drags the second
           octave field along flow's gradient, so its features elongate in the
           direction of travel instead of boiling in place. Streaks are why the
           slash sits early in the ramp.

           The two rates are deliberately unequal and non-harmonic (0.10/0.055
           against 0.03/0.05, and opposed in sign) so the pattern never returns
           to a state the eye has already filed away. */
        float flow = fbm(cell * 0.06 + vec2(uTime * 0.10, -uTime * 0.055));
        float clus = fbm(cell * 0.16 - vec2(uTime * 0.03, uTime * 0.05) + flow * 1.8);
        /* Rendered and re-tuned: the first pass (0.26 + 0.42s + 0.55c) floored
           the interior at ~0.5, and a field whose body never goes DARK is a
           carpet — the reference separates its form from the ambient with
           density CONTRAST, not an outline. Lower base, shading kept modest,
           and the clouds raised to a power so their voids actually void. */
        float interior = 0.10 + 0.34 * shade + 0.85 * pow(clus, 1.6);
        float lum = clamp(mask * interior * uGain, 0.0, 1.0);

        /* PER-CELL DITHER. Without it every cell of flat background resolves to
           the same glyph and the empty area tiles into a visible lattice — which
           reads as a texture swatch, not as a display. A hash of the cell's own
           coordinates nudges each one across a threshold or not, scattering the
           dark end into the mix of sparse marks the look depends on. Static, not
           animated: a field that crawls while the subject is still reads as
           video noise and pulls focus off the type this sits behind. */
        /* THE BOIL. activity is a parabola that peaks at uMix 0.5 and is zero at
           both ends, so the dither amplitude swells while the field is deciding
           what it is and settles the instant it knows. It is the difference
           between a dissolve that looks like a wipe and one that looks like the
           display itself churning. At rest activity is 0 and amp is 0.10 —
           exactly the dither the field had before the morph existed. */
        float activity = 4.0 * uMix * (1.0 - uMix);
        float amp = 0.10 + 0.30 * activity;

        float h = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
        float idx = floor(clamp(lum + (h - 0.5) * amp, 0.0, 1.0) * (uRamp - 1.0) + 0.5);

        /* THE DARK END, IN TWO STAGES. Everything the ramp puts on its floor is
           either FRINGE or AMBIENCE, and v4 has to tell them apart.

           STAGE ONE — THE FRINGE, and this is the reference's signature. fr is
           the halo MINUS the body: a cell deep inside the form has both, so it
           cancels; a cell far outside has neither, so it is zero; a cell in the
           band just OUTSIDE the silhouette has halo without body, and only there
           does fr rise. That band gets scattered "?" marks, and the survival
           threshold slides from 0.94 down to 0.58 as fr climbs, so the scatter
           thickens as it approaches the edge. This is what makes the form look
           CONDENSED OUT OF the field rather than pasted onto it — the mass does
           not stop at its outline, it trails off into uncertainty.

           The glyph is addressed by uQ rather than by brightness, because the
           fringe is a statement and not a tone. Its own lum is set, not
           inherited, so the marks brighten toward the edge with fr.

           STAGE TWO — beyond the fringe the old twinkling ambient survives, and
           SPARSER than before: 0.90, up from v3's 0.88, because the fringe is
           now spending marks of its own and two sparse populations on top of
           each other would carpet the frame again. Its hash takes quantised time
           as an input, so the surviving set reshuffles roughly every 1.25s —
           DISCRETELY, because a character is either printed in a cell or it is
           not, which is how a terminal behaves. The cell coordinate is scaled by
           1.7 to decorrelate it from the fringe hash, which reads the same cell
           on the same time quantum. */
        if (idx < 0.5) {
          float fr = clamp(hal * 1.5 - mask * 2.0, 0.0, 1.0);
          float fh = vhash(cell + floor(uTime * 0.7));
          if (fr > 0.04 && fh > mix(0.94, 0.58, fr)) {
            idx = uQ;
            lum = 0.20 + 0.32 * fr;
          } else {
            float h2 = vhash(cell * 1.7 + floor(uTime * 0.8));
            if (h2 < 0.96) discard;
            idx = 1.0 + floor((h2 - 0.90) * 20.0);   // 1..2
            lum = 0.10;
          }
        }

        // position inside the cell, then inside that glyph's slot in the atlas
        vec2 f = fract(vUv * uCells);
        vec2 auv = vec2((idx + f.x) / uRamp, 1.0 - f.y);

        float ink = texture2D(uAtlas, auv).a;

        /* Brightness rides the glyph as well as the ramp. Two objects can land
           on the same character and still separate, which is what stops large
           flat areas going dead — and it is what a phosphor display actually
           does, since a brighter beam blooms wider as well as choosing a
           denser shape. */
        /* Floor at 0.30, down from 0.45: with the sparse-ambient branch above
           the dark end is carried by few cells, and those read better dim —
           the subject's own glyphs then own the top of the brightness range. */
        float v = ink * (0.30 + 0.70 * lum) * uOpacity;
        if (v < 0.004) discard;
        gl_FragColor = vec4(uTint * (0.55 + 0.45 * lum), v);
      }`,
  });

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  scene.add(quad);

  const setSize = (w: number, h: number, target: THREE.WebGLRenderTarget) => {
    const cols = Math.max(8, Math.round(w / CELL_W));
    const rows = Math.max(8, Math.round(h / CELL_H));
    material.uniforms.uCells.value.set(cols, rows);
    // ONE TEXEL PER CELL — see the header note
    target.setSize(cols, rows);
  };

  return {
    scene,
    camera,
    material,
    setSize,
    dispose: () => {
      quad.geometry.dispose();
      material.dispose();
      // the atlas is cached and shared; it is deliberately NOT disposed here
    },
  };
}
