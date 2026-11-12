'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const fmt = n => Math.round(n).toLocaleString('fr-FR');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const frame1 = () => new Promise(r => requestAnimationFrame(r));

/* ================= Données — taux officiels Epic (Fortnite Status, 7 nov. 2026) ================= */
const RAR = {
  none:{l:'Rien',c:'#a4adbd'}, common:{l:'Commun',c:'#c9d1dd'}, uncommon:{l:'Peu commun',c:'#5fe06a'}, rare:{l:'Rare',c:'#3fa9ff'},
  epic:{l:'Épique',c:'#b06bff'}, legendary:{l:'Légendaire',c:'#ff9a2e'}, exotic:{l:'Exotique',c:'#ffd23f'}, mythic:{l:'Mythique',c:'#ff8ae2'}
};
const ITEMS = [
  {id:'gold',    name:'Skin doré hebdo',         odds:1562500, r:'mythic',    t:7, boost:true},
  {id:'token',   name:'Jeton Boutique Pirate',   odds:137500,  r:'exotic',    t:6, boost:true},
  {id:'vehicle', name:'Véhicule + décalcomanie', odds:7813,    r:'legendary', t:5},
  {id:'pickaxe', name:'Pioche / Sac à dos',      odds:568,     r:'epic',      t:4},
  {id:'jam',     name:'Piste Jam',               odds:391,     r:'rare',      t:3},
  {id:'loading', name:'Écran de chargement',     odds:272,     r:'uncommon',  t:2},
  {id:'gizmo',   name:'Gizmo',                   odds:127,     r:'common',    t:1},
];
const NONE = {id:'none', name:'Rien du tout', r:'none', t:0};
const ALL = [...ITEMS, NONE];
const byId = Object.fromEntries(ALL.map(i => [i.id, i]));
const MODES = {
  off:{name:'Officiel', d:'Taux de base', m:{}},
  th:{name:'Heure du trésor', d:'Jeton x1,5 · Skin x10', m:{token:1.5, gold:10}},
  th2:{name:'Heure du trésor+', d:'Jeton x2 · Skin x10', m:{token:2, gold:10}},
  rum:{name:'Rumeur x1000', d:'Non confirmé', m:{token:1000}},
};
const BOOSTS = [
  {n:'Étincelle', m:2,     cost:50,     len:100, b1:'#2fd08a', b2:'#0e7a58'},
  {n:'Flamme',    m:10,    cost:300,    len:100, b1:'#3fa9ff', b2:'#1b3fae'},
  {n:'Brasier',   m:100,   cost:2500,   len:50,  b1:'#b06bff', b2:'#4a1597'},
  {n:'Supernova', m:1000,  cost:20000,  len:25,  b1:'#ff5fa2', b2:'#9b145c'},
  {n:'Big Bang',  m:10000, cost:150000, len:10,  b1:'#ffb81f', b2:'#c2410c'},
];
const COIN = {none:1, gizmo:5, loading:8, jam:10, pickaxe:15, vehicle:200, token:5000, gold:50000};
const MISS = ['Raté ! Un jeton aussi rare, ça se mérite.', 'Encore rien… le coffre se moque de toi.', 'Presque ! (non, pas du tout)', '1 chance sur 137 500. Courage.', 'Le prochain, c\'est le bon. Peut-être.', 'Vide. Comme le compte en V-Bucks.', 'Le coffre a bâillé. Rien d\'autre.'];

/* ================= Icônes ================= */
const st = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const ICONS = {
  sound:`<path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" ${st}/>`,
  mute:`<path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5" ${st}/>`,
  vib:`<rect x="8" y="3" width="8" height="18" rx="2.5" ${st}/><path d="M4 8v8M20 8v8" ${st}/>`,
  moon:`<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="currentColor"/>`,
  sun:`<circle cx="12" cy="12" r="4.5" fill="currentColor"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" ${st}/>`,
  play:`<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>`,
  stop:`<rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor"/>`,
  bolt:`<path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="currentColor"/>`,
  slot:`<rect x="2.5" y="5" width="19" height="14" rx="3" ${st}/><path d="M8.8 5v14M15.2 5v14" ${st}/><circle cx="5.7" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="18.3" cy="12" r="1.2" fill="currentColor"/>`,
  chest:`<path d="M3 11V9.5A5.5 5.5 0 0 1 8.5 4h7A5.5 5.5 0 0 1 21 9.5V11z" fill="currentColor" opacity=".55"/><rect x="3" y="11" width="18" height="9" rx="2" fill="currentColor"/><rect x="10" y="9" width="4" height="5.5" rx="1.2" fill="#ffd23f" stroke="rgba(0,0,0,.3)"/>`,
  gem:`<path d="M6 3h12l4 6-10 12L2 9z" fill="#5fd3ff"/><path d="M6 3h12l4 6H2z" fill="#a8ecff"/><path d="M2 9h20M12 21 8 9l4-6 4 6z" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.1"/>`,
  chart:`<path d="M4 20V11M10 20V5M16 20v-6M21 20H3" ${st} stroke-width="2.4"/>`,
  target:`<circle cx="12" cy="12" r="9" ${st}/><circle cx="12" cy="12" r="5" ${st}/><circle cx="12" cy="12" r="1.8" fill="currentColor"/>`,
  grid:`<rect x="3" y="3" width="7.5" height="7.5" rx="2" fill="currentColor"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2" fill="currentColor" opacity=".6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2" fill="currentColor" opacity=".6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" fill="currentColor"/>`,
  dice:`<rect x="3" y="3" width="18" height="18" rx="4" ${st}/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="16" cy="8" r="1.5" fill="currentColor"/><circle cx="8" cy="16" r="1.5" fill="currentColor"/>`,
  star:`<path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6z" fill="currentColor"/>`,
};
const I = n => `<svg class="i" viewBox="0 0 24 24">${ICONS[n]}</svg>`;

/* ================= Illustrations des objets (originales) ================= */
function star(n, R, r2, ri){ const p = []; for (let i = 0; i < n * 2; i++){ const a = Math.PI * i / n - Math.PI / 2, rad = i % 2 ? ri : (i % 4 === 0 ? R : r2); p.push((100 + rad * Math.cos(a)).toFixed(1) + ',' + (100 + rad * Math.sin(a)).toFixed(1)); } return p.join(' '); }
const TOKEN_IN = `<circle cx="100" cy="100" r="82" fill="none" stroke="url(#gGoldD)" stroke-width="15" stroke-dasharray="58 9" transform="rotate(-14 100 100)"/><circle cx="100" cy="100" r="68" fill="#3d2004"/><circle cx="100" cy="100" r="68" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="4"/><polygon points="${star(8, 99, 72, 15)}" fill="url(#gGoldD)" stroke="#6e3a00" stroke-width="1.6" stroke-linejoin="round"/><polygon points="${star(8, 99, 72, 15)}" fill="url(#gShine)" opacity=".35"/><circle cx="100" cy="100" r="45" fill="#8a4a00"/><circle cx="100" cy="100" r="41" fill="url(#gGem)"/><path d="M100 59 128 80 120 124 80 124 72 80Z" fill="#fff" opacity=".1"/><circle cx="100" cy="91" r="12.5" fill="#fff"/><path d="M93.5 96h13l5 25h-23z" fill="#fff"/><ellipse cx="83" cy="76" rx="10" ry="5" fill="#fff" opacity=".75" transform="rotate(-35 83 76)"/>`;
const ART = {
  token: TOKEN_IN,
  gold:`<path d="M14 96 Q16 66 50 63 Q84 66 86 96Z" fill="url(#gGoldD)"/><path d="M38 64 50 82 62 64" fill="#b56d05"/><path d="M50 82 44 96M50 82 56 96" stroke="#ffe9a0" stroke-width="2"/><rect x="42" y="52" width="16" height="14" rx="4" fill="#c98510"/><circle cx="50" cy="38" r="21" fill="url(#gGoldD)"/><path d="M28 38 Q27 14 50 13 Q73 14 72 38 Q66 26 56 27 Q50 22 42 27 Q34 27 28 38Z" fill="#a85f04"/><path d="M38 40q3-3 6 0M56 40q3-3 6 0" stroke="#7a4300" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M43 49q7 5 14 0" stroke="#7a4300" stroke-width="2.4" fill="none" stroke-linecap="round"/><ellipse cx="41" cy="27" rx="8" ry="4" fill="#fff" opacity=".55" transform="rotate(-25 41 27)"/><path d="M82 10l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#fff"/><path d="M14 52l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#fff" opacity=".85"/>`,
  vehicle:`<ellipse cx="50" cy="83" rx="44" ry="5" fill="#000" opacity=".25"/><path d="M6 68 Q7 54 22 51 L33 36 Q37 31 45 31 H63 Q72 31 76 37 L85 50 Q95 53 95 63 V72 H6Z" fill="url(#gCar)"/><path d="M37 37 H49 V50 H28Z" fill="#c9ecff"/><path d="M53 37 H64 Q68 37 70 41 L75 50 H53Z" fill="#c9ecff"/><path d="M37 37 H42 L33 50 H28Z" fill="#fff" opacity=".6"/><path d="M6 60 H95" stroke="#fff" stroke-opacity=".4" stroke-width="3"/><path d="M45 55 H55 L50 61 H58 L44 71 L48 63 H41Z" fill="#ffe14d" stroke="#8a3a00" stroke-width="1.2"/><circle cx="26" cy="72" r="12" fill="#1b1d2a"/><circle cx="26" cy="72" r="5.5" fill="#cfd5e2"/><circle cx="75" cy="72" r="12" fill="#1b1d2a"/><circle cx="75" cy="72" r="5.5" fill="#cfd5e2"/><rect x="88" y="56" width="6" height="5" rx="2" fill="#fff6b0"/>`,
  pickaxe:`<path d="M26 88 72 30" stroke="#5a3414" stroke-width="11" stroke-linecap="round"/><path d="M26 88 72 30" stroke="#b5773f" stroke-width="5" stroke-linecap="round"/><path d="M30 83l4-5M38 73l4-5" stroke="#3a1f08" stroke-width="3"/><path d="M40 10 Q80 4 96 46 Q84 30 72 34 Q62 22 40 10Z" fill="url(#gSteel)" stroke="#39425a" stroke-width="2.5" stroke-linejoin="round"/><path d="M46 13 Q76 10 90 36" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".8"/><rect x="63" y="24" width="17" height="17" rx="4" fill="#ffd23f" stroke="#8a5500" stroke-width="2" transform="rotate(38 71.5 32.5)"/><circle cx="71.5" cy="32.5" r="3" fill="#b06bff"/>`,
  jam:`<circle cx="44" cy="56" r="35" fill="#13131d"/><circle cx="44" cy="56" r="29" fill="none" stroke="#2c2c40" stroke-width="2"/><circle cx="44" cy="56" r="22" fill="none" stroke="#2c2c40" stroke-width="2"/><circle cx="44" cy="56" r="12" fill="#3fa9ff"/><circle cx="44" cy="56" r="12" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="1.5"/><circle cx="44" cy="56" r="2.5" fill="#13131d"/><path d="M20 38a30 30 0 0 1 22-12" stroke="#fff" stroke-opacity=".4" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M74 14v46" stroke="#fff" stroke-width="6.5" stroke-linecap="round"/><path d="M74 14c9 2 15 8 16 17" stroke="#fff" stroke-width="6.5" fill="none" stroke-linecap="round"/><ellipse cx="66" cy="62" rx="10.5" ry="8" fill="#fff" transform="rotate(-22 66 62)"/>`,
  loading:`<g transform="rotate(-7 50 50)"><rect x="12" y="20" width="76" height="60" rx="7" fill="#fff"/><rect x="17" y="25" width="66" height="50" rx="4" fill="url(#gSky)"/><circle cx="68" cy="38" r="7.5" fill="#ffe27a"/><path d="M17 75 37 46 50 61 61 50 83 75Z" fill="#2c8a55"/><path d="M17 75 37 46 45 56 33 75Z" fill="#4dbd78"/><path d="M33 52l4-6 4 5z" fill="#fff"/><rect x="17" y="66" width="66" height="9" fill="#000" opacity=".18"/><rect x="21" y="69" width="34" height="3" rx="1.5" fill="#fff"/></g>`,
  gizmo:`<ellipse cx="50" cy="90" rx="30" ry="4" fill="#000" opacity=".22"/><path d="M50 12 84 31 50 50 16 31Z" fill="#f4f7fb"/><path d="M16 31 50 50V90L16 71Z" fill="#aab4c4"/><path d="M84 31 50 50V90L84 71Z" fill="#78839a"/><path d="M50 12 84 31 50 50 16 31Z" fill="url(#gShine)" opacity=".5"/><g transform="translate(67 61) skewY(-29)"><circle r="10.5" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="5 3.2"/><circle r="4" fill="#fff"/></g><path d="M24 45v14M31 49v14" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>`,
  none:`<g fill="#d5dbe5"><circle cx="36" cy="60" r="14"/><circle cx="54" cy="51" r="18"/><circle cx="71" cy="62" r="12"/><rect x="26" y="60" width="54" height="16" rx="8"/></g><g fill="#fff" opacity=".5"><circle cx="50" cy="45" r="7"/></g><path d="M20 40l6 3M80 34l6-4M50 24v-8M30 26l3 5" stroke="#d5dbe5" stroke-width="4" stroke-linecap="round"/>`,
};
const art = id => `<svg viewBox="${id === 'token' ? '0 0 200 200' : '0 0 100 100'}">${ART[id]}</svg>`;
const tile = (it, cls = '') => `<div class="tile r-${it.r} ${cls}">${art(it.id)}${cls.includes('big') ? '<span class="sweep"></span>' : ''}</div>`;

function chestSVG(){
  return `<svg class="chest-svg" viewBox="0 0 260 230">
  <defs>
    <linearGradient id="beamG" x1="0" y1="1" x2="0" y2="0"><stop offset="0" style="stop-color:var(--rc,#fff)" stop-opacity=".95"/><stop offset=".6" style="stop-color:var(--rc,#fff)" stop-opacity=".25"/><stop offset="1" style="stop-color:var(--rc,#fff)" stop-opacity="0"/></linearGradient>
    <linearGradient id="beamW" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".7" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <radialGradient id="mouthG"><stop offset="0" stop-color="#fff"/><stop offset=".45" style="stop-color:var(--rc,#fff)"/><stop offset="1" stop-color="#3a1806"/></radialGradient>
    <clipPath id="lidClip"><path d="M24 114 V80 Q24 38 130 38 Q236 38 236 80 V114Z"/></clipPath>
  </defs>
  <ellipse cx="130" cy="218" rx="104" ry="11" fill="#000" opacity=".32"/>
  <g class="body">
    <g class="lid-open">
      <path d="M30 116 L44 34 Q130 6 216 34 L230 116Z" fill="url(#gWoodIn)"/>
      <path d="M44 34 Q130 6 216 34 L219 50 Q130 24 41 50Z" fill="url(#gGold)"/>
      <path d="M62 30 L54 116 H76 L82 26Z M178 26 L184 116 H206 L198 30Z" fill="url(#gGold)" opacity=".85"/>
      <path d="M38 80 H222 M34 100 H226" stroke="#000" stroke-opacity=".3" stroke-width="2.5"/>
    </g>
    <g class="beam"><polygon points="44,116 216,116 300,-140 -40,-140" fill="url(#beamG)" opacity=".7"/><polygon points="96,116 164,116 200,-140 60,-140" fill="url(#beamW)"/></g>
    <rect x="22" y="112" width="216" height="96" rx="12" fill="url(#gWood)"/>
    <path d="M22 144 H238 M22 176 H238" stroke="#2e1405" stroke-opacity=".55" stroke-width="3"/>
    <path d="M30 128 H50 M100 160 H120 M200 192 H220" stroke="#fff" stroke-opacity=".12" stroke-width="3" stroke-linecap="round"/>
    <rect x="50" y="112" width="22" height="96" fill="url(#gGold)"/><rect x="188" y="112" width="22" height="96" fill="url(#gGold)"/>
    <rect x="18" y="198" width="224" height="14" rx="7" fill="url(#gGold)"/>
    <rect x="18" y="106" width="224" height="15" rx="7" fill="url(#gGold)"/>
    <rect class="mouth" x="30" y="104" width="200" height="16" rx="8" fill="url(#mouthG)"/>
    <g fill="#7a4300"><circle cx="61" cy="132" r="3"/><circle cx="61" cy="188" r="3"/><circle cx="199" cy="132" r="3"/><circle cx="199" cy="188" r="3"/></g>
    <path d="M106 114 H154 V146 Q154 164 130 172 Q106 164 106 146Z" fill="url(#gGold)" stroke="#7a4300" stroke-width="2.5"/>
    <circle cx="130" cy="138" r="13" fill="#4a2806"/><circle class="gem" cx="130" cy="138" r="9.5"/><circle cx="126.5" cy="134.5" r="3" fill="#fff" opacity=".8"/>
    <g class="lid">
      <path d="M24 114 V80 Q24 38 130 38 Q236 38 236 80 V114Z" fill="url(#gWoodL)"/>
      <g clip-path="url(#lidClip)"><rect x="50" y="30" width="22" height="90" fill="url(#gGold)"/><rect x="188" y="30" width="22" height="90" fill="url(#gGold)"/><path d="M24 76 H236" stroke="#3a1806" stroke-opacity=".45" stroke-width="3"/><path d="M40 70 Q52 48 130 46 Q84 54 58 80Z" fill="#fff" opacity=".18"/></g>
      <path d="M24 114 V80 Q24 38 130 38 Q236 38 236 80 V114" fill="none" stroke="#e0a526" stroke-width="5"/>
      <rect x="18" y="102" width="224" height="13" rx="6.5" fill="url(#gGold)"/>
      <rect class="seam" x="26" y="112" width="208" height="5" rx="2.5"/>
    </g>
  </g>
  </svg>`;
}

/* ================= État ================= */
const DEF = {opened:0, coins:0, counts:{}, first:{}, best:null, hist:[], boost:null, theme:'dark', sound:true, vib:true, anim:'chest', speed:1, mode:'off', sandbox:false, autoT:'token', estT:'token', estN:1, qty:1};
let S = Object.assign(structuredClone(DEF), JSON.parse(localStorage.getItem('tokenhunter') || '{}'));
const save = () => localStorage.setItem('tokenhunter', JSON.stringify(S));
let busy = false, autoOn = false;

function probs(){
  const mm = MODES[S.mode].m, b = S.boost ? S.boost.m : 1;
  let arr = ITEMS.map(it => [it, (mm[it.id] || 1) * (it.boost ? b : 1) / it.odds]);
  const sum = arr.reduce((a, x) => a + x[1], 0);
  if (sum > 1) arr = arr.map(([i, p]) => [i, p / sum]);
  return arr;
}
const pOf = id => probs().find(x => x[0].id === id)[1];
function roll(arr = probs()){ let u = Math.random(); for (const [it, p] of arr){ if (u < p) return it; u -= p; } return NONE; }
function record(it){
  S.opened++; S.coins += COIN[it.id];
  S.counts[it.id] = (S.counts[it.id] || 0) + 1;
  if (!S.first[it.id]) S.first[it.id] = S.opened;
  if (it.t > 0){ if (!S.best || it.t > byId[S.best].t) S.best = it.id; S.hist.unshift({id:it.id, n:S.opened}); if (S.hist.length > 24) S.hist.length = 24; }
  if (S.boost && !S.boost.inf && --S.boost.left <= 0){ S.boost = null; toast('Boost terminé', 'Ton boost de chance est épuisé.', NONE); }
}

/* ================= Son + vibrations ================= */
let ac;
const AC = () => (ac = ac || new (window.AudioContext || window.webkitAudioContext)());
function tone(f, d = .08, type = 'sine', v = .12, when = 0, f2){
  if (!S.sound) return;
  try {
    const a = AC(), t = a.currentTime + when, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .008); g.gain.exponentialRampToValueAtTime(.0008, t + d);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + .03);
  } catch(e){}
}
function noise(d = .4, v = .25, f = 900, when = 0){
  if (!S.sound) return;
  try {
    const a = AC(), len = a.sampleRate * d | 0, b = a.createBuffer(1, len, a.sampleRate), ch = b.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
    s.buffer = b; fl.type = 'bandpass'; fl.frequency.value = f; fl.Q.value = .7; g.gain.value = v;
    s.connect(fl).connect(g).connect(a.destination); s.start(a.currentTime + when);
  } catch(e){}
}
const NOTES = [523, 659, 784, 1047, 1319, 1568, 2093, 2637];
const sfx = {
  tick: () => tone(1500, .03, 'square', .025),
  click: () => tone(700, .05, 'triangle', .06),
  charge: d => { const n = 10; for (let i = 0; i < n; i++) tone(220 + i * 45, .07, 'square', .025 + i * .003, i * d / n / 1000); },
  burst: () => { noise(.5, .35, 1400); tone(90, .4, 'sine', .25, 0, 40); },
  flip: t => tone(t ? 600 + t * 120 : 380, .09, 'triangle', .07),
  reveal: t => {
    if (!t){ tone(330, .22, 'sine', .08, 0, 220); return; }
    for (let i = 0; i <= Math.min(t, 7); i++) tone(NOTES[i], .32, 'triangle', .09, i * .075);
    if (t >= 5) for (let i = 0; i < 10; i++) tone(NOTES[7 - i % 4] * 1.0, .18, 'sine', .05, .65 + i * .06);
    if (t >= 6){ noise(1.2, .15, 3000, .5); [523, 659, 784, 1047].forEach(f => tone(f, 1.4, 'sawtooth', .025, 1.2)); }
  },
};
const vib = p => { if (S.vib && navigator.vibrate) try { navigator.vibrate(p); } catch(e){} };

/* ================= Particules ================= */
const cv = $('#fx'), cx = cv.getContext('2d'); let parts = [], dots = [];
function fitCanvas(){ const r = cv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2); cv.width = r.width * d; cv.height = r.height * d; cx.setTransform(d, 0, 0, d, 0, 0); }
for (let i = 0; i < 40; i++) dots.push({x:Math.random(), y:Math.random(), r:1.5 + Math.random() * 4, s:.0003 + Math.random() * .0009, c:i % 3, ph:Math.random() * 6});
function confetti(color, n = 120){
  const w = cv.clientWidth, h = cv.clientHeight, pal = [color, color, '#ffffff', '#ffd23f', '#ff5fc8', '#3fa9ff'];
  for (let i = 0; i < n; i++){ const a = Math.random() * Math.PI * 2, v = 3 + Math.random() * 11;
    parts.push({x:w / 2, y:h * .5, vx:Math.cos(a) * v, vy:Math.sin(a) * v - 5, r:3 + Math.random() * 5, c:pal[i % pal.length], life:100 + Math.random() * 70, rot:Math.random() * 6, vr:(Math.random() - .5) * .4, star:Math.random() < .25}); }
}
function frame(t){
  const w = cv.clientWidth, h = cv.clientHeight; cx.clearRect(0, 0, w, h);
  const cols = S.theme === 'dark' ? ['#8a6cff', '#5fe0ff', '#ff7ad0'] : ['#ffffff', '#ffe27a', '#7be07b'];
  for (const d of dots){ d.y -= d.s; if (d.y < -.05){ d.y = 1.05; d.x = Math.random(); }
    cx.globalAlpha = .35 + .35 * Math.sin(t / 700 + d.ph); cx.fillStyle = cols[d.c]; cx.beginPath(); cx.arc(d.x * w, d.y * h, d.r, 0, 7); cx.fill(); }
  parts = parts.filter(p => p.life-- > 0);
  for (const p of parts){ p.vy += .22; p.vx *= .985; p.vy *= .995; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
    cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot); cx.globalAlpha = Math.min(1, p.life / 40); cx.fillStyle = p.c;
    if (p.star){ cx.beginPath(); for (let k = 0; k < 8; k++){ const rr = k % 2 ? p.r * .4 : p.r * 1.3, a = k * Math.PI / 4; cx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } cx.fill(); }
    else cx.fillRect(-p.r, -p.r / 2.5, p.r * 2, p.r / 1.25);
    cx.restore(); }
  cx.globalAlpha = 1;
  requestAnimationFrame(frame);
}

/* ================= Scène ================= */
const view = $('#view'), stage = $('#stage');
const dur = base => base / S.speed;
const setTint = c => c ? stage.style.setProperty('--tint', c) : stage.style.removeProperty('--tint');
function say(txt){ const b = $('#bubble'); b.textContent = txt; b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
function flash(c = '#fff', big = false){ const f = $('#flash'); f.style.background = c; f.classList.remove('go', 'big'); void f.offsetWidth; f.classList.add('go'); if (big) f.classList.add('big'); }
function quake(){ stage.classList.remove('quake'); void stage.offsetWidth; stage.classList.add('quake'); }
function toast(title, sub, it){
  const el = document.createElement('div'); el.className = `toast r-${it.r}`;
  el.innerHTML = `${tile(it)}<div><b>${title}</b><small>${sub}</small></div>`;
  $('#toasts').appendChild(el); setTimeout(() => el.remove(), 3900);
}
function idle(){
  setTint();
  view.innerHTML = `<div class="scene"><div class="chest-wrap bob">${chestSVG()}</div><p class="hint">Appuie sur <b>OUVRIR</b> ou sur <kbd>Espace</kbd></p></div>`;
}
function revealHTML(it){
  const legend = it.t >= 6;
  return `<div class="reveal r-${it.r} ${legend ? 'legend' : ''} ${it.t === 0 ? 'is-none' : ''}"><div class="rv-glow"></div>
    ${legend ? `<div class="rv-banner">${it.id === 'token' ? 'JETON OBTENU !' : 'SKIN DORÉ !'}</div>` : ''}
    <div class="rv-card">${tile(it, 'big')}</div>
    <div class="rv-info"><span class="rtag">${RAR[it.r].l}</span><h2>${it.name}</h2><p>Coffre n°${fmt(S.opened)} · ${it.odds ? '1 chance sur ' + fmt(it.odds) : '+1 éclat'}</p></div></div>`;
}
function celebrate(it){
  const c = RAR[it.r].c;
  if (it.t > 0) setTint(c);
  sfx.reveal(it.t);
  if (it.t === 0){ say(MISS[Math.random() * MISS.length | 0]); vib(15); }
  else if (it.id === 'token'){ say('LE JETON !!! La boutique est à toi 🏴‍☠️'); vib([120, 60, 120, 60, 500]); }
  else if (it.id === 'gold'){ say('UN SKIN DORÉ ?! Va jouer au loto, sérieux.'); vib([200, 80, 200, 80, 700]); }
  else if (it.t >= 5){ say(`Ça brille ! ${it.name} ✨`); vib([60, 40, 160]); }
  else { say(`Pas mal : ${it.name} !`); vib(35); }
  if (it.t >= 2) confetti(c, it.t >= 6 ? 340 : it.t >= 5 ? 200 : it.t >= 3 ? 80 : 30);
  if (it.t >= 5){ stage.classList.add('hype'); setTimeout(() => stage.classList.remove('hype'), 5000); }
  if (it.t >= 6){ flash('#fff', true); quake(); $('#bubble').classList.add('hidden'); setTimeout(() => $('#bubble').classList.remove('hidden'), 3500); setTimeout(() => confetti(c, 220), 700); setTimeout(() => confetti('#ffffff', 160), 1400); }
  if (it.t >= 4) toast(`${it.name} obtenu !`, `Coffre n°${fmt(S.opened)} · ${RAR[it.r].l}`, it);
}
function showReveal(it){ view.innerHTML = `<div class="scene">${revealHTML(it)}</div>`; celebrate(it); }

/* ---------- Coffre ---------- */
async function animChest(it){
  setTint();
  view.innerHTML = `<div class="scene"><div class="chest-wrap">${chestSVG()}</div></div>`;
  const w = view.querySelector('.chest-wrap'), c = RAR[it.r].c;
  w.style.setProperty('--rc', c);
  await frame1();
  const D = dur(1500);
  w.classList.add('charge'); sfx.charge(D * .55); vib(20);
  await sleep(D * .55);
  w.style.setProperty('--gem', c); w.classList.add('charge2'); vib(40);
  if (it.t >= 5) setTint(c);
  await sleep(D * .45);
  w.classList.remove('charge', 'charge2'); w.classList.add('open');
  sfx.burst(); flash(c); vib(60);
  record(it);
  await sleep(dur(280));
  w.classList.add('sink');
  view.querySelector('.scene').insertAdjacentHTML('beforeend', revealHTML(it));
  celebrate(it);
  await sleep(dur(500));
}
/* ---------- Roulette ---------- */
const VIS = [['none', 26], ['gizmo', 20], ['loading', 15], ['jam', 12], ['pickaxe', 10], ['vehicle', 7], ['token', 6], ['gold', 4]];
function visRand(){ let u = Math.random() * 100; for (const [id, w] of VIS){ if (u < w) return byId[id]; u -= w; } return NONE; }
async function animRoulette(it){
  setTint();
  const WIN = 46, list = Array.from({length:54}, visRand); list[WIN] = it;
  if (it.t < 6 && Math.random() < .45) list[WIN + (Math.random() < .5 ? 1 : -1)] = byId.token;
  view.innerHTML = `<div class="rl"><div class="rl-mark"></div><div class="rl-strip">${list.map(x => tile(x)).join('')}</div></div>`;
  const rl = view.firstChild, strip = rl.lastChild, cw = strip.children[0].offsetWidth + 12;
  const off = WIN * cw + cw / 2 - rl.clientWidth / 2 + (Math.random() - .5) * cw * .75, D = dur(4600);
  await frame1();
  strip.style.transition = `transform ${D}ms cubic-bezier(.05,.72,.08,1)`;
  strip.style.transform = `translateX(${-off}px)`;
  let last = -1; const t0 = performance.now();
  await new Promise(res => { (function tk(){
    const x = -new DOMMatrix(getComputedStyle(strip).transform).m41, idx = Math.floor((x + rl.clientWidth / 2) / cw);
    if (idx !== last){ last = idx; sfx.tick(); }
    if (performance.now() - t0 < D) requestAnimationFrame(tk); else res(); })(); });
  strip.children[WIN].classList.add('win'); vib(30);
  await sleep(dur(650));
}
/* ---------- Ouvertures ---------- */
async function openOne(){
  if (busy || autoOn) return; busy = true; lock(true);
  const it = roll();
  if (S.anim === 'chest') await animChest(it);
  else {
    if (S.anim === 'roulette') await animRoulette(it);
    else { sfx.burst(); flash(RAR[it.r].c); await sleep(dur(90)); }
    record(it); showReveal(it);
  }
  refresh(true); busy = false; lock(false);
}
async function openMany(n){
  if (busy || autoOn) return; busy = true; lock(true); setTint();
  const res = [], c0 = S.coins; for (let i = 0; i < n; i++){ const it = roll(); record(it); res.push(it); }
  const agg = {}; res.forEach(it => agg[it.id] = (agg[it.id] || 0) + 1);
  const best = res.reduce((a, b) => b.t > a.t ? b : a, NONE);
  const show = n <= 10 ? res : ALL.filter(i => agg[i.id]).sort((a, b) => b.t - a.t);
  const step = dur(n <= 10 ? 150 : 180);
  view.innerHTML = `<div class="multi-wrap"><div class="multi ${n > 10 ? 'grouped' : ''}">${show.map((it, i) => `<div class="flip ${it.t >= 4 ? 'hot' : ''}"><div class="flip-in" style="--d:${i * step}ms"><div class="face back">${I('chest')}</div><div class="face front">${tile(it)}${n > 10 ? `<i class="cnt">×${fmt(agg[it.id])}</i>` : ''}</div></div></div>`).join('')}</div>
    <div class="multi-sum" style="animation-delay:${show.length * step + 700}ms">${n} coffres · meilleur : ${best.name} · +${fmt(S.coins - c0)} éclats</div></div>`;
  show.forEach((it, i) => setTimeout(() => sfx.flip(it.t), i * step + 620));
  await sleep(show.length * step + 900);
  $$('#view .flip').forEach(f => f.classList.add('done')); // sécurité : toujours finir face visible
  if (best.t > 0) setTint(RAR[best.r].c);
  sfx.reveal(best.t);
  if (best.t >= 2) confetti(RAR[best.r].c, best.t >= 6 ? 300 : best.t >= 4 ? 140 : 50);
  if (best.t >= 6){ flash('#fff', true); quake(); }
  if (best.t >= 4) toast(`${best.name} obtenu !`, `Pendant une ouverture x${n}`, best);
  say(best.t ? `Meilleur drop : ${best.name} !` : MISS[0]); vib(best.t >= 5 ? [100, 50, 300] : 30);
  refresh(true); busy = false; lock(false);
}
function autoHit(it){ const t = S.autoT; return t === 'never' ? false : t === 'any' ? it.t > 0 : t === 'leg' ? it.t >= 5 : it.id === t; }
function toggleAuto(){
  if (busy) return;
  autoOn = !autoOn; paintAuto(); lock(autoOn, true);
  if (!autoOn){ save(); refresh(); return; }
  setTint();
  view.innerHTML = `<div class="autov"><div class="auto-ring"><div>${I('chest')}</div></div><div class="big-n" id="aN">0</div><div class="sub-n"><b id="aR">0</b> coffres / seconde · objectif : ${$('#autoT').selectedOptions[0].text}</div><div class="live" id="aF"></div></div>`;
  say('Mode auto lancé… 🤖');
  let n = 0, f = 0, tS = performance.now(), nS = 0;
  (function loop(now){
    if (!autoOn) return;
    const k = Math.max(1, Math.round(2 * S.speed ** 3));
    for (let i = 0; i < k; i++){
      const it = roll(); record(it); n++;
      if (it.t >= 3){ const F = $('#aF'); F.insertAdjacentHTML('afterbegin', `<span class="fl r-${it.r}">${tile(it)}${it.name} · #${fmt(S.opened)}</span>`); if (F.children.length > 14) F.lastChild.remove(); if (it.t >= 5) setTint(RAR[it.r].c); }
      if (autoHit(it)){ toggleAuto(); showReveal(it); say(`${it.name} obtenu après ${fmt(n)} coffre${n > 1 ? 's' : ''} en auto !`); return; }
    }
    $('#aN').textContent = fmt(n);
    if (now - tS > 500){ $('#aR').textContent = fmt((n - nS) / ((now - tS) / 1000)); tS = now; nS = n; }
    if (++f % 5 === 0) sfx.tick();
    if (f % 15 === 0) refresh();
    requestAnimationFrame(loop);
  })(performance.now());
}
function paintAuto(){ const b = $('#bAuto'); b.classList.toggle('on', autoOn); b.innerHTML = autoOn ? `${I('stop')}STOP` : `${I('play')}AUTO`; }
function lock(on, keepAuto){ [$('#bOpen'), $('#bEst'), ...$$('#qty button'), ...$$('#estN button')].forEach(b => b.disabled = on); if (!keepAuto) $('#bAuto').disabled = on; }

/* ================= Simulateur ================= */
function geo(p){ if (p >= 1) return 1; if (p <= 0) return Infinity; return Math.max(1, Math.ceil(Math.log(1 - Math.random()) / Math.log1p(-p))); }
const pctF = v => v >= 99.995 ? '≈ 100 %' : v < .01 ? '< 0,01 %' : v.toLocaleString('fr-FR', {maximumFractionDigits:2}) + ' %';
/* Plusieurs essais d'affilée : moyenne, médiane, meilleur, pire */
async function estimateMany(n, items, P, sample){
  const runs = Array.from({length:n}, () => sample().N), mx = Math.max(...runs);
  const expect = items.length === 1 ? 1 / P[items[0].id] : null;
  const box = $('#simStage'), top = items.reduce((a, b) => b.t > a.t ? b : a);
  box.innerHTML = `<div class="est"><div class="sub-n">Moyenne en cours</div><div class="big-n" id="eN">0</div><div class="sub-n">coffres · <b id="eC">0</b> / ${fmt(n)} essais</div>
    <div class="runs ${n > 200 ? 'dense' : ''}" id="eR"></div>
    <div class="runs-ax"><span>Chaque barre = un essai</span>${expect ? `<span><i class="lg-me"></i>plus rapide que la théorie (${fmt(expect)})</span>` : ''}</div></div>`;
  $('#estOut').innerHTML = '';
  const R = $('#eR'), D = dur(n >= 1000 ? 5000 : 4000), t0 = performance.now(); let shown = 0, sum = 0, lastTick = 0;
  await new Promise(res => { (function step(now){
    const t = Math.min(1, (now - t0) / D), target = Math.ceil(n * (t * t * (3 - 2 * t)));
    let html = '';
    while (shown < target){ const v = runs[shown++]; sum += v;
      html += `<div class="${expect && v <= expect ? 'good' : ''}" style="height:${Math.max(2, Math.sqrt(v / mx) * 100)}%"></div>`; }
    if (html){ R.insertAdjacentHTML('beforeend', html); $('#eN').textContent = fmt(sum / shown); $('#eC').textContent = fmt(shown); }
    if (now - lastTick > 70 && html){ sfx.tick(); lastTick = now; }
    if (t < 1) requestAnimationFrame(step); else res(); })(t0); });
  const xs = [...runs].sort((a, b) => a - b), q = f => xs[Math.min(n - 1, Math.floor(f * n))], avg = sum / n;
  $('#eN').textContent = fmt(avg);
  sfx.reveal(Math.min(top.t, 6)); vib([80, 40, 200]); confetti(RAR[top.r].c, 120);
  toast(`Moyenne sur ${fmt(n)} essais`, `${fmt(avg)} coffres · ${items.length > 1 ? 'Collection complète' : top.name}`, top);
  const fast = expect ? runs.filter(v => v <= expect).length / n * 100 : null;
  $('#estOut').innerHTML = `<div class="est-res">
      <div class="st hl"><small>Moyenne</small><b>${fmt(avg)}</b></div>
      <div class="st"><small>Médiane</small><b>${fmt(q(.5))}</b></div>
      <div class="st"><small>Plus rapide</small><b>${fmt(xs[0])}</b></div>
      <div class="st"><small>Plus long</small><b>${fmt(xs[n - 1])}</b></div></div>
    <div class="est-res">
      <div class="st"><small>Théorie (moyenne attendue)</small><b>${expect ? fmt(expect) : '—'}</b></div>
      <div class="st"><small>Écart avec la théorie</small><b>${expect ? (avg >= expect ? '+' : '') + ((avg / expect - 1) * 100).toLocaleString('fr-FR', {maximumFractionDigits:1}) + ' %' : '—'}</b></div>
      <div class="st"><small>Essais sous la moyenne théorique</small><b>${fast == null ? '—' : pctF(fast)}</b></div>
      <div class="st"><small>≈ Parties en moyenne (25 coffres)</small><b>${fmt(avg / 25)}</b></div></div>`;
  if (!expect) $$('#estOut .est-res')[1].remove();
}
async function estimate(){
  if (busy || autoOn) return; busy = true; lock(true);
  const P = Object.fromEntries(probs().map(([i, p]) => [i.id, p])), tgt = S.estT, items = tgt === 'all' ? ITEMS : [byId[tgt]];
  const sample = () => { const ts = items.map(i => geo(P[i.id])); return {ts, N:Math.max(...ts)}; };
  if (S.estN > 1){ await estimateMany(S.estN, items, P, sample); busy = false; lock(false); return; }
  const run = sample(), N = run.N, logN = Math.log(Math.max(N, 2));
  const box = $('#simStage');
  box.innerHTML = `<div class="est"><div class="big-n" id="eN">0</div><div class="sub-n">coffres ouverts</div>
    <div class="tl"><div class="tl-fill" id="eF"></div>${items.map((it, i) => `<div class="mk r-${it.r}" data-i="${i}" style="left:${N < 2 ? 100 : Math.log(run.ts[i]) / logN * 100}%">${tile(it)}</div>`).join('')}</div>
    <div class="found" id="eFd"></div></div>`;
  $('#estOut').innerHTML = '';
  const D = dur(4200), hit = new Set(); let lastTick = 0;
  const t0 = performance.now();
  await new Promise(res => { (function step(now){
    const t = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - t, 2.4), v = Math.max(1, Math.round(Math.exp(logN * e)));
    $('#eN').textContent = fmt(Math.min(v, N)); $('#eF').style.width = e * 100 + '%';
    run.ts.forEach((n, i) => { if (!hit.has(i) && v >= n){ hit.add(i); const it = items[i];
      box.querySelector(`.mk[data-i="${i}"]`).classList.add('hit');
      $('#eFd').insertAdjacentHTML('beforeend', `<span class="fl r-${it.r}">${tile(it)}${it.name} · #${fmt(n)}</span>`); sfx.flip(it.t); vib(25); } });
    if (now - lastTick > 65){ sfx.tick(); lastTick = now; }
    if (t < 1) requestAnimationFrame(step); else res(); })(t0); });
  $('#eN').textContent = fmt(N);
  const top = items.reduce((a, b) => b.t > a.t ? b : a);
  sfx.reveal(Math.min(top.t, 6)); vib([80, 40, 200]);
  toast(`Simulation : ${fmt(N)} coffres`, tgt === 'all' ? 'Collection complète' : top.name, top);
  const K = 2000, xs = Array.from({length:K}, () => sample().N).sort((a, b) => a - b), q = f => xs[Math.min(K - 1, Math.floor(f * K))];
  const hi = q(.95), B = 30, bins = new Array(B).fill(0); xs.forEach(x => { if (x <= hi) bins[Math.min(B - 1, Math.floor(x / hi * B))]++; });
  const mx = Math.max(...bins), meBin = N <= hi ? Math.min(B - 1, Math.floor(N / hi * B)) : -1, better = xs.filter(x => x > N).length / K * 100;
  const cum = n => items.reduce((a, i) => a * (1 - Math.pow(1 - P[i.id], n)), 1) * 100;
  const pct = v => v >= 99.995 ? '≈ 100 %' : v < .01 ? '< 0,01 %' : v.toLocaleString('fr-FR', {maximumFractionDigits:2}) + ' %';
  $('#estOut').innerHTML = `<div class="est-res">
      <div class="st"><small>Plus chanceux que</small><b>${pct(better)}</b></div>
      <div class="st"><small>Médiane</small><b>${fmt(q(.5))}</b></div>
      <div class="st"><small>10 % y arrivent avant</small><b>${fmt(q(.1))}</b></div>
      <div class="st"><small>90 % y arrivent avant</small><b>${fmt(q(.9))}</b></div></div>
    <div class="hgram">${bins.map((b, i) => `<div class="${i === meBin ? 'me' : ''}" data-h="${b / mx * 100}"></div>`).join('')}</div>
    <div class="hax"><span>0</span><span>Répartition sur 2 000 simulations · en jaune : ton essai</span><span>${fmt(hi)}</span></div>
    <div class="lbl" style="margin-top:18px">Chance de l'avoir après…</div>
    <div class="cum">${[100, 1000, 10000, 100000, 1000000].map(n => `<div><small>${fmt(n)} coffres</small><b>${pct(cum(n))}</b></div>`).join('')}</div>`;
  await frame1(); $$('.hgram div').forEach((d, i) => setTimeout(() => d.style.height = d.dataset.h + '%', i * 22));
  busy = false; lock(false);
}

/* ================= Rendu UI ================= */
const oddsTxt = p => p >= .9999 ? '100 %' : p <= 0 ? '—' : '1 sur ' + fmt(1 / p);
let lastCoins = 0;
function refresh(full){
  $('#coins').textContent = fmt(S.coins); $('#opened').textContent = fmt(S.opened);
  if (full && S.coins !== lastCoins){ const p = $('#coins').parentElement; p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); }
  lastCoins = S.coins;
  $('#modeChip').innerHTML = `${I('target')}${MODES[S.mode].name}`;
  $('#oddsChip').innerHTML = `${I('star')}Jeton : ${oddsTxt(pOf('token'))}`;
  const bc = $('#boostChip'); bc.classList.toggle('hidden', !S.boost);
  if (S.boost) bc.innerHTML = `${I('bolt')}BOOST x${fmt(S.boost.m)} · ${S.boost.inf ? '∞' : S.boost.left + ' restants'}`;
  $('#obSub').textContent = S.qty === 1 ? '1 coffre' : S.qty + ' coffres';
  $$('#qty button').forEach(b => b.classList.toggle('on', +b.dataset.q === S.qty));
  $$('#segAnim button').forEach(b => b.classList.toggle('on', b.dataset.v === S.anim));
  $$('#segMode button').forEach(b => b.classList.toggle('on', b.dataset.v === S.mode));

  const arr = probs(), pn = Math.max(0, 1 - arr.reduce((a, x) => a + x[1], 0));
  const barW = p => Math.max(3, Math.min(100, (Math.log10(Math.max(p, 1e-7)) + 7) / 7 * 100));
  $('#ratesList').innerHTML = arr.map(([it, p]) => { const up = p > 1.001 / it.odds;
    return `<div class="rate r-${it.r}">${tile(it)}<div><div class="rate-top">${it.name}<span class="rtag">${RAR[it.r].l}</span></div><div class="bar"><i style="width:${barW(p)}%"></i></div></div>
      <div class="rate-v"><b class="${up ? 'up' : ''}">${oddsTxt(p)}</b><small>${up ? 'officiel : 1 sur ' + fmt(it.odds) : (p * 100).toLocaleString('fr-FR', {maximumSignificantDigits:3}) + ' %'}</small></div></div>`; }).join('') +
    `<div class="rate r-none">${tile(NONE)}<div><div class="rate-top">Rien du tout<span class="rtag">Rien</span></div><div class="bar"><i style="width:${barW(pn)}%"></i></div></div><div class="rate-v"><b>${(pn * 100).toLocaleString('fr-FR', {maximumFractionDigits:2})} %</b><small>le plus fréquent</small></div></div>`;

  $('#sandbox').checked = S.sandbox;
  $('#boostList').innerHTML = BOOSTS.map((b, i) => { const act = S.boost && S.boost.m === b.m, ok = S.sandbox || S.coins >= b.cost, prog = Math.min(100, S.coins / b.cost * 100);
    return `<div class="bst ${act ? 'act' : ''} ${ok || act ? '' : 'locked'}" style="--b1:${b.b1};--b2:${b.b2}"><span class="bst-n">${b.n}</span><span class="bst-m">x${fmt(b.m)}</span>
      <span class="bst-d">Jeton : <b>${oddsTxt(Math.min(1, b.m / 137500 * (MODES[S.mode].m.token || 1)))}</b><br>${S.sandbox ? 'Durée illimitée' : `Pendant ${b.len} coffres`}</span>
      ${S.sandbox ? '' : `<div class="bst-p"><i style="width:${prog}%"></i></div>`}
      <button data-b="${i}">${act ? 'Retirer' : S.sandbox ? 'Activer' : ok ? `Activer · ${fmt(b.cost)}` : `${fmt(b.cost)} éclats`}</button></div>`; }).join('');

  const got = ITEMS.filter(i => S.counts[i.id]).length;
  $('#collSub').textContent = `${got} / ${ITEMS.length} objets découverts`;
  $('#collBar').style.width = got / ITEMS.length * 100 + '%';
  $('#invGrid').innerHTML = ITEMS.map(it => { const c = S.counts[it.id] || 0;
    return `<div class="ci ${c ? '' : 'lock'}">${tile(it)}${c ? `<i class="cnt">×${fmt(c)}</i>` : ''}<b>${c ? it.name : '???'}</b><small>${c ? `1er au coffre n°${fmt(S.first[it.id])}` : `1 sur ${fmt(it.odds)}`}</small></div>`; }).join('');

  const had = (1 - Math.pow(1 - 1 / 137500, S.opened)) * 100, found = S.opened - (S.counts.none || 0);
  $('#statsBox').innerHTML = [
    ['Coffres ouverts', fmt(S.opened)], ['Éclats gagnés', fmt(S.coins)], ['Objets trouvés', fmt(found)],
    ['Meilleur drop', S.best ? byId[S.best].name : '—'], ['Jeton', S.first.token ? 'Coffre n°' + fmt(S.first.token) : 'Pas encore'],
    ['Chance théorique du jeton', had.toLocaleString('fr-FR', {maximumFractionDigits:2}) + ' %'],
  ].map(([k, v]) => `<div class="st"><small>${k}</small><b>${v}</b></div>`).join('');
  $('#hist').innerHTML = S.hist.map(h => { const it = byId[h.id]; return `<li class="r-${it.r}">${tile(it)}${it.name}<span>#${fmt(h.n)}</span></li>`; }).join('') || '<li class="empty">Rien pour l\'instant… ouvre des coffres !</li>';
  save();
}
function applyPrefs(){
  document.documentElement.dataset.theme = S.theme;
  document.querySelector('meta[name=theme-color]').content = S.theme === 'dark' ? '#0a0b1e' : '#eaf7e4';
  $('#bTheme').innerHTML = I(S.theme === 'dark' ? 'sun' : 'moon');
  $('#bSound').innerHTML = I(S.sound ? 'sound' : 'mute'); $('#bSound').classList.toggle('off', !S.sound);
  $('#bVib').innerHTML = I('vib'); $('#bVib').classList.toggle('off', !S.vib);
  $('#spd').value = S.speed;
  $('#spdVal').textContent = (S.speed <= .5 ? 'Lent' : S.speed <= 1.25 ? 'Normal' : S.speed <= 2.5 ? 'Rapide' : 'Turbo') + ' · x' + String(S.speed).replace('.', ',');
  $('#autoT').value = S.autoT;
  $$('#estT .tg').forEach(b => b.classList.toggle('on', b.dataset.v === S.estT));
  $$('#estN button').forEach(b => b.classList.toggle('on', +b.dataset.n === S.estN));
  $('#bEst').textContent = S.estN > 1 ? `Lancer ${fmt(S.estN)} simulations` : 'Lancer la simulation';
}

/* ================= Init ================= */
$('#logo').innerHTML = art('token');
$('#icGem').innerHTML = `<svg viewBox="0 0 24 24">${ICONS.gem}</svg>`;
$('#icChest').innerHTML = `<svg viewBox="0 0 24 24" style="color:#c8743a">${ICONS.chest}</svg>`;
$('#hRates').innerHTML = I('chart'); $('#hBoost').innerHTML = I('bolt'); $('#hColl').innerHTML = I('grid'); $('#hSim').innerHTML = I('dice'); $('#hStats').innerHTML = I('star');
$('#segAnim').innerHTML = [['chest', 'chest', 'Coffre'], ['roulette', 'slot', 'Roulette'], ['instant', 'bolt', 'Instant']].map(([v, ic, l]) => `<button data-v="${v}">${I(ic)}${l}</button>`).join('');
$('#segMode').innerHTML = Object.entries(MODES).map(([k, m]) => `<button data-v="${k}"><b>${m.name}</b><small>${m.d}</small></button>`).join('');
$('#estT').innerHTML = ITEMS.map(i => `<button class="tg" data-v="${i.id}">${tile(i)}<span>${i.name}</span></button>`).join('') + `<button class="tg all" data-v="all">${I('grid')}Collection complète</button>`;
paintAuto();

$('#bOpen').onclick = () => S.qty === 1 ? openOne() : openMany(S.qty);
$('#qty').onclick = e => { const q = e.target.closest('button')?.dataset.q; if (q){ S.qty = +q; sfx.click(); refresh(); } };
$('#bAuto').onclick = toggleAuto;
$('#bEst').onclick = estimate;
$('#estN').onclick = e => { const n = e.target.closest('button')?.dataset.n; if (n && !busy){ S.estN = +n; sfx.click(); applyPrefs(); save(); } };
$('#estT').onclick = e => { const v = e.target.closest('.tg')?.dataset.v; if (v){ S.estT = v; sfx.click(); applyPrefs(); save(); } };
$('#segAnim').onclick = e => { const v = e.target.closest('button')?.dataset.v; if (v && !busy){ S.anim = v; sfx.click(); refresh(); if (!autoOn) idle(); } };
$('#segMode').onclick = e => { const v = e.target.closest('button')?.dataset.v; if (v){ S.mode = v; sfx.click(); refresh(); } };
$('#spd').oninput = e => { S.speed = +e.target.value; applyPrefs(); save(); };
$('#autoT').onchange = e => { S.autoT = e.target.value; save(); };
$('#sandbox').onchange = e => { S.sandbox = e.target.checked; S.boost = null; refresh(); };
$('#boostList').onclick = e => { const i = e.target.closest('button')?.dataset.b; if (i == null) return; const b = BOOSTS[i];
  if (S.boost && S.boost.m === b.m){ S.boost = null; sfx.click(); }
  else if (S.sandbox){ S.boost = {m:b.m, inf:true}; sfx.reveal(4); toast(`Boost ${b.n} x${fmt(b.m)}`, 'Actif en mode libre', byId.token); }
  else if (S.coins >= b.cost){ S.coins -= b.cost; S.boost = {m:b.m, left:b.len}; sfx.reveal(4); vib(40); toast(`Boost ${b.n} x${fmt(b.m)} activé`, `Pendant ${b.len} coffres`, byId.token); }
  refresh(); };
$('#bTheme').onclick = () => { S.theme = S.theme === 'dark' ? 'light' : 'dark'; applyPrefs(); save(); };
$('#bSound').onclick = () => { S.sound = !S.sound; applyPrefs(); save(); sfx.click(); };
$('#bVib').onclick = () => { S.vib = !S.vib; applyPrefs(); save(); vib(40); };
$('#bReset').onclick = () => { if (busy || autoOn) return; if (confirm('Tout réinitialiser (stats, éclats, collection) ?')){ const k = {theme:S.theme, sound:S.sound, vib:S.vib, anim:S.anim, speed:S.speed, qty:S.qty}; S = Object.assign(structuredClone(DEF), k); refresh(); idle(); say('Tout est remis à zéro.'); } };
document.addEventListener('keydown', e => { if (e.code === 'Space' && !/INPUT|SELECT|BUTTON|TEXTAREA/.test(e.target.tagName)){ e.preventDefault(); $('#bOpen').click(); } });
addEventListener('resize', fitCanvas);
applyPrefs(); refresh(); idle(); fitCanvas(); requestAnimationFrame(frame);
