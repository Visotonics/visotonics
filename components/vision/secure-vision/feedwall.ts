/* ---------------------------------------------------------------------------
   The reusable multi-feed triage wall.

   Built for Secure Vision's flagship (a triage argument: most things that
   move are dismissed, one is raised) but built to be REUSED — the Viso Data
   hero card derives its geometry from this module the same way
   hero-cards/container-card.ts reuses container-vision's geometry at card
   grade. Everything a card would need to vary is therefore an option, not a
   hardcoded number: feed count/grid, whether the desk and room shell are
   built at all, per-feed texture resolution, and a detail switch that turns
   off the parts only the flagship can afford (rail dressing, bezel bevel).

   THE `transparent: false` TRAP (see secure.ts's history and CLAUDE.md's own
   warning): `makeMetal()` defaults to opacity 0 unless a caller explicitly
   opts out. `RACK_BLUE_METAL` below passes it. Do not remove it.

   Screens are MeshBasicMaterial, not MeshStandardMaterial+emissive — fully
   unlit, so they read as glowing glass regardless of the studio's exposure
   or light rig, which is what "the room's main light source" requires. Real
   THREE.Light objects (added by the caller, not this module — light rig
   choice belongs to the scene) do the job of visibly lighting the desk and
   floor near the wall; this module only supplies their motivated position
   via `lightAnchors`.
--------------------------------------------------------------------------- */
import * as THREE from "three";
import { makeMetal, tintMetal, metalBox, CANONICAL_BRUSHED, type MetalOpts } from "../_vision/metal";
import { addGrain } from "../_vision/noise";

/* THE COLOUR ANCHOR, read verbatim from work-vision/work.ts:133 — painted
   steel in the family blue, its own spec (not a tint of CANONICAL_BRUSHED)
   so it shares a cache key with Secure/Dimension/Audit's own copies of the
   same object. `transparent: false` is mandatory — see the header. */
export const RACK_BLUE_METAL: MetalOpts = {
  base: "#2C4A73", kind: "painted", metalness: 0.35, rough: 0.55, transparent: false,
};

function cv(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d", { willReadFrequently: true })!];
}
function finishTex(c: HTMLCanvasElement, repeat: [number, number] = [1, 1]) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  return t;
}

/* ===========================================================================
   CONCRETE FLOOR — same derivation as secure.ts's original (work-vision's
   shipped #191D22, read verbatim: work.ts:700). A glancing camera needs the
   HIGHER albedo, not a halved one — see the spec's own §0.3 warning.
=========================================================================== */
const CONCRETE_MAP_BASE = "#373C41";
const CONCRETE_TINT = "#8A8F96";
let concreteMapCache: THREE.Texture | null = null;
function concreteMap(): THREE.Texture {
  if (concreteMapCache) return concreteMapCache;
  const S = 1024;
  const [c, x] = cv(S, S);
  x.fillStyle = CONCRETE_MAP_BASE;
  x.fillRect(0, 0, S, S);
  for (let i = 0; i < 14; i++) {
    const px = Math.random() * S, py = Math.random() * S;
    const pr = S * (0.10 + 0.12 * Math.random());
    const g = x.createRadialGradient(px, py, 0, px, py, pr);
    g.addColorStop(0, "rgba(0,0,0,0.10)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g;
    x.fillRect(px - pr, py - pr, pr * 2, pr * 2);
  }
  x.strokeStyle = "rgba(0,0,0,0.4)";
  x.lineWidth = 1;
  for (const u of [0.25, 0.5, 0.75]) { x.beginPath(); x.moveTo(u * S, 0); x.lineTo(u * S, S); x.stroke(); }
  addGrain(x, S, S, 0.09 * 255);
  concreteMapCache = finishTex(c, [3, 3]);
  return concreteMapCache;
}

/* ---- back wall: dark, with panel joints — not a void --------------------- */
let wallMapCache: THREE.Texture | null = null;
function wallMap(): THREE.Texture {
  if (wallMapCache) return wallMapCache;
  const S = 1024;
  const [c, x] = cv(S, S);
  x.fillStyle = "#0C0E12";
  x.fillRect(0, 0, S, S);
  /* a vertical falloff so the panel reads as a WALL under practical light
     rather than a flat grey card — brighter near the middle (where the
     screen glow would actually land) fading dark top and bottom. Two flat
     grey slabs either side of the wall, with no depth cue at all, was the
     review's own complaint (#4) — this and the joints below are the fix. */
  const fall = x.createLinearGradient(0, 0, 0, S);
  fall.addColorStop(0, "rgba(0,0,0,0.35)");
  fall.addColorStop(0.42, "rgba(20,26,34,0.10)");
  fall.addColorStop(0.62, "rgba(0,0,0,0.05)");
  fall.addColorStop(1, "rgba(0,0,0,0.45)");
  x.fillStyle = fall;
  x.fillRect(0, 0, S, S);
  addGrain(x, S, S, 6);
  x.strokeStyle = "rgba(0,0,0,0.55)";
  x.lineWidth = 2;
  for (const u of [0.25, 0.5, 0.75]) { x.beginPath(); x.moveTo(u * S, 0); x.lineTo(u * S, S); x.stroke(); }
  x.strokeStyle = "rgba(255,255,255,0.03)";
  x.lineWidth = 1;
  for (const u of [0.25, 0.5, 0.75]) { x.beginPath(); x.moveTo(u * S + 2, 0); x.lineTo(u * S + 2, S); x.stroke(); }
  wallMapCache = finishTex(c, [2, 1]);
  return wallMapCache;
}

/* ---- desk laminate --------------------------------------------------------- */
let deskMapCache: THREE.Texture | null = null;
function deskMap(): THREE.Texture {
  if (deskMapCache) return deskMapCache;
  const S = 512;
  const [c, x] = cv(S, S);
  x.fillStyle = "#1B1E23";
  x.fillRect(0, 0, S, S);
  addGrain(x, S, S, 8);
  deskMapCache = finishTex(c);
  return deskMapCache;
}

/* ===========================================================================
   FEED CONTENT — the degradation the section copy claims. Each kind is a
   distinct look; several are deliberately NOT clean daylight, per the brief's
   "do not draw eight clean daylight feeds."

   Painted ONCE at build time into a cached canvas keyed by kind+resolution —
   never repainted per frame. Movement within a feed (a flapping tarp, a
   drifting bird, an approaching figure, falling rain) is carried by a small
   foreground SPRITE mesh positioned in front of the flat screen plane, or by
   scrolling the base texture's UV offset — both are free per-frame, neither
   touches the canvas.
=========================================================================== */
export type FeedKind =
  | "dust"    // yard haze, warm, low contrast
  | "clean"   // calm night feed, unremarkable
  | "rain"    // streaked, wet lens
  | "fog"     // dense haze, low visibility
  | "tarp"    // fenceline, flapping tarp nuisance
  | "blur"    // motion-blurred night traffic
  | "bird"    // corridor, a bird crossing
  | "event";  // entry door — the real event

function paintBase(kind: FeedKind, w: number, h: number): HTMLCanvasElement {
  const [c, x] = cv(w, h);
  /* Lifted well off pure black — MeshBasicMaterial reads the canvas at its
     literal value with no light to help it, and the first pass here (a
     #0A0D12 -> #191D22 night gradient) rendered as near-indistinguishable
     dark panes at flagship scale. A monitor feed is a LIT display even at
     night; the base now sits mid-grey-blue so structure and grain both
     actually resolve. */
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#2A3542");
  g.addColorStop(0.55, "#333E4C");
  g.addColorStop(1, "#404C5A");
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);

  /* EVERY FEED DRAWS ITS OWN PLACE.

     The previous version painted the SAME two grey rectangles and one horizon
     line on all eight feeds and then added only an atmospheric wash per kind.
     On screen that made the whole bank read as eight identical blank panes —
     reviewed and rejected: "the feeds are blank grey rectangles". The scene's
     entire claim is that it reads through night, rain, fog, dust and motion
     blur and can tell a real event from a flapping tarp, and a wall of empty
     panes asserts that in text while showing none of it.

     Each feed is ~95px wide on screen at flagship size — wider than a whole
     hero card's subject — so there is no legibility excuse. SHAPE FIRST:
     high-contrast silhouettes, no detail. Detail is invisible here; a
     recognisable outline is not. */
  const ink = (a: number) => `rgba(0,0,0,${a})`;
  const lit = (a: number) => `rgba(255,255,255,${a})`;
  const horizon = h * 0.62;

  // ground plane, common to every feed — the thing silhouettes stand ON
  x.fillStyle = lit(0.05);
  x.fillRect(0, horizon, w, h - horizon);
  x.strokeStyle = lit(0.22);
  x.lineWidth = 1;
  x.beginPath(); x.moveTo(0, horizon); x.lineTo(w, horizon - h * 0.02); x.stroke();

  switch (kind) {
    case "dust": {
      // YARD — a stack of containers, two rows, staggered
      x.fillStyle = ink(0.55);
      const cw = w * 0.19, ch = h * 0.13;
      for (let r = 0; r < 2; r++) {
        for (let i = 0; i < 4 - r; i++) {
          x.fillRect(w * 0.06 + i * (cw + w * 0.015), horizon - ch * (r + 1) - r * 2, cw, ch);
        }
      }
      break;
    }
    case "clean": {
      // AISLE — racking uprights in perspective, converging
      x.strokeStyle = ink(0.5);
      for (let i = 0; i < 4; i++) {
        const t = i / 3, px = w * (0.1 + t * 0.36), pw = w * (0.13 - t * 0.07);
        x.lineWidth = 3 - t * 1.6;
        x.strokeRect(px, horizon - h * (0.34 - t * 0.14), pw, h * (0.34 - t * 0.14));
      }
      break;
    }
    case "rain": {
      // DOCK — an open door aperture with a trailer rear inside it
      x.fillStyle = ink(0.62);
      x.fillRect(w * 0.16, horizon - h * 0.40, w * 0.5, h * 0.40);
      x.fillStyle = lit(0.10);
      x.fillRect(w * 0.24, horizon - h * 0.31, w * 0.34, h * 0.31); // trailer face
      break;
    }
    case "fog": {
      // ROOF — a ridge line and two skylight strips above the fog bank
      x.fillStyle = ink(0.5);
      x.beginPath();
      x.moveTo(0, horizon - h * 0.10);
      x.lineTo(w * 0.5, horizon - h * 0.34);
      x.lineTo(w, horizon - h * 0.10);
      x.lineTo(w, horizon); x.lineTo(0, horizon); x.closePath(); x.fill();
      x.fillStyle = lit(0.16);
      x.fillRect(w * 0.30, horizon - h * 0.20, w * 0.14, h * 0.035);
      x.fillRect(w * 0.56, horizon - h * 0.20, w * 0.14, h * 0.035);
      break;
    }
    case "tarp": {
      // FENCE — mesh posts, and the flapping tarp that gets dismissed
      x.strokeStyle = ink(0.55); x.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const px = w * (0.08 + i * 0.21);
        x.beginPath(); x.moveTo(px, horizon); x.lineTo(px, horizon - h * 0.30); x.stroke();
      }
      x.beginPath(); x.moveTo(0, horizon - h * 0.30); x.lineTo(w, horizon - h * 0.28); x.stroke();
      break;
    }
    case "blur": {
      // BAY — a vehicle mass, smeared laterally (the streaks come below)
      x.fillStyle = ink(0.42);
      x.fillRect(w * 0.22, horizon - h * 0.22, w * 0.46, h * 0.22);
      break;
    }
    case "bird": {
      // CORRIDOR — converging walls, a lit doorway at the end
      x.fillStyle = ink(0.55);
      x.beginPath();
      x.moveTo(0, 0); x.lineTo(w * 0.34, horizon - h * 0.22);
      x.lineTo(w * 0.34, horizon); x.lineTo(0, horizon); x.closePath(); x.fill();
      x.beginPath();
      x.moveTo(w, 0); x.lineTo(w * 0.66, horizon - h * 0.22);
      x.lineTo(w * 0.66, horizon); x.lineTo(w, horizon); x.closePath(); x.fill();
      x.fillStyle = lit(0.20);
      x.fillRect(w * 0.42, horizon - h * 0.20, w * 0.16, h * 0.20);
      break;
    }
    case "event": {
      // ENTRY — a doorway the figure sprite is composited over
      x.fillStyle = ink(0.58);
      x.fillRect(0, horizon - h * 0.44, w, h * 0.44);
      x.fillStyle = lit(0.22);
      x.fillRect(w * 0.30, horizon - h * 0.36, w * 0.40, h * 0.36);
      break;
    }
  }

  switch (kind) {
    case "dust": {
      const hz = x.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.4, w * 0.6);
      hz.addColorStop(0, "rgba(150,120,80,0.22)");
      hz.addColorStop(1, "rgba(150,120,80,0)");
      x.fillStyle = hz; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 60; i++) {
        x.fillStyle = `rgba(200,180,140,${0.03 + Math.random() * 0.05})`;
        x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
      }
      break;
    }
    case "rain": {
      x.strokeStyle = "rgba(200,215,230,0.16)";
      x.lineWidth = 1;
      for (let i = 0; i < 90; i++) {
        const rx = Math.random() * w, ry = Math.random() * h;
        x.beginPath(); x.moveTo(rx, ry); x.lineTo(rx - 4, ry + 18); x.stroke();
      }
      x.fillStyle = "rgba(120,150,180,0.10)";
      x.fillRect(0, 0, w, h);
      break;
    }
    case "fog": {
      const fg = x.createLinearGradient(0, h * 0.2, 0, h);
      fg.addColorStop(0, "rgba(180,190,200,0.05)");
      fg.addColorStop(0.6, "rgba(180,190,200,0.28)");
      fg.addColorStop(1, "rgba(180,190,200,0.45)");
      x.fillStyle = fg; x.fillRect(0, 0, w, h);
      break;
    }
    case "blur": {
      x.strokeStyle = "rgba(255,255,255,0.10)";
      for (let i = 0; i < 5; i++) {
        const by = h * (0.55 + i * 0.06);
        x.lineWidth = 2 + Math.random() * 2;
        x.beginPath(); x.moveTo(0, by); x.lineTo(w, by - 4); x.stroke();
      }
      x.fillStyle = "rgba(255,190,120,0.10)";
      x.fillRect(w * 0.3, h * 0.5, w * 0.4, h * 0.06);
      break;
    }
    case "tarp":
    case "bird":
    case "clean":
    case "event":
    default: {
      // low film grain only — added below for every kind
      break;
    }
  }
  addGrain(x, w, h, 10);
  x.strokeStyle = "rgba(0,0,0,0.5)";
  x.lineWidth = Math.max(2, w * 0.006);
  x.strokeRect(0, 0, w, h); // vignette edge so each pane reads as a lens, not a poster
  return c;
}

const baseTexCache = new Map<string, THREE.Texture>();
function baseFeedTexture(kind: FeedKind, res: number): THREE.Texture {
  const key = `${kind}|${res}`;
  const hit = baseTexCache.get(key);
  if (hit) return hit;
  const w = Math.round(res * 1.72), h = res; // ~16:9-ish pane
  const c = paintBase(kind, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  baseTexCache.set(key, t);
  return t;
}

/* ---- foreground sprites: the moving anomalies ------------------------- */
function paintSprite(kind: "tarp" | "bird" | "event", res: number): HTMLCanvasElement {
  const [c, x] = cv(res, res);
  x.clearRect(0, 0, res, res);
  if (kind === "tarp") {
    x.fillStyle = "rgba(60,64,70,0.85)";
    x.beginPath();
    x.moveTo(res * 0.2, res * 0.1);
    x.lineTo(res * 0.8, res * 0.18);
    x.lineTo(res * 0.72, res * 0.9);
    x.lineTo(res * 0.28, res * 0.82);
    x.closePath();
    x.fill();
  } else if (kind === "bird") {
    x.strokeStyle = "rgba(20,20,22,0.9)";
    x.lineWidth = res * 0.05;
    x.beginPath();
    x.moveTo(res * 0.15, res * 0.5);
    x.quadraticCurveTo(res * 0.5, res * 0.2, res * 0.85, res * 0.5);
    x.stroke();
    x.beginPath();
    x.moveTo(res * 0.15, res * 0.5);
    x.quadraticCurveTo(res * 0.5, res * 0.8, res * 0.85, res * 0.5);
    x.stroke();
  } else {
    // event: a walking-figure silhouette, front-on, box peak head cue
    x.fillStyle = "rgba(10,12,15,0.92)";
    x.fillRect(res * 0.42, res * 0.10, res * 0.16, res * 0.16); // head
    x.fillRect(res * 0.36, res * 0.28, res * 0.28, res * 0.42); // torso
    x.fillRect(res * 0.30, res * 0.70, res * 0.14, res * 0.28); // leg L
    x.fillRect(res * 0.56, res * 0.70, res * 0.14, res * 0.28); // leg R
  }
  return c;
}
const spriteTexCache = new Map<string, THREE.Texture>();
function spriteTexture(kind: "tarp" | "bird" | "event"): THREE.Texture {
  const hit = spriteTexCache.get(kind);
  if (hit) return hit;
  const c = paintSprite(kind, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  spriteTexCache.set(kind, t);
  return t;
}

/* ===========================================================================
   THE BUILDER
=========================================================================== */
export interface FeedSpec {
  kind: FeedKind;
  /** short id shown in overlay copy, e.g. "FEED 03" */
  id: string;
}

export interface FeedScreen {
  index: number;
  spec: FeedSpec;
  /** local group at the screen's mounted position; parent is FeedWall.group */
  root: THREE.Group;
  /** the emissive pane itself, for prominence scaling on the escalation beat */
  panel: THREE.Mesh;
  panelMat: THREE.MeshBasicMaterial;
  /** present for tarp/bird/event feeds — the moving foreground anomaly */
  sprite?: THREE.Mesh;
  spriteMat?: THREE.MeshBasicMaterial;
  /** the tracker's follow target — the sprite when present, else a small
      marker over the artifact region (rain's glitch patch) */
  anchor: THREE.Object3D;
  width: number;
  height: number;
}

export interface FeedWallOptions {
  cols?: number;
  rows?: number;
  /** content per screen, row-major, length must equal cols*rows. Repeats
      cyclically if shorter — a card variant can hand a 4-long list at cols*rows=4. */
  feeds?: FeedSpec[];
  buildRoom?: boolean;
  buildDesk?: boolean;
  /** per-screen canvas resolution (height in px; width derives from aspect) */
  texRes?: number;
  /** flagship "full" gets rail dressing + bevelled bezels; "cheap" (the card
      variant) skips both — pure geometry saving, look is unaffected at
      card scale where neither would resolve */
  detail?: "full" | "cheap";
}

export interface FeedWall {
  group: THREE.Group;
  screens: FeedScreen[];
  /** same array — named per the reuse contract's `feeds[]` */
  feeds: FeedScreen[];
  /** motivated position for a caller-owned light to key off the wall's glow */
  lightAnchor: THREE.Vector3;
  wallWidth: number;
  wallHeight: number;
  wallCenterY: number;
  deskTopY: number;
  owned: THREE.BufferGeometry[];
  dispose: () => void;
}

const DEFAULT_FEEDS: FeedSpec[] = [
  { kind: "dust", id: "FEED 01" },
  { kind: "clean", id: "FEED 02" },
  { kind: "rain", id: "FEED 03" },
  { kind: "fog", id: "FEED 04" },
  { kind: "tarp", id: "FEED 05" },
  { kind: "blur", id: "FEED 06" },
  { kind: "bird", id: "FEED 07" },
  { kind: "event", id: "FEED 08" },
];

export function warmFeedWallTextures(res = 512) {
  for (const f of DEFAULT_FEEDS) baseFeedTexture(f.kind, res);
  spriteTexture("tarp"); spriteTexture("bird"); spriteTexture("event");
  concreteMap(); wallMap(); deskMap();
  makeMetal({ ...RACK_BLUE_METAL }).dispose();
  makeMetal({ ...CANONICAL_BRUSHED, transparent: false }).dispose();
}

export function buildFeedWall(opts: FeedWallOptions = {}): FeedWall {
  const cols = opts.cols ?? 4;
  const rows = opts.rows ?? 2;
  const n = cols * rows;
  const feedSpecs = opts.feeds ?? DEFAULT_FEEDS;
  const feedsIn: FeedSpec[] = Array.from({ length: n }, (_, i) => feedSpecs[i % feedSpecs.length]);
  const buildRoom = opts.buildRoom ?? true;
  const buildDesk = opts.buildDesk ?? true;
  const texRes = opts.texRes ?? 512;
  const full = (opts.detail ?? "full") === "full";

  warmFeedWallTextures(texRes);

  const owned: THREE.BufferGeometry[] = [];
  const scratchMats: THREE.Material[] = [];
  const box = (w: number, h: number, d: number) => { const g = new THREE.BoxGeometry(w, h, d); owned.push(g); return g; };
  const plane = (w: number, h: number) => { const g = new THREE.PlaneGeometry(w, h); owned.push(g); return g; };

  const group = new THREE.Group();

  // ---- geometry constants: 4x2 at flagship, screens ~200px at 1230px slot width ----
  const SCR_W = 0.58, SCR_H = 0.33, GAP = 0.075, BEZEL = 0.028;
  const totalW = cols * SCR_W + (cols - 1) * GAP;
  const totalH = rows * SCR_H + (rows - 1) * GAP;
  const WALL_CENTER_Y = 1.55;
  const WALL_Z = -1.02;
  const DESK_TOP = 0.95;

  // ---- shared per-scene metals ----
  const rackBlue = makeMetal({ ...RACK_BLUE_METAL });
  const canonical = makeMetal({ ...CANONICAL_BRUSHED, transparent: false });
  const bezelMat = tintMetal(canonical.material, "#101215", { metalness: 0.55 });
  bezelMat.roughness = 0.7;
  const railMat = rackBlue.material;
  /* envMapIntensity 0.75 -> 0.10. `makeMetal` defaults to 0.75 on the reasoning
     that "metal lives on its reflections", which is right for a brushed steel
     subject under a lit rig and wrong here: these rails are PAINTED steel in a
     dark room, and at 0.75 they mirrored the studio's blue softbox so hard
     that they became the brightest, most saturated object in frame —
     out-shouting the emissive screens they exist to frame, and breaking the
     house rule that nothing physical may be as bright as the graphics drawn
     over it. Reviewed as "far too hot, reads as neon".

     #2C4A73 at metalness 0.35 is a dark navy; the albedo was never the
     problem, the reflection was. This is the same fault already found and
     fixed on the desk surface a pass earlier — worth noting that a dark room
     plus makeMetal's default is a reliable way to produce accidental neon. */
  railMat.envMapIntensity = 0.10;
  const deskFrameMat = rackBlue.material; // same instance, blue anchor on both rails and desk frame
  scratchMats.push(bezelMat);

  // ---- room shell ----
  if (buildRoom) {
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallMap(), color: "#FFFFFF", roughness: 0.9, metalness: 0.02, envMapIntensity: 0.16,
    });
    scratchMats.push(wallMat);
    const wall = new THREE.Mesh(box(totalW + 2.2, 3.0, 0.10), wallMat);
    wall.position.set(0, 1.5, WALL_Z - 0.08);
    wall.receiveShadow = true;
    group.add(wall);

    const floorMat = new THREE.MeshStandardMaterial({
      map: concreteMap(), color: "#9BA1A8", roughness: 0.92, metalness: 0.04, envMapIntensity: 0.12,
    });
    scratchMats.push(floorMat);
    const floor = new THREE.Mesh(plane(20, 20), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    group.add(floor);
  }

  // ---- desk — CONTEXT, not the subject: sized to the wall, not the room ----
  if (buildDesk) {
    const DESK_W = totalW + 0.16; // matches the rail span, not an independent width
    const DESK_D = 0.42;          // was 0.62 — the review's "enormous slab" was this depth read close-in
    /* envMapIntensity 0.05, roughness 0.85, near-black laminate — the first
       pass (0.10 / 0.74 / #1B1E23) still reflected the studio's blue softbox
       hard enough to be the loudest, most saturated object in frame, ahead
       of the screens that are supposed to carry the light. This is a dark
       matte worksurface a wall of monitors sits behind, not a lit panel. */
    const deskMat = new THREE.MeshStandardMaterial({
      map: deskMap(), color: "#9AA0A6", roughness: 0.85, metalness: 0.02, envMapIntensity: 0.05,
    });
    scratchMats.push(deskMat);
    const deskTop = new THREE.Mesh(box(DESK_W, 0.05, DESK_D), deskMat);
    deskTop.position.set(0, DESK_TOP, WALL_Z + 0.75);
    deskTop.castShadow = true; deskTop.receiveShadow = true;
    group.add(deskTop);

    // a lit edge trim along the front-top lip — gives the slab a feature
    // instead of reading as one featureless painted box
    const trim = metalBox(DESK_W, 0.012, 0.02, deskFrameMat);
    trim.position.set(0, DESK_TOP + 0.006, WALL_Z + 0.75 + DESK_D / 2 - 0.01);
    trim.castShadow = true;
    group.add(trim);

    /* NOT deskFrameMat. This panel is the single largest camera-facing surface in the
       scene — full desk width by nearly full desk height, square to the lens — and on
       the blue anchor it rendered as a glowing slab that was the loudest thing in
       frame, ahead of the screens and ahead of the alert callout. That is the third
       instance of the fault this file has already documented fixing twice above (the
       desk top, then the rails): a dark room plus a saturated anchor colour reads as
       neon. The anchor is for ACCENTS — the 0.012-tall trim lip and the 0.05 legs
       below still use it, and should, because at that size it reads as a painted
       highlight rather than a lit surface.

       #1A1F27 (mean ~33) sits just above the clutter's #15181D (~23) so the desk body
       still separates from the objects sitting on it, and well under the emissive
       screens — preserving the stated rule that nothing physical outshines the
       graphics. envMapIntensity 0.07 for the same reason the rails were taken to
       0.10: it is the softbox REFLECTION, not the albedo, that produced the neon. */
    const frontMat = tintMetal(canonical.material, "#1A1F27", { metalness: 0.30 });
    frontMat.roughness = 0.82;
    frontMat.envMapIntensity = 0.07;
    scratchMats.push(frontMat);
    const frontPanel = metalBox(DESK_W, DESK_TOP - 0.03, 0.03, frontMat);
    frontPanel.position.set(0, (DESK_TOP - 0.03) / 2, WALL_Z + 0.75 + DESK_D / 2 - 0.015);
    frontPanel.castShadow = true;
    group.add(frontPanel);

    for (const lx of [-DESK_W / 2 + 0.05, DESK_W / 2 - 0.05]) {
      const leg = metalBox(0.05, DESK_TOP, 0.05, deskFrameMat);
      leg.position.set(lx, DESK_TOP / 2, WALL_Z + 0.75 - DESK_D / 2 + 0.05);
      leg.castShadow = true;
      group.add(leg);
    }

    // desk clutter — a keyboard slab and a small console puck, so the top
    // reads as a worked surface rather than an empty painted plane
    const clutterMat = tintMetal(canonical.material, "#15181D", { metalness: 0.4 });
    clutterMat.roughness = 0.75;
    scratchMats.push(clutterMat);
    const keyboard = new THREE.Mesh(box(0.30, 0.015, 0.11), clutterMat);
    keyboard.position.set(-DESK_W * 0.18, DESK_TOP + 0.033, WALL_Z + 0.75 + DESK_D * 0.20);
    keyboard.castShadow = true;
    group.add(keyboard);
    const puck = new THREE.Mesh(box(0.09, 0.03, 0.09), clutterMat);
    puck.position.set(DESK_W * 0.28, DESK_TOP + 0.04, WALL_Z + 0.75 + DESK_D * 0.15);
    puck.castShadow = true;
    group.add(puck);
  }

  // ---- mounting rails (blue anchor) — top and bottom of the grid, plus one
  //      between the rows so the wall reads as rack-mounted, not glued to
  //      the wall. Skipped at "cheap" detail — invisible at card scale. ----
  if (full) {
    const railH = 0.03, railD = 0.06;
    const railY = [
      WALL_CENTER_Y + totalH / 2 + 0.04,
      WALL_CENTER_Y - totalH / 2 - 0.04,
    ];
    for (const ry of railY) {
      const rail = metalBox(totalW + 0.16, railH, railD, railMat);
      rail.position.set(0, ry, WALL_Z + 0.04);
      rail.castShadow = true;
      group.add(rail);
    }
    if (rows > 1) {
      const midRail = metalBox(totalW + 0.16, 0.02, railD, railMat);
      midRail.position.set(0, WALL_CENTER_Y, WALL_Z + 0.04);
      group.add(midRail);
    }
    // two vertical mounting posts, flush with the rails
    for (const px of [-totalW / 2 - 0.08, totalW / 2 + 0.08]) {
      const post = metalBox(0.04, totalH + 0.12, railD, railMat);
      post.position.set(px, WALL_CENTER_Y, WALL_Z + 0.04);
      post.castShadow = true;
      group.add(post);
    }
  }

  // ---- the screens ----
  const screens: FeedScreen[] = [];
  const originX = -totalW / 2 + SCR_W / 2;
  const originY = WALL_CENTER_Y + totalH / 2 - SCR_H / 2;
  for (let r = 0; r < rows; r++) {
    for (let cIdx = 0; cIdx < cols; cIdx++) {
      const index = r * cols + cIdx;
      const spec = feedsIn[index];
      const x = originX + cIdx * (SCR_W + GAP);
      const y = originY - r * (SCR_H + GAP);

      const root = new THREE.Group();
      root.position.set(x, y, WALL_Z + 0.06);
      group.add(root);

      // bezel — a shallow box behind the pane, slightly larger
      const bezel = new THREE.Mesh(box(SCR_W + BEZEL * 2, SCR_H + BEZEL * 2, 0.03), bezelMat);
      bezel.position.z = -0.02;
      bezel.castShadow = true;
      root.add(bezel);

      const panelTex = baseFeedTexture(spec.kind, texRes);
      const panelMat = new THREE.MeshBasicMaterial({ map: panelTex, toneMapped: false });
      scratchMats.push(panelMat);
      const panel = new THREE.Mesh(plane(SCR_W, SCR_H), panelMat);
      root.add(panel);

      let sprite: THREE.Mesh | undefined;
      let spriteMat: THREE.MeshBasicMaterial | undefined;
      let anchor: THREE.Object3D;

      if (spec.kind === "tarp" || spec.kind === "bird" || spec.kind === "event") {
        const sTex = spriteTexture(spec.kind);
        spriteMat = new THREE.MeshBasicMaterial({
          map: sTex, transparent: true, toneMapped: false, depthWrite: false,
        });
        scratchMats.push(spriteMat);
        const size = spec.kind === "event" ? SCR_H * 0.62 : SCR_H * 0.30;
        sprite = new THREE.Mesh(plane(size, size), spriteMat);
        sprite.position.set(0, 0, 0.006);
        root.add(sprite);
        anchor = sprite;
      } else {
        /* rain's artifact has no moving sprite — a small marker over the
           glitch patch drawn into the base canvas, so the tracker still has
           something honest to lock onto.

           MUST HAVE REAL GEOMETRY, NOT A BARE Object3D/Group. createTracker's
           follow() calls Box3.setFromObject(target), which only measures
           descendant MESH geometry — an empty Group has none, so the box
           stays permanently empty (min=+Inf, max=-Inf) and getSize() returns
           -Infinity on every axis. That NaN/Infinity size is exactly what
           produced the stray blue cross spanning the whole wall on review;
           it was never a positioning bug, the box itself was degenerate. A
           tiny invisible plane gives Box3 real vertices to measure. */
        const markerGeo = plane(0.05, 0.05);
        const markerMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
        scratchMats.push(markerMat);
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.position.set(SCR_W * 0.12, -SCR_H * 0.10, 0.004);
        root.add(marker);
        anchor = marker;
      }

      screens.push({
        index, spec, root, panel, panelMat, sprite, spriteMat, anchor,
        width: SCR_W, height: SCR_H,
      });
    }
  }

  const dispose = () => {
    for (const g of owned) g.dispose();
    for (const m of scratchMats) m.dispose();
    rackBlue.dispose();
    canonical.dispose();
  };

  return {
    group, screens, feeds: screens,
    lightAnchor: new THREE.Vector3(0, WALL_CENTER_Y, WALL_Z + 0.1),
    wallWidth: totalW, wallHeight: totalH, wallCenterY: WALL_CENTER_Y, deskTopY: DESK_TOP,
    owned, dispose,
  };
}
