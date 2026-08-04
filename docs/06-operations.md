# Operations — how to run and review this site

What this is: the practical "how do I see this running" doc. For anyone who needs to preview a change, review a 3D scene, or understand deploy/env setup.

## Running it locally

```
npm run dev      # dev server, http://localhost:3000
npm run build    # production build
npm run start    # run the production build (after `build`)
npm run lint     # eslint
```

A saved launch config exists at `.claude/launch.json` (used by the Claude Code preview tooling) with two entries:

| Config name | Command | Port |
|---|---|---|
| `visotonics-dev` | `npm run dev` | 3000 |
| `visotonics-prod` | `npm run start` | 3111 |

## Reviewing a specific 3D scene

Each of the 8 flagship product scenes (plus a few homepage-only ones) has a standalone review page under `/lab/*` — see `04-animations.md` for the full list and routes. These pages are not linked from the real site and are excluded from search indexing; they exist purely so a scene can be looked at in isolation, at a fixed aspect ratio, without scrolling through the full product page.

Most scenes support pausing the animation at a specific point via a URL parameter: `/lab/<scene>?phase=0.5` (0 to 1, where the loop starts/ends). Confirmed present on essentially every scene by grep (see `04-animations.md` for the exact list) — use it rather than trying to screenshot a moving loop at the right moment.

## Known trap: rebuilding under a running server

`next start` reads the build manifest **at boot**. Running `next build` while a server (`npm run start`) is live leaves that server serving chunk filenames that no longer exist — the page shell loads fine but the JS 404s. A browser reload does **not** fix it. The server must be fully stopped and restarted after every build. This is not written down in `PERFORMANCE.md` or elsewhere in the repo, but it is verified operationally — it has repeatedly bitten people, including cases where a landed change looked like it "hadn't landed" when it was on disk the whole time and the server was just serving a stale manifest.

Separately, and also true: **dev-server timings are never trustworthy for performance work** (documented in `PERFORMANCE.md`), because React Strict Mode builds every 3D scene twice in dev, and dev ships unminified code — any performance measurement must be taken on a production build (`npm run build && npx next start`, restarted per the trap above), not `npm run dev`.

## Deploy target

**Not determinable from this repo.** There is no `vercel.json`, no Netlify config, no Dockerfile, and no `.github/` CI/CD workflow present at time of writing. The hosting/deploy pipeline is set up outside this codebase (or not yet set up) — check with whoever manages infrastructure rather than assuming a target.

## Environment variables

All are optional and the app degrades gracefully without them (confirmed by reading `app/api/lead/route.ts` and `components/analytics/tracking-scripts.tsx` directly — names only, no values referenced or included here):

| Variable | Used for |
|---|---|
| `RESEND_API_KEY` | Sending lead-capture emails via Resend. If unset, leads are just logged to the server console instead of emailed. |
| `LEAD_NOTIFICATION_EMAIL` | Where lead-capture emails get sent |
| `LEAD_FROM_EMAIL` | From-address for lead emails (falls back to a default `onboarding@resend.dev` address if unset) |
| `NEXT_PUBLIC_GA_ID` | Google Analytics 4 |
| `NEXT_PUBLIC_LINKEDIN_PARTNER_ID` | LinkedIn Insight Tag |

A `.env.local` file exists in the repo working copy but its contents were not read (per this doc's own rule: never include secret values, only names — and this file is gitignored local config, not a checked-in example). No `.env.example` file exists in the repo to double-check names against; the list above comes from a repo-wide grep for `process.env.*`.

## Analytics / consent gating

Both GA4 and the LinkedIn Insight Tag are gated behind a cookie-consent banner (`components/analytics/consent-banner.tsx`) — they do not load until the visitor accepts. Consent state is stored in `localStorage` under the key `viso-cookie-consent`, and a `viso-consent-change` custom browser event notifies the tracking script when to (un)load.

## No feature flags

Nothing in the codebase behaves differently based on a feature-flag system — none exists.
