# Credentials and service configuration

This is the operational inventory for the site and partner portal. It names
configuration only. **It intentionally contains no secret values.** Put values
in local `.env.local` or the Netlify environment UI, never in this document,
source control, tickets, screenshots or chat.

## Immediate security action

A Supabase secret key was exposed in an earlier working conversation. Rotate
that key in Supabase **before the next public deployment**, replace it in
Netlify and local `.env.local`, then invalidate the old key. The publishable
key is designed to be public; the secret key is not.

## Where values live

| Place | Holds | Rule |
|---|---|---|
| `.env.local` | Local development values | Gitignored; never commit |
| Netlify site environment variables | Production and preview runtime values | Source of truth for deployed functions |
| Supabase dashboard | Project keys, Auth redirects, SMTP | Do not copy secret keys into the repo |
| Resend dashboard | API keys, sending domains, SMTP credential | Use separate least-privilege keys for app mail and Supabase SMTP |

## Variables used by the application

| Variable | Visibility | Used for | Required |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL | Partner portal |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Browser Supabase client | Partner portal |
| `SUPABASE_SECRET_KEY` | Secret | Server-only partner and deal writes; bypasses RLS | Partner portal |
| `RESEND_API_KEY` | Secret | App-originated lead, approval and NDA emails | Any app email |
| `LEAD_NOTIFICATION_EMAIL` | Internal address | Contact-form recipient and portal-admin fallback | Lead notifications |
| `LEAD_FROM_EMAIL` | Sender address | Lead and portal-mail fallback | App email |
| `PARTNER_NOTIFICATION_EMAIL` | Internal address | Portal registration notice recipient; overrides `LEAD_NOTIFICATION_EMAIL` | Recommended for portal |
| `PARTNER_FROM_EMAIL` | Sender address | Portal-mail sender; overrides `LEAD_FROM_EMAIL` | Recommended for portal |
| `NEXT_PUBLIC_GA_ID` | Public | GA4 measurement | Analytics only |
| `NEXT_PUBLIC_LINKEDIN_PARTNER_ID` | Public | LinkedIn Insight Tag | Analytics only |

Compatibility aliases `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY` are accepted by `lib/supabase/env.ts`, but new
configuration should use the publishable/secret names above. Never set both
names to different values.

Test-only values are local and must not be placed in Netlify:
`PORTAL_E2E=1`, `PORTAL_BASE_URL`, and `PORTAL_TEST_EMAIL_DOMAIN`.

## Service settings

### Supabase

- Project ref: `hgyxuhdaapprxtnrcjlj`.
- Public project URL: `https://hgyxuhdaapprxtnrcjlj.supabase.co`.
- Configure the Site URL for the deployed site and allow these redirects:
  - `https://visotonics.com/client-portal/auth/callback`
  - the deployed preview callback URL when testing previews
  - `http://localhost:3000/client-portal/auth/callback` for local development
- Custom SMTP uses Resend. Store the SMTP credential in Supabase only. It is
  separate from `RESEND_API_KEY` used by this application.
- Migrations `0001` through `0004` are applied manually in Supabase and are
  already applied to the production project.

### Resend

- The application sends through `RESEND_API_KEY`.
- Supabase Auth sends confirmation and reset mail through its own Resend SMTP
  configuration. Use a distinct Resend key/SMTP credential so either path can
  be rotated independently.
- The established sending domain is `visotonics.ai`; any `from` address must
  be verified in Resend before mail can be delivered.
- Portal notices currently resolve recipients as follows:
  registration -> `PARTNER_NOTIFICATION_EMAIL` or `LEAD_NOTIFICATION_EMAIL`;
  approval/rejection/NDA receipt -> partner account email; NDA signature ->
  approving admin, with the same shared-inbox fallback.

### Zoho

Zoho is not connected yet. The future integration expects server-only values
named `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET` and `ZOHO_REFRESH_TOKEN`; do not
create them until access is supplied. `lib/partner-crm.ts` is currently a
no-op seam and registrations are already durable in Supabase.

## Deployment checklist

1. Rotate the exposed Supabase secret key, then set the replacement in
   Netlify as `SUPABASE_SECRET_KEY`.
2. Set the two public Supabase variables and all required Resend variables in
   Netlify for production and any preview environment that tests the portal.
3. Confirm Supabase Auth Site URL, redirect allow-list and custom SMTP.
4. Confirm the Resend sender domain/address and the notification inbox.
5. Run `npm test`; run `PORTAL_E2E=1 npx vitest run` only against an intended
   test environment because it creates and removes real accounts.
6. Perform a real registration, confirmation, approval, NDA signing and deal
   submission after deploy.

## Ownership and rotation

There is no owner recorded in the repository for Supabase, Resend, Netlify,
Zoho or analytics. Assign a named business owner and a backup outside this
file. Rotate a secret immediately if it appears in source control, a public
log, screenshot or chat; update only the service dashboard and deployment
environment, not this document.
