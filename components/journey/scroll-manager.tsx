"use client";

/* ---------------------------------------------------------------------------
   Journey prototype — the one and only scroll driver.

   Lenis smooths the wheel, ScrollTrigger converts scroll position over the
   `#journey` spacer into 0..1, and that number goes into the singleton in
   lib/journey-scroll.ts. Nothing else on the page listens to scroll.

   WHY Lenis feeds ScrollTrigger explicitly (`lenis.on("scroll", update)`) and
   why Lenis is driven off gsap.ticker instead of its own rAF: Lenis moves the
   page on a frame that the browser's native scroll event does not reliably
   precede, so without both of these ScrollTrigger samples a position one frame
   behind Lenis and the scene lags the page by a frame under fast scroll.

   `lagSmoothing(0)` because our damper is already framerate-independent —
   GSAP's lag compensation would additionally warp dt and double-correct.

   EVERYTHING here is torn down on unmount. This is a dev prototype living in
   the same SPA as the real site; a surviving Lenis instance would hijack
   scrolling on every other page, and a surviving ticker callback would keep
   notifying subscribers of a scene that no longer exists.
--------------------------------------------------------------------------- */

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { journey, startDamper, freezeAt } from "@/lib/journey-scroll";

export default function JourneyScrollManager() {
  useEffect(() => {
    /* Reduced motion: no smooth scroll, no scrub, no ticker. Park progress in
       the middle of the journey and let subscribers paint one static frame. */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      freezeAt(0.5);
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({ lerp: 0.12, smoothWheel: true });
    const onLenisScroll = () => ScrollTrigger.update();
    lenis.on("scroll", onLenisScroll);

    const raf = (t: number) => lenis.raf(t * 1000); // gsap.ticker time is seconds
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    const st = ScrollTrigger.create({
      trigger: "#journey",
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        journey.raw = self.progress;
      },
    });

    const stopDamper = startDamper(gsap);

    return () => {
      /* Kill ONLY what this component made. ScrollTrigger.getAll() would take
         out any trigger another part of the site registered. */
      stopDamper();
      st.kill();
      lenis.off("scroll", onLenisScroll);
      gsap.ticker.remove(raf);
      gsap.ticker.lagSmoothing(1000, 16); // restore GSAP's default
      lenis.destroy();
      journey.raw = 0;
      journey.p = 0;
    };
  }, []);

  return null;
}
