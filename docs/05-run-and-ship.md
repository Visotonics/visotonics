# Run and ship

How to preview a change, look at a specific 3D scene, and what to know before/after a deploy. For anyone (technical or not) who needs to see something running, or is briefing an engineer on shipping it.

## Running it locally

```
npm run dev      # start the dev preview, http://localhost:3000
npm run build    # build for production
npm run start    # run the production build (after build)
npm run lint     # code-quality check
```

A saved preview shortcut exists for two setups: a dev server (port 3000) and a production-build server (port 3111).

## Looking at one 3D scene in isolation

Every one of the 8 flagship scenes (plus a couple of homepage-only ones) has its own standalone review page at `/lab/<scene-name>` — not part of the real site, not indexed by Google, exists purely so a scene can be checked at a fixed size without scrolling a full product page. See `02-products-and-scenes.md` for the full list of routes.

Most scenes support freezing the loop at a specific point: add `?phase=0.5` to the URL (0 to 1) instead of trying to catch a moving animation with a screenshot.

## A trap worth knowing about

If a production server (`npm run start`) is left running while someone rebuilds (`npm run build`) on the same machine, the running server keeps serving old file references that no longer exist — the page loads but breaks. A browser refresh does not fix this; the server has to be stopped and restarted after every build. If a "landed" change ever looks like it didn't take effect, this is the first thing to check before assuming the change is missing.

Separately: **timings measured on the dev server (`npm run dev`) are never a reliable read on real-world speed** — dev mode double-builds every 3D scene and ships unminified code. Any performance claim should come from a production build, not dev.

## Deploy

The site is deployed through **Netlify's automatic Next.js detection**; there
is intentionally no `netlify.toml` or checked-in CI workflow. The Netlify site
settings decide the production branch, build command, environment variables and
custom domain.

Before treating a deploy as current, confirm all four things in Netlify:

1. The site is connected to this repository and the intended production branch.
2. The latest successful deploy was built from the commit containing the scene
   changes, not an older interim-site commit.
3. The Netlify preview URL renders the expected scenes before changing DNS.
4. `visotonics.com` is attached to this Netlify site, not the interim site.
   A custom domain can only belong to one site at a time; detach it from the
   interim site before assigning it here, then follow Netlify's DNS records.

If Supabase login works but the scenes do not, that proves only that the
environment variables reached a deploy. Check the deploy's commit, build log,
and browser console/network requests for missing Next static chunks before
changing scene code. The local production build mounted the Viso Yard scenes
on 2026-08-11, so the reported public absence is a deployment/caching problem
until proven otherwise.

## Environment variables (names only — no values live here or should ever be pasted into a doc)

All optional; the site works without any of them, just with reduced functionality (no emailed leads, no analytics):

| Variable | What it controls |
|---|---|
| `RESEND_API_KEY` | Turns on emailed lead notifications. Unset = leads are only logged on the server, not emailed to anyone. |
| `LEAD_NOTIFICATION_EMAIL` | Which inbox lead notifications go to. |
| `LEAD_FROM_EMAIL` | The "from" address on lead emails (falls back to a generic default if unset). |
| `NEXT_PUBLIC_GA_ID` | Google Analytics. |
| `NEXT_PUBLIC_LINKEDIN_PARTNER_ID` | LinkedIn ad-tracking tag. |

## Analytics respects consent

Google Analytics and the LinkedIn tag do not load at all until a visitor accepts the cookie-consent banner — this is genuinely wired up, not just a banner for show.

## No feature flags

Nothing on the site behaves differently based on a flag system — there isn't one. Every visitor sees the same code path.
