# How a page is structured

The section grammar the product pages repeat, and the copy patterns that go with it. For anyone drafting a new section or judging whether a proposed one fits the site, without having to reverse-engineer it from `app/platform/viso-yard/sections.tsx`.

Sources: `app/platform/viso-yard/sections.tsx`, `_shared.tsx`, `04-change-risk.md`, `DECISIONS.md`.

## The sheet, not the page

Every product page is one continuous "drafting sheet" — the five page-wide verticals (`Verticals`, in `_shared.tsx`) run behind every section at identical x-coordinates, so scrolling past a section boundary doesn't read as leaving one drawing and entering another. New sections must sit inside this shared coordinate system rather than defining their own margins.

## One product overview grid, then N numbered sections

The top of a product page (Viso Yard shown, the pattern generalises) is a 3×3-ish grid of every sub-product as an equal tile — cropped to fill, name laid over it as a label, no card chrome. Below that, each sub-product gets its own full numbered section (`01 Container Vision`, `02 Tank Vision`, ...), anchored so the overview grid's links jump straight to it.

**A tile is the drawing, not a framed thumbnail of one.** The earlier version wrapped every schematic in an 8px-radius card with a hairline border and a caption block — nine objects floating on the sheet. It was replaced with tiles that butt edge to edge, sharing hairlines rather than each drawing their own border, because "one drawing, edge to edge" reads as one continuous plate and a framed thumbnail reads as nine separate images pasted in.

**Title comes off the artwork.** The nine schematics are drawings with their own internal typesetting (headers, footnotes, readouts, status plates) that occupy every corner of the frame on at least one of them. Rather than fight for a clear corner, the tile's name+number sits in a plain label strip above the artwork, and the drawing underneath stays untouched at every viewport.

**Contain, not cover, for a tile of mixed aspect ratios.** Nine schematics with genuinely different native aspect ratios (2.35, 1.33, 1.78...) get letterboxed to a shared box (`fit="contain"`) rather than cropped to fill it — a crop anchors to the middle of the *artwork*, not the middle of what survives the crop, so filling a uniform box silently threw away 20-25% of several drawings and never centred what remained.

## Section anatomy (per numbered product section)

Each numbered section repeats the same shape:

1. **Eyebrow** — mono, uppercase, tracked (`eyebrow()` helper), the section's short label.
2. **Headline** — sans, using `--text-headline`/`--text-display` scale.
3. **A short numbered step list** (e.g. Container Vision's 4-step "Capture → Detect → Diff → Report"), each step a short imperative line, not a paragraph.
4. **The 3D scene or static schematic**, in its own slot.
5. Registration crosses/dots at the drawing's real corners and grid intersections, not decoratively placed.

### The two-column split, where it applies

Some sections (the homepage "platform" section is the canonical case) are explicitly two columns — animation left, all type right — rather than a card carrying both the scene and its own headline/paragraph stacked inside one panel. This was a deliberate fix for a layout where the scene was fighting its own caption for vertical space inside one box. Where a section's copy is genuinely light (a few lines), consider whether it belongs beside the scene rather than inside its frame.

When a headline needs to visually break the grid (cross an accent vertical, spill past a column), the accepted amount is a partial break — **crossing the gridline is the gesture; reaching all the way to the next panel is not.** A heading that gets close enough to collide with neighbouring type at a narrower viewport has gone too far.

## Copy patterns

- **Step lists are short imperative fragments, not sentences.** "Capture from existing CCTV", "Report in under a minute" — verb-first, no subject, no period.
- **A dimension line, not a divider, under a headline.** `DimensionSpan` (ticks + a measured rule + a mono label breaking it) sits under key headlines because a drafting sheet *dimensions* things rather than merely separating them with a rule.
- **Numbers are either verified metrics or they don't use the metric type scale.** `--text-metric`'s tabular-nums treatment is reserved for claims that are actually true, not any large decorative numeral.
- **Section labels use the product's own vocabulary from its schematic**, not a generic house template — e.g. Gate Vision's beats are labelled `RAW → FIX → VERIFIED`, quoting the original SVG's own strings (`SEAL · CHECKED`, `T · 14:02:11`), rather than a section-grammar default. Read the section's own source schematic before writing new labels for it.

## Sections are shared code, not shared style — know which

This matters for both content edits and layout changes: some sections are the literal same component reused across product pages, not just visually similar.

| Section | Owned by | Also appears on |
|---|---|---|
| Document Vision | Viso Yard | Warehouse (re-exported as-is) |
| Cargo Vision | Viso Yard | Warehouse (re-exported as-is) |
| Work Vision | Viso Warehouse | Yard, Factory |
| Secure Vision (static) | Viso Warehouse | Yard, Factory |
| Audit / Dimension Vision (static) | Viso Warehouse | Factory |

Editing Document or Cargo Vision changes Yard *and* Warehouse at once. Editing Work or Secure Vision changes three pages at once. There is currently no way to word a shared section differently per product without a code restructure — see `04-change-risk.md` for the full blast-radius table before touching any of these.

## Static-diagram sections use the same grammar, minus the scene

Audit, Dimension, Secure and Production Vision have no 3D scene at all — they're SVG diagrams dropped into the same section anatomy (eyebrow, headline, step list, framed media slot). Visually indistinguishable at a glance from the real scenes; this is worth knowing before promising a stakeholder something is "just like the others."
