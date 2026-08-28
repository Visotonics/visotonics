/* ---------------------------------------------------------------------------
   Audit Vision — the subject: a packing bench, a carton sealed by hand, and a
   barcode scanner that stays dark in its cradle the entire time.

   Spine, from docs/17-scene-plans-audit-dimension-secure.md §3: "no barcode,
   no trigger-man" is argued visually by a scanner that sits present, clearly
   a scanner, and clearly untouched, while the record is bound anyway. Every
   consumer of this module must respect two invariants that are load-bearing
   for that argument:

     1. `mats.ledOff` NEVER changes value, at any p, for any reason. See the
        comment at its definition.
     2. Nothing in this file ever animates a hand or an arm toward the
        scanner at (-0.86, ..., 0.20). The figure's one animated joint reaches
        forward toward the carton at x ~0.10, on the OPPOSITE side of frame.

   Position convention: BOX/STANDING objects (carton, scanner, totes, tape
   gun, figure) are positioned by their BASE — the y they rest at — matching
   the plan's own "the bench top, not the floor" framing for the read camera
   and for the pallet-top convention Dimension Vision uses for its sack. FLAT
   objects (bench top, shelf, header rail, legs, posts) are positioned by
   their CENTRE, matching the plan's shutter-post arithmetic elsewhere in the
   same document (1.55 = half of 3.10). Where the plan's literal y digit for a
   resting object only works under BASE (the carton at 0.955, exactly the
   bench top height, would sink 160mm into the bench under a centre reading)
   this file takes BASE — flagged here rather than silently guessed, per the
   agent brief's instruction to report rather than paper over a spec/geometry
   collision. See the build report for the specific case.
--------------------------------------------------------------------------- */
import * as THREE from "three";
import { makeMetal, tintMetal, CANONICAL_BRUSHED } from "../_vision/metal";
import { addGrain } from "../_vision/noise";
import { cardboardSide } from "../hero-cards/skins";

export const GROUND = 0;
/** The bench top — NOT the floor. Every raised-surface number in this file
    derives from this one constant, per the readCamera and studio floorY note. */
export const BENCH_TOP = 0.955;

/* willReadFrequently — every canvas below ends in addGrain(), a getImageData
   round trip; see metal.ts's note on why this matters on a page with several
   live WebGL contexts. */
function cv(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d", { willReadFrequently: true })!];
}
function finishTex(c: HTMLCanvasElement, repeat: [number, number] = [1, 1]) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  return t;
}

/* ---- module-level texture cache -------------------------------------------
   Same contract as every other *-vision materials module: generated at most
   once per page, never disposed, warmed off the idle chain. */
let deckMapCache: THREE.Texture | null = null;
function deckMap(): THREE.Texture {
  if (deckMapCache) return deckMapCache;
  const S = 1024;
  const [c, x] = cv(S, S);
  /* #191D22, NOT #15181D. This camera looks ALONG the floor at ~12.3
     elevation (see scene.tsx's camera derivation), the same geometry
     work-vision's floor is tuned for — its own note at work.ts:700 records
     moving from #15181D to #191D22 for exactly this reason: at the lower
     value the slab reads as a backdrop panel rather than ground. Reused
     verbatim rather than re-derived. */
  x.fillStyle = "#191D22";
  x.fillRect(0, 0, S, S);
  addGrain(x, S, S, 9);
  /* Soft mottled patches, power-trowelled concrete at the metre scale. 0.12,
     up from 0.10 — work.ts's own floor pass (work.ts:244) found 0.08 read as
     a diagram rather than a floor and went to 0.12 for the same reason; this
     canvas was under that value. Still subtractive-only and capped well
     below "stain" per the house rule (Dimension's own patch-alpha mistake). */
  for (let i = 0; i < 6; i++) {
    const px = ((i * 173) % S), py = ((i * 281) % S);
    const pr = S * 0.18;
    const g = x.createRadialGradient(px, py, 0, px, py, pr);
    g.addColorStop(0, "rgba(0,0,0,0.12)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g;
    x.fillRect(px - pr, py - pr, pr * 2, pr * 2);
  }
  /* Hairline expansion joints, same device as work.ts's floorMap (work.ts:299)
     — a flat mottled fill with no line work at all is exactly what reads as
     "backdrop panel" rather than a poured slab. Two on the tile edges so
     RepeatWrapping turns them into a continuous grid rather than three marks
     repeating inside every tile. */
  x.strokeStyle = "rgba(14,17,20,0.5)";
  x.lineWidth = 1;
  for (const u of [0.5, S / 2 + 0.5]) {
    x.beginPath(); x.moveTo(u, 0); x.lineTo(u, S); x.stroke();
  }
  x.beginPath(); x.moveTo(0, 0.5); x.lineTo(S, 0.5); x.stroke();
  deckMapCache = finishTex(c, [10, 10]);
  return deckMapCache;
}

let benchMapCache: THREE.Texture | null = null;
function benchTopMap(): THREE.Texture {
  if (benchMapCache) return benchMapCache;
  const S = 512;
  const [c, x] = cv(S, S);
  x.fillStyle = "#4A3E2C";
  x.fillRect(0, 0, S, S);
  addGrain(x, S, S, 10);
  x.strokeStyle = "rgba(20,16,10,0.28)";
  x.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const y = Math.floor(S * (0.1 + 0.8 * (i / 6))) + 0.5;
    x.beginPath(); x.moveTo(0, y); x.lineTo(S, y + (i % 2 ? 6 : -6)); x.stroke();
  }
  // two worn corner patches
  for (const [px, py] of [[0.15 * S, 0.2 * S], [0.85 * S, 0.75 * S]]) {
    const pr = S * 0.14;
    const g = x.createRadialGradient(px, py, 0, px, py, pr);
    g.addColorStop(0, "rgba(210,200,180,0.10)");
    g.addColorStop(1, "rgba(210,200,180,0)");
    x.fillStyle = g;
    x.fillRect(px - pr, py - pr, pr * 2, pr * 2);
  }
  benchMapCache = finishTex(c);
  return benchMapCache;
}

let boardCache: THREE.Texture | null = null;
function kraftTex() {
  if (!boardCache) boardCache = cardboardSide();
  return boardCache;
}

/* THE PAINTED-STEEL BLUE, MATCHED EXACTLY TO work-vision's RACK_BLUE_METAL
   (work.ts:133) — `base:"#2C4A73", kind:"painted", metalness:0.35,
   rough:0.55`, not a tint of CANONICAL_BRUSHED. This is the family blue all
   three new scenes are converging on: metal.ts's cache is keyed on the exact
   option object, so matching it byte-for-byte (not just by hex) means the
   second and third scene to build get a free hit on the albedo, roughness
   and Sobel-normal canvases instead of paying for their own. */
const PAINT_BLUE_SPEC = { base: "#2C4A73", kind: "painted", metalness: 0.35, rough: 0.55 } as const;

export function warmAuditTextures() {
  deckMap();
  benchTopMap();
  kraftTex();
  makeMetal({ ...CANONICAL_BRUSHED }).dispose();
  makeMetal({ ...PAINT_BLUE_SPEC }).dispose();
}

export interface AuditMaterials {
  paintBlue: THREE.MeshStandardMaterial;
  steelDark: THREE.MeshStandardMaterial;
  steelMid: THREE.MeshStandardMaterial;
  scanner: THREE.MeshStandardMaterial;
  /** #2A2E34, MeshBasicMaterial, toneMapped:false. NEVER LIT. No consumer of
      this file may write `.color`, `.opacity` beyond the shared intro ramp,
      or any uniform on this material at any p. If the scanner's LED ever
      lights, the scene has argued the opposite of its own eyebrow
      ("no barcode, no trigger-man") — see the header. */
  ledOff: THREE.MeshBasicMaterial;
  bench: THREE.MeshStandardMaterial;
  deck: THREE.MeshStandardMaterial;
  wall: THREE.MeshStandardMaterial;
  kraft: THREE.MeshStandardMaterial;
  tape: THREE.MeshStandardMaterial;
  lens: THREE.MeshStandardMaterial;
  // figure — hex values read verbatim from work-vision/work.ts, not re-derived
  vest: THREE.MeshStandardMaterial;
  refl: THREE.MeshStandardMaterial;
  shirt: THREE.MeshStandardMaterial;
  glove: THREE.MeshStandardMaterial;
  skin: THREE.MeshStandardMaterial;
  helmet: THREE.MeshStandardMaterial;
  all: THREE.Material[];
  dispose: () => void;
}

export function buildAuditMaterials(): AuditMaterials {
  warmAuditTextures();
  const all: THREE.Material[] = [];
  const keep = <T extends THREE.Material>(m: T) => { all.push(m); return m; };

  const canonical = makeMetal({ ...CANONICAL_BRUSHED }).material;
  // NOT a tint of canonical — its own spec, matched to work-vision's shipped
  // RACK_BLUE_METAL exactly. See PAINT_BLUE_SPEC's note above.
  const paintBlue = keep(makeMetal({ ...PAINT_BLUE_SPEC }).material);
  const steelDark = keep(tintMetal(canonical, "#1A1D22"));
  const steelMid = keep(tintMetal(canonical, "#5A626C"));
  const scanner = keep(tintMetal(canonical, "#15181D"));
  scanner.roughness = 1;

  const ledOff = keep(new THREE.MeshBasicMaterial({
    color: "#2A2E34", toneMapped: false, transparent: true, opacity: 0,
  }));

  const bench = keep(new THREE.MeshStandardMaterial({
    map: benchTopMap(), color: "#FFFFFF", roughness: 0.8, metalness: 0.0,
    transparent: true, opacity: 0,
  }));
  /* envMapIntensity 0.10, matching work.ts's floor (work.ts:711) exactly.
     Left at the MeshStandardMaterial default (1.0) this slab was picking up
     the full studio env reflection on top of its own canvas, which is most of
     why it read as a flat lit panel rather than ground — the reflection
     drowns the texture detail that says "concrete" rather than "backdrop". */
  const deck = keep(new THREE.MeshStandardMaterial({
    map: deckMap(), color: "#FFFFFF", roughness: 0.95, metalness: 0.04,
    envMapIntensity: 0.10, transparent: true, opacity: 0,
  }));
  const wall = keep(new THREE.MeshStandardMaterial({
    color: "#0C0E12", roughness: 0.95, metalness: 0.0, transparent: true, opacity: 0,
  }));
  const kraft = keep(new THREE.MeshStandardMaterial({
    map: kraftTex(), color: "#FFFFFF", roughness: 0.88, metalness: 0.0,
    transparent: true, opacity: 0,
  }));
  const tape = keep(new THREE.MeshStandardMaterial({
    color: "#C8C2AE", roughness: 0.35, metalness: 0.02, transparent: true, opacity: 0,
  }));
  const lens = keep(new THREE.MeshStandardMaterial({
    color: "#05070A", metalness: 0.9, roughness: 0.08, transparent: true, opacity: 0,
  }));

  // ---- figure: hex values read verbatim from work-vision/work.ts ----------
  const vest = keep(new THREE.MeshStandardMaterial({
    color: "#B85413", roughness: 0.85, metalness: 0.0, envMapIntensity: 0.30,
    transparent: true, opacity: 0,
  }));
  const refl = keep(new THREE.MeshStandardMaterial({
    color: "#C9D2DC", roughness: 0.35, metalness: 0.0, envMapIntensity: 0.35,
    transparent: true, opacity: 0,
  }));
  const shirt = keep(new THREE.MeshStandardMaterial({
    color: "#4A5361", roughness: 0.88, metalness: 0.02, envMapIntensity: 0.30,
    transparent: true, opacity: 0,
  }));
  const glove = keep(new THREE.MeshStandardMaterial({
    color: "#333940", roughness: 0.92, metalness: 0.02, envMapIntensity: 0.18,
    transparent: true, opacity: 0,
  }));
  const skin = keep(new THREE.MeshStandardMaterial({
    color: "#6A6355", roughness: 0.86, metalness: 0.02, envMapIntensity: 0.38,
    transparent: true, opacity: 0,
  }));
  const helmet = keep(new THREE.MeshStandardMaterial({
    color: "#C9A227", roughness: 0.60, metalness: 0.0, envMapIntensity: 0.20,
    transparent: true, opacity: 0,
  }));

  return {
    paintBlue, steelDark, steelMid, scanner, ledOff, bench, deck, wall, kraft,
    tape, lens, vest, refl, shirt, glove, skin, helmet, all,
    dispose: () => all.forEach((m) => m.dispose()),
  };
}

/* ---------------------------------------------------------------------------
   Geometry. Plain primitives throughout — this module owns and disposes its
   own geometry (see `owned`), so nothing here goes through metalBox's shared
   cache.
--------------------------------------------------------------------------- */
export interface AuditModel {
  root: THREE.Group;
  /** the carton — tracker target */
  carton: THREE.Group;
  /** four flap meshes, hinged at the carton's top edges. index 0/1 = short
      side flaps, 2/3 = long flaps. `.rotation.x` (side) / `.rotation.z`
      (long) driven 0 (open, vertical) -> -PI/2 (closed, flat). */
  flaps: THREE.Mesh[];
  /** the tape run. Scaled from a LEFT anchor via a wrapping group so scaleX
      grows rightward across the seam. */
  tapeGroup: THREE.Group;
  tapeMesh: THREE.Mesh;
  /** the scanner's LED — exposed ONLY so a caller can assert it is never
      touched. Do not write to this outside the intro opacity ramp. */
  led: THREE.Mesh;
  scannerBody: THREE.Mesh;
  /** the figure's one animated joint */
  forearmPivot: THREE.Group;
  owned: THREE.BufferGeometry[];
}

export function buildAudit(m: AuditMaterials): AuditModel {
  const root = new THREE.Group();
  const owned: THREE.BufferGeometry[] = [];
  const box = (w: number, h: number, d: number) => {
    const g = new THREE.BoxGeometry(w, h, d);
    owned.push(g);
    return g;
  };
  const cyl = (r1: number, r2: number, h: number, seg = 12) => {
    const g = new THREE.CylinderGeometry(r1, r2, h, seg);
    owned.push(g);
    return g;
  };
  const sph = (r: number, seg = 14) => {
    const g = new THREE.SphereGeometry(r, seg, Math.max(8, seg - 4));
    owned.push(g);
    return g;
  };
  const mesh = (g: THREE.BufferGeometry, mat: THREE.Material) => {
    const mm = new THREE.Mesh(g, mat);
    mm.castShadow = true;
    mm.receiveShadow = true;
    return mm;
  };

  // ---- 1/2: floor + drafting ground are built by the scene (shared helper) --

  // ---- 3-7: the bench ------------------------------------------------------
  const benchTop = mesh(box(2.40, 0.05, 0.90), m.bench);
  benchTop.position.set(0, 0.93, 0);
  root.add(benchTop);

  const legPositions: [number, number][] = [[-1.10, -0.36], [1.10, -0.36], [-1.10, 0.36], [1.10, 0.36]];
  for (const [x, z] of legPositions) {
    const leg = mesh(box(0.06, 0.91, 0.06), m.paintBlue);
    leg.position.set(x, 0.455, z);
    root.add(leg);
  }

  /* THE SHELF IS SLATS, NOT A PLATE. A single 2.28 x 0.80 box in the same flat
     blue as the frame around it read as one solid slab with no depth cue —
     five slats with a gap between each give the surface a rib pattern the key
     light can actually break across, and it reads as a shelf a real bench
     would have rather than a painted panel. Same material, same footprint,
     so this costs geometry only.

     GAP WIDENED 0.02 -> 0.035 and A DARK BACKER ADDED. At 0.02 and this
     camera's distance/angle the gap did not resolve — five slats still read
     as one slab, just with faint seams. Widening the gap alone would still
     show whatever sits behind the shelf (floor, grid) through the slot, which
     reads as "there is no shelf" rather than "there is a gap in the shelf";
     a steelDark backer plate sat just below and behind the slats gives the
     gap something dark and near to resolve against instead, the same
     shadow-box logic a real slatted shelf has (you see the shelf's inside
     face, not daylight, through the slot). */
  const SLAT_N = 5, SLAT_GAP = 0.035;
  const slatD = (0.80 - SLAT_GAP * (SLAT_N - 1)) / SLAT_N;
  const backer = mesh(box(2.28, 0.02, 0.80), m.steelDark);
  backer.position.set(0, 0.235, 0);
  root.add(backer);
  for (let i = 0; i < SLAT_N; i++) {
    const slat = mesh(box(2.28, 0.03, slatD), m.paintBlue);
    slat.position.set(0, 0.26, -0.40 + slatD / 2 + i * (slatD + SLAT_GAP));
    root.add(slat);
  }

  for (const x of [-1.10, 1.10]) {
    const post = mesh(box(0.05, 1.00, 0.05), m.paintBlue);
    post.position.set(x, 1.45, -0.40);
    root.add(post);
  }
  const header = mesh(box(2.25, 0.05, 0.05), m.paintBlue);
  header.position.set(0, 1.93, -0.40);
  root.add(header);

  // ---- 8/9: the carton, base-seated on the bench top -----------------------
  const CARTON_W = 0.46, CARTON_H = 0.32, CARTON_D = 0.36;
  const cartonBaseX = 0.10, cartonBaseZ = 0.02;
  const cartonCenterY = BENCH_TOP + CARTON_H / 2;
  const carton = new THREE.Group();
  carton.position.set(cartonBaseX, cartonCenterY, cartonBaseZ);
  const cartonBody = mesh(box(CARTON_W, CARTON_H, CARTON_D), m.kraft);
  carton.add(cartonBody);
  root.add(carton);

  /* Four flaps, hinged at the carton's own top edges via a pivot group so the
     hinge is at the EDGE, not the flap's own centre. Side flaps (short) fold
     about the carton's local X axis; long flaps fold about local Z. All start
     OPEN (folded outward, rotation -90deg from closed) and close to flat
     (rotation 0, lying on top) during the work beat. */
  const flaps: THREE.Mesh[] = [];
  // side (short) flaps — fold about X, offset along Z from the hinge at +-X edge
  for (const sign of [1, -1] as const) {
    const piv = new THREE.Group();
    piv.position.set(sign * (CARTON_W / 2), CARTON_H / 2, 0);
    piv.rotation.z = sign > 0 ? -Math.PI / 2 : Math.PI / 2; // start OPEN, standing vertical
    const f = mesh(box(0.005, CARTON_D * 0.94, 0.17), m.kraft);
    f.position.set(0, 0.17 / 2, 0);
    piv.add(f);
    carton.add(piv);
    flaps.push(f);
    f.userData.pivot = piv;
    f.userData.axis = "z";
    f.userData.openSign = sign;
  }
  // long flaps — fold about Z, at the +-Z top edges
  for (const sign of [1, -1] as const) {
    const piv = new THREE.Group();
    piv.position.set(0, CARTON_H / 2, sign * (CARTON_D / 2));
    piv.rotation.x = sign > 0 ? Math.PI / 2 : -Math.PI / 2; // start OPEN
    const f = mesh(box(CARTON_W * 0.98, 0.005, 0.17), m.kraft);
    f.position.set(0, 0.17 / 2, 0);
    piv.add(f);
    carton.add(piv);
    flaps.push(f);
    f.userData.pivot = piv;
    f.userData.axis = "x";
    f.userData.openSign = sign;
  }

  // ---- 10: tape run, growing from a left anchor -----------------------------
  const tapeGroup = new THREE.Group();
  tapeGroup.position.set(cartonBaseX - CARTON_W / 2, BENCH_TOP + CARTON_H + 0.006, cartonBaseZ);
  const tapeMesh = mesh(box(CARTON_W, 0.002, 0.048), m.tape);
  tapeMesh.position.set(CARTON_W / 2, 0, 0); // offset so scaling the GROUP grows from x=0
  tapeGroup.add(tapeMesh);
  tapeGroup.scale.x = 0;
  carton.add(tapeGroup);

  // ---- 11-13: the barcode scanner, in its cradle, untouched ----------------
  const cradle = mesh(box(0.13, 0.06, 0.16), m.steelDark);
  cradle.position.set(-0.86, 0.965, 0.20);
  root.add(cradle);
  const scannerBody = mesh(box(0.07, 0.16, 0.20), m.scanner);
  scannerBody.position.set(-0.86, 1.03, 0.20);
  root.add(scannerBody);
  const led = mesh(sph(0.008, 8), m.ledOff);
  led.castShadow = false;
  led.position.set(-0.86, 1.11, 0.29);
  root.add(led);

  // ---- 14: tote stack (dressing) --------------------------------------------
  const toteColors = [m.paintBlue, m.paintBlue, m.paintBlue];
  for (let i = 0; i < 3; i++) {
    const t = mesh(box(0.40, 0.16, 0.30), toteColors[i]);
    t.position.set(-0.94, BENCH_TOP + 0.08 + i * 0.16, -0.26);
    root.add(t);
  }

  // ---- 15: tape gun (dressing) -----------------------------------------------
  const tapeGun = mesh(box(0.16, 0.09, 0.12), m.steelMid);
  tapeGun.position.set(0.72, BENCH_TOP + 0.045, 0.16);
  root.add(tapeGun);

  // ---- 16: the figure — torso only, one animated joint -----------------------
  const figureRoot = new THREE.Group();
  /* MOVED OFF THE CARTON'S OWN AXIS: x 0.10 -> -0.34.

     The figure was standing at exactly the carton's x, so from this camera the
     carton (0.46 wide, at x 0.10) sat directly in front of its torso and the
     bench cut it off at the waist. What survived was a vest-coloured mass and
     a hat — reviewed three times as "still a blob", and no amount of rebuilding
     the geometry could fix it because the geometry was not what the viewer
     could see. Both arms, the shoulders and the tapered torso were all being
     drawn correctly and all occluded.

     At x -0.34 the body clears the carton's left edge (carton spans
     -0.13..0.33), so the torso, shoulder line and BOTH arms read against the
     dark bench back. The right arm now reaches ACROSS toward the carton
     instead of straight down behind it, which is also the more legible pose —
     a packer works beside their work, not behind it.

     Reach check: rHand sits at local x 0.20-0.24, so world x lands at about
     -0.10..-0.14 with the arm extended — still inside the carton's left face
     at -0.13, so the tape-running motion continues to make contact. */
  figureRoot.position.set(-0.34, 0, -0.50);
  root.add(figureRoot);

  /* Torso: flattened profile per the house rule against pure cylinders — see
     work.ts's own torso note. Runs from the hip line (hidden behind the bench)
     up to the shoulder line. */
  const torso = mesh(cyl(0.185, 0.165, 0.62, 14), m.shirt);
  torso.position.y = 1.24;
  torso.scale.z = 0.72;
  figureRoot.add(torso);

  /* The vest shell — shorter than the torso, ends above the (hidden) hips.
     0.205/0.19 was only 11% wider than the torso beneath it but at 0.75 depth
     it read as a barrel; 0.196/0.182 at 0.68 flattens it further front-to-back,
     which is the difference between a torso and a drum. The house rule is a
     flattened profile, never a pure cylinder — see work.ts's torso note. */
  const vest = mesh(cyl(0.196, 0.182, 0.44, 14), m.vest);
  vest.position.y = 1.34;
  vest.scale.z = 0.68;
  figureRoot.add(vest);
  // reflective straps — two thin vertical bands, front and back, not a ring
  for (const zSign of [1, -1] as const) {
    const strap = mesh(box(0.05, 0.40, 0.012), m.refl);
    strap.position.set(0, 1.34, zSign * 0.15);
    figureRoot.add(strap);
  }

  const neck = mesh(cyl(0.05, 0.06, 0.09, 12), m.skin);
  neck.position.y = 1.605;
  figureRoot.add(neck);

  const head = mesh(sph(0.10, 14), m.skin);
  head.position.y = 1.72;
  figureRoot.add(head);

  /* Hard hat: dome + front-only box peak, no ring, no disc.

     THE MUSHROOM. At r 0.115 against a 0.10 skull, squashed to 0.72, the hat
     was 15% wider than the head it sat on and half its height — which from the
     front reads as a cap on a stalk, and was a good part of why the figure came
     back described as a chess piece. A real hard hat clears the skull by a few
     millimetres and is closer to hemispherical. 0.106 radius (a 6mm clearance)
     at 0.84 of height, dropped 8mm so it sits ON the skull rather than hovering
     above it. */
  const hat = mesh(sph(0.106, 14), m.helmet);
  hat.position.y = 1.727;
  hat.scale.y = 0.84;
  figureRoot.add(hat);
  const peak = mesh(box(0.10, 0.016, 0.055), m.helmet);
  peak.position.set(0, 1.685, 0.11);
  peak.rotation.x = (18 * Math.PI) / 180;
  figureRoot.add(peak);

  /* A LIMB IS A BONE, NOT A FLOATING CYLINDER AT A GUESSED ROTATION. The
     first pass placed the upper arm by a position + two Euler angles picked
     by eye, and the elbow pivot's own position was a THIRD, independent
     guess — nothing forced the cylinder's end to actually meet the pivot, so
     the forearm read as a disconnected dark wedge near the carton with no
     visible shoulder. `bone(a, b, ...)` instead takes the two endpoints the
     limb actually has to join and orients a cylinder between them via
     `setFromUnitVectors`, so "does it connect" is true by construction
     rather than by tuned coincidence. Radii are also up from the first pass
     (0.045/0.038 -> 0.052/0.044) — thin enough to be an arm, thick enough to
     read as one at this camera distance rather than as a wire. */
  const _boneUp = new THREE.Vector3(0, 1, 0);
  const _boneQ = new THREE.Quaternion();
  const bone = (a: THREE.Vector3, b: THREE.Vector3, r1: number, r2: number, mat: THREE.Material) => {
    const len = a.distanceTo(b);
    const g = new THREE.CylinderGeometry(r2, r1, len, 10);
    owned.push(g);
    const mm = new THREE.Mesh(g, mat);
    mm.castShadow = true;
    mm.receiveShadow = true;
    mm.position.copy(a).lerp(b, 0.5);
    _boneQ.setFromUnitVectors(_boneUp, b.clone().sub(a).normalize());
    mm.quaternion.copy(_boneQ);
    return mm;
  };

  // left arm — static, resting at the bench edge
  const lShoulder = new THREE.Vector3(-0.20, 1.44, 0.08);
  const lElbow = new THREE.Vector3(-0.24, 1.16, 0.20);
  const lHand = new THREE.Vector3(-0.22, 0.98, 0.32);
  figureRoot.add(bone(lShoulder, lElbow, 0.052, 0.046, m.shirt));
  figureRoot.add(bone(lElbow, lHand, 0.046, 0.040, m.shirt));
  const lShoulderCap = mesh(sph(0.053, 10), m.shirt);
  lShoulderCap.position.copy(lShoulder);
  figureRoot.add(lShoulderCap);
  const lElbowCap = mesh(sph(0.047, 10), m.shirt);
  lElbowCap.position.copy(lElbow);
  figureRoot.add(lElbowCap);
  const leftGlove = mesh(sph(0.052, 10), m.glove);
  leftGlove.position.copy(lHand);
  figureRoot.add(leftGlove);

  // right arm — shoulder to elbow is fixed; the elbow hinge is the ONE
  // animated joint, so ONLY the forearm bone + hand live inside its pivot.
  const rShoulder = new THREE.Vector3(0.20, 1.44, 0.08);
  const rElbow = new THREE.Vector3(0.235, 1.16, 0.14);
  figureRoot.add(bone(rShoulder, rElbow, 0.052, 0.046, m.shirt));
  const rShoulderCap = mesh(sph(0.053, 10), m.shirt);
  rShoulderCap.position.copy(rShoulder);
  figureRoot.add(rShoulderCap);
  const rElbowCap = mesh(sph(0.047, 10), m.shirt);
  rElbowCap.position.copy(rElbow);
  figureRoot.add(rElbowCap);

  // the elbow pivot sits exactly at rElbow — rest pose hangs the forearm
  // straight down; the work beat hinges it forward toward the carton and
  // back, on this one local axis only
  const forearmPivot = new THREE.Group();
  forearmPivot.position.copy(rElbow);
  figureRoot.add(forearmPivot);
  const FOREARM_LEN = 0.26;
  const forearm = bone(
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -FOREARM_LEN, 0), 0.046, 0.040, m.shirt,
  );
  forearmPivot.add(forearm);
  const rightGlove = mesh(sph(0.052, 10), m.glove);
  rightGlove.position.set(0, -FOREARM_LEN - 0.02, 0);
  forearmPivot.add(rightGlove);
  forearmPivot.rotation.x = 0; // rest: forearm straight down

  return {
    root, carton, flaps, tapeGroup, tapeMesh, led, scannerBody, forearmPivot, owned,
  };
}
