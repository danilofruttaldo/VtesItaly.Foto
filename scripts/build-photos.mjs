/* Turns albums/ into what the pages need (runs as `prebuild`, and before `dev`).
 *
 * For every albums/<slug>/ with an album.json:
 * - checks each photo and cover against photo-rules (WebP, long side, weight,
 *   no EXIF/XMP/IPTC: the GPS position lives there) and stops the build on one
 *   that breaks them: `npm run add-album` prepares photos the right way;
 * - copies the photo to public/p/<slug>/ untouched (it is already the display
 *   size) and writes a THUMB_SIZE square thumbnail next to it, cut around the
 *   photo's point of interest (the grid shows squares);
 * - picks the album cover: the event poster or logo (albums/<slug>/cover.webp),
 *   else the principato header (covers/<city>.webp), else a photo (album.json
 *   `cover`, or the first). Covers get a square thumb cut like vtesitaly.com's
 *   cards: portraits from the top, where the title is, others around their
 *   point of interest;
 * - writes src/data/manifest.json: albums newest first, each with its photos
 *   and their sizes, read by the pages and by /albums.json.
 *
 * public/p/ and the manifest are generated, git-ignored. Re-runs only
 * regenerate a thumb older than its photo, and delete the files of photos
 * and albums no longer in albums/.
 */
import sharp from 'sharp';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { PHOTO_EXT, THUMB_SIZE, albumErrors, captionErrors, imageErrors, orderBySections } from './photo-rules.mjs';
import { ALBUM_TYPES } from '../src/utils/album-types.ts';
import { PRINCIPATI } from '../src/utils/principati.ts';

const ROOT = 'albums';
const OUT = 'public/p';
const MANIFEST = 'src/data/manifest.json';
const COVER_FILE = 'cover.webp';
const CITY_COVERS = 'covers';
const COVER_SIZE = 720;

/** Accepted album.json `city`: a principato, or a town with its own header. */
const cities = new Set([
  ...PRINCIPATI,
  ...(existsSync(CITY_COVERS) ? readdirSync(CITY_COVERS) : [])
    .filter((f) => f.endsWith('.webp'))
    .map((f) => f.replace(/\.webp$/, '')),
]);

const errors = [];
const albums = [];
/** Every file written under OUT by this run: the rest is stale. */
const outputs = new Set();

function fresh(out, src) {
  return existsSync(out) && statSync(out).mtimeMs >= statSync(src).mtimeMs;
}

/** Reads a source image's metadata and records what breaks photo-rules; `ok` is
 * false when it must not be published. */
async function inspect(src) {
  const meta = await sharp(src).metadata();
  const problems = imageErrors(src, meta, statSync(src).size);
  errors.push(...problems);
  return { ...meta, ok: problems.length === 0 };
}

/** Copies a cover next to the album photos with a square thumb; returns the cover entry. */
async function cover(src, dir, name, kind) {
  const display = join(OUT, dir, `${name}.webp`);
  const thumb = join(OUT, dir, `${name}-thumb.webp`);
  outputs.add(display).add(thumb);
  mkdirSync(join(OUT, dir), { recursive: true });
  const { width, height } = await inspect(src);
  if (!fresh(display, src)) copyFileSync(src, display);
  if (!fresh(thumb, src)) {
    const position = height > width ? 'top' : sharp.strategy.attention;
    await sharp(src)
      .resize(COVER_SIZE, COVER_SIZE, { fit: 'cover', position })
      .webp({ quality: 80, effort: 6 })
      .toFile(thumb);
  }
  return {
    src: `/p/${dir}/${name}.webp`,
    thumb: `/p/${dir}/${name}-thumb.webp`,
    width: COVER_SIZE,
    height: COVER_SIZE,
    kind,
  };
}

for (const slug of existsSync(ROOT) ? readdirSync(ROOT).sort() : []) {
  const dir = join(ROOT, slug);
  if (!statSync(dir).isDirectory()) continue;
  const metaFile = join(dir, 'album.json');
  if (!existsSync(metaFile)) {
    errors.push(`${dir}: manca album.json`);
    continue;
  }
  const meta = JSON.parse(readFileSync(metaFile, 'utf8'));
  const files = readdirSync(dir)
    .filter((f) => f !== 'album.json' && f !== COVER_FILE)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  errors.push(...albumErrors(meta, metaFile, ALBUM_TYPES, cities));
  errors.push(...captionErrors(meta.captions, files, metaFile));
  const photos = [];
  mkdirSync(join(OUT, slug), { recursive: true });
  for (const f of files) {
    const src = join(dir, f);
    if (!PHOTO_EXT.test(f)) {
      errors.push(`${src}: solo foto WebP (usa npm run add-album)`);
      continue;
    }
    const { width, height, ok } = await inspect(src);
    if (!ok) continue;
    const base = f.replace(PHOTO_EXT, '');
    const display = join(OUT, slug, f);
    const thumb = join(OUT, slug, `${base}-thumb.webp`);
    outputs.add(display).add(thumb);
    if (!fresh(display, src)) copyFileSync(src, display);
    if (!fresh(thumb, src))
      await sharp(src)
        .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'cover', position: sharp.strategy.attention })
        .webp({ quality: 80, effort: 6 })
        .toFile(thumb);
    photos.push({
      file: f,
      src: `/p/${slug}/${f}`,
      thumb: `/p/${slug}/${base}-thumb.webp`,
      width,
      height,
      ...(meta.captions?.[f] ? { caption: meta.captions[f] } : {}),
    });
  }
  if (photos.length === 0) errors.push(`${dir}: nessuna foto`);
  if (meta.cover && !photos.some((p) => p.file === meta.cover))
    errors.push(`${metaFile}: cover ${meta.cover} non trovata`);
  const sectioned = orderBySections(photos, meta.sections, metaFile);
  errors.push(...sectioned.errors);
  photos.splice(0, photos.length, ...sectioned.photos);
  const poster = join(dir, COVER_FILE);
  const cityCover = join(CITY_COVERS, `${meta.city}.webp`);
  const chosen = photos.find((p) => p.file === meta.cover) ?? photos[0];
  const albumCover = existsSync(poster)
    ? await cover(poster, slug, 'cover', 'poster')
    : !meta.cover && existsSync(cityCover)
      ? await cover(cityCover, '_covers', meta.city, 'city')
      : // The card shows the photo's square thumb: its size is the thumb's.
        chosen && { src: chosen.src, thumb: chosen.thumb, width: THUMB_SIZE, height: THUMB_SIZE, kind: 'photo' };
  albums.push({
    slug,
    title: meta.title,
    date: meta.date,
    city: meta.city,
    type: meta.type,
    ...(meta.event ? { event: meta.event } : {}),
    ...(meta.description ? { description: meta.description } : {}),
    cover: albumCover,
    photos,
  });
}

if (errors.length) {
  console.error('Album non validi:\n- ' + errors.join('\n- '));
  process.exit(1);
}

// Photos, covers or whole albums taken out of albums/ leave their copies behind.
for (const dir of existsSync(OUT) ? readdirSync(OUT) : []) {
  const path = join(OUT, dir);
  if (!statSync(path).isDirectory()) {
    rmSync(path); // nothing is written loose in OUT (a desktop.ini, a stray copy)
    continue;
  }
  for (const f of readdirSync(path)) if (!outputs.has(join(path, f))) rmSync(join(path, f));
  if (readdirSync(path).length === 0) rmSync(path, { recursive: true });
}

albums.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
mkdirSync('src/data', { recursive: true });
writeFileSync(MANIFEST, JSON.stringify({ albums }, null, 2) + '\n');
const count = albums.reduce((n, a) => n + a.photos.length, 0);
console.log(`photos: ${albums.length} album, ${count} foto`);
