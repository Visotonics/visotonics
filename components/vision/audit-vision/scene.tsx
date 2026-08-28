"use client";

/* ---------------------------------------------------------------------------
   Audit Vision — the dispute arrives, the clip already exists.

   Claim:   "The dispute arrives. The clip already exists."
   Eyebrow: "01 Detect, don't trigger — no barcode. no button. the system sees
             it. / 02 Bind to the ID / 03 Retrieve in seconds"

   Spine (docs/17-scene-plans-audit-dimension-secure.md §3): a barcode scanner
   sits dark in its cradle for the entire loop while a carton is packed,
   sealed, detected, bound to an order ID and logged — with NO scan ever
   happening. `mats.ledOff` is asserted never to change in audit.ts; this file
   never reaches toward the scanner and never re-aims anything at it. The
   camera is bolted (`headTracks:false`) and azimuth is held above 0.05 rad on
   every key, per the spec's own warning: below that the scanner at x -0.86
   slides behind the carton's tracker bracket and the anti-prop is lost.

   LOOP, p = 0..1 over 11.0s (see §3.8):
     0.00-0.14  hold. carton open, scanner dark, cone observing.
     0.14-0.26  THE WORK. flaps fold (side then long), the one animated joint
                (right forearm, elbow only) runs the tape. scanner untouched.
     0.26-0.34  DETECT, DON'T TRIGGER. accent tracker locks on the carton.
     0.34-0.46  hold the detection — the scanner sits dark in frame while
                readout row 2 states "no scan". This is where the argument
                actually lands.
     0.46-0.62  BIND. an ID chip resolves and a leader draws to it.
     0.62-0.70  THE CONCLUSION — the only #ED510C event this loop spends.
                Cone flips signal, bracket swaps orange, ID chip rule orange.
                Binding, not severity: createCallout is `severe:false`.
     0.70-0.84  LOG. a ledger row lands.
     0.84-0.94  CLIP attached — closes "the clip already exists" with no
                search UI staged, per the brief.
     0.94-1.00  WRAP. Cone and bracket fade; flaps reopen and the tape strip
                retracts UNDER the fade, completed by p=0.985 (§3.8's own
                risk note) so nothing is mid-motion at the seam.

   CAMERA. §3.2's worked fit, re-derived here rather than copied:
     sMaxH = 0.95, FRAC_H = 0.74   ->  radH = 0.95 / (0.74*0.267949) = 4.791
     sMaxW = 1.30, FRAC_W = 0.66, aspect 1.333 (4:3 slot)
                                   ->  radW = 1.30 / (0.66*0.267949*1.333) = 5.515
     rad = max(4.791, 5.515) = 5.515  -- WIDTH binds, exactly as the spec says
     (a 4:3 frame is "tall" relative to a 30deg-vertical-fov camera, so the
     wider of the two candidate distances wins here rather than the usual
     height-bound case most of these scenes hit.)
   camY 2.25, look-at y 1.05 constant on every key (a pure pan, per house rule).
--------------------------------------------------------------------------- */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { PALETTE } from "../_vision/palette";
import { createStudio } from "../_vision/studio";
import { mountWhenVisible } from "../_vision/mount";
import { clamp01, easeInOut, smoothstep, placeCamera, makeCamPath, type CamKey } from "../_vision/camera";
import { createCallout, createReadout, makeProjector, placeCallout } from "../_vision/overlay";
import { buildReadCamera } from "../_vision/readCamera";
import { createTracker } from "../hero-cards/detect";
import { draftingGround, setGroundOpacity } from "../hero-cards/ground";
import { buildPendantLamp } from "../_vision/lamp";
import { buildAuditMaterials, buildAudit, warmAuditTextures, GROUND, BENCH_TOP } from "./audit";

const LOOP = 11.0;
const SETTLE = 0.85;

const FROZEN_T = 7.26;   // ~ p 0.66, mid-conclusion — the reduced-motion frame
const FROZEN_P = 0.66;

/* ---- camera: fixed derivation, see header ---- */
const VFOV_HALF = (30 * Math.PI) / 180 / 2;
const TAN_VFOV_HALF = Math.tan(VFOV_HALF);
const FRAC_H = 0.74;
const FRAC_W = 0.66;
const SUBJECT_H = 1.90;   // 2 * sMaxH (0.95)
const SUBJECT_W = 2.60;   // 2 * sMaxW (1.30)
const CAM_Y = 2.25;
const LOOK_Y = 1.05;
const RAD_MIN = 3.2;
const RAD_MAX = 18;

const CAM_KEYS: CamKey[] = [
  { p: 0.00, az: 0.30, rad: 5.52, t: [0.02, LOOK_Y, 0.00] },
  { p: 0.24, az: 0.22, rad: 5.36, t: [0.06, LOOK_Y, 0.02] },
  { p: 0.46, az: 0.12, rad: 5.20, t: [0.00, LOOK_Y, 0.02] },
  { p: 0.68, az: 0.06, rad: 5.08, t: [-0.04, LOOK_Y, 0.00] },
  { p: 0.88, az: 0.22, rad: 5.44, t: [0.02, LOOK_Y, 0.00] },
];
const camPath = makeCamPath(CAM_KEYS);

/* ---- beats ---- */
const WORK_SIDE: [number, number] = [0.14, 0.20];
const WORK_LONG: [number, number] = [0.20, 0.26];
const RESET_IN = 0.94;
const RESET_OUT = 0.985; // reset MUST complete by here — see header
const DETECT: [number, number] = [0.26, 0.34];
const BIND: [number, number] = [0.46, 0.62];
const CONCLUDE: [number, number] = [0.62, 0.65]; // the flip itself, 0.03 wide
const LOG_IN = 0.70;
const CLIP_IN = 0.84;
const OUT_IN = 0.94;
const OUT_OUT = 1.0;

const CONCLUSION = "#ED510C";

export default function AuditVisionScene({ bare = false, bleed = 0 }: { bare?: boolean; bleed?: number } = {}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const wrap = canvasWrapRef.current;
    const overlay = overlayRef.current;
    if (!host || !wrap || !overlay) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    return mountWhenVisible(wrap, () => {
      let cleanup = () => {};

      try {
        const studio = createStudio(wrap, {
          /* EXPOSURE 0.60 -> 0.44. The single control that was wrong here, and
             it made everything else look wrong with it: at 0.60 the painted
             frame rendered as a bright primary blue when #2C4A73 is a dark
             navy, the kraft went pale, and the figure's #B85413 vest blew to a
             flat yellow — which is most of why it read as a plastic blob
             rather than a worker in hi-vis. The materials were correct; the
             tone curve was eating them.
             This subject is SMALL and CLOSE (bench at rad 5.5) with a pendant
             directly over it, so it sits far higher on the curve than a
             container-sized subject at container distance, which is what the
             0.60-ish default is keyed to. Cargo, crane and work all sit lower
             for the same reason. */
          floorY: 0.958, shadowExtent: 3.6, spread: 0.9, exposure: 0.44,
          bare, bloom: false, shadowMapSize: 1024, maxDpr: 1.75, lightRig: "full", noEnv: false,
        });
        const { renderer, scene, camera, shadowMat } = studio;

        // second catcher, at the bench top itself, so the carton's own
        // contact shadow lands on the bench and not 0.955 below it on the
        // floor — the same raised-surface rule Dimension Vision documents.
        const benchShadowMat = new THREE.ShadowMaterial({ opacity: 0 });
        const benchCatcher = new THREE.Mesh(new THREE.PlaneGeometry(3, 2), benchShadowMat);
        benchCatcher.rotation.x = -Math.PI / 2;
        benchCatcher.position.set(0, BENCH_TOP + 0.003, 0);
        benchCatcher.receiveShadow = true;
        scene.add(benchCatcher);

        scene.fog = new THREE.Fog(0x0a0b0e, 8, 26); // set from camDist once framing is known

        // ---- floor + drafting ground ----
        const floorGeo = new THREE.PlaneGeometry(24, 24);
        const mats = buildAuditMaterials();
        const floor = new THREE.Mesh(floorGeo, mats.deck);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = GROUND;
        floor.receiveShadow = true;
        scene.add(floor);

        const ground = draftingGround({
          size: 30, step: 0.5, y: 0.008, color: PALETTE.grid, opacity: 0.12,
          fadeStart: 0.45, fadeEnd: 1.0, majorBoost: 2.2,
        });
        scene.add(ground.mesh);

        const wallGeo = new THREE.PlaneGeometry(14, 4.4);
        const wall = new THREE.Mesh(wallGeo, mats.wall);
        wall.position.set(0, 2.2, -2.6);
        scene.add(wall);

        // ---- subject ----
        const model = buildAudit(mats);
        scene.add(model.root);

        // ---- the detection camera — bolted, watching one station ----
        const rc = buildReadCamera({
          mount: new THREE.Vector3(-0.62, 1.86, -0.34),
          aim: new THREE.Vector3(0.10, 1.12, 0.02),
          bodyMat: mats.steelDark, lensMat: mats.lens,
          coneRadius: 0.30, minHalfAngle: 0.11,
          floorY: BENCH_TOP,
          headTracks: false,
          bodySize: [0.15, 0.13, 0.26],
          hood: false, yoke: true, bodyYaw: 0.18,
        });
        rc.group.position.set(0, 0, 0);
        scene.add(rc.group);
        scene.add(rc.coneGroup);
        // bolted and always aimed at the same point — call once, not per frame
        rc.aimAt(new THREE.Vector3(0.10, 1.12, 0.02));

        /* pendant over the packing station — false shadow, per work-vision's
           broad-floor case.

           BROUGHT DOWN HARD from the first pass, which had this as the
           brightest thing in frame: a 0.62-radius beam plus a 0.20 shade lit
           the top third of the picture white and clipped straight through
           the figure standing in it — the vest and helmet materials were
           always correct (`#B85413`/`#C9A227`, read verbatim from
           work-vision), the figure just had no material left to show once
           the light beneath it was blown out. shadeR/beamR are down to
           0.15/0.30 here and `light.intensity`, `beam.opacity` and
           `halo.opacity` are all cut hard below in applyFrame — the lamp's
           job is to explain why the bench is lit, not to compete with the
           overlay for luminance (house rule, spec §0.2). */
        const pendant = buildPendantLamp({
          x: 0.10, y: 2.30, z: 0.10, planeY: BENCH_TOP, ceilingY: 3.4,
          wireMat: mats.steelDark, beamR: 0.30, shadeR: 0.15, shadeCastsShadow: false,
        });
        scene.add(pendant.group);

        // cool fill from camera-left — keeps the scanner legible in shadow at every p
        const fill = new THREE.PointLight("#8FA0B4", 0.7, 8);
        fill.position.set(-2.2, 1.9, 1.4);
        scene.add(fill);

        // ---- tracker on the carton ----
        const trackerMat = new THREE.MeshBasicMaterial({
          color: PALETTE.accent, transparent: true, opacity: 0, toneMapped: false,
        });
        const tracker = createTracker(trackerMat, { pad: 1.15 });
        scene.add(tracker.group);
        const trackerBlue = new THREE.Color(PALETTE.accent);
        const trackerOrange = new THREE.Color(CONCLUSION);

        // ---- overlay: readout, ID chip, ledger, one callout ----
        const readout = createReadout(overlay, "AUDIT · STATION 04", [
          ["EVENT", "CARTON SEALED · 0.97"],
          ["TRIGGER", "NONE · NO SCAN"],
          ["BOUND", "ORDER SO-441897"],
          ["LOG", "TAMPER-EVIDENT"],
        ]);

        const idChip = document.createElement("div");
        idChip.style.cssText =
          "position:absolute;right:6%;top:34%;opacity:0;transition:opacity .4s ease;" +
          "font-family:var(--font-plex-mono);pointer-events:none;padding:10px 14px;" +
          "background:rgba(3,5,9,0.82);border-left:2px solid " + PALETTE.accent + ";";
        idChip.innerHTML =
          `<div style="font-size:9px;letter-spacing:0.18em;color:rgba(255,255,255,0.5);">ID BOUND</div>` +
          `<div style="font-size:15px;font-weight:600;color:#fff;margin-top:3px;">SO-441897</div>`;
        overlay.appendChild(idChip);

        const ledger = document.createElement("div");
        ledger.style.cssText =
          "position:absolute;right:6%;bottom:12%;opacity:0;transition:opacity .4s ease;" +
          "font-family:var(--font-plex-mono);pointer-events:none;padding:10px 14px;" +
          "background:rgba(3,5,9,0.82);border-left:2px solid " + PALETTE.accent + ";width:210px;";
        ledger.innerHTML =
          `<div style="font-size:9px;letter-spacing:0.18em;color:rgba(255,255,255,0.4);">LEDGER</div>` +
          `<div style="font-size:11px;color:rgba(255,255,255,0.32);margin-top:6px;">SO-441792 · 09:41:02</div>` +
          `<div style="font-size:11px;color:rgba(255,255,255,0.32);margin-top:2px;">SO-441840 · 11:02:55</div>` +
          `<div style="font-size:12px;color:#fff;margin-top:6px;">SO-441897 · 12:04:07 · a3f9…c21</div>`;
        overlay.appendChild(ledger);

        const clip = document.createElement("div");
        clip.style.cssText =
          "position:absolute;right:6%;bottom:5.5%;opacity:0;transition:opacity .4s ease;" +
          "font-family:var(--font-plex-mono);pointer-events:none;padding:6px 10px;" +
          `border:1px solid ${PALETTE.accent};background:rgba(3,5,9,0.7);font-size:10px;color:rgba(255,255,255,0.8);`;
        clip.textContent = "CLIP 00:09";
        overlay.appendChild(clip);

        const finding = createCallout(overlay, {
          title: "CARTON BOUND",
          detail: "SO-441897 · 12:04:07",
          pos: new THREE.Vector3(0.10, BENCH_TOP + 0.32, 0.02),
          normal: new THREE.Vector3(0, 0, 1),
          severe: false, // a BINDING, not a severity — the title stays accent
          onDark: true,
          lane: { dir: "up", len: 48 },
          win: [0.62, 0.86],
        });

        const ro = new ResizeObserver(studio.size);
        ro.observe(wrap);

        let onScreen = true;
        const visObs = new IntersectionObserver(
          ([e]) => { onScreen = e.isIntersecting; },
          { rootMargin: "200px" },
        );
        visObs.observe(wrap);

        const clock = new THREE.Clock(false);
        let clockStarted = false;
        const target = new THREE.Vector3();
        const wpos = new THREE.Vector3();
        let raf = 0;

        const project = makeProjector(camera, model.root);

        const pinned = new URLSearchParams(location.search).get("phase");
        const pinP = pinned === null ? null : Math.min(1, Math.max(0, Number(pinned)));
        const holdP = pinP !== null && Number.isFinite(pinP) ? pinP : null;

        /* window(a,b) -> 0..1..0 with an easy in/out, both fading fully by the
           wrap so nothing is left half-lit at the seam. */
        const win = (p: number, a: number, b: number, outA = 0.94, outB = 1.0) =>
          smoothstep(a, b, p) * (1 - smoothstep(outA, outB, p));

        const applyFrame = () => {
          const frozen = reduce;
          const t = frozen ? FROZEN_T : clock.getElapsedTime();
          const p = frozen ? FROZEN_P : (holdP ?? (t % LOOP) / LOOP);
          const w = renderer.domElement.clientWidth || wrap.clientWidth;
          const h = renderer.domElement.clientHeight || wrap.clientHeight;
          const oh = h - bleed * 2;
          const aspect = w / h;

          /* ---- camera: derive rad from the live aspect, never assume it ---- */
          const radH = (SUBJECT_H / 2) / (FRAC_H * (oh / h) * TAN_VFOV_HALF);
          const radW = (SUBJECT_W / 2) / (FRAC_W * TAN_VFOV_HALF * aspect);
          const radFit = Math.min(RAD_MAX, Math.max(RAD_MIN, Math.max(radH, radW)));
          // blend the fitted distance with the authored key ring, same idiom
          // every scene in this family uses: the keys carry the CHOREOGRAPHY,
          // the fit corrects for the live slot.
          const key = camPath(p);
          const radRatio = radFit / 5.515; // 5.515 is the authored rad at the designed slot
          const az = Math.max(0.05, key.az); // NEVER let azimuth fall below 0.05 — see header
          placeCamera(camera, { az, rad: key.rad * radRatio, tx: key.tx, ty: 0, tz: key.tz }, CAM_Y);
          target.set(key.tx, LOOK_Y, key.tz);
          camera.lookAt(target);
          camera.updateMatrixWorld(true);

          const camDist = camera.position.length();
          if (scene.fog instanceof THREE.Fog) {
            scene.fog.near = camDist * 0.9;
            scene.fog.far = camDist * 3.0;
          }

          /* ---- intro settle ---- */
          const solid = frozen ? 1 : easeInOut(clamp01((t - 0.15) / SETTLE));
          for (const m of mats.all) (m as THREE.Material & { opacity: number }).opacity = solid;
          shadowMat.opacity = solid * 0.45;
          benchShadowMat.opacity = solid * 0.5;
          /* Cut hard from the first pass (26 / 0.6 / 0.5) — see the note at
             buildPendantLamp's call site. 9 at the bench (decay 2, ~1.7m
             drop) reads as the reason the surface is bright without
             overpowering the five-source studio rig or the figure standing
             directly under it. */
          /* The bulb was the brightest object in frame by a wide margin — a
             blazing white ball top-centre pulling the eye clean off the bench,
             which is where the whole argument (sealed carton, unused scanner)
             actually happens. Nothing physical may out-shine the overlay. */
          pendant.shade.opacity = solid;
          pendant.bulb.opacity = solid * 0.62;
          pendant.halo.opacity = solid * 0.14;
          pendant.beam.opacity = solid * 0.10;
          pendant.light.intensity = solid * 5.5;
          setGroundOpacity(ground, solid);

          /* ---- the work: flaps + tape + the one animated joint ---- */
          const sideClose = win(p, WORK_SIDE[0], WORK_SIDE[1], RESET_IN, RESET_OUT);
          const longClose = win(p, WORK_LONG[0], WORK_LONG[1], RESET_IN, RESET_OUT);
          for (const f of model.flaps) {
            const axis = f.userData.axis as "x" | "z";
            const sign = f.userData.openSign as 1 | -1;
            const piv = f.userData.pivot as THREE.Group;
            const close = axis === "z" ? sideClose : longClose;
            const openBase = axis === "z"
              ? (sign > 0 ? -Math.PI / 2 : Math.PI / 2)
              : (sign > 0 ? Math.PI / 2 : -Math.PI / 2);
            if (axis === "z") piv.rotation.z = openBase * (1 - close);
            else piv.rotation.x = openBase * (1 - close);
          }
          model.tapeGroup.scale.x = longClose;

          const reach = smoothstep(0.14, 0.18, p) * (1 - smoothstep(0.22, 0.26, p))
            * (1 - smoothstep(RESET_IN, RESET_OUT, p));
          model.forearmPivot.rotation.x = -1.05 * (frozen ? 0 : reach);

          /* ---- 2. detect, don't trigger ---- */
          const trackerOn = win(p, DETECT[0], DETECT[0] + 0.04, OUT_IN, OUT_OUT);
          const colorLerp = smoothstep(CONCLUDE[0], CONCLUDE[1], p);
          trackerMat.color.copy(trackerBlue).lerp(trackerOrange, colorLerp);
          trackerMat.opacity = (frozen ? 1 : trackerOn) * 0.9;
          tracker.follow(model.carton.children[0] ?? null, camera);

          /* ---- 3. the cone: stays blue until the binding, then flips once ---- */
          const signalOn = win(p, CONCLUDE[0], CONCLUDE[1], OUT_IN, RESET_OUT);
          rc.setSignal(frozen ? (FROZEN_P >= CONCLUDE[0] ? 1 : 0) : signalOn);
          /* 0.55 -> 0.30: the cone is ADDITIVE (createSightCone's default), so
             this is not alpha — at 0.55 its core saturated and it became a
             second bright wedge competing with the pendant. Same cut applied to
             Secure and Dimension for the same reason. */
          rc.setOpacity(solid * 0.30);
          rc.tick(t);

          /* ---- 4. readout rows ---- */
          const rowWins: [number, number][] = [
            [DETECT[0], DETECT[0] + 0.03],
            [0.34, 0.37],
            [BIND[0], BIND[0] + 0.03],
            [LOG_IN, LOG_IN + 0.03],
          ];
          readout.rows.forEach((row, i) => {
            const on = frozen
              ? (FROZEN_P >= rowWins[i][0] ? 1 : 0)
              : win(p, rowWins[i][0], rowWins[i][1], OUT_IN, OUT_OUT);
            row.setOpacity(String(on));
          });
          readout.panel.style.opacity = String(frozen ? 1 : smoothstep(0.06, 0.3, t));

          /* ---- 5. ID chip, ledger, clip ---- */
          const idOn = win(p, BIND[0], BIND[0] + 0.05, OUT_IN, OUT_OUT);
          idChip.style.opacity = String(frozen ? (FROZEN_P >= BIND[0] ? 1 : 0) : idOn);
          idChip.style.borderLeftColor = colorLerp > 0.5 ? CONCLUSION : PALETTE.accent;

          const ledgerOn = win(p, LOG_IN, LOG_IN + 0.05, OUT_IN, OUT_OUT);
          ledger.style.opacity = String(frozen ? (FROZEN_P >= LOG_IN ? 1 : 0) : ledgerOn);

          const clipOn = win(p, CLIP_IN, CLIP_IN + 0.05, OUT_IN, OUT_OUT);
          clip.style.opacity = String(frozen ? (FROZEN_P >= CLIP_IN ? 1 : 0) : clipOn);

          /* ---- 6. the one callout ---- */
          const foundOn = win(p, CONCLUDE[0], 0.86, OUT_IN, OUT_OUT);
          const world = wpos.copy(finding.local).applyMatrix4(model.root.matrixWorld);
          const r = foundOn > 0.01 ? project(world, finding.normal, w, h) : null;
          placeCallout(finding, r ? { sx: r.sx, sy: r.sy - bleed } : null, frozen ? 1 : foundOn, w, oh, 0.04);

          overlay.style.opacity = String(frozen ? 1 : smoothstep(0.25, 1.0, t));
        };

        let compiled = false;
        const markCompiled = () => { compiled = true; };
        renderer.compileAsync(scene, camera).then(markCompiled, markCompiled);
        const compileGuard = window.setTimeout(markCompiled, 2000);

        let primed = false;
        const MIN_DT = 1 / 46;
        let last = -1;
        const loop = () => {
          raf = requestAnimationFrame(loop);
          if (!compiled) return;
          if (!onScreen) {
            if (!primed) { primed = true; applyFrame(); studio.render(); }
            return;
          }
          primed = true;
          if (!clockStarted) { clock.start(); clockStarted = true; }
          const now = clock.getElapsedTime();
          if (now - last < MIN_DT) return;
          last = now;
          applyFrame();
          studio.render();
        };
        raf = requestAnimationFrame(loop);

        cleanup = () => {
          cancelAnimationFrame(raf);
          window.clearTimeout(compileGuard);
          ro.disconnect();
          visObs.disconnect();
          finding.wrap.remove();
          idChip.remove();
          ledger.remove();
          clip.remove();
          readout.panel.remove();
          readout.dot.remove();
          tracker.group.clear();
          trackerMat.dispose();
          rc.dispose();
          rc.owned.forEach((g) => g.dispose());
          pendant.dispose();
          pendant.owned.forEach((g) => g.dispose());
          floorGeo.dispose();
          wallGeo.dispose();
          ground.material.dispose();
          ground.mesh.geometry.dispose();
          benchShadowMat.dispose();
          benchCatcher.geometry.dispose();
          mats.dispose();
          model.owned.forEach((g) => g.dispose());
          studio.dispose();
        };
      } catch (err) {
        console.error("[audit-vision] init failed:", err);
        wrap.style.background = PALETTE.bgBottom;
      }

      return () => cleanup();
    }, "audit");
  }, []);

  return (
    <div
      ref={hostRef}
      style={{
        position: "relative", width: "100%", height: "100%",
        overflow: bare ? "visible" : "hidden",
        background: bare ? "transparent" : PALETTE.bgBottom,
      }}
    >
      <div
        ref={canvasWrapRef}
        style={{ position: "absolute", left: 0, right: 0, top: -bleed, bottom: -bleed }}
      />
      <div ref={overlayRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0 }} />
    </div>
  );
}
