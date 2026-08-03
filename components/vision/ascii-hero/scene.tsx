"use client";

/* ---------------------------------------------------------------------------
   ASCII hero — the background field. v4.

   v4 IS A DENSITY FIELD; v3 WAS A QUANTIZED RENDER. That is the change, and it
   is a change of medium rather than of settings. v3 hard-lit a 3D form and let
   the glyph pass quantize the picture: flat faces gave one luminance each, one
   luminance gave one glyph across the whole face, and a small centred subject
   inside comfortable margins gave a museum piece — an object in a vitrine.

   The reference (Passflow) is not showing an object at all. It is a soft cloudy
   MASS that condenses into a silhouette, with internal clusters and voids that
   flow constantly, a scatter of "?" glyphs BEYOND the silhouette edge, "/"
   streaking the mid-tones, "$" and "@" clumping in the core, and the form so
   large it bleeds off-frame. Its type stays legible because each line carries a
   solid black chip behind it, not because the field is dimmed — which is
   exactly why its field is allowed to be rich.

   SO THIS FILE'S JOB CHANGED. The forms are no longer the picture; they are
   SILHOUETTE AND SHADING SOURCES. The override material packs a hard mask in R
   and shape-lighting in G, the camera is framed to overflow rather than to fit,
   and ascii.ts constructs the field's actual luminance out of those two
   channels plus flowing noise. Everything below about cadence, dissolve,
   normalisation and lifecycle is unchanged and still correct.

   THREE PREVIOUS VERSIONS ARE BURIED UNDER THIS ONE, and the post-mortems are
   worth keeping, because every failure was a lesson about the medium.

   V1 CYCLED THE FOUR CARD SUBJECTS AND WAS SCRAPPED ON SIGHT.

     · The card subjects are wide dioramas of THIN members — gantry beams,
       masts, rollers — and at 8x13px cells thin members fall between cells and
       alias into static. Nothing was recognisable, and a character field whose
       subject cannot be named in a second is just noise.
     · v1 forced every material to opacity 1, which promoted the detection
       cones (designed for <=0.42 under the cards' vision-layer system) into
       the brightest surfaces in frame. The luminance pass then faithfully
       rendered the OVERLAY GRAPHICS instead of the machinery — the field's
       centrepiece was a sight cone.

   V2 WAS ONE CONTAINER ON A TURNTABLE, and it was correct about the medium and
   wrong about the brief. A box does survive a coarse grid, its corrugation does
   give the field the vertical striping it loves, and lighting for shape rather
   than realism deleted v1's entire failure surface. But one object turning is
   an object turning. The reference is ONE CONTINUOUS FIELD THAT MORPHS between
   the things it is showing — the field is the subject, and the forms are what
   it happens to be spelling at the moment.

   SO v3 MORPHS: container → crane → camera → people → back to the container,
   forever. The transition is a per-cell noise dissolve in luminance space,
   computed in the glyph shader from two render targets.

   THE TWO ALTERNATIVES WERE BOTH TRIED AND BOTH REJECTED. A hard cut is a
   slideshow; four glimpses of four subjects is exactly what killed v1. A
   crossfade is worse in this medium than in any other — averaging two
   luminance images gives every cell a value belonging to neither form, so the
   grid fills with glyphs that are the arithmetic mean of a container and a
   crane, and for the whole transition the field shows two ghosts and no
   object. The dissolve is the only transition that reads as the FIELD doing
   the changing: at any instant each cell is showing one form or the other,
   honestly, and only the MAP of which is which moves.

   EVERY FORM IS PRE-NORMALISED TO ONE SIZE in forms.ts — same half-height,
   same half-width — so the morph reads as one mass reshaping and never as a
   zoom. The camera is framed from that shared budget, not from any one form's
   bounds, which is why it never has to be told which form is up.

   LIT FOR SHAPE, NOT REALISM, via scene.overrideMaterial: one shader that
   computes key + fill + rim from the surface normal and outputs luminance
   directly. No scene lights, no exposure compensation, no per-material opacity
   to stomp, no tone mapping in the loop (raw ShaderMaterial output skips ACES),
   and every form's structure reads because normals carry it.

   IT IS A BACKGROUND AND MUST BEHAVE LIKE ONE. `intensity` belongs to the
   page: 1.0 on the review route where the point is to look at it, ~0.4 behind
   a headline, where it has failed the moment it competes with the type.
--------------------------------------------------------------------------- */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { PALETTE } from "../_vision/palette";
import { createStudio } from "../_vision/studio";
import { mountWhenVisible } from "../_vision/mount";
import { clamp01, easeInOut, smoothstep } from "../_vision/camera";
import { buildForms, FORM_HY, FORM_HX } from "./forms";
import { createAsciiPass } from "./ascii";

/* THE CADENCE. 3s of dwell is long enough to name the form — the field has to
   be a container, not a shape that was briefly containerish — and 1.4s of
   morph is long enough to WATCH it happen, which is the point of building a
   dissolve rather than a cut. Shorter dwell and the sequence turns back into
   the v1 slideshow; longer morph and the field spends most of its life in the
   unreadable middle. */
const DWELL = 3.0;
const MORPH = 1.4;
const SLOT = DWELL + MORPH;

/* One slow shared yaw for the WHOLE stack, 22s a revolution — not per-form.
   Every form is alive during its dwell, and because both the outgoing and the
   incoming form sit under the same rotating root, a morph happens between two
   MOVING silhouettes rather than between two frozen ones. The rotation is never
   reset and never restarted, so no form arrives at a fixed angle and there is
   no seam anywhere in the cycle. Slow, because fast rotation churns every
   cell's glyph each frame and the field reads as video noise. */
const REV = 22;

export default function AsciiHeroScene(
  { intensity = 1 }: { intensity?: number } = {},
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const wrap = wrapRef.current;
    if (!host || !wrap) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    return mountWhenVisible(wrap, () => {
      let cleanup = () => {};
      try {
        /* The studio is used for renderer lifecycle only. Its lights never
           reach the frame (the override material ignores them), bloom and env
           are off, and shadows are disabled outright — this pass is a
           luminance source, and every scene feature that exists to make a
           PICTURE is dead weight here. */
        const studio = createStudio(wrap, {
          floorY: -1.0, shadowExtent: 5, bloom: false,
          shadowMapSize: 512, maxDpr: 1, noEnv: true, lightRig: "lite", bare: true,
        });
        const { renderer, scene, camera } = studio;
        renderer.shadowMap.enabled = false;

        /* The studio's shadow-catcher is a 60x60 plane at floorY. Under an
           override material it stops being an invisible shadow receiver and
           renders as a giant lit sheet across the bottom of frame — hide it. */
        scene.traverse((o) => {
          if ((o as THREE.Mesh).material === studio.shadowMat) o.visible = false;
        });

        /* THE SOURCE MATERIAL — no longer a luminance material. v4 packs TWO
           SEPARATE THINGS into the target and ascii.ts uses them differently:

             R = 1.0, unconditionally. This fragment exists, therefore this is
                 form — a hard silhouette mask, and hard on purpose. ascii.ts
                 blurs it into the soft density envelope and taps it wide for the
                 fringe, and both of those want a clean step to work from; a
                 pre-softened mask would blur twice and the halo would smear.
             G = the shape-lighting, which is now only the INTERIOR structure
                 signal. It no longer has to draw the silhouette on its own,
                 because R does that.

           v3 collapsed both jobs into one grey value and could not separate
           them, which is why its edges and its interiors were made of the same
           material. Key from upper-left, a weak fill from the right so downstage
           faces never go to zero, and a strong rim. Lights are defined in VIEW
           space, so the shading holds still while the subject turns under it: a
           turntable in a fixed studio, which is the classic way to read a
           form. */
        const luma = new THREE.ShaderMaterial({
          uniforms: {},
          vertexShader: `
            varying vec3 vN;
            varying vec3 vV;
            void main() {
              vN = normalize(normalMatrix * normal);
              vec4 mv = modelViewMatrix * vec4(position, 1.0);
              vV = -mv.xyz;
              gl_Position = projectionMatrix * mv;
            }`,
          fragmentShader: `
            varying vec3 vN;
            varying vec3 vV;
            void main() {
              vec3 n = normalize(vN);
              vec3 v = normalize(vV);
              float key  = max(dot(n, normalize(vec3(-0.45, 0.60, 0.66))), 0.0);
              float fill = max(dot(n, normalize(vec3( 0.70, 0.05, 0.35))), 0.0);
              float rim  = pow(1.0 - max(dot(n, v), 0.0), 2.4);
              float l = 0.10 + 0.58 * key + 0.16 * fill + 0.40 * rim;
              gl_FragColor = vec4(1.0, l, 0.0, 1.0);
            }`,
        });
        scene.overrideMaterial = luma;

        /* ALL FOUR FORMS ARE BUILT ONCE AND LIVE FOR THE MOUNT'S LIFETIME, in
           one shared root. They are hidden and shown per draw rather than added
           and removed, because add/remove churns three's render lists and a
           form that has never been rendered compiles its program the first time
           it IS — which would land a compile stall on the first frame of every
           morph, forever. Visibility is free. */
        const forms = buildForms();
        const formsRoot = new THREE.Group();
        forms.forEach((f) => { f.group.visible = false; formsRoot.add(f.group); });
        scene.add(formsRoot);

        /* TWO TARGETS, one per side of the dissolve. Both are one texel per
           character cell — see the header note in ascii.ts — so the pair costs
           roughly 12k texels between them, which is the cheapest possible way
           to have two images of two different objects available at once. */
        const rtOpts = {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          depthBuffer: true,
        };
        const rtA = new THREE.WebGLRenderTarget(64, 64, rtOpts);
        const rtB = new THREE.WebGLRenderTarget(64, 64, rtOpts);

        const pass = createAsciiPass(rtA.texture, rtB.texture, new THREE.Color(PALETTE.grid));

        /* Framing, budgeted from the FORMS' shared size rather than from any
           one form's bounds — that is the whole reason forms.ts normalises. A
           camera that refitted per form would zoom on every morph, which is
           precisely the illusion the normalisation exists to protect.

           THE FORM NOW OVERFLOWS THE FRAME, and that is the v4 correction. A
           FIELD's form bleeds off its window; a museum piece sits politely
           inside it with margins all round. v3 was the latter — 62% of the
           half-height, centred, framed — and it was wrong: it read as an object
           on display rather than as a mass condensing out of the field that
           fills the screen.

           Height fit: the form fills ~108% of the frame's HALF-HEIGHT, so it
           bleeds top and bottom, the way the reference's lock exits its frame.
           Width fit: it may reach 95%, with the half-width budget padded by 1.12
           to cover the crane form's pendulum sway, whose swinging box reaches
           outside the static bounds the normaliser measured.

           This is an icon on a turntable, not a survey rig, so it sets the
           camera directly rather than through placeCamera's ground-distance
           grammar — the house rule exists to keep camera MOVES honest, and this
           camera does not move. */
        const TAN15 = Math.tan((15 * Math.PI) / 180);
        const frame = () => {
          const w = renderer.domElement.clientWidth || wrap.clientWidth || 1;
          const h = renderer.domElement.clientHeight || wrap.clientHeight || 1;
          const aspect = w / h;
          /* 0.92, back from 1.08: rendered, the full-bleed form left no dark for the
           silhouette to read against — the reference's lock bleeds the TOP but
           keeps night air on its flanks. The form now stands slightly inside the
           frame vertically and well inside horizontally, and the fringe has a
           band to live in. */
        const distH = FORM_HY / (0.92 * TAN15);
          const distW = (FORM_HX * 1.12) / (0.80 * TAN15 * Math.max(aspect, 0.2));
          const dist = Math.max(distH, distW);
          camera.position.set(0, dist * 0.20, dist);
          camera.lookAt(0, 0, 0);
          camera.aspect = aspect;
          camera.updateProjectionMatrix();
          // BOTH targets track the cell grid, or the two halves of the dissolve
          // would be sampled on different lattices
          pass.setSize(w, h, rtA);
          pass.setSize(w, h, rtB);
        };
        const ro = new ResizeObserver(() => { studio.size(); frame(); });
        ro.observe(wrap);

        let onScreen = true;
        const visObs = new IntersectionObserver(
          ([e]) => { onScreen = e.isIntersecting; },
          { rootMargin: "200px" },
        );
        visObs.observe(wrap);

        /* REVIEW PIN, same convention as the flagship scenes' ?phase: append
           ?t=<seconds> and the clock freezes at that value. A field that never
           repeats cannot be reviewed frame-by-frame or compared against a
           previous build, because no two looks are ever at the same moment —
           so the URL carries the moment. */
        const pinned = new URLSearchParams(location.search).get("t");
        const pinT = pinned === null ? null : Number(pinned);
        const holdT = pinT !== null && Number.isFinite(pinT) ? pinT : null;

        const clock = new THREE.Clock(false);
        let clockStarted = false;
        let raf = 0;

        const draw = () => {
          const t = reduce ? 0 : (holdT ?? clock.getElapsedTime());

          /* THE SEQUENCER. Absolute time modulo the cycle, so the schedule is
             stateless — nothing accumulates, nothing drifts, and a frame
             dropped or a tab backgrounded for a minute resumes at the right
             place instead of resuming mid-morph. `within` is the position
             inside this slot: dwell first, then morph, and easeInOut on the
             morph so the dissolve front starts and stops rather than snapping
             into motion at full speed. */
          const N = forms.length;
          const CYCLE = N * SLOT;
          const ct = t % CYCLE;
          const slot = Math.floor(ct / SLOT);
          const cur = slot % N;
          const nxt = (slot + 1) % N;
          const within = ct - slot * SLOT;
          const mix = reduce ? 0 : easeInOut(clamp01((within - DWELL) / MORPH));

          /* 0.6 rad start angle: a dead-on side view opens flat and the form
             only appears once the turn begins; starting on the three-quarter
             gives the first frame depth. */
          formsRoot.rotation.y = 0.6 + (reduce ? 0 : (t * Math.PI * 2) / REV);
          forms.forEach((f) => f.tick?.(t));

          pass.material.uniforms.uMix.value = mix;
          pass.material.uniforms.uTime.value = t;
          pass.material.uniforms.uOpacity.value =
            intensity * (reduce ? 1 : clamp01(smoothstep(0, 0.8, t)));

          // render the CURRENT form into A
          forms.forEach((f, i) => { f.group.visible = i === cur; });
          renderer.setRenderTarget(rtA);
          renderer.clear();
          renderer.render(scene, camera);

          // during a morph, render the NEXT form into B; otherwise skip the pass —
          // the shader still samples B, but a stale target under uMix 0 contributes
          // exactly nothing, and skipping the render halves the 3D cost at rest
          if (mix > 0) {
            forms.forEach((f, i) => { f.group.visible = i === nxt; });
            renderer.setRenderTarget(rtB);
            renderer.clear();
            renderer.render(scene, camera);
          }

          renderer.setRenderTarget(null);
          renderer.clear();
          renderer.render(pass.scene, pass.camera);
        };

        /* REDUCED MOTION IS ALREADY PARKED by the code above and needs no
           separate branch: t is pinned to 0, so the sequencer lands in slot 0
           (the container), mix is 0 so no morph and no boil, the yaw holds at
           its 0.6 rad three-quarter, every form's tick gets t 0, uTime is 0 so
           the ambient field does not reshuffle, and opacity goes straight to
           full instead of fading in. A still frame of a container in
           characters — the picture, without the motion. */

        void renderer.compileAsync(scene, camera).catch(() => {});

        let primed = false;
        const MIN_DT = 1 / 31;   // a character field needs no more
        let last = -1;
        const loop = () => {
          raf = requestAnimationFrame(loop);
          if (!onScreen) {
            if (!primed) { primed = true; frame(); draw(); }
            return;
          }
          primed = true;
          if (!clockStarted) { clock.start(); clockStarted = true; }
          const now = clock.getElapsedTime();
          if (now - last < MIN_DT) return;
          last = now;
          draw();
        };
        raf = requestAnimationFrame(loop);

        cleanup = () => {
          cancelAnimationFrame(raf);
          ro.disconnect();
          visObs.disconnect();
          forms.forEach((f) => f.dispose());
          luma.dispose();
          pass.dispose();
          rtA.dispose();
          rtB.dispose();
          studio.dispose();
        };
      } catch (err) {
        console.error("[ascii-hero] init failed:", err);
      }
      return () => cleanup();
    }, "ascii-hero");
  }, [intensity]);

  return (
    <div ref={hostRef} style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={wrapRef} aria-hidden style={{ position: "absolute", inset: 0 }} />
    </div>
  );
}
