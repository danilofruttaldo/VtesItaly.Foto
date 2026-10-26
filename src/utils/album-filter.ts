/* The home's dropdown filters (city, year, event type): what they offer and
 * which albums a selection keeps. Pure, so the page script and the tests
 * share it. */
import { cityName, typeLabel, type Album } from './albums';

/** A filter dimension: its address parameter and the album value it reads. */
export const FILTER_KEYS = ['citta', 'anno', 'tipo'] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];
export type Selection = Partial<Record<FilterKey, string>>;

/** The catch-all type: "Altro" in the filter, listed last (Play and the like). */
const OTHER_TYPE = 'evento';

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

/** The value an album has for a filter. */
export function albumValue(album: Pick<Album, 'city' | 'date' | 'type'>, key: FilterKey): string {
  if (key === 'citta') return album.city;
  if (key === 'anno') return album.date.slice(0, 4);
  return album.type;
}

/** Options of each filter, with the number of albums: cities and types by
 * name (the catch-all "Altro" last), years newest first. */
export function filterOptions(albums: Album[]): Record<FilterKey, FilterOption[]> {
  const count = (key: FilterKey) => {
    const counts = new Map<string, number>();
    for (const a of albums) counts.set(albumValue(a, key), (counts.get(albumValue(a, key)) ?? 0) + 1);
    return [...counts.entries()];
  };
  const byLabel = (a: FilterOption, b: FilterOption) => a.label.localeCompare(b.label, 'it');
  return {
    citta: count('citta')
      .map(([value, n]) => ({ value, label: cityName(value), count: n }))
      .sort(byLabel),
    anno: count('anno')
      .map(([value, n]) => ({ value, label: value, count: n }))
      .sort((a, b) => b.value.localeCompare(a.value)),
    tipo: count('tipo')
      .map(([value, n]) => ({ value, label: value === OTHER_TYPE ? 'Altro' : typeLabel(value), count: n }))
      .sort((a, b) => Number(a.value === OTHER_TYPE) - Number(b.value === OTHER_TYPE) || byLabel(a, b)),
  };
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
