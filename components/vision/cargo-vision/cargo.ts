/* ---------------------------------------------------------------------------
   Cargo Vision — the subject: a container being DESTUFFED.

   The claim is "Every case counted, with video proof attached." So the scene
   has to show three things at once and never let any of them stop the others:

     · MIXED cargo. A count that only works on identical cubes is worthless, so
       the stream carries three visibly different silhouettes — a squared kraft
       carton, a slumped gunny bag, an upright ribbed drum. Silhouette is the
       whole differentiator here; if you can tell them apart at a glance the
       claim is credible, and if you cannot, nothing else in the scene matters.
     · A CONTINUOUS STREAM. A destuff line runs at constant speed. Every item
       advances linearly, and the count keeps climbing through the loop wrap.
     · DAMAGE CAUGHT IN THE SAME PASS. One carton is flagged mid-stream and the
       count does not pause for it — that is the actual product claim, and a
       stream that hesitates for the bad box says the opposite.

   THE CONTAINER IS THE SAME BOX CONTAINER VISION AND GATE VISION USE. It is
   imported from ../container-vision, not re-modelled, for exactly the reason
   gate.ts states: three scenes that claim to be about one facility have to show
   one facility. Here it is turned so its DOOR END faces the camera-ish and
   offset to frame-left, and the cargo emerges from that opening.

   Coordinates: the run-out runs along world +X at z = 0, ground at GROUND.
--------------------------------------------------------------------------- */
import * as THREE from "three";
import { buildContainer, H as C_H, L as C_L } from "../container-vision/container";
import type { MaterialSet } from "../container-vision/materials";
import { CANONICAL_BRUSHED, makeMetal, metalBox, tintMetal } from "../_vision/metal";
import { PALETTE } from "../_vision/palette";
import { cardboardSide } from "../hero-cards/skins";

/* Ground plane. Everything — container floor, run-out, cargo — sits on it, and
   the studio's cast-shadow catcher is placed here. */
export const GROUND = -0.55;

/* ---- the container's pose --------------------------------------------------

   YAW IS -0.30 rad, NOT MORE, AND THAT IS A COMPROMISE WORTH NAMING.

   The door end is the container's local +X face. Rotating about Y by a NEGATIVE
   angle swings +X toward +Z, i.e. toward a camera standing at +Z — so a yaw of
   -0.30 (17.2 degrees) turns the opening to face the lens. Turning it further
   would show more of the aperture, and it would also swing the container's long
   axis away from the run-out, so cargo travelling along world +X would no longer
   emerge through the middle of the hole it is supposed to come out of.

   At -0.30 the numbers work out: the door plane sits at container-local x =
   +3.029, and the track's local coordinates along its run are

       local x = 0.955 * worldX + 5.334        (so the mouth is at worldX -2.41)
       local z = 0.2955 * worldX + 1.023       (0.23 .. 0.31 across the run)

   |local z| stays under 0.32 against a half-width of 1.219, so an item is
   comfortably inside the aperture the whole way through it. Any larger yaw and
   the track starts clipping the door frame. */
export const CONT_POS = new THREE.Vector3(-5.4, GROUND + C_H / 2, -0.6);
/* -0.10, NOT -0.30. The original reasoning — swing the opening toward the lens
   so the aperture is visible — was right about the aperture and wrong about the
   container. At -0.30 the box presents its END to a camera sitting at az 0.42,
   the corrugated long side compresses to almost nothing, and the whole thing
   reads as a flat dark rectangle rather than as a shipping container. The
   coherence argument for reusing Container Vision's exact box is lost the moment
   you cannot tell it IS one.

   At -0.10 the long side opens back up into a three-quarter view — corrugation,
   length and markings all legible — and the aperture is still turned enough to
   read as a hole rather than a painted panel. The clearance arithmetic improves
   rather than degrades: local z along the track runs 0.6 +/- 0.1 against a
   half-width of 1.219, comfortably inside the opening the whole way through. */
export const CONT_YAW = -0.10;

/* ---- the stream ------------------------------------------------------------
   Nine items, evenly spaced, wrapping. Straight out of hero-cards/subjects.ts's
   factory belt: `travel = p * SPAN` and `while (x > SPAN/2) x -= SPAN`, which
   makes every item's position a pure function of p and the loop periodic by
   construction — nothing accumulates, so nothing can drift or pop.

   SPAN = N * PITCH is what makes the wrap invisible AND regular: the wrap lands
   an item exactly where its upstream neighbour was, so the stream never gains or
   loses a gap. x therefore runs over [-6.075, +6.075], and -6.075 is deep INSIDE
   the container (local x = -0.47 of a half-length 3.029), so an item is reborn
   in the dark and walks out of the door. The wrap is never seen. */
export const ITEM_N = 9;
export const PITCH = 1.35;
export const SPAN = ITEM_N * PITCH;   // 12.15

/* THE THRESHOLD. The count ticks as an item crosses x = 0.

   Item i sits at x = -SPAN/2 + i*PITCH + p*SPAN, so it crosses 0 at
       p_cross(i) = (SPAN/2 - i*PITCH) / SPAN = 0.5 - i/9   (mod 1)
   which is nine crossings per loop, evenly spaced 1/9 apart, the first at
   p = 1/18. scene.tsx derives the displayed number straight from that. */
export const THRESHOLD_X = 0;

export type ItemType = "carton" | "gunny" | "drum";

/* The mix, in order. Deliberately not alternating on a period of 2 or 3 — a
   regular alternation reads as a pattern and the eye stops counting objects and
   starts counting the pattern, which is precisely the failure mode a mixed
   destuff is supposed to argue against. */
export const SEQUENCE: ItemType[] = [
  "carton", "carton", "gunny", "drum", "carton", "gunny", "drum", "carton", "gunny",
];

/* THE FLAGGED ITEM IS INDEX 0, AND THE SPEC SAID INDEX 5. Two reasons it could
   not be 5, both checkable against the arithmetic above:

     · index 5 is a GUNNY BAG in the sequence above, and the damage beat is
       specified as a carton. It is also specified as the one item carved OUT of
       the InstancedMesh so a tracker can read its world bounding box — and only
       cartons are instanced, so the carve-out is meaningless on a bag.
     · index 5 is off screen for the whole damage window. x_5(0.55) = 7.36,
       which wraps to -4.79 — inside the container. The bracket would be drawn
       around a box nobody can see.

   Index 0 is a carton, and its timing is the best of the four cartons:
       crosses the threshold at p = 0.500
       x = 0.61 at p = 0.55   and   x = 3.03 at p = 0.75   (damage window)
       x = 2.67 .. 5.10 across p 0.72 .. 0.92               (proof window)
       wraps at exactly p = 1.0, i.e. at the loop seam, off the right of frame.
   So the whole damage-and-proof story plays out on one item, in clear air, and
   ends on the wrap. */
export const FLAGGED = 0;

/* Item dimensions. All three sit BETWEEN the near-black canvas and the accent in
   value — the standing rule for cargo across every scene here. */
const CARTON = { w: 0.90, h: 0.70, d: 0.70 };
const BAG = { sx: 0.55, sy: 0.38, sz: 0.45 };
const DRUM = { r: 0.32, h: 0.82 };

/* ---- staged cargo: stock already unloaded, waiting at the dock -----------

   Container Vision reads as full because there is nothing to compare it to
   but itself. Cargo Vision sits nine drifting items over an empty deck, and
   an empty deck around a moving subject reads as "sparse" even when the
   count is honest — a working destuff bay has product accumulating at the
   dock, not just the one line crossing the threshold.

   THESE ARE STATIC AND NEVER TOUCH `advance` OR THE COUNTER. That is the
   whole safety property: they are not part of the stream (they carry no
   `p`-dependent position), so extending them can never shift a crossing
   time, desync a tag window, or move the flagged carton's timing math.

   The grid follows the stream's own PITCH rather than an invented spacing,
   so it reads as the same system staged rather than a hand-scattered prop —
   0.72 of a pitch is close enough to butt the boxes together without them
   z-fighting at their shared edges.

   TWO PILES, ONE EACH SIDE OF THE LANE, so the run-out stays legible (the
   counted stream needs clear air) and the scene gets real foreground and
   background layers instead of one frontal band: the near pile sits past
   the lane on the camera side, the far pile tucks in beside the container,
   and the moving stream reads as the midground between them. */
const STAGE_PITCH = PITCH * 0.72;
type StageSpot = { type: ItemType; x: number; z: number };
const STAGE: StageSpot[] = (() => {
  const spots: StageSpot[] = [];
  // far pile: beside the container, background — 3 wide, 2 deep
  const far: ItemType[] = ["carton", "drum", "carton", "gunny", "carton", "drum"];
  far.forEach((type, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    spots.push({ type, x: -1.35 + col * STAGE_PITCH, z: -1.85 - row * STAGE_PITCH });
  });
  // near pile: past the lane on the camera side, foreground — 2 wide, 2 deep
  const near: ItemType[] = ["drum", "carton", "gunny", "carton"];
  near.forEach((type, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    spots.push({ type, x: 3.35 + col * STAGE_PITCH, z: 1.55 + row * STAGE_PITCH });
  });
  return spots;
})();

/* ---- texture cache + idle warm --------------------------------------------
   Same contract as yard.ts and gate-vision/materials.ts: a module-level cache
   only helps the SECOND consumer, and on a page with one instance of this scene
   the first consumer is the visitor. `warmCargoTextures()` is called from
   _vision/lazy.tsx's loader so the build that runs on the scroll path gets hits.

   NOTHING HERE PAINTS ITS OWN CANVAS. The kraft board comes from the shared
   hero-cards cache and the drum finish is the CANONICAL brushed spec, which
   metal.ts has already generated during the idle warm. That is deliberate: a
   non-canonical makeMetal spec would miss metal.ts's cache and pay a full
   albedo + roughness + Sobel derivation on the visitor's scroll path. */
let boardCache: THREE.Texture | null = null;
function cargoTextures() {
  if (!boardCache) boardCache = cardboardSide();
  return boardCache;
}
export function warmCargoTextures() {
  cargoTextures();
  // the metal MAPS are cached inside metal.ts; the material is throwaway
  makeMetal({ ...CANONICAL_BRUSHED }).dispose();
}

export interface CargoMaterials {
  carton: THREE.MeshStandardMaterial;
  bag: THREE.MeshStandardMaterial;
  drum: THREE.MeshStandardMaterial;
  rib: THREE.MeshStandardMaterial;
  /** the open door end — a hole, not a surface */
  voidM: THREE.MeshBasicMaterial;
  lane: THREE.LineBasicMaterial;
  threshold: THREE.MeshBasicMaterial;
  all: THREE.Material[];
  dispose: () => void;
}

export function buildCargoMaterials(): CargoMaterials {
  const board = cargoTextures();
  const all: THREE.Material[] = [];
  const keep = <T extends THREE.Material>(m: T) => { all.push(m); return m; };

  /* THE CARTON GETS ONE MATERIAL, NOT A SIX-FACE ARRAY, and that is forced by
     the geometry rather than chosen. metalBox returns a RoundedBoxGeometry,
     which has a SINGLE material group — a six-material face array simply would
     not bind to it (see the note in hero-cards/subjects.ts). So the kraft SIDE
     map goes on every face and `cardboardTop` is not used here; the top map's
     tape run would be visible on a carton this size, but not at the cost of
     square corners, which are the strongest "this is a toy" cue there is. */
  /* `color` MULTIPLIES the kraft map, and leaving it at the default white means
     the map renders at full strength — which on a dark section put the cartons
     brighter than the accent counter they are supposed to sit behind. #7E6F52
     knocks the board down to the value band cargo belongs in without touching
     the map, which is shared and cached and must not be regenerated per tint. */
  const carton = keep(new THREE.MeshStandardMaterial({
    map: board, color: "#7E6F52", metalness: 0, roughness: 0.94,
    envMapIntensity: 0.18, transparent: true, opacity: 0,
  }));

  /* THE SACK. No map, no metalness, roughness at the ceiling: a gunny bag is
     woven jute and the one thing it must not do is catch a specular highlight,
     because a highlight implies a hard surface and the whole job of this item is
     to read as SOFT against the carton's squared edges. Neutral warm-grey sits
     it between the drum's cool steel and the carton's kraft, so the three items
     separate on hue as well as on shape. */
  /* #3A3529, NOT the #6E6A5E a first pass used. That value was chosen as a hex
     and it rendered NEAR-WHITE — the sacks were the brightest objects in frame,
     which breaks the rule that cargo sits BETWEEN the near-black canvas and the
     accent in value and never out-brights the overlay.

     THIS IS THE SAME TRAP YARD VISION DOCUMENTED AND IT CAUGHT US AGAIN. A hex
     reads as its own value only under flat light. Under the full five-source
     area rig, with ACES tone mapping on top, a matte diffuse surface lands far
     brighter than its albedo suggests — and a roughness of 1.0 with no map makes
     it worse, because every one of those sources contributes diffuse with
     nothing breaking it up. Author these roughly HALF the value you want on
     screen and check the render, never the swatch.

     AND THE SACK NEEDS TO GO FURTHER DOWN THAN THE OTHERS — #1F1C16 against the
     carton'''s #7E6F52 — which looks wrong as a pair of swatches and is right on
     screen. The carton carries the kraft MAP, whose baked grain and creases are
     dark for a good fraction of its area, so the eye averages it well below its
     tint. The sack is unmapped, so every texel returns the full diffuse response
     and a curved unmapped surface catches light across its whole silhouette.
     Two objects at the same authored value do not read at the same brightness
     when one is mapped and one is not; the map is worth roughly a stop. */
  const bag = keep(new THREE.MeshStandardMaterial({
    color: "#1F1C16", metalness: 0, roughness: 1.0, envMapIntensity: 0.06,
    transparent: true, opacity: 0,
  }));

  /* THE DRUM. Canonical brushed finish, tinted — the recipe metal.ts warms
     during idle, so this is a cache hit and costs one material clone. Tinting a
     NEUTRAL-based metal is the documented safe case (see tintMetal); the maps
     are shared, only the clone is per-scene and disposed. */
  const brushed = makeMetal({ ...CANONICAL_BRUSHED });
  /* Tints pulled down a step for the same reason as the bag and the carton —
     these sat in the light-steel band and read as the brightest metal on a page
     whose accent is a pale blue. */
  const drum = keep(tintMetal(brushed.material, "#4E5862", { metalness: 0.6 }));
  const rib = keep(tintMetal(brushed.material, "#39414A", { metalness: 0.7 }));
  drum.transparent = true; drum.opacity = 0;
  rib.transparent = true; rib.opacity = 0;
  brushed.dispose();   // the maps live in metal.ts's cache; this material does not

  /* THE OPEN DOOR END. buildContainer models a CLOSED door end — a flat steel
     plane with locking rods, cams and a lock box on it. This scene needs a hole,
     so the door plane is re-materialled to a near-black unlit surface and the
     door furniture is hidden (see buildCargo).

     toneMapped:false, and not for the usual signal-graphic reason: this is
     standing in for the ABSENCE of light rather than for a lit surface, and
     letting ACES lift it would give the opening a grey cast — which reads as a
     painted panel, exactly what it must not be. It also has to stay darker than
     the site canvas behind the frame, or the hole reads as a light box.

     `transparent` is set here at construction and only its OPACITY is ever
     ramped. Flipping `transparent` at runtime changes three's program cache key
     and forces a synchronous recompile mid-draw — the seal bug documented at
     length in container-vision/scene.tsx. */
  const voidM = keep(new THREE.MeshBasicMaterial({
    color: "#05070A", transparent: true, opacity: 0, toneMapped: false,
  }));

  /* Run-out markings. Drafting INK, so toneMapped:false — house rule, see
     yard-vision/yard.ts: ACES desaturates a flat graphics colour into mud. */
  const lane = keep(new THREE.LineBasicMaterial({
    color: "#C9D4DE", transparent: true, opacity: 0, toneMapped: false,
  }));
  /* The count line itself. Accent, because it is the machine OBSERVING — the
     page's colour grammar, and the only blue graphic in the scene. */
  const threshold = keep(new THREE.MeshBasicMaterial({
    color: PALETTE.accent, transparent: true, opacity: 0,
    toneMapped: false, depthWrite: false,
  }));

  return {
    carton, bag, drum, rib, voidM, lane, threshold, all,
    /* MATERIALS ONLY. The kraft board is cached in hero-cards/skins and the
       metal maps in metal.ts — disposing either here would leave the next scene
       sampling a destroyed texture. Same hazard, same reasoning, as yard.ts. */
    dispose: () => { all.forEach((m) => m.dispose()); },
  };
}

export interface CargoItem {
  /** transform carrier. Instanced cartons are not drawn from this node — their
      matrix is copied into the InstancedMesh — but every item has one so the
      overlay can project a world position for any of the nine. */
  grp: THREE.Group;
  type: ItemType;
}

export interface CargoModel {
  root: THREE.Group;
  items: CargoItem[];
  /** the flagged carton — an ordinary Mesh so a tracker can read its world box */
  flagged: THREE.Mesh;
  /** the container's shell + hardware, so the scene can ramp their opacity */
  container: { shell: THREE.Mesh[]; hardware: THREE.Mesh[]; edges: THREE.LineSegments };
  /** world-space centre of the door opening — the anchor the stream comes from */
  mouth: THREE.Vector3;
  /** Advance the stream. `p` is 0..1 through the loop. Pure function of p. */
  advance: (p: number) => void;
  /** geometry this scene OWNS and must dispose. The carton's RoundedBoxGeometry
      is NOT here: metal.ts caches it and the next scene reuses it. */
  owned: THREE.BufferGeometry[];
}

/** Deterministic per-item yaw wobble. A hand-stuffed container never comes out
    square, and `Math.random()` would reshuffle the scene on every page load. */
const wobble = (i: number) => ((i * 37) % 11 - 5) * 0.012;

export function buildCargo(m: CargoMaterials, cmats: MaterialSet): CargoModel {
  const root = new THREE.Group();
  const owned: THREE.BufferGeometry[] = [];

  /* ---- the container ---------------------------------------------------- */
  const build = buildContainer(cmats.steel, cmats.dark, cmats.front.material);
  build.group.position.copy(CONT_POS);
  build.group.rotation.y = CONT_YAW;
  root.add(build.group);

  /* Open the doors.

     The door-end PANEL is the one shell mesh sitting at local x = +L/2; every
     other shell panel is at a smaller x. Identified by position rather than by
     index into `shell`, because an index into another module's array is exactly
     the kind of coupling that breaks silently when that module gains a panel. */
  const hx = C_L / 2;
  for (const s of build.shell) {
    if (Math.abs(s.position.x - hx) < 0.01) {
      s.material = m.voidM;
      s.castShadow = false;    // a hole does not cast one
      s.receiveShadow = false;
    }
  }
  /* And hide the door FURNITURE — locking rods, handle cams, hinge pins, lock
     box. Same positional test: all of it is mounted PROUD of the door plane at
     x = hx + 0.02..0.04, while the corner castings and forklift pockets sit at
     x <= hx - 0.05. So `position.x > hx` selects exactly the parts that say
     "this door is shut" and nothing else. */
  for (const hw of build.hardware) hw.visible = hw.position.x <= hx;

  /* The mouth, in world space. Local (hx, 0, 0) through the yaw. */
  const mouth = new THREE.Vector3(hx, 0, 0)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), CONT_YAW)
    .add(CONT_POS);

  /* ---- the run-out ------------------------------------------------------
     Two lane edges and the count line. Not scenery: the run-out is what makes a
     stream of floating objects read as cargo coming off a deck, and the count
     line is the thing the counter in the overlay is counting against — without
     it drawn, the number increments for no visible reason. */
  const LANE_Y = GROUND + 0.008;
  const laneGeo = new THREE.BufferGeometry();
  laneGeo.setAttribute("position", new THREE.Float32BufferAttribute([
    -2.9, LANE_Y, -1.10, 6.6, LANE_Y, -1.10,
    -2.9, LANE_Y, 1.10, 6.6, LANE_Y, 1.10,
  ], 3));
  owned.push(laneGeo);
  root.add(new THREE.LineSegments(laneGeo, m.lane));

  const thrGeo = new THREE.PlaneGeometry(0.06, 2.20);
  owned.push(thrGeo);
  const threshold = new THREE.Mesh(thrGeo, m.threshold);
  threshold.rotation.x = -Math.PI / 2;
  threshold.position.set(THRESHOLD_X, GROUND + 0.014, 0);
  root.add(threshold);

  /* ---- item geometry ----------------------------------------------------- */

  /* CARTON. metalBox is the only route to metal.ts's cached RoundedBoxGeometry,
     so a throwaway Mesh is built purely to lift the geometry off it. That
     geometry is SHARED and cached — it is deliberately not in `owned`. */
  const cartonGeo = metalBox(CARTON.w, CARTON.h, CARTON.d, m.carton).geometry;

  /* GUNNY BAG — a sphere, slumped. A plain scaled sphere is an egg; a sack that
     has been thrown down has a flattened base it is resting on and a bulge just
     above it where the contents have settled. Both are one pass over the
     vertices, and together they are the difference between "soft" and "round".

       base:  y below -0.72 is compressed toward -0.72 at a quarter rate, so the
              bottom cap flattens without the silhouette developing a crease.
              min y ends at -0.79, i.e. -0.300 after the 0.38 y-scale.
       bulge: x and z widen by up to 14% in the lower half.

     computeVertexNormals() afterwards or the shading still describes a sphere. */
  const bagGeo = new THREE.SphereGeometry(1, 18, 12);
  {
    const pos = bagGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const ny = y < -0.72 ? -0.72 + (y + 0.72) * 0.25 : y;
      const spread = 1 + 0.14 * Math.max(0, -ny);
      pos.setXYZ(i, x * spread, ny, z * spread);
    }
    bagGeo.computeVertexNormals();
  }
  owned.push(bagGeo);
  const BAG_BOTTOM = 0.79 * BAG.sy;   // 0.300 — how far the sack sits below its origin

  /* DRUM — upright cylinder plus two rolling ribs. The ribs are what stop a
     cylinder reading as a bollard: a 205-litre drum is identified by its hoops
     long before its proportions register. */
  const drumGeo = new THREE.CylinderGeometry(DRUM.r, DRUM.r, DRUM.h, 24);
  owned.push(drumGeo);
  const ribGeo = new THREE.TorusGeometry(DRUM.r + 0.005, 0.022, 6, 24);
  owned.push(ribGeo);

  /* ---- the stream -------------------------------------------------------- */

  /* CARTONS ARE INSTANCED, exactly as yard.ts instances its containers: one
     shared geometry, one draw call, matrices written per frame.

     WITH ONE CARVE-OUT — the flagged carton is an ordinary Mesh. yard.ts makes
     the same exception for the same reason: a tracker bracket derives its size
     and position from `Box3.setFromObject(target)`, and an INSTANCE is not an
     Object3D, so it has no world bounding box to read. One exception, not four.

     Three cartons are instanced (indices 1, 4, 7); index 0 is the flagged Mesh.
     Small counts, but the idiom is the point — and this scene's instance
     matrices change every frame, so DynamicDrawUsage, unlike the yard's static
     one. */
  const instanced: number[] = [];
  for (let i = 0; i < ITEM_N; i++) if (SEQUENCE[i] === "carton" && i !== FLAGGED) instanced.push(i);

  const cartonMesh = new THREE.InstancedMesh(cartonGeo, m.carton, instanced.length);
  cartonMesh.castShadow = true;
  cartonMesh.receiveShadow = true;
  cartonMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  root.add(cartonMesh);

  const items: CargoItem[] = [];
  let flagged: THREE.Mesh | null = null;

  for (let i = 0; i < ITEM_N; i++) {
    const type = SEQUENCE[i];
    const grp = new THREE.Group();
    grp.rotation.y = wobble(i);

    if (type === "carton") {
      grp.position.y = GROUND + CARTON.h / 2;
      if (i === FLAGGED) {
        const mesh = new THREE.Mesh(cartonGeo, m.carton);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        grp.add(mesh);
        flagged = mesh;
      }
      /* Instanced cartons add NOTHING to their group. The group is still added
         to the root so its world matrix is maintained by the normal update —
         `advance` copies that matrix into the InstancedMesh, and the overlay
         projects tags off the same node. An empty Group costs a matrix. */
    } else if (type === "gunny") {
      grp.position.y = GROUND + BAG_BOTTOM;
      const mesh = new THREE.Mesh(bagGeo, m.bag);
      mesh.scale.set(BAG.sx, BAG.sy, BAG.sz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      grp.add(mesh);
    } else {
      grp.position.y = GROUND + DRUM.h / 2;
      const body = new THREE.Mesh(drumGeo, m.drum);
      body.castShadow = true;
      body.receiveShadow = true;
      grp.add(body);
      for (const ry of [-0.22, 0.22]) {
        const hoop = new THREE.Mesh(ribGeo, m.rib);
        hoop.rotation.x = -Math.PI / 2;
        hoop.position.y = ry;
        grp.add(hoop);
      }
    }

    root.add(grp);
    items.push({ grp, type });
  }

  if (!flagged) throw new Error("[cargo-vision] FLAGGED index is not a carton");

  /* ---- staged cargo -------------------------------------------------------
     Same construction as the stream loop above, minus the group-per-item
     indirection: nothing here is ever repositioned, so there is no `advance`
     to feed and no need for a transform carrier. Wobble uses `i + ITEM_N` so
     the staged pile's angles never repeat the stream's own sequence. */
  for (let i = 0; i < STAGE.length; i++) {
    const s = STAGE[i];
    const yaw = wobble(i + ITEM_N);
    if (s.type === "carton") {
      const mesh = new THREE.Mesh(cartonGeo, m.carton);
      mesh.position.set(s.x, GROUND + CARTON.h / 2, s.z);
      mesh.rotation.y = yaw;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      root.add(mesh);
    } else if (s.type === "gunny") {
      const mesh = new THREE.Mesh(bagGeo, m.bag);
      mesh.position.set(s.x, GROUND + BAG_BOTTOM, s.z);
      mesh.rotation.y = yaw;
      mesh.scale.set(BAG.sx, BAG.sy, BAG.sz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      root.add(mesh);
    } else {
      const grp = new THREE.Group();
      grp.position.set(s.x, GROUND + DRUM.h / 2, s.z);
      grp.rotation.y = yaw;
      const body = new THREE.Mesh(drumGeo, m.drum);
      body.castShadow = true;
      body.receiveShadow = true;
      grp.add(body);
      for (const ry of [-0.22, 0.22]) {
        const hoop = new THREE.Mesh(ribGeo, m.rib);
        hoop.rotation.x = -Math.PI / 2;
        hoop.position.y = ry;
        grp.add(hoop);
      }
      root.add(grp);
    }
  }

  /* ---- advance ------------------------------------------------------------
     The factory-belt idiom, verbatim: travel is p * SPAN and the wrap is a
     `while` subtracting SPAN. Every item's x is a pure function of p, so the
     stream is periodic by construction and holds under `?phase` pinning. */
  const mat4 = new THREE.Matrix4();
  const advance = (p: number) => {
    const travel = p * SPAN;
    for (let i = 0; i < ITEM_N; i++) {
      let x = -SPAN / 2 + i * PITCH + travel;
      while (x > SPAN / 2) x -= SPAN;
      items[i].grp.position.x = x;
    }
    root.updateMatrixWorld(true);
    /* The instanced cartons' matrices are their groups' world matrices taken
       back into the InstancedMesh's own space. Both live directly under `root`
       and the mesh has an identity transform, so the group's LOCAL matrix is
       already the right one — no inverse needed, and worth stating because the
       moment either node gains a parent transform this stops being true. */
    for (let k = 0; k < instanced.length; k++) {
      const g = items[instanced[k]].grp;
      mat4.compose(g.position, g.quaternion, g.scale);
      cartonMesh.setMatrixAt(k, mat4);
    }
    cartonMesh.instanceMatrix.needsUpdate = true;
  };

  return {
    root,
    items,
    flagged,
    container: { shell: build.shell, hardware: build.hardware, edges: build.edges },
    mouth,
    advance,
    owned,
  };
}
