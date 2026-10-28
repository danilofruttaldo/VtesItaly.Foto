// "Copy link" button of the share bar: hidden in the HTML, shown only here,
// where the clipboard is there to use, so it never sits on the page dead.
const copyBtn = document.querySelector<HTMLButtonElement>('.share__btn--copy');
if (copyBtn && navigator.clipboard) {
  copyBtn.hidden = false;
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(copyBtn.dataset.url ?? window.location.href);
      copyBtn.classList.add('copied');
      setTimeout(() => copyBtn.classList.remove('copied'), 2000);
    } catch {
      // Permission denied: nothing to show.
    }
  });
}
