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

/** Photo files of an album folder. */
export const PHOTO_EXT = /\.webp$/i;

/** Side of the square grid thumbnails, in px: sharp at 3x on a phone, 2x on a desktop tile. */
export const THUMB_SIZE = 640;

/** Metadata a stored photo must not carry (EXIF holds the GPS position): the
 * names of the blocks found in a sharp `metadata()` result. */
export function leakedMetadata(meta) {
  return ['exif', 'xmp', 'iptc'].filter((k) => meta[k]);
}

/** Number of the next `<slug>-NN.webp` of an album folder: one past the
 * highest in use, so a gap left by a removed photo never leads to an overwrite. */
export function nextPhotoNumber(files, slug) {
  const own = new RegExp(String.raw`^${slug}-(\d+)\.webp$`, 'i');
  return files.reduce((n, f) => Math.max(n, Number(own.exec(f)?.[1] ?? 0)), 0) + 1;
}

/** Problems of an album.json, as messages; `types` are the ALBUM_TYPES. */
export function albumErrors(meta, metaFile, types) {
  const errors = [];
  if (!meta.title || /TODO/.test(meta.title)) errors.push(`${metaFile}: title mancante`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date ?? '')) errors.push(`${metaFile}: date deve essere YYYY-MM-DD`);
  if (!meta.city || !/^[a-z]+(-[a-z]+)*$/.test(meta.city))
    errors.push(`${metaFile}: city deve essere lo slug del principato (es. bologna)`);
  if (typeof meta.type !== 'string' || !Object.hasOwn(types, meta.type))
    errors.push(`${metaFile}: type deve essere uno di ${Object.keys(types).join(', ')}`);
  if (meta.event !== undefined && !/^https:\/\/vtesitaly\.com\//.test(meta.event))
    errors.push(`${metaFile}: event deve essere una pagina di https://vtesitaly.com/`);
  return errors;
}
