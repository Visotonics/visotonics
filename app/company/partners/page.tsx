import Link from "next/link";
import { pageMeta } from "@/lib/seo";

/* ---------------------------------------------------------------------------
   /company/partners — "Grow with Visotonics." (Design direction 1c —
   "The Manifest": dense instrument strip, index-heavy.)

   Was a ComingSoon stub. Built out because the nav's Partners menu now links
   here by name, and a menu item pointing at a placeholder is worse than the
   menu item not existing.

   1c's signature move is the right-aligned intro paragraph against a
   left-aligned H1 (deliberate asymmetry — do not "fix" it into symmetry),
   no eyebrow label, and a 4-up instrument strip with vertical rules instead
   of the 2x2 grid used elsewhere on the site.

   The ONE call to action is "Register as our partner!", to /client-portal —
   that page already offers both sign-in and register (see
   client-portal/sign-in-form.tsx), so one destination covers both verbs
   rather than building a second landing choice here.
--------------------------------------------------------------------------- */

const CANVAS_DARK = "#0A0B0E";
const TXT_D1 = "#F4F5F7";
const TXT_D2 = "#A6ADB8";
const TXT_D3 = "#6B7078";
const BORDER_D = "rgba(244,245,247,0.10)";
const BORDER_D_18 = "rgba(244,245,247,0.18)";
const SIGNAL = "#ED510C";

const mono = "var(--font-plex-mono)";
const sans = "var(--font-archivo)";

const STRIP = [
  { n: "01", title: "Deal registration", body: "Protected the moment you register — no channel conflict." },
  { n: "02", title: "Margin on hardware you sell", body: "Software margin on a sale you were already making." },
  { n: "03", title: "Certified onboarding", body: "Straight to first deployment, no hand-holding." },
  { n: "04", title: "Direct line to product", body: "Feedback reaches builders, not a queue." },
];

export const metadata = pageMeta({
  title: "Partners",
  description: "Become a Visotonics partner — register deals, grow your margin, and get certified onboarding.",
  path: "/company/partners",
});

export default function PartnersPage() {
  return (
    <section style={{ background: CANVAS_DARK }}>
      {/* DESKTOP — 1c "The Manifest". The spec's own card is a standalone
          1040px canvas with padding:56px 56px 0 baked into the card itself.
          Rather than re-wrapping that in a second, separately-centered
          1040px column inside a 1440px/96px shell (two nested padding
          boxes, which is what made the live page read as "off" vs. the
          design), this is a single 1440px shell with one padding rhythm —
          the same 96px used by sibling /company pages (see
          app/company/about/page.tsx's `md:p-24`) — with a matching 96px
          bottom so the strip doesn't sit flush against the footer. */}
      <div className="hidden md:block" style={{ maxWidth: 1440, margin: "0 auto", boxSizing: "border-box", padding: "96px 96px 96px" }}>
        <h1 style={{ margin: 0, fontFamily: sans, fontSize: 64, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1, color: TXT_D1, textAlign: "left" }}>
          Grow with
          <br />
          Visotonics.
        </h1>
        <p style={{ margin: "24px 0 0 auto", textAlign: "right", fontSize: 16, lineHeight: 1.6, color: TXT_D2, maxWidth: "46ch" }}>
          Sell physical AI into the yards, warehouses and plants you already work in. Register deals, protect your
          pipeline, and get certified to deploy.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 28 }}>
          <Link
            href="/client-portal"
            className="dt-underline-draw"
            style={{
              height: 44,
              padding: "0 26px",
              borderRadius: 999,
              background: TXT_D1,
              color: CANVAS_DARK,
              fontFamily: sans,
              fontSize: 14,
              fontWeight: 600,
              width: "auto",
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
            }}
          >
            Register as our partner!
          </Link>
        </div>

        <div style={{ marginTop: 56, borderTop: `1px solid ${BORDER_D_18}`, display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
          {STRIP.map((c, i) => (
            <div
              key={c.n}
              style={{
                borderRight: i < STRIP.length - 1 ? `1px solid ${BORDER_D}` : "none",
                padding: i === 0 ? "22px 20px 40px 0" : i === STRIP.length - 1 ? "22px 0 40px 20px" : "22px 20px 40px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: mono, fontSize: 11, color: SIGNAL }}>{c.n}</span>
                <span style={{ width: 5, height: 5, background: SIGNAL, borderRadius: 999 }} />
              </div>
              <h2 style={{ margin: "14px 0 0", fontFamily: sans, fontSize: 15, fontWeight: 600, color: TXT_D1 }}>{c.title}</h2>
              <p style={{ margin: "8px 0 0", fontSize: 12.5, lineHeight: 1.55, color: TXT_D3 }}>{c.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* MOBILE — 1c is desktop-only in the design file (its own "try next"
          note asks for a mobile pass). Adaptation decisions: single column;
          headline drops to 40px; the intro paragraph is LEFT-aligned here
          because the right-alignment that reads as a deliberate signature
          at 1040px reads as a mistake on a narrow column; CTA goes
          full-width instead of the fixed 188px; the 4 cells stack with
          border-top separators instead of border-right verticals. */}
      <div className="md:hidden" style={{ padding: "48px 24px 64px" }}>
        <h1 style={{ margin: 0, fontFamily: sans, fontSize: 40, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05, color: TXT_D1 }}>
          Grow with
          <br />
          Visotonics.
        </h1>
        <p style={{ margin: "16px 0 0", textAlign: "left", fontSize: 16, lineHeight: 1.6, color: TXT_D2 }}>
          Sell physical AI into the yards, warehouses and plants you already work in. Register deals, protect your
          pipeline, and get certified to deploy.
        </p>
        <Link
          href="/client-portal"
          style={{
            marginTop: 28,
            height: 48,
            padding: "0 26px",
            borderRadius: 999,
            background: TXT_D1,
            color: CANVAS_DARK,
            fontFamily: sans,
            fontSize: 15,
            fontWeight: 600,
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textDecoration: "none",
          }}
        >
          Register as our partner!
        </Link>

        <div style={{ marginTop: 48, borderTop: `1px solid ${BORDER_D_18}` }}>
          {STRIP.map((c) => (
            <div key={c.n} style={{ borderTop: `1px solid ${BORDER_D}`, padding: "22px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: mono, fontSize: 11, color: SIGNAL }}>{c.n}</span>
                <span style={{ width: 5, height: 5, background: SIGNAL, borderRadius: 999 }} />
              </div>
              <h2 style={{ margin: "14px 0 0", fontFamily: sans, fontSize: 17, fontWeight: 600, color: TXT_D1 }}>{c.title}</h2>
              <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.55, color: TXT_D3 }}>{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
