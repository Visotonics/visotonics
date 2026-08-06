/* ---------------------------------------------------------------------------
   Document Vision — the subject: a Bill of Lading, alone, on nothing.

   Claim: "Bill of Lading in. Structured data out."
   Eyebrow: "KEY-VALUE EXTRACTION, WHERE GENERIC OCR FAILS"

   REWORK 2, 2026-08-06. The previous pass got the STAGING right — one sheet,
   no desk, no floor, no fog — and the LAYOUT wrong. It was a landscape page
   built around five big ruled rows, which is a form, not a bill of lading. A
   real B/L was supplied as reference and it is a different object entirely:

     · PORTRAIT, near A4. 660 x 870 in the reference, so 0.759 : 1.
     · A RULED CELL GRID, not a stack of rows. Every field on the sheet lives
       in its own boxed cell with a tiny italic caption in the cell's top-left
       corner and the value set beneath it. There is no whitespace between
       cells; the rules are shared edges.
     · A THREE-BAND STRUCTURE down the page: parties and routing at the top,
       one large PARTICULARS FURNISHED BY SHIPPER band through the middle
       carrying the goods description, and a freight/charges table plus the
       carrier's terms and signature at the foot.
     · An ORIGINAL watermark set very large and very pale straight across the
       particulars band.
     · Roughly a third of the sheet's lower half is solid boilerplate — the
       carrier's conditions, set at a size no one is meant to read.

   This file now models that. The cell grid is the point: it is what makes the
   page identifiable as a B/L at a glance, and it is also the thing that makes
   key-value extraction a real problem rather than a trivial one, because the
   caption and its value are in different type at different sizes inside a box
   whose edges are shared with three other fields.

   THE ARGUMENT STILL LIVES IN THE TEXTURE. "Where generic OCR fails" is only
   credible if the page visibly would defeat a reader, so the four spoilers
   survive the rework and are re-sited onto the new layout:

     · a rubber STAMP rotated across the CONTAINER NO. cell — the HARD field.
     · a diagonal CREASE shadow across the particulars band.
     · a coffee RING over the routing cells.
     · a handwritten amendment against the weight, with a strike through the
       printed figure.

   BODY TEXT IS DRAWN AS FILLED RECTS, NOT AS STRINGS, unchanged in principle
   from before and more necessary now: this page carries several hundred lines
   of conditions at a size that would alias into grey noise as real glyphs.
   Rects at the right rhythm read as set type and cost nothing. Only the
   captions, the extracted values and the masthead are real type.

   FIELD GEOMETRY IS DEFINED ONCE. `FIELD_CELLS` below is in TEXTURE PIXELS —
   the same coordinates paintPage draws in — and the UV rectangles the scene
   brackets are DERIVED from it. The previous version kept two hand-written
   coordinate sets in sync by eye, which is a drift bug waiting to happen the
   first time a row moves.

   Coordinates: the sheet GROUP carries the yaw (rotation.y only — no tip).
   The paper quad is a plain PlaneGeometry(SHEET_W, SHEET_H), which three
   already lies flat in the XY plane facing +Z, so it needs no rotation — its
   local x is screen-right, its local y is screen-up, matching the canvas UV
   mapping directly. Everything parented to the sheet group inherits the yaw
   and stays welded to the print.
--------------------------------------------------------------------------- */
import * as THREE from "three";

/* No desk, no floor — GROUND only feeds the studio's shadow catcher, whose
   opacity never leaves 0 in this scene (see scene.tsx). Kept as a constant
   rather than inlined so createStudio's floorY argument has a documented
   source instead of a bare magic number. */
export const GROUND = -3;

/* THE SHEET, in world units. PORTRAIT — 2.94 x 3.87 is 0.7597 : 1, which is
   the reference document's own 660 : 870 to four figures. It is deliberately
   not exactly A4 (0.7071): a B/L is a carrier's own stationery and the
   reference is squarer than A4, and matching the thing on the desk beats
   matching the standard it approximates. */
export const SHEET_W = 2.94;
export const SHEET_H = 3.87;
/** Turned off square to the camera — see scene.tsx's camera derivation for
    why this exact value pairs with CAM_AZ. A flat page shot dead-on reads as
    a scan of a scan; a few degrees of turn is what makes it a PAGE, in space,
    being read, rather than a rectangle of pixels. */
export const SHEET_YAW = 0.18;

/* Texture resolution. 1024 x 1349 is 0.75908 : 1 — the sheet's own ratio to
   five figures, so a texel stays square on the page and the cell rules do not
   come out thicker one way than the other. */
const TEX_W = 1024;
const TEX_H = 1349;

/* ---- the page grid --------------------------------------------------------

   Everything below is in TEXTURE PIXELS, top-down, because that is the space
   the 2D context draws in. `M` is the sheet margin; the cell grid spans
   M .. TEX_W - M horizontally.

   The column stops are the reference's: the parties stack occupies the left
   ~54% and the references/routing cells the right ~46%, and the particulars
   band splits again at 74% and 88% for the weight and measurement columns. */
const M = 26;
const R = TEX_W - M;              // right edge of the grid, 998
const COL_MID = 578;              // parties | references split
const COL_W = 762;                // description | weight split
const COL_MEA = 886;              // weight | measurement split

/* ---- the extracted fields -------------------------------------------------

   EIGHT, up from five, and chosen to be the ones a yard actually keys off a
   B/L rather than the ones that were easiest to lay out: the document's own
   number, the booking it was raised against, both parties, the vessel leg,
   both ports, the box, and the weight. That set is also what makes the table
   on the right worth watching fill — five rows is a list, eight is a record.

   Each carries its cell in TEXTURE PIXELS. The UV rectangle the scene draws
   its bracket from is derived from that cell by `uvOf`, so the mark on the
   page and the print under it cannot disagree. */
export interface Field {
  key: string;
  value: string;
  /** the field's VALUE cell, in texture pixels, top-down. */
  cell: { x: number; y: number; w: number; h: number };
  /** [u0, v0, u1, v1] in sheet UV space, v measured UP from the bottom edge.
   *  Derived from `cell` — never written by hand. */
  uv: [number, number, number, number];
  /** The field the stamp lands on. Exactly one of these is true. */
  hard?: boolean;
}

/** Texture-pixel cell -> three UV rect. v is measured UP from the bottom, so
    the y axis inverts; the +2px bleed keeps a 1px bracket from sitting
    exactly on the printed rule it is bracketing. */
function uvOf(c: { x: number; y: number; w: number; h: number }): [number, number, number, number] {
  return [
    (c.x - 2) / TEX_W,
    1 - (c.y + c.h + 2) / TEX_H,
    (c.x + c.w + 2) / TEX_W,
    1 - (c.y - 2) / TEX_H,
  ];
}

/* Row geometry for the top block, so the paint and the cells agree by
   construction rather than by arithmetic done twice. */
const ROW = {
  masthead: { y: 40, h: 74 },
  blno: { y: 114, h: 46 },
  booking: { y: 160, h: 52 },
  shipper: { y: 160, h: 128 },
  consignee: { y: 288, h: 128 },
  notify: { y: 416, h: 96 },
  vessel: { y: 512, h: 56 },
  ports: { y: 568, h: 56 },
  band: { y: 624, h: 30 },
  colhead: { y: 654, h: 46 },
  goods: { y: 700, h: 330 },
  charges: { y: 1050, h: 150 },
  foot: { y: 1200, h: 123 },
} as const;

const rawFields: { key: string; value: string; cell: Field["cell"]; hard?: boolean }[] = [
  { key: "B/L NO.", value: "THL0219044713", cell: { x: COL_MID + 300, y: ROW.blno.y + 20, w: 176, h: 22 } },
  { key: "BOOKING NO.", value: "855230418", cell: { x: COL_MID + 14, y: ROW.booking.y + 22, w: 150, h: 22 } },
  { key: "SHIPPER", value: "NORTHGATE EXPORTS PTE LTD", cell: { x: M + 14, y: ROW.shipper.y + 26, w: 396, h: 24 } },
  { key: "CONSIGNEE", value: "VISOTONICS TERMINAL 4", cell: { x: M + 14, y: ROW.consignee.y + 26, w: 350, h: 24 } },
  { key: "VESSEL / VOYAGE", value: "MSC ANNALISA / 224W", cell: { x: M + 14, y: ROW.vessel.y + 26, w: 300, h: 22 } },
  { key: "PORT OF LOADING", value: "NHAVA SHEVA, INDIA", cell: { x: M + 14, y: ROW.ports.y + 26, w: 250, h: 22 } },
  { key: "PORT OF DISCHARGE", value: "JEBEL ALI, UAE", cell: { x: 300, y: ROW.ports.y + 26, w: 230, h: 22 } },
  { key: "CONTAINER NO.", value: "VSTU 907032 1", cell: { x: M + 14, y: ROW.goods.y + 176, w: 300, h: 24 }, hard: true },
  { key: "GROSS WEIGHT", value: "30480.00 KGS", cell: { x: COL_W + 12, y: ROW.goods.y + 176, w: 116, h: 24 } },
];

export const FIELDS: Field[] = rawFields.map((f) => ({ ...f, uv: uvOf(f.cell) }));

/** Centre of a field's UV rect, in the SHEET GROUP's local 3D frame.
    `z` is the small stand-off in front of the print that keeps a graphic
    (a box outline, a callout anchor) from z-fighting the paper. */
export function fieldCenterLocal(uv: [number, number, number, number], z = 0): THREE.Vector3 {
  const u = (uv[0] + uv[2]) / 2;
  const v = (uv[1] + uv[3]) / 2;
  return new THREE.Vector3(SHEET_W * (u - 0.5), SHEET_H * (v - 0.5), z);
}

/** A field's UV rect as the four local-space corners of its outline. */
export function fieldRectLocal(uv: [number, number, number, number], z = 0) {
  const [u0, v0, u1, v1] = uv;
  const x0 = SHEET_W * (u0 - 0.5), x1 = SHEET_W * (u1 - 0.5);
  const y0 = SHEET_H * (v0 - 0.5), y1 = SHEET_H * (v1 - 0.5);
  return { x0, x1, y0, y1, z };
}

/* ---- the page ------------------------------------------------------------

   NO `willReadFrequently` ON THIS CONTEXT, DELIBERATELY. Nothing in
   `paintPage` ever calls `getImageData` — it is fills, strokes, gradients and
   fillText only — so the flag would only slow ordinary drawing down.

   Deterministic pseudo-random for the print runs. `Math.random()` here would
   reshuffle the body text on every page load. */
const SEED0 = 0x2f6e2b1;

/* NEAR-BLACK ink. The value rule cuts the other way for ink than it does for
   surfaces: ACES lifts a matte SURFACE above its albedo, but printed marks
   are read as detail AGAINST that surface, so they have to start far darker
   than feels right on the swatch to survive the same lift. */
const INK = "#14171C";
const RULE = "rgba(40,44,50,0.55)";
const CAP = "rgba(58,62,68,0.72)";

const MONO = "ui-monospace, 'SF Mono', Menlo, monospace";

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
     flat fill. THE MATERIAL PULLS THIS DOWN — see buildDocumentMaterials. */
  c.fillStyle = "#EEECE6";
  c.fillRect(0, 0, TEX_W, TEX_H);

  const tone = c.createLinearGradient(0, 0, 0, TEX_H);
  tone.addColorStop(0.00, "rgba(255,255,255,0.5)");
  tone.addColorStop(0.42, "rgba(255,255,255,0.00)");
  tone.addColorStop(0.78, "rgba(120,112,98,0.05)");
  tone.addColorStop(1.00, "rgba(120,112,98,0.12)");
  c.fillStyle = tone;
  c.fillRect(0, 0, TEX_W, TEX_H);

  /* ---- grid primitives ---------------------------------------------------
     A B/L's cells share their edges, so `cell` strokes a rectangle and the
     neighbouring cell strokes the same edge again — which is exactly how the
     printed form behaves and costs nothing to reproduce. */
  const cell = (x: number, y: number, w: number, h: number) => {
    c.strokeStyle = RULE;
    c.lineWidth = 1.4;
    c.strokeRect(x, y, w, h);
  };
  /** the tiny italic caption a real B/L sets in each cell's top-left corner */
  const cap = (x: number, y: number, text: string, size = 11) => {
    c.fillStyle = CAP;
    c.font = `400 ${size}px ${MONO}`;
    c.textAlign = "left";
    c.textBaseline = "alphabetic";
    c.fillText(text, x + 6, y + size + 5);
  };
  /** a set value inside a cell */
  const val = (x: number, y: number, text: string, size = 15, alpha = 1) => {
    c.fillStyle = alpha >= 1 ? INK : `rgba(20,23,28,${alpha})`;
    c.font = `600 ${size}px ${MONO}`;
    c.textAlign = "left";
    c.textBaseline = "top";
    c.fillText(text, x, y);
    c.textBaseline = "alphabetic";
  };
  /** filled rects standing in for a run of set type */
  const printRow = (y: number, x0: number, x1: number, h: number, alpha: number) => {
    c.fillStyle = `rgba(48,52,58,${alpha})`;
    let x = x0;
    while (x < x1 - 24) {
      const wRun = Math.min(26 + Math.floor(rnd() * 96), x1 - x);
      c.fillRect(x, y, wRun, h);
      x += wRun + 9 + Math.floor(rnd() * 11);
    }
  };
  const printBlock = (x0: number, y0: number, x1: number, lines: number, lead: number, h: number, alpha: number) => {
    for (let i = 0; i < lines; i++) printRow(y0 + i * lead, x0, x1, h, alpha);
  };

  /* ---- 1. masthead ------------------------------------------------------
     FICTIONAL CARRIER throughout. "TRANSHARBOR LINES" is the masthead;
     "NORTHGATE EXPORTS PTE LTD" and "VISOTONICS TERMINAL 4" the shipper and
     consignee. No real carrier, shipper, terminal or line name appears
     anywhere in this file.

     The reference sets its carrier mark left across a bit over half the
     width, with the document's own title and the B/L number stacked in two
     cells on the right — that split is the single most recognisable thing
     about the top of a bill of lading, so it is reproduced exactly. */
  const mh = ROW.masthead;
  cell(M, mh.y, COL_MID - M, mh.h);
  // the carrier's star mark
  c.save();
  c.translate(M + 44, mh.y + mh.h / 2);
  c.fillStyle = INK;
  c.beginPath();
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? 19 : 8;
    const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
    if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
  }
  c.closePath();
  c.fill();
  c.restore();
  c.fillStyle = INK;
  c.font = `700 34px ${MONO}`;
  c.textBaseline = "middle";
  c.fillText("TRANSHARBOR", M + 76, mh.y + mh.h / 2 - 1);
  c.font = `400 34px ${MONO}`;
  c.fillText("LINES", M + 336, mh.y + mh.h / 2 - 1);
  c.textBaseline = "alphabetic";

  cell(COL_MID, mh.y, R - COL_MID, mh.h);
  c.fillStyle = INK;
  c.font = `600 12px ${MONO}`;
  c.fillText("BILL OF LADING FOR OCEAN TRANSPORT", COL_MID + 8, mh.y + 22);
  c.fillText("OR MULTIMODAL TRANSPORT", COL_MID + 8, mh.y + 40);
  cap(COL_MID + 290, mh.y + 2, "SCAC", 9);
  val(COL_MID + 296, mh.y + 22, "THLU", 12);

  /* B/L NO. — a field, so its cell geometry comes from FIELD_CELLS. */
  const bl = ROW.blno;
  cell(COL_MID, bl.y, R - COL_MID, bl.h);
  cap(COL_MID, bl.y, "Booking references");
  cap(COL_MID + 286, bl.y, "B/L No.");

  /* ---- 2. the parties stack, left | references and routing, right ------- */
  const sh = ROW.shipper;
  cell(M, sh.y, COL_MID - M, sh.h);
  cap(M, sh.y, "Shipper");
  printBlock(M + 14, sh.y + 58, COL_MID - 60, 3, 20, 7, 0.42);

  const bk = ROW.booking;
  cell(COL_MID, bk.y, R - COL_MID, bk.h);
  cap(COL_MID, bk.y, "Booking No.");
  cap(COL_MID + 226, bk.y, "Svc Contract");
  val(COL_MID + 232, bk.y + 24, "182020", 13, 0.85);

  cell(COL_MID, bk.y + bk.h, R - COL_MID, sh.y + sh.h - (bk.y + bk.h));
  cap(COL_MID, bk.y + bk.h, "Export references");

  const cn = ROW.consignee;
  cell(M, cn.y, COL_MID - M, cn.h);
  cap(M, cn.y, "Consignee (negotiable only if consigned 'to order')");
  printBlock(M + 14, cn.y + 62, COL_MID - 60, 3, 20, 7, 0.42);

  cell(COL_MID, cn.y, R - COL_MID, cn.h);
  cap(COL_MID, cn.y, "Onward inland routing (not part of Carriage as defined in clause 1)");
  printBlock(COL_MID + 12, cn.y + 60, R - 24, 2, 20, 7, 0.34);

  const nt = ROW.notify;
  cell(M, nt.y, COL_MID - M, nt.h);
  cap(M, nt.y, "Notify Party (see clause 22)");
  val(M + 14, nt.y + 34, "SAME AS CONSIGNEE", 14, 0.86);
  printBlock(M + 14, nt.y + 62, COL_MID - 60, 2, 18, 6, 0.36);

  cell(COL_MID, nt.y, R - COL_MID, nt.h);
  cap(COL_MID, nt.y, "Place of Receipt. Applicable only when document used as Multimodal Transport B/L");
  val(COL_MID + 12, nt.y + 44, "PUNE ICD, INDIA", 14, 0.86);

  /* ---- 3. the routing row ------------------------------------------------ */
  const vs = ROW.vessel;
  cell(M, vs.y, 300 - M, vs.h);
  cap(M, vs.y, "Vessel (see clause 1-19)");
  cell(300, vs.y, COL_MID - 300, vs.h);
  cap(300, vs.y, "Voyage No.");
  val(312, vs.y + 26, "224W", 15);
  cell(COL_MID, vs.y, R - COL_MID, vs.h);
  cap(COL_MID, vs.y, "Place of Delivery. Applicable only when document used as Multimodal Transport B/L");
  val(COL_MID + 12, vs.y + 30, "JEBEL ALI, UAE", 14, 0.86);

  const pt = ROW.ports;
  cell(M, pt.y, 300 - M, pt.h);
  cap(M, pt.y, "Port of Loading");
  cell(300, pt.y, COL_MID - 300, pt.h);
  cap(300, pt.y, "Port of Discharge");
  cell(COL_MID, pt.y, R - COL_MID, pt.h);
  cap(COL_MID, pt.y, "Type of move");
  val(COL_MID + 12, pt.y + 30, "CY / CY", 14, 0.86);

  /* ---- 4. the PARTICULARS band ------------------------------------------
     A full-width centred caption on its own rule. On the reference this is
     the page's spine: everything above it identifies the shipment and
     everything below it describes and prices the cargo. */
  const bd = ROW.band;
  cell(M, bd.y, R - M, bd.h);
  c.fillStyle = INK;
  c.font = `700 13px ${MONO}`;
  c.textAlign = "center";
  c.fillText("PARTICULARS FURNISHED BY SHIPPER", TEX_W / 2, bd.y + 20);
  c.textAlign = "left";

  const ch = ROW.colhead;
  cell(M, ch.y, COL_W - M, ch.h);
  cap(M, ch.y, "Kind of Packages; Description of goods; Marks and Numbers; Container No./Seal No.", 10);
  cell(COL_W, ch.y, COL_MEA - COL_W, ch.h);
  cap(COL_W, ch.y, "Weight", 10);
  cell(COL_MEA, ch.y, R - COL_MEA, ch.h);
  cap(COL_MEA, ch.y, "Measurement", 10);

  /* ---- 5. the goods body ------------------------------------------------- */
  const gd = ROW.goods;
  cell(M, gd.y, COL_W - M, gd.h);
  cell(COL_W, gd.y, COL_MEA - COL_W, gd.h);
  cell(COL_MEA, gd.y, R - COL_MEA, gd.h);

  val(M + 14, gd.y + 22, "1 CONTAINER SAID TO CONTAIN 1,200 CARTONS", 14, 0.9);
  printBlock(M + 14, gd.y + 62, COL_W - 40, 4, 22, 7, 0.44);
  val(M + 14, gd.y + 158, "ELECTRONIC COMPONENTS — FREIGHT PREPAID", 13, 0.82);
  printBlock(M + 14, gd.y + 232, COL_W - 40, 3, 22, 7, 0.40);
  val(M + 14, gd.y + 300, "SHIPPER'S LOAD, STOW, WEIGHT AND COUNT", 12, 0.7);

  /* the ORIGINAL watermark — very large, very pale, letterspaced, straight
     across the particulars band. It is drawn AFTER the body text and before
     the spoilers, which is the order the real thing is printed in. */
  c.save();
  c.fillStyle = "rgba(70,74,80,0.14)";
  c.font = `700 92px ${MONO}`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  const word = "ORIGINAL";
  const track = 16;
  let total = 0;
  for (const chx of word) total += c.measureText(chx).width + track;
  total -= track;
  let ox = TEX_W / 2 - total / 2;
  for (const chx of word) {
    c.fillText(chx, ox + c.measureText(chx).width / 2, gd.y + gd.h * 0.52);
    ox += c.measureText(chx).width + track;
  }
  c.textAlign = "left";
  c.textBaseline = "alphabetic";
  c.restore();

  /* the declared-by-shipper disclaimer that closes the particulars band */
  c.fillStyle = "rgba(48,52,58,0.62)";
  c.font = `400 10px ${MONO}`;
  c.fillText(
    "particulars as declared by Shipper, but without responsibility of or representation by Carrier (see clause 14)",
    M + 8, gd.y + gd.h + 16,
  );

  /* ---- 6. freight & charges --------------------------------------------- */
  const cg = ROW.charges;
  const CG_COLS = [M, 396, 520, 604, 700, 820, R];
  const CG_HEAD = ["Freight & Charges", "Rate", "Unit", "Currency", "Prepaid", "Collect"];
  cell(M, cg.y, R - M, cg.h);
  for (let i = 1; i < CG_COLS.length - 1; i++) {
    c.strokeStyle = RULE;
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(CG_COLS[i], cg.y);
    c.lineTo(CG_COLS[i], cg.y + cg.h);
    c.stroke();
  }
  for (let i = 0; i < CG_HEAD.length; i++) cap(CG_COLS[i], cg.y - 2, CG_HEAD[i], 9);

  const CG_ROWS: [string, string, string][] = [
    ["Basic Ocean Freight", "1500.00", "Per Container"],
    ["Bunker Adjustment Factor", "0.00", "Per Container"],
    ["Chassis Usage", "0.00", "Per Container"],
    ["Documentation Fee", "0.00", "Per Bill of Lading"],
    ["Handling Charge", "0.00", "Per Container"],
    ["Emergency Bunker Surcharge", "0.00", "Per Container"],
  ];
  c.textBaseline = "top";
  for (let i = 0; i < CG_ROWS.length; i++) {
    const y = cg.y + 22 + i * 20;
    c.fillStyle = "rgba(30,34,40,0.88)";
    c.font = `500 11px ${MONO}`;
    c.fillText(CG_ROWS[i][0], CG_COLS[0] + 8, y);
    c.textAlign = "right";
    c.fillText(CG_ROWS[i][1], CG_COLS[2] - 8, y);
    c.textAlign = "left";
    c.fillText(CG_ROWS[i][2], CG_COLS[2] + 8, y);
    c.fillText("USD", CG_COLS[3] + 8, y);
    c.textAlign = "right";
    c.fillText(i === 0 ? "1500.00" : "0.00", CG_COLS[5] - 8, y);
    c.textAlign = "left";
  }
  c.textBaseline = "alphabetic";

  /* ---- 7. the foot: carrier's receipt block | conditions | signature ----- */
  const ft = ROW.foot;
  cell(M, ft.y, COL_MID - M, ft.h);
  cell(COL_MID, ft.y, R - COL_MID, ft.h);

  const FOOT_L: [string, string][] = [
    ["Carrier's Receipt (see clauses 1 and 14). Total number of containers received by Carrier", "1 container(s)"],
    ["Number & Sequence of Original B/Ls", "2 / THREE"],
    ["Declared Value (see clause 7.3)", "—"],
  ];
  let fy = ft.y;
  for (const [k, v] of FOOT_L) {
    cap(M, fy, k, 9);
    val(M + 8, fy + 20, v, 13, 0.9);
    fy += 41;
    c.strokeStyle = RULE;
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(M, fy); c.lineTo(COL_MID, fy);
    c.stroke();
  }

  /* the conditions. Six hundred words of carrier's terms, set at a size no
     one is meant to read — which is precisely why it is rects. */
  printBlock(COL_MID + 8, ft.y + 10, R - 8, 14, 7.4, 3.4, 0.34);

  /* signature, over the conditions block's foot */
  c.save();
  c.strokeStyle = "rgba(28,44,96,0.6)";
  c.lineWidth = 2;
  c.lineCap = "round";
  c.lineJoin = "round";
  const sy0 = ft.y + ft.h - 34;
  c.beginPath();
  c.moveTo(COL_MID + 90, sy0);
  const sig: [number, number][] = [
    [COL_MID + 112, sy0 - 13], [COL_MID + 134, sy0 + 4], [COL_MID + 158, sy0 - 15],
    [COL_MID + 182, sy0 + 2], [COL_MID + 208, sy0 - 12], [COL_MID + 234, sy0 + 3],
    [COL_MID + 258, sy0 - 9],
  ];
  for (const [sx, syy] of sig) c.lineTo(sx, syy);
  c.stroke();
  c.restore();
  c.fillStyle = CAP;
  c.font = `400 9px ${MONO}`;
  c.fillText("As Agent(s) for the Carrier, TRANSHARBOR LINES", COL_MID + 90, ft.y + ft.h - 14);

  /* ---- 8. the closing strip --------------------------------------------- */
  cell(M, ft.y + ft.h, R - M, TEX_H - M - (ft.y + ft.h));
  c.fillStyle = "rgba(48,52,58,0.72)";
  c.font = `400 11px ${MONO}`;
  c.fillText("This transport document has one or more numbered attachments", M + 10, ft.y + ft.h + 20);

  /* ---- 9. THE FIELD VALUES, as real type --------------------------------
     Drawn LAST of the print so nothing overlays them except the spoilers,
     which is the whole point of the spoilers. Named directly as
     `ui-monospace, ...` and NOT via var(--font-plex-mono): this canvas is
     painted at module scope, outside any element's style context, so a CSS
     custom property would not resolve. */
  for (const f of FIELDS) {
    val(f.cell.x, f.cell.y, f.value, f.cell.h - 6);
  }

  /* ---- 10. the CREASE ---------------------------------------------------
     A soft diagonal darkening band with a thin bright edge along one side
     where the fold catches the light. Sited across the particulars band,
     where it crosses the goods description and the container number. */
  c.save();
  c.translate(TEX_W * 0.5, gd.y + gd.h * 0.45);
  c.rotate(-0.36);
  const crease = c.createLinearGradient(0, -66, 0, 66);
  crease.addColorStop(0.00, "rgba(60,52,40,0.00)");
  crease.addColorStop(0.44, "rgba(60,52,40,0.10)");
  crease.addColorStop(0.53, "rgba(60,52,40,0.15)");
  crease.addColorStop(1.00, "rgba(60,52,40,0.00)");
  c.fillStyle = crease;
  c.fillRect(-1200, -66, 2400, 132);
  c.fillStyle = "rgba(255,255,255,0.28)";
  c.fillRect(-1200, 5, 2400, 2);
  c.restore();

  /* ---- 11. the coffee RING, over the routing cells ---------------------- */
  c.save();
  c.strokeStyle = "rgba(120,90,50,0.17)";
  c.lineWidth = 12;
  c.beginPath();
  c.arc(806, ROW.notify.y + 40, 86, 0, Math.PI * 2);
  c.stroke();
  c.lineWidth = 4;
  c.strokeStyle = "rgba(120,90,50,0.10)";
  c.beginPath();
  c.arc(806, ROW.notify.y + 40, 68, 0, Math.PI * 2);
  c.stroke();
  c.restore();

  /* ---- 12. the STAMP ----------------------------------------------------
     Rotated across the CONTAINER NO. value — the field the scene later calls
     out as the hard read. Centred on that field's own cell so moving the
     field moves the stamp with it. */
  const hardF = FIELDS.find((f) => f.hard)!;
  c.save();
  c.translate(hardF.cell.x + hardF.cell.w * 0.62, hardF.cell.y + hardF.cell.h / 2);
  c.rotate(-0.32);
  const RED = "rgba(150,40,40,0.52)";
  c.strokeStyle = RED;
  c.lineWidth = 6;
  c.beginPath();
  c.arc(0, 0, 96, 0, Math.PI * 2);
  c.stroke();
  c.lineWidth = 2;
  c.beginPath();
  c.arc(0, 0, 82, 0, Math.PI * 2);
  c.stroke();
  c.fillStyle = RED;
  c.font = `700 32px ${MONO}`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText("RECEIVED", 0, 0);
  c.textAlign = "left";
  c.textBaseline = "alphabetic";
  c.restore();

  /* ---- 13. the handwritten amendment ------------------------------------
     A short freehand-looking polyline beside the weight, plus a strike over
     part of the printed figure. Pen blue-black, not the stamp's red. */
  const wF = FIELDS.find((f) => f.key === "GROSS WEIGHT")!;
  c.save();
  c.strokeStyle = "rgba(28,44,96,0.6)";
  c.lineWidth = 2.6;
  c.lineCap = "round";
  c.lineJoin = "round";
  const gy = wF.cell.y + wF.cell.h / 2;
  c.beginPath();
  c.moveTo(wF.cell.x + wF.cell.w + 10, gy + 20);
  const hand: [number, number][] = [
    [wF.cell.x + wF.cell.w + 28, gy + 6], [wF.cell.x + wF.cell.w + 46, gy + 22],
    [wF.cell.x + wF.cell.w + 62, gy + 2], [wF.cell.x + wF.cell.w + 80, gy + 18],
  ];
  for (const [hx, hy] of hand) c.lineTo(hx, hy);
  c.stroke();
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(wF.cell.x + 4, gy + 3);
  c.lineTo(wF.cell.x + wF.cell.w - 6, gy + 6);
  c.stroke();
  c.restore();

  return cv;
}

/* TEXTURE CACHE + IDLE WARM. Same contract as before: a cache only helps the
   SECOND consumer, and `warmDocumentTextures()` is called from
   _vision/lazy.tsx's loader so the build on the scroll path gets a hit
   instead of painting 1024x1349 mid-scroll. */
let paperCache: THREE.CanvasTexture | null = null;
function paperTexture(): THREE.CanvasTexture {
  if (!paperCache) {
    const tex = new THREE.CanvasTexture(paintPage());
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    paperCache = tex;
  }
  return paperCache;
}
export function warmDocumentTextures() { paperTexture(); }

/* ---- materials ---------------------------------------------------------- */

export interface DocumentMaterials {
  paper: THREE.MeshStandardMaterial;
  all: THREE.Material[];
  dispose: () => void;
}

export function buildDocumentMaterials(): DocumentMaterials {
  const all: THREE.Material[] = [];
  const keep = <T extends THREE.Material>(m: T) => { all.push(m); return m; };

  /* THE VALUE RULE applies: under the five-source rig with ACES on top a
     matte surface lands brighter than its albedo, so this is authored darker
     than the intended result. The tint and the ink were opened from BOTH ends
     in the previous pass — a #E8E6E0 base under a #9AA3AC tint put the paper
     in the same value band as the print on it, and the sheet rendered as dim
     card. #C6CDD5 over a #EEECE6 base keeps that separation with the denser
     rule grid this layout adds, which reads a touch darker overall simply
     because there is more ink on the page.

     DoubleSide: the sheet is a single plane with no backing geometry, and
     while the camera never sees the back face by construction, a future pose
     change should not silently render a hole. */
  const paper = keep(new THREE.MeshStandardMaterial({
    map: paperTexture(),
    color: "#C6CDD5",
    roughness: 0.94,
    metalness: 0.0,
    envMapIntensity: 0.22,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
  }));

  return {
    paper, all,
    /* MATERIALS ONLY. The page canvas is module-cached and shared, so
       disposing it here would leave the next build sampling a destroyed
       texture. */
    dispose: () => { all.forEach((m) => m.dispose()); },
  };
}

/* ---- the model ---------------------------------------------------------- */

export interface DocumentModel {
  root: THREE.Group;
  /** The sheet GROUP. Carries the yaw. Everything welded to the page — the
   *  scan surface, the field boxes — is parented here so it inherits the turn
   *  and never drifts off the print. */
  sheet: THREE.Group;
  /** Geometry this scene OWNS and must dispose. */
  owned: THREE.BufferGeometry[];
}

export function buildDocument(mats: DocumentMaterials): DocumentModel {
  const root = new THREE.Group();
  const owned: THREE.BufferGeometry[] = [];

  const sheet = new THREE.Group();
  sheet.rotation.y = SHEET_YAW;
  root.add(sheet);

  const paperGeo = new THREE.PlaneGeometry(SHEET_W, SHEET_H);
  owned.push(paperGeo);
  const paper = new THREE.Mesh(paperGeo, mats.paper);
  sheet.add(paper);

  return { root, sheet, owned };
}
