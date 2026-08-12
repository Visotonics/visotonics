# Visotonics website docs

For the founder, not the engineer. What's on the site, what state it's in, what changing it costs.

Verified against the actual `app/`, `components/` and `lib/` tree at time of writing — not copied from old docs or from `touchmatrix.md` without re-checking.

## The docs

**Start here**

| # | File | Answers |
|---|---|---|
| 14 | `14-learnings.md` | The consolidated lessons — read this first if you're new |
| 1 | `01-whats-here.md` | What is this site, what are the products, what's live vs stub vs blank |

**The site**

| # | File | Answers |
|---|---|---|
| 2 | `02-products-and-scenes.md` | Every product section and every 3D scene — what it shows, what state it's in |
| 3 | `03-content-and-editing.md` | Where words/prices/legal text live, and what editing them touches |
| 4 | `04-change-risk.md` | If I change X, what else moves, and how risky is it |
| 5 | `05-run-and-ship.md` | How to preview it, review a scene, deploy, what breaks if you build wrong |
| 6 | `06-owed.md` | What's broken, unfinished, or parked right now |
| 7 | `07-design-language.md` | The visual system: colour and what each colour means, type, the drafting-sheet motif, spacing |
| 8 | `08-page-structure.md` | The section grammar product pages repeat, and the copy patterns that go with it |

**The 3D scenes**

| # | File | Answers |
|---|---|---|
| 9 | `09-scene-craft-and-learnings.md` | How the scenes are built, and the rules learned the hard way. The canonical engineering rulebook |
| 11 | `11-work-vision-plan.md` | The Work Vision rebuild spec |
| 12 | `12-scene-architecture-audit.md` | Dated audit of scene-code duplication. Historical — see 14 for the durable lessons |
| 13 | `13-concurrent-work-manifest.md` | Coordination record for two parallel work streams. Historical |

**The backend**

| # | File | Answers |
|---|---|---|
| 10 | `10-partner-portal.md` | **The backend reference.** Supabase, schema, auth, sessions, API routes, email, tests, security |
| 15 | `15-partner-portal-design-prompts.md` | Historical portal design briefs; the type-selection brief is superseded |
| 16 | `16-credentials-and-services.md` | Sanitized credential inventory, service configuration and rotation rules |

**Elsewhere in the repo**

| File | Answers |
|---|---|
| `../DECISIONS.md` | *Why* past decisions were made and what they constrain. Read before changing SEO, analytics, the lead backend, or the portal |
| `../PERFORMANCE.md` | Every 3D optimisation attempted, what it measured, and which hypotheses were falsified. No entry without a number |
| `../touchmatrix.md` | Dense machine-oriented map of routes, components, state and dependency edges. Regenerate, don't hand-edit |

## The one-paragraph version

Marketing site for a machine-vision company, four products (Viso Yard, Warehouse, Factory, Data). The headline feature is a set of real, working 3D animated scenes (vanilla three.js, not a template) that show the product "seeing" things — a truck's plate, a container's damage, a warehouse worker. Several more product sections exist as static diagrams with no 3D scene behind them. About a third of the site's planned pages (careers, investor relations, whitepapers, etc.) are placeholder "coming soon" cards. There is no CMS — every word of marketing copy is in code, and every change is a code change and a redeploy.

**The one exception is the partner portal.** `/client-portal` is now a real application with accounts, approval/rejection, NDA signing, deal registration and a database behind it — Supabase Auth and Postgres, with row-level security and a test suite. See `10-partner-portal.md`; use `16-credentials-and-services.md` to verify a deployment.
