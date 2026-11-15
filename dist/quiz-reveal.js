// One short reveal per opening. No perpetual animation or delayed focus after leaving.
export function playQuestionReveal(dialog, onReady = () => {}) {
  const card = dialog?.querySelector('.question-card');
  const front = dialog?.querySelector('.question-shell');
  const view = dialog?.ownerDocument?.defaultView;
  if (!card || !front || !view) { onReady(); return () => {}; }
  const media = view.matchMedia?.('(prefers-reduced-motion: reduce)');
  let timer, finished = false;
  const finish = notify => {
    if (finished) return;
    finished = true;
    view.clearTimeout(timer);
    card.removeEventListener('animationend', onEnd);
    media?.removeEventListener?.('change', onPreference);
    dialog.classList.remove('is-revealing');
    dialog.removeAttribute('aria-busy');
    front.removeAttribute('inert');
    if (notify && dialog.isConnected && dialog.open) onReady();
  };
  const onEnd = event => { if (event.target === card && event.animationName === 'question-card-reveal') finish(true); };
  const onPreference = () => { if (media.matches) finish(true); };
  if (media?.matches) { onReady(); return () => {}; }
  front.setAttribute('inert','');
  dialog.classList.add('is-revealing');
  dialog.setAttribute('aria-busy','true');
  card.addEventListener('animationend',onEnd);
  media?.addEventListener?.('change',onPreference);
  const flip = card.getAnimations?.().find(animation => animation.animationName === 'question-card-reveal');
  if (flip?.finished) flip.finished.then(() => finish(true), () => finish(true));
  else timer = view.setTimeout(() => finish(true),1450);
  return () => finish(false);
}
