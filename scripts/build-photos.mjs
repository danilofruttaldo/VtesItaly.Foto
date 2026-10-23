/* Turns albums/ into what the pages need (runs as `prebuild`, and before `dev`).
 *
 * For every albums/<slug>/ with an album.json:
 * - checks each photo against photo-rules (WebP, long side, weight) and stops
 *   the build on one that breaks them: `npm run add-album` prepares photos
 *   the right way;
 * - copies the photo to public/p/<slug>/ untouched (it is already the display
 *   size) and writes a THUMB_WIDTH-wide thumbnail next to it;
 * - picks the album cover: the event poster or logo (albums/<slug>/cover.webp),
 *   else the principato header (covers/<city>.webp), else a photo (album.json
 *   `cover`, or the first). Covers get a square thumb cut like vtesitaly.com's
 *   cards: portraits from the top, where the title is, others around their
 *   point of interest;
 * - writes src/data/manifest.json: albums newest first, each with its photos
 *   and their sizes, read by the pages and by /albums.json.
 *
 * public/p/ and the manifest are generated, git-ignored. Re-runs only
 * regenerate a thumb older than its photo.
 */
import sharp from 'sharp';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MAX_BYTES, MAX_SIDE, PHOTO_EXT, THUMB_WIDTH } from './photo-rules.mjs';
import { ALBUM_TYPES } from '../src/utils/album-types.ts';

const ROOT = 'albums';
const OUT = 'public/p';
const MANIFEST = 'src/data/manifest.json';
const COVER_FILE = 'cover.webp';
const CITY_COVERS = 'covers';
const COVER_SIZE = 480;

const errors = [];
const albums = [];

function fresh(out, src) {
  return existsSync(out) && statSync(out).mtimeMs >= statSync(src).mtimeMs;
}

/** Copies a cover next to the album photos with a square thumb; returns the cover entry. */
async function cover(src, dir, name, kind) {
  const display = join(OUT, dir, `${name}.webp`);
  const thumb = join(OUT, dir, `${name}-thumb.webp`);
  mkdirSync(join(OUT, dir), { recursive: true });
  if (!fresh(display, src)) copyFileSync(src, display);
  if (!fresh(thumb, src)) {
    const { width, height } = await sharp(src).metadata();
    const position = height > width ? 'top' : sharp.strategy.attention;
    await sharp(src)
      .resize(COVER_SIZE, COVER_SIZE, { fit: 'cover', position })
      .webp({ quality: 78, effort: 6 })
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
  if (!meta.title || /TODO/.test(meta.title)) errors.push(`${metaFile}: title mancante`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date ?? '')) errors.push(`${metaFile}: date deve essere YYYY-MM-DD`);
  if (!meta.city || !/^[a-z]+(-[a-z]+)*$/.test(meta.city))
    errors.push(`${metaFile}: city deve essere lo slug del principato (es. bologna)`);
  if (!(meta.type in ALBUM_TYPES))
    errors.push(`${metaFile}: type deve essere uno di ${Object.keys(ALBUM_TYPES).join(', ')}`);

  const files = readdirSync(dir)
    .filter((f) => f !== 'album.json' && f !== COVER_FILE)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const photos = [];
  mkdirSync(join(OUT, slug), { recursive: true });
  for (const f of files) {
    const src = join(dir, f);
    if (!PHOTO_EXT.test(f)) {
      errors.push(`${src}: solo foto WebP (usa npm run add-album)`);
      continue;
    }
    const { width, height } = await sharp(src).metadata();
    const bytes = statSync(src).size;
    if (Math.max(width, height) > MAX_SIDE || bytes > MAX_BYTES) {
      errors.push(
        `${src}: ${width}x${height}, ${Math.round(bytes / 1024)} KB oltre i limiti ` +
          `(${MAX_SIDE}px, ${MAX_BYTES / 1024} KB): usa npm run add-album`,
      );
      continue;
    }
    const base = f.replace(PHOTO_EXT, '');
    const display = join(OUT, slug, f);
    const thumb = join(OUT, slug, `${base}-thumb.webp`);
    if (!fresh(display, src)) copyFileSync(src, display);
    if (!fresh(thumb, src)) await sharp(src).resize(THUMB_WIDTH).webp({ quality: 75, effort: 6 }).toFile(thumb);
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
  // Optional sections ([{ title, photos: [file, …] }]): photos follow the
  // sections' order and carry their title; any photo left out comes last.
  if (meta.sections) {
    const byFile = new Map(photos.map((p) => [p.file, p]));
    const ordered = [];
    for (const s of meta.sections) {
      for (const f of s.photos ?? []) {
        const p = byFile.get(f);
        if (!p) {
          errors.push(`${metaFile}: la sezione "${s.title}" cita ${f}, che non c'è o compare due volte`);
          continue;
        }
        byFile.delete(f);
        ordered.push({ ...p, section: s.title });
      }
    }
    photos.splice(0, photos.length, ...ordered, ...byFile.values());
  }
  const poster = join(dir, COVER_FILE);
  const cityCover = join(CITY_COVERS, `${meta.city}.webp`);
  const chosen = photos.find((p) => p.file === meta.cover) ?? photos[0];
  const albumCover = existsSync(poster)
    ? await cover(poster, slug, 'cover', 'poster')
    : !meta.cover && existsSync(cityCover)
      ? await cover(cityCover, '_covers', meta.city, 'city')
      : chosen && { src: chosen.src, thumb: chosen.thumb, width: chosen.width, height: chosen.height, kind: 'photo' };
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

albums.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
mkdirSync('src/data', { recursive: true });
writeFileSync(MANIFEST, JSON.stringify({ albums }, null, 2) + '\n');
const count = albums.reduce((n, a) => n + a.photos.length, 0);
console.log(`photos: ${albums.length} album, ${count} foto`);
