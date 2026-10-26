/**
 * Wires the home's dropdowns: the selection filters the album cards
 * (`data-album-citta|anno|tipo`), hides the years left empty, updates the
 * "N album, M foto" line and lives in the address (`?citta=…&anno=…&tipo=…`)
 * so a filtered view can be shared or reloaded.
 */
import { FILTER_KEYS, matches, readSelection, type FilterKey, type Selection } from '../utils/album-filter';

export function initAlbumFilter(): void {
  const form = document.querySelector<HTMLFormElement>('[data-album-filter]');
  if (!form) return;
  const selects = Object.fromEntries(
    FILTER_KEYS.map((key) => [key, form.querySelector<HTMLSelectElement>(`select[name="${key}"]`)!]),
  ) as Record<FilterKey, HTMLSelectElement>;
  const reset = form.querySelector<HTMLButtonElement>('[data-filter-reset]');
  const cards = [...document.querySelectorAll<HTMLElement>('[data-album-citta]')];
  const years = [...document.querySelectorAll<HTMLElement>('[data-album-year]')];
  const summary = document.querySelector<HTMLElement>('[data-album-summary]');
  const known = Object.fromEntries(
    FILTER_KEYS.map((key) => [key, new Set([...selects[key].options].map((o) => o.value).filter(Boolean))]),
  ) as Record<FilterKey, Set<string>>;

  const apply = (sel: Selection) => {
    let albums = 0;
    let photos = 0;
    for (const card of cards) {
      const values = { citta: card.dataset.albumCitta!, anno: card.dataset.albumAnno!, tipo: card.dataset.albumTipo! };
      const show = matches(values, sel);
      card.hidden = !show;
      if (show) {
        albums++;
        photos += Number(card.dataset.albumPhotos);
      }
    }
    for (const year of years) year.hidden = !year.querySelector('[data-album-citta]:not([hidden])');
    if (summary) summary.textContent = albums ? `${albums} album, ${photos} foto.` : 'Nessun album con questi filtri.';
    if (reset) reset.hidden = !FILTER_KEYS.some((key) => sel[key]);
    const url = new URL(location.href);
    url.searchParams.delete('principati');
    for (const key of FILTER_KEYS) {
      if (sel[key]) url.searchParams.set(key, sel[key]!);
      else url.searchParams.delete(key);
    }
    history.replaceState(null, '', url);
  };

  const current = (): Selection =>
    Object.fromEntries(FILTER_KEYS.filter((key) => selects[key].value).map((key) => [key, selects[key].value]));

  const initial = readSelection(new URLSearchParams(location.search), known);
  for (const key of FILTER_KEYS) selects[key].value = initial[key] ?? '';
  form.addEventListener('change', () => apply(current()));
  form.addEventListener('submit', (e) => e.preventDefault());
  reset?.addEventListener('click', () => {
    for (const key of FILTER_KEYS) selects[key].value = '';
    apply({});
  });
  form.hidden = false;
  apply(initial);
}
