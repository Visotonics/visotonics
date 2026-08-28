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
import { addGrain } from "../_vision/noise";
import { paintDent, paintRust } from "../container-vision/materials";

// willReadFrequently — every skin here ends in addGrain(), which is a getImageData
// round trip. See the long note on the same call in _vision/metal.ts: without
// this each readback stalls on the GPU behind the live scenes' frames.
function cv(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d", { willReadFrequently: true })!];
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
  addGrain(x, w, h, 14);
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
  addGrain(x, w, h, 14);
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
  addGrain(x, w, h, 12);
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
  addGrain(x, w, h, 16);
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
  addGrain(x, w, h, 14);
  recolour(c, x, tint);
  return finish(c);
}


/* ---- container: rust variant ------------------------------------------- */

/** The long side again, but weathered: rust bleeding down from the top rail
    and pooling at the door end (where standing water actually collects on a
    real container), plus one shallow impact dent low on the panel. Built by
    re-opening `containerSideRaw`'s canvas and painting on top of it with the
    SAME defect painters container-vision uses for its front face, so a rust
    patch reads identically whether it is on a detection scene or a hero card
    — no second implementation to keep in sync. */
function containerRustRaw(base: string, ink: string | undefined, amount: number): THREE.CanvasTexture {
  const tex = containerSideRaw(base, ink);
  const c = tex.image as HTMLCanvasElement;
  const x = c.getContext("2d")!;
  const w = c.width, h = c.height;
  const a = Math.max(0, Math.min(1, amount));

  // bleed along the top rail — several narrow patches, not one wide stripe,
  // the way rust actually tracks from rivet lines and seam gaps
  const rail = 3 + Math.round(a * 4);
  for (let i = 0; i < rail; i++) {
    const rx = w * (0.06 + (i / rail) * 0.88) + (Math.random() - 0.5) * 40;
    paintRust(x, rx, h * (0.14 + Math.random() * 0.08), h * (0.08 + a * 0.05), Math.random);
  }
  // pooled patch at the door end (right edge — doors hang at the container's
  // trailing corner in `containerEndRaw`'s convention)
  paintRust(x, w * 0.94, h * 0.62, h * (0.16 + a * 0.10), Math.random);
  paintRust(x, w * 0.88, h * 0.80, h * (0.10 + a * 0.06), Math.random);
  // one shallow dent, low on the panel — decal only, no geometry, so kept soft
  paintDent(x, w * 0.34, h * 0.72, h * 0.13, Math.random, 0.6 + a * 0.3);

  tex.needsUpdate = true;
  return tex;
}

/* ---- container: door end with hardware --------------------------------- */

/** The door end, properly hardwared: four vertical lock rods (the plain
    `containerEndRaw` above already blocks these in, this variant adds the
    parts that make them read as HARDWARE rather than stripes) — a hinge
    barrel top and bottom on each leaf, and a cam-keeper plate behind each
    handle for the rod to seat into. At the ~130-220px this face is shown at,
    the plate and hinges are what separate "door" from "two dark bars". */
function containerDoorEndRaw(base: string): THREE.CanvasTexture {
  const w = 420, h = 420;
  const [c, x] = cv(w, h);
  x.fillStyle = base;
  x.fillRect(0, 0, w, h);

  // top and bottom rails
  x.fillStyle = "rgba(0,0,0,0.30)";
  x.fillRect(0, 0, w, h * 0.10);
  x.fillRect(0, h * 0.90, w, h * 0.10);

  // leaf split, slightly recessed with a lit left edge
  x.fillStyle = "rgba(0,0,0,0.45)";
  x.fillRect(w / 2 - 3, h * 0.10, 6, h * 0.80);
  x.fillStyle = "rgba(255,255,255,0.08)";
  x.fillRect(w / 2 - 4, h * 0.10, 1, h * 0.80);

  // hinge barrels — outer edge of each leaf, top and bottom
  for (const lx of [w * 0.03, w * 0.97]) {
    for (const hy of [h * 0.22, h * 0.78]) {
      x.fillStyle = "rgba(0,0,0,0.5)";
      x.beginPath();
      x.ellipse(lx, hy, 9, 15, 0, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = "rgba(255,255,255,0.12)";
      x.beginPath();
      x.ellipse(lx - 2, hy - 4, 3, 6, 0, 0, Math.PI * 2);
      x.fill();
    }
  }

  // four lock rods with a cam-keeper plate behind each handle
  for (const fx of [0.16, 0.34, 0.66, 0.84]) {
    x.fillStyle = "rgba(0,0,0,0.42)";
    x.fillRect(w * fx - 5, h * 0.12, 10, h * 0.76);
    x.fillStyle = "rgba(255,255,255,0.10)";
    x.fillRect(w * fx - 5, h * 0.12, 3, h * 0.76);
    // keeper plate: a wider dark rectangle the rod's cam seats into
    x.fillStyle = "rgba(0,0,0,0.4)";
    x.fillRect(w * fx - 17, h * 0.46, 34, 26);
    x.strokeStyle = "rgba(255,255,255,0.10)";
    x.lineWidth = 1.5;
    x.strokeRect(w * fx - 17, h * 0.46, 34, 26);
    // the cam handle itself, on top of the plate
    x.fillStyle = "rgba(0,0,0,0.55)";
    x.fillRect(w * fx - 12, h * 0.485, 24, 14);
  }

  // rust freckles at the base — doors sit lowest and catch the most standing water
  for (let i = 0; i < 30; i++) {
    x.fillStyle = `rgba(122,74,48,${0.08 + Math.random() * 0.3})`;
    x.beginPath();
    x.ellipse(Math.random() * w, h * (0.82 + Math.random() * 0.14), 2 + Math.random() * 7, 1 + Math.random() * 3, 0, 0, Math.PI * 2);
    x.fill();
  }
  addGrain(x, w, h, 14);
  return finish(c);
}

/* ---- pallet racking upright ---------------------------------------------- */

/** The web face of a pallet-rack upright: two columns of punched slots
    running its length. Nothing else about a rack channel is visible at card
    size (the flanges are a couple of px), but the slot pattern is the one
    detail that reads as "racking" rather than "a grey post", because it is
    high-contrast and repeats. Narrow and tall so it tiles vertically along
    whatever upright height the scene needs — RepeatWrapping on T. */
function rackUprightRaw(): THREE.CanvasTexture {
  const w = 96, h = 512;
  const [c, x] = cv(w, h);
  // base value chosen to sit in makeMetal's own family (#9AA0A8) rather than
  // introduce a second grey — see the value-ladder note in the report.
  x.fillStyle = "#8E949C";
  x.fillRect(0, 0, w, h);

  // vertical brake-formed shading — a channel web is not flat, it has a
  // shallow return on each side
  const edge = x.createLinearGradient(0, 0, w, 0);
  edge.addColorStop(0, "rgba(0,0,0,0.22)");
  edge.addColorStop(0.15, "rgba(0,0,0,0)");
  edge.addColorStop(0.85, "rgba(0,0,0,0)");
  edge.addColorStop(1, "rgba(0,0,0,0.22)");
  x.fillStyle = edge;
  x.fillRect(0, 0, w, h);

  // two columns of punched slots — the standard teardrop-ish rack hole,
  // simplified to a rounded slot since at this scale the teardrop tip is
  // sub-pixel anyway
  const cols = [w * 0.32, w * 0.68];
  const pitch = 40;
  for (const cx of cols) {
    for (let y = pitch * 0.5; y < h; y += pitch) {
      x.fillStyle = "rgba(0,0,0,0.62)";
      const sw = 10, sh = 18;
      x.beginPath();
      x.roundRect(cx - sw / 2, y - sh / 2, sw, sh, 4);
      x.fill();
      // lit rim on the punched edge, upper-left, the way pressed sheet catches
      x.strokeStyle = "rgba(255,255,255,0.14)";
      x.lineWidth = 1;
      x.stroke();
    }
  }

  // scuffs from decades of forklift contact
  for (let i = 0; i < 40; i++) {
    x.fillStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.1})`;
    x.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * (w * 0.6), 1 + Math.random() * 2);
  }
  addGrain(x, w, h, 12);
  const t = finish(c);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

/* ---- stretch-wrapped pallet load ------------------------------------------ */

/** A pallet load in stretch wrap: a hint of the cartons underneath (flat
    colour blocks, not the full `cardboardSide` detail — the wrap is meant to
    obscure them) under a milky translucent film with the diagonal overlap
    lines a pallet wrapper leaves. Currently these boxes are flat blue and
    read as nothing; the diagonal banding is the single cue that says
    "wrapped", the way the corrugation ramp is the cue for "container". */
function wrappedPalletRaw(): THREE.CanvasTexture {
  const w = 512, h = 512;
  const [c, x] = cv(w, h);
  // carton hint underneath — kept LIGHT (see value-ladder arithmetic in the
  // report): this is what the wrap will veil, not what carries the value.
  x.fillStyle = "#B7BCC2";
  x.fillRect(0, 0, w, h);
  const boxCols = 3, boxRows = 4;
  for (let r = 0; r < boxRows; r++) {
    for (let col = 0; col < boxCols; col++) {
      x.strokeStyle = "rgba(0,0,0,0.14)";
      x.lineWidth = 2;
      x.strokeRect((col / boxCols) * w + 2, (r / boxRows) * h + 2, w / boxCols - 4, h / boxRows - 4);
    }
  }

  // the wrap: a milky film, lighter than the cartons so it reads as plastic
  // over them rather than a second paint layer
  x.fillStyle = "rgba(232,236,240,0.30)";
  x.fillRect(0, 0, w, h);

  // diagonal overlap lines — a stretch wrapper lays film in one consistent
  // helix, so every line runs the SAME direction, close-pitched near the
  // bottom (more wraps low on the load) and opening out toward the top
  x.strokeStyle = "rgba(255,255,255,0.22)";
  x.lineWidth = 3;
  const pitchTop = 46, pitchBot = 26;
  for (let i = -4; i < 20; i++) {
    const pitch = pitchBot + (pitchTop - pitchBot) * (i / 20);
    const x0 = i * pitch;
    x.beginPath();
    x.moveTo(x0, h);
    x.lineTo(x0 + h * 0.55, 0);
    x.stroke();
  }
  // a bright horizontal cinch band top and bottom, where the wrapper starts/ends
  x.fillStyle = "rgba(255,255,255,0.16)";
  x.fillRect(0, 0, w, h * 0.05);
  x.fillRect(0, h * 0.95, w, h * 0.05);

  addGrain(x, w, h, 10);
  return finish(c);
}

/* ---- pallet with separated deck boards ------------------------------------ */

/** A pallet's own deck: the boards drawn as SEPARATE planks with a visible
    gap and grain, rather than one flat plane, plus a matching roughness map
    (bare timber varies far more in roughness than a painted surface does).
    Returns both maps since this is the one skin here that needs a roughness
    pass to sell it — a flat plank photo-reads as a sticker without one. */
function palletDeckAlbedoRaw(): THREE.CanvasTexture {
  const w = 512, h = 256;
  const [c, x] = cv(w, h);
  x.fillStyle = "#C7A876";
  x.fillRect(0, 0, w, h);
  const boards = 7;
  const bh = h / boards;
  for (let i = 0; i < boards; i++) {
    const y = i * bh;
    // per-board tone variance — no two deck boards weather the same
    const tone = 0.85 + Math.random() * 0.3;
    x.fillStyle = `rgba(${Math.round(30 * (1 - tone))},${Math.round(20 * (1 - tone))},0,${0.12 * (1 - tone) + 0.02})`;
    x.fillRect(0, y, w, bh);
    // grain streaks along the board's length
    for (let g = 0; g < 14; g++) {
      const gy = y + Math.random() * bh;
      x.strokeStyle = `rgba(90,64,34,${0.05 + Math.random() * 0.1})`;
      x.lineWidth = 0.6 + Math.random() * 1.2;
      x.beginPath();
      x.moveTo(0, gy);
      x.lineTo(w, gy + (Math.random() - 0.5) * 6);
      x.stroke();
    }
    // the gap between boards — dark, with a soft AO lip on the board above it
    x.fillStyle = "rgba(20,14,8,0.6)";
    x.fillRect(0, y + bh - 4, w, 4);
    x.fillStyle = "rgba(0,0,0,0.15)";
    x.fillRect(0, y + bh - 10, w, 6);
  }
  addGrain(x, w, h, 12);
  return finish(c);
}
function palletDeckRoughRaw(): THREE.CanvasTexture {
  const w = 512, h = 256;
  const [c, x] = cv(w, h);
  x.fillStyle = "#B0B0B0"; // raw timber reads rougher than painted metal
  x.fillRect(0, 0, w, h);
  const boards = 7;
  const bh = h / boards;
  for (let i = 0; i < boards; i++) {
    const y = i * bh;
    const g = 150 + Math.round(Math.random() * 60);
    x.fillStyle = `rgb(${g},${g},${g})`;
    x.fillRect(0, y, w, bh - 4);
    x.fillStyle = "#000000";
    x.fillRect(0, y + bh - 4, w, 4); // the gap is a shadow, effectively unlit
  }
  addGrain(x, w, h, 20);
  return finish(c);
}

/* ---- conveyor belt --------------------------------------------------------- */

/** Rubber conveyor belt: a lateral splice seam (every belt has exactly one —
    it is how the loop was closed) and faint lengthwise tracking marks from
    the idlers. Tiles along the direction of travel. */
function beltSurfaceRaw(): THREE.CanvasTexture {
  const w = 512, h = 160;
  const [c, x] = cv(w, h);
  x.fillStyle = "#1E1D1F";
  x.fillRect(0, 0, w, h);
  // faint lengthwise tracking marks — idler wear lines running with travel
  for (let i = 0; i < 10; i++) {
    const y = (i / 10) * h + Math.random() * 4;
    x.strokeStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.03})`;
    x.lineWidth = 1 + Math.random() * 2;
    x.beginPath();
    x.moveTo(0, y);
    x.lineTo(w, y);
    x.stroke();
  }
  // the splice seam — a single lateral band, slightly raised, with two
  // fastener rows the way a mechanical (clipper) splice reads
  const sy = h * 0.5;
  x.fillStyle = "rgba(0,0,0,0.35)";
  x.fillRect(0, sy - 7, w, 14);
  x.fillStyle = "rgba(255,255,255,0.05)";
  x.fillRect(0, sy - 7, w, 2);
  x.fillStyle = "rgba(210,210,210,0.35)";
  for (let i = 0; i < w; i += 10) {
    x.fillRect(i, sy - 5, 3, 2);
    x.fillRect(i, sy + 3, 3, 2);
  }
  addGrain(x, w, h, 8);
  const t = finish(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/* ---- forklift tyre ---------------------------------------------------------- */

/** Two textures, because a tyre genuinely has two unrelated surfaces: the
    tread wraps the circumference (tiles horizontally), the sidewall/hub is a
    flat disc seen face-on and does not tile at all. */
function tyreTreadRaw(): THREE.CanvasTexture {
  const w = 512, h = 128;
  const [c, x] = cv(w, h);
  x.fillStyle = "#17161A";
  x.fillRect(0, 0, w, h);
  // tread blocks — offset rows, the way a solid-resilient forklift tyre reads
  const cols = 22, rows = 3;
  const bw = w / cols, bh = h / rows;
  for (let r = 0; r < rows; r++) {
    const offset = r % 2 === 0 ? 0 : bw * 0.5;
    for (let cIdx = -1; cIdx <= cols; cIdx++) {
      const bx = cIdx * bw + offset;
      x.fillStyle = "rgba(0,0,0,0.4)";
      x.fillRect(bx + 2, r * bh + 2, bw - 4, bh - 4);
      x.fillStyle = "rgba(255,255,255,0.05)";
      x.fillRect(bx + 2, r * bh + 2, bw - 4, 2);
    }
  }
  addGrain(x, w, h, 10);
  const t = finish(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}
function tyreCapRaw(): THREE.CanvasTexture {
  const w = 256, h = 256;
  const [c, x] = cv(w, h);
  x.fillStyle = "#1B1A1E";
  x.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  // smooth sidewall — concentric mould rings, very faint
  for (let r = h * 0.14; r < h * 0.48; r += 6) {
    x.strokeStyle = "rgba(255,255,255,0.03)";
    x.lineWidth = 1.5;
    x.beginPath();
    x.arc(cx, cy, r, 0, Math.PI * 2);
    x.stroke();
  }
  // the hub face — a lighter disc with lug points, the one place on a wheel
  // that isn't rubber
  x.fillStyle = "#7C7E82";
  x.beginPath();
  x.arc(cx, cy, h * 0.16, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = "rgba(0,0,0,0.4)";
  x.beginPath();
  x.arc(cx, cy, h * 0.16, 0, Math.PI * 2);
  x.lineWidth = 3;
  x.stroke();
  const lugs = 6;
  for (let i = 0; i < lugs; i++) {
    const a = (i / lugs) * Math.PI * 2;
    x.fillStyle = "rgba(0,0,0,0.5)";
    x.beginPath();
    x.arc(cx + Math.cos(a) * h * 0.10, cy + Math.sin(a) * h * 0.10, h * 0.018, 0, Math.PI * 2);
    x.fill();
  }
  addGrain(x, w, h, 8);
  return finish(c);
}

/* ---- sealed warehouse concrete --------------------------------------------- */

/** Sealed factory-floor concrete: faint aggregate speckle, straight saw-cut
    pour joints on a real bay pitch, and darkened tyre-scuff paths. This is
    the one skin here painted for the WHOLE FRAME rather than a single box —
    see the size note below — so it is allowed a larger canvas than
    everything else in this file. */
function concreteFloorRaw(): THREE.CanvasTexture {
  // 1024, not the 512 every other skin here uses: this map tiles under the
  // full width of a card's ground plane, not one ~300px box, so 512 would
  // show its repeat inside a single glance across the floor. 1024 is still
  // far under the flagship textures elsewhere in the codebase (2048) — this
  // is a diffuse-only, camera-distant surface with no normal/roughness pass,
  // so it does not carry the cost a hero material would.
  const w = 1024, h = 1024;
  const [c, x] = cv(w, h);
  x.fillStyle = "#20242A";
  x.fillRect(0, 0, w, h);

  // aggregate speckle — sealed concrete still shows fine stone through the sealer
  for (let i = 0; i < 5000; i++) {
    const v = Math.random() > 0.5 ? 255 : 0;
    x.fillStyle = `rgba(${v},${v},${v},${0.02 + Math.random() * 0.05})`;
    x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  // broad trowel blotches, same idiom as lead-card/site.ts's concrete
  for (let i = 0; i < 10; i++) {
    const px = Math.random() * w, py = Math.random() * h, pr = w * (0.08 + Math.random() * 0.10);
    const g = x.createRadialGradient(px, py, 0, px, py, pr);
    g.addColorStop(0, "rgba(0,0,0,0.10)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g;
    x.fillRect(px - pr, py - pr, pr * 2, pr * 2);
  }
  // pour joints — a sparse straight grid, much wider pitch than the site's
  // drafting grid so the two never visually beat against each other
  x.strokeStyle = "rgba(10,12,15,0.5)";
  x.lineWidth = 2;
  for (const fx of [0.0, 0.25, 0.5, 0.75, 1.0]) {
    x.beginPath(); x.moveTo(w * fx, 0); x.lineTo(w * fx, h); x.stroke();
    x.beginPath(); x.moveTo(0, h * fx); x.lineTo(w, h * fx); x.stroke();
  }
  // tyre-scuff darkening — two soft parallel travel lanes, the way repeated
  // forklift passes polish and dirty a path over years
  for (const lz of [-0.14, 0.14]) {
    const cx = w * (0.5 + lz);
    const g = x.createLinearGradient(cx - w * 0.05, 0, cx + w * 0.05, 0);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.5, "rgba(0,0,0,0.14)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g;
    x.fillRect(cx - w * 0.05, 0, w * 0.10, h);
  }
  addGrain(x, w, h, 10);
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

/** Container flank, weathered — rust bleed off the top rail, a pooled patch
    at the door end, one shallow dent. `amount` 0..1 scales how far gone it
    is; each distinct amount is its own cache entry, same convention as
    `containerSide`'s base/ink keys. */
export const containerRust = (base: string, amount = 0.5, ink?: string) =>
  cached(`crust|${base}|${amount.toFixed(2)}|${ink ?? ""}`, () => containerRustRaw(base, ink, amount));
/** Door end with hinges, four lock rods and cam-keeper plates. */
export const containerDoorEnd = (base: string) =>
  cached(`cde|${base}`, () => containerDoorEndRaw(base));
/** Pallet-rack upright web face: punched slots, two columns. Tiles on T. */
export const rackUpright = () =>
  cached("rack", () => rackUprightRaw());
/** Stretch-wrapped pallet load: milky film, diagonal overlap lines. */
export const wrappedPallet = () =>
  cached("wrap", () => wrappedPalletRaw());
/** Pallet deck: separated boards, in albedo AND roughness. */
export const palletDeck = () => ({
  map: cached("deckA", () => palletDeckAlbedoRaw()),
  roughnessMap: cached("deckR", () => palletDeckRoughRaw()),
});
/** Conveyor belt: rubber, one splice seam, tracking marks. Tiles on S. */
export const beltSurface = () =>
  cached("belt", () => beltSurfaceRaw());
/** Forklift tyre: tread (tiles on S) and the sidewall/hub cap (does not tile). */
export const tyre = () => ({
  tread: cached("tyreTread", () => tyreTreadRaw()),
  cap: cached("tyreCap", () => tyreCapRaw()),
});
/** Sealed warehouse/factory floor: aggregate, pour joints, tyre scuffs. */
export const concreteFloor = () =>
  cached("concreteFloor", () => concreteFloorRaw());

/* ---- idle warm ------------------------------------------------------------
   Same contract as `warmMetalCache()`/`warmContainerTextures()`: build every
   skin in this file once, off the scroll path, so the first card to mount
   gets a cache hit instead of paying for the canvas work itself. A later pass
   should call this from hero-cards' own warm chain (see PERFORMANCE.md #23 /
   #29 / #38 on why "once, at idle, module-cached" is the whole contract) —
   nothing in THIS file may wire it in, since that touches the loader in
   `_vision/lazy.tsx`. */
export function warmHeroSkins() {
  containerRust("#274B73", 0.5);
  containerDoorEnd("#274B73");
  rackUpright();
  wrappedPallet();
  palletDeck();
  beltSurface();
  tyre();
  concreteFloor();
}
