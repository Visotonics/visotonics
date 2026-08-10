import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { DealRow, DealStatus } from "@/lib/deal";

/* ---------------------------------------------------------------------------
   POST /api/deal-decide — an admin approves or rejects a registered deal.

   The partner-approve shape, applied to deals:

     * `requireAdmin()` against the caller's own partners row. Nothing in the
       body influences who the caller is, and proxy.ts only knows "signed
       in", not "signed in as admin".
     * READ-THEN-COMPARE-AND-SET. The update carries `.eq("status",
       fromStatus)`, so if a second admin decided between our read and our
       write we match zero rows and report `changed: false` rather than
       clobbering their decision.
     * A rejection requires a reason (422). "Not approved" with no
       explanation just produces a reply asking why.

   Unlike a partner account, a deal is NOT expected to go round the loop, so
   there is no separate audit table — `decided_at` / `decided_by` on the row
   are the whole record. If deals ever gain a re-decide flow, copy
   partner_decisions rather than trusting these two columns.
--------------------------------------------------------------------------- */

export const runtime = "nodejs";

const ALLOWED: DealStatus[] = ["approved", "rejected"];

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
  const status = typeof body.status === "string" ? (body.status as DealStatus) : null;
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) : "";

  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing deal id." }, { status: 422 });
  }
  // 'submitted' is not in ALLOWED on purpose: a decision cannot be un-made
  // through this endpoint. Reopening a deal is a deliberate, manual act.
  if (!status || !ALLOWED.includes(status)) {
    return NextResponse.json({ ok: false, error: "Invalid status." }, { status: 422 });
  }
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

  const { data: before, error: readError } = await db
    .from("deals")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (readError) {
    console.error("[api/deal-decide] read failed:", readError.message);
    return NextResponse.json({ ok: false, error: "Could not update." }, { status: 500 });
  }
  if (!before) {
    return NextResponse.json({ ok: false, error: "No such deal." }, { status: 404 });
  }

  const fromStatus = (before as DealRow).status;
  if (fromStatus === status) {
    // A double-clicked button is not a second decision.
    return NextResponse.json({ ok: true, status, changed: false });
  }

  const { data, error } = await db
    .from("deals")
    .update({
      status,
      rejection_reason: status === "rejected" ? reason : null,
      decided_at: new Date().toISOString(),
      decided_by: admin.id,
    })
    .eq("id", id)
    .eq("status", fromStatus)
    .select();

  if (error) {
    console.error("[api/deal-decide] update failed:", error.message);
    return NextResponse.json({ ok: false, error: "Could not update." }, { status: 500 });
  }

  const changed = (data ?? []) as DealRow[];
  if (changed.length === 0) {
    // Lost the race — another admin decided first. Their decision stands.
    return NextResponse.json({ ok: true, status, changed: false });
  }

  revalidatePath("/client-portal/admin");
  revalidatePath("/client-portal/dashboard");

  return NextResponse.json({ ok: true, status, from: fromStatus, changed: true });
}
