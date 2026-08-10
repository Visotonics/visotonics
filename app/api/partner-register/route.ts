import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminSupabase } from "@/lib/supabase/server";
import { publishableKey, supabaseUrl } from "@/lib/supabase/env";
import { isPartnerType, type PartnerRow } from "@/lib/partner";
import { getCrmProvider } from "@/lib/partner-crm";
import { SITE_URL } from "@/lib/seo";
import { notifyAdminOfRegistration } from "@/lib/partner-mail";

/* ---------------------------------------------------------------------------
   POST /api/partner-register — the real registration, replacing the mockup
   anchor that used to sit on /client-portal/register.

   Deliberately does the WHOLE thing server-side rather than letting the
   browser sign up and then telling us who it is: `role` and `approved` are
   set here, with the service-role key, so there is no request shape a
   partner could send that would make them an admin or approve themselves.

   Sign-up uses a session-less anon client on purpose — a new account is
   unapproved, so it must not come back signed in. The partner signs in
   explicitly afterwards and lands on the pending-approval state.

   Follows the conventions of app/api/lead/route.ts (typed payload, clean(),
   NextResponse.json, graceful behaviour when env vars are missing).
--------------------------------------------------------------------------- */

export const runtime = "nodejs";

type RegisterPayload = {
  company?: string;
  email?: string;
  password?: string;
  partnerType?: string;
};

function clean(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(request: Request) {
  let body: RegisterPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const company = clean(body.company);
  const email = clean(body.email).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const partnerType = clean(body.partnerType);

  if (!company || !email || !password) {
    return NextResponse.json(
      { ok: false, error: "Company, email and password are required." },
      { status: 422 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { ok: false, error: "Password must be at least 8 characters." },
      { status: 422 }
    );
  }
  // Partner type IS collected here again as of 2026-08-10 — the post-approval
  // onboarding screen that used to own it is gone (DECISIONS.md). Validated
  // against the server's own PARTNER_TYPES; a posted label or an invented key
  // never reaches the database, which has its own check constraint anyway.
  //
  // The column stays NULLABLE: rows written under the previous design hold
  // NULL and must keep working. Nullable in the schema, required at this
  // door — those are different statements and both are deliberate.
  if (!isPartnerType(partnerType)) {
    return NextResponse.json(
      { ok: false, error: "Choose the partner type that describes your company." },
      { status: 422 }
    );
  }

  const url = supabaseUrl();
  const key = publishableKey();
  const admin = createAdminSupabase();

  if (!url || !key || !admin) {
    console.error(
      "[api/partner-register] Supabase not configured — set NEXT_PUBLIC_SUPABASE_URL, " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY."
    );
    return NextResponse.json(
      { ok: false, error: "Registration is not available yet." },
      { status: 503 }
    );
  }

  // Session-less: we do not want a Set-Cookie on this response.
  const anon = createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Without emailRedirectTo, Supabase sends the confirmation link to the
  // project's Site URL — i.e. the marketing homepage — and the partner has to
  // find their own way back to /client-portal and sign in. Point it at the
  // callback route instead so confirming lands them on their dashboard.
  //
  // Derived from the request so localhost confirms to localhost. Host headers
  // are spoofable, but Supabase only honours URLs on its redirect allow-list,
  // so a forged origin fails there rather than becoming an open redirect.
  const origin = new URL(request.url).origin || SITE_URL;

  const { data: signUpData, error: signUpError } = await anon.auth.signUp({
    email,
    password,
    options: {
      data: { company },
      emailRedirectTo: `${origin}/client-portal/auth/callback?next=/client-portal/dashboard`,
    },
  });

  if (signUpError) {
    console.error("[api/partner-register] sign-up failed:", signUpError.message);
    return NextResponse.json({ ok: false, error: signUpError.message }, { status: 400 });
  }

  /* Detecting "this address already has an account" WITHOUT leaking it.
   *
   * Supabase does not return null here, and it does not error. With
   * confirmations on it returns a decoy user: a real-looking `id` that
   * exists nowhere, and — the actual signal — an EMPTY `identities` array.
   * A genuinely new sign-up comes back with exactly one identity.
   *
   * This bit was wrong until 2026-08-08 and it mattered. The old code only
   * checked `user?.id`, sailed past the decoy, and tried to upsert a
   * partners row whose id had no matching auth.users row. The foreign key
   * rejected it and the route answered 500 "Account created but the profile
   * could not be saved" — while a fresh address answered 200. That
   * difference is an email-enumeration oracle: anyone could probe whether an
   * address was a registered Visotonics partner. Verified against the live
   * project, then fixed.
   *
   * Both branches now return the identical response. Do not "improve" this
   * by reporting "that email is already registered" — the whole point is
   * that the caller cannot tell the two cases apart. */
  const user = signUpData.user;
  const alreadyRegistered =
    !user || (Array.isArray(user.identities) && user.identities.length === 0);

  if (alreadyRegistered) {
    console.log("[api/partner-register] sign-up for an address that already exists; responding generically.");
    return NextResponse.json({ ok: true, pending: true });
  }

  const userId = user.id;

  const { data: row, error: insertError } = await admin
    .from("partners")
    .upsert(
      {
        id: userId,
        company,
        email,
        partner_type: partnerType,
        role: "partner",
        status: "pending",
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (insertError) {
    // The auth user now exists without a partners row. Logged loudly because
    // it needs a human: either re-run registration (the upsert makes that
    // safe) or delete the orphan in the Supabase dashboard.
    console.error(
      `[api/partner-register] auth user ${userId} created but partners insert failed:`,
      insertError.message
    );
    return NextResponse.json(
      { ok: false, error: "Account created but the profile could not be saved. Contact us." },
      { status: 500 }
    );
  }

  // Fire-and-forget: neither the CRM nor the notification may fail a
  // registration. Today the CRM is the stub; see lib/partner-crm.ts.
  void getCrmProvider()
    .pushLead(row as PartnerRow)
    .catch((err) => console.error("[api/partner-register] CRM push failed:", err));

  void notifyAdminOfRegistration(row as PartnerRow).catch((err) =>
    console.error("[api/partner-register] admin notification failed:", err)
  );

  return NextResponse.json({ ok: true, pending: true });
}
