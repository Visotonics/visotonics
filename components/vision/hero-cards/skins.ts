/* ---------------------------------------------------------------------------
   Home hero cards — painted skins.

   At card size the silhouette is a box no matter what you model, so the
   surface has to do all the work: a shipping container has to LOOK like
   corrugated painted steel with stencilled markings, and a carton has to look
   like kraft board with taped seams. Both are drawn to canvas here rather than
   modelled, because at ~320px the geometry to do it properly costs far more
   than it shows.

   Every skin is drawn once per scene and shared by every box in it.
--------------------------------------------------------------------------- */
import * as THREE from "three";

// willReadFrequently — every skin here ends in grain(), which is a getImageData
// round trip. See the long note on the same call in _vision/metal.ts: without
// this each readback stalls on the GPU behind the live scenes' frames.
function cv(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d", { willReadFrequently: true })!];
}

function grain(ctx: CanvasRenderingContext2D, w: number, h: number, amt: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amt;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

/* Same caching rationale as _vision/metal.ts: these canvases are identical
   between cards and between mounts, and a container skin is three textures.
   Built at most once per page, never disposed, shared by every material that
   asks for the same parameters. */
const skinCache = new Map<string, THREE.CanvasTexture>();
const cached = (key: string, make: () => THREE.CanvasTexture) => {
  const hit = skinCache.get(key);
  if (hit) return hit;
  const t = make();
  skinCache.set(key, t);
  return t;
};

const finish = (c: HTMLCanvasElement) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

/* ---- shipping container ------------------------------------------------ */

/** The long side: corrugation, top and bottom rails, an owner-code stencil.
    The corrugation is painted as a repeating light/shadow ramp — at this size
    that reads as a real profile, and it costs one texture instead of ~40 rib
    meshes per container across a 16-container stack. */
function containerSideRaw(base: string, ink = "rgba(226,232,240,0.82)"): THREE.CanvasTexture {
  const w = 1024, h = 420;
  const [c, x] = cv(w, h);
  x.fillStyle = base;
  x.fillRect(0, 0, w, h);

  // corrugation: each period is a lit face, a crest, a shaded face, a valley
  const period = 34;
  for (let i = 0; i < w; i += period) {
    const g = x.createLinearGradient(i, 0, i + period, 0);
    g.addColorStop(0.00, "rgba(0,0,0,0.34)");
    g.addColorStop(0.22, "rgba(255,255,255,0.10)");
    g.addColorStop(0.50, "rgba(255,255,255,0.16)");
    g.addColorStop(0.78, "rgba(0,0,0,0.10)");
    g.addColorStop(1.00, "rgba(0,0,0,0.34)");
    x.fillStyle = g;
    x.fillRect(i, h * 0.10, period, h * 0.80);
  }

  // top and bottom rails — flat, unribbed, slightly darker
  x.fillStyle = "rgba(0,0,0,0.30)";
  x.fillRect(0, 0, w, h * 0.10);
  x.fillRect(0, h * 0.90, w, h * 0.10);
  x.fillStyle = "rgba(255,255,255,0.06)";
  x.fillRect(0, h * 0.10 - 3, w, 3);

  // stencilled owner code + ISO type, worn
  x.fillStyle = ink;
  x.textBaseline = "middle";
  x.font = "600 52px ui-monospace, 'SF Mono', Menlo, monospace";
  x.fillText("VSTU 907032 1", 54, h * 0.34);
  x.font = "600 36px ui-monospace, 'SF Mono', Menlo, monospace";
  x.fillText("22G1", 54, h * 0.50);

  // rust freckles and paint wear
  for (let i = 0; i < 90; i++) {
    x.fillStyle = `rgba(122,74,48,${0.10 + Math.random() * 0.35})`;
    x.beginPath();
    x.ellipse(Math.random() * w, h * (0.12 + Math.random() * 0.78), 2 + Math.random() * 9, 1 + Math.random() * 4, 0, 0, Math.PI * 2);
    x.fill();
  }
  grain(x, w, h, 14);
  return finish(c);
}

/** The door end: two leaves, four locking bars, a cross-member. */
function containerEndRaw(base: string): THREE.CanvasTexture {
  const w = 420, h = 420;
  const [c, x] = cv(w, h);
  x.fillStyle = base;
  x.fillRect(0, 0, w, h);
  // leaf split
  x.fillStyle = "rgba(0,0,0,0.45)";
  x.fillRect(w / 2 - 3, h * 0.10, 6, h * 0.80);
  // locking bars
  for (const fx of [0.16, 0.34, 0.66, 0.84]) {
    x.fillStyle = "rgba(0,0,0,0.42)";
    x.fillRect(w * fx - 5, h * 0.12, 10, h * 0.76);
    x.fillStyle = "rgba(255,255,255,0.10)";
    x.fillRect(w * fx - 5, h * 0.12, 3, h * 0.76);
    // cam handle
    x.fillStyle = "rgba(0,0,0,0.5)";
    x.fillRect(w * fx - 12, h * 0.48, 24, 16);
  }
  x.fillStyle = "rgba(0,0,0,0.30)";
  x.fillRect(0, 0, w, h * 0.10);
  x.fillRect(0, h * 0.90, w, h * 0.10);
  grain(x, w, h, 14);
  return finish(c);
}

/** Roof: shallow ribs running the other way, plus pooled dirt. */
function containerRoofRaw(base: string): THREE.CanvasTexture {
  const w = 512, h = 256;
  const [c, x] = cv(w, h);
  x.fillStyle = base;
  x.fillRect(0, 0, w, h);
  for (let i = 0; i < h; i += 18) {
    x.fillStyle = "rgba(0,0,0,0.18)";
    x.fillRect(0, i, w, 7);
  }
  for (let i = 0; i < 40; i++) {
    x.fillStyle = `rgba(60,54,44,${0.06 + Math.random() * 0.16})`;
    x.beginPath();
    x.ellipse(Math.random() * w, Math.random() * h, 8 + Math.random() * 40, 5 + Math.random() * 16, 0, 0, Math.PI * 2);
    x.fill();
  }
  grain(x, w, h, 12);
  return finish(c);
}

/* ---- cardboard --------------------------------------------------------- */

/* Recolouring cardboard blue cannot be done with a material `color` tint:
   colour MULTIPLIES the map, and blue x kraft-brown is olive, not blue. This
   composites in HSL colour space instead — hue and saturation are replaced,
   luminance is kept — so the flutes, seams, print and fibre all survive and
   the board reads as marked-up cardboard rather than a painted box. */
function recolour(c: HTMLCanvasElement, x: CanvasRenderingContext2D, tint?: string) {
  if (!tint) return;
  x.globalCompositeOperation = "color";
  x.fillStyle = tint;
  x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = "source-over";
}

/** Carton side: kraft board, a printed handling mark, and the flute edge. */
function cardboardSideRaw(tint?: string): THREE.CanvasTexture {
  const w = 512, h = 512;
  const [c, x] = cv(w, h);
  x.fillStyle = "#A87C4E";
  x.fillRect(0, 0, w, h);
  // mottled fibre
  for (let i = 0; i < 1400; i++) {
    const a = 0.03 + Math.random() * 0.09;
    x.fillStyle = Math.random() > 0.5 ? `rgba(255,236,200,${a})` : `rgba(96,66,38,${a})`;
    x.beginPath();
    x.ellipse(Math.random() * w, Math.random() * h, 3 + Math.random() * 22, 2 + Math.random() * 8, Math.random() * 3, 0, Math.PI * 2);
    x.fill();
  }
  // the corrugated flute, visible as a band along the cut top edge
  x.fillStyle = "rgba(120,86,52,0.55)";
  x.fillRect(0, 0, w, 16);
  for (let i = 0; i < w; i += 9) {
    x.fillStyle = "rgba(70,48,28,0.5)";
    x.fillRect(i, 0, 4, 16);
  }
  // printed handling mark, stamped slightly unevenly
  x.strokeStyle = "rgba(58,40,24,0.5)";
  x.lineWidth = 5;
  x.strokeRect(w * 0.30, h * 0.30, w * 0.40, h * 0.34);
  x.fillStyle = "rgba(58,40,24,0.5)";
  x.font = "700 44px ui-monospace, Menlo, monospace";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText("FRAGILE", w * 0.5, h * 0.47);
  x.font = "600 26px ui-monospace, Menlo, monospace";
  x.fillText("24 UNITS", w * 0.5, h * 0.57);
  grain(x, w, h, 16);
  recolour(c, x, tint);
  return finish(c);
}

/** Carton top: the four flaps and the tape run down the seam. */
function cardboardTopRaw(tint?: string): THREE.CanvasTexture {
  const w = 512, h = 512;
  const [c, x] = cv(w, h);
  x.fillStyle = "#A87C4E";
  x.fillRect(0, 0, w, h);
  for (let i = 0; i < 700; i++) {
    const a = 0.03 + Math.random() * 0.08;
    x.fillStyle = Math.random() > 0.5 ? `rgba(255,236,200,${a})` : `rgba(96,66,38,${a})`;
    x.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 16, 1 + Math.random() * 5);
  }
  // flap seams: one down the middle, two shorter cross seams
  x.fillStyle = "rgba(64,44,26,0.5)";
  x.fillRect(0, h / 2 - 2, w, 4);
  x.fillStyle = "rgba(64,44,26,0.28)";
  x.fillRect(w * 0.5 - 2, 0, 4, h);
  // packing tape — lighter, slightly glossy, overhanging the ends
  x.fillStyle = "rgba(214,196,164,0.62)";
  x.fillRect(0, h / 2 - 26, w, 52);
  x.fillStyle = "rgba(255,255,255,0.10)";
  x.fillRect(0, h / 2 - 26, w, 8);
  grain(x, w, h, 14);
  recolour(c, x, tint);
  return finish(c);
}


/* ---- cached public API ---------------------------------------------------
   The *Raw generators above stay pure; these are what scenes call. */
export const containerSide = (base: string, ink?: string) =>
  cached(`cs|${base}|${ink ?? ""}`, () => containerSideRaw(base, ink));
export const containerEnd = (base: string) =>
  cached(`ce|${base}`, () => containerEndRaw(base));
export const containerRoof = (base: string) =>
  cached(`cr|${base}`, () => containerRoofRaw(base));
export const cardboardSide = (tint?: string) =>
  cached(`bs|${tint ?? ""}`, () => cardboardSideRaw(tint));
export const cardboardTop = (tint?: string) =>
  cached(`bt|${tint ?? ""}`, () => cardboardTopRaw(tint));
