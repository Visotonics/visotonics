# Why the homepage hero reads as dull, and what to do about it

Written 2026-08-10 after the owner flagged the hero as "bland, visually
dull." This is a critique-and-plan document, not a changelog — items get
struck through / annotated as they land, the diagnosis stays as the record
of *why*.

**Status: item 4 (icons) done, see below. Everything else open.**

---

## The diagnosis, ranked by how much each contributes

### 1. Effectively two colours before any card scene paints — the biggest factor

Between `DARK` (`#0A0B0E`), the near-white/grey text tokens, and the grid
furniture, the only saturated colour possible in the hero band is the accent
blue (`ACCENT_D #5CC8FF` / `CROSS_D rgba(92,200,255,0.4)`), and it's used
only at low alpha (0.08–0.4) for gridlines and 9–11px crosses
(`app/page.tsx:31-42, 234-292`).

**Orange (`SIGNAL #ED510C`) is deliberately absent, and that's documented in
the code, not an oversight.** The comment at `app/page.tsx:243-263` records
that the hero used to carry ~14 orange marks and they were removed because
"not one of them marked a RESULT." A hero with no detection event yet has
nothing to conclude, and orange means a conclusion. **Do not put orange in
the hero to fix this** — it would break the one rule the whole design
language is built on.

### 2. Thin type hierarchy

The headline is one weight (600) at one size (85px desktop / 44px mobile,
`page.tsx:299-315`), alone in the band. The only other type nearby is the
`DimensionSpan` callout at 10px mono (`page.tsx:88-111`, called at
`285-292`) — by design a quiet instrument label, not a second voice. So
there's really one size doing all the work. Compare `Statement()` just below
(`page.tsx:446-500`), which gets its "interest" from motion and a
photographic background — the hero has no equivalent second layer.

### 3. The drafting furniture is close to invisible on purpose

`GRID_D` is `rgba(92,200,255,0.08)`; crosses are `rgba(92,200,255,0.4)` at
9–11px. Legible on close inspection, not at a glance. The comment at
`page.tsx:264-270` confirms this was already pulled back once (five
dots/crosses removed) because they weren't earning their keep — restraint
that may have gone one step past where it should have stopped.

### 4. A lot of empty dark space with nothing anchoring it as intentional

`minHeight: 384` on desktop (`page.tsx:233`) holds one centred, two-line
headline and nothing else. Confident minimalism is a legitimate hero
strategy, but combined with #1–#3 there's no other visual anchor — colour,
secondary type, imagery — signalling "this negative space is a choice"
rather than "unfinished."

### 5. The four cards are blank grey boxes until WebGL mounts

`HERO_CARD_CSS` and the card markup (`page.tsx:163-206, 336-383`) give each
card a name/description over flat `DARK_SURFACE #101216` with no static
imagery, gradient, or accent — the entire visual payload is the lazy-loaded
scene. Until it mounts (cold load, slow connection, dropped frame), all four
cards are dark boxes with two lines of grey type. **This is likely the
single most visible "dull" moment for a real visitor**, and it isn't a
copy/colour problem — it's a missing static treatment.

---

## Icon library — DONE

`lucide-react ^1.23.0` was already an installed dependency (shadcn's default
icon set), imported nowhere. Landed 2026-08-10 (`bbf3c20`): every nav
dropdown's `▾` (12 sites), the mobile `Menu ≡` and `Close ×` now render
`ChevronDown` / `Menu` / `X`, same rotate-on-open transitions preserved.

Icons are **chrome polish, not a fix for the hero's specific complaint** —
the hero's four cards already carry a numeral + name + description + a full
WebGL scene as their visual payload; a decorative glyph on top would be
redundant with the animation, not a cure for colour scarcity or flat type
hierarchy. Don't pitch icons as the hero fix.

Remaining icon opportunities, lower priority, chrome-only: footer contact
rows, form fields, resource/blog list items — not yet audited.

---

## Colour plan

Do not introduce orange into the hero. The design-language doc already
sanctions a second accent that's under-used in the hero *specifically*:
blue (`#5CC8FF` dark / `#1B7FC4` light) means "the system observing," and
it already ships elsewhere on the page (grid lines, eyebrow/annotation
text, corner brackets, registration dots, hero-card hover border, How It
Works numerals, testimonial quote glyph — see `docs/07-design-language.md`).
The hero uses it only at near-invisible alpha. Concrete proposals, all
reusing tokens that already carry the right meaning rather than inventing a
new palette:

1. **Raise the alpha/weight of the existing blue elements in the hero band.**
   `CROSS_D` from `rgba(92,200,255,0.4)` toward `0.65–0.8`; widen the
   `SignalCross` stroke on the two endpoint crosses (`page.tsx:241-242`).
2. **Give `DimensionSpan` more visual weight** — larger mono size (currently
   10px) or a filled-background tick treatment. The design doc already calls
   this primitive "the highest-value accent move on the page"; right now it
   reads as too small to register as that.
3. **Add a static per-card accent in the existing blue** — a 1–2px top
   border or corner bracket in `ACCENT_D`/`CROSS_D` on each of the 4 hero
   cards (`page.tsx:341-354`), present immediately on load, before the scene
   mounts. Directly fixes finding #5 using a colour the system already
   assigns the correct meaning to.
4. **Do not revive `ACCENT_L #1B7FC4`** — no light-ground consumer exists
   and the hero is dark-only; flagged only so nobody reaches for it by habit.
5. **`SIGNAL #ED510C` stays out of the hero entirely.** The one place the
   existing rule is unambiguous — worth defending, not softening.

---

## Priority-ordered action list

1. ~~Icons: swap nav glyphs for lucide-react~~ **DONE, `bbf3c20`.**
2. Static blue accent border/corner mark on each of the 4 hero cards
   (`page.tsx:341-354`) — fixes the most visible blank-box moment, no new
   colour introduced.
3. Raise alpha/weight on `CROSS_D`/`GRID_D` (`page.tsx:31-42, 234-242`) from
   0.08–0.4 to ~0.5–0.7 — one-line value tweaks, restores drafting-sheet
   texture that's currently too faint to register.
4. Add one supporting line of copy near the headline at a distinct, smaller
   weight (`page.tsx:298-316`) — a real two-level type hierarchy instead of
   headline-then-10px-mono-only.
5. Give `DimensionSpan` (`page.tsx:285-292`) more visual weight per the
   colour plan above.
6. Revisit `minHeight: 384` desktop density (`page.tsx:233`) — either add a
   secondary element or explicitly confirm with the owner that the emptiness
   is wanted, since nothing in-band currently signals it's a choice.
7. Audit further icon opportunities (footer, forms, resource lists) once the
   nav swap has been lived with for a bit.
8. Fold the "why no orange in the hero" reasoning (already inline at
   `page.tsx:243-263`) into `docs/07-design-language.md` itself — that file
   doesn't currently mention the hero's specific exception, which is how a
   future pass "fixes" it back in by accident.

---

## What this is not

The hero's minimalism is not accidental or lazy — it's an argued, documented
design choice (see the `SILENT CHROME` comment at `page.tsx:243-263` and
`docs/07-design-language.md`'s two-accent rule), and the "dull" complaint is
valid as a first-impression problem without invalidating that underlying
logic. The fix is hierarchy and reused-meaning colour, not decoration, and
specifically not orange in a place that has nothing to conclude yet.
