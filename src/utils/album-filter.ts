/* The home's dropdown filters (city, year, event type): which albums a
 * selection keeps. Runs in the browser, so it imports nothing that reads the
 * disk (the options are built at build time, in album-filter-options.ts). */
import type { Album } from './albums';

/** A filter dimension: its address parameter and the album value it reads. */
export const FILTER_KEYS = ['citta', 'anno', 'tipo'] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];
export type Selection = Partial<Record<FilterKey, string>>;

/** The value an album has for a filter. */
export function albumValue(album: Pick<Album, 'city' | 'date' | 'type'>, key: FilterKey): string {
  if (key === 'citta') return album.city;
  if (key === 'anno') return album.date.slice(0, 4);
  return album.type;
}

/** The selection in an address: unknown values are dropped. The old
 * `?principati=a,b` of the city chips still opens on its first city. */
export function readSelection(params: URLSearchParams, known: Record<FilterKey, Set<string>>): Selection {
  const sel: Selection = {};
  for (const key of FILTER_KEYS) {
    const value = params.get(key) ?? (key === 'citta' ? params.get('principati')?.split(',')[0] : undefined);
    if (value && known[key].has(value)) sel[key] = value;
  }
  return sel;
}

/** Whether an album passes every chosen filter (an empty one keeps all). */
export function matches(values: Record<FilterKey, string>, sel: Selection): boolean {
  return FILTER_KEYS.every((key) => !sel[key] || sel[key] === values[key]);
}
