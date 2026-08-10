# Partner portal — design prompts, in the industrial-materialist system

**Purpose.** Ready-to-dispatch prompts for a design-capable Claude agent, one
per portal surface. Each is self-contained: hand it the COMMON BRIEF plus its
own section. Drafted 2026-08-08 against the pages as built (the portal stream's
files under `app/client-portal/**`).

**The unifying idea, before any page:** the portal is where a partner is
*measured and admitted* by the system. The site already has a visual grammar
for exactly that — Document Vision's pre-placed table that fills field by
field, the detection bracket that locks onto a subject, the shift register
that accumulates rows. Onboarding should feel like **being read by the
system**, not like filling in a web form. Every prompt below applies that one
idea to its page.

---

## COMMON BRIEF (prepend to every prompt)

You are restyling a page of the Visotonics partner portal into the site's
design language. Read `docs/07-design-language.md` IN FULL first, then
`app/client-portal/_shared.tsx` (the portal's existing tokens — extend it,
don't fork it). Rules that bind every page:

1. **Dark-led.** Canvas `#0a0b0e`, surface `#101216`, hairline borders. The
   portal is an instrument, not a brochure.
2. **Two accents, each with one job.** Blue `#5CC8FF` = the system observing:
   step indicators, focus states, status-in-progress, brackets, grid
   annotations, eyebrows. Orange `#ED510C` (SIGNAL) = a conclusion: **at most
   ONE orange element per screen**, placed where the decision lives — never
   spread as decoration. Amber `#FFB020` is the *label* tier of warm — use it
   for warning/error TEXT (a name), never for marks. There is no red anywhere
   on this site; do not introduce one.
3. **Type.** Archivo for display/body/UI; IBM Plex Mono for anything that
   reads as instrument output — eyebrows (13px, uppercase, 0.08em tracked),
   log rows (14px, no transform), corner numerals. A readout is either
   **instrumentation** (10–13px mono, 40–60% ink, on a 1px accent rule) or
   **a claim** (display sans, solid white, no shadow) — decide which before
   styling any number or status.
4. **Drafting-sheet primitives** (see `app/platform/viso-yard/_shared.tsx`):
   hairline verticals, 9px registration crosses at real grid intersections,
   `DimensionSpan`-style measured rules under headings, mono eyebrows as the
   sheet's annotation voice. Use them structurally, not as sprinkles.
5. **Buttons.** Primary CTA = the site's white pill (match the site chrome).
   Orange is never a button fill; it appears as a 2px rule down the left edge
   of the one decisive element, or as the selected-state mark. Ghost/secondary
   = 1px hairline border, text at 70% ink.
6. **Inputs.** Label = mono eyebrow ABOVE the field (not placeholder-as-label).
   Field: `#101216` surface, 1px `rgba(226,234,244,0.14)` border, 2px radius.
   Focus = blue border (the system observing this field). Error = amber
   message text below, field border stays neutral. No glows, no shadows.
7. **Spacing.** 8px base; card padding 32/24; don't invent new scales.
8. **Do not touch behaviour.** Handlers, fetches, routing, validation and the
   server contracts belong to another workstream. Restyle markup and CSS only;
   if a visual idea needs a structural change, note it in your report rather
   than rewiring logic.
9. Report anything the design language doesn't cover rather than inventing a
   new pattern silently.

---

## 1 — Partner type selection (`onboarding/partner-type/type-form.tsx`)

**The emotional job:** a one-time, irreversible declaration. It currently
looks like a form; it should feel like **the system locking onto what you
are.**

- The "Step 1 of 2" line becomes an instrumentation register, top-left: mono,
  uppercase, on a 1px blue rule — `ONBOARDING · STEP 1 / 2`. Not a progress
  bar; a log line.
- The three radio cards become **numbered plates on the sheet**: mono corner
  numeral (`01` `02` `03`, blue, 13px) top-left of each, title in Archivo,
  blurb as caption at 60% ink. Kill the browser radio entirely.
- **Selection = detection lock.** Hover: four corner brackets fade in around
  the card in blue (the hero-card hover grammar — the system considering).
  Selected: the brackets snap to full opacity and a 3px registration dot at
  the numeral turns SIGNAL orange — the screen's ONE orange, because the
  choice is the conclusion. Unselected cards drop to 80% opacity.
- The irreversibility note is a mono footnote under the cards at 50% ink —
  stated like a spec tolerance, not shouted like a warning banner.
- Primary button (white pill) sits right-aligned under the cards; disabled
  until a card is locked.
- Bracket corners are drawn with 2px strokes ~18px arms — borrow the exact
  proportions from the scene brackets so the two read as one system.

**Acceptance:** at rest the page has zero orange; after selection exactly one
orange mark exists; the step register reads before the heading does.

## 2 — NDA signing (`onboarding/nda/nda-form.tsx`)

**The emotional job:** the densest, most intimidating screen. Reframe it with
Document Vision's grammar: **a document being read, and a table of
acknowledgements filling in.**

- Step register as page 1: `ONBOARDING · STEP 2 / 2`.
- The 300px scroll panel becomes **the document as an object**: the portal's
  one LIGHT surface — near-paper ground (`#ecedef` family, `.on-light`
  tokens), dark serifless text, generous inner margin, a hairline frame. It
  should read like Document Vision's BOL sheet sitting on the dark bench of
  the page. Scrollbar styled thin and neutral.
- The PDF button: ghost, mono label (`PDF ↓` or similar), sitting on the
  document's top-right corner like a drawing-number block — secondary by
  construction.
- **The 5 checkboxes become an extracted-fields table.** Pre-placed rows,
  each: mono key text at 60% ink, a right-aligned state cell that reads `—`
  until checked and a blue `ACKNOWLEDGED` (mono, 12px) once checked. The
  actual checkbox control is a small 14px square with a blue check — but the
  ROW is the visual unit, with a 1px rule between rows. The table fills as
  the partner reads; the em-dash → value flip is the Document Vision beat.
- The two text fields (name/title) form a **signature block** at the bottom:
  side-by-side, mono eyebrows `FULL LEGAL NAME` / `TITLE`, the field text
  itself in Archivo at body size.
- The submit is the screen's ONE orange placement: white pill button with a
  2px SIGNAL rule down its left edge — the conclusion of onboarding. Disabled
  until all five rows read ACKNOWLEDGED and both fields are non-empty (the
  existing logic already enforces this — style the states, don't rewire).

**Acceptance:** the scroll panel reads as paper on a dark bench; the
acknowledgement table visibly "fills"; exactly one orange element.

## 3 — Partner dashboard (`dashboard/page.tsx`)

**The emotional job:** the landing surface — the partner is INSIDE now. It
should read like the site's platform pages, not like an app shell.

- Header: the partner's company name as the heading, and above it a mono
  status register: `CHANNEL PARTNER · ACTIVE · <date>` (type from
  `PARTNER_TYPE_LABELS`, blue, on a 1px rule). Sign-out stays as a ghost in
  the top-right.
- A `DimensionSpan`-style measured rule under the heading — the portal's
  first true drafting-sheet moment.
- The three action cards go on the drafting grid: mono corner numerals
  `01`–`03`, Archivo titles, caption blurbs at 60% ink, generous 32px
  padding, hairline borders. Hover = blue corner brackets (same spec as the
  type cards) + title shifts to full white.
- **"Register a deal" is the money action** — it alone carries a 2px SIGNAL
  rule down its left edge, permanently. That is the screen's one orange.
  The other two cards stay entirely neutral-plus-blue.
- If vertical hairlines can run the sheet behind the cards without fighting
  the card borders, add them at the standard five x-positions; drop them if
  they clutter at this width.

**Acceptance:** reads as a continuation of the marketing site's drawing
language; one orange edge; hover brackets identical to the type-selection
cards (one system, two pages).

## 4 — Pending state (`dashboard/page.tsx`, pending branch)

**The emotional job:** waiting without anxiety. The house answer:
**telemetry, not apology.**

- No illustration, no sad empty state. A shift-register-style plate
  (Work Vision's grammar): mono rows on a dark surface with a 2px blue rule
  down the left edge —

      APPLICATION      SUBMITTED   ✓
      NDA              SIGNED      ✓
      REVIEW           IN PROGRESS

  Completed rows at full ink with blue check marks; the pending row's value
  in blue (the system is observing it) at 70% ink. Nothing pulses, nothing
  spins — a static instrument reading is the whole point.
- One caption line below in Archivo: what happens next and roughly when, at
  60% ink.
- Zero orange on this screen — there is no conclusion yet, and that absence
  is the design.

## 5 — Rejected state (`dashboard/page.tsx`, rejected branch)

**The emotional job:** a conclusion, delivered plainly. This is exactly what
SIGNAL orange exists for — and the one place a "negative" state uses it.

- The bordered box becomes a conclusion plate: dark surface, **2px SIGNAL
  rule down the left edge**, mono eyebrow `DECISION` in amber `#FFB020` (the
  label tier — a name), the reason itself in Archivo body at full ink.
- No red, no error iconography, no softening illustration.
- Below, a ghost button to contact partnerships — the next move offered at
  normal weight, not begged.

**Acceptance:** the plate reads exactly like a scene callout that delivered a
finding: eyebrow-as-label (amber), mark-as-edge (orange), body-as-fact.

## 6 — Admin queue (`admin/page.tsx`)

**The emotional job:** an operator's instrument. Utility IS the aesthetic —
style it as pure instrumentation and explicitly relax the one-orange rule
(this is an internal panel, not a narrative screen).

- The plain HTML table becomes a mono register: column headers 12px
  uppercase tracked at 50% ink, rows 14px mono no-transform, 1px rules
  between rows only (no vertical rules, no zebra), generous 12px row
  padding. Timestamps and emails stay mono; company names may take Archivo
  at the same size for scanability.
- Status column as text, not pills: `PENDING` blue, `APPROVED` 60% ink,
  `REJECTED` amber. No badges, no rounded chips.
- The approve control: ghost button per row, hairline border; its
  hover/confirm state may take the orange edge. Keep it visually smaller
  than the row text — an operator switch, not a CTA.
- Header: `PARTNER QUEUE · <count> PENDING` as a mono eyebrow over the
  table, count in blue.

## 7 — New password (`reset-password/update/update-form.tsx`)

Small surface, so: the COMMON BRIEF's input spec applied exactly, an eyebrow
`CREDENTIALS · RESET` over the heading, two fields stacked with mono labels,
white-pill submit. No orange anywhere — resetting a password is not a
conclusion. If a strength hint exists, it renders as a mono caption at 50%
ink, never as a coloured meter.

## 8 — Restyle pass: sign-in, register, reset-password

These exist and function; align them to the grammar the pages above
establish, changing as little structure as possible:

- Same input spec (mono eyebrow labels, focus-blue, amber error text).
- Same white-pill primary; links as 70%-ink text with underline on hover.
- Each page gets one mono eyebrow naming the surface (`PARTNER PORTAL ·
  SIGN IN`) over the heading — the portal's pages should feel like
  consecutive sheets of one drawing set.
- The card/sheet that holds each form: `PortalSheet` in `_shared.tsx` is the
  place to make the change once — hairline border, 2px radius, dark surface,
  and a single registration cross at its top-left grid intersection as the
  set's quiet signature.

---

## Dispatch notes (for whoever runs these)

- One agent per prompt is fine; they share `_shared.tsx`, so EITHER serialise
  the `_shared.tsx` edits OR have the first agent land the shared token/
  bracket/register components and the rest consume them. The corner-bracket
  and register-plate components should be built ONCE in `_shared.tsx` — five
  pages use them.
- The portal stream owns these files' behaviour. Coordinate before
  dispatching: restyle-only, no handler changes, and `docs/13`'s conflict
  notes apply.
- Visual acceptance is against `docs/07` + this file, on a production build,
  page by page — the same screenshot-critique loop used on the scenes.

---

## Changed since these prompts were drafted (2026-08-08, later)

The prompts remain structurally valid — same files, same screens. Four
details moved underneath them:

1. **Partner type names are now the real ones.** Distribution Partner /
   System Integrator / Channel Partner, not Distributor / Integrator /
   Referral. Copy comes from `PARTNER_TYPE_LABELS` and `PARTNER_TYPE_BLURBS`
   in `lib/partner.ts` — don't hardcode it into the components.

2. **Both onboarding steps gained a sign-out control** in a bordered footer.
   It is not decoration: without it a partner mid-onboarding has no way out
   of the portal at all, because the dashboard's sign-out is unreachable
   until onboarding completes. Restyle it, don't remove it.

3. **The register form lost its partner-type dropdown** — three fields only.
   Type is chosen after approval. The remaining `<select>` styling notes in
   the register prompt no longer apply.

4. **The admin queue gained a Status column with sub-states** — "NDA signed
   — you approved them", "NDA outstanding", "choosing partner type", and the
   stored rejection reason on rejected rows. The prompt's `PENDING` /
   `APPROVED` / `REJECTED` treatment needs to accommodate a second line of
   smaller text per row.

Also worth knowing before dispatching: **none of these screens has ever been
rendered below desktop width.** The admin table has `overflow-x: auto` and an
860px min-width so it scrolls rather than breaks, but that is damage control,
not a responsive design. Mobile is unexplored territory, not a regression.
