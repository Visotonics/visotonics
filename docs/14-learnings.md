# Learnings — the whole website, consolidated

This is the one document to read first. It distils lessons scattered across
`PERFORMANCE.md`, `docs/09-scene-craft-and-learnings.md`,
`docs/12-scene-architecture-audit.md`, `docs/07-design-language.md`,
`docs/11-work-vision-plan.md`, `docs/13-concurrent-work-manifest.md`, and
`context/CLAUDE.md`, plus the header comments of the shared `_vision/`
modules. Every claim below carries its source so you can go deeper. Where a
source recorded its own wrong finding, that's kept in — those are some of
the most valuable entries here.

---

## 1. Process lessons

**Measure, don't reason.** The single most expensive lesson in the corpus:
"instrument the scene instead of squinting at it" (docs/09). The Crane
detection brackets took four passes argued from screenshots of a 520px slot;
a `?debug=1` block found the real bug in ~10 minutes. Screenshot ≠
measurement — the browser pane compresses ~1300px down to ~740 CSS px, so
`getBoundingClientRect` beats eyeballing (docs/09).

**No perf entry without a number, and never trust dev-server timing.**
React Strict Mode double-builds every scene; dev ships unminified. All
`PERFORMANCE.md` entries are measured on a production build
(`npm run build && next start`) with `?perf` appended, reading
`window.__visionPerf` / `__visionSplit` / `__visionDeep` (PERFORMANCE.md,
context/CLAUDE.md). Two "documented" measurements were later retracted
outright: a claimed ~3.2s cold shader-compile cost turned out to be a 6×
inflation from the measurement harness itself, and a claimed 3.7s texture-
generation cost never reproduced and was likely instrumentation residue
(PERFORMANCE.md, closed-stall investigation).

**Single runs are worthless.** PERFORMANCE #25 (Warehouse forklift rebuild)
is explicitly flagged as inconclusive and "do not cite" — best case 100ms
vs 90ms before, worst case 262ms, not separable from run-to-run noise.
PERFORMANCE #39 (the shared-machinery refactor itself) is explicitly logged
as **not** a performance change because the noise between runs was larger
than the effect being measured for the totals it reported.

**A documented optimisation is a hypothesis until an instrument fires it.**
Four separate "this is cached / this is fast" claims turned out to be dead
code the first time someone actually grepped for the call site instead of
trusting the comment: the geometry cache (#11, a `Map` declared but never
read — fixed in #18, the single largest win in the whole log at ~700ms);
the metal texture cache (#7's `cached()` defined, never called — fixed in
#23); `subject.trackers()`; and `rig.motion`/`rig.trackX`. Same pattern
repeated at the flag level: `noEnv` was documented, "passed" by six scenes,
and credited with a win in PERFORMANCE #6 — but the guard that would have
made it do anything was never written, so the saving never occurred until
#40 actually wired it (net win once real: homepage PMREM per studio 27–35ms
→ 0, homepage total build 506ms).

**Grep declaration-to-read; the comment is the thing most likely to lie.**
Stated as the standing rule from #40/#41 (PERFORMANCE.md): "when adding an
option, add the guard and the measurement in the same commit — and when
auditing, grep declaration-to-read rather than reading the comment." The
architecture audit (docs/12) caught itself making exactly this mistake
mid-session: it diagnosed lamp.ts's "extraction without migration" failure
as a lesson, then in the same session shipped `_vision/readCamera.ts` with
**zero consumers**, caught only by grepping for importers afterward.
Verbatim: "Writing the rule down did not prevent it; checking did."

**Sub-agent reports must be verified, not trusted.** `context/CLAUDE.md`
records that sub-agents in this repo have reported work as complete and
verified when it wasn't, and reported fixes as missing when they were
actually present on disk (stale dev-server output caused the false
negative). The standing rule: check the diff, re-run the arithmetic
yourself, look at the rendered page — and expect any gap to sit at the
*edges* of the scope you gave the agent, in an adjacent part left
inconsistent because you didn't think to mention it.

**A single-frame screenshot cannot diagnose a moving scene**, and a prior
pass having "added X" is not evidence X exists in the current tree — verify
against git log or a grep, not memory of intent (docs/09).

**Systematic sweeps beat spot-checks for dead-code defects.** PERFORMANCE
#41 ran four Haiku explorers plus hand verification specifically to find
more "#40-class" defects (documented-but-unwired code) and turned up a live
one that was actively wasting per-frame work (`ticks`/`setFill`), a
breaking type gap (`CalloutSpec.id` required but dead, 15 call sites), a
dead model field (`CargoModel.mouth`), and two real timer leaks
(`draw-schematic.tsx`, `motion.tsx`'s CountUp) — while 12 module-level
caches were checked and found genuinely clean, so the sweep isn't just
paranoia theatre, it has a nonzero hit rate.

---

## 2. Architecture lessons

**Extract on second use, and migrate the first scene in the same commit.**
The rule, stated verbatim twice in docs/09 and docs/12: "The second time a
scene needs a thing, it moves to `_vision/` before it is written the second
time — and the first scene migrates onto it in the same commit." The
lamp.ts case is the cautionary tale for skipping the second half: the
pendant lamp was extracted from Cargo the moment Work needed one, but Cargo
was not initially migrated onto the extraction — two live copies of
`HALO_FRAG` / `BEAM_FRAG` existed for months (docs/12). Cargo now uses the
shared builder. **Extraction without migration doubles the copies, it doesn't
remove one.**

**Shared machinery is a defect-rate argument, not just a DRY argument.**
The architecture audit found zero per-scene bugs in the shared `_vision/`
layer and multiple live bugs in scene-specific code that had drifted from
it — most notably Container Vision's hand-rolled 869-line second studio,
which was missing `#include <colorspace_fragment>` (backdrop rendering at
~⅛ brightness) and had leader lines at settings already known elsewhere to
be invisible on dark ground (docs/12). The shared layer was ~10% of scene
code at audit time against a target of "closer to 30%" — five scenes had
each hand-built a detection camera, and the half-angle formula
`atan(radius/range)` had been retyped four times with different constants
before extraction (docs/12).

**A shared builder that imposes a house silhouette gets refused by
finished scenes — parameterise geometry, fix only behaviour.** Every one of
the five scenes migrated onto `readCamera.ts` rejected the rig's first
proposed shape, and each refusal was judged correct, not scope creep: Gate
needed a 5cm body offset, Work needed a 3mm hood, Cargo/Gate/Crane needed
`headTracks:false` because they're bolted down (only the cone moves), Crane
needed `lensObject` because its housings are authored in absolute gantry
coordinates (docs/12, "what the migrations taught that the audit could not
have known"). Separately, in the lamp.ts case: `shadeMesh.castShadow=false`
was extracted as a hardcoded constant carrying a Work-specific reason
baked in, but Cargo needed it `true` for its shade to read correctly over
a narrow belt. Lesson stated in docs/09: "a value that one scene reasoned
its way to is an **option**, not a constant."

**A duplicate is a dated snapshot that freezes understanding.** The parked
"lead card journey" concept (container arrives → cargo unloads →
container-first detections) was built, rejected, and kept as a snapshot
rather than deleted — explicitly so the understanding it captured isn't
lost, per the user's memory note on this pattern.

**Specify variants together or you rebuild the rig N times.** The hero
cards are called out in docs/12 as the case where variants (mark-tier vs
presence-tier detection materials in `hero-cards/detect.ts`) were designed
as one interface up front, avoiding the "5 hand-built detection cameras"
failure mode repeating at the card level.

**Also caught by the audit, worth remembering as a class:** the audit's
own self-corrections were themselves sometimes wrong on a second pass — its
first correction of the `createSightCone` consumer count (6→9) was itself
wrong, because 9 counted files that only *mention* the symbol in comments;
the real number is 7 call sites (docs/12). Consumer counts need a second,
skeptical pass, not just one correction.

---

## 3. three.js technical lessons

Each is trap → symptom → fix, with source.

- **`#include <colorspace_fragment>` missing in a raw `ShaderMaterial`** →
  colours render at roughly ⅛ brightness → must be included explicitly;
  three.js's own pipeline doesn't inject it automatically outside
  `MeshStandardMaterial`-family shaders. Found live in Container Vision's
  backdrop (docs/12, PERFORMANCE.md standing traps).
- **Transparent-queue draw order is not controlled by `depthTest:false`** →
  turning off depth testing defeats the depth buffer, it does not fix
  ordering → transparent objects sort by per-object bounding-sphere
  distance from camera, so overlay marks need an explicit `renderOrder`
  (docs/09, the "four-pass" draw-order trap).
- **`Group.renderOrder` does not propagate to children** → setting it on a
  `Group` (e.g. the 8-plane bracket returned by `bracket()`) does nothing
  to the children's draw order → must `traverse()` and set `renderOrder`
  per-mesh (docs/09).
- **A `PointLight` is not hidden by a parent's `visible=false`** → a lamp
  rig toggled off at the parent still illuminates the scene → gate the
  light's `intensity` explicitly, not just object visibility (docs/09,
  `_vision/lamp.ts` header).
- **PMREM prefilter is per-renderer, and uncached is the largest remaining
  shared-layer cost** → each scene build was re-running the environment
  prefilter → PERFORMANCE #5 batches it once per page; #40b halves the
  source canvas 1024×512→512×256, cutting per-studio PMREM cost from
  ~35.5ms to ~27ms.
- **`ShaderMaterial.opacity` is inert** — a raw shader ignores the built-in
  `opacity` uniform unless you wire it yourself → the fix pattern used
  across the corpus is aliasing a uniform (e.g. `uColor`/`uAlpha`) that the
  shader actually reads, rather than relying on the material property
  (docs/09 detection-camera standard: "`createSightCone` has no colour
  setter — use `material.uniforms.uColor.value.copy(c)`").
- **`Object3D.lookAt` points local −Z only for cameras and lights** — for a
  plain `Object3D` it points local **+Z**. The architecture audit's own
  draft claimed the opposite as a universal rule; that claim was false and
  would have broken every migrated lens if a sub-agent hadn't checked
  three.js source before it shipped (docs/12, readCamera.ts convention:
  "head looks down local +Z").
- **`userData.shared` disposal guard is required on anything pooled or
  cached** — shared geometry and cached textures must never be disposed by
  an individual scene's cleanup pass; Container Vision's hand-rolled studio
  disposed all geometry indiscriminately with no such guard, flagged as a
  latent risk to shared caches even though it hadn't caused a visible bug
  yet (docs/12).
- **Live `lensWorld` vs a position sampled once** — Cargo originally read
  its detection-camera lens position once at build time (`lensPos`); the
  migration to `readCamera.ts` replaced it with the rig's live
  `lensWorld`, read from the world matrix every frame, because a camera
  that moves relative to its mount (or a mount that moves) invalidates a
  cached position silently — no type error, just a cone aimed at empty
  space (docs/13, docs/12 "Work's world-origin-cone bug from a silently
  missing line").
- **Aim direction is not cone length** — `createSightCone.aim()` truncates
  the beam at the target by default, conflating "where it points" with
  "how far it reaches." `readCamera.ts` decouples them via `floorY`, doing
  a ray–plane intersection with the floor so aim axis and visual length are
  independent knobs (readCamera.ts header, called "the hardest-won of the
  four" rig responsibilities, "the one a new scene is most likely to get
  wrong").
- **Uniformly-coloured additive geometry has a hard silhouette.** A halo
  built as a plain additive sphere, or a beam as a flat-alpha cone, shows a
  visible edge instead of reading as light. Fix: billboard quad with radial
  alpha falloff for the halo; alpha falling off both along length and
  toward the silhouette (via fresnel) for the beam (`_vision/lamp.ts`
  header; also cited generically in docs/09 — "uniformly-coloured additive
  mesh has a hard silhouette — never draw light with flat-alpha, always
  fall off").
- **`toneMapped:false` is required on every signal-colour graphic** — ACES
  tone mapping desaturates highlights, so brackets/callouts/dimension lines
  drawn in the accent colours need it set explicitly or the colour drifts
  (docs/07, PERFORMANCE.md standing traps).

---

## 4. Scene-craft lessons

**A thing reads as itself by its one identifying feature, not overall
detail.** Adding polygons to a wrong silhouette does nothing (docs/11).
Concrete case: racking reads as racking because of lattice-frame uprights
— two columns plus zig-zag diagonal bracing — a solid box has none of that
signal regardless of poly count; this single change did more for Work
Vision act 1 than everything else combined (docs/11). Same principle:
storage beams need a front lip or they read as painted stripes, not
structure (docs/11).

**Depth comes from repetition receding into fog, not from a backdrop.** A
back wall was tried behind Work Vision's second rack run and removed — it
filled the frame and erased the depth cue the staggered repetition had
already bought; fog is already running 6..26 in that scene and does the
job (docs/11).

**Motivated light — every part of a light rig answers a specific past
failure, not aesthetic preference.** `_vision/lamp.ts`'s wire must run out
of the top of frame (a visible starting plate implies a ceiling that isn't
there); its shade is open-ended and double-sided (closed, it shows its cap
from below and reads as a lump); its bulb hangs proud of the shade rim, not
tucked inside (tucked in, a slightly-downward camera sees none of it — "a
defect that shipped once and took a pass to find"). Intensity is computed,
not chosen: it must beat the studio rig's key box at 5.6 illuminance;
Cargo's first two attempts (intensity 3.4, then 14) delivered only 1.3 and
5.3 lux and read as unlit or faint before the right value was found
(`_vision/lamp.ts` header, docs/09).

**No pulsing, no oscillation on a repeating cycle** — it reads as a fault,
not a feature (docs/09). The one sanctioned exception is the sight-cone
ground pool, which "breathes" `0.85 + 0.15·sin(t·1.1)`: small amplitude,
slow period, doesn't read as a discrete on/off the way a flash does
(docs/09).

**Deterministic seeded variation; `Math.random()` is banned.** Pallet
size/count/yaw/offset in Work Vision come from a deterministic hash, not
`Math.random()`, on the explicit reasoning that "a scene that reshuffles
itself cannot be reviewed" (docs/11) — a rendered frame has to be the same
frame every time someone looks at it, or a visual bug report is
unreproducible.

**The value rule — author roughly half the value you want, then check the
actual render.** "A hex only reads as its own value under flat light...
never judge a colour from its swatch" (docs/07). This caught real bugs
three times in sequence: Yard's containers, then Crane's boom, then
Cargo's sacks — all were authored too light because the swatch lied.
Corollary: textured/mapped surfaces read about one stop darker than an
unmapped surface at the same nominal tint (Cargo's kraft sacks at
`#1F1C16` against cartons at `#7E6F52` is correct, not a mismatched pair).
Corollary: ground colours don't port between scenes — a camera looking
*along* a surface vs *down* onto it needs roughly double the albedo for
the along-view case (`ROAD_TOP #15181D` is correct for lead-card and
work-vision but wrong for cargo-vision's more downward angle) (docs/07).

**The two-accent system, and why the cone's orange is `#ED510C` not
`#FFB020`.** Blue (`#5CC8FF` dark-ground) is the system *observing* —
brackets, scan planes, cones, and now page chrome. Orange (`#ED510C`) is a
*conclusion* — callouts, flags, results — and gets placement, not area (1–2%
of pixels; "if a scene ever grows a second orange element, one of them is
wrong") (docs/07). The two oranges in the palette are deliberately
different roles, not a duplicate: `#FFB020` is the severity-label *type*
colour, `#ED510C` is the severity *mark* colour used on brackets/boxes —
docs/07 notes this exact distinction "has been 'fixed' into one colour
before — reconciled, shipped, and reverted... Do not unify these again."
The one place both accents move together is a sight cone flipping from
blue (reading) to orange (a read becomes a finding) on the exact beat the
finding occurs — driven by what the cone is looking at, not a separate
timer (a ~130ms desync between the two happened once in Cargo when this
was gotten wrong) (docs/07, docs/09).

**Detection grammar is a fixed beat sequence:** attention flare → bracket
locks → confidence ticks → outcome resolves, each its own beat, numbers
ticking in discrete steps rather than tweening, and no object wearing two
detection marks at once (docs/09).

**Context beats cropping.** It took four rejected hero-image versions to
learn to frame the subject, not just the action — an early Cargo cut
cropped the container itself out of frame while keeping the forklift
(docs/09). Related: instancing is the wrong tool when "identical" is
itself the defect — Cargo's cartons were briefly instanced and read as
stiff/repetitive; instancing is right when repetition *is* the point, as
with Yard's 55 instanced containers (docs/09, PERFORMANCE #37).

---

## 5. Measurement facts

Dated **2026-08-08**. All single-run production-build numbers via
`window.__visionPerf`/`__visionSplit`/`__visionDeep`, `?perf` query param —
treat as **machine-noisy, roughly ±200ms per single run** unless a source
states multiple runs or a median (per the process rule in §1, several
single-run figures in PERFORMANCE.md are explicitly flagged inconclusive,
e.g. #25).

- **Baseline page cost:** FCP ~200–450ms; scene construction historically
  added ~2.4s of main-thread work on top.
- **Lazy loading (#1–#4):** initial script 1342KB → 751KB; three.js is
  0KB until scroll; WebGL contexts on Yard 4→2, on home 8→4.
- **Geometry cache fix (#18), the single largest win found by reading code
  rather than profiling:** Factory subject 697ms → ~330ms; Data subject
  658ms → ~330ms.
- **Metal texture cache fix (#23):** total 765ms → ~625ms; Data 342ms →
  ~225ms; Factory 185ms → ~110ms.
- **Yard Vision instancing (#37 — 55 containers, 3 `InstancedMesh`):**
  build 90ms total (createStudio alone is 79ms of that; Yard's own
  construction is ~11ms); zero frame deltas over 40ms.
- **`noEnv` actually wired (#40), after PERFORMANCE #6 wrongly credited
  this saving years earlier without the guard existing:** homepage
  per-studio PMREM cost 27–35ms → 0; homepage total build 506ms.
- **Env canvas halved 1024×512 → 512×256 (#40b):** PMREM per studio 35.5ms
  → 27ms; page total ~280ms → ~193ms.
- **Container Vision A/B, pre- vs post-migration onto `createStudio`
  (#40c):** pre 194/187ms vs post 173/178ms vs post+512-env 165/168ms —
  roughly 13% faster after migration, confirming it was not a regression.
- **Gate Vision, cached + warmed (#32):** build 391ms → 76ms cold,
  267ms → 71ms warm.
- **Container Vision, warmed textures (#33):** build 148ms → 90ms warm.
- **Whole-site net result (Viso Yard):** before — 467ms total builds, 975ms
  of stall across 6 hitches; after — 279ms of build entirely at idle, zero
  stalls. Cold first visit: ~4.9s of blocked main thread (worst single
  frame 1931ms) reduced to zero stalls.
- **Hero cards, cumulative:** scene build total ~2880ms → ~720ms across
  #12–#26.
- **Falsified — do not re-attempt:** WebGL context creation cost (13ms,
  never the bottleneck); texture generation as the dominant cost; lighting
  as the dominant cost (cutting 8→3 lights bought only ~9%, and the first
  attempt visibly darkened cards until intensities were raised back up);
  prefetching scene chunks (bytes dropped 150KB→15KB but stalls were
  unchanged, 975ms→963ms warm — bytes were never the cost); `createStudio`
  itself as expensive (43–46ms, stable — apparent "instability" was first-
  draw shader compile plus a one-time per-session shader-cache cost being
  misread as build cost).
- **The ~2.4s stall, closed:** Container Vision flipped `transparent=false`
  on steel/hardware materials when its intro fade completed, changing the
  three.js program-cache key and forcing a synchronous in-frame shader
  recompile — confirmed via `renderer.info.programs.length` going 10→13 on
  the stalling draw. Cost ~55ms warm, ~2.4s cold (GPU shader cache). Fixed
  by compiling both program-set variants during idle.

---

## How to add a lesson

A lesson lands in **two** places, not one: here, in the relevant section
above with its source cited, **and** in the code comment nearest the trap
it describes — so the person who hits it again finds it without having
read this file first. `PERFORMANCE.md` stays the home for numbers: if the
lesson is a measured performance result, log the entry there (with the
measurement method and verdict) and link to it from §5 here rather than
duplicating the number. Don't soften a recorded failure to make the doc
read better — the wrong findings are worth more than the right ones,
because they're the ones someone will otherwise repeat.
