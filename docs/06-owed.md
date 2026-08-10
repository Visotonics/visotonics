# What's owed right now

Known-broken or unfinished things visible in the codebase today. For prioritizing what to fix next.

## No 3D scene, static diagram instead

Four product sections (Audit Vision, Dimension Vision, Secure Vision, Production Vision) show a static SVG diagram where a 3D scene like the other 8 would go. See `02-products-and-scenes.md`. This is the single biggest visible gap between "what the site implies" and "what's actually built."

## Work Vision — COMPLETE (2026-08-08)

All three acts now meet the act standard in `11-work-vision-plan.md`: a real
camera in the world (all three from ONE `makeActCam` factory — the same
housing, bolted to a rack arm, a dock wall, and a low ceiling), a sight cone
tracking the walker in every act, the bracket, dressing with real identifying
features (lattice racking / part-raised shutter + leveller / bench frames +
lipped totes + roller deck), and motivated light from the shared pendant
builder in every act. The re-identification story runs end to end: register
rows accumulate per act and the resolve line lands in act 3.

The act-3 build recorded one structural lesson worth keeping: **a low ceiling
and a pendant over the walk line are in geometric tension** — the ceiling is
always nearer the lamp than the floor is, so no light-distance cutoff can
stop the ceiling pool; the fix is raising the ceiling, a near-black ceiling
material, and letting the visible-band geometry do the real work.

## Two copy/colour inconsistencies left by the crane pass

- The Crane Vision ledger still reads **"Severity heatmap; high severity alerts
  a surveyor for immediate review."** The heatmap was removed on review. Either
  the copy changes or the heatmap comes back — do not leave both.
- Crane's `Dent · 0.84` callout title is warm while its bracket is blue, so a
  label and its own mark disagree in colour. See `07-design-language.md`.

## Homepage background video — waiting on one file drop

The homepage "Statement" section is built to show real annotated inspection footage as a background video, but the footage hasn't been produced yet. Today it shows a static poster image instead — the code is fully wired (lazy-loads on scroll, respects reduced-motion, falls back cleanly) and needs only the actual video files dropped in, no code change, once footage exists.

## Client portal — BUILT (2026-08-08), not yet deployed

*Entry was "UI with nothing behind it". That is no longer true.* The portal has
real Supabase auth, a Postgres database with row-level security, an approval
and rejection workflow, an NDA signing flow with a stored signature record, an
admin audit log, four notification emails, and a test suite. Verified end to
end against the live Supabase project. Full reference in `10-partner-portal.md`.

What is still owed on it:

- **Netlify environment variables are unset** — production renders "not
  configured". Nothing works publicly until these are added. *Blocking.*
- **Custom SMTP in Supabase, pointed at Resend.** Supabase's built-in sender
  allows roughly two emails an hour and only to team addresses, so real
  registration cannot complete without this. *Blocking.*
- **The NDA text is a placeholder.** `lib/nda.ts` and
  `public/legal/visotonics-partner-nda.pdf` are scaffolding written to build
  the flow, explicitly not lawyer-reviewed. Must be replaced before any real
  partner signs, and `NDA_VERSION` bumped when it is. *Blocking for real use.*
- **Dashboard content doesn't exist.** All three actions — Register a deal,
  Partner resources, Request support — are "Coming soon" cards.
- **Zoho is still a stub.** Interface and no-op implementation only; still
  waiting on credentials. Registrations are recorded in Postgres with
  `crm_synced_at` null so they can be backfilled later.
- **Design pass outstanding** on the seven new screens, and none of them have
  ever been rendered below desktop width.
- **Six demo accounts exist** sharing one password, several carrying NDA
  signature records against the placeholder text. Delete before launch.

## 11 stub pages + 1 blank page

Careers, Newsroom, Investor relations, Partners, Sustainability, Testimonials, ROI calculator, Whitepapers, Webinars, Documentation, Glossary, Press kit all show a placeholder "coming soon" card. Case studies is worse — it's a genuinely blank page with no placeholder at all.

## ASCII Hero — parked, not shipped

A background visual effect under active tuning, live only on its internal review page. No committed plan to ship it; treat as exploratory.

## Broken anchor links (small, pre-existing)

- Offices page links to a section on itself that doesn't exist.
- Client-portal pages link to sections that don't exist.
- Industries page's four chapters have no anchors, so they can't be linked to directly from anywhere (e.g. an email or ad that wants to jump straight to one).

## Gate Vision's texture cost — FIXED, entry was stale

This used to read "Gate Vision doesn't reuse the site's shared
metal-material/texture system." That has not been true for some time:
`gate-vision/materials.ts` caches all five of its textures at module scope and
generates them at idle via `warmGateTextures()`, and it does import `makeMetal`.
See PERFORMANCE.md #32 (build 391 -> 76 ms cold) and #39, which re-measured it
at ~157 ms on a loaded machine with its internal marks reading
`containerMats 0 / gateMats 0 / buildGate 75`.

Left here as a note rather than deleted, because this entry was acted on twice
as though it were live work.

## The detection camera — DONE, all five scenes on the shared rig

`_vision/readCamera.ts` is the standard and **cargo, work, tank, gate and crane
are all migrated onto it** (2026-08-08). The rig owns the live apex, the
`atan(radius / range)` half-angle, the aim-vs-length decoupling and the
accent->SIGNAL flip; scenes keep their own mounts.

Three things the migration itself taught, all now encoded as options rather
than as constants someone has to remember:

- `headTracks` — cargo, gate and crane are BOLTED DOWN; only their cones move.
  A rig that always swivelled would have silently changed three signed-off
  scenes.
- Full geometry parameterisation (`bodyY`, `hoodR/Len/Z`, `yokeSize`,
  `bodyYaw`, `lensAxis`). A shared builder that forces a house silhouette gets
  refused by every finished scene; two migrations stalled on exactly this until
  the options existed.
- `lensObject` — crane keeps its own absolutely-positioned housings and hands
  the rig its glass. Taking the machinery without the geometry is a legitimate
  way to be on the rig.

**Closed same day:** work-vision acts 2 and 3 now carry cameras — built exactly
as prescribed, as configs of act 1 through one `makeActCam` factory rather than
as new rigs. See the Work Vision entry above.

## Container Vision's inline studio — FIXED

Container used to hand-roll the renderer, the five-light rig, the cyclorama, the
bloom pass and the callout DOM instead of using `createStudio` + `overlay.ts`.
That copy had drifted and carried three live defects: a cyclorama shader missing
`#include <colorspace_fragment>` (backdrop at ~1/8 authored brightness), leader
lines at the 1.5px/45% value already established as invisible on dark ground,
and a dispose that traversed and killed every geometry it reached with no
`userData.shared` guard. Migrated 2026-08-08; the file went 869 → 648 lines.

## No deploy pipeline visible in the repo

Nothing in the codebase shows where or how the site is actually hosted/deployed — no config for any hosting provider, no CI/CD file. Either it lives outside this repo or it isn't set up yet; worth confirming with whoever owns infrastructure.

## Legal pages haven't been re-reviewed here

Privacy policy and Terms & Conditions are live and presumably functional, but any wording change to either is flagged as a legal-review item in this repo's own conventions — check `DECISIONS.md` (repo root) for any noted deferred legal work before assuming they're final.
