/* ---------------------------------------------------------------------------
   Home lead card — the GROUND and the ROAD.

   WHY THIS FILE EXISTS

   The card read as objects floating on a black table: a warehouse wall and a
   pallet on the left, a conveyor on the right, and nothing at all between
   them. Two dioramas sharing a frame. The root cause was that there was no
   floor — the truck's wheels sat on nothing and the camera poles ran down into
   black and simply stopped — and everything else followed from it. With no
   ground there is no surface for the halves to be ON, so there is nothing to
   connect them and no way for distance to read.

   So the fix is two objects, in this order of importance:

     1. THE GROUND — the house analog drafting sheet, `draftingGround()` from
        hero-cards/ground.ts, the same one yard-vision stands on. It gives the
        scene a measured surface and it is what stops the poles ending in
        nowhere.

     2. THE ROAD — a dark asphalt band along X, crossing the whole scene, with
        the site furniture flanking it. The section's headline is "one vision
        layer across the operation", and a road is the cheapest true statement
        of "one operation": the yard, the dock, the warehouse apron and the
        line are all things that sit beside the same road. It is geometry, not
        a texture — a plane, two edge strips and a row of centre dashes — so
        it costs four materials and stays restrained. It is ground, not a
        graphic.

   THE TREADMILL IS WHY BOTH OF THESE ARE CAMERA-FOLLOWING.

   The lead card's camera does not loop. It tracks right at PAN_SPEED forever
   and the site tiles underneath it (see scene.tsx, "THE TREADMILL"). So camX
   is UNBOUNDED — after two minutes it is past x = 120 — and any finite floor
   placed at the origin is left behind within half a minute. Both the sheet and
   the road therefore ride the camera:

     · The ROAD SURFACE and its EDGE LINES follow camX exactly. They are
       uniform along their length, so sliding them with the camera is
       invisible: there is no feature on them for the eye to lock onto and
       notice is not moving.

     · The CENTRE DASHES are features, so they cannot do that. They tile
       instead, by the same nearest-copy idiom the scene's scenery uses:
       x = base + PITCH * round((camX - base) / PITCH). Each dash teleports one
       pitch when it is half a pitch from the camera, which is deep off-frame.

     · The GRID is a feature too, but a periodic one, and the shader derives
       its lines from the mesh's LOCAL xy. So snapping the mesh's x to a whole
       multiple of the grid step makes the pattern land exactly on top of where
       it was: the sheet follows the camera while the lines appear to stand
       still on the ground. The snap is why `majorBoost` is 1 here and not
       yard-vision's 2.2 — a heavier every-fifth rule would force the snap to
       multiples of FIVE units, and a 2.5-unit jitter in the centre of the
       radial fade is a horizon that visibly breathes. At majorBoost 1 the
       fifth-line term collapses onto the ordinary line, the snap is to a
       single unit, and the residual jitter is +-0.5 of a grid square.

   INFINITE TO THE VIEWPORT, FINITE IN GEOMETRY. Same trick as yard-vision:
   the plane is far bigger than the visible ground and its radial fade does not
   begin until well outside the frame, so the floor is still going strong when
   it leaves the viewport and has died out long before its own edge. "Infinite"
   is a property of the framing, not of the mesh.
--------------------------------------------------------------------------- */
import * as THREE from "three";
import { PALETTE } from "../_vision/palette";
import { type Ground, draftingGround, setGroundOpacity } from "../hero-cards/ground";

/* ---- WHERE THE ROAD IS, AND HOW WIDE -------------------------------------

   Both numbers are derived from the truck, because the truck is the thing the
   road exists to carry.

   Z: the truck group is built on z = 0 — trailer, cab and chassis are all at
   z = 0, and the wheel pairs sit at z = +-0.55. So the road's centre line is
   z = 0. Nothing was moved to make this true; the road was placed where the
   traffic already was.

   WIDTH: the truck's actual envelope is the WHEELS, not the body. Wheels are
   at z = +-0.55 with a 0.22 track width, so the vehicle occupies
   z = -0.66 .. +0.66 = 1.32 units. 2.4 is 1.82x that, which puts 0.54 of
   shoulder either side of the wheels — enough that the truck reads as driving
   ON a road rather than straddling a ribbon, and narrow enough that the
   flanking furniture is not swallowed:

     conveyor belt   z = -1.60, depth 0.90  ->  near edge -1.15
     road edge                              ->            -1.20

   0.05 of clearance. That is deliberate and it is the tightest thing here: the
   line runs right up against the road, which is what makes the factory read as
   being ON the site rather than in its own diorama. If the belt ever moves,
   check this number. The warehouse pallet stack was moved from z = -0.90 to
   z = -2.15 for the same reason — at -0.90 it was standing in the road. */
export const ROAD_Z = 0;
export const ROAD_W = 2.4;

/* Long enough to leave frame at any aspect the card is given. The road runs
   ALONG X, so it exits at the left and right frame edges rather than receding
   to a horizon — the framing shows ~12.8 units of x (see SITE_W in scene.tsx),
   so +-20 is over three times what is ever in shot, and the camera's 0.29 rad
   azimuth is nowhere near enough to look down it. */
const ROAD_LEN = 40;

/* Dash pitch and count. 11 dashes at 4.2 covers +-21, i.e. the whole road. */
const DASH_PITCH = 4.2;
const DASH_N = 11;
const DASH_LEN = 1.5;

/* ---- the surface values --------------------------------------------------
   Asphalt is the one genuinely dark surface in the scene and it has to stay
   that way: it is what the mid-tones are measured against now that pure black
   is no longer doing that job. #15181D is two steps above the page canvas
   (#0A0B0E) — present, but reading as ground rather than as a painted panel.

   The markings are `MeshBasicMaterial`, unlit, and they KEEP FOG ON. That is
   the opposite of the rule for detection graphics: a road marking is paint on
   a surface, it belongs to the world, and it must dim with the road it is
   painted on or it will float above it at the far ends. */
const ROAD_TOP = "#15181D";
const ROAD_PAINT = "#7E8794";

export interface Roadway {
  ground: Ground;
  /** Everything under one parent so the scene adds and removes one object. */
  group: THREE.Group;
  /** Ride the camera. Call once per frame, BEFORE anything reads world space. */
  place: (camX: number) => void;
  /** Ramp with the scene's intro fade. */
  setOpacity: (solid: number) => void;
  dispose: () => void;
}

export function buildRoadway(groundY: number): Roadway {
  const group = new THREE.Group();

  /* ---- the drafting sheet ----
     Parameters taken from yard-vision/scene.tsx (size 420, opacity 0.11,
     glow 2.2, majorBoost 2.2, fade 0.86 -> 1.0) and adjusted in exactly two
     places, both forced by this scene rather than by taste:

       SIZE 420 -> 74. Yard-vision's plane is static and its camera never
       leaves the origin, so it can afford a sheet that is absurdly larger than
       the frame. This one moves every frame and its fade has to sit at a
       sensible distance from the camera to act as the near half of the depth
       cue, alongside the fog. Half-size 37; the fade runs 0.28 -> 0.90, i.e.
       from 10.4 units out to 33.3. The visible ground never reaches 33 at any
       aspect this card is given, so the sheet is always still going as it
       leaves the frame.

       majorBoost 2.2 -> 1.0, for the snap reason in the header comment.

     Opacity is nudged 0.11 -> 0.12: yard-vision holds its sheet down because
     it has a second, brighter slot grid competing on the same floor. There is
     no competing grid here, only the road, and the road is dark. */
  const ground = draftingGround({
    size: 74,
    y: groundY - 0.020,
    step: 1,
    color: PALETTE.grid,
    opacity: 0.12,
    glow: 2.2,
    majorBoost: 1.0,
    fadeStart: 0.28,
    fadeEnd: 0.90,
  });
  ground.mesh.renderOrder = -3;
  group.add(ground.mesh);

  /* ---- the road surface ----
     Sits 6mm BELOW the studio's shadow catcher, which lives exactly at
     `groundY`. That ordering is load-bearing: the catcher is the only thing
     giving the truck a contact shadow, and a road drawn above it would hide
     every shadow in the scene. The stack from the bottom up is

       grid   groundY - 0.020   renderOrder -3
       road   groundY - 0.006   renderOrder -2
       paint  groundY - 0.002   renderOrder -1
       shadow groundY            (studio's catcher, default order)

     and every one of them is `depthWrite: false`, so the order above is the
     ONLY thing deciding what covers what. Sorting a stack of coincident
     transparent planes by camera distance is exactly the situation the painter
     sorter gets wrong, and on a camera that pans forever the answer would
     change as it went. */
  const roadMat = new THREE.MeshStandardMaterial({
    color: ROAD_TOP, roughness: 0.94, metalness: 0.0,
    transparent: true, opacity: 0, depthWrite: false, envMapIntensity: 0.1,
  });
  const roadGeo = new THREE.PlaneGeometry(ROAD_LEN, ROAD_W);
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, groundY - 0.006, ROAD_Z);
  road.renderOrder = -2;
  group.add(road);

  /* ---- edge lines and centre dashes ----
     One material for all of them, at one opacity, because they are the same
     paint. The dashes read lighter than the edges anyway: they are shorter, so
     less of the eye's attention lands on each one. */
  const paintMat = new THREE.MeshBasicMaterial({
    color: ROAD_PAINT, transparent: true, opacity: 0,
    depthWrite: false, toneMapped: false,
  });

  /* Inset 0.10 from the kerb so the stripe sits ON the asphalt with a margin,
     the way a real edge line does, instead of reading as the road's own edge. */
  const edgeGeo = new THREE.PlaneGeometry(ROAD_LEN, 0.05);
  const edges: THREE.Mesh[] = [];
  for (const sz of [-1, 1]) {
    const e = new THREE.Mesh(edgeGeo, paintMat);
    e.rotation.x = -Math.PI / 2;
    e.position.set(0, groundY - 0.002, ROAD_Z + sz * (ROAD_W / 2 - 0.10));
    e.renderOrder = -1;
    group.add(e);
    edges.push(e);
  }

  const dashGeo = new THREE.PlaneGeometry(DASH_LEN, 0.07);
  const dashes: THREE.Mesh[] = [];
  for (let i = 0; i < DASH_N; i++) {
    const d = new THREE.Mesh(dashGeo, paintMat);
    d.rotation.x = -Math.PI / 2;
    d.position.set(i * DASH_PITCH, groundY - 0.002, ROAD_Z);
    d.renderOrder = -1;
    group.add(d);
    dashes.push(d);
  }
  const dashBase = dashes.map((_, i) => i * DASH_PITCH);

  const place = (camX: number) => {
    /* The sheet snaps to whole grid squares; see the header. */
    ground.mesh.position.x = Math.round(camX);
    /* The road and its edge lines are uniform along their length, so they
       simply ride along — there is no feature on them to give the slide away. */
    road.position.x = camX;
    for (const e of edges) e.position.x = camX;
    /* The dashes ARE features, so they tile instead. */
    for (let i = 0; i < dashes.length; i++) {
      const b = dashBase[i];
      dashes[i].position.x = b + DASH_PITCH * Math.round((camX - b) / DASH_PITCH);
    }
  };

  const setOpacity = (solid: number) => {
    setGroundOpacity(ground, solid);
    roadMat.opacity = solid;
    /* 0.42, not 1. Road paint at full strength on a card this size is a pair
       of bright rails that out-shout the truck driving between them; the spec
       for this band was "restrained — it is ground, not a graphic". */
    paintMat.opacity = solid * 0.42;
  };

  const dispose = () => {
    /* Everything here is freshly allocated — no `metalBox`, no cached metal —
       so every geometry and every material is this object's to destroy. */
    ground.material.dispose();
    ground.mesh.geometry.dispose();
    roadGeo.dispose();
    edgeGeo.dispose();
    dashGeo.dispose();
    roadMat.dispose();
    paintMat.dispose();
  };

  return { ground, group, place, setOpacity, dispose };
}
