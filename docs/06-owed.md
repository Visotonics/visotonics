# What's owed right now

Known-broken or unfinished things visible in the codebase today. For prioritizing what to fix next.

## No 3D scene, static diagram instead

Four product sections (Audit Vision, Dimension Vision, Secure Vision, Production Vision) show a static SVG diagram where a 3D scene like the other 8 would go. See `02-products-and-scenes.md`. This is the single biggest visible gap between "what the site implies" and "what's actually built."

## Homepage background video — waiting on one file drop

The homepage "Statement" section is built to show real annotated inspection footage as a background video, but the footage hasn't been produced yet. Today it shows a static poster image instead — the code is fully wired (lazy-loads on scroll, respects reduced-motion, falls back cleanly) and needs only the actual video files dropped in, no code change, once footage exists.

## Client portal — UI with nothing behind it

Login, register, and reset-password pages are built and look finished but have no real authentication — no accounts, no sessions. Anyone landing there sees a convincing mockup. Needs a real backend before it can be linked from anywhere real.

## 11 stub pages + 1 blank page

Careers, Newsroom, Investor relations, Partners, Sustainability, Testimonials, ROI calculator, Whitepapers, Webinars, Documentation, Glossary, Press kit all show a placeholder "coming soon" card. Case studies is worse — it's a genuinely blank page with no placeholder at all.

## ASCII Hero — parked, not shipped

A background visual effect under active tuning, live only on its internal review page. No committed plan to ship it; treat as exploratory.

## Broken anchor links (small, pre-existing)

- Offices page links to a section on itself that doesn't exist.
- Client-portal pages link to sections that don't exist.
- Industries page's four chapters have no anchors, so they can't be linked to directly from anywhere (e.g. an email or ad that wants to jump straight to one).

## One scene skips the shared performance optimization

Gate Vision doesn't reuse the site's shared metal-material/texture system the way the other 7 scenes do, so it pays a real extra cost on every load instead of sharing cached work. Fixable by bringing it in line with the other scenes; not a visual bug, a performance one.

## No deploy pipeline visible in the repo

Nothing in the codebase shows where or how the site is actually hosted/deployed — no config for any hosting provider, no CI/CD file. Either it lives outside this repo or it isn't set up yet; worth confirming with whoever owns infrastructure.

## Legal pages haven't been re-reviewed here

Privacy policy and Terms & Conditions are live and presumably functional, but any wording change to either is flagged as a legal-review item in this repo's own conventions — check `DECISIONS.md` (repo root) for any noted deferred legal work before assuming they're final.
