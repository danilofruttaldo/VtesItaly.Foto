/* Turns albums/ into what the pages need (runs as `prebuild`, and before `dev`).
 *
 * For every albums/<slug>/ with an album.json:
 * - checks each photo against photo-rules (WebP, long side, weight) and stops
 *   the build on one that breaks them: `npm run add-album` prepares photos
 *   the right way;
 * - copies the photo to public/p/<slug>/ untouched (it is already the display
 *   size) and writes a THUMB_WIDTH-wide thumbnail next to it;
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

const ROOT = 'albums';
const OUT = 'public/p';
const MANIFEST = 'src/data/manifest.json';

const errors = [];
const albums = [];

function fresh(out, src) {
  return existsSync(out) && statSync(out).mtimeMs >= statSync(src).mtimeMs;
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
  if (!meta.city || /TODO/.test(meta.city)) errors.push(`${metaFile}: city mancante`);

  const files = readdirSync(dir)
    .filter((f) => f !== 'album.json')
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
  albums.push({
    slug,
    title: meta.title,
    date: meta.date,
    city: meta.city,
    ...(meta.event ? { event: meta.event } : {}),
    ...(meta.description ? { description: meta.description } : {}),
    cover: meta.cover ?? photos[0]?.file,
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
