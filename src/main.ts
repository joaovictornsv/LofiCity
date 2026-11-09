/* LoFi City — procedural lo-fi pixel scenes that follow each city's real clock and live weather. */
import './style.css';
import { G, frameFor, setFrame } from './engine/gfx';
import { backend, initPost, layout, opts, present, toFrame } from './engine/post';
import { sfx } from './audio/sfx';
import { drawEmotes, emote } from './fx/emotes';
import { clearBubbles, say, updateBubbles } from './fx/bubbles';
import { pickPhrase, remember } from './actors/speech-rules';
import type { Speaker } from './scenes/types';
import { tapAnimals } from './actors/animals';
import { clearPeople, rainDebug, tapPeople } from './actors/people';
import { tapCars } from './actors/cars';
import { audio } from './audio/audio';
import { radio } from './audio/radio';
import { bells } from './audio/bells';
import { precip, updatePrecip } from './fx/precip';
import { animalsDebug } from './actors/animals';
import { ambientDebug } from './actors/ambient';
import { brTrafficDebug } from './actors/br-traffic';
import { fireworksStats, updateSkyEvents, lightning } from './fx/sky-events';
import { gradePalette } from './sky/grade';
import { S, direct, settle, wxOverride } from './sky/state';
import { type City, cityById } from './sky/cities';
import { mountCityMap } from './ui/city-map';
import { followLive, weatherView } from './sky/live';
import { hudWeather, manualLightningAllowed } from './sky/weather-feed';
import { updateSky } from './scenes/common';
import { nextScene, pickScene } from './scenes';
import { cardFileName, shareUrl, viewHash } from './share-rules';
import { copyText, downloadCanvas, drawCard } from './share';
import { inject, pageview } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';

const $ = (id: string) => document.getElementById(id)!;
const params = new URLSearchParams(location.hash.slice(1));

// ---------- clock ----------
// Always the city's real time. #city=esperanca picks a city; #at=2026-12-24T22:00 (city time)
// pins a moment for previews and screenshots only: the UI has no way to move time.
let stored: string | null = null;
try { stored = localStorage.getItem('loficity:city'); } catch { /* storage unavailable */ }
let city: City = cityById(params.get('city') ?? stored);
let simOffset = 0;
function pinMoment() {
  simOffset = 0;
  const at = params.get('at');
  if (!at) return;
  const off = city.utc, t = Date.parse(`${at}${off < 0 ? '-' : '+'}${String(Math.abs(off)).padStart(2, '0')}:00`);
  if (!Number.isNaN(t)) simOffset = t - Date.now();
}
pinMoment();
const simNow = () => Date.now() + simOffset;
followLive(city);

// ---------- analytics (Vercel, Hobby plan: page views + Web Vitals, cookieless) ----------
// Page views are reported as /tokyo or /esperanca so the dashboard shows which city people watch.
const hosted = location.protocol === 'https:' && !/^(localhost|127\.)/.test(location.hostname);
if (hosted) {
  // One page view per city: the hash now follows the scene (permalink), and those history updates must
  // not count as extra visits.
  let lastView = '';
  inject({ beforeSend: (e) => {
    const url = `${location.origin}/${city.id}`;
    if (e.type === 'pageview') { if (url === lastView) return null; lastView = url; }
    return { ...e, url };
  } });
  injectSpeedInsights();
}

// ---------- frame + scene ----------
initPost();
function resize() {
  const f = frameFor(innerWidth / innerHeight);
  if (f.W !== G.W || f.H !== G.H) setFrame(f.W, f.H);
  layout();
}
addEventListener('resize', resize);
resize();

let scene = pickScene(city.id);
settle(simNow(), city);
direct(simNow(), city, 0, scene.id);
scene.build();

// ---------- permalink ----------
// The address bar always holds the current view (#city= #scene=, plus #at= when a moment is pinned), so
// copying it reopens the same place. replaceState: no history entries, no hashchange, nothing reloads.
const pinnedAt = () => (simOffset !== 0 ? params.get('at') : null);
const view = () => ({ city: city.id, scene: scene.id, at: pinnedAt() });
function syncHash() {
  const h = viewHash(location.hash, view());
  if (h !== location.hash) try { history.replaceState(history.state, '', h); } catch { /* sandboxed */ }
}
syncHash();

// ---------- HUD ----------
const WEEK = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MONTH = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const pad2 = (n: number) => String(n | 0).padStart(2, '0');

function weatherWord(): string {
  if (S.storm > 0.45) return S.snow > S.rain ? 'nevasca' : 'tempestade';
  if (S.snow > 0.6) return 'nevasca';
  if (S.snow > 0.25) return 'neve';
  if (S.snow > 0.03) return 'neve fraca';
  if (S.storm > 0.2 && S.rain > 0.3) return 'trovoadas';
  if (S.rain > 0.7) return 'chuva forte';
  if (S.rain > 0.35) return 'chuva';
  if (S.rain > 0.05) return 'garoa';
  if (S.fog > 0.5) return 'neblina';
  if (S.cloud > 0.75) return 'nublado';
  if (S.cloud > 0.35) return 'parcialmente nublado';
  return S.dayK > 0.5 ? 'céu limpo' : 'noite limpa';
}
function seasonWord(): string {
  const m = S.cal.month;
  if (city.br) {
    const tags: string[] = [];
    if (city.climate === 'litoral') tags.push(m >= 3 && m <= 7 ? 'inverno chuvoso' : 'verão');
    else if (m >= 2 && m <= 6) tags.push('quadra chuvosa');
    if (S.festa) tags.push(S.procissao ? 'procissão' : 'festa da padroeira');
    if (S.saoJoao) tags.push('são joão');
    if (S.natal && !S.festa) tags.push('natal');
    if (S.fireworks) tags.push('fogos');
    return tags.join(' · ');
  }
  const season = m <= 1 || m === 11 ? 'inverno' : m <= 4 ? 'primavera' : m <= 7 ? 'verão' : 'outono';
  const tags: string[] = [];
  if (S.petals > 0.2 || S.tree.pink > 0.3) tags.push('sakura');
  if (S.tsuyu) tags.push('tsuyu');
  if (S.fireworks) tags.push('hanabi');
  if (S.tree.red > 0.4 && S.tree.density > 0.2) tags.push('momiji');
  if (S.snowCover > 0.3) tags.push('tudo branco');
  return [season, ...tags].join(' · ');
}
function updateHud() {
  const c = S.cal;
  $('clock').textContent = `${pad2(c.hour)}:${pad2((c.hour % 1) * 60)}`;
  $('date').textContent = `${WEEK[c.weekday]} ${c.day} ${MONTH[c.month]} · ${city.utc < 0 ? 'horário de Brasília' : 'horário de Tóquio'}`;
  // Weather text comes only from a genuine reading (or the clearly labelled #wx= test override).
  const pinned = simOffset !== 0, v = weatherView(city.id), reading = !pinned && v.kind !== 'unavailable' ? v.feed.now : null;
  const h = hudWeather({
    kind: S.wxKind, word: weatherWord(), now: Date.now(), utc: city.utc, pinned, override: wxOverride ?? undefined,
    temp: reading ? reading.temp : S.temp ?? undefined, feels: reading?.feels, humidity: reading?.humidity, at: reading?.t,
  });
  $('temp').textContent = h.temp;
  $('wx').textContent = h.text;
  const badge = $('live');
  badge.hidden = !h.badge;
  if (h.badge) { badge.textContent = h.badge.text; badge.className = `live ${h.badge.cls}`; }
  const season = seasonWord();
  $('season').textContent = season;
  $('season').hidden = !season; // sertão dry season has no tag: don't leave an empty HUD row
}

// ---------- controls ----------
// technical panel for development and screenshots only: open the page with #debug
const showDebug = params.has('debug');
$('debug').hidden = !showDebug;
const press = (id: string, on: boolean) => $(id).setAttribute('aria-pressed', on ? 'true' : 'false');
function setCity(id: string) {
  city = cityById(id);
  try { localStorage.setItem('loficity:city', city.id); } catch { /* ignore */ }
  cityMap.refresh();
  pinMoment();
  followLive(city);
  clearBubbles(); clearPeople();
  scene = pickScene(city.id);
  settle(simNow(), city); direct(simNow(), city, 0, scene.id);
  scene.build();
  syncBells();
  syncHash();
  updateHud();
  if (hosted) pageview({ route: '/[city]', path: `/${city.id}` });
}
// Esperança's church bells strike the hours (see audio/bells.ts); re-synced on every change that matters.
const syncBells = () => bells.sync(() => ({ cityId: city.id, utc: city.utc, pinned: simOffset !== 0, near: scene.id === 'praca-matriz' }));
addEventListener('pagehide', () => bells.dispose());
addEventListener('pageshow', (e) => { if (e.persisted) syncBells(); }); // back from the bfcache
const actions: Record<string, () => void> = {
  sound: () => { press('b-sound', audio.toggle()); syncBells(); },
  crt: () => { opts.crt = !opts.crt; press('b-crt', opts.crt); },
  city: () => cityMap.open(),
  scene: () => { clearBubbles(); clearPeople(); scene = nextScene(city.id, scene); direct(simNow(), city, 0, scene.id); scene.build(); syncBells(); syncHash(); },
  music: () => radio.toggle(),
  station: () => radio.nextStation(),
  skip: () => radio.skip(),
  // test tool only (#debug or #wx=); in normal use lightning comes only from real storm data
  lightning: () => { if (manualLightningAllowed({ debug: showDebug, wxOverride })) lightning.strike(); },
  full: () => {
    const d = document;
    if (d.fullscreenElement) void d.exitFullscreen?.().catch(() => {});
    else void d.documentElement.requestFullscreen?.().then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape')).catch(() => {});
  },
};
const BUTTONS: [string, string][] = [
  ['b-sound', 'sound'], ['b-crt', 'crt'], ['b-scene', 'scene'], ['b-full', 'full'],
];
for (const [id, a] of BUTTONS) $(id).addEventListener('click', actions[a]);
// City picker: a pixel map of Paraíba (src/ui/city-map.ts); it calls setCity, so transitions, weather and clock stay the same.
const cityMap = mountCityMap({ trigger: $('city') as HTMLButtonElement, current: () => city.id, onPick: setCity });
radio.mount($('radio'));
// "rotate your phone" overlay (shown by CSS on upright touch screens); dismissal lasts for the session
try { if (sessionStorage.getItem('loficity:portrait-ok')) document.body.classList.add('portrait-ok'); } catch { /* ignore */ }
$('rotate-ok').addEventListener('click', () => {
  document.body.classList.add('portrait-ok');
  try { sessionStorage.setItem('loficity:portrait-ok', '1'); } catch { /* ignore */ }
});

// Eye button: hides the whole HUD (info, radio, controls, credit) for a clean view. Only DOM state changes,
// so the radio and ambience keep doing whatever they were doing. `hidden` + `inert` keep the hidden
// panels out of the tab order and away from taps, so the scene underneath stays tappable.
const HUD_PARTS = ['.hud', '.radio', '.bar', '.credit'];
const eye = $('b-hud');
function setHud(show: boolean, save = true) {
  const active = document.activeElement;
  for (const s of HUD_PARTS) {
    const el = document.querySelector<HTMLElement>(s);
    if (!el) continue;
    el.hidden = !show; el.inert = !show;
    if (!show && active instanceof HTMLElement && el.contains(active)) eye.focus();
  }
  document.body.classList.toggle('hud-off', !show);
  const label = show ? 'Ocultar painel' : 'Mostrar painel';
  eye.setAttribute('aria-label', label); eye.title = `${label} (H)`;
  press('b-hud', !show);
  if (save) try { localStorage.setItem('loficity:hud', show ? 'on' : 'off'); } catch { /* ignore */ }
}
actions.hud = () => setHud(document.body.classList.contains('hud-off'));
eye.addEventListener('click', actions.hud);
let hudPref: string | null = null;
try { hudPref = localStorage.getItem('loficity:hud'); } catch { /* storage unavailable */ }
if (hudPref === 'off') setHud(false, false);

// Upright phones stack the radio under the info panel; publish the panel's real height (it grows when
// the city or weather line wraps) so the CSS can place the radio right below it.
// The control bar goes right under the radio the same way (--radio-h), so the street at the bottom of
// the frame (e.g. the Matriz road and zebra) is not covered.
for (const [sel, prop] of [['.hud', '--hud-h'], ['.radio', '--radio-h']]) {
  const el = document.querySelector<HTMLElement>(sel);
  if (el) new ResizeObserver(() => {
    if (el.offsetHeight) document.documentElement.style.setProperty(prop, `${el.offsetHeight}px`);
  }).observe(el);
}

// Share: copy the permalink or save a story card. Both are local only (clipboard / file download); the
// person sends them on their own. No radio or ambience calls here, so playback is never touched.
const shareBtn = $('b-share'), shareMenu = $('share-menu'), toastEl = $('toast');
let toastTimer = 0, shareOpen = false;
function toast(text: string) {
  toastEl.textContent = text; toastEl.hidden = false;
  clearTimeout(toastTimer); toastTimer = window.setTimeout(() => { toastEl.hidden = true; }, 1800);
}
function setShareMenu(open: boolean) {
  shareOpen = open; shareMenu.hidden = !open; shareBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) (shareMenu.querySelector('button') as HTMLButtonElement | null)?.focus({ preventScroll: true });
}
shareBtn.addEventListener('click', () => setShareMenu(!shareOpen));
document.addEventListener('pointerdown', (e) => { if (shareOpen && !$('share').contains(e.target as Node)) setShareMenu(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && shareOpen) { setShareMenu(false); shareBtn.focus(); } });
$('b-copy').addEventListener('click', async () => {
  setShareMenu(false);
  toast(await copyText(shareUrl(location.href, view())) ? 'Link copiado' : 'Não foi possível copiar');
});
const cardBtn = $('b-card') as HTMLButtonElement;
cardBtn.addEventListener('click', async () => {
  cardBtn.disabled = true;
  try {
    const c = S.cal;
    const card = await drawCard(() => scene.render(), {
      city: city.name, scene: scene.name, time: `${pad2(c.hour)}:${pad2((c.hour % 1) * 60)}`,
      date: `${WEEK[c.weekday]} ${c.day} ${MONTH[c.month]} · ${city.utc < 0 ? 'horário de Brasília' : 'horário de Tóquio'}`,
    });
    toast(await downloadCanvas(card, cardFileName(view(), c.hour)) ? 'Card salvo' : 'Não foi possível gerar o card');
  } catch { toast('Não foi possível gerar o card'); }
  finally { cardBtn.disabled = false; setShareMenu(false); }
});

const KEYS: Record<string, string> = {
  m: 'sound', r: 'music', p: 'station', n: 'skip', c: 'crt', t: 'city', s: 'scene', l: 'lightning', h: 'hud', enter: 'full',
};
addEventListener('keydown', (e) => {
  const tag = (e.target as HTMLElement).tagName;
  if (tag === 'SELECT' || tag === 'INPUT' || (tag === 'BUTTON' && e.key === 'Enter')) return;
  if (cityMap.isOpen()) return; // the map is modal: no scene shortcuts behind it (Esc closes it natively)
  if (e.ctrlKey || e.metaKey || e.altKey) return; // leave browser shortcuts (Ctrl +/-, Ctrl+H...) alone
  const a = KEYS[e.key.toLowerCase()];
  if (a) actions[a]();
});
// No dblclick-to-fullscreen on the canvas: two quick taps on something that moves fired it and the
// page seemed to zoom. Fullscreen stays on the button and Enter.
// People say a short phrase that fits the city, the scene, the hour and the real weather (speech-rules.ts),
// in a silent bubble; the recent ones are kept out so the same line doesn't come right back.
let recentPhrases: string[] = [];
function speak(who: Speaker, x: number, y: number) {
  const text = pickPhrase({
    city: city.id, scene: scene.id, hour: S.cal.hour, role: who.role,
    wx: { kind: S.wxKind, temp: S.temp, rain: S.rain, snow: S.snow },
  }, recentPhrases, Math.random);
  if (!text) return;
  recentPhrases = remember(recentPhrases, text);
  say(text, { x, y }, who.track);
}
// Tap what moves: birds fly off, cats bolt, dogs bark and run, people talk, vehicles honk.
$('view').addEventListener('pointerdown', (e) => {
  const f = toFrame(e.clientX, e.clientY), x = f.x + G.camX, y = f.y - G.oy;
  const a = tapAnimals(x, y);
  if (a) { sfx(a.kind === 'bird' ? 'chirp' : a.kind === 'cat' ? 'meow' : 'bark'); emote(a.x, a.y, a.kind === 'bird' ? '♪' : '!'); return; }
  const p = tapPeople(x, y);
  if (p) { if (p.dog) sfx('bark'); speak({ role: 'passerby', track: p.track }, p.x, p.y); return; } // the dog still barks
  const c = tapCars(x, y);
  if (c) { sfx(c.sound); emote(c.x, c.y, '♪'); return; }
  const prop = scene.tap?.(x, y);
  if (prop?.speaker) speak(prop.speaker, prop.x, prop.y);
  else if (prop?.sfx) { sfx(prop.sfx); emote(prop.x, prop.y, '♪'); }
});

let idleTimer = 0, wakeLock: WakeLockSentinel | null = null;
function requestWake() {
  if (wakeLock || !navigator.wakeLock) return;
  navigator.wakeLock.request('screen').then((l) => { wakeLock = l; l.addEventListener('release', () => { wakeLock = null; }); }).catch(() => {});
}
function wake() {
  document.body.classList.remove('idle');
  clearTimeout(idleTimer);
  idleTimer = window.setTimeout(() => {
    if (document.activeElement?.closest('.ui, dialog[open]') || shareOpen) return; // keep controls up while one is focused, the city map or the share menu is open
    document.body.classList.add('idle'); $('hint').hidden = true;
  }, 3500);
  requestWake();
}
for (const ev of ['pointermove', 'pointerdown', 'keydown']) addEventListener(ev, wake, { passive: true });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') requestWake(); });

// ---------- main loop ----------
let last = performance.now(), frames = 0, fps = 0, fpsT = 0, workMs = 2, uiT = 1, audioT = 0, clock = 0;
function frame(now: number) {
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.25) dt = 0.25;
  const t0 = performance.now();
  clock += dt;
  const hadData = S.wxKind !== 'unavailable';
  direct(simNow(), city, dt, scene.id);
  // the first genuine reading arrived: rebuild wet streets / snow cover from its past hours
  if (!hadData && S.wxKind !== 'unavailable') { settle(simNow(), city); direct(simNow(), city, 0, scene.id); }
  updateSky(dt); updateSkyEvents(dt); updatePrecip(dt); scene.update(dt);
  scene.render();
  drawEmotes(dt);
  gradePalette();
  present(clock, S.shake, S.dayK);
  updateBubbles(now);
  workMs = workMs * 0.95 + (performance.now() - t0) * 0.05;
  frames++; fpsT += dt; uiT += dt; audioT += dt;
  if (audioT > 0.5) { audioT = 0; audio.tick(); }
  if (fpsT >= 1) {
    fps = Math.round(frames / fpsT); frames = 0; fpsT = 0;
    if (workMs > 9 && precip.rainCap > 200) precip.rainCap -= 40; else if (workMs < 4 && precip.rainCap < 850) precip.rainCap += 15;
  }
  if (uiT >= 0.25) {
    uiT = 0; updateHud();
    if (showDebug) $('debug').textContent =
`scene   ${scene.name}   frame ${G.W}x${G.H}
time    ${new Date(simNow()).toISOString().slice(0, 16)}Z   ${city.id}   weather ${S.wxKind}
sun     ${S.sunElev.toFixed(1)}°  day ${S.dayK.toFixed(2)}  gold ${S.golden.toFixed(2)}  moon ${S.moonPhase.toFixed(2)}
wx      rain ${S.rain.toFixed(2)} snow ${S.snow.toFixed(2)} storm ${S.storm.toFixed(2)} cloud ${S.cloud.toFixed(2)}
        fog ${S.fog.toFixed(2)} wind ${S.wind.toFixed(2)} wet ${S.wet.toFixed(2)} cover ${S.snowCover.toFixed(2)} temp ${S.temp === null ? 'unknown' : S.temp.toFixed(1)}
people  ${rainDebug()}
busy    ${S.busy.toFixed(2)}  traffic ${S.traffic.toFixed(2)}  birds ${S.birds.toFixed(2)}   tree d${S.tree.density.toFixed(2)} p${S.tree.pink.toFixed(2)} r${S.tree.red.toFixed(2)}
${scene.debug()}
fps     ${fps}   work ${workMs.toFixed(1)} ms   ${backend()}
drops   ${precip.liveDrops}/${precip.rainCap}  flakes ${precip.liveFlakes}  leaves ${precip.liveLeaves}
fx      ${fireworksStats()}  fireworks ${S.fireworks}   radio ${radio.status()}   bells ${bells.status()}${city.br ? `
life    ${animalsDebug()}
ambient ${ambientDebug(scene.id)}
traffic ${brTrafficDebug() || '-'}` : ''}`;
  }
  requestAnimationFrame(frame);
}
updateHud();
wake();
requestAnimationFrame(frame);
