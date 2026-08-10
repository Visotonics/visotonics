import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { publishableKey, secretKey, supabaseUrl } from "./env";

/* ---------------------------------------------------------------------------
   Server-side Supabase clients.

   createServerSupabase()  — anon key + the request's session cookies. Subject
                             to RLS, so it can only see what the signed-in
                             partner is allowed to see. Use this for reads on
                             behalf of a user.

   createAdminSupabase()   — service-role key, BYPASSES RLS entirely. Only for
                             route handlers that have already checked the
                             caller is an admin (or for the registration route,
                             which must write role/approved that no client is
                             permitted to set). Never import this into a
                             Client Component.
--------------------------------------------------------------------------- */

export async function createServerSupabase() {
  const url = supabaseUrl();
  const key = publishableKey();
  if (!url || !key) return null;

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // proxy (proxy.ts) refreshes the session on every request, so this
          // is safe to swallow — the refreshed cookie lands there instead.
        }
      },
    },
  });
}

export function createAdminSupabase() {
  const url = supabaseUrl();
  const secret = secretKey();
  if (!url || !secret) return null;

  return createSupabaseClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
