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
