import { t } from './i18n.js';
// Original motion illustrations inspired by character actions.
// These use the existing still portraits, not extracted game animation frames.
const spark = (x, y, size = 6) => `<path d="M${x - size} ${y}h${size * 2}M${x} ${y - size}v${size * 2}"/>`;
const ring = (r, className = '') => `<circle class="${className}" cx="160" cy="160" r="${r}"/>`;
const svg = (content, layer = '') => `<svg class="motion-effects${layer ? ` ${layer}` : ''}" viewBox="0 0 320 320" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${content}</svg>`;

const MOTIONS = {
  ESTP: {
    label: 'motionIron',
    backArt: `<defs><radialGradient id="ironclad-heat"><stop stop-color="#f2b46f" stop-opacity=".35"/><stop offset=".55" stop-color="#b9583d" stop-opacity=".18"/><stop offset="1" stop-color="#b9583d" stop-opacity="0"/></radialGradient></defs>
      <g class="m-iron-heat"><ellipse cx="198" cy="178" rx="138" ry="141" fill="url(#ironclad-heat)" stroke="none"/></g>
      <g class="m-iron-aura"><path d="M159 257c-45-29-57-76-37-120-1 32 24 37 23 59 12-12 12-28 12-41 22 35 20 69 2 102Zm73 2c34-33 34-77 16-104 4 30-16 36-17 59-10-18-11-28-8-43-19 26-15 67 9 88Z"/></g>
      <g class="m-iron-ground"><ellipse cx="199" cy="270" rx="85" ry="13"/><path d="M115 270q29-17 84-14t84 14"/></g>
      <g class="m-iron-dust"><path d="M100 263c-19-18-31-9-28 1-21-11-32-2-22 7 37 12 74 9 111-1m61-3c28-9 42-17 48-9 23-10 37 4 28 12-25 12-46 9-69 6"/></g>`,
    art: `<defs><linearGradient id="ironclad-cut" x1="0" y1="0" x2=".65" y2="1"><stop stop-color="#fff2c9" stop-opacity=".72"/><stop offset=".35" stop-color="#ffc77d" stop-opacity=".55"/><stop offset="1" stop-color="#d65a35" stop-opacity="0"/></linearGradient></defs>
      <g class="m-iron-edge-charge"><path d="m27 113 154 9"/><path d="m35 117 129 8"/>${spark(57, 114, 3)}${spark(155, 120, 2)}</g>
      <g class="m-sword-cut"><path class="m-cut-wide" d="M48 72C18 137 54 216 175 258 94 243 29 188 24 138 22 114 29 91 48 72Z"/><path class="m-cut-edge" pathLength="1" d="M45 82C18 144 69 225 176 258"/><path class="m-cut-inner" pathLength="1" d="M58 103C45 155 90 213 157 240"/></g>
      <g class="m-iron-impact"><path d="m78 222-15-16m18 25-26-3m30 8-12 14m19-11 2 19m8-21 14 10"/><path class="m-iron-impact-core" d="m87 216 5 12 12 5-12 4-5 13-4-13-13-4 13-5Z"/></g>
      <g class="m-fire-sparks">${spark(55, 172, 3)}${spark(121, 244, 3)}${spark(167, 257, 2)}<path d="m40 217-7-3m72 43-3 7m80-36 5 8m-34-79-2-7"/></g>
      <g class="m-iron-cinders"><circle cx="93" cy="237" r="2"/><circle cx="135" cy="264" r="2.5"/><circle cx="219" cy="249" r="1.5"/><circle cx="246" cy="225" r="2"/><circle cx="181" cy="197" r="1.5"/></g>`,
  },
  ISTP: {
    label: 'motionSilent',
    art: `<g class="m-poison"><ellipse cx="160" cy="247" rx="83" ry="16"/><ellipse cx="177" cy="242" rx="57" ry="11"/></g>
      <g class="m-dagger m-dagger-one"><path class="m-blade" d="m75 204 104-88-77 113-10-20Z"/><path d="m78 218-16 19m8-24 27 18"/></g>
      <g class="m-dagger m-dagger-two"><path class="m-blade" d="m238 209-96-91 70 115 10-21Z"/><path d="m236 223 16 17m-8-22-27 17"/></g>
      <g class="m-poison-motes"><circle cx="91" cy="232" r="4"/><circle cx="218" cy="248" r="3"/><circle cx="127" cy="257" r="2"/><circle cx="245" cy="219" r="2"/></g>`,
  },
  INTP: {
    label: 'motionDefect',
    art: `<g class="m-orbit-track"><ellipse cx="160" cy="159" rx="117" ry="55" transform="rotate(-20 160 159)"/></g>
      <g class="m-orbs"><g class="m-orb m-orb-lightning"><circle cx="61" cy="188" r="14"/><path d="m62 179-5 9h7l-5 9"/></g><g class="m-orb m-orb-frost"><circle cx="215" cy="106" r="12"/>${spark(215, 106, 6)}<path d="m211 102 8 8m0-8-8 8"/></g><g class="m-orb m-orb-dark"><circle cx="264" cy="168" r="13"/><circle cx="264" cy="168" r="6"/></g></g>
      <path class="m-lightning" d="m78 177 29-23-4 21 39-24-11 23 41-25m40-30-15 29 19-5-12 24"/>`,
  },
  INFJ: {
    label: 'motionWatcher',
    backArt: `<defs>
        <radialGradient id="watcher-calm-glow"><stop stop-color="#88cfe9" stop-opacity=".3"/><stop offset=".6" stop-color="#6b9aca" stop-opacity=".13"/><stop offset="1" stop-color="#6b9aca" stop-opacity="0"/></radialGradient>
        <radialGradient id="watcher-wrath-glow"><stop stop-color="#ffc48c" stop-opacity=".42"/><stop offset=".5" stop-color="#e25e6c" stop-opacity=".24"/><stop offset="1" stop-color="#a54585" stop-opacity="0"/></radialGradient>
      </defs>
      <g class="m-watcher-calm-glow"><circle cx="160" cy="161" r="145" fill="url(#watcher-calm-glow)" stroke="none"/></g>
      <g class="m-calm"><ellipse cx="160" cy="249" rx="105" ry="23"/><ellipse cx="160" cy="249" rx="80" ry="14"/><path d="M75 226C44 183 64 112 103 89M245 226c31-43 11-114-28-137"/></g>
      <g class="m-watcher-breath"><path d="M54 214C28 154 87 72 140 69M266 214c26-60-33-142-86-145"/><path d="M67 228C33 165 71 83 123 65M253 228c34-63-4-145-56-163"/></g>
      <g class="m-watcher-wrath-glow"><circle cx="160" cy="166" r="153" fill="url(#watcher-wrath-glow)" stroke="none"/></g>
      <g class="m-wrath"><path class="m-watcher-flame" d="M91 249C24 207 37 124 81 70c-12 52 32 56 17 98 19-15 16-39 29-56-6 50 11 84 33 137Zm138 0c67-42 54-125 10-179 12 52-32 56-17 98-19-15-16-39-29-56 6 50-11 84-33 137Z"/><path d="M72 226C39 178 65 127 70 115M248 226c33-48 7-99 2-111"/></g>
      <g class="m-watcher-shockwave"><ellipse cx="160" cy="244" rx="112" ry="29"/><ellipse cx="160" cy="244" rx="91" ry="20"/></g>`,
    art: `<g class="m-lotus"><path class="m-watcher-petal m-watcher-petal-left" d="M160 249c-41 1-61-16-62-37 33-4 54 13 62 37Z"/><path class="m-watcher-petal m-watcher-petal-right" d="M160 249c41 1 61-16 62-37-33-4-54 13-62 37Z"/><path d="M160 249c-29-17-30-37 0-63 30 26 29 46 0 63Z"/><path d="M114 252q46 13 92 0"/></g>
      <g class="m-watcher-motes"><circle cx="76" cy="208" r="2"/><circle cx="105" cy="132" r="1.5"/><circle cx="237" cy="181" r="2.5"/><circle cx="214" cy="103" r="1.5"/><circle cx="133" cy="76" r="2"/></g>
      <g class="m-watcher-strike"><path class="m-watcher-strike-wide" d="M35 208C101 228 237 180 284 99 263 187 116 251 35 208Z"/><path class="m-watcher-strike-edge" pathLength="1" d="M35 208C114 240 255 167 284 99"/><path class="m-watcher-strike-echo" pathLength="1" d="M51 226C133 249 245 194 278 141"/></g>
      <g class="m-watcher-embers">${spark(77, 234, 3)}${spark(254, 158, 4)}${spark(211, 240, 3)}<path d="m61 178-8-4m200-53 5-8m-18 99 10 5m-99 36-2 8"/></g>`,
  },
  INTJ: {
    label: 'motionTime',
    art: `<g class="m-clock"><circle cx="160" cy="158" r="116"/><circle cx="160" cy="158" r="108"/><path d="M160 49v11m0 196v11M51 158h11m196 0h11M83 81l8 8m138 138 8 8M83 235l8-8M229 89l8-8M106 64l5 9m98 170 5 9M66 104l9 5m170 98 9 5M66 212l9-5m170-98 9-5M106 252l5-9m98-170 5-9"/><g class="m-clock-hand"><path d="M160 158V78m0 80 53 31"/><circle cx="160" cy="158" r="4"/></g></g>
      <g class="m-time-lock"><path d="M141 140v36m12-36v36m14-36v36m12-36v36"/><path d="M100 119v-17h17m86 0h17v17m0 78v17h-17m-86 0h-17v-17"/></g>`,
  },
  ENTJ: {
    label: 'motionCollector',
    art: `<g class="m-summon-ring"><ellipse cx="160" cy="252" rx="104" ry="24"/><ellipse cx="160" cy="252" rx="89" ry="16"/><path d="m64 252 96-24 96 24-96 24Z"/></g>
      <g class="m-torch m-torch-left"><path class="m-torch-fire" d="M68 180c-25-14-14-33-3-41-3 13 13 12 9-10 25 27 13 46-6 51Z"/><path d="m55 179 26 0-5 16H61Zm7 16-4 40h20l-6-40m-13 13-11 14m26-14 11 14"/><path d="m62 170 4 2m8-2-4 2"/></g>
      <g class="m-torch m-torch-right"><path class="m-torch-fire" d="M252 180c-25-14-14-33-3-41-3 13 13 12 9-10 25 27 13 46-6 51Z"/><path d="m239 179 26 0-5 16h-15Zm7 16-4 40h20l-6-40m-13 13-11 14m26-14 11 14"/><path d="m246 170 4 2m8-2-4 2"/></g>`,
  },
  ENTP: {
    label: 'motionMerchant',
    art: `<path class="m-coin-trail" d="M222 224Q257 100 205 65"/>
      <g class="m-coin"><circle cx="218" cy="120" r="17"/><circle cx="218" cy="120" r="12"/><path d="m218 112 5 8-5 8-5-8Z"/></g>
      <g class="m-coin-glints">${spark(187, 77, 7)}${spark(252, 107, 5)}${spark(248, 176, 4)}</g>
      <g class="m-market-cards"><path d="m72 211 22-4 7 35-22 4Zm28-3 23 2-3 36-23-2Z"/><path d="m85 223 6 5-4 7-6-5Zm22 2 8 1m-9 7 8 1"/></g>`,
  },
  INFP: {
    label: 'motionNeow',
    art: `<g class="m-blessing-ring">${ring(81)}${ring(106)}</g>
      <g class="m-blessing-stars">${spark(88, 103, 7)}${spark(234, 91, 6)}${spark(251, 199, 7)}${spark(74, 218, 5)}${spark(188, 259, 4)}</g>
      <g class="m-neow-light"><path d="M160 86v-28m-15 16 15-16 15 16"/><path d="M138 63q22-14 44 0"/><ellipse cx="160" cy="255" rx="92" ry="17"/></g>`,
  },
  ENFJ: {
    label: 'motionDonu',
    art: `<g class="m-strength-ring">${ring(86)}${ring(98)}<path d="m160 55 8 14-8 14-8-14Zm105 105-14 8-14-8 14-8ZM160 265l-8-14 8-14 8 14ZM55 160l14-8 14 8-14 8Z"/></g>
      <g class="m-strength-up"><path d="m78 210 0-33m-10 10 10-10 10 10m144 23v-33m-10 10 10-10 10 10"/><path d="m119 98 0-22m-7 7 7-7 7 7m75 15V76m-7 7 7-7 7 7"/></g>`,
  },
  ISFJ: {
    label: 'motionDeca',
    art: `<g class="m-shield"><path class="m-shield-fill" d="M160 66 249 103v70c0 47-48 80-89 101-41-21-89-54-89-101v-70Z"/><path d="M160 79 238 111v61c0 39-42 70-78 89-36-19-78-50-78-89v-61Z"/><path d="m126 164 23 23 45-50"/></g>
      <g class="m-shield-sparks">${spark(60, 130, 6)}${spark(258, 185, 5)}${spark(215, 80, 4)}</g>`,
  },
  ISTJ: {
    label: 'motionGuard',
    art: `<g class="m-shell"><path class="m-shell-plate m-shell-top" d="m160 65 68 40-9 21-59-20-59 20-9-21Z"/><path class="m-shell-plate m-shell-left" d="m83 112 20 20-5 55 31 45-15 19-53-48Z"/><path class="m-shell-plate m-shell-right" d="m237 112-20 20 5 55-31 45 15 19 53-48Z"/><path class="m-shell-plate m-shell-bottom" d="m125 241 35 14 35-14 9 22-44 17-44-17Z"/></g>
      <g class="m-shell-spikes"><path d="m160 67 0-22m-82 68-18-12m182 12 18-12M69 203l-20 8m202-8 20 8m-141 55-8 19m68-19 8 19"/></g>`,
  },
  ESTJ: {
    label: 'motionRally',
    art: `<g class="m-rally-rays"><path d="M133 75 119 53m68 22 14-22M112 93 89 82m119 11 23-11"/><path d="M150 65v-18m20 18v-18"/></g>
      <g class="m-gremlin m-gremlin-left"><path d="m62 205-11-19 18 7q12-5 22 0l18-7-11 19v18q-18 16-36 0Z"/><path d="m69 209 5 2m10 0 6-2m-15 10h7m-14 13-5 16m27-16 5 16"/><path class="m-rally-up" d="M80 179v-23m-7 7 7-7 7 7"/></g>
      <g class="m-gremlin m-gremlin-right"><path d="m222 205-11-19 18 7q12-5 22 0l18-7-11 19v18q-18 16-36 0Z"/><path d="m229 209 5 2m10 0 6-2m-15 10h7m-14 13-5 16m27-16 5 16"/><path class="m-rally-up" d="M240 179v-23m-7 7 7-7 7 7"/></g>`,
  },
  ESFJ: {
    label: 'motionCleric',
    art: `<g class="m-heal-halo"><circle cx="160" cy="157" r="93"/><circle cx="160" cy="157" r="102"/></g>
      <g class="m-heal-heart"><path d="M160 93c-30-20-30-45-10-45 7 0 10 4 10 8 0-4 3-8 10-8 20 0 20 25-10 45Z"/></g>
      <g class="m-heal-sparks">${spark(79, 202, 8)}${spark(239, 219, 9)}${spark(219, 98, 6)}${spark(105, 254, 5)}${spark(189, 259, 6)}</g>`,
  },
  ENFP: {
    label: 'motionPotion',
    art: `<g class="m-potion"><path class="m-potion-liquid" d="M206 201q16 7 33 0l9 19q4 14-25 14t-25-14Z"/><path d="M214 178h18m-16 1v14l-16 24q-11 22 23 22t23-22l-16-24v-14m-15-6h16v7h-16Z"/><path d="m207 215 5-8"/></g>
      <g class="m-potion-bubbles"><circle cx="220" cy="157" r="5"/><circle cx="240" cy="135" r="7"/><circle cx="212" cy="111" r="3"/><circle cx="248" cy="95" r="4"/></g>
      <g class="m-discovery">${spark(82, 131, 7)}${spark(105, 217, 5)}${spark(255, 177, 5)}<path d="M88 166q-9-7-1-14 8-6 12 2 3 5-4 11v4m0 7v1"/></g>`,
  },
  ISFP: {
    label: 'motionFace',
    art: `<g class="m-mask m-mask-left"><path class="m-mask-fill" d="M58 121q28 12 56 0v35q-1 28-28 40-27-12-28-40Z"/><path d="m68 147 10 3m16 0 10-3m-28 20q10 11 20 0"/></g>
      <g class="m-mask m-mask-right"><path class="m-mask-fill" d="M206 121q28 12 56 0v35q-1 28-28 40-27-12-28-40Z"/><path d="m216 150 10-3m16 0 10 3m-28 24q10-11 20 0"/></g>
      <g class="m-mask-exchange"><path d="M105 93q55-35 109 0m-12-1 12 1-3-12M214 225q-55 35-109 0m12 1-12-1 3 12"/></g>`,
  },
  ESFP: {
    label: 'motionCaw',
    art: `<g class="m-ritual-ring"><ellipse cx="160" cy="253" rx="98" ry="23"/><ellipse cx="160" cy="253" rx="78" ry="15"/><path d="m85 243 75 27 75-27m-129 27 54-34 54 34"/></g>
      <g class="m-ritual-rays"><path d="m101 114-21-17m26-1-12-24m31 9-4-28m96 61 21-17m-26-1 12-24m-31 9 4-28"/></g>
      <text class="m-caw" x="160" y="88" text-anchor="middle" stroke="none">CAW!</text>`,
  },
};

export function motionMarkup(type) {
  if (!Object.hasOwn(MOTIONS, type)) return '';
  const motion = MOTIONS[type];
  return (motion.backArt ? svg(motion.backArt, 'motion-underlay') : '') + svg(motion.art);
}

export function motionLabel(type) {
  return Object.hasOwn(MOTIONS, type) ? t(MOTIONS[type].label) : '';
}

export function playMotion(container) {
  const stage = container?.matches?.('.result-art') ? container : container?.querySelector?.('.result-art');
  if (!stage) return false;
  stage.classList.remove('motion-playing');
  if (stage.isConnected === false || !Object.hasOwn(MOTIONS, stage.dataset.motion)) return false;
  if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  // Commit the removed class before adding it back, including rapid replays.
  // CSS owns the entire lifetime: no timers or listeners survive a route change.
  void stage.offsetWidth;
  stage.classList.add('motion-playing');
  return true;
}
