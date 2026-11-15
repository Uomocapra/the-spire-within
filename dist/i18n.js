import { messages } from './locales/interface.js';

export const languages = { zh: '简体中文', en: 'English', fr: 'Français', ko: '한국어' };
const codes = Object.keys(languages);
const preferenceKey = 'spire-language';
let code = 'zh';
let content = null;
let request = 0;

export function language() { return code; }
export function t(key, ...values) {
  const text = messages[key][codes.indexOf(code)];
  return text.replace(/\{(\d+)\}/g, (_, index) => String(values[index]));
}
export function initialLanguage() {
  const requested = new URL(location.href).searchParams.get('lang');
  if (codes.includes(requested)) return requested;
  try {
    const saved = localStorage.getItem(preferenceKey);
    if (codes.includes(saved)) return saved;
  } catch { /* The quiz also runs without browser storage. */ }
  return 'zh';
}
export async function setLanguage(next) {
  if (!codes.includes(next)) return false;
  const ticket = ++request;
  const pack = next === 'zh' ? null : await import(`./locales/${next}-content.js`);
  if (ticket !== request) return false;
  code = next;
  content = pack;
  document.documentElement.lang = code === 'zh' ? 'zh-CN' : code;
  return true;
}
export function rememberLanguage() {
  try { localStorage.setItem(preferenceKey, code); } catch { /* URL keeps the choice on reload. */ }
  const url = new URL(location.href);
  url.searchParams.set('lang', code);
  history.replaceState(history.state, '', url);
}
export function localizedQuestions(questions) {
  if (!content) return questions;
  return questions.map(q => {
    const [title, text, optionA, optionB] = content.questions[q.id - 1];
    return {...q, title, text, optionA, optionB};
  });
}
export function localizedCharacters(original) {
  if (!content) return original;
  return Object.fromEntries(Object.entries(original).map(([type, c]) => [type, {...c, ...content.characters[type]}]));
}
export function picker() {
  return `<label class="language-picker"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4.3" ry="9"/><path d="M3 12h18"/></svg><select data-language aria-label="${t('language')}">${codes.map(k => `<option lang="${k === 'zh' ? 'zh-CN' : k}" value="${k}" ${k === code ? 'selected' : ''}>${languages[k]}</option>`).join('')}</select></label>`;
}
export function updateShell() {
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const [attribute, key] of [['aria-label','aria'], ['alt','alt'], ['content','content']]) {
    for (const el of document.querySelectorAll('[data-i18n-' + key + ']')) el.setAttribute(attribute, t(el.getAttribute('data-i18n-' + key)));
  }
  for (const el of document.querySelectorAll('[data-language-slot]')) el.innerHTML = picker();
  for (const link of document.querySelectorAll('[data-language-link]')) {
    const url = new URL(link.href);
    url.searchParams.set('lang', code);
    link.href = url.href;
  }
}
