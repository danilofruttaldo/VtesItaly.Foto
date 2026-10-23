/**
 * Full-screen viewer for an album grid: a click on a thumb opens the photo in
 * the page's <dialog>; arrows, buttons and swipes move through the album, Esc
 * or the close button leave it. The grid links work on their own without
 * JavaScript (they open the photo file).
 */
export function initLightbox(): void {
  const grid = document.querySelector<HTMLElement>('[data-lightbox]');
  const dialog = document.querySelector<HTMLDialogElement>('dialog.viewer');
  if (!grid || !dialog) return;
  const links = [...grid.querySelectorAll<HTMLAnchorElement>('a[data-index]')];
  const img = dialog.querySelector('img')!;
  const caption = dialog.querySelector<HTMLElement>('.viewer__caption')!;
  let current = 0;

  const show = (i: number) => {
    current = (i + links.length) % links.length;
    const link = links[current];
    img.src = link.href;
    img.alt = link.querySelector('img')?.alt ?? '';
    caption.textContent = `${link.dataset.caption ? link.dataset.caption + ' · ' : ''}${current + 1} / ${links.length}`;
    // Warm the next photo so the arrow feels instant.
    const next = links[(current + 1) % links.length];
    if (next) new Image().src = next.href;
  };

  grid.addEventListener('click', (e) => {
    const link = (e.target as Element).closest<HTMLAnchorElement>('a[data-index]');
    if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    show(Number(link.dataset.index));
    dialog.showModal();
  });
  dialog.querySelector('.viewer__prev')!.addEventListener('click', () => show(current - 1));
  dialog.querySelector('.viewer__next')!.addEventListener('click', () => show(current + 1));
  dialog.querySelector('.viewer__close')!.addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(current - 1);
    else if (e.key === 'ArrowRight') show(current + 1);
  });
  // A click on the dark area around the photo closes the viewer.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  let startX = 0;
  dialog.addEventListener('touchstart', (e) => (startX = e.touches[0].clientX), { passive: true });
  dialog.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
  });
  dialog.addEventListener('close', () => {
    img.removeAttribute('src');
    links[current]?.focus();
  });
}
