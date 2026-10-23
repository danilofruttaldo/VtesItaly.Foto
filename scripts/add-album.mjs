/* Imports the photos of an event into albums/<slug>/, ready to commit.
 *
 * Usage: npm run add-album -- <source folder> <slug> [--title "..."] [--date YYYY-MM-DD]
 *                            [--city <principato>] [--type <tipo>] [--event <vtesitaly.com URL>] [--cover <locandina>]
 *
 * Every photo (jpg, jpeg, png, webp, heic is not supported: export it first)
 * is rotated upright from its EXIF, resized to at most MAX_SIDE px on the long
 * side and saved as WebP. EXIF, GPS included, is dropped: phones put the
 * player's home position in it. Files are numbered `<slug>-01.webp`, … in the
 * order of their source names, after the highest number the album already
 * has, so the script can be run again to add more; it never overwrites.
 *
 * --cover <file> saves the event poster or logo as the album cover
 * (cover.webp, at most 1200 px); without it the card shows the principato
 * header from covers/.
 *
 * album.json is created when missing, with the fields given on the command
 * line; the ones left out are written as TODO for a hand edit.
 */
import sharp from 'sharp';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { MAX_SIDE, QUALITY, nextPhotoNumber } from './photo-rules.mjs';

const [src, slug, ...rest] = process.argv.slice(2);
if (!src || !slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
  console.error(
    'Uso: npm run add-album -- <cartella sorgente> <slug-in-minuscolo> [--title …] [--date …] [--city …] [--type …] [--event …] [--cover …]',
  );
  process.exit(1);
}
const opts = {};
for (let i = 0; i < rest.length; i += 2) opts[rest[i].replace(/^--/, '')] = rest[i + 1];

const dest = join('albums', slug);
mkdirSync(dest, { recursive: true });
const first = nextPhotoNumber(readdirSync(dest), slug);
const sources = readdirSync(src)
  .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
if (sources.length === 0) {
  console.error(`Nessuna foto (jpg, png, webp) in ${src}`);
  process.exit(1);
}

let n = first - 1;
for (const f of sources) {
  n++;
  const out = join(dest, `${slug}-${String(n).padStart(2, '0')}.webp`);
  if (existsSync(out)) {
    console.error(`${out} esiste già: non sovrascrivo`);
    process.exit(1);
  }
  await sharp(join(src, f))
    .rotate()
    .resize(MAX_SIDE, MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 6 })
    .toFile(out);
  console.log(`${f} → ${out}${extname(f).toLowerCase() === '.webp' ? '' : ' (convertita)'}`);
}

if (opts.cover) {
  await sharp(opts.cover)
    .rotate()
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 6 })
    .toFile(join(dest, 'cover.webp'));
  console.log(`${opts.cover} → ${join(dest, 'cover.webp')} (copertina)`);
}

const meta = join(dest, 'album.json');
if (!existsSync(meta)) {
  const album = {
    title: opts.title ?? 'TODO titolo',
    date: opts.date ?? 'TODO-YYYY-MM-DD',
    city: opts.city ?? 'TODO principato (es. bologna)',
    type: opts.type ?? 'TODO gp | nazionale | tour | torneo | lega | evento',
    ...(opts.event ? { event: opts.event } : {}),
  };
  writeFileSync(meta, JSON.stringify(album, null, 2) + '\n');
  const todo = Object.values(album).some((v) => String(v).startsWith('TODO'));
  console.log(`Creato ${meta}${todo ? ': completa i campi TODO.' : '.'}`);
}
console.log(`${sources.length} foto aggiunte a ${dest} (fino a ${slug}-${String(n).padStart(2, '0')}).`);
