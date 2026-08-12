import Link from "next/link";
import type { CSSProperties } from "react";
import { pageMeta } from "@/lib/seo";

/* ---------------------------------------------------------------------------
   /company/partners — "Grow with us"

   Was a ComingSoon stub. Built out because the nav's Partners menu now links
   here by name, and a menu item pointing at a placeholder is worse than the
   menu item not existing. Styled to match the other /company/* pages
   (offices, about) rather than introducing a new layout.

   The ONE call to action is "Login and Register", to /client-portal — that
   page already offers both (sign-in form + a Register link, see
   client-portal/sign-in-form.tsx), so one destination covers both verbs
   rather than building a second landing choice here.
--------------------------------------------------------------------------- */

const CANVAS_DARK = "#0A0B0E";
const TXT_D1 = "#F4F5F7";
const TXT_D2 = "#A6ADB8";
const TXT_D3 = "#6B7078";
const BORDER_D = "rgba(244,245,247,0.10)";
const SIGNAL = "#ED510C";

const mono = "var(--font-plex-mono)";
const sans = "var(--font-archivo)";

const eyebrow: CSSProperties = {
  fontFamily: mono,
  fontSize: 13,
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: TXT_D2,
};

const BENEFITS = [
  {
    n: "01",
    title: "Deal registration",
    body: "Register an opportunity and it is protected — no channel conflict, clear ownership, a status you can see.",
  },
  {
    n: "02",
    title: "Margin on hardware you already sell",
    body: "Visotonics runs on the cameras your customers already own. You are not adding a line item, you are adding software margin to a sale you were already making.",
  },
  {
    n: "03",
    title: "Certified onboarding",
    body: "A short technical onboarding gets your team to first deployment without leaning on us for every install.",
  },
  {
    n: "04",
    title: "Direct line to the product team",
    body: "Partner feedback reaches the people building the platform, not a queue.",
  },
];

const primaryCta: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 48,
  padding: "0 28px",
  borderRadius: "var(--radius-r-pill)",
  background: "var(--interactive-dark-primary-bg)",
  color: "var(--interactive-dark-primary-fg)",
  fontFamily: sans,
  fontSize: 16,
  fontWeight: 500,
  textDecoration: "none",
};

export const metadata = pageMeta({
  title: "Partners",
  description: "Become a Visotonics partner — register deals, grow your margin, and get certified onboarding.",
  path: "/company/partners",
});

export default function PartnersPage() {
  return (
    <section style={{ background: CANVAS_DARK }}>
      {/* DESKTOP */}
      <div className="hidden md:block" style={{ maxWidth: 1440, margin: "0 auto", boxSizing: "border-box", padding: "96px" }}>
        <span style={eyebrow}>Partners</span>
        <h1 style={{ margin: "16px 0 0", fontFamily: sans, fontSize: 64, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_D1, maxWidth: "16ch" }}>
          Grow with Visotonics.
        </h1>
        <p style={{ margin: "24px 0 0", fontSize: 20, lineHeight: 1.6, color: TXT_D2, maxWidth: "56ch" }}>
          Sell physical AI into the yards, warehouses and plants you already work in. Register deals, protect your
          pipeline, and get certified to deploy.
        </p>
        <Link href="/client-portal" className="dt-underline-draw" style={{ ...primaryCta, marginTop: 40 }}>
          Login and Register
        </Link>

        <div className="grid grid-cols-2" style={{ marginTop: 96, borderTop: `1px solid ${BORDER_D}`, gap: 0 }}>
          {BENEFITS.map((b, i) => (
            <div
              key={b.n}
              style={{
                padding: "48px 48px 48px 0",
                borderRight: i % 2 === 0 ? `1px solid ${BORDER_D}` : "none",
                borderBottom: i < 2 ? `1px solid ${BORDER_D}` : "none",
              }}
            >
              <span style={{ fontFamily: mono, fontSize: 13, letterSpacing: "0.06em", color: SIGNAL }}>{b.n}</span>
              <h2 style={{ margin: "16px 0 0", fontFamily: sans, fontSize: 24, fontWeight: 600, letterSpacing: "-0.01em", color: TXT_D1 }}>{b.title}</h2>
              <p style={{ margin: "12px 0 0", fontSize: 16, lineHeight: 1.6, color: TXT_D3, maxWidth: "42ch" }}>{b.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* MOBILE */}
      <div className="md:hidden" style={{ padding: "48px 24px 64px" }}>
        <span style={{ ...eyebrow, fontSize: 11 }}>Partners</span>
        <h1 style={{ margin: "16px 0 0", fontFamily: sans, fontSize: 40, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_D1 }}>
          Grow with Visotonics.
        </h1>
        <p style={{ margin: "16px 0 0", fontSize: 17, lineHeight: 1.6, color: TXT_D2 }}>
          Sell physical AI into the yards, warehouses and plants you already work in. Register deals, protect your
          pipeline, and get certified to deploy.
        </p>
        <Link href="/client-portal" style={{ ...primaryCta, marginTop: 28, width: "100%" }}>
          Login and Register
        </Link>

        <div style={{ marginTop: 56 }}>
          {BENEFITS.map((b, i) => (
            <div
              key={b.n}
              style={{
                borderTop: `1px solid ${BORDER_D}`,
                borderBottom: i === BENEFITS.length - 1 ? `1px solid ${BORDER_D}` : "none",
                padding: "28px 0",
              }}
            >
              <span style={{ fontFamily: mono, fontSize: 12, letterSpacing: "0.06em", color: SIGNAL }}>{b.n}</span>
              <h2 style={{ margin: "10px 0 0", fontFamily: sans, fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", color: TXT_D1 }}>{b.title}</h2>
              <p style={{ margin: "8px 0 0", fontSize: 15, lineHeight: 1.6, color: TXT_D3 }}>{b.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
