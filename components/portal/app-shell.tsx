import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import SignOutButton from "@/app/client-portal/sign-out-button";

/* ---------------------------------------------------------------------------
   The portal application shell — 248px sidebar + 68px topbar + content.

   STRUCTURE, SHAPE AND LAYOUT come from the Claude Design "Admin Dashboard" /
   "Partner Dashboard v2" studies and are followed strictly: the sidebar
   width, the topbar height, the metric strip, the panel stack, the right
   rail, the square corners.

   EVERYTHING ELSE is the house design language (docs/07-design-language.md),
   and it differs from the studies in four ways that matter:

   1. TWO FAMILIES, NOT ONE. The studies set Archivo on everything. The house
      rule is that anything reading as instrument output — eyebrows, counts,
      states, timestamps, table headers, reference numbers — is MONO. Sans is
      for display and body only. This is the single biggest visual change and
      the reason the shell now reads as the same drawing as the rest of the
      site rather than a generic dark dashboard.
   2. HOUSE INK. `--text-dark-primary` / `--text-dark-secondary` /
      `--border-dark`, not the studies' #E2EAF4.
   3. HOUSE SPACING. 8px base: 32px card padding (--spacing-s8), 24px gutters
      (--spacing-s6).
   4. THE REAL WORDMARK — the logo asset the nav and footer use, not letter-
      spaced type.

   Colour discipline is unchanged and is house law: BLUE is the system
   observing (rules, numerals, eyebrows, marks); SIGNAL orange is a
   conclusion and gets placement, not area — at most one per screen.

   ONE HONESTY RULE: a nav item or tab that leads nowhere renders INERT —
   dimmed, no pointer, marked "soon". The studies assume a finished product;
   we have the approval flow. Five confident destinations that all no-op
   would be the most misleading thing on the page.
--------------------------------------------------------------------------- */

export const BLUE = "#5CC8FF";
export const AMBER = "#FFB020";
export const SIGNAL = "#ED510C";

export const SHELL_BG = "var(--canvas-dark)";
export const PANEL = "var(--surface-dark-1)";
export const HAIR = "var(--border-dark)";
export const HAIR_SOFT = "rgba(244,245,247,0.07)";
export const ROW_RULE = "rgba(244,245,247,0.06)";
export const TXT_1 = "var(--text-dark-primary)";
export const TXT_2 = "var(--text-dark-secondary)";

export const SANS = "var(--font-archivo)";
export const MONO = "var(--font-plex-mono)";

/** Card padding, --spacing-s8. */
const PAD = 32;
/** Gutter, --spacing-s6. */
const GUT = 24;

export type NavItem = { num: string; label: string; count?: string; href?: string; active?: boolean };
export type ShellTab = { label: string; count?: string; active?: boolean };

/** The drawing's annotation voice: mono, 13px, uppercase, 0.08em. */
export const eyebrow: CSSProperties = {
  fontFamily: MONO,
  fontSize: 13,
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: TXT_2,
};

/** Smaller instrument label — table headers, key/value keys. */
export const capLabel: CSSProperties = { ...eyebrow, fontSize: 11, letterSpacing: "0.09em" };

/** Console/telemetry text: mono, 14px, no transform. */
export const logText: CSSProperties = { fontFamily: MONO, fontSize: 14, lineHeight: 1.6, color: TXT_2 };

/** 9px registration cross — the house drafting mark, at a real intersection. */
export function Cross({ style, color = "rgba(92,200,255,0.5)" }: { style: CSSProperties; color?: string }) {
  return (
    <div aria-hidden="true" style={{ position: "absolute", width: 9, height: 9, ...style }}>
      <div style={{ position: "absolute", top: 4, left: 0, width: 9, height: 1, background: color }} />
      <div style={{ position: "absolute", left: 4, top: 0, width: 1, height: 9, background: color }} />
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  headerSize = "cap",
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  headerSize?: "cap" | "lg";
}) {
  return (
    <div style={{ border: `1px solid ${HAIR}`, background: PANEL, minWidth: 0 }}>
      {title && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: GUT, padding: `${GUT}px ${PAD}px`, borderBottom: `1px solid ${HAIR_SOFT}` }}>
          <div style={headerSize === "lg" ? { fontFamily: SANS, fontSize: 20, fontWeight: 600, letterSpacing: "-0.015em", color: TXT_1 } : capLabel}>
            {title}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

/* A metric card's own label IS about its number, so per the house
   instrumentation-vs-claim rule the figure is display type: sans, solid
   white, tabular-nums, no shadow. The label above it stays instrumentation. */
export function Metric({
  num,
  label,
  value,
  unit,
  base,
  pct,
  barColor = "rgba(92,200,255,0.55)",
}: {
  num: string;
  label: string;
  value: string;
  unit?: string;
  base?: string;
  pct: string;
  barColor?: string;
}) {
  return (
    <div style={{ position: "relative", padding: `${PAD}px ${PAD}px ${GUT}px`, borderLeft: `1px solid ${HAIR_SOFT}`, display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", color: "rgba(92,200,255,0.7)" }}>{num}</div>
        <div style={capLabel}>{label}</div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <div style={{ fontFamily: SANS, fontSize: 40, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1, fontVariantNumeric: "tabular-nums", color: TXT_1 }}>
          {value}
        </div>
        {unit && <div style={{ fontFamily: MONO, fontSize: 12, color: TXT_2 }}>{unit}</div>}
      </div>
      <div>
        <div style={{ height: 3, background: "rgba(244,245,247,0.07)" }}>
          <div style={{ height: 3, width: pct, background: barColor }} />
        </div>
        <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 12, color: TXT_2 }}>{base}</div>
      </div>
    </div>
  );
}

export function NotBuiltYet({ what, detail }: { what: string; detail?: string }) {
  return (
    <div style={{ padding: `44px ${PAD}px`, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
      <div style={{ ...capLabel, color: "rgba(244,245,247,0.35)" }}>{what}</div>
      {detail && <div style={{ fontFamily: SANS, fontSize: 15, lineHeight: 1.5, color: "rgba(166,173,184,0.7)", maxWidth: "44ch" }}>{detail}</div>}
    </div>
  );
}

export function AppShell({
  section,
  nav,
  tabs,
  topRight,
  userInitials,
  userName,
  userRole,
  children,
}: {
  section: string;
  nav: NavItem[];
  tabs: ShellTab[];
  topRight: ReactNode;
  userInitials: string;
  userName: string;
  userRole: string;
  children: ReactNode;
}) {
  return (
    <div className="portal-shell" style={{ minHeight: "100vh", background: SHELL_BG, color: TXT_1, display: "grid", gridTemplateColumns: "248px minmax(0, 1fr)", fontFamily: SANS }}>
      {/* ---- sidebar ---- */}
      <div className="portal-sidebar" style={{ borderRight: `1px solid ${HAIR}`, display: "flex", flexDirection: "column" }}>
        <div style={{ height: 68, display: "flex", alignItems: "center", padding: `0 ${GUT}px`, borderBottom: `1px solid ${HAIR}` }}>
          <Link href="/" aria-label="Visotonics home" style={{ display: "flex", alignItems: "center" }}>
            {/* The real wordmark, as the nav and footer use it. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/visotonics-high-resolution-logo-transparent.png"
              alt="Visotonics"
              style={{ display: "block", height: 16, width: "auto" }}
            />
          </Link>
        </div>

        <div className="portal-nav" style={{ padding: `${GUT}px 0 0` }}>
          <div style={{ ...capLabel, padding: `0 ${GUT}px 12px`, color: "rgba(166,173,184,0.55)" }}>{section}</div>
          {nav.map((item) => {
            const live = !!item.href;
            const body = (
              <>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: item.active ? BLUE : "transparent" }} />
                <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", color: item.active ? BLUE : "rgba(92,200,255,0.4)" }}>{item.num}</div>
                <div style={{ fontFamily: SANS, fontSize: 15, color: item.active ? TXT_1 : live ? TXT_2 : "rgba(166,173,184,0.45)" }}>{item.label}</div>
                <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", color: item.active ? "rgba(92,200,255,0.8)" : "rgba(166,173,184,0.45)" }}>
                  {item.count ?? (live ? "" : "soon")}
                </div>
              </>
            );
            const style: CSSProperties = {
              position: "relative",
              display: "grid",
              gridTemplateColumns: "28px minmax(0, 1fr) auto",
              alignItems: "center",
              gap: 12,
              padding: `13px ${GUT}px`,
              background: item.active ? "rgba(92,200,255,0.06)" : "transparent",
              textDecoration: "none",
              cursor: live ? "pointer" : "default",
            };
            return live ? (
              <Link key={item.num} href={item.href!} style={style}>{body}</Link>
            ) : (
              <div key={item.num} style={style} aria-disabled="true" title="Not built yet">{body}</div>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ borderTop: `1px solid ${HAIR}`, padding: `20px ${GUT}px`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, background: "rgba(92,200,255,0.1)", border: `1px solid rgba(92,200,255,0.4)`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", color: BLUE, flex: "0 0 auto" }}>
            {userInitials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: SANS, fontSize: 14, color: TXT_1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName}</div>
            <div style={{ marginTop: 3, display: "flex", alignItems: "center", gap: 6, fontFamily: MONO, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(166,173,184,0.7)" }}>
              <span>{userRole}</span>
              <span aria-hidden="true">·</span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </div>

      {/* ---- main ---- */}
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", position: "relative" }}>
        <div style={{ height: 68, display: "flex", alignItems: "stretch", justifyContent: "space-between", gap: PAD, borderBottom: `1px solid ${HAIR}` }}>
          <div style={{ display: "flex", alignItems: "stretch" }}>
            {tabs.map((t) => (
              <div
                key={t.label}
                title={t.active ? undefined : "Not built yet"}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: `0 ${GUT}px`,
                  fontFamily: SANS,
                  fontSize: 14,
                  whiteSpace: "nowrap",
                  color: t.active ? TXT_1 : "rgba(166,173,184,0.45)",
                  background: t.active ? "rgba(92,200,255,0.05)" : "transparent",
                  borderRight: `1px solid ${HAIR_SOFT}`,
                  cursor: "default",
                }}
              >
                {t.label}
                {t.count && (
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", color: t.active ? "rgba(92,200,255,0.85)" : "rgba(166,173,184,0.5)" }}>
                    {t.count}
                  </span>
                )}
                <div style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 2, background: t.active ? BLUE : "transparent" }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, paddingRight: PAD, flex: "0 0 auto" }}>{topRight}</div>
        </div>

        {/* Drafting registration mark where the topbar rule meets the sidebar. */}
        <Cross style={{ left: -4, top: 64 }} />

        {children}
      </div>
    </div>
  );
}
