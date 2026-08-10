import { redirect } from "next/navigation";
import ApproveButton from "./approve-button";
import DealDecideButton from "./deal-decide-button";
import { pageMeta } from "@/lib/seo";
import { getCurrentPartner } from "@/lib/auth";
import { PARTNER_TYPE_LABELS, type PartnerRow } from "@/lib/partner";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  dealValue,
  formatUsd,
  INDUSTRY_LABELS,
  PLATFORM_LABELS,
  type DealRow,
} from "@/lib/deal";
import {
  AMBER,
  AppShell,
  BLUE,
  capLabel,
  HAIR_SOFT,
  Metric,
  NotBuiltYet,
  MONO,
  Panel,
  ROW_RULE,
  SANS,
  type NavItem,
} from "@/components/portal/app-shell";

// Gated surface — never index.
export const metadata = pageMeta({
  title: "Admin",
  description: "Visotonics partner portal administration.",
  path: "/client-portal/admin",
  noindex: true,
});

/* ---------------------------------------------------------------------------
   /client-portal/admin — the Admin Dashboard study, wired to real data.

   Every number on this page is COMPUTED from the partners table. The design
   shipped with plausible sample figures (12 partners, 58% approval, a funnel);
   none of those are hardcoded here. An operations dashboard that displays
   invented numbers is worse than no dashboard, because someone will make a
   decision on one.

   Read with the *anon* server client, so the "admins read every row" RLS
   policy is what grants the wide read — this page doubles as a live check
   that the policy works.
--------------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

type DecisionRow = {
  id: string;
  partner_id: string;
  admin_email: string | null;
  from_status: string;
  to_status: string;
  reason: string | null;
  decided_at: string;
};

const cell: React.CSSProperties = { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

function shortDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function timeStamp(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/* Seven columns. `.portal-table-scroll` enforces a 1180px min-width on the
   inner wrapper, so the table scrolls sideways below that rather than
   crushing. Fixed columns 820 + six 20px gaps 120 + 48 row padding = 988,
   leaving ~192px for the flexible partner column at the narrowest. */
const DEAL_COLS = "110px minmax(0, 1fr) 170px 110px 120px 110px 200px";

/* A deal awaiting review is BLUE — the system is observing, nothing has
   concluded. AMBER is the decision label and carries both outcomes. No
   SIGNAL anywhere in this table: the admin screen's orange budget belongs to
   the approve control, and a whole column of it would be noise. */
function dealState(status: DealRow["status"]) {
  if (status === "approved") return { label: "APPROVED", ink: AMBER, dot: AMBER };
  if (status === "rejected") return { label: "NOT APPROVED", ink: "rgba(255,176,32,0.65)", dot: "rgba(255,176,32,0.55)" };
  return { label: "UNDER REVIEW", ink: BLUE, dot: BLUE };
}

/** Where a partner is in onboarding, as a short state word for the table. */
function stateOf(p: PartnerRow) {
  if (p.status === "rejected") return { label: "REJECTED", ink: AMBER, dot: AMBER };
  if (p.status === "pending") return { label: "AWAITING DECISION", ink: BLUE, dot: BLUE };
  // No CHOOSING TYPE state any more — type is collected at registration, so
  // after approval the only thing left is the NDA.
  if (!p.nda_signed_at) return { label: "AWAITING NDA", ink: "rgba(92,200,255,0.6)", dot: "rgba(92,200,255,0.45)" };
  return { label: "ACTIVE", ink: "rgba(244,245,247,0.5)", dot: "rgba(244,245,247,0.3)" };
}

export default async function AdminPage() {
  const me = await getCurrentPartner();
  if (!me) redirect("/client-portal");
  if (me.role !== "admin") redirect("/client-portal/dashboard");

  const supabase = await createServerSupabase();

  const { data, error } = supabase
    ? await supabase.from("partners").select("*").eq("role", "partner").order("created_at", { ascending: false })
    : { data: null, error: null };

  /* Deals, widest first: the admin's job is the queue, but the table shows
     every deal so a decision made this morning is still visible. Read on the
     anon client, so the "admins read every deal" policy from 0004 is what
     grants it — same live-policy check the partners read is.

     An error here is almost certainly "0004 has not been applied yet". It is
     surfaced in the panel rather than crashing the whole admin screen, which
     would take the partner approval queue down with it. */
  const { data: dealData, error: dealError } = supabase
    ? await supabase.from("deals").select("*").order("created_at", { ascending: false })
    : { data: null, error: null };

  const { data: decisionData } = supabase
    ? await supabase.from("partner_decisions").select("*").order("decided_at", { ascending: false }).limit(6)
    : { data: null };

  const all = (data ?? []) as PartnerRow[];
  const decisions = (decisionData ?? []) as DecisionRow[];
  const deals = (dealData ?? []) as DealRow[];
  const submittedDeals = deals.filter((d) => d.status === "submitted");
  const approvedDeals = deals.filter((d) => d.status === "approved");
  const protectedValue = approvedDeals.reduce((sum, d) => sum + dealValue(d), 0);
  // Company name for a deal comes from the partners list already on the page
  // rather than a PostgREST embed — one query fewer, and it does not depend
  // on the foreign key's generated constraint name.
  const companyFor = (partnerId: string) =>
    all.find((p) => p.id === partnerId)?.company ?? "Unknown partner";
  // Submitted first — that is the work, same ordering rule as the partner
  // applications table directly above it.
  const dealRows = [...submittedDeals, ...deals.filter((d) => d.status !== "submitted")];

  const pending = all.filter((p) => p.status === "pending");
  const approved = all.filter((p) => p.status === "approved");
  const rejected = all.filter((p) => p.status === "rejected");
  const signed = all.filter((p) => p.nda_signed_at);
  const active = all.filter((p) => p.status === "approved" && p.nda_signed_at);
  const total = all.length || 1; // avoid /0 in the bars

  // Pending first — that is the work.
  const rows = [...pending, ...all.filter((p) => p.status !== "pending")];

  const pct = (n: number) => `${Math.round((n / total) * 100)}%`;

  const nav: NavItem[] = [
    { num: "01", label: "Queue", count: String(pending.length), href: "/client-portal/admin", active: true },
    { num: "02", label: "Partners", count: String(all.length) },
    // The deals table lives on this page, so this jumps to it rather than
    // pretending to be a route that does not exist.
    { num: "03", label: "Deals", count: String(deals.length), href: "/client-portal/admin#deals" },
    { num: "04", label: "Reports" },
    { num: "05", label: "Settings" },
  ];

  /* Activity feed, built from real decisions plus real NDA signatures. */
  const activity = [
    ...decisions.map((d) => ({
      at: d.decided_at,
      kind: "Decision recorded",
      who: all.find((p) => p.id === d.partner_id)?.company ?? "Unknown partner",
      text:
        d.to_status === "rejected"
          ? `Rejected — ${d.reason ?? "no reason recorded"}`
          : `${d.from_status} → ${d.to_status} by ${d.admin_email ?? "an admin"}`,
      tone: d.to_status === "rejected" ? "amber" : "blue",
    })),
    ...signed.map((p) => ({
      at: p.nda_signed_at as string,
      kind: "NDA signed",
      who: p.company,
      text: p.decided_by === me.id ? "Countersigned — you approved this partner" : "Countersigned",
      tone: "blue" as const,
    })),
  ]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 6);

  /* "Type declared" was a funnel step until 2026-08-10. It is gone because it
     is no longer a step: partner type is a required registration field, so
     the figure would read 100% for every new partner and measure nothing. */
  const funnel = [
    { key: "Registered", val: all.length, pct: pct(all.length) },
    { key: "Approved", val: approved.length, pct: pct(approved.length) },
    { key: "NDA signed", val: signed.length, pct: pct(signed.length) },
    { key: "Active", val: active.length, pct: pct(active.length) },
  ];

  // The oldest waiting application, by date rather than by age in days —
  // computing an age needs `now`, which is an impure call in a render.
  const oldestPending = pending.length
    ? pending.reduce((a, b) => (a.created_at < b.created_at ? a : b))
    : null;

  return (
    <AppShell
      section="Admin"
      nav={nav}
      tabs={[
        { label: "Awaiting decision", count: String(pending.length), active: true },
        { label: "All partners", count: String(all.length) },
        { label: "Activity" },
        { label: "Audit log" },
      ]}
      userInitials={
        me.company.replace(/[^A-Za-z ]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "AD"
      }
      userName={me.company}
      userRole="Admin"
      topRight={
        <>
          <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(244,245,247,0.4)" }}>
            {all.length} partner{all.length === 1 ? "" : "s"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 5, height: 5, background: pending.length ? BLUE : "rgba(244,245,247,0.3)" }} />
            <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: pending.length ? "rgba(92,200,255,0.85)" : "rgba(244,245,247,0.4)" }}>
              {pending.length} awaiting
            </div>
          </div>
        </>
      }
    >
      <div className="portal-grid" style={{ padding: 32 }}>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 24 }}>
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 300 }}>
              <div style={{ height: 1, background: BLUE }} />
              <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(92,200,255,0.85)" }}>
                Approval queue · Live
              </div>
            </div>
            <h1 style={{ margin: "20px 0 0", fontFamily: SANS, fontSize: 34, fontWeight: 600, letterSpacing: "-0.025em", color: "#F4F5F7" }}>Partner operations</h1>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", border: `1px solid rgba(244,245,247,0.1)`, background: "#101216" }}>
            <Metric num="01" label="Awaiting decision" value={String(pending.length)} unit={`of ${all.length}`} base={oldestPending ? `Oldest ${shortDate(oldestPending.created_at)}` : "Queue clear"} pct={pct(pending.length)} />
            <Metric num="02" label="NDA signed" value={String(signed.length)} unit="signed" base={`${active.length} fully onboarded`} pct={pct(signed.length)} />
            <Metric num="03" label="Approved" value={String(approved.length)} unit="partners" base={`${pct(approved.length)} of applications`} pct={pct(approved.length)} barColor="rgba(244,245,247,0.3)" />
            <Metric num="04" label="Rejected" value={String(rejected.length)} base={rejected.length ? "Reason recorded on each" : "None"} pct={pct(rejected.length)} barColor="rgba(255,176,32,0.55)" />
          </div>

          <Panel title="Partner applications" headerSize="lg">
            {error && <div style={{ padding: "20px 24px", fontFamily: MONO, fontSize: 13, color: AMBER }}>Could not load partners: {error.message}</div>}
            {!error && rows.length === 0 && <NotBuiltYet what="No partner accounts yet" detail="Applications appear here the moment someone registers." />}
            {rows.length > 0 && (
              <div className="portal-table-scroll">
                <div>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 200px 130px 100px 170px 176px", gap: 20, padding: "12px 24px", borderBottom: `1px solid rgba(244,245,247,0.12)` }}>
                  {["Company", "Contact", "Type", "Submitted", "State", "Decision"].map((h, i) => (
                    <div key={h} style={{ ...capLabel, fontSize: 11, textAlign: i === 5 ? "right" : "left" }}>{h}</div>
                  ))}
                </div>
                {rows.map((p) => {
                  const st = stateOf(p);
                  return (
                    <div key={p.id} style={{ position: "relative", display: "grid", gridTemplateColumns: "minmax(0, 1fr) 200px 130px 100px 170px 176px", gap: 20, alignItems: "center", padding: "14px 24px", borderBottom: `1px solid ${ROW_RULE}` }}>
                      <div style={{ ...cell, fontFamily: SANS, fontSize: 15, color: "rgba(244,245,247,0.95)" }}>{p.company}</div>
                      <div style={{ ...cell, fontFamily: MONO, fontSize: 13, color: "rgba(166,173,184,0.9)" }}>{p.email}</div>
                      <div style={{ ...cell, fontFamily: MONO, fontSize: 13, color: "rgba(166,173,184,0.9)" }}>
                        {p.partner_type ? PARTNER_TYPE_LABELS[p.partner_type] : "—"}
                      </div>
                      <div style={{ ...cell, fontFamily: MONO, fontSize: 13, color: "rgba(166,173,184,0.8)" }}>{shortDate(p.created_at)}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <div style={{ width: 5, height: 5, background: st.dot, flex: "0 0 auto" }} />
                        <div style={{ ...cell, fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.07em", color: st.ink }}>{st.label}</div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <ApproveButton id={p.id} status={p.status} />
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            )}
          </Panel>

          {/* ---- deal registrations ---- */}
          <div id="deals" style={{ scrollMarginTop: 88 }}>
            <Panel
              title="Deal registrations"
              headerSize="lg"
              action={
                <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.09em", textTransform: "uppercase", color: submittedDeals.length ? "rgba(92,200,255,0.85)" : "rgba(166,173,184,0.55)" }}>
                  {submittedDeals.length} awaiting · {formatUsd(protectedValue)} protected
                </div>
              }
            >
              {dealError && (
                <div style={{ padding: "20px 24px", fontFamily: MONO, fontSize: 13, color: AMBER }}>
                  Could not load deals: {dealError.message}
                </div>
              )}
              {!dealError && dealRows.length === 0 && (
                <NotBuiltYet what="No deals registered yet" detail="Registrations appear here the moment a partner submits one." />
              )}
              {dealRows.length > 0 && (
                <div className="portal-table-scroll">
                  <div>
                    <div style={{ display: "grid", gridTemplateColumns: DEAL_COLS, gap: 20, padding: "12px 24px", borderBottom: `1px solid rgba(244,245,247,0.12)` }}>
                      {["Reference", "Partner", "Customer", "Industry", "Platform", "Value", "Decision"].map((h, i) => (
                        <div key={h} style={{ ...capLabel, textAlign: i === 5 || i === 6 ? "right" : "left" }}>{h}</div>
                      ))}
                    </div>
                    {dealRows.map((d) => {
                      const st = dealState(d.status);
                      return (
                        <div key={d.id} style={{ display: "grid", gridTemplateColumns: DEAL_COLS, gap: 20, alignItems: "center", padding: "14px 24px", borderBottom: `1px solid ${ROW_RULE}` }}>
                          <div style={{ ...cell, fontFamily: MONO, fontSize: 13, letterSpacing: "0.04em", color: "rgba(244,245,247,0.9)" }}>{d.reference}</div>
                          <div style={{ ...cell, fontFamily: SANS, fontSize: 15, color: "rgba(244,245,247,0.95)" }}>{companyFor(d.partner_id)}</div>
                          <div style={{ ...cell, fontFamily: SANS, fontSize: 15, color: "rgba(244,245,247,0.8)" }} title={d.customer_email}>{d.customer_name}</div>
                          <div style={{ ...cell, fontFamily: MONO, fontSize: 13, color: "rgba(166,173,184,0.9)" }}>{INDUSTRY_LABELS[d.industry] ?? "—"}</div>
                          <div style={{ ...cell, fontFamily: MONO, fontSize: 13, color: "rgba(166,173,184,0.9)" }} title={PLATFORM_LABELS[d.platform]}>
                            {PLATFORM_LABELS[d.platform]?.split(" — ")[0] ?? "—"}
                          </div>
                          <div style={{ ...cell, fontFamily: MONO, fontSize: 14, fontVariantNumeric: "tabular-nums", textAlign: "right", color: "rgba(244,245,247,0.9)" }}>
                            {formatUsd(dealValue(d))}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 5, height: 5, background: st.dot }} />
                              <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.07em", color: st.ink }}>{st.label}</div>
                            </div>
                            <DealDecideButton id={d.id} status={d.status} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Panel>
          </div>
        </div>

        {/* ---- right rail ---- */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <Panel title="State changes">
            {activity.length === 0 ? (
              <NotBuiltYet what="Nothing yet" detail="Approvals, rejections and NDA signatures appear here." />
            ) : (
              activity.map((n, i) => (
                <div key={i} style={{ position: "relative", padding: "16px 24px 16px 26px", borderBottom: `1px solid ${ROW_RULE}` }}>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: n.tone === "amber" ? AMBER : BLUE }} />
                  <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.09em", textTransform: "uppercase", color: n.tone === "amber" ? AMBER : BLUE }}>
                    {n.kind}
                  </div>
                  <div style={{ marginTop: 10, fontFamily: SANS, fontSize: 15, lineHeight: 1.5, color: "rgba(244,245,247,0.9)" }}>{n.who}</div>
                  <div style={{ marginTop: 4, fontFamily: MONO, fontSize: 13, lineHeight: 1.6, color: "rgba(166,173,184,0.9)" }}>{n.text}</div>
                  <div style={{ marginTop: 8, fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.09em", textTransform: "uppercase", color: "rgba(166,173,184,0.6)" }}>
                    {timeStamp(n.at)}
                  </div>
                </div>
              ))
            )}
          </Panel>

          <Panel title="Onboarding funnel">
            <div style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              {funnel.map((f) => (
                <div key={f.key}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                    <div style={capLabel}>{f.key}</div>
                    <div style={{ fontFamily: MONO, fontSize: 15, fontVariantNumeric: "tabular-nums", color: "rgba(244,245,247,0.9)" }}>{f.val}</div>
                  </div>
                  <div style={{ marginTop: 8, height: 3, background: "rgba(244,245,247,0.07)" }}>
                    <div style={{ height: 3, width: f.pct, background: "rgba(92,200,255,0.55)" }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <div style={{ fontFamily: MONO, fontSize: 11, lineHeight: 1.6, letterSpacing: "0.04em", color: "rgba(166,173,184,0.55)", borderTop: `1px solid ${HAIR_SOFT}`, paddingTop: 16 }}>
            Every figure above is computed from the partners and deals tables. Reports and settings do not exist yet.
          </div>
        </div>
      </div>
    </AppShell>
  );
}
