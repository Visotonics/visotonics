"use client";

/* ---------------------------------------------------------------------------
   Home hero cards — the four scenes, rigged.

   Camera rigs follow Container Vision's operating principles exactly:
     · ONE locked camera height and ONE locked aim height per scene. Nothing
       cranes, tilts or bobs.
     · `rad` is GROUND distance, so closing in never slides the camera down a
       cone the way an elevation angle would.
     · the move is a pan — azimuth sweeps, height does not move.

   What differs per card is only the angle, and that is chosen from what the
   card has to show, not from taste:
     · Yard needs DEPTH — you cannot claim to have located one box among
       identical ones unless the frame shows the rows behind it. Raking angle,
       high enough to see over the front bank.
     · Warehouse needs the STACK FACE — counting reads only if the cartons are
       separable, so the camera stays near square to the pallet and low enough
       that the rows do not merge.
     · Factory is shot as an ELEVATION, matching its own schematic: low and
       near side-on, so the one overhead camera, its mast, and the units queued
       either side of the detection zone are all readable in one frame.
     · Data is shot near FRONT-ON, because a feed wall only reads as a wall
       from in front of it — raked away, the single lit tile stops being one
       thing among many and just becomes a bright edge.
--------------------------------------------------------------------------- */
import CardScene from "./card-scene";
import { dataSubject, factorySubject, warehouseSubject, yardSubject } from "./subjects";

export function YardCard() {
  return (
    <CardScene
      build={yardSubject}
      /* NEARLY LOCKED OFF. The old rig swung 0.34rad because the subject was
         sixteen static boxes and the camera had to supply all the life. The
         scene now has a gantry trolley crossing the whole frame and a load
         travelling vertically, so a camera moving as well fights it — the
         0.14rad left here is only enough to part the gantry legs from the
         stacks behind them, which is what keeps the frame from flattening.

         Framing is worked back from the geometry. The subject spans y=-0.95
         (hardstand) to y=3.27 (beam top), so its centre is y=1.16 — and the
         aim height has to BE that, or the frame fills with empty floor. At
         camY 2.4 aiming at y=1.15 from 10.6 ground units the camera looks
         down only 6.7deg, so the 30deg vertical fov covers y=-1.84..3.96:
         0.9 of margin below the containers and 0.7 above the beam.

         The card is 1.66 wide, not the 1.41 first assumed, so half-width is
         4.82 — the legs at +-3.7 and the beam at +-3.95 fill 82% of it,
         which is the fill this shot wants. A shallow down-angle is also the
         right one for the subject: the SVG this comes from is an ELEVATION,
         and 6.7deg is an elevation with just enough tilt to show the
         hardstand the bay markings are painted on. */
      rig={{ camY: 2.4, ty: 1.15, rad: [10.6, 10.2], az: [0.30, 0.44], motion: "orbit", id: "yard" }}
    />
  );
}

export function WarehouseCard() {
  return (
    <CardScene
      build={warehouseSubject}
      /* DOLLY: the count is a task completing, so the camera closes in on it —
         and dolly is the only motion here that changes distance, which is what
         keeps this card distinct from the other three now that `motion` is
         actually wired up.

         Framing worked back from the rack, which spans y=-0.95 (floor) to
         y=2.50 (top rail), centre y=0.775 — so the aim height is 0.85, not the
         old 0.10 that pointed at the floor. At camY 2.0 from 10.4 ground units
         the camera looks down only 6.3deg and the 30deg fov covers
         y=-1.98..3.49 and x=+-4.54, against a rack half-width of 3.9.

         The subject is now an aisle with a truck driving through it, so the
         dolly is kept SHORT (10.6 -> 10.1). Same lesson as Yard: once the
         subject supplies the motion, the camera moving as well fights it. The
         push is only enough to lean in as the count runs.

         Framing: the truck's overhead guard tops out at y=1.51 and the camera
         boom at y=2.82, floor at -0.95. At camY 1.9 aiming at y=0.8 from 10.6
         ground units the 30deg fov covers y=-2.18..3.60 and x=+-4.80, which
         holds the truck, the racking behind it and the camera in one frame.

         Azimuth 0.26 and fixed. Enough to see down the aisle and give the
         racking depth, shallow enough that the forklift stays side-on — a
         forklift read from the front is an unrecognisable box, and its
         silhouette is the entire reason it is in the scene.

         Zoomed in 2026-07-27 (rad reduced) — these cards carry less geometry
         than Yard and read too small at matched distance; the fov arithmetic
         above predates the zoom.
         loop 9.5s per direction — the count read as sluggish at 14.
         8.2s from 2026-07-27: the approach and departure beats in
         warehouseSubject were shortened, and the period comes down with them so
         the count keeps its ~0.57s-per-carton cadence. Changing this number
         without re-deriving that step will slow or race the tally. */
      rig={{ camY: 1.9, ty: 0.8, rad: [9.4, 8.9], az: [0.26, 0.26], motion: "dolly", loop: 8.2, id: "warehouse" }}
    />
  );
}

export function FactoryCard() {
  return (
    <CardScene
      build={factorySubject}
      /* TRACK — and it is a real track now that `motion` is wired up; this
         card was previously running the same orbit as the other three.

         A line is travelled BESIDE, never circled: the camera and its aim
         point slide together in x, so azimuth and distance never change and
         the elevation stays an elevation. trackX is cut from 2.6 to 1.3
         because the belt itself now moves at a real rate (p * SPAN, not
         p * PITCH — see subjects.ts); with both moving hard the frame just
         churns. 1.3 is enough to part the robot arm from the camera mast and
         let the station cross the frame, which is the parallax this shot
         wants.

         Held low (camY 1.55) and near side-on, matching the schematic's own
         elevation, so the mast, the sight cone, the units queued either side
         of the zone and the arm are all readable in one frame.

         Zoomed in 2026-07-27 (rad reduced) — these cards carry less geometry
         than Yard and read too small at matched distance; the fov arithmetic
         above predates the zoom. */
      rig={{ camY: 1.55, ty: 0.42, rad: [9.2, 9.2], az: [0.44, 0.44], motion: "track", trackX: 1.15, id: "factory" }}
    />
  );
}

export function DataCard() {
  return (
    <CardScene
      build={dataSubject}
      /* NEAR FRONT-ON, which is what this card's rationale said all along.

       The header of this file has always described Data as a FEED WALL: "a
       feed wall only reads as a wall from in front of it — raked away, the
       single lit tile stops being one thing among many and just becomes a
       bright edge." The scene had drifted into a deck of frames filed along Z
       and the camera had been raked to 0.52-0.64 to make that recession read,
       which is exactly the failure the original note predicted. Rebuilt
       2026-08-19 as the wall it was specified to be, and the camera comes back
       with it.

       Card aspect is 347/260 = 1.335, so at a 30deg vertical fov the visible
       width is 2*tan(15deg)*1.335 = 0.715 x distance.

       THE SUBJECT IS NOT JUST THE WALL. Monitors carry bezels (outer body
       1.25 x 0.82, pitch 1.31) so the wall spans 6.49, and the camera sits off
       its left end at x=-3.5 with its own housing and mount, taking the
       content to roughly 7.6 wide. At rad 10.6 the visible width was 7.58 —
       dead equal to the content, which is exactly why the end monitors clipped
       at both edges and the camera was half out of frame.

       rad 12.2 gives 8.72 visible, so 7.6 of content fills 87% with real
       margin at both ends. The camera is the thing that must not clip: it is
       the source the whole trace originates from, and a source cut in half by
       the frame edge reads as an accident rather than as the point.

       camY == ty == 0.62: the eye is LEVEL with the wall's centre. Any
       elevation here starts keystoning the screens and they stop reading as a
       grid of monitors.

       Raised 0.35 -> 0.62 when the console went in underneath. The wall had to
       lift clear of the floor to make room for it, and the eye lifts with the
       wall or the level shot is lost. At rad 10.6 the visible height is
       0.536 x 10.6 = 5.68, so the frame covers y = -2.22..3.46: the 2.58-tall
       wall and the console below it both sit inside with margin.

       az 0.10-0.20 is the whole azimuth budget. Enough that the wall has a
       face and an edge and is not a flat texture; far short of the rake that
       collapses the tiles. loop 9 carries a four-hop trace at a readable
       cadence — see the beat table in subjects.ts. */
      rig={{ camY: 0.62, ty: 0.62, rad: [12.2, 11.8], az: [0.10, 0.20], motion: "drift", loop: 9, id: "data" }}
    />
  );
}

export const HERO_CARD_SCENES = {
  yard: YardCard,
  warehouse: WarehouseCard,
  factory: FactoryCard,
  data: DataCard,
} as const;
