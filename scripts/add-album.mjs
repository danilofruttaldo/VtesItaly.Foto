/* Imports the photos of an event into albums/<slug>/, ready to commit.
 *
 * Usage: npm run add-album -- <source folder> <slug> [--title "..."] [--date YYYY-MM-DD]
 *                            [--city <principato>] [--type <tipo>] [--event <vtesitaly.com URL>] [--cover <locandina>]
 *                            [--force]
 *
 * Every photo (jpg, jpeg, png, webp, heic is not supported: export it first)
 * is rotated upright from its EXIF, resized to at most MAX_SIDE px on the long
 * side and saved as WebP. EXIF, GPS included, is dropped: phones put the
 * player's home position in it. Files are numbered `<slug>-01.webp`, … in the
 * order of their source names, after the highest number the album already
 * has, so the script can be run again to add more; it never overwrites.
 * A photo still over MAX_BYTES after the resize is saved again at a lower
 * quality, down to 50, then at a shorter long side, so build-photos accepts
 * it; one that never fits stops the script.
 *
 * --cover <file> saves the event poster or logo as the album cover
 * (cover.webp, at most 1200 px); without it the card shows the principato
 * header from covers/. An existing cover is replaced only with --force.
 *
 * album.json is created when missing, with the fields given on the command
 * line; the ones left out are written as TODO for a hand edit. On an album
 * with `sections`, the new photos land after them: the script reminds to add
 * them to a section.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { MAX_BYTES, MAX_SIDE, QUALITY, nextPhotoNumber } from './photo-rules.mjs';
import { savePhoto } from './save-photo.mjs';

const [src, slug, ...rest] = process.argv.slice(2);
if (!src || !slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
  console.error(
    'Uso: npm run add-album -- <cartella sorgente> <slug-in-minuscolo> [--title …] [--date …] [--city …] [--type …] [--event …] [--cover …] [--force]',
  );
  process.exit(1);
}
// --name value pairs; a flag followed by another flag (or by nothing) is true.
const opts = {};
for (let i = 0; i < rest.length; i++) {
  const next = rest[i + 1];
  const flag = rest[i].replace(/^--/, '');
  if (next === undefined || next.startsWith('--')) opts[flag] = true;
  else opts[flag] = rest[++i];
}

// Flags that take a value: `--cover` with nothing after it would otherwise
// reach sharp as `true`, after the album folder was created.
for (const flag of ['title', 'date', 'city', 'type', 'event', 'cover'])
  if (opts[flag] === true) {
    console.error(`--${flag} vuole un valore`);
    process.exit(1);
  }
if (opts.cover !== undefined && !(existsSync(opts.cover) && statSync(opts.cover).isFile())) {
  console.error(`--cover: ${opts.cover} non esiste o non è un file`);
  process.exit(1);
}

const dest = join('albums', slug);
const coverOut = join(dest, 'cover.webp');
const sources = readdirSync(src)
  .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
if (sources.length === 0) {
  console.error(`Nessuna foto (jpg, png, webp) in ${src}`);
  process.exit(1);
}
if (opts.cover && existsSync(coverOut) && !opts.force) {
  console.error(`${coverOut} esiste già: aggiungi --force per sostituirla`);
  process.exit(1);
}
// Only now, so a failed run leaves no empty album folder behind.
mkdirSync(dest, { recursive: true });
const first = nextPhotoNumber(readdirSync(dest), slug);

/** savePhoto, or stop the script when the photo never fits MAX_BYTES,
 * instead of leaving it to fail at the build. */
async function save(file, out, maxSide) {
  const saved = await savePhoto(file, out, maxSide);
  if (saved) return saved;
  console.error(
    `${file}: oltre ${MAX_BYTES / 1024} KB anche a qualità 50 e lato ${Math.round(maxSide / 2)} px: riducila a mano`,
  );
  process.exit(1);
}

let n = first - 1;
const added = [];
for (const f of sources) {
  n++;
  const out = join(dest, `${slug}-${String(n).padStart(2, '0')}.webp`);
  if (existsSync(out)) {
    console.error(`${out} esiste già: non sovrascrivo`);
    process.exit(1);
  }
  const { quality, side } = await save(join(src, f), out, MAX_SIDE);
  added.push(out);
  const notes = [
    extname(f).toLowerCase() === '.webp' ? '' : 'convertita',
    quality < QUALITY ? `qualità ${quality}` : '',
    side < MAX_SIDE ? `lato ${side} px` : '',
  ]
    .filter(Boolean)
    .join(', ');
  console.log(`${f} → ${out}${notes ? ` (${notes})` : ''}`);
}

if (opts.cover) {
  const { side } = await save(opts.cover, coverOut, 1200);
  console.log(`${opts.cover} → ${coverOut} (copertina${side < 1200 ? `, lato ${side} px` : ''})`);
}

const meta = join(dest, 'album.json');
if (existsSync(meta)) {
  let sections;
  try {
    sections = JSON.parse(readFileSync(meta, 'utf8')).sections;
  } catch {
    // build-photos names the broken file.
  }
  if (Array.isArray(sections))
    console.log(
      `${meta} ha delle sections: le nuove foto compaiono dopo, aggiungile a una sezione:\n  ` +
        added.map((f) => basename(f)).join('\n  '),
    );
} else {
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
