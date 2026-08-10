"use client";

/* ---------------------------------------------------------------------------
   Tank Vision — cinematic product demo (section 02).

   Same studio, same camera language and the same overlay grammar as Container
   Vision and Gate Vision. The CLAIM is what makes it a different film:

     Container Vision reads a BOX — its markings and its panels.
     A tank is not a box. What fails on a tank is its FITTINGS and the
     CURVATURE of its shell, and neither is visible in a flat panel read.

   So this scene inspects three things in one pass and flags one: a shallow
   corroded patch on the barrel, the manlid, the discharge valve. A single
   vertical scan plane travels the length of the tank and CAUSES each finding
   in the order it reaches them — brackets that simply appear are decoration,
   brackets that appear as a sweep crosses their target read as inference.

   Geometry follows the approved ISO tank T11 elevation: outer frame with
   X-braced ends, cylindrical shell with dished ends, three ring stiffeners,
   manlid and walkway on top, discharge valve low at one end, ladder at the
   other.

   Fills its parent. Not scroll-driven. prefers-reduced-motion holds a frame.
--------------------------------------------------------------------------- */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { PALETTE } from "../_vision/palette";
import { createStudio } from "../_vision/studio";
import { mountWhenVisible } from "../_vision/mount";
import {
  type CamKey, clamp01, easeInOut, lerp, makeCamPath, placeCamera, smoothstep,
} from "../_vision/camera";
import { type Callout, createCallout, makeProjector, placeCallout } from "../_vision/overlay";
import { makeMetal, metalBox, tintMetal } from "../_vision/metal";
import { makeRustDecal } from "../container-vision/materials";
import { createTracker, detectMaterials, scanPlane } from "../hero-cards/detect";
import { draftingGround, setGroundOpacity } from "../hero-cards/ground";
import { buildReadCamera, type ReadCamera } from "../_vision/readCamera";

/* ---- the tank, in metres. ISO 20ft envelope: 6058 x 2438 x 2591 ---- */
const GROUND = -1.30;
const L = 6.06;
const W = 2.44;
const H = 2.59;
const R = 1.05;          // shell radius

/* One pass end to end, unhurried: this is a survey, not a gate crawl. */
const LOOP = 7.4;

/* The pole camera's field of view. The hand-built cone this replaces was a
   unit cone written as scale.set(len * 0.11, len * 0.11, len) every frame —
   a radius of 0.11*len at distance len, which is a half-angle of atan(0.11),
   independent of length. Same number, stated once. */
const SIGHT_HALF_ANGLE = Math.atan(0.11);
/* 5.0s. Three stops each need a move, a hold and a return. At 3.4 the holds
   came out around 0.3s, which is below what a two-word label needs to be read;
   5.0 is the shortest period that leaves each hold near 0.6s.

   This deliberately exceeds the earlier three-to-four second target, because at
   three stops that target and legible labels are in direct conflict — the
   period cannot be spent twice. Everything below is a fraction of p, so the
   beats scale with it; the CAMERA keys are re-cut rather than rescaled, because
   a move that reads as a smooth drift over thirteen seconds reads as a lurch
   when the same path is traversed four times faster. */
const SETTLE = 1.15;     // the subject fades up inside the opening hold

/* The scan's own timeline over the loop. The travel is LINEAR — a sweep that
   eases would read as a light being aimed by hand rather than a machine
   covering a surface at a known rate. At 3.4s the whole tank cannot still be
   under a slow crawl for the run of the loop, so the sweep is now one fast
   establishing pass early — p 0.02 to 0.20 — and is hidden outside that
   window; the three close-ups that follow carry the rest of the film. */
const SCAN_FROM = -3.4;
const SCAN_TO = 3.4;
const SCAN_IN = 0.02;
const SCAN_OUT = 0.20;
const scanAt = (p: number) => lerp(SCAN_FROM, SCAN_TO, clamp01((p - SCAN_IN) / (SCAN_OUT - SCAN_IN)));

/* The three findings, in the order the sweep meets them. Only the first is a
   defect; two clears are not padding — an inspection that only ever reports
   faults is a fault detector, and the product's claim is a pass over the whole
   tank. */
const PATCH_X = -0.90;
const MANLID_X = 0;
const VALVE_X = 2.00;

/* Camera — house rule. Locked HEIGHT, `rad` is ground distance, the azimuth
   sweeps and nothing cranes. A three-quarter angle is mandatory here: square
   on, the shell's curvature is invisible and the tank reads as a flat-sided
   box, which is the exact thing this section says it is not.

   The key ring is CYCLIC with no closing key, so the sweep goes out to 0.58
   and eases back through the cleared tail rather than snapping at the wrap. */
const CAM_Y = 1.35;
const TY = 0.05;
/* Distances pulled in from 8.6-8.1 to 6.8-6.4. Worked, not eyeballed: the
   subject spans y -1.30..1.30 and the slot is 1600x680 (2.35 wide), so at
   camY 1.35 aiming at y 0.05 the 30deg fov covers 11.24 units across at
   rad 8.6 against a 6.06 tank — the tank filled 51% of the frame width, which
   is a thumbnail, not a flagship that owns its band. At 6.8 that is 63% and at
   6.3 it is 67%, with 0.5+ of vertical margin still clear above the frame top
   (1.29) and below the hardstand. Azimuth foreshortens the length by cos(az),
   so the sweep to 0.58 costs about 5 points of fill; the near keys sit closer
   to compensate.

   THESE ARE ARITHMETIC, NOT OBSERVED. The preview pane would not composite
   while this was built, so no screenshot has confirmed them — they are strictly
   closer to the target fill than the numbers they replace, but the framing pass
   still owes a look. */
/* IN, OUT, IN, OUT, IN — three punch-ins with a wide reset between each, per
   explicit direction. Two things make this survive a 3.4s period:

   Every close-up is a PAIR of keys, not one. A single key at the near distance
   is a point the spline passes THROUGH at speed, so the subject is never
   actually held still; a pair separated by ~0.09 of p gives roughly 0.3s of
   genuine stillness at the near end, which is what makes it read as a look
   rather than a swerve.

   The wide returns all share az ~0.38 and rad ~6.75-6.80, so the frame the eye
   comes back to is the same frame every time. A different wide each time reads
   as drifting; an identical wide reads as a camera returning to its post.

   Camera HEIGHT is still locked at CAM_Y and rad is still GROUND distance, so
   none of this cranes — the house rule holds.

   Near distance is 4.95-5.10, NOT the 3.1-3.3 first tried. At 3.1 the camera
   sits closer to the barrel than the barrel's own length: the frame fills with
   unbroken white shell, the subject loses every cue that it is a tank, and the
   punch reads as a swerve into a wall. A close-up still has to contain enough
   of the object to say what the object is. Five units keeps the frame rails and
   at least one stiffener in shot at every stop, which is what makes the detail
   legible AS a detail.

   The valve stop aims at y=-0.45, not the valve's own -0.85. Camera height is
   locked at 1.35, so aiming at the fitting itself tilts the eye 34.5deg down
   and dumps the bottom half of the frame into empty hardstand. -0.45 halves the
   tilt to about 20deg, keeps the valve in the lower third where it belongs, and
   gives the label somewhere to live. Aiming AT a low subject is not the same as
   framing it. */
const CAM: CamKey[] = [
  { p: 0.00, az: 0.36, rad: 6.80, t: [0, TY, 0] },
  { p: 0.11, az: 0.52, rad: 4.95, t: [-0.90, 0.30, 0] },
  { p: 0.26, az: 0.51, rad: 4.95, t: [-0.90, 0.30, 0] },
  { p: 0.36, az: 0.38, rad: 6.75, t: [0, TY, 0] },
  { p: 0.46, az: 0.30, rad: 5.10, t: [0, 1.05, 0] },
  { p: 0.62, az: 0.32, rad: 5.10, t: [0, 1.05, 0] },
  { p: 0.70, az: 0.40, rad: 6.75, t: [0, TY, 0] },
  { p: 0.78, az: 0.60, rad: 5.05, t: [2.00, -0.45, 0.2] },
  { p: 0.92, az: 0.59, rad: 5.05, t: [2.00, -0.45, 0.2] },
];
const sampleCam = makeCamPath(CAM);

/* Same aspect compensation as the other two flagships: the keys are tuned at
   the slot's 1600x680, and a bled canvas is taller, which narrows the
   horizontal field and magnifies the subject. See container-vision. */
const REF_ASPECT = 1600 / 680;
const fitRad = (rad: number, aspect: number) =>
  rad * Math.min(Math.max(REF_ASPECT / Math.max(aspect, 0.2), 1), 2.6);

/* The frame reduced motion holds: after every finding has landed and before
   the clear, so a held frame shows the completed survey. */
/* 0.86, not 0.80. The valve window opens at exactly 0.80, so the reduced-motion
   still frame landed on the window boundary AND on the punch-in key rather than
   in the hold — a held frame should show the shot the loop actually rests on. */
const FROZEN_P = 0.85;
const FROZEN_T = 8;

/* ---- materials ----------------------------------------------------------
   ONE makeMetal call, tinted five ways. This exact parameter set is already
   in the page's texture cache (the Warehouse and Data cards ask for it), so
   the whole scene's metal costs zero canvases and no Sobel pass. Tinting is
   only valid off a NEUTRAL base — see tintMetal. */
interface TankMats {
  shell: THREE.MeshStandardMaterial;
  frame: THREE.MeshStandardMaterial;
  fitting: THREE.MeshStandardMaterial;
  grating: THREE.MeshStandardMaterial;
  patch: THREE.MeshStandardMaterial;
  all: THREE.MeshStandardMaterial[];
  dispose: () => void;
}

function buildTankMaterials(): TankMats {
  const base = makeMetal({ base: "#9AA0A8", kind: "brushed", metalness: 0.7, rough: 0.45 });
  /* PLAIN, MAP-FREE. The shell was a tinted brushed metal, so it carried an
     albedo, a roughness map and a Sobel-derived normal — three maps' worth of
     grain on a surface that in life is smooth rolled stainless. A generic tank
     barrel reads by its CURVATURE and its specular band, and a grain map fights
     both. It is also three fewer maps to sample per fragment on the largest
     surface in the frame. */
  /* #C4CCD6 -> #6B737C. The shell is the one surface in this scene with NO
     map (see above) — flat colour, full key+fill+rim, through ACES. That
     combination reads a hex far lighter than its own number, which is why
     the barrel was glowing off the page even though C4CCD6 does not look
     like a bright hex on a swatch. Relative luminance (0.2126R+0.7152G+0.0722B
     in linear-from-sRGB terms) was ~0.80 for the old value; 6B737C brings it
     to ~0.45, a ~44% cut. That is deliberately NOT pushed further: the shell
     still has to read as rolled stainless by its curvature and specular band
     (see the comment above this block), and a value much below mid-grey
     starts to read as painted steel instead — which is the OTHER flagships'
     material, not this one's. It also has to stay far enough above the rust
     decal's dominant dark tones (see patch, below) that the defect still
     reads as darker-than-shell rather than shell-coloured. */
  const shell = new THREE.MeshStandardMaterial({
    color: "#6B737C",
    metalness: 0.45,
    roughness: 0.28,
    envMapIntensity: 0.9,
    transparent: true,
    opacity: 0,
  });
  /* Frame and grating are left alone — see the report. Fitting is the one
     other value moved: it is the material on the manlid, the valve body and
     stub, the ladder, and the camera head lens, all explicitly called out as
     "the tank itself". #6E767F -> #5C636B, ~16% luminance cut. Smaller than
     the shell's because fitting is MAPPED (tintMetal clones a material that
     carries albedo/roughness/normal maps baked at a NEUTRAL base and tints by
     multiplying `.color` over that map) — a mapped surface already renders
     roughly a stop darker than a flat colour at the same hex, so it did not
     need the shell's full correction, and moving it as far would have pushed
     it past frame's own darker value and inverted the two structural greys. */
  const frame = tintMetal(base.material, "#4A525B", { metalness: 0.3 });
  const fitting = tintMetal(base.material, "#5C636B", { metalness: 0.35 });
  const grating = tintMetal(base.material, "#3A4149", { metalness: 0.25 });
  /* THE CORRODED PATCH IS NOW A DECAL, not a tinted solid. Every tinted-solid
     pass at this failed the same way: a disc always reads as a disc, so the
     damage looked like a grey sticker applied to the shell no matter what the
     colour was. Container Vision already solves this — the corrosion there is
     PAINTED, with an irregular silhouette, pitting and bleed streaks, and it is
     laid on the steel as a transparent decal. This borrows that exact
     generator, so the two scenes report the same defect in the same hand. */
  const rustTex = makeRustDecal();
  const patch = new THREE.MeshStandardMaterial({
    map: rustTex, transparent: true, opacity: 0, roughness: 0.75, metalness: 0.2,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
  });
  /* The sight cone's material used to live here, as a #2E86BE MeshBasicMaterial.
     It is gone: the volume is now createSightCone's, built in the scene body
     where it is aimed, on the palette's one observing blue. */
  const all = [shell, frame, fitting, grating, patch];
  return {
    shell, frame, fitting, grating, patch, all,
    /* The neutral base is never assigned to a mesh, but it is a real material.
       The rust texture IS disposed here — unlike the shared maps inside
       container-vision's cache, this one is generated per call and tank-vision
       is its only consumer. */
    dispose: () => {
      all.forEach((m) => m.dispose());
      rustTex.dispose();
      base.dispose();
    },
  };
}

/* ---- subject ---------------------------------------------------------- */
interface Tank {
  root: THREE.Group;
  /** the defect, the tracker's flagged target */
  patch: THREE.Mesh;
  /** grouped so one bracket can follow the whole fitting, not a bolt */
  manlid: THREE.Group;
  valve: THREE.Group;
  /** the CCTV head, re-aimed every frame at whatever is currently flagged —
      built by the shared rig; see the buildReadCamera call below. */
  readCam: ReadCamera;
  /** geometry this scene owns outright and must dispose */
  owned: THREE.BufferGeometry[];
}

function buildTank(m: TankMats): Tank {
  const root = new THREE.Group();
  const add = (o: THREE.Mesh) => { o.castShadow = true; root.add(o); return o; };

  /* ---- frame: the ISO envelope the tank is carried in ---- */
  const px = L / 2 - 0.08;             // 2.95 — post centres
  const pz = W / 2 - 0.08;             // 1.14
  const yMid = GROUND + H / 2;
  const yTopRail = GROUND + H - 0.07;
  const yBotRail = GROUND + 0.07;

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = metalBox(0.16, H, 0.16, m.frame);
      post.position.set(sx * px, yMid, sz * pz);
      add(post);
    }
  }
  // long rails, top and bottom, on both sides
  for (const sz of [-1, 1]) {
    for (const y of [yTopRail, yBotRail]) {
      const rail = metalBox(L, 0.14, 0.14, m.frame);
      rail.position.set(0, y, sz * pz);
      add(rail);
    }
  }
  // end rails, running across in Z
  for (const sx of [-1, 1]) {
    for (const y of [yTopRail, yBotRail]) {
      const rail = metalBox(0.14, 0.14, W, m.frame);
      rail.position.set(sx * px, y, 0);
      add(rail);
    }
  }
  // corner castings — the eight blocks a spreader actually picks up
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      for (const y of [GROUND + 0.11, GROUND + H - 0.11]) {
        const c = metalBox(0.26, 0.22, 0.26, m.frame);
        c.position.set(sx * px, y, sz * pz);
        add(c);
      }
    }
  }
  /* X-braces on both end faces. The box's long axis is Z, so a rotation about
     X swings it in the end plane: Rx(a) sends +Z to (0, -sin a, cos a), which
     means the brace's Z reach is len*cos(a) and its Y reach is len*sin(a).

     The end opening is (W - 0.30) = 2.14 across and (H - 0.30) = 2.29 tall, so
     for the diagonal to actually land corner to corner the tilt has to be
     atan2(2.29, 2.14) = 0.8196 rad, with len = hypot(2.14, 2.29) = 3.1355.
     (Feeding the two arguments the other way round gives 0.7513 rad, which
     puts 2.29 across and 2.14 up — a brace 15 cm too wide for the frame and
     45 cm short of the top rail. Deviation from the spec is deliberate; see
     the build report.) */
  const braceAcross = W - 0.30;
  const braceUp = H - 0.30;
  const braceLen = Math.hypot(braceAcross, braceUp);
  const braceTilt = Math.atan2(braceUp, braceAcross);
  for (const sx of [-1, 1]) {
    for (const s of [-1, 1]) {
      const b = metalBox(0.10, 0.10, braceLen, m.frame);
      b.position.set(sx * px, yMid, 0);
      b.rotation.x = s * braceTilt;
      add(b);
    }
  }

  /* ---- shell: barrel plus two dished ends ----
     40 radial segments, raised from 28 now that the shell carries no maps —
     the silhouette is doing all the work of reading the curve, so faceting
     shows on this mesh in a way it did not when a grain map broke it up. */
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 4.60, 40, 1), m.shell);
  barrel.rotation.z = Math.PI / 2;     // lay the axis along X
  add(barrel);
  for (const sx of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(R, 24, 16), m.shell);
    cap.position.x = sx * 2.30;
    // 0.42 in X — a dished end is a shallow cap, not a hemisphere
    cap.scale.set(0.42, 1, 1);
    add(cap);
  }
  /* Ring stiffeners, standing in the YZ plane so rotated about Y.

     The centre ring is at -0.55, NOT at 0. The schematic does draw a ring
     ellipse at the same station as the manlid, which is legible as a flat
     drawing but in three dimensions puts a 90mm torus straight through the
     manlid collar. The drawing can overlap two features on one line; a model
     cannot. */
  for (const x of [-1.45, -0.55, 1.45]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R + 0.015, 0.045, 8, 28), m.frame);
    ring.position.x = x;
    ring.rotation.y = Math.PI / 2;
    add(ring);
  }

  /* ---- manlid: collar, lid, six bolts. One group, one bracket. ---- */
  const manlid = new THREE.Group();
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.18, 20), m.fitting);
  collar.position.y = R + 0.09;
  collar.castShadow = true;
  manlid.add(collar);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.06, 20), m.fitting);
  lid.position.y = R + 0.21;
  lid.castShadow = true;
  manlid.add(lid);
  const boltGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.08, 8);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const bolt = new THREE.Mesh(boltGeo, m.fitting);
    bolt.position.set(Math.cos(a) * 0.26, R + 0.25, Math.sin(a) * 0.26);
    manlid.add(bolt);
  }
  manlid.position.x = MANLID_X;
  root.add(manlid);

  /* ---- walkway: offset to one side of the manlid, as the elevation draws it.
     Grating, four stanchions, one handrail — enough for the eye to read a
     working platform on top of a tank. ---- */
  const grate = metalBox(2.30, 0.05, 0.46, m.grating);
  grate.position.set(1.55, R + 0.10, 0);
  add(grate);
  for (const x of [0.55, 1.20, 1.90, 2.55]) {
    const st = metalBox(0.05, 0.34, 0.05, m.grating);
    // seated ON the grating: half the post above the grating's top face
    st.position.set(x, R + 0.125 + 0.17, 0.20);
    add(st);
  }
  const rail = metalBox(2.30, 0.05, 0.05, m.grating);
  rail.position.set(1.55, R + 0.42, 0.20);
  add(rail);

  /* ---- ladder at the +X end ---- */
  for (const z of [0.85, 1.05]) {
    const stile = metalBox(0.05, 1.90, 0.05, m.fitting);
    stile.position.set(2.92, GROUND + 0.95, z);
    add(stile);
  }
  for (let i = 0; i < 8; i++) {
    const rung = metalBox(0.05, 0.05, 0.20, m.fitting);
    rung.position.set(2.92, GROUND + 0.20 + (i / 7) * 1.50, 0.95);
    add(rung);
  }

  /* ---- discharge valve, low at the +X end. The second thing on a tank that
     actually fails, and the one a walk-round inspection reaches last. ---- */
  const valve = new THREE.Group();
  const body = metalBox(0.30, 0.26, 0.24, m.fitting);
  body.position.set(VALVE_X, -R + 0.02, 0.30);
  body.castShadow = true;
  valve.add(body);
  /* Stub shortened to 0.16 and lifted: at 0.22 long, hung from -R - 0.16, its
     bottom reached y = -1.32 against a frame that bottoms out at GROUND
     (-1.30). A discharge fitting that pokes through the floor it stands on
     reads as a modelling error even when nobody can name it. */
  const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.16, 12), m.fitting);
  stub.position.set(VALVE_X, -R - 0.13, 0.30);
  stub.castShadow = true;
  valve.add(stub);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 6, 16), m.fitting);
  wheel.position.set(VALVE_X, -R - 0.05, 0.44);
  wheel.rotation.x = Math.PI / 2;
  valve.add(wheel);
  root.add(valve);

  /* ---- THE DEFECT: a shallow corroded patch, ON the curve ----

     Built with the geometry PRE-ROTATED so the disc's axis is +Z, then aimed
     at the shell's own axis with lookAt — which points +Z inward, i.e. exactly
     along the radius. The disc plane is therefore the tangent plane at that
     point, so it lies flush by construction rather than by a hand-guessed pair
     of Euler angles. No flip is needed: a 2 cm disc has no front.

     The plane is aimed the same way, but OUTWARD: a PlaneGeometry has a front
     and a back, its normal is +Z, and lookAt turns local +Z toward the given
     point — so it is aimed at a point twice as far along the same radius, not
     at the axis. Aiming at the axis would bury the painted face in the shell.

     Nudged 6 mm PROUD rather than bedded 8 mm in. The old disc had 20 mm of
     thickness to sink; a plane has none, so sinking it only puts it inside the
     shell. polygonOffset keeps it off the barrel's own depth values. */
  const PATCH_ANG = 0.55;              // rad up from front-centre
  const patchRho = R + 0.006;
  const patchGeo = new THREE.PlaneGeometry(0.52, 0.52);
  const patch = new THREE.Mesh(patchGeo, m.patch);
  const patchY = patchRho * Math.sin(PATCH_ANG);
  const patchZ = patchRho * Math.cos(PATCH_ANG);
  patch.position.set(PATCH_X, patchY, patchZ);
  root.add(patch);
  patch.lookAt(PATCH_X, patchY * 2, patchZ * 2);

  /* ---- CCTV pole. THE CAMERA AIMS AT WHAT IS DETECTED ----

     House rule, and the defect that had to be fixed in the lead card: a head
     sweeping on its own timer beside brackets that appear somewhere else says
     the two are unrelated, which is the opposite of the claim. The head is
     re-aimed every frame at the stop that is currently flagged (see applyFrame),
     and the sight cone is stretched to actually reach it. */
/* -3.55, not -4.30. At the wide key the frame is about 9.1 units across, so a
     pole at -4.30 sat on or past the left edge: only its sight cone entered
     shot, which read as an unexplained grey wash rather than as a camera
     looking at something. A camera that is meant to justify the detections has
     to be IN the picture. */
  const POLE_X = -2.60;
/* 1.90, and X pulled to -2.60. Worked from the frustum, not by eye: at the
     wide key placeCamera puts the eye at x=+2.40, z=+6.36, so the frame is NOT
     centred on the origin. A pole at (-3.55, 2.70) sits 37.8deg off the view
     axis against a horizontal half-fov of 32.2deg at this 2.35 aspect — outside
     the frustum, which is why only its cone entered shot and read as a wash.
     (-2.60, 1.90) is 27.8deg off axis and comfortably inside. A near-field pole
     is also magnified, so pulling it toward the tank in z helps twice. */
  const POLE_Z = 1.90;
  /* BUILT BY THE SHARED RIG — `_vision/readCamera.ts`. Cargo is the reference
     migration; this reproduces the hand-built housing/lens silhouette exactly.

     HEAD DOES TRACK (`headTracks` left at its default true) — this camera
     swivels onto whatever is currently flagged, every frame; see AIM_SEGMENTS
     below. `mount`/`aim` below are the same POLE_X+0.55 head position and
     first STOPS target the hand-built version used to seed its lookAt.

     GEOMETRY, MAPPED FROM THE OLD NUMBERS (no sign flip needed — camHead was a
     plain THREE.Group, not a Camera, so its own `lookAt` pointed local +Z at
     the target, the same convention the rig uses; the lens sat at position.z
     = +0.24, proud of the box on its +Z face, i.e. already on the forward
     side): headBox = metalBox(0.42, 0.26, 0.32) with no offset -> bodySize
     [0.42, 0.26, 0.32], bodyZ 0. lensGeo = Cylinder(0.085, 0.10, 0.18) at
     z=0.24 -> lensR 0.085, lensR2 0.10, lensLen 0.18, lensZ 0.24. No yoke, no
     hood — the old head had neither.

     NO floorY — every STOPS target is a defect ON THE SHELL, never the
     ground, so the cone always ran to the target itself, never to a floor
     pool (see the old `sightCone.aim` note this replaces). SIGHT_HALF_ANGLE
     was atan(0.11), independent of range — coneRadius: 0 with minHalfAngle:
     SIGHT_HALF_ANGLE reproduces that constant half-angle exactly, since
     atan(0/range) is always 0 and the floor then always wins. */
  const readCam = buildReadCamera({
    mount: new THREE.Vector3(POLE_X + 0.55, GROUND + 3.32, POLE_Z),
    aim: new THREE.Vector3(...STOPS[0].pos),
    bodyMat: m.grating,
    lensMat: m.fitting,
    bodySize: [0.42, 0.26, 0.32],
    bodyZ: 0,
    lensZ: 0.24,
    lensR: 0.085,
    lensR2: 0.10,
    lensLen: 0.18,
    yoke: false,
    hood: false,
    coneRadius: 0,
    minHalfAngle: SIGHT_HALF_ANGLE,
  });
  root.add(readCam.group);

  /* THE MAST AND ARM ARE STILL TANK'S OWN. The rig's optional `poleFrom`
     builds a plain pole-and-footplate; this mount has an ARM offsetting the
     head sideways off the mast, a shape the rig does not build, so no
     `poleFrom` is passed and these two meshes are parented into the rig's
     returned group instead — same approach cargo uses for its own bracket.
     3.40 tall, not 4.10: the head has to clear the tank (top 1.30) without
     riding out of the top of a frame whose vertical half-fov is only 15deg. */
  const mast = metalBox(0.12, 3.40, 0.12, m.frame);
  mast.position.set(POLE_X, GROUND + 1.70, POLE_Z);
  mast.castShadow = true;
  readCam.group.add(mast);
  const arm = metalBox(0.60, 0.10, 0.10, m.frame);
  arm.position.set(POLE_X + 0.30, GROUND + 3.32, POLE_Z);
  arm.castShadow = true;
  readCam.group.add(arm);

  return { root, patch, manlid, valve, readCam, owned: [patchGeo, ...readCam.owned] };
}

/* ---- the three findings, as screen furniture -------------------------- */
/* `normal` is the projector's facing test, not decoration: a callout hides
   once its face turns away from the eye. THE MANLID CANNOT USE A STRAIGHT-UP
   NORMAL — camera height is locked at 1.35 and the lid sits at 1.30, so (0,1,0)
   is within 0.05 of perpendicular to the eye vector and the label would never
   appear at all. Each normal is therefore tilted toward the camera's arc,
   which stays on the +X/+Z side for the whole loop. */
/* Each finding's window is now tied to its OWN close-up (see CAM), not to the
   scan sweep — the sweep is long gone by the time any of these are on screen.

   A window covers the HOLD and a small margin, NOT the travel. During a
   punch-in the projected position sweeps across the frame and placeCallout's
   position guards correctly reject it, so a window spanning the whole in-and-out
   spends most of its length asking for a placement that will be refused — which
   is why labels appeared only intermittently. The tracker brackets are gated on
   the same windows and were failing for the same reason. */
const STOPS: {
  x: number;
  title: string;
  detail: string;
  severe: boolean;
  pos: [number, number, number];
  normal: [number, number, number];
  lane: { dir: "up" | "down"; len: number };
  win: [number, number];
}[] = [
  {
    x: PATCH_X,
    title: "CORROSION 0.4 mm",
    detail: "Shell · flagged",
    severe: true,
    pos: [PATCH_X, R * Math.sin(0.55), R * Math.cos(0.55)],
    normal: [0, 0.52, 0.85],
    /* 110, not 210. At 210 the label's top edge landed above the overlay's
       usable height (the canvas is bled 230px top and bottom for the frame
       bleed, leaving well under half the canvas as placeable space) on EVERY
       frame, not just at bad timing — the guard in placeCallout was correctly
       rejecting it, permanently. 110 is close to manlid's 96 and clears it. */
    lane: { dir: "up", len: 110 },
    win: [0.12, 0.29],
  },
  {
    x: MANLID_X,
    title: "SEAL OK",
    detail: "Manlid · clear",
    severe: false,
    pos: [MANLID_X, R + 0.28, 0],
    normal: [0, 0.55, 0.84],
    lane: { dir: "up", len: 96 },
    win: [0.47, 0.65],
  },
  {
    x: VALVE_X,
    title: "NO RESIDUE",
    detail: "Valve · clear",
    severe: false,
    pos: [VALVE_X, -R + 0.02, 0.44],
    normal: [0.22, -0.16, 0.96],
    /* UP, not down. The valve is the lowest thing in the scene, so a downward
       lane put the label's bottom edge past the 0.94h guard in placeCallout and
       the label was rejected outright — the bracket appeared and the words
       never did. The only direction with room below a bottom-of-frame subject
       is up; the leader crossing the shell is normal for a callout and the dark
       box reads fine over white. */
    lane: { dir: "up", len: 150 },
    win: [0.79, 0.95],
  },
];

/* Scratch for the per-frame camera aim. Module-level so the render loop
   allocates nothing: a Vector3 per frame at 45fps is 45 collectable objects a
   second, per live scene, for the life of the page. */
const aimPoint = new THREE.Vector3();
// seeded to the LAST stop so p=0 continues the previous cycle's look
let aimIdx = STOPS.length - 1;
/* The viewer camera's own wide -> IN key pairs, copied from CAM rather than
   computed from it, because CAM is keyframe data and these three are the
   subset that are approach segments. If CAM's approach timings change, these
   three pairs have to change with them or the two cameras drift apart again. */
const AIM_SEGMENTS: [number, number, number][] = [
  [0.00, 0.11, 0],
  [0.36, 0.46, 1],
  [0.70, 0.78, 2],
];
/** `bare` lifts the tank out of its frame — see ContainerVisionScene. */
export default function TankVisionScene({ bare = false, bleed = 0 }: { bare?: boolean; bleed?: number } = {}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const wrap = canvasWrapRef.current;
    const overlay = overlayRef.current;
    if (!host || !wrap || !overlay) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    /* Deferred so the CSS-hidden responsive twin never builds a context. */
    return mountWhenVisible(wrap, () => {
    let cleanup = () => {};

    try {
      /* Same cost profile as the other two flagships: maxDpr 1.75 and a 1024
         shadow map, full light rig and environment left on. The subject is a
         6 m object, so the shadow camera and the light rig are spread to cover
         it end to end rather than pooling on the middle. Bloom is forced off
         by bare mode — the pass composites over an opaque buffer. */
      const studio = createStudio(wrap, {
        floorY: GROUND, shadowExtent: 8, spread: 1.3, bare, maxDpr: 1.75, shadowMapSize: 1024,
      });
      const { renderer, scene, camera, bloom, shadowMat } = studio;

      /* ---- subject ---- */
      const mats = buildTankMaterials();
      const tank = buildTank(mats);
      scene.add(tank.root);

      /* The cone group is a SIBLING of readCam.group, never a child — its
         ground pool (unused here, see NO floorY above) has to stay flat in
         world XZ. NO floorY passed to buildReadCamera: every entry in STOPS is
         a defect ON THE TANK SHELL, so the sight line never reaches the floor
         plane at y = GROUND — a ground pool here would be permanently hidden,
         i.e. a material and a draw call for nothing. Add one only if this
         scene ever aims at the deck. */
      scene.add(tank.readCam.coneGroup);

      /* The drafting sheet, not scenery — the same ground the hero cards use,
         so a bare scene still sits on a measured surface instead of floating.
         One unit per gridline, a metre, which is the tank's own unit. */
      const ground = draftingGround({ size: 26, y: GROUND - 0.01, step: 1, opacity: 0.1 });
      scene.add(ground.mesh);

      /* ---- the detector: one scan plane, three brackets ---- */
      const dm = detectMaterials();
      /* The plane is normal to X and the camera sits ~20 degrees off Z, so it
         is seen at a glancing angle from ONE side only. DoubleSide keeps it
         drawn if a later framing pass swings the azimuth past it. */
      dm.scan.side = THREE.DoubleSide;
      /* A 2.9 x 2.9 quad: scanPlane's `thickness` is its X extent, which the
         rotation below turns into the Z extent, and `height` is Y. Big enough
         to clear the frame it crosses (W = 2.44, H = 2.59). */
      /* 1.15 deep, not 2.9. A square 2.9 x 2.9 plane crossing the tank read as
         a pane of glass laid through it; a search bar has to look like a slice
         of light, so it keeps the height and loses most of the depth. */
      const scan = scanPlane(2.9, dm.scan, 1.15);
      scan.rotation.y = Math.PI / 2;
      scene.add(scan);

      /* Trackers read their target's WORLD bounding box and write a world
         position, so they are parented to the scene, not to the tank. Pads are
         per-target: the patch is 0.44 across and needs a loose bracket to read
         as a mark on a surface; the fittings are tight. */
      const trackers = [
        createTracker(dm.warn, { pad: 1.5 }),
        createTracker(dm.accent, { pad: 1.2 }),
        createTracker(dm.accent, { pad: 1.25 }),
      ];
      trackers.forEach((t) => scene.add(t.group));
      const targets: THREE.Object3D[] = [tank.patch, tank.manlid, tank.valve];

      /* ---- labels: the same DOM callouts the other flagships use ----
         Each window is the stop's own explicit close-up window (see STOPS) —
         the label is on screen for exactly as long as the camera is punched
         in on it, and gone once the camera pulls back out. */
      const marks: Callout[] = STOPS.map((s) =>
        createCallout(overlay, {
          title: s.title,
          detail: s.detail,
          pos: new THREE.Vector3(s.pos[0], s.pos[1], s.pos[2]),
          normal: new THREE.Vector3(s.normal[0], s.normal[1], s.normal[2]).normalize(),
          severe: s.severe,
          lane: s.lane,
          win: s.win,
        }),
      );

      const ro = new ResizeObserver(studio.size);
      ro.observe(wrap);

      /* Only DRAW while on screen. mountWhenVisible gates construction, not
         rendering — without this a flagship scrolled well past keeps issuing a
         full draw every frame for the rest of the session. rootMargin keeps the
         scene warm just outside the viewport so it is never caught mid-intro
         when scrolled back to. */
      let onScreen = true;
      const visObs = new IntersectionObserver(
        ([e]) => { onScreen = e.isIntersecting; },
        { rootMargin: "200px" },
      );
      visObs.observe(wrap);

      /* The clock is STARTED ON THE FIRST RENDERED FRAME, not at construction.
         Building a scene blocks for a while; with a clock running from
         construction the first frame the user actually sees is already
         hundreds of milliseconds in, so the intro appears to skip its
         beginning. Starting it here means every viewer sees frame one. */
      const clock = new THREE.Clock(false);
      let clockStarted = false;
      const target = new THREE.Vector3();
      const wpos = new THREE.Vector3();
      let raf = 0;

      const project = makeProjector(camera, tank.root);

      const applyFrame = () => {
        const frozen = reduce;
        const t = frozen ? FROZEN_T : clock.getElapsedTime();
        const p = frozen ? FROZEN_P : (t % LOOP) / LOOP;
        const w = renderer.domElement.clientWidth || wrap.clientWidth;
        const h = renderer.domElement.clientHeight || wrap.clientHeight;

        tank.root.updateMatrixWorld(true);

        const k = sampleCam(p);
        const cRad = fitRad(k.rad, w / h);
        target.set(k.tx, k.ty, k.tz);
        placeCamera(camera, { az: k.az, rad: cRad, tx: k.tx, ty: k.ty, tz: k.tz }, CAM_Y);
        // No handheld float, no roll, no right-bias slide: the camera is a
        // survey instrument here and the sweep supplies all the motion.
        camera.lookAt(target);
        camera.updateMatrixWorld(true);
        camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

        /* The subject fades up inside the opening hold. makeMetal returns
           transparent materials at opacity 0, so this loop is not a flourish —
           without it nothing is ever drawn. */
        const solid = frozen ? 1 : easeInOut(clamp01((t - 0.15) / SETTLE));
        mats.all.forEach((m) => { m.opacity = solid; });
        // a transparent mesh still casts a full shadow, so without this the
        // shadow is on the ground before the tank is
        shadowMat.opacity = 0.5 * solid;
        setGroundOpacity(ground, solid);

        /* The sweep: one fast establishing pass, on screen only for its own
           window (SCAN_IN..SCAN_OUT) — it is long done by the time any
           close-up or bracket appears. */
        const sx = scanAt(p);
        const scanVis = p < SCAN_IN || p > SCAN_OUT
          ? 0
          : smoothstep(SCAN_IN, SCAN_IN + 0.03, p) * (1 - smoothstep(SCAN_OUT - 0.03, SCAN_OUT, p));
        scan.position.x = sx;
        /* Driven below the presence tier's own peak. A plane normal to X seen
           from ~20 degrees off Z covers about a metre of frame, where the card
           scenes' scan bar is nearly edge-on and can afford full strength. */
        dm.scan.opacity = solid * 0.3 * scanVis;

        /* Each bracket is live only across its own stop's explicit window
           (see STOPS) — the same window that gates its label — rather than
           latched on from the old scan-position test and cleared en masse. */
        STOPS.forEach((s, i) => {
          const live = p > s.win[0] && p < s.win[1];
          trackers[i].follow(live ? targets[i] : null, camera);
        });
        // brackets are the detector's conclusions and ride the subject's fade
        dm.accent.opacity = solid;
        dm.warn.opacity = solid;

        /* Aim the pole camera at whatever the VIEWER camera is currently
           approaching or holding on — not at whatever the label window says is
           "active".

           THE ORIGINAL BUG WAS TIMING, NOT SPEED. The pole cam used to start
           swinging only once a stop's label window opened — win[0] for manlid
           is 0.49, which lands AFTER the viewer camera's own approach
           (0.36-0.48) has already finished and arrived at the close-up. So the
           in-scene camera only began moving once the viewer was already looking
           at the subject, then spent the whole hold catching up — which reads
           as exactly what was reported: the animation camera outrunning the
           on-screen one.

           The fix ties the pole cam's swing to the SAME p-window the viewer
           camera uses to approach each stop (its wide -> IN segment in CAM,
           duplicated here as AIM_SEGMENTS), and interpolates across it with the
           same easeInOut the rest of this file uses. Both cameras are now
           driven by the identical real-time interval — p * LOOP is the same
           clock for both — so they arrive together instead of one chasing the
           other. Outside a segment the pole cam holds its last committed
           target, same as before. */
        const seg = AIM_SEGMENTS.find(([a, b]) => p >= a && p < b);
        if (seg) {
          const [a, b, idx] = seg;
          aimIdx = idx;
          const prev = STOPS[(idx - 1 + STOPS.length) % STOPS.length].pos;
          const next = STOPS[idx].pos;
          const te = easeInOut(clamp01((p - a) / (b - a)));
          aimPoint.set(
            prev[0] + (next[0] - prev[0]) * te,
            prev[1] + (next[1] - prev[1]) * te,
            prev[2] + (next[2] - prev[2]) * te,
          );
        } else {
          const tgt = STOPS[aimIdx].pos;
          aimPoint.set(tgt[0], tgt[1], tgt[2]);
        }
        /* Re-aimed every frame, through the shared rig — one call re-reads
           the live lens, turns the head, and re-throws the cone. The old code
           wrote scale.set(len*0.11, len*0.11, len) on a unit cone, i.e. a
           radius of 0.11*len at distance len — a half-angle of atan(0.11) =
           0.10956 rad, independent of length. `coneRadius: 0` with
           `minHalfAngle: SIGHT_HALF_ANGLE` reproduces exactly that constant:
           atan(0/range) is always 0, so the floor always wins.
           0.11 and not 0.16: at 0.16 the cone covered most of the tank and
           read as haze rather than as a beam with a direction. */
        tank.readCam.aimAt(aimPoint);
        tank.readCam.setOpacity(solid * 0.10);
        tank.readCam.tick(frozen ? 1.4 : t);

        const place = (a: Callout) => {
          const [w0, w1] = a.win;
          const inWin = smoothstep(w0, w0 + 0.04, p) * (1 - smoothstep(w1 - 0.04, w1, p));
          const vis = frozen ? (a.win[0] <= FROZEN_P && a.win[1] >= FROZEN_P ? 1 : 0) : inWin;
          const world = wpos.copy(a.local).applyMatrix4(tank.root.matrixWorld);
          /* Shift canvas-space Y into overlay space: the canvas is `bleed` px
             taller on each side, so without this every label is off by exactly
             the bleed and drifts off the thing it points at. Bounds are the
             overlay's height too, not the canvas's. */
          const r = vis > 0.01 ? project(world, a.normal, w, h) : null;
          /* leftGuard 0.04, not the shared default 0.3. That default reserves the
             left third for the page's type column, which is correct where a
             flagship sits beside a headline — but this scene owns its full width
             and its close-ups put the subject dead centre, so the default was
             silently suppressing every label whose subject drifted left of a
             third. That was the whole of "the labels are not appearing". */
          placeCallout(a, r ? { sx: r.sx, sy: r.sy - bleed } : null, vis, w, h - bleed * 2, 0.04);
        };
        marks.forEach(place);

        // nothing on screen during the opening hold
        overlay.style.opacity = String(frozen ? 1 : smoothstep(0.4, 1.3, t));

        if (bloom) bloom.strength = 0.2 + scanVis * 0.18;
      };

      /* 45fps — same rate as the other two flagships. 1/46, see
         card-scene.tsx for why not 1/45. */
      const MIN_DT = 1 / 46;
      let last = -1;
      /* Prime one frame even off screen — see gate-vision/scene.tsx: the first
         draw is where shaders compile and textures upload, and deferring it to
         the onScreen gate put that cost on the frame the visitor arrives on. */
      /* Compile EVERY material's shader program now, not just the ones drawn in
         the primed frame above. Measured on a genuinely cold browser session
         (empty on-disk shader cache): priming one frame still left a 1355 ms
         long task landing mid-scroll, because these scenes swap materials as the
         loop advances — wireframe to resolved, decals appearing at a phase — and
         a program compiles the first time it is actually drawn, which can be
         half a loop in. compileAsync walks the whole graph, and uses
         KHR_parallel_shader_compile where available so it does not block. */
      /* AND THE PRIMED FRAME WAITS FOR IT. The first version fired compileAsync
         and primed on the very next animation frame, so the primed draw raced the
         async compile and just compiled synchronously whatever it needed — which
         is the blocking path compileAsync exists to avoid.

         Measured on this machine the race costs almost nothing: compileShader and
         linkProgram together total 2ms across four scenes, because ANGLE has
         KHR_parallel_shader_compile and the driver caches translated programs on
         disk. Kept anyway, because that number is a property of THIS GPU and
         driver, not of the code — shader compile is the classic cost that appears
         on a machine you did not test on.

         `compiled` gates drawing entirely, so the guard below matters: a promise
         that rejects or never settles must not leave a scene permanently blank. */
      let compiled = false;
      const markCompiled = () => { compiled = true; };
      renderer.compileAsync(scene, camera).then(markCompiled, markCompiled);
      const compileGuard = window.setTimeout(markCompiled, 2000);

      let primed = false;
      const loop = () => {
        raf = requestAnimationFrame(loop);
        // nothing is drawn until every program is linked — see markCompiled
        if (!compiled) return;
        if (!onScreen) {
          /* One warm draw off screen — texture upload and remaining first-use
             waits — then nothing until arrival. The clock deliberately does NOT
             start here: it starts on the first ON-SCREEN frame, so every
             visitor sees the intro from frame one. Priming used to start it,
             and by the time anyone scrolled here the opening was long gone. */
          if (!primed) { primed = true; applyFrame(); studio.render(); }
          return;
        }
        primed = true;
        if (!clockStarted) { clock.start(); clockStarted = true; }
        const now = clock.getElapsedTime();
        if (now - last < MIN_DT) return;
        last = now;
        applyFrame();
        studio.render();
      };
      raf = requestAnimationFrame(loop);

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.clearTimeout(compileGuard);
        ro.disconnect();
        visObs.disconnect();
        marks.forEach((a) => a.wrap.remove());
        mats.dispose();
        // metalBox geometry is cached and shared; these three are this scene's
        tank.owned.forEach((g) => g.dispose());
        tank.readCam.dispose();
        dm.all.forEach((m) => m.dispose());
        ground.material.dispose();
        studio.dispose();
      };
    } catch (err) {
      console.error("[tank-vision] init failed:", err);
      wrap.style.background = PALETTE.bgBottom;
    }

    return () => cleanup();
    }, "tank");
  }, []);

  return (
    <div
      ref={hostRef}
      style={{
        position: "relative", width: "100%", height: "100%",
        overflow: bare ? "visible" : "hidden",
        background: bare ? "transparent" : PALETTE.bgBottom,
      }}
    >
      {/* The CANVAS bleeds past the slot; the overlay does not. Bleeding the
          whole component moves the labels with it and they end up sitting on
          the section's own copy — the subject is what is supposed to escape
          the box, not the type. */}
      <div
        ref={canvasWrapRef}
        style={{ position: "absolute", left: 0, right: 0, top: -bleed, bottom: -bleed }}
      />
      {/* Leader lines and labels only — no readout table, no wordmark. */}
      <div ref={overlayRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0 }} />
    </div>
  );
}
