/* PARQUE DA CRIANÇA (Campina Grande, PB), drawn from 360° photos that visitors posted on Google
   Maps (2016–2026), used as reference only; none of them are in the repo. A wide view across the
   park in Catolé: in front, the grey cycle and walking path with its white lines and the lamp posts
   along it; beyond, the open sand field, lawns with royal and coconut palms and spreading tropical
   trees with twisted trunks, the cobbled plaza of Portuguese pavement with low concrete benches, the
   blue "EU ♥ CORRER" letters on the grass, the skate bowl far off, the tall old brick chimney with
   its white base, and the high-rises of Catolé standing over the tree line.

   "EU ♥ CORRER" is the only lettering drawn; the small sponsor plate beside it is not legible and is
   left blank. No cars: the path is inside the park. The daily rhythm is art direction, not the
   park's real opening hours: joggers at dawn (5–8h) and late afternoon (16–19h), calmer midday,
   nearly empty after 21h. */
import { L, Lp, WW, blitLayer, newLayer, rect } from '../engine/gfx';
import { mulberry32, type Rng } from '../engine/math';
import {
  BARK, BFAR, BMID, BNEAR, CBEIGE, CBLUE, CRED, LEAFG, LEAFGD, STEEL, STONE, STONEL, TERRA, TILEW, VOID, WOOD,
} from '../engine/palette';
import { configure, drawFarPrecip, drawNearPrecip, drawRipples } from '../fx/precip';
import { drawFireworks, drawLightning } from '../fx/sky-events';
import { drawAnimalsGround, drawAnimalsPerched, drawAnimalsSky, setupAnimals, updateAnimals } from '../actors/animals';
import { drawPeople, peopleCount, setLanes, tickSpawns, updatePeople } from '../actors/people';
import { S } from '../sky/state';
import { drawFog, drawSky } from './common';
import { type Lamp, type Palm, type TowerWin, bandeirolas, christmasStar, drawPalm, drawTowerWins, lampLight, lampPost, text, tower } from './br-kit';
import type { Scene } from './types';

const HORIZON = 108, TREES = 114, BACK = 137, PATH1 = 150;
const wr = mulberry32(0xc41a);
const far = newLayer(), mid = newLayer(), front = newLayer();
const wins: TowerWin[] = [];
const LAMPS: Lamp[] = [{ x: 58, top: 98, ground: BACK + 1, arms: 1 }, { x: 236, top: 98, ground: BACK + 1, arms: 1 }, { x: 414, top: 98, ground: BACK + 1, arms: 1 }];
const PALMS: Palm[] = [
  { x: 150, ground: 125, h: 62, lean: 2, ph: 0.4, imperial: true }, { x: 176, ground: 121, h: 54, lean: -1, ph: 1.7, imperial: true },
  { x: 214, ground: 126, h: 40, lean: 6, ph: 2.9 }, { x: 246, ground: 119, h: 58, lean: 0, ph: 0.9, imperial: true },
  { x: 352, ground: 123, h: 46, lean: -7, ph: 3.6 }, { x: 392, ground: 120, h: 64, lean: 1, ph: 2.2, imperial: true },
  { x: 120, ground: 117, h: 34, lean: 3, ph: 4.4 }, { x: 300, ground: 117, h: 50, lean: 0, ph: 5.1, imperial: true },
];
/** Foreground palms framing the view on wide screens. */
const NEAR: Palm[] = [{ x: 456, ground: 182, h: 128, lean: -10, ph: 2.5 }];
const near = newLayer();
const CHIM = 440; // the brick chimney

// ---------- static ----------
function dither(ly: Uint8Array, x: number, y: number, a: number, b: number, k: number) { Lp(ly, x, y, ((x * 7 + y * 13) % 17) / 17 < k ? b : a); }

function buildFar() {
  // Catolé's high-rises over the trees, thicker on the right as in the photos
  const spec: [number, number, number, number, number | null][] = [
    [14, 16, 70, STONEL, null], [70, 20, 62, TILEW, null], [96, 14, 80, CBEIGE, null],
    [196, 18, 74, STONEL, null], [292, 22, 46, TILEW, CRED], [318, 16, 66, CBEIGE, null], [346, 18, 58, STONEL, null],
    [398, 24, 40, TILEW, null], [428, 18, 52, CBEIGE, null], [452, 20, 34, STONEL, CBLUE],
  ];
  for (const [x, w, top, c, band] of spec) tower(far, x, w, top, TREES, c, band, wr, wins);
  for (let x = -4; x < WW;) { const w = 10 + ((wr() * 18) | 0), top = 96 + ((wr() * 8) | 0); L(far, x, top, w, TREES - top, BFAR); x += w + 3; }
  // the far tree line: a long ragged band of dark canopies
  for (let x = 0; x < WW; x++) {
    const top = 97 + Math.round(Math.sin(x / 7) * 2 + Math.sin(x / 19 + 1) * 3 + wr() * 1.5);
    for (let y = top; y < TREES + 2; y++) Lp(far, x, y, wr() < (y < top + 3 ? 0.25 : 0.08) ? LEAFG : LEAFGD);
    if (wr() < 0.12) Lp(far, x, top, LEAFG);
  }
}

/** A spreading tropical tree (oiti / algaroba kind): leaning, forked trunk under a flat crown. */
function canopyTree(ly: Uint8Array, cx: number, gy: number, s: number, rng: Rng) {
  const h = Math.round(30 * s), lean = (rng() - 0.5) * 8 * s;
  for (let y = 0; y < h; y++) {
    const u = y / h, x = Math.round(cx + lean * u * u), w = Math.max(1, Math.round((3 - u * 1.5) * s));
    L(ly, x, gy - y, w, 1, y % 5 === 0 ? WOOD : BARK);
  }
  const tx = cx + lean, ty = gy - h;
  for (const d of [-1, 1]) for (let i = 0; i < 9 * s; i++) Lp(ly, Math.round(tx + d * i * 1.3), Math.round(ty - i * 0.7), BARK);
  const blobs = 7 + ((rng() * 4) | 0);
  for (let k = 0; k < blobs; k++) {
    const bx = tx + (rng() - 0.5) * 34 * s, by = ty - 6 * s + (rng() - 0.5) * 10 * s, r = (6 + rng() * 6) * s;
    for (let dy = -r; dy <= r * 0.7; dy++) for (let dx = -r * 1.4; dx <= r * 1.4; dx++) {
      if ((dx / 1.4) ** 2 + dy * dy > r * r) continue;
      const x = Math.round(bx + dx), y = Math.round(by + dy), shade = dy / r + dx / (r * 3) + rng() * 0.6;
      Lp(ly, x, y, shade > 0.7 ? LEAFGD : rng() < 0.08 ? BNEAR : LEAFG);
    }
  }
  L(ly, Math.round(tx - 12 * s), gy + 1, Math.round(26 * s), 1, LEAFGD); // shade on the grass
}

function buildMid() {
  // lawns from the tree line down to the path, with worn sandy patches
  for (let y = TREES; y < BACK; y++) for (let x = 0; x < WW; x++) {
    const k = (y - TREES) / (BACK - TREES);
    dither(mid, x, y, LEAFG, LEAFGD, 0.45 - k * 0.3);
    if (wr() < 0.012) Lp(mid, x, y, CBEIGE);
  }
  // the open sand field: a broad oval, footprints and a pale rim
  for (let y = 116; y < 136; y++) for (let x = 40; x < 250; x++) {
    const a = (x - 144) / 104, b = (y - 126) / 9.5, d = a * a + b * b;
    if (d > 1) continue;
    Lp(mid, x, y, d > 0.86 ? (wr() < 0.5 ? CBEIGE : LEAFGD) : wr() < 0.1 ? STONEL : wr() < 0.04 ? STONE : CBEIGE);
  }
  // a little football goal made of two sticks at the far end of the field
  L(mid, 56, 115, 1, 8, TILEW); L(mid, 68, 115, 1, 8, TILEW); L(mid, 56, 115, 13, 1, TILEW);
  // the skate bowl, far off: two concrete ramps with a railing
  for (let i = 0; i < 6; i++) { L(mid, 270 + i, 113 + i, 1, 6 - i, STONEL); L(mid, 300 - i, 113 + i, 1, 6 - i, STONEL); }
  L(mid, 276, 118, 19, 1, STONE); L(mid, 268, 112, 4, 1, STEEL); L(mid, 299, 112, 4, 1, STEEL);
  // the cobbled plaza of Portuguese pavement, light with dark waves, low concrete benches around it
  for (let y = 124; y < 137; y++) for (let x = 300; x < 478; x++) {
    const a = (x - 389) / 92, b = (y - 131) / 8; if (a * a + b * b > 1) continue;
    const wave = Math.abs(Math.sin(x / 7 + Math.sin(y / 2.5) * 1.4)) > 0.9;
    Lp(mid, x, y, wave ? STONE : (x + y * 3) % 5 === 0 ? CBEIGE : STONEL);
  }
  for (const [x, y, w] of [[316, 126, 14], [346, 123, 16], [430, 123, 16], [458, 127, 12]] as const) { L(mid, x, y, w, 2, TILEW); L(mid, x, y + 2, w, 1, STONE); }
  // the brick chimney with its white base and red band
  for (let y = 26; y < 112; y++) {
    const u = (y - 26) / 86, w = Math.round(6 + u * 4), x = CHIM - (w >> 1);
    L(mid, x, y, w, 1, y % 3 === 0 ? WOOD : TERRA); Lp(mid, x, y, BARK); Lp(mid, x + w - 1, y, WOOD);
  }
  L(mid, CHIM - 4, 24, 8, 2, BARK); L(mid, CHIM - 5, 28, 10, 1, WOOD);
  L(mid, CHIM - 9, 108, 18, 18, TILEW); L(mid, CHIM - 10, 108, 20, 3, CRED); L(mid, CHIM - 10, 124, 20, 2, STONE);
  for (const dx of [-6, 1]) { L(mid, CHIM + dx, 114, 5, 8, BNEAR); L(mid, CHIM + dx + 1, 113, 3, 1, BNEAR); }
  // the blue letters EU ♥ CORRER, white rim, on the lawn in front of the trees (the plate beside it left blank)
  const lx = 252, ly = 110;
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) { text(mid, 'EU', lx + 8 + dx, ly + dy, TILEW, 2); text(mid, 'CORRER', lx + dx, ly + 11 + dy, TILEW, 2); }
  text(mid, 'EU', lx + 8, ly, CBLUE, 2); text(mid, 'CORRER', lx, ly + 11, CBLUE, 2);
  for (let dy = 0; dy < 10; dy++) for (let dx = 0; dx < 12; dx++) { // the big red heart
    const lobe = (dx - 2.8) ** 2 + (dy - 2.6) ** 2 < 8 || (dx - 8.2) ** 2 + (dy - 2.6) ** 2 < 8, tip = dy >= 3 && Math.abs(dx - 5.5) <= 5.6 - (dy - 3) * 0.85;
    if (lobe || tip) Lp(mid, lx + 25 + dx, ly - 2 + dy, CRED);
  }
  L(mid, lx + 48, ly + 2, 8, 8, TILEW); L(mid, lx + 49, ly + 3, 6, 6, STONEL); L(mid, lx + 51, ly + 10, 1, 6, STEEL);
  // spreading trees between the palms
  for (const [x, g, s] of [[96, 123, 1.25], [204, 117, 0.8], [326, 121, 1.1], [478, 121, 1.0], [10, 119, 0.9], [140, 114, 0.6], [418, 116, 0.7]] as const) canopyTree(mid, x, g, s, wr);
}

function buildFront() {
  // the cycle / walking path: grey, white edges, dashed centre line; a kerb on each side
  L(front, 0, BACK, WW, 1, STONEL);
  for (let y = BACK + 1; y < PATH1; y++) for (let x = 0; x < WW; x++) Lp(front, x, y, wr() < 0.06 ? STONEL : wr() < 0.03 ? BMID : STONE);
  L(front, 0, BACK + 2, WW, 1, TILEW); L(front, 0, PATH1 - 2, WW, 1, TILEW);
  for (let x = 6; x < WW; x += 14) L(front, x, 143, 7, 1, TILEW);
  for (const x of [130, 330]) { L(front, x, 140, 3, 2, TILEW); L(front, x + 4, 140, 1, 1, TILEW); L(front, x - 1, 145, 5, 1, TILEW); L(front, x + 1, 144, 1, 1, TILEW); } // bicycle and arrow
  L(front, 0, PATH1, WW, 1, STONEL); L(front, 0, PATH1 + 1, WW, 1, STONE);
  // foreground lawn with fallen leaves and the odd flower
  for (let y = PATH1 + 2; y < 180; y++) for (let x = 0; x < WW; x++) {
    dither(front, x, y, LEAFG, LEAFGD, 0.3 + (y - PATH1) / 80);
    const q = wr();
    if (q < 0.01) Lp(front, x, y, CBEIGE); else if (q < 0.016) Lp(front, x, y, TERRA); else if (q < 0.018) Lp(front, x, y, CRED);
  }
  for (const l of LAMPS) lampPost(front, l);
  // a litter bin by each lamp
  for (const l of LAMPS) { L(front, l.x - 9, BACK - 6, 5, 6, CRED); L(front, l.x - 9, BACK - 7, 5, 1, STONE); }
}

/** A big tree in the foreground corner, its crown hanging over the top-left of the view. */
function buildNear() {
  for (let y = 60; y < 182; y++) { const u = (182 - y) / 122, x = Math.round(30 + u * u * 18), w = Math.round(9 - u * 4); L(near, x, y, w, 1, y % 6 === 0 ? WOOD : BARK); Lp(near, x + w - 1, y, WOOD); }
  for (const [x0, y0, x1, y1] of [[44, 70, 4, 40], [44, 72, 96, 34], [46, 66, 60, 20], [40, 80, 0, 72]]) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n); L(near, x, y, i < n / 2 ? 3 : 2, 1, BARK); }
  }
  const r = mulberry32(0x7ee);
  for (let k = 0; k < 26; k++) {
    const bx = -10 + r() * 120, by = -40 + r() * 80 + Math.max(0, bx - 60) * 0.3, rr = 8 + r() * 12;
    for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr * 1.3; dx <= rr * 1.3; dx++) {
      if ((dx / 1.3) ** 2 + dy * dy > rr * rr) continue;
      const x = Math.round(bx + dx), y = Math.round(by + dy), sh = dy / rr + r() * 0.7;
      Lp(near, x, y, sh > 0.95 && r() < 0.5 ? BARK : sh > 0.2 ? LEAFGD : r() < 0.35 ? LEAFG : LEAFGD);
    }
  }
  for (let x = 0; x < 120; x++) { const y = 170 + Math.round(Math.sin(x / 13) * 2); for (let j = 0; j < 6; j++) if ((x + j) % 3) Lp(near, x, y + j, LEAFGD); } // its shade on the lawn
}

// ---------- dynamic ----------
/** Art direction: how lively the park is through the day (multiplies the city rhythm). */
const PARK = [0.1, 0.06, 0.05, 0.05, 0.3, 1.7, 1.9, 1.7, 1.2, 0.8, 0.6, 0.5, 0.45, 0.5, 0.6, 0.9, 1.5, 1.8, 1.7, 1.2, 0.8, 0.4, 0.2, 0.12, 0.1];
function parkLevel() { const h = S.cal.hour, i = Math.floor(h) % 24, t = h - Math.floor(h); return PARK[i] + (PARK[i + 1] - PARK[i]) * t; }

function update(dt: number) {
  updateAnimals(dt);
  tickSpawns(dt, parkLevel() * (S.saoJoao && S.cal.hour >= 17 ? 1.3 : 1)); updatePeople(dt);
}

/** Kids kicking a ball on the sand field by day. */
function ballGame() {
  const h = S.cal.hour;
  if (S.dayK < 0.5 || S.rain > 0.2 || h < 7 || h > 18) return;
  const t = S.ms / 1000, bx = 100 + Math.sin(t * 0.7) * 40, by = 126 + Math.sin(t * 1.9) * 2, hop = Math.abs(Math.sin(t * 3)) * 3;
  for (const [x, c] of [[bx - 9, CRED], [bx + 10, CBLUE], [150 + Math.sin(t * 0.5) * 20, TILEW]] as const) {
    const px = Math.round(x), f = ((t * 6) | 0) % 2;
    rect(px, by - 9, 3, 3, BARK); rect(px, by - 6, 3, 4, c); rect(px + f, by - 2, 1, 2, VOID); rect(px + 2 - f, by - 2, 1, 2, VOID);
  }
  rect(Math.round(bx), Math.round(by - hop - 1), 2, 2, TILEW);
}

const FOG = [{ y: 112, h: 8, sp: 0.4 }, { y: 134, h: 5, sp: -0.3 }];
function render() {
  drawSky(HORIZON); drawAnimalsSky(); drawLightning();
  blitLayer(far); drawTowerWins(wins); drawFireworks();
  blitLayer(mid);
  for (const p of PALMS) drawPalm(p);
  ballGame();
  drawFarPrecip();
  blitLayer(front);
  for (const l of LAMPS) lampLight(l);
  if (S.saoJoao) { bandeirolas(LAMPS[0].x + 14, LAMPS[0].top, LAMPS[1].x + 14, LAMPS[1].top, 9, 0); bandeirolas(LAMPS[1].x + 14, LAMPS[1].top, LAMPS[2].x + 14, LAMPS[2].top, 9, 3); }
  if (S.natal) for (const l of LAMPS) christmasStar(l.x + 1, l.top - 12, 1);
  drawAnimalsPerched(); drawPeople(); drawAnimalsGround();
  for (const p of NEAR) drawPalm(p);
  blitLayer(near);
  drawRipples(); drawFog(FOG); drawNearPrecip();
}

let built = false;
export const parqueCrianca: Scene = {
  id: 'parque-da-crianca',
  name: 'Parque da Criança',
  build() {
    if (!built) { buildFar(); buildMid(); buildFront(); buildNear(); built = true; }
    setLanes([{ y: 141 }, { y: 144 }, { y: 147 }]);
    setupAnimals({ ground: [142, 147], dogs: 2, lamps: LAMPS.map((l) => ({ x: l.x + 14, y: l.top })),
      walls: [{ x0: 346, x1: 362, y: 122 }, { x0: 430, x1: 446, y: 122 }, { x0: CHIM - 9, x1: CHIM + 9, y: 107 }] });
    configure({ roofs: [], tips: [], lamps: LAMPS.map((l) => ({ x: l.x + 14, y: l.top })), ground0: BACK, horizon: HORIZON });
    for (let i = 0; i < 150; i++) update(1 / 30);
  },
  update,
  render,
  debug() { return `active  people x${peopleCount()}  parque ${parkLevel().toFixed(2)}`; },
};
