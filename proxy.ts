import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { publishableKey, supabaseUrl } from "@/lib/supabase/env";

/* ---------------------------------------------------------------------------
   Next 16 renamed the `middleware` file convention to `proxy` — see
   node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md.

   Two jobs:
     1. Refresh the Supabase session on every portal request, so a signed-in
        partner's token doesn't silently expire mid-session.
     2. Bounce unauthenticated visitors off the gated routes. This is the
        first real gate on /client-portal — everything under it was a mockup
        until now, and DECISIONS.md is explicit that it must not be linked
        publicly without one.

   Note the guard is defence in depth, not the only check: /admin also
   verifies `role` server-side, because the proxy only knows "signed in".
--------------------------------------------------------------------------- */

/* Deny by default.
 *
 * This used to be an allowlist of gated paths — `["/client-portal/dashboard",
 * "/client-portal/admin"]` — which meant the onboarding routes, added later,
 * silently got no proxy gate at all. They defended themselves server-side so
 * nothing was exposed, but the pattern was wrong: a new gated page under
 * /client-portal had to be REMEMBERED here, and the failure mode of
 * forgetting is an unguarded page.
 *
 * Inverted, so anything new under /client-portal is gated unless it is
 * deliberately listed as public below. Forgetting now fails safe: a page
 * nobody added to this list is protected, not exposed. */
const PUBLIC = [
  "/client-portal", // sign in
  "/client-portal/register",
  "/client-portal/reset-password",
  "/client-portal/reset-password/update", // reached with a recovery session; the page re-checks
  "/client-portal/auth/callback", // must run signed-out to establish the session
];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = supabaseUrl();
  const key = publishableKey();

  // Not configured yet — leave the gated routes to their own server-side
  // checks rather than locking everyone out of a half-built portal.
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // Responses that set auth cookies must never be cached by a CDN, or
        // one visitor's session token can be served to another.
        for (const [key, value] of Object.entries(headers ?? {})) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // Must run before the response is committed, or a refresh completed after
  // the fact is lost and every request re-refreshes.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Trailing slashes normalised so "/client-portal/register/" is still public.
  const path = request.nextUrl.pathname.replace(/\/+$/, "") || "/";
  const isPublic = PUBLIC.includes(path);

  if (!user && !isPublic) {
    const signIn = request.nextUrl.clone();
    signIn.pathname = "/client-portal";
    signIn.search = "";
    return NextResponse.redirect(signIn);
  }

  return response;
}

export const config = {
  matcher: ["/client-portal/:path*"],
};
