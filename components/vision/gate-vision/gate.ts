/* ---------------------------------------------------------------------------
   Gate Vision — the subject: a lane, a gantry, and a truck driving through it.

   The container is NOT modelled here. It is the exact container from
   app/lab/container-vision — same corrugation, same sculpted damage, same
   painted markings — parented onto a chassis. Gate Vision reads the same box
   Container Vision inspects, so it must be the same box.

   Layout (metres, ground at GROUND_Y):
     · the vehicle runs along X, so its long side faces +Z — the camera side.
     · the gantry is a CANTILEVER: one column on the far side (-Z) with a beam
       reaching over the lane. A full portal would put a column between camera
       and truck for most of the shot; a cantilever keeps the near side clear,
       and it is what gate OCR installs actually look like.
     · nothing is modelled below the wheels — no road plane. The projected
       shadow is the ground, same house rule as every vision scene.

   Coplanar surfaces are avoided throughout: two faces at identical depth
   z-fight, which reads on screen as a texture that crawls and flickers.
--------------------------------------------------------------------------- */
import * as THREE from "three";
import { buildContainer } from "../container-vision/container";
import { H as C_H, L as C_L } from "../container-vision/container";
import type { MaterialSet } from "../container-vision/materials";
import { metalBox } from "../_vision/metal";
import type { GateMaterials } from "./materials";

export const GROUND_Y = -1.9;

const DECK_Y = -0.85;                  // top of the chassis deck
export const C_CY = DECK_Y + C_H / 2;  // container centre height once loaded

/** Where the gantry stands. The vehicle drives past it along X. */
export const GANTRY_X = -0.4;

/** Container sits behind the cab, not inside it — see DECISIONS.md geometry fix. */
export const CONTAINER_X = -2.4;

export interface GateAnchor {
  id: string;
  pos: THREE.Vector3;
  normal: THREE.Vector3;
}

export interface GateModel {
  /** everything that moves — chassis, cab, container. Driven along X. */
  vehicle: THREE.Group;
  /** everything that doesn't — the gantry and its heads. */
  fixed: THREE.Group;
  edges: THREE.LineSegments;
  containerHardware: THREE.Mesh[];
  /** anchors in VEHICLE space */
  anchors: Record<string, GateAnchor>;
  /** the gantry head, in world space */
  headAnchor: GateAnchor;
  /** the boom arm. Rotate on X: 0 = up/clear, negative = down/blocking. */
  barrier: THREE.Group;
}

/* Every structural box on the truck and gantry is a ROUNDED box. A perfect 90°
   edge is the single strongest "this is a toy" cue: real steel has a radius on
   every edge, and that radius is what catches the thin highlight that reads as
   metal. Costs a few hundred triangles per part and is worth all of them. */
const box = (w: number, h: number, d: number, m: THREE.Material) =>
  metalBox(w, h, d, m, Math.min(w, h, d) * 0.09);

const cyl = (r: number, len: number, m: THREE.Material, seg = 20) =>
  new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), m);

export function buildGate(mats: GateMaterials, cmats: MaterialSet): GateModel {
  const vehicle = new THREE.Group();
  const fixed = new THREE.Group();

  const put = (g: THREE.Group) => (m: THREE.Mesh, x: number, y: number, z: number) => {
    m.position.set(x, y, z);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  const addV = put(vehicle);
  const addF = put(fixed);

  /* ---- the container: the real one ---- */
  const container = buildContainer(cmats.steel, cmats.dark, cmats.front.material);
  container.group.position.set(CONTAINER_X, C_CY, 0);
  vehicle.add(container.group);

  /* ---- chassis ---- */
  const deck = addV(box(9.7, 0.2, 2.42, mats.dark), -0.85, DECK_Y - 0.11, 0);
  deck.receiveShadow = true;
  for (const z of [-1.05, 1.05]) {
    addV(box(9.7, 0.34, 0.16, mats.dark), -0.85, DECK_Y - 0.36, z);
  }
  // twistlocks the container actually sits on — without them it floats
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    addV(box(0.26, 0.1, 0.26, mats.dark), CONTAINER_X + sx * (C_L / 2 - 0.2), DECK_Y + 0.04, sz * 1.05);
  }

  /* ---- wheels ----
     A truck tyre is not a cylinder. It is a tread belt with rounded shoulders,
     a recessed sidewall, and a dished rim with visible bolts — and on the rear
     axles it is DOUBLED. Getting those four things in is the whole difference
     between a wheel and a black disc.
     Radius 0.52 m ≈ a real 11R22.5. */
  const TYRE_R = 0.52, TYRE_W = 0.30;
  const wheel = (x: number, z: number) => {
    // tread belt — the barrel of the tyre, textured with lugs
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(TYRE_R, TYRE_R, TYRE_W, 28, 1, true), mats.rubber);
    belt.rotation.x = Math.PI / 2;
    addV(belt, x, GROUND_Y + TYRE_R, z);
    // rounded shoulders, so the tyre doesn't end in a hard machined edge
    for (const s of [1, -1]) {
      const sh = new THREE.Mesh(new THREE.TorusGeometry(TYRE_R - 0.05, 0.055, 8, 26), mats.rubber);
      addV(sh, x, GROUND_Y + TYRE_R, z + s * TYRE_W / 2);
      // sidewall disc, set in from the tread
      const side = new THREE.Mesh(new THREE.CylinderGeometry(TYRE_R - 0.04, TYRE_R - 0.04, 0.02, 24), mats.rubber);
      side.rotation.x = Math.PI / 2;
      addV(side, x, GROUND_Y + TYRE_R, z + s * (TYRE_W / 2 - 0.02));
    }
    // rim: a dished plate proud of the sidewall, plus a hub and wheel bolts
    const rimDisc = cyl(TYRE_R * 0.48, 0.05, mats.rim, 20);
    rimDisc.rotation.x = Math.PI / 2;
    addV(rimDisc, x, GROUND_Y + TYRE_R, z + TYRE_W / 2 + 0.02);
    const hub = cyl(0.1, 0.12, mats.rim, 14);
    hub.rotation.x = Math.PI / 2;
    addV(hub, x, GROUND_Y + TYRE_R, z + TYRE_W / 2 + 0.06);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const bolt = cyl(0.022, 0.05, mats.dark, 6);
      bolt.rotation.x = Math.PI / 2;
      addV(bolt, x + Math.cos(a) * 0.2, GROUND_Y + TYRE_R + Math.sin(a) * 0.2, z + TYRE_W / 2 + 0.05);
    }
  };
  // rear trailer bogie and the tractor's drive axle both run DUALS; the steer
  // axle at the front is a single, which is what makes a truck read as a truck
  for (const x of [-4.75, -3.85, 1.95]) {
    for (const z of [-1.28, -0.94, 0.94, 1.28]) wheel(x, z);
  }
  for (const z of [-1.16, 1.16]) wheel(3.75, z);

  /* ---- tractor unit ---- */
  /* A real tractor unit is a BLOCK — a sleeper cab is ~2.5 m front to back and
     stands well over 3 m tall. The first pass made it a thin slab, which is
     what made the whole vehicle read as a toy. This one is deep, tall, and
     built from three stacked masses (lower body, sleeper, roof) rather than
     one box, so it has a silhouette. */
  const cabX = 2.95;
  const CAB_LEN = 2.95, CAB_W = 2.5;
  const cabBody = addV(box(CAB_LEN, 2.25, CAB_W, mats.cab), cabX, DECK_Y + 1.05, 0);
  cabBody.receiveShadow = true;
  // sleeper box behind the doors — sits back and slightly narrower
  addV(box(1.15, 1.55, CAB_W - 0.06, mats.cab), cabX - 1.5, DECK_Y + 1.5, 0);
  // roof cap over both masses, and the deflector raked back to the container
  // Length is deliberately kept short of the container: at CAB_LEN + 0.9 the
  // cap's rear edge landed at x 0.605, which is 24mm INSIDE the container's
  // front face (0.629) and at a height squarely within its body. Small, but the
  // same clipping bug as the container-in-cab one.
  addV(box(CAB_LEN + 0.5, 0.3, CAB_W - 0.08, mats.cab), cabX - 0.22, DECK_Y + 2.28, 0);
  const defl = box(1.05, 0.72, CAB_W - 0.14, mats.cab);
  defl.rotation.z = -0.34;
  addV(defl, cabX - 1.34, DECK_Y + 2.6, 0);
  // side skirts / battery boxes filling the gap down to the chassis
  for (const sz of [1, -1]) {
    addV(box(1.5, 0.62, 0.28, mats.dark), cabX - 0.5, DECK_Y - 0.3, sz * (CAB_W / 2 - 0.16));
  }
  // windscreen + a side window on each flank, so the cab reads as a cab from
  // any angle in the pass-through
  const NOSE = cabX + CAB_LEN / 2;
  const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(CAB_W - 0.24, 1.05), mats.glass);
  glassPane.position.set(NOSE + 0.02, DECK_Y + 1.62, 0);
  glassPane.rotation.y = Math.PI / 2;
  vehicle.add(glassPane);
  for (const sz of [1, -1]) {
    const side = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.85), mats.glass);
    side.position.set(cabX + 0.5, DECK_Y + 1.6, sz * (CAB_W / 2 + 0.01));
    side.rotation.y = sz > 0 ? 0 : Math.PI;
    vehicle.add(side);
    // mirror arm and head, standing off the A-pillar
    addV(box(0.07, 0.62, 0.07, mats.dark), NOSE - 0.12, DECK_Y + 1.78, sz * (CAB_W / 2 + 0.2));
    addV(box(0.1, 0.46, 0.17, mats.dark), NOSE - 0.12, DECK_Y + 1.56, sz * (CAB_W / 2 + 0.24));
  }
  // bumper, grille, lamps, exhaust stack
  addV(box(0.3, 0.55, CAB_W - 0.1, mats.dark), NOSE + 0.12, DECK_Y + 0.2, 0);
  addV(box(0.12, 0.66, CAB_W - 0.7, mats.dark), NOSE + 0.04, DECK_Y + 1.0, 0);
  for (const sz of [1, -1]) {
    addV(box(0.09, 0.22, 0.44, mats.lens), NOSE + 0.16, DECK_Y + 0.54, sz * 0.86);
  }
  const stack = cyl(0.09, 1.9, mats.rim, 12);
  addV(stack, cabX - 1.44, DECK_Y + 1.75, -(CAB_W / 2 + 0.11));
  // fuel tank slung under the cab — a real one is a big polished cylinder
  const tank = cyl(0.38, 1.5, mats.rim, 20);
  tank.rotation.z = Math.PI / 2;
  addV(tank, cabX - 0.55, DECK_Y - 0.34, CAB_W / 2 - 0.02);

  /* ---- the plate ---- */
  const plateX = NOSE + 0.29, plateY = DECK_Y + 0.2;
  const plateMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.22), mats.plate);
  plateMesh.position.set(plateX, plateY, 0.42);
  plateMesh.rotation.y = Math.PI / 2;
  vehicle.add(plateMesh);

  /* ---- cantilever gantry (fixed) ---- */
  const colZ = -3.5;
  const beamY = 3.05;
  addF(box(0.42, beamY - GROUND_Y + 0.3, 0.42, mats.dark), GANTRY_X, (beamY + GROUND_Y) / 2 + 0.15, colZ);
  addF(box(0.34, 0.34, 6.4, mats.dark), GANTRY_X, beamY, colZ + 3.2);
  const brace = box(0.2, 0.2, 2.6, mats.dark);
  brace.rotation.x = -0.62;
  addF(brace, GANTRY_X, beamY - 0.85, colZ + 1.15);

  /* ---- camera heads ---- */
  let headPos = new THREE.Vector3();
  [-1.9, -0.4, 1.1].forEach((z, i) => {
    const body = addF(box(0.34, 0.26, 0.5, mats.dark), GANTRY_X, beamY - 0.38, z);
    body.rotation.x = 0.34;
    addF(box(0.06, 0.22, 0.06, mats.dark), GANTRY_X, beamY - 0.2, z);
    const l = cyl(0.1, 0.06, mats.lens, 18);
    l.rotation.x = Math.PI / 2 + 0.34;
    addF(l, GANTRY_X, beamY - 0.5, z + 0.24);
    if (i === 1) headPos = new THREE.Vector3(GANTRY_X, beamY - 0.44, z + 0.32);
  });
  // side-reading head low on the column, aimed across the lane at the plate
  addF(box(0.3, 0.24, 0.44, mats.dark), GANTRY_X, 0.55, colZ + 0.42);
  const sideLens = cyl(0.09, 0.06, mats.lens, 16);
  sideLens.rotation.x = Math.PI / 2;
  addF(sideLens, GANTRY_X, 0.55, colZ + 0.68);

  /* ---- the barrier ----
     The concept beat. Everything else in the scene asserts "read on the move";
     the boom is what makes it legible — it lifts on the READ, not on a button,
     and the truck never slows for it.

     The housing spans GROUND_Y..GROUND_Y+0.5 and the post GROUND_Y..-0.80, so
     the post runs THROUGH the housing rather than landing on its lid: two faces
     at identical depth z-fight, which is the rule this file opens with. */
  addF(box(0.32, 0.5, 0.26, mats.dark), 6.4, GROUND_Y + 0.25, 1.55);
  addF(box(0.16, 1.1, 0.18, mats.dark), 6.4, GROUND_Y + 0.55, 1.55);

  /* The arm is deliberately skewed ~20° off pure cross-lane. At the camera's
     az≈0.28 a barrier square to the lane presents almost end-on and reads as a
     stick; yawed, it has length on screen through the whole of its travel. */
  const barrierYaw = new THREE.Group();
  barrierYaw.position.set(6.4, -0.80, 1.55);
  barrierYaw.rotation.y = 0.35;
  fixed.add(barrierYaw);

  const barrierArm = new THREE.Group();
  barrierYaw.add(barrierArm);
  const addB = put(barrierArm);

  /* Built along local +Y, so +Y IS the up/clear state and rotation.x = 0 is
     "open". Alternating light/dark segments — a boom gate is legible at
     distance because of the stripes, not because of its shape. */
  const bandMats = [mats.barrierLight, mats.dark, mats.barrierLight, mats.dark, mats.barrierLight, mats.dark];
  for (let i = 0; i < 6; i++) {
    addB(box(0.09, 0.55, 0.09, bandMats[i]), 0, 0.08 + 0.275 + i * 0.55, 0);
  }
  addB(box(0.13, 0.1, 0.13, mats.barrierLight), 0, 3.46, 0);
  // counterweight below the pivot: when the arm is down this swings up and back
  // toward the camera, which is the detail that makes a boom read as a real one
  addB(box(0.18, 0.5, 0.18, mats.dark), 0, -0.42, 0);

  /* ---- wireframe used by the intro ---- */
  const shell = new THREE.BoxGeometry(C_L, C_H, 2.438);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(shell),
    new THREE.LineBasicMaterial({ color: 0x5CC8FF, transparent: true, opacity: 0 }),
  );
  edges.position.set(CONTAINER_X, C_CY, 0);
  vehicle.add(edges);
  shell.dispose();

  // the markings block, lifted straight off the real container so the callouts
  // land on the same paint Container Vision reads
  const idPos = container.ocr.pos.clone().add(new THREE.Vector3(CONTAINER_X, C_CY, 0));

  return {
    vehicle,
    fixed,
    edges,
    containerHardware: container.hardware,
    anchors: {
      id: { id: "id", pos: idPos, normal: container.ocr.normal.clone() },
      seal: {
        id: "seal",
        pos: new THREE.Vector3(CONTAINER_X - C_L / 2 - 0.1, C_CY + 0.15, 0.7),
        normal: new THREE.Vector3(-1, 0, 0.4).normalize(),
      },
      plate: {
        id: "plate",
        pos: new THREE.Vector3(plateX + 0.03, plateY, 0.42),
        normal: new THREE.Vector3(1, 0, 0),
      },
    },
    headAnchor: { id: "head", pos: headPos, normal: new THREE.Vector3(0.1, 0.2, 1).normalize() },
    barrier: barrierArm,
  };
}
