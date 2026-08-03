<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

Before exploring this codebase, read `touchmatrix.md` at the repo root first — it's a dense reference map of routes, components, state, and dependency edges. It's cheaper than grepping the tree. Regenerate it (don't hand-edit) after any structural change — see its own "Staleness contract" section for exactly which changes trigger a rebuild.

Also read `DECISIONS.md` at the repo root before making changes that touch SEO/indexing, analytics/tracking, the lead-capture backend, campaign landing pages, or legal/compliance content — it records *why* past decisions were made and what they constrain (e.g. domain hardcoding, which pages are deliberately noindexed, the chosen email/analytics providers, deferred legal work). Treat it as load-bearing context, not background reading.

Append a new dated entry to `DECISIONS.md` whenever you make or the user makes a decision that will constrain or surprise future work — a new architectural choice, a provider/vendor pick, a deliberately-deferred piece of work, a naming/URL convention, anything with a "why" that isn't obvious from the code alone. Don't rewrite or delete past entries; if a decision gets reversed, add a new entry noting the reversal and why. Routine implementation detail belongs in git history, not here — only log decisions that narrow future choices.

## Delegating to sub-agents

Split work by whether it needs judgement, and use a **cheaper model (Sonnet) for the half that doesn't**. Pass `model: "sonnet"` explicitly on the Agent call — without it the sub-agent inherits the parent model and the saving is lost.

**Delegate** (reproducible, verifiable against a spec): cloning a page or component to a new route, mechanical import/path rewrites, wiring an already-built component into existing markup, applying a numeric spec that has already been worked out, repetitive edits across many files.

**Keep** (a wrong answer here is a wrong deliverable, not a bug): camera angles and framing, materials, colour and lighting values, animation choreography and timing, copy, information hierarchy, and anything where "does this look right" is the acceptance test.

Instructions to a sub-agent must be closed, not open. State the exact file(s) it may touch and that it must not touch anything else — say which files you are editing concurrently, because two agents in one file will clobber each other. Give the actual numbers rather than the goal. Name the invariants it must preserve, and the things that will silently break if it forgets them (offsets that other code derives from, anchors that point at moved geometry). Tell it which pre-existing errors to ignore, or it will "fix" unrelated noise — in this repo there is currently NO such noise — `@types/three` (commit 83033c9) removed the `TS7016`/`TS7006` errors that used to fill `app/lab/**`, so `npx tsc --noEmit` is expected to be CLEAN. Telling an agent to ignore noise that no longer exists invites it to ignore a real error; say "tsc must be clean" instead. Require it to show its arithmetic and to run `npx tsc --noEmit`, and tell it explicitly to report honestly rather than claim a check it did not run.

**Always review the result — do not take the report at face value.** Sub-agents in this repo have reported work as complete and verified when it was not, and have reported fixes as missing when they were actually present on disk (stale dev-server output). Check the diff, re-run the arithmetic yourself, and look at the rendered page. Expect the gap to be at the *edges of the scope you gave it*: a correctly-executed instruction that left an adjacent part inconsistent, because you did not think to mention that part. Then iterate — send the follow-up to the same agent, or fix the edge yourself if it is a one-liner.


## Performance work on the 3D scenes

`PERFORMANCE.md` at the repo root is the running record of every optimisation applied to the WebGL vision scenes, what each one actually bought (measured), which hypotheses were **falsified**, and what is still open. Read it before touching scene setup, texture generation, lighting or the mount/lazy-load path — several obvious-looking optimisations in there were measured and found not to be the bottleneck, and the file exists so that work is not repeated.

Two standing rules from it: **never trust a dev-server timing** (React Strict Mode builds every scene twice and dev ships unminified), and **no entry goes in that file without a number**. Measure on a production build with `?perf` appended to the URL, then read `window.__visionPerf` / `__visionSplit` / `__visionDeep`.
