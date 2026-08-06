# Scene craft, and the rules we learned the hard way

How the 3D scenes are built, and the rules that came out of getting them wrong first. For anyone briefing a change to a scene, judging whether a new one is done, or wondering why a seemingly-obvious "fix" was reverted.

Sources: `DECISIONS.md`, `PERFORMANCE.md`, `components/vision/_vision/palette.ts`, `components/vision/hero-cards/detect.ts`, and the scene files themselves (`crane-vision`, `cargo-vision`, `document-vision`, `lead-card` are the densest).

## The engine, and what a scene is allowed to touch

`components/vision/_vision/` is the shared engine — `studio.ts` owns the renderer, tone mapping, the softbox environment, the cyclorama, the five-light rig, shadows and bloom; `camera.ts` owns the rig; `overlay.ts` owns callouts. A scene supplies its own subject, camera keyframes and copy. Changing `_vision/` changes every scene at once, which is the point — it's also why a "small tweak" there needs to be checked against all eight scenes, not just the one prompting it.

The camera is a **pure pan with locked height** — deriving height from an elevation angle looks fixed but isn't, because every distance change then slides the camera up or down the cone and an intended push-in becomes an unwanted crane move. `CamKey.rad` is ground distance, not slant range. Yard Vision is the one deliberate exception (elevation angle locked instead of height, because it's an aerial survey of a flat yard) — a departure from house rule, not an oversight.

## Colour and value — see `07-design-language.md`

The value rule (author roughly half the value you want, check the render), the floor-portability rule, and `toneMapped: false` are covered there in full; they apply to every scene built here.

## Detection grammar: find, then decide, are separate beats

> **Attention flare → bracket locks → confidence ticks → outcome resolves.**

Each of those is its own visual event, not a single state that appears fully formed. A sweep or flare *causes* the detection rather than a bracket that simply pops into existence — brackets that just appear read as decoration; ones that appear as a scan crosses the object read as inference happening.

- **Numbers converge in discrete steps, not a smooth glide**, so a readout reads as computed rather than animated. A tally or confidence value should tick, not tween.
- **A detection must resolve before its surface turns away.** If the camera or subject rotates a flagged face out of view before the finding lands, the beat is wasted.
- **No object wears two marks at once.** A tracked object, a measured one, and a flagged one are three different visual weights (bracket / gauge / warn mark) applied at different times to different things — never stacked on one object at once. This bit both Yard (a bay outline plus a landed-box mark) and Factory (a zone gauge plus a bracket on the same unit) before the rule was named.

## Nothing oscillates

**Nothing may flash or pulse on a repeating cycle** — a strobe reads as a fault indicator, not as "the system is working." Continuous motion and one-directional sweeps (a scan bar, a rising counter) are fine; anything that goes bright-dim-bright on a loop is not.

The one exception that looks like it breaks this and doesn't: the sight-cone's ground pool "breathes" — a slow sinusoidal opacity drift, `0.85 + 0.15·sin(t·1.1)`. It reads as *alive*, not as a fault, because the amplitude is small (15% of its range) and the period is slow enough that it never resolves as a discrete on/off flash. A strobe is fast and full-range; this is neither.

## Loops: state-neutral, seamless, and honest about the trade-offs

- **The loop must not change scene state.** A crane that actually places or removes a container has to snap back at the wrap — visibly popping. Carrying the load *across* the frame and off the other side is state-neutral: nothing needs to reset, so the wrap is unseeable. It is also frequently the stronger claim (a box identified *while moving* is something a still photo can't assert).
- **Loop seams: constant speed, integer cycle counts, modulo — not easing.** An eased approach to a wrap point changes speed near the seam, which is exactly where a viewer's eye is most likely to be if they're watching a loop; constant speed plus an integer number of cycles makes the wrap arithmetically invisible.
- **A counter should be stateless, derived from the loop phase `p`, never accumulated frame over frame.** `floor(47 + 9·loops + 0.5)`-style formulas stay correct under `?phase` pinning and after a wrap; an accumulator drifts and breaks the moment the loop position is jumped.
- **"Never an empty road" and "never a visible wrap" are exactly opposed, and one of them has to give.** Hiding a vehicle's teleport at the wrap needs a loop longer than frame-plus-vehicle (so it's off-screen when it resets); keeping the road constantly occupied needs it shorter. Don't try to solve both — pick a side per scene and accept the trade (Lead Card and Gate Vision both accept a brief empty beat rather than a visible pop).
- **Open/close and in/out are one continuous expression, not two separate triggers.** A gesture driven by a single continuous parameter (not two independently-fired animations) stays reversible and loop-safe by construction; two separate triggers can desync at the seam.

## Framing and subject

- **Context beats cropping.** An unfamiliar industrial object needs its surroundings to read as anything at all — a container with no yard around it is just a rectangle; a spreader with no stack under it is a bar on strings. This took four rejected versions of the site's ASCII hero to learn: cropping tight to "the one recognisable icon" deletes the very thing that makes it recognisable. The fix that worked added depth (near/far geometry) and repetition (multiple lifts, phase-offset) rather than cropping tighter.
- **Frame the subject, not just the action.** An early Cargo Vision cut framed mouth-to-run-out and left most of a 6-unit container out of shot — technically framing "the unloading action" while cropping out the thing being unloaded. Widen until the actual subject, not just its motion, is in frame.
- **A sight cone must aim at a point on or past the subject's surface, never inside its volume.** Aiming inside a solid object's volume renders nothing (the fan is occluded by the object itself) — it has to land on or beyond the near surface.
- **Nothing physical may be the brightest thing in frame.** A physical material rendered brighter than the overlay reads as if the machine itself is glowing, and steals attention from the graphic that's supposed to carry the finding.
- **Instancing is wrong when "identical" is the defect.** Cargo's cartons briefly used one `InstancedMesh` for three boxes; the actual complaint was that they read as stiff and interchangeable, which instancing enforces by definition. Reach for instancing when repetition is the point (Yard's 55 containers); avoid it when the scene's job is to show variety (Cargo's mixed cargo silhouettes).

## Floors and shadows

- **A hairline grid over nothing is not a floor.** The ruled measurement grid is the annotation; a real deck slab underneath it is what makes something a surface. A scene that "has a ground" and still reads as void is missing the slab, not the ruling.
- **Check what a shadow is falling onto before concluding the light rig is broken.** Cargo Vision appeared to have no shadows at all; the rig was fine — the shadow catcher sat under the studio floor, so shadows were correctly rendering onto a surface that was never visible. A shadow on black is invisible, not absent.
- **Any scene where subjects rest on a raised surface (a conveyor belt, a platform) needs its own shadow catcher at that surface's height**, not only at the ground floor — a catcher only at floor level catches contact shadows several centimetres below where the object actually sits.

## Layout and DOM traps

- **A scene paints `bleed` pixels past its slot — a spacer smaller than the bleed drives the canvas into the section's own headline.** `bleed` moves only the canvas wrapper (never the overlay/headline), rendering at `top: -bleed`. **The rule: the headline-to-slot spacer must equal `bleed` plus however much clear air is actually wanted.** This has bitten five separate sections. Do not "fix" an overlap by shrinking `bleed` — `bleed` sets the canvas aspect ratio that the camera-fit math derives distance from, so shrinking it re-frames the whole scene as a side effect.
- **Absolutely-sized type inside a percentage-sized box overflows at narrow viewports.** A readout column positioned by percentage width with a hardcoded pixel font size will push text outside the canvas once the viewport narrows enough. Derive font size from the container's actual width instead.
- **CSS `filter: blur()` on an element eats its own border**, because the blur kernel samples outside the element's box, including the transparent area past its edge — a bordered tile with `blur()` applied directly gets a feathered, edgeless smudge instead of a crisp blurred image with a sharp frame. Fix: blur an inner layer inset by `2×blurPx` and clip with `overflow:hidden`, so the kernel always has real pixels to sample at its own edges.

## Process learnings

- **A screenshot is not a measurement.** Clipping, overlap and alignment claims need `getBoundingClientRect()` (or equivalent real geometry), not an eyeballed read of a downscaled browser-pane image — the pane can compress ~1300 CSS px into ~740 image px, which is enough to make thin glyph stems look clipped when they aren't. This produced at least two false bug reports before the rule was written down.
- **"A prior pass added X" is not evidence that X exists.** A brief once asserted a previous pass had already added a deck, fog and back-row containers to a scene — `git log` on that path showed one commit, and grep found only prose describing the work, never the code. It had never actually landed. Verify claimed prior work against the tree before building on top of it.
- **`next start` reads the build manifest at boot.** Building a fresh production bundle while a `next start` server from the previous build is still running leaves it serving stale files that 404 — and a browser reload does not fix it, because the server itself needs restarting against the new manifest.
- **Diagnosing a moving scene from one still frame is a guess.** A claim that a tracking bracket was "boxing a merged volume" turned out to be reading a single frame of a 24-target animation and inferring a code-level cause from it; the source showed every tracked target was a clean leaf mesh. Say "I saw X in this frame" and go read the code before asserting "X is caused by Y."
- **Recolour to a garish placeholder colour before concluding a graphic isn't rendering.** When secondary overlay brackets appeared to be missing entirely, swapping the material to magenta and re-rendering proved all three were drawing, correctly positioned and sized — the actual problem was contrast, not a broken render path. One build settles what several rounds of guessing won't.

## What PERFORMANCE.md found — including what looked like the bottleneck and wasn't

Full detail and the measurement method are in `PERFORMANCE.md` at the repo root; the standing rules are **never trust a dev-server timing** (React Strict Mode double-builds every scene, dev ships unminified) and **no entry goes in that file without a number**. A few of the most useful findings:

**What actually was the cost**, once measured properly:
- The real ~2.5s first-load stall was a container material flipping `transparent = false` at runtime — a program-cache-key property, so it triggered a synchronous shader recompile inside a visible frame. Fix was to pre-compile both variants during idle time, not to avoid the material flip.
- A declared-but-never-called geometry cache (`Map` defined, never read) was the single largest unclaimed win in the file — about 700ms, found by reading the file and noticing the cache was never actually queried, not by any profiler.

**What looked like the bottleneck and was falsified by measurement:**
- **WebGL context creation** — measured directly at 13ms for a real context with a forced clear. Not the cost.
- **Texture generation as the dominant cost** — collapsing 15 container skins to 3, and metal albedos from per-colour to per-finish, barely moved the total build time. Worth doing for other reasons; wrong theory for what was slow.
- **Lighting as the dominant cost** — cutting 8 lights to 3 bought only ~9%, and the first attempt made every card visibly flatter until intensities were raised to compensate (five area lights deliver meaningfully more total illumination than three point sources — cutting light count isn't free even where it's cheap).
- **Prefetching the scene chunks** — bytes landing at scroll time dropped from ~150KB to ~15KB exactly as designed, and the scroll stalls did not move (975ms → 963ms). The bytes were never the cost; canvas painting and the first GPU draw were. The prefetch was kept anyway (it's a real win on a slow connection) but nobody should cite it as the fix for jank.
- **`createStudio` as an expensive build step** — measured directly at 43-46ms total. The wildly inconsistent numbers that looked like an "unstable and unexplained" studio cost (812ms one run, 43ms the next) were actually two different things being measured as one: first-draw shader compilation (a real, separate cost, fixed by priming one frame at build time) and a one-time per-browser-session shader-cache cost, not a per-page one.

**A standing trap worth repeating:** four separate "documented but never wired" defects were found in this codebase — a geometry cache, a texture cache, a `trackers()` call, and a `rig.motion`/`rig.trackX` pair — each described in a code comment as done, two of them even credited in `PERFORMANCE.md` with measured effects they could not actually have produced, since the code path was never called. **A comment or changelog entry asserting an optimisation is not evidence it happened — grep for the call site, not the declaration.**
