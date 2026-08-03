/* ---------------------------------------------------------------------------
   Vision scenes — the studio.

   Everything that is the same in every flagship animation: renderer, tone
   mapping, the softbox environment that puts specular streaks on metal, the
   graphite cyclorama, the five-light product setup, a real projected shadow,
   restrained bloom, and resize plumbing.

   This is the house lighting. A scene supplies its subject and its camera
   story; it does not relight the room.
--------------------------------------------------------------------------- */
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { PALETTE } from "./palette";

export interface StudioOpts {
  /** Ground height for the cast shadow — put it at the subject's underside. */
  floorY?: number;
  /** Half-extent of the shadow camera. Widen for subjects longer than a box. */
  shadowExtent?: number;
  /** Scale the light rig for a subject wider than one container. The lights
      keep their character — the room just gets bigger, so a vehicle-length
      subject doesn't fall off the edge of the key and the fills. */
  spread?: number;
  /** Tone-mapping exposure. The default is set for a container-sized subject
      at container distance; a small subject sits proportionally closer to the
      same lights and clips without pulling this down. */
  exposure?: number;
  /* ---- cost controls. A 320px card should not pay a flagship's GPU bill. -- */
  /** Bloom pass. Off means no EffectComposer at all — one less full-frame
      render target plus its blur chain, every frame. */
  bloom?: boolean;
  /** Shadow map resolution. 2048 is for a subject filling a 1600px frame. */
  shadowMapSize?: number;
  /** Device-pixel-ratio ceiling. Small canvases gain nothing above ~1.5. */
  maxDpr?: number;
  /** LIGHT RIG SIZE.

      "full" is the five-RectAreaLight product setup the flagships are lit with.
      "lite" is three cheap lights and NO RectAreaLight at all.

      This is the single most expensive thing in a scene. A RectAreaLight needs
      LTC lookup textures and adds heavy per-fragment work, and — worth saying
      plainly — it cannot cast shadows, so all five exist purely for look. Every
      material in the scene must compile a shader program carrying the whole
      rig, which is why scene builds cost hundreds of milliseconds.

      At card size the difference between five area lights and three simple ones
      is close to invisible. At flagship size it is not, so the flagships keep
      "full". */
  lightRig?: "full" | "lite";
  /** Skip the environment map entirely. PMREM prefiltering runs PER RENDERER
      — it cannot be shared across contexts — so a page of four scenes pays for
      it four times, and it is one of the largest single costs in a scene build.
      Scenes that are small, dim, or dominated by flat surfaces lose very little
      without it; the five-light rig still does the work. */
  noEnv?: boolean;
  /** Path to a real HDRI (.hdr) for the environment, served from /public.
      When absent the hand-painted softbox canvas below is used instead.

      This is the single highest-leverage upgrade available to these scenes:
      a PBR metal is very nearly ONLY its environment reflection, and right now
      that environment is three blurred white rectangles. A real captured studio
      HDRI changes every metal surface at once, for one file and no code. */
  envHdr?: string;
  /** BARE mode: no cyclorama at all and a transparent framebuffer, so the
      subject sits directly on the page instead of inside a rendered picture.
      Forces bloom off — the bloom pass composites over an opaque buffer and
      would fill the transparency back in with black. */
  bare?: boolean;
  /** Override the cyclorama colours. Default is the site canvas ramp; a scene
      sitting on a lighter surface (a card on `DARK_SURFACE`) has to be keyed to
      THAT surface instead, or its frame reads as a darker hole punched in it. */
  backdrop?: { top: string; mid: string; bottom: string; glow: string };
}

export interface Studio {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  composer: EffectComposer | null;
  bloom: UnrealBloomPass | null;
  /** Fade the cast shadow in with the subject — a transparent mesh still
      casts a full one, so without this the shadow precedes the object. */
  shadowMat: THREE.ShadowMaterial;
  size: () => void;
  render: () => void;
  dispose: () => void;
}

/* The studio environment, drawn once for the whole page.

   A PBR metal is very nearly ONLY its environment reflection, so this canvas
   matters more than any other texture — but it is identical for every scene,
   so generating it per scene was pure waste. Soft-edged radial softboxes (not
   hard rectangles: a hard edge cannot produce a highlight that rolls), a floor
   bounce so undersides are not dead black, and faint vertical structure for
   curved surfaces to smear along. */
let _envCanvas: HTMLCanvasElement | null = null;
function envCanvas(): HTMLCanvasElement {
  if (_envCanvas) return _envCanvas;
  const EW = 1024, EH = 512;
  const cv = document.createElement("canvas");
  cv.width = EW;
  cv.height = EH;
  const ex = cv.getContext("2d")!;

  const room = ex.createLinearGradient(0, 0, 0, EH);
  room.addColorStop(0.00, "#3E5A86");
  room.addColorStop(0.32, "#1B2942");
  room.addColorStop(0.52, "#0C1424");
  room.addColorStop(0.72, "#141A26");
  room.addColorStop(1.00, "#252A33");
  ex.fillStyle = room;
  ex.fillRect(0, 0, EW, EH);

  const softbox = (cx: number, cy: number, rx: number, ry: number, peak: number, tint: string) => {
    const g2 = ex.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
    g2.addColorStop(0, `rgba(255,255,255,${peak})`);
    g2.addColorStop(0.45, tint);
    g2.addColorStop(1, "rgba(255,255,255,0)");
    ex.save();
    ex.translate(cx, cy);
    ex.scale(1, ry / Math.max(rx, ry));
    ex.translate(-cx, -cy);
    ex.fillStyle = g2;
    ex.beginPath();
    ex.arc(cx, cy, Math.max(rx, ry), 0, Math.PI * 2);
    ex.fill();
    ex.restore();
  };
  softbox(EW * 0.30, EH * 0.15, 210, 75, 0.95, "rgba(226,238,255,0.45)");
  softbox(EW * 0.72, EH * 0.12, 165, 60, 0.85, "rgba(214,232,255,0.40)");
  softbox(EW * 0.06, EH * 0.34, 95, 130, 0.55, "rgba(180,210,255,0.28)");
  softbox(EW * 0.94, EH * 0.36, 85, 120, 0.45, "rgba(255,236,214,0.22)");
  softbox(EW * 0.50, EH * 0.88, 350, 100, 0.30, "rgba(190,200,214,0.18)");

  ex.globalAlpha = 0.05;
  for (let i = 0; i < 22; i++) {
    ex.fillStyle = i % 2 ? "#ffffff" : "#000000";
    ex.fillRect((i / 22) * EW, EH * 0.42, EW / 44, EH * 0.34);
  }
  ex.globalAlpha = 1;

  _envCanvas = cv;
  return cv;
}

export function createStudio(wrap: HTMLElement, opts: StudioOpts = {}): Studio {
  const floorY = opts.floorY ?? -1.36;
  const ext = opts.shadowExtent ?? 7;
  const sp = opts.spread ?? 1;
  const bg = opts.backdrop ?? {
    top: PALETTE.bgTop, mid: PALETTE.bgMid, bottom: PALETTE.bgBottom, glow: PALETTE.bgGlow,
  };

  /* ?perf breakdown. The build timer in mount.ts reports one number per scene,
     which says a scene is expensive but not WHICH HALF is expensive — and the
     studio half and the subject half have completely different fixes. */
  const _t0 = performance.now();
  const mark = (what: string) => {
    if (typeof location === "undefined" || !location.search.includes("perf")) return;
    const w = window as unknown as { __visionStudio?: string[] };
    (w.__visionStudio ||= []).push(`${what} ${(performance.now() - _t0).toFixed(0)}`);
  };

  const bare = opts.bare === true;
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: bare,
    premultipliedAlpha: false,
    powerPreference: "high-performance",
  });
  if (bare) renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, opts.maxDpr ?? 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = opts.exposure ?? 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  wrap.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%";

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);

  /* ---- studio environment ----
     Built ONCE per page (see `envCanvas` at module scope), not once per scene.
     Four cards on the homepage were each filling a 2048x1024 canvas with five
     radial gradients and then handing it to PMREM — four times the pixel fill
     and four prefilters for one identical image. It is also half the size it
     was: this is a blurred reflection source, and nothing in it survives the
     prefilter at 2048 that does not survive at 1024. */
  mark("renderer");
  const envTex = new THREE.CanvasTexture(envCanvas());
  mark("envCanvas");

  envTex.mapping = THREE.EquirectangularReflectionMapping;
  envTex.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromEquirectangular(envTex);
  envTex.dispose();
  scene.environment = envRT.texture;
  mark("pmrem");

  /* If a real HDRI is supplied, swap it in as soon as it lands. The painted
     canvas above stays as the first frame's environment so nothing pops in
     empty, and it remains the fallback if the file is missing or fails. */
  let hdrRT: THREE.WebGLRenderTarget | null = null;
  if (opts.envHdr) {
    import("three/examples/jsm/loaders/RGBELoader.js")
      .then(({ RGBELoader }) => new RGBELoader().loadAsync(opts.envHdr!))
      .then((tex) => {
        if (!pmrem) return;
        tex.mapping = THREE.EquirectangularReflectionMapping;
        hdrRT = pmrem!.fromEquirectangular(tex);
        tex.dispose();
        scene.environment = hdrRT.texture;
      })
      .catch((e) => console.warn("[studio] HDRI failed, keeping painted env:", e));
  }

  /* ---- cyclorama backdrop: gradient + a soft pool of light behind ----
     Skipped entirely in bare mode: the page itself is the background. */
  const backdrop = bare ? null : new THREE.Mesh(
    new THREE.SphereGeometry(70, 40, 40),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        cTop: { value: new THREE.Color(bg.top) },
        cMid: { value: new THREE.Color(bg.mid) },
        cBot: { value: new THREE.Color(bg.bottom) },
        cGlow: { value: new THREE.Color(bg.glow) },
      },
      vertexShader: "varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
      fragmentShader: `
        varying vec3 vP; uniform vec3 cTop; uniform vec3 cMid; uniform vec3 cBot; uniform vec3 cGlow;
        void main(){
          vec3 d = normalize(vP);
          float h = clamp(d.y*0.5+0.5, 0.0, 1.0);
          // site-canvas black -> graphite -> lifted grey, neutral throughout
          vec3 col = h < 0.5
            ? mix(cBot, cMid, smoothstep(0.0, 0.5, h))
            : mix(cMid, cTop, smoothstep(0.5, 1.0, h));
          // soft pool of light behind the subject, from the lights
          float g = pow(max(dot(d, normalize(vec3(-0.1,0.16,-1.0))), 0.0), 3.4);
          gl_FragColor = vec4(col + cGlow*g*0.55, 1.0);
          /* REQUIRED. A raw ShaderMaterial gets none of three's output
             plumbing, so without this the uniforms — which three converted
             sRGB -> linear on the way in — are written straight into an
             sRGB framebuffer with no conversion back. The authored colour
             then renders at roughly an eighth of its brightness: #101216
             lands as near-black, and no amount of changing the hex fixes it
             because the error is a missing transform, not a wrong value. */
          #include <colorspace_fragment>
        }`,
    }),
  );
  if (backdrop) scene.add(backdrop);

  /* ---- shadow catcher ----
     No floor plane: a finite ground leaves a visible edge. Instead a genuinely
     projected shadow directly beneath the subject. A painted blob can never be
     the right shape — let the renderer solve it: the light projects, the
     invisible plane receives, and the result merges into the backdrop. */
  const shadowMat = new THREE.ShadowMaterial({ opacity: 0 });
  const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), shadowMat);
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.position.y = floorY;
  shadowCatcher.receiveShadow = true;
  scene.add(shadowCatcher);

  /* ---- lights ---- */
  const lite = opts.lightRig === "lite";
  if (lite) {
    /* Three lights, no RectAreaLight, no LTC textures, a far smaller shader.
       A key, a cool rim and an ambient lift reproduce the studio's READ at card
       size; what is lost is the soft wrap on a curved edge, which is not
       resolvable on a 320px card anyway. */
    /* Intensities are NOT the full rig's. Five area lights deliver far more
       total illumination than three point sources, so matching the look means
       driving these harder — the first pass at 2.1/1.35/0.85 left every card
       visibly darker and flatter, which is not a trade worth 9% of build time. */
    const key = new THREE.DirectionalLight(0xffffff, 3.9);
    key.position.set(2.5, 6.5, 4.5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xcfe6ff, 2.3);
    rim.position.set(-6, 3, -4.5);
    scene.add(rim);
    scene.add(new THREE.HemisphereLight(0x9fc0ee, 0x0b1220, 1.6));
  } else {
  
    const keyBox = new THREE.RectAreaLight(0xffffff, 5.6, 16 * sp, 9);
    keyBox.position.set(1.5, 8.5, 4);
    keyBox.lookAt(0, 0, 0);
    scene.add(keyBox);
    // cool kicker, back-left: draws the bright edge down vertical detail
    const kickL = new THREE.RectAreaLight(0xcfe6ff, 7.5, 1.4, 7);
    kickL.position.set(-7.5, 2.2, -4.5);
    kickL.lookAt(0, 0.2, 0);
    scene.add(kickL);
    // subtle warm kicker, back-right: separates the far end
    const kickR = new THREE.RectAreaLight(0xffe2c2, 4.5, 1.2, 6);
    kickR.position.set(7.5, 1.6, -4);
    kickR.lookAt(0, 0.2, 0);
    scene.add(kickR);
    // broad front fill — keeps the camera-facing side readable through the pan
    const fill = new THREE.RectAreaLight(0xc2d4ee, 3.2, 20 * sp, 10);
    fill.position.set(-1, 2.2, 12);
    fill.lookAt(0, 0.5, 0);
    scene.add(fill);
    // second fill from camera-right so both long sides stay lit through the turn
    const fillB = new THREE.RectAreaLight(0xbcd0ee, 2.1, 12 * sp, 8);
    fillB.position.set(10 * sp, 2.0, 5);
    fillB.lookAt(0, 0.4, 0);
    scene.add(fillB);
    // concentrated pool on the subject, so light stays on it rather than
    // spilling evenly across the whole studio
    const spot = new THREE.SpotLight(0xc4dcff, 230 * sp, 30 * sp, 0.5 * Math.min(sp, 1.7), 0.92, 2);
    spot.position.set(0.5, 10, 3.5);
    spot.target.position.set(0, 0, 0);
    scene.add(spot);
    scene.add(spot.target);

    // shadow-only directional (RectAreaLights cannot cast shadows), overhead and
    // slightly forward to match the softbox
    const shadowLight = new THREE.DirectionalLight(0xffffff, 0.32);
    shadowLight.position.set(1.6, 12, 3.4);
    shadowLight.target.position.set(0, floorY, 0);
    shadowLight.castShadow = true;
    const sms = opts.shadowMapSize ?? 2048;
    shadowLight.shadow.mapSize.set(sms, sms);
    shadowLight.shadow.camera.near = 1;
    shadowLight.shadow.camera.far = 40;
    Object.assign(shadowLight.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext });
    shadowLight.shadow.bias = -0.0006;
    shadowLight.shadow.radius = 2; // crisp edge, not a soft pool
    scene.add(shadowLight);
    scene.add(shadowLight.target);
    scene.add(new THREE.HemisphereLight(0x3f63b0, 0x050c22, 0.4));
  }

  mark("lights");

  /* ---- post: restrained bloom, only true highlights ---- */
  let composer: EffectComposer | null = null;
  let bloom: UnrealBloomPass | null = null;
  try {
    if (opts.bloom === false || bare) throw new Error("bloom disabled");
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.24, 0.45, 0.96);
    composer.addPass(bloom);
  } catch {
    composer = null;
  }
  mark("post");

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

  const render = () => {
    if (composer) composer.render();
    else renderer.render(scene, camera);
  };

  const dispose = () => {
    envRT.dispose();
    hdrRT?.dispose();
    pmrem?.dispose();
    /* SKIP SHARED GEOMETRY. This traverse used to dispose EVERY mesh geometry
       it could reach, which quietly included the caches the whole site draws
       from — metal.ts's rounded-box cache and detect.ts's tracker bar. The cache
       keeps handing out the reference after it has been destroyed, so the next
       scene to ask for those dimensions gets a dead geometry and renders
       nothing. It has not bitten yet only because scenes are built at idle and
       almost never unmount; a client-side navigation away from a lab route is
       all it would take.

       PERFORMANCE.md already states the rule ("shared geometry means no mesh may
       dispose its own geometry") — this is the one place that broke it, and it
       broke it for every scene at once. Anything cached and shared is tagged
       userData.shared at the point it enters its cache. */
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry && !mesh.geometry.userData?.shared) mesh.geometry.dispose();
    });
    composer?.dispose?.();
    renderer.dispose();
    renderer.domElement.remove();
  };

  mark("total");
  return { renderer, scene, camera, composer, bloom, shadowMat, size, render, dispose };
}
