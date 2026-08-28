"use client";

/* ---------------------------------------------------------------------------
   CampaignLanding — "Spec sheet" (screen 2a, ported from Claude Design:
   Campaign-SignalSplit.dc.html · #2a "Spec sheet · engineering-drawing
   structure · metrics as data ledger").

   Full-width title block (52px headline + a drawing-spec annotation block),
   then a footage panel (FIG. 01) beside a 480px request column of labelled
   underline inputs, then the field-results metrics as a dark data ledger.
   The benchmark / "better than mainstream models" line sits directly under
   the footage. Form POSTs to /api/lead; success downloads the brochure (if
   set) or confirms "emailed shortly", and fires GA4 + LinkedIn events.
--------------------------------------------------------------------------- */

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import dynamic from "next/dynamic";
import {
  CANVAS_DARK,
  TXT_D1,
  TXT_D2,
  BORDER_D,
  CROSS_D,
  SIGNAL,
  mono,
  sans,
  eyebrow,
  Cross,
  Dot,
} from "@/app/platform/viso-yard/_shared";
import type { Campaign, Module } from "@/app/campaigns/data";
import { CREDENTIALS } from "@/app/campaigns/data";
import { VideoModal } from "./video-modal";
import { trackEvent, trackLinkedInConversion } from "@/components/analytics/tracking-scripts";

const RULE_D = "rgba(244,245,247,0.18)";

/* rule line with a signal Dot at the left end + a Cross at the right end. */
function RuleMark() {
  return (
    <div style={{ position: "relative", height: 1, background: RULE_D }}>
      <Dot style={{ left: -1, top: -1 }} />
      <Cross color={CROSS_D} style={{ right: -4, top: -4 }} />
    </div>
  );
}

/* ------------------------------------------------------------------ media */

/* The native r3f port of the container/gate/scan segment — replaces a captured
   .webm that could never carry the scene's DOM detection overlays (see
   components/campaign-film/index.tsx's header for why capture was a dead end).
   `ssr: false` is mandatory, not a bundle-size nicety: the component touches
   WebGL, matchMedia and IntersectionObserver, none of which exist at SSR time. */
const CampaignFilm = dynamic(() => import("@/components/campaign-film"), { ssr: false });

/* Both the click-to-play affordance and the two static captions below were built for the era
   when this panel showed a captured/static video — they told the viewer "there's a real demo
   behind this button". Now that `CampaignFilm` renders the actual live gate/scan sequence
   underneath them, that framing runs backwards: a viewer clicks expecting more, and lands on
   "coming soon", which undersells a demo that's already playing. And the static caption
   "VSTU 907032 :: READ 0.99" duplicates — with a different, frozen number — the film's own
   live OCR chip a few pixels below it.

   Gated on `videoUrl` rather than deleted outright: no campaign defines one today (checked
   app/campaigns/data.ts), so right now this renders the plain, uninterrupted film everywhere,
   but the old click-through/caption behavior comes back automatically the day a real recorded
   video is actually uploaded for a campaign — nothing to remember to re-enable by hand. */
function MediaPane({ videoUrl, onPlay, height }: { videoUrl?: string; onPlay: () => void; height: number }) {
  const Wrap = videoUrl ? "button" : "div";
  return (
    <Wrap
      type={videoUrl ? "button" : undefined}
      onClick={videoUrl ? onPlay : undefined}
      aria-label={videoUrl ? "Watch the demo video" : undefined}
      className={videoUrl ? "cursor-pointer group" : "group"}
      style={{ position: "relative", height, width: "100%", background: "#000", border: `1px solid ${BORDER_D}`, padding: 0, overflow: "hidden" }}
    >
      <CampaignFilm />
      <div aria-hidden="true" style={{ position: "absolute", inset: 18, border: "1px solid rgba(244,245,247,0.07)" }} />
      <Cross color={CROSS_D} style={{ left: 14, top: 14 }} />
      <Cross color={CROSS_D} style={{ right: 14, bottom: 14 }} />
      {videoUrl && (
        <>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div
              className="transition-transform group-hover:scale-105"
              style={{ width: 84, height: 84, border: "1px solid rgba(244,245,247,0.28)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,11,14,0.35)" }}
            >
              <div style={{ width: 0, height: 0, borderLeft: `20px solid ${TXT_D1}`, borderTop: "12px solid transparent", borderBottom: "12px solid transparent", marginLeft: 6 }} />
            </div>
          </div>
          <span style={{ position: "absolute", left: 30, bottom: 28, fontFamily: mono, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: TXT_D2, opacity: 0.7 }}>
            VSTU 907032 :: READ 0.99
          </span>
          <span style={{ position: "absolute", right: 30, top: 28, fontFamily: mono, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: SIGNAL }}>
            ● Demo · 90 sec
          </span>
        </>
      )}
    </Wrap>
  );
}

/* --------------------------------------------------------- benchmark line */
function BenchmarkLine({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{ position: "relative", paddingLeft: 18 }}>
      <div style={{ position: "absolute", left: 0, top: compact ? 7 : 8, width: 3, height: 3, background: SIGNAL }} />
      <p style={{ margin: 0, fontFamily: sans, fontSize: compact ? 16 : 19, lineHeight: 1.4, fontWeight: 500, color: TXT_D1, maxWidth: "42ch" }}>
        {CREDENTIALS.benchmark}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------- form */

const fieldInput: CSSProperties = {
  height: 40,
  background: "transparent",
  border: "none",
  borderBottom: "1px solid rgba(244,245,247,0.22)",
  padding: "0 2px",
  color: TXT_D1,
  fontFamily: sans,
  fontSize: 16,
  width: "100%",
};

function Field({
  label,
  name,
  type,
  autoComplete,
  optional = false,
  required = false,
}: {
  label: string;
  name: string;
  type: string;
  autoComplete: string;
  optional?: boolean;
  required?: boolean;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: TXT_D2 }}>
        {label}
        {optional ? <span style={{ opacity: 0.5 }}> optional</span> : null}
      </span>
      <input type={type} name={name} autoComplete={autoComplete} required={required} className="campaign-underline" style={fieldInput} />
    </label>
  );
}

function LeadForm({ campaign, module: mod }: { campaign: Campaign; module: Module }) {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") || ""),
      phone: String(fd.get("phone") || ""),
      email: String(fd.get("email") || ""),
      company: String(fd.get("company") || ""),
      campaign: campaign.slug,
      module: mod.name,
    };
    if (!payload.name.trim() || !payload.phone.trim() || !payload.email.trim()) return;

    setStatus("sending");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("done");
      trackEvent("generate_lead", { campaign: campaign.slug, module: mod.id });
      trackLinkedInConversion();
      if (campaign.brochureUrl) {
        const a = document.createElement("a");
        a.href = campaign.brochureUrl;
        a.download = "";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div style={{ marginTop: 8 }}>
        <span style={{ ...eyebrow(SIGNAL), fontSize: 12 }}>Received</span>
        <p style={{ margin: "16px 0 0", fontFamily: sans, fontSize: 24, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.3, color: TXT_D1 }}>
          Thank you — we&apos;ll be in touch.
        </p>
        <p style={{ margin: "12px 0 0", fontFamily: sans, fontSize: 16, lineHeight: 1.6, color: TXT_D2 }}>
          {campaign.brochureUrl
            ? "Your brochure download has started. We'll call to set up your walkthrough."
            : "We'll email you the brochure shortly and call to set up your walkthrough."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <Field label="Full name" name="name" type="text" autoComplete="name" required />
        <Field label="Phone" name="phone" type="tel" autoComplete="tel" required />
        <Field label="Work email" name="email" type="email" autoComplete="email" required />
        <Field label="Company" name="company" type="text" autoComplete="organization" optional />
      </div>
      <button
        type="submit"
        className="dt-fill cursor-pointer"
        disabled={status === "sending"}
        style={{
          marginTop: 32,
          width: "100%",
          height: 52,
          background: TXT_D1,
          color: CANVAS_DARK,
          border: "none",
          borderRadius: 6,
          fontFamily: sans,
          fontSize: 16,
          fontWeight: 600,
          opacity: status === "sending" ? 0.7 : 1,
        }}
      >
        {status === "sending" ? "Sending…" : "Get the brochure"}
      </button>
      <span style={{ display: "block", marginTop: 12, fontFamily: mono, fontSize: 12, letterSpacing: "0.04em", color: status === "error" ? SIGNAL : TXT_D2, opacity: status === "error" ? 1 : 0.6 }}>
        {status === "error"
          ? "Something went wrong — please try again."
          : campaign.brochureUrl
            ? "Brochure downloads instantly · demo optional"
            : "Brochure emailed shortly · demo optional"}
      </span>
    </form>
  );
}

/* ------------------------------------------------------------- ledger row */

function MetricsLedger({ mobile = false }: { mobile?: boolean }) {
  const cells = [
    { n: "400K", label: "image reads / day" },
    ...CREDENTIALS.metrics.map((m) => ({ n: m.n, label: m.label })),
  ];
  return (
    <div style={{ position: "relative", borderTop: `1px solid ${RULE_D}` }}>
      <Dot style={{ left: -1, top: -1 }} />
      <Cross color={CROSS_D} style={{ right: -4, top: -4 }} />
      <div style={{ paddingTop: 18, ...eyebrow(TXT_D2), fontSize: 12 }}>
        Proof / field results — {mobile ? "Viso Yard" : "Viso Yard deployments"}
      </div>
      <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(5, 1fr)" }}>
        {cells.map((c, i) => {
          const borderLeft = mobile ? i % 2 === 1 : i > 0;
          return (
            <div
              key={c.n}
              style={{
                paddingLeft: mobile ? (i % 2 === 1 ? 20 : 0) : i > 0 ? 24 : 0,
                paddingRight: mobile ? 0 : 24,
                paddingTop: mobile && i > 1 ? 22 : 0,
                borderLeft: borderLeft ? `1px solid ${BORDER_D}` : undefined,
                borderTop: mobile && i > 1 ? `1px solid ${BORDER_D}` : undefined,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <span style={{ fontFamily: sans, fontSize: mobile ? 34 : 40, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1, fontVariantNumeric: "tabular-nums", color: TXT_D1 }}>
                {c.n}
              </span>
              <span style={{ fontFamily: mono, fontSize: 12, letterSpacing: "0.04em", color: TXT_D2, lineHeight: 1.35 }}>{c.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- page */

export function CampaignLanding({ campaign, module: mod }: { campaign: Campaign; module: Module }) {
  const [videoOpen, setVideoOpen] = useState(false);
  const headline = campaign.headline ?? mod.brief;
  const scaleTag = mod.name.replace(/^Viso\s+/i, "").toUpperCase();

  return (
    <div style={{ background: CANVAS_DARK, color: TXT_D1 }}>
      {/* ================= DESKTOP ================= */}
      <div className="hidden md:block" style={{ maxWidth: 1440, margin: "0 auto" }}>
        {/* title block */}
        <div style={{ padding: "56px 88px 32px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 48 }}>
          <div style={{ maxWidth: 760 }}>
            <span style={eyebrow(TXT_D2)}>Book a walkthrough</span>
            <h1 style={{ margin: "18px 0 0", fontFamily: sans, fontSize: 52, lineHeight: 1.04, fontWeight: 600, letterSpacing: "-0.025em", color: TXT_D1, textWrap: "balance" }}>
              {headline}
            </h1>
          </div>
          <div style={{ textAlign: "right", fontFamily: mono, fontSize: 12, letterSpacing: "0.06em", lineHeight: 1.9, color: TXT_D2, whiteSpace: "nowrap" }}>
            <div>SHEET&nbsp;&nbsp;VSTU-907032</div>
            <div>REV&nbsp;&nbsp;&nbsp;&nbsp;A · 2026</div>
            <div>SCALE&nbsp;&nbsp;1:1 · {scaleTag}</div>
          </div>
        </div>
        <div style={{ margin: "0 88px" }}>
          <RuleMark />
        </div>

        {/* footage + request */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 480px", padding: "40px 88px 48px" }}>
          <div style={{ paddingRight: 56, display: "flex", flexDirection: "column" }}>
            <span style={{ ...eyebrow(TXT_D2), fontSize: 12, marginBottom: 20 }}>FIG. 01 — LIVE READ / GATE_04</span>
            <MediaPane videoUrl={campaign.videoUrl} onPlay={() => setVideoOpen(true)} height={400} />
            <div style={{ marginTop: 32 }}>
              <BenchmarkLine />
            </div>
          </div>
          <div style={{ borderLeft: "1px solid rgba(244,245,247,0.14)", paddingLeft: 40, display: "flex", flexDirection: "column" }}>
            <span style={{ ...eyebrow(TXT_D2), fontSize: 12 }}>Request — 4 fields</span>
            <p style={{ margin: "14px 0 28px", fontFamily: sans, fontSize: 15, lineHeight: 1.55, color: TXT_D2 }}>
              Leave your number — we&apos;ll send the {mod.name} brochure and set up a 20-minute demo on your cameras.
            </p>
            <LeadForm campaign={campaign} module={mod} />
          </div>
        </div>

        {/* metrics ledger */}
        <div style={{ margin: "0 88px 56px" }}>
          <MetricsLedger />
        </div>
      </div>

      {/* ================= MOBILE ================= */}
      <div className="md:hidden" style={{ padding: "32px 20px 40px" }}>
        <span style={eyebrow(TXT_D2)}>Book a walkthrough</span>
        <h1 style={{ margin: "16px 0 0", fontFamily: sans, fontSize: 32, lineHeight: 1.06, fontWeight: 600, letterSpacing: "-0.025em", color: TXT_D1, textWrap: "balance" }}>
          {headline}
        </h1>
        <div style={{ margin: "24px 0" }}>
          <RuleMark />
        </div>

        <span style={{ ...eyebrow(TXT_D2), fontSize: 11 }}>FIG. 01 — LIVE READ / GATE_04</span>
        <div style={{ marginTop: 14 }}>
          <MediaPane videoUrl={campaign.videoUrl} onPlay={() => setVideoOpen(true)} height={240} />
        </div>
        <div style={{ marginTop: 18 }}>
          <BenchmarkLine compact />
        </div>

        <div style={{ marginTop: 32, borderTop: "1px solid rgba(244,245,247,0.14)", paddingTop: 28 }}>
          <span style={{ ...eyebrow(TXT_D2), fontSize: 11 }}>Request — 4 fields</span>
          <p style={{ margin: "12px 0 24px", fontFamily: sans, fontSize: 15, lineHeight: 1.55, color: TXT_D2 }}>
            Leave your number — we&apos;ll send the {mod.name} brochure and set up a 20-minute demo on your cameras.
          </p>
          <LeadForm campaign={campaign} module={mod} />
        </div>

        <div style={{ marginTop: 40 }}>
          <MetricsLedger mobile />
        </div>
      </div>

      {videoOpen ? <VideoModal videoUrl={campaign.videoUrl} onClose={() => setVideoOpen(false)} /> : null}
    </div>
  );
}
