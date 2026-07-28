/* ---------------------------------------------------------------------------
   Home hero cards — detection graphics.

   The cards were selling boxes. Nothing on screen said that a MACHINE was
   looking at them: a stack of containers is just a stack of containers until
   something draws a box around one and puts a number on it.

   So this module is the vision layer — the visual grammar of a detector:

     · corner brackets, not full rectangles. Every real detection UI uses
       corner marks, because a closed box hides the thing it is detecting.
     · a scan sweep that CAUSES the detections. Brackets that simply appear
       are decoration; brackets that appear as a sweep crosses the object read
       as inference happening.
     · unlit materials. These are graphics drawn over the world, not objects
       in it — they must not take shading, or they stop reading as an overlay
       and start looking like painted plastic.
     · brackets billboard to the camera, so they stay square to the viewer as
       the camera pans, exactly as a screen-space box would.
--------------------------------------------------------------------------- */
import * as THREE from "three";

export interface DetectMaterials {
  accent: THREE.MeshBasicMaterial;
  warn: THREE.MeshBasicMaterial;
  faint: THREE.MeshBasicMaterial;
  scan: THREE.MeshBasicMaterial;
  all: THREE.Material[];
}

export function detectMaterials(): DetectMaterials {
  /* `tier` decides what hover controls.

     "mark"    — conclusions and brackets. These are what the detector has
                 DECIDED, and they ramp with hover: quiet at rest, full on
                 interaction. Four cards showing every bracket, gauge and tally
                 at once is most of why the row reads busy at 280px.
     "presence" — the camera's own existence: sight cones and scan bars. These
                 do NOT ramp. Something must always say a machine is watching,
                 or the resting state goes back to being a photo of some boxes,
                 which is the failure the vision layer was added to fix.

     Rest is 35% of full, never 0, for the same reason. See card-scene. */
  const mk = (color: string, opacity: number, tier: "mark" | "presence" = "mark") =>
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, toneMapped: false, depthWrite: false, userData: { max: opacity, tier } });
  /* RE-PICKED FOR A LIGHT CARD. These are `toneMapped: false` unlit graphics, so
     they render at their literal sRGB value — which means a bright cyan
     (#5CC8FF) and a pale amber (#FFB020) had almost nothing to say against a
     #F6F7F8 ground. On light, an overlay reads by being DARKER and more
     saturated than everything around it, which is the exact inverse of the rule
     that held while the cards were charcoal.

     `#1B7FC4` is the brand blue driven down in value until it holds on white;
     `#ED510C` is the site's own signal orange (used by every schematic SVG for
     exactly this job) rather than the softer #FFB020, which greyed out. */
  const accent = mk("#1B7FC4", 1);
  const warn = mk("#ED510C", 1);   // the CONCLUSION colour -- see DECISIONS.md
  /* The SECONDARY tier, and it is darker rather than more transparent.
     (Named `faint` throughout; the name is now a misnomer.)

     History worth keeping, because this value has been wrong twice for two
     opposite reasons. It began at 0.28 of the accent colour, chosen while
     `userData.max` was being ignored entirely — so it had never actually been
     seen on screen. Once the fade loop started honouring it, 0.28 vanished
     against the dark navy cargo of the time, so it went to 0.40. Then the cargo
     went LIGHT (see subjects.ts), and a light-blue hairline at any opacity has
     almost no separation from a pale blue box.

     Transparency was the wrong axis every time. On a LIGHT card the secondary
     tier is a desaturated slate — clearly present, clearly not the accent,
     and dark enough to hold on both a near-white ground and a kraft carton.
     Alpha does the last 20% of the work, not the first 80%. */
  const faint = mk("#5A6B7A", 0.8);
  // the scan/beam volume: on light it has to DARKEN the frame it crosses rather
  // than glow, so it is the accent blue at low alpha, not a pale cyan
  const scan = mk("#2E86BE", 0.42, "presence");
  return { accent, warn, faint, scan, all: [accent, warn, faint, scan] };
}

/** Corner brackets around a w x h region, drawn in the XY plane. */
export function bracket(w: number, h: number, mat: THREE.Material, arm = 0.22, t = 0.035) {
  const g = new THREE.Group();
  const hw = w / 2, hh = h / 2;
  const a = Math.min(arm, Math.min(w, h) * 0.42);
  const bar = (bw: number, bh: number, x: number, y: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), mat);
    m.position.set(x, y, 0);
    g.add(m);
  };
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      // horizontal arm of the L, then the vertical arm
      bar(a, t, sx * (hw - a / 2), sy * hh);
      bar(t, a, sx * hw, sy * (hh - a / 2));
    }
  }
  return g;
}

/** A tick mark under a bracket — stands in for the confidence readout that
    would be there at full size but is illegible at 320px. */
export function ticks(count: number, mat: THREE.Material, span = 0.5) {
  const g = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(span / (count * 2), 0.05), mat);
    m.position.x = (i - (count - 1) / 2) * (span / count);
    g.add(m);
  }
  return g;
}

/** The sweep plane that drives detection. Thin, bright, and always vertical. */
export function scanPlane(height: number, mat: THREE.Material, thickness = 0.05) {
  return new THREE.Mesh(new THREE.PlaneGeometry(thickness, height), mat);
}

/** Keep a group square to the camera. Called per frame by the card scene. */
export function billboard(o: THREE.Object3D, camera: THREE.Camera) {
  o.quaternion.copy(camera.quaternion);
}

/* ---- shared tracker ----
   Every card previously placed its bracket by hand-guessed local offsets and
   a fixed z-nudge, so as the camera panned the bracket drifted off its
   target, sat at the wrong depth, and was sized by feel. A tracker instead
   reads the target's world bounding box every frame and derives position,
   scale and depth-offset from it directly, so it locks on regardless of
   where the camera is looking from. */
export interface Tracked {
  group: THREE.Group;      // bracket + optional ticks, billboarded
  /** Swap the bracket/ticks material (e.g. accent <-> warn) without rebuilding. */
  setMaterial: (mat: THREE.Material) => void;
  /** Show only the first `frac` (0..1) of the tick row — the confidence/tally readout. No-op if built without ticks. */
  setFill: (frac: number) => void;
  /** Multiply this tracker's padding. Drives the hover ACQUIRE settle: >1 sits
      the bracket oversized and loose, 1 is locked snug on its target. Relative
      to the tracker's own `pad`, so a tracker built deliberately tight stays
      proportionally tight. */
  setPad: (scale: number) => void;
  follow: (target: THREE.Object3D | null, camera: THREE.Camera) => void;
}

// module-level scratch — follow() must not allocate per frame
const _trackBox = new THREE.Box3();
const _trackSize = new THREE.Vector3();
const _trackCenter = new THREE.Vector3();
const _trackFwd = new THREE.Vector3();

/** One unit plane, shared by every bar of every tracker on the page. */
const _barGeo = new THREE.PlaneGeometry(1, 1);

/* Stroke in WORLD units, held constant rather than scaled with the target.
   An overlay is drawn in screen space, so its stroke must be a constant number
   of PIXELS — a bracket around a small object should not have a thinner line
   than one around a large object. Every card here frames roughly 10 world
   units across ~330px, i.e. ~34px per unit, so this lands at ~2.2px.

   0.065, up from 0.05. The thinner hairline was calibrated against dark navy
   cargo, where a bright overlay wins on sheer luminance difference and 1.7px is
   plenty. Against the light cargo the cards now use, the same line has far less
   contrast to trade on and needs the extra weight to hold. A palette change
   from dark to light subjects always costs the overlay some stroke. */
const STROKE = 0.065;

/* The distance STROKE was calibrated at. A world-space stroke only reads as a
   constant pixel weight while the camera stays put, which was true of every
   scene that existed when it was written — all four cards frame from ~10 units.
   The moment a scene punches in to 3.3, the same 0.065 covers three times the
   screen it was tuned for and the hairline becomes a chunky blue bar.
   Scaling by (distance / REF) keeps the on-screen weight fixed and is an exact
   no-op at REF, so the cards are untouched. */
const STROKE_REF_DIST = 10;

export function createTracker(mat: THREE.Material, opts?: { ticks?: number; pad?: number }): Tracked {
  const pad = opts?.pad ?? 1.12;
  let padScale = 1;
  const setPad = (sc: number) => { padScale = sc; };
  const group = new THREE.Group();

  /* WHY THE BARS ARE LAID OUT PER FRAME instead of being one pre-built
     bracket scaled uniformly.

     The previous version scaled a unit bracket by (bounding-sphere radius x
     pad). A sphere has no aspect ratio, so the bracket came out SQUARE no
     matter what it surrounded — around a 2.0 x 0.85 shipping container that
     is a box more than twice as tall as the thing inside it, which reads as a
     bracket that has lost its target rather than one locked onto it.

     Scaling the group non-uniformly instead does not work either: the
     horizontal arms would take their thickness from scale.y and the vertical
     arms from scale.x, so the stroke would come out visibly heavier on two
     sides than the other two.

     So each of the eight bars gets its own position and scale each frame, and
     the stroke stays a world constant. Eight objects x two vector writes per
     tracker per frame is nothing; the shape being right is not.

     Horizontal extent uses max(sizeX, sizeZ) rather than the projected width.
     That is deliberately view-INDEPENDENT: the true projected width changes as
     the camera pans, and a bracket that breathes with the camera reads as
     jitter. Slightly generous on a non-square footprint beats pumping. */
  const bars: { mesh: THREE.Mesh; ax: -1 | 1; ay: -1 | 1; horiz: boolean }[] = [];
  for (const ax of [-1, 1] as const) {
    for (const ay of [-1, 1] as const) {
      for (const horiz of [true, false]) {
        const mesh = new THREE.Mesh(_barGeo, mat);
        group.add(mesh);
        bars.push({ mesh, ax, ay, horiz });
      }
    }
  }

  const setMaterial = (m: THREE.Material) => {
    for (const b of bars) b.mesh.material = m;
  };

  /* Retained as a no-op so callers that reported confidence through the tick
     row keep compiling. The row itself is gone: at 320px it was unreadable
     floating dashes that only added clutter. */
  const setFill = (_frac: number) => {};

  const follow = (target: THREE.Object3D | null, camera: THREE.Camera) => {
    if (!target) {
      group.visible = false;
      return;
    }
    _trackBox.setFromObject(target);
    _trackBox.getCenter(_trackCenter);
    _trackBox.getSize(_trackSize);

    const p = pad * padScale;
    const halfW = (Math.max(_trackSize.x, _trackSize.z) / 2) * p;
    const halfH = (_trackSize.y / 2) * p;
    // arm length reads as a corner mark, never as most of a closed rectangle
    const arm = Math.max(0.1, Math.min(halfW, halfH) * 0.58);
    // constant pixel weight regardless of how near the camera has come
    const sw = STROKE * (camera.position.distanceTo(_trackCenter) / STROKE_REF_DIST);

    for (const b of bars) {
      if (b.horiz) {
        b.mesh.scale.set(arm, sw, 1);
        b.mesh.position.set(b.ax * (halfW - arm / 2), b.ay * halfH, 0);
      } else {
        b.mesh.scale.set(sw, arm, 1);
        b.mesh.position.set(b.ax * halfW, b.ay * (halfH - arm / 2), 0);
      }
    }

    group.position.copy(_trackCenter);
    group.quaternion.copy(camera.quaternion);

    /* Nudge toward the camera so the bracket is never occluded by the object it
       surrounds — by the target's ACTUAL half-extent along the view axis, not a
       flat 0.25.

       0.25 worked by luck. A bracket sits at the target's centre, so at 0.25 it
       is still INSIDE anything more than half a unit deep; it only read at all
       because `pad` makes the corner arms stick out past the object's
       silhouette, where they have background behind them. The moment a tracker
       was given a large target with a small pad — Warehouse's pallet load at
       pad 1.06 — the arms no longer cleared the silhouette, the bracket was
       buried in the cartons, and it vanished completely.

       For an axis-aligned box the half-extent along a direction is
       0.5*(|d.x|*sx + |d.y|*sy + |d.z|*sz). That is the exact minimum that
       clears the front face, so the bracket is never further forward than it
       has to be — pulling it closer than necessary would make it read larger
       than its target in perspective.

       THE DIRECTION IS EYE-TO-TARGET, NOT THE CAMERA'S FORWARD AXIS. Moving
       along the camera's forward axis displaces any off-centre target radially
       in screen space, which is why brackets on the stationary containers sat
       visibly off the things they were tracking. Moving along the line from the
       target centre to the eye changes only apparent size, never screen
       position, so the bracket stays centred on what it tracks from any angle. */
    _trackFwd.copy(camera.position).sub(_trackCenter).normalize();
    const halfAlongView = 0.5 * (
      Math.abs(_trackFwd.x) * _trackSize.x +
      Math.abs(_trackFwd.y) * _trackSize.y +
      Math.abs(_trackFwd.z) * _trackSize.z
    );
    group.position.addScaledVector(_trackFwd, halfAlongView + 0.06);
    group.visible = true;
  };

  return { group, setMaterial, setFill, setPad, follow };
}

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
