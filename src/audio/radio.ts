/* Two radio stations playing real recordings released under Creative Commons, streamed from
   the Internet Archive (no key, CORS open). Each station is a curated list of albums put
   online by their own netlabels; tracks are fetched live from archive.org's metadata API,
   shuffled across albums, and every track shows artist, album and license as attribution.

   Every album below was checked on https://archive.org/metadata/<id> (title, creator,
   licenseurl, subjects, the label's description and the track list) in Nov 2026. Nobody
   listened to the audio: the curation rests on that written metadata only.
   The licenses are mostly non-commercial: fine for this free app; check before monetizing.

   Tracks that break the mood are skipped when an album loads: intros, interludes, skits,
   vocal features, vocal versions, covers and tributes, anything shorter than MIN_S, and long
   ambient pieces or continuous mixes longer than MAX_S. */

type StationId = 'lofi' | 'neon';
interface Station {
  id: StationId;
  name: string;
  /** Short genre label shown under the station name (pt-BR). */
  tag: string;
  albums: string[];
}
const STATIONS: Station[] = [
  {
    // Strictly instrumental: only Dusted Wax Kingdom releases whose label description itself says
    // "instrumental" and whose track list shows no featured singer or MC. All CC BY-NC-ND 3.0
    // except DWK256 (CC BY-NC-ND 4.0). Dropped in Nov 2026 for vocals or missing evidence: Anitek
    // "Luna" (seven tracks feat. singers), ProleteR (chanson samples, feat. MCs), Jazz One Beats
    // (tracks named after rappers), Mounika, Esbe vol. 1, Anitek "Sae Yeon", Poldoore, Lo-Fi
    // Scientists and Jenova 7 (descriptions never say instrumental; several have vocal features).
    // Sample-based beats can still carry a short vocal chop that no metadata reveals.
    id: 'lofi', name: 'Lo-Fi City', tag: 'beats lo-fi · hip-hop instrumental',
    albums: [
      'DWK127', // Kova - Cookin' Session: "5 ... instrumental hip-hop beats to chill, refresh and dream to"
      'DWK163', // deeB - Daydream: "10 tracks of melodic acid jazz and instrumental hip-hop"
      'DWK208', // deeB - Thru Nature: "enchanting jazzy instrumental hip-hop beats"
      'DWK138', // Romo - Listen, Love: "12 tracks of instrumental jazzy hip-hop"
      'DWK154', // Thegntlmn - Earbuds (Volume 1): "a pure instrumental hip-hop gem"
      'DWK187', // Thegntlmn - Earbuds (Volume 2): "8 instrumental hip-hop joints"
      'DWK212', // Derlee - Mellow Morning: "downtempo soulful instrumental hip-hop"
      'DWK209', // Fredo - First Movements: "12 chilled instrumental hip-hop joints"
      'DWK129', // DJ Mentos - Field of Vision: "jazzy lo-fi instrumental hip-hop joints"
      'DWK256', // JCreate - Musical Introspection: "14 instrumental hip-hop tracks"
    ],
  },
  {
    // Dreamy retro synth (dreamwave, chillsynth, chillwave, ambient synthwave), chosen in Nov 2026
    // after the vaporwave picks were dropped. Each album sits in its netlabel's archive.org
    // collection; genre evidence below is from its subjects/description. Darksynth, outrun-heavy,
    // horror-synth, noise and meme releases were left out.
    id: 'neon', name: 'Neon FM', tag: 'dreamwave · chillsynth',
    albums: [
      'LeeRosevere_Synthcronicity', // Lee Rosevere - Synthcronicity, Happy Puppy Records; retrowave, synthwave, instrumental; CC BY-NC 3.0
      'cior-198-proton42-sub-suburbia-ep', // Proton 42 - Sub-Suburbia, Cian Orbe; "synth ambient", sadwave, atmospheric, retrowave; CC BY-NC-ND 4.0
      'toulp13', // Psychadelik Pedestrian - All Of Time, Toucan Music; synthwave, chillout, "retro 1980s synth sounds"; CC BY-NC-SA 4.0
      'KSBPCoast2Coast', // Kansas Beach Patrol - Coast to Coast; chillwave, dream pop, glo-fi, "remastered instrumentals"; CC BY 3.0
      'Mam135-Evenings-NorthDormEp', // Evenings - North Dorm EP, mam!records; chillwave, glo-fi, ambient; CC BY-NC-ND 3.0
      'SBWS194', // Tiiiza - W8 EP, Subwise; dreamwave, dream pop, synthpop, downtempo; CC BY-ND 3.0
      'district-lost-beyond-comprehension', // District Lost - Beyond Comprehension; vapor ambient, dreamcore, VHS, retrowave; CC BY-NC-ND 4.0
    ],
  },
];

/** Tracks shorter or longer than this (seconds) are skipped: fragments, ambient epics, DJ mixes. */
const MIN_S = 75, MAX_S = 480;
const SKIP_TITLE = /\b(intro|outro|interlude|skit|reprise|tribute|cover|vocals?|acapella|a cappella)\b|\(int\.?\)|\b(feat|ft)\b/i;

interface Track { url: string; title: string; artist: string; album: string; license: string; page: string }

const LICENSE: [RegExp, string][] = [
  [/publicdomain\/zero/, 'CC0'], [/publicdomain/, 'domínio público'],
  [/licenses\/([a-z-]+)\/([\d.]+)/, ''],
];
function licenseName(url: string): string {
  for (const [re, name] of LICENSE) {
    const m = re.exec(url);
    if (m) return name || `CC ${m[1].toUpperCase()} ${m[2]}`;
  }
  return 'Creative Commons';
}

/** archive.org lengths come as seconds ("246.44") or as "mm:ss" / "h:mm:ss". NaN when unknown. */
function seconds(len: unknown): number {
  if (typeof len !== 'string' && typeof len !== 'number') return NaN;
  const parts = String(len).split(':').map(Number);
  return parts.reduce((a, p) => a * 60 + p, 0);
}

/** "ProleteR_-_01_-_April_Showers.mp3" → "April Showers"; used only when the file has no title tag. */
function titleFromName(name: string): string {
  return name.replace(/^.*\//, '').replace(/\.mp3$/i, '').replace(/_vbr$/i, '').replace(/_/g, ' ')
    .replace(/^(?:.* - )?\d{1,3}\s*[-.]?\s+/, '').trim();
}

interface ArchiveFile { name: string; source?: string; format?: string; title?: string; artist?: string; creator?: string; length?: string }

const albumCache = new Map<string, Track[]>();
async function loadAlbum(id: string): Promise<Track[]> {
  const hit = albumCache.get(id);
  if (hit) return hit;
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), FETCH_MS);
  let j: { metadata?: Record<string, unknown>; files?: ArchiveFile[] };
  try {
    const res = await fetch(`https://archive.org/metadata/${encodeURIComponent(id)}`, { signal: ctl.signal });
    if (!res.ok) throw new Error(`archive ${res.status}`);
    j = await res.json();
  } finally { clearTimeout(to); }
  const md = j.metadata ?? {}, files = j.files ?? [];
  // archive.org's VBR derivatives are a fraction of the originals' size, so they start sooner
  const mp3 = files.filter((f) => /\.mp3$/i.test(f.name) && !/_64kb\.mp3$/i.test(f.name));
  const vbr = mp3.filter((f) => f.format === 'VBR MP3'), orig = mp3.filter((f) => f.source === 'original');
  const pick = vbr.length ? vbr : orig.length ? orig : mp3;
  const creator = String((Array.isArray(md.creator) ? md.creator[0] : md.creator) ?? '');
  const tracks = pick.flatMap((f) => {
    const title = f.title || titleFromName(f.name), len = seconds(f.length);
    if (SKIP_TITLE.test(title) || SKIP_TITLE.test(f.name.replace(/_/g, ' '))) return [];
    if (len < MIN_S || len > MAX_S) return []; // NaN (unknown length) passes
    return [{
      url: `https://archive.org/download/${encodeURIComponent(id)}/${f.name.split('/').map(encodeURIComponent).join('/')}`,
      title, artist: f.artist || f.creator || creator || 'artista desconhecido',
      album: String(md.title ?? id).replace(/\s*[[(][a-z0-9_-]*\d+[\])]\s*$/i, ''),
      license: licenseName(String(md.licenseurl ?? '')), page: `https://archive.org/details/${id}`,
    }];
  });
  albumCache.set(id, tracks);
  return tracks;
}

// ---------- player ----------
// Two players: one plays while the other buffers the next track, so changes are near instant
// even when archive.org is slow to start a stream.
const players = [new Audio(), new Audio()];
for (const p of players) p.preload = 'auto';
let active = 0;
const audio = () => players[active], spare = () => players[1 - active];

/** A stream that has not started after this long is skipped; so is one stuck buffering mid-track. */
const START_MS = 15000, STALL_MS = 20000, FETCH_MS = 12000;
/** Consecutive failures before the radio gives up and waits for the listener. */
const MAX_FAILS = 5;
/** Each track fades in, so a stream never bursts in at full volume. */
const FADE_IN_MS = 1200;

let el: HTMLElement | null = null, playing = false, si = 0, volume = 0.7;
let current: Track | null = null, preloaded: Track | null = null, queue: Track[] = [], recent: string[] = [];
let fails = 0, gen = 0, startTimer = 0, stallTimer = 0, retryTimer = 0, fadeTimer = 0;
/** Status line (pt-BR) shown instead of the track while tuning, retrying or failed; '' when playing fine. */
let status = '';
const badAlbums = new Set<string>(), badTracks = new Set<string>();
try {
  const saved = localStorage.getItem('loficity:station');
  si = Math.max(0, STATIONS.findIndex((s) => s.id === (saved === 'vapor' ? 'neon' : saved)));
  volume = Number(localStorage.getItem('loficity:volume') ?? 0.7);
} catch { /* storage unavailable */ }
if (!Number.isFinite(volume) || volume < 0 || volume > 1) volume = 0.7;
for (const p of players) p.volume = volume;
const station = () => STATIONS[si];

function clearTimers() {
  clearTimeout(startTimer); clearTimeout(stallTimer); clearTimeout(retryTimer);
  startTimer = stallTimer = retryTimer = 0;
}

/** Ramp a player's volume (ignored on iOS, where element volume is read-only). */
function fade(p: HTMLAudioElement, to: number, ms: number, done?: () => void) {
  clearInterval(fadeTimer);
  const from = p.volume, t0 = performance.now();
  fadeTimer = window.setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    p.volume = Math.max(0, Math.min(1, from + (to - from) * k));
    if (k >= 1) { clearInterval(fadeTimer); done?.(); }
  }, 30);
}

/** Refill the queue with a few shuffled tracks from an album not played recently. */
async function refill() {
  const s = station(), ok = s.albums.filter((a) => !badAlbums.has(a));
  if (!ok.length) throw new Error('no albums');
  const fresh = ok.filter((a) => !recent.includes(a)), pool = fresh.length ? fresh : ok;
  const id = pool[(Math.random() * pool.length) | 0];
  recent.push(id); if (recent.length > Math.min(6, s.albums.length - 1)) recent.shift();
  let tracks: Track[];
  try { tracks = (await loadAlbum(id)).filter((t) => !badTracks.has(t.url)); } catch (e) { badAlbums.add(id); throw e; }
  if (!tracks.length) { badAlbums.add(id); throw new Error('empty album'); }
  tracks = [...tracks];
  for (let i = tracks.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [tracks[i], tracks[j]] = [tracks[j], tracks[i]]; }
  queue.push(...tracks.slice(0, 4)); // a few from this album, then move on
}

/** Something went wrong with the current attempt: skip after a short, growing pause, or give up. */
function fail(my: number, what: string) {
  if (my !== gen || !playing) return;
  clearTimers();
  if (current) badTracks.add(current.url);
  queue = queue.filter((t) => !badTracks.has(t.url));
  if (++fails >= MAX_FAILS) {
    playing = false; audio().pause();
    status = navigator.onLine === false ? 'sem internet · toque em Tocar para tentar de novo'
      : 'o Internet Archive não respondeu · toque em Tocar para tentar de novo';
    render();
    return;
  }
  status = `${what} · pulando (${fails}/${MAX_FAILS})…`;
  render();
  retryTimer = window.setTimeout(() => { if (my === gen && playing) void next(); }, 800 * fails);
}

async function next() {
  const my = ++gen;
  clearTimers();
  clearInterval(fadeTimer);
  const prev = audio();
  prev.pause();
  status = 'sintonizando…'; render();
  let t: Track | undefined;
  try {
    if (!queue.length) await refill();
    if (my !== gen) return; // superseded by a newer skip, a stop or a station change
    do t = queue.shift(); while (t && badTracks.has(t.url)); // e.g. its preload already failed
    if (!t) throw new Error('empty');
  } catch {
    current = null;
    fail(my, 'álbum indisponível');
    return;
  }
  current = t;
  if (preloaded === t) active = 1 - active; else audio().src = t.url;
  preloaded = null;
  const p = audio();
  p.volume = 0;
  if (playing) p.play().catch((e) => {
    // The browser refused to autoplay before any gesture: wait quietly for the first one. Anything
    // else (bad source) surfaces as 'error' or the start timer.
    if (e?.name === 'NotAllowedError' && my === gen && autoTry) blocked();
  });
  startTimer = window.setTimeout(() => { if (my === gen && playing && p.readyState < 3) fail(my, 'faixa não carregou'); }, START_MS);
  if ('mediaSession' in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist, album: `${t.album} · ${station().name}` });
  render();
}

/** Start buffering the upcoming track in the idle player. */
async function preloadNext() {
  const my = gen;
  if (!queue.length) { try { await refill(); } catch { return; } }
  const t = queue[0];
  if (my !== gen || !t || preloaded === t) return;
  preloaded = t; spare().src = t.url; spare().load();
}

for (const p of players) {
  p.addEventListener('ended', () => { if (p === audio() && playing) void next(); });
  p.addEventListener('playing', () => {
    if (p !== audio()) return;
    fails = 0; status = ''; clearTimers();
    fade(p, volume, FADE_IN_MS);
    render(); void preloadNext();
  });
  p.addEventListener('waiting', () => {
    if (p !== audio() || !playing || startTimer) return;
    const my = gen;
    clearTimeout(stallTimer);
    stallTimer = window.setTimeout(() => { if (my === gen && playing && p.readyState < 3) fail(my, 'conexão travou'); }, STALL_MS);
  });
  p.addEventListener('error', () => {
    if (p !== audio()) { if (preloaded) badTracks.add(preloaded.url); preloaded = null; return; }
    if (playing && current && p.getAttribute('src')) fail(gen, 'faixa indisponível');
  });
}

// ---------- autoplay ----------
// The radio tries to start by itself on load. Browsers refuse that until the page has had a
// gesture, so then it stays off and starts on the first tap / key press anywhere. Anything the
// listener does to the radio itself (Tocar, Próxima, station, R / N / P) wins over the autostart.
let autoTry = false, touched = false;
const GESTURES = ['pointerdown', 'keydown', 'touchend'] as const;
function disarm() { for (const g of GESTURES) removeEventListener(g, onGesture, true); }
function onGesture() {
  disarm();
  setTimeout(() => { if (!touched && !playing) { autoTry = false; start(); } }, 0); // after the click / key handlers ran
}
function blocked() {
  autoTry = false;
  playing = false; gen++; clearTimers(); clearInterval(fadeTimer);
  status = ''; current = null; render();
  for (const g of GESTURES) addEventListener(g, onGesture, { capture: true, passive: true });
}
function autostart() {
  if (playing || touched) return;
  autoTry = true;
  start();
}

/** After giving up, the listener's next Tocar/Próxima is a fresh try: forget the failures (likely an outage). */
function freshTry() {
  if (fails >= MAX_FAILS) { fails = 0; badAlbums.clear(); badTracks.clear(); }
}
function start() {
  playing = true;
  freshTry();
  if (!current || status) void next();
  else { void audio().play().catch(() => {}); }
  render();
}
function stop() {
  playing = false; gen++; clearTimers(); clearInterval(fadeTimer);
  audio().pause(); audio().volume = volume;
  if (status) { status = ''; current = null; }
  render();
}
function toggle() { touched = true; disarm(); if (playing) stop(); else start(); }
function setStation(i: number) {
  touched = true; disarm();
  if (i === si) return;
  si = i;
  try { localStorage.setItem('loficity:station', station().id); } catch { /* ignore */ }
  gen++; clearTimers(); clearInterval(fadeTimer);
  queue = []; recent = []; current = null; preloaded = null; fails = 0; status = '';
  for (const p of players) { p.pause(); p.removeAttribute('src'); p.load(); p.volume = volume; }
  if (playing) void next(); else render();
}
function nextStation() { setStation((si + 1) % STATIONS.length); }
function skip() { touched = true; disarm(); playing = true; freshTry(); void next(); }

// ---------- panel ----------
function render() {
  if (!el) return;
  const s = station();
  el.className = `radio st-${s.id}${playing ? ' playing' : ''}${status ? ' busy' : ''}`;
  el.dataset.station = s.id;
  (el.querySelector('.station') as HTMLElement).textContent = s.name;
  (el.querySelector('.tag') as HTMLElement).textContent = s.tag;
  const track = el.querySelector('.track') as HTMLElement, lic = el.querySelector('.lic') as HTMLAnchorElement;
  if (status) track.textContent = status;
  else if (current) track.textContent = `${current.artist} — ${current.title}`;
  else track.textContent = 'músicas reais com licença Creative Commons';
  track.title = track.textContent;
  if (current && !status) {
    lic.hidden = false; lic.textContent = `${current.album} · ${current.license} · archive.org`; lic.href = current.page;
    lic.title = 'Ver o álbum e a licença no Internet Archive';
  } else lic.hidden = true;
  const play = el.querySelector('[data-a=play]') as HTMLElement;
  play.textContent = playing ? 'Pausar' : 'Tocar';
  play.setAttribute('aria-pressed', String(playing));
  for (const b of el.querySelectorAll<HTMLElement>('[data-st]')) b.setAttribute('aria-pressed', String(b.dataset.st === s.id));
}
function mount(e: HTMLElement) {
  el = e;
  el.setAttribute('aria-label', 'Rádio');
  el.innerHTML = `<div class="now"><span class="eq" aria-hidden="true"><i></i><i></i><i></i></span><span class="meta"><span class="head"><span class="station"></span><span class="tag"></span></span><span class="track" aria-live="polite"></span><a class="lic" target="_blank" rel="noopener" hidden></a></span></div>
<div class="ctl"><button data-a="play" title="Tocar / pausar (R)">Tocar</button><button data-a="skip" title="Próxima faixa (N)">Próxima</button>
<span class="stations" role="group" aria-label="Estação (P)">${STATIONS.map((s) => `<button data-st="${s.id}" aria-pressed="false" title="${s.name}: ${s.tag} (P)">${s.id === 'lofi' ? 'Lo-fi' : 'Neon'}</button>`).join('')}</span>
<input type="range" min="0" max="1" step="0.01" aria-label="Volume da rádio" title="Volume"></div>`;
  el.querySelector('[data-a=play]')!.addEventListener('click', toggle);
  el.querySelector('[data-a=skip]')!.addEventListener('click', skip);
  for (const b of el.querySelectorAll<HTMLElement>('[data-st]')) b.addEventListener('click', () => setStation(STATIONS.findIndex((s) => s.id === b.dataset.st)));
  const vol = el.querySelector('input') as HTMLInputElement;
  vol.value = String(volume);
  vol.addEventListener('input', () => {
    volume = Number(vol.value); clearInterval(fadeTimer); for (const p of players) p.volume = volume;
    try { localStorage.setItem('loficity:volume', String(volume)); } catch { /* ignore */ }
  });
  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', () => { touched = true; disarm(); start(); });
    navigator.mediaSession.setActionHandler('pause', () => { touched = true; disarm(); stop(); });
    navigator.mediaSession.setActionHandler('nexttrack', skip);
  }
  render();
  autostart();
}

export const radio = {
  mount, toggle, nextStation, skip,
  /** The listener has the radio on (playing, loading or retrying), so the ambience should step aside. */
  isOn: () => playing,
  status: () => `${station().id} ${playing ? (current ? `"${current.title}" ${audio().currentTime.toFixed(0)}s` : 'loading') : 'off'}${status ? ` [${status}]` : ''} fails ${fails}`,
};
