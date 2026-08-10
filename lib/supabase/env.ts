/* ---------------------------------------------------------------------------
   Supabase env-var resolution, in one place.

   Supabase renamed its keys: new projects issue `sb_publishable_…` /
   `sb_secret_…`, older ones issue the `anon` / `service_role` JWTs. They are
   the same two arguments either way, so accept both names rather than making
   whoever sets up the environment know which era their project is from.

   Each NEXT_PUBLIC_ name must appear as a literal `process.env.X` — Next
   inlines those at build time, and a computed lookup returns undefined in the
   browser.

   Shared by lib/supabase/client.ts, lib/supabase/server.ts and proxy.ts. No
   Supabase SDK import here on purpose: proxy.ts and the browser bundle both
   pull this in, and neither should drag the other's client along with it.
--------------------------------------------------------------------------- */

export function supabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

/** Safe in the browser. */
export function publishableKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** NEVER expose. Bypasses row-level security entirely — server routes only. */
export function secretKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
}
