# Work Vision — the rebuild plan

The one scene still mid-build. This is what it is becoming, what is done, and
what each remaining act needs. Written down because the work is being done act
by act and the standard has to survive between passes.

## The concept

**One worker, three cameras, three places on the site, one identity.** The
loop is 13.5s in three hard-cut acts of 4.5s — a video management system
cutting between fixed cameras, never panning between them. The same man walks
through each in turn, and the label's re-identification count climbs, so by
act 3 the viewer realises he has been tracked the whole time.

| Act | Place | Walk | Label |
|---|---|---|---|
| 1 | Racking aisle | left to right | `Person detected` · first sighting |
| 2 | Inbound dock | right to left | `Same person · 0.96` · 2nd sighting |
| 3 | Pack line | left to right | `Same person · 0.97` · 3rd sighting |

Act 2 runs backwards on purpose: a reversed direction reads as "a different
camera" before the viewer has even parsed the dressing. The shift register
gains a row per act and a resolve line lands in the last beat of act 3 —
`ONE IDENTITY ACROSS 3 CAMERAS · OPERATIVE W-2291`.

## The standard every act must meet

Act 1 now meets it. Acts 2 and 3 do not. This list IS the definition of done
for each, and it is the same house standard as the rest of the family (see
`09-scene-craft-and-learnings.md`):

1. **A real camera in the world.** On a pole or a wall mount, standing at the
   place the read actually happens — never a prop pinned to the render camera.
   Three such props were tried and removed: a camera locked to the lens slides
   over the scene as a decal, takes no light from it and casts no shadow into
   it, which is why no amount of reshaping made it read as a camera.
2. **A sight cone from that lens, tracking the subject.** Re-aimed every frame
   with the half-angle re-derived from live range, so the footprint stays
   constant instead of fanning as he walks away.
3. **A detection bracket on him**, with an explicit per-mesh `renderOrder` or
   the dressing will paint over it.
4. **Dressing with real structure**, not primitives standing in for it — see
   the next section.
5. **Motivated light**: a pendant from `_vision/lamp.ts`, hung over the walk
   line rather than over the scenery.

## What "dressing with real structure" means

The lesson from act 1, stated so acts 2 and 3 do not repeat it: **a thing
reads as itself because of the one feature that identifies it, not because of
overall detail.** Adding polygons to a wrong silhouette does nothing.

- Racking reads as racking because its uprights are **lattice frames** — two
  slender columns with a zig-zag of diagonal bracing. A solid box has none of
  it, and that single change did more than everything else in the act.
- Beams need the **front lip** the pallet runners sit behind, or they are
  painted stripes.
- Loads are **pallets of cartons with variation** — size, count, yaw and
  offset from a deterministic hash. One identical box per bay is the
  definition of blobby. `Math.random()` is banned: a scene that reshuffles
  itself cannot be reviewed.
- Skin them with `cardboardSide()` — the same module-cached call cargo makes,
  so the goods in both scenes are visibly the same stuff. **Never dispose it**;
  it is shared.
- **Depth comes from repetition receding into darkness**, not from a backdrop.
  A back wall was added and removed: measured, it filled the entire frame with
  one flat slab and erased the depth the second rack run had just bought. The
  fog already runs 6..26 — that IS the end of the aisle.

## Done

- Act structure, hard cuts, per-act camera poses, escalating labels, the
  shift register, the resolve line.
- **Act 1**: lattice uprights, lipped beams, palletised cartons with
  deterministic variation on the cardboard skin, a second rack run staggered
  half a bay behind, fog closing the aisle, and the shared pendant lamp.
- **The figure**: hard hat, segmented arms (elbow + hand) and legs (knee +
  boot), knees bending only on the recovery leg, boots whose soles sit on the
  floor with no seam. Crown held at exactly 1.815 — the framing solve, the
  callout anchor and the cone clearance are all keyed to it.
- **The sight cone tracks**, where before it was aimed once at build time and
  never re-aimed.
- `?debug=1` publishes the scene graph on `window.__work` — `list()` gives
  every visible mesh with its owning group and its projected canvas rectangle,
  `hide(name)` toggles one off. Added after two wrong guesses about what an
  object on screen was; use it rather than inferring from screenshots.

## To do

**Act 2 — inbound dock.** Currently a wall and a few pallets. Needs: roller
shutter doors with visible ribs and guide rails, a dock leveller plate, the
nose of a trailer backed onto one bay, edge protection bollards, and pallets
staged at dock-apron spacing rather than aisle spacing. Plus items 1, 2 and 5
of the standard above.

**Act 3 — pack line.** Currently a bench run. Needs: benches with visible
frames and under-shelves, totes with lips, a roller section, stacked flat
cartons, task lights over the benches. Plus items 1, 2 and 5.

**Then:** re-check the three acts read as three PLACES at a glance, which is
the thing the whole structure exists to do.
