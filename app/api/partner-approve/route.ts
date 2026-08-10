import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { PartnerRow, PartnerStatus } from "@/lib/partner";
import { notifyPartnerApproved, notifyPartnerRejected } from "@/lib/partner-mail";

/* ---------------------------------------------------------------------------
   POST /api/partner-approve — an admin decides on a pending partner.

   Three outcomes, not two: approve, reject (with a reason the partner is
   told), or send an approved partner back to pending. Approval lives here
   rather than in a Zoho webhook because Zoho credentials don't exist yet —
   see docs/10-partner-portal.md.

   The admin check is server-side against the caller's own `partners` row.
   Nothing in the request body influences who the caller is, and `proxy.ts`
   only knows "signed in", not "signed in as admin".
--------------------------------------------------------------------------- */

export const runtime = "nodejs";

const ALLOWED: PartnerStatus[] = ["pending", "approved", "rejected"];

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Not authorised." }, { status: 403 });
  }

  let body: { id?: string; status?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  const status = typeof body.status === "string" ? (body.status as PartnerStatus) : null;
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) : "";

  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing partner id." }, { status: 422 });
  }
  if (!status || !ALLOWED.includes(status)) {
    return NextResponse.json({ ok: false, error: "Invalid status." }, { status: 422 });
  }
  // A rejection the partner can't understand is worse than no rejection —
  // they'll just email and ask. Require the admin to say something.
  if (status === "rejected" && !reason) {
    return NextResponse.json(
      { ok: false, error: "A reason is required when rejecting." },
      { status: 422 }
    );
  }

  const db = createAdminSupabase();
  if (!db) {
    return NextResponse.json({ ok: false, error: "Not configured." }, { status: 503 });
  }

  // Read first, so the audit log can record what the status changed FROM.
  // Scoped to role = 'partner' so this endpoint can never touch another admin.
  const { data: before, error: readError } = await db
    .from("partners")
    .select("*")
    .eq("id", id)
    .eq("role", "partner")
    .maybeSingle();

  if (readError) {
    console.error("[api/partner-approve] read failed:", readError.message);
    return NextResponse.json({ ok: false, error: "Could not update." }, { status: 500 });
  }
  if (!before) {
    return NextResponse.json({ ok: false, error: "No such partner." }, { status: 404 });
  }

  const fromStatus = (before as PartnerRow).status;
  if (fromStatus === status) {
    // Nothing to do. Reported honestly rather than as a fresh decision, so a
    // double-clicked button neither emails twice nor writes a phantom log row.
    return NextResponse.json({ ok: true, status, changed: false });
  }

  // `.eq("status", fromStatus)` makes this a compare-and-set: if another admin
  // changed the row between the read above and this write, we match zero rows
  // rather than clobbering their decision.
  const { data, error } = await db
    .from("partners")
    .update({
      status,
      rejection_reason: status === "rejected" ? reason : null,
      decided_at: new Date().toISOString(),
      decided_by: admin.id,
    })
    .eq("id", id)
    .eq("role", "partner")
    .eq("status", fromStatus)
    .select();

  if (error) {
    console.error("[api/partner-approve] update failed:", error.message);
    return NextResponse.json({ ok: false, error: "Could not update." }, { status: 500 });
  }

  const changed = (data ?? []) as PartnerRow[];
  if (changed.length === 0) {
    // Lost the race — someone else decided first. Don't email, don't log.
    return NextResponse.json({ ok: true, status, changed: false });
  }

  const row = changed[0];

  // Append-only history. `partners.decided_by` only ever holds the LATEST
  // decider; this is the record of how the account actually got here.
  const { error: logError } = await db.from("partner_decisions").insert({
    partner_id: row.id,
    admin_id: admin.id,
    admin_email: admin.email,
    from_status: fromStatus,
    to_status: status,
    reason: status === "rejected" ? reason : null,
  });
  if (logError) {
    // Logged loudly but NOT fatal: the decision itself already succeeded, and
    // failing the admin's action after the fact would be worse than a gap in
    // the audit trail. The gap is visible in the logs either way.
    console.error("[api/partner-approve] audit log insert failed:", logError.message);
  }

  // Never block the admin's response on an email send.
  if (status === "approved") {
    void notifyPartnerApproved(row).catch((err) =>
      console.error("[api/partner-approve] approval notification failed:", err)
    );
  } else if (status === "rejected") {
    void notifyPartnerRejected(row, reason).catch((err) =>
      console.error("[api/partner-approve] rejection notification failed:", err)
    );
  }

  // Bust any cached RSC payloads so `router.refresh()` on the client picks
  // up the new status immediately.
  revalidatePath("/client-portal/admin");
  revalidatePath("/client-portal/dashboard");

  return NextResponse.json({ ok: true, status, from: fromStatus, changed: true });
}
