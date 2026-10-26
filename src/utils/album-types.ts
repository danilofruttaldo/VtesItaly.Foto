/* Kinds of event an album can be (album.json `type`), with the label shown on
 * the cards. Read by the pages and by scripts/build-photos.mjs (validation). */
export const ALBUM_TYPES = {
  ec: 'European Championship',
  gp: 'Grand Prix',
  nazionale: 'Nazionale',
  tour: 'Tour',
  torneo: 'Torneo',
  lega: 'Lega',
  evento: 'Evento',
} as const;

export type AlbumType = keyof typeof ALBUM_TYPES;
