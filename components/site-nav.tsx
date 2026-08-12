"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Brand } from "@/components/brand";
import { ChevronDown, Menu, X } from "lucide-react";

type LinkItem = { name: string; href: string };

const PLATFORM_ENVIRONMENTS = [
  {
    num: "01",
    name: "Viso Yard",
    href: "/platform/viso-yard",
    products: [
      "Container Vision",
      "Tank Vision",
      "Gate Vision",
      "Yard Vision",
      "Crane Vision",
      "Cargo Vision",
      "Document Vision",
      "Work Vision",
      "Secure Vision",
    ],
  },
  {
    num: "02",
    name: "Viso Warehouse",
    href: "/platform/viso-warehouse",
    products: [
      "Cargo Vision",
      "Audit Vision",
      "Dimension Vision",
      "Document Vision",
      "Work Vision",
      "Secure Vision",
    ],
  },
  {
    num: "03",
    name: "Viso Factory",
    href: "/platform/viso-factory",
    products: ["Production Vision", "Audit Vision", "Dimension Vision", "Work Vision", "Secure Vision"],
  },
  {
    num: "04",
    name: "Viso Data",
    href: "/platform/viso-data",
    products: ["Compression AI", "Trace AI", "Detect AI"],
  },
] as const;

function productHref(envHref: string, name: string) {
  return envHref + "#" + name.toLowerCase().replace(/\s+/g, "-");
}

// Only fully-built pages are shown. The rest are shells / "coming soon" and are
// commented out until built — uncomment to restore.
const RESOURCES_COL_1: LinkItem[] = [
  { name: "FAQs", href: "/resources/faqs" },
  { name: "Blogs", href: "/resources/blog" },
  // { name: "Case Studies", href: "/resources/case-studies" },
  // { name: "Testimonials", href: "/resources/testimonials" },
  // { name: "ROI Calculator", href: "/resources/roi-calculator" },
];
const RESOURCES_COL_2: LinkItem[] = [
  // { name: "Whitepapers", href: "/resources/whitepapers" },
  // { name: "Webinars", href: "/resources/webinars" },
  // { name: "Documentation", href: "/resources/documentation" },
  // { name: "Glossary", href: "/resources/glossary" },
  // { name: "Press Kit", href: "/resources/press-kit" },
];

const COMPANY_COL_1: LinkItem[] = [
  { name: "About", href: "/company/about" },
  { name: "Offices", href: "/company/offices" },
  // { name: "Careers", href: "/company/careers" },
  // { name: "Newsroom", href: "/company/newsroom" },
];
const COMPANY_COL_2: LinkItem[] = [
  // { name: "Investor Relations", href: "/company/investor-relations" },
  // { name: "Partners", href: "/company/partners" },
  // { name: "Sustainability", href: "/company/sustainability" },
];

const INDUSTRIES_LINKS: LinkItem[] = [
  { name: "Ports & Terminals", href: "/industries#ports-terminals" },
  { name: "Warehousing & Distribution", href: "/industries#warehousing-distribution" },
  { name: "Manufacturing", href: "/industries#manufacturing" },
  { name: "Logistics & Supply Chain", href: "/industries#logistics-supply-chain" },
];

/* Modelled on visotonics.com's own Partners menu, then re-pointed to real
   destinations rather than left on the live site's own page (which is just
   one long pitch page there). "Certified delivery" — the live site's fourth
   item — was dropped on request; it had no obvious destination among the
   pages this rebuild actually has. */
const PARTNERS_LINKS: LinkItem[] = [
  // Existing partners logging a deal go straight to sign-in — routeFor()
  // there sends an already-registered partner on to their real dashboard.
  { name: "Register deals", href: "/client-portal" },
  // The benefits page this menu is named for — /company/partners itself.
  { name: "Grow with us", href: "/company/partners" },
  // A prospective partner starts the real onboarding flow, not the pitch page.
  { name: "Become a partner", href: "/client-portal/register" },
];

const LANGUAGES = [
  { code: "EN", name: "English" },
  { code: "HI", name: "हिन्दी" },
] as const;

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

/* ONE SIZE FOR EVERY DROPDOWN OPTION, and larger than the old caption.

   The mega-menu lists ran at --text-caption (15px) while the language
   dropdown's rows ran at 15px sans of their own — two ladders that happened
   to nearly agree, so a change to either drifted them apart. Both now come
   from here: 17px, up from 15, which is the "a tad bigger" the options were
   asked for without pushing the four-column platform panel into a second
   line on any name. */
const menuOption: CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 17,
  lineHeight: 1.5,
  color: "var(--text-dark-secondary)",
};

const menuTitle: CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-title)",
  lineHeight: "var(--text-title--line-height)",
  fontWeight: "var(--font-weight-title)",
  letterSpacing: "var(--tracking-title)",
  color: "var(--text-dark-primary)",
};

const columnHeading: CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-body-lg)",
  fontWeight: 600,
  letterSpacing: "-0.01em",
  color: "var(--text-dark-primary)",
};

const navLink: CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-body)",
  fontWeight: 500,
  color: "var(--text-dark-primary)",
};

export function SiteNav() {
  const [openMenu, setOpenMenu] = useState<"platform" | "industries" | "resources" | "company" | "partners" | "language" | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accordions, setAccordions] = useState<Record<number, boolean>>({});
  const [mobileIndustriesOpen, setMobileIndustriesOpen] = useState(false);
  const [mobileResourcesOpen, setMobileResourcesOpen] = useState(false);
  const [mobileCompanyOpen, setMobileCompanyOpen] = useState(false);
  const [mobilePartnersOpen, setMobilePartnersOpen] = useState(false);
  const [mobileLanguageOpen, setMobileLanguageOpen] = useState(false);
  const [language, setLanguage] = useState<(typeof LANGUAGES)[number]>(LANGUAGES[0]);
  const headerRef = useRef<HTMLElement>(null);

  function toggleMenu(name: "platform" | "industries" | "resources" | "company" | "partners" | "language") {
    setOpenMenu((current) => (current === name ? null : name));
  }

  useEffect(() => {
    if (!openMenu) return;
    function handlePointerDown(event: PointerEvent) {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [openMenu]);

  // any link click inside the header (mega menus, mobile overlay) closes all
  // open menus so navigation never leaves a panel hanging open.
  function handleHeaderClick(event: React.MouseEvent) {
    if ((event.target as HTMLElement).closest("a")) {
      setOpenMenu(null);
      setMobileOpen(false);
      setMobileIndustriesOpen(false);
      setMobileResourcesOpen(false);
      setMobileCompanyOpen(false);
      setMobilePartnersOpen(false);
      setMobileLanguageOpen(false);
      setAccordions({});
    }
  }

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 border-b"
      style={{ background: "var(--canvas-dark)", borderColor: "var(--border-dark)" }}
      onClickCapture={handleHeaderClick}
    >
      {/* DESKTOP NAV — the trio below (nav row + mega-menu panel) share one
          hover boundary: entering any trigger opens its panel directly (no
          click needed), moving between triggers swaps panels without ever
          passing through "closed" (see the merged panel render below), and
          leaving the whole area closes whatever's open. */}
      <div onMouseLeave={() => setOpenMenu((m) => (m === "language" ? m : null))}>
        <div
          className="mx-auto hidden h-[72px] max-w-[1360px] grid-cols-[1fr_auto_1fr] items-center px-16 md:grid"
        >
          <Link href="/" className="justify-self-start" aria-label="Visotonics home">
            <Brand height={30} />
          </Link>

          <nav className="flex items-center justify-self-center" style={{ gap: "var(--spacing-s8)" }}>
            <button
              type="button"
              onClick={() => toggleMenu("platform")}
              onMouseEnter={() => setOpenMenu("platform")}
              className="flex cursor-pointer items-center bg-transparent p-0"
              style={{ gap: "var(--spacing-s2)", ...navLink, color: openMenu === "platform" ? "var(--text-dark-secondary)" : "var(--text-dark-primary)" }}
            >
              Platform
              <ChevronDown
                size={14}
                style={{
                  color: "var(--text-dark-secondary)",
                  display: "inline-block",
                  transition: "transform var(--duration-dur-2) var(--ease-standard)",
                  transform: openMenu === "platform" ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>

            <Link
              href="/industries"
              onMouseEnter={() => setOpenMenu("industries")}
              className="flex items-center hover:opacity-80"
              style={{ gap: "var(--spacing-s2)", ...navLink, color: openMenu === "industries" ? "var(--text-dark-secondary)" : "var(--text-dark-primary)" }}
            >
              Industries
              <ChevronDown
                size={14}
                style={{
                  color: "var(--text-dark-secondary)",
                  display: "inline-block",
                  transition: "transform var(--duration-dur-2) var(--ease-standard)",
                  transform: openMenu === "industries" ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </Link>

            <button
              type="button"
              onClick={() => toggleMenu("resources")}
              onMouseEnter={() => setOpenMenu("resources")}
              className="flex cursor-pointer items-center bg-transparent p-0"
              style={{ gap: "var(--spacing-s2)", ...navLink, color: openMenu === "resources" ? "var(--text-dark-secondary)" : "var(--text-dark-primary)" }}
            >
              Resources
              <ChevronDown
                size={14}
                style={{
                  color: "var(--text-dark-secondary)",
                  display: "inline-block",
                  transition: "transform var(--duration-dur-2) var(--ease-standard)",
                  transform: openMenu === "resources" ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>

            <button
              type="button"
              onClick={() => toggleMenu("partners")}
              onMouseEnter={() => setOpenMenu("partners")}
              className="flex cursor-pointer items-center bg-transparent p-0"
              style={{ gap: "var(--spacing-s2)", ...navLink, color: openMenu === "partners" ? "var(--text-dark-secondary)" : "var(--text-dark-primary)" }}
            >
              Partners
              <ChevronDown
                size={14}
                style={{
                  color: "var(--text-dark-secondary)",
                  display: "inline-block",
                  transition: "transform var(--duration-dur-2) var(--ease-standard)",
                  transform: openMenu === "partners" ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>

            <button
              type="button"
              onClick={() => toggleMenu("company")}
              onMouseEnter={() => setOpenMenu("company")}
              className="flex cursor-pointer items-center bg-transparent p-0"
              style={{ gap: "var(--spacing-s2)", ...navLink, color: openMenu === "company" ? "var(--text-dark-secondary)" : "var(--text-dark-primary)" }}
            >
              Company
              <ChevronDown
                size={14}
                style={{
                  color: "var(--text-dark-secondary)",
                  display: "inline-block",
                  transition: "transform var(--duration-dur-2) var(--ease-standard)",
                  transform: openMenu === "company" ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>
          </nav>

          <div className="flex items-center justify-self-end" style={{ gap: "var(--spacing-s6)", position: "relative" }}>
          <button
            type="button"
            onClick={() => toggleMenu("language")}
            className="flex cursor-pointer items-center bg-transparent p-0"
            style={{ gap: "var(--spacing-s2)", ...monoLabel, letterSpacing: "0.06em", fontSize: 14, color: openMenu === "language" ? "var(--text-dark-primary)" : "var(--text-dark-secondary)" }}
          >
            {language.code}
            {/* Dropdown caret hidden for now, on request. Left in place rather
                than deleted so it can come back with one uncomment — the
                rotate-on-open transition is the only state cue this control
                has, so if the language switcher ever stops reading as
                clickable, this is the thing to restore.
            <ChevronDown
              size={14}
              style={{
                color: "var(--text-dark-secondary)",
                display: "inline-block",
                transition: "transform var(--duration-dur-2) var(--ease-standard)",
                transform: openMenu === "language" ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
            */}
          </button>

          {/* language dropdown — variant B: mono code + hairline rows */}
          {openMenu === "language" && (
            <div
              className="absolute"
              style={{
                top: "calc(100% + 16px)",
                right: 0,
                width: 200,
                boxSizing: "border-box",
                background: "#101216",
                border: "1px solid rgba(244,245,247,0.14)",
                display: "flex",
                flexDirection: "column",
                zIndex: 10,
              }}
            >
              {LANGUAGES.map((l, i) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => {
                    setLanguage(l);
                    setOpenMenu(null);
                  }}
                  className="flex w-full cursor-pointer items-baseline bg-transparent hover:opacity-80"
                  style={{
                    gap: 12,
                    padding: "12px 14px",
                    borderBottom: i === LANGUAGES.length - 1 ? "none" : "1px solid rgba(244,245,247,0.10)",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, flex: "0 0 auto", color: language.code === l.code ? "#ED510C" : "#6B7078" }}>
                    {l.code}
                  </span>
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: 17, fontWeight: 500, color: language.code === l.code ? "var(--text-dark-primary)" : "var(--text-dark-secondary)" }}>
                    {l.name}
                  </span>
                </button>
              ))}
            </div>
          )}

          <Link href="/client-portal" className="hover:opacity-80" style={{ ...navLink, whiteSpace: "nowrap", flexShrink: 0 }}>
            Log in
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-[var(--radius-r-pill)] transition-colors"
            style={{
              height: 40,
              padding: "0 var(--spacing-s6)",
              background: "var(--interactive-dark-primary-bg)",
              color: "var(--interactive-dark-primary-fg)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-body)",
              fontWeight: 500,
              whiteSpace: "nowrap",
              flexShrink: 0,
              transitionDuration: "var(--duration-dur-1)",
              transitionTimingFunction: "var(--ease-standard)",
            }}
          >
            Book a Demo
          </Link>
        </div>
        </div>

        {/* MEGA MENU — one persistently-mounted panel for platform/resources/
            company. Staying mounted across those three (only unmounting when
            openMenu goes to null/"language") means moving the hover from one
            trigger to another swaps content in place instead of closing and
            reopening; the fade key={openMenu} still animates each swap. */}
        {(openMenu === "platform" || openMenu === "industries" || openMenu === "resources" || openMenu === "partners" || openMenu === "company") && (
          <div className="hidden border-t md:block" style={{ borderColor: "var(--border-dark)", background: "var(--canvas-dark)" }}>
            <div key={openMenu} className="nav-mega-fade">
              {openMenu === "industries" && (
                <div
                  className="mx-auto grid max-w-[1360px] px-16"
                  style={{ gridTemplateColumns: "1.1fr 1fr", gap: "var(--spacing-s6)", padding: "var(--spacing-s8) var(--spacing-s16) var(--spacing-s12)" }}
                >
                  <div className="flex flex-col" style={{ paddingTop: "var(--spacing-s4)", paddingRight: "var(--spacing-s6)", gap: "var(--spacing-s3)" }}>
                    <span style={monoLabel}>Menu</span>
                    <span style={menuTitle}>Industries</span>
                    <span style={caption}>AI vision tuned to four industries.</span>
                  </div>
                  <div className="flex flex-col" style={{ paddingTop: "var(--spacing-s4)", gap: "var(--spacing-s3)" }}>
                    <Link href="/industries" className="dt-underline-draw" style={{ ...menuOption, alignSelf: "flex-start" }}>
                      Home
                    </Link>
                    {INDUSTRIES_LINKS.map((l) => (
                      <Link key={l.name} href={l.href} className="dt-underline-draw" style={{ ...menuOption, alignSelf: "flex-start" }}>
                        {l.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {openMenu === "platform" && (
                <div
                  className="mx-auto grid max-w-[1360px] px-16"
                  style={{ gridTemplateColumns: "1.1fr 1fr 1fr 1fr 1fr", gap: "var(--spacing-s6)", padding: "var(--spacing-s8) var(--spacing-s16) var(--spacing-s12)" }}
                >
                  <div className="flex flex-col" style={{ paddingTop: "var(--spacing-s4)", paddingRight: "var(--spacing-s6)", gap: "var(--spacing-s3)" }}>
                    <span style={monoLabel}>Menu</span>
                    <span style={menuTitle}>Platform</span>
                    <span style={caption}>Four environments, one vision platform.</span>
                  </div>
                  {PLATFORM_ENVIRONMENTS.map((env) => (
                    <div
                      key={env.name}
                      className="flex flex-col"
                      style={{ paddingTop: "var(--spacing-s4)", gap: "var(--spacing-s4)" }}
                    >
                      {/* The 01-04 numerals were removed on request. `num` stays on
                          PLATFORM_ENVIRONMENTS because the mobile panel and other
                          consumers may still want it — nothing here reads it now. */}
                      <Link href={env.href} className="dt-underline-draw" style={{ ...columnHeading, alignSelf: "flex-start" }}>
                        {env.name}
                      </Link>
                      <div className="flex flex-col" style={{ gap: "var(--spacing-s3)" }}>
                        {env.products.map((p) => (
                          <a key={p} href={productHref(env.href, p)} className="dt-underline-draw" style={{ ...menuOption, alignSelf: "flex-start" }}>
                            {p}
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {openMenu === "resources" && (
                <div
                  className="mx-auto grid max-w-[1360px] px-16"
                  style={{ gridTemplateColumns: "1.1fr 1fr", gap: "var(--spacing-s6)", padding: "var(--spacing-s8) var(--spacing-s16) var(--spacing-s12)" }}
                >
                  <div className="flex flex-col" style={{ paddingTop: "var(--spacing-s4)", paddingRight: "var(--spacing-s6)", gap: "var(--spacing-s3)" }}>
                    <span style={monoLabel}>Menu</span>
                    <span style={menuTitle}>Resources</span>
                    <span style={caption}>Guides, tools and proof for evaluating the platform.</span>
                  </div>
                  <div className="flex flex-col" style={{ paddingTop: "var(--spacing-s4)", gap: "var(--spacing-s3)" }}>
                    {[...RESOURCES_COL_1, ...RESOURCES_COL_2].map((l) => (
                      <Link key={l.name} href={l.href} className="dt-underline-draw" style={{ ...menuOption, alignSelf: "flex-start" }}>
                        {l.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {openMenu === "partners" && (
                <div
                  className="mx-auto grid max-w-[1360px] px-16"
                  style={{ gridTemplateColumns: "1.1fr 1fr", gap: "var(--spacing-s6)", padding: "var(--spacing-s8) var(--spacing-s16) var(--spacing-s12)" }}
                >
                  <div className="flex flex-col" style={{ paddingTop: "var(--spacing-s4)", paddingRight: "var(--spacing-s6)", gap: "var(--spacing-s3)" }}>
                    <span style={monoLabel}>Menu</span>
                    <span style={menuTitle}>Partners</span>
                    <span style={caption}>Build and grow with Visotonics.</span>
                  </div>
                  <div className="flex flex-col" style={{ paddingTop: "var(--spacing-s4)", gap: "var(--spacing-s3)" }}>
                    {PARTNERS_LINKS.map((l) => (
                      <Link key={l.name} href={l.href} className="dt-underline-draw" style={{ ...menuOption, alignSelf: "flex-start" }}>
                        {l.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {openMenu === "company" && (
                <div
                  className="mx-auto grid max-w-[1360px] px-16"
                  style={{ gridTemplateColumns: "1.1fr 1fr", gap: "var(--spacing-s6)", padding: "var(--spacing-s8) var(--spacing-s16) var(--spacing-s12)" }}
                >
                  <div className="flex flex-col" style={{ paddingTop: "var(--spacing-s4)", paddingRight: "var(--spacing-s6)", gap: "var(--spacing-s3)" }}>
                    <span style={monoLabel}>Menu</span>
                    <span style={menuTitle}>Company</span>
                    <span style={caption}>Who&apos;s building the platform, and where.</span>
                  </div>
                  <div className="flex flex-col" style={{ paddingTop: "var(--spacing-s4)", gap: "var(--spacing-s3)" }}>
                    {[...COMPANY_COL_1, ...COMPANY_COL_2].map((l) => (
                      <Link key={l.name} href={l.href} className="dt-underline-draw" style={{ ...menuOption, alignSelf: "flex-start" }}>
                        {l.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MOBILE NAV BAR */}
      <div
        className="flex h-16 items-center justify-between px-5 md:hidden"
        style={{ borderColor: "var(--border-dark)" }}
      >
        <Link href="/" aria-label="Visotonics home">
          <Brand height={27} />
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="cursor-pointer bg-transparent p-2"
          style={monoLabel}
        >
          <span className="inline-flex items-center" style={{ gap: 6 }}>
            Menu
            <Menu size={16} />
          </span>
        </button>
      </div>

      {/* MOBILE OVERLAY MENU */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col md:hidden"
          style={{ background: "var(--canvas-dark)" }}
        >
          <div
            className="flex h-16 flex-none items-center justify-between border-b px-5"
            style={{ borderColor: "var(--border-dark)" }}
          >
            <Brand height={27} />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="cursor-pointer bg-transparent p-2"
              style={monoLabel}
            >
              <span className="inline-flex items-center" style={{ gap: 6 }}>
                Close
                <X size={16} />
              </span>
            </button>
          </div>

          <div className="flex flex-1 flex-col overflow-y-auto">
            <div style={{ padding: "var(--spacing-s6) var(--spacing-s4) var(--spacing-s2)" }}>
              <span style={monoLabel}>Platform</span>
            </div>
            {PLATFORM_ENVIRONMENTS.map((env, i) => (
              <div key={env.name} className="border-t" style={{ borderColor: "var(--border-dark)" }}>
                <button
                  type="button"
                  onClick={() => setAccordions((s) => ({ ...s, [i]: !s[i] }))}
                  className="flex w-full cursor-pointer items-center justify-between bg-transparent text-left"
                  style={{ minHeight: 56, padding: "var(--spacing-s3) var(--spacing-s4)" }}
                >
                  <span style={columnHeading}>{env.name}</span>
                  <span className="flex items-center" style={{ gap: "var(--spacing-s3)" }}>
                    {/* numeral removed here too — the desktop panel dropped it
                        and a number on one breakpoint only is worse than either */}
                    <ChevronDown
                      size={16}
                      style={{
                        color: "var(--text-dark-secondary)",
                        display: "inline-block",
                        transition: "transform var(--duration-dur-2) var(--ease-standard)",
                        transform: accordions[i] ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    />
                  </span>
                </button>
                {accordions[i] && (
                  <div className="flex flex-col" style={{ padding: "0 var(--spacing-s4) var(--spacing-s4)", gap: "var(--spacing-s3)" }}>
                    {env.href !== "/platform/viso-data" && (
                      <Link
                        href={env.href}
                        style={{ fontSize: "var(--text-caption)", color: "var(--text-dark-primary)", textDecoration: "underline", textUnderlineOffset: 3 }}
                      >
                        Home
                      </Link>
                    )}
                    {env.products.map((p) => (
                      <a key={p} href={productHref(env.href, p)} style={caption}>
                        {p}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div className="border-t" style={{ borderColor: "var(--border-dark)" }}>
              <button
                type="button"
                onClick={() => setMobileIndustriesOpen((v) => !v)}
                className="flex w-full cursor-pointer items-center justify-between bg-transparent text-left"
                style={{ minHeight: 56, padding: "var(--spacing-s3) var(--spacing-s4)" }}
              >
                <span style={columnHeading}>Industries</span>
                <ChevronDown
                  size={16}
                  style={{
                    color: "var(--text-dark-secondary)",
                    display: "inline-block",
                    transition: "transform var(--duration-dur-2) var(--ease-standard)",
                    transform: mobileIndustriesOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </button>
              {mobileIndustriesOpen && (
                <div className="flex flex-col" style={{ padding: "0 var(--spacing-s4) var(--spacing-s4)", gap: "var(--spacing-s3)" }}>
                  <Link href="/industries" style={caption}>
                    Home
                  </Link>
                  {INDUSTRIES_LINKS.map((l) => (
                    <Link key={l.name} href={l.href} style={caption}>
                      {l.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t" style={{ borderColor: "var(--border-dark)" }}>
              <button
                type="button"
                onClick={() => setMobileResourcesOpen((v) => !v)}
                className="flex w-full cursor-pointer items-center justify-between bg-transparent text-left"
                style={{ minHeight: 56, padding: "var(--spacing-s3) var(--spacing-s4)" }}
              >
                <span style={columnHeading}>Resources</span>
                <ChevronDown
                  size={16}
                  style={{
                    color: "var(--text-dark-secondary)",
                    display: "inline-block",
                    transition: "transform var(--duration-dur-2) var(--ease-standard)",
                    transform: mobileResourcesOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </button>
              {mobileResourcesOpen && (
                <div className="flex flex-col" style={{ padding: "0 var(--spacing-s4) var(--spacing-s4)", gap: "var(--spacing-s3)" }}>
                  {[...RESOURCES_COL_1, ...RESOURCES_COL_2].map((l) => (
                    <Link key={l.name} href={l.href} style={caption}>
                      {l.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t" style={{ borderColor: "var(--border-dark)" }}>
              <button
                type="button"
                onClick={() => setMobilePartnersOpen((v) => !v)}
                className="flex w-full cursor-pointer items-center justify-between bg-transparent text-left"
                style={{ minHeight: 56, padding: "var(--spacing-s3) var(--spacing-s4)" }}
              >
                <span style={columnHeading}>Partners</span>
                <ChevronDown
                  size={16}
                  style={{
                    color: "var(--text-dark-secondary)",
                    display: "inline-block",
                    transition: "transform var(--duration-dur-2) var(--ease-standard)",
                    transform: mobilePartnersOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </button>
              {mobilePartnersOpen && (
                <div className="flex flex-col" style={{ padding: "0 var(--spacing-s4) var(--spacing-s4)", gap: "var(--spacing-s3)" }}>
                  {PARTNERS_LINKS.map((l) => (
                    <Link key={l.name} href={l.href} style={caption}>
                      {l.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t" style={{ borderColor: "var(--border-dark)" }}>
              <button
                type="button"
                onClick={() => setMobileCompanyOpen((v) => !v)}
                className="flex w-full cursor-pointer items-center justify-between bg-transparent text-left"
                style={{ minHeight: 56, padding: "var(--spacing-s3) var(--spacing-s4)" }}
              >
                <span style={columnHeading}>Company</span>
                <ChevronDown
                  size={16}
                  style={{
                    color: "var(--text-dark-secondary)",
                    display: "inline-block",
                    transition: "transform var(--duration-dur-2) var(--ease-standard)",
                    transform: mobileCompanyOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </button>
              {mobileCompanyOpen && (
                <div className="flex flex-col" style={{ padding: "0 var(--spacing-s4) var(--spacing-s4)", gap: "var(--spacing-s3)" }}>
                  {[...COMPANY_COL_1, ...COMPANY_COL_2].map((l) => (
                    <Link key={l.name} href={l.href} style={caption}>
                      {l.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t" style={{ borderColor: "var(--border-dark)" }}>
              <button
                type="button"
                onClick={() => setMobileLanguageOpen((v) => !v)}
                className="flex w-full cursor-pointer items-center justify-between bg-transparent text-left"
                style={{ minHeight: 56, padding: "var(--spacing-s3) var(--spacing-s4)" }}
              >
                <span style={columnHeading}>Language</span>
                <span className="flex items-center" style={{ gap: "var(--spacing-s3)" }}>
                  <span style={monoLabel}>{language.code}</span>
                  <ChevronDown
                    size={16}
                    style={{
                      color: "var(--text-dark-secondary)",
                      display: "inline-block",
                      transition: "transform var(--duration-dur-2) var(--ease-standard)",
                      transform: mobileLanguageOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  />
                </span>
              </button>
              {mobileLanguageOpen && (
                <div className="flex flex-col" style={{ padding: "0 var(--spacing-s4) var(--spacing-s4)", gap: "var(--spacing-s3)" }}>
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => {
                        setLanguage(l);
                        setMobileLanguageOpen(false);
                      }}
                      className="flex w-full items-center bg-transparent p-0 text-left"
                      style={{ gap: 12 }}
                    >
                      <span style={{ ...monoLabel, fontSize: 12, width: 20, flex: "0 0 auto", color: language.code === l.code ? "#ED510C" : "var(--text-dark-secondary)" }}>{l.code}</span>
                      <span style={{ fontFamily: "var(--font-sans)", fontSize: 16, fontWeight: 600, color: "var(--text-dark-primary)" }}>{l.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div
              className="flex flex-col border-t"
              style={{ borderColor: "var(--border-dark)", padding: "var(--spacing-s6) var(--spacing-s4) var(--spacing-s8)", gap: "var(--spacing-s3)" }}
            >
              <Link
                href="/client-portal"
                className="box-border inline-flex w-full items-center justify-center rounded-[var(--radius-r-pill)] border"
                style={{
                  height: 48,
                  background: "transparent",
                  color: "var(--text-dark-primary)",
                  borderColor: "var(--interactive-dark-secondary-border)",
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-body)",
                  fontWeight: 500,
                }}
              >
                Log in
              </Link>
              <Link
                href="/contact"
                className="box-border inline-flex w-full items-center justify-center rounded-[var(--radius-r-pill)]"
                style={{
                  height: 48,
                  background: "var(--interactive-dark-primary-bg)",
                  color: "var(--interactive-dark-primary-fg)",
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-body)",
                  fontWeight: 500,
                }}
              >
                Book a Demo
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
