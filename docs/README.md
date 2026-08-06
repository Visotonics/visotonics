# Visotonics website docs

For the founder, not the engineer. What's on the site, what state it's in, what changing it costs.

Verified against the actual `app/` and `components/` tree at time of writing — not copied from old docs or from `touchmatrix.md` without re-checking.

## The 9 docs

| # | File | Answers |
|---|---|---|
| 1 | `01-whats-here.md` | What is this site, what are the products, what's live vs stub vs blank |
| 2 | `02-products-and-scenes.md` | Every product section and every 3D scene — what it shows, what state it's in |
| 3 | `03-content-and-editing.md` | Where words/prices/legal text live, and what editing them touches |
| 4 | `04-change-risk.md` | If I change X, what else moves, and how risky is it |
| 5 | `05-run-and-ship.md` | How to preview it, review a scene, deploy, what breaks if you build wrong |
| 6 | `06-owed.md` | What's broken, unfinished, or parked right now |
| 7 | `07-design-language.md` | The visual system: colour and what each colour means, type, the drafting-sheet motif, spacing, dark/light grounds |
| 8 | `08-page-structure.md` | The section grammar product pages repeat, and the copy patterns that go with it |
| 9 | `09-scene-craft-and-learnings.md` | How the 3D scenes are built, and the rules learned the hard way — including performance dead ends |

## The one-paragraph version

Marketing site for a machine-vision company, four products (Viso Yard, Warehouse, Factory, Data). The headline feature is 8 real, working 3D animated scenes (vanilla three.js, not a template) that show the product "seeing" things — a truck's plate, a container's damage, a warehouse worker. Four more product sections (Audit, Dimension, Secure, Production) exist as static diagrams with no 3D scene behind them at all. About a third of the site's planned pages (careers, investor relations, whitepapers, etc.) are placeholder "coming soon" cards. There is no CMS — every word of copy is in code, and every change is a code change and a redeploy.
