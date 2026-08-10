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
import { addGrain } from "../_vision/noise";
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

/* ---- THE HARDSTAND ------------------------------------------------------
   The grid alone said "drafting sheet", not "yard". A yard is a poured slab
   with bay joints and blotchy trowelling, and this is work-vision's concrete
   recipe brought over — same canvas, same values, its own repeat derived
   below because this scene's ground is not work's 160-unit slab.

   THE MAP CARRIES THE VALUE, THE TINT IS THE LIFT — work-vision's derivation,
   reproduced because the constants are only correct together:

     target #191D22 = (25,29,34) sRGB   -> linear (0.009729,0.012286,0.015993)
     tint   #8A8F96 = (138,143,150)     -> linear (0.254156,0.274618,0.304939)
     base   = target / tint             -> sRGB   (55,60,65) = #373C41

   So the flat part of the slab renders at #191D22. That is 4/6/9 steps ABOVE
   the asphalt (#15181D = 21,24,29), which is the ordering this card needs:
   the road must stay the darkest large area in the frame (scene.tsx's value
   note leans on exactly that), and the hardstand must still read as a
   surface rather than as more road.

   TILING, DERIVED FOR THIS SCENE.
     CONCRETE_TILE 2.4 world units per 512px canvas = 4.69mm a texel, the same
     texel density work-vision landed on, and 2.4m is a real slab bay.
     The framing shows SITE_W / 0.9 = 11.5 / 0.9 = 12.778 units of x
     (scene.tsx solves `rad` from SITE_W), so 12.778 / 2.4 = 5.32 bays across
     the shot — work's rule of "about six tiles across the SHOT, not across
     the slab", landed from this scene's own framing rather than copied.

   SIZE IS AN EXACT WHOLE NUMBER OF TILES, AND THAT IS LOAD-BEARING.
   CONCRETE_TILES 72 x CONCRETE_TILE 2.4 = 172.8, so `repeat` is 72.000 on
   both axes. The slab rides the camera like the road does, but unlike the
   road it HAS a feature (joints, patches), so it cannot simply slide. It
   snaps x to a whole multiple of CONCRETE_TILE instead — and because the
   repeat is an exact integer over the plane, a whole-tile slide maps the
   pattern onto itself to the texel. Same idea as the grid's whole-unit snap,
   one tile instead of one grid square.

   WHY 172.8 AND NOT SOMETHING SANE LIKE 74. The plane has no radial fade of
   its own; FOG is what has to swallow its edge, and scene.tsx sets
   fog.far = 3 x rad with rad solved per aspect: 9.34 desktop / 13.41 lab /
   17.88 mobile, so the deepest far plane the card ever runs is 53.6. A
   half-extent of 86.4 puts every edge of the slab well past that at every
   aspect, i.e. fogged to exactly #0A0B0E — the backdrop's own value — so the
   slab has no visible boundary anywhere. At 74 (the grid's size, half-extent
   37) the mobile framing would show the edge at ~70% fog as a faint horizon.
   The plane costs one draw call whatever size it is.

   NO WEAR BAND. Work-vision's slab has one because every act puts its walker
   on z = 0 and the band is sited on that. This camera pans forever past five
   walkers on five different z, so there is no walk line to darken and a band
   here would just be an arbitrary stripe. */
const CONCRETE_MAP_BASE = "#373C41";
const CONCRETE_TINT = "#8A8F96";
const CONCRETE_TILE = 2.4;
const CONCRETE_TILES = 72;
const CONCRETE_SIZE = CONCRETE_TILE * CONCRETE_TILES;   // 172.8

/* Seeded hash — Math.random is banned in scene content, and a slab that
   re-blotches on every load would also make any screenshot diff useless.
   Same generator work-vision uses. */
const h01 = (n: number) => {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
};

/* MODULE-CACHED AND NEVER DISPOSED, exactly like the skins in
   hero-cards/skins.ts. One 512-square canvas, one grain readback, eight
   radial-gradient fills and three 1px strokes — no Sobel pass, no normal map
   derivation. This is the only new texture the ground pass adds. */
let concreteCache: THREE.Texture | null = null;
function concreteMap(): THREE.Texture {
  if (concreteCache) return concreteCache;
  const S = 512;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  /* willReadFrequently: addGrain is a getImageData round trip, and without
     the hint it stalls behind the live scenes' frames. Same note as skins.ts. */
  const x = c.getContext("2d", { willReadFrequently: true })!;
  x.fillStyle = CONCRETE_MAP_BASE;
  x.fillRect(0, 0, S, S);
  addGrain(x, S, S, 14);

  /* Eight large, very soft darker patches — power-trowelled concrete is
     blotchy at the metre scale. Subtractive only, so the slab's area mean
     lands a hair UNDER #191D22 rather than over it. */
  for (let i = 0; i < 8; i++) {
    const px = h01(i * 3 + 1) * S;
    const py = h01(i * 3 + 2) * S;
    const pr = S * (0.16 + 0.14 * h01(i * 3 + 3));
    const g = x.createRadialGradient(px, py, 0, px, py, pr);
    g.addColorStop(0.0, "rgba(0,0,0,0.12)");
    g.addColorStop(1.0, "rgba(0,0,0,0)");
    x.fillStyle = g;
    x.fillRect(px - pr, py - pr, pr * 2, pr * 2);
  }

  /* Hairline expansion joints. TWO SIT ON THE TILE EDGE (u = 0, v = 0) so
     that under RepeatWrapping they become a continuous 2.4m saw-cut grid
     across the whole slab instead of three marks repeating inside every bay;
     the third at u = 0.5 halves the pitch on one axis, which is what a real
     pour looks like. Drawn at the half-pixel so a 1px line lands on one texel
     column rather than being anti-aliased across two. */
  x.strokeStyle = "rgba(14,17,20,0.5)";
  x.lineWidth = 1;
  for (const u of [0.5, S / 2 + 0.5]) {
    x.beginPath(); x.moveTo(u, 0); x.lineTo(u, S); x.stroke();
  }
  x.beginPath(); x.moveTo(0, 0.5); x.lineTo(S, 0.5); x.stroke();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(CONCRETE_TILES, CONCRETE_TILES);   // exactly 72 x 72, see above
  concreteCache = t;
  return t;
}

/* ---- YARD LANE MARKINGS -------------------------------------------------
   Safety yellow, the same #8F7A1E the house uses for painted safety steel —
   a hi-vis yellow authored at half value, because a real #F5D020 on a lit
   surface blows out and reads as an emissive strip rather than as paint.

   THEY DO NOT TILE, AND THAT IS THE STRONGER ANSWER. The brief allowed
   "one line per tile at an identical local position" or "line length =
   tile length x n". Neither is needed: a line running ALONG the treadmill
   axis is UNIFORM along that axis, so it has no feature for the eye to lock
   onto, and it can therefore ride camX continuously exactly as the road
   surface and the road's own edge lines already do (see `place`). Riding is
   EXACTLY seamless rather than seamless-to-within-a-wrap, and it costs one
   position write instead of a rounding per line per frame. The centre dashes
   are the counter-example in this same file: they are features, so they tile.

   LENGTH 120, for the fog reason the slab's size has: the deepest far plane
   the card runs is 3 x rad = 53.6 (mobile), and +-60 puts both ends past it,
   fully fogged to the backdrop value. A 40-unit line (the road's length)
   would end at +-20, i.e. at ~74% fog on mobile — a visible stub.

   WHERE. Clear of both kerbs (+-1.20 about ROAD_Z) and clear of the props:
     z = -1.75   apron side. Kerb -1.20, warehouse cartons' near face -1.84
                 (0.62 deep at APRON_Z -2.15). 0.55 clear of the kerb, 0.09
                 clear of the cartons.
     z = +1.75   verge side, where the walkers at z 1.5 / 1.9 patrol — a
                 marked walkway is exactly what should be under them. */
const LANE_PAINT = "#8F7A1E";
const LANE_LEN = 120;
const LANE_W = 0.09;
const LANE_Z = [-1.75, 1.75] as const;
/* 0.50, against the road paint's 0.42. #8F7A1E = (143,122,30) at 0.50 over
   the #191D22 slab lands at (84,75,32) — a yellow you can read as paint at
   card size, and still well under the #A6AEBA cargo at the top of the value
   range, so it marks the ground without becoming a graphic. */
const LANE_PEAK = 0.50;

/* Halved, per the pass that added the hardstand: 0.12 -> 0.06. The grid was
   carrying the whole floor when there was nothing else on it. Now the
   concrete is the surface and the grid is the measurement drawn over it, so
   it goes back to being a light annotation. This is the CALL SITE value
   (draftingGround's `uPeak`); `setGroundOpacity` writes the separate
   `uOpacity` ramp and must not be confused with it. */
const GRID_PEAK = 0.06;

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
    opacity: GRID_PEAK,
    glow: 2.2,
    majorBoost: 1.0,
    fadeStart: 0.28,
    fadeEnd: 0.90,
  });
  ground.mesh.renderOrder = -3;
  group.add(ground.mesh);

  /* ---- the hardstand ----
     BOTTOM OF THE STACK, at groundY - 0.030, under the grid at -0.020. The
     full ordering is now

       slab   groundY - 0.030   renderOrder -4
       grid   groundY - 0.020   renderOrder -3
       road   groundY - 0.006   renderOrder -2
       paint  groundY - 0.002   renderOrder -1   (road edges, dashes, lanes)
       shadow groundY                            (studio's catcher)

     and every one of them has depthWrite off, so renderOrder is the ONLY
     authority — see the long note on the road below, which is why the slab
     had to join that list rather than be dropped in anywhere convenient.

     THIS IS THE ONE THING IN THE SCENE THAT MUST NOT CAST. The card's `lite`
     rig has no shadow-casting light at all (scene.tsx records the finding),
     so `castShadow` is inert here today — but a 172.8-unit plane is exactly
     the object that would blow a shadow camera if one is ever switched on,
     so both flags are set off explicitly rather than left to the default. */
  const concreteMat = new THREE.MeshStandardMaterial({
    map: concreteMap(),
    color: CONCRETE_TINT,
    roughness: 0.95,
    metalness: 0.0,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    envMapIntensity: 0.10,
  });
  const concreteGeo = new THREE.PlaneGeometry(CONCRETE_SIZE, CONCRETE_SIZE);
  const concrete = new THREE.Mesh(concreteGeo, concreteMat);
  concrete.rotation.x = -Math.PI / 2;
  concrete.position.set(0, groundY - 0.030, ROAD_Z);
  concrete.renderOrder = -4;
  concrete.castShadow = false;
  concrete.receiveShadow = false;
  group.add(concrete);

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

  /* ---- yard lane markings ----
     Their own material, not `paintMat`: this is a different paint at a
     different strength (LANE_PEAK 0.50 against the road paint's 0.42), and
     sharing a material would mean sharing an opacity. Same class as the road
     paint otherwise — MeshBasicMaterial, unlit, FOG ON, because a marking is
     paint on a surface and must dim with the surface it is painted on. */
  const laneMat = new THREE.MeshBasicMaterial({
    color: LANE_PAINT, transparent: true, opacity: 0,
    depthWrite: false, toneMapped: false,
  });
  const laneGeo = new THREE.PlaneGeometry(LANE_LEN, LANE_W);
  const lanes: THREE.Mesh[] = [];
  for (const lz of LANE_Z) {
    const l = new THREE.Mesh(laneGeo, laneMat);
    l.rotation.x = -Math.PI / 2;
    l.position.set(0, groundY - 0.002, lz);
    l.renderOrder = -1;
    l.castShadow = false;
    group.add(l);
    lanes.push(l);
  }

  const place = (camX: number) => {
    /* The sheet snaps to whole grid squares; see the header. */
    ground.mesh.position.x = Math.round(camX);
    /* The slab snaps to whole BAYS. Its repeat is an exact integer over the
       plane (CONCRETE_TILES = 72), so a whole-tile slide maps the joint grid
       and the blotches onto themselves to the texel and the slab appears to
       stand still while it rides. Unlike the grid's snap there is no residual
       jitter IN THE PATTERN — the identity is exact — the only thing that
       lags by up to CONCRETE_TILE/2 = 1.2 units is the plane's own EDGE, and
       that sits 86 units out inside solid fog. */
    concrete.position.x = Math.round(camX / CONCRETE_TILE) * CONCRETE_TILE;
    /* The road and its edge lines are uniform along their length, so they
       simply ride along — there is no feature on them to give the slide away. */
    road.position.x = camX;
    for (const e of edges) e.position.x = camX;
    /* Lane markings ride for the same reason the edge lines do — uniform
       along the treadmill axis, so there is nothing on them to give the
       slide away. See the LANE_* note for why this beats tiling them. */
    for (const l of lanes) l.position.x = camX;
    /* The dashes ARE features, so they tile instead. */
    for (let i = 0; i < dashes.length; i++) {
      const b = dashBase[i];
      dashes[i].position.x = b + DASH_PITCH * Math.round((camX - b) / DASH_PITCH);
    }
  };

  const setOpacity = (solid: number) => {
    setGroundOpacity(ground, solid);
    /* Full strength. The slab IS the ground now — its value is authored into
       the map (#191D22 flat), so there is no peak factor to hold it back the
       way the paint and the grid have. */
    concreteMat.opacity = solid;
    roadMat.opacity = solid;
    laneMat.opacity = solid * LANE_PEAK;
    /* 0.42, not 1. Road paint at full strength on a card this size is a pair
       of bright rails that out-shout the truck driving between them; the spec
       for this band was "restrained — it is ground, not a graphic". */
    paintMat.opacity = solid * 0.42;
  };

  const dispose = () => {
    /* Every GEOMETRY and MATERIAL here is freshly allocated — no `metalBox`,
       no cached metal — so all of them are this object's to destroy.

       THE ONE EXCEPTION IS `concreteMap()`. That texture is module-cached and
       shared with every future mount of this card exactly as the skins in
       hero-cards/skins.ts are, so it is NEVER disposed. Disposing it here
       would hand the next mount a destroyed GPU texture. */
    ground.material.dispose();
    ground.mesh.geometry.dispose();
    concreteGeo.dispose();
    roadGeo.dispose();
    edgeGeo.dispose();
    dashGeo.dispose();
    laneGeo.dispose();
    concreteMat.dispose();
    roadMat.dispose();
    paintMat.dispose();
    laneMat.dispose();
  };

  return { ground, group, place, setOpacity, dispose };
}
