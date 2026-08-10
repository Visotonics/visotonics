/* ---------------------------------------------------------------------------
   Shared canvas grain pass.

   Extracted from two identical copies: _vision/metal.ts's roughness-canvas
   builder (fine speckle over the broad blotches/brush strokes) and
   hero-cards/skins.ts's skin painter (grain() at the end of every skin).
   Both did the same thing — getImageData, add one random per-channel offset
   to r/g/b (alpha untouched), putImageData — so it now lives in one place.
--------------------------------------------------------------------------- */
export function addGrain(ctx: CanvasRenderingContext2D, w: number, h: number, amt: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amt;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}
