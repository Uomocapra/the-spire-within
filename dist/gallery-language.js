import { initialLanguage, language, setLanguage, rememberLanguage, updateShell, t } from './i18n.js';

const status = document.createElement('p');
status.setAttribute('role', 'status');
document.querySelector('.gallery-nav').after(status);
try { await setLanguage(initialLanguage()); } catch { status.textContent = t('langError'); }
updateShell();
document.addEventListener('change', async event => {
  if (!event.target.matches('[data-language]')) return;
  try {
    if (!await setLanguage(event.target.value)) return;
    rememberLanguage();
    updateShell();
    status.textContent = '';
    document.querySelector('[data-language]').focus();
  } catch {
    event.target.value = language();
    status.textContent = t('langError');
  }
});
