import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/server";
import { getCurrentPartner } from "@/lib/auth";
import { NDA_CLAUSES, NDA_VERSION, type StoredAgreement } from "@/lib/nda";
import { sendNdaReceipt, notifyAdminOfNdaSignature } from "@/lib/partner-mail";
import type { PartnerRow } from "@/lib/partner";

/* ---------------------------------------------------------------------------
   POST /api/partner-nda — the partner signs.

   The signature record is built from the SERVER's copy of the clause list,
   not from whatever the browser posts. The client sends only which keys it
   ticked; the labels stored alongside them come from lib/nda.ts here. That
   way a tampered request cannot produce a record claiming the partner agreed
   to text that was never on screen.

   Every clause is mandatory. A partial NDA is not a thing — if a partner
   won't agree to a clause, the answer is a conversation, not a stored record
   with a false in it. The `agreed` field exists in the JSON anyway so the
   shape survives a future optional clause.
--------------------------------------------------------------------------- */

export const runtime = "nodejs";

function clientIp(request: Request): string | null {
  // Netlify and most proxies set x-forwarded-for; first entry is the client.
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip");
}

export async function POST(request: Request) {
  const partner = await getCurrentPartner();
  if (!partner) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  if (partner.status !== "approved") {
    return NextResponse.json({ ok: false, error: "Account is not approved." }, { status: 403 });
  }
  /* There used to be a `!partner.partner_type` 409 here, mirroring the
     choose-type onboarding step. That step was removed on 2026-08-10 when
     partner type went back onto the registration form (DECISIONS.md), and
     the guard had to go with it: rows created under the old design can
     legitimately hold NULL, and nextStepFor() now sends them straight here.
     Keeping the 409 would have left exactly those partners in a loop —
     routed to the NDA screen by the state machine and refused by this route. */
  if (partner.nda_signed_at) {
    return NextResponse.json({ ok: false, error: "Already signed." }, { status: 409 });
  }

  let body: { fullName?: string; jobTitle?: string; agreed?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const jobTitle = typeof body.jobTitle === "string" ? body.jobTitle.trim() : "";
  const agreedKeys = Array.isArray(body.agreed)
    ? body.agreed.filter((k): k is string => typeof k === "string")
    : [];

  if (fullName.length < 2) {
    return NextResponse.json(
      { ok: false, error: "Enter your full name as your signature." },
      { status: 422 }
    );
  }

  const missing = NDA_CLAUSES.filter((c) => !agreedKeys.includes(c.key));
  if (missing.length > 0) {
    return NextResponse.json(
      { ok: false, error: "You must agree to every clause to continue." },
      { status: 422 }
    );
  }

  // Labels come from the server's clause list, never from the request.
  const agreements: StoredAgreement[] = NDA_CLAUSES.map((c) => ({
    key: c.key,
    label: c.label,
    agreed: true,
  }));

  const db = createAdminSupabase();
  if (!db) {
    return NextResponse.json({ ok: false, error: "Not configured." }, { status: 503 });
  }

  const signedAt = new Date().toISOString();

  const { data: sig, error: sigError } = await db
    .from("nda_signatures")
    .insert({
      partner_id: partner.id,
      signed_at: signedAt,
      nda_version: NDA_VERSION,
      full_name: fullName,
      job_title: jobTitle || null,
      agreements,
      ip_address: clientIp(request),
      user_agent: request.headers.get("user-agent"),
    })
    .select()
    .single();

  if (sigError) {
    console.error("[api/partner-nda] signature insert failed:", sigError.message);
    return NextResponse.json({ ok: false, error: "Could not record signature." }, { status: 500 });
  }

  // Stamp the partner only after the signature row exists — if this order
  // were reversed and the insert failed, the partner would be marked as
  // having signed with nothing to show for it.
  const { data: updated, error: updError } = await db
    .from("partners")
    .update({ nda_signed_at: signedAt })
    .eq("id", partner.id)
    .is("nda_signed_at", null)
    .select();

  if (updError) {
    console.error("[api/partner-nda] partner stamp failed:", updError.message);
    return NextResponse.json({ ok: false, error: "Could not complete signing." }, { status: 500 });
  }

  const row = { ...partner, nda_signed_at: signedAt } as PartnerRow;

  void sendNdaReceipt(row, {
    fullName,
    jobTitle,
    signedAt,
    ndaVersion: NDA_VERSION,
    agreements,
    signatureId: sig?.id as string,
  }).catch((err) => console.error("[api/partner-nda] receipt failed:", err));

  // Point 14: the admin who approved them is told they've signed.
  void notifyAdminOfNdaSignature(row, fullName).catch((err) =>
    console.error("[api/partner-nda] admin NDA notice failed:", err)
  );

  return NextResponse.json({ ok: true, signedAt, alreadySigned: updated?.length === 0 });
}
