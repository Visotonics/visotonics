"use client";

/* ---------------------------------------------------------------------------
   Container Vision — cinematic product demo.

   Apple product-studio lighting (softbox key + strip kickers raking the edges,
   lit cyclorama, reflective floor) with an Anduril/Palantir industrial read:
   graphite steel, one cool signal, one warm warning, precise typography.

   Autoplay loop, four beats: arrive -> read markings -> scan -> findings.
   Fills its parent. Not scroll-driven. prefers-reduced-motion holds a frame.
--------------------------------------------------------------------------- */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { PALETTE, sans } from "./palette";
import { buildContainer, L } from "./container";
import { buildMaterials, makeCrackDecal, makeDentDecal } from "./materials";
import { buildHud } from "./hud";

const LOOP = 10;
const INTRO = 1.1;        // wireframe resolves into steel
const HOLD_END = 1.75;    // brief beat on the finished container, centred, alone
const ZOOM_IN = 2.25;     // then a half-second push straight into stop 1
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth01 = (t: number) => { const c = clamp01(t); return c * c * (3 - 2 * c); };
const smoothstep = (a: number, b: number, x: number) => smooth01((x - a) / (b - a));
// smootherstep — zero velocity AND zero acceleration at both ends, so moves
// glide out of and into their holds with no perceptible snap
const easeInOut = (t: number) => { const c = clamp01(t); return c * c * c * (c * (c * 6 - 15) + 10); };

/* Camera keyframes — a deliberate story, shot low and close like product film */
interface CamKey { p: number; az: number; el: number; rad: number; t: [number, number, number] }
/* Three detail shots between hero bookends: markings -> dent -> crack.
   No key is ever repeated, so the camera never comes to a stop — each "hold"
   is a slow curved drift across the subject that merely decelerates. The first
   and last keys match exactly so the loop is seamless. */
/* Exactly three places the camera settles: the markings, the front damage,
   and the roof. Between them it is always travelling. The first and last keys
   match so the loop closes seamlessly. */
/* Cyclic — deliberately no closing key at p=1. The path wraps straight from
   the last key back to key 0, so there is nothing for the loop to "land" on.

   The previous version's p=1 key didn't even match p=0 (a silent hard jump
   every repeat — likely the single biggest cause of the choppiness), on top
   of straight-line segments that made the camera's DIRECTION snap at every
   key regardless. Both are fixed below: one set of keys, one spline. */
const CAM: CamKey[] = [
  { p: 0.00, az: 0.06, el: 0.06, rad: 7.0, t: [-1.5, 0.1, 0.9] },    // 1 — markings
  { p: 0.16, az: 0.16, el: 0.09, rad: 6.7, t: [-1.34, 0.1, 0.9] },   //     drifting across
  { p: 0.34, az: 0.28, el: 0.05, rad: 6.9, t: [-0.05, 0.06, 0.9] },  // 2 — dent + corrosion
  { p: 0.50, az: 0.41, el: 0.10, rad: 6.5, t: [0.06, 0.06, 0.9] },   //     drifting
  { p: 0.66, az: 0.42, el: 0.85, rad: 6.2, t: [0.35, 1.42, 0.02] },  // 3 — roof
  { p: 0.82, az: 0.57, el: 0.78, rad: 5.9, t: [0.26, 1.42, 0.08] },  //     drifting back toward 1
];
// Push the subject into the right half of the frame, leaving the left clear for
// type. Applied as a camera-local slide, so framing is unaffected by the angle.
const RIGHT_BIAS = 0.3;

// The opening frame: the whole container, centred, before anything else
// happens. The camera eases out of this into the first stop.
const OPENING = { az: 0.55, el: 0.16, rad: 12.0, tx: 0, ty: 0, tz: 0 };

// Catmull-Rom, evaluated on the wrapped key ring. Unlike straight segments,
// this carries a continuous tangent across every key INCLUDING the wrap from
// the last key back to the first — no seam, no direction snap, no repeat jolt.
function cr(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}
function sampleCam(p: number) {
  const n = CAM.length;
  const wrap = (i: number) => CAM[((i % n) + n) % n];
  let i = n - 1;
  for (let k = 0; k < n; k++) if (p >= CAM[k].p) i = k;
  const a = wrap(i);
  const b = wrap(i + 1);
  const span = (b.p > a.p ? b.p : b.p + 1) - a.p; // final span closes onto key 0 at p=1
  const t = span > 0 ? (p - a.p) / span : 0;
  const m1 = wrap(i - 1);
  const p2k = wrap(i + 2);
  const f = (sel: (k: CamKey) => number) => cr(sel(m1), sel(a), sel(b), sel(p2k), t);
  return {
    az: f((k) => k.az), el: f((k) => k.el), rad: f((k) => k.rad),
    tx: f((k) => k.t[0]), ty: f((k) => k.t[1]), tz: f((k) => k.t[2]),
  };
}
/* the subject holds still — the camera does the moving */

interface Anno { wrap: HTMLDivElement; local: THREE.Vector3; normal: THREE.Vector3; lane: number; up: boolean; win: [number, number] }

/* Every finding stays on screen for the whole loop. Each one is given its own
   vertical lane — a different leader length and direction — so labels sit at
   distinct heights and never collide, whichever way the camera is looking. */
const LANE: Record<string, { dir: "up" | "down"; len: number; row: number }> = {
  crack: { dir: "up", len: 150, row: 0 },
  "dent-top": { dir: "up", len: 58, row: 1 },
  dent: { dir: "up", len: 58, row: 2 },
  // rust sits low on the panel, so its callout reaches upward or it would run
  // off the bottom of frame
  rust: { dir: "up", len: 158, row: 1 },
  seal: { dir: "down", len: 58, row: 0 },
};

/* Each finding lives around its own shot — it fades in a little before its
   home angle and lingers a little after, rather than persisting all loop. */
const WINDOW: Record<string, [number, number]> = {
  dent: [0.28, 0.62],
  rust: [0.28, 0.62],
  crack: [0.62, 0.97],
  "dent-top": [0.62, 0.97],
  seal: [9, 9], // on the model, but it has no stop of its own
};

export default function ContainerVisionScene() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const wrap = canvasWrapRef.current;
    const overlay = overlayRef.current;
    if (!host || !wrap || !overlay) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let cleanup = () => {};

    try {
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.18;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      wrap.appendChild(renderer.domElement);
      renderer.domElement.style.cssText = "display:block;width:100%;height:100%";

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);

      /* ---- studio environment: softbox strips for crisp metal reflections ---- */
      const envCv = document.createElement("canvas");
      envCv.width = 1024;
      envCv.height = 512;
      const ex = envCv.getContext("2d")!;
      const base = ex.createLinearGradient(0, 0, 0, 512);
      base.addColorStop(0.0, "#2A4C86");
      base.addColorStop(0.45, "#0D1B36");
      base.addColorStop(1.0, "#04070F");
      ex.fillStyle = base;
      ex.fillRect(0, 0, 1024, 512);
      ex.filter = "blur(22px)";
      // three overhead softboxes -> the long specular streaks along the corrugation
      ex.fillStyle = "rgba(255,255,255,0.95)";
      ex.fillRect(70, 40, 330, 66);
      ex.fillRect(560, 28, 300, 58);
      ex.fillStyle = "rgba(196,224,255,0.75)";
      ex.fillRect(300, 150, 420, 34);
      ex.filter = "none";
      const envTex = new THREE.CanvasTexture(envCv);
      envTex.mapping = THREE.EquirectangularReflectionMapping;
      envTex.colorSpace = THREE.SRGBColorSpace;
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envRT = pmrem.fromEquirectangular(envTex);
      envTex.dispose();
      scene.environment = envRT.texture;

      /* ---- cyclorama backdrop: gradient + a soft pool of light behind ---- */
      const backdrop = new THREE.Mesh(
        new THREE.SphereGeometry(70, 40, 40),
        new THREE.ShaderMaterial({
          side: THREE.BackSide,
          depthWrite: false,
          uniforms: {
            cTop: { value: new THREE.Color(PALETTE.bgTop) },
            cMid: { value: new THREE.Color(PALETTE.bgMid) },
            cBot: { value: new THREE.Color(PALETTE.bgBottom) },
            cGlow: { value: new THREE.Color(PALETTE.bgGlow) },
          },
          vertexShader: "varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
          fragmentShader: `
            varying vec3 vP; uniform vec3 cTop; uniform vec3 cMid; uniform vec3 cBot; uniform vec3 cGlow;
            void main(){
              vec3 d = normalize(vP);
              float h = clamp(d.y*0.5+0.5, 0.0, 1.0);
              // deep navy -> navy -> blue, purely blue ramp (no grey)
              vec3 col = h < 0.5
                ? mix(cBot, cMid, smoothstep(0.0, 0.5, h))
                : mix(cMid, cTop, smoothstep(0.5, 1.0, h));
              // light-blue pool behind the subject, from the lights
              float g = pow(max(dot(d, normalize(vec3(-0.1,0.16,-1.0))), 0.0), 3.4);
              gl_FragColor = vec4(col + cGlow*g*0.7, 1.0);
            }`,
        }),
      );
      scene.add(backdrop);

      /* ---- floor: soft reflection that fades out into the backdrop ---- */
      // No floor plane (a finite ground leaves a visible edge). Instead a solid
      // cast shadow directly beneath the subject, as if the light is overhead:
      // dense at the centre and falling off to nothing, so it merges seamlessly
      // into the dark blue of the backdrop.
      // A genuinely projected shadow. A painted blob can never be the right
      // shape — the subject is a box lit from above, so its shadow is the box's
      // own silhouette cast onto the ground, not an ellipse. Let the renderer
      // solve it: the light does the projection, the plane receives it.
      const shadowMat = new THREE.ShadowMaterial({ opacity: 0 });
      const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), shadowMat);
      shadowCatcher.rotation.x = -Math.PI / 2;
      shadowCatcher.position.y = -1.36;
      shadowCatcher.receiveShadow = true;
      scene.add(shadowCatcher);

      /* ---- lights: softbox key + strip kickers raking both edges ---- */
      RectAreaLightUniformsLib.init();
      const keyBox = new THREE.RectAreaLight(0xffffff, 5.6, 16, 9);
      keyBox.position.set(1.5, 8.5, 4);
      keyBox.lookAt(0, 0, 0);
      scene.add(keyBox);
      // cool kicker, back-left: draws the bright edge down the corrugations
      const kickL = new THREE.RectAreaLight(0xcfe6ff, 7.5, 1.4, 7);
      kickL.position.set(-7.5, 2.2, -4.5);
      kickL.lookAt(0, 0.2, 0);
      scene.add(kickL);
      // subtle warm kicker, back-right: separates the door end
      const kickR = new THREE.RectAreaLight(0xffe2c2, 4.5, 1.2, 6);
      kickR.position.set(7.5, 1.6, -4);
      kickR.lookAt(0, 0.2, 0);
      scene.add(kickR);
      // broad front fill — keeps the camera-facing side readable as the
      // container turns, without flattening the kickers
      const fill = new THREE.RectAreaLight(0xc2d4ee, 3.2, 20, 10);
      fill.position.set(-1, 2.2, 12);
      fill.lookAt(0, 0.5, 0);
      scene.add(fill);
      // second fill from camera-right so both long sides stay lit through the turn
      const fillB = new THREE.RectAreaLight(0xbcd0ee, 2.1, 12, 8);
      fillB.position.set(10, 2.0, 5);
      fillB.lookAt(0, 0.4, 0);
      scene.add(fillB);
      // concentrated pool of light on the subject — keeps the illumination on
      // the container rather than spilling evenly across the whole studio
      const spot = new THREE.SpotLight(0xc4dcff, 230, 30, 0.5, 0.92, 2);
      spot.position.set(0.5, 10, 3.5);
      spot.target.position.set(0, 0, 0);
      scene.add(spot);
      scene.add(spot.target);

      // shadow-only directional (RectAreaLights cannot cast shadows)
      // overhead and slightly to the front, matching the softbox: the shadow it
      // throws is the container's own footprint, pushed back and away from it
      const shadowLight = new THREE.DirectionalLight(0xffffff, 0.32);
      shadowLight.position.set(1.6, 12, 3.4);
      shadowLight.target.position.set(0, -1.36, 0);
      shadowLight.castShadow = true;
      shadowLight.shadow.mapSize.set(2048, 2048);
      shadowLight.shadow.camera.near = 1;
      shadowLight.shadow.camera.far = 40;
      Object.assign(shadowLight.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7 });
      shadowLight.shadow.bias = -0.0006;
      shadowLight.shadow.radius = 2; // crisp edge, not a soft pool
      scene.add(shadowLight);
      scene.add(shadowLight.target);
      scene.add(new THREE.HemisphereLight(0x3f63b0, 0x050c22, 0.4));

      /* ---- subject ---- */
      const mats = buildMaterials();
      const container = buildContainer(mats.steel, mats.dark, mats.front.material);
      container.group.position.y = 0.15;
      scene.add(container.group);
      const edgePos = container.edges.geometry.getAttribute("position");
      const edgeCount = edgePos ? edgePos.count : 0;
      const edgeMat = container.edges.material as THREE.LineBasicMaterial;

      const hud = buildHud();
      container.group.add(hud.group);

      const decalTex: THREE.Texture[] = [];
      const decalMats: THREE.MeshStandardMaterial[] = [];
      const addRoofDecal = (id: string, tex: THREE.Texture, scale: number) => {
        const def = container.defects.find((d) => d.id === id)!;
        const mat = new THREE.MeshStandardMaterial({
          map: tex, transparent: true, opacity: 0, roughness: 0.75, metalness: 0.2,
          depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
        });
        const m = new THREE.Mesh(new THREE.PlaneGeometry(def.size * scale, def.size * scale), mat);
        m.position.copy(def.pos);
        m.rotation.x = -Math.PI / 2;
        container.group.add(m);
        decalTex.push(tex);
        decalMats.push(mat);
      };
      addRoofDecal("dent-top", makeDentDecal(), 1.3);
      addRoofDecal("crack", makeCrackDecal(), 1.5);

      /* ---- callouts: dot + hairline + frosted label ---- */
      // restrained pill, not a heavy glass slab
      const CARD = "background:rgba(6,12,26,0.62);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:0 6px 22px rgba(0,0,0,0.5);";
      const annos: Anno[] = container.defects.map((d) => {
        const lane = LANE[d.id] ?? { dir: "up" as const, len: 52, row: 0 };
        const up = lane.dir === "up";
        const c = d.severe ? PALETTE.warn : PALETTE.accent;
        const w = document.createElement("div");
        w.style.cssText = "position:absolute;left:0;top:0;opacity:0;transition:opacity .4s ease;pointer-events:none;will-change:transform,opacity;";
        // solid marker, no glow
        const dot = document.createElement("div");
        dot.style.cssText = `position:absolute;left:0;top:0;width:9px;height:9px;transform:translate(-50%,-50%);border-radius:50%;background:#0A0D14;border:2px solid ${c};`;
        w.appendChild(dot);
        // plain black leader — a drafting line, not a light beam
        const leader = document.createElement("div");
        leader.style.cssText = `position:absolute;left:0;${up ? "bottom" : "top"}:6px;width:1.5px;height:${lane.len}px;transform:translateX(-50%);background:#05070C;`;
        w.appendChild(leader);
        // all cards are plain black; the finding's own colour lives in its title
        const label = document.createElement("div");
        label.style.cssText = `position:absolute;left:0;${up ? "bottom" : "top"}:${lane.len + 4}px;transform:translateX(-50%);white-space:nowrap;text-align:center;font-family:${sans};border-radius:3px;padding:14px 26px;background:rgba(3,5,9,0.9);`;
        label.innerHTML =
          `<div style="font-size:21px;font-weight:600;letter-spacing:-0.02em;color:${c};line-height:1.18">${d.title}</div>` +
          `<div style="font-size:14px;font-weight:400;color:rgba(255,255,255,0.72);margin-top:4px">${d.detail}</div>`;
        w.appendChild(label);
        overlay.appendChild(w);
        return { wrap: w, local: d.pos.clone(), normal: d.normal.clone(), lane: lane.len, up, win: WINDOW[d.id] ?? [0, 1] };
      });

      /* ---- OCR marker + specs card ---- */
      const ocrLocal = container.ocr.pos.clone();
      const ocrNormal = container.ocr.normal.clone();
      const ocrDot = document.createElement("div");
      ocrDot.style.cssText = `position:absolute;left:0;top:0;opacity:0;transition:opacity .3s;pointer-events:none;width:7px;height:7px;margin:-3.5px 0 0 -3.5px;border-radius:50%;background:${PALETTE.accent};box-shadow:0 0 0 4px ${PALETTE.accent}22,0 0 12px ${PALETTE.accent}99;`;
      overlay.appendChild(ocrDot);

      // Values match the paint on the steel exactly, character for character.
      // Set as plain type on the backdrop — no card, no glass.
      const OCR_FIELDS = [
        ["Container ID", "VSTU 907032 1"],
        ["ISO type", "22G1"],
        ["Max gross", "30480 KG"],
        ["Tare", "2200 KG"],
        ["Manufactured", "03-2019"],
      ];
      // tier 2 — reads below the headline, above the labels
      const ocrPanel = document.createElement("div");
      // plain, unshadowed type: neutral greys for the keys, clean white for the
      // values. No glow, no tinting.
      // Left column, under the wordmark — the subject now occupies the right of
      // frame. Sits on its own soft dark pool so the values stay bright and
      // legible whatever passes behind them.
      // Sits on the same 34px left margin as the wordmark and headline. Padding
      // is uniform and the pool is inset symmetrically, so the block reads
      // aligned to the type column rather than floating at a random offset.
      // Plain structured type, not a table: no panel, no rules, no boxes — just
      // a label/value stack set on the left margin.
      ocrPanel.style.cssText =
        `position:absolute;left:34px;top:76px;opacity:0;transition:opacity .6s ease;font-family:${sans};width:270px;`;
      const ocrHead = document.createElement("div");
      ocrHead.textContent = "Extracted markings";
      ocrHead.style.cssText = "font-size:9.5px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.5);padding-bottom:14px;";
      ocrPanel.appendChild(ocrHead);
      // real table structure — two aligned columns — just without a panel behind it
      const ocrTable = document.createElement("div");
      ocrTable.style.cssText = "display:grid;grid-template-columns:auto 1fr;column-gap:28px;align-items:baseline;";
      ocrPanel.appendChild(ocrTable);
      const ocrRows = OCR_FIELDS.map(([k, v]) => {
        const cellK = document.createElement("div");
        cellK.style.cssText = "padding:7px 0;font-size:11px;font-weight:400;color:rgba(255,255,255,0.6);white-space:nowrap;";
        cellK.textContent = k;
        const cellV = document.createElement("div");
        cellV.style.cssText = "padding:7px 0;font-size:15px;font-weight:600;letter-spacing:-0.015em;color:#fff;text-align:right;white-space:nowrap;";
        cellV.textContent = v;
        const row = document.createElement("div");
        row.style.cssText = "display:contents;opacity:1;";
        // opacity has to live on the cells: display:contents cannot be faded
        const set = (o: string) => { cellK.style.opacity = o; cellV.style.opacity = o; };
        set("0");
        cellK.style.transition = "opacity .35s ease";
        cellV.style.transition = "opacity .35s ease";
        ocrTable.appendChild(cellK);
        ocrTable.appendChild(cellV);
        return { style: { set opacity(o: string) { set(o); } } } as unknown as HTMLDivElement;
      });
      overlay.appendChild(ocrPanel);

      /* ---- post: restrained bloom, only true highlights ---- */
      let composer: EffectComposer | null = null;
      let bloom: UnrealBloomPass | null = null;
      try {
        composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.24, 0.45, 0.96);
        composer.addPass(bloom);
      } catch {
        composer = null;
      }

      const size = () => {
        const w = wrap.clientWidth || 900;
        const h = wrap.clientHeight || 380;
        renderer.setSize(w, h, false);
        composer?.setSize(w, h);
        bloom?.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      size();
      const ro = new ResizeObserver(size);
      ro.observe(wrap);

      const clock = new THREE.Clock();
      const target = new THREE.Vector3();
      const ndc = new THREE.Vector3();
      const wpos = new THREE.Vector3();
      const tmpN = new THREE.Vector3();
      const tmpC = new THREE.Vector3();
      let raf = 0;

      const STATUS = [
        "It reads every marking.",
        "It finds dents and corrosion.",
        "And every crack.",
      ];
      let lastStage = -1;

      const project = (world: THREE.Vector3, normal: THREE.Vector3, w: number, h: number) => {
        const wn = tmpN.copy(normal).applyQuaternion(container.group.quaternion);
        if (wn.dot(tmpC.copy(camera.position).sub(world)) <= 0.08) return null;
        const p = ndc.copy(world).project(camera);
        if (p.z > 1) return null;
        return { sx: (p.x * 0.5 + 0.5) * w, sy: (-p.y * 0.5 + 0.5) * h };
      };

      const applyFrame = () => {
        const dbg = window as unknown as { __cvFreeze?: boolean; __cvPhase?: number; __cvT?: number };
        const hasPf = typeof dbg.__cvPhase === "number";
        const hasT = typeof dbg.__cvT === "number";
        const frozen = reduce || Boolean(dbg.__cvFreeze) || hasPf;
        const t = hasT ? (dbg.__cvT as number) : frozen ? 6.0 : clock.getElapsedTime();
        const w = renderer.domElement.clientWidth || wrap.clientWidth;
        const h = renderer.domElement.clientHeight || wrap.clientHeight;

        // The loop does not begin until the opening push has landed on stop 1,
        // so the zoom-in is one clean move rather than a move fighting a
        // sequence that has already started running underneath it.
        let phase = -1;
        if (hasPf) phase = dbg.__cvPhase as number;
        else if (frozen && !hasT) phase = 0.62;
        else if (t > ZOOM_IN) phase = ((t - ZOOM_IN) % LOOP) / LOOP;
        const cp = phase < 0 ? 0 : phase;

        // camera path — eased out of the centred opening frame into stop 1
        const k = sampleCam(cp);
        const ioDbg = (window as unknown as { __cvIO?: number }).__cvIO;
        // hold dead centre, then a half-second push all the way in
        const io = typeof ioDbg === "number" ? ioDbg : frozen && !hasT ? 1 : smoothstep(HOLD_END, ZOOM_IN, t);
        const cAz = lerp(OPENING.az, k.az, io);
        const cEl = lerp(OPENING.el, k.el, io);
        const cRad = lerp(OPENING.rad, k.rad, io);
        const cTx = lerp(OPENING.tx, k.tx, io);
        const cTy = lerp(OPENING.ty, k.ty, io);
        const cTz = lerp(OPENING.tz, k.tz, io);
        target.set(cTx, cTy + 0.15, cTz);
        camera.position.set(
          cTx + cRad * Math.cos(cEl) * Math.sin(cAz),
          cTy + 0.15 + cRad * Math.sin(cEl),
          cTz + cRad * Math.cos(cEl) * Math.cos(cAz),
        );

        // Handheld float: layered slow sines (never repeating in phase) give a
        // subtle organic drift rather than a mechanical wobble. Amplitude scales
        // with distance so close shots don't feel shaky.
        if (!frozen) {
          const amp = cRad * 0.0075;
          const fx = Math.sin(t * 0.41) * 0.6 + Math.sin(t * 0.73 + 2.1) * 0.4;
          const fy = Math.sin(t * 0.52 + 1.3) * 0.6 + Math.sin(t * 0.91 + 0.6) * 0.4;
          const fz = Math.sin(t * 0.34 + 3.0) * 0.6 + Math.sin(t * 0.63 + 1.9) * 0.4;
          camera.position.x += fx * amp;
          camera.position.y += fy * amp * 0.8;
          camera.position.z += fz * amp;
          // breathe the aim slightly out of step with the body for parallax
          target.x += Math.sin(t * 0.29 + 0.8) * amp * 0.35;
          target.y += Math.sin(t * 0.37 + 2.4) * amp * 0.3;
        }

        camera.lookAt(target);
        // a whisper of roll, so the horizon is never dead level
        if (!frozen) camera.rotateZ(Math.sin(t * 0.23 + 1.1) * 0.0035);
        // slide the camera left so the subject sits in the right half of frame.
        // Scaled by the opening blend, so the first frame is dead centre.
        camera.translateX(-cRad * RIGHT_BIAS * io);

        // Bring the camera matrices up to date NOW. Vector3.project() reads
        // matrixWorldInverse, which the renderer would not refresh until after
        // this function returns — leaving every label a frame behind the camera
        // and visibly off its feature while the camera is moving.
        camera.updateMatrixWorld(true);
        camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

        // subject holds its pose; only the faintest float keeps it alive
        container.group.rotation.y = 0;
        container.group.position.y = 0.15 + (frozen ? 0 : 0.022 * Math.sin(cp * Math.PI * 2));
        container.group.updateMatrixWorld(true);

        // Formation: the wireframe eases on, the steel eases up underneath it,
        // and the wireframe dissolves off the top. The three overlap, so there
        // is never a moment where one hands over abruptly to the other.
        const drawT = easeInOut(clamp01(t / 0.62));
        container.edges.geometry.setDrawRange(0, Math.floor(edgeCount * drawT));
        edgeMat.opacity = 0.55 * drawT * (1 - smoothstep(0.58, 1.2, t));
        const solid = frozen && !hasT ? 1 : easeInOut(clamp01((t - 0.45) / 0.95));
        mats.steel.opacity = solid;
        mats.dark.opacity = solid;
        mats.front.material.opacity = solid;
        decalMats.forEach((m) => (m.opacity = solid * ((m.userData?.maxOpacity as number) ?? 1)));
        // A transparent mesh still casts a full shadow, so without this the
        // container's shadow was on the ground before the container existed.
        shadowMat.opacity = 0.62 * solid;
        container.hardware.forEach((m) => {
          (m.material as THREE.Material & { opacity: number }).opacity = solid;
        });

        // scan
        let scanX = -99;
        let scanOn = 0;
        // the scan sweeps during the hero-to-markings move, so the detail shots
        // stay clean and unhurried
        // scan runs during the travel from the markings to the front damage
        if (phase >= 0.2 && phase <= 0.34) {
          const st = (phase - 0.2) / 0.14;
          scanX = -L / 2 - 0.35 + st * (L + 0.7);
          scanOn = Math.sin(st * Math.PI);
        }
        hud.setScan(scanX, scanOn, t);
        mats.front.setScan(scanX, scanOn);
        mats.front.setTime(t);
        mats.front.setReveal(phase >= 0.2 ? 1 : 0);

        // callouts
        // every finding persists for the whole loop; it only fades when its own
        // surface turns away from the camera
        // A label is welded to its feature and never nudged, so a callout always
        // points at the thing it names. If the whole callout cannot fit on
        // screen it simply fades out rather than drifting off its mark.
        const LBL = 46;
        annos.forEach((a) => {
          const [w0, w1] = a.win;
          const inWin = phase < 0 ? 0 : smoothstep(w0, w0 + 0.05, phase) * (1 - smoothstep(w1 - 0.05, w1, phase));
          const world = wpos.copy(a.local).applyMatrix4(container.group.matrixWorld);
          const r = (frozen ? 1 : inWin) > 0.01 ? project(world, a.normal, w, h) : null;
          if (!r) { a.wrap.style.opacity = "0"; return; }
          const top = a.up ? r.sy - a.lane - 4 - LBL : r.sy;
          const bot = a.up ? r.sy : r.sy + a.lane + 4 + LBL;
          // the subject lives in the right half, so callouts must stay clear of
          // the left type column entirely
          const fits =
            r.sx > w * 0.3 && r.sx < w * 0.97 && top > h * 0.03 && bot < h * 0.94;
          a.wrap.style.transform = `translate(${r.sx}px,${r.sy}px)`;
          a.wrap.style.opacity = fits ? String(frozen ? 1 : inWin) : "0";
        });

        // OCR
        const dotVis = phase < 0 ? 0 : smoothstep(0.03, 0.08, phase) * (1 - smoothstep(0.2, 0.26, phase));
        {
          const world = wpos.copy(ocrLocal).applyMatrix4(container.group.matrixWorld);
          const r = dotVis > 0.01 ? project(world, ocrNormal, w, h) : null;
          if (!r) ocrDot.style.opacity = "0";
          else {
            ocrDot.style.transform = `translate(${r.sx}px,${r.sy}px)`;
            ocrDot.style.opacity = String(dotVis);
          }
        }
        // table appears as the markings are read and persists to the end
        // fills in at the markings stop, holds through the damage stop, then
        // clears before the roof — it has been read, it does not need to linger
        const cardVis = phase < 0 ? 0 : smoothstep(0.07, 0.13, phase) * (1 - smoothstep(0.56, 0.63, phase));
        ocrPanel.style.opacity = String(frozen ? 1 : cardVis);
        ocrRows.forEach((row, i) => {
          row.style.opacity = String(frozen ? 1 : smoothstep(0.09 + i * 0.015, 0.12 + i * 0.015, phase));
        });

        // headline
        const stage = phase < 0 || phase < 0.3 ? 0 : phase < 0.64 ? 1 : 2;
        if (headlineRef.current && lastStage !== stage) {
          lastStage = stage;
          const el = headlineRef.current;
          el.style.opacity = "0";
          el.style.transform = "translateY(6px)";
          window.setTimeout(() => {
            el.textContent = STATUS[stage];
            el.style.opacity = "1";
            el.style.transform = "translateY(0)";
          }, 130);
        }

        // Nothing but the container during the opening hold — the wordmark,
        // headline, table and callouts all arrive only once the push has landed.
        const uiVis = frozen && !hasT ? 1 : smoothstep(ZOOM_IN - 0.1, ZOOM_IN + 0.5, t);
        (window as unknown as { __cvNow?: number }).__cvNow = t;
        overlay.style.opacity = String(uiVis);
        if (chromeRef.current) chromeRef.current.style.opacity = String(uiVis);
        if (scrimRef.current) scrimRef.current.style.opacity = String(uiVis);

        if (bloom) bloom.strength = 0.2 + scanOn * 0.3;
      };

      const loop = () => {
        applyFrame();
        if (composer) composer.render();
        else renderer.render(scene, camera);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        annos.forEach((a) => a.wrap.remove());
        ocrDot.remove();
        ocrPanel.remove();
        decalTex.forEach((x) => x.dispose());
        decalMats.forEach((m) => m.dispose());
        envRT.dispose();
        pmrem.dispose();
        mats.dispose();
        scene.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
        });
        composer?.dispose?.();
        renderer.dispose();
        renderer.domElement.remove();
      };
    } catch (err) {
      console.error("[container-vision] init failed:", err);
      wrap.style.background = PALETTE.bgBottom;
    }

    return () => cleanup();
  }, []);

  return (
    <div ref={hostRef} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: PALETTE.bgBottom }}>
      <div ref={canvasWrapRef} style={{ position: "absolute", inset: 0 }} />

      {/* Scrim sits BEHIND the overlay so the table and callouts render on top
          of it, not under it. Fades to fully transparent — no visible edge. */}
      <div
        ref={scrimRef}
        aria-hidden
        style={{
          position: "absolute", inset: 0, pointerEvents: "none", opacity: 0,
          background:
            "linear-gradient(to right, rgba(2,5,13,0.72) 0%, rgba(2,5,13,0.4) 20%, rgba(2,5,13,0) 46%)," +
            "linear-gradient(to top, rgba(2,5,13,0.55) 0%, rgba(2,5,13,0.22) 18%, rgba(2,5,13,0) 46%)",
        }}
      />

      <div ref={overlayRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0 }} />

      {/* Hierarchy, loudest to quietest: headline > extracted table > labels */}
      <div ref={chromeRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", fontFamily: sans, opacity: 0 }}>
        {/* tier 3 — quiet identifier */}
        <div style={{ position: "absolute", top: 22, left: 34 }}>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: PALETTE.accentText, opacity: 0.85 }}>
            Viso Yard
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 500, letterSpacing: "0.01em", color: "rgba(255,255,255,0.72)", marginTop: 2 }}>
            Container Vision
          </div>
        </div>

        {/* tier 1 — the line that commands the frame */}
        <div style={{ position: "absolute", left: 34, bottom: 30, maxWidth: "52%" }}>
          <div
            ref={headlineRef}
            style={{
              fontSize: "clamp(26px,3.5vw,46px)", fontWeight: 600, letterSpacing: "-0.03em",
              color: "#fff", lineHeight: 1.04, opacity: 1,
              textShadow: "0 2px 30px rgba(0,0,0,0.75)",
              transition: "opacity .22s ease, transform .22s ease",
            }}
          >
            Every container. Every face.
          </div>
        </div>
      </div>
    </div>
  );
}
