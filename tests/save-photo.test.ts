import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { QUALITY } from '../scripts/photo-rules.mjs';
import { savePhoto } from '../scripts/save-photo.mjs';

// libvips keeps recently read files open, which on Windows blocks deleting them.
sharp.cache(false);

let dir: string;
let src: string;

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'foto-save-'));
  src = join(dir, 'src.png');
  // Random noise compresses badly: its size depends on the side and quality.
  const width = 200;
  const pixels = Buffer.from(Array.from({ length: width * width * 3 }, () => Math.floor(Math.random() * 256)));
  await sharp(pixels, { raw: { width, height: width, channels: 3 } })
    .png()
    .toFile(src);
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('savePhoto', () => {
  it('keeps the first quality and side when the photo already fits', async () => {
    const out = join(dir, 'a.webp');
    expect(await savePhoto(src, out, 200, 10_000_000)).toEqual({ quality: QUALITY, side: 200 });
    expect(existsSync(out)).toBe(true);
  });

  it('lowers the quality, then the side, until the photo fits', async () => {
    const out = join(dir, 'b.webp');
    const roomy = await savePhoto(src, out, 200, 10_000_000);
    const full = statSync(out).size;
    const saved = await savePhoto(src, out, 200, Math.floor(full * 0.6));
    expect(saved).not.toBeNull();
    expect(saved!.quality < roomy!.quality || saved!.side < 200).toBe(true);
    expect(statSync(out).size).toBeLessThanOrEqual(Math.floor(full * 0.6));
  });

  it('gives up and leaves no file when even quality 50 at half the side is too big', async () => {
    const out = join(dir, 'c.webp');
    expect(await savePhoto(src, out, 200, 100)).toBeNull();
    expect(existsSync(out)).toBe(false);
  });
});
