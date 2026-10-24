/* The WebP encoding step of add-album, in its own module so the "never fits"
 * branch can be tested with a tiny byte limit. */
import sharp from 'sharp';
import { rmSync, statSync } from 'node:fs';
import { MAX_BYTES, QUALITY } from './photo-rules.mjs';

/** Saves `file` as a WebP of at most `maxSide` px at `out`, lowering the
 * quality (down to 50), then the long side (down to half), until it fits
 * `maxBytes`; returns the quality and side used. Returns null, leaving no file
 * at `out`, when even that is too big. */
export async function savePhoto(file, out, maxSide, maxBytes = MAX_BYTES) {
  for (let side = maxSide; side >= maxSide / 2; side = Math.round(side * 0.85))
    for (let quality = QUALITY; quality >= 50; quality -= 10) {
      await sharp(file)
        .rotate()
        .resize(side, side, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality, effort: 6 })
        .toFile(out);
      if (statSync(out).size <= maxBytes) return { quality, side };
    }
  rmSync(out);
  return null;
}
