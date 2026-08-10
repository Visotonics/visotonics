import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/* ---------------------------------------------------------------------------
   GET /client-portal/auth/callback — where Supabase's emailed links land.

   Covers both the sign-up confirmation link and the password-reset link. It
   exchanges the one-time code for a session (writing the session cookies via
   the server client) and then forwards to `next`.

   `next` is validated to be a path inside /client-portal — an unchecked
   redirect param here would be an open redirect on an auth endpoint.
--------------------------------------------------------------------------- */

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requested = url.searchParams.get("next") || "/client-portal/dashboard";

  const next = requested.startsWith("/client-portal") && !requested.startsWith("//")
    ? requested
    : "/client-portal/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/client-portal", url.origin));
  }

  const supabase = await createServerSupabase();
  if (!supabase) {
    return NextResponse.redirect(new URL("/client-portal", url.origin));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[client-portal/auth/callback] code exchange failed:", error.message);
    return NextResponse.redirect(new URL("/client-portal?error=link", url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
