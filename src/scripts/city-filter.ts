/**
 * Turns the principato chips of the home into toggles. The selection filters
 * the album cards (`data-city`), hides the years left empty, updates the
 * "N album, M foto" line and lives in the address (`?principati=a,b`) so a
 * filtered view can be shared or reloaded.
 */
export function initCityFilter(): void {
  const nav = document.querySelector<HTMLElement>('[data-city-filter]');
  if (!nav) return;
  const chips = [...nav.querySelectorAll<HTMLAnchorElement>('a[data-city]')];
  const cards = [...document.querySelectorAll<HTMLElement>('[data-album-city]')];
  const years = [...document.querySelectorAll<HTMLElement>('[data-album-year]')];
  const summary = document.querySelector<HTMLElement>('[data-album-summary]');
  const known = new Set(chips.map((c) => c.dataset.city!));
  const param = new URLSearchParams(location.search).get('principati') ?? '';
  const selected = new Set(param.split(',').filter((c) => known.has(c)));

  const apply = () => {
    let albums = 0;
    let photos = 0;
    for (const card of cards) {
      const show = selected.size === 0 || selected.has(card.dataset.albumCity!);
      card.hidden = !show;
      if (show) {
        albums++;
        photos += Number(card.dataset.albumPhotos);
      }
    }
    for (const year of years) year.hidden = !year.querySelector('[data-album-city]:not([hidden])');
    for (const chip of chips) chip.setAttribute('aria-pressed', String(selected.has(chip.dataset.city!)));
    if (summary) summary.textContent = `${albums} album, ${photos} foto.`;
    const url = new URL(location.href);
    if (selected.size) url.searchParams.set('principati', [...selected].join(','));
    else url.searchParams.delete('principati');
    history.replaceState(null, '', url);
  };

  for (const chip of chips) {
    chip.setAttribute('role', 'button');
    chip.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return; // still a link to the principato page
      e.preventDefault();
      const city = chip.dataset.city!;
      if (selected.has(city)) selected.delete(city);
      else selected.add(city);
      apply();
    });
    // A button also answers Space; the link only reacts to Enter by itself.
    chip.addEventListener('keydown', (e) => {
      if (e.key !== ' ') return;
      e.preventDefault();
      chip.click();
    });
  }
  apply();
}
