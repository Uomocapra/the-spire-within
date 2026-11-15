const clamp = value => Math.max(0, Math.min(1, value));
const properties = ['--hero-opacity', '--hero-y', '--lower-opacity', '--lower-y'];

// Enhances the current homepage only. The returned disposer owns every listener.
export function mountHomeMotion(root, view = window) {
  if (!root) return () => {};
  const hero = root.querySelector('.hero');
  const lower = root.querySelector('.home-lower');
  if (!hero || !lower) return () => {};
  const targets = [...root.querySelectorAll('.section-head, .character-preview-grid .character-card, .mini-note, .journey-note article')];
  const preference = view.matchMedia?.('(prefers-reduced-motion: reduce)');
  let observer, frame = null, disposed = false;

  function reveal(target) {
    target.classList.add('is-revealed');
    observer?.unobserve(target);
  }
  function focus(event) {
    const target = event.target.closest?.('.home-reveal');
    if (targets.includes(target)) reveal(target);
  }
  function update() {
    frame = null;
    if (disposed || !root.isConnected) return;
    const heroBox = hero.getBoundingClientRect();
    const lowerBox = lower.getBoundingClientRect();
    const progress = clamp(-heroBox.top / Math.max(1, heroBox.height));
    const glow = clamp((view.innerHeight - lowerBox.top) / Math.max(1, view.innerHeight * .85));
    // Reading geometry is batched before writes; only background layers move.
    root.style.setProperty('--hero-opacity', (.88 - progress * .65).toFixed(3));
    root.style.setProperty('--hero-y', `${(progress * (view.innerWidth <= 760 ? 18 : 48)).toFixed(1)}px`);
    root.style.setProperty('--lower-opacity', (.08 + glow * .72).toFixed(3));
    root.style.setProperty('--lower-y', `${((1 - glow) * 20).toFixed(1)}px`);
  }
  function schedule() {
    if (frame === null) frame = view.requestAnimationFrame(update);
  }
  function stop() {
    observer?.disconnect();
    if (frame !== null) view.cancelAnimationFrame(frame);
    frame = null;
    view.removeEventListener('scroll', schedule);
    view.removeEventListener('resize', schedule);
    root.removeEventListener('focusin', focus);
    root.classList.remove('home-motion-ready');
    properties.forEach(property => root.style.removeProperty(property));
  }
  function start() {
    stop();
    if (disposed || preference?.matches || !view.IntersectionObserver || !view.requestAnimationFrame) return;
    observer = new view.IntersectionObserver(entries => {
      if (disposed) return;
      entries.forEach(entry => { if (entry.isIntersecting) reveal(entry.target); });
    }, {threshold: .12, rootMargin: '0px 0px -32px 0px'});
    targets.forEach(target => {
      target.classList.add('home-reveal');
      if (target.matches?.('.character-card, .journey-note article')) {
        const order = [...target.parentElement.children].indexOf(target);
        target.style.setProperty('--reveal-delay', `${Math.min(order, 3) * 85}ms`);
      }
      if (target.classList.contains('is-revealed')) return;
      const box = target.getBoundingClientRect();
      // Already-visible content never disappears during a mode switch or revisit.
      if (box.top < view.innerHeight - 32 && box.bottom > 0) reveal(target);
      else observer.observe(target);
    });
    root.classList.add('home-motion-ready');
    update();
    view.addEventListener('scroll', schedule, {passive: true});
    view.addEventListener('resize', schedule, {passive: true});
    root.addEventListener('focusin', focus);
  }
  preference?.addEventListener?.('change', start);
  start();
  return () => {
    disposed = true;
    stop();
    preference?.removeEventListener?.('change', start);
  };
}
