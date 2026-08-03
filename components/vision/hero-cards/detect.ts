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
  /* ONE OBSERVING COLOUR: #5CC8FF, THE PALETTE'S OWN ACCENT.

     THE OLD JUSTIFICATION IS DEAD, and it is worth saying exactly how it died
     rather than quietly deleting it. This block used to argue for `#1B7FC4`
     on the grounds that these are `toneMapped: false` unlit graphics rendered
     at their literal sRGB value, so a bright cyan has nothing to say against a
     #F6F7F8 ground — on light, an overlay reads by being DARKER and more
     saturated than what surrounds it.

     That was true, and then the cards went dark again (#0E1015; see the
     `detectMaterials` override at the top of subjects.ts, which has been
     patching around this file's values ever since). #1B7FC4 = (27,127,196) is
     DARKER than the cargo it marks on that ground, so a bracket read as a
     shadow on the box rather than as a graphic over it. There is no longer a
     light card anywhere on the site for these values to be tuned to.

     THIS WAS AUDITED RATHER THAN ASSUMED, because the obvious next move is to
     keep #1B7FC4 as a second stop "for the light cards" and there are none
     left. Every consumer of detectMaterials(), and every scene that draws a
     sight cone, renders on a dark ground:

       hero cards      card-scene.tsx:77  CARD_SURFACE #101216, and the studio
                       backdrop at :150 is #14171C / #0E1015 / #0A0B0E
       lead card       lead-card/scene.tsx:51 CARD_SURFACE #0A0B0E, backdrop
                       flat #0A0B0E at :130
       gate/tank/      all mount `bare`, which skips the cyclorama and clears
       crane/work/     to transparent (studio.ts:177, :227) — so their ground
       yard/cargo      is the PAGE, --canvas-dark #0a0b0e (globals.css:19)
       container       likewise bare, and it draws no cone at all

     The last #F6F7F8 in the repo is app/lab/lead-card/page.tsx's wrapper div,
     and the lead card paints its own #0A0B0E panel over the whole of it, so
     the white never shows. app/page.tsx still declares LIGHT_SURFACE but only
     a comment mentions it — the note at :545 records the plate going dark.

     So the four blues that were all doing this one job are collapsed to one.
     `#5CC8FF` is the palette's declared accent, it is what every scene written
     since uses, and it holds its value on the dark ground the site actually
     has. `#2E86BE` and `#8FDCFF` are no longer independent choices — a cone is
     not a different colour from a bracket, it is the same colour at less
     density, which is what the alpha is for.

     IF A LIGHT-GROUND SCENE IS EVER ADDED, do not re-tune this constant — add
     a second named stop of the same hue and let the caller pick, because the
     failure mode runs both ways: a bright cyan washes out on near-white, and a
     value driven down far enough to hold on white reads as a shadow on dark.
     One value is correct here only because there is currently one ground.

     `#ED510C` stays a single value, and that was checked too rather than
     assumed: it was originally picked FOR the light card (as the readable
     alternative to #FFB020) and subjects.ts:105 records it as fully readable
     on #0E1015. It is the one member of this set that genuinely holds against
     both grounds, so it needs no second stop. */
  const accent = mk("#5CC8FF", 1);
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
  /* The scan/beam volume. Same #5CC8FF as everything else that observes — a
     beam is not a different colour from a bracket, it is the same colour at
     less density, which is precisely what the 0.42 is for. It keeps the
     `presence` tier: the machine's existence does not ramp with hover. */
  const scan = mk("#5CC8FF", 0.42, "presence");
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
/* SHARED across every tracker on every scene — see the dispose guard in
   _vision/studio.ts. A scene that leaves its tracker in the scene graph at
   teardown would otherwise destroy this for every other scene on the page. */
_barGeo.userData.shared = true;

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

/* ===========================================================================
   THE SIGHT CONE — one builder, every scene.

   Six scenes each grew their own detection volume, in four different blues,
   and three of them were not cones at all but flat quad-fans drawn inline.
   Every one of them ended the same way: a hard geometric cap, the volume
   simply stopping dead in mid-air at whatever distance the author picked. A
   real beam does not have an end you can see. That cap was the single most
   artificial thing on the site, and it is what this module exists to delete.

   Four things make the difference, and only one of them is the cap:

     1. RANGE FALLOFF. The volume dissolves over its last ~48% instead of
        terminating on a disc. Headline fix; everything else is secondary.
     2. APEX FADE. Without it the cone is a bright blob welded to the lens —
        the brightest pixel in frame lands on the one place nothing is
        happening.
     3. RIM. A light volume is brightest at its SILHOUETTE, because edge-on you
        are looking through far more of it. This is the term that stops a cone
        reading as a flat translucent triangle, which is what all six were.
     4. SWEEP. A soft band travelling apex-to-far, one pass per ~2.9 s. The
        cheapest change in the file that converts "cone" into "sensing".

   Plus the ground footprint, which is not a shader term but is what makes a
   cone read as AIMED AT A PLACE rather than hanging in air.
=========================================================================== */

export interface SightCone {
  group: THREE.Group;
  /** place + orient + scale in one call; halfAngle in radians */
  aim: (from: THREE.Vector3, to: THREE.Vector3, halfAngle: number) => void;
  setOpacity: (o: number) => void;
  tick: (t: number) => void;
  dispose: () => void;
  /** The volume's material. Exposed so a scene that drives opacity through a
      shared material loop (the hero cards do) can register it and tag it with
      `userData.max` / `userData.tier`. `opacity` on it is aliased to the
      uOpacity uniform — see the note by the alias. */
  material: THREE.ShaderMaterial;
}

/* ONE unit cone for every sight cone on the page.

   Open-ended, unit radius, unit height, translated so the APEX sits at the
   local origin and the volume opens along local -Y — gate-vision's idiom,
   which every other scene had already copied by hand at its own fixed length.
   Keeping it unit means `aim()` can express length as a scale, so a scene that
   re-aims every frame (tank) rebuilds nothing.

   SHARED, and flagged as such. `_barGeo` above carries the same guard for the
   same reason: the dispose sweep in _vision/studio.ts traverses the scene
   graph and disposes every geometry it finds that is not marked, so a scene
   torn down with its cone still attached would destroy this for every other
   cone on the page. `dispose()` below must never touch it. */
const _coneGeo = new THREE.ConeGeometry(1, 1, 28, 1, true);
_coneGeo.translate(0, -0.5, 0);
_coneGeo.userData.shared = true;

/* Likewise the ground pool. Flat in XZ, unit radius, so the footprint is a
   position and a scale. 40 segments: it is a soft-edged disc, the silhouette
   never resolves, and past ~32 nobody can tell. */
const _poolGeo = new THREE.CircleGeometry(1, 40);
_poolGeo.rotateX(-Math.PI / 2);
_poolGeo.userData.shared = true;

/* Segment count is a constructor option in the public signature and this cache
   ignores it, deliberately: 28 is smooth enough that no caller has ever wanted
   more, and honouring the option would mean a geometry per distinct value and
   a second thing to keep flagged. If a caller ever genuinely needs a different
   tessellation, key a Map by segments here and flag every entry. */

const _UP_NEG_Y = new THREE.Vector3(0, -1, 0);

const CONE_VERT = `
  varying float vT;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    /* The unit geometry has its apex at y = 0 and its far end at y = -1, so
       -position.y IS the axial parameter: 0 at the lens, 1 at maximum range.
       Taken from LOCAL position on purpose — aim() puts the length into
       scale.y, and a view-space or world-space derivation would make every
       shader term depend on how long the cone happens to be. */
    vT = -position.y;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    /* normalMatrix is the inverse-transpose, so it survives the NON-UNIFORM
       (r, len, r) scale that aim() applies. A plain modelViewMatrix multiply
       would skew the normal and the rim term would band along the cone. */
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const CONE_FRAG = `
  varying float vT;
  varying vec3 vN;
  varying vec3 vV;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uSweep;

  void main() {
    /* 1. RANGE FALLOFF — the whole reason this module exists. The volume dies
          out over its last 48% instead of ending on a visible disc. Light does
          not have an edge you can point at. */
    float far = 1.0 - smoothstep(0.52, 1.0, vT);

    /* 2. APEX FADE. The cone converges to a point at the lens, so without this
          every pixel piles up in one place and the brightest thing in frame is
          a blob welded to the camera housing. 10% is enough to hide the
          singularity and short enough not to detach the beam from its source. */
    float near = smoothstep(0.0, 0.10, vT);

    /* 3. RIM. Edge-on you look through the full width of the volume; face-on
          through almost none of it. abs() because DoubleSide means the back
          faces arrive with their normals reversed and both walls must brighten
          identically. The 0.22 floor keeps the interior present rather than
          hollow — a pure rim term reads as a wireframe outline, not a volume. */
    vec3 n = normalize(vN);
    vec3 v = normalize(vV);
    float rim = pow(1.0 - abs(dot(n, v)), 1.6);
    float body = 0.22 + 0.78 * rim;

    float alpha = far * near * body;

    /* 4. SWEEP. A gaussian band travelling apex to far end, one pass per
          ~2.9 s. uSweep is a UNIFORM, not a define: flipping a define means a
          program recompile, and this repo has paid ~2.4 s cold for exactly
          that class of mistake (see the seal note in container-vision).
          At uTime = 0 the band sits at vT = 0, where the apex fade is already
          zero — so it cannot pop on the first frame. */
    float band = exp(-pow((vT - fract(uTime * 0.34)) * 7.0, 2.0));
    alpha *= 1.0 + 0.85 * band * uSweep;

    float a = alpha * uOpacity;
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor, a);
    /* REQUIRED in a raw ShaderMaterial. three converts uColor sRGB->linear on
       the way in and hands a custom shader none of the output plumbing back,
       so without this the authored colour renders at roughly an eighth of its
       brightness. Documented trap; it has bitten the cyclorama and the crane
       heatmap already. */
    #include <colorspace_fragment>
  }
`;

const POOL_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const POOL_FRAG = `
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  void main() {
    // CircleGeometry UVs run 0..1 with the centre at 0.5, so this is 0 at the
    // middle and 1 at the rim.
    float r = length(vUv - vec2(0.5)) * 2.0;
    float a = 1.0 - smoothstep(0.55, 1.0, r);
    /* A slow breathe, so the pool is alive without being an animation. At
       uTime = 0 this sits at 0.85 — the low end of its range, not a
       degenerate value — which is what the reduced-motion scenes see. */
    a *= 0.85 + 0.15 * sin(uTime * 1.1);
    a *= uOpacity;
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor, a);
    #include <colorspace_fragment>
  }
`;

export function createSightCone(opts?: {
  color?: string;
  segments?: number;
  blend?: "add" | "normal";
  sweep?: boolean;
  /** World Y of the floor. Omit for no ground pool. */
  footprintY?: number;
}): SightCone {
  const color = new THREE.Color(opts?.color ?? "#5CC8FF");
  const sweep = opts?.sweep ?? true;
  /* ADDITIVE BY DEFAULT: a volume of light on a dark ground accumulates, and
     every scene on this site now has a dark ground. `normal` remains available
     for any caller that needs a straight alpha blend. */
  const blending = (opts?.blend ?? "add") === "add"
    ? THREE.AdditiveBlending
    : THREE.NormalBlending;

  const uniforms = {
    uColor: { value: color },
    uOpacity: { value: 0 },
    uTime: { value: 0 },
    uSweep: { value: sweep ? 1 : 0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: CONE_VERT,
    fragmentShader: CONE_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
    blending,
  });

  /* The single place master opacity is written. Both the explicit setOpacity()
     and the `material.opacity` alias below land here, so the cone and its
     ground pool can never drift apart. */
  function applyOpacity(o: number) {
    masterOpacity = o;
    uniforms.uOpacity.value = o;
    if (poolMat) poolMat.uniforms.uOpacity.value = o * poolReach;
  }

  /* `material.opacity` aliased onto the uniform.

     Several scenes — the four hero cards above all — drive every overlay's
     opacity through one loop that writes `m.opacity` across a materials array.
     A ShaderMaterial's own `opacity` field is inert (three only feeds it to
     the built-in materials' uniforms), so without this alias a cone registered
     in such an array would silently never fade in.

     This is an alias, NOT a second source of truth: both paths land on the
     same uniform, and neither ever touches `transparent`, which is a program
     cache key and would force a synchronous recompile if flipped. */
  Object.defineProperty(material, "opacity", {
    get: () => uniforms.uOpacity.value as number,
    /* Routed through applyOpacity, NOT straight at the uniform. The ground
       pool takes its alpha from the same master, so a card loop writing
       `m.opacity` directly at the cone would fade the volume in and leave the
       pool at zero forever — which is exactly the "documented but never wired"
       class of defect PERFORMANCE.md keeps a list of. */
    set: (v: number) => { applyOpacity(v); },
    configurable: true,
  });

  /* The group itself is never transformed. The cone is rotated onto the sight
     line and the ground pool must stay flat in WORLD XZ, so the pool cannot be
     a child of the rotated cone — both are siblings, each placed by aim() in
     the group's (= the parent scene's) space. */
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(_coneGeo, material);
  group.add(mesh);

  let poolMat: THREE.ShaderMaterial | null = null;
  let pool: THREE.Mesh | null = null;
  const footprintY = opts?.footprintY;
  if (footprintY !== undefined) {
    poolMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: color },
        uOpacity: { value: 0 },
        uTime: { value: 0 },
      },
      vertexShader: POOL_VERT,
      fragmentShader: POOL_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
      blending,
    });
    pool = new THREE.Mesh(_poolGeo, poolMat);
    pool.visible = false;
    group.add(pool);
  }

  const _dir = new THREE.Vector3();
  let masterOpacity = 0;
  // how much of the master the pool gets — set by aim(), see the reach fade
  let poolReach = 0;

  const aim = (from: THREE.Vector3, to: THREE.Vector3, halfAngle: number) => {
    _dir.copy(to).sub(from);
    const len = _dir.length();
    if (len < 1e-6) { group.visible = false; return; }
    group.visible = true;
    _dir.divideScalar(len);

    const r = len * Math.tan(halfAngle);
    mesh.position.copy(from);
    mesh.quaternion.setFromUnitVectors(_UP_NEG_Y, _dir);
    mesh.scale.set(r, len, r);

    if (!pool || !poolMat || footprintY === undefined) return;

    /* RAY-PLANE: the axis is from + s*dir, the floor is y = footprintY, so
       s = (footprintY - from.y) / dir.y. Guard a near-horizontal axis, which
       sends s to infinity, and an axis pointing away from the plane, which
       gives s < 0. */
    if (Math.abs(_dir.y) < 1e-4) { pool.visible = false; return; }
    const s = (footprintY - from.y) / _dir.y;
    if (s <= 0) { pool.visible = false; return; }

    /* REACH. s/len > 1 means the axis crosses the floor PAST the cone's
       nominal end. A hard cut at 1.0 is wrong, and gate-vision is why: it aims
       at a point deliberately sited a few centimetres ABOVE the floor
       (GROUND_Y + 0.1), so its axis reaches the plane at s/len ~ 1.02 and a
       hard cut would delete the pool from a scene that wants one. Instead it
       fades out over 0.85..1.15 of the length, putting gate at roughly 38% — a
       dim pool, which is honest, because the beam really is nearly spent by the
       time it gets there.

       WORK-VISION USED TO BE THE SECOND EXAMPLE HERE AND NO LONGER IS. It aimed
       at GROUND_Y + 0.06 and reached at ~1.02 like gate. Its cones now aim at
       the walker's CHEST (GROUND_Y + 1.05) while their LENGTH is measured
       separately, as the ray-plane distance from the lens down to the floor —
       so it reaches at exactly 1.0 and sits at 50%.

       That decoupling of aim direction from cone length is the thing to
       remember, because this fade is what forces it. Truncating a cone at its
       aim point puts the subject at t ~ 0.95, where the range falloff above has
       already taken the volume to 0.02 — the beam would visibly stop at the
       walker's neck. A camera's field of view does not end at what it happens
       to be looking at. Aim sets the axis; the floor sets the length. */
    const reach = s / len;
    if (reach > 1.15) { pool.visible = false; return; }
    const x = clamp01((reach - 0.85) / 0.30);
    poolReach = 1 - (x * x * (3 - 2 * x));

    pool.visible = true;
    pool.position.copy(from).addScaledVector(_dir, s);
    pool.position.y = footprintY;
    // the cone's radius where it meets the plane — same tan, at distance s
    const pr = s * Math.tan(halfAngle);
    pool.scale.set(pr, 1, pr);
    poolMat.uniforms.uOpacity.value = masterOpacity * poolReach;
  };

  const setOpacity = (o: number) => applyOpacity(o);

  const tick = (t: number) => {
    uniforms.uTime.value = t;
    if (poolMat) poolMat.uniforms.uTime.value = t;
  };

  /* MATERIALS ONLY. _coneGeo and _poolGeo are shared across every cone on the
     page and flagged `userData.shared`; disposing either here would corrupt
     every other cone in the document. */
  const dispose = () => {
    material.dispose();
    poolMat?.dispose();
  };

  return { group, aim, setOpacity, tick, dispose, material };
}
