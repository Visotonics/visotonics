/* ---------------------------------------------------------------------------
   The detection camera — the rig, as shared machinery.

   This is the fifth time this object has been written and the first time it
   has been written once. Tank, gate, crane, cargo and work each hand-built a
   pole, a housing, a lens, an aim policy and a colour rule; `createSightCone`
   and `createTracker` were shared, everything AROUND them was not. Each
   rebuild reintroduced a defect an earlier scene had already fixed. This file
   exists to make that class of defect unexpressible.

   WHAT THE RIG OWNS, AND WHY EACH ONE IS NOT THE SCENE'S BUSINESS:

   1. THE APEX. `aim()` moves the head AND the cone in one call, and reads the
      lens position LIVE from the lens mesh's world matrix. Work Vision shipped
      a cone firing from the world origin for an entire review cycle because
      one line — `model.lensWorld(coneApex)` — was silently missing, and tsc
      cannot catch an absent line. Cargo publishes `lensPos` sampled ONCE at
      build time, which is correct only because cargo's pole never moves; copy
      that to a scene with a tracking head and the cone detaches from the glass
      and emerges from under the housing instead. A scene that cannot touch the
      apex cannot get the apex wrong.

   2. THE HALF-ANGLE. All four aiming scenes derived it with the SAME formula,
      `atan(radius / range)`, with a different constant each time:
          cargo  atan(CONE_R / range)
          crane  atan(CONE_R / max(dist, 0.01))
          gate   atan(0.8 / dist)
          work   max(CONE_HALF_ANGLE, atan(CONE_FOOT / range))
      One function, two parameters — `coneRadius` and an optional
      `minHalfAngle` floor. Nobody retypes the trigonometry again.

   3. AIM DIRECTION IS NOT CONE LENGTH. The hardest-won of the four, and the
      one a new scene is most likely to get wrong. `createSightCone.aim()`
      takes the length from |to - from|, so aiming at the subject truncates the
      beam AT the subject — where the shader's own range falloff has already
      taken the volume to ~0.02, and the beam visibly stops at the walker's
      neck. A real camera's field of view does not end at whatever it happens
      to be looking at. When `floorY` is given, this rig aims the AXIS at the
      target and takes the LENGTH from the ray-plane intersection with the
      floor. See detect.ts's own note by the pool reach fade, which documents
      the same lesson from the other side.

   4. THE COLOUR FLIP. `setSignal(t)` lerps the cone from the observing accent
      to the SIGNAL orange. One implementation, so "the cone goes orange when
      it finds something" cannot mean four slightly different things.
      Crane deliberately stays cool by product-owner instruction — that is
      `setSignal(0)`, an opt-out through the same API, not an exception to it.

   CONVENTION: THE HEAD LOOKS DOWN ITS OWN LOCAL +Z, matching every scene that
   fed this rig — cargo and work set the quaternion from +Z explicitly, and
   tank's `lookAt` resolves to the same thing.

   An earlier draft of this comment claimed `lookAt` points local -Z and that
   tank therefore needed its Z offsets flipped. THAT WAS WRONG, and acting on
   it would have put every migrated lens on the BACK of its housing. For a
   plain Object3D, `lookAt` calls `_m1.lookAt(target, this.position, this.up)`,
   and `Matrix4.lookAt(eye, target, up)` builds z = normalize(eye - target) —
   so with eye = the point being looked at, local +Z ends up pointing AT it.
   It is -Z only for cameras and lights, which take the `isCamera`/`isLight`
   branch. Verified against the three.js source, not assumed.

   WHAT THIS DOES NOT OWN: the mount. A pole, a gantry beam, a crane leg and a
   rack-clamped arm are genuinely different objects and the scene should keep
   building its own — pass `pole: false` and parent the returned group wherever
   it belongs. The optional pole is here only because three scenes wanted the
   same plain pole-and-footplate and there was no reason for three copies.
--------------------------------------------------------------------------- */
import * as THREE from "three";
import { createSightCone, type SightCone } from "../hero-cards/detect";
import { PALETTE } from "./palette";

export interface ReadCameraOpts {
  /** Where the head sits, in the PARENT's space. */
  mount: THREE.Vector3;
  /** Initial aim point, same space. The head is oriented at this on build. */
  aim: THREE.Vector3;
  /** Housing material. The scene's own dark metal. */
  bodyMat: THREE.Material;
  /** Lens material. Usually something darker and glassier than the body. */
  lensMat: THREE.Material;

  /* BRING YOUR OWN LENS — and get no housing at all.

     When set, the rig builds NO yoke, body, hood or lens, and takes this
     object's live world position as the apex. Everything that actually
     matters — live apex, derived half-angle, length decoupled from aim, the
     colour flip — still applies.

     Crane is why this exists. Its two housings are authored in ABSOLUTE
     gantry-leg coordinates with a splayed yaw and a lens barrel across X;
     they are not a head-local rig and never were. Expressing them as one
     would have MOVED them, and crane's housings are placed to the
     centimetre — a lens 0.35 further out sits inside its own leg, which is
     the exact failure its comments record fixing twice. A shared rig that
     can only be adopted by relocating finished geometry is not shareable.

     So: take the machinery, keep your own housing. This is a legitimate way
     to be on the rig, not an escape hatch from it. */
  lensObject?: THREE.Object3D;

  /** The r in atan(r / range) — the cone's radius at the aim distance. */
  coneRadius?: number;
  /** Lower bound on the half-angle. Stops a long throw from going needle-thin. */
  minHalfAngle?: number;
  /** World Y of the floor. Enables the ground pool AND the length decoupling
      described in the header. Omit and the cone simply runs to the target. */
  floorY?: number;
  /** Cool/observing colour. */
  accent?: string;
  /** Warm/conclusion colour, reached at setSignal(1). */
  signal?: string;

  /* DOES THE HEAD SWIVEL?

     Default true — the head turns to face whatever it is told to look at, and
     the cone follows. That is tank and work.

     FALSE means a BOLTED-DOWN camera: the housing keeps the orientation it was
     built with and only the cone re-aims. That is cargo, gate and crane, and
     it is not a degenerate case — a fixed camera watching a fixed point on a
     line is what those installations actually are, and swivelling their heads
     would be a lie about the hardware. The apex is still read live from the
     lens, because that costs nothing and removes the whole class of bug.

     Migrating cargo is what forced this option to exist: its head has a fixed
     derived pitch and only its cone moves, so a rig that always swivelled
     would have silently changed a signed-off scene. */
  headTracks?: boolean;

  /** Housing size. */
  bodySize?: [number, number, number];
  /* HOUSING AND GLASS PLACEMENT ALONG THE SIGHT AXIS.

     Every scene's housing is cosmetically a bit different — cargo centres its
     body on the head origin, work pushes it forward of a yoke — and none of
     that is what this rig is for. The geometry is therefore fully
     parameterised with defaults that match the common idiom, so a migrating
     scene can reproduce its existing silhouette EXACTLY rather than accept a
     house shape it never asked for. Only the aim/apex/half-angle/signal
     machinery is fixed. */
  bodyZ?: number;
  /* Body offset ACROSS the sight axis. Gate's housing hangs slightly below its
     mount point, which a Z-only offset cannot express — migrating it left a
     ~5cm error until this existed. Most scenes leave it at 0. */
  bodyY?: number;
  lensZ?: number;
  /** Lens radius (front). */
  lensR?: number;
  /** Lens radius (back). Defaults to `lensR` for a plain cylinder. */
  lensR2?: number;
  /** Lens barrel length. */
  lensLen?: number;
  /* HOUSING YAW ABOUT ITS OWN MOUNT. Crane's two heads are splayed +-0.5 rad
     so each reads as angled in toward the load rather than as two identical
     boxes stuck on two legs. This turns the BODY only, not the sight axis —
     the cone still goes where `aim` says. A cosmetic splay is not a different
     aim, and conflating the two is how a housing ends up pointing somewhere
     its own beam does not. */
  bodyYaw?: number;
  /* WHICH WAY THE LENS BARREL RUNS. Default "z": the barrel lies along the
     sight axis, which is what a camera pointing at you looks like. Crane
     mounts its glass with the barrel across X, on a housing bolted to a
     gantry leg. This rotates the MESH only and never the apex — `lensWorld`
     reads the mesh's world POSITION, which is axis-independent. */
  lensAxis?: "x" | "z";
  /** The small block tying the housing to its mount. */
  yoke?: boolean;
  /** Yoke block size, if the default 0.07 x 0.14 x 0.07 is wrong for a scene. */
  yokeSize?: [number, number, number];
  /** A sun hood overhanging the glass. Off for compact indoor housings. */
  hood?: boolean;
  /* HOOD DIMENSIONS, because deriving them from the lens was not good enough.
     Work's hood is 0.098 radius and sits 0.06 back from the glass; a radius
     derived as lensR * 1.32 gave 0.095 and a z derived as lensZ - 0.02 put it
     4cm too far forward. Small, but this rig's whole promise is that a
     migrating scene reproduces its silhouette EXACTLY rather than accepting a
     house shape — a derived default that cannot be overridden breaks that. */
  hoodR?: number;
  hoodLen?: number;
  hoodZ?: number;
  /** Build a pole and footplate down to this Y. Omit for a bracket mount. */
  poleFrom?: number;
  /** Pole material, if different from the body. */
  poleMat?: THREE.Material;
}

export interface ReadCamera {
  /** Add to the scene, or to whatever the camera is bolted to. */
  group: THREE.Group;
  /** The cone's own group. A SIBLING of `group`, never a child — see below. */
  coneGroup: THREE.Group;
  cone: SightCone;
  /** The head. Exposed for scenes that need to hang extra dressing on it. */
  head: THREE.Group;

  /** Point the head at a world-space target and re-throw the cone from the
      live lens position in one call. Call it every frame the target moves. */
  aimAt: (target: THREE.Vector3) => void;
  /** Live world position of the glass. Never sampled once. */
  lensWorld: (out: THREE.Vector3) => THREE.Vector3;
  /** 0 = observing (accent), 1 = concluded (SIGNAL). */
  setSignal: (t: number) => void;
  setOpacity: (o: number) => void;
  tick: (t: number) => void;

  /** Geometry the CALLER owns and must fold into its own disposal list —
      the same contract every other builder in this family uses. */
  owned: THREE.BufferGeometry[];
  dispose: () => void;
}

export function buildReadCamera(o: ReadCameraOpts): ReadCamera {
  const coneRadius = o.coneRadius ?? 0.8;
  const minHalfAngle = o.minHalfAngle ?? 0;
  const bodySize = o.bodySize ?? [0.20, 0.18, 0.34];
  const lensR = o.lensR ?? 0.075;
  const accentHex = o.accent ?? PALETTE.accent;
  const signalHex = o.signal ?? "#ED510C";

  const group = new THREE.Group();
  const owned: THREE.BufferGeometry[] = [];

  /* ---- optional pole ---------------------------------------------------- */
  if (o.poleFrom !== undefined) {
    const poleMat = o.poleMat ?? o.bodyMat;
    const h = o.mount.y - o.poleFrom;
    const poleGeo = new THREE.CylinderGeometry(0.055, 0.075, h, 10);
    owned.push(poleGeo);
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(o.mount.x, o.poleFrom + h / 2, o.mount.z);
    pole.castShadow = true;
    group.add(pole);

    // a footplate, so the pole stands ON the deck rather than growing out of it
    const footGeo = new THREE.CylinderGeometry(0.20, 0.20, 0.035, 12);
    owned.push(footGeo);
    const foot = new THREE.Mesh(footGeo, poleMat);
    foot.position.set(o.mount.x, o.poleFrom + 0.018, o.mount.z);
    group.add(foot);
  }

  /* ---- the head --------------------------------------------------------- */
  const head = new THREE.Group();
  head.position.copy(o.mount);
  group.add(head);

  const byo = o.lensObject;
  let lensMesh: THREE.Mesh | undefined;
  if (!byo) {
  if (o.yoke ?? true) {
    const ys = o.yokeSize ?? [0.07, 0.14, 0.07];
    const yokeGeo = new THREE.BoxGeometry(ys[0], ys[1], ys[2]);
    owned.push(yokeGeo);
    const yoke = new THREE.Mesh(yokeGeo, o.bodyMat);
    yoke.position.z = 0.02;
    head.add(yoke);
  }

  const bodyZ = o.bodyZ ?? bodySize[2] * 0.62;
  const bodyGeo = new THREE.BoxGeometry(bodySize[0], bodySize[1], bodySize[2]);
  owned.push(bodyGeo);
  const body = new THREE.Mesh(bodyGeo, o.bodyMat);
  body.position.set(0, o.bodyY ?? 0, bodyZ);
  if (o.bodyYaw) body.rotation.y = o.bodyYaw;
  body.castShadow = true;
  head.add(body);

  const lensZ = o.lensZ ?? bodyZ + bodySize[2] * 0.5 + 0.07;
  if (o.hood ?? true) {
    const hr = o.hoodR ?? lensR * 1.32;
    const hoodGeo = new THREE.CylinderGeometry(hr, hr, o.hoodLen ?? 0.14, 14, 1, true);
    owned.push(hoodGeo);
    const hood = new THREE.Mesh(hoodGeo, o.bodyMat);
    hood.rotation.x = Math.PI / 2;
    hood.position.z = o.hoodZ ?? lensZ - 0.02;
    head.add(hood);
  }

  const lensGeo = new THREE.CylinderGeometry(lensR, o.lensR2 ?? lensR, o.lensLen ?? 0.04, 16);
  owned.push(lensGeo);
  lensMesh = new THREE.Mesh(lensGeo, o.lensMat);
  if ((o.lensAxis ?? "z") === "x") lensMesh.rotation.z = Math.PI / 2;
  else lensMesh.rotation.x = Math.PI / 2;
  lensMesh.position.z = lensZ;
  head.add(lensMesh);
  }

  /* The object whose world position IS the apex: the housing's own glass, or
     the caller's when it brought its own. */
  const apexObj: THREE.Object3D = byo ?? lensMesh!;

  /* ---- aiming ----------------------------------------------------------- */
  const _fwd = new THREE.Vector3(0, 0, 1);
  const _to = new THREE.Vector3();
  const _lens = new THREE.Vector3();
  const _dir = new THREE.Vector3();
  const _end = new THREE.Vector3();

  const lensWorld = (out: THREE.Vector3) => {
    /* updateMatrixWorld on the apex object's own root, not blindly on `head`:
       with a caller-supplied lens the glass may live anywhere in the graph. */
    apexObj.updateWorldMatrix(true, false);
    return apexObj.getWorldPosition(out);
  };

  /* THE CONE IS A SIBLING, NOT A CHILD OF THE HEAD. It cannot be parented to a
     rotating head: its ground pool must stay flat in WORLD XZ, and a pool
     inheriting the head's pitch would tilt into the floor. Tank discovered
     this and worked around it locally; detect.ts's own group is built on the
     same assumption. `aim()` places both in the PARENT's space each frame. */
  const cone = createSightCone({
    color: accentHex,
    footprintY: o.floorY,
    sweep: true,
  });
  const coneGroup = cone.group;

  const headTracks = o.headTracks ?? true;

  const aimAt = (target: THREE.Vector3) => {
    /* 1. the head looks at the target down its local +Z — unless it is bolted
       down, in which case it keeps the orientation it was built with and only
       the cone below moves. */
    if (headTracks) {
      _to.copy(target).sub(head.position).normalize();
      head.quaternion.setFromUnitVectors(_fwd, _to);
    }

    // 2. the apex is the glass, read live AFTER any rotation above
    lensWorld(_lens);

    // 3. axis from the real lens to the real target
    _dir.copy(target).sub(_lens);
    const range = Math.max(_dir.length(), 1e-4);
    _dir.divideScalar(range);

    /* 4. LENGTH, decoupled from aim. With a floor, run to the floor along the
       axis; the cone should outlast whatever it is looking at. Guard a
       near-horizontal axis (s -> infinity) and an axis pointing up and away
       from the plane (s < 0) by falling back to the plain target distance. */
    let len = range;
    if (o.floorY !== undefined && _dir.y < -1e-4) {
      const s = (o.floorY - _lens.y) / _dir.y;
      if (s > 0) len = s;
    }

    // 5. one formula, every scene
    const half = Math.max(minHalfAngle, Math.atan(coneRadius / range));

    _end.copy(_lens).addScaledVector(_dir, len);
    cone.aim(_lens, _end, half);
  };

  /* THE BUILD-TIME ORIENTATION IS UNCONDITIONAL. `headTracks: false` means the
     head does not FOLLOW, not that it is never pointed anywhere — a bolted
     camera still has to be bolted facing its subject. Setting it here rather
     than inside aimAt() is what lets a fixed rig keep a derived pitch (cargo's
     is atan of the drop over the reach) while its cone still re-aims freely. */
  _to.copy(o.aim).sub(head.position).normalize();
  head.quaternion.setFromUnitVectors(_fwd, _to);
  aimAt(o.aim);

  /* ---- signal ----------------------------------------------------------- */
  const _cool = new THREE.Color(accentHex);
  const _warn = new THREE.Color(signalHex);
  const setSignal = (t: number) => {
    const c = cone.material.uniforms.uColor.value as THREE.Color;
    c.copy(_cool).lerp(_warn, Math.min(1, Math.max(0, t)));
  };

  return {
    group,
    coneGroup,
    cone,
    head,
    aimAt,
    lensWorld,
    setSignal,
    setOpacity: (v: number) => cone.setOpacity(v),
    tick: (t: number) => cone.tick(t),
    owned,
    /* MATERIALS ONLY — geometry goes back in `owned`. The cone's own dispose
       is materials-only too, because _coneGeo/_poolGeo are shared and flagged. */
    dispose: () => { cone.dispose(); },
  };
}
