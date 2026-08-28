"use client";

/* ---------------------------------------------------------------------------
   Secure Vision — "An alarm that cries wolf is worse than no alarm."

   THE THESIS IS TRIAGE, NOT DETECTION. A guard cannot watch forty feeds, so
   most feeds are watched by nobody — the platform watches all of them, and
   it already knows the difference between a real event and a flapping tarp,
   a rain-streaked lens, a bird crossing a corridor camera. This loop shows
   THREE nuisance detections that are evaluated and DISMISSED, and exactly
   ONE real event that ESCALATES. Nuisances stay the observing blue
   (#5CC8FF) from first frame to last; the loop spends its one and only
   #ED510C moment on the real event alone.

   The wall itself — screens, desk, room shell, feed content — is built by
   ./feedwall.ts as a parameterised, reusable builder (see its own header);
   this file owns only the choreography: which feed gets tracked when, the
   bracket colour swap, the readout, and the case record.

   Renders on Warehouse, Yard AND Factory at once (re-exported from
   viso-warehouse/sections.tsx), so the room is deliberately generic — a
   triage station, not a location.

   LOOP, p = 0..1 over 12.0s:
     0.00-0.06  settle — wall live, nothing flagged.
     0.06-0.27  NUISANCE A — feed 05 (fence, flapping tarp). Bracket locks,
                evaluates, dismissed "TARP · WIND". Fades.
     0.29-0.47  NUISANCE B — feed 03 (dock, rain). Dismissed
                "RAIN · SENSOR NOISE".
     0.49-0.65  NUISANCE C — feed 07 (corridor, bird). Dismissed "BIRD".
     0.67-0.985 THE REAL EVENT — feed 08 (entry). Bracket locks and holds;
                at p=0.76 it ESCALATES: bracket turns #ED510C, the feed
                itself gains prominence (scaled up slightly, the other seven
                dim), and that is the loop's one and only orange moment.
     0.84-0.985 a case record lands — an orange rule over mono rows.
     0.985-1.0  release. State-neutral wrap: everything back to settle.
--------------------------------------------------------------------------- */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { PALETTE } from "../_vision/palette";
import { createStudio } from "../_vision/studio";
import { mountWhenVisible } from "../_vision/mount";
import { clamp01, smoothstep, placeCamera, makeCamPath, type CamKey } from "../_vision/camera";
import { createCallout, makeProjector, placeCallout } from "../_vision/overlay";
import { createTracker } from "../hero-cards/detect";
import { draftingGround, setGroundOpacity } from "../hero-cards/ground";
import { buildFeedWall, type FeedWall } from "./feedwall";
import {
  GROUND_Y, SECURE_FEEDS, NUISANCE_A_FEED, NUISANCE_B_FEED, NUISANCE_C_FEED,
  EVENT_FEED, DISMISS_REASON, warmSecureTextures,
} from "./secure";

export { warmSecureTextures };

const LOOP = 12.0;
const MONO = "ui-monospace, 'SF Mono', Menlo, monospace";

/* ---- framing arithmetic, RE-DERIVED against the WALL, not the room -------
   FIRST PASS FRAMED THE ROOM. SUBJECT_H/W were floor-to-headroom and the
   full desk width, so the camera sat back far enough to fit an empty room
   and the 8 feeds landed as unreadable grey specks at ~25% of frame width —
   caught on review at ?phase=0.80. The subject of this scene is the WALL;
   the desk/floor/room shell are CONTEXT and are meant to sit at the edges,
   partly cropped, the way a tight product shot crops its background.

   Wall content is 4 cols x 2 rows: totalW = 4*0.58 + 3*0.075 = 2.455,
   totalH = 2*0.33 + 0.075 = 0.705 (feedwall.ts's own SCR_W/SCR_H/GAP).
   Framed against the wall's own content box, half-extents:

     sMaxW = 2.455 / 2 = 1.2275
     sMaxH = 0.705 / 2  = 0.3525

   TAN_VFOV_HALF = tan(15deg) = 0.267949 (studio camera: 30deg vertical FOV).
   FRAC_W = 0.78 (wall spans ~78% of frame width — deliberately short of
   1.0 so the rails/posts either side stay in shot), FRAC_H = 0.74 (this
   family's standard fraction).

     radW = 1.2275 / (0.78 * 0.267949 * 3.075) = 1.2275 / 0.642552 = 1.9105
     radH = 0.3525 / (0.74 * 0.267949)          = 0.3525 / 0.198282 = 1.7778
     rad  = max(1.9105, 1.7778) = 1.9105   -> WIDTH binds.

   REF_ASPECT is the slot this was authored against (1230 / 400 = 3.075);
   every camera key's rad is scaled by fitRad(liveAspect) / REF_RAD so the
   choreography holds while the absolute scale tracks the REAL canvas.

   The six CAM_KEYS below are the ORIGINAL room-framing keys with every rad
   and every (tx, tz) offset scaled by REF_RAD_NEW / REF_RAD_OLD = 1.9105 /
   5.169 = 0.36965 — same relative sway, now sized to a subject a third the
   distance away. LOOK_Y also moves up from 1.18 to 1.50, close to the
   wall's own centre (WALL_CENTER_Y = 1.55 in feedwall.ts), so the close
   camera looks AT the screens rather than down at where the desk used to
   need to fit. */
const TAN_VFOV_HALF = Math.tan((15 * Math.PI) / 180);
const REF_ASPECT = 1230 / 400;
const REF_RAD = 1.9105;
const RAD_MIN = 1.0, RAD_MAX = 6.0;
function fitRad(aspect: number): number {
  const radW = 1.2275 / (0.78 * TAN_VFOV_HALF * Math.max(aspect, 0.2));
  const radH = 0.3525 / (0.74 * TAN_VFOV_HALF);
  return clamp(Math.max(radW, radH), RAD_MIN, RAD_MAX);
}
function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }

const CAM_Y = 1.60;
const LOOK_Y = 1.50;

const CAM_KEYS: CamKey[] = [
  { p: 0.00, az: -0.12, rad: 1.867, t: [-0.111, LOOK_Y, -0.074] },
  { p: 0.20, az: -0.05, rad: 1.915, t: [-0.037, LOOK_Y, -0.055] },
  { p: 0.42, az: 0.02, rad: 1.867, t: [0.000, LOOK_Y, -0.037] },
  { p: 0.60, az: 0.09, rad: 1.922, t: [0.067, LOOK_Y, -0.055] },
  { p: 0.78, az: 0.13, rad: 1.793, t: [0.104, LOOK_Y, -0.018] },
  { p: 0.92, az: 0.01, rad: 1.901, t: [0.000, LOOK_Y, -0.055] },
];
const camPath = makeCamPath(CAM_KEYS);

/* window(a,b,c,d) -> 0..1..0 with easy in/out */
const win = (p: number, a: number, b: number, c: number, d: number) =>
  smoothstep(a, b, p) * (1 - smoothstep(c, d, p));

/* ---- beats ---- */
const NUISANCE_A: [number, number, number, number] = [0.06, 0.10, 0.24, 0.27];
const NUISANCE_B: [number, number, number, number] = [0.29, 0.33, 0.44, 0.47];
const NUISANCE_C: [number, number, number, number] = [0.49, 0.53, 0.62, 0.65];
const EVENT_IN = 0.67, EVENT_OUT_A = 0.965, EVENT_OUT_B = 0.985;
const ESCALATE_AT = 0.76;
const CASE_IN = 0.84, CASE_OUT_A = 0.965, CASE_OUT_B = 0.985;

const NUISANCE_BEATS: { feed: number; win: [number, number, number, number] }[] = [
  { feed: NUISANCE_A_FEED, win: NUISANCE_A },
  { feed: NUISANCE_B_FEED, win: NUISANCE_B },
  { feed: NUISANCE_C_FEED, win: NUISANCE_C },
];

export default function SecureVisionScene({ bare = false, bleed = 0 }: { bare?: boolean; bleed?: number } = {}) {
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
          /* exposure 0.58 -> 0.76. The rails were reported as "far too hot,
             reads as neon" and I chased that as a rail problem through three
             fixes — envMapIntensity, then the glow light's distance — with
             almost no effect on screen. It was the wrong diagnosis.

             #2C4A73 at metalness 0.35 is a dark navy and `makeMetal`'s albedo
             is a flat fill of exactly that, so the rails were never bright in
             absolute terms. The ROOM was too dark: at 0.58 the desk, floor and
             wall shell all sat near black, which left the rails and the
             screens as the only lit things in frame and made a modest navy
             read as saturated neon by contrast alone.

             Raising the room's level is the fix. Judge a colour against what
             surrounds it, not on its own. */
          bare, floorY: 0, shadowExtent: 6, spread: 1.1, exposure: 0.76,
          bloom: false, shadowMapSize: 1024, maxDpr: 1.75, lightRig: "full", noEnv: false,
        });
        const { renderer, scene, camera, shadowMat } = studio;

        const wall: FeedWall = buildFeedWall({
          cols: 4, rows: 2, feeds: SECURE_FEEDS,
          buildRoom: true, buildDesk: true, texRes: 512, detail: "full",
        });
        scene.add(wall.group);

        const ground = draftingGround({
          size: 40, y: 0.008, step: 1, color: PALETTE.grid,
          opacity: 0.12, glow: 3.0, majorBoost: 2.2, fadeStart: 0.5, fadeEnd: 1.0,
        });
        ground.mesh.renderOrder = -3;
        scene.add(ground.mesh);
        setGroundOpacity(ground, 1);
        shadowMat.opacity = 0.42;

        /* ---- the screens are the room's main light source: real lights
           anchored at the wall's own glow so the desk and floor beneath it
           read as lit BY the screens, not by an unrelated fixture. ---- */
        /* INTENSITY DERIVED, NOT DIALLED — same trap secure.ts's history
           warns about. At candela units and decay 2, the first pass here
           (5.5 at ~0.62m to the desk) put ~14x irradiance on the desk,
           which is why it rendered as a blown-out chrome slab rather than a
           dim laminate top lit by screenglow. 1.8 at the same distance lands
           ~4.7, still the brightest nearby source (correct — the screens
           ARE the room's light) without saturating the surface it hits. */
        /* PUSHED OFF THE WALL — 0.4 -> 1.15 in z, and this is why the rails
           were neon.

           This light stands in for the screens illuminating the room, but at
           z+0.4 it was sitting almost ON the rails it was supposed to be
           lighting past. With `decay: 2` the irradiance at the rail face was
           1.8 / 0.4^2 = 11.25 — a bright blue source at point-blank range on
           bright blue painted steel, which is exactly the "far too hot, reads
           as neon" note from review. Lowering envMapIntensity on the rail
           material first did almost nothing, because the reflection was never
           the dominant term; the direct hit was.

           At z+1.15 the rails receive 2.4 / 1.15^2 = 1.81 — a seventh of
           before — while the desk and floor, which are what this light is
           actually for, sit at a similar distance and now get MORE than they
           did (they were previously past the 5-unit cutoff's steep tail).
           Intensity nudged 1.8 -> 2.4 to hold the room's overall level. */
        const wallGlow = new THREE.PointLight(0x9FC8FF, 2.4, 6, 2);
        wallGlow.position.copy(wall.lightAnchor).add(new THREE.Vector3(0, 0, 1.15));
        scene.add(wallGlow);
        // 0.6 -> 1.6: the desk and floor were reading as black voids beneath a
        // lit wall, which is half of why the rails looked like neon.
        const deskFill = new THREE.PointLight(0x7E96B8, 1.6, 6, 2);
        deskFill.position.set(0, wall.deskTopY + 0.4, wall.lightAnchor.z + 1.1);
        scene.add(deskFill);

        /* near/far multipliers widened for the close-in wall framing — at
           the old *0.7/*3.0 the fog started inside the desk's own depth. */
        scene.fog = new THREE.Fog(0x0A0B0E, REF_RAD * 2.2, REF_RAD * 7.0);

        /* ---- the ONE bracket, retargeted per beat ---- */
        const accentMat = new THREE.MeshBasicMaterial({
          color: PALETTE.accent, transparent: true, opacity: 0, toneMapped: false,
          depthWrite: false, depthTest: false, fog: false,
        });
        const warnMat = new THREE.MeshBasicMaterial({
          color: "#ED510C", transparent: true, opacity: 0, toneMapped: false,
          depthWrite: false, depthTest: false, fog: false,
        });
        const tracker = createTracker(accentMat, { pad: 1.35 });
        tracker.group.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) { o.renderOrder = 10; o.frustumCulled = false; }
        });
        scene.add(tracker.group);

        /* ---- overlay: header readout, three nuisance dismiss labels, one
           event finding, the case record ---- */
        const panel = document.createElement("div");
        panel.style.cssText =
          `position:absolute;left:34px;top:24px;opacity:0;transition:opacity .5s ease;font-family:${MONO};`;
        panel.innerHTML =
          `<div style="font-size:9.5px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.5);">SECURE · 8 FEEDS LIVE</div>`
          + `<div id="sv-context" style="font-size:14px;font-weight:600;color:#fff;margin-top:8px;min-height:18px;"></div>`;
        overlay.appendChild(panel);
        const contextEl = panel.querySelector("#sv-context") as HTMLDivElement;

        const nuisanceCallouts = NUISANCE_BEATS.map(({ feed, win: w }) => {
          const screen = wall.screens[feed];
          return createCallout(overlay, {
            title: DISMISS_REASON[feed],
            detail: "DISMISSED",
            pos: screen.root.position.clone(),
            normal: new THREE.Vector3(0, 0, 1),
            severe: false,
            onDark: true,
            lane: { dir: "up", len: 40 },
            win: [w[0], w[3]],
          });
        });

        const eventScreen = wall.screens[EVENT_FEED];
        const finding = createCallout(overlay, {
          title: "PERSON · ENTRY",
          detail: "CONF 0.96 · ZONE ENTRY",
          pos: eventScreen.root.position.clone(),
          normal: new THREE.Vector3(0, 0, 1),
          severe: true,
          onDark: true,
          lane: { dir: "up", len: 52 },
          win: [ESCALATE_AT, EVENT_OUT_A],
        });

        const chip = document.createElement("div");
        chip.style.cssText =
          `position:absolute;right:4%;bottom:12%;opacity:0;pointer-events:none;`
          + `background:rgba(6,9,14,0.72);border-top:2px solid #ED510C;`
          + `padding:10px 16px;font-family:${MONO};width:220px;`;
        chip.innerHTML =
          `<div style="font-size:13px;color:#fff;letter-spacing:0.04em;">CASE 7734-C</div>`
          + `<div style="font-size:11.5px;color:rgba(255,255,255,0.68);margin-top:5px;">CLIP 00:14 ATTACHED</div>`
          + `<div style="font-size:11.5px;color:rgba(255,255,255,0.68);margin-top:3px;">LOGGED · TAMPER-EVIDENT</div>`;
        overlay.appendChild(chip);

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

        const pinned = new URLSearchParams(location.search).get("phase");
        const pinP = pinned === null ? null : Math.min(1, Math.max(0, Number(pinned)));
        const holdP = pinP !== null && Number.isFinite(pinP) ? pinP : null;

        const project = makeProjector(camera, wall.group);
        const wpos = new THREE.Vector3();
        const FROZEN_P = 0.78; // mid-escalation, held — the reduced-motion frame
        const FROZEN_T = FROZEN_P * LOOP;

        const dimColor = new THREE.Color();

        const applyFrame = () => {
          const frozen = reduce;
          const t = frozen ? FROZEN_T : clock.getElapsedTime();
          const p = frozen ? FROZEN_P : (holdP ?? (t % LOOP) / LOOP);
          const w = renderer.domElement.clientWidth || wrap.clientWidth;
          const h = renderer.domElement.clientHeight || wrap.clientHeight;

          /* ---- camera: pure pan, six cyclic keys, rad scaled to live aspect ---- */
          const aspect = w / h;
          const scale = fitRad(aspect) / REF_RAD;
          const raw = camPath(p);
          placeCamera(camera, { az: raw.az, rad: raw.rad * scale, tx: raw.tx, ty: LOOK_Y, tz: raw.tz }, CAM_Y);
          camera.lookAt(raw.tx, LOOK_Y, raw.tz);
          camera.updateMatrixWorld(true);

          /* ---- settle: no material ramp on the wall (screens read unlit
             from frame 0, per the emissive rule), only ground/shadow hold ---- */
          setGroundOpacity(ground, 1);
          shadowMat.opacity = 0.42;

          /* ---- rain: scroll the streak texture so the dock feed reads live ---- */
          const rainScreen = wall.screens[NUISANCE_B_FEED];
          rainScreen.panelMat.map!.offset.y = -(t * 0.35) % 1;

          /* ---- which beat is active ---- */
          let activeFeed = -1;
          let activeOn = 0;
          let activeReason = "";
          let escalated = false;

          for (const { feed, win: bw } of NUISANCE_BEATS) {
            const on = win(p, bw[0], bw[1], bw[2], bw[3]);
            if (on > 0.005) { activeFeed = feed; activeOn = on; activeReason = DISMISS_REASON[feed]; }
          }
          const eventOn = win(p, EVENT_IN, EVENT_IN + 0.03, EVENT_OUT_A, EVENT_OUT_B);
          if (eventOn > 0.005) {
            activeFeed = EVENT_FEED;
            activeOn = eventOn;
            escalated = p >= ESCALATE_AT;
            activeReason = escalated ? "ALERT RAISED · PERSON" : "EVALUATING";
          }

          if (activeFeed >= 0) {
            tracker.setMaterial(escalated ? warnMat : accentMat);
            (escalated ? warnMat : accentMat).opacity = activeOn * 0.95;
            (escalated ? accentMat : warnMat).opacity = 0;
            tracker.follow(wall.screens[activeFeed].anchor, camera);
            contextEl.textContent = activeReason;
          } else {
            tracker.follow(null, camera);
            accentMat.opacity = 0; warnMat.opacity = 0;
            contextEl.textContent = "TRIAGING";
          }
          panel.style.opacity = String(smoothstep(0.02, 0.10, p) * (1 - smoothstep(0.985, 1.0, p)));

          /* ---- tarp flap / bird drift — cheap sprite motion, no canvas repaint ---- */
          const tarpSprite = wall.screens[NUISANCE_A_FEED].sprite;
          if (tarpSprite) tarpSprite.rotation.z = 0.18 * Math.sin(t * 5.2);
          const birdSprite = wall.screens[NUISANCE_C_FEED].sprite;
          if (birdSprite) {
            const bt = (p - NUISANCE_C[0]) / Math.max(0.001, NUISANCE_C[3] - NUISANCE_C[0]);
            birdSprite.position.x = (clamp01(bt) - 0.5) * wall.screens[NUISANCE_C_FEED].width * 0.7;
          }
          const eventSprite = wall.screens[EVENT_FEED].sprite;
          if (eventSprite) {
            const et = clamp01((p - EVENT_IN) / Math.max(0.001, EVENT_OUT_A - EVENT_IN));
            eventSprite.position.x = -wall.screens[EVENT_FEED].width * 0.28 + et * wall.screens[EVENT_FEED].width * 0.40;
          }

          /* ---- escalation: the event screen gains prominence, the other
             seven dim — the ONLY moment this happens in the loop ---- */
          const esc = win(p, ESCALATE_AT, ESCALATE_AT + 0.03, EVENT_OUT_A, EVENT_OUT_B);
          for (const s of wall.screens) {
            if (s.index === EVENT_FEED) {
              const sc = 1 + 0.14 * esc;
              s.root.scale.setScalar(sc);
            } else {
              const dim = 1 - 0.42 * esc;
              dimColor.setScalar(dim);
              s.panelMat.color.copy(dimColor);
            }
          }

          /* ---- the three nuisance dismiss labels ---- */
          nuisanceCallouts.forEach((c, i) => {
            const bw = NUISANCE_BEATS[i].win;
            const on = win(p, bw[0] + 0.02, bw[1] + 0.02, bw[2], bw[3]);
            if (on > 0.01) {
              const worldPos = wpos.copy(c.local);
              const r = project(worldPos, c.normal, w, h);
              placeCallout(c, r ? { sx: r.sx, sy: r.sy - bleed } : null, on, w, h - bleed * 2, 0.02);
            } else {
              placeCallout(c, null, 0, w, h - bleed * 2, 0.02);
            }
          });

          /* ---- the one finding: the real event ---- */
          const findOn = win(p, ESCALATE_AT, ESCALATE_AT + 0.04, EVENT_OUT_A, EVENT_OUT_B);
          if (findOn > 0.01) {
            const r = project(wpos.copy(finding.local), finding.normal, w, h);
            placeCallout(finding, r ? { sx: r.sx, sy: r.sy - bleed } : null, findOn, w, h - bleed * 2, 0.55);
          } else {
            placeCallout(finding, null, 0, w, h - bleed * 2, 0.55);
          }

          /* ---- the case record ---- */
          const chipOn = win(p, CASE_IN, CASE_IN + 0.03, CASE_OUT_A, CASE_OUT_B);
          chip.style.opacity = String(chipOn);
        };

        const MIN_DT = 1 / 46;
        let last = -1;

        let compiled = false;
        const markCompiled = () => { compiled = true; };
        renderer.compileAsync(scene, camera).then(markCompiled, markCompiled);
        const compileGuard = window.setTimeout(markCompiled, 2000);

        let primed = false;
        let raf = 0;
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
          panel.remove();
          chip.remove();
          nuisanceCallouts.forEach((c) => c.wrap.remove());
          finding.wrap.remove();
          scene.remove(tracker.group);
          accentMat.dispose();
          warnMat.dispose();
          ground.material.dispose();
          wall.dispose();
          studio.dispose();
        };
      } catch (err) {
        console.error("[secure-vision] init failed:", err);
        wrap.style.background = PALETTE.bgBottom;
      }

      return () => cleanup();
    }, "secure-vision");
  }, [bare]);

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
      <div ref={overlayRef} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
    </div>
  );
}
