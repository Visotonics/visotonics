import Link from "next/link";
import type { CSSProperties } from "react";
import { Brand } from "@/components/brand";

type LinkItem = { name: string; href: string };

const PLATFORM_LINKS: LinkItem[] = [
  { name: "Viso Yard", href: "/platform/viso-yard" },
  { name: "Viso Warehouse", href: "/platform/viso-warehouse" },
  { name: "Viso Factory", href: "/platform/viso-factory" },
  { name: "Viso Data", href: "/platform/viso-data" },
];

const INDUSTRIES_LINKS: LinkItem[] = [
  { name: "Ports & Terminals", href: "/industries#ports-terminals" },
  { name: "Warehousing & Distribution", href: "/industries#warehousing-distribution" },
  { name: "Manufacturing", href: "/industries#manufacturing" },
  { name: "Logistics & Supply Chain", href: "/industries#logistics-supply-chain" },
];

const monoLabel: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "var(--text-mono-label)",
  lineHeight: "var(--text-mono-label--line-height)",
  fontWeight: "var(--font-weight-mono-label)",
  letterSpacing: "var(--tracking-mono-label)",
  textTransform: "uppercase",
  color: "var(--text-dark-secondary)",
};

const caption: CSSProperties = {
  fontSize: "var(--text-caption)",
  lineHeight: "var(--text-caption--line-height)",
  color: "var(--text-dark-secondary)",
};

const footerLink: CSSProperties = {
  fontSize: "var(--text-caption)",
  color: "var(--text-dark-primary)",
};

const columnHeading: CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-body-lg)",
  fontWeight: 600,
  letterSpacing: "-0.02em",
  color: "var(--text-dark-primary)",
};

export function SiteFooter() {
  return (
    <footer
      className="relative overflow-hidden border-t"
      style={{ background: "var(--canvas-dark)", borderColor: "var(--border-dark)" }}
    >
      {/* Ambient scan pulse on the footer's top rule. Period/phase are
          deliberately different from the nav's (2600 vs 2200, 6.4s vs 5.1s)
          so the two never pulse together — matching pulses top and bottom of
          the viewport would read as a synchronised frame rather than as
          ambient activity. */}
      <span
        aria-hidden="true"
        className="wire-sweep-h"
        style={
          {
            top: -1,
            "--wire-sweep-period": "2600px",
            "--wire-sweep-dur": "6.4s",
            "--wire-sweep-delay": "-3.9s",
          } as CSSProperties
        }
      />
      <div className="relative z-[1] mx-auto max-w-[1360px] px-5 md:px-16">
        {/* DESKTOP GRID */}
        <div
          className="hidden md:grid"
          style={{ gridTemplateColumns: "2fr 1fr 1fr 1.4fr", padding: "var(--spacing-s16) 0 var(--spacing-s24)" }}
        >
          <div className="flex flex-col" style={{ paddingRight: "var(--spacing-s12)", gap: "var(--spacing-s6)" }}>
            <Brand height={28} />
            <span style={{ ...caption, color: "var(--text-dark-secondary)", maxWidth: 320 }}>
              Vision-AI platform for inspection and monitoring across the physical world.
            </span>
          </div>

          <div
            className="flex flex-col border-l"
            style={{ borderColor: "var(--gridline-dark)", paddingLeft: "var(--spacing-s6)", gap: "var(--spacing-s4)" }}
          >
            <span style={monoLabel}>Platform</span>
            <div className="flex flex-col" style={{ gap: "var(--spacing-s3)" }}>
              {PLATFORM_LINKS.map((l) => (
                <Link key={l.name} href={l.href} className="hover:opacity-80" style={footerLink}>
                  {l.name}
                </Link>
              ))}
            </div>
          </div>

          <div
            className="flex flex-col border-l"
            style={{ borderColor: "var(--gridline-dark)", paddingLeft: "var(--spacing-s6)", gap: "var(--spacing-s4)" }}
          >
            <span style={monoLabel}>Industries</span>
            <div className="flex flex-col" style={{ gap: "var(--spacing-s3)" }}>
              {INDUSTRIES_LINKS.map((l) => (
                <Link key={l.name} href={l.href} className="hover:opacity-80" style={footerLink}>
                  {l.name}
                </Link>
              ))}
            </div>
          </div>

          <div
            className="flex flex-col border-l"
            style={{ borderColor: "var(--gridline-dark)", paddingLeft: "var(--spacing-s6)", gap: "var(--spacing-s4)" }}
          >
            <span style={monoLabel}>Contact</span>
            <div className="flex flex-col" style={{ gap: "var(--spacing-s3)" }}>
              <a href="mailto:contact@excl.ai" className="hover:opacity-80" style={footerLink}>
                contact@excl.ai
              </a>
              <a href="tel:+918924006395" className="hover:opacity-80" style={footerLink}>
                +91 89240 06395
              </a>
            </div>
            <div className="flex flex-col" style={{ gap: "var(--spacing-s2)" }}>
              <span style={monoLabel}>India</span>
              <span style={caption}>Mumbai · Lucknow · Ahmedabad · Bhubaneshwar</span>
            </div>
            <div className="flex flex-col" style={{ gap: "var(--spacing-s2)" }}>
              <span style={monoLabel}>USA</span>
              <span style={caption}>Washington</span>
            </div>
            <div className="flex flex-col" style={{ marginTop: "var(--spacing-s4)", paddingTop: "var(--spacing-s4)", borderTop: "1px solid var(--gridline-dark)", gap: "var(--spacing-s3)" }}>
              <Link href="/legal/privacy-policy" className="hover:opacity-80" style={footerLink}>
                Privacy Policy
              </Link>
              <Link href="/legal/terms-and-conditions" className="hover:opacity-80" style={footerLink}>
                Terms & Conditions
              </Link>
            </div>
          </div>
        </div>

        {/* MOBILE STACK */}
        <div className="flex flex-col md:hidden" style={{ padding: "var(--spacing-s8) 0 var(--spacing-s12)", gap: "var(--spacing-s8)" }}>
          <div className="flex flex-col" style={{ gap: "var(--spacing-s3)" }}>
            <Brand height={28} />
            <span style={caption}>Vision-AI platform for inspection and monitoring across the physical world.</span>
          </div>

          <div
            className="flex flex-col border-t"
            style={{ borderColor: "var(--gridline-dark)", paddingTop: "var(--spacing-s4)", gap: "var(--spacing-s4)" }}
          >
            <span style={monoLabel}>Platform</span>
            <div className="flex flex-col" style={{ gap: "var(--spacing-s3)" }}>
              {PLATFORM_LINKS.map((l) => (
                <Link key={l.name} href={l.href} style={footerLink}>
                  {l.name}
                </Link>
              ))}
            </div>
          </div>

          <div
            className="flex flex-col border-t"
            style={{ borderColor: "var(--gridline-dark)", paddingTop: "var(--spacing-s4)", gap: "var(--spacing-s4)" }}
          >
            <span style={monoLabel}>Industries</span>
            <div className="flex flex-col" style={{ gap: "var(--spacing-s3)" }}>
              {INDUSTRIES_LINKS.map((l) => (
                <Link key={l.name} href={l.href} style={footerLink}>
                  {l.name}
                </Link>
              ))}
            </div>
          </div>

          <div
            className="flex flex-col border-t"
            style={{ borderColor: "var(--gridline-dark)", paddingTop: "var(--spacing-s4)", gap: "var(--spacing-s4)" }}
          >
            <span style={monoLabel}>Contact</span>
            <div className="flex flex-col" style={{ gap: "var(--spacing-s3)" }}>
              <a href="mailto:contact@excl.ai" style={footerLink}>
                contact@excl.ai
              </a>
              <a href="tel:+918924006395" style={footerLink}>
                +91 89240 06395
              </a>
            </div>
            <div className="flex flex-col" style={{ gap: "var(--spacing-s2)" }}>
              <span style={monoLabel}>India</span>
              <span style={caption}>Mumbai · Lucknow · Ahmedabad · Bhubaneshwar</span>
            </div>
            <div className="flex flex-col" style={{ gap: "var(--spacing-s2)" }}>
              <span style={monoLabel}>USA</span>
              <span style={caption}>Washington</span>
            </div>
            <div className="flex flex-col border-t" style={{ marginTop: "var(--spacing-s2)", paddingTop: "var(--spacing-s4)", borderColor: "var(--gridline-dark)", gap: "var(--spacing-s3)" }}>
              <Link href="/legal/privacy-policy" style={footerLink}>
                Privacy Policy
              </Link>
              <Link href="/legal/terms-and-conditions" style={footerLink}>
                Terms & Conditions
              </Link>
            </div>
          </div>
        </div>

        {/* BOTTOM BAR */}
        <div
          className="flex flex-wrap items-center justify-between border-t"
          style={{
            borderColor: "var(--gridline-dark)",
            padding: "var(--spacing-s4) 0 var(--spacing-s3)",
            gap: "var(--spacing-s6)",
          }}
        >
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-mono-label)", letterSpacing: "0.02em", color: "var(--text-dark-secondary)" }}>
            © 2026 Visotonics
          </span>
          <span
            className="hidden md:inline"
            style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-mono-label)", letterSpacing: "0.02em", color: "var(--text-dark-secondary)" }}
          >
            Patented Technology · CII Best Industry AI Application 2025 · Supported by MEITY & DST
          </span>
          <span
            className="md:hidden"
            style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-mono-label)", lineHeight: "var(--text-mono-log--line-height)", color: "var(--text-dark-secondary)" }}
          >
            Patented Technology · CII Best Industry AI Application 2025 · Supported by MEITY & DST
          </span>
        </div>

        {/* GIANT WORDMARK — spans the full content column width, not a fixed height */}
        <div
          aria-hidden="true"
          className="hidden md:block"
          style={{ padding: "var(--spacing-s12) 0" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/visotonics-high-resolution-logo-transparent.png"
            alt=""
            className="pointer-events-none select-none"
            style={{ display: "block", width: "100%", height: "auto", filter: "invert(1)", opacity: 0.09 }}
          />
        </div>
      </div>
    </footer>
  );
}
