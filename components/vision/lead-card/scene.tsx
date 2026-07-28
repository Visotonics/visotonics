"use client";

/* ---------------------------------------------------------------------------
   Home lead card — "From the CCTV you already own."

   THE IDEA, taken from the card's own copy:
     "No new hardware. The platform runs on the cameras already watching your
      yard, warehouse and factory."

   So this is not one product demo. It is the WHOLE SITE at once, seen from the
   cameras that are already on it — which is the only honest way to draw "one
   vision layer across the operation". Everything the platform sells is present
   and working simultaneously:

     yard      stacked containers, one located          (Viso Yard)
     gate      a truck crossing under a gantry          (Gate Vision)
     dock      a trailer on a bay, cargo moving         (Cargo Vision)
     warehouse pallets counted on the apron             (Viso Warehouse)
     factory   a line running parts past a head         (Viso Factory)
     people    staff walking the site, resolved         (Work Vision)

   Four camera poles cover it. Each head sweeps its own arc on its own period,
   so the site is never fully observed at one instant and never unobserved
   either — which is the actual claim. Detections attach to whatever a head is
   currently pointing at, so the boxes are a CONSEQUENCE of where the cameras
   are looking rather than decoration on a timer.

   THIS CARD IS LIGHT. Every other scene in the system sits on near-black; this
   one sits on LIGHT_SURFACE (#F6F7F8), which inverts the lighting problem —
   subjects go dark to separate, and backdrop, exposure and shadow are re-keyed.
--------------------------------------------------------------------------- */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { createStudio } from "../_vision/studio";
import { mountWhenVisible } from "../_vision/mount";
import { clamp01, easeInOut, lerp, placeCamera } from "../_vision/camera";
import { makeMetal, metalBox } from "../_vision/metal";
import { createTracker, detectMaterials } from "../hero-cards/detect";

/** LIGHT_SURFACE from app/page.tsx — the card this scene is mounted on. */
const CARD_SURFACE = "#F6F7F8";

/* 15, down from 22. Every actor in this scene — the gate truck, the dock
   trailer, the line, the walkers, the four camera sweeps — is a function of
   this one period, so shortening it speeds the whole site up together and
   nothing has to be re-choreographed. At 22 the card was a still life for most
   of the time anyone spent looking at it. */
const LOOP = 15;
const SETTLE = 1.2;
const GROUND = -1.25;

export default function LeadCardScene() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    return mountWhenVisible(wrap, (el) => {
      try {
        const studio = createStudio(el, {
          floorY: GROUND,
          shadowExtent: 22,
          spread: 2.2,
          exposure: 0.5,
          bloom: false,
          shadowMapSize: 1024,
        noEnv: true,
        lightRig: "lite",
          maxDpr: 1.5,
          // keyed to the card itself, so the site sits ON the card
          /* Held FLAT at the card's own colour. Any ramp reads as a vignette
          inside a small light card and hands the frame a visible edge — the
          animation should look like it is happening on the card, not in a
          rendered box sitting on it. */
          backdrop: { top: "#F7F8FA", mid: "#F6F7F8", bottom: "#F4F5F7", glow: "#FFFFFF" },
        });
        const { camera, scene, shadowMat, renderer } = studio;

        const mats: THREE.Material[] = [];
        const metals: { dispose: () => void }[] = [];
        const met = (base: string, kind: Parameters<typeof makeMetal>[0]["kind"], m: number, r: number) => {
          const x = makeMetal({ base, kind, metalness: m, rough: r });
          metals.push(x);
          mats.push(x.material);
          return x.material;
        };
        const plain = (color: string, rough = 0.95) => {
          const m = new THREE.MeshStandardMaterial({
            color, metalness: 0.05, roughness: rough,
            transparent: true, opacity: 0, envMapIntensity: 0.15,
          });
          mats.push(m);
          return m;
        };

        /* Dark bodies on a pale ground — the inverse of every other scene here.
           Three values of the same slate so the site reads as one place. */
        const dark = met("#232833", "painted", 0.3, 0.6);
        const steel = met("#3B4351", "brushed", 0.7, 0.45);
        const midTone = plain("#9AA3B0");
        const paleTone = plain("#C2C9D3");
        const boxTone = plain("#AAB3C0");

        const g = new THREE.Group();
        scene.add(g);
        const bx = (w: number, h: number, d: number, m: THREE.Material) => metalBox(w, h, d, m, Math.min(w, h, d) * 0.07);
        const put = (mesh: THREE.Mesh, x: number, y: number, z: number, shadow = true) => {
          mesh.position.set(x, y, z);
          mesh.castShadow = shadow;
          g.add(mesh);
          return mesh;
        };

        /* ================= the site ================= */

        /* -- yard: two stacks of containers, far left -- */
        const yardBoxes: THREE.Mesh[] = [];
        for (let i = 0; i < 4; i++) {
          for (let j = 0; j < 2; j++) {
            const b = bx(2.5, 1.0, 1.1, j === 1 && i === 1 ? midTone : paleTone);
            put(b, -13 + i * 2.65, GROUND + 0.5 + j * 1.04, -3.2);
            yardBoxes.push(b);
          }
        }

        /* -- gate: a gantry with a truck crossing under it -- */
        const gantry = new THREE.Group();
        gantry.position.set(-5.2, 0, 0.4);
        g.add(gantry);
        const gCol = bx(0.22, 4.2, 0.22, steel);
        gCol.position.set(0, GROUND + 2.1, -2.4);
        gantry.add(gCol);
        const gBeam = bx(0.2, 0.2, 5.0, steel);
        gBeam.position.set(0, GROUND + 4.1, 0.1);
        gantry.add(gBeam);

        const truck = new THREE.Group();
        g.add(truck);
        const trailer = bx(4.6, 1.15, 1.15, paleTone);
        trailer.position.set(-1.2, GROUND + 1.15, 0);
        truck.add(trailer);
        const cabT = bx(1.5, 1.3, 1.2, midTone);
        cabT.position.set(1.9, GROUND + 1.0, 0);
        truck.add(cabT);
        const chassis = bx(6.6, 0.16, 1.0, dark);
        chassis.position.set(-0.2, GROUND + 0.52, 0);
        truck.add(chassis);
        for (const wx of [-3.0, -2.1, 1.6, 2.4]) {
          const w = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 14), dark);
          w.rotation.x = Math.PI / 2;
          w.position.set(wx, GROUND + 0.32, 0.55);
          truck.add(w);
          const w2 = w.clone();
          w2.position.z = -0.55;
          truck.add(w2);
        }

        /* -- dock: a bay with a trailer parked and cargo on the apron -- */
        const dockWall = bx(6.0, 2.6, 0.5, paleTone);
        put(dockWall, 3.4, GROUND + 1.3, -4.6);
        for (const dx of [1.6, 5.2]) {
          const door = bx(1.7, 1.9, 0.12, midTone);
          put(door, dx, GROUND + 0.95, -4.3, false);
        }
        const docked = bx(3.6, 1.15, 1.1, paleTone);
        put(docked, 2.0, GROUND + 1.1, -3.0);

        /* -- warehouse: pallets being counted on the apron -- */
        const cartons: THREE.Mesh[] = [];
        for (let r = 0; r < 2; r++) {
          for (let i = 0; i < 3; i++) {
            const c = bx(0.62, 0.5, 0.62, boxTone);
            put(c, 5.6 + i * 0.68, GROUND + 0.3 + r * 0.54, -0.9);
            cartons.push(c);
          }
        }
        const pallet = bx(2.3, 0.12, 0.9, dark);
        put(pallet, 6.28, GROUND + 0.06, -0.9, false);

        /* -- factory: a line running parts past a head, right -- */
        const belt = bx(6.2, 0.18, 0.9, dark);
        put(belt, 11.4, GROUND + 0.62, -1.6, false);
        for (const lx of [8.8, 11.4, 14.0]) {
          const leg = bx(0.13, 1.2, 0.13, steel);
          put(leg, lx, GROUND + 0.1, -1.6, false);
        }
        const parts: THREE.Mesh[] = [];
        for (let i = 0; i < 4; i++) {
          const pm = bx(0.7, 0.42, 0.6, midTone);
          put(pm, 0, GROUND + 0.92, -1.6);
          parts.push(pm);
        }

        /* -- people: staff walking the site (Work Vision) --
           A capsule and a head is all that survives at this size, and it reads
           as a person immediately. They walk fixed paths at different speeds so
           the site looks staffed rather than choreographed. Their vertical bob
           is fine — the no-vertical rule governs the CAMERA, not the subject. */
        const people: { grp: THREE.Group; x0: number; x1: number; z: number; sp: number; ph: number }[] = [];
        const PEOPLE = [
          { x0: -9.5, x1: -2.0, z: 1.9, sp: 1.0, ph: 0.0 },
          { x0: 1.0, x1: 7.5, z: 2.4, sp: 0.72, ph: 0.35 },
          { x0: 8.0, x1: 13.5, z: 0.6, sp: 0.86, ph: 0.7 },
          { x0: -3.0, x1: 3.0, z: -1.9, sp: 0.6, ph: 0.15 },
          { x0: 4.0, x1: 9.0, z: -2.6, sp: 0.9, ph: 0.55 },
        ];
        for (const spec of PEOPLE) {
          const grp = new THREE.Group();
          const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.42, 4, 8), dark);
          torso.position.y = GROUND + 0.62;
          torso.castShadow = true;
          grp.add(torso);
          const headM = new THREE.Mesh(new THREE.SphereGeometry(0.145, 12, 10), dark);
          headM.position.y = GROUND + 1.02;
          grp.add(headM);
          g.add(grp);
          people.push({ grp, ...spec });
        }

        /* -- the cameras that see all of it: four poles, four arcs -- */
        const heads: { yawGrp: THREE.Group; beam: THREE.Mesh; beamMat: THREE.MeshBasicMaterial }[] = [];
        const POLES = [
          { x: -9.6, z: 3.6, base: -0.35, arc: 0.5, period: 1.0, phase: 0.0 },
          { x: -1.6, z: 4.0, base: 0.05, arc: 0.55, period: 0.78, phase: 0.4 },
          { x: 6.2, z: 4.0, base: 0.1, arc: 0.5, period: 0.9, phase: 0.15 },
          { x: 13.2, z: 3.4, base: 0.4, arc: 0.45, period: 1.15, phase: 0.65 },
        ];
        const beamMats: THREE.MeshBasicMaterial[] = [];
        /* Built once and shared by all four beams. ConeGeometry runs along +Y
           with its apex at +h/2; translating by -h/2 puts the apex at the
           origin and rotating +90deg about Z lays it along +X, which is the
           optical axis of these heads (the barrel sits at local +x). */
        const beamGeo = new THREE.ConeGeometry(1, 1, 4, 1, true);
        beamGeo.translate(0, -0.5, 0);
        beamGeo.rotateZ(Math.PI / 2);
        const _tp = new THREE.Vector3();
        const _hp = new THREE.Vector3();
        for (const P of POLES) {
          const pole = bx(0.14, 4.6, 0.14, steel);
          put(pole, P.x, GROUND + 2.3, P.z);
          const arm = bx(0.7, 0.11, 0.11, steel);
          put(arm, P.x + 0.3, GROUND + 4.5, P.z, false);
          const yawGrp = new THREE.Group();
          yawGrp.position.set(P.x + 0.62, GROUND + 4.42, P.z);
          g.add(yawGrp);
          const head = bx(0.5, 0.28, 0.34, dark);
          head.castShadow = true;
          yawGrp.add(head);
          const hood = bx(0.56, 0.07, 0.38, dark);
          hood.position.y = 0.18;
          yawGrp.add(hood);
          const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.2, 14), dark);
          barrel.rotation.z = Math.PI / 2;
          barrel.position.x = 0.3;
          yawGrp.add(barrel);
          // the beam makes each head's aim legible without a label
          const bm = new THREE.MeshBasicMaterial({
            color: "#3AA0DC", transparent: true, opacity: 0,
            side: THREE.DoubleSide, depthWrite: false, toneMapped: false,
          });
          beamMats.push(bm);
          mats.push(bm);
          /* UNIT cone: apex at the origin, opening along +X, one unit long and
             one unit in radius at the far end. Per frame it is scaled to the
             real distance to the target, so the beam always lands ON the thing
             being detected instead of stopping in mid-air at a fixed 7.4. */
          const beam = new THREE.Mesh(beamGeo, bm);
          beam.position.set(0.42, 0, 0);
          yawGrp.add(beam);
          heads.push({ yawGrp, beam, beamMat: bm });
        }

        /* -- detections: attach to whatever the heads are covering --
           Four trackers cycle through the site's subjects. They are driven by
           the same clock as the heads, so a box only ever appears on something
           a camera is actually pointed at. */
        const dm = detectMaterials();
        mats.push(...dm.all);
        const trackers = [
          createTracker(dm.accent, { ticks: 4, pad: 1.2 }),
          createTracker(dm.accent, { ticks: 4, pad: 1.2 }),
          createTracker(dm.accent, { ticks: 3, pad: 1.25 }),
          createTracker(dm.accent, { ticks: 3, pad: 1.3 }),
        ];
        trackers.forEach((t) => g.add(t.group));
        // the pool each tracker draws from — one per product area
        const pools: THREE.Object3D[][] = [
          [yardBoxes[3], yardBoxes[5], yardBoxes[1]],
          [truck, docked, truck],
          [cartons[2], cartons[4], pallet],
          [people[0].grp, parts[1], people[2].grp],
        ];

        const ro = new ResizeObserver(studio.size);
        ro.observe(el);
        let onScreen = true;
        const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }, { rootMargin: "140px" });
        io.observe(el);

        /* The clock is STARTED ON THE FIRST RENDERED FRAME, not at construction.
         Building a scene blocks for a while; with a clock running from
         construction the first frame the user actually sees is already
         hundreds of milliseconds in, so the intro appears to skip its
         beginning. Starting it here means every viewer sees frame one. */
      const clock = new THREE.Clock(false);
      let clockStarted = false;
        const target = new THREE.Vector3();
        let raf = 0;

        const frame = () => {
          const t = reduce ? 7 : clock.getElapsedTime();
          const p = reduce ? 0.3 : (t % LOOP) / LOOP;

          // the truck crosses the gate lane, wrapping off-frame
          const tx = ((t * 0.62) % 26) - 15;
          truck.position.x = tx;

          // the line runs
          parts.forEach((pm, i) => {
            let x = 8.4 + ((t * 0.8 + i * 1.6) % 6.4);
            pm.position.x = x;
          });

          // people walk their paths, turning at each end, with a walking bob
          people.forEach((pr) => {
            const u = (t * 0.16 * pr.sp + pr.ph) % 2;
            const fwd = u < 1;
            const k = fwd ? u : 2 - u;
            pr.grp.position.set(lerp(pr.x0, pr.x1, k), Math.abs(Math.sin(t * 3.1 * pr.sp)) * 0.035, pr.z);
            pr.grp.rotation.y = fwd ? Math.PI / 2 : -Math.PI / 2;
          });

          const solid = reduce ? 1 : easeInOut(clamp01((t - 0.2) / SETTLE));
          mats.forEach((m) => { (m as THREE.Material & { opacity: number }).opacity = solid; });
          // each beam brightens only while its own detection is live
          heads.forEach((h, i) => {
            const lit = ((t * 0.34 + i * 0.7) % 1) < 0.72;
            h.beamMat.opacity = (lit ? 0.17 : 0.05) * solid;
          });
          shadowMat.opacity = solid * 0.3;

          /* ONE loop, because aim and detection are the same fact. The head
             yaws onto its target, the beam is pitched and stretched to reach
             it, and the bracket lands on that same object — so a detection
             always sits at the end of a beam that is pointing at it.

             updateMatrixWorld is load-bearing: getWorldPosition reads the
             matrix, and the walkers, truck and forklift have all been moved
             earlier this frame. */
          g.updateMatrixWorld(true);
          heads.forEach((h, i) => {
            const phase = t * 0.34 + i * 0.7;
            const slot = Math.floor(phase % pools[i].length);
            const on = (phase % 1) < 0.72;
            const target = pools[i][slot];

            target.getWorldPosition(_tp);
            h.yawGrp.getWorldPosition(_hp);
            const dx = _tp.x - _hp.x, dz = _tp.z - _hp.z;
            const flat = Math.hypot(dx, dz);
            const drop = _hp.y - _tp.y;
            // optical axis is local +X, so this is the yaw that puts it on target
            h.yawGrp.rotation.y = Math.atan2(-dz, dx);
            // and this is the pitch, in the vertical plane the yaw just chose
            h.beam.rotation.z = -Math.atan2(drop, flat);
            const len = Math.hypot(flat, drop);
            h.beam.scale.set(len, len * 0.14, len * 0.14);

            trackers[i].follow(on ? target : null, camera);
            trackers[i].setFill?.(0.4 + 0.6 * ((phase % 1) / 0.72));
          });

          /* Viewport camera: a slow lateral TRACK across the site. A site this
             wide cannot be orbited — you drive past it. Locked height, per the
             house rule. */
          /* The site is ~30 units wide. At a 30-degree vertical fov on a 16:9
             frame that needs roughly 30 units of standoff to fit — parked any
             closer the camera is INSIDE the site and reads as a single-subject
             shot rather than an overview of an operation. Height is locked, as
             everywhere else; only the aim slides. */
          const drift = 0.5 - 0.5 * Math.cos(p * Math.PI * 2);
          // drift between the two poles that bracket the gate lane
          const cx = lerp(1.2, 3.6, drift);
          target.set(cx, 0.6, -1.0);
          /* Frame from the SITE'S OWN WIDTH, not from a hand-tuned distance.
             The slot this lands in is ~513x201 on the real card and 16:9 in the
             lab, and a fixed standoff cannot serve both — at the card's short,
             wide aspect a distance tuned for 16:9 leaves the site tiny. Solving
             for "the site fills 90% of the horizontal field" makes the scene
             fill whatever box it is given. */
          const aspect = (renderer.domElement.clientWidth || 1) / (renderer.domElement.clientHeight || 1);
          /* ONE BAY, not the whole site. Poles sit at x = -9.6, -1.6, 6.2 and
             13.2; framing the ~8-unit span between two of them puts a camera at
             each edge of frame with the work happening between, which is what
             actually reads at card size. The whole site at 30 units wide made
             every subject too small to identify. */
          const SITE_W = 11.5;
          const halfFov = (30 * Math.PI) / 180 / 2; // camera fov is 30deg vertical
          const rad = (SITE_W / (2 * 0.9)) / (Math.tan(halfFov) * Math.max(aspect, 0.4));
          placeCamera(camera, { az: lerp(0.22, 0.36, drift), rad, tx: cx, ty: 0.5, tz: -1.0 }, rad * 0.30);
          camera.lookAt(target);
        };

        /* 24fps — this card is never hovered, so it takes the resting rate
           from the same spec the hero cards run to. 1/25, see card-scene.tsx. */
        const MIN_DT = 1 / 25;
        /* Same arrival hygiene as the flagships (PERFORMANCE.md #35/#36/#39):
           programs compile at idle, one warm frame draws off screen, and the
           clock keeps its existing start-on-arrival behaviour — this scene
           always had that right. No runtime `transparent` flips here. */
        let compiled = false;
        const markCompiled = () => { compiled = true; };
        renderer.compileAsync(scene, camera).then(markCompiled, markCompiled);
        const compileGuard = window.setTimeout(markCompiled, 2000);
        let primed = false;
        let drawN = 0;
        let last = -1;
        const loop = () => {
          raf = requestAnimationFrame(loop);
          if (!compiled) return;
          if (!onScreen) {
            // one warm draw off screen; the clock deliberately stays unstarted
            if (!primed) { primed = true; frame(); studio.render(); }
            return;
          }
          primed = true;
          if (!clockStarted) { clock.start(); clockStarted = true; }
          const now = clock.getElapsedTime();
          if (now - last < MIN_DT) return;
          last = now;
          const _td = drawN < 3 ? performance.now() : 0;
          frame();
          studio.render();
          if (drawN < 3) {
            if (location.search.includes("perf")) {
              const w = window as unknown as { __visionDraw?: string[] };
              (w.__visionDraw ||= []).push(
                `lead#${drawN} draw ${(performance.now() - _td).toFixed(0)} ` +
                `progs ${renderer.info.programs?.length ?? -1}`);
            }
            drawN++;
          }
        };
        raf = requestAnimationFrame(loop);

        return () => {
          cancelAnimationFrame(raf);
          window.clearTimeout(compileGuard);
          ro.disconnect();
          io.disconnect();
          metals.forEach((m) => m.dispose());
          mats.forEach((m) => m.dispose());
          studio.dispose();
        };
      } catch (err) {
        console.error("[lead-card] init failed:", err);
        el.style.background = CARD_SURFACE;
        return () => {};
      }
    }, "lead");
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", borderRadius: 6, background: CARD_SURFACE }}>
      <div ref={wrapRef} style={{ position: "absolute", inset: 0 }} />
    </div>
  );
}
