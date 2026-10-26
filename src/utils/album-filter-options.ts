/* What the home's dropdown filters offer, built at build time from the albums. */
import { cityName, typeLabel, type Album } from './albums';
import { albumValue, type FilterKey } from './album-filter';

/** The catch-all type: "Altro" in the filter, listed last (Play and the like). */
const OTHER_TYPE = 'evento';

export interface FilterOption {
  value: string;
  label: string;
  count: number;
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
