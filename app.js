'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const fmt = n => Math.round(n).toLocaleString('fr-FR');
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- Données (taux officiels Epic, 7 nov. 2026) ---------- */
const RAR = {
  none:{label:'Rien',c:'#9aa5b1'}, common:{label:'Commun',c:'#5fd068'}, uncommon:{label:'Peu commun',c:'#3fa9ff'},
  rare:{label:'Rare',c:'#a066ff'}, epic:{label:'Épique',c:'#ff5fc8'}, legendary:{label:'Légendaire',c:'#ff9a2e'},
  exotic:{label:'Exotique',c:'#ffd23f'}, mythic:{label:'Mythique',c:'#ffe680'}
};
const ITEMS = [
  {id:'gold',    name:'Skin doré hebdo',          icon:'👑', odds:1562500, r:'mythic',    t:7, boost:true},
  {id:'token',   name:'Jeton Boutique Pirate',    icon:'TOKEN', odds:137500, r:'exotic', t:6, boost:true},
  {id:'vehicle', name:'Véhicule + décalcomanie',  icon:'🚗', odds:7813,    r:'legendary', t:5},
  {id:'pickaxe', name:'Pioche / Sac à dos',       icon:'⛏️', odds:568,     r:'epic',      t:4},
  {id:'jam',     name:'Piste Jam',                icon:'🎵', odds:391,     r:'rare',      t:3},
  {id:'loading', name:'Écran de chargement',      icon:'🖼️', odds:272,     r:'uncommon',  t:2},
  {id:'gizmo',   name:'Gizmo',                    icon:'🧩', odds:127,     r:'common',    t:1},
];
const NONE = {id:'none', name:'Rien…', icon:'💨', r:'none', t:0};
const ALL = [...ITEMS, NONE];
const byId = Object.fromEntries(ALL.map(i => [i.id, i]));
const MODES = {
  off:{name:'Officiel', m:{}},
  th:{name:'Heure du trésor', m:{token:1.5, gold:10}},
  th2:{name:'Heure du trésor x2', m:{token:2, gold:10}},
  rum:{name:'Rumeur x1000', m:{token:1000}},
};
const BOOSTS = [{m:2,cost:50,n:100},{m:10,cost:300,n:100},{m:100,cost:2500,n:50},{m:1000,cost:20000,n:25},{m:10000,cost:150000,n:10}];
const COIN = {none:1, gizmo:5, loading:8, jam:10, pickaxe:15, vehicle:200, token:5000, gold:50000};
const MISS = ['Raté ! Un jeton aussi rare, ça se mérite.','Encore rien… le coffre se moque de toi.','Presque ! (non, pas du tout)','1 chance sur 137 500. Courage.','Le prochain, c\'est le bon. Peut-être.','Le coffre était vide. Comme mes espoirs.'];

/* ---------- Jeton SVG (design original) ---------- */
function star(n, R, r2, ri){ let p=[]; for(let i=0;i<n*2;i++){const a=Math.PI*i/n-Math.PI/2, rad=i%2? ri : (i%4===0?R:r2); p.push((100+rad*Math.cos(a)).toFixed(1)+','+(100+rad*Math.sin(a)).toFixed(1));} return p.join(' '); }
const TOKEN_SVG = `<svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="80" fill="none" stroke="url(#gGold)" stroke-width="15" stroke-dasharray="62 10" transform="rotate(-20 100 100)"/><circle cx="100" cy="100" r="66" fill="#4a2806"/><polygon points="${star(8,98,70,15)}" fill="url(#gGold)" stroke="#7a4300" stroke-width="1.5"/><circle cx="100" cy="100" r="44" fill="url(#gGem)" stroke="#a85a00" stroke-width="4"/><path d="M100 60 L132 86 L120 132 L80 132 L68 86Z" fill="#fff" opacity=".12"/><circle cx="100" cy="90" r="13" fill="#fff"/><path d="M93 96 L107 96 L112 122 L88 122Z" fill="#fff"/><ellipse cx="84" cy="76" rx="9" ry="5" fill="#fff" opacity=".7" transform="rotate(-35 84 76)"/></svg>`;
const ico = it => it.icon === 'TOKEN' ? TOKEN_SVG : it.icon;
const rc = it => `--rc:${RAR[it.r].c}`;

/* ---------- État ---------- */
const DEF = {opened:0, coins:0, counts:{}, first:{}, best:null, hist:[], boost:null, theme:'light', sound:true, vib:true, anim:'roulette', speed:1, mode:'off', sandbox:false, autoT:'token', estT:'token'};
let S = Object.assign({}, DEF, JSON.parse(localStorage.getItem('tokenhunter') || '{}'));
const save = () => localStorage.setItem('tokenhunter', JSON.stringify(S));
let busy = false, autoOn = false;

function probs(){
  const mm = MODES[S.mode].m, b = S.boost ? S.boost.m : 1;
  let arr = ITEMS.map(it => [it, (mm[it.id] || 1) * (it.boost ? b : 1) / it.odds]);
  const sum = arr.reduce((a, x) => a + x[1], 0);
  if (sum > 1) arr = arr.map(([i, p]) => [i, p / sum]);
  return arr;
}
const pOf = id => (probs().find(x => x[0].id === id) || [0, 0])[1];
function roll(arr = probs()){ let u = Math.random(); for (const [it, p] of arr){ if (u < p) return it; u -= p; } return NONE; }
function record(it){
  S.opened++; S.coins += COIN[it.id];
  S.counts[it.id] = (S.counts[it.id] || 0) + 1;
  if (!S.first[it.id]) S.first[it.id] = S.opened;
  if (it.t > 0){ if (!S.best || it.t > byId[S.best].t) S.best = it.id; S.hist.unshift({id:it.id, n:S.opened}); S.hist.length = Math.min(S.hist.length, 30); }
  if (S.boost && !S.boost.inf && --S.boost.left <= 0) S.boost = null;
}

/* ---------- Son + vibrations ---------- */
let ac;
function tone(f, d = .08, type = 'sine', v = .12, when = 0){
  if (!S.sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const t = ac.currentTime + when, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d + .02);
  } catch(e){}
}
const NOTES = [523, 659, 784, 1047, 1319, 1568, 2093, 2637];
const sfx = {
  tick: () => tone(1400, .025, 'square', .03),
  open: () => { tone(160, .35, 'sawtooth', .06); tone(320, .3, 'triangle', .08, .12); },
  reveal: t => { if (!t) { tone(220, .3, 'sine', .1); tone(180, .35, 'sine', .08, .12); return; }
    for (let i = 0; i <= t; i++) tone(NOTES[i], .28, 'triangle', .1, i * .08);
    if (t >= 6) for (let i = 0; i < 8; i++) tone(NOTES[7 - i % 4], .2, 'square', .04, .7 + i * .07); }
};
const vib = p => { if (S.vib && navigator.vibrate) navigator.vibrate(p); };

/* ---------- Particules / confettis ---------- */
const cv = $('#fx'), cx = cv.getContext('2d'); let parts = [], dots = [];
function fitCanvas(){ const r = cv.getBoundingClientRect(), d = devicePixelRatio || 1; cv.width = r.width * d; cv.height = r.height * d; cx.setTransform(d, 0, 0, d, 0, 0); }
for (let i = 0; i < 36; i++) dots.push({x:Math.random(), y:Math.random(), r:2 + Math.random() * 5, s:.0004 + Math.random() * .001, c:i % 3});
function confetti(color, n = 120){
  const w = cv.clientWidth, h = cv.clientHeight;
  for (let i = 0; i < n; i++){ const a = Math.random() * Math.PI * 2, v = 4 + Math.random() * 9;
    parts.push({x:w/2, y:h/2, vx:Math.cos(a)*v, vy:Math.sin(a)*v - 4, r:3 + Math.random()*5, c:Math.random() < .5 ? color : ['#fff','#ffd23f','#ff5fc8','#3fa9ff'][i%4], life:90 + Math.random()*60, rot:Math.random()*6}); }
}
function frame(){
  const w = cv.clientWidth, h = cv.clientHeight; cx.clearRect(0, 0, w, h);
  const dark = S.theme === 'dark', cols = dark ? ['#8a5cff','#3fe0ff','#ff5fc8'] : ['#36b845','#f3b21b','#7be07b'];
  for (const d of dots){ d.y -= d.s; if (d.y < -.05) { d.y = 1.05; d.x = Math.random(); }
    cx.globalAlpha = .55; cx.fillStyle = cols[d.c]; cx.beginPath(); cx.arc(d.x * w, d.y * h, d.r, 0, 7); cx.fill(); }
  cx.globalAlpha = 1;
  parts = parts.filter(p => p.life-- > 0);
  for (const p of parts){ p.vy += .25; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.rot += .2;
    cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot); cx.globalAlpha = Math.min(1, p.life / 30); cx.fillStyle = p.c; cx.fillRect(-p.r, -p.r/2, p.r*2, p.r); cx.restore(); }
  requestAnimationFrame(frame);
}

/* ---------- Scène ---------- */
const view = $('#view'), stage = $('#stage');
function say(txt){ const b = $('#bubble'); b.textContent = txt; b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
function idle(){ view.innerHTML = `<div class="idle">${TOKEN_SVG}<p>Appuie sur OUVRIR pour tenter ta chance</p></div>`; }
const dur = base => base / S.speed;

function reveal(it){
  view.innerHTML = `<div class="res ${it.id === 'none' ? 'none' : ''}" style="${rc(it)}"><div class="ico">${ico(it)}</div><h2>${it.name}</h2><span class="pill">${RAR[it.r].label}</span></div>`;
  sfx.reveal(it.t);
  if (it.t === 0) { say(MISS[Math.random() * MISS.length | 0]); vib(20); }
  else if (it.id === 'token') { say('LE JETON !!! Boutique gratuite 🏴‍☠️'); vib([100,50,100,50,400]); }
  else if (it.id === 'gold') { say('UN SKIN DORÉ ?! Va jouer au loto.'); vib([200,80,200,80,600]); }
  else if (it.t >= 5) { say('Ça commence à briller ✨ ' + it.name + ' !'); vib([60,40,120]); }
  else { say('Pas mal : ' + it.name + ' !'); vib(40); }
  if (it.t >= 3) confetti(RAR[it.r].c, it.t >= 5 ? 260 : 60);
  if (it.t >= 5) { stage.classList.add('hype'); setTimeout(() => stage.classList.remove('hype'), 4000); }
}

const VIS = [['none',30],['gizmo',20],['loading',14],['jam',11],['pickaxe',9],['vehicle',6],['token',6],['gold',4]];
function visRand(){ let u = Math.random() * 100; for (const [id, w] of VIS){ if (u < w) return byId[id]; u -= w; } return NONE; }
const cardHTML = (it, cls = '') => `<div class="card ${cls}" style="${rc(it)}">${ico(it)}</div>`;

async function animRoulette(it){
  const WIN = 44, list = Array.from({length:52}, visRand); list[WIN] = it;
  if (it.t < 6 && Math.random() < .4) list[WIN + (Math.random() < .5 ? 1 : -1)] = byId.token;
  view.innerHTML = `<div class="rl"><div class="rl-mark"></div><div class="rl-strip">${list.map(x => cardHTML(x)).join('')}</div></div>`;
  const rl = view.firstChild, strip = rl.lastChild, c0 = strip.children[0];
  const cw = c0.offsetWidth + 10, off = WIN * cw + cw / 2 - rl.clientWidth / 2 + (Math.random() - .5) * cw * .7;
  const d = dur(4200);
  await new Promise(r => requestAnimationFrame(r));
  strip.style.transition = `transform ${d}ms cubic-bezier(.06,.7,.1,1)`;
  strip.style.transform = `translateX(${-off}px)`;
  let last = -1; const t0 = performance.now();
  await new Promise(res => { (function tk(){
    const x = -new DOMMatrix(getComputedStyle(strip).transform).m41, idx = Math.floor((x + rl.clientWidth / 2) / cw);
    if (idx !== last) { last = idx; sfx.tick(); }
    if (performance.now() - t0 < d) requestAnimationFrame(tk); else res(); })(); });
  strip.children[WIN].classList.add('win');
  await sleep(dur(500));
}
async function animChest(it){
  view.innerHTML = `<div class="chest" style="${rc(it)}"><div class="lid"></div><div class="base"></div><div class="glow"></div></div>`;
  const ch = view.firstChild; await sleep(30);
  ch.classList.add('shake'); sfx.open(); vib(30);
  const d = dur(1300), steps = 6; for (let i = 0; i < steps; i++){ await sleep(d / steps); tone(300 + i * 60, .05, 'square', .03); }
  ch.classList.remove('shake'); ch.classList.add('open'); vib(50);
  await sleep(dur(650));
}
async function openOne(){
  if (busy || autoOn) return; busy = true; lock(true);
  const it = roll();
  if (S.anim === 'roulette') await animRoulette(it);
  else if (S.anim === 'chest') await animChest(it);
  else { view.innerHTML = '<div class="res none"><div class="ico">📦</div></div>'; await sleep(dur(140)); }
  record(it); reveal(it); refresh();
  busy = false; lock(false);
}
async function openMany(n){
  if (busy || autoOn) return; busy = true; lock(true);
  const res = []; for (let i = 0; i < n; i++){ const it = roll(); record(it); res.push(it); }
  const agg = {}; res.forEach(it => agg[it.id] = (agg[it.id] || 0) + 1);
  const best = res.reduce((a, b) => b.t > a.t ? b : a, NONE), shown = n <= 10 ? res : ALL.filter(i => agg[i.id]);
  view.innerHTML = `<div class="multi">${shown.map((it, i) => `<div class="card" style="${rc(it)};animation-delay:${i * dur(70)}ms">${ico(it)}${n > 10 ? `<i>×${agg[it.id]}</i>` : ''}</div>`).join('')}<div class="sum">${n} coffres · meilleur : ${best.name}</div></div>`;
  for (let i = 0; i < Math.min(shown.length, 10); i++){ setTimeout(sfx.tick, i * dur(70)); }
  await sleep(shown.length * dur(70) + 200);
  sfx.reveal(best.t); if (best.t >= 3) confetti(RAR[best.r].c, best.t >= 5 ? 220 : 60);
  say(best.t ? `Meilleur drop : ${best.name}` : MISS[0]); vib(best.t >= 5 ? [100,50,300] : 30);
  refresh(); busy = false; lock(false);
}
function autoHit(it){ const t = S.autoT; return t === 'never' ? false : t === 'any' ? it.t > 0 : t === 'leg' ? it.t >= 5 : it.id === t; }
function toggleAuto(){
  if (busy) return;
  autoOn = !autoOn; $('#bAuto').classList.toggle('on', autoOn); $('#bAuto').textContent = autoOn ? 'STOP ■' : 'AUTO ▶'; lock(autoOn, true);
  if (!autoOn) { save(); return; }
  view.innerHTML = `<div class="autov"><div class="big-n" id="aN">0</div><div class="est-l">coffres ouverts en auto</div><div class="found" id="aF"></div></div>`;
  let n = 0, f = 0; say('Mode auto lancé… 🤖');
  (function loop(){
    if (!autoOn) return;
    const k = Math.max(1, Math.round(2 * S.speed ** 3));
    for (let i = 0; i < k; i++){
      const it = roll(); record(it); n++;
      if (it.t >= 3) { $('#aF').insertAdjacentHTML('afterbegin', `<span style="${rc(it)}">${it.name} #${fmt(S.opened)}</span>`); const ch = $('#aF').children; if (ch.length > 12) ch[ch.length - 1].remove(); }
      if (autoHit(it)) { toggleAuto(); reveal(it); refresh(); say(`${it.name} obtenu après ${fmt(n)} coffres en auto !`); return; }
    }
    $('#aN').textContent = fmt(n);
    if (++f % 4 === 0) sfx.tick();
    if (f % 20 === 0) refresh();
    requestAnimationFrame(loop);
  })();
}
function lock(on, keepAuto){ ['#bOpen','#b10','#b100','#bEst'].forEach(s => $(s).disabled = on); if (!keepAuto) $('#bAuto').disabled = on; }

/* ---------- Estimation ---------- */
function geo(p){ if (p >= 1) return 1; if (p <= 0) return Infinity; return Math.max(1, Math.ceil(Math.log(1 - Math.random()) / Math.log1p(-p))); }
async function estimate(){
  if (busy || autoOn) return; busy = true; lock(true);
  const arr = probs(), tgt = S.estT, items = tgt === 'all' ? ITEMS : [byId[tgt]];
  const P = Object.fromEntries(arr.map(([i, p]) => [i.id, p]));
  const sample = () => { const ts = items.map(i => geo(P[i.id])); return {ts, N:Math.max(...ts)}; };
  const run = sample(), N = run.N, logN = Math.log(Math.max(N, 2));
  window.scrollTo({top:stage.getBoundingClientRect().top + scrollY - 10, behavior:'smooth'});
  view.innerHTML = `<div class="est"><div class="big-n" id="eN">0</div><div class="est-l">coffres ouverts</div>
    <div class="tl"><div class="tl-fill" id="eF"></div>${items.map((it, i) => `<div class="mk" data-i="${i}" style="${rc(it)};left:${N < 2 ? 100 : Math.log(run.ts[i]) / logN * 100}%">${ico(it)}</div>`).join('')}</div>
    <div class="found" id="eFd"></div></div>`;
  say(tgt === 'all' ? 'Chasse à la collection complète…' : `Chasse : ${byId[tgt].name}…`);
  const D = dur(4000), t0 = performance.now(), hit = new Set(); let lastTick = 0;
  await new Promise(res => { (function step(now){
    const t = Math.min(1, (now - t0) / D), e = t < 1 ? 1 - Math.pow(1 - t, 2.2) : 1, v = Math.max(1, Math.round(Math.exp(logN * e)));
    $('#eN').textContent = fmt(Math.min(v, N)); $('#eF').style.width = (e * 100) + '%';
    run.ts.forEach((n, i) => { if (!hit.has(i) && v >= n){ hit.add(i); const it = items[i];
      view.querySelector(`.mk[data-i="${i}"]`).classList.add('hit');
      $('#eFd').insertAdjacentHTML('beforeend', `<span style="${rc(it)}">${it.name} · #${fmt(n)}</span>`); sfx.reveal(Math.min(it.t, 4)); vib(30); } });
    if (now - lastTick > 70) { sfx.tick(); lastTick = now; }
    if (t < 1) requestAnimationFrame(step); else res(); })(t0); });
  $('#eN').textContent = fmt(N);
  const top = items.reduce((a, b) => b.t > a.t ? b : a);
  confetti(RAR[top.r].c, 220); sfx.reveal(6); vib([100,50,300]);
  say(`Obtenu en ${fmt(N)} coffres !`);
  // distribution
  const K = 2000, xs = Array.from({length:K}, () => sample().N).sort((a, b) => a - b), q = f => xs[Math.min(K - 1, Math.floor(f * K))];
  const hi = q(.95), B = 26, bins = new Array(B).fill(0); xs.forEach(x => { if (x <= hi) bins[Math.min(B - 1, Math.floor(x / hi * B))]++; });
  const mx = Math.max(...bins), meBin = Math.min(B - 1, Math.floor(N / hi * B)), better = xs.filter(x => x > N).length / K * 100;
  const cum = n => items.reduce((a, i) => a * (1 - Math.pow(1 - P[i.id], n)), 1) * 100;
  const pct = v => v >= 99.99 ? '≈100 %' : v < .01 ? '< 0,01 %' : v.toLocaleString('fr-FR', {maximumFractionDigits:2}) + ' %';
  $('#estOut').innerHTML = `<h4>Ton essai : ${fmt(N)} coffres</h4>
    <div class="kv"><span>Plus chanceux que</span><b>${pct(better)} des simulations</b></div>
    <div class="kv"><span>Médiane (2 000 simulations)</span><b>${fmt(q(.5))}</b></div>
    <div class="kv"><span>10 % des joueurs en moins de</span><b>${fmt(q(.1))}</b></div>
    <div class="kv"><span>90 % des joueurs en moins de</span><b>${fmt(q(.9))}</b></div>
    <div class="kv"><span>≈ Parties (25 coffres / partie)</span><b>${fmt(N / 25)}</b></div>
    <div class="hgram">${bins.map((b, i) => `<div class="${i === meBin ? 'me' : ''}" data-h="${b / mx * 100}"></div>`).join('')}</div>
    <div class="hax"><span>0</span><span>${fmt(hi / 2)}</span><span>${fmt(hi)}</span></div>
    <h4>Chance de l'avoir après…</h4>
    ${[100, 1000, 10000, 100000, 1000000].map(n => `<div class="kv"><span>${fmt(n)} coffres</span><b>${pct(cum(n))}</b></div>`).join('')}`;
  await sleep(50); $$('.hgram div').forEach((d, i) => setTimeout(() => d.style.height = d.dataset.h + '%', i * 25));
  busy = false; lock(false);
}

/* ---------- UI ---------- */
const oddsTxt = p => p >= 1 ? '100 %' : p <= 0 ? '—' : '1 / ' + fmt(1 / p);
function refresh(){
  $('#coins').textContent = '💰 ' + fmt(S.coins); $('#opened').textContent = '📦 ' + fmt(S.opened);
  $('#modeBadge').textContent = '🎯 ' + MODES[S.mode].name;
  const bb = $('#boostBadge'); bb.classList.toggle('hidden', !S.boost);
  if (S.boost) bb.textContent = `⚡ BOOST x${fmt(S.boost.m)} · ${S.boost.inf ? '∞' : S.boost.left + ' restants'}`;
  const arr = probs(), pn = 1 - arr.reduce((a, x) => a + x[1], 0);
  $('#ratesTbl').innerHTML = '<tr><th>Objet</th><th>Officiel</th><th>Actuel</th></tr>' +
    arr.map(([it, p]) => `<tr style="${rc(it)}"><td><span class="dot"></span>${it.name}</td><td class="n">1 / ${fmt(it.odds)}</td><td class="n ${p > 1 / it.odds * 1.001 ? 'up' : ''}">${oddsTxt(p)}</td></tr>`).join('') +
    `<tr style="${rc(NONE)}"><td><span class="dot"></span>Rien</td><td class="n">98,4 %</td><td class="n">${(Math.max(0, pn) * 100).toFixed(2).replace('.', ',')} %</td></tr>`;
  $$('#segMode button').forEach(b => b.classList.toggle('on', b.dataset.v === S.mode));
  $$('#segAnim button').forEach(b => b.classList.toggle('on', b.dataset.v === S.anim));
  $('#boostList').innerHTML = BOOSTS.map((b, i) => { const act = S.boost && S.boost.m === b.m, ok = S.sandbox || S.coins >= b.cost;
    return `<div class="boost-c ${act ? 'act' : ''}"><span class="m">x${fmt(b.m)}</span><span class="d">${S.sandbox ? 'Illimité (mode libre)' : `${b.n} coffres · ${fmt(b.cost)} 💰`}<br>Jeton → ${oddsTxt(Math.min(1, 1 / 137500 * b.m))}</span>
      <button class="btn small" data-b="${i}" ${(!ok && !act) ? 'disabled' : ''}>${act ? 'Retirer' : 'Activer'}</button></div>`; }).join('');
  $('#sandbox').checked = S.sandbox;
  $('#invGrid').innerHTML = ITEMS.map(it => { const c = S.counts[it.id] || 0;
    return `<div class="inv-c ${c ? '' : 'lock'}" style="${rc(it)}"><div class="i">${ico(it)}</div><b>${it.name}</b><small>${c ? `×${fmt(c)} · 1er au #${fmt(S.first[it.id])}` : 'Pas encore obtenu'}</small></div>`; }).join('');
  const had = (1 - Math.pow(1 - 1 / 137500, S.opened)) * 100;
  $('#statsBox').innerHTML = [
    ['Coffres ouverts', fmt(S.opened)], ['Pièces', fmt(S.coins)],
    ['Meilleur drop', S.best ? byId[S.best].name : '—'], ['Jeton', S.first.token ? 'au coffre #' + fmt(S.first.token) : 'pas encore'],
    ['Objets trouvés', fmt(S.opened - (S.counts.none || 0))], ['Chance théorique d\'avoir eu le jeton', had.toFixed(2).replace('.', ',') + ' %'],
  ].map(([k, v]) => `<div class="tile"><small>${k}</small><b>${v}</b></div>`).join('');
  $('#hist').innerHTML = S.hist.map(h => { const it = byId[h.id]; return `<li style="${rc(it)}"><span>${it.name}</span><span>#${fmt(h.n)}</span></li>`; }).join('') || '<li style="--rc:#999">Rien pour l\'instant</li>';
  save();
}
function applyPrefs(){
  document.documentElement.dataset.theme = S.theme;
  $('#bTheme').textContent = S.theme === 'dark' ? '☀️' : '🌙';
  $('#bSound').classList.toggle('off', !S.sound); $('#bVib').classList.toggle('off', !S.vib);
  $('#spd').value = S.speed; $('#spdVal').textContent = 'x' + S.speed;
  $('#autoT').value = S.autoT; $('#estT').value = S.estT;
}

/* ---------- Init ---------- */
$('#logo').innerHTML = TOKEN_SVG;
$('#segMode').innerHTML = Object.entries(MODES).map(([k, m]) => `<button data-v="${k}">${m.name}</button>`).join('');
$('#estT').innerHTML = ITEMS.map(i => `<option value="${i.id}">${i.name} (1/${fmt(i.odds)})</option>`).join('') + '<option value="all">Toute la collection</option>';
$('#bOpen').onclick = openOne; $('#b10').onclick = () => openMany(10); $('#b100').onclick = () => openMany(100);
$('#bAuto').onclick = toggleAuto; $('#bEst').onclick = estimate;
$('#segAnim').onclick = e => { const v = e.target.closest('button')?.dataset.v; if (v) { S.anim = v; refresh(); } };
$('#segMode').onclick = e => { const v = e.target.closest('button')?.dataset.v; if (v) { S.mode = v; refresh(); } };
$('#spd').oninput = e => { S.speed = +e.target.value; $('#spdVal').textContent = 'x' + S.speed; save(); };
$('#autoT').onchange = e => { S.autoT = e.target.value; save(); };
$('#estT').onchange = e => { S.estT = e.target.value; save(); };
$('#sandbox').onchange = e => { S.sandbox = e.target.checked; if (S.boost) S.boost = null; refresh(); };
$('#boostList').onclick = e => { const i = e.target.dataset?.b; if (i == null) return; const b = BOOSTS[i];
  if (S.boost && S.boost.m === b.m) S.boost = null;
  else if (S.sandbox) S.boost = {m:b.m, inf:true};
  else if (S.coins >= b.cost) { S.coins -= b.cost; S.boost = {m:b.m, left:b.n}; sfx.reveal(4); say(`Boost x${fmt(b.m)} activé pour ${b.n} coffres ⚡`); }
  refresh(); };
$$('.tabs button').forEach(b => b.onclick = () => { $$('.tabs button').forEach(x => x.classList.toggle('on', x === b)); $$('.tab').forEach(t => t.classList.toggle('on', t.id === 't-' + b.dataset.t)); });
$('#bTheme').onclick = () => { S.theme = S.theme === 'dark' ? 'light' : 'dark'; applyPrefs(); save(); };
$('#bSound').onclick = () => { S.sound = !S.sound; applyPrefs(); save(); };
$('#bVib').onclick = () => { S.vib = !S.vib; applyPrefs(); save(); vib(40); };
$('#bReset').onclick = () => { if (confirm('Tout réinitialiser (stats, pièces, inventaire) ?')) { const k = {theme:S.theme, sound:S.sound, vib:S.vib, anim:S.anim, speed:S.speed}; S = Object.assign({}, DEF, k, {counts:{}, first:{}, hist:[]}); refresh(); idle(); } };
document.addEventListener('keydown', e => { if (e.code === 'Space' && !/INPUT|SELECT|BUTTON/.test(e.target.tagName)) { e.preventDefault(); openOne(); } });
addEventListener('resize', fitCanvas);
applyPrefs(); refresh(); idle(); fitCanvas(); requestAnimationFrame(frame);
