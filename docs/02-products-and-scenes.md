# Products and scenes

What each product section claims, and — critically — whether it's a real working 3D demo, a static diagram standing in for one, or something still being tuned. For anyone judging whether a section looks/feels done, or planning to build the ones that aren't.

**The single most important fact in this file:** the site has **8 real, working 3D scenes** and **4 sections that look similar but are static SVG diagrams with no 3D scene built at all.** They sit side by side on the same pages, so it's easy to assume all 12+ are animated. They are not.

All 8 real scenes are hand-built, vanilla three.js (no template, no react-three-fiber) — genuine engineering work, not stock assets.

## Live 3D scenes — the real demos

| Scene | What it shows | Loop | Lives on | Review it at |
|---|---|---|---|---|
| Container Vision | A shipping container inspected for damage and markings | 10.0s | Viso Yard §1 | `/lab/container-vision` |
| Tank Vision | A tank inspected for shell corrosion, seal, valve condition | 7.4s | Viso Yard §2 | `/lab/tank-vision` |
| Gate Vision | A truck's plate and seal read at a gate, barrier responds | 4.6s | Viso Yard §3 | `/lab/gate-vision` |
| Yard Vision | Aerial survey of a full container yard, one slot located | 9.4s | Viso Yard §4 | `/lab/yard-vision` |
| Crane Vision | A gantry crane lifting a container; ID read, then corrosion and a dent found | 6.6s | Viso Yard §5 | `/lab/crane-vision` |
| Cargo Vision | Mixed cargo counted off a conveyor as it's destuffed; one crushed case found | 9.0s | Viso Yard §6 | `/lab/cargo-vision` |
| Document Vision | A bill of lading scanned once, its fields filling a table that was already on screen | 9.0s | Yard §7, **and** Warehouse, **and** Factory | `/lab/document-vision` |
| Work Vision | One worker seen by three cameras in three places, resolving to one identity | 13.5s | Warehouse §5, **and** Yard §8, **and** Factory §4 | `/lab/work-vision` |

**Work Vision is mid-rebuild and is the one scene not to show anyone right now.** It was restructured from a single aisle into three hard-cut acts; the act structure and labels are in, the environments are not — they read as undifferentiated blobs, two of the three acts are missing their camera and detection marks, and there is a stray object drawing in all three. Treat it as work in progress until this note is removed.

**Document Vision and Work Vision each appear on three product pages at once**, not one — they're shared code, not three separate builds. See `04-change-risk.md` before editing either.

Plus two homepage-only scenes: a **Lead Card** scene (four cameras watching a yard with live detections, in the "How It Works" section) and four small ambient **Hero cards** (one per product, in the hero band, 14s loop each — deliberately slow, not attention-grabbing).

## Sections with NO 3D scene — static diagrams standing in

These read like the scenes above on the page but are SVG diagrams, not three.js. No `/lab/*` route exists for any of them because there's no scene to review.

| Section | Claims to show | Lives on | Reality |
|---|---|---|---|
| Audit Vision | Compliance/audit trail tracking | Viso Warehouse | Static SVG diagram only |
| Dimension Vision | Automated dimensioning/measurement | Viso Warehouse | Static SVG diagram only |
| Secure Vision | Security threshold/event monitoring | Warehouse, Yard §9, Factory | Static SVG diagram (a threshold-and-event chart), shared across all three pages |
| Production Vision | Production-line monitoring | Viso Factory | Static SVG diagram only |

If leadership wants these to eventually look and feel like the other 8, that's new scene builds from scratch — not a tweak to something half-done.

## Parked / not shipped

**ASCII Hero** — an ASCII-halftone background effect, under active tuning as a possible future homepage hero treatment. Lives only at `/lab/ascii-hero`. Not on any live page. Treat anything about it as subject to change or being dropped.

## How a detection reads — the house standard

Every scene that claims the system SAW something now says so the same way, and
new scenes should follow it rather than invent their own vocabulary. The
pattern was settled on Crane Vision and completed on Cargo Vision:

1. **The camera is in shot.** A detection that arrives from nowhere is an
   assertion; one thrown from a lens you can see is evidence. Crane has two
   heads on the gantry legs, Cargo has a pole camera behind the belt at the
   count line, Work has one per act. The housing sits toward a corner of the
   frame, not centred — it is the instrument, not the subject.
2. **A sight cone connects the lens to the thing being read**, so the read has
   a visible source and direction.
3. **The cone follows the subject and hands off.** One cone re-aimed, never
   one per target: the machine attends to one thing, concludes, and moves on.
   Cargo's cone swings from case to case down the belt; Crane's left head
   holds the ID plate and then slews onto the dent.
4. **A bracket marks what was found**, tight to the feature and hairline —
   never a slab, never a filled shape.
5. **A label names it with a confidence**, in the same grammar everywhere:
   `Corrosion · 0.94`, `Dent · 0.84`, `VSTU 907032 1 · 0.99`.
6. **Blue while observing, orange on a conclusion.** The cone is
   `PALETTE.accent` for a routine read and turns SIGNAL orange for the one
   beat where the read becomes a finding. That flip is the strongest single
   moment in a loop and should be spent once.

Two hard-won rules that go with it, both in `09-scene-craft-and-learnings.md`
in full: the colour flip must be driven by **what the cone is actually looking
at**, not by a separate window that can drift out of sync with it; and marks
need an explicit `renderOrder` or subject geometry will paint over them.

## Reviewing a scene

Every scene has a standalone page at `/lab/<scene-name>` — not linked from the real site, not in Google, exists purely so a scene can be looked at without scrolling the full product page. Most scenes also support a freeze-frame: add `?phase=0.5` (0 to 1) to stop the loop at a specific point instead of trying to screenshot something moving — e.g. `/lab/gate-vision?phase=0.5`.
