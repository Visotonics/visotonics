# Visotonics website docs — index

What this is: a founder-readable map of the marketing/product website codebase. Not for engineers who already know the repo — for anyone who needs to find where something lives or how to check a change without reading code.

Source: verified against the actual `app/` and `components/` tree, cross-checked against `touchmatrix.md` (repo root), `DECISIONS.md`, `PERFORMANCE.md`. Corrections made to stale claims are noted inline in each doc.

## The 7 docs

| # | File | What's in it | Read it when... |
|---|---|---|---|
| 1 | `01-sitemap.md` | Every real page, what it's for, indexed or not, stub or live | You need to know what's actually on the site |
| 2 | `02-file-locations.md` | Directory map — what's in each folder | You're looking for where something lives |
| 3 | `03-dependency-map.md` | What imports what, "change this → N pages move" | You're about to change a shared file and want to know the blast radius |
| 4 | `04-animations.md` | Every 3D scene: what it shows, where it lives, loop length, how to review it | You want to see or discuss a specific animation |
| 5 | `05-content-copy.md` | Where headlines/claims/legal text/blog posts live, how to edit them | Marketing/legal wants to change wording |
| 6 | `06-operations.md` | Dev/build/run commands, env vars, deploy, review workflow, known traps | You (or an engineer) need to run or ship this |
| 7 | `07-touch-matrix.md` | Technical reference — routes → components → state → shared-cache hazards | An engineer is about to touch shared infrastructure |

## Quick facts

- Next.js 16.2.10 (App Router), React 19.2.4, TypeScript 5, Tailwind 4
- Dev server: `npm run dev` on port 3000
- 8 live 3D product scenes ("Vision" scenes), all real vanilla three.js (not react-three-fiber, not static graphics) — see `04-animations.md` for the note on "Secure Vision," which is not a 3D scene despite living in the same product family
- No login/auth system live yet (`/client-portal` is UI only)
- No CMS — all copy is hardcoded in `.tsx`/`.ts` files or small local data files
