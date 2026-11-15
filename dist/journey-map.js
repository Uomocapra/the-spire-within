import { t } from './i18n.js';
// The path and the traveller use the same cubic curves at every viewport width.
const WIDTH = 600;
const STEP = 104;
const TOP = 112;
const BOTTOM = 128;
const running = new WeakMap();
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const safeLength = value => Math.max(0, Math.floor(Number(value) || 0));
const safeIndex = (value, length) => clamp(Math.floor(Number(value) || 0), 0, length);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
// Keep the first-game artwork intact, but render its pale screenshot paper as
// transparent alpha. This works inside the flipping card without blend layers.
let iconSerial = 0;
export function journeyIcon(kind) {
  const filterId = `map-icon-ink-${++iconSerial}`;
  const threshold = kind === 'summit' ? 2.76 : 3.45;
  return `<svg class="map-original-icon" viewBox="0 0 100 100" width="100" height="100" aria-hidden="true" focusable="false"><defs><filter id="${filterId}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -1.2756 -4.2912 -.4332 0 ${threshold}" result="ink"/><feFlood flood-color="currentColor"/><feComposite in2="ink" operator="in"/></filter></defs><image href="./assets/map/${kind}.png" width="100" height="100" filter="url(#${filterId})"/></svg>`;
}
const icon = journeyIcon;
export const JOURNEY_NODE_LABELS = Object.freeze({
  get battle() { return t('nodeBattle'); }, get event() { return t('nodeEvent'); },
  get elite() { return t('nodeElite'); }, get fire() { return t('nodeFire'); },
  get shop() { return t('nodeShop'); }, get summit() { return t('nodeSummit'); },
});
// Editorial map roles only. These sets never enter scoring or change the bank.
const CAMPFIRES = new Set([13,16,20,29,49]);
const SHOPS = new Set([12,30]);
const ELITES = new Set([15,19,24,35,40,41,43]);
const arrivalRing = '<svg class="map-arrival-ring" viewBox="0 0 80 80" aria-hidden="true" focusable="false"><path class="arrival-stroke" pathLength="100" d="M14 57C6 44 9 25 20 14C33 3 53 7 65 20C76 33 73 53 61 65C48 77 29 74 18 64"/><path class="arrival-brush" d="m13 57 3 5m1 1 7 5m-5-5 9 5"/></svg>';
const deadEnd = '<svg class="map-dead-end" viewBox="0 0 48 48" focusable="false"><path class="dead-end-stroke" d="M10 8C17 17 28 28 38 39M37 9C28 18 18 28 9 38"/><path class="dead-end-brush" d="m8 10 4 5m20 19 6 3M37 6l-2 5M11 33l-4 6"/></svg>';

function normalizeSeed(value) {
  const seed = Number(value);
  return Number.isSafeInteger(seed) && seed > 0 ? (seed >>> 0) || 1 : 1;
}

function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ state >>> 15, 1 | state);
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function curveControls(point, next) {
  const dx = next.x - point.x, dy = next.y - point.y;
  return [{x: point.x + dx * .25, y: point.y + dy * .32}, {x: point.x + dx * .75, y: point.y + dy * .68}];
}

function segmentPath(point, next) {
  const [a, b] = curveControls(point, next);
  return `M${point.x} ${point.y}C${a.x} ${a.y} ${b.x} ${b.y} ${next.x} ${next.y}`;
}

function laneAssignments(lanes, count) {
  if (!count) return [[]];
  return lanes.flatMap(lane => laneAssignments(lanes.filter(value => value !== lane), count - 1).map(tail => [lane, ...tail]));
}

function branchLayout(points, rows, length, random) {
  if (length < 12) return [];
  const gaps = [2, 3, 4, 5, 6, 7, 8];
  const kinds = ['battle', 'event', 'battle', 'event', 'fire', 'shop', 'elite'];
  // Three alternate walks plus the main route: at most four lines at any height.
  const branches = Array.from({length: 3}, (_, branchIndex) => {
    const endFloor = length - gaps.splice(Math.floor(random() * gaps.length), 1)[0];
    const startIndex = Math.min(endFloor - 3, branchIndex === 0 ? 0 : branchIndex * 2 + Math.floor(random() * 2));
    return {startIndex, endIndex: endFloor - 1, endFloor, points: [], crossTurn: Math.round(random() * 18 - 9)};
  });
  let nextJunction = 4 + Math.floor(random() * 2);
  for (let index = 0; index < length; index++) {
    const main = points[index];
    const active = branches.filter(branch => branch.startIndex < index && branch.endIndex >= index);
    const lanes = [0, 1, 2, 3].filter(lane => lane !== main.lane);
    const choices = laneAssignments(lanes, active.length).map(assignment => ({assignment, cost: assignment.reduce((total, lane, i) => {
      const distance = Math.abs(lane - active[i].points.at(-1).lane);
      return total + distance * .65 + Math.max(0, distance - 1) * 3 + random() * 1.8;
    }, 0)}));
    choices.sort((a, b) => a.cost - b.cost);
    const assignment = choices[0].assignment;
    active.forEach((branch, i) => {
      const point = rows[index][assignment[i]];
      branch.points.push({...point, kind: index < branch.endIndex ? kinds[Math.floor(random() * kinds.length)] : null});
    });
    for (const branch of branches.filter(branch => branch.startIndex === index)) branch.points.push({...main, kind: null});
    // Share a real node, then fan out on a later row. Do not merge death markers.
    if (index >= nextJunction) {
      const candidates = active.filter(branch => branch.startIndex + 1 < index && branch.endIndex - 1 > index);
      if (candidates.length) {
        const source = candidates[Math.floor(random() * candidates.length)], point = source.points.at(-1);
        const targets = [main, ...candidates.filter(branch => branch !== source).map(branch => branch.points.at(-1))];
        targets.sort((a, b) => Math.abs(a.lane - point.lane) - Math.abs(b.lane - point.lane));
        const target = targets[0];
        point.x = target.x; point.y = target.y; point.lane = target.lane;
        point.junction = true;
      }
      nextJunction = index + 3 + Math.floor(random() * 3);
    }
  }
  return branches.map(branch => ({...branch, segments: branch.points.slice(0, -1).map((point, i) => segmentPath(point, branch.points[i + 1]))}));
}

export function journeyLayout(length, seed = 1) {
  length = safeLength(length);
  seed = normalizeSeed(seed);
  const random = seededRandom(seed);
  // The route visits the full parchment, with random pauses and hand-drawn drift.
  const rows = Array.from({length}, (_, index) => [90, 230, 370, 510].map((x, lane) => ({
    index, floor: index + 1, lane,
    x: x + Math.round(random() * 36 - 18),
    y: TOP + (length - index) * STEP + Math.round(random() * 20 - 10),
  })));
  let lane = Math.floor(random() * 4), direction = lane < 2 ? 1 : -1, pauses = 0;
  const points = rows.map(row => {
    const point = {...row[lane]};
    if (lane === 0) direction = 1;
    else if (lane === 3) direction = -1;
    if (pauses < 2 && random() < .28) pauses++;
    else { lane += direction; pauses = 0; }
    return point;
  });
  points.push({index: length, floor: length + 1, lane: null, x: 300, y: TOP});
  const segments = points.slice(0, -1).map((point, index) => segmentPath(point, points[index + 1]));
  return {width: WIDTH, height: TOP + length * STEP + BOTTOM, seed, points, segments, branches: branchLayout(points, rows, length, random)};
}

export function journeyNodeKind(question) {
  if (CAMPFIRES.has(question?.id)) return 'fire';
  if (SHOPS.has(question?.id)) return 'shop';
  if (ELITES.has(question?.id)) return 'elite';
  return question?.kind === 'spire' ? 'battle' : 'event';
}

export function journeyPoint(length, from, to = from, progress = 0, seed = 1) {
  const layout = journeyLayout(length, seed);
  return pointOnLayout(layout, from, to, progress);
}

function pointOnLayout(layout, from, to, progress) {
  const length = layout.points.length - 1;
  const cursor = safeIndex(from, length) + (safeIndex(to, length) - safeIndex(from, length)) * clamp(Number(progress) || 0, 0, 1);
  const index = Math.floor(cursor);
  const a = layout.points[index];
  const b = layout.points[Math.min(index + 1, length)];
  const t = cursor - index;
  const u = 1 - t;
  const [c1, c2] = curveControls(a, b);
  return {
    x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x,
    y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y,
  };
}

export function journeyMapMarkup(questions, currentIndex, answers = [], seed = 1) {
  questions = Array.isArray(questions) ? questions : [];
  const length = questions.length;
  const layout = journeyLayout(length, seed);
  const answered = questions.map((_, index) => answers?.[index] !== null && answers?.[index] !== undefined);
  const firstMissing = answered.indexOf(false);
  const frontier = firstMissing < 0 ? length : firstMissing;
  let current = safeIndex(currentIndex, length);
  if (current > frontier && !answered[current]) current = frontier;
  const count = answered.filter(Boolean).length;
  const nodes = layout.points.map(point => {
    const finish = point.index === length;
    const question = questions[point.index];
    const done = !finish && answered[point.index];
    const enabled = finish ? frontier === length : done || point.index === frontier;
    const kind = finish ? 'summit' : journeyNodeKind(question);
    const title = finish ? t('meetSoul') : question.title || t('questionN',point.index + 1);
    const subtitle = finish ? t('summit') : `${t('floor',String(point.index + 1).padStart(2,'0'))} · ${JOURNEY_NODE_LABELS[kind]}`;
    const status = point.index === current ? t('currentStop') : done ? t('visited') : enabled ? t('available') : t('unreached');
    return `<button type="button" class="map-node map-node-${kind}${done ? ' is-answered' : ''}${point.index === current ? ' is-current' : ''}${finish ? ' is-finish' : ''}" data-action="map-node" data-node="${point.index}" data-map-title="${escapeHTML(title)}" data-map-subtitle="${escapeHTML(subtitle)}" style="left:${point.x / WIDTH * 100}%;top:${point.y}px" aria-label="${escapeHTML(`${subtitle} · ${title} · ${status}`)}"${point.index === current ? ' aria-current="step"' : ''}${enabled ? '' : ' disabled'}><span class="map-node-symbol">${icon(kind)}</span>${arrivalRing}</button>`;
  }).join('');
  const paths = layout.segments.map((path, index) => `<path class="map-route${index < frontier ? ' is-walked' : ''}" data-route="${index}" d="${path}"/>`).join('');
  const drawnPaths = new Set(layout.segments);
  const branchPaths = layout.branches.flatMap(branch => branch.segments).filter(path => {
    if (drawnPaths.has(path)) return false;
    drawnPaths.add(path); return true;
  }).map(path => `<path class="map-branch-route" d="${path}"/>`).join('');
  const drawnNodes = new Set(layout.points.map(point => `${point.x},${point.y}`));
  const branchArt = layout.branches.map(branch => {
    const stops = branch.points.filter(point => {
      const key = `${point.x},${point.y}`;
      if (!point.kind || drawnNodes.has(key)) return false;
      drawnNodes.add(key); return true;
    }).map(point => `<button type="button" class="map-branch-spot" style="left:${point.x / WIDTH * 100}%;top:${point.y}px" data-action="inspect-room" data-room-kind="${point.kind}" data-room-floor="${point.floor}" aria-label="${t('branchPreview',point.floor,JOURNEY_NODE_LABELS[point.kind])}">${icon(point.kind)}</button>`).join('');
    const end = branch.points.at(-1);
    return `${stops}<span class="map-branch-stop" aria-hidden="true" data-end-floor="${branch.endFloor}" style="left:${end.x / WIDTH * 100}%;top:${end.y}px;--cross-turn:${branch.crossTurn}deg">${deadEnd}</span>`;
  }).join('');
  // Clear the same amount of route around main and branch icons.
  const maskId = `map-path-clearance-${length}-${layout.seed}`;
  const clearance = layout.points.map(point => `<ellipse cx="${point.x}" cy="${point.y}" rx="${point.index === length ? 25 : 21}" ry="${point.index === length ? 22.5 : 18.5}"/>`).join('') + layout.branches.flatMap(branch => branch.points.filter(point => point.kind)).map(point => `<ellipse cx="${point.x}" cy="${point.y}" rx="21" ry="18.5"/>`).join('');
  const routeMask = `<defs><mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="${WIDTH}" height="${layout.height}"><rect width="${WIDTH}" height="${layout.height}" fill="white"/><g fill="black">${clearance}</g></mask></defs>`;
  const mountainMarks = [60, 473].map(x => `<g transform="translate(${x} 74)"><path d="m0 38 20-35 22 35m-26-26 4 7 5-5m13 24 18-24 18 24m-23-16 5 5 4-3"/><path d="M-5 43h84"/></g>`).join('');
  const currentTitle = questions[current]?.title || t('meetSoul');
  const currentSubtitle = current === length ? t('summit') : `${t('floor',String(current + 1).padStart(2,'0'))} · ${JOURNEY_NODE_LABELS[journeyNodeKind(questions[current])]}`;
  const initial = layout.points[current];
  return `<div class="spire-map" data-current-node="${current}" data-map-seed="${layout.seed}"><div class="map-heading"><div><span class="map-kicker">${t('currentStop')} · <span class="map-active-subtitle">${escapeHTML(currentSubtitle)}</span></span><h2 class="map-active-title">${escapeHTML(currentTitle)}</h2></div><span class="map-count" aria-label="${t('countTotal',count,length)}"><b>${count}</b><span> / ${length}</span></span></div><div class="map-viewport" role="region" tabindex="0" aria-label="${t('mapRegion')}"><div class="map-canvas" style="height:${layout.height}px"><svg class="map-paths" viewBox="0 0 ${WIDTH} ${layout.height}" preserveAspectRatio="none" aria-hidden="true" focusable="false">${routeMask}<g class="map-mountains">${mountainMarks}</g><g mask="url(#${maskId})"><g class="map-branches">${branchPaths}</g>${paths}</g></svg><div class="map-summit-label" aria-hidden="true"><span>${t('summit')}</span><strong>${t('meetSoul')}</strong></div>${nodes}<div class="map-branch-art" role="group" aria-label="${t('branches')}">${branchArt}</div><div class="map-player" style="left:${initial.x / WIDTH * 100}%;top:${initial.y}px" aria-hidden="true"><svg viewBox="0 0 30 40" fill="none" focusable="false"><path class="map-player-shadow" d="M4 36q11-5 22 0-11 5-22 0Z"/><path class="map-player-cloak" d="M15 4c-6 0-8 6-8 12L3 33q12 6 24 0l-4-17c0-6-2-12-8-12Z"/><path class="map-player-face" d="M10 14q5-6 10 0l-1 7h-8Z"/><path d="m9 25-2 8m14-8 2 8M12 37v2m6-2v2"/></svg></div><div class="map-origin" aria-hidden="true"><span>${t('origin')}</span><i>${t('climbUp')}</i></div></div></div><div class="map-legend" aria-label="${t('legend')}">${['event', 'battle', 'elite', 'fire', 'shop'].map(kind => `<span>${icon(kind)}${JOURNEY_NODE_LABELS[kind]}</span>`).join('')}</div><p class="map-footnote">${t('inkHint')}</p></div>`;
}

function placePlayer(root, point) {
  const marker = root?.querySelector?.('.map-player');
  if (!marker) return;
  marker.style.left = `${point.x / WIDTH * 100}%`;
  marker.style.top = `${point.y}px`;
}

function scrollPosition(viewport, layout, point) {
  const height = viewport.clientHeight || 480;
  return clamp(point.y - height * .72, 0, Math.max(0, layout.height - height));
}

function setCurrent(root, index) {
  if (root.dataset) root.dataset.currentNode = String(index);
  for (const node of root.querySelectorAll?.('.map-node') || []) {
    const current = Number(node.dataset.node) === index;
    node.classList.toggle('is-current', current);
    if (current) {
      node.setAttribute('aria-current', 'step');
      const title = root.querySelector('.map-active-title');
      const subtitle = root.querySelector('.map-active-subtitle');
      if (title) title.textContent = node.dataset.mapTitle;
      if (subtitle) subtitle.textContent = node.dataset.mapSubtitle;
    } else node.removeAttribute('aria-current');
  }
}

export function positionJourney(root, length, index, {scroll = true} = {}) {
  if (!root) return;
  running.get(root)?.();
  const layout = journeyLayout(length, root.dataset?.mapSeed);
  index = safeIndex(index, layout.points.length - 1);
  const point = layout.points[index];
  placePlayer(root, point);
  setCurrent(root, index);
  const viewport = root.querySelector?.('.map-viewport');
  if (scroll && viewport) viewport.scrollTop = scrollPosition(viewport, layout, point);
}

export function drawArrivalRing(root, index, signal) {
  if (signal.aborted || !root.isConnected) return Promise.resolve(false);
  const node = root.querySelector(`[data-node="${index}"]`);
  const stroke = node?.querySelector('.arrival-stroke');
  const view = root.ownerDocument.defaultView;
  const motion = view.matchMedia?.('(prefers-reduced-motion: reduce)');
  if (!stroke || motion?.matches) return Promise.resolve(true);
  // On short screens the map's internal viewport can extend below the window.
  const rect = node.getBoundingClientRect();
  if (rect.top < 12 || rect.bottom > view.innerHeight - 12) {
    node.scrollIntoView({block:'center', inline:'nearest', behavior:'instant'});
  }
  return new Promise(resolve => {
    let timer, settled = false;
    const finish = success => {
      if (settled) return;
      settled = true;
      view.clearTimeout(timer);
      stroke.removeEventListener('animationend', onEnd);
      signal.removeEventListener('abort', cancel);
      motion?.removeEventListener?.('change', onPreference);
      node.classList.remove('is-inking');
      resolve(success && root.isConnected && !signal.aborted);
    };
    const cancel = () => finish(false);
    const onEnd = event => { if (event.animationName === 'map-circle-arrive') finish(true); };
    const onPreference = () => { if (motion.matches) finish(true); };
    signal.addEventListener('abort', cancel, {once:true});
    motion?.addEventListener?.('change', onPreference);
    stroke.addEventListener('animationend', onEnd);
    node.classList.add('is-inking');
    const drawing = stroke.getAnimations?.().find(animation => animation.animationName === 'map-circle-arrive');
    if (drawing?.finished) {
      drawing.finished.then(() => {
        // animationend normally runs in the same paint cycle. Give its handler
        // first turn before recovering from a missing event.
        if (!settled) timer = view.setTimeout(() => finish(true), 80);
      }, () => finish(true));
    } else timer = view.setTimeout(() => finish(true), 850);
  });
}

export function animateJourney(root, length, from, to, {signal, duration = 900} = {}) {
  if (!root) return Promise.resolve(false);
  running.get(root)?.();
  if (signal?.aborted || root.isConnected === false) return Promise.resolve(false);
  const view = root.ownerDocument?.defaultView;
  const reduced = view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const layout = journeyLayout(length, root.dataset?.mapSeed);
  from = safeIndex(from, layout.points.length - 1);
  to = safeIndex(to, layout.points.length - 1);
  if (reduced || from === to || !(duration > 0) || !Number.isFinite(duration) || !view?.requestAnimationFrame || !view?.cancelAnimationFrame) {
    positionJourney(root, length, to);
    return Promise.resolve(true);
  }
  const viewport = root.querySelector?.('.map-viewport');
  placePlayer(root, layout.points[from]);
  if (viewport) viewport.scrollTop = scrollPosition(viewport, layout, layout.points[from]);
  root.classList.add('is-traveling');
  root.setAttribute('aria-busy', 'true');
  return new Promise(resolve => {
    let frame = null;
    let started = null;
    let settled = false;
    const finish = success => {
      if (settled) return;
      settled = true;
      if (frame !== null) view.cancelAnimationFrame(frame);
      signal?.removeEventListener('abort', cancel);
      root.classList.remove('is-traveling');
      root.removeAttribute('aria-busy');
      if (running.get(root) === cancel) running.delete(root);
      if (success) {
        placePlayer(root, layout.points[to]);
        setCurrent(root, to);
        if (viewport) viewport.scrollTop = scrollPosition(viewport, layout, layout.points[to]);
      }
      resolve(success);
    };
    const cancel = () => finish(false);
    const tick = timestamp => {
      frame = null;
      if (settled) return;
      if (signal?.aborted || root.isConnected === false) { finish(false); return; }
      if (started === null) started = timestamp;
      const progress = clamp((timestamp - started) / duration, 0, 1);
      const eased = progress * progress * (3 - 2 * progress);
      const point = pointOnLayout(layout, from, to, eased);
      placePlayer(root, point);
      if (viewport) viewport.scrollTop = scrollPosition(viewport, layout, point);
      if (progress === 1) finish(true);
      else frame = view.requestAnimationFrame(tick);
    };
    running.set(root, cancel);
    signal?.addEventListener('abort', cancel, {once: true});
    if (signal?.aborted) { finish(false); return; }
    frame = view.requestAnimationFrame(tick);
  });
}
