import type { CSSProperties } from "react";
import { pageMeta } from "@/lib/seo";

/* ---------------------------------------------------------------------------
   /company/about
   Ported from Claude Design: Hero-DraftingTable.dc.html —
   Section 13 · About us · 1440×900 (top), then
   Section 12 · Team · Variant D · sparse 2-col (below).
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

const STATS = [
  { n: "6", label: "Patents", accent: false },
  { n: "15+", label: "Deep-tech experts", accent: false },
  { n: "99.8%", label: "Detection accuracy", accent: true },
  { n: "10+", label: "Core IPs", accent: false },
];

const BRANDS = [
  { name: "Checko", strong: true },
  { name: "Upjao", strong: true },
  { name: "Tracksure", strong: false },
  { name: "BovTag", strong: false },
  { name: "BillionTests", strong: false },
  { name: "MilkoChecko", strong: false },
];

const TEAM = [
  /* `linkedin` is optional on purpose. A card renders the link only when a URL
     is present, so an unverified member simply shows no link rather than a
     dead or — far worse — a WRONG profile. Never populate these from a name
     search; take them from the person or from a page visotonics.com itself
     links. Missing URLs are tracked in docs/06-owed.md. */
  { name: "Pranav Asthana", role: "COFOUNDER (BUSINESS)", founder: true, bio: "Cofounded Checko, Upjao. 20+ research papers, 10+ patents. Ex-Intel, IIT Kanpur.", image: "/images/team/pranav-asthana.png", linkedin: "https://www.linkedin.com/in/asthanapranav/" },
  { name: "Pramod Prasad", role: "CRO & COFOUNDER", founder: true, bio: "25+ years driving $150M+ sales motion at Cisco, Motorola, Ericsson, IIFT.", image: "/images/team/pramod-prasad.png", linkedin: "https://www.linkedin.com/in/pramodprasad/" },
  { name: "Ritu Mishra", role: "COFOUNDER (PRODUCT)", founder: true, bio: "Cofounded Upjao. 7 years building deep tech products. Ex-researcher at NCFlexe, IIT Kanpur.", image: "/images/team/ritu-mishra.png", linkedin: "https://www.linkedin.com/in/ritu-raman-mishra/" },
  { name: "Mohini Behera", role: "COFOUNDER (TECH)", founder: true, bio: "Cofounded Upjao. Developed 10+ AI products for large enterprises. IIT Jodhpur, NIT Rourkela.", image: "/images/team/mohini-behera.png", linkedin: "https://www.linkedin.com/in/mohini-mohan-behera/" },
  { name: "Ravish Sangani", role: "SVP (MARKETING)", founder: false, bio: "Founded multiple rubber manufacturing units, ran pan-India sales. 20+ years of experience.", image: "/images/team/ravish-sangani.png", linkedin: "" },
  { name: "Gurudev Singh", role: "SVP (CONTAINER BUSINESS)", founder: false, bio: "15+ years in shipping. Ex-Econship Marine. MBA in Port & Logistics.", image: "/images/team/gurudev-singh.png", linkedin: "" },
  { name: "Shreyan Awasthi", role: "PARTNERSHIP MANAGER", founder: false, bio: "Cofounded Externship. 4 years in B2B sales & marketing. Ex-researcher at IIT Hyderabad.", image: "/images/team/shreyan.webp", linkedin: "" },
];

function AboutSection() {
  return (
    <div style={{ maxWidth: 1440, margin: "0 auto", boxSizing: "border-box" }} className="px-6 py-14 md:p-24">
      <span style={eyebrow}>About us</span>
      <h1 className="text-3xl md:text-[44px]" style={{ margin: "20px 0 0", fontFamily: sans, lineHeight: 1.2, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_D1, maxWidth: "22ch" }}>
        Builders of AI for the physical world.
      </h1>
      <p style={{ margin: "24px 0 0", fontSize: 18, lineHeight: 1.6, color: TXT_D2, maxWidth: "62ch" }}>
        We operate where complexity is highest — yards, gates, warehouses and terminals — turning messy, real-world visual operations into
        measurable intelligence, from damage inspection to gate automation and cargo counting.
      </p>

      {/* stats band */}
      <div className="grid grid-cols-2 md:grid-cols-4" style={{ marginTop: 64, borderTop: `1px solid ${BORDER_D}` }}>
        {STATS.map((s, i) => (
          <div
            key={s.label}
            className={[
              "pt-8 pr-8",
              // mobile 2x2: divider after left column only, no left padding on left column
              i % 2 === 0 ? "border-r pl-0" : "border-r-0 pl-8",
              // desktop 4-across: divider after first three cells, no left padding on first
              i === 0 ? "md:pl-0" : "md:pl-8",
              i === STATS.length - 1 ? "md:border-r-0" : "md:border-r",
            ].join(" ")}
            style={{ borderColor: BORDER_D }}
          >
            <span className="text-4xl md:text-[56px]" style={{ display: "block", fontFamily: sans, fontWeight: 500, letterSpacing: "-0.02em", color: s.accent ? SIGNAL : TXT_D1 }}>{s.n}</span>
            <span style={{ display: "block", marginTop: 8, fontFamily: mono, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: TXT_D2 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* founder track record timeline */}
      <div style={{ marginTop: 64, borderTop: `1px solid ${BORDER_D}`, paddingTop: 32 }}>
        <span style={{ display: "block", fontFamily: mono, fontSize: 12, fontWeight: 500, letterSpacing: "0.08em", color: SIGNAL }}>FOUNDER TRACK RECORD</span>
        <span style={{ display: "block", marginTop: 12, fontFamily: sans, fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", color: TXT_D1 }}>A decade of founder-built brands.</span>
        <div className="hidden md:flex" style={{ marginTop: 40, position: "relative", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div aria-hidden="true" style={{ position: "absolute", left: 6, right: 6, top: 6, height: 1, background: "rgba(244,245,247,0.14)" }} />
          {BRANDS.map((b) => (
            <div key={b.name} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: 100 }}>
              <span style={{ width: 12, height: 12, borderRadius: 999, background: CANVAS_DARK, border: `2px solid ${b.strong ? TXT_D1 : TXT_D2}` }} />
              <span style={{ fontSize: 14, fontWeight: b.strong ? 600 : 500, color: b.strong ? TXT_D1 : TXT_D2 }}>{b.name}</span>
            </div>
          ))}
          <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: 120 }}>
            <span style={{ width: 16, height: 16, marginTop: -2, borderRadius: 999, background: SIGNAL }} />
            <span style={{ fontFamily: sans, fontSize: 16, fontWeight: 600, color: SIGNAL }}>Visotonics</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamSection() {
  return (
    <div style={{ maxWidth: 1440, margin: "0 auto", boxSizing: "border-box" }} className="px-6 py-14 md:px-40 md:py-24">
      <span style={eyebrow}>The team</span>
      <h2 className="text-3xl md:text-5xl" style={{ margin: "16px 0 0", fontFamily: sans, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_D1, maxWidth: "18ch" }}>
        A decade of computer vision &amp; AI experience.
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16" style={{ marginTop: 64 }}>
        {TEAM.map((m) => (
          <div key={m.name} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div className="mx-auto md:mx-0" style={{ width: 260, maxWidth: "100%" }}>
              <img
                src={m.image}
                alt={m.name}
                style={{ display: "block", width: "100%", aspectRatio: "4 / 5", objectFit: "cover", borderRadius: 2, background: "#cccccc" }}
              />
              {/* Directly under the photo, and only when a URL exists — see the
                  note on TEAM. `rel="noopener noreferrer"` because this leaves
                  the site in a new tab. */}
              {m.linkedin ? (
                <a
                  href={m.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dt-underline-draw"
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 12, fontFamily: mono, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: TXT_D2, textDecoration: "none" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
                  </svg>
                  LinkedIn
                </a>
              ) : null}
            </div>
            <div>
              <span style={{ fontFamily: sans, fontSize: 24, fontWeight: 600, color: TXT_D1 }}>{m.name}</span>
              <span style={{ display: "block", marginTop: 6, fontFamily: mono, fontSize: 12, letterSpacing: "0.06em", color: m.founder ? SIGNAL : TXT_D2 }}>{m.role}</span>
              <span style={{ display: "block", marginTop: 16, fontSize: 15, lineHeight: 1.6, color: TXT_D3, maxWidth: "32ch" }}>{m.bio}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const metadata = pageMeta({
  title: "About",
  description:
    "Visotonics is building India's foundational AI vision platform for inspection and monitoring of container terminals, warehouses and factories — powered entirely by existing CCTV.",
  path: "/company/about",
});

export default function AboutPage() {
  return (
    <section style={{ background: CANVAS_DARK }}>
      <AboutSection />
      <div style={{ borderTop: `1px solid ${BORDER_D}` }} />
      <TeamSection />
    </section>
  );
}
