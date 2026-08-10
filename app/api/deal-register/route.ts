import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminSupabase } from "@/lib/supabase/server";
import { getCurrentPartner } from "@/lib/auth";
import { isIndustry, isPlatform } from "@/lib/deal";

/* ---------------------------------------------------------------------------
   POST /api/deal-register — a partner registers an opportunity.

   Security shape copied from app/api/partner-nda/route.ts, deliberately:

     * 401 signed out, 403 unless the account is approved AND has signed the
       NDA. The page has the same gate, but the page is a convenience — this
       is the gate. A deal registration is commercially protected
       information; someone still in the approval queue has no business
       filing one.
     * Every field is validated HERE. `industry` and `platform` are checked
       against the SERVER's own lists in lib/deal.ts, never against whatever
       the browser posted. A tampered request cannot invent a category, and a
       posted LABEL ("Seaport") is not a value — the same rule that makes the
       NDA route rebuild its clause list server-side.
     * `reference` is generated here. It is the handle used in email and on
       the phone; letting the client choose one would let a partner mint a
       reference that collides with, or impersonates, someone else's deal.
     * `status` is ALWAYS 'submitted'. It is not read from the body at all,
       so there is no request shape that files a pre-approved deal. The
       column default and the check constraint in 0004 are the backstops.
     * Written with createAdminSupabase() because `deals` has SELECT-only
       RLS — the same arrangement as every other table in this schema.
--------------------------------------------------------------------------- */

export const runtime = "nodejs";

/** Practical ceilings, not policy. They stop a multi-megabyte body becoming a
 *  row rather than encoding any business rule. */
const MAX_NAME = 200;
const MAX_EMAIL = 320;
const MAX_NOTES = 4000;
/** $1bn. Above this it is a typo or a probe, and either way a human should
 *  hear about it before the row exists. */
const MAX_VALUE = 1_000_000_000;

/* DL-XXXXXX over an unambiguous alphabet: no O/0, no I/1. These get read
   aloud and typed back in. Collisions are caught by the UNIQUE constraint —
   32^6 is ~1.07e9, so a retry loop would be dead code at this volume; the
   insert error is the handling. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeReference(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return `DL-${out}`;
}

function clean(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

type DealPayload = {
  customerName?: string;
  customerEmail?: string;
  industry?: string;
  platform?: string;
  estimatedValueUsd?: unknown;
  notes?: string;
};

export async function POST(request: Request) {
  const partner = await getCurrentPartner();
  if (!partner) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  if (partner.status !== "approved" || !partner.nda_signed_at) {
    return NextResponse.json(
      { ok: false, error: "Your account is not active yet." },
      { status: 403 }
    );
  }

  let body: DealPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const customerName = clean(body.customerName, MAX_NAME);
  const customerEmail = clean(body.customerEmail, MAX_EMAIL).toLowerCase();
  const notes = clean(body.notes, MAX_NOTES);

  if (customerName.length < 2) {
    return NextResponse.json({ ok: false, error: "Enter the customer's name." }, { status: 422 });
  }
  // Deliberately shallow: the only address validation worth doing is sending
  // to it. This catches a mistyped field, not a fake domain.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return NextResponse.json(
      { ok: false, error: "Enter a valid customer email address." },
      { status: 422 }
    );
  }
  if (!isIndustry(body.industry)) {
    return NextResponse.json({ ok: false, error: "Choose an industry." }, { status: 422 });
  }
  if (!isPlatform(body.platform)) {
    return NextResponse.json({ ok: false, error: "Choose a platform." }, { status: 422 });
  }

  // Number("") is 0 and Number(" ") is 0, so an empty field would otherwise
  // become a legitimate $0 deal. Parse explicitly and refuse anything that
  // is not a finite, non-negative number.
  const raw = body.estimatedValueUsd;
  const value =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && raw.trim() !== ""
        ? Number(raw.trim())
        : Number.NaN;

  if (!Number.isFinite(value) || value < 0) {
    return NextResponse.json(
      { ok: false, error: "Enter the estimated value as a positive number." },
      { status: 422 }
    );
  }
  if (value > MAX_VALUE) {
    return NextResponse.json(
      { ok: false, error: "That value looks wrong. Contact partnerships for deals above $1bn." },
      { status: 422 }
    );
  }

  const db = createAdminSupabase();
  if (!db) {
    return NextResponse.json({ ok: false, error: "Not configured." }, { status: 503 });
  }

  const reference = makeReference();

  const { data, error } = await db
    .from("deals")
    .insert({
      partner_id: partner.id,
      reference,
      customer_name: customerName,
      customer_email: customerEmail,
      industry: body.industry,
      platform: body.platform,
      // Rounded to the column's own scale so what comes back matches what
      // was sent, rather than Postgres quietly rounding underneath us.
      estimated_value_usd: Math.round(value * 100) / 100,
      notes: notes || null,
      // Never from the body. See the header.
      status: "submitted",
    })
    .select()
    .single();

  if (error) {
    console.error("[api/deal-register] insert failed:", error.message);
    return NextResponse.json({ ok: false, error: "Could not register the deal." }, { status: 500 });
  }

  revalidatePath("/client-portal/dashboard");
  revalidatePath("/client-portal/admin");

  return NextResponse.json({ ok: true, reference, id: data?.id });
}
