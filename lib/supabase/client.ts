import { createBrowserClient } from "@supabase/ssr";
import { publishableKey, supabaseUrl } from "./env";

/* ---------------------------------------------------------------------------
   Browser-side Supabase client — the ONLY thing that should ever touch the
   anon key in the browser. Used by the client-portal auth forms (sign in,
   sign up trigger, password reset) so that the session cookies it writes are
   readable by the server client in lib/supabase/server.ts.

   Never import this from a Server Component or a route handler.
--------------------------------------------------------------------------- */

export function createClient() {
  const url = supabaseUrl();
  const key = publishableKey();

  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  return createBrowserClient(url, key);
}

/** True when the public Supabase env vars exist — lets the auth pages render
 *  a clear "not configured yet" message instead of throwing on first paint. */
export function isSupabaseConfigured() {
  return Boolean(supabaseUrl() && publishableKey());
}
