/* Rules every photo under albums/ follows, shared by add-album (which applies
 * them) and build-photos (which refuses a photo that breaks them). They keep
 * the repo and the Pages site small: a photo is ~150–300 KB, so the 1 GB Pages
 * limit holds several thousand. */

/** Long side, in px: enough for a full-screen view on any monitor. */
export const MAX_SIDE = 1600;

/** WebP quality of the stored photo. */
export const QUALITY = 80;

/** Largest file accepted in albums/, in bytes. */
export const MAX_BYTES = 600 * 1024;

/** Most photos an album should hold, by event type: EC, GP and Nazionale run for
 * days and have side events, a national prerelease spans many cities; a tour
 * stage or any other event tells its story in fewer. A selection, not a dump: build-photos warns past it, it doesn't stop. */
export const MAX_PHOTOS = { ec: 50, gp: 50, nazionale: 50, prerelease: 50 };
export const MAX_PHOTOS_OTHER = 20;

/** Warnings for the albums ({ slug, type, photos }) past their MAX_PHOTOS. */
export function photoCountWarnings(albums) {
  return albums.flatMap((a) => {
    const max = MAX_PHOTOS[a.type] ?? MAX_PHOTOS_OTHER;
    return a.photos.length > max
      ? [`${a.slug}: ${a.photos.length} foto, oltre il tetto di ${max} per "${a.type}"`]
      : [];
  });
}

/** Photo files of an album folder. */
export const PHOTO_EXT = /\.webp$/i;

/** Side of the square grid thumbnails, in px: sharp at 3x on a phone, 2x on a desktop tile. */
export const THUMB_SIZE = 640;

/** Side of the smaller copy of each thumbnail, for 1x screens, where a grid tile is ~150–300 px. */
export const THUMB_SMALL = 320;

/** Metadata a stored photo must not carry (EXIF holds the GPS position): the
 * names of the blocks found in a sharp `metadata()` result. */
export function leakedMetadata(meta) {
  return ['exif', 'xmp', 'iptc'].filter((k) => meta[k]);
}

/** Number of the next `<slug>-NN.webp` of an album folder: one past the
 * highest in use, so a gap left by a removed photo never leads to an overwrite.
 * Hand-renamed photos keep their number before a word suffix (`<slug>-07-premi.webp`). */
export function nextPhotoNumber(files, slug) {
  const own = new RegExp(String.raw`^${slug}-(\d+)(?:-[a-z][a-z0-9-]*)?\.webp$`, 'i');
  return files.reduce((n, f) => Math.max(n, Number(own.exec(f)?.[1] ?? 0)), 0) + 1;
}

/** Puts photos in the order of album.json `sections` ([{ title, photos: [file, …] }]),
 * each carrying its section title; photos left out come last, as they were.
 * Returns the photos and the problems found (a file missing or listed twice). */
export function orderBySections(photos, sections, metaFile) {
  if (!sections) return { photos, errors: [] };
  const errors = [];
  const byFile = new Map(photos.map((p) => [p.file, p]));
  const ordered = [];
  for (const s of sections) {
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
  return { photos: [...ordered, ...byFile.values()], errors };
}

/** Problems of an image under albums/ or covers/, from its sharp `metadata()`
 * and size in bytes; `maxSide` is the long-side limit for that kind of image. */
export function imageErrors(src, meta, bytes, maxSide = MAX_SIDE) {
  const errors = [];
  const leaked = leakedMetadata(meta);
  if (leaked.length)
    errors.push(`${src}: contiene metadati ${leaked.join(', ')} (posizione GPS?): usa npm run add-album`);
  if (meta.format !== 'webp') errors.push(`${src}: non è una WebP (${meta.format}): usa npm run add-album`);
  if (Math.max(meta.width, meta.height) > maxSide || bytes > MAX_BYTES)
    errors.push(
      `${src}: ${meta.width}x${meta.height}, ${Math.round(bytes / 1024)} KB oltre i limiti ` +
        `(${maxSide}px, ${MAX_BYTES / 1024} KB): usa npm run add-album`,
    );
  return errors;
}

/** Fields an album.json may have: any other is a typo (`caption` for `captions`)
 * that would be dropped without a word. */
export const ALBUM_KEYS = ['title', 'date', 'city', 'type', 'event', 'cover', 'description', 'captions', 'sections'];

/** True for a real calendar day written YYYY-MM-DD (not 2026-13-45, which
 * would make the pages' date formatting throw). */
export function isDay(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const day = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(day.getTime()) && day.toISOString().slice(0, 10) === date;
}

/** Problems of an album.json, as messages; `types` are the ALBUM_TYPES and
 * `cities` the slugs accepted as `city` (the principati, plus any town with a
 * header in covers/). */
export function albumErrors(meta, metaFile, types, cities) {
  const errors = [];
  if (meta === null || typeof meta !== 'object' || Array.isArray(meta))
    return [`${metaFile}: deve essere un oggetto JSON`];
  for (const key of Object.keys(meta))
    if (!ALBUM_KEYS.includes(key))
      errors.push(`${metaFile}: campo sconosciuto "${key}" (ammessi: ${ALBUM_KEYS.join(', ')})`);
  if (!meta.title || /TODO/.test(meta.title)) errors.push(`${metaFile}: title mancante`);
  if (!isDay(meta.date)) errors.push(`${metaFile}: date deve essere una data YYYY-MM-DD esistente`);
  if (!meta.city || !/^[a-z]+(-[a-z]+)*$/.test(meta.city))
    errors.push(`${metaFile}: city deve essere lo slug del principato (es. bologna)`);
  else if (!cities.has(meta.city))
    errors.push(`${metaFile}: city "${meta.city}" non è un principato né ha un'intestazione covers/${meta.city}.webp`);
  if (typeof meta.type !== 'string' || !Object.hasOwn(types, meta.type))
    errors.push(`${metaFile}: type deve essere uno di ${Object.keys(types).join(', ')}`);
  if (meta.event !== undefined && !/^https:\/\/vtesitaly\.com\//.test(meta.event))
    errors.push(`${metaFile}: event deve essere una pagina di https://vtesitaly.com/`);
  return errors;
}

/** Problems of album.json `captions` ({ file: text }) against the album's
 * photo files: a caption for a missing or renamed photo would never show. */
export function captionErrors(captions, files, metaFile) {
  if (captions === undefined) return [];
  if (captions === null || typeof captions !== 'object' || Array.isArray(captions))
    return [`${metaFile}: captions deve essere un oggetto { "file.webp": "testo" }`];
  return Object.entries(captions).flatMap(([file, text]) => [
    ...(files.includes(file) ? [] : [`${metaFile}: la didascalia di ${file} non corrisponde a nessuna foto`]),
    ...(typeof text === 'string' ? [] : [`${metaFile}: la didascalia di ${file} deve essere un testo`]),
  ]);
}
