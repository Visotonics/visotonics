import { redirect } from "next/navigation";
import Link from "next/link";
import {
  AMBER,
  BLUE,
  ghostPillStyle,
  INK,
  INK_35,
  INK_45,
  INK_60,
  mono,
  PortalSheet,
  Register,
  RULE,
  RULE_SOFT,
  sans,
  SIGNAL,
} from "../_shared";
import SignOutButton from "../sign-out-button";
import { pageMeta } from "@/lib/seo";
import { getCurrentPartner } from "@/lib/auth";
import { nextStepFor, PARTNER_TYPE_LABELS, STEP_ROUTES, type PartnerRow } from "@/lib/partner";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  dealValue,
  formatUsd,
  INDUSTRY_LABELS,
  PLATFORM_LABELS,
  type DealRow,
} from "@/lib/deal";
import {
  AppShell,
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
  title: "Dashboard",
  description: "Visotonics partner dashboard.",
  path: "/client-portal/dashboard",
  noindex: true,
});

/* ---------------------------------------------------------------------------
   /client-portal/dashboard — three states, three imported designs.

     pending   → study 4C · FULL-BLEED LEDGER      (Dashboard States)
     rejected  → study 5C · STATEMENT              (Dashboard States)
     active    → Partner Dashboard v2 · app shell

   The two terminal states stay as drafting sheets on purpose: a partner who
   is waiting or has been turned down has no navigation to do, so giving them
   a sidebar of destinations they cannot use would be worse than the sheet.
   The app shell appears only once there is an account to operate.

   WHAT IS REAL AND WHAT IS NOT. The v2 design is drawn around a mature
   product — deal registrations, protected value, a twelve-week bar chart.
   None of that data exists. Those panels render explicit empty states rather
   than sample figures. The account panel and the activity feed ARE real,
   built from the partners row.
--------------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

function ref(partner: PartnerRow) {
  return `ACC-${partner.id.slice(0, 4).toUpperCase()}`;
}

const tcell: React.CSSProperties = { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

/* House colour law applied to a deal's state. A deal awaiting review is BLUE
   — the system is observing it, nothing has concluded. AMBER is a decision
   label, so it carries both outcomes. No SIGNAL: this screen already spends
   its one orange on the "Register a deal" control. */
function dealState(status: DealRow["status"]) {
  if (status === "approved") return { label: "APPROVED", ink: AMBER, dot: AMBER };
  if (status === "rejected") return { label: "NOT APPROVED", ink: "rgba(255,176,32,0.65)", dot: "rgba(255,176,32,0.55)" };
  return { label: "UNDER REVIEW", ink: BLUE, dot: BLUE };
}

/* PLATFORM_LABELS carry a descriptive tail ("VisoPercept — Industrial AI
   platform") that is right on the form and far too long for a table column.
   The product name is the part before the em dash; the full label stays as
   the title attribute so nothing is actually lost. */
function platformShort(d: DealRow) {
  const full = PLATFORM_LABELS[d.platform];
  return full ? full.split(" — ")[0] : "—";
}

function stamp(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function DashboardPage() {
  const partner = await getCurrentPartner();
  if (!partner) redirect("/client-portal");

  const step = nextStepFor(partner);
  if (step === "admin") redirect(STEP_ROUTES.admin);
  /* "choose-type" was removed from OnboardingStep; the dead half of this
     comparison broke the build (TS2367) and was dropped — same behaviour. */
  if (step === "sign-nda") redirect(STEP_ROUTES[step]);

  /* ---- 4C · FULL-BLEED LEDGER — still in the queue --------------------- */
  if (step === "pending") {
    const rows = [
      { num: "01", label: "Application", val: "SUBMITTED", done: true },
      { num: "02", label: "Review", val: "IN PROGRESS", done: false },
      { num: "03", label: "Onboarding", val: "NOT STARTED", done: false },
    ];

    return (
      <PortalSheet width={1180} bleed>
        <div style={{ color: INK, padding: "72px 0 88px" }}>
          <div style={{ padding: "0 80px" }}>
            <Register width={460} nowrap>
              Application · Under review · {ref(partner)}
            </Register>
            <h1 style={{ margin: "64px 0 0", fontFamily: sans, fontSize: 56, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 0.98, color: "#fff", maxWidth: "14ch" }}>
              Your application is with partnerships
            </h1>
          </div>

          <div style={{ marginTop: 88, borderTop: `1px solid ${RULE}` }}>
            {rows.map((r) => (
              <div key={r.num} style={{ display: "grid", gridTemplateColumns: "88px minmax(0, 1fr) 280px 40px", gap: 32, alignItems: "center", padding: "28px 80px", borderBottom: `1px solid ${RULE_SOFT}` }}>
                <div style={{ fontFamily: mono, fontSize: 13, letterSpacing: "0.08em", color: "rgba(92,200,255,0.8)" }}>{r.num}</div>
                <div style={{ fontFamily: sans, fontSize: 28, fontWeight: 500, letterSpacing: "-0.015em", color: r.done ? "rgba(244,245,247,0.95)" : "rgba(244,245,247,0.7)" }}>{r.label}</div>
                <div style={{ fontFamily: mono, fontSize: 14, letterSpacing: "0.06em", color: r.done ? "rgba(244,245,247,0.85)" : "rgba(92,200,255,0.7)" }}>{r.val}</div>
                <div style={{ fontFamily: mono, fontSize: 16, color: BLUE, textAlign: "right" }}>{r.done ? "✓" : ""}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: "40px 80px 0", display: "flex", justifyContent: "space-between", gap: 48, alignItems: "baseline", flexWrap: "wrap" }}>
            <p style={{ margin: 0, maxWidth: "52ch", fontFamily: sans, fontSize: 15, lineHeight: 1.65, color: INK_60 }}>
              Your account for <strong style={{ color: "#fff", fontWeight: 500 }}>{partner.company}</strong>{" "}
              is registered and waiting for review. We&apos;ll email you as soon as a decision is made —
              nothing further is required from you.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 20, flex: "0 0 auto" }}>
              <span style={{ fontFamily: mono, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: INK_35 }}>No action available</span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </PortalSheet>
    );
  }

  /* ---- 5C · STATEMENT — turned down ------------------------------------ */
  if (step === "rejected") {
    const meta = [
      { key: "Reviewed", val: stamp(partner.decided_at) },
      { key: "Reference", val: `${ref(partner)} / R1` },
      { key: "Reviewer", val: "Partnerships desk" },
    ];

    return (
      <PortalSheet width={1180} bleed>
        <div style={{ color: INK, padding: "72px 0 88px" }}>
          <div style={{ padding: "0 80px" }}>
            <Register width={460} nowrap>
              Application · Closed · {ref(partner)}
            </Register>
          </div>

          <div style={{ marginTop: 88, position: "relative", padding: "0 80px" }}>
            <div style={{ position: "absolute", left: 80, top: 0, bottom: 0, width: 2, background: SIGNAL }} />
            <div style={{ paddingLeft: 40 }}>
              <div style={{ fontFamily: mono, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: AMBER }}>Decision</div>
              <h1 style={{ margin: "24px 0 0", fontFamily: sans, fontSize: 44, fontWeight: 500, letterSpacing: "-0.028em", lineHeight: 1.1, color: "#fff", maxWidth: "26ch" }}>
                {partner.rejection_reason || "We weren't able to approve this partner account."}
              </h1>
              <p style={{ margin: "24px 0 0", maxWidth: "56ch", fontFamily: sans, fontSize: 16, lineHeight: 1.65, color: INK_60 }}>
                The application for <strong style={{ color: "#fff", fontWeight: 500 }}>{partner.company}</strong> is
                closed. If your circumstances change, or you believe this is a mistake, partnerships will re-open the file.
              </p>
            </div>
          </div>

          <div style={{ marginTop: 64, borderTop: `1px solid ${RULE}`, borderBottom: `1px solid ${RULE}`, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
            {meta.map((m) => (
              <div key={m.key} style={{ padding: "28px 40px", borderLeft: `1px solid rgba(244,245,247,0.09)`, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: INK_45 }}>{m.key}</div>
                <div style={{ fontFamily: mono, fontSize: 14, color: "rgba(244,245,247,0.85)" }}>{m.val}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: "40px 80px 0", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <Link href="/contact" style={ghostPillStyle}>Contact partnerships</Link>
            <span style={{ fontFamily: mono, fontSize: 12, color: INK_35 }}>{partner.email}</span>
            <div style={{ marginLeft: "auto" }}><SignOutButton /></div>
          </div>
        </div>
      </PortalSheet>
    );
  }

  /* ---- Partner Dashboard v2 · app shell -------------------------------- */

  /* Read with the *anon* server client, so the "partners read own deals" RLS
     policy is what scopes this to me — the page doubles as a live check that
     the policy works. An error here is almost always "0004 has not been
     applied yet"; it degrades to the honest empty state rather than a crash,
     which is the same choice the whole portal makes about missing config. */
  const supabase = await createServerSupabase();
  const { data: dealData, error: dealError } = supabase
    ? await supabase
        .from("deals")
        .select("*")
        .eq("partner_id", partner.id)
        .order("created_at", { ascending: false })
    : { data: null, error: null };

  if (dealError) {
    console.error("[dashboard] could not read deals:", dealError.message);
  }

  const deals = (dealData ?? []) as DealRow[];
  const openDeals = deals.filter((d) => d.status === "submitted");
  const approvedDeals = deals.filter((d) => d.status === "approved");
  const protectedValue = approvedDeals.reduce((sum, d) => sum + dealValue(d), 0);
  const hasDeals = deals.length > 0;

  /* An empty account shows "—", not "0". A zero is a measurement; a dash is
     an admission that there is nothing to measure. The three cells only
     become numbers once at least one deal exists. */
  const metricValue = (n: number) => (hasDeals ? String(n) : "—");

  const typeLabel = partner.partner_type ? PARTNER_TYPE_LABELS[partner.partner_type] : "Partner";
  const initials = partner.company.replace(/[^A-Za-z ]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "PA";

  const nav: NavItem[] = [
    { num: "01", label: "Overview", href: "/client-portal/dashboard", active: true },
    { num: "02", label: "Deals", count: hasDeals ? String(deals.length) : undefined, href: "/client-portal/dashboard/deals/new" },
    { num: "03", label: "Catalogue" },
    { num: "04", label: "Resources" },
    { num: "05", label: "Account" },
  ];

  /* Real activity, from the row's own timestamps. Nothing invented. */
  const log = [
    partner.nda_signed_at && { at: partner.nda_signed_at, text: "NDA countersigned — copy emailed to you", blue: true },
    partner.decided_at && { at: partner.decided_at, text: "Application approved by partnerships", blue: true },
    // Type is declared at registration now, so this is part of the same event
    // as "Account registered" rather than a later step of its own.
    partner.partner_type && { at: partner.created_at, text: `Registered as ${typeLabel}`, blue: false },
    { at: partner.created_at, text: "Account registered", blue: false },
  ].filter(Boolean) as { at: string; text: string; blue: boolean }[];

  const facts = [
    { key: "Type", val: typeLabel, ink: "rgba(244,245,247,0.85)" },
    { key: "Status", val: "Active", ink: BLUE },
    { key: "Partner since", val: stamp(partner.decided_at ?? partner.created_at), ink: "rgba(244,245,247,0.85)" },
    { key: "Reference", val: ref(partner), ink: "rgba(244,245,247,0.85)" },
  ];

  return (
    <AppShell
      section="Partner portal"
      nav={nav}
      tabs={[{ label: "Summary", active: true }, { label: "Registrations" }, { label: "Performance" }, { label: "Documents" }]}
      userInitials={initials}
      userName={partner.company}
      userRole={typeLabel}
      topRight={
        <>
          <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(244,245,247,0.4)" }}>
            {ref(partner)} · {typeLabel}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 5, height: 5, background: BLUE }} />
            <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(92,200,255,0.85)" }}>Active</div>
          </div>
        </>
      }
    >
      <div className="portal-grid" style={{ padding: 32, ["--portal-rail" as string]: "360px" }}>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 32, flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 300 }}>
                <div style={{ height: 1, background: BLUE }} />
                <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(92,200,255,0.85)" }}>
                  Overview
                </div>
              </div>
              <h1 style={{ margin: "20px 0 0", fontFamily: SANS, fontSize: 34, fontWeight: 600, letterSpacing: "-0.025em", color: "#F4F5F7" }}>{partner.company}</h1>
            </div>
            <div style={{ display: "flex", alignItems: "stretch", gap: 12 }}>
              <div title="Not built yet" style={{ display: "flex", alignItems: "center", padding: "0 22px", height: 46, fontFamily: SANS, fontSize: 14, color: "rgba(166,173,184,0.6)", border: `1px solid rgba(244,245,247,0.1)`, cursor: "default" }}>
                Catalogue
              </div>
              {/* The one orange on the screen, and as of 2026-08-10 it is
                  finally a live action rather than an honest label on an
                  unbuilt one — which is what makes spending the screen's
                  single SIGNAL on it legitimate. */}
              <Link href="/client-portal/dashboard/deals/new" style={{ position: "relative", display: "flex", alignItems: "center", padding: "0 24px 0 26px", height: 46, background: "rgba(244,245,247,0.08)", color: "var(--text-dark-primary)", fontFamily: SANS, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: SIGNAL }} />
                Register a deal
              </Link>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", border: `1px solid rgba(244,245,247,0.1)`, background: "#101216" }}>
            <Metric
              num="01"
              label="Open registrations"
              value={metricValue(openDeals.length)}
              unit={hasDeals ? `of ${deals.length}` : undefined}
              base={hasDeals ? "Awaiting a decision" : "No deals yet"}
              pct={hasDeals ? `${Math.round((openDeals.length / deals.length) * 100)}%` : "0%"}
            />
            <Metric
              num="02"
              label="Approved"
              value={metricValue(approvedDeals.length)}
              unit={hasDeals ? "deals" : undefined}
              base={hasDeals ? "Protected to you" : "No deals yet"}
              pct={hasDeals ? `${Math.round((approvedDeals.length / deals.length) * 100)}%` : "0%"}
              barColor="rgba(244,245,247,0.3)"
            />
            <Metric
              num="03"
              label="Protected value"
              value={hasDeals ? formatUsd(protectedValue) : "—"}
              base={approvedDeals.length ? `Across ${approvedDeals.length} approved deal${approvedDeals.length === 1 ? "" : "s"}` : hasDeals ? "Nothing approved yet" : "No deals yet"}
              pct={hasDeals ? `${Math.round((approvedDeals.length / deals.length) * 100)}%` : "0%"}
            />
          </div>

          <Panel
            title="Your deals"
            headerSize="lg"
            action={
              <Link href="/client-portal/dashboard/deals/new" style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.09em", textTransform: "uppercase", color: "rgba(92,200,255,0.85)", textDecoration: "none" }}>
                Register a deal
              </Link>
            }
          >
            {dealError && (
              <div style={{ padding: "20px 24px", fontFamily: MONO, fontSize: 13, color: AMBER }}>
                Could not load your deals: {dealError.message}
              </div>
            )}
            {!dealError && !hasDeals && (
              <NotBuiltYet
                what="No deals registered"
                detail="Register an opportunity and it appears here with its reference, value and review status. Nothing above is a zero — there is simply nothing to count yet."
              />
            )}
            {hasDeals && (
              <div className="portal-table-scroll">
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "120px minmax(0, 1fr) 130px 150px 130px 150px", gap: 20, padding: "12px 24px", borderBottom: `1px solid rgba(244,245,247,0.12)` }}>
                    {["Reference", "Customer", "Industry", "Platform", "Value", "Status"].map((h, i) => (
                      <div key={h} style={{ ...capLabel, textAlign: i === 4 ? "right" : "left" }}>{h}</div>
                    ))}
                  </div>
                  {deals.map((d) => {
                    const st = dealState(d.status);
                    return (
                      <div key={d.id} style={{ display: "grid", gridTemplateColumns: "120px minmax(0, 1fr) 130px 150px 130px 150px", gap: 20, alignItems: "center", padding: "14px 24px", borderBottom: `1px solid ${ROW_RULE}` }}>
                        <div style={{ ...tcell, fontFamily: MONO, fontSize: 13, letterSpacing: "0.04em", color: "rgba(244,245,247,0.9)" }}>{d.reference}</div>
                        <div style={{ ...tcell, fontFamily: SANS, fontSize: 15, color: "rgba(244,245,247,0.95)" }}>{d.customer_name}</div>
                        <div style={{ ...tcell, fontFamily: MONO, fontSize: 13, color: "rgba(166,173,184,0.9)" }}>{INDUSTRY_LABELS[d.industry] ?? "—"}</div>
                        <div style={{ ...tcell, fontFamily: MONO, fontSize: 13, color: "rgba(166,173,184,0.9)" }} title={PLATFORM_LABELS[d.platform]}>{platformShort(d)}</div>
                        <div style={{ ...tcell, fontFamily: MONO, fontSize: 14, fontVariantNumeric: "tabular-nums", textAlign: "right", color: "rgba(244,245,247,0.9)" }}>{formatUsd(dealValue(d))}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          <div style={{ width: 5, height: 5, background: st.dot, flex: "0 0 auto" }} />
                          <div style={{ ...tcell, fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.07em", color: st.ink }} title={d.rejection_reason ?? undefined}>
                            {st.label}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Panel>
        </div>

        {/* ---- right rail ---- */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <Panel title="Account">
            <div style={{ padding: "20px 24px 24px" }}>
              <div style={{ fontFamily: SANS, fontSize: 20, fontWeight: 600, letterSpacing: "-0.015em", color: "var(--text-dark-primary)" }}>{partner.company}</div>
              <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 13, color: "var(--text-dark-secondary)", overflow: "hidden", textOverflow: "ellipsis" }}>{partner.email}</div>
              <div style={{ marginTop: 20, borderTop: `1px solid rgba(244,245,247,0.1)` }}>
                {facts.map((f) => (
                  <div key={f.key} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, padding: "10px 0", borderBottom: `1px solid rgba(244,245,247,0.06)` }}>
                    <div style={capLabel}>{f.key}</div>
                    <div style={{ fontFamily: MONO, fontSize: 14, color: f.ink }}>{f.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="Activity">
            <div style={{ padding: "4px 24px 12px" }}>
              {log.map((l, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 0", borderBottom: `1px solid ${ROW_RULE}` }}>
                  <div style={{ width: 5, height: 5, background: l.blue ? BLUE : "rgba(244,245,247,0.25)", flex: "0 0 auto", marginTop: 7 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: SANS, fontSize: 15, lineHeight: 1.5, color: "rgba(244,245,247,0.85)" }}>{l.text}</div>
                    <div style={{ marginTop: 5, fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.09em", textTransform: "uppercase", color: "rgba(166,173,184,0.6)" }}>
                      {stamp(l.at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <div style={{ fontFamily: MONO, fontSize: 11, lineHeight: 1.6, letterSpacing: "0.04em", color: "rgba(166,173,184,0.55)", borderTop: `1px solid ${HAIR_SOFT}`, paddingTop: 16 }}>
            Catalogue and resources are not built yet. Anything shown as “—” has no data behind it rather than a value of zero.
          </div>
        </div>
      </div>
    </AppShell>
  );
}
