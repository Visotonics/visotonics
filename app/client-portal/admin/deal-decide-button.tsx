"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BORDER_D_OUTLINE, CANVAS_DARK, inputStyle, sans, SIGNAL, TXT_D2 } from "../_shared";
import type { DealStatus } from "@/lib/deal";

/* ---------------------------------------------------------------------------
   Approve / reject a registered deal.

   Deliberately the same interaction as ApproveButton: rejection opens an
   inline reason box, because /api/deal-decide requires a reason for exactly
   the same argument the partner flow makes — "not approved" with no
   explanation just produces a reply asking why.

   The server re-checks that the caller is an admin and compare-and-sets on
   the current status. This is the convenience, not the gate.
--------------------------------------------------------------------------- */

const smallBtn = (kind: "solid" | "outline"): React.CSSProperties => ({
  height: 32,
  padding: "0 12px",
  borderRadius: 5,
  fontFamily: sans,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
  background: kind === "solid" ? SIGNAL : "transparent",
  color: kind === "solid" ? CANVAS_DARK : TXT_D2,
  border: kind === "solid" ? "none" : `1px solid ${BORDER_D_OUTLINE}`,
});

export default function DealDecideButton({ id, status }: { id: string; status: DealStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  async function decide(next: DealStatus, why?: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/deal-decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: next, reason: why }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Failed.");
        return;
      }
      setRejecting(false);
      setReason("");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  if (rejecting) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end", minWidth: 260 }}>
        <input
          type="text"
          autoFocus
          placeholder="Reason (recorded on the deal)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          style={{ ...inputStyle, height: 36, fontSize: 13 }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            disabled={busy || reason.trim().length === 0}
            onClick={() => decide("rejected", reason.trim())}
            style={{ ...smallBtn("solid"), opacity: reason.trim() ? 1 : 0.5 }}
          >
            {busy ? "…" : "Confirm rejection"}
          </button>
          <button type="button" disabled={busy} onClick={() => setRejecting(false)} style={smallBtn("outline")}>
            Cancel
          </button>
        </div>
        {error && <span style={{ fontSize: 12, color: SIGNAL }}>{error}</span>}
      </div>
    );
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
      {status !== "approved" && (
        <button type="button" disabled={busy} onClick={() => decide("approved")} className="dt-signal-fill" style={smallBtn("solid")}>
          {busy ? "…" : "Approve"}
        </button>
      )}
      {status !== "rejected" && (
        <button type="button" disabled={busy} onClick={() => setRejecting(true)} className="dt-outline" style={smallBtn("outline")}>
          Reject
        </button>
      )}
      {error && <span style={{ fontSize: 12, color: SIGNAL }}>{error}</span>}
    </span>
  );
}
