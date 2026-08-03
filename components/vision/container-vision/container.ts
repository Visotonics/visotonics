/* ---------------------------------------------------------------------------
   Container Vision — procedural 20ft ISO container.

   No GLB exists and none is being commissioned, so the "real hard object" is
   built procedurally to the exact proportions the schematic SVG specifies
   (6058 x 2591 x 2438 mm ≈ 20ft ISO), with true folded corrugation geometry
   (real light-catching ridges, not a normal-map fake), corner castings,
   forklift pockets and door-end hardware.

   Defect anchor positions are lifted straight from the SVG's detection boxes so
   the scan later reveals damage exactly where the "game plan" says it is.
--------------------------------------------------------------------------- */
import * as THREE from "three";
import { PALETTE } from "./palette";

// meters (SVG is a uniform ~7.97 mm/unit drawing of a real 20ft box)
export const L = 6.058; // length  (x)
export const H = 2.591; // height  (y)
export const W = 2.438; // width   (z)
const hx = L / 2;
const hy = H / 2;
const hz = W / 2;

const RIDGE = 0.045; // corrugation depth
const CORR_PITCH = 0.18; // spacing between corrugation ridges

export type DefectId = "dent" | "rust" | "crack" | "seal" | "dent-top";
export interface DefectAnchor {
  id: DefectId;
  title: string; // readable finding name
  detail: string; // confidence / area sub-line
  pos: THREE.Vector3; // world anchor on the object surface
  normal: THREE.Vector3; // surface normal (for reticle facing / leader)
  size: number; // reticle scale (m)
  severe: boolean; // true -> the single reserved warm reticle
}

// SVG-normalized defect positions (u across length, v top-down), reused by the
// front-face material to bake damage at the same spots the reticles lock onto.
export const DEFECT_UV = {
  dent: { u: 0.371, v: 0.388 },
  rust: { u: 0.624, v: 0.723 },
  crack: { u: 0.834, v: 0.474 },
} as const;

/* Trapezoidal corrugation profile displacement for a coordinate `t` (meters)
   running along the corrugated axis. Smooth-ish trapezoid reads as pressed
   steel. */
function corrugation(t: number): number {
  const phase = (t / CORR_PITCH) * Math.PI * 2;
  // rounded square wave -> pressed ridges
  const s = Math.tanh(Math.sin(phase) * 2.2);
  return s * (RIDGE / 2);
}

interface PanelOpts {
  flat?: boolean;
  segY?: number;
  sculpt?: (x: number, y: number) => number; // extra inward/outward z (m)
  flatten?: (x: number, y: number) => number; // 1 = full corrugation, 0 = flat
}

/* A corrugated panel in local space: spans `span` along local X (corrugated),
   `height` along local Y, displaced along local +Z. Caller rotates/positions
   it onto a face. `sculpt` lets the front face carry real dent/crack depth. */
function corrugatedPanel(span: number, height: number, opts: PanelOpts = {}): THREE.BufferGeometry {
  const { flat = false, segY = 6, sculpt, flatten } = opts;
  const segX = Math.max(2, Math.round(span / (CORR_PITCH / 6)));
  const geo = new THREE.PlaneGeometry(span, height, segX, segY);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const edge = Math.abs(y) > height / 2 - 0.08;
    let z = flat || edge ? 0 : corrugation(x) * (flatten ? flatten(x, y) : 1);
    if (sculpt) z += sculpt(x, y);
    pos.setZ(i, z);
  }
  geo.computeVertexNormals();
  return geo;
}

// local-space coords of the front-face dent (front panel: worldX=localX, worldY=localY)
const dentLX = (DEFECT_UV.dent.u - 0.5) * L;
const dentLY = (0.5 - DEFECT_UV.dent.v) * H;

/* Flat marking plaque so the painted ID stays legible — real containers carry
   a flat plate for markings. Returns 1 = full corrugation, 0 = flat. */
const PLAQUE = { x0: -2.95, x1: -1.05, y0: -0.62, y1: 0.62, feather: 0.14 };
function frontFlatten(x: number, y: number): number {
  const s = (t: number) => { const c = Math.min(1, Math.max(0, t)); return c * c * (3 - 2 * c); };
  const inside = Math.min(
    s((x - PLAQUE.x0) / PLAQUE.feather), s((PLAQUE.x1 - x) / PLAQUE.feather),
    s((y - PLAQUE.y0) / PLAQUE.feather), s((PLAQUE.y1 - y) / PLAQUE.feather),
  );
  return 1 - inside;
}

/* Irregular radius: real impact damage is lopsided, never a clean circle. The
   radius wobbles with angle and the floor of the dish is offset from centre. */
function dish(x: number, y: number, cx: number, cy: number, R: number, depth: number, seed: number): number {
  const dx = x - cx;
  const dy = y - cy;
  const ang = Math.atan2(dy, dx);
  const wob =
    1 +
    0.3 * Math.sin(ang * 2 + seed) +
    0.19 * Math.sin(ang * 3 - seed * 1.7) +
    0.12 * Math.sin(ang * 5 + seed * 2.3);
  const rEff = R * wob;
  const dr = Math.hypot(dx, dy);
  if (dr >= rEff) return 0;
  const t = dr / rEff;
  // off-centre floor, so one side of the dish is steeper than the other
  const bias = 1 + 0.22 * Math.cos(ang - seed);
  return -depth * bias * (0.5 + 0.5 * Math.cos(Math.PI * t));
}

function roofSculpt(x: number, y: number): number {
  // two overlapping lobes read as a struck, buckled panel rather than a bowl
  return (
    dish(x, y, -1.1, 0.2, 0.6, 0.12, 1.4) +
    dish(x, y, -0.78, 0.34, 0.34, 0.06, 3.9)
  );
}

/* Real dent depth pressed into the front face. */
function frontSculpt(x: number, y: number): number {
  // lopsided main impact plus a shallower secondary crease alongside it
  return (
    dish(x, y, dentLX, dentLY, 0.62, 0.13, 0.6) +
    dish(x, y, dentLX + 0.34, dentLY - 0.22, 0.3, 0.055, 2.8)
  );
}

function casting(): THREE.BufferGeometry {
  // ISO corner casting — chamfered block
  const g = new THREE.BoxGeometry(0.178, 0.162, 0.162);
  return g;
}

export interface ContainerBuild {
  group: THREE.Group;
  shell: THREE.Mesh[]; // corrugated steel panels + ends + roof/floor
  hardware: THREE.Mesh[]; // castings, rods, pockets
  defects: DefectAnchor[];
  ocr: { pos: THREE.Vector3; normal: THREE.Vector3 }; // stencilled markings block
  edges: THREE.LineSegments; // blueprint wireframe (Act 1 draw-on)
  bounds: { hx: number; hy: number; hz: number };
}

export function buildContainer(steel: THREE.Material, dark: THREE.Material, frontMat?: THREE.Material): ContainerBuild {
  const group = new THREE.Group();
  const shell: THREE.Mesh[] = [];
  const hardware: THREE.Mesh[] = [];

  const addShell = (geo: THREE.BufferGeometry, mat: THREE.Material) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    shell.push(m);
    return m;
  };

  // front (+z) & back (-z) corrugated sides
  // front carries the real damage depth + baked wear + scan shader (hi-res)
  const front = addShell(corrugatedPanel(L, H, { segY: 96, sculpt: frontSculpt, flatten: frontFlatten }), frontMat ?? steel);
  front.position.set(0, 0, hz - RIDGE / 2);
  const back = addShell(corrugatedPanel(L, H), steel);
  back.rotation.y = Math.PI;
  back.position.set(0, 0, -hz + RIDGE / 2);

  // far end (-x) corrugated
  const farEnd = addShell(corrugatedPanel(W, H), steel);
  farEnd.rotation.y = -Math.PI / 2;
  farEnd.position.set(-hx + RIDGE / 2, 0, 0);

  // roof (+y) lightly corrugated, floor (-y) flat
  const roof = addShell(corrugatedPanel(L, W, { segY: 80, sculpt: roofSculpt }), steel);
  roof.rotation.x = -Math.PI / 2;
  roof.position.set(0, hy - RIDGE / 2, 0);
  const floor = addShell(corrugatedPanel(L, W, { flat: true }), dark);
  floor.rotation.x = Math.PI / 2;
  floor.position.set(0, -hy + RIDGE / 2, 0);

  // door end (+x): flat leaves + locking rods + hinges + lock box
  const doorEnd = addShell(new THREE.PlaneGeometry(W, H), steel);
  doorEnd.rotation.y = Math.PI / 2;
  doorEnd.position.set(hx, 0, 0);

  // two door leaves gap line
  const rodMat = dark;
  const addHW = (geo: THREE.BufferGeometry, mat: THREE.Material) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    group.add(m);
    hardware.push(m);
    return m;
  };
  // 4 vertical locking rods across the door end
  for (const zf of [-0.62, -0.22, 0.22, 0.62]) {
    const rod = addHW(new THREE.CylinderGeometry(0.02, 0.02, H * 0.86, 10), rodMat);
    rod.position.set(hx + 0.02, 0, zf * hz);
    // handle cams
    const cam = addHW(new THREE.BoxGeometry(0.06, 0.12, 0.05), rodMat);
    cam.position.set(hx + 0.04, -0.05, zf * hz);
  }
  // hinge pins along the +z and -z door edges
  for (const zf of [-1, 1]) {
    for (const yf of [-0.78, 0, 0.78]) {
      const pin = addHW(new THREE.BoxGeometry(0.04, 0.12, 0.05), rodMat);
      pin.position.set(hx + 0.02, yf * hy, zf * (hz - 0.02));
    }
  }
  // lock box
  const lockbox = addHW(new THREE.BoxGeometry(0.05, 0.2, 0.34), rodMat);
  lockbox.position.set(hx + 0.03, -hy * 0.62, hz * 0.32);

  // 8 corner castings
  for (const xf of [-1, 1]) {
    for (const yf of [-1, 1]) {
      for (const zf of [-1, 1]) {
        const c = addHW(casting(), dark);
        c.position.set(xf * (hx - 0.05), yf * (hy - 0.05), zf * (hz - 0.05));
      }
    }
  }

  // forklift pockets — recesses on the bottom front rail
  for (const xf of [-0.28, 0.28]) {
    const p = addHW(new THREE.BoxGeometry(0.42, 0.14, 0.1), dark);
    p.position.set(xf * L, -hy + 0.12, hz - 0.02);
    hardware.push(p);
  }

  // --- blueprint wireframe (Act 1 "draw-on") ---
  const box = new THREE.BoxGeometry(L, H, W);
  const edgeGeo = new THREE.EdgesGeometry(box);
  const edges = new THREE.LineSegments(
    edgeGeo,
    new THREE.LineBasicMaterial({ color: PALETTE.accent, transparent: true, opacity: 0 }),
  );
  group.add(edges);

  // --- defect anchors, distributed across faces to demonstrate multi-face detection ---
  const nFront = new THREE.Vector3(0, 0, 1);
  const nDoor = new THREE.Vector3(1, 0, 0);
  const nRoof = new THREE.Vector3(0, 1, 0);
  const onFront = (u: number, v: number) => new THREE.Vector3(-hx + u * L, hy - v * H, hz + 0.02);
  const onDoor = (u: number, v: number) => new THREE.Vector3(hx + 0.02, hy - v * H, -hz + u * W);
  const onRoof = (x: number, z: number) => new THREE.Vector3(x, hy + 0.02, z);

  const defects: DefectAnchor[] = [
    { id: "dent", title: "Dent", detail: "84% confidence · 412 mm²", pos: onFront(DEFECT_UV.dent.u, DEFECT_UV.dent.v), normal: nFront, size: 0.9, severe: false },
    { id: "rust", title: "Corrosion", detail: "91% confidence · 96 mm²", pos: onFront(DEFECT_UV.rust.u, DEFECT_UV.rust.v), normal: nFront, size: 0.66, severe: false },
    { id: "crack", title: "Structural crack", detail: "77% confidence · 128 mm²", pos: onRoof(1.35, 0.05), normal: nRoof, size: 1.5, severe: true },
    { id: "dent-top", title: "Roof dent", detail: "88% confidence · 305 mm²", pos: onRoof(-1.1, -0.2), normal: nRoof, size: 1.1, severe: false },
    // bolt seal sits on the right-door locking-bar handle, mid-height
    { id: "seal", title: "Door seal intact", detail: "97% confidence", pos: onDoor(0.64, 0.56), normal: nDoor, size: 0.4, severe: false },
  ];

  // OCR target — just below the stencilled markings block, so the marker
  // never covers the characters being read
  const ocr = { pos: onFront(0.185, 0.73), normal: nFront };

  return { group, shell, hardware, defects, ocr, edges, bounds: { hx, hy, hz } };
}
