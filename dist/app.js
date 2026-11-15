import { getQuestions as sourceQuestions, QUESTIONNAIRE_VERSION } from './questions.js';
import { calculateResult, validSession } from './scoring.js';
import { CHARACTERS as sourceCharacters } from './characters.js';
import { motionMarkup, motionLabel, playMotion } from './motions.js';
import { mountHomeMotion } from './home-motion.js';
import { journeyMapMarkup, positionJourney, animateJourney, drawArrivalRing, journeyNodeKind, journeyIcon, JOURNEY_NODE_LABELS } from './journey-map.js';
import { roomForNode, roomSceneMarkup, bindMerchantStall, encounterMarkup, mountEncounter, prepareRoom } from './room-scenes.js';
import { playQuestionReveal } from './quiz-reveal.js';

import { t, language, initialLanguage, setLanguage, rememberLanguage, localizedQuestions, localizedCharacters, picker, updateShell } from './i18n.js';

let CHARACTERS = sourceCharacters;
const getQuestions = length => localizedQuestions(sourceQuestions(length));
const axisLabels = {EI:['extraversion','introversion','energy'], SN:['sensing','intuition','information'], TF:['thinking','feeling','decisions'], JP:['judging','perceiving','pace']};
function localResult(answers, length) {
  const result = calculateResult(answers, length);
  result.dimensions = result.dimensions.map(d => {
    const [left, right, label] = axisLabels[d.pair];
    return {...d, left:t(left), right:t(right), label:t(label)};
  });
  return result;
}
const main = document.querySelector('#main');
const dialog = document.querySelector('#dialog');
const KEY = `spire-personality-v${QUESTIONNAIRE_VERSION}`;
let session = readSession();
let selectedLength = session?.length || 30;
let autoAdvance = session?.autoAdvance !== false;
let advanceTimer;
let journeyRun = null;
let questionOpening = false;
let stopQuestionReveal = () => {};
let toastTimer;
let activeResult;
let archiveFilter = 'all';
let disposeHomeMotion = () => {};

function readSession() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); return validSession(s) ? s : null; }
  catch { return null; }
}
function createMapSeed() {
  const values = new Uint32Array(1);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(values);
  else values[0] = Math.floor(Math.random() * 0xffffffff);
  return values[0] || 1;
}
function hasOldProgress() {
  try { return !session && [1, 2].some(version => Boolean(JSON.parse(localStorage.getItem(`spire-personality-v${version}`))?.answers?.some(a => a !== null))); }
  catch { return false; }
}
function save() {
  if (!session) return;
  session.autoAdvance = autoAdvance;
  try { localStorage.setItem(KEY, JSON.stringify(session)); }
  catch { toast(t('storageError')); }
}
function toast(text) {
  const el = document.querySelector('#toast');
  clearTimeout(toastTimer); el.textContent = text; el.classList.add('visible');
  toastTimer = setTimeout(() => el.classList.remove('visible'), 3500);
}
function complete() { return session && session.answers.every(a => a !== null); }
function escapeHTML(value) { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function go(hash) { cancelJourney(); if (location.hash === hash) render(); else location.hash = hash; }
function openDialog(html) { document.querySelector('#dialog-content').innerHTML = html; if (!dialog.open) dialog.showModal(); }
function portrait(c, loading = 'lazy') { const medallion = /\/(neow|cleric|face-trader|ranwid)\.webp$/.test(c.image || ''); return c.image ? `<img class="${medallion?'portrait-medallion':''}" src="./${escapeHTML(c.image)}" alt="${escapeHTML(t('portrait', c.name))}" loading="${loading}">` : '<span class="empty-art" aria-hidden="true">✧</span>'; }
function card(c) { return `<a href="#archive/${c.type}" class="character-card" style="--accent:${c.color}" aria-label="${escapeHTML(t('archiveAria', c.name, c.type))}"><span class="card-type">${c.type}</span><div class="card-art">${portrait(c)}</div><div class="card-detail"><h3>${c.name}</h3><p>${c.title}</p><span class="corner-arrow" aria-hidden="true">↗</span></div></a>`; }

function renderHome() {
  disposeHomeMotion();
  const saved = session?.length === selectedLength;
  const answered = saved ? session.answers.filter(a => a !== null).length : 0;
  if (!saved || !complete()) {
    const firstRoom = getQuestions(selectedLength)[saved ? session.index : 0];
    prepareRoom(roomForNode(journeyNodeKind(firstRoom), firstRoom.id, session?.mapSeed, firstRoom.id), 'high');
  }
  const button = saved && complete() ? t('myFile') : answered ? t('resume') : t('start');
  const protagonists = ['ESTP', 'ISTP', 'INTP', 'INFJ'].map(t => CHARACTERS[t]).filter(Boolean);
  main.innerHTML = `<div class="home-page"><section class="hero"><div class="embers" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="hero-inner">
    <div class="eyebrow">${t('homeKicker')}</div>
    <h1>${t('heroLead')}<br><em>${t('heroQuestion')}</em></h1>
    <p class="hero-description">${t('hero1')}<br>${t('hero2')}<br><strong>${t('hero3')}</strong></p>
    <div class="mode-selector" role="group" aria-label="${t('chooseLength')}"><button class="mode" data-length="30" aria-pressed="${selectedLength === 30}"><b>30</b>${t('standard')}</button><button class="mode" data-length="50" aria-pressed="${selectedLength === 50}"><b>50</b>${t('extended')}</button></div>
    <button class="primary" data-action="start">${button}<span class="arrow" aria-hidden="true">⟶</span></button>
    <div class="start-note"><span>${answered ? t('saved', answered, selectedLength) : t('duration', selectedLength === 30 ? '6–9' : '10–15')}</span>${answered ? `<button class="reset-link" data-action="restart">${t('restart')}</button>` : ''}</div>
    ${hasOldProgress() ? `<p class="questionnaire-update">${t('oldVersion')}</p>` : ''}
    <div class="hero-facts"><span>${t('four')}</span><span>${t('sixteen')}</span><span>${t('one')}</span></div>
  </div><div class="hero-caption">${t('homeCaption')}<small>${t('calling')}</small></div></section>
  <div class="home-lower"><section class="inhabitants wrap"><div class="section-head"><div><div class="eyebrow">${t('otherSelf')}</div><h2>${t('inhabitants')}</h2></div><a class="small-link" href="#archive">${t('explore')} <span aria-hidden="true">↗</span></a></div><div class="character-preview-grid">${protagonists.map(card).join('')}</div><p class="mini-note">${t('bossHint')}</p></section>
  <div class="wrap"><section class="journey-note" aria-label="${t('instructions')}"><article><span class="number">01</span><div><h3>${t('step1')}</h3><p>${t('step1a')}<br>${t('step1b')}</p></div></article><article><span class="number">02</span><div><h3>${t('step2')}</h3><p>${t('step2a')}<br>${t('step2b')}</p></div></article><article><span class="number">03</span><div><h3>${t('step3')}</h3><p>${t('step3a')}<br>${t('step3b')}</p></div></article></section></div></div></div>`;
  disposeHomeMotion = mountHomeMotion(main.querySelector('.home-page'));
}

function start(force = false) {
  if (!force && session?.length === selectedLength) {
    if (complete()) { go('#result'); return; }
    go('#test'); return;
  }
  if (!force && session && session.answers.some(a => a !== null)) {
    openDialog(`<h2 id="dialog-title">${t('otherClimb')}</h2><p>${t('replaceLength', selectedLength, session.length)}</p><div class="dialog-actions"><button class="primary" data-action="confirm-restart">${t('newTest')}</button><button class="secondary" data-action="close-dialog">${t('keepProgress')}</button></div>`);
    return;
  }
  session = {version: QUESTIONNAIRE_VERSION, length: selectedLength, answers: Array(selectedLength).fill(null), index: 0, autoAdvance, mapSeed:createMapSeed()};
  save(); go('#test');
}
function cancelJourney() {
  clearTimeout(advanceTimer);
  stopQuestionReveal(); questionOpening = false;
  journeyRun?.abort();
  journeyRun = null;
}
function openQuestion() {
  if (journeyRun || questionOpening || location.hash !== '#test') return;
  const question = document.querySelector('#question-dialog');
  if (!question) return;
  if (!question.open) question.showModal();
  question.querySelector('.question-shell').scrollTop = 0;
  questionOpening = true;
  stopQuestionReveal = playQuestionReveal(question, () => {
    questionOpening = false;
    question.querySelector('#question-heading')?.focus({preventScroll:true});
  });
}
function visitQuestion(index) {
  if (!session || journeyRun || questionOpening || !Number.isInteger(index)) return;
  if (index === session.length && complete()) {
    const map = document.querySelector('.spire-map');
    const run = new AbortController();
    journeyRun = run;
    document.querySelector('#question-dialog').dataset.departure = 'summit';
    positionJourney(map, session.length, index);
    finishArrival(map, index, run);
    return;
  }
  const firstUnanswered = session.answers.indexOf(null);
  if (index < 0 || index >= session.length || (session.answers[index] === null && index !== firstUnanswered)) return;
  cancelJourney(); session.index = index; save(); renderQuiz();
}
function showJourneyMap() {
  if (!session || journeyRun) return;
  clearTimeout(advanceTimer);
  renderQuiz({open:false});
  document.querySelector(`.spire-map [data-node="${session.index}"]`)?.focus({preventScroll:true});
}
async function finishArrival(map, index, run) {
  const page = map.closest('.map-quiz-page');
  const enter = page.querySelector('[data-action="open-question"]');
  map.setAttribute('inert','');
  enter.disabled = true;
  const marked = await drawArrivalRing(map, index, run.signal);
  if (!marked || run.signal.aborted || journeyRun !== run || !page.isConnected) return;
  journeyRun = null;
  if (index === session.length) { go('#result'); return; }
  page.classList.remove('is-travelling');
  map.removeAttribute('inert');
  enter.disabled = false;
  page.querySelector('.journey-status').textContent = t('floor', index + 1)+' · '+getQuestions(session.length)[index].title;
  openQuestion();
}
function renderQuiz({open = true, markerIndex = session?.index} = {}) {
  if (!session) { go('#home'); return; }
  if (!Number.isInteger(session.mapSeed) || session.mapSeed < 1 || session.mapSeed > 0xffffffff) {
    session.mapSeed = createMapSeed(); save();
  }
  stopQuestionReveal(); questionOpening = false;
  document.querySelector('#question-dialog')?.close();
  const questions = getQuestions(session.length);
  const q = questions[session.index];
  const nodeKind = journeyNodeKind(q);
  const nodeNote = {fire:t('restNote'), elite:t('eliteNote'), shop:t('shopNote')}[nodeKind];
  const room = roomForNode(nodeKind, session.index + 1, session.mapSeed, q.id);
  const upcoming = questions[session.index + 1];
  prepareRoom(room, 'high');
  if (upcoming) prepareRoom(roomForNode(journeyNodeKind(upcoming), session.index + 2, session.mapSeed, upcoming.id));
  const done = session.answers.filter(a => a !== null).length;
  const labels = [t('strongA'), t('leanA'), t('both'), t('leanB'), t('strongB')];
  const floor = session.index + 1;
  const nextLabel = floor === session.length ? 'reveal' : 'next';
  const answerOptions = [2,1,0,-1,-2].map((value,i) => `<label class="answer-option">
    <input type="radio" name="answer" value="${value}" ${session.answers[session.index] === value ? 'checked' : ''}>
    <span class="answer-orb" aria-hidden="true">✓</span><span>${labels[i]}</span></label>`).join('');
  main.innerHTML = `<section class="map-quiz-page">
    <div class="quiz-top"><button class="text-button" data-action="home">← ${t('leave')}</button><span>${t(session.length === 30 ? 'mode30' : 'mode50')} · <span id="answered-count">${t('answered',done)}</span></span></div>
    <div class="map-page-heading"><div><div class="eyebrow">${t('mapKicker')}</div><h1>${t('mapHeadline')}</h1></div><span class="map-floor-badge">${t('current')} <b>${String(floor).padStart(2,'0')}</b> / ${session.length}</span></div>
    ${journeyMapMarkup(questions,session.index,session.answers,session.mapSeed)}
    <div class="map-toolbar"><div><p class="journey-status" role="status">${t('floor',floor)} · ${q.title}</p><span>${t('mapContinue')}</span></div><button class="primary" data-action="open-question">${t('enter')} <span aria-hidden="true">↗</span></button></div><p class="map-footnote">${t('autoSave')}</p></section>
    <dialog id="question-dialog" class="quiz-question-dialog" data-node-kind="${nodeKind}" aria-labelledby="question-heading">
      ${encounterMarkup(room, floor)}<div class="question-card"><div class="question-card-back" aria-hidden="true"><span class="card-back-corner">✦</span><div class="card-back-seal"><img src="./assets/mark.svg" alt=""><span>THE SPIRE WITHIN</span></div><p>${t('cardBack')}</p><span class="card-back-corner">✦</span></div>
      <section class="question-shell scenario-question">${roomSceneMarkup(room,floor)}
        <div class="question-meta"><span class="question-context">${journeyIcon(nodeKind)}${JOURNEY_NODE_LABELS[nodeKind]} · ${t(q.kind === 'spire' ? 'spireScene' : 'dailyScene')}</span>${picker()}<b>${String(floor).padStart(2,'0')} <span>/ ${session.length}</span></b></div>
        <div class="progress-track" role="progressbar" aria-label="${t('progress')}" aria-valuemin="0" aria-valuemax="${session.length}" aria-valuenow="${done}"><div style="width:${done/session.length*100}%"></div></div>
        ${nodeNote ? `<p class="question-node-note">${nodeNote}</p>` : ''}
        <h1 tabindex="-1" id="question-heading">${q.text}</h1>
        <div class="scenario-responses"><article class="response-card"><span aria-hidden="true">A</span><p id="response-a">${q.optionA}</p></article><article class="response-card"><span aria-hidden="true">B</span><p id="response-b">${q.optionB}</p></article></div>
        <p class="answer-hint" id="answer-hint">${t('answerHint')}</p><fieldset class="answer-scale" aria-labelledby="question-heading" aria-describedby="answer-hint response-a response-b">${answerOptions}</fieldset>
        <div class="question-actions"><button class="text-button" data-action="previous" ${session.index===0?'disabled':''}>← ${t('previous')}</button><button class="primary" id="next-question" data-action="next" ${session.answers[session.index]===null?'disabled':''}>${t(nextLabel)} <span aria-hidden="true">⟶</span></button></div>
        <div class="quiz-bottom"><label><input type="checkbox" id="auto-advance" ${autoAdvance?'checked':''}>${t('autoNext')}</label><span class="keyboard-tip"><kbd>1</kbd>–<kbd>5</kbd> ${t('chooseKey')} <kbd>Enter</kbd> ${t('continueKey')}</span></div>
      </section></div></dialog>`;
  const map = document.querySelector('.spire-map');
  positionJourney(map, session.length, markerIndex);
  const question = document.querySelector('#question-dialog');
  mountEncounter(question.querySelector('.encounter-stage'));
  bindMerchantStall(question);
  question.addEventListener('close', () => {
    if (!map.isConnected || question.open) return;
    showJourneyMap();
  });
  if (open) {
    const run = new AbortController();
    journeyRun = run;
    finishArrival(map, session.index, run);
  }
}
async function nextQuestion() {
  clearTimeout(advanceTimer);
  if (journeyRun || questionOpening || !session || session.answers[session.index] === null || !document.querySelector('#question-dialog')?.open) return;
  const from = session.index;
  const atEnd = from === session.length - 1;
  if (atEnd && !complete()) {
    visitQuestion(session.answers.indexOf(null)); toast(t('missing')); return;
  }
  const target = atEnd ? session.length : from + 1;
  const run = new AbortController(); journeyRun = run;
  if (!atEnd) session.index = target;
  save();
  renderQuiz({open:false, markerIndex:from});
  const page = document.querySelector('.map-quiz-page');
  const map = page.querySelector('.spire-map');
  if (atEnd) document.querySelector('#question-dialog').dataset.departure = 'summit';
  page.classList.add('is-travelling'); map.setAttribute('inert','');
  page.querySelector('[data-action="open-question"]').disabled = true;
  page.querySelector('.journey-status').textContent = atEnd ? t('toSummit') : t('travelling',target+1);
  try {
    const arrived = await animateJourney(map, session.length, from, target, {signal:run.signal,duration:900});
    if (!arrived || run.signal.aborted || journeyRun !== run || !page.isConnected) return;
    await finishArrival(map, target, run);
  } catch {
    if (!run.signal.aborted && journeyRun === run && page.isConnected) {
      journeyRun = null;
      if (atEnd) go('#result'); else renderQuiz();
    }
  }
}

function renderArchive() {
  const filters = [['all',t('all')],['NT',t('nt')],['NF',t('nf')],['SJ',t('sj')],['SP',t('sp')]];
  const chars = Object.values(CHARACTERS).filter(c=>archiveFilter === 'all' || (archiveFilter === 'NT' || archiveFilter === 'NF' ? c.type.slice(1,3)===archiveFilter : c.type[1]+c.type[3]===archiveFilter));
  main.innerHTML = `<section class="inner-page wrap"><div class="page-heading"><div class="eyebrow">${t('archiveKicker')}</div><h1>${t('archiveHeading')}</h1><p>${t('archiveIntro')}</p></div><div class="archive-filters" role="group" aria-label="${t('filter')}">${filters.map(([key,name])=>`<button class="filter ${archiveFilter===key?'active':''}" data-filter="${key}" aria-pressed="${archiveFilter===key}">${name}</button>`).join('')}</div><div class="archive-grid">${chars.map(card).join('')}</div><p class="archive-foot">${t('archiveNote')}</p></section>`;
}

function dimensionsMarkup(result) {
  return `<section class="detail-panel"><h2><span>01</span> ${t('axes')}</h2>${result.ties.length ? `<p class="tie-note">${t('tieInfo')}</p>` : ''}${result.dimensions.map(d=>`<div class="dimension"><div class="dimension-labels"><span class="${d.letter===d.pair[0]?'dominant':''}">${d.left} <b>${d.pair[0]}</b> ${d.leftPercent}%</span><span class="${d.letter===d.pair[1]?'dominant':''}">${d.rightPercent}% <b>${d.pair[1]}</b> ${d.right}</span></div><div class="dimension-track" role="img" aria-label="${d.left} ${d.leftPercent}% · ${d.right} ${d.rightPercent}%"><div class="dimension-fill" style="width:${d.leftPercent}%"></div></div><p class="dimension-caption">${d.label}${d.lowConfidence ? ` · ${t('nearTie')}` : ''}</p></div>`).join('')}<p class="measurement-note">${t('percentNote')}</p></section>`;
}

function renderUnresolvedResult(result) {
  activeResult = null;
  const allTied = result.ties.length === 4;
  main.innerHTML = `<section class="inner-page result-page wrap unresolved-result"><div class="page-heading"><div class="eyebrow">${t('openPossibilities')}</div><div class="result-code">${result.pattern}</div><h1>${allTied ? t('allTiedTitle') : t('someTiedTitle')}</h1><p>${allTied ? t('allTied') : t('someTied',result.ties.join(language()==='zh'?'、':', '))}</p></div><div class="result-grid">${dimensionsMarkup(result)}<section class="detail-panel"><h2><span>02</span> ${t('readResult')}</h2><div class="story-block"><p>${t('tieWhy')}</p></div><div class="story-block"><p>${t('tieReview')}</p></div><div class="dialog-actions"><button class="primary" data-action="review">↶ ${t('review')}</button><button class="secondary" data-action="restart">${t('retake')}</button></div></section></div><div class="page-heading candidate-heading"><h2>${t('candidates')}</h2><p>${t('candidateIntro')}<br>${t('candidateAction')}</p></div><div class="archive-grid">${result.candidates.map(type=>card(CHARACTERS[type])).join('')}</div><p class="result-bottom">${t('candidateDisclaimer')}<a href="#home">${t('backHome')}</a></p></section>`;
}

function renderResult(type) {
  const personal = !type;
  if (personal && !complete()) { go('#home'); return; }
  const result = personal ? localResult(session.answers, session.length) : null;
  if (result && !result.type) { renderUnresolvedResult(result); return; }
  const c = CHARACTERS[type || result.type];
  if (!c) { go('#archive'); return; }
  activeResult = {c, result};
  const dims = result ? dimensionsMarkup(result) : `<section class="detail-panel"><h2><span>01</span> ${t('outline',c.type)}</h2><div class="story-block"><h3>${t('similar')}</h3><p>${c.summary}</p></div><div class="story-block"><h3>${t('noCoords')}</h3><p>${t('noCoordsText')}</p></div><button class="primary" style="margin-top:24px;font-size:12px" data-action="start">${complete()?t('myResult'):t('myTest')} <span aria-hidden="true">⟶</span></button></section>`;
  main.innerHTML = `<section class="inner-page result-page wrap" style="--accent:${c.color}"><div class="result-heading"><div class="eyebrow">${personal?t('ownIdentity'):t('spireSoul')}</div><p>${personal?t('afterChoices',session.length):t('archiveCaption')}</p></div><div class="result-hero"><div class="result-art motion-stage" data-motion="${c.type}" role="img" aria-label="${c.name} · ${motionLabel(c.type)}">${portrait(c,'eager')}${motionMarkup(c.type)}<span class="art-bottom">${c.kind} · ${c.act}</span></div><div class="result-info"><div class="result-code">${c.type}</div><h1>${c.name}</h1>${c.name.toLocaleLowerCase() === c.english.toLocaleLowerCase() ? '' : `<p class="english-name">${c.english}</p>`}<p class="result-title">${c.title}</p><p class="result-summary">${c.summary}</p><div class="tags">${c.tags.map(t=>`<span>${t}</span>`).join('')}</div></div></div><div class="motion-controls"><span>${motionLabel(c.type)}</span><button class="motion-replay" data-action="replay" aria-label="${escapeHTML(t('replayAria',c.name,motionLabel(c.type)))}">↻ ${t('replay')}</button></div><div class="result-quote">${t('quote',c.quote)}<small>${t('quoteCredit')}</small></div>
    <div class="result-actions"><button class="primary" data-action="download">↓ ${t(personal?'saveMine':'saveTheir')}</button><button class="secondary" data-action="share">↗ ${t('share')}</button>${personal?`<button class="secondary" data-action="review">↶ ${t('review')}</button>`:`<a class="secondary" href="#archive">← ${t('backArchive')}</a>`}</div>
    <div class="result-grid">${dims}<section class="detail-panel"><h2><span>02</span> ${t('origins')}</h2><div class="story-block"><h3>${t('gameStory')}</h3><p>${c.lore}</p><div class="source-links">${c.sources.map(s=>`<a href="${escapeHTML(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(s.title)} ↗</a>`).join('')}</div></div><div class="story-block"><h3>${c.association} · ${t('fanReading')}</h3><p>${c.reading}</p><p class="mapping-note">${t('mappingNote')}</p></div></section><div class="growth-panel"><article><h3>✧ ${t('strength')}</h3><p>${c.strength}</p></article><article><h3>◇ ${t('growth')}</h3><p>${c.growth}</p></article></div></div><p class="result-bottom">${t('resultFoot')}<a href="#archive">${t('otherSouls')}</a>${personal?`<button class="reset-link" style="margin-left:15px" data-action="restart">${t('retake')}</button>`:''}</p></section>`;
  const stage = document.querySelector('.motion-stage');
  const art = stage.querySelector('img');
  if (art?.complete) playMotion(stage);
  else art?.addEventListener('load', () => { if (stage.isConnected) playMotion(stage); }, {once: true});
}

function about() {
  openDialog(`<h2 id="dialog-title">${t('aboutTitle')}</h2><p>${t('aboutP0')}</p><h3>${t('aboutChoices')}</h3><p>${t('aboutP1')}</p><h3>${t('aboutLength')}</h3><p>${t('aboutP2')}</p><h3>${t('aboutLore')}</h3><p>${t('aboutP3')}</p><h3>${t('privacy')}</h3><p>${t('aboutP4')}</p><h3>${t('thanks')}</h3><p>${t('creditBefore')}<a href="https://www.megacrit.com/" target="_blank" rel="noopener noreferrer">Mega Crit</a>${t('creditMiddle')}<a href="https://github.com/xxxawenxxx/GuideSlayTheSpire" target="_blank" rel="noopener noreferrer">${t('iconSource')}</a>${t('creditEnd')}<a href="./scene-credits.html?lang=${language()}" target="_blank" rel="noopener noreferrer">${t('galleryLink')}</a></p>`);
}

function wrapText(ctx,text,x,y,maxWidth,lineHeight) {
  const words = language() === 'zh' ? Array.from(text) : text.split(/(\s+)/);
  let line = '';
  for (const word of words) {
    if (line && ctx.measureText(line + word).width > maxWidth) {
      ctx.fillText(line.trimEnd(), x, y);
      line = word.trimStart();
      y += lineHeight;
    } else line += word;
  }
  if (line) ctx.fillText(line.trimEnd(), x, y);
  return y + lineHeight;
}
async function loadImage(src) {
  return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src;});
}
async function downloadCard(button) {
  if (!activeResult) return;
  const {c,result}=activeResult;
  button.disabled=true;
  try {
    const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=1450;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#101e27';ctx.fillRect(0,0,1000,1450);
    ctx.strokeStyle='#d9b97988';ctx.lineWidth=1.5;ctx.strokeRect(34,34,932,1382);ctx.strokeRect(44,44,912,1362);
    ctx.textAlign='center';ctx.fillStyle='#d9b979';ctx.font='19px sans-serif';ctx.fillText(t('pngBrand'),500,100);
    ctx.strokeStyle='#d9b97944';ctx.beginPath();ctx.arc(500,330,178,0,Math.PI*2);ctx.stroke();
    if(c.image){const img=await loadImage('./'+c.image);const scale=Math.min(380/img.width,330/img.height,img.width<150?2:Infinity);ctx.drawImage(img,500-img.width*scale/2,330-img.height*scale/2,img.width*scale,img.height*scale);}
    ctx.fillStyle=c.color;ctx.font='72px Georgia';ctx.fillText(c.type,500,590);
    ctx.fillStyle='#f1e9d8';ctx.font='bold 53px "Noto Serif SC", "Microsoft YaHei", serif';ctx.fillText(c.name,500,670,850);
    ctx.fillStyle='#d9b979';ctx.font='25px "Microsoft YaHei", sans-serif';ctx.fillText(c.title,500,720,850);
    ctx.font='25px "Noto Serif SC", serif';wrapText(ctx,`${t('quote',c.quote)}`,500,795,800,39);
    ctx.textAlign='left';ctx.fillStyle='#afbec0';ctx.font='21px "Microsoft YaHei", sans-serif';wrapText(ctx,c.summary,115,885,770,38);
    if(result){let y=1045;for(const d of result.dimensions){ctx.font='19px sans-serif';ctx.fillStyle='#d5d9cf';ctx.textAlign='left';ctx.fillText(`${d.left} ${d.pair[0]}  ${d.leftPercent}%`,115,y);ctx.textAlign='right';ctx.fillText(`${d.rightPercent}%  ${d.pair[1]} ${d.right}`,885,y);ctx.fillStyle='#3b525c';ctx.fillRect(115,y+15,770,7);ctx.fillStyle='#d9b979';ctx.fillRect(115,y+15,770*d.leftPercent/100,7);y+=64;}}
    else{ctx.textAlign='center';ctx.fillStyle='#a9b7b8';ctx.font='23px sans-serif';ctx.fillText(c.tags.join('   ·   '),500,1090,800);ctx.font='20px sans-serif';ctx.fillText(t('who'),500,1170);}
    ctx.textAlign='center';ctx.font='15px sans-serif';ctx.fillStyle='#8b9da2';ctx.fillText(`${result ? t('pngResult',result.length) : t('pngArchive')} · ${t('fanQuiz')}`,500,1350);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    if(!blob)throw new Error('No image');
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${t('brand')}-${c.type}-${c.name}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);toast(t('downloadSuccess'));
  } catch { toast(t('downloadError')); }
  finally { button.disabled=false; }
}
async function share() {
  if (!activeResult) return;
  const c=activeResult.c;
  const url=new URL(location.href);url.hash=`archive/${c.type}`;
  url.searchParams.set('lang', language());
  const text = t(activeResult.result ? 'shareMine' : 'shareArchive', c.name, c.type, c.title) + '\n' + url.href;
  try{await navigator.clipboard.writeText(text);toast(t('shareSuccess'));}
  catch{openDialog(`<h2 id="dialog-title">${t('shareTitle')}</h2><p>${t('shareNote')}</p><textarea readonly aria-label="${t('shareText')}" style="width:100%;height:130px;margin-top:18px;padding:14px;background:#101c24;color:#e8dec8;border:1px solid #d9b97955">${escapeHTML(text)}</textarea>`);dialog.querySelector('textarea').select();}
}

function render() {
  cancelJourney();
  if (dialog.open && dialog.querySelector('.room-preview')) dialog.close();
  document.querySelector('#question-dialog')?.close();
  disposeHomeMotion();
  disposeHomeMotion = () => {};
  const hash=location.hash || '#home';
  if(hash==='#test')renderQuiz();
  else if(hash==='#result')renderResult();
  else if(/^#archive\/[A-Z]{4}$/.test(hash))renderResult(hash.split('/')[1]);
  else if(hash==='#archive')renderArchive();
  else renderHome();
  if(hash!=='#test'){
    main.focus({preventScroll:true});
    window.scrollTo({top:0,behavior:'instant'});
  }
}

document.addEventListener('click',event=>{
  if(event.target.closest('.skip-link')){event.preventDefault();main.focus({preventScroll:true});main.scrollIntoView({block:'start'});return;}
  const el=event.target.closest('[data-action],[data-length],[data-filter]');if(!el)return;
  if(el.dataset.length){selectedLength=Number(el.dataset.length);renderHome();return;}
  if(el.dataset.filter){archiveFilter=el.dataset.filter;renderArchive();return;}
  switch(el.dataset.action){
    case 'start':start();break;
    case 'home':go('#home');break;
    case 'about':about();break;
    case 'close-dialog':dialog.close();break;
    case 'restart':openDialog(`<h2 id="dialog-title">${t('restartTitle')}</h2><p>${t('restartNote')}</p><div class="dialog-actions"><button class="primary" data-action="confirm-restart">${t('restart')}</button><button class="secondary" data-action="close-dialog">${t('keepClimb')}</button></div>`);break;
    case 'confirm-restart':dialog.close();start(true);break;
    case 'next':nextQuestion();break;
    case 'previous':visitQuestion(session.index-1);break;
    case 'open-question':openQuestion();break;
    case 'show-map':showJourneyMap();break;
    case 'inspect-room': {
      if (!session || journeyRun || location.hash !== '#test') break;
      const floor = Number(el.dataset.roomFloor);
      const key = roomForNode(el.dataset.roomKind, floor, session.mapSeed);
      openDialog(`<section class="room-preview">${roomSceneMarkup(key, floor, 'preview')}</section>`);
      bindMerchantStall(dialog);
      break;
    }
    case 'map-node':visitQuestion(Number(el.dataset.node));break;
    case 'review':session.index=0;save();go('#test');break;
    case 'download':downloadCard(el);break;
    case 'share':share();break;
    case 'replay':playMotion(document.querySelector('.motion-stage'));break;
  }
});
document.addEventListener('change',event=>{
  if(event.target.name==='answer'&&session&&!journeyRun&&!questionOpening&&document.querySelector('#question-dialog')?.open){
    clearTimeout(advanceTimer);
    session.answers[session.index]=Number(event.target.value);save();
    const done=session.answers.filter(a=>a!==null).length;
    document.querySelector('#next-question').disabled=false;
    document.querySelector('#answered-count').textContent=t('answered',done);
    const progress=document.querySelector('[role="progressbar"]');progress.setAttribute('aria-valuenow',done);progress.firstElementChild.style.width=`${done/session.length*100}%`;
    if(autoAdvance)advanceTimer=setTimeout(nextQuestion,330);
  }
  if(event.target.id==='auto-advance'&&!journeyRun&&!questionOpening){autoAdvance=event.target.checked;clearTimeout(advanceTimer);save();}
});
document.addEventListener('keydown',event=>{
  if(event.target.closest?.('[data-language]')) return;
  if(location.hash!=='#test'||dialog.open||journeyRun||questionOpening||!document.querySelector('#question-dialog')?.open||event.ctrlKey||event.metaKey||event.altKey)return;
  if(/^[1-5]$/.test(event.key)){event.preventDefault();const input=document.querySelectorAll('input[name="answer"]')[Number(event.key)-1];input.checked=true;input.dispatchEvent(new Event('change',{bubbles:true}));}
  if(event.key==='Enter'&&!event.target.closest('button,a')&&event.target.id!=='auto-advance'){event.preventDefault();nextQuestion();}
});
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
document.addEventListener('focusin', event => {
  if (event.target.matches('[data-language]')) clearTimeout(advanceTimer);
});
async function switchLanguage(select) {
  clearTimeout(advanceTimer);
  try {
    if (!await setLanguage(select.value)) return;
  } catch {
    select.value = language();
    toast(t('langError'));
    return;
  }
  rememberLanguage();
  CHARACTERS = localizedCharacters(sourceCharacters);
  updateShell();
  // Rebuild an open question in place. Preserve the chosen answer, merchant tray and scroll.
  const question = document.querySelector('#question-dialog');
  if (location.hash === '#test' && session) {
    const wasOpen = question?.open;
    const scroll = question?.querySelector('.question-shell')?.scrollTop || 0;
    const stallOpen = question?.querySelector('.stall-handle')?.getAttribute('aria-expanded') === 'true';
    const mapScroll = document.querySelector('.map-viewport')?.scrollTop;
    const travelling = Boolean(journeyRun);
    if (travelling && question?.dataset.departure === 'summit') { go('#result'); return; }
    cancelJourney();
    renderQuiz({open:travelling});
    if (wasOpen) {
      const next = document.querySelector('#question-dialog');
      next.showModal();
      if (stallOpen) next.querySelector('.stall-handle')?.click();
      next.querySelector('.question-shell').scrollTop = scroll;
      next.querySelector('[data-language]').focus({preventScroll:true});
    } else if (!travelling && mapScroll != null) {
      document.querySelector('.map-viewport').scrollTop = mapScroll;
    }
  } else {
    const scroll = window.scrollY;
    render();
    window.scrollTo({top:scroll, behavior:'instant'});
  }
  if (!document.querySelector('#question-dialog[open]')) document.querySelector('.site-header [data-language]')?.focus({preventScroll:true});
}
document.addEventListener('change', event => {
  if (event.target.matches('[data-language]')) switchLanguage(event.target);
});
try { await setLanguage(initialLanguage()); } catch { toast(t('langError')); }
CHARACTERS = localizedCharacters(sourceCharacters);
updateShell();
window.addEventListener('hashchange',render);
render();
