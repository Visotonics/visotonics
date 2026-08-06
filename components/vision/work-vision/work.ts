/* ---------------------------------------------------------------------------
   Work Vision — the subject: one worker, seen by three cameras, three places.

   THREE ACTS, HARD CUTS, NOT ONE AISLE. This used to be a single racking
   aisle with three pole cameras firing in sequence as one figure walked past
   all three. The product read was "three cameras in a single place aligned
   next to next to next" — the fix is not density, it's STRUCTURE: three
   separate fixed cameras, in three separate places, cut between like a VMS,
   the same person walking through each in turn. See scene.tsx for the
   act/loop timing and the camera cuts; this module builds what each act
   needs — its own dressing group, toggled `.visible`, plus the one sight
   cone act 1 keeps. Acts 2 and 3 currently have no camera in shot: the
   camera-locked corner props that used to stand in for one were removed on
   review (see scene.tsx) and each act needs a REAL camera in the world.

   Layout (metres, ground at GROUND_Y = 0), SHARED ACROSS ALL THREE ACTS:
     · the walker travels along X at constant speed, in PROFILE to the
       camera, on the z = 0 line — every act, regardless of which direction.
     · act 1 keeps its original pole-and-cone rig, aimed at that line.
     · acts 2 and 3 dress the same coordinate range differently and are seen
       from a different fixed camera; they carry no cone, only the tracker
       bracket (see scene.tsx's per-act read logic).

   WHY EVERYTHING HERE IS PLAIN PRIMITIVE GEOMETRY AND NOT `metalBox`.
   metal.ts's `metalBox` caches its RoundedBoxGeometry in a module map that is
   shared across every scene on the page and deliberately never disposed. This
   module owns and disposes its own geometry (see `owned` / `dispose`), and a
   disposed shared buffer leaves the NEXT scene drawing nothing. So: plain
   Box/Capsule/Cylinder/Sphere throughout, all of it ours, all of it disposed.
--------------------------------------------------------------------------- */
import * as THREE from "three";
import { lerp } from "../_vision/camera";
import { makeMetal } from "../_vision/metal";

/** Floor height. Zero, deliberately: every vertical number in this file is
    then also a height above ground. */
export const GROUND_Y = 0;

/* ---- the run --------------------------------------------------------------
   Constant speed, both directions. "Nobody stops" is the claim, and ANY
   easing reads as hesitation. Shared across all three acts: act 1 and act 3
   run WALK_FROM -> WALK_TO (left to right), act 2 runs it in reverse
   (scene.tsx does the reversal — see walkerXFor). 14.4 units is more than
   the frame needs at any of the three poses below; the walker is always
   comfortably off screen at both ends of its own act. */
export const WALK_FROM = -5.2;
export const WALK_TO = 5.2;
export const walkerX = (p: number) => lerp(WALK_FROM, WALK_TO, p);

/** Stride frequency, in strides per second. */
export const STEP_HZ = 1.05;

/* ---- ACT 1's ONE CAMERA ---------------------------------------------------
   Everything here is the original pole/cone derivation, unchanged in its
   arithmetic, just reduced from three poles to the one act 1 now uses (the
   "three cameras" job moved up a level, to the three ACTS, so a single aisle
   no longer needs three of its own). */
export const POLE_X = -0.6;
export const POLE_Z = -2.1;
export const HEAD_Y = 2.9;
export const AIM_X = POLE_X;                 // on-axis: the head looks straight down its own mount
const AIM_Y = GROUND_Y + 1.05;                // the chest, not the floor
const LENS_OUT = 0.46;
export const CONE_HALF_ANGLE = 0.33;          // 18.9 deg — see detect.ts's cone builder

/* ---- act 1 dressing: the racking aisle ------------------------------------ */
export const AISLE_HW = 1.45;
const RACK_Z = -3.6;
const RACK_PITCH = 1.9;
const RACK_BASE = -1.55;
const RACK_K: readonly number[] = [-3, -2, -1, 0, 1, 2, 3, 4];
const RACK_H = 3.40;
const RACK_D = 0.55;
const BEAM_Y = [1.15, 2.30] as const;
const NEAR_Z = 2.08;
const NEAR_H = 0.42;

/** Floor slab. Shared by every act — one physical floor, three cameras. */
const FLOOR_SIZE = 160;

/* ---- materials ----------------------------------------------------------- */

const DARK_METAL = { base: "#2B313B", kind: "plate", metalness: 0.78, rough: 0.5 } as const;

export interface WorkMaterials {
  dark: THREE.MeshStandardMaterial;
  lens: THREE.MeshStandardMaterial;
  suit: THREE.MeshStandardMaterial;
  skin: THREE.MeshStandardMaterial;
  floor: THREE.MeshStandardMaterial;
  rack: THREE.MeshStandardMaterial;
  goods: THREE.MeshStandardMaterial;
  dock: THREE.MeshStandardMaterial;
  paint: THREE.MeshBasicMaterial;
  all: THREE.Material[];
  dispose: () => void;
}

export function buildWorkMaterials(): WorkMaterials {
  const metal = makeMetal(DARK_METAL);
  const dark = metal.material;

  const lens = new THREE.MeshStandardMaterial({
    color: "#05070C", metalness: 0.95, roughness: 0.08, envMapIntensity: 1.8,
    transparent: true, opacity: 0,
  });

  const suit = new THREE.MeshStandardMaterial({
    color: "#262C35", roughness: 0.88, metalness: 0.02, envMapIntensity: 0.42,
    transparent: true, opacity: 0,
  });
  const skin = new THREE.MeshStandardMaterial({
    color: "#3E454F", roughness: 0.86, metalness: 0.02, envMapIntensity: 0.38,
    transparent: true, opacity: 0,
  });

  const floor = new THREE.MeshStandardMaterial({
    color: "#15181D", roughness: 0.95, metalness: 0.0, envMapIntensity: 0.10,
    transparent: true, opacity: 0, depthWrite: false,
  });
  const rack = new THREE.MeshStandardMaterial({
    color: "#1A1F27", roughness: 0.86, metalness: 0.18, envMapIntensity: 0.25,
    transparent: true, opacity: 0,
  });
  const goods = new THREE.MeshStandardMaterial({
    color: "#1F242C", roughness: 0.93, metalness: 0.02, envMapIntensity: 0.12,
    transparent: true, opacity: 0,
  });
  /* The dock's own wall panel, act 2's back wall AND act 1's structural
     material stand-in for anything sheet-steel. One step above `rack` in
     both colour and finish — a rolling door / dock wall is smoother and
     slightly more specular than open racking. */
  const dock = new THREE.MeshStandardMaterial({
    color: "#2E3540", roughness: 0.62, metalness: 0.30, envMapIntensity: 0.30,
    transparent: true, opacity: 0,
  });
  const paint = new THREE.MeshBasicMaterial({
    color: "#5A626C", transparent: true, opacity: 0,
    depthWrite: false, toneMapped: false, fog: true,
  });

  const all: THREE.Material[] = [dark, lens, suit, skin, floor, rack, goods, dock];
  return {
    dark, lens, suit, skin, floor, rack, goods, dock, paint, all,
    dispose: () => {
      metal.dispose(); lens.dispose(); suit.dispose(); skin.dispose();
      floor.dispose(); rack.dispose(); goods.dispose(); dock.dispose(); paint.dispose();
    },
  };
}

export function warmWorkTextures() {
  makeMetal(DARK_METAL).dispose();
}

/* ---- the subject --------------------------------------------------------- */

export interface WorkModel {
  root: THREE.Group;
  figure: THREE.Group;
  walk: (t: number) => void;
  headAnchor: THREE.Vector3;
  /** Act 1's pole + head, fixed on the floor; never moves. */
  fixed: THREE.Group;
  /** [shared floor, act1 dressing, act2 dressing, act3 dressing]. [0] is
      always visible; scene.tsx toggles [1]/[2]/[3] on the hard cut so
      exactly one of them is visible at a time. */
  envActs: THREE.Group[];
  /** Act 1's one sight cone: apex, aim point, unit direction, length to the
      floor along that axis (not to the aim point — see the note in the old
      derivation this keeps). */
  lens: THREE.Vector3;
  aim: THREE.Vector3;
  dir: THREE.Vector3;
  coneLen: number;
  owned: THREE.BufferGeometry[];
  dispose: () => void;
}

export function buildWork(m: WorkMaterials): WorkModel {
  const owned: THREE.BufferGeometry[] = [];
  const mesh = (g: THREE.BufferGeometry, mat: THREE.Material, cast = true) => {
    owned.push(g);
    const o = new THREE.Mesh(g, mat);
    o.castShadow = cast;
    return o;
  };
  // background dressing: no shadow casting (see the house rule this scene
  // has always followed — the shadow map budget belongs to the walker)
  const envMesh = (g: THREE.BufferGeometry, mat: THREE.Material, own = true) => {
    if (own) owned.push(g);
    return new THREE.Mesh(g, mat);
  };

  /* ======================= THE WALKER =======================
     UNCHANGED from the single-aisle build. Built facing LOCAL +Z, then
     yawed a quarter turn so local +Z becomes world +X. scene.tsx flips that
     yaw to -PI/2 for act 2 (the reverse-direction act), which is the only
     thing that ever touches `figure.rotation.y` after this point — a
     mirror, not a rebuild.

     THE CROWN STAYS AT EXACTLY 1.815. Load-bearing for the framing solve
     in scene.tsx, the callout anchor, and the cone clearance. Do not change
     it without re-deriving all three. */
  const root = new THREE.Group();
  const figure = new THREE.Group();
  figure.name = 'walker';
  figure.rotation.y = Math.PI / 2;
  root.add(figure);

  const torso = mesh(new THREE.CylinderGeometry(0.20, 0.175, 0.77, 16), m.suit);
  torso.position.y = 1.085;
  figure.add(torso);

  const shoulders = mesh(new THREE.SphereGeometry(0.20, 20, 14), m.suit);
  shoulders.scale.set(1.0, 0.72, 1.45);
  shoulders.position.y = 1.38;
  figure.add(shoulders);

  const neck = mesh(new THREE.CylinderGeometry(0.070, 0.095, 0.12, 12), m.skin);
  neck.position.y = 1.50;
  figure.add(neck);

  const head = mesh(new THREE.SphereGeometry(0.142, 20, 14), m.skin);
  head.position.y = 1.673;          // crown lands at 1.815
  figure.add(head);

  const hat = mesh(new THREE.SphereGeometry(0.152, 18, 12), m.dark);
  hat.scale.set(1.0, 0.82, 1.0);
  hat.position.y = 1.690;           // 1.690 + 0.152*0.82 = 1.815, the crown
  figure.add(hat);

  const brim = mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.022, 16), m.dark);
  brim.position.set(0, 1.676, 0.03);
  figure.add(brim);

  const hips = mesh(new THREE.BoxGeometry(0.30, 0.22, 0.22), m.suit);
  hips.position.y = 0.92;
  figure.add(hips);

  const joint = (x: number, y: number) => {
    const g = new THREE.Group();
    g.position.set(x, y, 0);
    figure.add(g);
    return g;
  };

  const armL = joint(0.235, 1.44);
  const armR = joint(-0.235, 1.44);
  for (const j of [armL, armR]) {
    const arm = mesh(new THREE.CapsuleGeometry(0.062, 0.46, 5, 12), m.suit);
    arm.position.y = -0.29;
    j.add(arm);
  }

  const legL = joint(0.105, 0.92);
  const legR = joint(-0.105, 0.92);
  for (const j of [legL, legR]) {
    const leg = mesh(new THREE.CapsuleGeometry(0.078, 0.704, 5, 12), m.suit);
    leg.position.y = -0.43;
    j.add(leg);
    const boot = mesh(new THREE.BoxGeometry(0.15, 0.14, 0.24), m.suit);
    boot.position.set(0, -0.85, 0.045);
    j.add(boot);
  }

  /* The gait. Driven by absolute scene time, not loop phase — see scene.tsx. */
  const walk = (t: number) => {
    const s = Math.sin(2 * Math.PI * t * STEP_HZ);
    legL.rotation.x = 0.62 * s;
    legR.rotation.x = -0.62 * s;
    armL.rotation.x = -0.42 * s;
    armR.rotation.x = 0.42 * s;
    figure.position.y = 0.035 * Math.abs(s);
  };

  /* ======================= ACT 1's ONE CAMERA ======================= */
  const fixed = new THREE.Group();
  fixed.name = 'act1pole';
  const POLE_TOP = HEAD_Y + 0.15;

  const aim = new THREE.Vector3(AIM_X, AIM_Y, 0);
  const mount = new THREE.Vector3(POLE_X, HEAD_Y, POLE_Z);
  const dir = aim.clone().sub(mount).normalize();

  const pole = mesh(new THREE.BoxGeometry(0.13, POLE_TOP - GROUND_Y, 0.13), m.dark, false);
  pole.position.set(POLE_X, GROUND_Y + (POLE_TOP - GROUND_Y) / 2, POLE_Z);
  fixed.add(pole);
  const foot = mesh(new THREE.BoxGeometry(0.32, 0.09, 0.32), m.dark, false);
  foot.position.set(POLE_X, GROUND_Y + 0.045, POLE_Z);
  fixed.add(foot);

  const h = new THREE.Group();
  h.position.copy(mount);
  h.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
  fixed.add(h);

  const stalk = mesh(new THREE.BoxGeometry(0.06, 0.06, 0.30), m.dark, false);
  stalk.position.z = 0.06;
  h.add(stalk);
  const body = mesh(new THREE.BoxGeometry(0.24, 0.20, 0.40), m.dark, false);
  body.position.z = 0.26;
  h.add(body);
  const lensMesh = mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.05, 16), m.lens, false);
  lensMesh.rotation.x = Math.PI / 2;
  lensMesh.position.z = LENS_OUT;
  h.add(lensMesh);

  const lens = mount.clone().addScaledVector(dir, LENS_OUT);
  /* Cone length runs to the FLOOR along the sight axis, not to the aim
     point — see detect.ts's own note on why (truncating at the aim point
     visibly stops the beam at the walker's neck). */
  const coneLen = (lens.y - GROUND_Y) / -dir.y;

  /* ======================= THE THREE CORNER HOUSINGS =======================
     One small camera-and-bracket prop per act, built once here, attached to
     the render camera by scene.tsx (as a child, in camera-local space) so it
     always sits in the same screen corner without any per-frame projection
     math — the camera never moves within an act, so a child transform IS the
     corner placement. Reuses the same box-body / cylinder-lens language as
     the act 1 pole head above, just built small and close.

     THE GROUP'S LOCAL -Z IS ITS OWN "LOOKING" AXIS (matching the pole head's
     own local +Z-out convention closely enough that the silhouette reads the
     same way): scene.tsx rotates each group to angle the lens back toward
     the centre of frame, away from its corner. */

  /* ======================= THE THREE ENVIRONMENTS =======================
     One group per act. envActs[0] is the floor slab plus act 1's dressing
     and is visible by default (act 1 opens the loop); [1] and [2] start
     hidden and scene.tsx flips `.visible` on the hard cut. Nothing here is
     ever re-parented or rebuilt — a cut is a visibility swap, not a scene
     change. */
  const envShared = new THREE.Group();  // the one physical floor every act stands on
  envShared.name='envShared';
  const env1 = new THREE.Group();
  env1.name='act1';
  const env2 = new THREE.Group();
  env2.name='act2';
  const env3 = new THREE.Group();
  env3.name='act3';
  env2.visible = false;
  env3.visible = false;

  /* ---- the floor slab, shared ---- */
  const floorGeo = new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE);
  const slab = envMesh(floorGeo, m.floor);
  slab.rotation.x = -Math.PI / 2;
  slab.position.y = GROUND_Y - 0.030;
  slab.renderOrder = -4;
  envShared.add(slab);

  /* ================= ACT 1 — RACKING AISLE ================= */
  const paintGeo = new THREE.PlaneGeometry(28, 0.09);
  for (const sz of [-1, 1]) {
    const line = envMesh(paintGeo, m.paint, sz === -1);
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, GROUND_Y - 0.008, sz * AISLE_HW);
    line.renderOrder = -2;
    env1.add(line);
  }

  const uprightGeo = new THREE.BoxGeometry(0.10, RACK_H, RACK_D);
  const xs = RACK_K.map((k) => RACK_BASE + RACK_PITCH * k);
  xs.forEach((x, i) => {
    const u = envMesh(uprightGeo, m.rack, i === 0);
    u.position.set(x, GROUND_Y + RACK_H / 2, RACK_Z);
    env1.add(u);
  });

  const beamGeo = new THREE.BoxGeometry(RACK_PITCH * (RACK_K.length - 1) + 0.10, 0.08, 0.50);
  const beamCx = (xs[0] + xs[xs.length - 1]) / 2;
  BEAM_Y.forEach((by, i) => {
    const b = envMesh(beamGeo, m.rack, i === 0);
    b.position.set(beamCx, GROUND_Y + by, RACK_Z);
    env1.add(b);
  });

  /* Stored loads on the beams. Deterministic occupancy pattern, not random —
     one fixed table, walked bay by bay. */
  const OCCUPIED: readonly boolean[] = [true, true, false, true, true, false, true];
  const loadGeo = new THREE.BoxGeometry(1.45, 0.85, 0.48);
  let firstLoad = true;
  BEAM_Y.forEach((by, level) => {
    for (let bay = 0; bay < xs.length - 1; bay++) {
      if (!OCCUPIED[(bay + level * 3) % OCCUPIED.length]) continue;
      const l = envMesh(loadGeo, m.goods, firstLoad);
      firstLoad = false;
      l.position.set((xs[bay] + xs[bay + 1]) / 2, GROUND_Y + by + 0.465, RACK_Z);
      env1.add(l);
    }
  });

  const nearGeo = new THREE.BoxGeometry(1.80, NEAR_H, 0.95);
  for (let k = -2; k <= 1; k++) {
    const n = envMesh(nearGeo, m.goods, k === -2);
    n.position.set(RACK_PITCH * k - 0.60, GROUND_Y + NEAR_H / 2, NEAR_Z);
    env1.add(n);
  }

  /* ---- A SECOND RUN, BEHIND THE FIRST — this is what makes it an aisle ----

     One rack run against nothing is a wall with shelves on it, which is what
     act 1 read as ("the environment is all blobs"). A warehouse aisle is
     legible because racking RECEDES: you see the near run, a gap, then
     another run behind it, and the repetition at diminishing scale is the
     entire depth cue. Nothing else added here would buy as much.

     4.0m behind the first run, which is a real cross-aisle width, and offset
     half a bay in x (RACK_PITCH / 2) so the two runs' uprights do not line up
     into a single picket fence — staggered, they read as two separate
     structures rather than one thick one.

     Deliberately SPARSER than the near run: three-quarter occupancy on one
     beam level instead of full on two. The far run is scenery and must not
     compete with the walker for contrast; a fully-loaded second run would put
     as much mass behind him as in front. */
  const FAR_Z = RACK_Z - 4.0;
  const farXs = RACK_K.map((k) => RACK_BASE + RACK_PITCH * k + RACK_PITCH / 2);
  farXs.forEach((x, i) => {
    const u = envMesh(uprightGeo, m.rack, i === 0);
    u.position.set(x, GROUND_Y + RACK_H / 2, FAR_Z);
    env1.add(u);
  });
  const farBeam = envMesh(beamGeo, m.rack, false);
  farBeam.position.set(beamCx + RACK_PITCH / 2, GROUND_Y + BEAM_Y[0], FAR_Z);
  env1.add(farBeam);

  const FAR_OCCUPIED: readonly boolean[] = [true, false, true, true, false, true, true];
  for (let bay = 0; bay < farXs.length - 1; bay++) {
    if (!FAR_OCCUPIED[bay % FAR_OCCUPIED.length]) continue;
    const l = envMesh(loadGeo, m.goods, false);
    l.position.set((farXs[bay] + farXs[bay + 1]) / 2, GROUND_Y + BEAM_Y[0] + 0.465, FAR_Z);
    env1.add(l);
  }

  /* NO BACK WALL. One was added here and immediately removed, and the reason
     is worth keeping: measured with `?debug=1`, a 34 x 5.2 panel at
     z = -10.8 projected to canvas x -515..2136, y -13..426 — it filled the
     ENTIRE frame. Every bit of depth the second rack run had just bought was
     erased, because behind the racking sat one flat slab at a uniform value,
     and a receding structure only reads as receding if there is darkness
     behind it to recede INTO.

     The scene already has the right tool: `scene.fog` runs 6 to 26, so the
     far run at z = -7.6 is genuinely dimmer than the near one at -3.6 and the
     aisle dissolves into the page's own black. That IS the end of the aisle.
     Cargo Vision closes its deck the same way and for the same reason — see
     its note on aerial perspective. */

  /* ================= ACT 2 — INBOUND DOCK =================
     The dock/shutter surface brought forward as the back wall, no racking,
     a few pallets on the floor at a different spacing than act 1's near
     goods so the two acts do not repeat the same rhythm. WALL_Z sits closer
     than act 1's RACK_Z: a dock is a shallower space than a racking aisle,
     and the difference in depth is itself part of "this is a different
     place" — not just a different colour of the same backdrop. */
  const WALL_Z = -2.6;
  const WALL_W = 13.0;
  const WALL_H = 3.2;
  const wall = envMesh(new THREE.BoxGeometry(WALL_W, WALL_H, 0.20), m.dock);
  wall.position.set(0, GROUND_Y + WALL_H / 2, WALL_Z);
  env2.add(wall);

  /* Three roller-shutter ribs, evenly spaced up the wall face — reads as a
     sectional door without modelling one. */
  const ribGeo = new THREE.BoxGeometry(WALL_W - 0.4, 0.06, 0.03);
  for (let i = 0; i < 3; i++) {
    const rib = envMesh(ribGeo, m.rack, i === 0);
    rib.position.set(0, GROUND_Y + 0.9 + i * 0.9, WALL_Z + 0.12);
    env2.add(rib);
  }

  /* A cleared dock apron: pallets are FEWER and further apart than act 1's
     continuous near-goods run — an inbound floor mid-unload, not a full
     rack. Spacing 2.6 (up from act 1's 1.9 pitch) and only four of them. */
  const dockLoadGeo = new THREE.BoxGeometry(1.35, 0.95, 1.05);
  for (let k = -2; k <= 1; k++) {
    const p = envMesh(dockLoadGeo, m.goods, k === -2);
    p.position.set(k * 2.6 + 0.4, GROUND_Y + 0.475, -0.9);
    env2.add(p);
  }

  /* ================= ACT 3 — PACK LINE =================
     Racking is replaced by a low run of benches with totes at working
     height, and an implied lower ceiling (a dark strip well below the
     poles' own head height) so act 3 reads as a tighter, lower space than
     the open aisle of act 1. */
  const BENCH_TOP_Y = 0.78;
  const legGeo = new THREE.BoxGeometry(0.06, BENCH_TOP_Y, 0.06);
  const topGeo = new THREE.BoxGeometry(1.7, 0.06, 0.75);
  const toteGeo = new THREE.BoxGeometry(0.42, 0.28, 0.30);
  const BENCH_Z = -1.55;
  const BENCH_PITCH = 2.1;
  let firstLeg = true, firstTop = true, firstTote = true;
  for (let k = -2; k <= 1; k++) {
    const cx = k * BENCH_PITCH;
    const top = envMesh(topGeo, m.rack, firstTop); firstTop = false;
    top.position.set(cx, GROUND_Y + BENCH_TOP_Y, BENCH_Z);
    env3.add(top);
    for (const sx of [-0.75, 0.75]) {
      for (const sz of [-0.30, 0.30]) {
        const leg = envMesh(legGeo, m.dark, firstLeg); firstLeg = false;
        leg.position.set(cx + sx, GROUND_Y + BENCH_TOP_Y / 2, BENCH_Z + sz);
        env3.add(leg);
      }
    }
    // one or two totes per bench, deterministic (k parity), never Math.random
    const totes = (k % 2 === 0) ? [-0.35] : [-0.35, 0.35];
    for (const tx of totes) {
      const tote = envMesh(toteGeo, m.goods, firstTote); firstTote = false;
      tote.position.set(cx + tx, GROUND_Y + BENCH_TOP_Y + 0.06 + 0.14, BENCH_Z);
      env3.add(tote);
    }
  }
  /* Implied low ceiling — a dark strip well under the act 1 pole height
     (2.9), so the frame reads as a tighter, lower space than the aisle. */
  const ceiling = envMesh(new THREE.BoxGeometry(13.0, 0.12, 3.2), m.dark);
  ceiling.position.set(0, GROUND_Y + 2.35, -1.0);
  env3.add(ceiling);

  return {
    root, figure, walk,
    headAnchor: new THREE.Vector3(0, 1.90, 0),
    fixed,
    envActs: [envShared, env1, env2, env3],
    lens, aim, dir, coneLen,
    owned,
    dispose: () => { owned.forEach((g) => g.dispose()); },
  };
}
