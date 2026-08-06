# Change risk

If I ask for a change to X, what else moves, and how risky is it. For sanity-checking the size of a request before it's made — including briefing an engineer on what "small" actually means here.

## The rule that surprises people most: three product pages, not one

Viso Yard, Viso Warehouse and Viso Factory don't each own their sections independently. Some sections are literally shared code, reused across pages:

- **Document Vision** and **Cargo Vision** are Viso Yard's — Warehouse reuses them as-is.
- **Work Vision** and **Secure Vision** are Viso Warehouse's — Yard and Factory both reuse them.
- **Audit Vision, Dimension Vision, Work Vision, Secure Vision** are all reused on Viso Factory, sourced from Warehouse (which itself sourced two of those from Yard).

**Practical result:** editing Document Vision or Cargo Vision changes the Yard *and* Warehouse pages at once. Editing Work Vision or Secure Vision changes Yard, Warehouse *and* Factory at once — three pages from one edit. There is no way to word something differently for just one product on these sections without a code restructure first.

## Site-wide, one-file changes

These files are used in many places at once — a change to any of them is a site-wide visual/behavioral change, not a one-page tweak:

| Touching this... | ...changes | 
|---|---|
| The shared "coming soon" placeholder | All 12 unbuilt stub pages, at once |
| The shared 3D scene "engine" (lighting, camera, materials, mount logic) | All 8 flagship scenes, both homepage scenes, and all 12 review pages — every piece of 3D on the site |
| The shared decode/reveal text effect | The homepage and all three main product pages' hero titles |
| The lead-capture backend endpoint | The Contact page **and** every paid-campaign landing page |
| The nav's section-link logic | Every product page's dropdown menu — a renamed section on a page silently breaks its own nav link if this isn't updated too |
| Shared drafting-sheet visual styling / diagram-rendering used across product pages | Yard, Warehouse, Factory and Industries pages together |

## Cross-scene sharing within the 3D scenes themselves

Some of the 8 real scenes share underlying build blocks, not just visual style:

- Container Vision's core geometry/materials are reused by Tank, Gate, Crane and Cargo Vision — a change meant for "just the container" can ripple into four other scenes.
- The "detection sight-cone" visual (the cone/beam effect showing what the camera is looking at) is shared by the homepage hero cards and by Tank, Gate, Crane and Work Vision — six places from one definition.

**Rule of thumb for new scenes:** a new scene should reuse the site's one shared metal-material system rather than inventing its own — one existing scene (Gate Vision) didn't, and pays a real, measured extra cost on every page load as a result (see `PERFORMANCE.md` at repo root for the number, if useful for prioritizing a fix).

## Low-risk / isolated

- The scroll-driven-homepage prototype page — nothing on the live site imports it, and it imports nothing from the live site. Safe to experiment on freely; won't touch anything real.
- The homepage color-variant review page — a full standalone copy of the homepage for reviewing a possible color change. Doesn't touch the actual live homepage until someone manually ports the change over.

## Known dead code (safe to ignore, or safe to delete)

A few pieces of code exist with zero usage anywhere on the site — a button component, one text-effect variant, one unused export on a product page. Not causing any harm, just weight; low-priority cleanup, not a risk to touch.

## Pre-existing broken links (not caused by any recent work)

- The Offices page links to a section that doesn't exist on the page.
- The client-portal pages link to sections that don't exist.
- The Industries page's four chapter sections can't be linked to directly (no anchors set up).

See `06-owed.md` for the full list of what's currently broken or unfinished.
