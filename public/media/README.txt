public/media — Statement section background footage
===================================================

The home page Statement band (app/page.tsx -> Statement(), via
components/statement-video.tsx) renders a background-video slot. The slot is
already wired: dropping the files below into this directory ships the footage
with ZERO code changes.

EXPECTED FILES
--------------

statement-loop.webm   Primary source. VP9. 10-20s seamless loop, 1920x1080,
                      NO audio track at all (not just muted). Target < 5 MB.

statement-loop.mp4    Fallback source, for Safari and anything without VP9.
                      H.264 (High profile, yuv420p) + no audio track.
                      Same cut, same 1920x1080, same 10-20s. Target < 5 MB.

statement-poster.jpg  A real frame from the footage, 1920x1080, ~200 KB.
                      Shown before the video is fetched, while it buffers, and
                      permanently for reduced-motion visitors — so pick a frame
                      that stands on its own.

CURRENT PLACEHOLDER
-------------------

statement-poster.svg is a placeholder: a flat field with a faint mono
"FOOTAGE PENDING" label. It exists so the slot has something valid to paint
today and so the failure path can be seen working.

It is #ECEDEF, NOT the dark field a real frame will be. The Statement band is
the page's LIGHT band (#ECEDEF ground, #13151A type), so a dark placeholder
showing through the scrim would visibly re-tone the section before any footage
exists. When the real (dark) frame and loop land, re-check the scrim: SCRIMS.light
in statement-video.tsx is tuned to keep #13151A type legible over footage, and
SCRIMS.dark is there if the band is ever re-keyed to the dark palette.

To swap it for the real frame, change the single POSTER constant at the top of
components/statement-video.tsx:

    const POSTER = "/media/statement-poster.svg";
    ->
    const POSTER = "/media/statement-poster.jpg";

...then delete statement-poster.svg. Both the <video poster> attribute and the
CSS background fallback read that one constant, so they cannot drift apart.

BEHAVIOUR YOU CAN RELY ON
-------------------------

· The video element is not created until the band is within 200px of the
  viewport, so these bytes never compete with the homepage's WebGL scenes.
· Missing files are a no-op: the poster background is painted underneath at all
  times, so a 404 produces no layout shift and no broken-media artefact.
· prefers-reduced-motion never mounts the video at all.
· A scrim stack sits between the footage and the type. If the footage reads too
  hot or too flat once it lands, tune SCRIMS in statement-video.tsx — do not
  re-grade the type colours, they are shared with the rest of the page.
