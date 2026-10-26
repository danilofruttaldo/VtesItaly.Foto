// "Back to top" button: shown after 400px of scroll. The jump is smooth only
// when the visitor has not asked the system for reduced motion.
const btn = document.getElementById('back-to-top');
if (btn) {
  let visible = false;
  const toggle = () => {
    const show = window.scrollY > 400;
    if (show !== visible) {
      visible = show;
      btn.classList.toggle('back-to-top--visible', show);
    }
  };
  window.addEventListener('scroll', toggle, { passive: true });
  btn.addEventListener('click', () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });
  toggle();
}
