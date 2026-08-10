/* ---------------------------------------------------------------------------
   Vision scenes — metal.

   Two things were making everything read as cartoon, and neither was the
   geometry being simple:

     1. EVERY EDGE WAS RAZOR SHARP. A BoxGeometry corner is a perfect 90°, and
        nothing real is. A real edge catches a thin highlight along its whole
        length, and that highlight is most of what tells you a thing is metal.
        `metalBox` uses RoundedBoxGeometry so every edge picks one up.

     2. THE SURFACES WERE ONE FLAT VALUE. A MeshStandardMaterial with a solid
        colour and a single roughness number has nothing for the softbox to
        break up on, so it shades like a flat-shaded polygon. Real metal varies:
        brushed grain, rolling marks, scuffs, a dirt gradient. That variation
        matters far more in the ROUGHNESS map than in the colour map — it is
        the roughness breaking up that reads as metal.

   Everything here is canvas-generated, shared per scene, and deliberately
   cheap: these run on a homepage with four live contexts.
--------------------------------------------------------------------------- */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { addGrain } from "./noise";

/* `willReadFrequently: true` — the single most important attribute in this file.

   By default Chrome keeps a 2D canvas GPU-backed, and every `getImageData` is
   then a synchronous GPU->CPU READBACK that has to wait for the GPU to reach
   that point in its queue. Every roughness canvas here is read back TWICE (the
   speckle pass at the end of `roughnessCanvas`, then again by the Sobel in
   `normalFromHeight`), and these run on a page with up to four live WebGL
   contexts rendering at 45fps — so the readback queues behind actual frames.

   That is why the Viso Yard page's first load blocked for ~2.5s at a scene whose
   build timer reported 150ms, while the SAME scene standalone was fine: alone
   there is nothing for the readback to wait for. Chrome says it out loud in the
   console ("Multiple readback operations using getImageData are faster with the
   willReadFrequently attribute set to true") and it went unread for months.

   The flag moves the canvas to a software surface: drawing gets slightly slower,
   readback becomes a plain memory copy. Right trade for anything painted once
   and read, which is every canvas this function makes. Canvases that are only
   ever DRAWN and never read — the studio environment maps, container-vision's
   albedos — deliberately do NOT set it, since for those it is a pessimisation. */
function cv(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d", { willReadFrequently: true })!];
}

export type MetalKind =
  | "brushed"   // machined part, fine directional grain
  | "plate"     // structural steel, rolled, panel lines and weld seams
  | "painted"   // painted equipment housing, satin, chipped at edges
  | "galv";     // galvanised frame, spangled and blotchy

/** Albedo. Kept close to `base` — metal gets its character from roughness,
    not from a busy colour map, and a noisy albedo just looks dirty. */
function albedo(base: string, kind: MetalKind): THREE.CanvasTexture {
  const w = 512, h = 512;
  const [c, x] = cv(w, h);
  x.fillStyle = base;
  x.fillRect(0, 0, w, h);

  if (kind === "brushed") {
    for (let i = 0; i < 2600; i++) {
      const y = Math.random() * h;
      x.strokeStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
      x.lineWidth = Math.random() * 1.4;
      x.beginPath(); x.moveTo(0, y); x.lineTo(w, y + (Math.random() - 0.5) * 3); x.stroke();
    }
  } else if (kind === "plate") {
    // rolled-plate mottle plus panel joints
    for (let i = 0; i < 260; i++) {
      x.fillStyle = `rgba(${Math.random() > 0.5 ? "255,255,255" : "0,0,0"},${Math.random() * 0.05})`;
      x.beginPath();
      x.ellipse(Math.random() * w, Math.random() * h, 12 + Math.random() * 70, 8 + Math.random() * 34, Math.random() * 3, 0, Math.PI * 2);
      x.fill();
    }
    x.strokeStyle = "rgba(0,0,0,0.35)";
    x.lineWidth = 3;
    for (const fy of [0.33, 0.72]) {
      x.beginPath(); x.moveTo(0, h * fy); x.lineTo(w, h * fy); x.stroke();
    }
  } else if (kind === "galv") {
    // spangle — the crystalline blotches of hot-dip galvanising
    for (let i = 0; i < 420; i++) {
      const r = 6 + Math.random() * 26;
      x.fillStyle = `rgba(${Math.random() > 0.5 ? "255,255,255" : "0,0,0"},${0.02 + Math.random() * 0.07})`;
      x.beginPath();
      x.ellipse(Math.random() * w, Math.random() * h, r, r * (0.5 + Math.random()), Math.random() * 3, 0, Math.PI * 2);
      x.fill();
    }
  } else {
    // painted: satin, with the paint worn thin along one axis
    const gr = x.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "rgba(255,255,255,0.05)");
    gr.addColorStop(0.6, "rgba(0,0,0,0)");
    gr.addColorStop(1, "rgba(0,0,0,0.18)");
    x.fillStyle = gr;
    x.fillRect(0, 0, w, h);
  }

  // scuffs and chips, on everything — clean metal does not exist in a yard
  for (let i = 0; i < 90; i++) {
    x.fillStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.12})`;
    x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 26, 1 + Math.random() * 2);
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** Roughness. This is the map that actually sells it: broad soft blotches so
    the softbox reflection is never uniform across a face, plus fine directional
    grain. Written as greyscale — dark = polished, light = matte. */
function roughnessCanvas(kind: MetalKind, mid: number): HTMLCanvasElement {
  const w = 512, h = 512;
  const [c, x] = cv(w, h);
  const g = Math.round(mid * 255);
  x.fillStyle = `rgb(${g},${g},${g})`;
  x.fillRect(0, 0, w, h);

  // broad variation — the part that breaks up the highlight
  for (let i = 0; i < 200; i++) {
    const v = Math.random() > 0.5 ? 255 : 0;
    x.fillStyle = `rgba(${v},${v},${v},${0.04 + Math.random() * 0.10})`;
    x.beginPath();
    x.ellipse(Math.random() * w, Math.random() * h, 30 + Math.random() * 130, 20 + Math.random() * 90, Math.random() * 3, 0, Math.PI * 2);
    x.fill();
  }
  if (kind === "brushed") {
    for (let i = 0; i < 2200; i++) {
      const y = Math.random() * h;
      x.strokeStyle = `rgba(${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},255,${Math.random() * 0.07})`;
      x.lineWidth = Math.random() * 1.6;
      x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke();
    }
  }
  // fine speckle everywhere
  addGrain(x, w, h, 26);
  return c;
}

/** Roughness as a standalone texture, for materials that bring their own map. */
export function makeRoughnessMap(kind: MetalKind, mid: number): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(roughnessCanvas(kind, mid));
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/* Derive a NORMAL map from a height field by Sobel gradient.

   This is the map we were missing entirely, and its absence is most of why
   everything still read as flat: with only colour and roughness, a surface is
   geometrically smooth no matter how detailed it is painted. Rivets, weld
   seams, tread lugs and rolling marks have to perturb the SHADING NORMAL to
   exist at all — otherwise the key light sweeps across them without ever
   catching an edge.

   A real PBR texture set would ship this as authored data. Deriving it from a
   procedural height field is the honest substitute until we have one. */
function normalFromHeight(height: HTMLCanvasElement, strength = 2.2): THREE.CanvasTexture {
  const w = height.width, h = height.height;
  const src = height.getContext("2d")!.getImageData(0, 0, w, h).data;
  const [c, x] = cv(w, h);
  const out = x.createImageData(w, h);
  const at = (px: number, py: number) => {
    const ix = ((py + h) % h) * w + ((px + w) % w);
    return src[ix * 4] / 255;
  };
  for (let y = 0; y < h; y++) {
    for (let px = 0; px < w; px++) {
      // Sobel in both axes
      const dx =
        (at(px + 1, y - 1) + 2 * at(px + 1, y) + at(px + 1, y + 1)) -
        (at(px - 1, y - 1) + 2 * at(px - 1, y) + at(px - 1, y + 1));
      const dy =
        (at(px - 1, y + 1) + 2 * at(px, y + 1) + at(px + 1, y + 1)) -
        (at(px - 1, y - 1) + 2 * at(px, y - 1) + at(px + 1, y - 1));
      const nx = -dx * strength, ny = -dy * strength, nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      const o = (y * w + px) * 4;
      out.data[o] = ((nx / len) * 0.5 + 0.5) * 255;
      out.data[o + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      out.data[o + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      out.data[o + 3] = 255;
    }
  }
  x.putImageData(out, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export interface MetalOpts {
  base: string;
  kind?: MetalKind;
  metalness?: number;
  /** mid roughness the map varies around, 0..1 */
  rough?: number;
  /** how hard the derived normal map bites */
  normalStrength?: number;
  repeat?: [number, number];
  transparent?: boolean;
}

export interface Metal {
  material: THREE.MeshStandardMaterial;
  dispose: () => void;
}

/** A real metal material: varied albedo, varied roughness, honest metalness. */
/* Texture cache.

   Every card and every scene was regenerating the same maps from scratch:
   four hero cards on one page meant four identical "brushed #2E86BE" albedo
   canvases, four roughness canvases, and four Sobel normal derivations — and
   the Sobel pass alone measures ~15ms each on this machine. Textures are
   immutable once built and three is happy to share them across materials and
   even across renderers, so they are cached by their generating parameters and
   built at most once per page.

   Consequence to know: cached textures are deliberately NEVER disposed. They
   outlive the scene that first asked for them, which is the point — the next
   scene reuses them instead of paying for them again. Materials are still
   per-scene and still disposed. */
const texCache = new Map<string, THREE.Texture>();
function cached<T extends THREE.Texture>(key: string, make: () => T): T {
  const hit = texCache.get(key);
  if (hit) return hit as T;
  const t = make();
  texCache.set(key, t);
  return t;
}

/* Global accumulator (?perf): how much of a scene build is spent inside
   makeMetal at all. If this is small, the cost is geometry, not materials. */
/* The roughness CANVAS is cached separately from the textures made out of it,
   because it is used twice — once as the roughness map and once as the height
   field the normal map is derived from. */
const roughCanvasCache = new Map<string, HTMLCanvasElement>();

export function makeMetal(o: MetalOpts): Metal {
  /* THE CACHE ABOVE WAS NEVER CALLED. `cached()` was defined, documented, and
     credited in PERFORMANCE.md with "identical maps generated once per page" —
     and `makeMetal` invoked `albedo()`, `roughnessCanvas()` and
     `normalFromHeight()` directly, every single time. So every call regenerated
     two 512x512 canvases and a full Sobel pass, and nothing was ever shared,
     within a card or across the four of them.

     Wiring it up matters most ACROSS cards: Factory and Data both want brushed
     metal at similar roughness, and until now each paid for it in full.

     `repeat` is part of every key. These textures are now shared objects, and
     `repeat` is a property ON the texture — two callers wanting the same map at
     different repeats would silently fight over one, last writer winning. No
     caller passes `repeat` today; keying on it means none can ever be broken by
     it either.

     Roughness is quantised to 0.05. Callers pick 0.44 / 0.45 / 0.42 by eye and
     the difference is invisible, but each distinct float was its own canvas AND
     its own Sobel pass. */
  const kind = o.kind ?? "plate";
  const rough = Math.round((o.rough ?? 0.55) / 0.05) * 0.05;
  const strength = o.normalStrength ?? 2.2;
  const rep = o.repeat ? `${o.repeat[0]}x${o.repeat[1]}` : "1";

  const applyRepeat = <T extends THREE.Texture>(t: T) => {
    if (o.repeat) t.repeat.set(o.repeat[0], o.repeat[1]);
    return t;
  };

  const alb = cached(`alb|${o.base}|${kind}|${rep}`, () => applyRepeat(albedo(o.base, kind)));

  // the roughness canvas doubles as the height field the normals come from:
  // the things that scatter light are the same things that stand proud
  const rKey = `${kind}|${rough.toFixed(2)}`;
  let rghCanvas = roughCanvasCache.get(rKey);
  if (!rghCanvas) {
    rghCanvas = roughnessCanvas(kind, rough);
    roughCanvasCache.set(rKey, rghCanvas);
  }
  const canvas = rghCanvas;

  const rgh = cached(`rgh|${rKey}|${rep}`, () => {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return applyRepeat(t);
  });
  const nrm = cached(`nrm|${rKey}|${strength}|${rep}`, () => applyRepeat(normalFromHeight(canvas, strength)));
  const material = new THREE.MeshStandardMaterial({
    map: alb,
    roughnessMap: rgh,
    normalMap: nrm,
    normalScale: new THREE.Vector2(0.6, 0.6),
    roughness: 1,                       // the map is the roughness
    metalness: o.metalness ?? 0.72,
    envMapIntensity: 0.75,              // metal lives on its reflections
    transparent: o.transparent ?? true,
    opacity: o.transparent === false ? 1 : 0,
  });
  return {
    material,
    // textures are cached and shared — only the material is per-scene
    dispose: () => { material.dispose(); },
  };
}

/** A COLOUR VARIANT of an existing metal, sharing all three of its maps.
 *
 * `makeMetal` bakes `base` into the albedo canvas, so asking it for four
 * shades of one finish costs four albedos, four roughness canvases and four
 * Sobel normal derivations — for what the eye reads as one material in four
 * colours. This is the same fix already applied to the container skins
 * (generate neutral, tint via `material.color`): build the finish ONCE in
 * neutral grey and clone it per colour.
 *
 * `Material.clone()` copies map REFERENCES, so the maps are shared, not
 * duplicated. Clones are still per-scene materials and must still be disposed.
 *
 * Only use this on a metal generated from a NEUTRAL base. Tinting multiplies
 * the albedo, so tinting an already-coloured map gives the same wrong answer
 * that blue-times-kraft gave in the cardboard case.
 */
export function tintMetal(
  m: THREE.MeshStandardMaterial,
  color: string,
  o?: { metalness?: number },
): THREE.MeshStandardMaterial {
  const c = m.clone();
  c.color = new THREE.Color(color);
  if (o?.metalness !== undefined) c.metalness = o.metalness;
  return c;
}

/* THE CANONICAL FINISH, and a way to build it before anyone needs it.

   Every scene in this codebase now asks makeMetal for exactly these parameters
   and tints the result (see tintMetal). That means the FIRST scene to build on
   a page pays for two 512-square canvases and a full Sobel normal derivation
   — measured at ~15ms for the Sobel alone — and every scene after it gets a
   cache hit for free. Which scene draws the short straw depends on the build
   queue order, which is why per-card timings in PERFORMANCE.md stopped being
   comparable to each other.

   Warming it during idle moves that cost off the moment a visitor scrolls a
   scene into view, which is the moment they actually feel it. The material is
   thrown away; the TEXTURES are what the cache keeps. */
export const CANONICAL_BRUSHED = { base: "#9AA0A8", kind: "brushed", metalness: 0.7, rough: 0.45 } as const;

let warmed = false;
export function warmMetalCache() {
  if (warmed) return;
  warmed = true;
  makeMetal({ ...CANONICAL_BRUSHED }).dispose();
}

/* Rounded boxes.

   The single biggest fix for "blocky": a 2-3cm radius on every edge. It costs
   more triangles than a BoxGeometry but it is the difference between a shape
   and an object, because it gives the key light a continuous edge highlight to
   sit on. Segments are kept at 2 — at these sizes nothing more is visible. */
/* Geometry cache. A rounded box is ~500 triangles built from scratch every
   call, and these scenes make dozens with repeating dimensions (every carton,
   every container, every strut). Keyed to 3 decimal places so near-identical
   sizes share one buffer. Never disposed, for the same reason as the textures:
   the next scene reuses them. */
const geoCache = new Map<string, THREE.BufferGeometry>();

export function metalBox(
  w: number, h: number, d: number,
  m: THREE.Material | THREE.Material[],
  radius = Math.min(w, h, d) * 0.08,
) {
  const r = Math.max(0.004, Math.min(radius, Math.min(w, h, d) * 0.48));
  /* The cache above was declared and then never read — every call built a
     fresh RoundedBoxGeometry. That is not a rounding error at these counts:
     the Data card alone makes 96 of them (48 bezels + 48 screens) at exactly
     TWO distinct sizes, and Factory makes ~30 at about eight. Keyed to 3dp so
     near-identical sizes share one buffer.

     Shared geometry means a mesh must never dispose its own geometry — no
     subject does, they dispose materials only, so this is already safe. */
  const key = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${r.toFixed(3)}`;
  let geo = geoCache.get(key);
  if (!geo) {
    geo = new RoundedBoxGeometry(w, h, d, 2, r);
    /* SHARED — see the dispose guard in _vision/studio.ts. This geometry is
       handed to every caller asking for the same dimensions, so whoever unmounts
       first must not destroy it for everyone still using it. */
    geo.userData.shared = true;
    geoCache.set(key, geo);
  }
  return new THREE.Mesh(geo, m);
}

