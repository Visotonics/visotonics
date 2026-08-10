"use client";

/* ---------------------------------------------------------------------------
   Motion primitives (Motion Spec v1). CSS transitions + IntersectionObserver
   only — no animation library. Every reveal fires ONCE (data-revealed) and
   never re-animates. Reduced motion + no-JS land on the final state.
--------------------------------------------------------------------------- */

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/* §6 — link underline-draw. Hover always draws it (pure CSS, see .dt-underline-draw
   in globals.css); this wrapper adds the "or on view" half of the spec — the
   underline draws itself once, unprompted, the first time the link scrolls
   into view, via the same one-shot IntersectionObserver pattern as Reveal. */
export function UnderlineDraw({
  href,
  children,
  className = "",
  style,
  onClick,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}) {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            el.dataset.drawn = "true";
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <a ref={ref} href={href} onClick={onClick} className={`dt-underline-draw ${className}`} style={style}>
      {children}
    </a>
  );
}

/* §5.1 / §3.3 — one-shot reveal. `mono` uses the linear opacity-only variant. */
export function Reveal({
  children,
  className = "",
  style,
  mono = false,
  delay = 0,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  mono?: boolean;
  delay?: number;
  as?: "div" | "span" | "p";
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || el.dataset.revealed) return;
    const reveal = () => {
      if (delay) el.style.transitionDelay = `${delay}ms`;
      el.dataset.revealed = "true";
    };
    if (prefersReducedMotion()) {
      reveal();
      return;
    }
    // threshold is a fraction of the TARGET's own area, not the viewport — a
    // wrapped block taller than the viewport (e.g. an entire Industries
    // chapter, ~4000px on mobile) can never satisfy a 0.2 ratio, since even a
    // full-viewport scroll position covers less than 20% of it. Use a
    // near-zero threshold so reveal fires as soon as the block starts
    // entering view, regardless of how tall the wrapped content is.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            reveal();
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.01, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);

  const Tag = as as "div";
  return (
    <Tag ref={ref as React.Ref<HTMLDivElement>} className={`${mono ? "v-reveal-mono" : "v-reveal"} ${className}`} style={style}>
      {children}
    </Tag>
  );
}

/* §4.5 — metric count-up. Stepped (mechanical), tabular-nums, once, on view.
   `value` is the exact fact-bank string (e.g. "400,000", "90%", "~100%"). */
export function CountUp({
  value,
  className = "",
  style,
}: {
  value: string;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || el.dataset.counted) return;
    const m = value.match(/^(\D*)([\d,]+)(.*)$/);
    if (!m) return; // no numeric part — leave the literal value
    const prefix = m[1];
    const numStr = m[2];
    const suffix = m[3];
    const hasComma = numStr.includes(",");
    const target = parseInt(numStr.replace(/,/g, ""), 10);
    const fmt = (n: number) => (hasComma ? n.toLocaleString("en-US") : String(n));
    const render = (n: number) => {
      el.textContent = prefix + fmt(n) + suffix;
    };

    if (prefersReducedMotion()) return; // SSR already shows the final value

    /* The timer is tracked so unmount can cancel it. `tick` re-schedules
       itself 24 times over 800ms; without this, a count that is mid-run when
       the user navigates keeps firing against a detached node — the component
       carrying on after it has stopped existing. */
    let timer = 0;
    const run = () => {
      el.dataset.counted = "true";
      const steps = 24;
      const dur = 800;
      render(0);
      let i = 0;
      const tick = () => {
        i += 1;
        render(i >= steps ? target : Math.round((target * i) / steps));
        if (i < steps) timer = window.setTimeout(tick, dur / steps);
      };
      tick();
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            run();
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [value]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums", ...style }}>
      {value}
    </span>
  );
}

