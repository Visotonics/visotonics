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
function loadSvg(file: string, fit: "width" | "contain"): string {
  const key = `${file}::${fit}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const svgStyle = fit === "contain" ? "display:block;width:100%;height:100%" : "display:block;width:100%;height:auto";
  let raw = readFileSync(path.join(process.cwd(), "public", "assets", file), "utf8").trim();
  raw = raw.replace(/<svg\b/, `<svg style="${svgStyle}"`);
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
  fit?: "width" | "contain";
  className?: string;
  style?: CSSProperties;
}) {
  return <DrawSchematic html={loadSvg(file, fit)} label={label} className={className} style={style} />;
}
