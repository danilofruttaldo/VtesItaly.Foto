import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { buildPhotos } from '../scripts/build-photos.mjs';

/** A tiny solid WebP, with no metadata, as add-album would save it. */
async function webp(file: string, width: number, height: number) {
  await sharp({ create: { width, height, channels: 3, background: { r: 120, g: 20, b: 20 } } })
    .webp()
    .toFile(file);
}

// libvips keeps recently read files open, which on Windows blocks deleting them.
sharp.cache(false);

let root: string;

function album(slug: string, meta: object) {
  const dir = join(root, 'albums', slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'album.json'), JSON.stringify(meta));
  return dir;
}

const out = (...path: string[]) => join(root, 'public', 'p', ...path);
const manifest = () => JSON.parse(readFileSync(join(root, 'src', 'data', 'manifest.json'), 'utf8'));

beforeEach(async () => {
  root = mkdtempSync(join(tmpdir(), 'foto-build-'));
  const dir = album('torneo-2026', { title: 'Torneo 2026', date: '2026-05-02', city: 'bologna', type: 'torneo' });
  await webp(join(dir, 'torneo-2026-01.webp'), 48, 32);
  await webp(join(dir, 'torneo-2026-02.webp'), 32, 48);
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('build-photos', () => {
  it('copies the photos, makes thumbs, picks the cover and writes the manifest', async () => {
    const { errors } = await buildPhotos(root);
    expect(errors).toEqual([]);
    for (const f of ['torneo-2026-01.webp', 'torneo-2026-01-thumb.webp', 'torneo-2026-01-thumb-320.webp'])
      expect(existsSync(out('torneo-2026', f))).toBe(true);
    const [a] = manifest().albums;
    expect(a).toMatchObject({ slug: 'torneo-2026', title: 'Torneo 2026', city: 'bologna', type: 'torneo' });
    expect(a.photos.map((p: { file: string }) => p.file)).toEqual(['torneo-2026-01.webp', 'torneo-2026-02.webp']);
    expect(a.photos[0]).toMatchObject({
      width: 48,
      height: 32,
      src: '/p/torneo-2026/torneo-2026-01.webp',
      thumbSmall: '/p/torneo-2026/torneo-2026-01-thumb-320.webp',
    });
    // No poster and no covers/bologna.webp here: the first photo's thumb.
    expect(a.cover).toMatchObject({ kind: 'photo', thumb: '/p/torneo-2026/torneo-2026-01-thumb.webp' });
  });

  it('deletes the copies of photos and albums no longer in albums/', async () => {
    await buildPhotos(root);
    writeFileSync(out('torneo-2026', 'torneo-2026-09.webp'), 'old');
    mkdirSync(out('gone'));
    writeFileSync(out('gone', 'gone-01.webp'), 'old');
    writeFileSync(out('stray.webp'), 'old');
    rmSync(join(root, 'albums', 'torneo-2026', 'torneo-2026-02.webp'));

    expect((await buildPhotos(root)).errors).toEqual([]);
    expect(existsSync(out('torneo-2026', 'torneo-2026-09.webp'))).toBe(false);
    expect(existsSync(out('torneo-2026', 'torneo-2026-02.webp'))).toBe(false);
    expect(existsSync(out('torneo-2026', 'torneo-2026-02-thumb.webp'))).toBe(false);
    expect(existsSync(out('torneo-2026', 'torneo-2026-02-thumb-320.webp'))).toBe(false);
    expect(existsSync(out('torneo-2026', 'torneo-2026-01.webp'))).toBe(true);
    expect(existsSync(out('gone'))).toBe(false);
    expect(existsSync(out('stray.webp'))).toBe(false);
    expect(manifest().albums[0].photos).toHaveLength(1);
  });

  it('regenerates a thumb when its photo changes, not when only its mtime does', async () => {
    await buildPhotos(root);
    const src = join(root, 'albums', 'torneo-2026', 'torneo-2026-01.webp');
    const thumb = out('torneo-2026', 'torneo-2026-01-thumb.webp');
    const small = out('torneo-2026', 'torneo-2026-01-thumb-320.webp');
    const before = readFileSync(thumb);
    // Made from the thumb: kept as long as the thumb is.
    writeFileSync(small, 'kept');
    // A fresh checkout (CI, with public/p/ from its cache) dates every source to now.
    const later = new Date(Date.now() + 60_000);
    utimesSync(src, later, later);
    expect((await buildPhotos(root)).errors).toEqual([]);
    expect(readFileSync(small, 'utf8')).toBe('kept');

    await webp(src, 40, 30);
    expect((await buildPhotos(root)).errors).toEqual([]);
    expect(readFileSync(thumb).equals(before)).toBe(false);
    expect(readFileSync(small, 'utf8')).not.toBe('kept');
  });

  it('cuts a poster or header cover to a square no larger than its short side', async () => {
    const dir = album('gp-2026', { title: 'GP 2026', date: '2026-03-01', city: 'bologna', type: 'gp' });
    await webp(join(dir, 'gp-2026-01.webp'), 48, 32);
    await webp(join(dir, 'cover.webp'), 160, 35);
    expect((await buildPhotos(root)).errors).toEqual([]);
    const gp = manifest().albums.find((a: { slug: string }) => a.slug === 'gp-2026');
    expect(gp.cover).toMatchObject({ kind: 'poster', width: 35, height: 35, srcWidth: 160, srcHeight: 35 });
    const thumb = await sharp(out('gp-2026', 'cover-thumb.webp')).metadata();
    expect([thumb.width, thumb.height]).toEqual([35, 35]);
  });

  it('skips the files the OS leaves in a folder', async () => {
    const dir = join(root, 'albums', 'torneo-2026');
    writeFileSync(join(dir, 'desktop.ini'), '[.ShellClassInfo]');
    writeFileSync(join(dir, 'Thumbs.db'), 'x');
    writeFileSync(join(dir, '.DS_Store'), 'x');
    writeFileSync(join(root, 'albums', 'desktop.ini'), 'x');
    expect((await buildPhotos(root)).errors).toEqual([]);
    expect(manifest().albums[0].photos).toHaveLength(2);
  });

  it('names the album.json that is not valid JSON', async () => {
    const dir = join(root, 'albums', 'rotto');
    mkdirSync(dir);
    writeFileSync(join(dir, 'album.json'), '{ "title": "Rotto", }');
    const { errors } = await buildPhotos(root);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/rotto[\\/]album\.json: JSON non valido/);
  });

  it('writes nothing when an album breaks the rules', async () => {
    album('rotto', { title: 'Rotto', date: '2026-13-45', city: 'bologna', type: 'torneo' });
    const { errors } = await buildPhotos(root);
    expect(errors.join('\n')).toMatch(/date/);
    expect(errors.join('\n')).toMatch(/nessuna foto/);
    expect(existsSync(join(root, 'src', 'data', 'manifest.json'))).toBe(false);
  });
});
