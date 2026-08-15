# Design language

The visual system, and why it's built the way it is. For anyone judging whether a new page, card or scene "looks like Visotonics" — and for briefing an engineer or agent on a change without them re-deriving the rules from scratch.

Sources for everything below: `app/globals.css`, `components/vision/_vision/palette.ts`, `components/vision/hero-cards/detect.ts`, `DECISIONS.md`, `app/platform/viso-yard/_shared.tsx`.

## Colour: two accents, each with exactly one job

> **Orange (`#ED510C`, "signal") = a conclusion.** The thing the system has decided and wants you to look at: callouts, flags, results, part numbers, dimension lines, the site's own chrome accent.
> **Blue (`#5CC8FF` on dark, `#1B7FC4` on light) = the system observing.** Brackets, scan planes, sight cones inside the scenes — and, since the accent shipped, the page's own grid lines, annotation text and marks. See below.

This mirrors what every schematic SVG on the site already did before it was written down: geometry in white, callouts in orange. It is not decoration — orange gets **placement, not area** (target 1–2% of pixels, sited where the eye already goes), and if a scene ever grows a second orange element, one of them is wrong: there is only ever one conclusion per loop.

**Blue is now in the chrome. This was decided and shipped.**

`DECISIONS.md` 2026-08-03 left it open; it has since been resolved and the homepage carries both blue stops today.

- **Blue on the page** — grid lines, eyebrow and annotation text, corner brackets and crosses, registration dots, hero-card hover border, the How It Works numerals, the testimonial quote glyph.
- **Blue never on** — primary CTAs, body copy, headings, or the big Metrics numbers (they sit on a light ground where a bright cyan has no contrast).
- **Two stops, because grounds differ** — `#5CC8FF` on dark, `#1B7FC4` on light. Not a duplicate: the same hue at the value each ground needs.
- **Orange stays a conclusion** — the Proof & Partners registration dots are deliberately still orange, and the scenes' finding/severity marks are unchanged.

### The hero band is blue-only — no exception, the strongest instance of the rule

The homepage hero (`app/page.tsx`, `Hero()`) carries none of the site's
orange, by design, not oversight. Its drafting furniture — grid lines,
corner crosses, the callout rule, the eyebrow line, `DimensionSpan`, the
per-card accent borders — is blue (`ACCENT_D`/`CROSS_D`/`HERO_CROSS_D`
family) at every alpha. An earlier version of the hero carried roughly
fourteen separate orange marks (crosses, dots, the callout, four card
numerals and leader rules); they were removed because not one of them
marked a RESULT — they were the page's own styling conceit wearing the
colour that, everywhere else on the site, means "the system concluded
something." A hero with no detection event yet has nothing to conclude, so
orange has no job to do there. The reasoning and the removal are recorded
inline at the `SILENT CHROME` comment in `app/page.tsx` (hero band), and in
`docs/15-hero-visual-critique.md`. **Do not reintroduce orange to the hero
band to fix "flat" or "dull" complaints** — raise blue's alpha/weight
instead; that is the sanctioned lever (see `docs/15-hero-visual-critique.md`'s
colour plan). Orange belongs inside the card scenes themselves, where each
one still runs its own blue-observing-to-orange-concluding beat.

**One inconsistency to be aware of.** `app/globals.css` still carries the older rule in its header comment and tokens — *"`SIGNAL #ED510C` is the only colour in the system… NEVER on buttons, NEVER as link colour"*. That comment predates the blue work and now describes the site as it was, not as it is. The blue accent lives in `app/page.tsx`, not in the CSS tokens. Trust the page over the comment until the two are reconciled.

### Blue has two stops, because the ground changed

Blue used to have two values — `#1B7FC4` for a light ground, `#5CC8FF` for dark — for the ordinary reason that a bright cyan has no contrast on near-white. `#1B7FC4` is now dead: every scene on the site renders on a dark ground (the flagships mount `bare` and clear to the page's `#0a0b0e`; the hero cards and lead card sit on `#0E1015`/`#0A0B0E`), so there is currently no light-ground consumer left. **If a light-ground scene is ever reintroduced, it needs a second, darker blue stop reintroduced with it** — don't retune `#5CC8FF` down to fit, and don't assume the old hex is still calibrated for anything.

### Orange has two deliberate values — a tier pair, not a duplicate

- `#FFB020` (`PALETTE.warn`) — the severity **label's type colour**.
- `#ED510C` (`detect.ts` `warn`, the site's SIGNAL) — the severity **mark** colour (brackets, boxes, the drawn conclusion itself).

Yard Vision ships both together and Document Vision followed that precedent on purpose. This has been "fixed" into one colour before — reconciled, shipped, and reverted — because collapsing them destroys the label-vs-mark distinction and the blast radius is wider than it looks (a Yard card's physical painted warning flag is also tinted from this pair). **Do not unify these again.** If a third warm colour ever seems needed, it almost certainly isn't — pick whichever of the two matches whether the thing being drawn is a NAME or a MARK.

### The one place the two accents are used together, on purpose

The rule above is static — this is the dynamic version of it, and it is the
strongest single moment any of these loops has.

**A sight cone is blue while it is reading and turns orange for the one beat
where the read becomes a finding.** Cargo Vision's cone tracks case after case
down the belt in `PALETTE.accent`, and takes SIGNAL orange only while the
crushed case is under it. The colour is not decorating the cone; it is stating
what the system currently thinks, and it changes at the exact instant the
system changes its mind.

Three constraints on doing it again:

- **Spend it once per loop.** Two orange beats and neither is a conclusion.
- **Drive the flip from what the cone is looking at**, never from a separate
  timing window — those drift, and the failure mode is silent (see
  `09-scene-craft-and-learnings.md`, where exactly this fired for 130ms on an
  item the cone had already left).
- **Choose the warm value against the SCENE.** `PALETTE.warn` (#FFB020) is the
  label colour and sits close to any warm practical light in frame; over a
  pendant's own pool it vanished. #ED510C is 60° clear of both the accent and
  that lamp. Lift the alpha with the hue — against a lit surface, hue alone is
  not enough.

### One deliberate exception to the two-accent rule, on record

**Crane Vision's dent bracket is BLUE, not orange.** By the rule above a
confirmed dent is a conclusion and should be warm; it is drawn in
`PALETTE.accent` on explicit product-owner instruction, so all three of that
scene's detection brackets read as one consistent family of marks. It is
recorded in `DECISIONS.md` and in an in-code comment at `DENT_MAT` so a later
pass does not "correct" it back.

Worth knowing: the `Dent · 0.84` callout's TITLE is still warm (`severe: true`
on the callout), so in that scene the label and its own bracket currently
disagree in colour. That is an open item, not a considered choice.

### `toneMapped: false` on every signal graphic

ACES tone-mapping desaturates as it compresses highlights — correct for a lit metal surface, wrong for a graphic whose colour *is* data. Every accent marker, bracket, cone and gridline in the 3D scenes sets `toneMapped: false`, or it renders as a grey-green smudge instead of its authored hex. `detectMaterials()` and `createSightCone()` always do this; any new scene-local `MeshBasicMaterial` or `LineBasicMaterial` has to be told explicitly.

## The value rule — read this before authoring any colour for a 3D scene

> **A hex only reads as its own value under flat light.** Under the site's full five-source area rig plus ACES tone mapping, matte diffuse surfaces land far brighter than their authored albedo. Author roughly **half** the value you want, then check the actual render — never judge a colour from its swatch.

This caught Yard's containers, then Crane's boom, then Cargo's sacks, in that order, before it was written down as a standing rule.

Two corollaries:

- **A mapped/textured surface reads about a stop darker than an unmapped one at the same tint**, because the baked grain in the map is dark over much of its area. This is why Cargo's kraft sacks sit at `#1F1C16` against the cartons' `#7E6F52` and that mismatched-looking pair is correct on screen, not a bug.
- **Floor/ground colours are not portable between scenes.** `ROAD_TOP` (`#15181D`) is correct for `lead-card` and `work-vision`, both of which look ALONG a road at a glancing angle, deep in fog. The same hex taken into `cargo-vision` — camera at 18° looking DOWN at an open deck square to the light — rendered far too bright, inverting the scene's whole value ladder. **Before reusing a floor value in a new scene, ask whether the new camera looks along the surface or down at it; looking down roughly halves the correct albedo.**

## Type

Two families: `--font-archivo` (sans, all display/body/UI type) and `--font-plex-mono` (mono, for anything that reads as instrument output — labels, eyebrows, coordinates, log lines).

| Token | Size | Use |
|---|---|---|
| `--text-slab` | 136px (64px mobile) | The largest display type |
| `--text-display` | 88px (48px) | Hero-scale headline |
| `--text-headline` | 56px (36px) | Section headline |
| `--text-title` | 30px (24px) | Card / subsection title |
| `--text-metric` | 96px (56px), tabular-nums | **Verified metrics only** — not for decorative numerals |
| `--text-body-lg` | 20px (18px) | Default body |
| `--text-body` | 16px | Compact contexts |
| `--text-caption` | 15px, all breakpoints | Captions |
| `--text-mono-label` | 13px, uppercase, tracked | Corner numbers, eyebrows, kickers |
| `--text-mono-log` | 14px, no transform | Console/log/telemetry text |

`--text-metric`'s comment is explicit that tabular-nums + this scale is reserved for numbers that are actually verified claims, not any large numeral.

### A readout is either instrumentation or a claim — decide which before styling it

Both registers exist on the site and they are not interchangeable:

- **Instrumentation** — 10–13px mono, letterspaced, 40–60% ink, on a 1px accent rule. The system reporting a side-channel fact. Work Vision's shift register and Document Vision's extracted-field table are this.
- **A claim** — the sans display face, 68–72px, `-0.03em`, solid white, tabular-nums. Cargo Vision's case counter is this, because that section's headline is *"Every case counted"* — the number **is** the argument, not telemetry beside it.

Cargo's counter shipped as instrumentation first and it was wrong. The test is simple: **if the headline is about the number, the number is display type.**

Two things that go with the display treatment:

- **White, not accent.** A large figure in the observing colour competes with every bracket in frame for that colour's meaning. The accent survives as the rule down the left edge, where it still says "the system is stating this".
- **No text-shadow.** Shadows get added when small grey type is losing to a lit surface — but the fix for that is the type, not a halo. 72px of solid white at 600 needs no help, and a soft black glow under display type is the one thing this drafting register never does. `tabular-nums` stays regardless: on a counter that ticks, proportional figures shift the whole number sideways every time a digit changes.

## The drafting-sheet motif

The whole site is styled as a technical drawing, not a marketing page with diagrams pasted on. The primitives live in `app/platform/viso-yard/_shared.tsx` (and equivalents per product page) and repeat everywhere:

- **Registration crosses** (`Cross`) — a 9px `+` at real grid intersections. Replaced 3px dots that sat at points the eye already travels through but said nothing.
- **Registration dots** (`Dot`) — 3px, signal orange, at drawing reference points.
- **Page-wide verticals** (`Verticals`) — five fixed x-coordinates (margins + quarter/half/three-quarter columns) drawn as hairlines down the whole sheet, identical everywhere, so unrelated sections still read as one continuous drawing.
- **`DimensionSpan`** — extension ticks either side of a measured rule, with a mono label knocking a hole in the line. Used under headlines. This is treated as the highest-value accent move on the page precisely because it is not decoration: a dimension line is what a drafting sheet *does*.
- **Eyebrows** — mono, 13px, uppercase, 0.08em tracking. The drawing's own annotation voice.

**A hairline grid over nothing is not a floor.** `draftingGround` (the shader-drawn measurement grid under 3D subjects) still reads as void if there's no actual deck/surface underneath it — the grid is the annotation on top of a surface, not the surface itself. Any scene that "has a ground" and still looks like empty space is missing the deck, not the ruling.

The measurement grid itself is drawn in **white** (`PALETTE.grid` / `gridMajor`), deliberately not the accent colour — a floor is not an observation, and drawing it in blue would mean the one colour reserved for "the system is observing" was also the colour of the ground it stands on.

## Spacing

8px base unit, exposed as `--spacing-s1` (4px) through `--spacing-s32` (128px). Section padding is `--spacing-s32` (128px desktop, 64px mobile); card padding is `--spacing-s8` (32px desktop, 24px mobile). Grid: 12 columns desktop (4 mobile), 24px gutter, 64px margin, max container width 1360px (`--grid-container-max`).

## Dark and light grounds

The site is dark-led by default (`--canvas-dark #0a0b0e`, `--surface-dark-1 #101216`). A `.on-light` class scopes a section to the light tokens (`--canvas-light #ecedef`, `--surface-light #f6f7f8`) — used for a handful of contrast sections, not the default.

Inside 3D scenes, going from a dark to a light ground is not free — it moves three separate calibrated values, confirmed the hard way on the hero-card row:

- **Exposure drops** going light (0.72 → 0.5 in the hero cards), counter-intuitively: a bright backdrop pushes the whole frame into the top of the tone curve, so the exposure tuned for charcoal blows out pale cargo.
- **Shadow opacity drops** (0.5 → 0.22) — a light panel makes the same contact shadow far more visible for free.
- **Overlay stroke widens** (0.05 → 0.065 world units) — a bright hairline wins on luminance alone against dark navy; against a light subject it has far less to trade on, so the line needs the extra weight.

The standing rule that survived all of this, restated in `DECISIONS.md`: **cargo sits between the background and the overlay in value; machinery is the darkest thing in frame; the overlay is the only saturated thing in frame.**
