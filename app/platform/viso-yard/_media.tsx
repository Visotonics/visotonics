import { readFileSync } from "node:fs";
import path from "node:path";
import type { CSSProperties } from "react";
import { DrawSchematic } from "@/components/draw-schematic";

/* ---------------------------------------------------------------------------
   Schematic — inlines an approved SVG asset from /public/assets so the drawing's
   text (specimen ids, confidences, dimensions) stays selectable and indexable,
   per the SEO/semantics rule. Wrapped as role="img" + aria-label per product.

   NOTE (flag): the Design exports place these via <img src="assets/…svg">. The
   handoff's SEO/semantics section instead requires the six SVGs INLINE. Those
   directives conflict; per "flag, don't fix silently" this component follows the
   handoff (inline) and this note records the deviation from the export markup.

   Server component only (reads from disk). Built as a `media` slot so a later
   phase can swap the artwork without touching section layout.
--------------------------------------------------------------------------- */

const cache = new Map<string, string>();

// fit "width" → scales by width, height follows aspect (full-bleed slots).
// fit "contain" → fills a fixed-height slot, letterboxed via the svg's own
// preserveAspectRatio (meet). Matches the exports' <img object-fit:contain>.
// fit "cover" → FILLS the slot edge to edge and crops the overflow, by forcing
// preserveAspectRatio to "slice". This is the inline-SVG equivalent of
// object-fit:cover; there is no CSS route to it, because object-fit does not
// apply to an inline <svg> element. Any preserveAspectRatio the artwork already
// carries has to be stripped first or the asset's own value wins.
function loadSvg(file: string, fit: "width" | "contain" | "cover"): string {
  const key = `${file}::${fit}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const svgStyle = fit === "width" ? "display:block;width:100%;height:auto" : "display:block;width:100%;height:100%";
  let raw = readFileSync(path.join(process.cwd(), "public", "assets", file), "utf8").trim();
  if (fit === "cover") raw = raw.replace(/\spreserveAspectRatio\s*=\s*"[^"]*"/i, "");
  raw = raw.replace(/<svg\b/, `<svg style="${svgStyle}"${fit === "cover" ? ' preserveAspectRatio="xMidYMid slice"' : ""}`);
  cache.set(key, raw);
  return raw;
}

export function Schematic({
  file,
  label,
  fit = "width",
  className,
  style,
}: {
  file: string;
  label: string;
  fit?: "width" | "contain" | "cover";
  className?: string;
  style?: CSSProperties;
}) {
  return <DrawSchematic html={loadSvg(file, fit)} label={label} className={className} style={style} />;
}
