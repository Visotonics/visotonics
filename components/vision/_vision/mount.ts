/* ---------------------------------------------------------------------------
   Vision scenes — deferred mount.

   Every page that carries a scene renders BOTH a desktop and a mobile layout
   and hides one with CSS. Both still mount, so a page showing two scenes
   actually builds four WebGL contexts — and a browser will start refusing or
   silently dropping contexts well before that is obviously your fault. The
   symptom is not an error: it is a canvas that composites black.

   So: never build the renderer until the element is on screen AND has a real
   size. A `display:none` element reports zero size and never intersects, so
   the hidden branch simply never costs anything.
--------------------------------------------------------------------------- */

/**
 * Build `make(el)` once, the first time `el` is visible and measurable.
 * Returns a teardown that covers both the built and never-built cases.
 */
/* Build queue.

   Four cards becoming visible in the same frame all constructed in that frame:
   four renderers, four PMREM prefilters, four sets of geometry, back to back
   with no yield. That is the two-second hang on the homepage — not download,
   not compile, just four scene builds serialised into one long task.

   Builds are now queued and run ONE PER ANIMATION FRAME, so the browser gets
   to paint and respond between them. Total work is identical; it is spread
   across ~4 frames instead of blocking one. */
const buildQueue: { run: () => void; label: string }[] = [];
let pumping = false;
function pump() {
  if (pumping) return;
  pumping = true;
  const step = () => {
    const job = buildQueue.shift();
    if (job) {
      const t0 = performance.now();
      job.run();
      const ms = performance.now() - t0;
      /* Add ?perf to any URL to print what each scene build actually costs.
         Deliberately available in PRODUCTION too: dev numbers are useless here
         because dev ships unminified code and React Strict Mode builds every
         scene twice, so the only figure worth optimising against is this one,
         measured on a real build. */
      if (typeof location !== "undefined" && location.search.includes("perf")) {
        console.info(`[vision] ${job.label} build ${ms.toFixed(0)}ms`);
        // also recorded on window so it can be read after the fact — console
        // capture is not reliable across tooling
        const w = window as unknown as { __visionPerf?: string[] };
        (w.__visionPerf ||= []).push(`${job.label} ${Math.round(ms)}`);
      }
    }
    if (buildQueue.length) requestAnimationFrame(step);
    else pumping = false;
  };
  requestAnimationFrame(step);
}

export function mountWhenVisible(
  el: HTMLElement,
  make: (el: HTMLElement) => () => void,
  /* Optional scene name. Without it the ?perf readout is a bare list of
     milliseconds in build-queue order, which on a three-scene page is not
     enough to tell which number belongs to which scene — and guessing the
     order is exactly how a cost gets attributed to the wrong scene. */
  label?: string,
): () => void {
  let teardown: (() => void) | null = null;
  let done = false;
  // a scene can be unmounted while still sitting in the queue
  let cancelled = false;

  const start = () => {
    if (done || !el.clientWidth || !el.clientHeight) return;
    done = true;
    // queued rather than built inline — see the build-queue note above
    buildQueue.push({ label: label ?? "scene", run: () => { if (!cancelled) teardown = make(el); } });
    pump();
  };

  // rootMargin so a scene is ready by the time it is scrolled to, not after
  /* 900px, up from 200. This gate QUEUES THE BUILD, and the build is the
     expensive half — so it has to fire far enough ahead that the work is
     finished before the scene is actually in shot. At 200px the build landed
     essentially as the section arrived, which is precisely the stutter that
     gets described as "the animation loads when I reach it".

     It must also stay AHEAD of nothing: lazy.tsx renders the component at
     1200px, so by the time this observer can even exist the chunk request is
     already in flight. The two margins are deliberately ordered 1200 -> 900. */
  const gate = new IntersectionObserver(([e]) => { if (e.isIntersecting) start(); }, { rootMargin: "900px" });
  gate.observe(el);
  start(); // it may already be in view on first paint

  return () => {
    cancelled = true;
    gate.disconnect();
    teardown?.();
  };
}
