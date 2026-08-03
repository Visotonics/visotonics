/* ---------------------------------------------------------------------------
   Document Vision — the subject: a Bill of Lading lying on a desk.

   Claim: "Bill of Lading in. Structured data out."
   Eyebrow: "KEY-VALUE EXTRACTION, WHERE GENERIC OCR FAILS"

   THE WHOLE ARGUMENT LIVES IN THE TEXTURE, NOT IN THE GEOMETRY.

   "Where generic OCR fails" is only a credible claim if the page on screen
   visibly WOULD defeat generic OCR. A crisp A4 scan lying square to the lens
   proves nothing — anyone's OCR reads that. So the sheet is skewed on the desk
   (yaw 0.14 rad, so no text baseline is parallel to any frame edge), and the
   page itself carries the four things that actually break a reader:

     · a rubber STAMP rotated across the printed text, overlapping the
       CONTAINER NO value — that is the HARD field, and it is the one the scene
       eventually calls out.
     · a diagonal CREASE shadow running the width of the page.
     · a faint coffee RING, upper right.
     · a handwritten amendment beside GROSS WEIGHT.

   All four are painted into ONE canvas. None of them is geometry: a crease
   modelled as displaced vertices would need a subdivided sheet and a light rig
   tuned to catch it, for a result no more legible than a painted gradient at
   this framing.

   BODY TEXT IS DRAWN AS FILLED RECTS, NOT AS STRINGS. At the shipped framing
   the sheet is roughly 650 canvas px wide for a 1400 px texture — about 0.46
   screen pixels per texel — so a real glyph at body size is sub-pixel noise
   that aliases into a shimmering mess as the tone-mapper works on it. Rects at
   the right rhythm read as text and cost nothing. Only the five field LABELS
   and VALUES are set as real type, because those are the words the scene is
   making a claim about.

   Coordinates: the desk is the XZ plane at y = GROUND. The sheet is a GROUP
   carrying the yaw, with the paper quad tipped flat inside it — so everything
   the scene parents to that group (the scan bar, the five field boxes) inherits
   the skew for free and stays welded to the page.
--------------------------------------------------------------------------- */
import * as THREE from "three";

/* The desk surface. Everything is stacked in millimetres above it:
     GROUND + 0.003  the drop-shadow plane
     GROUND + 0.006  the paper itself
   and the scene's own graphics sit a few more millimetres above that, inside
   the sheet group. At the shipped camera distance (~8.4 slant, near 0.1) the
   depth buffer resolves roughly 6e-5 units, so 3 mm is ~50x the precision —
   no z-fighting, and no polygonOffset needed. */
export const GROUND = -0.02;

/** The sheet, in world units. A landscape Bill of Lading. */
export const SHEET_W = 4.0;
export const SHEET_H = 2.6;
/** Skewed on the desk. This is the argument, not a flourish — see the header. */
export const SHEET_YAW = 0.14;

/* Texture resolution. 1400 x 910 is exactly 1.53846 : 1, the same ratio as
   4.0 : 2.6, so a texel is square on the page and the printed rows do not come
   out stretched in one axis. */
const TEX_W = 1400;
const TEX_H = 910;

/* ---- the five fields -------------------------------------------------------

   UV RECTANGLES ARE IN THREE'S UV SPACE: u right, v UP from the bottom edge of
   the sheet. The canvas is painted with y increasing DOWNWARD and the texture
   is uploaded with three's default flipY, so canvas row y maps to v = 1 - y/H.
   Every number below was derived from the canvas layout in `paintPage`:

     x 100 .. 1030   ->  u 0.0714 .. 0.7357      (all five rows share this)
     row tops        ->  388, 470, 552, 634, 716   (pitch 82, height 52)

   giving, per row, v0 = 1 - (top + 52)/910 and v1 = 1 - top/910.

   The block therefore occupies canvas y 388..768, i.e. 0.43..0.84 of the way
   down the page — the lower two-thirds, clear of the ruled header. */
export interface Field {
  key: string;
  value: string;
  /** [u0, v0, u1, v1] in sheet UV space, v measured UP from the bottom edge. */
  uv: [number, number, number, number];
  /** The field the stamp lands on. Exactly one of these is true. */
  hard?: boolean;
}

export const FIELDS: Field[] = [
  { key: "SHIPPER",      value: "NORTHGATE EXPORTS PTE LTD", uv: [0.0714, 0.5165, 0.7357, 0.5736] },
  { key: "CONSIGNEE",    value: "VISOTONICS TERMINAL 4", uv: [0.0714, 0.4264, 0.7357, 0.4835] },
  { key: "CONTAINER NO", value: "VSTU 907032 1",         uv: [0.0714, 0.3363, 0.7357, 0.3934], hard: true },
  { key: "GROSS WEIGHT", value: "30480 KG",              uv: [0.0714, 0.2462, 0.7357, 0.3033] },
  { key: "B/L DATE",     value: "03-2019",               uv: [0.0714, 0.1560, 0.7357, 0.2132] },
];

/* The paper quad is a PlaneGeometry in XY tipped by rotation.x = -PI/2, which
   sends a plane point (px, py, 0) to (px, 0, -py). PlaneGeometry's own mapping
   is px = SHEET_W*(u - 0.5) and py = SHEET_H*(v - 0.5), so inside the SHEET
   GROUP (which carries the yaw but not the tip):

       x =  SHEET_W * (u - 0.5)
       z = -SHEET_H * (v - 0.5)  =  SHEET_H * (0.5 - v)

   Every callout anchor, field box and scan-bar position in the scene goes
   through this one function so the arithmetic exists in exactly one place. */
/** Centre of a field's UV rect, in the SHEET GROUP's local 3D frame. */
export function fieldCenterLocal(uv: [number, number, number, number], y = 0): THREE.Vector3 {
  const u = (uv[0] + uv[2]) / 2;
  const v = (uv[1] + uv[3]) / 2;
  return new THREE.Vector3(SHEET_W * (u - 0.5), y, SHEET_H * (0.5 - v));
}

/** A field's UV rect as the four local-space corners of its outline. */
export function fieldRectLocal(uv: [number, number, number, number], y = 0) {
  const [u0, v0, u1, v1] = uv;
  const x0 = SHEET_W * (u0 - 0.5), x1 = SHEET_W * (u1 - 0.5);
  // v0 is the LOWER edge in UV, which is the LARGER z in local space
  const z0 = SHEET_H * (0.5 - v1), z1 = SHEET_H * (0.5 - v0);
  return { x0, x1, z0, z1, y };
}

/* ---- the page ------------------------------------------------------------

   NO `willReadFrequently` ON THIS CONTEXT, DELIBERATELY.

   The flag exists to move a canvas off the GPU so getImageData round-trips are
   cheap; it makes ordinary drawing slower, and it only pays for readback. The
   grain-based skins in hero-cards/skins.ts and gate-vision/materials.ts all set
   it because they end in a getImageData pass. NOTHING in `paintPage` reads a
   single pixel back — it is fills, strokes, gradients and fillText only — so
   passing it here would be a pure loss. Same call as ascii-hero/ascii.ts.

   Deterministic pseudo-random for the print runs. `Math.random()` here would
   reshuffle the body text on every page load, which reads as a bug, and would
   also make any future screenshot comparison worthless — the same reasoning as
   `liveryOf` in yard-vision/yard.ts. */
const SEED0 = 0x2f6e2b1;

function paintPage(): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = TEX_W;
  cv.height = TEX_H;
  const c = cv.getContext("2d")!;

  let seed = SEED0;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };

  /* ---- base stock -------------------------------------------------------
     Off-white with a subtle vertical tone variation, so the sheet is not one
     flat fill — a perfectly even page reads as a UI panel, not as paper.
     THE MATERIAL PULLS THIS DOWN. See buildDocumentMaterials: under the full
     area-light rig with ACES on top, an #E8E6E0 albedo blows out, so the
     material tint carries it back down to a mid grey. The texture stays light
     because the printed rects have to have something to be dark against. */
  c.fillStyle = "#E8E6E0";
  c.fillRect(0, 0, TEX_W, TEX_H);

  const tone = c.createLinearGradient(0, 0, 0, TEX_H);
  tone.addColorStop(0.00, "rgba(255,255,255,0.55)");
  tone.addColorStop(0.38, "rgba(255,255,255,0.00)");
  tone.addColorStop(0.72, "rgba(120,112,98,0.06)");
  tone.addColorStop(1.00, "rgba(120,112,98,0.13)");
  c.fillStyle = tone;
  c.fillRect(0, 0, TEX_W, TEX_H);

  const INK = "#3A3E44";

  /* ---- ruled header block ---------------------------------------------- */
  c.strokeStyle = "rgba(58,62,68,0.42)";
  c.lineWidth = 3;
  c.strokeRect(90, 70, TEX_W - 180, 120);
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(90, 132); c.lineTo(TEX_W - 90, 132);
  c.moveTo(700, 70); c.lineTo(700, 190);
  c.stroke();

  /* ---- the CARRIER masthead + B/L NO. --------------------------------------
     A real bill of lading names its CARRIER top-left (the letterhead) and its
     own document number top-right — neither of which a generic form has, and
     both of which are load-bearing for the "looks like a real B/L" claim.

     FICTIONAL CARRIER. The earlier draft of this texture put "MAERSK LINE
     A/S" in the SHIPPER row, which is wrong twice over: a real carrier's name
     does not belong on a fictional demo asset, and MAERSK is a carrier, not a
     shipper — those are different parties on a real B/L. "TRANSHARBOR LINES"
     replaces it as the masthead (the carrier), and the SHIPPER row below now
     carries a fictional exporter instead. VSTU 907032 1 and VISOTONICS
     TERMINAL 4 are unchanged, per spec. */
  const SMALL_LABEL = "600 12px ui-monospace, 'SF Mono', Menlo, monospace";
  c.textBaseline = "alphabetic";
  c.fillStyle = "rgba(35,38,43,0.92)";
  c.font = "700 22px ui-monospace, 'SF Mono', Menlo, monospace";
  c.fillText("TRANSHARBOR LINES", 116, 108);
  c.fillStyle = "rgba(58,62,68,0.62)";
  c.font = SMALL_LABEL;
  c.fillText("CONTAINER LINE — BILL OF LADING", 116, 128);

  c.textAlign = "right";
  c.fillStyle = "rgba(58,62,68,0.55)";
  c.font = SMALL_LABEL;
  c.fillText("B/L NO.", TEX_W - 90, 92);
  c.fillStyle = "rgba(35,38,43,0.86)";
  c.font = "600 16px ui-monospace, 'SF Mono', Menlo, monospace";
  c.fillText("THL0219044713", TEX_W - 90, 112);
  c.fillStyle = "rgba(58,62,68,0.55)";
  c.font = SMALL_LABEL;
  c.fillText("ORIGINAL · NEGOTIABLE", TEX_W - 90, 130);
  c.textAlign = "left";

  /* ---- body "print" -----------------------------------------------------
     Filled rects, varied run lengths, at a believable line rhythm — this is
     the boilerplate a B/L is dense with (carrier's clauses, jurisdiction,
     limitation of liability) that no one reads and no OCR needs to. Where a
     row instead carries structural information a real B/L always has —
     NOTIFY PARTY, VESSEL/VOYAGE, the port pair, place of receipt/delivery —
     it is set as real type instead, same as the five extracted fields. */
  const printRow = (y: number, x0: number, x1: number, h: number, alpha: number) => {
    c.fillStyle = `rgba(58,62,68,${alpha})`;
    let x = x0;
    while (x < x1 - 30) {
      // run lengths 42..190, gaps 14..30 — long enough to read as words rather
      // than as a dashed rule, short enough that the row is clearly broken up
      const wRun = Math.min(42 + Math.floor(rnd() * 148), x1 - x);
      c.fillRect(x, y, wRun, h);
      x += wRun + 14 + Math.floor(rnd() * 16);
    }
  };

  /* NOTIFY PARTY — the third party on the left-hand stack every real B/L
     carries alongside SHIPPER and CONSIGNEE. Printed, not extracted: the
     scene's whole point is that the reader pulls five fields out of a page
     that has more than five fields on it. */
  const printLabelPair = (y: number, lx: number, label: string, vx: number, value: string) => {
    c.fillStyle = "rgba(58,62,68,0.60)";
    c.font = SMALL_LABEL;
    c.fillText(label, lx, y);
    c.fillStyle = "rgba(58,62,68,0.82)";
    c.font = "500 14px ui-monospace, 'SF Mono', Menlo, monospace";
    c.fillText(value, vx, y + 16);
  };

  printLabelPair(150, 116, "NOTIFY PARTY", 116, "SAME AS CONSIGNEE");
  printRow(164, 340, 660, 7, 0.30);
  printRow(146, 726, 1288, 8, 0.38);

  printLabelPair(220, 100, "VESSEL", 100, "MSC ANNALISA");
  printLabelPair(220, 420, "VOYAGE NO", 420, "224W");
  printLabelPair(250, 100, "PORT OF LOADING", 100, "NHAVA SHEVA, INDIA");
  printLabelPair(250, 420, "PORT OF DISCHARGE", 420, "JEBEL ALI, UAE");
  printLabelPair(280, 100, "PLACE OF RECEIPT", 100, "PUNE ICD, INDIA");
  printLabelPair(280, 420, "PLACE OF DELIVERY", 420, "JEBEL ALI, UAE");
  for (let i = 3; i < 6; i++) printRow(206 + i * 30, 700, 1310, 9, 0.44 - i * 0.02);

  /* the particulars caption — the table header a real B/L rules off above
     marks & numbers / description / weight / measurement. The five-row block
     painted below (see "the five fields") IS that table for this document:
     CONTAINER NO doubles as the marks-and-numbers entry, GROSS WEIGHT as the
     weight column. Column head labels here name it as a table rather than a
     bare key:value list. */
  c.fillStyle = "rgba(58,62,68,0.60)";
  c.font = SMALL_LABEL;
  c.fillText("PARTICULARS FURNISHED BY SHIPPER", 100, 372);
  c.fillStyle = "rgba(58,62,68,0.42)";
  c.font = "500 10px ui-monospace, 'SF Mono', Menlo, monospace";
  c.fillText("MARKS & NOS / DESCRIPTION", 520, 372);

  for (let i = 0; i < 3; i++) printRow(796 + i * 30, 100, 1090, 8, 0.34);
  for (let i = 0; i < 2; i++) printRow(400 + i * 30, 1070, 1310, 8, 0.30);

  /* said-to-contain line — the freight description a real particulars table
     carries below the tabulated fields. */
  c.fillStyle = "rgba(58,62,68,0.58)";
  c.font = "500 13px ui-monospace, 'SF Mono', Menlo, monospace";
  c.fillText("SAID TO CONTAIN: 1,200 CARTONS — ELECTRONIC COMPONENTS — FREIGHT PREPAID", 100, 812);

  /* ---- signature / date block, bottom right -----------------------------
     Every real B/L closes on a place-and-date and a "signed for the carrier"
     line — the block a generic form has no equivalent of. */
  c.fillStyle = "rgba(58,62,68,0.55)";
  c.font = SMALL_LABEL;
  c.fillText("SHIPPED ON BOARD — NHAVA SHEVA, 03-2019", 900, 846);
  c.fillText("SIGNED FOR THE CARRIER, TRANSHARBOR LINES, AS AGENT", 900, 864);
  c.save();
  c.strokeStyle = "rgba(28,44,96,0.55)";
  c.lineWidth = 2;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.beginPath();
  c.moveTo(900, 882);
  const sig: [number, number][] = [
    [918, 872], [934, 886], [950, 870], [968, 884], [986, 868], [1004, 882], [1022, 874],
  ];
  for (const [sx, sy] of sig) c.lineTo(sx, sy);
  c.stroke();
  c.restore();

  /* ---- the five fields, as REAL type ------------------------------------
     `600 22px ui-monospace, 'SF Mono', Menlo, monospace` — named directly and
     NOT via var(--font-plex-mono). This canvas is painted at module scope,
     outside any element's style context, so a CSS custom property would not
     resolve and the whole block would silently fall back to the UA default.
     (That is also why this cannot reuse the DOM overlay's font token.) */
  const FIELD_FONT = "600 22px ui-monospace, 'SF Mono', Menlo, monospace";
  const ROW_TOP = [388, 470, 552, 634, 716];
  c.font = FIELD_FONT;
  c.textBaseline = "middle";
  for (let i = 0; i < FIELDS.length; i++) {
    const yMid = ROW_TOP[i] + 26;
    // a faint rule under each row — a printed form has ruled fields, and the
    // rules are also what make the two columns read as one block
    c.strokeStyle = "rgba(58,62,68,0.20)";
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(100, ROW_TOP[i] + 52);
    c.lineTo(1030, ROW_TOP[i] + 52);
    c.stroke();

    c.fillStyle = "#23262B";
    c.fillText(FIELDS[i].key, 110, yMid);
    c.fillText(FIELDS[i].value, 520, yMid);
  }
  c.textBaseline = "alphabetic";

  /* ---- the CREASE -------------------------------------------------------
     A soft diagonal darkening band, with a thin bright edge along one side
     where the fold catches the light. Painted rather than modelled: at this
     framing a displaced sheet would need subdivision and a light aimed to
     graze it, for no more legibility than this. */
  c.save();
  c.translate(TEX_W * 0.5, TEX_H * 0.5);
  c.rotate(-0.52);
  const crease = c.createLinearGradient(0, -70, 0, 70);
  crease.addColorStop(0.00, "rgba(60,52,40,0.00)");
  crease.addColorStop(0.42, "rgba(60,52,40,0.11)");
  crease.addColorStop(0.52, "rgba(60,52,40,0.15)");
  crease.addColorStop(1.00, "rgba(60,52,40,0.00)");
  c.fillStyle = crease;
  c.fillRect(-1100, -70, 2200, 140);
  c.fillStyle = "rgba(255,255,255,0.30)";
  c.fillRect(-1100, 6, 2200, 2);
  c.restore();

  /* ---- the coffee RING, upper right ------------------------------------- */
  c.save();
  c.strokeStyle = "rgba(120,90,50,0.18)";
  c.lineWidth = 13;
  c.beginPath();
  c.arc(1148, 214, 92, 0, Math.PI * 2);
  c.stroke();
  c.lineWidth = 4;
  c.strokeStyle = "rgba(120,90,50,0.10)";
  c.beginPath();
  c.arc(1148, 214, 74, 0, Math.PI * 2);
  c.stroke();
  c.restore();

  /* ---- the STAMP --------------------------------------------------------
     Rotated -0.35 rad and centred on the CONTAINER NO row's VALUE column, so
     it lands across "VSTU 907032 1" — the field the scene later calls out as
     the hard read. That overlap is the entire reason this scene exists: a
     stamp over a value is the classic case where a generic reader returns the
     stamp's word, the value, or a merge of both.

     Letter spacing is applied by hand rather than through ctx.letterSpacing,
     which is not in the DOM lib types this project compiles against. */
  c.save();
  c.translate(722, ROW_TOP[2] + 26);
  c.rotate(-0.35);
  const RED = "rgba(150,40,40,0.55)";
  c.strokeStyle = RED;
  c.lineWidth = 7;
  c.beginPath();
  c.arc(0, 0, 118, 0, Math.PI * 2);
  c.stroke();
  c.lineWidth = 2;
  c.beginPath();
  c.arc(0, 0, 101, 0, Math.PI * 2);
  c.stroke();

  c.fillStyle = RED;
  c.font = "700 40px ui-monospace, 'SF Mono', Menlo, monospace";
  c.textBaseline = "middle";
  const word = "RECEIVED";
  const track = 5;
  let total = 0;
  for (const ch of word) total += c.measureText(ch).width + track;
  total -= track;
  let cx = -total / 2;
  for (const ch of word) {
    c.fillText(ch, cx, 0);
    cx += c.measureText(ch).width + track;
  }
  c.textBaseline = "alphabetic";
  c.restore();

  /* ---- the handwritten amendment ----------------------------------------
     A short freehand-looking polyline beside GROSS WEIGHT, plus a strike over
     part of the printed value. Pen blue-black, not the stamp's red: two marks
     in the same ink read as one act, and this is somebody correcting a form
     the stamp had nothing to do with. */
  c.save();
  c.strokeStyle = "rgba(28,44,96,0.62)";
  c.lineWidth = 3;
  c.lineCap = "round";
  c.lineJoin = "round";
  const gy = ROW_TOP[3] + 26;
  c.beginPath();
  c.moveTo(742, gy + 30);
  const hand: [number, number][] = [
    [768, gy + 14], [790, gy + 34], [812, gy + 10], [836, gy + 30],
    [858, gy + 12], [884, gy + 28], [906, gy + 8], [932, gy + 24],
  ];
  for (const [hx, hy] of hand) c.lineTo(hx, hy);
  c.stroke();
  // the strike through the printed figure it amends
  c.lineWidth = 2.2;
  c.beginPath();
  c.moveTo(524, gy - 2);
  c.lineTo(672, gy + 4);
  c.stroke();
  c.restore();

  return cv;
}

/* TEXTURE CACHE + IDLE WARM.
   Same contract as gate-vision/materials.ts and yard-vision/yard.ts: a cache
   only helps the SECOND consumer, and on a page carrying one instance of this
   scene the first consumer is the visitor. `warmDocumentTextures()` is called
   from _vision/lazy.tsx's loader so the build that runs on the scroll path gets
   a hit instead of painting 1400x910 mid-scroll. */
let paperCache: THREE.CanvasTexture | null = null;
function paperTexture(): THREE.CanvasTexture {
  if (!paperCache) {
    const tex = new THREE.CanvasTexture(paintPage());
    tex.colorSpace = THREE.SRGBColorSpace;
    /* The page is seen at a 52-degree rake, so the far half of the sheet is
       heavily compressed in screen space — exactly the case anisotropic
       filtering exists for. three clamps this to the GPU's maximum at upload,
       so 8 is safe on hardware that cannot deliver it. */
    tex.anisotropy = 8;
    paperCache = tex;
  }
  return paperCache;
}
export function warmDocumentTextures() { paperTexture(); }

/* ---- materials ---------------------------------------------------------- */

export interface DocumentMaterials {
  desk: THREE.MeshStandardMaterial;
  paper: THREE.MeshStandardMaterial;
  cast: THREE.MeshBasicMaterial;
  all: THREE.Material[];
  dispose: () => void;
}

export function buildDocumentMaterials(): DocumentMaterials {
  const all: THREE.Material[] = [];
  const keep = <T extends THREE.Material>(m: T) => { all.push(m); return m; };

  /* THE VALUE RULE. A hex reads as its own value only under flat light; under
     the five-source area rig with ACES on top, a matte surface lands far
     brighter than its albedo. Both of these are therefore authored DARKER than
     the intended result:

       desk  #1A1D21 — a dark neutral. Anything at the "graphite" value it
             should read as came out as mid grey under this rig.
       paper #9AA3AC — and this is the one that matters. The texture's base is
             #E8E6E0, which is what the printed rects need to be dark against;
             left untinted the sheet is a white rectangle with the highlights
             clipped and the crease, ring and stamp all rolled off to nothing.
             A MAPPED surface also reads about a stop darker than an unmapped
             one at the same tint, which is why this is a mid grey rather than
             the near-black the desk needs.

     NO METAL ANYWHERE IN THIS SCENE. A desk and a sheet of paper have no metal
     in them, and inventing a non-canonical makeMetal spec would miss metal.ts's
     cache and pay a full albedo + roughness + Sobel derivation on the scroll
     path for a surface that does not exist. */
  const desk = keep(new THREE.MeshStandardMaterial({
    color: "#1A1D21",
    roughness: 0.95,
    metalness: 0.02,
    envMapIntensity: 0.12,
    transparent: true,
    opacity: 0,
  }));

  const paper = keep(new THREE.MeshStandardMaterial({
    map: paperTexture(),
    color: "#9AA3AC",
    roughness: 0.94,
    metalness: 0.0,
    envMapIntensity: 0.18,
    transparent: true,
    opacity: 0,
  }));

  /* The drop-shadow stand-in. UNLIT (MeshBasicMaterial) on purpose: it has to
     stay darker than the desk it sits on, and a lit material at this value
     would be raised by the same rig that raises the desk, so the sheet would
     stop reading as lying ON anything. Nothing in this scene casts a real
     shadow worth having — a sheet 6 mm off a plane projects nothing — so this
     hairline of dark under the paper is the whole of the contact cue. */
  const cast = keep(new THREE.MeshBasicMaterial({
    color: "#05070A",
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: false,
  }));

  return {
    desk, paper, cast, all,
    /* MATERIALS ONLY. The page canvas is module-cached and shared, so disposing
       it here would leave the next build sampling a destroyed texture — the
       hazard gate-vision/materials.ts and yard-vision/yard.ts both spell out. */
    dispose: () => { all.forEach((m) => m.dispose()); },
  };
}

/* ---- the model ---------------------------------------------------------- */

export interface DocumentModel {
  root: THREE.Group;
  /** The sheet GROUP. Carries the yaw; the paper quad is tipped flat inside it.
   *  Everything welded to the page — the scan bar, the five field boxes — is
   *  parented here so it inherits the skew and never drifts off the print. */
  sheet: THREE.Group;
  /** Geometry this scene OWNS and must dispose. */
  owned: THREE.BufferGeometry[];
}

export function buildDocument(mats: DocumentMaterials): DocumentModel {
  const root = new THREE.Group();
  const owned: THREE.BufferGeometry[] = [];

  /* ---- the desk ----
     14 x 14 is far larger than anything the camera sees, which is the point:
     a finite desk with a visible edge turns the shot into a photograph of a
     table rather than a raking view of a document. */
  const deskGeo = new THREE.PlaneGeometry(14, 14);
  owned.push(deskGeo);
  const desk = new THREE.Mesh(deskGeo, mats.desk);
  desk.rotation.x = -Math.PI / 2;
  desk.position.y = GROUND;
  desk.receiveShadow = true;
  root.add(desk);

  /* ---- the sheet ----
     A GROUP at the yaw, so local +x runs along the page's own long edge. The
     scan bar travels in that axis and the field boxes are laid out in it, which
     is what keeps every graphic square to the print rather than to the world.
     4.06 x 2.66 on the shadow: 30 mm of dark proud of the paper on every side,
     which at this camera is about two screen pixels of contact. */
  const sheet = new THREE.Group();
  sheet.position.y = GROUND + 0.006;
  sheet.rotation.y = SHEET_YAW;
  root.add(sheet);

  const castGeo = new THREE.PlaneGeometry(SHEET_W + 0.06, SHEET_H + 0.06);
  owned.push(castGeo);
  const cast = new THREE.Mesh(castGeo, mats.cast);
  cast.rotation.x = -Math.PI / 2;
  // in ROOT space, at GROUND + 0.003 — i.e. 3 mm under the sheet group
  cast.position.y = GROUND + 0.003;
  /* The yaw goes on a HOLDER rather than on the quad itself: setting both
     rotation.x and rotation.y on one object composes in XYZ order and tips the
     plane out of the desk, where a parent rotation about Y does exactly what is
     wanted. Same construction as the sheet group above. */
  const castHolder = new THREE.Group();
  castHolder.rotation.y = SHEET_YAW;
  castHolder.add(cast);
  root.add(castHolder);

  const paperGeo = new THREE.PlaneGeometry(SHEET_W, SHEET_H);
  owned.push(paperGeo);
  const paper = new THREE.Mesh(paperGeo, mats.paper);
  paper.rotation.x = -Math.PI / 2;
  paper.receiveShadow = true;
  sheet.add(paper);

  return { root, sheet, owned };
}
