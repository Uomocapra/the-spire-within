import { t } from './i18n.js';
import {roomPreviews} from './ai-room-previews.js';

const rooms = {
  merchant: ['merchant.webp', '50% 54%'],
  rest: ['rest.webp', '48% 56%'],
  library: ['library.webp', '52% 52%'],
  fish: ['fish.webp', '50% 48%'],
  cleric: ['cleric.webp', '50% 45%'],
  ranwid: ['ranwid.webp', '54% 45%'],
  stone: ['stone.webp', '50% 46%'],
  neow: ['neow.webp', '55% 52%'],
  map: ['map.webp', '50% 53%'],
  relic: ['relic.webp', '50% 50%'],
  cards: ['cards.webp', '50% 50%'],
  snecko: ['snecko.webp', '56% 48%'],
  cultist: ['cultist.webp', '52% 48%'],
  lagavulin: ['lagavulin.webp', '59% 57%'],
  sentries: ['sentries.webp', '50% 50%'],
  guardian: ['guardian.webp', '52% 48%'],
  orbs: ['orbs.webp', '50% 46%'],
  summit: ['summit.webp', '50% 50%'],
};

// Match named places before using a scene from the node's general category.
const questionRooms = {
  1:'merchant', 2:'relic', 4:'map', 6:'map', 7:'cleric', 8:'cards', 9:'ranwid',
  14:'stone', 18:'map', 19:'neow', 22:'cards', 24:'summit', 26:'relic',
  28:'cards', 32:'cards', 34:'guardian', 38:'orbs', 40:'map', 42:'map', 44:'cards', 46:'relic', 48:'map',
};
const roomPools = {
  shop:['merchant'], fire:['rest'], summit:['summit'], event:['library','fish','stone','cleric'],
  battle:['snecko','cultist'], elite:['lagavulin','sentries'],
};

export function roomForNode(kind, floor, seed, questionId) {
  const pool = roomPools[kind];
  const hash = Math.imul(floor + 7, 2654435761) ^ Number(seed);
  const variant = (hash ^ (hash >>> 16)) >>> 0;
  return questionRooms[questionId] || pool[variant % pool.length];
}

// Keep the current scene and nearby rooms decoded for travel and backtracking.
const preparedRooms = new Map();
function encounterFile(key) {
  const hasPortrait = key === 'summit' || key === 'sentries';
  if (hasPortrait && globalThis.matchMedia?.('(max-aspect-ratio: 4/5)').matches) return `${key}-portrait.webp`;
  return rooms[key][0];
}
export function prepareRoom(key, priority = 'low', file = encounterFile(key)) {
  let entry = preparedRooms.get(file);
  if (entry) {
    preparedRooms.delete(file);
    preparedRooms.set(file, entry);
    if (priority === 'high') entry.image.fetchPriority = priority;
    return entry;
  }
  const image = new Image();
  image.alt = '';
  image.className = 'encounter-photo';
  image.decoding = 'async';
  image.fetchPriority = priority;
  entry = {image, ready:false};
  entry.decoded = new Promise(resolve => {
    image.onload = async () => {
      try { await image.decode?.(); entry.ready = true; } catch { /* The embedded scene is already visible. */ }
      resolve(entry.ready);
    };
    image.onerror = () => resolve(false);
  });
  preparedRooms.set(file, entry);
  if (preparedRooms.size > 4) preparedRooms.delete(preparedRooms.keys().next().value);
  entry.decoded.then(ready => {
    if (!ready && preparedRooms.get(file) === entry) preparedRooms.delete(file);
  });
  image.src = `./assets/ai-scenes/${file}`;
  return entry;
}

export function encounterMarkup(key, floor) {
  const [, focus] = rooms[key];
  const name = t('room_'+key);
  const file = encounterFile(key);
  return `<div class="encounter-stage" data-room="${key}" data-file="${file}" aria-hidden="true" style="--scene-focus:${focus}"><div class="encounter-visual"><img class="encounter-preview" src="${roomPreviews[file]}" alt=""></div><div class="encounter-caption"><span>${t('floor',String(floor).padStart(2,'0'))}</span><strong>${name}</strong></div></div>`;
}

export function mountEncounter(stage) {
  const entry = prepareRoom(stage.dataset.room, 'high', stage.dataset.file);
  function showPhoto() {
    if (entry.ready && stage.isConnected) stage.querySelector('.encounter-visual').append(entry.image);
  }
  if (entry.ready) showPhoto();
  else entry.decoded.then(() => { stage.classList.add('photo-upgrade'); showPhoto(); });
}

export function roomSceneMarkup(key, floor, view = 'question') {
  const [file, focus] = rooms[key];
  const name = t('room_'+key), description = t('alt_'+key);
  const location = `${t('floor',String(floor).padStart(2,'0'))}`;
  const returnButton = view === 'question' ? `<button type="button" class="room-return" data-action="show-map">${t('showMap')}</button>` : '';
  const picture = view === 'question' ? '' : `<img class="room-image" src="./assets/ai-scenes/${file}" alt="${description}" decoding="async">`;
  const sceneStyle = picture ? ` style="--room-focus:${focus};--scene-preview:url('${roomPreviews[file]}')"` : '';
  const stall = key === 'merchant' ? `<div class="stall-goods" id="stall-goods-${view}" hidden><img src="./assets/ai-scenes/merchant-wares.webp" alt="${t('stallAlt')}" loading="eager"></div><button class="stall-handle" type="button" aria-expanded="false" aria-controls="stall-goods-${view}"><span class="stall-grip" aria-hidden="true"></span><span class="stall-label">${t('stallOpen')}</span><span aria-hidden="true" class="stall-arrow">⌄</span></button>` : '';
  return `<figure class="room-scene room-scene-${view}" data-room="${key}"${sceneStyle}>${picture}<figcaption><span class="room-floor">${location}</span><strong${view === 'preview' ? ' id="dialog-title"' : ''}>${name}</strong></figcaption>${returnButton}${stall}</figure>`;
}

export function bindMerchantStall(root) {
  const handle = root.querySelector('.stall-handle');
  if (!handle) return;
  const goods = root.querySelector('.stall-goods');
  let pointerStart = null;
  let didDrag = false;
  function setOpen(open) {
    goods.hidden = !open;
    handle.setAttribute('aria-expanded', String(open));
    handle.querySelector('.stall-label').textContent = open ? t('stallClose') : t('stallOpen');
  }
  handle.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    pointerStart = event.clientY;
    didDrag = false;
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener('pointercancel', () => { pointerStart = null; didDrag = false; });
  handle.addEventListener('pointerup', event => {
    if (pointerStart === null) return;
    const distance = event.clientY - pointerStart;
    pointerStart = null;
    if (Math.abs(distance) >= 14) { setOpen(distance > 0); didDrag = true; }
  });
  handle.addEventListener('click', event => {
    if (didDrag && event.detail > 0) { didDrag = false; return; }
    setOpen(goods.hidden);
  });
}
