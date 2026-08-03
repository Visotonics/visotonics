"use client";

/* ---------------------------------------------------------------------------
   Home lead card — "From the CCTV you already own."

   THE IDEA, taken from the card's own copy:
     "No new hardware. The platform runs on the cameras already watching your
      yard, warehouse and factory."

   So this is not one product demo. It is the WHOLE SITE at once, seen from the
   cameras that are already on it — which is the only honest way to draw "one
   vision layer across the operation". Everything the platform sells is present
   and working simultaneously:

     yard      stacked containers, one located          (Viso Yard)
     gate      a truck crossing under a gantry          (Gate Vision)
     dock      a trailer on a bay, cargo moving         (Cargo Vision)
     warehouse pallets counted on the apron             (Viso Warehouse)
     factory   a line running parts past a head         (Viso Factory)
     people    staff walking the site, resolved         (Work Vision)

   Four camera poles cover it. Each head sweeps its own arc on its own period,
   so the site is never fully observed at one instant and never unobserved
   either — which is the actual claim. Detections attach to whatever a head is
   currently pointing at, so the boxes are a CONSEQUENCE of where the cameras
   are looking rather than decoration on a timer.

   THIS CARD IS DARK AGAIN, like every other scene in the system. It ran on
   LIGHT_SURFACE (#F6F7F8) for a while and the inversion that required — dark
   subjects, 0.5 exposure, a heavy contact shadow — was the single loudest
   complaint about the homepage ("icky, all that white"). It is now keyed
   straight to the page canvas (#0A0B0E) and the flagships' cyclorama, so the
   card has no surface colour of its own left to seam against.

   THE RULE THAT CAME BACK WITH IT: dark means a dark BACKDROP, never a dim
   scene. Everything below moved in ONE direction — backdrop down, subjects and
   exposure UP. If a future edit only does the first half, this card goes murky.
--------------------------------------------------------------------------- */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { createStudio } from "../_vision/studio";
import { mountWhenVisible } from "../_vision/mount";
import { clamp01, easeInOut, lerp, placeCamera } from "../_vision/camera";
import { makeMetal, metalBox } from "../_vision/metal";
import { createTracker, detectMaterials } from "../hero-cards/detect";
import { ROAD_Z, buildRoadway } from "./site";

/** DARK from app/page.tsx — the page canvas this scene is mounted on, not a
    lifted plate colour. Also the placeholder and error-fallback background,
    so it must track the cyclorama's edge stops below: an unbuilt scene
    should look like an empty stretch of the page, not a hole or a seam. */
const CARD_SURFACE = "#0A0B0E";

/* 10, via 15, from an original 22. Every actor in this scene — the gate truck,
   the dock trailer, the line, the walkers, the four camera sweeps — is a
   function of this one period, so shortening it speeds the whole site up
   together and nothing has to be re-choreographed. At 22 the card was a still
   life for most of the time anyone spent looking at it; 15 still read as slow
   against the 8-10s the hero cards run.

   THE LOOP PERIOD IS GONE. The camera is a treadmill — it tracks right
   forever while the site tiles under it — so the scene has no phase, and the
   `p` that used to drive the pan has no readers left. Reduced motion is
   already handled by freezing the clock itself (`t = reduce ? 7 : ...`), which
   is what made the phase redundant rather than merely unused.

   Camera speed is PAN_SPEED; actor speeds live in frame(). Neither derives
   from a period, so there is no single number that makes "the animation"
   faster any more — that is the cost of an endless pan, and it is worth it. */

/* Units per second the camera tracks right. 0.98 keeps the pace the previous
   one-way pan had (7.8 units in 8s) now that the pan never turns around. The
   scene renders at 24fps, so this is ~0.04 units per frame — an order of
   magnitude below anything that would read as stepping. */
const PAN_SPEED = 0.98;
const SETTLE = 1.2;
const GROUND = -1.25;

/* ================= THE TRAFFIC =================

   The truck's run, and WHY THE LOOP DOES NOT EASE.

   The idiom is gate-vision's (LOOP / RUN_FROM / RUN_TO): a vehicle crosses at
   CONSTANT speed from off-frame to off-frame, and the reset happens in the
   gap. Constant is not laziness. An eased run decelerates as it approaches its
   end, which is precisely the frame edge, so the wrap announces itself twice —
   once as a vehicle slowing down for no reason at the edge of shot, and again
   as the next one accelerating out of nothing. Uniform motion has no
   distinguishable moment in it, which is the only thing that makes "one truck
   leaves, the next arrives" survive being looked at.

   The difference from gate-vision is that this scene's camera is a treadmill
   (see below) and never stops moving, so the run is measured RELATIVE TO THE
   CAMERA, not in world space.

     TRUCK_REL   1.55 u/s   speed relative to the camera
     PAN_SPEED   0.98 u/s   the camera's own rightward track
     -> world speed 2.53 u/s, which is what the handoff windows are timed on.

   TRUCK_REL IS A RELATIVE SPEED, NOT A MULTIPLIER, and this is the single
   thing in this file most likely to be "fixed" wrongly by somebody reading it
   quickly. The two readings are:

     ADDITIVE (correct)         world = PAN_SPEED + TRUCK_REL = 0.98 + 1.55
                                      = 2.53 u/s
                                cycle = TRUCK_RUN / TRUCK_REL = 20.4 / 1.55
                                      = 13.16 s
     MULTIPLICATIVE (nonsense)  world = 0.98 * 1.55 = 1.52 u/s, which is SLOWER
                                than the 2.53 the handoff table below is timed
                                on, so every dwell and every overlap in it
                                becomes wrong by a factor of 1.67 while still
                                looking arithmetically tidy.

   The dwell figure the handoff section quotes (10.0 / 2.53 = 3.95 s) is the
   proof: it divides a WORLD window width by a WORLD speed. Change the reading
   and that line stops being true, silently.

   TRUCK_RUN, derived. The framing shows SITE_W / 0.9 = 11.5 / 0.9 = 12.78
   units of x, so the visible half-span is 6.39 — and that is CONSTANT across
   aspects, because `rad` below is solved from SITE_W rather than fixed, so the
   card and the 16:9 lab slot frame the same width of site. The truck's body
   spans -3.5 (trailer/chassis tail) to +3.1 (chassis nose) about its group
   origin. For the wrap to be off-frame at BOTH ends:

     tail must clear the right edge   RUN/2 >= 6.39 + 3.5 = 9.89
     nose must not yet be at the left RUN/2 >= 6.39 + 3.1 = 9.49

   10.2 clears both, so TRUCK_RUN = 20.4 and the cycle is 20.4 / 1.55 = 13.2 s.

   HONEST NOTE ON "NEVER AN EMPTY ROAD". With one vehicle you cannot have both
   an invisible wrap and a permanently occupied road, and the spec asked for
   both. The two constraints are exactly opposed: hiding the wrap requires the
   run to exceed frame + vehicle (18.98 units), and filling the road requires
   it to be less. The gap here is 20.4 - 18.98 = 1.42 units = 0.92 s of empty
   road per 13.2 s cycle — 7% of the time, and gate-vision accepted the same
   trade at 0.35 s. Shortening the run to close it would put the teleport in
   shot, which is the worse failure by a long way.

   WHERE THAT SLACK ACTUALLY SITS, measured off the expression in frame()
   (`camX + (t*TRUCK_REL % TRUCK_RUN) - TRUCK_RUN/2`), which puts the truck's
   GROUP ORIGIN in [-10.2, +10.2) relative to the camera's look-at, and the
   frame edges at +-6.39:

     entry (left)   nose  -10.2 + 2.65 = -7.55  vs  -6.39   ->  1.16 off-frame
     exit  (right)  tail  +10.2 - 3.50 = +6.70  vs  +6.39   ->  0.31 off-frame

   using the VISIBLE BODY (-3.50 tail .. +2.65 cab nose) rather than the bare
   chassis rail, which runs to +3.1 and is a 0.16-tall dark strip nobody can
   pick out at card size. Total slack 1.47, split 1.16 / 0.31.

   IT IS LOPSIDED, AND IT IS LEFT THAT WAY DELIBERATELY. Centring the body in
   the wrap window instead — offset the expression by the body's own centre,
   (-3.50 + 2.65)/2 = -0.425, i.e. `- TRUCK_RUN/2 + 0.425` — would even the two
   out at 0.735 each. That is a real improvement on paper and it is a CHANGE TO
   THE MOTION, not a restoration, so it is not being made here. If anyone does
   make it, 0.31 units at 2.53 u/s is 0.12 s of exit clearance today: thin, but
   the teleport is still off-frame, which is the only thing that has to be
   true. Do not "fix" it by shortening TRUCK_RUN. */
const TRUCK_REL = 1.55;
const TRUCK_RUN = 20.4;

/* ================= THE HANDOFF =================

   Each camera owns a window of the road, +-5.0 units about its own mast. When
   the truck enters that window the camera acquires it — cone brightens,
   bracket lands — tracks it across, and releases as the next one takes over.
   Between times the camera goes back to reading its own patch of the site, so
   no head is ever staring at nothing.

   THE WINDOWS ARE DERIVED FROM THE MAST SPACING, not chosen. Masts sit at
   x = -9.6, -1.6, 6.2, 13.2, so adjacent gaps are 8.0, 7.8 and 7.0, and the
   gap across the treadmill's 27-unit tile boundary (13.2 -> -9.6 + 27 = 17.4)
   is 4.2. A window of half-width 5.0 is 10.0 wide, so every adjacent pair
   OVERLAPS:

     mast pair        gap    overlap   dwell        overlap time
     -9.6 .. -1.6     8.0      2.0     10.0/2.53      2.0/2.53
     -1.6 ..  6.2     7.8      2.2     = 3.95 s       = 0.79 s
      6.2 .. 13.2     7.0      3.0                    0.87 s / 1.19 s
     13.2 .. 17.4     4.2      5.8                    2.29 s

   Every camera therefore holds the truck for 3.95 s — long enough for the cone
   to brighten, the bracket to settle and the eye to accept that THAT camera is
   reading THAT vehicle — and every handoff has both cameras on the target for
   0.79-2.29 s. THE OVERLAP IS THE WHOLE POINT: a gap would read as the system
   losing the truck between cameras, which is the opposite of the claim. A real
   handoff is two cameras holding one target for a moment.

   ACQUIRE_EDGE is the outer 1.0 unit of each window, over which the cone ramps
   up and back down. Without it a camera snaps to full brightness, which reads
   as a cut rather than as acquisition. The bracket appears at 0.25 of that
   ramp so the cone always leads the box: look, then conclude. */
const HANDOFF_HW = 5.0;
const ACQUIRE_EDGE = 1.0;

export default function LeadCardScene() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    return mountWhenVisible(wrap, (el) => {
      try {
        const studio = createStudio(el, {
          floorY: GROUND,
          shadowExtent: 22,
          spread: 2.2,
          /* 0.98, up from 0.5 — the same exposure yard-vision runs, which is
             the closest flagship analogue (a wide site seen from a distance on
             the "lite"-equivalent read). 0.5 existed only to stop pale subjects
             clipping against a near-white card; with the ground gone black the
             constraint inverts and the subjects have to carry the frame.

             EXPOSURE DOES NOT TOUCH THE BACKDROP. The cyclorama is a raw
             ShaderMaterial writing gl_FragColor directly (see studio.ts), so it
             gets none of three's tone-mapping chain — raising this brightens
             the SUBJECTS only and leaves the backdrop hexes below exactly where
             they are authored. That is what makes "bright subjects on dark
             ground" reachable with one number. */
          exposure: 0.98,
          bloom: false,
          shadowMapSize: 1024,
          noEnv: true,
          lightRig: "lite",
          maxDpr: 1.5,
          /* THE FLAGSHIPS' CYCLORAMA. ALL THREE RAMP STOPS ARE #0A0B0E — the
             page canvas colour, not a lifted plate colour. This card no
             longer has a surface of its own to be lifted above: the section
             behind it is DARK (#0A0B0E) with no DARK_SURFACE panel in between,
             so the top edge of the frame has to be the SAME pixel as the
             section or the seam is exactly where a flat-vs-lifted mismatch
             used to show. Do not relift `top` or `mid` for contrast against
             the page — that reintroduces the seam this fixed.

             `glow` stays lifted: it is a soft radial pool behind the subject,
             not an edge value, and keeps the subject off dead flat black.
             GLOW ARITHMETIC. The shader adds cGlow*g*0.55 at the pool's
             centre, so #151C26 = (21,28,38) contributes (12,15,21) over
             mid #0A0B0E = (10,11,14), peaking at (22,26,35) = #161A23. That
             is ~2-3 steps above the floor: a readable cool pool, smaller than
             the old #1E2836/#0E1015 pairing gave (which peaked ~3 steps above
             a lifted #0E1015 floor) because the floor itself dropped — the
             pool is now measured against page-black instead of a lifted mid,
             so it still reads as a distinct glow without needing to be any
             brighter. */
          backdrop: { top: "#0A0B0E", mid: "#0A0B0E", bottom: "#0A0B0E", glow: "#151C26" },
        });
        const { camera, scene, shadowMat, renderer } = studio;

        /* ---- DEPTH ----
           The card had no depth cue at all: the dock wall four units behind
           the road rendered at exactly the same value as the truck in front of
           it, so the whole site sat on one plane.

           Fog, in the page canvas colour, so it is literally the backdrop
           creeping forward. NEAR AND FAR ARE SET PER FRAME from the camera's
           own solved distance (`rad`), not hardcoded — see the frame loop.
           They cannot be constants here because `rad` is solved from the
           aspect ratio, and this card is ~2.55:1 on the desktop homepage,
           16:9 in the lab and 4:3 on mobile. A fog tuned for a 9.3-unit
           standoff turns the 17.9-unit mobile framing into grey soup.
           Constructed with placeholders; the first frame overwrites them.

           IT CANNOT FIGHT THE CYCLORAMA. The backdrop is a raw ShaderMaterial
           writing gl_FragColor directly, so it takes no part in tone mapping
           and no part in fog, and all three of its ramp stops are #0A0B0E —
           the exact value below. So a surface fogged to 100% is the same pixel
           as the backdrop behind it and the transition is seamless by
           construction rather than by eye. The one thing to watch is the
           `glow` pool (#151C26, peaking ~#161A23): a fully fogged object
           crossing the pool goes #0A0B0E against a slightly lifted backdrop
           and is faintly visible as a dark patch. Nothing in this scene ever
           reaches full fog — see the numbers in the frame loop — so it does
           not arise, but a future prop parked at the far plane would show it. */
        scene.fog = new THREE.Fog(0x0a0b0e, 8, 30);

        /* THE ROAD AND THE FLOOR. Added to `scene`, deliberately NOT to `g`:
           `g`'s children are swept up by the treadmill's wrapItems list and
           tiled by PERIOD, and these two ride the camera continuously instead
           (see site.ts). Building them first also puts them at the bottom of
           the transparent stack, which is where a floor belongs. */
        const roadway = buildRoadway(GROUND);
        scene.add(roadway.group);

        /* THE SHADOW CATCHER MUST NOT WRITE DEPTH. This one line is what makes
           the road visible at all, so do not delete it as tidying.

           `createStudio` parks a 60x60 ShadowMaterial plane at exactly
           `floorY`, and three's ShadowMaterial is `transparent` but leaves
           `depthWrite` at its default TRUE. The road and its markings are
           coincident planes a few millimetres BELOW that catcher (they have to
           be, or they would cover the shadows), so with depth writing on, the
           catcher's draw would punch them out of the depth buffer on any frame
           the transparent sorter happened to order it first — and it would,
           because the sorter keys on distance from camera and the catcher's
           centroid is pinned to the world origin while camX runs away from it
           forever. Turning depth writing off leaves `renderOrder` (set in
           site.ts) as the single authority on that stack.

           FINDING, WORTH KNOWING BEFORE ANYONE TUNES `shadowMat.opacity`:
           THIS CARD HAS NO CAST SHADOWS AND NEVER HAS. The `lite` light rig
           this scene asks for is a key, a rim and a hemisphere, and NOT ONE OF
           THEM SETS `castShadow` — the shadow-casting directional light exists
           only in the `full` branch of createStudio. So `shadowMapSize: 1024`
           above, every `castShadow = true` on the meshes below, and the
           `shadowMat.opacity = solid * 0.45` line in the frame loop are all
           inert on this card. That is a pre-existing condition, not something
           this change caused, and it is left exactly as it is: switching a
           shadow light on here is a lighting decision with a real per-frame
           cost, and it belongs to whoever owns this card's look, not to a
           change about the ground.

           THE TRUCK IS NOW HANDLED, AND NOT BY THIS. It has a FAKE contact
           shadow — a soft alphaMapped ellipse riding under it, see "THE
           TRUCK'S CONTACT SHADOW" below. So `shadowMat.opacity` remains inert
           and tuning it will still do nothing; the number to tune is CS_PEAK.
           Nothing else in the scene has a shadow of any kind yet.

           (Because there is no shadow light, no catcher-follow code is needed
           either — a 60x60 plane at the origin that receives nothing does not
           care that the camera has driven off the end of it. If a shadow light
           is ever added, BOTH the catcher and the light's target will have to
           be slid with camX or shadows will stop about twenty-two seconds in,
           when the unbounded camera leaves the +-22 shadow camera behind.) */
        shadowMat.depthWrite = false;

        const mats: THREE.Material[] = [];
        const metals: { dispose: () => void }[] = [];
        const met = (base: string, kind: Parameters<typeof makeMetal>[0]["kind"], m: number, r: number) => {
          const x = makeMetal({ base, kind, metalness: m, rough: r });
          metals.push(x);
          mats.push(x.material);
          return x.material;
        };
        const plain = (color: string, rough = 0.95) => {
          const m = new THREE.MeshStandardMaterial({
            color, metalness: 0.05, roughness: rough,
            transparent: true, opacity: 0, envMapIntensity: 0.15,
          });
          mats.push(m);
          return m;
        };

        /* LIT BODIES ON A DARK GROUND, like every other scene here. Five values
           of one slate so the site still reads as one place.

           ONLY THE TWO DARK CONSTANTS MOVED. paleTone / boxTone / midTone were
           already sitting in the #9AA0A8-#C2C9D3 band the dark flagships light
           their cargo in (makeMetal's neutral base is #9AA0A8), so on a black
           ground they separate as they are — and with exposure nearly doubled
           (0.5 -> 0.98) lifting them as well would push #C2C9D3 into the ACES
           roll-off and cost the containers their corrugation shading.

           `dark` and `steel` are the ones that broke. They were picked to be
           the darkest thing in a near-white frame — the strongest read on paper
           — and on #0E1015 they were the WEAKEST: chassis, wheels, pallets, the
           belt, the camera heads and every walker went to silhouette, and the
           masts (0.14 units wide) disappeared entirely.

             dark  #232833 = (35,40,51)  -> #4E5661 = (78,86,97)
             steel #3B4351 = (59,67,81)  -> #78828F = (120,130,143)

           Both are now well clear of the backdrop mid (14,16,21) — ~5.5x and
           ~8x its luminance — while staying below midTone (#9AA3B0), so the
           value ORDER of the site is unchanged: structure reads darker than
           cargo, it just no longer reads as a hole. Neither is black, per the
           rule that structural steel is never a silhouette. */
        /* THE TOP OF THE RANGE CAME DOWN. The previous pass fixed the bottom —
           `dark` and `steel` were lifted off silhouette when the card went dark
           — and left the top where it was, so the image ran from near-black
           straight to near-white with almost nothing in between. That is why it
           read as a clay render: a value range with no middle is what an unlit
           matcap looks like.

           Three surfaces move, all downward, and the ORDER IS PRESERVED
           exactly (dark < steel < mid < box < pale) so the site's value
           grammar — structure darker than cargo — is untouched:

             midTone  #9AA3B0 = (154,163,176) -> #8A939F = (138,147,159)
             boxTone  #AAB3C0 = (170,179,192) -> #949DA9 = (148,157,169)
             paleTone #C2C9D3 = (194,201,211) -> #A6AEBA = (166,174,186)

           28 steps off the top, 16 off the middle. Nothing is now above
           #A6AEBA, so white is reserved for what it should be: specular
           highlights on the brushed steel, which the ACES curve rolls in on
           its own and which are the only genuine whites a lit scene has.

           `dark` and `steel` are DELIBERATELY UNCHANGED at #4E5661 and
           #78828F. They were fixed for exactly this ground one pass ago and
           lowering the top is what closes the gap to them — moving both ends
           toward each other would collapse the range rather than centre it.
           Two new mid-band surfaces also arrive with the road (#15181D
           asphalt, #7E8794 paint, see site.ts), and the asphalt is now the
           scene's darkest large area, which is what lets the whites come
           down without the image going flat. */
        const dark = met("#4E5661", "painted", 0.3, 0.6);
        const steel = met("#78828F", "brushed", 0.7, 0.45);
        const midTone = plain("#8A939F");
        const paleTone = plain("#A6AEBA");
        const boxTone = plain("#949DA9");

        const g = new THREE.Group();
        scene.add(g);
        const bx = (w: number, h: number, d: number, m: THREE.Material) => metalBox(w, h, d, m, Math.min(w, h, d) * 0.07);
        const put = (mesh: THREE.Mesh, x: number, y: number, z: number, shadow = true) => {
          mesh.position.set(x, y, z);
          mesh.castShadow = shadow;
          g.add(mesh);
          return mesh;
        };

        /* ================= the site ================= */

        /* -- yard: two stacks of containers, far left -- */
        const yardBoxes: THREE.Mesh[] = [];
        for (let i = 0; i < 4; i++) {
          for (let j = 0; j < 2; j++) {
            const b = bx(2.5, 1.0, 1.1, j === 1 && i === 1 ? midTone : paleTone);
            put(b, -13 + i * 2.65, GROUND + 0.5 + j * 1.04, -3.2);
            yardBoxes.push(b);
          }
        }

        /* -- gate: a gantry with a truck crossing under it -- */
        const gantry = new THREE.Group();
        gantry.position.set(-5.2, 0, 0.4);
        g.add(gantry);
        const gCol = bx(0.22, 4.2, 0.22, steel);
        gCol.position.set(0, GROUND + 2.1, -2.4);
        gantry.add(gCol);
        const gBeam = bx(0.2, 0.2, 5.0, steel);
        gBeam.position.set(0, GROUND + 4.1, 0.1);
        gantry.add(gBeam);

        const truck = new THREE.Group();
        /* The road was placed at the traffic, not the other way round: this is
           already 0 and the assignment is here to make the dependency explicit
           for whoever moves one of them next. */
        truck.position.z = ROAD_Z;
        g.add(truck);
        const trailer = bx(4.6, 1.15, 1.15, paleTone);
        trailer.position.set(-1.2, GROUND + 1.15, 0);
        truck.add(trailer);
        const cabT = bx(1.5, 1.3, 1.2, midTone);
        cabT.position.set(1.9, GROUND + 1.0, 0);
        truck.add(cabT);
        const chassis = bx(6.6, 0.16, 1.0, dark);
        chassis.position.set(-0.2, GROUND + 0.52, 0);
        truck.add(chassis);
        /* ONE WHEEL GEOMETRY FOR THE WHOLE SITE. It used to be allocated inside
           the loop below — four identical CylinderGeometries per mount, none of
           them disposed — and the docked trailer's bogie now wants the same
           wheel, so it is hoisted here and disposed once at teardown. WHEEL_R
           is the number the bogie sizes itself off: read it, do not re-guess it. */
        const WHEEL_R = 0.32;
        const WHEEL_W = 0.22;
        const wheelGeo = new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, WHEEL_W, 14);
        for (const wx of [-3.0, -2.1, 1.6, 2.4]) {
          const w = new THREE.Mesh(wheelGeo, dark);
          w.rotation.x = Math.PI / 2;
          w.position.set(wx, GROUND + 0.32, 0.55);
          truck.add(w);
          const w2 = w.clone();
          w2.position.z = -0.55;
          truck.add(w2);
        }

        /* ================= THE TRUCK'S CONTACT SHADOW =================

           A FAKE ONE, AND DELIBERATELY SO. The comment on `shadowMat` above
           records the finding: the `lite` rig is a key, a rim and a hemisphere
           and none of them casts, so this card has never had real shadows. The
           obvious fix — switch on a shadow-casting directional — is the wrong
           trade here. The road is 40 units long and the camera pans forever, so
           a real shadow map means a depth pass over the whole site every frame,
           plus sliding both the catcher and the light target with camX (see the
           note on `shadowMat`), all to put one soft blob under one vehicle. A
           decal costs one transparent quad and no extra pass, and at this
           camera angle and this card size the two are indistinguishable.

           IT DID NOT MATTER UNTIL THE ROAD ARRIVED. A truck floating in a void
           reads as a diagram; a truck floating over a road it is visibly meant
           to be driving on reads as a bug.

           GEOMETRY, FROM THE TRUCK'S ACTUAL BOX rather than a guessed number.
           Measured off the meshes built above:

             x  chassis -0.2 +-3.3  ->  -3.50 .. +3.10   span 6.60, centre -0.20
                (trailer -3.50..1.10, cab 1.15..2.65 both inside it)
             z  wheels +-0.55 +-0.11 -> -0.66 .. +0.66   span 1.32
                (bodies are +-0.60 and +-0.575, narrower)

           Semi-axes: 3.15 along x (0.95 of the half-span — a shadow tucks
           inside the silhouette rather than matching it edge to edge) and 0.78
           along z (1.18x the half-span — it spreads sideways, which is what a
           soft shadow from a high key does). Plane 6.30 x 1.56.

           IT STAYS ON THE ROAD: half-width 0.78 about a centre pushed to
           z = -0.242 spans -1.02 .. +0.54, inside the kerbs at +-1.20.

           THE OFFSET IS WHAT SELLS IT. The `lite` key is a DirectionalLight at
           (2.5, 6.5, 4.5) aiming at the origin, so light travels (-2.5, -6.5,
           -4.5) and a shadow is thrown toward -x and -z. Dropped from a contact
           height of 0.35 (the wheel/chassis region, not the trailer roof —
           this is a contact shadow, not a cast silhouette) that is
           0.35 * (-2.5, -4.5) / 6.5 = (-0.135, -0.242). Centred exactly under
           the caster it would read as ambient occlusion; offset, it reads as a
           shadow.

           HEIGHT. The stack under here is grid -1.270, road -1.256, paint
           -1.252, catcher -1.250 (= GROUND, and also exactly where the wheels
           touch, since they are r=0.32 centred at GROUND+0.32). So the decal
           has to be ABOVE the paint and BELOW the wheel contact: -1.251. Every
           plane in the stack has depthWrite off, so `renderOrder` is the sole
           authority and 0 puts this above the paint's -1 — the 1mm is only
           there to keep the geometric order honest, not to win a depth test.

           MeshBasicMaterial, not ShaderMaterial, for ONE reason: fog. This is
           paint on the road as far as the eye is concerned, so it must dim with
           the road it lies on — and `MeshBasicMaterial` has `fog: true` by
           default, while a raw ShaderMaterial would need the fog uniforms,
           chunks and defines wired by hand for a quad whose entire shading is a
           radial ramp. The ramp is a 64px alphaMap; elongation comes from the
           plane's aspect, so one square gradient serves. */
        const CS_A = 3.15, CS_B = 0.78;
        const CS_OFF_X = -0.20 - 0.135;   // box centre, then the key's throw
        const CS_OFF_Z = ROAD_Z - 0.242;
        const csTex = (() => {
          const S = 64;
          const c = document.createElement("canvas");
          c.width = c.height = S;
          const ctx = c.getContext("2d");
          if (!ctx) return null;
          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, S, S);
          const gr = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
          /* smoothstep falloff: a soft plateau in the middle and a soft rim,
             which is what a penumbra looks like. A linear ramp reads as a
             cone of light, not as a shadow. */
          for (let i = 0; i <= 8; i++) {
            const u = i / 8;
            const v = Math.round(255 * (1 - u * u * (3 - 2 * u)));
            gr.addColorStop(u, `rgb(${v},${v},${v})`);
          }
          ctx.fillStyle = gr;
          ctx.fillRect(0, 0, S, S);
          const tx = new THREE.CanvasTexture(c);
          tx.needsUpdate = true;
          return tx;
        })();
        const csGeo = new THREE.PlaneGeometry(CS_A * 2, CS_B * 2);
        /* 0.42 peak — mid of the 0.35-0.50 band this ground takes. Black at
           0.42 over the #15181D asphalt lands at (12,14,17): clearly a shadow,
           and still lighter than the page canvas so it never punches a hole
           through the road. Held OUT of `mats` because that list is a blunt
           "set everything to solid" and this peaks below 1, exactly like the
           roadway's paint. */
        const CS_PEAK = 0.42;
        const csMat = new THREE.MeshBasicMaterial({
          color: 0x000000,
          alphaMap: csTex ?? undefined,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          toneMapped: false,
        });
        csMat.fog = true;
        const contactShadow = new THREE.Mesh(csGeo, csMat);
        contactShadow.rotation.x = -Math.PI / 2;
        contactShadow.position.set(0, GROUND - 0.001, CS_OFF_Z);
        contactShadow.renderOrder = 0;
        /* Parented to `g`, NOT to the truck. A contact shadow lives on the
           ground: it must take the truck's x and nothing else — not its y, not
           any roll it might acquire later. Its x is written every frame beside
           the truck's, which is also why it joins `dynamic` below. */
        g.add(contactShadow);

        /* -- dock: a bay with a trailer parked and cargo on the apron -- */
        const dockWall = bx(6.0, 2.6, 0.5, paleTone);
        put(dockWall, 3.4, GROUND + 1.3, -4.6);
        for (const dx of [1.6, 5.2]) {
          const door = bx(1.7, 1.9, 0.12, midTone);
          put(door, dx, GROUND + 0.95, -4.3, false);
        }
        const docked = bx(3.6, 1.15, 1.1, paleTone);
        put(docked, 2.0, GROUND + 1.1, -3.0);

        /* ================= WHY THE TRAILER GOT LEGS =================

           Measured: the box is 1.15 tall centred at GROUND + 1.1, so its
           underside is at GROUND + 0.525 and it was hanging half a metre over
           a floor that is now visible. The obvious fix is to drop it. THAT IS
           THE WRONG FIX, and it is worth saying why in full so nobody "tidies"
           it later.

           A trailer on a bay genuinely sits at dock-deck height — that is the
           entire reason it is up there. Its floor has to line up with the
           dock's floor or you cannot roll anything across. Lowering it to
           GROUND would put its deck below the dock wall's and break the one
           relationship the object exists to state. The height is right; what
           was missing is the thing that HOLDS it at that height. So it gets
           what a real one has, and the hover stops being a hover:

             REAR BOGIE     a tandem axle pair with four wheels
             LANDING GEAR   two legs with feet, under the nose

           WHEEL SIZE IS READ, NOT PICKED: WHEEL_R (0.32) and WHEEL_W (0.22)
           off the truck above, on the shared `wheelGeo`, so the two vehicles
           on this site have the same wheel. Centres sit at GROUND + 0.32, so
           the tyres touch GROUND exactly, like the truck's.

           THE WHEELS ARE OUTBOARD, at z = -3.0 +- 0.62 against a body half-
           depth of 0.55. They have to be: a 0.64-diameter tyre does not fit
           under a 0.525 deck, and shrinking it to fit would break the match
           with the truck. Outboard is also what the truck already does — its
           chassis underside is GROUND + 0.44 and its tyres stand 0.20 proud of
           it — so the 0.115 of tyre standing above this deck reads as the same
           vehicle language, not as a clash.

           AXLES at x = 2.40 and 3.30. The rearmost is 0.50 in from the tail
           (body spans x 0.20 .. 3.80), and the pair is 0.90 apart — both taken
           from the truck's own rear tandem at -3.0 / -2.1 behind a tail at
           -3.50. LANDING GEAR at x = 0.75, 0.55 in from the nose, at
           z = -3.0 +- 0.38 so the legs are inboard and clearly carrying the
           deck rather than propping its corners.

           MATERIALS ARE EXISTING ONES, no new tone: `dark` (#4E5661) for
           everything that is running gear — wheels, axles, bogie frame, feet —
           which is the truck's own wheel and chassis value, and `steel`
           (#78828F) for the legs, which is what every other upright on this
           site (masts, gantry, belt legs) is made of. Both are already in
           `mats`, so all of this fades in on the same ramp as the rest.

           WRAPPING: parented to `dockedRig`, a sibling of `docked` in `g` and
           registered in `tileOwner` under head 1 exactly as `docked` is, so the
           two take the SAME tile index and the running gear can never be left
           27 units behind its trailer at a wrap boundary. It is deliberately
           NOT parented to `docked` itself: the tracker boxes its target with
           Box3.setFromObject, which walks children, so that would silently
           grow head 1's bracket down to the floor. */
        const dockedRig = new THREE.Group();
        g.add(dockedRig);
        /* The trailer's own z, and its underside — every number below is
           measured off these two rather than repeated as a literal. */
        const DOCK_Z = -3.0;

        const axleGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.30, 10);
        for (const ax of [2.40, 3.30]) {
          for (const sz of [-1, 1]) {
            const w = new THREE.Mesh(wheelGeo, dark);
            w.rotation.x = Math.PI / 2;
            w.position.set(ax, GROUND + WHEEL_R, DOCK_Z + sz * 0.62);
            w.castShadow = true;
            dockedRig.add(w);
          }
          const axle = new THREE.Mesh(axleGeo, dark);
          axle.rotation.x = Math.PI / 2;
          axle.position.set(ax, GROUND + WHEEL_R, DOCK_Z);
          dockedRig.add(axle);
        }
        /* The frame the axles hang off. 0.10 tall centred at GROUND + 0.46 →
           spans GROUND + 0.41 .. 0.51, i.e. tucked just under the 0.525 deck
           with 0.015 to spare, and long enough (1.50, x 2.10 .. 3.60) to
           bridge both axles. */
        const bogieFrame = bx(1.50, 0.10, 0.90, dark);
        bogieFrame.position.set(2.85, GROUND + 0.46, DOCK_Z);
        dockedRig.add(bogieFrame);

        /* Landing gear. Leg 0.45 tall centred at GROUND + 0.305 spans
           GROUND + 0.08 .. 0.53 — 0.005 INTO the deck at the top so there is no
           hairline gap, and stopping at 0.08 where the foot takes over. Foot
           0.08 tall centred at GROUND + 0.04 spans GROUND + 0.00 .. 0.08, so
           the bottom face is exactly GROUND. */
        for (const sz of [-1, 1]) {
          const leg = bx(0.10, 0.45, 0.10, steel);
          leg.position.set(0.75, GROUND + 0.305, DOCK_Z + sz * 0.38);
          leg.castShadow = true;
          dockedRig.add(leg);
          const foot = bx(0.22, 0.08, 0.26, dark);
          foot.position.set(0.75, GROUND + 0.04, DOCK_Z + sz * 0.38);
          dockedRig.add(foot);
        }

        /* -- warehouse: pallets being counted on the apron -- */
        /* MOVED OFF THE ROAD: z -0.90 -> -2.15. The pallet is 0.9 deep, so at
           -0.90 it spanned -1.35 .. -0.45 and was standing in the middle of the
           carriageway (road edge at -1.20). -2.15 puts its near face at -1.70,
           half a metre of shoulder clear of the kerb, and still well in front
           of the docked trailer at -3.0. The apron now flanks the road, which
           is what the road is for. */
        const APRON_Z = -2.15;
        const cartons: THREE.Mesh[] = [];
        for (let r = 0; r < 2; r++) {
          for (let i = 0; i < 3; i++) {
            const c = bx(0.62, 0.5, 0.62, boxTone);
            put(c, 5.6 + i * 0.68, GROUND + 0.3 + r * 0.54, APRON_Z);
            cartons.push(c);
          }
        }
        const pallet = bx(2.3, 0.12, 0.9, dark);
        put(pallet, 6.28, GROUND + 0.06, APRON_Z, false);

        /* -- factory: a line running parts past a head, right -- */
        const belt = bx(6.2, 0.18, 0.9, dark);
        put(belt, 11.4, GROUND + 0.62, -1.6, false);
        /* THE LEGS WENT THROUGH THE FLOOR. Found by the same bottom-vs-GROUND
           sweep that caught the walkers and the trailer, and it is the worst of
           the three: 1.2 tall centred at GROUND + 0.1 spans GROUND - 0.50 ..
           GROUND + 0.70, so half a metre of every leg was buried and the top
           0.17 stood proud through the belt it was supposed to be holding up.
           Invisible in a void; not invisible on a drafting grid.

           Sized to the job instead: the belt is 0.18 tall at GROUND + 0.62, so
           its underside is GROUND + 0.53. A leg of exactly that height centred
           at GROUND + 0.265 runs GROUND + 0.00 .. GROUND + 0.53 — floor to
           belt, nothing spare at either end. */
        for (const lx of [8.8, 11.4, 14.0]) {
          const leg = bx(0.13, 0.53, 0.13, steel);
          put(leg, lx, GROUND + 0.265, -1.6, false);
        }
        const parts: THREE.Mesh[] = [];
        for (let i = 0; i < 4; i++) {
          const pm = bx(0.7, 0.42, 0.6, midTone);
          put(pm, 0, GROUND + 0.92, -1.6);
          parts.push(pm);
        }

        /* -- people: staff walking the site (Work Vision) --
           A capsule and a head is all that survives at this size, and it reads
           as a person immediately. They walk fixed paths at different speeds so
           the site looks staffed rather than choreographed. Their vertical bob
           is fine — the no-vertical rule governs the CAMERA, not the subject.

           THEY NOW STAND ON THE FLOOR. The capsule is r 0.16 / len 0.42, so its
           total height is 0.42 + 2 x 0.16 = 0.74 and its half-height is 0.37.
           Centred at GROUND + 0.62 its bottom sat at GROUND + 0.25 — a quarter
           of a metre of hover on figures that have no feet to hide it. Dropped
           by exactly 0.25: torso GROUND + 0.62 -> GROUND + 0.37 (bottom now
           GROUND + 0.00) and head GROUND + 1.02 -> GROUND + 0.77, which keeps
           the head 0.40 above the torso centre exactly as before.

           THE BOB NEEDS NO BIAS, and this was checked rather than assumed. The
           frame loop writes `Math.abs(Math.sin(...)) * 0.035` — a rectified
           sine, so its range is [0, +0.035], never negative. It ALREADY only
           travels upward from its resting value. Resting is now contact, so the
           full stride runs GROUND .. GROUND + 0.035 and no part of it sinks
           into the floor. The alternative (lowering by 0.215 to leave clearance
           for a symmetric bob) would reintroduce a permanent 0.035 hover to
           solve a problem the rectifier had already solved. Full 0.25 it is.
           If anyone ever un-rectifies that sine, this comment is the reason
           they now have to bias it instead. */
        const people: { grp: THREE.Group; x0: number; x1: number; z: number; sp: number; ph: number }[] = [];
        const PEOPLE = [
          { x0: -9.5, x1: -2.0, z: 1.9, sp: 1.0, ph: 0.0 },
          { x0: 1.0, x1: 7.5, z: 2.4, sp: 0.72, ph: 0.35 },
          /* z 0.6 -> 1.5: at 0.6 this walker's whole patrol was down the
             middle of the carriageway. 1.5 is 0.3 clear of the kerb — walking
             the verge beside the road, which also happens to be the shot that
             makes the road look used. */
          { x0: 8.0, x1: 13.5, z: 1.5, sp: 0.86, ph: 0.7 },
          { x0: -3.0, x1: 3.0, z: -1.9, sp: 0.6, ph: 0.15 },
          { x0: 4.0, x1: 9.0, z: -2.6, sp: 0.9, ph: 0.55 },
        ];
        for (const spec of PEOPLE) {
          const grp = new THREE.Group();
          const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.42, 4, 8), dark);
          torso.position.y = GROUND + 0.37;   // half-height 0.37 -> bottom on GROUND
          torso.castShadow = true;
          grp.add(torso);
          const headM = new THREE.Mesh(new THREE.SphereGeometry(0.145, 12, 10), dark);
          headM.position.y = GROUND + 0.77;   // 0.40 above the torso centre, as before
          grp.add(headM);
          g.add(grp);
          people.push({ grp, ...spec });
        }

        /* -- the cameras that see all of it: four poles, four arcs -- */
        const heads: { yawGrp: THREE.Group; beam: THREE.Mesh; beamMat: THREE.MeshBasicMaterial }[] = [];
        const POLES = [
          { x: -9.6, z: 3.6, base: -0.35, arc: 0.5, period: 1.0, phase: 0.0 },
          { x: -1.6, z: 4.0, base: 0.05, arc: 0.55, period: 0.78, phase: 0.4 },
          { x: 6.2, z: 4.0, base: 0.1, arc: 0.5, period: 0.9, phase: 0.15 },
          { x: 13.2, z: 3.4, base: 0.4, arc: 0.45, period: 1.15, phase: 0.65 },
        ];
        const beamMats: THREE.MeshBasicMaterial[] = [];
        /* Built once and shared by all four beams. ConeGeometry runs along +Y
           with its apex at +h/2; translating by -h/2 puts the apex at the
           origin and rotating +90deg about Z lays it along +X, which is the
           optical axis of these heads (the barrel sits at local +x). */
        const beamGeo = new THREE.ConeGeometry(1, 1, 4, 1, true);
        beamGeo.translate(0, -0.5, 0);
        beamGeo.rotateZ(Math.PI / 2);
        const _tp = new THREE.Vector3();
        const _hp = new THREE.Vector3();
        /* Each pole's three top-level pieces, recorded per head. The treadmill
           wraps by nearest copy, and pole / arm / yaw group have base x of
           P.x, P.x+0.3 and P.x+0.62 — close, but not identical, so at the
           moment the wrap boundary falls between them they would round to
           different tiles and the head would detach from its own mast. They
           are wrapped as a unit instead. */
        const headRig: THREE.Object3D[][] = [];
        for (const P of POLES) {
          const pole = bx(0.14, 4.6, 0.14, steel);
          put(pole, P.x, GROUND + 2.3, P.z);
          const arm = bx(0.7, 0.11, 0.11, steel);
          put(arm, P.x + 0.3, GROUND + 4.5, P.z, false);
          const yawGrp = new THREE.Group();
          headRig.push([pole, arm, yawGrp]);
          yawGrp.position.set(P.x + 0.62, GROUND + 4.42, P.z);
          g.add(yawGrp);
          const head = bx(0.5, 0.28, 0.34, dark);
          head.castShadow = true;
          yawGrp.add(head);
          const hood = bx(0.56, 0.07, 0.38, dark);
          hood.position.y = 0.18;
          yawGrp.add(hood);
          const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.2, 14), dark);
          barrel.rotation.z = Math.PI / 2;
          barrel.position.x = 0.3;
          yawGrp.add(barrel);
          /* the beam makes each head's aim legible without a label.
             #3AA0DC -> #5CC8FF (PALETTE.accent). These cones are unlit,
             `toneMapped: false` graphics, so they render at their literal sRGB
             value and get NO help from the exposure lift above — the mid blue
             was chosen to darken a white frame it was crossing, and on #0E1015
             a darker-than-mid blue is simply less visible than the backdrop.
             The dark scenes' accent is the one that reads here. */
          const bm = new THREE.MeshBasicMaterial({
            color: "#5CC8FF", transparent: true, opacity: 0,
            side: THREE.DoubleSide, depthWrite: false, toneMapped: false,
          });
          /* UNFOGGED, and this is a per-material decision rather than a blanket
             rule. A sight cone is not a surface in the world — it is the
             system's own drawing of where a camera is looking, in the same ink
             as the brackets — so distance must not dim it. It also has to stay
             legible at the far end of a 15-unit throw, and at fog far = 3x rad
             a beam crossing the frame would lose about a third of its density
             exactly where it lands on its target: the cone would taper into
             nothing right at the point it is supposed to be making. (Note the
             spec's premise is inverted here: three's MeshBasicMaterial has
             `fog: true` by DEFAULT, so adding scene.fog silently fogs every
             detection graphic unless it is turned off — which is why this line
             exists at all.) The cone's geometry, shader and colour are
             untouched; only this flag is set. */
          bm.fog = false;
          beamMats.push(bm);
          mats.push(bm);
          /* UNIT cone: apex at the origin, opening along +X, one unit long and
             one unit in radius at the far end. Per frame it is scaled to the
             real distance to the target, so the beam always lands ON the thing
             being detected instead of stopping in mid-air at a fixed 7.4. */
          const beam = new THREE.Mesh(beamGeo, bm);
          beam.position.set(0.42, 0, 0);
          yawGrp.add(beam);
          heads.push({ yawGrp, beam, beamMat: bm });
        }

        /* -- detections: attach to whatever the heads are covering --
           Four trackers cycle through the site's subjects. They are driven by
           the same clock as the heads, so a box only ever appears on something
           a camera is actually pointed at. */
        const dm = detectMaterials();
        /* RE-KEYED FOR DARK, HERE RATHER THAN IN detect.ts.

           detect.ts still ships the light-card palette — accent #1B7FC4, faint
           #5A6B7A — chosen on the explicit rule that "on light, an overlay reads
           by being DARKER and more saturated". That rule inverts with the ground
           and both values fail on #0E1015: #5A6B7A = (90,107,122) at 0.8 alpha
           lands at ~(75,89,102), which is a grey smear you cannot tell from the
           steel, and #1B7FC4 is darker than the cargo it is supposed to mark.

           detect.ts is shared with scenes outside this change's scope, so the
           colours are overridden on the instance instead. Values are the dark
           palette's own: PALETTE.accent for the conclusion, and a light slate
           for the secondary tier — still clearly not the accent (desaturated,
           and 0.8 alpha) but now clearly present. */
        dm.accent.color.set("#5CC8FF");
        dm.faint.color.set("#8FA3B4");
        dm.scan.color.set("#8FDCFF");
        /* Brackets stay UNFOGGED for the same reason as the cones, plus one
           more: a bracket is a constant-pixel-weight graphic (detect.ts scales
           its stroke by camera distance precisely so it does not change weight
           with depth), and fogging it would undo that on the z axis while the
           stroke correction held it on the view axis. An overlay either marks
           something or it does not; it does not get fainter for being at the
           back of the yard. */
        for (const m of dm.all) (m as THREE.MeshBasicMaterial).fog = false;
        mats.push(...dm.all);
        /* PADS TIGHTENED to 1.08-1.10, from 1.2-1.3. The loose pads date from
           before the bracket's depth-nudge was fixed to use the target's actual
           half-extent along the eye axis (see detect.ts) — until then a bracket
           on a deep object was buried inside it, and over-padding was the only
           thing that kept the corner arms clear of the silhouette. That is no
           longer true, so the box can sit where the object actually is. At 1.3
           a bracket on a 0.62 carton was drawing 0.19 of clear air on every
           side, which at card size reads as a box that has not quite locked. */
        const trackers = [
          createTracker(dm.accent, { ticks: 4, pad: 1.08 }),
          createTracker(dm.accent, { ticks: 4, pad: 1.08 }),
          createTracker(dm.accent, { ticks: 3, pad: 1.10 }),
          createTracker(dm.accent, { ticks: 3, pad: 1.10 }),
        ];
        trackers.forEach((t) => g.add(t.group));
        /* The pool each tracker draws from — one per product area, and now SIX
           slots each instead of three, with no repeats. The old pools ran
           [yard, yard, yard] and [truck, docked, TRUCK AGAIN], so a third of
           what the site ever showed you was the same truck twice in a row and
           the cycle came round every three detections — short enough that the
           card visibly repeated itself inside a single viewing. Six distinct
           targets per head, with the four pools at different lengths, means the
           combination of what all four are looking at does not repeat for a
           long time even though each pool does.

           Every entry is a genuinely different KIND of subject where the area
           allows it — a stacked container vs a ground container, a trailer vs
           the thing on the dock, a carton vs the pallet under it, a walker vs a
           part on the line — because the claim this card makes is that one
           layer reads all of it, and four boxes on four near-identical crates
           does not say that. */
        const pools: THREE.Object3D[][] = [
          [yardBoxes[3], yardBoxes[5], yardBoxes[1], yardBoxes[6], yardBoxes[0], yardBoxes[4]],
          /* THE TRUCK IS NO LONGER IN A POOL. It is on the road now, and the
             road belongs to every camera in turn rather than to head 1 — see
             THE HANDOFF. Keeping it here as well would have head 1 aiming at
             it on its own schedule while a different head was mid-handoff on
             the same vehicle, which is the one thing that would make the
             handoff unreadable. It also must not appear in `tileOwner`: the
             truck is camera-relative now, not tile-bound, and pool membership
             is what writes that map. Its two old slots are backfilled from
             this head's own bay. */
          [docked, yardBoxes[7], people[3].grp, yardBoxes[2], docked, people[3].grp],
          [cartons[2], pallet, cartons[4], cartons[0], cartons[5], cartons[1]],
          [people[0].grp, parts[1], people[2].grp, parts[3], people[4].grp, parts[0]],
        ];

        /* ================= THE TREADMILL =================
           The camera no longer loops — it tracks right forever. What loops is
           the SITE, by tiling underneath it.

           Every static prop gets re-placed each frame to the copy of itself
           nearest the camera: x = base + PERIOD * round((camX - base) / PERIOD).
           That makes the site infinitely periodic without building a single
           extra object, so the camera can run in one direction indefinitely and
           there is never a moment where it snaps back to the start.

           PERIOD 27 is the site's own width (props run x = -13 to +14). It has
           to be comfortably larger than the visible span — the framing shows
           ~11.5 units — because a prop teleports when it is PERIOD/2 = 13.5
           units from the camera, and that has to happen off-frame. If the site
           is ever widened, this number moves with it or props will jump in
           shot.

           27 IS ALSO AN EXACT IDENTITY WITH THE MASTS, and that is the reading
           that actually constrains it. The four camera masts sit at
           x = -9.6, -1.6, 6.2, 13.2, so the three in-tile gaps plus the gap
           across the tile boundary are

             -9.6 -> -1.6   8.0
             -1.6 ->  6.2   7.8
              6.2 -> 13.2   7.0
             13.2 -> 17.4   4.2      (= -9.6 + PERIOD, the next tile's mast 1)
                           ----
                           27.0  === PERIOD

           MOVING ANY ONE MAST BREAKS THIS SILENTLY. The handoff windows below
           are +-HANDOFF_HW about each mast and the wrap-around pair (mast 4 ->
           mast 1 of the next tile) only overlaps because that last gap is 4.2.
           Change a mast x without changing PERIOD and the truck falls out of
           every window for a stretch of road with no camera on it — which
           renders as the system losing the vehicle, not as an error.

           DYNAMIC things are excluded and handled by hand in frame(), because
           their x is already being written every frame: re-placing them here
           would just be overwritten, and they need to stay attached to the
           WRAPPED copy of the prop they belong to (the truck to its gantry, the
           parts to their belt) rather than to the original at its base x. */
        const PERIOD = 27.0;   // === 8.0 + 7.8 + 7.0 + 4.2, see above. Exact.
        const dynamic = new Set<THREE.Object3D>([
          truck,
          contactShadow,
          ...parts,
          ...people.map((pr) => pr.grp),
          ...trackers.map((tr) => tr.group),
        ]);

        /* A HEAD AND EVERYTHING IT LOOKS AT SHARE ONE TILE.

           Wrapping each prop to its own nearest copy is right for scenery, but
           wrong for anything a camera is pointed at. Head bases sit at -9.6,
           -1.6, 6.2, 13.2 and each one's subjects sit within ~5 units of it, so
           for most of the pan they round to the same tile and nothing is odd.
           But the boundary is crossed at a different camX for each of them, and
           in that window the head lands on one tile and its subject on the
           next — 27 units apart. The result was a beam fired clean across the
           frame at a target on the far side of the site, which is the opposite
           of the claim ("that camera is reading that box").

           So every pooled subject, and every piece of the mast itself, takes
           its head's tile index rather than computing its own. The jump still
           happens off-frame: a head switches tiles when it is PERIOD/2 = 13.5
           units from the camera, its subjects are within ~5 of it, and the
           visible half-span is 5.75. */
        const tileOwner = new Map<THREE.Object3D, number>();
        headRig.forEach((rig, i) => rig.forEach((o) => tileOwner.set(o, i)));
        pools.forEach((pool, i) => pool.forEach((o) => tileOwner.set(o, i)));
        /* The docked trailer's running gear is not itself a detection target,
           so pool membership never gave it a tile. It must take head 1's — the
           same one `docked` takes — or on the frames where the boundary falls
           between them the wheels and legs would be re-placed a whole PERIOD
           away from the trailer they are holding up. */
        tileOwner.set(dockedRig, 1);

        const wrapItems = g.children
          .filter((o) => !dynamic.has(o))
          .map((o) => ({ o, baseX: o.position.x, owner: tileOwner.get(o) }));

        const ro = new ResizeObserver(studio.size);
        ro.observe(el);
        let onScreen = true;
        const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }, { rootMargin: "140px" });
        io.observe(el);

        /* The clock is STARTED ON THE FIRST RENDERED FRAME, not at construction.
         Building a scene blocks for a while; with a clock running from
         construction the first frame the user actually sees is already
         hundreds of milliseconds in, so the intro appears to skip its
         beginning. Starting it here means every viewer sees frame one. */
      const clock = new THREE.Clock(false);
      let clockStarted = false;
        const target = new THREE.Vector3();
        let raf = 0;

        const frame = () => {
          const t = reduce ? 7 : clock.getElapsedTime();

          /* The camera's x is now UNBOUNDED — no modulo, no phase, no return.
             It simply advances at PAN_SPEED for as long as the card is alive,
             and the site tiles under it (see THE TREADMILL above). This is what
             removes the restart: there is no longer a frame at which anything
             about the camera resets, so there is nothing for the eye to catch. */
          const camX = -1.6 + t * PAN_SPEED;
          /* One tile index per head, resolved before anything is placed, so
             masts and subjects can be pinned to it (see tileOwner above). */
          const headK = POLES.map((P) => Math.round((camX - P.x) / PERIOD));
          /* Floor and road ride the camera. FIRST, before anything reads world
             space off them and before the props are tiled — they are the
             surface everything else is standing on. */
          roadway.place(camX);
          /* Place every static prop on its tile — its own nearest copy for
             plain scenery, its head's tile for anything a camera is aimed at.
             Must run BEFORE updateMatrixWorld and before the head-aiming
             block, both of which read world positions off these objects. */
          for (const w of wrapItems) {
            const k = w.owner === undefined ? Math.round((camX - w.baseX) / PERIOD) : headK[w.owner];
            w.o.position.x = w.baseX + PERIOD * k;
          }
          const wrapTo = (baseX: number) => baseX + PERIOD * Math.round((camX - baseX) / PERIOD);
          const wrapWith = (baseX: number, headIdx: number) => baseX + PERIOD * headK[headIdx];

          /* ACTOR RATES ARE NOT DRIVEN BY LOOP. Every mover below is a function
             of raw `t`, so the loop period never governed them — which is why
             the scene read as sluggish however far the period came down. They
             are scaled ~1.5x from the original: truck 0.62 -> 0.95, line
             0.8 -> 1.2, walkers 0.16 -> 0.24 with the bob at 3.1 -> 4.2 so the
             stride still matches the ground covered.

             Each is anchored to the WRAPPED copy of the structure it belongs
             to, not to an absolute x — otherwise the camera would track away
             and leave the only truck on the site behind it forever. */
          /* THE TRUCK IS NO LONGER TILE-BOUND. It used to ride head 1's tile
             on a 17-unit run, which kept it in one bay and gave it exactly one
             camera — the opposite of the section's claim. It is now measured
             from the CAMERA: a constant-speed run of TRUCK_RUN relative to
             camX, so it drives the length of the site past every mast in turn
             and the handoff has something to hand off. Modulo, not a ping-pong
             or an ease: see THE TRAFFIC. */
          truck.position.x = camX + ((t * TRUCK_REL) % TRUCK_RUN) - TRUCK_RUN / 2;
          /* The shadow takes the truck's x and NOTHING else — y and z were set
             once at construction and are never written again, so no future
             bounce or roll on the truck can lift the shadow off the ground. */
          contactShadow.position.x = truck.position.x + CS_OFF_X;

          // the line runs, on head 3's belt (belt base x = 11.4, parts sit from
          // -3.0 to +3.4 relative to it)
          const beltX = wrapWith(11.4, 3);
          parts.forEach((pm, i) => {
            pm.position.x = beltX - 3.0 + ((t * 1.2 + i * 1.6) % 6.4);
          });

          // people walk their paths, turning at each end, with a walking bob.
          // The path is wrapped as a whole, by its own midpoint, so a walker
          // never gets split from the patch of site it patrols.
          people.forEach((pr) => {
            const u = (t * 0.24 * pr.sp + pr.ph) % 2;
            const fwd = u < 1;
            const k = fwd ? u : 2 - u;
            const mid = (pr.x0 + pr.x1) / 2;
            // walkers that a head tracks ride that head's tile; the rest wrap
            // on their own, by the midpoint of their path so a patrol is never
            // split across two tiles
            const owner = tileOwner.get(pr.grp);
            const off = (owner === undefined ? wrapTo(mid) : wrapWith(mid, owner)) - mid;
            pr.grp.position.set(off + lerp(pr.x0, pr.x1, k), Math.abs(Math.sin(t * 4.2 * pr.sp)) * 0.035, pr.z);
            pr.grp.rotation.y = fwd ? Math.PI / 2 : -Math.PI / 2;
          });

          /* The seam dip that used to live here is GONE, along with the thing
             it was hiding. It faded the scene down for 0.28s at each end of the
             loop to cover the camera teleporting back to its start; with the
             treadmill there is no teleport to cover, so the card no longer
             blinks every 8 seconds. Only the intro fade remains. */
          const solid = reduce ? 1 : easeInOut(clamp01((t - 0.2) / SETTLE));
          mats.forEach((m) => { (m as THREE.Material & { opacity: number }).opacity = solid; });
          /* The floor and the road ramp with everything else. They are held
             outside `mats` because their peak opacities are not 1 — the grid
             runs at 0.12 and the road paint at 0.42 — and `mats` is a
             blunt "set everything to solid" list. */
          roadway.setOpacity(solid);
          /* Same ramp as the road it lies on, held out of `mats` for the same
             reason the road paint is: its peak is not 1. */
          csMat.opacity = solid * CS_PEAK;
          // each beam brightens only while its own detection is live
          /* 0.17/0.05 -> 0.30/0.10. These are straight alpha blends, so the
             arithmetic is exact and it is what forced the raise: at 0.17 over
             the backdrop mid (14,16,21) the lit beam landed at
             0.17x(92,200,255) + 0.83x(14,16,21) = (28,47,61) — a 30-value lift
             on a near-black frame, invisible at card scale. At 0.30 it lands at
             0.30x(92,200,255) + 0.70x(14,16,21) = (37,71,87) = #254757, which
             is a cone you can actually follow from head to target. The unlit
             floor moves with it (0.05 -> 0.10) so the ratio between "aiming"
             and "reading" stays ~3:1 and the beams still visibly pulse. */
          /* THE BEAM OPACITIES USED TO BE SET HERE, on their own timer. They
             now live in the head loop below, because a beam's brightness is
             the same fact as what its head is looking at and a head on the
             road follows the truck's position rather than a phase. */
          /* 0.3 -> 0.45, matching yard-vision (the flagships run 0.44-0.62).
             A ShadowMaterial only DARKENS what is under it, so on a light card
             it was the main thing grounding the subjects and had to be held
             back; against #0A0B0E it has almost nothing left to take away, and
             the higher value is what keeps a contact shadow legible where it
             falls across the glow pool. It cannot murk the scene — it never
             touches the subjects, only the ground behind them. */
          shadowMat.opacity = solid * 0.45;

          /* ONE loop, because aim and detection are the same fact. The head
             yaws onto its target, the beam is pitched and stretched to reach
             it, and the bracket lands on that same object — so a detection
             always sits at the end of a beam that is pointing at it.

             updateMatrixWorld is load-bearing: getWorldPosition reads the
             matrix, and the walkers, truck and forklift have all been moved
             earlier this frame. */
          g.updateMatrixWorld(true);
          const truckX = truck.position.x;   // `g` is untransformed, so local == world
          heads.forEach((h, i) => {
            h.yawGrp.getWorldPosition(_hp);

            /* ---- ACQUIRE, TRACK, RELEASE ----
               `acq` is this camera's hold on the truck: 0 outside its window,
               ramping to 1 over the outer ACQUIRE_EDGE, flat at 1 across the
               middle. Because adjacent windows overlap, two heads can both
               have a non-zero hold at once — one ramping down, one ramping up
               — which is what a handoff looks like.

               THE ROAD OUTRANKS THE POOL. A head with any hold at all abandons
               its site sweep and goes to the truck; otherwise it carries on
               reading its own patch, so no camera is ever idle. */
            const acq = clamp01((HANDOFF_HW - Math.abs(truckX - _hp.x)) / ACQUIRE_EDGE);
            const phase = t * 0.34 + i * 0.7;
            const slot = Math.floor(phase % pools[i].length);
            const siteOn = (phase % 1) < 0.72;
            const onRoad = acq > 0;
            const target = onRoad ? truck : pools[i][slot];
            /* The cone leads the bracket: it is already brightening at acq 0
               and the box does not land until 0.25. Look first, conclude
               second — a bracket that appears at the same instant as the cone
               reads as a pre-scripted cut rather than as a detection. */
            const on = onRoad ? acq > 0.25 : siteOn;
            /* 0.10 unlit floor / 0.30 lit, unchanged from the old timer — see
               the alpha arithmetic in the previous version of this block. On
               the road the lit end is reached through `acq` instead of a
               step, so acquisition and release are visible as the cone
               filling in and draining out. */
            h.beamMat.opacity = (0.10 + 0.20 * (onRoad ? acq : siteOn ? 1 : 0)) * solid;

            target.getWorldPosition(_tp);
            const dx = _tp.x - _hp.x, dz = _tp.z - _hp.z;
            const flat = Math.hypot(dx, dz);
            const drop = _hp.y - _tp.y;
            // optical axis is local +X, so this is the yaw that puts it on target
            h.yawGrp.rotation.y = Math.atan2(-dz, dx);
            // and this is the pitch, in the vertical plane the yaw just chose
            h.beam.rotation.z = -Math.atan2(drop, flat);
            /* REACH, not raw distance — the beam is parented at x = 0.42 (just
               off the lens housing), so scaling it by the full head-to-target
               distance made every beam overshoot its own subject by 0.42 units.
               At card size that is the difference between a cone that lands on
               the container and one that visibly passes through it.

               0.06 half-width, down from 0.14. atan(0.14) is an ~8deg half
               angle, and at the 12-18 unit throws in this scene that put a
               2.5-unit-wide mouth on the cone — a floodlight, not a camera's
               field of attention. 0.06 is ~3.4deg, so the beam reads as an
               optical axis with a little spread, and the bracket at the end of
               it is the thing that says what was found. */
            const reach = Math.max(0.1, Math.hypot(flat, drop) - 0.42);
            /* THE MOUTH IS CAPPED, so the cone is not a pure angle. A constant
               half-angle means width grows with throw, and these heads pick
               targets right across the site: at the 25-unit throws that
               produces a 3-unit-wide mouth, which at this framing is a third of
               the frame height — the pale band that read as haze lying over the
               whole scene rather than as one camera looking at one thing.
               0.55 lets the near beams keep their natural taper (0.06 x 8 =
               0.48, under the cap) and stops the far ones from opening up. */
            const mouth = Math.min(reach * 0.06, 0.55);
            h.beam.scale.set(reach, mouth, mouth);

            trackers[i].follow(on ? target : null, camera);
            trackers[i].setFill?.(0.4 + 0.6 * ((phase % 1) / 0.72));
          });

          /* Viewport camera: a slow lateral TRACK across the site. A site this
             wide cannot be orbited — you drive past it. Locked height, per the
             house rule. */
          /* The site is ~30 units wide. At a 30-degree vertical fov on a 16:9
             frame that needs roughly 30 units of standoff to fit — parked any
             closer the camera is INSIDE the site and reads as a single-subject
             shot rather than an overview of an operation. Height is locked, as
             everywhere else; only the aim slides. */
          target.set(camX, 0.6, -1.0);
          /* Frame from the SITE'S OWN WIDTH, not from a hand-tuned distance.
             The slot this lands in is ~513x201 on the real card and 16:9 in the
             lab, and a fixed standoff cannot serve both — at the card's short,
             wide aspect a distance tuned for 16:9 leaves the site tiny. Solving
             for "the site fills 90% of the horizontal field" makes the scene
             fill whatever box it is given. */
          const aspect = (renderer.domElement.clientWidth || 1) / (renderer.domElement.clientHeight || 1);
          /* ONE BAY, not the whole site. Poles sit at x = -9.6, -1.6, 6.2 and
             13.2; framing the ~8-unit span between two of them puts a camera at
             each edge of frame with the work happening between, which is what
             actually reads at card size. The whole site at 30 units wide made
             every subject too small to identify. */
          const SITE_W = 11.5;
          const halfFov = (30 * Math.PI) / 180 / 2; // camera fov is 30deg vertical
          const rad = (SITE_W / (2 * 0.9)) / (Math.tan(halfFov) * Math.max(aspect, 0.4));
          /* The azimuth breathes on a slow sine of RAW t — not of the loop
             phase. Anything driven by phase has to return to its starting value
             once per loop, which is exactly the kind of reset the treadmill
             exists to remove; a 52-second sine (0.12 rad/s) never repeats
             against the 27-unit site period, so the angle the site is seen from
             keeps drifting without ever landing back on a frame you have
             already seen. The +-0.03 swing is deliberately small — the lateral
             track is the movement here, and the angle is just enough to stop
             the site looking like a flat elevation. */
          /* FOG IS NORMALISED TO THE FRAMING, which is why it is set here and
             not once at construction: `rad` is solved from the aspect ratio,
             and the same card is ~2.55:1 on the desktop homepage, 16:9 in the
             lab and 4:3 on mobile, giving standoffs of 9.34 / 13.41 / 17.88.
             A fixed near/far tuned for 9.34 would leave the mobile card
             uniformly half-fogged. Expressed as multiples of the standoff, all
             three aspects get the SAME amount of depth:

               near = 0.75 x rad   just in front of the road, so the truck and
                                   the nearest walkers are clear of it
               far  = 3.00 x rad   nothing in the scene reaches it

             On the desktop card that is 7.0 -> 28.0. The things it has to
             separate sit between them: road centre at 9.3 (4% fogged), yard
             stacks ~12.5 (26%), dock wall ~13.5 (31%). So the back of the site
             loses about a third of its contrast to the backdrop and the front
             loses almost none, which is the depth cue that was missing.

             CHECKED AGAINST THE CYCLORAMA and it does not fight it: the fog
             colour is 0x0A0B0E, the same value all three backdrop stops were
             just set to, so fogging toward it is fogging toward the exact pixel
             already behind the object. Nothing here reaches full fog (the
             deepest thing in the scene is ~31%), so the one case that could
             show a seam — a fully-fogged object crossing the lifted `glow`
             pool — never arises. The grid is a raw ShaderMaterial and takes no
             fog at all; its own radial fade (10.4 -> 33.3) is deliberately
             matched to this band so the floor and the props die out together. */
          if (scene.fog instanceof THREE.Fog) {
            scene.fog.near = rad * 0.75;
            scene.fog.far = rad * 3.0;
          }
          const az = 0.29 + 0.03 * Math.sin(t * 0.12);
          placeCamera(camera, { az, rad, tx: camX, ty: 0.5, tz: -1.0 }, rad * 0.30);
          camera.lookAt(target);
        };

        /* 24fps — this card is never hovered, so it takes the resting rate
           from the same spec the hero cards run to. 1/25, see card-scene.tsx. */
        const MIN_DT = 1 / 25;
        /* Same arrival hygiene as the flagships (PERFORMANCE.md #35/#36/#39):
           programs compile at idle, one warm frame draws off screen, and the
           clock keeps its existing start-on-arrival behaviour — this scene
           always had that right. No runtime `transparent` flips here. */
        let compiled = false;
        const markCompiled = () => { compiled = true; };
        renderer.compileAsync(scene, camera).then(markCompiled, markCompiled);
        const compileGuard = window.setTimeout(markCompiled, 2000);
        let primed = false;
        let drawN = 0;
        let last = -1;
        const loop = () => {
          raf = requestAnimationFrame(loop);
          if (!compiled) return;
          if (!onScreen) {
            // one warm draw off screen; the clock deliberately stays unstarted
            if (!primed) { primed = true; frame(); studio.render(); }
            return;
          }
          primed = true;
          if (!clockStarted) { clock.start(); clockStarted = true; }
          const now = clock.getElapsedTime();
          if (now - last < MIN_DT) return;
          last = now;
          const _td = drawN < 3 ? performance.now() : 0;
          frame();
          studio.render();
          if (drawN < 3) {
            if (location.search.includes("perf")) {
              const w = window as unknown as { __visionDraw?: string[] };
              (w.__visionDraw ||= []).push(
                `lead#${drawN} draw ${(performance.now() - _td).toFixed(0)} ` +
                `progs ${renderer.info.programs?.length ?? -1}`);
            }
            drawN++;
          }
        };
        raf = requestAnimationFrame(loop);

        return () => {
          cancelAnimationFrame(raf);
          window.clearTimeout(compileGuard);
          ro.disconnect();
          io.disconnect();
          metals.forEach((m) => m.dispose());
          mats.forEach((m) => m.dispose());
          /* The roadway owns FRESH geometry as well as materials — four
             PlaneGeometries and the grid's — so unlike everything above it has
             to dispose both. Nothing it holds comes from `metalBox` or
             `makeMetal`, so there is no shared/cached object in there to
             destroy for the rest of the page. */
          roadway.dispose();
          /* All three freshly allocated here — nothing from metalBox or the
             metal texture cache — so all three are ours to destroy. */
          csGeo.dispose();
          csMat.dispose();
          /* The wheel and axle cylinders are ours too — plain CylinderGeometry,
             not `metalBox`, so nothing in the shared geometry cache is at risk.
             (Every box in this scene comes from `metalBox` and is CACHED AND
             SHARED, including the bogie frame, the legs and the feet: those
             must never be disposed here.) */
          wheelGeo.dispose();
          axleGeo.dispose();
          csTex?.dispose();
          studio.dispose();
        };
      } catch (err) {
        console.error("[lead-card] init failed:", err);
        el.style.background = CARD_SURFACE;
        return () => {};
      }
    }, "lead");
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: CARD_SURFACE }}>
      <div ref={wrapRef} style={{ position: "absolute", inset: 0 }} />
    </div>
  );
}

