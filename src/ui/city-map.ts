/* City picker: a native modal <dialog> with a pixel map of Paraíba. Pins come from the city registry
   (src/sky/cities.ts); cities outside the map (Tóquio) are buttons in an "elsewhere" row under it.
   The map picture is decorative (aria-hidden); the pin labels and the row are real buttons inside
   named lists, which is also the text alternative. Closed, the dialog is display:none, so it never
   takes taps from the scene; open, it is modal, so the scene and the HUD are inert behind it. */
import { CITIES, type City } from '../sky/cities.ts';
import { PARAIBA } from './paraiba.ts';
import { CELL, FRAME, GRID, insidePolygon, mapStep, placeLabels, project, shortName, splitCities, type MapEvent } from './map-rules.ts';

const SVG = 'http://www.w3.org/2000/svg';
const COAST = -35.0; // with no land in a row, the sea starts here (the RN and PE coasts)

/** Paints the state into a GRID-sized canvas: neighbours dark, land dithered, a light border, the sea to the east. */
function paint(cv: HTMLCanvasElement) {
  const { w, h } = GRID;
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  const land: boolean[] = new Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    land[y * w + x] = insidePolygon(FRAME.west + (x + 0.5) * CELL, FRAME.north - (y + 0.5) * CELL, PARAIBA);
  }
  const at = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && land[y * w + x];
  const img = ctx.createImageData(w, h), px = img.data;
  const put = (i: number, c: number) => { px[i * 4] = c >> 16; px[i * 4 + 1] = (c >> 8) & 255; px[i * 4 + 2] = c & 255; px[i * 4 + 3] = 255; };
  for (let y = 0; y < h; y++) {
    let east = -1;
    for (let x = 0; x < w; x++) if (land[y * w + x]) east = x;
    const seaFrom = Math.max(east + 1, Math.ceil((COAST - FRAME.west) / CELL));
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (land[i]) {
        const edge = !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1);
        put(i, edge ? 0x9a93d0 : (x + y) % 2 === 0 && (x * 7 + y * 3) % 5 === 0 ? 0x352d66 : 0x2a2352);
      } else if (x >= seaFrom) {
        put(i, y % 4 === 0 && (x + (y >> 2) * 3) % 8 < 2 ? 0x1b3a70 : 0x0b1634); // little wave dashes
      } else {
        put(i, x % 4 === 0 && y % 4 === 0 ? 0x1b1834 : 0x0f0d20); // neighbouring states: a faint dot grid
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

export interface CityMap { open(): void; close(): void; isOpen(): boolean; refresh(): void }

export function mountCityMap(opts: { trigger: HTMLButtonElement; current: () => string; onPick: (id: string) => void }): CityMap {
  const { onMap, elsewhere } = splitCities(CITIES);
  const dlg = document.createElement('dialog');
  dlg.id = 'city-map'; dlg.className = 'city-map'; dlg.setAttribute('aria-labelledby', 'cm-title');
  dlg.innerHTML = `
    <div class="cm-box">
      <div class="cm-head"><h2 id="cm-title">Escolha a cidade</h2><button type="button" class="cm-close" aria-label="Fechar mapa" title="Fechar (Esc)">×</button></div>
      <div class="cm-map"><canvas aria-hidden="true"></canvas><svg class="cm-ink" aria-hidden="true"></svg><ul class="cm-pins" aria-label="Cidades na Paraíba"></ul></div>
      <div class="cm-world"><span class="cm-world-t" id="cm-world-t">Fora da Paraíba</span><ul class="cm-row" aria-labelledby="cm-world-t"></ul></div>
      <p class="cm-src">Contorno da Paraíba: IBGE</p>
    </div>`;
  document.body.append(dlg);
  const q = <T extends Element>(s: string) => dlg.querySelector(s) as T;
  const map = q<HTMLDivElement>('.cm-map'), ink = q<SVGSVGElement>('.cm-ink'), pins = q<HTMLUListElement>('.cm-pins');
  const row = q<HTMLUListElement>('.cm-row');
  map.style.aspectRatio = `${GRID.w} / ${GRID.h}`;
  paint(q<HTMLCanvasElement>('canvas'));
  if (!elsewhere.length) q<HTMLElement>('.cm-world').hidden = true;

  const step = (ev: MapEvent) => {
    const s = mapStep(opts.current(), ev);
    if (!s.open && dlg.open) dlg.close();
    if (s.switchTo) opts.onPick(s.switchTo);
  };
  const button = (c: City) => {
    const li = document.createElement('li'), b = document.createElement('button');
    b.type = 'button'; b.dataset.id = c.id; b.textContent = shortName(c.name);
    b.addEventListener('click', () => step({ type: 'pick', id: c.id }));
    li.append(b);
    return { li, b };
  };
  const pinBtns = onMap.map((c) => { const { li, b } = button(c); pins.append(li); return b; });
  const rowBtns = elsewhere.map((c) => { const { li, b } = button(c); b.textContent += ' ↗'; row.append(li); return b; });
  const all = [...pinBtns, ...rowBtns];

  /** Pins at their projected spots, labels placed clear of each other, leader lines where they moved away. */
  function layout() {
    const W = map.clientWidth, H = map.clientHeight;
    if (!W || !H) return;
    const pts = onMap.map((c) => { const p = project(c.lat, c.lon); return { x: p.x * W, y: p.y * H }; });
    const labels = placeLabels(pts, pinBtns.map((b) => ({ w: b.offsetWidth, h: b.offsetHeight })), W, H);
    ink.setAttribute('viewBox', `0 0 ${W} ${H}`);
    ink.replaceChildren();
    const cur = opts.current();
    labels.forEach((r, i) => {
      const b = pinBtns[i], p = pts[i], on = onMap[i].id === cur;
      b.style.left = `${r.x}px`; b.style.top = `${r.y}px`;
      if (r.far) {
        const line = document.createElementNS(SVG, 'line');
        const tx = Math.max(r.x, Math.min(r.x + r.w, p.x)), ty = Math.max(r.y, Math.min(r.y + r.h, p.y)); // nearest point of the label
        Object.entries({ x1: p.x, y1: p.y, x2: tx, y2: ty }).forEach(([k, v]) => line.setAttribute(k, String(Math.round(v))));
        line.setAttribute('class', on ? 'lead on' : 'lead');
        ink.append(line);
      }
    });
    pts.forEach((p, i) => { // pins on top of the leader lines
      const s = document.createElementNS(SVG, 'rect');
      Object.entries({ x: Math.round(p.x) - 3, y: Math.round(p.y) - 3, width: 6, height: 6 }).forEach(([k, v]) => s.setAttribute(k, String(v)));
      s.setAttribute('class', onMap[i].id === cur ? 'pin on' : 'pin');
      ink.append(s);
    });
  }
  new ResizeObserver(() => { if (dlg.open) layout(); }).observe(map);

  function refresh() {
    const cur = opts.current();
    for (const b of all) {
      if (b.dataset.id === cur) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    }
    const c = CITIES.find((x) => x.id === cur);
    const name = opts.trigger.querySelector('.name');
    if (c && name) name.textContent = c.name;
    if (dlg.open) layout();
  }

  q<HTMLButtonElement>('.cm-close').addEventListener('click', () => step({ type: 'dismiss' }));
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); step({ type: 'dismiss' }); }); // Esc
  dlg.addEventListener('click', (e) => { if (e.target === dlg) step({ type: 'dismiss' }); }); // backdrop
  opts.trigger.addEventListener('click', () => open());

  function open() {
    if (dlg.open) return;
    step({ type: 'open' });
    refresh();
    dlg.showModal();
    layout();
    (all.find((b) => b.dataset.id === opts.current()) ?? all[0])?.focus();
  }
  refresh();
  return { open, close: () => step({ type: 'dismiss' }), isOpen: () => dlg.open, refresh };
}
