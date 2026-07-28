/* ---------------------------------------------------------------------------
   Gate Vision — materials and painted textures.

   Same weathered-steel language as Container Vision (matte painted metal,
   low metalness, high roughness, restrained env reflection) plus the parts a
   vehicle needs: tyre rubber, cab paint, glass, and the two things the system
   actually reads — the container's side markings and the trailer plate.
--------------------------------------------------------------------------- */
import * as THREE from "three";
import { PALETTE } from "../_vision/palette";
import { makeMetal, makeRoughnessMap } from "../_vision/metal";

/* The container's own paint comes from container-vision's material set — this
   module only covers the parts Gate Vision adds around it. */
export interface GateMaterials {
  dark: THREE.MeshStandardMaterial;       // hardware, gantry, chassis
  rubber: THREE.MeshStandardMaterial;     // tyres
  cab: THREE.MeshStandardMaterial;        // tractor unit paint
  rim: THREE.MeshStandardMaterial;        // wheel rims
  glass: THREE.MeshStandardMaterial;      // windscreen
  lens: THREE.MeshStandardMaterial;       // camera-head glass
  plate: THREE.MeshStandardMaterial;      // trailer plate decal
  barrierLight: THREE.MeshStandardMaterial; // boom-gate arm, light bands
  all: THREE.Material[];
  dispose: () => void;
}

/* The plate is drawn to canvas rather than modelled: the system reads print,
   so print is what has to be there. Drawn at high resolution and slightly
   worn, so it photographs like a real surface and not like a UI label. */

function grain(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

/** The trailer plate — the second thing read at the gate. */
export function makePlateTexture(): THREE.CanvasTexture {
  const w = 1024, h = 256;
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  // willReadFrequently — this canvas ends in grain(), a getImageData round
  // trip; see the note in _vision/metal.ts on why that matters here
  const c = cv.getContext("2d", { willReadFrequently: true })!;

  c.fillStyle = "#E8E4D8";
  c.fillRect(0, 0, w, h);
  // grubby edges — a plate at a port is never clean
  const vig = c.createLinearGradient(0, 0, 0, h);
  vig.addColorStop(0, "rgba(60,55,45,0.22)");
  vig.addColorStop(0.4, "rgba(60,55,45,0)");
  vig.addColorStop(1, "rgba(40,36,30,0.34)");
  c.fillStyle = vig;
  c.fillRect(0, 0, w, h);

  c.strokeStyle = "#15161A";
  c.lineWidth = 12;
  c.strokeRect(18, 18, w - 36, h - 36);

  c.fillStyle = "#15161A";
  c.textBaseline = "middle";
  c.textAlign = "center";
  c.font = "700 132px ui-monospace, 'SF Mono', Menlo, monospace";
  c.fillText("MH 43 AT 7712", w / 2, h / 2 + 6);

  grain(c, w, h, 26);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Cab paint: a real surface, not a flat colour. Panel seams, a rubbed-in
    dirt gradient up from the sills, and fine grain — the three things that stop
    a large flat body panel reading as untextured plastic under a softbox. */
function makeCabTexture(): THREE.CanvasTexture {
  const w = 1024, h = 1024;
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  // willReadFrequently — this canvas ends in grain(), a getImageData round
  // trip; see the note in _vision/metal.ts on why that matters here
  const c = cv.getContext("2d", { willReadFrequently: true })!;

  // navy, same family as the container it pulls — a desaturated grey cab
  // reads as a different vehicle parked next to the box
  c.fillStyle = "#242C48";
  c.fillRect(0, 0, w, h);
  // subtle vertical shading so the panel is never one value
  const sh = c.createLinearGradient(0, 0, 0, h);
  sh.addColorStop(0, "rgba(255,255,255,0.06)");
  sh.addColorStop(0.55, "rgba(0,0,0,0)");
  sh.addColorStop(1, "rgba(0,0,0,0.30)");
  c.fillStyle = sh;
  c.fillRect(0, 0, w, h);

  // panel seams
  c.strokeStyle = "rgba(10,12,16,0.55)";
  c.lineWidth = 3;
  for (const y of [0.28, 0.62, 0.83]) {
    c.beginPath(); c.moveTo(0, h * y); c.lineTo(w, h * y); c.stroke();
  }
  c.lineWidth = 2;
  for (const x of [0.18, 0.5, 0.82]) {
    c.beginPath(); c.moveTo(w * x, 0); c.lineTo(w * x, h); c.stroke();
  }

  // road dirt kicked up the lower third
  for (let i = 0; i < 900; i++) {
    const y = h * (0.68 + Math.random() * 0.32);
    const a = 0.05 + Math.random() * 0.16 * (y / h);
    c.fillStyle = `rgba(58,50,40,${a})`;
    c.beginPath();
    c.ellipse(Math.random() * w, y, 3 + Math.random() * 22, 2 + Math.random() * 9, 0, 0, Math.PI * 2);
    c.fill();
  }

  grain(c, w, h, 16);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Tyre tread + sidewall, mapped around the cylinder. The tread blocks run
    across the belt; the sidewall rings sit at both ends. Without this a tyre is
    a black cylinder, which is exactly what it looked like. */
function makeTyreTexture(): THREE.CanvasTexture {
  const w = 512, h = 256;
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  // willReadFrequently — this canvas ends in grain(), a getImageData round
  // trip; see the note in _vision/metal.ts on why that matters here
  const c = cv.getContext("2d", { willReadFrequently: true })!;
  c.fillStyle = "#15171B";
  c.fillRect(0, 0, w, h);

  // tread blocks: two staggered rows of lugs around the circumference
  c.fillStyle = "#0A0C0F";
  const lugs = 26;
  for (let i = 0; i < lugs; i++) {
    const x = (i / lugs) * w;
    c.fillRect(x, h * 0.16, w / lugs - 4, h * 0.30);
    c.fillRect(x + w / lugs / 2, h * 0.54, w / lugs - 4, h * 0.30);
  }
  // circumferential grooves
  c.fillStyle = "#05070A";
  c.fillRect(0, h * 0.47, w, 5);
  // sidewall bands at both edges — lighter, scuffed rubber
  c.fillStyle = "#20242A";
  c.fillRect(0, 0, w, h * 0.13);
  c.fillRect(0, h * 0.87, w, h * 0.13);

  grain(c, w, h, 18);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

/* TEXTURE CACHE + IDLE WARM — measured.
   Gate Vision was the most expensive build on the Viso Yard page at ~346 ms
   (createStudio accounts for only 46 of it), and effectively ALL of that is
   texture generation done fresh on the scroll path:

     · three canvases finished with grain(), which is a getImageData / per-pixel
       JS loop / putImageData round trip — 5.8 MB of pixel data across the cab
       (1024²), the plate (1024x256) and the tyre (512x256), plus 900 ellipses
       painted on the cab;
     · TWO makeMetal calls whose specs are not CANONICAL_BRUSHED, so unlike
       every other scene they miss metal.ts's cache entirely and each pay a full
       albedo + roughness + Sobel normal derivation. metal.ts's own comment
       claims "every scene in this codebase asks for exactly these parameters" —
       gate-vision is the counterexample, and that is exactly why it is the one
       scene the idle warm never helped;
     · two makeRoughnessMap calls, which have no cache of their own.

   All of it is deterministic and immutable once generated, so it is cached here
   and generated during IDLE instead (see warmGateTextures, called from
   _vision/lazy.tsx). Nothing about the cost changes — it moves off the frame
   the visitor is scrolling in.

   CONSEQUENCE: these textures are now SHARED and must never be disposed by a
   scene teardown. dispose() below drops the materials only. Same trade, and the
   same reasoning, as container-vision/materials.ts. */
interface GateTextures {
  plateTex: THREE.CanvasTexture;
  cabTex: THREE.CanvasTexture;
  tyreTex: THREE.CanvasTexture;
  cabRough: THREE.CanvasTexture;
  tyreRough: THREE.CanvasTexture;
}
let gateTexCache: GateTextures | null = null;

/* Ground stencil — the lane number painted on the tarmac, the way a real gate
   lane is marked. Transparent background so it lays over the drafting grid as
   paint rather than as a patch of sheet.

   Same cache contract as everything else in this file: generated once, SHARED
   across every build, and NEVER disposed by a scene teardown. A scene that
   disposed this would leave the next gate build sampling a destroyed texture.

   No willReadFrequently here — unlike the three canvases above this one never
   goes through getImageData, so the flag would only cost the GPU-backed path. */
let stencilTexCache: THREE.CanvasTexture | null = null;

export function gateStencilTexture(): THREE.CanvasTexture {
  if (stencilTexCache) return stencilTexCache;
  const w = 512, h = 192;
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const c = cv.getContext("2d")!;

  c.clearRect(0, 0, w, h);
  c.fillStyle = "rgba(201,212,222,0.9)";
  c.textBaseline = "middle";
  c.textAlign = "center";
  c.font = "700 88px ui-monospace, 'SF Mono', Menlo, monospace";
  c.fillText("GATE 04", w / 2, h / 2);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  stencilTexCache = tex;
  return tex;
}

function gateTextures(): GateTextures {
  if (!gateTexCache) {
    gateTexCache = {
      plateTex: makePlateTexture(),
      cabTex: makeCabTexture(),
      tyreTex: makeTyreTexture(),
      cabRough: makeRoughnessMap("painted", 0.46),
      tyreRough: makeRoughnessMap("painted", 0.94),
    };
  }
  return gateTexCache;
}

/** Generate and cache everything above, plus the two non-canonical metals.
 *  Called from the idle warm so the scroll-path build gets only cache hits. */
export function warmGateTextures() {
  gateTextures();
  gateStencilTexture();
  // the METAL maps are cached inside metal.ts; the material is throwaway
  makeMetal(DARK_METAL).dispose();
  makeMetal(RIM_METAL).dispose();
}

/* Hoisted to module scope so the warm and the build ask for byte-identical
   parameters — metal.ts caches on the spec, so a stray digit here is a silent
   cache miss and the warm buys nothing. */
const DARK_METAL = { base: "#2B313B", kind: "plate", metalness: 0.78, rough: 0.5 } as const;
const RIM_METAL = { base: "#5A626C", kind: "brushed", metalness: 0.88, rough: 0.36 } as const;

export function buildGateMaterials(): GateMaterials {
  // opacity 0 on everything the intro resolves in — the scene fades the whole
  // vehicle up out of its wireframe, same as Container Vision
  const common = { transparent: true, opacity: 0 as number, envMapIntensity: 0.7 };

  /* Structural steel, not a flat colour. Everything the truck and gantry are
     built from now carries a real roughness map, so the softbox breaks up
     across a face instead of shading it like one flat polygon — which is what
     made the whole rig read as plastic. */
  const { plateTex, cabTex, tyreTex, cabRough, tyreRough } = gateTextures();

  const darkMetal = makeMetal(DARK_METAL);
  const dark = darkMetal.material;
  const rubber = new THREE.MeshStandardMaterial({
    // colour MULTIPLIES the map, so this knocks the rubber down rather than
    // up — under this key a 0.15-albedo map still renders mid-grey on its own
    map: tyreTex, color: "#70757C", roughnessMap: tyreRough, roughness: 1,
    metalness: 0.0, ...common,
  });
  /* The cab is the biggest single surface in the scene, so it is the one that
     most needs a roughness map: a large panel at one flat roughness reflects
     the softbox as an even wash and reads as plastic no matter how good the
     albedo is. */
  const cab = new THREE.MeshStandardMaterial({
    map: cabTex, roughnessMap: cabRough, roughness: 1, metalness: 0.45, ...common,
  });
  // bare rim/hub metal, distinct from the black hardware
  const rimMetal = makeMetal(RIM_METAL);
  const rim = rimMetal.material;
  const glass = new THREE.MeshStandardMaterial({
    color: "#0B1220", metalness: 0.9, roughness: 0.12, envMapIntensity: 1.4,
    transparent: true, opacity: 0,
  });
  const lens = new THREE.MeshStandardMaterial({
    color: "#05070C", metalness: 0.95, roughness: 0.08, envMapIntensity: 1.8,
    transparent: true, opacity: 0,
  });

  const plate = new THREE.MeshStandardMaterial({
    map: plateTex, transparent: true, opacity: 0, roughness: 0.62, metalness: 0.05,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
  });

  /* The boom arm's light bands. Brighter and less rough than the dark
     structural steel so the alternating stripes actually read as stripes at
     this distance rather than as one grey stick. */
  const barrierLight = new THREE.MeshStandardMaterial({
    /* Darkened from #D8DEE6/met 0.3/rough 0.55 after the first render: a
       near-white metal under this key light read as a glowing tube, not a
       painted boom — the brightest thing in frame must stay the overlay. */
    color: "#AEB6C0", metalness: 0.15, roughness: 0.7, envMapIntensity: 0.3,
    transparent: true, opacity: 0,
  });

  const all = [dark, rubber, cab, rim, glass, lens, plate, barrierLight];
  return {
    dark, rubber, cab, rim, glass, lens, plate, barrierLight, all,
    /* MATERIALS ONLY. The five canvas textures are cached in gateTexCache and
       the metal maps are cached in metal.ts, so a teardown that disposed them
       would leave the next gate build sampling destroyed textures — the exact
       hazard flagged on container-vision's FrontMaterial.dispose. */
    dispose: () => {
      darkMetal.dispose();
      rimMetal.dispose();
      all.forEach((m) => m.dispose());
    },
  };
}

