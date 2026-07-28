/* ---------------------------------------------------------------------------
   Home hero cards — the four subjects.

   These are the small ones. Each card is ~320 x 240 on screen, so the rules
   that govern a flagship scene invert: no leader lines, no readout, no
   multi-stop story. One subject, one slow move, one caption — the caption
   being the exact line its schematic already carried.

   Geometry stays primitive; the SKINS (see ./skins) carry the realism, because
   at card size a surface reads and a bevel does not. What geometry has to earn
   is the silhouette and the motion.
--------------------------------------------------------------------------- */
import * as THREE from "three";
import { PALETTE } from "../_vision/palette";
import { makeMetal, metalBox, tintMetal } from "../_vision/metal";
import { cardboardSide, cardboardTop, containerEnd, containerRoof, containerSide } from "./skins";
import { createTracker, detectMaterials, scanPlane } from "./detect";
import type { Tracked } from "./detect";
import { draftingGround, setGroundOpacity } from "./ground";

export interface CardSubject {
  group: THREE.Group;
  /** the one thing the caption is about — reserved for future markers */
  focus: THREE.Vector3;
  /** meshes whose opacity the intro ramps */
  materials: THREE.Material[];
  /** per-frame life: p is 0..1 through the loop */
  tick?: (p: number) => void;
  /** detection graphics that must stay square to the camera */
  billboards?: THREE.Object3D[];
  /** called every frame, after tick(), to keep detection trackers locked on */
  trackers?: (camera: THREE.Camera) => void;
  /** Every tracker this subject owns, so the card can drive them uniformly —
      currently the hover ACQUIRE settle. Listing them here rather than giving
      each subject its own hover callback keeps the behaviour in ONE place;
      four separate implementations of the same easing is how they drifted
      apart last time. */
  marks?: Tracked[];
  dispose: () => void;
  /** optional drafting-ground fade hook, set by subjects that carry one */
  ground?: { setOpacity: (o: number) => void };
}

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/* Temporary deep instrumentation (?perf). Splitting studio-vs-subject named the
   two expensive builders; this splits WITHIN them so the cost can be attributed
   to materials, geometry or the detection layer rather than guessed at. */
const _deep = (label: string, t0: number) => {
  if (typeof location !== "undefined" && location.search.includes("perf")) {
    const w = window as unknown as { __visionDeep?: string[] };
    (w.__visionDeep ||= []).push(`${label} ${(performance.now() - t0).toFixed(0)}`);
  }
};


/** BoxGeometry face order is +x, -x, +y, -y, +z, -z. A container is skinned
    ends / roof / floor / long sides; a carton is top-and-bottom / sides. */
const faces = (endM: THREE.Material, topM: THREE.Material, sideM: THREE.Material) =>
  [endM, endM, topM, topM, sideM, sideM];

/* The site's own signal orange — the colour every schematic SVG already uses
   for callouts. Kept here rather than reaching for PALETTE.warn (#FFB020),
   which is a softer amber picked for dark scenes and greys out on a light
   panel. Orange means CONCLUSION across the whole row; see DECISIONS.md. */
const SIGNAL_ORANGE = "#ED510C";

/* 01 · Viso Yard — a gantry crane reading a container mid-move.

   REWRITTEN. The first version was a 4x2x2 block of sixteen containers with a
   scan sweep across it, and it had three problems that were all the same
   problem:

     · CONCEPTUALLY it showed one capability — find a box in a stack — while
       the card's own copy underneath reads "Container, gate, crane, yard &
       cargo inspection". It named the crane and never showed one.
     · VISUALLY sixteen corrugated boxes in four near-identical navies, at
       ~280x200px, resolve to a grey-blue plaid. Four values of one hue is
       value noise at that size, and it gave the accent nothing to win against.
     · the SVG it was supposedly derived from is not a block of boxes at all:
       it is a yard ELEVATION — gate at left, gantry straddling the stacks,
       trolley and spreader hanging off the beam, one container called out.
       The 3D scene had thrown away the two things that say "yard".

   So: a portal gantry, its trolley crossing the frame with a container in the
   spreader, pausing over an empty bay slot while the platform reads the box,
   then carrying on. The gate is deliberately absent — Gate Vision is its own
   flagship scene and duplicating it here would say the same thing twice.

   WHY THE LOAD NEVER LANDS. Every version where the crane actually places or
   removes a container changes the yard's state, and a 14s loop that changes
   state has to pop back at the wrap — a box appearing or vanishing at x=0, in
   the middle of frame, in full view. Carrying the box ACROSS is state-neutral:
   it enters off-frame left and exits off-frame right, so the wrap happens
   where nothing is visible. It is also the stronger claim. A box identified
   while it is moving, in the crane's grasp, is something a photograph cannot
   assert; a box sitting in a slot is not. */
export function yardSubject(): CardSubject {
  const g = new THREE.Group();
  const mats: THREE.Material[] = [];

  /* ONE set of skins, tinted per livery — not one set PER livery.

     Baking colour into the canvas meant five liveries x three maps = 15 texture
     generations, each a 1024x420 canvas with per-pixel grain. Measured in
     production, procedural texture generation dominated scene-build cost (the
     four cards totalled 2366ms). The cache could not help, because every livery
     asked for a different colour.

     Generating the skin ONCE in neutral grey and tinting via material.color
     collapses that to three canvases. Colour multiplies the map, and a neutral
     grey base takes a tint predictably — unlike the cardboard case, there is no
     warm hue to fight, which is why a plain multiply is correct here and was
     not there. */
  const NEUTRAL = "#9AA0A8";
  const sideTex = containerSide(NEUTRAL), endTex = containerEnd(NEUTRAL), roofTex = containerRoof(NEUTRAL);
  const skin = (base: string) => {
    const mk = (map: THREE.Texture) => {
      const m = new THREE.MeshStandardMaterial({
        map, color: base, metalness: 0.18, roughness: 0.82, envMapIntensity: 0.3,
        transparent: true, opacity: 0,
      });
      mats.push(m);
      return m;
    };
    return faces(mk(endTex), mk(roofTex), mk(sideTex));
  };
  /* THREE liveries, down from five: two for the yard and one for the load.
     18 materials where there were 30.

     SATURATED MID BLUE, on a light card. These have now been navy (unreadable
     against a charcoal card), then pale desaturated blue (to separate from a
     light-blue overlay), and now this — because the card went light and the
     rule inverted again. The rule that survives all three:

         CARGO SITS BETWEEN THE BACKGROUND AND THE OVERLAY IN VALUE.

     On a near-white card that means real colour: mid-blue containers read as
     objects against the paper, and the overlay wins by being DARKER than they
     are rather than brighter. Pale cargo would have vanished into the card.

     Tints MULTIPLY a mid-grey albedo (#9AA0A8) carrying baked corrugation
     shadow, so the on-screen result is roughly one step darker than the hex. */
  const yardA = skin("#7AAFD6");
  const yardB = skin("#97C4E2");
  // the load: the lightest of the three, so the box in the crane's grasp still
  // separates from the stacks behind it without going pale
  const loadSkin = skin("#B4D9EF");

  /* ONE BoxGeometry, shared by all eight containers. The old version called
     `box()` per container, i.e. sixteen identical BoxGeometry allocations. */
  const CW = 2.0, CH = 0.85, CD = 1.0;
  const conGeo = new THREE.BoxGeometry(CW, CH, CD);
  const con = (m: THREE.Material[]) => new THREE.Mesh(conGeo, m);

  const FLOOR = -0.95;
  const ROW0 = FLOOR + CH / 2;          // bottom-row centre height
  const PITCH_X = CW + 0.12;            // bay pitch — the grid step is keyed to this
  const SLOT_X = 0;                     // the empty bay the load is read over

  /* Front bank: two 2-high stacks flanking an empty slot at x=0. Back bank:
     set back, staggered, and deliberately EMPTY at x=0 — the first pass put a
     container directly behind the slot and from a raking camera it filled the
     gap, so the empty bay stopped reading as empty and the whole point of the
     shot was lost. Nothing may occupy the x=0 column at any depth. */
  const topOfStack: THREE.Mesh[] = [];
  for (const sx of [-PITCH_X, PITCH_X]) {
    for (let row = 0; row < 2; row++) {
      const b = con(row === 0 ? yardA : yardB);
      b.position.set(sx, ROW0 + row * (CH + 0.05), 0.5);
      b.castShadow = true;
      b.receiveShadow = true;
      g.add(b);
      if (row === 1) topOfStack.push(b);
    }
  }
  for (const [sx, rows] of [[-PITCH_X, 2], [PITCH_X * 2, 1]] as const) {
    for (let row = 0; row < rows; row++) {
      const b = con(row === 0 ? yardB : yardA);
      b.position.set(sx, ROW0 + row * (CH + 0.05), -1.9);
      b.castShadow = true;
      g.add(b);
    }
  }

  /* The hardstand. Grid step is the BAY PITCH, so the gridlines are the bay
     boundaries rather than generic graph paper — the drafting language doing
     actual work for once. Sits just under the containers, not level with
     them, so nothing z-fights the bottom faces.

     Held much quieter than the other three cards (0.07 against 0.16) and
     pulled in from 30 to 24. At bay pitch the lines are far apart, and at
     this card's shallow camera angle they rake almost to the horizon — at the
     shared 0.16 the floor read as a bright blue net competing with the
     gantry, which is the opposite of what a ground plane is for. */
  const ground = draftingGround({ size: 24, y: FLOOR - 0.01, step: PITCH_X, opacity: 0.07 });
  g.add(ground.mesh);

  /* ---- the gantry ----
     Plain materials, no maps. makeMetal() costs three canvases and a Sobel
     pass per material, and at 280px a gantry strut is about two pixels wide —
     there is nowhere for a roughness map to show. metalBox still applies, for
     the rounded edge highlight that reads at any size. */
  /* DARK METALLIC CHARCOAL — and going light made this work BETTER, not worse.
     Against a charcoal card the gantry had to be lifted to #4A5057 just to stay
     visible, which cost it its silhouette. On paper it can be properly dark: a
     near-black structure on a near-white card is the strongest read in the
     frame, and it frames the blue cargo instead of competing with it.

     Two shades only. Structure, then a darker one for the moving parts. */
  const steel = new THREE.MeshStandardMaterial({
    color: "#525A63", metalness: 0.72, roughness: 0.46, transparent: true, opacity: 0,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: "#32383F", metalness: 0.6, roughness: 0.62, transparent: true, opacity: 0,
  });
  mats.push(steel, dark);

  const LEG_X = 3.7, BEAM_Y = 3.14, TROLLEY_Y = 2.9, CABLE_TOP = 2.77;
  for (const sx of [-LEG_X, LEG_X]) {
    const leg = metalBox(0.16, BEAM_Y - FLOOR, 0.16, steel);
    leg.position.set(sx, (BEAM_Y + FLOOR) / 2, 0.5);
    g.add(leg);
    // the knee brace the SVG draws as a diagonal at each beam corner
    const brace = metalBox(0.1, 0.86, 0.1, steel);
    brace.position.set(sx - Math.sign(sx) * 0.3, BEAM_Y - 0.42, 0.5);
    brace.rotation.z = Math.sign(sx) * 0.62;
    g.add(brace);
  }
  const beam = metalBox(LEG_X * 2 + 0.5, 0.24, 0.3, steel);
  beam.position.set(0, BEAM_Y, 0.5);
  g.add(beam);
  // the SVG draws the beam as two rules; the lower chord is the second one
  const chord = metalBox(LEG_X * 2 + 0.5, 0.07, 0.22, steel);
  chord.position.set(0, BEAM_Y - 0.26, 0.5);
  g.add(chord);

  /* trolley -> cables -> spreader -> load, as one nested rig so the tick only
     ever sets two numbers: the trolley's x and the load's y. */
  const hoist = new THREE.Group();
  hoist.position.z = 0.5;
  g.add(hoist);

  const trolley = metalBox(0.92, 0.26, 0.52, dark);
  trolley.position.y = TROLLEY_Y;
  hoist.add(trolley);

  /* Cables are unit-height cylinders hung from y=0 downward inside a group at
     CABLE_TOP, so scaling that group's y stretches them from the trolley
     instead of translating them. */
  const cableGrp = new THREE.Group();
  cableGrp.position.y = CABLE_TOP;
  hoist.add(cableGrp);
  const cableGeo = new THREE.CylinderGeometry(0.018, 0.018, 1, 5);
  for (const cx of [-0.78, -0.26, 0.26, 0.78]) {
    const c = new THREE.Mesh(cableGeo, dark);
    c.position.set(cx, -0.5, 0);
    cableGrp.add(c);
  }

  const lift = new THREE.Group();
  hoist.add(lift);
  const spreader = metalBox(CW + 0.12, 0.14, 0.9, dark);
  spreader.position.y = CH / 2 + 0.07;
  lift.add(spreader);
  const load = con(loadSkin);
  load.castShadow = true;
  lift.add(load);

  /* ---- the vision layer ----
     Three things, each saying something the others do not:

       1. the LOAD is bracketed for the whole traverse — faint while it is
          still being acquired, solid once it is over the bay being read. A
          detector holding a target that is physically moving is the claim.
       2. the BAY SLOT is outlined on the hardstand, and lights when the read
          resolves: the box is not just identified, it is assigned somewhere.
       3. the two front stacks carry permanent faint brackets — the standing
          inventory, held continuously rather than discovered by a sweep.

     The scan plane is gone. A sweep existed to make a static scene look
     inspected; the crane's own traverse is now the event, and a second
     travelling line competing with it just read as a glitch. */
  const dm = detectMaterials();
  mats.push(...dm.all);

  const loadDet = createTracker(dm.faint);
  g.add(loadDet.group);

  /* bay slot outline: four bars painted on the hardstand around the empty bay.

     OUTSET BY 0.14, because the load now LANDS in this bay. Drawn on the bay's
     own footprint the outline sat exactly under the container's bottom face —
     0.035 of each 0.07 bar surviving outside the box, i.e. about one pixel at
     card size — so the orange assignment beat, which is the whole payoff, was
     occluded by the thing it was confirming. Ringing the footprint instead
     leaves a 0.14 margin of outline clear of the box on every side, and the
     bars are lengthened by 2 x 0.14 so the corners still meet. */
  const slotBars: THREE.Mesh[] = [];
  const OUTSET = 0.14;
  const barGeo = {
    long: new THREE.PlaneGeometry(CW + 2 * OUTSET, 0.07),
    short: new THREE.PlaneGeometry(CD + 2 * OUTSET, 0.07),
  };
  for (const dz of [-(CD / 2 + OUTSET), CD / 2 + OUTSET]) {
    const b = new THREE.Mesh(barGeo.long, dm.faint);
    b.rotation.x = -Math.PI / 2;
    b.position.set(SLOT_X, FLOOR + 0.012, 0.5 + dz);
    slotBars.push(b);
    g.add(b);
  }
  for (const dx of [-(CW / 2 + OUTSET), CW / 2 + OUTSET]) {
    const b = new THREE.Mesh(barGeo.short, dm.faint);
    b.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
    b.position.set(SLOT_X + dx, FLOOR + 0.012, 0.5);
    slotBars.push(b);
    g.add(b);
  }

  const inv = topOfStack.map(() => createTracker(dm.faint));
  inv.forEach((t) => g.add(t.group));

  /* choreography, over p 0..1 of the 14s loop:
       0.00-0.32  traverse in from off-frame left, load high
       0.32-0.48  lower INTO the bay — the load lands
       0.48-0.64  dwell landed — this is the read
       0.64-0.80  lift back to travelling height
       0.80-1.00  traverse out to off-frame right
     TRAVEL is set past the frame edge at this rig (half-width ~4.75) so both
     ends of the loop sit outside the visible frame and the wrap is unseeable. */
  /* THE LOAD NOW LANDS. It used to stop at y=0.15, a container hovering half a
     box-height above an empty slot forever — an ambient loop that never
     completes an action, which reads as a screensaver rather than as work. LOW
     is now the bottom-row centre height, so the load's bottom face meets FLOOR
     exactly as the stacked containers' do:

         LOW = ROW0 = FLOOR + CH/2 = -0.95 + 0.85/2 = -0.525

     Nothing about the wrap changes: the placement is still a function of p
     alone and the load is back at HIGH by 0.80, before the trolley leaves. The
     yard's STATE is still unchanged at the wrap — the box is picked back up,
     it is not left in the bay — which is the constraint that killed every
     earlier landing attempt. What it buys is a completed cycle: lower, land,
     read, lift. The vertical windows are unchanged (0.32-0.48-0.64-0.80)
     because the trolley is only stationary over the bay between 0.32 and 0.80;
     starting the descent earlier would drag the box through the stacks. */
  const TRAVEL = 5.6, HIGH = 1.62, LOW = ROW0;
  const es = (t: number) => t * t * (3 - 2 * t);
  const seg = (p: number, a: number, b: number) => es(clamp01((p - a) / (b - a)));
  /* TWO BEATS, NEVER BOTH AT ONCE. The load hovers directly over the bay, so
     lighting the box bracket and the bay outline together stacked two accent
     graphics on the same pixels and read as one confused tangle of blue —
     the same "detections everywhere" failure the trackers were rebuilt to
     fix. Separating them in time also states the actual sequence: the box is
     IDENTIFIED first, and only then is it ASSIGNED somewhere. */
  let reading = false;   // beat 1 — the box is being read
  let assigned = false;  // beat 2 — the bay it is going to

  return {
    group: g,
    focus: new THREE.Vector3(SLOT_X, LOW, 0.5),
    materials: mats,
    marks: [loadDet, ...inv],
    ground: { setOpacity: (o) => setGroundOpacity(ground, o) },
    tick: (p) => {
      hoist.position.x =
        p < 0.32 ? -TRAVEL + TRAVEL * seg(p, 0, 0.32)
          : p < 0.80 ? 0
            : TRAVEL * seg(p, 0.80, 1);

      const y =
        p < 0.32 ? HIGH
          : p < 0.48 ? HIGH - (HIGH - LOW) * seg(p, 0.32, 0.48)
            : p < 0.64 ? LOW
              : p < 0.80 ? LOW + (HIGH - LOW) * seg(p, 0.64, 0.80)
                : HIGH;
      lift.position.y = y;
      // the cables span whatever gap the spreader has opened up
      cableGrp.scale.y = Math.max(0.02, CABLE_TOP - (y + CH / 2 + 0.07));

      /* Three states, building: ACQUIRING while it traverses in (bracket
         faint), IDENTIFIED once it starts down (bracket solid), ASSIGNED for
         the back half of the hold (bay outline solid as well). The bracket
         stays solid through the assignment rather than handing over to it —
         they occupy different parts of the frame, the bracket around the load
         and the outline on the hardstand below it, so both being lit reads as
         one resolved event instead of two competing graphics. */
      reading = p > 0.34 && p < 0.78;
      assigned = p >= 0.58 && p < 0.78;
      /* THE ASSIGNMENT IS ORANGE. New grammar across the whole row: BLUE is the
         machine observing (brackets, scans, sight cones) and ORANGE is a
         CONCLUSION — the thing the system has decided and wants you to look at.
         The schematic SVGs have always done exactly this: geometry in white,
         callouts in #ED510C. Reading the box is observation, so it stays blue;
         assigning it a bay is the answer, so the outline resolves to warn.

         It also gives this card its one orange event per loop, and the four
         cards' events land at different phases — which is what makes the row of
         panels read as alive rather than as four stills. */
      const bayMat = assigned ? dm.warn : dm.faint;
      for (const b of slotBars) b.material = bayMat;
    },
    trackers: (camera) => {
      /* The load's bracket is already the landing's confirmation: `reading`
         spans 0.34-0.78, so the bracket is at ACCENT for the whole descent,
         the whole dwell on the hardstand and the start of the lift, and drops
         back to faint only while the box is travelling. No second tracker is
         added for the placement — the load has carried one since the traverse
         version, and a bracket that appears at 0.30 would undo the "held on a
         moving target" claim the faint phase exists to make. */
      loadDet.setMaterial(reading ? dm.accent : dm.faint);
      loadDet.follow(load, camera);
      inv.forEach((t, i) => t.follow(topOfStack[i], camera));
    },
    /* Textures are CACHED and shared across every card on the page (see
       skins.ts) — disposing them here would pull them out from under the
       other three scenes the moment this one unmounts. Only the materials and
       the geometry built here, which are genuinely per-scene, are disposed. */
    dispose: () => {
      mats.forEach((m) => m.dispose());
      ground.material.dispose();
      conGeo.dispose();
      cableGeo.dispose();
      barGeo.long.dispose();
      barGeo.short.dispose();
    },
  };
}

/* 02 · Viso Warehouse — a forklift load counted under a fixed camera.

   THIRD VERSION. The first was one pallet on the floor with eighteen cartons
   ticked off. The second was rack occupancy. Both failed, and for the same
   reason once it is named:

       THE SCENE HAD NO EVENT.

   Yard works because a crane does something. Factory works because a line runs
   and an arm acts on it. The rack version had nothing moving in it at all — the
   only animation was overlay brackets appearing on static boxes — so there was
   nothing for the detection to be ABOUT. It also had no scale reference, which
   is why racking at 280px read as a shelving unit: with no vehicle, no person
   and no floor, a rack of boxes could be a bookcase.

   So the machine comes back, and it is the one machine that means "warehouse"
   the instant you see its silhouette: a counterbalance FORKLIFT. Mast, forks,
   overhead guard. It carries a palletised load in from the left, stops under a
   fixed camera, the load is counted carton by carton, and it drives on.

   WHY COUNTING AND NOT IDENTIFYING. Yard already owns identity ("which box is
   this") and Factory owns inspection ("is this one good, how big is it"). The
   warehouse claim is QUANTITY — "COUNT ▲ · WITH VIDEO PROOF" is the schematic's
   own callout — so this scene has to show a number going up. It does that with
   a tally column of six ticks, one per carton, filling as each is counted. Tick
   rows were removed from the trackers earlier for being unreadable, and that was
   right: a horizontal row of tiny dashes under a bracket is noise. A vertical
   column of chunky bars beside the load, one per countable thing, is a gauge —
   and it is the only way to say "quantity" at this size without type.

   STATE-NEUTRAL, like the gantry. The truck enters off-frame and leaves
   off-frame carrying the same load it arrived with, and the tally is a function
   of p alone that resets while the truck is outside the frame. Nothing in the
   scene is ever left changed at the wrap. */
export function warehouseSubject(): CardSubject {
  const g = new THREE.Group();
  const mats: THREE.Material[] = [];
  const own = <T extends THREE.Material>(m: T) => { mats.push(m); return m; };

  /* Machinery is DARK CHARCOAL across the whole row — the gantry, the
     production line, and now the truck. Real forklifts are safety yellow or
     orange, and that is deliberately not used here: #ED510C is the overlay's
     warn colour, and a permanently-orange vehicle would compete with the one
     graphic that is supposed to mean "something is wrong". Consistency across
     four cards beats accuracy on one. */
  const steel = own(new THREE.MeshStandardMaterial({
    color: "#525A63", metalness: 0.72, roughness: 0.46, transparent: true, opacity: 0,
  }));
  const dark = own(new THREE.MeshStandardMaterial({
    color: "#32383F", metalness: 0.55, roughness: 0.62, transparent: true, opacity: 0,
  }));
  /* A THIRD charcoal, lighter, for the mast, forks, carriage and guard. Two
     values was not enough: body, counterweight, wheels, mast and cage all sat
     within 0.1 of each other and the truck rendered as one dark blob with no
     readable mechanism in it. A forklift is only recognisable if the MAST and
     FORKS separate from the body, so those get the light value and the rolling
     parts keep the darkest. Still all charcoal — the row's machinery rule. */
  const steelLt = own(new THREE.MeshStandardMaterial({
    color: "#7E8792", metalness: 0.7, roughness: 0.44, transparent: true, opacity: 0,
  }));
  const palletM = own(new THREE.MeshStandardMaterial({
    color: "#8A6E45", metalness: 0, roughness: 0.9, transparent: true, opacity: 0,
  }));
  /* Mid blue for the stock in the racking — cargo sits between the near-white
     panel and the darker overlay in value, the rule that holds across the row. */
  const brushedN = own(makeMetal({ base: "#9AA0A8", kind: "brushed", metalness: 0.7, rough: 0.45 }).material);
  const crateM = own(tintMetal(brushedN, "#8CBBDD", { metalness: 0.3 }));

  // kraft board, from the shared cache — the same two canvases Factory uses
  const kraftSide = own(new THREE.MeshStandardMaterial({
    map: cardboardSide(), metalness: 0, roughness: 0.94, envMapIntensity: 0.18,
    transparent: true, opacity: 0,
  }));
  const kraftTop = own(new THREE.MeshStandardMaterial({
    map: cardboardTop(), metalness: 0, roughness: 0.94, envMapIntensity: 0.18,
    transparent: true, opacity: 0,
  }));
  const kraft = faces(kraftSide, kraftTop, kraftSide);

  const FLOOR = -0.95;

  /* ---- racking, as BACKDROP only ----
     Pushed to z=-2.7 and given four uprights, three beam levels and stocked
     bays — the two-legged, near-empty frame read as scaffolding, not storage;
     a rack is only a rack when the steel encloses stock. The previous
     version made the rack the subject and it could not carry a scene on its
     own; here it is doing the one job it is good at, which is saying "this is
     a warehouse" behind the thing that is actually happening. */
  const RACK_Z = -2.7;
  const BAY = 2.5;
  // four uprights bounding three bays — the old three left both beam ends
  // cantilevered into air, which is what read as "missing legs"
  for (const x of [-BAY * 1.5, -BAY * 0.5, BAY * 0.5, BAY * 1.5]) {
    const u = metalBox(0.14, 3.5, 0.14, steel);
    u.position.set(x, FLOOR + 1.75, RACK_Z);
    g.add(u);
  }
  // two pallet levels plus a top cap rail, so the frame closes like a shed bay
  for (const y of [FLOOR + 1.15, FLOOR + 2.3, FLOOR + 3.45]) {
    const beam = metalBox(BAY * 3 + 0.3, 0.11, 0.09, steel);
    beam.position.set(0, y, RACK_Z);
    g.add(beam);
  }
  /* Stock in six of nine slots — ground level counts. A rack with one box is
     scaffolding; a rack mostly full with one gap is a working store. */
  const rackLoadGeo = new THREE.BoxGeometry(1.7, 0.62, 0.8);
  const SLOTS: readonly (readonly [number, number, number])[] = [
    [-BAY, 0, 1], [0, 0, 0], [BAY, 0, 1],
    [-BAY, 1, 0], [BAY, 1, 1],
    [-BAY, 2, 1],
  ];
  for (const [rx, lvl, crate] of SLOTS) {
    const base = lvl === 0 ? FLOOR : lvl === 1 ? FLOOR + 1.21 : FLOOR + 2.36;
    const m = crate ? new THREE.Mesh(rackLoadGeo, crateM) : new THREE.Mesh(rackLoadGeo, kraft);
    m.position.set(rx, base + 0.31, RACK_Z);
    g.add(m);
  }

  const ground = draftingGround({ size: 30, y: FLOOR - 0.01, step: 1.2, opacity: 0.13 });
  g.add(ground.mesh);

  /* ---- the fixed camera over the aisle ----
     Cantilevered off the racking, looking straight down at ONE spot. A fixed
     camera over a fixed spot is why the sight cone can be static here, unlike
     the rack version where the camera had to sweep nine slots. The truck stops
     IN the cone, which states the whole arrangement without a word: this camera
     watches this spot, and anything that comes through it gets counted. */
  const CAM_X = 0, CAM_Y = 2.62;
  const boomZ = metalBox(0.11, 0.11, 2.6, steel);
  boomZ.position.set(CAM_X, CAM_Y + 0.2, RACK_Z / 2);
  g.add(boomZ);
  const camBody = metalBox(0.42, 0.28, 0.48, dark);
  camBody.position.set(CAM_X, CAM_Y, 0);
  g.add(camBody);
  const camLens = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.15, 14), dark);
  camLens.position.set(CAM_X, CAM_Y - 0.2, 0);
  g.add(camLens);

  /* ---- the truck ----
     Built in its own group, forks forward (+x), so the tick only ever sets
     `truck.position.x`. Dimensions are deliberately a little under-scaled
     against the pallet: at true proportions a counterbalance truck is nearly
     twice the height of its load, and the load is what has to be legible. */
  const truck = new THREE.Group();
  g.add(truck);

  const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.24, 12);
  for (const [wx, wr] of [[-0.75, 0.26], [0.55, 0.32]] as const) {
    for (const wz of [-0.46, 0.46]) {
      const w = new THREE.Mesh(wheelGeo, dark);
      w.rotation.x = Math.PI / 2;
      w.scale.setScalar(wr / 0.3);
      w.position.set(wx, FLOOR + wr, wz);
      truck.add(w);
    }
  }
  const body = metalBox(2.0, 0.72, 1.05, steelLt);
  body.position.set(-0.18, FLOOR + 0.72, 0);
  body.castShadow = true;
  truck.add(body);
  const counterweight = metalBox(0.62, 0.62, 0.98, dark);
  counterweight.position.set(-1.16, FLOOR + 0.6, 0);
  truck.add(counterweight);
  const backrest = metalBox(0.42, 0.55, 0.72, dark);
  backrest.position.set(-0.62, FLOOR + 1.35, 0);
  truck.add(backrest);
  // overhead guard — the cage that makes a forklift unmistakably a forklift
  for (const px of [0.34, -0.94]) {
    for (const pz of [-0.44, 0.44]) {
      const post = metalBox(0.08, 1.35, 0.08, steel);
      post.position.set(px, FLOOR + 1.78, pz);
      truck.add(post);
    }
  }
  const guard = metalBox(1.5, 0.08, 1.05, steel);
  guard.position.set(-0.3, FLOOR + 2.46, 0);
  truck.add(guard);
  // mast and carriage
  for (const mz of [-0.4, 0.4]) {
    const rail = metalBox(0.12, 2.15, 0.12, steel);
    rail.position.set(0.95, FLOOR + 1.1, mz);
    truck.add(rail);
  }
  const FORK_Y = FLOOR + 0.42;
  /* CARRIAGE, FORKS AND LOAD IN ONE GROUP, so the tick sets ONE number to lift
     the whole assembly up the mast. They were three loose children of `truck`
     before, which is fine for a statue and useless for a machine: a forklift
     that never moves its forks is a shape that resembles a forklift. Everything
     inside is positioned in truck-space exactly as it was, so forkRig sitting
     at the origin leaves the built pose identical. The mast rails, body, wheels
     and guard stay direct children of `truck` — they must NOT rise. */
  const forkRig = new THREE.Group();
  truck.add(forkRig);
  const carriage = metalBox(0.13, 0.5, 0.95, steelLt);
  carriage.position.set(1.02, FORK_Y + 0.32, 0);
  forkRig.add(carriage);
  for (const fz of [-0.34, 0.34]) {
    const fork = metalBox(1.15, 0.08, 0.13, steel);
    fork.position.set(1.62, FORK_Y, fz);
    forkRig.add(fork);
  }

  /* the load: a pallet and SIX cartons, three across and two high, so every
     carton is visible from the front. Six because the tally has to have one
     tick per carton and six ticks is the most that reads as countable at a
     glance rather than as a texture. */
  /* The load is its OWN GROUP inside the truck, not loose children of it. The
     "this pallet is being counted" bracket has to track the load and nothing
     else — tracked against the truck it would draw a box round the whole
     vehicle, mast and counterweight included. */
  const LOAD_DX = 1.58;
  const load = new THREE.Group();
  load.position.set(LOAD_DX, 0, 0);
  forkRig.add(load);

  const pallet = metalBox(1.78, 0.12, 0.88, palletM);
  pallet.position.set(0, FORK_Y + 0.1, 0);
  load.add(pallet);

  const CT = { w: 0.52, h: 0.5, d: 0.72 };
  const cartonGeo = new THREE.BoxGeometry(CT.w, CT.h, CT.d);
  const cartons: THREE.Mesh[] = [];
  // count order: bottom row left to right, then top row — the way a person counts
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const c = new THREE.Mesh(cartonGeo, kraft);
      c.position.set(
        (col - 1) * (CT.w + 0.03),
        FORK_Y + 0.16 + CT.h / 2 + row * (CT.h + 0.02),
        0,
      );
      c.rotation.y = ((col + row) % 3 - 1) * 0.03;
      c.castShadow = true;
      load.add(c);
      cartons.push(c);
    }
  }

  /* ---- the vision layer ---- */
  const dm = detectMaterials();
  mats.push(...dm.all);

  /* the sight cone, static, from the lens down to the spot the truck stops in */
  const coneGeo = new THREE.BufferGeometry();
  coneGeo.setAttribute("position", new THREE.Float32BufferAttribute([
    CAM_X - 0.1, CAM_Y - 0.28, 0,
    CAM_X + 0.1, CAM_Y - 0.28, 0,
    CAM_X + 1.15, FLOOR + 0.15, 0,
    CAM_X - 1.15, FLOOR + 0.15, 0,
  ], 3));
  coneGeo.setIndex([0, 3, 2, 0, 2, 1]);
  const coneM = own(new THREE.MeshBasicMaterial({
    color: "#2E86BE", transparent: true, opacity: 0, toneMapped: false,
    depthWrite: false, side: THREE.DoubleSide, userData: { max: 0.1, tier: "presence" },
  }));
  g.add(new THREE.Mesh(coneGeo, coneM));

  /* THE TALLY — one tick per carton, filling upward beside the load. This is
     the only thing in the row that states a QUANTITY, which is the warehouse
     claim. Deliberately chunky: 0.055 thick and 0.3 long against the bracket
     stroke of 0.065, so it reads as a gauge rather than as more bracket. */
  const N = cartons.length;
  const tally = new THREE.Group();
  const tallyTicks: THREE.Mesh[] = [];
  const tickGeo = new THREE.PlaneGeometry(0.3, 0.055);
  for (let i = 0; i < N; i++) {
    const t = new THREE.Mesh(tickGeo, dm.faint);
    t.position.set(0, i * 0.135, 0);
    tally.add(t);
    tallyTicks.push(t);
  }
  g.add(tally);

  /* One bracket on the WHOLE LOAD (secondary — "this pallet is the thing being
     counted") and one on the carton being counted right now (accent). Not six
     accumulating brackets: the tally is what records progress, and six brackets
     plus a tally would be saying the same thing twice at 280px. */
  const loadDet = createTracker(dm.faint, { pad: 1.14 });
  const cartonDet = createTracker(dm.accent);
  g.add(loadDet.group);
  g.add(cartonDet.group);

  /* choreography — the gantry's shape, because it wraps cleanly:
       0.00-0.28  drive in from off-frame left to the stop mark
       0.28-0.34  settle
       0.34-0.70  the count, one carton per 0.06
       0.70-0.80  hold, all six counted
       0.80-1.00  drive on and out to off-frame right
     STOP_X puts the LOAD under the camera, not the truck — the load is what is
     being counted, and it sits 1.58 ahead of the truck's origin. */
  const TRAVEL = 8.0;
  const STOP_X = CAM_X - LOAD_DX;
  const es = (t: number) => t * t * (3 - 2 * t);
  const seg = (p: number, a: number, b: number) => es(clamp01((p - a) / (b - a)));

  let counted = 0;

  return {
    group: g,
    focus: new THREE.Vector3(CAM_X, FORK_Y + 0.5, 0),
    materials: mats,
    marks: [loadDet, cartonDet],
    ground: { setOpacity: (o) => setGroundOpacity(ground, o) },
    tick: (p) => {
      /* THE DEAD TIME IS OUT OF THE APPROACH AND THE DEPARTURE, not out of the
         count. The old split spent 0.28 of the loop driving in and 0.20 driving
         out, and the count did not start until 0.34 — so of a 9.5s loop, 4.6s
         had no truck on the bay and nothing being counted. The drive-in is now
         0.14 and the drive-out 0.16, and the loop period came down with them
         (9.5s -> 8.2s in index.tsx) so the count itself still ticks at the same
         real cadence: 0.07 x 8.2s = 0.574s per carton, against 0.06 x 9.5s =
         0.570s before. The bay is empty for 0.24 of the loop instead of 0.48 —
         a beat between trucks rather than a wait. */
      truck.position.x =
        p < 0.14 ? STOP_X - TRAVEL + TRAVEL * seg(p, 0, 0.14)
          : p < 0.74 ? STOP_X
            : STOP_X + TRAVEL * seg(p, 0.74, 0.90);

      /* THE TRUCK DOES SOMETHING NOW. It used to drive in, stand still while the
         overlay counted, and drive out — the only moving part in the card was
         the camera, so the machine was a prop the count happened next to. It
         now PRESENTS the load: forks up while the count runs, held at height
         through the resolve, down again before the wrap.

           0.20-0.45  raise 0.55  (0.25 x 8.2s = 2.05s)
           0.45-0.62  held up, which is where the count completes (0.60)
           0.62-0.88  lower back                          (0.26 x 8.2s = 2.13s)

         Both moves are over 2s and 0.55 world units, comfortably above the
         ~0.4-unit / ~1.5s floor for a 320px card. Expressed as a DIFFERENCE OF
         TWO RAMPS, so p<0.20 and p>=0.88 both evaluate to exactly 0 and the
         wrap cannot leave the forks anywhere but down.

         0.55 is what the mast has room for: the top cartons' faces sit at
         FLOOR+1.60, and the mast rails top out at FLOOR+2.175 — 0.575 of
         travel available, so the load stops 0.025 shy of the rail heads rather
         than growing through them. */
      const LIFT = 0.55;
      forkRig.position.y = LIFT * (seg(p, 0.20, 0.45) - seg(p, 0.62, 0.88));

      /* The count is a function of p ALONE, so it cannot drift and needs no
         state. It returns to zero at 0.92, by which point the truck has driven
         far enough right that the tally is outside the frame — the reset is
         never seen, which is the same trick the gantry uses for its wrap. */
      counted =
        p < 0.18 ? 0
          : p < 0.60 ? Math.min(N, Math.floor((p - 0.18) / 0.07) + 1)
            : p < 0.92 ? N
              : 0;

      /* The tally counts in BLUE and resolves in ORANGE. While it is filling,
         the machine is still observing; the moment every carton is accounted for
         the whole column turns to the conclusion colour — that is the payoff
         beat, and it is this card's one orange event per loop. */
      const complete = counted >= N;
      for (let i = 0; i < N; i++) {
        tallyTicks[i].visible = i < counted;
        tallyTicks[i].material = complete ? dm.warn : i === counted - 1 ? dm.accent : dm.faint;
      }
      /* The tally rides IN FRONT of the load, not level with it. At z=0 and
         only 0.06 clear of the pallet edge it was rendering inside the cartons
         and was invisible — a billboarded flat graphic still lives at a real
         depth in the world. 1.32 clear in x, 0.95 forward in z. */
      /* and it RIDES THE LIFT too. The tally is a gauge on the load, not a
         marker on the aisle: pinned to FORK_Y while the load climbed 0.55 it
         would have drifted down to the pallet's underside by the time the
         count resolved, and a quantity readout that is not level with the
         thing it counts stops reading as attached to it. */
      tally.position.set(truck.position.x + LOAD_DX + 1.32, FORK_Y + 0.46 + forkRig.position.y, 0.95);
      tally.visible = counted > 0;
    },
    trackers: (camera) => {
      // the pallet load as a whole, but only while it is actually being read —
      // and its bracket resolves to the conclusion colour on completion
      loadDet.setMaterial(counted >= N ? dm.warn : dm.faint);
      loadDet.follow(counted > 0 ? load : null, camera);
      cartonDet.follow(counted > 0 && counted <= N ? cartons[counted - 1] : null, camera);
      tally.quaternion.copy(camera.quaternion);
    },
    /* Cardboard textures are CACHED and shared with the Factory card —
       disposing them here would pull them out from under that scene. */
    dispose: () => {
      mats.forEach((m) => m.dispose());
      ground.material.dispose();
      rackLoadGeo.dispose();
      cartonGeo.dispose();
      coneGeo.dispose();
      tickGeo.dispose();
      wheelGeo.dispose();
    },
  };
}

/* 03 · Viso Factory — a mixed line, one camera, and an arm that pulls the bad one.

   SECOND REWRITE. The first got the station right and three things wrong:

     · THE BELT HAD ENDS IN FRAME. It was 7.0 long against a ~12-unit visible
       span once the camera's lateral track is counted, so the conveyor stopped
       inside the picture and the whole thing read as a tabletop model. It is
       now 15.0 — past the frame at both extremes at every point in the track —
       and the units wrap at +-7.0, which is off-frame, so nothing pops.
     · EVERY UNIT WAS THE SAME OBJECT. Seven identical machined blocks in three
       shades of blue is not a production line, it is a colour swatch. The line
       now carries KRAFT CARTONS and BLUE CRATES alternately. The cardboard
       skins are the ones the Warehouse card already generates, and they are
       cached, so real corrugated board costs nothing here.
     · THE ARM DID NOTHING AND COULD NOT BE SEEN. It nodded on a timer, in the
       dark finish, against a near-black backdrop. It is now light machined grey
       — the only pale machinery in the frame — and it has a JOB: it dips onto
       each carton as it arrives, and the one carrying a defect gets marked and
       flagged as the arm passes over it. The flag has a visible cause.

   UNIT COLOUR NO LONGER CARRIES STATE, AT ALL. The old scene stepped each unit
   through three blues as it passed the camera. Two problems: real boxes do not
   change colour, and the end of the ramp was the accent colour itself, so
   overlays drawn on a finished unit vanished. State is now carried entirely by
   the DETECTION LAYER, which is what it is for — nothing upstream of the
   camera, a dimension gauge on the unit being read, faint brackets on
   everything downstream, and a warn bracket on the one the arm pulled. That
   reads left to right in one glance and it deleted three materials.

   PERIODICITY. Travel is `p * SPAN`, so every unit returns to its own start.
   Every piece of state — which unit is in the zone, where the arm is, whether
   the defect chip shows — is derived from POSITION, never accumulated, so the
   loop cannot drift or pop. The flagged carton starts upstream of the arm
   station, so its chip is off at p=0 and off again after it wraps. */
export function factorySubject(): CardSubject {
  const _t0 = performance.now();
  const g = new THREE.Group();
  const mats: THREE.Material[] = [];
  const met = (base: string, kind: Parameters<typeof makeMetal>[0]["kind"], metalness: number, rough: number) => {
    const m = makeMetal({ base, kind, metalness, rough }).material;
    mats.push(m);
    return m;
  };
  const own = <T extends THREE.Material>(m: T) => { mats.push(m); return m; };

  /* FOUR finishes generated, six materials used. `makeMetal` bakes the base
     colour into its albedo, so every colour asked of it costs an albedo, a
     roughness canvas and a Sobel normal pass. Each finish is generated ONCE in
     neutral grey and tinted with `tintMetal`, which clones the material and
     shares all three maps. */
  const frameM = met("#575F68", "galv", 0.8, 0.45);      // charcoal line frame
  const darkM = met("#31373E", "plate", 0.55, 0.72);     // belt, camera, tooling
  const brushedN = met("#9AA0A8", "brushed", 0.7, 0.45);
  const paintedN = met("#9AA0A8", "painted", 0.4, 0.58);

  /* Separation is carried by COLOUR alone: pale machined arm, charcoal line,
     kraft board and mid-blue crates. Nothing here is as bright as the overlay
     drawn on top of it, which is the rule the old bright-blue "cleared" state
     broke. */
  const armM = own(tintMetal(brushedN, "#7E8792"));      // the arm
  /* Crates are DESATURATED pale steel-blue, not a saturated blue. Making the
     cargo light (as it must be, to stop the card reading dark-on-dark) puts it
     in direct competition with a light-blue overlay, and a #5CC8FF hairline on
     a #7FB4D8 box has almost no separation. The fix is to separate on
     SATURATION rather than lightness: pale near-grey items, and an overlay that
     is the only saturated cyan in the frame. */
  const crateM = own(tintMetal(brushedN, "#8CBBDD"));    // plastic crates
  const flagM = own(tintMetal(paintedN, PALETTE.warn));  // the only warm thing
  const zoneM = own(tintMetal(paintedN, "#2E86BE", { metalness: 0.25 }));

  /* ---- the line, end to end ---- */
  const BELT_L = 15.0, BELT_Y = -0.55;
  const BELT_TOP = BELT_Y + 0.08;
  const belt = metalBox(BELT_L, 0.16, 1.5, darkM);
  belt.position.set(0, BELT_Y, 0);
  belt.receiveShadow = true;
  g.add(belt);
  for (const z of [-0.84, 0.84]) {
    const rail = metalBox(BELT_L, 0.1, 0.1, frameM);
    rail.position.set(0, BELT_Y + 0.13, z);
    g.add(rail);
  }
  /* ONE shared roller geometry. Spacing is 1.0 rather than the old 0.78: over a
     belt twice as long, the tighter pitch became a picket fence of two-pixel
     stripes — noise on the belt instead of rollers. */
  const rollGeo = new THREE.CylinderGeometry(0.085, 0.085, 1.42, 8);
  for (let x = -BELT_L / 2 + 0.5; x < BELT_L / 2; x += 1.0) {
    const r = new THREE.Mesh(rollGeo, frameM);
    r.rotation.x = Math.PI / 2;
    r.position.set(x, BELT_Y + 0.05, 0);
    g.add(r);
  }
  for (const x of [-6, -3, 0, 3, 6]) {
    const leg = metalBox(0.14, 1.1, 0.14, frameM);
    leg.position.set(x, BELT_Y - 0.62, 0.55);
    g.add(leg);
  }

  // held quieter than the shared 0.16: this camera sits low, so the floor is
  // seen very obliquely and the grid rakes almost to the horizon
  const ground = draftingGround({ size: 34, y: -0.72, step: 1.0, opacity: 0.1 });
  g.add(ground.mesh);

  /* ---- the inspection station ----
     ONE camera, per the product's own claim that count, SKU and condition come
     off the same camera in the same pass. Upstream of the arm, because the
     order matters: the camera finds the defect, then the arm acts on it. */
  const ZONE_X = -2.2, ZONE_W = 1.5;
  const MAST_Z = -0.9;
  const mast = metalBox(0.14, 2.5, 0.14, frameM);
  mast.position.set(ZONE_X + 1.9, 0.75, MAST_Z);
  g.add(mast);
  const armX = metalBox(1.95, 0.13, 0.13, frameM);
  armX.position.set(ZONE_X + 0.92, 1.94, MAST_Z);
  g.add(armX);
  const armZ = metalBox(0.13, 0.13, 0.95, frameM);
  armZ.position.set(ZONE_X, 1.94, MAST_Z / 2);
  g.add(armZ);
  const camBody = metalBox(0.44, 0.3, 0.5, darkM);
  camBody.position.set(ZONE_X, 1.78, 0);
  g.add(camBody);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.16, 14), darkM);
  lens.position.set(ZONE_X, 1.58, 0);
  g.add(lens);

  // the detection zone, painted on the belt as the outline it looks into
  for (const dx of [-ZONE_W / 2, ZONE_W / 2]) {
    const e = metalBox(0.05, 0.02, 1.4, zoneM);
    e.position.set(ZONE_X + dx, BELT_Y + 0.09, 0);
    g.add(e);
  }
  for (const dz of [-0.7, 0.7]) {
    const e = metalBox(ZONE_W, 0.02, 0.05, zoneM);
    e.position.set(ZONE_X, BELT_Y + 0.09, dz);
    g.add(e);
  }

  /* THE SIGHT CONE — the schematic's dashed line from camera to subject, as a
     volume. Cheapest large legibility win in this whole card: one four-vertex
     quad. Without it a camera on a stick is a prop; with it the frame states
     what the camera can see and why the zone is where it is. Held at 0.09
     because it covers real area — bright enough to read as light, never bright
     enough to compete with the box inside it. */
  const coneTopY = 1.5, coneBotY = BELT_TOP + 0.02, coneTopW = 0.1;
  const coneGeo = new THREE.BufferGeometry();
  coneGeo.setAttribute("position", new THREE.Float32BufferAttribute([
    ZONE_X - coneTopW, coneTopY, 0,
    ZONE_X + coneTopW, coneTopY, 0,
    ZONE_X + ZONE_W / 2, coneBotY, 0,
    ZONE_X - ZONE_W / 2, coneBotY, 0,
  ], 3));
  coneGeo.setIndex([0, 3, 2, 0, 2, 1]);
  const coneM = own(new THREE.MeshBasicMaterial({
    color: "#8FDCFF", transparent: true, opacity: 0, toneMapped: false,
    depthWrite: false, side: THREE.DoubleSide, userData: { max: 0.09, tier: "presence" },
  }));
  g.add(new THREE.Mesh(coneGeo, coneM));

  /* ---- the units: kraft cartons and blue crates ----
     The cardboard skins are the SAME cached canvases the Warehouse card
     generates (see skins.ts) — using real corrugated board here is free.
     Cartons cannot be recoloured by material.color (blue x kraft = olive, the
     documented trap), which is fine: cartons are never recoloured. They are
     board, and board looks like board. */
  const cardMat = (map: THREE.Texture) => {
    const m = new THREE.MeshStandardMaterial({
      map, metalness: 0.0, roughness: 0.94, envMapIntensity: 0.18,
      transparent: true, opacity: 0,
    });
    mats.push(m);
    return m;
  };
  const kraft = faces(cardMat(cardboardSide()), cardMat(cardboardTop()), cardMat(cardboardSide()));

  /* THE FLAGGED CARTON TURNS INTO AN ORANGE BOX.

     A 0.4 x 0.05 chip on the top face was the old flag, and at 280px it was a
     two-pixel smear — the "transition to orange" was technically happening and
     was invisible. The conclusion has to land on the WHOLE OBJECT: when the arm
     passes over the bad carton, the carton itself goes signal orange.

     Recoloured through skins.ts's HSL "color" composite, NOT a material.color
     tint — orange multiplied into kraft brown gives a dark burnt sludge, while
     the composite replaces hue and saturation and keeps the board's luminance,
     so the flutes, seams and FRAGILE print all survive. It reads as a carton
     that has been marked, which is the point, rather than an orange brick.
     Costs two cached canvases, and it is the payoff beat of the card. */
  const flagBoard = faces(
    cardMat(cardboardSide(SIGNAL_ORANGE)),
    cardMat(cardboardTop(SIGNAL_ORANGE)),
    cardMat(cardboardSide(SIGNAL_ORANGE)),
  );

  const CARTON = { w: 0.92, h: 0.68, d: 0.8 };
  const CRATE = { w: 1.02, h: 0.56, d: 0.86 };
  // one shared BoxGeometry per kind. Cartons need a BoxGeometry rather than
  // metalBox's RoundedBoxGeometry: rounded boxes have a single material group,
  // so a six-material face array would not bind.
  const cartonGeo = new THREE.BoxGeometry(CARTON.w, CARTON.h, CARTON.d);

  const UNIT_N = 7, PITCH = 2.0, SPAN = UNIT_N * PITCH;
  /* The flagged unit must be a CARTON (odd index) and must START UPSTREAM of
     the arm station, or its defect chip would already be lit at p=0 and the
     loop would not be periodic. Index 3 starts at x=-1.0, the station is at
     ~1.4 — upstream, as required. */
  const FLAGGED = 3;
  const isCarton = (i: number) => i % 2 === 1;

  const units: { grp: THREE.Group; body: THREE.Mesh; carton: boolean; flagged: boolean }[] = [];
  for (let i = 0; i < UNIT_N; i++) {
    const grp = new THREE.Group();
    const carton = isCarton(i);
    let body: THREE.Mesh;
    if (carton) {
      body = new THREE.Mesh(cartonGeo, kraft);
      // a hand-packed line is never perfectly square
      body.rotation.y = (i % 3 - 1) * 0.05;
      grp.position.y = BELT_TOP + CARTON.h / 2;
    } else {
      body = metalBox(CRATE.w, CRATE.h, CRATE.d, crateM);
      grp.position.y = BELT_TOP + CRATE.h / 2;
    }
    body.castShadow = true;
    grp.add(body);
    g.add(grp);
    units.push({ grp, body, carton, flagged: i === FLAGGED });
  }

  /* ---- the arm ----
     Straight from the schematic: base, column, angled upper link, forearm,
     end effector. Built in its own root group so the whole assembly can yaw
     toward the belt — the base sits BEHIND the line at z=-1.15, and a yaw of
     0.624rad is what swings a 1.97-long reach out over the belt centre:
     1.97 x sin(0.624) = 1.15. The head therefore lands at

         STATION_X = ARM_X - 1.97 x cos(0.624) = ARM_X - 1.60

     which is where the engagement window and the flag threshold both key off.
     Get that arithmetic wrong and the arm dips onto empty belt. */
  const ARM_X = 3.0, ARM_Z = -1.15, ARM_YAW = 0.624;
  const STATION_X = ARM_X - 1.6;
  const armRoot = new THREE.Group();
  armRoot.position.set(ARM_X, BELT_Y - 0.02, ARM_Z);
  armRoot.rotation.y = ARM_YAW;
  g.add(armRoot);
  const armBase = metalBox(0.6, 0.22, 0.6, frameM);
  armBase.position.y = 0.11;
  armRoot.add(armBase);
  const column = metalBox(0.26, 1.5, 0.26, armM);
  column.position.y = 0.95;
  armRoot.add(column);
  const shoulder = new THREE.Group();
  shoulder.position.y = 1.72;
  armRoot.add(shoulder);
  const upper = metalBox(1.25, 0.18, 0.18, armM);
  upper.position.x = -0.625;
  shoulder.add(upper);
  const elbow = new THREE.Group();
  elbow.position.x = -1.25;
  shoulder.add(elbow);
  const fore = metalBox(0.95, 0.15, 0.15, armM);
  fore.position.x = -0.475;
  elbow.add(fore);
  // the tool itself is dark — it is an instrument, not structure
  const tool = metalBox(0.34, 0.28, 0.3, darkM);
  tool.position.set(-0.95, -0.12, 0);
  elbow.add(tool);
  /* Poses, worked out rather than dialled in. Positive z-rotation swings the
     -x arm DOWNWARD. At rest the tool sits at y~1.22, clear above everything;
     at full engagement shoulder 0.62 / elbow -0.62 puts it at y~0.30, just
     above a carton's 0.21 top face. */
  const SH_REST = 0.15, SH_DOWN = 0.62;
  const EL_REST = -0.55, EL_DOWN = -0.62;

  /* ---- THE FLAG NOW HAS A CONSEQUENCE ----
     Marking the bad carton and then letting it ride the belt on with everything
     else is an inspection that decides nothing. The flagged unit is now NUDGED
     OFF-LINE — pushed toward the camera in +z — and it keeps that offset for the
     rest of its run down the belt, so the frame carries the evidence that
     something was actually rejected rather than merely noticed.

     Every number is derived from the position math above, not dialled in, so
     the divert cannot drift out of sync if PITCH, SPAN or ARM_X move:

       FLAG_X0    = -SPAN/2 + FLAGGED*PITCH = -7 + 3*2   = -1.0   (its x at p=0)
       x(p)       = FLAG_X0 + p*SPAN                              (until it wraps)
       PRESS_P    = (STATION_X - FLAG_X0)/SPAN = (1.4+1)/14 = 0.171
                    — the arm's tool is directly on it here (dx = 0, engage = 1)
       WRAP_P     = (SPAN/2 - FLAG_X0)/SPAN    = 8/14      = 0.571
                    — where `while (x > SPAN/2) x -= SPAN` fires

     The shift runs PRESS_P + 0.05 -> +0.08, i.e. 0.221 -> 0.301, finishing 0.27
     of loop before the wrap — well clear of the 0.1 margin, so no rescheduling
     was needed. 0.08 x 14s = 1.1s for a 0.55-unit slide: the shortest new move
     in the row, and deliberately so, because a nudge is an impulse and easing
     it over 2s would read as the carton drifting rather than being pushed.

     THE RESET IS THE WRAP ITSELF. The offset is gated on `p < WRAP_P` and the
     x wrap fires at exactly WRAP_P, so the carton returns to the belt start
     already back on the centreline, in the same frame, off-screen at x=-7. */
  const FLAG_X0 = -SPAN / 2 + FLAGGED * PITCH;
  const FLAG_PRESS_P = (STATION_X - FLAG_X0) / SPAN;
  const FLAG_WRAP_P = (SPAN / 2 - FLAG_X0) / SPAN;
  const DIVERT_A = FLAG_PRESS_P + 0.05, DIVERT_B = FLAG_PRESS_P + 0.13, DIVERT_Z = 0.55;
  const es = (t: number) => t * t * (3 - 2 * t);
  const seg = (p: number, a: number, b: number) => es(clamp01((p - a) / (b - a)));

  /* ---- the vision layer ---- */
  _deep("factory:mats+geom", _t0);
  const dm = detectMaterials();
  mats.push(...dm.all);

  // scratch, built once — never reallocated per frame
  const xs: number[] = new Array(UNIT_N).fill(0);
  const downstream: number[] = [];

  /* Four brackets, for the units DOWNSTREAM of the camera. Upstream units
     deliberately carry nothing: a unit the camera has not reached yet is not
     yet known, and showing that is the cheapest way to make the frame read
     left-to-right as a process rather than as a row of decorated boxes. */
  const DET_N = 3;
  const dets = Array.from({ length: DET_N }, () => createTracker(dm.faint));
  dets.forEach((t) => g.add(t.group));

  // a vertical scan bar standing at the zone; its opacity pulses as the
  // nearest unit crosses it
  const zoneScan = scanPlane(1.6, dm.scan, 0.05);
  zoneScan.position.set(ZONE_X, BELT_TOP + 0.5, 0);
  g.add(zoneScan);

  /* THE DIMENSION GAUGE — the schematic's actual callout ("INSPECT · DIMENSION
     CHECK"), which the scene never had. Width across the top, height up the
     side, on whichever unit is inside the zone. This is what makes the station
     read as MEASURING rather than as a light shining on a box, and it is six
     thin planes. Sized to the carton, which is the larger of the two kinds. */
  const gauge = new THREE.Group();
  const gaugeBar = (w: number, h: number, x: number, y: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), dm.accent);
    m.position.set(x, y, 0);
    gauge.add(m);
  };
  const GT = 0.032, GW = CARTON.w, GH = CARTON.h;
  const wy = GH / 2 + 0.24;
  gaugeBar(GW, GT, 0, wy);
  gaugeBar(GT, 0.24, -GW / 2, wy);
  gaugeBar(GT, 0.24, GW / 2, wy);
  // height gauge kept CLOSE — at 0.30 it sat out in the gap to the next unit
  // and read as an unrelated floating bar rather than as a measurement
  const hx = GW / 2 + 0.18;
  gaugeBar(GT, GH, hx, 0);
  gaugeBar(0.2, GT, hx, -GH / 2);
  gaugeBar(0.2, GT, hx, GH / 2);
  g.add(gauge);

  _deep("factory:detect", _t0);

  let inZone = -1;
  let flagLit = false;
  const clampAbs = (v: number, lim: number) => Math.max(-lim, Math.min(lim, v));

  return {
    group: g,
    focus: new THREE.Vector3(ZONE_X, 0.4, 0.7),
    materials: mats,
    marks: dets,
    ground: { setOpacity: (o) => setGroundOpacity(ground, o) },
    tick: (p) => {
      const travel = p * SPAN;
      inZone = -1;
      downstream.length = 0;

      for (let i = 0; i < UNIT_N; i++) {
        let x = -SPAN / 2 + i * PITCH + travel;
        while (x > SPAN / 2) x -= SPAN;
        xs[i] = x;
        units[i].grp.position.x = x;

        const d = x - ZONE_X;
        if (Math.abs(d) <= ZONE_W / 2) inZone = i;
        else if (d > 0) downstream.push(i);
      }
      /* the divert — see the derivation at DIVERT_A. Written on the group, so
         the bracket that tracks this unit follows it off-line automatically. */
      units[FLAGGED].grp.position.z = p < FLAG_WRAP_P ? DIVERT_Z * seg(p, DIVERT_A, DIVERT_B) : 0;

      // nearest downstream first, so the brackets cluster around the station
      // rather than on whatever happens to be at the far end of the belt
      downstream.sort((a, b) => xs[a] - xs[b]);

      /* THE ARM'S JOB. It engages with the nearest CARTON to its station —
         cartons are what it handles — dipping as one arrives and lifting as it
         leaves. Three cartons per loop, so the arm works about every 4.7s
         instead of nodding pointlessly on a timer. Engagement is purely a
         function of that carton's x, so the whole motion is periodic. */
      let nearCarton = -1, nearDx = Infinity;
      for (let i = 0; i < UNIT_N; i++) {
        if (!units[i].carton) continue;
        const dx = xs[i] - STATION_X;
        if (Math.abs(dx) < Math.abs(nearDx)) { nearCarton = i; nearDx = dx; }
      }
      const engage = nearCarton < 0 ? 0 : 1 - clamp01(Math.abs(nearDx) / 1.6);
      const e = engage * engage * (3 - 2 * engage);
      shoulder.rotation.z = SH_REST + (SH_DOWN - SH_REST) * e;
      elbow.rotation.z = EL_REST + (EL_DOWN - EL_REST) * e;
      // and it turns to follow the box it is working on
      armRoot.rotation.y = ARM_YAW + clampAbs(nearDx * 0.25, 0.12) * e;

      /* The defect is marked BY THE ARM, and the whole carton changes. Once the
         tool has passed over it the board swaps to the orange recolour, so the
         flag has a visible cause instead of appearing on a timer, and it is
         legible at card size instead of being a 2px chip. Position-derived, so
         it is off at p=0 and off again once the carton wraps. */
      flagLit = xs[FLAGGED] > STATION_X + 0.3;
      /* EVERY carton lights while the tool is actually on it. The mark is the
         arm's touch, so it has to appear wherever the arm works, not only on the
         one defective unit — otherwise the arm passes over six boxes and marks
         none of them. The flagged carton alone KEEPS the mark after the arm has
         moved on, which is what separates "inspected" from "failed". Still purely
         position-derived (engage and nearCarton are computed above), so the loop
         stays periodic. */
      const pressing = engage > 0.55;
      for (let i = 0; i < UNIT_N; i++) {
        if (!units[i].carton) continue;
        const glow = (i === FLAGGED && flagLit) || (i === nearCarton && pressing);
        units[i].body.material = glow ? flagBoard : kraft;
      }

      // the scan bar brightens as a unit closes on the zone — this runs after
      // the frame's global opacity reset in card-scene.tsx, so it sticks
      let nearZone = Infinity;
      for (let i = 0; i < UNIT_N; i++) nearZone = Math.min(nearZone, Math.abs(xs[i] - ZONE_X));
      dm.scan.opacity = 0.15 + 0.85 * (1 - clamp01(nearZone / (ZONE_W / 2 + 0.6)));

      // the gauge only exists while there is something in the zone to measure
      gauge.visible = inZone >= 0;
    },
    trackers: (camera) => {
      /* THREE TIERS, AND NO UNIT WEARS TWO MARKS AT ONCE. The zone unit is
         marked by the GAUGE alone; brackets belong to the units downstream of
         it; and the flagged carton's bracket goes WARN only once the arm has
         actually marked it. Tracked -> measured -> flagged, three visual
         weights, never stacked on one box. */
      for (let k = 0; k < DET_N; k++) {
        const idx = k < downstream.length ? downstream[k] : -1;
        if (idx < 0) { dets[k].follow(null, camera); continue; }
        const flagged = idx === FLAGGED && flagLit;
        dets[k].setMaterial(flagged ? dm.warn : dm.faint);
        dets[k].follow(units[idx].grp, camera);
      }
      if (inZone >= 0) {
        // the gauge is a flat graphic: it rides the unit's world position and
        // stays square to the viewer, exactly as the brackets do
        const u = units[inZone];
        gauge.position.copy(u.grp.position);
        gauge.quaternion.copy(camera.quaternion);
        /* Sized to the unit it is measuring, not to a fixed guess. Built at
           carton dimensions, so a crate — wider and shorter — got a gauge that
           was visibly narrower and taller than the thing it claimed to be
           measuring, which is the one mistake a dimension graphic cannot make.
           The stroke does distort by 11%/18% under this non-uniform scale;
           that is invisible at 1.7px and worth it for a gauge that fits. */
        gauge.scale.set(
          (u.carton ? CARTON.w : CRATE.w) / CARTON.w,
          (u.carton ? CARTON.h : CRATE.h) / CARTON.h,
          1,
        );
      }
    },
    /* Cardboard textures are CACHED and shared with the Warehouse card —
       disposing them here would pull them out from under that scene. Only the
       materials and the geometry built here are disposed. */
    dispose: () => {
      mats.forEach((m) => m.dispose());
      ground.material.dispose();
      rollGeo.dispose();
      coneGeo.dispose();
      cartonGeo.dispose();
      gauge.children.forEach((c) => (c as THREE.Mesh).geometry.dispose());
    },
  };
}

/* 04 · Viso Data — reaching back through the record to pull one frame out.

   COMPLETE RETHINK. The two previous versions were both a wall of live camera
   feeds with one lit tile, and the execution problems (a barcode of black
   rectangles, then a slab too heavy for the row) were downstream of a concept
   problem that no amount of retuning would have fixed:

       A WALL OF LIVE FEEDS SHOWS MONITORING. THIS CARD IS NOT ABOUT MONITORING.

   The copy underneath reads "Compression, trace & detection AI". A feed wall
   says nothing about compression and nothing about trace — and "watching many
   cameras at once" is Secure Vision's job, which is a different module. Viso
   Data's claim is almost the opposite of live: keep everything, cheaply, then
   reach back into it and retrieve the one moment that matters, bound to a case.

   So the subject is THE RECORD ITSELF, and time runs into DEPTH.

     · a deck of frames receding away from the camera — the archive. Near is
       now, far is the past.
     · SPACING TIGHTENS WITH DEPTH. Recent footage sits apart and readable;
       older footage is squeezed until the far end is a solid wedge. That is
       compression, drawn rather than captioned — retention policy is literally
       "keep recent at full rate, thin the old".
     · a scan travels BACKWARD along the deck — searching the record, not
       watching a screen.
     · it stops, and one frame is pulled sideways out of the deck, turns to
       face you and opens up. That is the trace: a clip retrieved.
     · the case mark lands on it in signal orange. That is the conclusion.
     · then it slides back into the deck, which is what makes the loop
       state-neutral without hiding anything off-frame.

   WHY MOTION INTO DEPTH MATTERS. Yard's gantry crosses laterally, Warehouse's
   truck drives laterally, Factory's belt runs laterally. A fourth card moving
   left-to-right would have read as a third conveyor no matter what was on it.
   This one moves along Z, and that alone separates it in a row of four. */
export function dataSubject(): CardSubject {
  const _t0 = performance.now();
  const g = new THREE.Group();
  const mats: THREE.Material[] = [];
  const own = <T extends THREE.Material>(m: T) => { mats.push(m); return m; };

  /* One generated finish, tinted — and it asks for exactly the neutral brushed
     parameters Warehouse and Factory already build, so it is a cache hit and
     costs nothing. Metalness stays low throughout: these cards run `noEnv`, and
     a metal with nothing to reflect either blows out on edge highlights or goes
     dead (see DECISIONS.md). */
  const brushedN = own(makeMetal({ base: "#9AA0A8", kind: "brushed", metalness: 0.7, rough: 0.45 }).material);
  const frameM = own(tintMetal(brushedN, "#4E565F", { metalness: 0.14 }));
  const darkM = own(tintMetal(brushedN, "#3A4149", { metalness: 0.14 }));
  // two values across the deck so it has grain without any frame standing out
  const recA = own(tintMetal(brushedN, "#B2BBC5", { metalness: 0.14 }));
  const recB = own(tintMetal(brushedN, "#A3ACB6", { metalness: 0.14 }));
  // the retrieved frame: the lightest thing in the deck, still well under the
  // overlay — nothing in a scene may be as bright as the graphics over it
  const clipM = own(tintMetal(brushedN, "#CFDEEA", { metalness: 0.16 }));
  const inkM = own(tintMetal(brushedN, "#5E6A76", { metalness: 0.12 }));

  const FLOOR = -0.95;
  const DECK_Y = 0.12;

  /* ---- the deck: the record, receding into the past ---- */
  const N = 26;
  const FW = 1.62, FH = 1.02, FT = 0.045;
  const PULLED = 9;                      // the frame the trace lands on
  const frameGeo = new THREE.BoxGeometry(FW, FH, FT);

  /* Spacing runs 0.46 at the near end down to 0.13 at the far end. THIS IS THE
     COMPRESSION: the same number of frames occupies less and less depth the
     further back you go, so the far half fuses into a solid wedge while the
     recent end stays separable. Nothing has to say "compressed"; the deck is. */
  const zs: number[] = [];
  let z = 0.75;
  for (let i = 0; i < N; i++) {
    zs.push(z);
    z -= 0.46 - (0.33 * i) / (N - 1);
  }
  const DECK_BACK = zs[N - 1];

  const plates: THREE.Mesh[] = [];
  for (let i = 0; i < N; i++) {
    const m = new THREE.Mesh(frameGeo, i === PULLED ? clipM : (i % 2 ? recA : recB));
    m.position.set(0, DECK_Y, zs[i]);
    m.castShadow = i < 8;              // only the near few — the rest is a wedge
    g.add(m);
    plates.push(m);
  }
  const clip = plates[PULLED];

  /* Content on the retrieved frame, so that when it turns to face you it reads
     as a picture of something rather than a blank card. Invisible while it is
     edge-on in the deck, which is most of the loop, so it costs nothing to
     leave permanently on. */
  const clipArt = new THREE.Group();
  for (const [w, h, x, y] of [[0.5, 0.34, -0.28, -0.1], [0.3, 0.5, 0.3, 0.02], [0.86, 0.07, -0.05, 0.34]] as const) {
    const b = new THREE.Mesh(frameGeo, inkM);
    b.scale.set(w / FW, h / FH, 0.6);
    b.position.set(x, y, FT * 0.8);
    clipArt.add(b);
  }
  clip.add(clipArt);

  // the spine the record is filed along — gives the deck a mechanism to be part
  // of, and stops it reading as a loose stack of paper
  const spine = metalBox(0.16, 0.16, 0.75 - DECK_BACK + 0.6, darkM);
  spine.position.set(0, DECK_Y - FH / 2 - 0.14, (0.75 + DECK_BACK) / 2);
  g.add(spine);
  for (const sz of [0.62, DECK_BACK + 0.25]) {
    const post = metalBox(0.13, 0.9, 0.13, frameM);
    post.position.set(0, FLOOR + 0.45, sz);
    g.add(post);
  }

  /* ---- the reader ----
     A head on a short mast at the near end, looking down the deck. Same visual
     language as Factory's and Warehouse's cameras: this is the thing that made
     the record, and the sight cone is what says so. */
  /* Placed BEHIND the deck (-x) and past its near end, not beside it. The first
     pass stood the mast at x=1.85 — which is between the camera and the deck at
     this azimuth — so a big dark post sat straight across the frames it was
     supposed to be reading. Anything on the +x side of this scene occludes the
     subject. */
  const READ_X = -1.55, READ_Z = 1.75;
  const mast = metalBox(0.13, 1.9, 0.13, frameM);
  mast.position.set(READ_X, FLOOR + 0.95, READ_Z);
  g.add(mast);
  const arm = metalBox(1.4, 0.12, 0.12, frameM);
  arm.position.set(READ_X + 0.7, FLOOR + 1.86, READ_Z);
  g.add(arm);
  /* Head and lens live in one group that is AIMED, not posed. The old lens hung
     straight down off the head, so the reader stared at the floor while its
     sight cone claimed it was reading the deck — the two disagreed. lookAt
     orients the group's +z, so the lens is built pointing along local +z. */
  const readerHead = new THREE.Group();
  readerHead.position.set(READ_X + 1.4, FLOOR + 1.72, READ_Z);
  const head = metalBox(0.38, 0.28, 0.46, darkM);
  readerHead.add(head);
  const lensGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.15, 14);
  const lens = new THREE.Mesh(lensGeo, darkM);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 0, 0.3);
  readerHead.add(lens);
  readerHead.lookAt(0, DECK_Y + FH / 2, zs[8]);
  g.add(readerHead);

  const ground = draftingGround({ size: 30, y: FLOOR - 0.01, step: 1.2, opacity: 0.1 });
  g.add(ground.mesh);

  /* ---- the vision layer ---- */
  _deep("data:mats+geom", _t0);
  const dm = detectMaterials();
  mats.push(...dm.all);

  /* The reader's field of view, dropping onto the near end of the deck.
     "presence" tier — the camera's existence never ramps with hover, only its
     conclusions do. */
  const coneGeo = new THREE.BufferGeometry();
  coneGeo.setAttribute("position", new THREE.Float32BufferAttribute([
    READ_X + 1.32, FLOOR + 1.66, READ_Z,
    READ_X + 1.48, FLOOR + 1.66, READ_Z,
    0.92, DECK_Y + 0.18, 0.35,
    -0.92, DECK_Y + 0.18, 0.35,
  ], 3));
  coneGeo.setIndex([0, 3, 2, 0, 2, 1]);
  const coneM = own(new THREE.MeshBasicMaterial({
    color: "#2E86BE", transparent: true, opacity: 0, toneMapped: false,
    depthWrite: false, side: THREE.DoubleSide, userData: { max: 0.1, tier: "presence" },
  }));
  g.add(new THREE.Mesh(coneGeo, coneM));

  /* THE SEARCH BAR — a bright plane that travels BACKWARD along the deck. It is
     the only thing in any of the four cards that moves along Z, and that is
     deliberate: three lateral conveyors and a fourth would have collapsed
     together. "presence", because a search running is the machine working, not
     a conclusion it has reached. */
  /* A THIN SLICE, not a full card. At FW*1.5 x FH*1.5 and the shared scan alpha
     this rendered as a solid blue rectangle wedged into the deck — it read as
     one more frame, a coloured one, rather than as something passing through.
     A search bar has to be a slice of light: the deck's height, barely wider
     than a frame, and its own low-alpha material so it can be quiet without
     dragging Factory's and Warehouse's scan bars down with it. */
  const scanGeo = new THREE.PlaneGeometry(FW * 1.12, FH * 1.18);
  const scanM = own(new THREE.MeshBasicMaterial({
    color: "#2E86BE", transparent: true, opacity: 0, toneMapped: false,
    depthWrite: false, side: THREE.DoubleSide, userData: { max: 0.2, tier: "presence" },
  }));
  const scan = new THREE.Mesh(scanGeo, scanM);
  scan.position.set(0, DECK_Y, 0.9);
  g.add(scan);

  /* THE QUERY CURSOR — the antecedent the retrieval never had.
     A frame lifted out of the deck at 0.52 answered a question nobody had been
     shown being asked: the wide search slice above says "a search is running",
     but it never RESOLVES on anything, so the clip that pops out could be any
     clip. This is the resolving half — a hairline that walks the deck frame by
     frame and stops dead on the one that is about to lift.

     0.06 wide against the deck's 1.62 frames, so it can only ever read as a
     cursor, never as another plate. Parked at x = FW/2 + 0.12: this rig's
     azimuth (0.52-0.64 rad) puts the camera on the +x side, so just outside the
     deck's +x edge is the one place a thin vertical mark is never buried
     between two frames. Billboarded in trackers() for the same reason the case
     card is — 0.06 of width disappears entirely the moment it turns edge-on. */
  const CUR_W = 0.06;
  const cursorGeo = new THREE.PlaneGeometry(CUR_W, FH * 1.1);
  const cursorM = own(new THREE.MeshBasicMaterial({
    color: "#5CC8FF", transparent: true, opacity: 0, toneMapped: false,
    depthWrite: false, side: THREE.DoubleSide, userData: { max: 0.55, tier: "presence" },
  }));
  const cursor = new THREE.Mesh(cursorGeo, cursorM);
  cursor.position.set(FW / 2 + 0.12, DECK_Y, zs[0]);
  g.add(cursor);

  const det = createTracker(dm.accent);
  g.add(det.group);

  /* The case mark: an orange rule over two grey lines, riding beside the
     retrieved clip. Its own materials, never dm.* — the reveal multiplies
     opacity per frame and dm.warn is shared with the tracker. */
  const caseMat = (color: string, max: number) => own(new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0, toneMapped: false, depthWrite: false,
    userData: { max, tier: "mark" },
  }));
  const caseWarn = caseMat("#ED510C", 1);
  const caseLine = caseMat("#5A6B7A", 0.8);
  /* A RECORD, not a label. Three bars said "something was logged"; a case file
     has fields. Title rule, divider, four label/value rows and a footer badge
     reads as structured data at a glance without a single glyph of type, which
     is the only option at this size. Bars are x-positioned as well as y, so the
     label column and value column line up like a real form. */
  const caseCard = new THREE.Group();
  const barGeo = new THREE.PlaneGeometry(1, 1);
  /* A BACKING PLATE, because a record needs a surface. Without it the grey
     rows were drawn straight over the deck behind them — slate lines on slate
     frames, invisible at card size, so only the orange title rule survived and
     the whole thing read as a stray dash. The plate is a shade off the panel
     white with a hairline edge, which is what makes it read as a card lying in
     front of the archive rather than as marks floating on it. */
  for (const [w, h, col, op] of [[1.52, 1.06, "#5A6B7A", 0.5], [1.46, 1.0, "#F1F4F7", 0.97]] as const) {
    const plate = new THREE.Mesh(barGeo, own(new THREE.MeshBasicMaterial({
      color: col, transparent: true, opacity: 0, toneMapped: false,
      depthWrite: false, userData: { max: op, tier: "mark" },
    })));
    plate.scale.set(w, h, 1);
    plate.position.set(0, 0.03, -0.01);
    caseCard.add(plate);
  }
  /* THREE ROWS, TWO HARD COLUMNS. The previous twelve bars were meant to read
     as a filled form, but every label was a different width starting at a
     different x (-0.48, -0.45, -0.50, -0.46) and every value likewise, so at
     card size the whole block was a field of ragged grey dashes — noise where
     a record was supposed to be. What makes a form read as a form at 4mm is
     COLUMN ALIGNMENT, not row count, so: four rows down to three, every label
     the same width sharing a left edge at -0.63, every value sharing a left
     edge at +0.02, and only the value widths varying (which is the one thing
     that actually differs between fields of real data). Bars are centred on x,
     so each x below is leftEdge + w/2 — that arithmetic is load-bearing and
     changing a width without changing its x breaks the column. */
  const LABEL_L = -0.63, VALUE_L = 0.02;
  const lab = (w: number, y: number) => [w, 0.05, LABEL_L + w / 2, y, caseLine] as const;
  const val = (w: number, y: number) => [w, 0.05, VALUE_L + w / 2, y, caseLine] as const;
  const CASE_BARS: readonly (readonly [number, number, number, number, THREE.Material])[] = [
    // title rule, then the divider under it
    [1.30, 0.075, 0.00, 0.36, caseWarn],
    [1.30, 0.016, 0.00, 0.25, caseLine],
    lab(0.36, 0.10), val(0.52, 0.10),
    lab(0.36, -0.04), val(0.44, -0.04),
    lab(0.36, -0.18), val(0.58, -0.18),
    // status badge, on the label column's left edge
    [0.30, 0.070, LABEL_L + 0.15, -0.36, caseWarn],
  ];
  for (const [w, h, x, y, mat] of CASE_BARS) {
    const m = new THREE.Mesh(barGeo, mat);
    m.scale.set(w, h, 1);
    m.position.set(x, y, 0);
    caseCard.add(m);
  }
  g.add(caseCard);

  _deep("data:detect", _t0);

  const es = (t: number) => t * t * (3 - 2 * t);
  const seg = (p: number, a: number, b: number) => es(clamp01((p - a) / (b - a)));
  /* Where the clip ends up: UP and FORWARD out of the deck, barely sideways.

     The first pass sent it out to x=2.15, and at this azimuth the camera sits on
     the +x side — so it travelled straight at the right frame edge and clipped,
     bracket and all. Lifting it instead keeps it near the middle of frame, and
     it is the better gesture anyway: a record is pulled UP out of a file, not
     shoved out the end of one. The 1.05 of lift also clears it of the near
     frames it would otherwise pass through on its way forward. */
  /* OUT_Z IS ABSOLUTE, NOT A DELTA OFF THE FILED POSITION. It was
     zs[PULLED] + 2.65 = -0.265, and the deck's own plates sit at 0.290 and
     -0.157 and -0.590 — so the "retrieved" frame travelled 2.65 forward and
     stopped still inside the archive, interleaved with the frames it was
     supposed to have been pulled out of, and the case card at +0.55 landed
     within 0.005 of plate 1. Anchoring to the deck's NEAR END (0.75) instead
     of to the pulled frame's own z is the only form of this that cannot end up
     inside the deck: 2.30 is 1.55 clear in front of the whole archive, and
     OUT_Y lifts the clip's lower edge (0.72 at the 1.42 scale) to 0.746, clear
     of the deck's top edge at DECK_Y + FH/2 = 0.63.

     OUT_Y IS BOUNDED ABOVE BY THE FRAME, not by taste. Projected into this
     card's frustum (fov 30, rad 9.0, camY 1.6, ty 0.35, panel ~564x191) the
     clip's top edge reaches ndc y 0.87 at OUT_Y 1.35 and 0.99 at 1.55 — so
     1.55, which is what the clearance arithmetic alone argues for, would have
     shaved the top of the retrieved frame against the panel edge across the
     whole azimuth sweep. Any future lift has to be re-projected, not eyeballed. */
  const OUT_X = 1.12, OUT_Y = 1.35, OUT_Z = 2.30;
  /* The case card sits low and further forward again, so the clip reads above
     it with air between the two and the archive reads behind both. */
  const CASE_Y = 0.05, CASE_Z = OUT_Z + 0.85;
  let pulled = 0;
  // filed orientation — the identity end of the turn toward the viewer
  const _qId = new THREE.Quaternion();

  return {
    group: g,
    focus: new THREE.Vector3(0, DECK_Y, zs[PULLED]),
    materials: mats,
    marks: [det],
    ground: { setOpacity: (o) => setGroundOpacity(ground, o) },
    tick: (p) => {
      /* 0.00-0.08  idle
         0.08-0.40  the search runs back along the deck
         0.40-0.52  it settles on the frame
         0.52-0.70  the frame is pulled out and turns to face you
         0.70-0.86  held: the case is written
         0.86-1.00  filed back into the deck
         Every value below is a function of p alone, so the loop cannot drift
         and there is no state to reset. */
      const travel = seg(p, 0.08, 0.44);
      scan.position.z = 0.9 + (zs[PULLED] - 0.9) * travel;
      scan.visible = p > 0.05 && p < 0.6;
      scanM.opacity *= p < 0.5 ? 1 : Math.max(0, (0.6 - p) / 0.1);

      /* THE CURSOR'S SWEEP, in the 0.20 immediately before the frame lifts:
           0.32-0.46  walks the deck, frame 0 -> frame PULLED
           0.46-0.49  holds on the target
           0.49-0.53  fades out as the lift begins at 0.52
         LINEAR IN DECK-INDEX SPACE, not in z. The deck's spacing tightens with
         depth (0.46 down to 0.13), so a cursor moving at constant z-speed would
         cross two frames a second at the near end and fifteen at the far end —
         it would read as accelerating into the archive instead of stepping
         through it. Interpolating between zs[i] and zs[i+1] makes it slow down
         in world space exactly as the record compresses, which is the same fact
         the deck's geometry states. It only reaches index 9 here, so the
         deceleration is mild; it is still the correct construction, and it
         cannot be got wrong later if PULLED moves deeper. */
      const sweep = clamp01((p - 0.32) / 0.14);
      const fi = PULLED * sweep;
      const i0 = Math.min(Math.floor(fi), N - 2);
      cursor.position.z = zs[i0] + (zs[i0 + 1] - zs[i0]) * (fi - i0);
      cursor.visible = p >= 0.32 && p < 0.53;
      /* 0->full over the first 15% of the sweep (0.32-0.341) so it arrives
         rather than switching on, then flat until the fade. Multiplied into the
         opacity the card's material loop has already set, exactly as scanM and
         the case card do, so the peak stays userData.max = 0.55. */
      cursorM.opacity *= !cursor.visible ? 0
        : p < 0.49 ? clamp01((p - 0.32) / 0.021)
          : (0.53 - p) / 0.04;

      // out of the deck, then back into it
      pulled = p < 0.52 ? 0 : p < 0.86 ? seg(p, 0.52, 0.70) : 1 - seg(p, 0.86, 1);
      const e = es(pulled);
      clip.position.set(OUT_X * e, DECK_Y + OUT_Y * e, zs[PULLED] + (OUT_Z - zs[PULLED]) * e);
      /* Turning to face you is the whole gesture: edge-on it is one frame among
         thousands, square-on it is the clip. Orientation is NOT set here — it is
         handled in trackers() by slerping toward the live camera quaternion,
         because "face the viewer" can only be defined where the camera is
         available. A fixed -90deg about Y put the frame's normal on -X, which
         faced the in-scene reader head on the -X side — the exact opposite of
         the viewer, who sits at +X for this azimuth range. */
      clip.scale.setScalar(1 + 0.42 * e);

      // the case card rides beside the clip once it is most of the way out
      const c = clamp01((pulled - 0.55) / 0.35);
      const ce = es(c);
      caseCard.visible = ce > 0.01;
      // sits directly under the clip, riding with it rather than at a fixed spot
      /* Pushed 0.55 FORWARD of the clip, not level with it. The deck runs back
         from here, so anything sharing the clip's z-plane is read against grey
         frames; in front of the whole archive it is read against paper. */
      caseCard.position.set(OUT_X + 0.04, CASE_Y - 0.1 * (1 - ce), CASE_Z);
      for (const ch of caseCard.children) {
        const m = (ch as THREE.Mesh).material as THREE.Material & { opacity: number };
        m.opacity *= ce;
      }
    },
    trackers: (camera) => {
      /* The clip is parented directly to the subject root, which carries no
         rotation, so its local orientation is its world orientation and the
         camera quaternion can be used unmodified. */
      clip.quaternion.slerpQuaternions(_qId, camera.quaternion, es(pulled));
      // the bracket only exists once the clip is genuinely out and readable
      det.follow(pulled > 0.35 ? clip : null, camera);
      caseCard.quaternion.copy(camera.quaternion);
      if (cursor.visible) cursor.quaternion.copy(camera.quaternion);
    },
    dispose: () => {
      mats.forEach((m) => m.dispose());
      ground.material.dispose();
      frameGeo.dispose();
      lensGeo.dispose();
      coneGeo.dispose();
      scanGeo.dispose();
      cursorGeo.dispose();
      barGeo.dispose();
    },
  };
}
