/* ---------------------------------------------------------------------------
   Dimension Vision — the subject: a pallet load, and the one item on it a
   tape measure genuinely fails at.

   Claim: "The tape measure retires" — and the copy names the differentiator
   three times: IRREGULARS. Measuring a neat carton proves nothing, so the
   scene's actual subject is a slumped hessian sack with a true bounding cage
   drawn around it, visibly not filling its own cage. A drum and a carton sit
   beside it so the copy's own list ("sacks, drums, soft packs, cylinders") is
   made visible without a caption — the scene measures the hard one.

   See docs/17-scene-plans-audit-dimension-secure.md section 2 for the full
   spec this file implements: world layout (2.3), the sack build (2.4),
   materials (2.5), the detection camera (2.6).

   Coordinates: origin at the centre of the pallet's TOP face. GROUND = 0 is
   the floor; the pallet top sits at PALLET_TOP = 0.145.
--------------------------------------------------------------------------- */
import * as THREE from "three";
import { CANONICAL_BRUSHED, makeMetal, metalBox, tintMetal, type MetalOpts } from "../_vision/metal";
import { buildReadCamera, type ReadCamera } from "../_vision/readCamera";
import { buildCargoMaterials, warmCargoTextures } from "../cargo-vision/cargo";
import { addGrain } from "../_vision/noise";

export const GROUND = 0;
export const PALLET_TOP = 0.145;

/* THE COLOUR ANCHOR SPEC — read verbatim from work-vision/work.ts:133, not
   re-derived. Shared byte-for-byte with secure-vision and audit-vision so all
   three hit one cache entry; see the note at its use below. */
const RACK_BLUE_METAL: MetalOpts = { base: "#2C4A73", kind: "painted", metalness: 0.35, rough: 0.55 };

/* Deterministic hash, 0..1 — the same mix cargo.ts uses, copied rather than
   imported so this file has no cross-scene dependency for one function.
   `Math.random()` is banned in this codebase: a scene that reshuffles itself
   on reload cannot be reviewed, and the sack's cage numbers would disagree
   with themselves between the primed frame and the loop. */
export const rnd = (n: number) => {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

function cv(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d", { willReadFrequently: true })!];
}

/* ---- texture cache + idle warm --------------------------------------------
   Same contract as cargo.ts: a module-level cache only pays off for the
   SECOND consumer, and warmDimensionTextures() is what lazy.tsx's idle chain
   calls so the visitor's own scroll never pays for canvas generation. */
let timberTex: THREE.CanvasTexture | null = null;
let deckTex: THREE.CanvasTexture | null = null;
let calibTex: THREE.CanvasTexture | null = null;

/* hessianCanvas() USED TO LIVE HERE — a hand-painted 512x512 hessian weave for
   the sack. Removed: cargo-vision/cargo.ts already builds a jute-sack material
   (`bag`) from the shared hero-cards kraft board, tighter-tiled and colour-
   corrected against the same five-source rig this scene uses, and its own
   header states nothing there paints its own canvas. Owner review ("the
   textures are not [good]... check out Cargo Vision, copy, take assets,
   reuse") — see buildDimensionMaterials() below, which now calls
   buildCargoMaterials() and takes `bag` for the sack and `cartons[0]` for the
   carton instead of hand-rolling either. */

function timberCanvas(): THREE.CanvasTexture {
  if (timberTex) return timberTex;
  const w = 512, h = 128;
  const [c, x] = cv(w, h);
  x.fillStyle = "#6B5638";
  x.fillRect(0, 0, w, h);
  x.strokeStyle = "rgba(40,26,14,0.20)";
  for (let i = 0; i < 26; i++) {
    x.lineWidth = 0.6 + Math.random() * 1.2;
    x.beginPath();
    x.moveTo(0, (i / 26) * h);
    x.lineTo(w, (i / 26) * h + (Math.random() - 0.5) * 6);
    x.stroke();
  }
  addGrain(x, w, h, 14);
  timberTex = new THREE.CanvasTexture(c);
  timberTex.colorSpace = THREE.SRGBColorSpace;
  timberTex.wrapS = timberTex.wrapT = THREE.RepeatWrapping;
  timberTex.repeat.set(3, 1);
  return timberTex;
}

function deckCanvas(): THREE.CanvasTexture {
  if (deckTex) return deckTex;
  const w = 512, h = 512;
  const [c, x] = cv(w, h);
  /* #191D22, not #0E1014 — work-vision's shipped concrete (work.ts:700). The
     original value was cargo-vision's, and cargo HALVED it because its camera
     looks down at the bay; this camera looks along the deck at 14.2°, which is
     the opposite case and needs the higher albedo. At #0E1014 the slab could
     not be told apart from the #0A0B0E page canvas. See docs/17 sec 0.3a. */
  x.fillStyle = "#191D22";
  x.fillRect(0, 0, w, h);
  /* WEAR, NOT WEATHER. The first pass drew 240 ellipses up to 60x40 px at up to
     0.07 alpha, which at repeat 6 rendered as large soft grey blobs reading as
     stains or cloud — big enough to pull the eye off the sack, which is the one
     thing this scene exists to make you look at. Radii roughly halved and the
     alpha ceiling cut by half: concrete wear should only be visible if you go
     looking for it. */
  for (let i = 0; i < 240; i++) {
    x.fillStyle = `rgba(${Math.random() > 0.5 ? "255,255,255" : "0,0,0"},${0.012 + Math.random() * 0.022})`;
    x.beginPath();
    x.ellipse(Math.random() * w, Math.random() * h, 6 + Math.random() * 26, 5 + Math.random() * 18, Math.random() * 3, 0, Math.PI * 2);
    x.fill();
  }
  addGrain(x, w, h, 12);
  deckTex = new THREE.CanvasTexture(c);
  deckTex.colorSpace = THREE.SRGBColorSpace;
  deckTex.wrapS = deckTex.wrapT = THREE.RepeatWrapping;
  deckTex.repeat.set(6, 6);
  return deckTex;
}

function calibCanvas(): THREE.CanvasTexture {
  if (calibTex) return calibTex;
  const n = 8, cell = 16, w = n * cell, h = n * cell;
  const [c, x] = cv(w, h);
  for (let iy = 0; iy < n; iy++) {
    for (let ix = 0; ix < n; ix++) {
      x.fillStyle = (ix + iy) % 2 === 0 ? "#B8BEC6" : "#15181D";
      x.fillRect(ix * cell, iy * cell, cell, cell);
    }
  }
  calibTex = new THREE.CanvasTexture(c);
  calibTex.colorSpace = THREE.SRGBColorSpace;
  return calibTex;
}

export function warmDimensionTextures() {
  timberCanvas();
  deckCanvas();
  calibCanvas();
  /* The sack and the carton now come from Cargo Vision's own materials
     (buildCargoMaterials, called in buildDimensionMaterials below), so this
     delegates to warmCargoTextures() rather than warming the kraft board
     itself — same contract, one fewer place to forget the second consumer. */
  warmCargoTextures();
  makeMetal({ ...CANONICAL_BRUSHED }).dispose();
  /* RACK_BLUE_METAL's own albedo + roughness canvas + Sobel pass. `painted` is
     a different cache key from CANONICAL_BRUSHED, so warming the canonical
     finish alone leaves this one to be generated on the scroll path. Paid once
     for whichever of Secure/Dimension/Audit builds first on the page. The
     drum stays on this local recipe rather than Cargo's — see the note in
     buildDimensionMaterials(). */
  makeMetal(RACK_BLUE_METAL).dispose();
}

export interface DimensionMaterials {
  paintBlue: THREE.MeshStandardMaterial;
  hessian: THREE.MeshStandardMaterial;
  kraft: THREE.MeshStandardMaterial;
  timber: THREE.MeshStandardMaterial;
  deck: THREE.MeshStandardMaterial;
  steelDark: THREE.MeshStandardMaterial;
  steelMid: THREE.MeshStandardMaterial;
  calib: THREE.MeshBasicMaterial;
  lensGlass: THREE.MeshStandardMaterial;
  all: THREE.Material[];
  dispose: () => void;
}

export function buildDimensionMaterials(): DimensionMaterials {
  const all: THREE.Material[] = [];
  const keep = <T extends THREE.Material>(m: T) => { all.push(m); return m; };

  const brushed = makeMetal({ ...CANONICAL_BRUSHED });
  /* PAINT_BLUE — the colour anchor (the drum).

     #2C4A73 at `kind: "painted"`, read verbatim from work-vision/work.ts:133
     (`RACK_BLUE_METAL`). The previous #24406E was invented for these three
     scenes and rendered essentially black against the #0A0B0E backdrop — it
     is what made Secure Vision read as "dead blue-grey geometry in a void" on
     first review. This is the SHIPPED, signed-off painted-steel blue, so the
     three new scenes read as siblings of Work Vision rather than as cousins in
     a near-miss palette. See docs/17 sec 0.3a.

     It is its own cache key (painted, not a tint of CANONICAL_BRUSHED), which
     is exactly why Secure/Dimension/Audit must all use it verbatim: the first
     of the three to build on a page pays for the canvas and the Sobel pass and
     the other two hit the cache. Warmed in warmDimensionTextures(). */
  const rackBlue = makeMetal(RACK_BLUE_METAL);
  const paintBlue = keep(rackBlue.material);
  const steelDark = keep(tintMetal(brushed.material, "#1A1D22", { metalness: 0.7 }));
  steelDark.roughness = 0.5;
  const steelMid = keep(tintMetal(brushed.material, "#5A626C", { metalness: 0.7 }));
  for (const m of [paintBlue, steelDark, steelMid]) { m.transparent = true; m.opacity = 0; }
  brushed.dispose();

  /* THE SACK AND THE CARTON — reused from Cargo Vision rather than painted
     here (owner review: "the textures are not [good]... check out Cargo
     Vision. Copy, take assets, reuse"). buildCargoMaterials() is a plain
     builder function, not a cache — it returns a FRESH, unshared set of
     materials on every call (only the underlying textures are cached, per its
     own header), so this instance is ours alone to ramp opacity on every
     frame and ours alone to dispose. `cargoMats.dispose()` below disposes the
     whole set, including the several members this scene never uses (deck,
     belt, slat, frame, roller, far row, void/lane/threshold) — none of them
     are attached to any geometry here, so disposing an unused material is a
     no-op beyond freeing the JS object.

     REJECTED: cargo's `drum` and `rib`. The drum's blue (RACK_BLUE_METAL,
     above) is documented as the signed-off, shipped colour anchor shared
     byte-for-byte with Secure and Audit Vision — "so the three new scenes
     read as siblings ... rather than as cousins in a near-miss palette."
     Swapping it for Cargo's neutral steel tint (#4E5862) would silently
     overturn that decision for two scenes this file doesn't own and that are
     being edited concurrently. It also isn't the problem Task 1 is aimed at:
     the drum and its hoops were never hand-painted canvases, they already
     ride makeMetal's shared cache exactly the way Cargo's drum does — there
     is no redundant canvas generation to eliminate by switching. */
  const cargoMats = buildCargoMaterials();
  const hessian = cargoMats.bag;       // the sack
  const kraft = cargoMats.cartons[0];  // the carton

  const timber = keep(new THREE.MeshStandardMaterial({
    map: timberCanvas(), color: "#8A7250", metalness: 0, roughness: 0.85,
    envMapIntensity: 0.12, transparent: true, opacity: 0,
  }));

  const deck = keep(new THREE.MeshStandardMaterial({
    map: deckCanvas(), color: "#FFFFFF", metalness: 0, roughness: 0.97,
    envMapIntensity: 0.10, transparent: true, opacity: 0,
  }));

  const calib = keep(new THREE.MeshBasicMaterial({
    map: calibCanvas(), toneMapped: false, transparent: true, opacity: 0,
  }));

  const lensGlass = keep(new THREE.MeshStandardMaterial({
    color: "#05070A", metalness: 0.9, roughness: 0.08, transparent: true, opacity: 0,
  }));

  return {
    paintBlue, hessian, kraft, timber, deck, steelDark, steelMid, calib, lensGlass, all,
    dispose: () => { all.forEach((m) => m.dispose()); cargoMats.dispose(); },
  };
}

/* ---- THE SACK — the scene's whole argument (spec 2.4) ---------------------

   Built from a SphereGeometry, scaled to an ellipsoid and vertex-displaced
   deterministically. Every "random-looking" number is `rnd(vertex index)`, so
   the shape is byte-identical on every reload — the primed frame, the loop
   and the stated dimensions all have to agree, or the cage's own numbers are
   a lie.

   MEASURED, NOT ASSUMED. The bounds this produces are read back with
   `Box3.setFromObject` immediately after build (see `buildDimension`) and
   published on the returned model as `sackBounds` — the cage, the chains and
   the readout all draw from THAT number, not from the spec's target figures.
   If the displacement ever changes, the labels change with it by
   construction rather than by someone remembering to update a string. */
function buildSackGeometry(): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(0.30, 20, 14);
  g.scale(1.05, 0.62, 0.86);
  const radiusY = 0.30 * 0.62;
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const ny = y / radiusY; // -1 at the base .. +1 at the top
    // vertical squash increasing toward the base
    y *= 1 - 0.22 * Math.max(0, -ny);
    // lateral bulge at the base, tapering to zero by the equator so it never
    // exceeds the ellipsoid's own equatorial width — see the arithmetic note
    // in the header of dimension-vision/scene.tsx
    const belowBase = Math.max(0, -ny);
    const bulge = 1 + 0.18 * belowBase * belowBase;
    x *= bulge; z *= bulge;
    // per-vertex jitter, +-0.018, seeded on the vertex index — never Math.random()
    const j = (rnd(i) * 2 - 1) * 0.018;
    const len = Math.hypot(x, y, z) || 1;
    x += (x / len) * j;
    y += (y / len) * j;
    z += (z / len) * j;
    pos.setXYZ(i, x, y, z);
  }
  // sit the (squashed) base on y = 0
  g.computeBoundingBox();
  const minY = g.boundingBox!.min.y;
  g.translate(0, -minY, 0);
  // flatten the bottom ring and pull it outward so the sack sits ON the
  // pallet rather than intersecting it
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (y < 0.006) {
      y = Math.max(0, y);
      x *= 1.06; z *= 1.06;
    }
    pos.setXYZ(i, x, y, z);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

/** Tied neck at the top of the sack, plus two crossed ties. */
function buildSackNeck(mat: THREE.Material, sackTopY: number, owned: THREE.BufferGeometry[]): THREE.Group {
  const g = new THREE.Group();
  const neckGeo = new THREE.CylinderGeometry(0.045, 0.07, 0.09, 12);
  owned.push(neckGeo);
  const neck = new THREE.Mesh(neckGeo, mat);
  neck.position.y = sackTopY + 0.045 - 0.01;
  g.add(neck);
  const tieGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.11, 6);
  owned.push(tieGeo);
  for (const rot of [0.5, -0.5]) {
    const tie = new THREE.Mesh(tieGeo, mat);
    tie.position.y = sackTopY + 0.045;
    tie.rotation.z = rot;
    g.add(tie);
  }
  return g;
}

export interface SackBounds {
  /** local-space box, relative to the sack group's own origin (its base) */
  min: THREE.Vector3;
  max: THREE.Vector3;
  L: number; W: number; H: number;
  cageVolume: number;
  /** true enclosed volume of the displaced mesh — the gap between this and
      cageVolume is the point of the scene */
  actualVolume: number;
}

/** Enclosed volume of a closed triangle mesh via the divergence theorem. */
function meshVolume(geo: THREE.BufferGeometry): number {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const idx = geo.index;
  let vol = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const tri = (i0: number, i1: number, i2: number) => {
    a.fromBufferAttribute(pos, i0);
    b.fromBufferAttribute(pos, i1);
    c.fromBufferAttribute(pos, i2);
    vol += a.dot(b.clone().cross(c)) / 6;
  };
  if (idx) { for (let i = 0; i < idx.count; i += 3) tri(idx.getX(i), idx.getX(i + 1), idx.getX(i + 2)); }
  else { for (let i = 0; i < pos.count; i += 3) tri(i, i + 1, i + 2); }
  return Math.abs(vol);
}

/* ---- the pallet -------------------------------------------------------- */
function buildPallet(m: DimensionMaterials, owned: THREE.BufferGeometry[]): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const z = -0.50 + (i / 6) * 1.00;
    const b = metalBox(1.20, 0.022, 0.098, m.timber, 0.006);
    b.position.set(0, 0.115, z);
    b.castShadow = true; b.receiveShadow = true;
    g.add(b);
  }
  for (const x of [-0.50, 0, 0.50]) {
    const s = metalBox(0.10, 0.11, 1.00, m.timber, 0.006);
    s.position.set(x, 0.055, 0);
    s.castShadow = true; s.receiveShadow = true;
    g.add(s);
  }
  for (let i = 0; i < 3; i++) {
    const z = -0.50 + (i / 2) * 1.00;
    const b = metalBox(1.20, 0.022, 0.12, m.timber, 0.006);
    b.position.set(0, 0.011, z);
    b.receiveShadow = true;
    g.add(b);
  }
  return g;
}

export interface DimensionModel {
  root: THREE.Group;
  /** the pallet TOP surface, world Y — PALLET_TOP */
  palletTop: number;
  /** the sack group — position IS its base, at the pallet top */
  sackGroup: THREE.Group;
  sackBounds: SackBounds;
  drum: THREE.Group;
  carton: THREE.Mesh;
  calibPlate: THREE.Mesh;
  /** the gantry beam — parent for the read camera */
  gantryBeam: THREE.Group;
  readCam: ReadCamera;
  owned: THREE.BufferGeometry[];
}

export function buildDimension(m: DimensionMaterials): DimensionModel {
  const root = new THREE.Group();
  const owned: THREE.BufferGeometry[] = [];

  const deckGeo = new THREE.PlaneGeometry(24, 24);
  owned.push(deckGeo);
  const deck = new THREE.Mesh(deckGeo, m.deck);
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = GROUND;
  deck.receiveShadow = true;
  root.add(deck);

  /* ---- the pallet + its load ---- */
  const pallet = buildPallet(m, owned);
  pallet.position.y = 0; // deck boards etc already authored at their own y
  root.add(pallet);

  /* ---- the sack (the subject) ---- */
  const sackGeo = buildSackGeometry();
  owned.push(sackGeo);
  const sackGroup = new THREE.Group();
  sackGroup.position.set(-0.02, PALLET_TOP, 0.06);
  const sackMesh = new THREE.Mesh(sackGeo, m.hessian);
  sackMesh.castShadow = true;
  sackMesh.receiveShadow = true;
  sackGroup.add(sackMesh);
  const bb = sackGeo.boundingBox!;
  const neck = buildSackNeck(m.hessian, bb.max.y, owned);
  sackGroup.add(neck);
  root.add(sackGroup);

  const size = new THREE.Vector3();
  bb.getSize(size);
  const sackBounds: SackBounds = {
    min: bb.min.clone(), max: bb.max.clone(),
    L: size.x, W: size.z, H: size.y,
    cageVolume: size.x * size.y * size.z,
    actualVolume: meshVolume(sackGeo),
  };

  /* ---- the drum ---- */
  const drum = new THREE.Group();
  const drumGeo = new THREE.CylinderGeometry(0.145, 0.145, 0.56, 20);
  owned.push(drumGeo);
  const drumMesh = new THREE.Mesh(drumGeo, m.paintBlue);
  drumMesh.position.y = 0.28;
  drumMesh.castShadow = true; drumMesh.receiveShadow = true;
  drum.add(drumMesh);
  const hoopGeo = new THREE.CylinderGeometry(0.152, 0.152, 0.02, 20);
  owned.push(hoopGeo);
  for (const y of [0.29, 0.55]) {
    const hoop = new THREE.Mesh(hoopGeo, m.steelMid);
    hoop.position.y = y;
    drum.add(hoop);
  }
  drum.position.set(0.40, PALLET_TOP, -0.30);
  root.add(drum);

  /* ---- the carton ---- */
  const carton = metalBox(0.34, 0.28, 0.26, m.kraft, 0.012);
  carton.position.set(-0.42, PALLET_TOP + 0.14, -0.32);
  carton.castShadow = true; carton.receiveShadow = true;
  root.add(carton);

  /* ---- the gantry ----------------------------------------------------------

     THE UPRIGHTS ARE OUTSIDE THE FRUSTUM, AND THE POSITION IS DERIVED.

     At x = +-1.30 they sat just inside the frame edge and rendered as two thick
     black vertical bars cropping the picture — structure the camera reads as
     being stuck behind rather than as a gantry standing over a pallet.

     Half-frame width in world units, at the look-at depth and the scene's
     TIGHTEST rad (the p=0.72 key, rad 3.64):

         halfW = rad * TAN_VFOV_HALF * aspect
               = 3.64 * 0.267949 * 1.452
               = 1.416

     and at the widest key (rad 3.95): 3.951 * 0.267949 * 1.452 = 1.537. So the
     frame edge sweeps x = +-1.42 .. +-1.54 across the loop, and +-1.30 is
     inside it at EVERY key — which is why the bars never went away.

     +-2.10 clears the widest edge by 0.56, comfortably outside at all five
     keys with room for the camera's lateral slide (t.x runs -0.06..0.00).
     The beam widens to 4.29 to span them (2 * 2.10 + 0.09).

     The beam itself is already out of shot and stays that way: it sits at
     y 2.26, while the frame spans y = 0.55 +- (3.95 * 0.267949) = -0.51..1.61.
     So widening it costs nothing visually and the read camera bracketed to it
     is unaffected. */
  const uprightGeo = new THREE.BoxGeometry(0.09, 2.30, 0.09);
  owned.push(uprightGeo);
  for (const x of [-2.10, 2.10]) {
    const u = new THREE.Mesh(uprightGeo, m.steelDark);
    u.position.set(x, 1.15, -0.05);
    u.castShadow = true;
    root.add(u);
  }
  const gantryBeam = new THREE.Group();
  gantryBeam.position.set(0, 2.26, -0.05);
  const beamGeo = new THREE.BoxGeometry(4.29, 0.10, 0.10);
  owned.push(beamGeo);
  const beamMesh = new THREE.Mesh(beamGeo, m.steelDark);
  beamMesh.castShadow = true;
  gantryBeam.add(beamMesh);
  root.add(gantryBeam);

  /* ---- calibration target plate ---- */
  const calibGeo = new THREE.PlaneGeometry(0.30, 0.30);
  owned.push(calibGeo);
  const calibPlate = new THREE.Mesh(calibGeo, m.calib);
  calibPlate.rotation.x = -Math.PI / 2;
  calibPlate.position.set(0.95, 0.005, 0.62);
  root.add(calibPlate);

  /* ---- the detection camera, bracket-mounted to the gantry beam ---- */
  const readCam = buildReadCamera({
    mount: new THREE.Vector3(-0.55, 2.16, -0.05),
    aim: new THREE.Vector3(-0.02, 0.33, 0.06),
    bodyMat: m.steelDark, lensMat: m.lensGlass,
    coneRadius: 0.34,
    minHalfAngle: 0.10,
    floorY: PALLET_TOP,
    headTracks: true,
    bodySize: [0.17, 0.15, 0.29],
    hood: true, yoke: true,
  });
  /* The rig is authored in the beam's WORLD position (mount is the world
     mount point), so parenting `group` under the beam — which itself sits at
     y=2.26 — would double-apply that offset. The rig has no beam-relative
     coordinate space of its own; it is added straight to `root` instead,
     which is the beam's own parent, so the housing lands exactly at `mount`
     regardless of the beam's local transform. `coneGroup` is the scene's to
     add (see readCamera.ts's header — it must stay a sibling in WORLD space,
     never a child of anything that rotates). */
  root.add(readCam.group);

  return {
    root, palletTop: PALLET_TOP, sackGroup, sackBounds, drum, carton, calibPlate,
    gantryBeam, readCam, owned,
  };
}
