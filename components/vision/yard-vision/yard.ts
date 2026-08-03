/* ---------------------------------------------------------------------------
   Yard Vision — the yard itself.

   WHY THIS SCENE IS SHOT DIFFERENTLY FROM THE OTHER THREE FLAGSHIPS.

   Container Vision, Tank Vision and Gate Vision are all close-ups of ONE
   object: a box with damage on it, a tank with corrosion on it, a truck with an
   ID on it. Section 04's claim is not about an object at all — "one survey, then
   the yard runs on a live twin" is a claim about a PLACE, and about knowing
   things about it. Shooting it as a fourth eye-level close-up would make the
   page four close-ups in a row and would also be a lie about the product.

   So this is the one scene that earns an aerial. It is also inverted a second
   way. In Gate Vision the camera holds and the subject moves; in Container and
   Tank the camera moves and the subject holds. Here the camera drifts slowly
   and the SUBJECT NEVER MOVES AT ALL — what changes across the loop is what is
   known about it. That is the difference between a yard and a digital twin, and
   it is the only honest way to animate a claim about data.

   Consequences that drive every number below:

     · The grid is not decoration. Gridlines are the actual slot boundaries, so
       the drafting language is carrying real information — and the 3D yard is
       the SAME yard as the flat map in the section beside it: five rows A-E,
       eight bays 01-08, and D-06 is the located box in both.
     · 55 containers means instancing. Three InstancedMesh, one per livery,
       sharing one BoxGeometry — 3 draw calls instead of 55. `PERFORMANCE.md`
       has had instancing as planned work for a while; a yard is what it was
       waiting for.
     · The two containers the story is ABOUT are ordinary Meshes, outside the
       instanced set, because a tracker bracket needs a real world bounding box
       and an instance does not have one. Two exceptions, not fifty-five.
--------------------------------------------------------------------------- */
import * as THREE from "three";
import { PALETTE } from "../_vision/palette";
import { containerEnd, containerRoof, containerSide } from "../hero-cards/skins";

/* ---- one 20ft box, in metres/2.44 so the box's own width is 0.82 ----------
   Real 20ft ISO: 6.06 x 2.44 x 2.59. Held to those PROPORTIONS rather than
   rounded off — 55 of them in a regular grid is the one situation where a
   stubby container is obvious, because the eye gets 55 chances to compare the
   long side against the short one. 2.00 / 0.82 = 2.44, which is 6.06 / 2.44. */
export const CW = 2.00;   // length, along X (the bay axis)
export const CH = 0.85;   // height
export const CD = 0.82;   // width, along Z (the row axis)

export const GROUND = -0.60;

/* Bay pitch is the box length plus a working gap; row pitch is the box width
   plus a DRIVE LANE, which is much wider. Those two numbers being different is
   what makes the layout read as a yard rather than as graph paper — a yard is
   dense across a row and open between rows, because something has to drive
   down it. It is also why the gridlines cannot come from `draftingGround`,
   which has one uniform step. */
export const PITCH_X = 2.30;   // CW + 0.30 working gap
export const PITCH_Z = 2.22;   // CD + 1.40 drive lane
export const TIER = CH + 0.04; // stack step

export const BAYS = 8;
export const ROWS = 5;         // A..E

/** Bay index 0..7 -> world X, centred on 0. */
export const bayX = (i: number) => (i - (BAYS - 1) / 2) * PITCH_X;
/** Row index 0..4 (A..E) -> world Z, centred on 0. Row E is NEAREST the camera. */
export const rowZ = (j: number) => (j - (ROWS - 1) / 2) * PITCH_Z;
/** Tier index 0-based -> world Y of the box CENTRE. */
export const tierY = (t: number) => GROUND + CH / 2 + t * TIER;

/* Stack heights, row A..E x bay 01..08. 0 is an empty slot.

   Two zeros are load-bearing and must not be edited casually:

     · E-03 is the RECOMMENDED SLOT. It is in row E, the row NEAREST the camera,
       for the reason the yard hero card learned the hard way: an empty bay with
       anything behind it stops reading as empty, because from a raking camera
       the thing behind fills the hole. Row E has nothing behind it, so the gap
       survives from any azimuth. Moving this slot to an inner row breaks the
       whole placement beat.
     · D-06 is the LOCATED box, and it is deliberately ONE TIER in a row whose
       neighbours are two — the impressive part of "ask for a container, get its
       location" is not that the box is hidden, it is that one box out of fifty
       is named. A short box among tall ones is easy to overlook and still fully
       visible from above, which is exactly what the bracket needs.

   Nothing taller than one tier sits in front of D-06 (E-06 is 1), so the
   bracket is never occluded. */
export const HEIGHTS: number[][] = [
  [2, 2, 1, 0, 1, 2, 2, 1], // A
  [2, 1, 0, 2, 1, 1, 2, 2], // B
  [1, 2, 2, 1, 0, 2, 1, 1], // C
  [2, 2, 1, 1, 2, 1, 2, 2], // D  <- bay 06 (index 5) is the located box
  [2, 1, 0, 2, 2, 1, 1, 1], // E  <- bay 03 (index 2) is the recommended slot
];

export const LOCATED = { row: 3, bay: 5 };  // D-06
export const SLOT = { row: 4, bay: 2 };     // E-03

export interface YardMaterials {
  /** one per livery, used by the InstancedMeshes — see the note on `single` */
  livery: THREE.MeshStandardMaterial[];
  /** the six-face treatment, for the two hero boxes only */
  hero: THREE.Material[];
  grid: THREE.LineBasicMaterial;
  slotFill: THREE.MeshBasicMaterial;
  slotEdge: THREE.LineBasicMaterial;
  all: THREE.Material[];
  dispose: () => void;
}

/* TEXTURE CACHE + IDLE WARM.
   Same contract as gate-vision/materials.ts and for the same measured reason:
   a cache only helps the SECOND consumer, and on a page with one instance of
   this scene the first consumer is the visitor. `warmYardTextures()` is called
   from _vision/lazy.tsx so the build that runs on the scroll path gets hits.

   The skins come from hero-cards/skins.ts, NOT from container-vision's
   materials.ts. That is a framing decision, not a shortcut: container-vision
   paints three 2048-wide canvases to sell one box filling the frame, and at
   this distance 55 boxes are ~40px tall each. Card-grade skins are the correct
   fidelity here, and they are an order of magnitude cheaper. */
const NEUTRAL = "#9AA0A8";
let texCache: { side: THREE.Texture; end: THREE.Texture; roof: THREE.Texture } | null = null;
function yardTextures() {
  if (!texCache) {
    texCache = {
      side: containerSide(NEUTRAL),
      end: containerEnd(NEUTRAL),
      roof: containerRoof(NEUTRAL),
    };
  }
  return texCache;
}
export function warmYardTextures() { yardTextures(); }

/* Liveries.

   THE RULE THAT DECIDES THESE HEXES: cargo sits between the background and the
   overlay in value. The background here is the site's near-black (#0A0B0E) and
   the overlay is #5CC8FF, so the boxes have to be clearly lighter than black
   and clearly darker than the accent — which on a dark page means mid navy, the
   opposite of the light hero card's saturated mid blue.

   THE 0.6x TINT RULE FROM THE HERO CARD DOES NOT TRANSFER, AND THIS IS WHERE IT
   WAS MEASURED. The first pass authored these ~1.6x brighter than the intended
   result on the card's reasoning that the tint multiplies a mid-grey albedo. On
   screen the boxes came out pale sky blue — in places brighter than the #5CC8FF
   overlay, which is the one thing this scene must never do, since it is the only
   scene where the blue proposal and the orange conclusion share a shot.

   Two things the card does not have were doing the lifting: the FULL area-light
   rig (five sources, spread 2.2 to cover an 18m yard, so a box catches light from
   several at once) and ACES tone mapping at 1.18 exposure. Together they cancel
   the albedo's 0.6 and then some. So these are now authored close to the value
   actually wanted, and the exposure is pulled to 0.98 in scene.tsx to stop the
   highlights on 55 lit roofs from flattening into one bright field. */
const LIVERY = ["#33507A", "#243A5C", "#42648C"] as const;

/** Deterministic livery per slot. Stable across builds — a yard that reshuffles
 *  its paint on every page load reads as a bug, and `Math.random()` here would
 *  also make any future screenshot comparison useless. */
export const liveryOf = (bay: number, row: number, tier: number) =>
  (bay * 7 + row * 3 + tier) % LIVERY.length;

export function buildYardMaterials(): YardMaterials {
  const tex = yardTextures();
  const all: THREE.Material[] = [];
  const keep = <T extends THREE.Material>(m: T) => { all.push(m); return m; };

  /* ONE material per instanced livery, mapped with the SIDE skin.
     A BoxGeometry with a material array renders as six draw-call groups, so the
     six-face treatment on 55 boxes would be 330 draw calls plus a shadow pass.
     At this framing the long side and the roof are seen at similar angles and
     both are ribbed, so one ribbed map on all six faces is very close to free
     and visually almost identical. The two boxes that carry the story get the
     real treatment below. */
  const livery = LIVERY.map((base) => keep(new THREE.MeshStandardMaterial({
    map: tex.side,
    color: base,
    metalness: 0.16,
    roughness: 0.84,
    envMapIntensity: 0.20,
    transparent: true,
    opacity: 0,
  })));

  /* BoxGeometry face order is +x, -x, +y, -y, +z, -z. With CW along X the ends
     are +x/-x, the roof and floor are +y/-y, and the long sides are +z/-z. */
  const mk = (map: THREE.Texture) => keep(new THREE.MeshStandardMaterial({
    map, color: LIVERY[0], metalness: 0.16, roughness: 0.84,
    envMapIntensity: 0.20, transparent: true, opacity: 0,
  }));
  const endM = mk(tex.end), roofM = mk(tex.roof), sideM = mk(tex.side);
  const hero: THREE.Material[] = [endM, endM, roofM, roofM, sideM, sideM];

  /* The grid is drawn, not textured — 15 lines is 30 vertices, against a
     ground texture that would have to be several thousand pixels wide to keep
     a 1px line crisp across an 18m yard. */
  /* toneMapped: false on all three graphics materials.

     ACES tone mapping exists to roll off the bright end of a LIT image, and it
     does that by desaturating as it compresses — which is right for a metal roof
     catching a softbox and wrong for a graphic, whose colour is data. At
     exposure 0.98 the accent came through as a grey-green smudge instead of
     #5CC8FF: the slot read as a dirty patch on the hardstand rather than as a
     recommendation, and the gridlines read as pale pencil rather than as signal.
     detectMaterials() sets this flag for exactly the same reason; these
     materials are local to this scene and had to be told separately. */
  /* ACCENT BLUE, and it stays that way — a white experiment here was reverted.

     The slot grid is NOT generic floor ruling: these lines are the bay
     boundaries the system surveyed, and they come up behind the survey wave as
     its result. That makes them an OBSERVATION, which is exactly what accent is
     for, and it is why blue was right all along.

     It also has to stay a different colour from the drafting sheet underneath
     it. Both grids drawn white, on the same plane, at pitches that do not divide
     evenly (1.0 against 2.30/2.22) is textbook moiré — the two rulings beat
     against each other and the floor turns to mush. Colour is what separates
     them into "the measured world" (white sheet) and "what the system knows"
     (blue slots). Do not unify them. */
  const grid = keep(new THREE.LineBasicMaterial({
    color: PALETTE.accent, transparent: true, opacity: 0, toneMapped: false,
  }));

  /* The recommended slot. Blue, because it is an OBSERVATION — a proposal the
     system is making. The located box is orange because it is a CONCLUSION.
     That split is the page's standing rule and this scene is the one place both
     appear in the same shot, so getting it backwards here would be visible. */
  const slotFill = keep(new THREE.MeshBasicMaterial({
    color: "#5CC8FF", transparent: true, opacity: 0, depthWrite: false, toneMapped: false,
  }));
  const slotEdge = keep(new THREE.LineBasicMaterial({
    color: "#8FDCFF", transparent: true, opacity: 0, toneMapped: false,
  }));

  return {
    livery, hero, grid, slotFill, slotEdge, all,
    /* MATERIALS ONLY — the three skins are cached in `texCache` and shared, so
       disposing them here would leave the next build sampling destroyed
       textures. Same hazard, same reasoning, as gate-vision/materials.ts. */
    dispose: () => { all.forEach((m) => m.dispose()); },
  };
}

export interface Yard {
  root: THREE.Group;
  /** the located box — an ordinary Mesh so a tracker can read its world box */
  located: THREE.Mesh;
  /** ground quad + outline marking the recommended slot */
  slot: THREE.Group;
  /** slot-boundary gridlines */
  grid: THREE.LineSegments;
  /** anchor for the survey callout — above the middle of the yard */
  centreAnchor: THREE.Vector3;
  /**
   * Drive the survey wave. `x` is the wave's world X; `gain` scales the whole
   * effect (0 outside the survey beat, which resets every box to its livery).
   * Cheap enough to call every frame — see FLASH.
   */
  flashWave: (x: number, gain: number) => void;
  /** geometry this scene OWNS and must dispose (the shared box is not owned) */
  owned: THREE.BufferGeometry[];
}

/* THE SURVEY IS A WAVE OF CONTAINERS LIGHTING UP, not a plane passing over them.

   The first pass swept a translucent quad across the yard, which is the idiom the
   other three flagships use — and it was wrong here for a reason worth writing
   down: those scenes sweep ONE object, so a bar of light crossing it reads as the
   thing being scanned. Sweeping 55 objects, the bar reads as a wipe transition,
   because the containers never acknowledge it. Making the boxes themselves flash
   brighter as the wave reaches them and settle back behind it puts the reaction
   in the subject, which is what "being surveyed" actually looks like.

   Implemented with InstancedMesh's per-instance colour attribute, which MULTIPLIES
   the material's colour in the shader. So the resting value is exactly 1.0 (the
   box renders as its livery) and the flash drives above 1 — values over 1 are
   legal in the attribute and simply multiply up, which is why this needs no
   custom shader and costs 3 draw calls exactly as before. 55 instances is 165
   floats a frame, uploaded only while the wave is actually running. */
/* 2.4 at the crest. That is a big multiplier and it is deliberate: a MULTIPLY
   brightens each channel proportionally, so a navy box lifts to a lighter, more
   saturated navy long before it starts reading as a flash. The turn toward white
   only happens once the blue channel clips at 1.0 and red and green keep
   climbing — #33507A is (0.20, 0.31, 0.48), so 2.4 puts it at (0.48, 0.75, 1.0),
   a pale blue-white. 1.35 was the first attempt and read as a slight sheen
   rather than as the containers lighting up. */
const FLASH = 2.4;
const AHEAD = 0.8;       // how far the glow reaches IN FRONT of the crest
const BEHIND = 2.6;      // and how slowly it decays behind — a wake, not a band

/** Asymmetric so the wave has a direction: a quick rise as it arrives, a longer
 *  settle after it passes. A symmetric profile reads as a band sliding across
 *  rather than as something happening to each box in turn. */
function waveAt(dx: number) {
  const s = dx > 0 ? AHEAD : BEHIND;
  const n = dx / s;
  return Math.exp(-n * n);
}

export function buildYard(m: YardMaterials): Yard {
  const root = new THREE.Group();
  const owned: THREE.BufferGeometry[] = [];

  /* ONE BoxGeometry for every container in the yard, instanced and hero alike. */
  const box = new THREE.BoxGeometry(CW, CH, CD);
  owned.push(box);

  /* Count per livery first. InstancedMesh needs its count at construction and
     over-allocating means drawing invisible instances at the origin, which on a
     dark scene shows up as a smear at the yard's centre. */
  const counts = [0, 0, 0];
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < BAYS; i++) {
      for (let t = 0; t < HEIGHTS[j][i]; t++) {
        if (j === LOCATED.row && i === LOCATED.bay) continue; // hero box, not instanced
        counts[liveryOf(i, j, t)]++;
      }
    }
  }

  const meshes = counts.map((c, k) => {
    const im = new THREE.InstancedMesh(box, m.livery[k], c);
    im.castShadow = true;
    im.receiveShadow = true;
    // the yard never moves, so the matrices are written once and never again
    im.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    root.add(im);
    return im;
  });

  const cursor = [0, 0, 0];
  const mat4 = new THREE.Matrix4();
  let located: THREE.Mesh | null = null;
  /* Each instance's world X, kept parallel to its mesh's instance order, so the
     wave can be evaluated without reading matrices back out of the attribute. */
  const instX: Float32Array[] = counts.map((c) => new Float32Array(c));

  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < BAYS; i++) {
      for (let t = 0; t < HEIGHTS[j][i]; t++) {
        const x = bayX(i), y = tierY(t), z = rowZ(j);
        if (j === LOCATED.row && i === LOCATED.bay) {
          const hb = new THREE.Mesh(box, m.hero);
          hb.position.set(x, y, z);
          hb.castShadow = true;
          hb.receiveShadow = true;
          root.add(hb);
          located = hb;
          continue;
        }
        const k = liveryOf(i, j, t);
        mat4.makeTranslation(x, y, z);
        instX[k][cursor[k]] = x;
        meshes[k].setMatrixAt(cursor[k]++, mat4);
      }
    }
  }
  meshes.forEach((im) => { im.instanceMatrix.needsUpdate = true; });

  /* Initialise every instance colour to pure white — the multiply identity, so
     an un-flashed box renders as exactly its livery. This call is also what
     ALLOCATES the instanceColor attribute; without it setColorAt later in the
     frame loop would have nothing to write into. */
  const white = new THREE.Color(1, 1, 1);
  meshes.forEach((im, k) => {
    for (let n = 0; n < instX[k].length; n++) im.setColorAt(n, white);
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  });

  if (!located) throw new Error("[yard-vision] LOCATED slot is empty in HEIGHTS");

  /* ---- gridlines: the slot boundaries ----------------------------------

     The grid runs TWO ROWS PAST the containers on the near side. Those rows are
     surveyed and empty, which is true of any real yard — and it is what fills
     the bottom of the frame. At 38 degrees depression the lower edge of frame
     strikes bare hardstand well in front of row E, and with the drafting sheet
     held at 0.055 that band was simply black. Grid where the boxes stop reads as
     "yard continues"; nothing there reads as "the render ended".

     Near side only. Extending the far side too would push the yard's back edge
     out of frame and cost the sense of a bounded, measured facility, which is
     the whole claim the survey beat is making. */
  /* ONE extra row, not two. Two put so much surveyed-but-empty apron under the
     containers that the yard looked abandoned rather than working — and on the
     slot beat, where the camera aims at the nearest row, the empty grid took
     sixty per cent of the frame. One row is enough to stop the hardstand ending
     in a hard edge, which was all it was ever for. */
  const NEAR_EXTRA = 1;
  const HALF_X = (BAYS / 2) * PITCH_X;                      // 9.20
  const FAR_Z = -(ROWS / 2) * PITCH_Z;                       // -5.55
  const NEAR_Z = (ROWS / 2 + NEAR_EXTRA) * PITCH_Z;          // +9.99
  const gy = GROUND + 0.012;             // clear of the box floors, no z-fight
  const pts: number[] = [];
  for (let i = 0; i <= BAYS; i++) {
    const x = (i - BAYS / 2) * PITCH_X;
    pts.push(x, gy, FAR_Z, x, gy, NEAR_Z);
  }
  for (let j = 0; j <= ROWS + NEAR_EXTRA; j++) {
    const z = (j - ROWS / 2) * PITCH_Z;
    pts.push(-HALF_X, gy, z, HALF_X, gy, z);
  }
  const gridGeo = new THREE.BufferGeometry();
  gridGeo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  owned.push(gridGeo);
  const grid = new THREE.LineSegments(gridGeo, m.grid);
  root.add(grid);

  /* ---- the recommended slot ------------------------------------------- */
  const slot = new THREE.Group();
  const fillGeo = new THREE.PlaneGeometry(CW, CD);
  owned.push(fillGeo);
  const fill = new THREE.Mesh(fillGeo, m.slotFill);
  fill.rotation.x = -Math.PI / 2;
  // above the gridlines, or the line drawn across the slot reads as a crack
  fill.position.set(bayX(SLOT.bay), GROUND + 0.02, rowZ(SLOT.row));
  slot.add(fill);

  const ex = CW / 2, ez = CD / 2;
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute("position", new THREE.Float32BufferAttribute([
    -ex, 0, -ez, ex, 0, -ez,
    ex, 0, -ez, ex, 0, ez,
    ex, 0, ez, -ex, 0, ez,
    -ex, 0, ez, -ex, 0, -ez,
  ], 3));
  owned.push(edgeGeo);
  const edge = new THREE.LineSegments(edgeGeo, m.slotEdge);
  edge.position.set(bayX(SLOT.bay), GROUND + 0.025, rowZ(SLOT.row));
  slot.add(edge);
  root.add(slot);

  /* ---- the survey wave ------------------------------------------------- */
  const scratch = new THREE.Color();
  const heroMats = Array.from(new Set(m.hero)) as THREE.MeshStandardMaterial[];
  const heroBase = heroMats.map((h) => h.color.clone());
  const heroX = bayX(LOCATED.bay);
  /* `wasLive` avoids re-uploading 55 colours every frame for the ~70% of the
     loop when the wave is not running. Without it this is the only per-frame
     buffer upload in the scene, which would be an odd thing to pay for while
     nothing is happening. */
  let wasLive = false;

  const flashWave = (waveX: number, gain: number) => {
    const live = gain > 0.001;
    if (!live && !wasLive) return;
    wasLive = live;

    meshes.forEach((im, k) => {
      const xs = instX[k];
      for (let n = 0; n < xs.length; n++) {
        const f = live ? 1 + (FLASH - 1) * gain * waveAt(xs[n] - waveX) : 1;
        scratch.setRGB(f, f, f);
        im.setColorAt(n, scratch);
      }
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    });

    /* The located box is an ordinary Mesh and has no instanceColor, so it would
       be the ONE container in the yard that ignores the survey — and it is the
       box the whole scene is about, so that omission would be noticed. Its three
       materials are unique to it, so scaling their colour off a stored base is
       safe here in a way it would not be for the shared liveries. */
    const hf = live ? 1 + (FLASH - 1) * gain * waveAt(heroX - waveX) : 1;
    heroMats.forEach((h, n) => {
      h.color.copy(heroBase[n]).multiplyScalar(hf);
    });
  };

  return {
    root,
    located,
    slot,
    grid,
    flashWave,
    // clear of the tallest stack (2 tiers), so the survey label's leader does
    // not start inside a container
    centreAnchor: new THREE.Vector3(0, tierY(2) + 0.4, 0),
    owned,
  };
}
