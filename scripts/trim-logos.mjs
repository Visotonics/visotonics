import sharp from 'sharp';
import path from 'path';

const SRC = 'public/assets/logos-color';
const PAD = 6; // uniform padding after trim, matches mono set convention

async function keyNearWhiteToAlpha(inputPath, { crop } = {}) {
  let img = sharp(inputPath).ensureAlpha();
  if (crop) img = img.extract(crop);
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.from(data);
  for (let i = 0; i < width * height; i++) {
    const o = i * channels;
    const r = data[o], g = data[o + 1], b = data[o + 2];
    const minC = Math.min(r, g, b);
    // soft threshold: fully white/near-white (incl. baked checkerboard grays) -> transparent
    // ink pixels (saturated or dark) stay opaque
    const lo = 210, hi = 250;
    let a;
    if (minC >= hi) a = 0;
    else if (minC <= lo) a = 255;
    else a = Math.round(255 * (1 - (minC - lo) / (hi - lo)));
    out[o + 3] = Math.min(out[o + 3], a);
  }
  return sharp(out, { raw: { width, height, channels } }).png();
}

async function process(name, ext, mode, opts = {}) {
  const input = path.join(SRC, `${name}.${ext}`);
  let pipeline;
  if (mode === 'trim') {
    pipeline = sharp(input);
  } else if (mode === 'key') {
    pipeline = await keyNearWhiteToAlpha(input, opts);
  } else if (mode === 'hind') {
    // special: white letters on a solid orange/green block -> recolor letters
    // using their local background hue, drop the block to transparent.
    // Cropped to rows 0-87: rows 88-96 carry a faint ".....Moving India Ahead"
    // tagline that isn't present in the mono asset and isn't part of the
    // wordmark being matched here.
    const img = sharp(input).ensureAlpha().extract({ left: 0, top: 0, width: 378, height: 80 });
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info;
    const out = Buffer.alloc(width * height * 4);
    // sample the two flat background colors once (left/right quarter, top row)
    const leftIdx = (5 * width + 5) * channels;
    const rightIdx = (5 * width + (width - 6)) * channels;
    const leftColor = [data[leftIdx], data[leftIdx + 1], data[leftIdx + 2]];
    const rightColor = [data[rightIdx], data[rightIdx + 1], data[rightIdx + 2]];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const o = (y * width + x) * channels;
        const r = data[o], g = data[o + 1], b = data[o + 2];
        const oo = (y * width + x) * 4;
        const origAlpha = data[o + 3];
        // only treat as letter if solidly inside the rect (origAlpha near-opaque);
        // the rect's rounded-corner antialiasing is also white RGB but partial
        // alpha, and must drop out with the rest of the block, not bleed through.
        const isLetter = r > 220 && g > 220 && b > 220 && origAlpha > 250;
        if (isLetter) {
          const c = x < width / 2 ? leftColor : rightColor;
          out[oo] = c[0]; out[oo + 1] = c[1]; out[oo + 2] = c[2]; out[oo + 3] = 255;
        } else {
          out[oo] = 0; out[oo + 1] = 0; out[oo + 2] = 0; out[oo + 3] = 0;
        }
      }
    }
    pipeline = sharp(out, { raw: { width, height, channels: 4 } }).png();
  }

  const trimmed = await pipeline.trim({ threshold: 10 }).toBuffer({ resolveWithObject: true });
  const final = await sharp(trimmed.data)
    .extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const outPath = path.join(SRC, `${name}.png`);
  await sharp(final).toFile(outPath + '.tmp');
  const meta = await sharp(outPath + '.tmp').metadata();
  console.log(name, '->', meta.width, 'x', meta.height);
  return outPath;
}

await process('adani', 'png', 'trim');
await process('dp_world', 'png', 'trim');
await process('hind_terminals', 'png', 'hind');
await process('jnpa', 'jpg', 'key', { crop: { left: 60, top: 330, width: 355, height: 430 } });
await process('cochin_shipyard', 'svg', 'trim');
await process('iit_kharagpur', 'jpeg', 'key');
await process('iit_kanpur', 'png', 'key');
await process('iim_kozhikode', 'png', 'key');
await process('nasscom', 'svg', 'trim');
await process('meity_startup_hub', 'jpg', 'key');
await process('nvidia', 'png', 'key');
await process('startupindia', 'png', 'trim');

console.log('done - .tmp files written, review then rename');
