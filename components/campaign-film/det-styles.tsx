"use client";

/* Scoped CSS for the in-scene detection chips (the `Det` component in Container.tsx), ported from
   the source site's app/globals.css. Everything is nested under `.cf-root` so it cannot collide with
   any class already used elsewhere on this site, and the component carries its own styling rather
   than depending on anything added to globals.css. Colors/keyframes are the source's exact values
   (--ice/--ok/--warn/--crit/--pulse), inlined here rather than added as new CSS custom properties on
   :root, since this is the only consumer. */
export function DetStyles() {
  return (
    <style>{`
      .cf-root { --cf-ice: #8fd0f5; --cf-ok: #6fe3a5; --cf-warn: #ffb020; --cf-crit: #ff5d5d; --cf-pulse: 1.8s; }

      .cf-root .det { position: relative; width: 132px; height: 96px; font-family: var(--font-mono), ui-monospace, monospace; }
      .cf-root .det i { position: absolute; width: 14px; height: 14px; border: 0 solid var(--cf-warn); }
      .cf-root .det i:nth-of-type(1) { top: 0; left: 0; border-top-width: 1.5px; border-left-width: 1.5px; }
      .cf-root .det i:nth-of-type(2) { top: 0; right: 0; border-top-width: 1.5px; border-right-width: 1.5px; }
      .cf-root .det i:nth-of-type(3) { bottom: 0; left: 0; border-bottom-width: 1.5px; border-left-width: 1.5px; }
      .cf-root .det i:nth-of-type(4) { bottom: 0; right: 0; border-bottom-width: 1.5px; border-right-width: 1.5px; }
      .cf-root .det .ring { position: absolute; inset: -6px; border: 1.5px solid var(--cf-warn); border-radius: 4px; opacity: 0; pointer-events: none; }
      .cf-root .det.lock { animation: cf-lockon 0.5s cubic-bezier(0.2, 0.9, 0.25, 1); }
      .cf-root .det.lock .ring { animation: cf-ringout 0.7s ease-out; }
      .cf-root .det.live i { animation: cf-detglow calc(var(--cf-pulse) * 1.25) ease-in-out infinite; }

      .cf-root .det .tag { position: absolute; bottom: calc(100% + 8px); left: 0; min-width: 150px; background: rgba(7, 12, 34, 0.94); border: 1px solid var(--cf-warn); border-radius: 8px; padding: 9px 12px 10px; backdrop-filter: blur(6px); }
      .cf-root .det .tcls { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; font-size: 13px; font-weight: 600; letter-spacing: 0.08em; color: var(--cf-warn); }
      .cf-root .det .conf { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
      .cf-root .det .conf b { font-size: 13px; font-weight: 600; color: #fff; font-variant-numeric: tabular-nums; min-width: 40px; }
      .cf-root .det .cbar { flex: 1; height: 4px; background: rgba(255, 255, 255, 0.16); border-radius: 2px; overflow: hidden; }
      .cf-root .det .cbar span { display: block; height: 100%; width: 0; background: var(--cf-warn); border-radius: 2px; }
      .cf-root .det .act { font-size: 11px; letter-spacing: 0.06em; color: var(--cf-ok); margin-top: 8px; opacity: 0; transform: translateY(3px); transition: all 0.35s; white-space: nowrap; }
      .cf-root .det .act.on { opacity: 1; transform: none; }

      .cf-root .det.ocr { width: 210px; height: 56px; }
      .cf-root .det.ocr i, .cf-root .det.ocr .ring { border-color: var(--cf-ice); }
      .cf-root .det.ocr .tag { border-color: var(--cf-ice); bottom: auto; top: calc(100% + 8px); }
      .cf-root .det.ocr .tcls { color: var(--cf-ice); }
      .cf-root .det.ocr .cbar span { background: var(--cf-ice); }
      .cf-root .det.ocr.live i { animation-name: cf-ocrglow; }

      @keyframes cf-lockon { 0% { transform: scale(1.15); } 58% { transform: scale(0.97); } 100% { transform: scale(1); } }
      @keyframes cf-ringout { 0% { transform: scale(1.22); opacity: 0.8; } 100% { transform: scale(1); opacity: 0; } }
      @keyframes cf-detglow { 0%, 100% { box-shadow: 0 0 1px rgba(255, 176, 32, 0); } 50% { box-shadow: 0 0 7px rgba(255, 176, 32, 0.5); } }
      @keyframes cf-ocrglow { 0%, 100% { box-shadow: 0 0 1px rgba(143, 208, 245, 0); } 50% { box-shadow: 0 0 7px rgba(143, 208, 245, 0.5); } }

      @media (prefers-reduced-motion: reduce) {
        .cf-root .det.lock, .cf-root .det.lock .ring, .cf-root .det.live i { animation: none; }
      }
    `}</style>
  );
}
