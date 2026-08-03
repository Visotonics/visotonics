"use client";

/* ---------------------------------------------------------------------------
   Journey prototype — the scene.

   Self-contained on purpose: raw three.js, no shared studio, no imports from
   components/vision/**. This exists so the interaction model can be judged,
   not to be the final look — the point being proven is "camera is a pure
   function of damped scroll progress", not the lighting.

   THE RULE THIS FILE DEMONSTRATES: nothing here animates itself. There is no
   tween, no elapsed-time term in the camera maths, no easing state. Every
   frame the camera, the scan plane and the overlay opacities are recomputed
   from `p` alone. That is what makes the whole thing scrub identically
   forwards and backwards and land in exactly the same place regardless of how
   fast you got there — and what makes a reduced-motion freeze at p=0.5 a
   legitimate still frame rather than a half-finished animation.

   ------------------------------------------------------------------------
   p-window table (global scroll progress 0..1 over the 500vh #journey spacer)
   ------------------------------------------------------------------------
     CAMERA
       0.00 – 0.30   APPROACH  dolly in: radius 26->15, height 6.0->2.6, azimuth held
       0.30 – 0.60   SURVEY    orbit a quarter turn (+90 deg), blue scan plane sweeps x -3.5->+3.5
       0.60 – 0.85   ASCEND    pull up to top-down: height 2.6->20, radius 15->1.6
       0.85 – 1.00   LOCATE    settle: height 20->17, radius 1.6->2.4, azimuth drifts +0.18 rad;
                               orange 3x3 grid + corner bracket fade in over 0.85–0.95
     CAPTIONS (window01, 0.03 fade edges)
       0.02 – 0.28   "01 / APPROACH"
       0.32 – 0.58   "02 / SURVEY"
       0.62 – 0.83   "03 / ASCEND"
       0.87 – 1.08   "04 / LOCATED"  (b past 1.0 so it never fades back out)
   ------------------------------------------------------------------------
--------------------------------------------------------------------------- */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { subscribe, seg, smooth, window01, clamp01, journey } from "@/lib/journey-scroll";

/* Palette — the site's dark canvas range, light-grey subject, one orange
   accent and the observation blue. Kept local; this file owns its look. */
const BG = "#0A0B0E";
const FOG = "#14171C";
const SUBJECT = "#C9CDD4";
const SUBJECT_DARK = "#8B9099";
const ACCENT = "#ED510C";
const OBSERVE = "#3AA0DC";

const mono = "var(--font-plex-mono)";
const sans = "var(--font-archivo)";

/* Camera phase boundaries — named so the maths below reads as the story. */
const APPROACH_END = 0.3;
const SURVEY_END = 0.6;
const ASCEND_END = 0.85;

const CAPTIONS = [
  { a: 0.02, b: 0.28, tag: "01 / APPROACH", title: "A container arrives", body: "The camera closes on the subject. Nothing has been decided yet." },
  { a: 0.32, b: 0.58, tag: "02 / SURVEY", title: "Every side, one pass", body: "A quarter turn while the scan plane sweeps the full length of the box." },
  { a: 0.62, b: 0.83, tag: "03 / ASCEND", title: "Pull back to the yard", body: "The single subject becomes one cell in a grid of thousands." },
  /* The last window deliberately runs PAST 1.0 so its trailing fade never
     fires — the journey should end on a held frame, not on copy dissolving. */
  { a: 0.87, b: 1.08, tag: "04 / LOCATED", title: "Row 3, bay 3", body: "Position resolved and written to the record." },
];

export default function JourneyScene() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const capsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---- renderer / scene ---------------------------------------------- */
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%";
    wrap.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG);
    /* Fog does the work a cyclorama would: the grid dissolves instead of
       ending at a visible edge when the camera lifts to top-down. */
    scene.fog = new THREE.Fog(FOG, 18, 70);

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);

    /* ---- lights: a studio read, cheap. Key + cool rim + hemisphere lift. */
    const key = new THREE.DirectionalLight(0xffffff, 2.6);
    key.position.set(4, 9, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 40;
    Object.assign(key.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10 });
    key.shadow.bias = -0.0008;
    scene.add(key, key.target);

    const rim = new THREE.DirectionalLight(0xbcd6f2, 1.4);
    rim.position.set(-7, 3, -6);
    scene.add(rim);
    scene.add(new THREE.HemisphereLight(0x5f7ea8, 0x08090c, 0.7));

    /* ---- ground: a grid, not a floor plane. A lit plane needs a horizon
       treatment; a grid reads as "site survey" and fades into the fog. */
    const grid = new THREE.GridHelper(160, 80, new THREE.Color(OBSERVE), new THREE.Color(0x2a2f38));
    const gm = grid.material as THREE.Material | THREE.Material[];
    (Array.isArray(gm) ? gm : [gm]).forEach((m) => {
      m.transparent = true;
      m.opacity = 0.28;
      m.depthWrite = false;
    });
    grid.position.y = -1.31;
    scene.add(grid);

    /* ---- subject: a corrugated container ------------------------------- */
    const box = new THREE.Group();
    const shellGeo = new THREE.BoxGeometry(6, 2.6, 2.6);
    const shellMat = new THREE.MeshStandardMaterial({ color: SUBJECT, metalness: 0.55, roughness: 0.45 });
    const shell = new THREE.Mesh(shellGeo, shellMat);
    shell.castShadow = true;
    shell.receiveShadow = true;
    box.add(shell);

    /* Corrugation as applied ribs rather than a displaced/normal-mapped
       surface: at this camera distance the silhouette break is what sells it,
       and a rib catches the rim light where a normal map cannot. Two shared
       geometries + one shared material, so 44 ribs cost 44 draw calls of
       nothing, not 44 materials. */
    const ribMat = new THREE.MeshStandardMaterial({ color: SUBJECT_DARK, metalness: 0.6, roughness: 0.5 });
    const ribSide = new THREE.BoxGeometry(0.09, 2.44, 0.09);
    const ribEnd = new THREE.BoxGeometry(0.09, 2.44, 0.09);
    for (let i = 0; i < 19; i++) {
      const x = -2.7 + (i / 18) * 5.4;
      for (const z of [1.32, -1.32]) {
        const r = new THREE.Mesh(ribSide, ribMat);
        r.position.set(x, 0, z);
        r.castShadow = true;
        box.add(r);
      }
    }
    for (let i = 0; i < 6; i++) {
      const z = -1.05 + (i / 5) * 2.1;
      for (const x of [3.02, -3.02]) {
        const r = new THREE.Mesh(ribEnd, ribMat);
        r.position.set(x, 0, z);
        r.rotation.y = Math.PI / 2;
        r.castShadow = true;
        box.add(r);
      }
    }
    /* Corner castings — the one detail that reads as "shipping container"
       from any distance, so it earns four extra meshes. */
    const castGeo = new THREE.BoxGeometry(0.42, 0.3, 0.42);
    const castMat = new THREE.MeshStandardMaterial({ color: 0x5a5f68, metalness: 0.85, roughness: 0.35 });
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      const c = new THREE.Mesh(castGeo, castMat);
      c.position.set(sx * 2.86, sy * 1.3, sz * 1.26);
      box.add(c);
    }
    scene.add(box);

    /* ---- scan plane: the blue sweep during SURVEY ----------------------- */
    const scanMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(OBSERVE),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending, // reads as light, not as a painted card
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const scan = new THREE.Mesh(new THREE.PlaneGeometry(7.0, 3.1), scanMat);
    scan.rotation.y = Math.PI / 2; // faces along x, sweeps in x
    scene.add(scan);

    /* ---- LOCATE marks: 3x3 orange dots + a corner bracket on the top face */
    const locate = new THREE.Group();
    locate.position.y = 1.32; // just above the lid
    locate.rotation.x = -Math.PI / 2;
    const dotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(ACCENT), transparent: true, opacity: 0, depthWrite: false });
    const dotGeo = new THREE.CircleGeometry(0.09, 12);
    for (let r = -1; r <= 1; r++) for (let c = -1; c <= 1; c++) {
      const d = new THREE.Mesh(dotGeo, dotMat);
      d.position.set(c * 1.5, r * 0.72, 0.01);
      locate.add(d);
    }
    /* Bracket drawn as line segments — four corner "L"s, the standard
       detection-frame idiom, at the extents of the dot grid. */
    const bx = 2.05, by = 1.05, arm = 0.5;
    const pts: number[] = [];
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      pts.push(sx * bx, sy * by, 0.01, sx * (bx - arm), sy * by, 0.01);
      pts.push(sx * bx, sy * by, 0.01, sx * bx, sy * (by - arm * 0.6), 0.01);
    }
    const brGeo = new THREE.BufferGeometry();
    brGeo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const brMat = new THREE.LineBasicMaterial({ color: new THREE.Color(ACCENT), transparent: true, opacity: 0, depthWrite: false });
    locate.add(new THREE.LineSegments(brGeo, brMat));
    scene.add(locate);

    /* ---- the choreography: everything below is f(p) --------------------- */
    const AZ0 = -0.62; // starting azimuth, three-quarter view
    const target = new THREE.Vector3(0, 0, 0);

    const apply = (p: number) => {
      const a = smooth(seg(p, 0, APPROACH_END));
      const b = smooth(seg(p, APPROACH_END, SURVEY_END));
      const c = smooth(seg(p, SURVEY_END, ASCEND_END));
      const d = smooth(seg(p, ASCEND_END, 1));

      /* radius: 26 -> 15 (approach), held through survey, 15 -> 1.6 (ascend),
         1.6 -> 2.4 (settle). 15 is the closest the dolly can end and still
         hold the whole 6m box inside a 34-degree frame — measured on the page,
         not guessed: at 9 the box overflowed the viewport on both sides. */
      const radius = 26 + (15 - 26) * a + (1.6 - 15) * c + (2.4 - 1.6) * d;
      /* height: 6 -> 2.6 (approach), 2.6 -> 20 (ascend), 20 -> 17 (settle).
         20 rather than 14 for the same reason as the radius above — at 14 the
         top face overflowed the frame and the 3x3 marks were cropped, which
         defeats the whole point of the final beat. */
      const height = 6 + (2.6 - 6) * a + (20 - 2.6) * c + (17 - 20) * d;
      // azimuth: held, then a quarter turn during survey, then a slow drift
      const az = AZ0 + (Math.PI / 2) * b + 0.18 * d;

      camera.position.set(Math.sin(az) * radius, height, Math.cos(az) * radius);
      // aim: at the box, easing up to the lid as the camera goes overhead so
      // the top face — where the LOCATE marks live — fills the frame
      target.set(0, 0.2 + 1.0 * c, 0);
      camera.lookAt(target);
      key.target.position.copy(target);
      key.target.updateMatrixWorld();

      // scan plane sweeps the full length only while SURVEY is live
      const scanOn = window01(p, APPROACH_END - 0.01, SURVEY_END + 0.01, 0.05);
      scanMat.opacity = 0.5 * scanOn;
      scan.position.x = -3.5 + 7 * b;

      // LOCATE marks fade in over the last window
      const loc = seg(p, ASCEND_END, 0.95);
      dotMat.opacity = 0.95 * loc;
      brMat.opacity = 0.85 * loc;

      // DOM captions — real text nodes, driven by the same number
      CAPTIONS.forEach((cap, i) => {
        const el = capsRef.current[i];
        if (!el) return;
        const o = clamp01(window01(p, cap.a, cap.b));
        el.style.opacity = String(o);
        // a small counter-scroll rise, again purely positional in p
        el.style.transform = `translate3d(0, ${(1 - o) * 14}px, 0)`;
        el.style.visibility = o < 0.01 ? "hidden" : "visible";
      });
    };

    /* ---- sizing --------------------------------------------------------- */
    const size = () => {
      const w = wrap.clientWidth || 1;
      const h = wrap.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(wrap);

    /* ---- render loop ----------------------------------------------------
       45fps gate. This scene has nothing that needs 60 — the motion is scroll
       velocity, which is already damped — and the third of the frames we skip
       is a third of the GPU budget handed back to the rest of the page.
       Visibility: rAF is already suspended for a hidden tab, so the extra
       IntersectionObserver is only about the canvas being scrolled off. */
    const clock = new THREE.Clock();
    let last = -1;
    let raf = 0;
    let onScreen = true;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!onScreen) return;
      const now = clock.getElapsedTime();
      if (now - last < 1 / 46) return;
      last = now;
      apply(journey.p);
      renderer.render(scene, camera);
    };

    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }, { threshold: 0 });
    io.observe(renderer.domElement);

    /* The subscription is what keeps `p` and the frame in step under normal
       scrolling; the rAF loop is the fallback that still paints on the frames
       between damper ticks (and the only thing running when scroll is idle).
       Both call the same pure `apply`, so a double call is harmless. */
    const unsub = subscribe(apply);

    if (reduced) {
      /* No loop at all: one frame at the frozen midpoint. ScrollManager also
         calls freezeAt(0.5), but this scene must be correct even if it mounts
         first, so it paints its own still. */
      apply(0.5);
      renderer.render(scene, camera);
      /* ...and then override the caption layout `apply` just wrote: at a
         single frozen p only one window is open, which would hide three
         quarters of the copy. Reduced motion should cost the animation, not
         the content — so all four stack, fully visible, top-to-bottom. */
      capsRef.current.forEach((el, i) => {
        if (!el) return;
        el.style.opacity = "1";
        el.style.visibility = "visible";
        el.style.transform = "none";
        el.style.bottom = "auto";
        el.style.top = `calc(${i * 24}vh + 24px)`;
      });
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      unsub();
      io.disconnect();
      ro.disconnect();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
      [shellMat, ribMat, castMat, scanMat, dotMat, brMat].forEach((m) => m.dispose());
      (Array.isArray(gm) ? gm : [gm]).forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <>
      <div ref={wrapRef} aria-hidden="true" style={{ position: "absolute", inset: 0 }} />

      {/* Captions are real DOM, absolutely positioned over the canvas. They
          stay selectable and screen-readable, which a texture never is. */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {CAPTIONS.map((cap, i) => (
          <div
            key={cap.tag}
            ref={(el) => { capsRef.current[i] = el; }}
            style={{
              position: "absolute",
              left: "clamp(24px, 6vw, 88px)",
              bottom: "clamp(56px, 12vh, 120px)",
              maxWidth: 420,
              opacity: 0,
              willChange: "opacity, transform",
            }}
          >
            <span style={{ display: "block", fontFamily: mono, fontSize: 11, letterSpacing: "0.16em", color: OBSERVE }}>
              {cap.tag}
            </span>
            <h2 style={{ margin: "14px 0 0", fontFamily: sans, fontSize: "clamp(28px, 4vw, 44px)", lineHeight: 1.05, fontWeight: 600, letterSpacing: "-0.03em", color: "#EDEFF2" }}>
              {cap.title}
            </h2>
            <p style={{ margin: "12px 0 0", fontFamily: sans, fontSize: 16, lineHeight: 1.5, color: "#9BA1AB" }}>
              {cap.body}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
