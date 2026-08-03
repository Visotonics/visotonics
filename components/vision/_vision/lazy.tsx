"use client";

/* ---------------------------------------------------------------------------
   Vision scenes — lazy entry points.

   three.js plus the postprocessing examples is ~540 KB of the ~1.3 MB of
   script on a page carrying scenes — 41% of the payload, for something no
   visitor needs before first paint and many never scroll to at all.

   Two gates, and BOTH are needed:

     1. `next/dynamic({ ssr: false })` splits three out of the page bundle.
        On its own this is not enough: next/dynamic fetches the chunk when the
        component MOUNTS, and a scene sitting 8000px down the page still mounts
        on first render. The bytes moved to a separate request, arriving just as
        eagerly.

     2. `<WhenNear>` therefore refuses to render the dynamic component at all
        until its placeholder is within 400px of the viewport. That is what
        actually keeps three off the wire until a scene is approached.

   Inside the scenes, `mountWhenVisible` is a third gate on the GL context
   itself, which is what stops the CSS-hidden responsive twin costing anything.

   The placeholder is the scene's own backdrop colour, so an unloaded scene is
   an empty frame in the right colour rather than a white hole.
--------------------------------------------------------------------------- */
import dynamic from "next/dynamic";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { PALETTE } from "./palette";

/* ---- IDLE WARMING ------------------------------------------------------------
   The gates below decide WHEN a scene is allowed to cost anything. They do not
   change what it costs, and on arrival the cost all lands at once: the chunk is
   fetched, three is parsed, the shared metal maps are generated, and the scene
   is built — in that order, in the seconds the visitor is scrolling toward it.
   That is the stutter, and no amount of margin fixes it, because widening the
   margin only moves the same pile of work slightly earlier.

   So the expensive shared work is done during IDLE instead, once per page, well
   before any gate fires:

     · `./metal` pulls in three itself plus RoundedBoxGeometry, so importing it
       parses the single biggest dependency off the critical path.
     · `warmMetalCache()` then generates the ONE brushed finish every scene asks
       for (two canvases and a Sobel pass), so no scene is left paying for it.
     · `./studio` pulls the postprocessing chain the flagships need.

   Guarded on Save-Data and 2G: prefetching half a megabyte the visitor may
   never scroll to is a reasonable trade on a desktop connection and a rude one
   on a metered phone. requestIdleCallback is not in Safari, hence the timeout
   fallback — which is why the work is idempotent rather than assumed-once. */
/* WARMING THE SCENE CHUNKS TOO, NOT JUST THE SHARED ONES.
   Measured on the Viso Yard page: warming `metal` + `studio` left container-
   vision's own 106 KB chunk to be fetched AND PARSED on the scroll path, which
   was a 1.9s blocked frame on a cold cache. The shared modules were the ones
   easy to name, not the ones that were costing.

   Each scene registers its OWN importer rather than this file importing all
   eight, because a page carrying one card must not pull three flagships. The
   registration happens in WhenNear's effect, so the set is exactly the scenes
   the page actually rendered.

   Order is deliberate and SEQUENTIAL: metal (which is three itself) and studio
   first, because every scene chunk depends on them and a scene chunk that
   arrives first just waits. Then the scenes, one at a time — firing them in
   parallel puts them in contention for the same connection and the last one
   lands no earlier, while the first lands later. */
type Warm = () => Promise<unknown>;
const pendingWarm = new Set<Warm>();
let warmStarted = false;

function warmOnce() {
  if (warmStarted || typeof window === "undefined") return;
  warmStarted = true;

  const conn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (conn?.saveData) return;
  if (conn?.effectiveType && /2g/.test(conn.effectiveType)) return;

  const idle =
    (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback
    ?? ((cb: () => void) => window.setTimeout(cb, 1500));

  idle(() => {
    /* One microtask chain. Every step swallows its own failure: warming is an
       optimisation, and a scene that fails to prefetch must still be allowed to
       load normally when its gate fires. */
    let chain = import("./metal").then((m) => m.warmMetalCache()).catch(() => {});
    chain = chain.then(() => import("./studio")).then(() => {}).catch(() => {});
    /* Snapshot: WhenNear effects have all run by the time idle fires, and a
       scene registering later still loads through its own gate. */
    for (const w of pendingWarm) chain = chain.then(() => w()).then(() => {}).catch(() => {});
    /* ...and once the chain is drained, release the distance gate entirely.

       WhenNear exists to keep three off the wire until a scene is approached.
       By this point the chunks are already IN, so the gate is no longer buying
       anything — and holding it costs something real: mountWhenVisible builds
       the moment its element exists, so a scene that renders late also BUILDS
       late, on a frame the visitor is scrolling. Releasing here moves all three
       builds into idle time, one per animation frame, while nothing is moving. */
    chain.then(() => { warmDone = true; for (const r of releases) r(); }).catch(() => {});
  }, { timeout: 4000 });
}

/* Set once the idle chain has drained; WhenNear instances mounted after that
   point skip the distance gate rather than waiting for a release that has
   already fired. */
let warmDone = false;
const releases = new Set<() => void>();

/** Register a scene chunk to be prefetched during idle. Safe to call repeatedly. */
function registerWarm(w: Warm) {
  pendingWarm.add(w);
}

const Placeholder = () => (
  <div aria-hidden style={{ position: "absolute", inset: 0, background: PALETTE.bgBottom }} />
);

/** Renders `children` only once the slot comes within reach of the viewport. */
function WhenNear({ children, warm }: { children: ReactNode; warm?: Warm }) {
  const ref = useRef<HTMLDivElement>(null);
  /* Lazy initialiser rather than a setState in the effect below: an instance
     mounting AFTER the idle chain has drained (a route that renders a scene
     late) must already be past the gate on its first render, and calling
     setNear synchronously in an effect to achieve that is a cascading render. */
  const [near, setNear] = useState(() => warmDone);

  useEffect(() => {
    if (warm) registerWarm(warm);
    warmOnce();

    /* Second, independent trigger: the idle chain finishing. Whichever fires
       first wins, and on a quiet page that is this one. */
    const release = () => setNear(true);
    releases.add(release);

    const el = ref.current;
    if (!el) return () => { releases.delete(release); };
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setNear(true);
        io.disconnect(); // one-way: never unload a scene the visitor has seen
      },
      /* 1200px, up from 400. This gate only decides when the COMPONENT renders,
         which is when its chunk is requested — cheap to do early and expensive
         to do late. It is deliberately wider than mount.ts's 900px build gate,
         so the ordering is: request the chunk (1200) -> queue the build (900)
         -> scene is in shot. Reversing those two means the build gate fires
         against a component that does not exist yet. */
      { rootMargin: "1200px" },
    );
    io.observe(el);
    return () => { releases.delete(release); io.disconnect(); };
  }, []);

  return (
    <div ref={ref} style={{ position: "absolute", inset: 0 }}>
      {near ? children : <Placeholder />}
    </div>
  );
}

/* The loaders are named so the SAME function reference can be handed to both
   `dynamic` and the idle warm. Sharing the reference is the point: the module
   registry dedupes, so whichever fires first pays and the other is free. */
/* The flagship loaders also GENERATE their textures, not just fetch their code.
   Measured: prefetching the chunks alone changed the scroll-path hitches by
   under 5% — the bytes were never the cost. The cost is canvas painting (grain
   passes, Sobel normal derivations, 2048-wide albedos), and that is what has to
   happen at idle. Each scene's texture module caches its output, so doing it
   here means the build that runs on the scroll path gets only cache hits. */
const loadContainer = () => import("../container-vision/scene")
  .then(async (m) => { (await import("../container-vision/materials")).warmContainerTextures(); return m; });
const loadTank = () => import("../tank-vision/scene");
const loadGate = () => import("../gate-vision/scene")
  .then(async (m) => { (await import("../gate-vision/materials")).warmGateTextures(); return m; });
const loadYardVision = () => import("../yard-vision/scene")
  .then(async (m) => { (await import("../yard-vision/yard")).warmYardTextures(); return m; });
const loadCrane = () => import("../crane-vision/scene")
  .then(async (m) => { (await import("../crane-vision/crane")).warmCraneTextures(); return m; });
const loadCargo = () => import("../cargo-vision/scene")
  .then(async (m) => { (await import("../cargo-vision/cargo")).warmCargoTextures(); return m; });
const loadDocument = () => import("../document-vision/scene")
  .then(async (m) => { (await import("../document-vision/document")).warmDocumentTextures(); return m; });
const loadLead = () => import("../lead-card/scene");
const loadCards = () => import("../hero-cards");

const loadAscii = () => import("../ascii-hero/scene")
  .then(async (m) => { (await import("../ascii-hero/ascii")).warmAsciiAtlas(); return m; });

const DynContainer = dynamic(loadContainer, { ssr: false, loading: Placeholder });
const DynTank = dynamic(loadTank, { ssr: false, loading: Placeholder });
const DynGate = dynamic(loadGate, { ssr: false, loading: Placeholder });
const DynYardVision = dynamic(loadYardVision, { ssr: false, loading: Placeholder });
const DynCrane = dynamic(loadCrane, { ssr: false, loading: Placeholder });
const DynCargo = dynamic(loadCargo, { ssr: false, loading: Placeholder });
const DynDocument = dynamic(loadDocument, { ssr: false, loading: Placeholder });
const DynAscii = dynamic(loadAscii, { ssr: false, loading: Placeholder });
const DynLead = dynamic(loadLead, { ssr: false, loading: Placeholder });
const DynYard = dynamic(() => loadCards().then((m) => m.YardCard), { ssr: false, loading: Placeholder });
const DynWarehouse = dynamic(() => loadCards().then((m) => m.WarehouseCard), { ssr: false, loading: Placeholder });
const DynFactory = dynamic(() => loadCards().then((m) => m.FactoryCard), { ssr: false, loading: Placeholder });
const DynData = dynamic(() => loadCards().then((m) => m.DataCard), { ssr: false, loading: Placeholder });

/* The flagship wrappers forward `bare` — the prop that drops the backdrop and
   lets the subject sit on the page rather than inside a framed picture. A
   zero-prop wrapper silently swallows it, which type-errors at the call site
   rather than failing quietly, but only because the scenes type their props. */
export interface SceneProps { bare?: boolean; bleed?: number }
export const ContainerVisionScene = (p: SceneProps) => <WhenNear warm={loadContainer}><DynContainer {...p} /></WhenNear>;
export const TankVisionScene = (p: SceneProps) => <WhenNear warm={loadTank}><DynTank {...p} /></WhenNear>;
export const GateVisionScene = (p: SceneProps) => <WhenNear warm={loadGate}><DynGate {...p} /></WhenNear>;
/* `YardVisionScene`, not `YardCard` — the card is the small homepage hero tile
   for the Viso Yard PRODUCT; this is section 04's aerial flagship. Two different
   scenes about the same word, and the names have to keep them apart. */
export const YardVisionScene = (p: SceneProps) => <WhenNear warm={loadYardVision}><DynYardVision {...p} /></WhenNear>;
/* The portrait flagship — a load rising on a spreader. Its slot is ~1:2.2 tall
   and the scene derives its framing from the live aspect, so it must not be
   dropped into a landscape box. */
export const CraneVisionScene = (p: SceneProps) => <WhenNear warm={loadCrane}><DynCrane {...p} /></WhenNear>;
/* The destuff flagship — mixed cargo counted out of a container's door end. Its
   slot is landscape 4:3 and the framing is derived from the live aspect. */
export const CargoVisionScene = (p: SceneProps) => <WhenNear warm={loadCargo}><DynCargo {...p} /></WhenNear>;
/* The key-value flagship — a Bill of Lading read in place on a desk. Its slot is
   landscape 3:2 and the framing is derived from the live aspect. */
export const DocumentVisionScene = (p: SceneProps) => <WhenNear warm={loadDocument}><DynDocument {...p} /></WhenNear>;
/* The ASCII field takes  rather than bare/bleed — it is a background,
   and how loud it is belongs to the page it sits behind, not to the scene. */
export const AsciiHeroScene = (p: { intensity?: number }) => <WhenNear warm={loadAscii}><DynAscii {...p} /></WhenNear>;
export const LeadCardScene = () => <WhenNear warm={loadLead}><DynLead /></WhenNear>;
export const YardCard = () => <WhenNear warm={loadCards}><DynYard /></WhenNear>;
export const WarehouseCard = () => <WhenNear warm={loadCards}><DynWarehouse /></WhenNear>;
export const FactoryCard = () => <WhenNear warm={loadCards}><DynFactory /></WhenNear>;
export const DataCard = () => <WhenNear warm={loadCards}><DynData /></WhenNear>;

/* The people flagship — one worker crossing an aisle, read by three pole
   cameras that resolve to one identity. Its slot is landscape 16/9 and the
   framing is derived from the live aspect. `warmWorkTextures` has no canvases of
   its own; it exists to generate the DARK_METAL maps (shared with gate-vision)
   during idle rather than on the scroll path. */
const loadWork = () => import("../work-vision/scene")
  .then(async (m) => { (await import("../work-vision/work")).warmWorkTextures(); return m; });
const DynWork = dynamic(loadWork, { ssr: false, loading: Placeholder });
export const WorkVisionScene = (p: SceneProps) => <WhenNear warm={loadWork}><DynWork {...p} /></WhenNear>;
