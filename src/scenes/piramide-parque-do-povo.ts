/* PIRÂMIDE DO PARQUE DO POVO (Campina Grande, PB), drawn from Street View captures (Dec 2024) and
   Wikimedia Commons photos (2006), used as reference only; none of them is in the repo. The great
   salmon concrete A-frame of the Maior São João do Mundo seen across the empty paved lot from Rua
   Maj. Belmiro: two sloped legs meeting at the apex, the dark underside of the roof, the light grey
   corrugated skin set back under it and two beige struts at the foot; orange plastic barriers stored
   underneath. On the left a borracharia (yellow board, two blue roll-up doors, an unfinished brick
   floor upstairs) and a concrete pole with wires; on the right two tall floodlight masts with lamp
   cages and a board, and a long arcaded block; Campina's high-rises behind.

   Most of the year the lot is nearly empty. In June (São João) bandeirolas hang from the masts and
   under the roof, stalls fill the space under the pyramid, a fogueira burns on the lot, the legs carry
   "O MAIOR SÃO JOÃO DO MUNDO" (the only lettering legible in the photos; neon at night, as in the
   2006 night photo) and the floodlights come on after dark. The board on the mast is not legible and
   is left blank. Lights, stalls and crowds are art direction, not the park's real programme. */
import { L, Lp, WW, blitLayer, getW, newLayer, put, rect, sx, sy } from '../engine/gfx';
import { bay, mulberry32 } from '../engine/math';
import {
  AMB, ASPH, BFAR, BMID, BNEAR, CBEIGE, CBLUE, CGREEN, CNAVY, CORNG, CRED, CYAN, CYELL, FORNG, FWG, HALO, HALOOK,
  LEDW, LIGHT, MAG, STEEL, STONE, STONEL, TERRA, TILEW, VOID, WDIM, WHITE, WOOD, WWARM,
} from '../engine/palette';
import { configure, drawFarPrecip, drawNearPrecip, drawRipples, precip } from '../fx/precip';
import { drawFireworks, drawLightning } from '../fx/sky-events';
import { drawAnimalsGround, drawAnimalsPerched, drawAnimalsSky, setupAnimals, updateAnimals } from '../actors/animals';
import { drawPeople, peopleCount, setLanes, tickSpawns, updatePeople } from '../actors/people';
import { drawCars, setCarLanes, updateCars } from '../actors/cars';
import { S } from '../sky/state';
import { drawFog, drawSky, drawStreet, type Street } from './common';
import {
  type Lamp, type TowerWin, bandeirolas, drawTowerWins, fogueira, isNight, lampLight, lampPost, pole, text, tower, wire, wireCurve,
} from './br-kit';
import type { Scene } from './types';

const HORIZON = 112, STREET = 150, SH = 180 - STREET, GROUND = 128, KERB = 148;
const wr = mulberry32(0x9a1d);
const far = newLayer(), mid = newLayer(), front = newLayer();
const street: Street = { y0: STREET, base: new Uint8Array(SH * WW), pud: new Uint8Array(SH * WW), jit: precip.jit };
const wins: TowerWin[] = [];
const LAMPS: Lamp[] = [{ x: 146, top: 100, ground: KERB, arms: 1 }, { x: 322, top: 100, ground: KERB, arms: 1 }, { x: 466, top: 100, ground: KERB, arms: 1 }];

// the pyramid: apex, feet of the legs, leg thickness (rows), the grey skin under the roof
const AX = 240, AY = 52, XL = 98, XR = 382, LEG = 9, SKIN_Y = 86, SKIN_B = 113;
const K = (GROUND - AY) / (AX - XL);
/** Top row of the leg at column x (left leg rises to the apex, right leg falls). */
const legTop = (x: number) => AY + Math.abs(x - AX) * K;
// the floodlight masts: two concrete posts each, a lamp cage on top
const MASTS = [{ x: 58, top: 30 }, { x: 404, top: 22 }];

function buildFar() {
  // Campina's skyline behind the lot, some of it showing through the pyramid's open sides
  const spec: [number, number, number, number, number | null][] = [
    [96, 18, 70, CBEIGE, null], [118, 14, 60, STONEL, null], [150, 16, 84, TILEW, null], [176, 20, 74, STONEL, CRED],
    [276, 18, 78, CBEIGE, null], [300, 22, 62, TILEW, null], [330, 16, 70, STONEL, null], [356, 20, 54, TILEW, CRED],
  ];
  for (const [x, w, top, c, band] of spec) tower(far, x, w, top, GROUND, c, band, wr, wins);
  for (let x = -4; x < WW;) { const w = 10 + ((wr() * 20) | 0), top = 96 + ((wr() * 12) | 0); L(far, x, top, w, GROUND - top, BFAR); x += w + 1; }
}

function buildPyramid() {
  // underside of the roof between the legs: dark, with rafters; the grey corrugated skin set back
  for (let x = XL; x <= XR; x++) {
    const top = Math.round(legTop(x)) + LEG;
    for (let y = top; y < GROUND; y++) {
      const half = (y - SKIN_Y) * ((SKIN_B - SKIN_Y) > 0 ? 54 / (SKIN_B - SKIN_Y) : 0);
      if (y >= SKIN_Y && y <= SKIN_B && Math.abs(x - AX) <= half) {
        Lp(mid, x, y, y === SKIN_B ? TILEW : (x - AX + 300) % 3 === 0 ? STONE : STONEL);
      } else if (y > SKIN_B) Lp(mid, x, y, y > GROUND - 3 ? BMID : BNEAR);
      else Lp(mid, x, y, (x - AX + 300) % 7 === 0 || y === top ? BNEAR : BMID);
    }
  }
  // the two beige struts at the foot, inside the legs
  for (const [x0, x1] of [[160, 192], [320, 288]] as const) {
    const n = Math.abs(x1 - x0);
    for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * (i / n), y = GROUND - (GROUND - SKIN_B) * (i / n); L(mid, Math.round(x) - 2, Math.round(y), 4, 1, CBEIGE); Lp(mid, Math.round(x) + 2, Math.round(y), STONE); }
  }
  // the salmon legs: lit top edge, shaded bottom, weathered spots
  for (let x = XL - 6; x <= XR + 6; x++) {
    const top = Math.round(legTop(x));
    if (top > GROUND) continue;
    for (let j = 0; j < LEG && top + j < GROUND; j++) Lp(mid, x, top + j, j === 0 ? FORNG : j >= LEG - 2 ? TERRA : (x + j) % 2 ? CRED : CORNG);
  }
  // low salmon walls at both feet
  L(mid, XL - 22, GROUND - 6, 26, 6, CORNG); L(mid, XL - 22, GROUND - 6, 26, 1, FORNG);
  L(mid, XR - 4, GROUND - 6, 30, 6, CORNG); L(mid, XR - 4, GROUND - 6, 30, 1, FORNG);
  L(mid, 186, GROUND - 2, 108, 2, BNEAR);
}

function buildLeft() {
  // borracharia: unfinished brick floor upstairs, yellow board, two blue roll-up doors
  L(mid, 0, 80, 70, 4, STONE); L(mid, 0, 84, 70, 14, TERRA);
  for (let y = 85; y < 98; y += 3) for (let x = (y % 2) * 3; x < 70; x += 6) L(mid, x, y, 5, 1, WOOD);
  for (const x of [8, 30, 52]) L(mid, x, 87, 10, 8, BNEAR);
  L(mid, 0, 98, 62, 10, CYELL); L(mid, 0, 98, 62, 1, CORNG); L(mid, 0, 107, 62, 1, CORNG);
  text(mid, 'BORRACHARIA', 4, 100, CNAVY);
  L(mid, 0, 108, 70, GROUND - 108, TILEW); L(mid, 0, GROUND - 2, 70, 2, STONE);
  for (const x0 of [4, 34]) { L(mid, x0, 111, 26, GROUND - 111, CNAVY); for (let y = 112; y < GROUND; y += 2) L(mid, x0, y, 26, 1, CBLUE); }
  // a white house with a small grille window, then the low wall to the pyramid
  L(mid, 70, 104, 26, GROUND - 104, TILEW); L(mid, 70, 103, 26, 1, STONE);
  for (let x = 76; x < 92; x += 2) L(mid, x, 110, 1, 6, BMID); L(mid, 75, 110, 18, 1, BMID);
  L(mid, 96, 116, 4, GROUND - 116, STONE);
  pole(mid, 112, GROUND, 44);
  // the lattice telecom mast behind, left
  for (let y = 70; y < GROUND - 22; y++) { Lp(far, 124, y, STEEL); Lp(far, 129, y, STEEL); if (y % 4 === 0) L(far, 124, y, 6, 1, STEEL); }
  L(far, 125, 64, 4, 6, STEEL);
}

function buildRight() {
  // the long arcaded block: four floors of arched balconies
  L(mid, 384, 62, WW - 384, GROUND - 62, CBEIGE); L(mid, 382, 60, WW - 382, 3, TERRA);
  for (let f = 0; f < 4; f++) {
    const y = 66 + f * 14; L(mid, 384, y + 11, WW - 384, 1, WOOD);
    for (let x = 388; x < WW - 4; x += 9) { L(mid, x, y + 2, 6, 9, BNEAR); Lp(mid, x, y + 2, CBEIGE); Lp(mid, x + 5, y + 2, CBEIGE); L(mid, x, y + 8, 6, 1, STONEL); }
  }
  L(mid, 384, GROUND - 10, WW - 384, 10, STONEL);
  for (let x = 390; x < WW; x += 14) L(mid, x, GROUND - 9, 9, 9, STEEL);
  // floodlight masts: twin concrete posts, a ladder, the lattice cage and a blank board
  for (const m of MASTS) {
    L(front, m.x, m.top + 12, 3, KERB - 6 - (m.top + 12), STONEL); L(front, m.x + 2, m.top + 12, 1, KERB - 6 - (m.top + 12), STONE);
    L(front, m.x + 10, m.top + 12, 3, KERB - 6 - (m.top + 12), STONEL); L(front, m.x + 12, m.top + 12, 1, KERB - 6 - (m.top + 12), STONE);
    for (let y = m.top + 14; y < KERB - 8; y += 3) L(front, m.x + 5, y, 3, 1, STEEL);
    L(front, m.x - 4, m.top, 22, 12, BNEAR);
    for (let j = 0; j < 3; j++) for (let i = 0; i < 5; i++) L(front, m.x - 3 + i * 4, m.top + 1 + j * 4, 3, 3, STONE);
    L(front, m.x - 5, m.top + 12, 24, 1, STEEL); L(front, m.x - 5, m.top - 1, 24, 1, STEEL);
    L(front, m.x - 2, KERB - 8, 18, 2, STONE);
  }
  const b = MASTS[1]; L(front, b.x - 3, 68, 19, 26, TILEW); L(front, b.x - 2, 69, 17, 10, CBLUE); L(front, b.x - 2, 80, 17, 12, FORNG);
}

function buildFront() {
  // the paved lot: pale concrete with cracks and old paint lines, a white kerb
  for (let y = GROUND; y < KERB; y++) for (let x = 0; x < WW; x++) Lp(mid, x, y, wr() < 0.05 ? STONE : STONEL);
  for (let c = 0; c < 9; c++) { let x = wr() * WW, y = GROUND + 2 + wr() * 16; for (let i = 0; i < 26; i++) { Lp(mid, Math.round(x), Math.round(y), STONE); x += 1; y += (wr() - 0.5) * 1.2; } }
  for (let x = 0; x < WW; x += 30) L(mid, x, 139, 12, 1, TILEW);
  L(front, 0, KERB, WW, 2, TILEW); L(front, 0, KERB + 1, WW, 1, STONE);
  for (const l of LAMPS) lampPost(front, l);
  wire(front, 0, 92, 113, 86, 4); wire(front, 0, 96, 113, 90, 5);
}

function buildGround() {
  for (let d = 0; d < SH; d++) for (let x = 0; x < WW; x++) street.base[d * WW + x] = wr() < 0.07 ? STONE : ASPH;
  for (let x = 4; x < WW; x += 26) for (let i = 0; i < 12; i++) street.base[16 * WW + x + i] = TILEW;
  for (let p = 0; p < 5; p++) {
    const cx = wr() * WW, cy = 2 + wr() * (SH - 4), rx = 8 + wr() * 18, ry = 2 + wr() * 2;
    for (let d = 0; d < SH; d++) for (let x = 0; x < WW; x++) { const a = (x - cx) / rx, b = (d - cy) / ry; if (a * a + b * b < 1) street.pud[d * WW + x] = 1; }
  }
}

// ---------- dynamic ----------
const festaNight = () => S.saoJoao && isNight();

/** Off-season: orange plastic barriers stored under the roof. June: stalls and lit interior. */
function underRoof() {
  if (!S.saoJoao) {
    for (let x = 196; x < 286; x += 7) { rect(x, GROUND - 5, 6, 4, CORNG); rect(x, GROUND - 4, 6, 1, TILEW); }
    return;
  }
  const n = isNight();
  if (n) for (let y = SKIN_B + 1; y < GROUND; y++) for (let x = 170; x < 312; x++) if (getW(x, y) === BNEAR && bay(sx(x), sy(y)) < 0.3) put(x, y, WWARM);
  const tops = [CRED, CBLUE, CYELL, CGREEN, CRED, CBLUE];
  tops.forEach((c, i) => { const x = 180 + i * 21; rect(x, GROUND - 9, 16, 2, c); for (let k = 0; k < 16; k += 4) rect(x + k, GROUND - 9, 2, 2, TILEW); rect(x + 1, GROUND - 7, 14, 6, n ? WDIM : STONE); rect(x + 2, GROUND - 5, 12, 1, n ? LIGHT : WOOD); });
  if (S.cal.hour >= 18 || S.cal.hour < 2) {
    const t = S.ms / 1000, cols = [CRED, CBLUE, CYELL, TILEW, CGREEN, FORNG];
    for (let i = 0; i < 46; i++) {
      const x = 176 + ((i * 37) % 128), row = i % 3, y = GROUND - 12 + row * 3 - Math.round(Math.max(0, Math.sin(t * 6 + i * 1.7)) * 1.5);
      rect(x, y, 2, 3, cols[i % cols.length]); put(x, y - 1, n ? WDIM : BNEAR);
    }
  }
  for (let k = 0; k < 4; k++) { const y = 98 + k * 4, half = Math.floor((y - AY - LEG - 2) / K); bandeirolas(AX - half, y, AX + half, y, 2, k * 2); }
}

/** "O MAIOR SÃO JOÃO DO MUNDO" on the legs in June, a letter per step of the slope; neon at night. */
function legWords() {
  if (!S.saoJoao) return;
  const n = isNight(), t = S.ms / 1000;
  const word = (s: string, x0: number, cols: number[]) => {
    for (let x = x0 - 3; x < x0 + s.length * 4 + 2; x++) rect(x, Math.round(legTop(x)) + 1, 1, LEG - 2, VOID);
    for (let i = 0; i < s.length; i++) {
      const x = x0 + i * 4, y = Math.round(legTop(x + 1)) + 2;
      if (s[i] === ' ') continue;
      const c = n ? cols[i % cols.length] : TILEW;
      text(null, s[i], x, y, c);
      if ((s === 'O MAIOR SAO' && i === 9) || (s === 'JOAO DO MUNDO' && i === 2)) { put(x, y - 1, c); put(x + 2, y - 1, c); } // the tildes of SÃO, JOÃO
    }
  };
  word('O MAIOR SAO', 180, [CRED, CRED, AMB]);
  word('JOAO DO MUNDO', 250, [CYAN, CYAN, FWG]);
  if (!n) return;
  // coloured bulbs along the outer edge of both legs
  for (let x = XL; x <= XR; x += 5) { const k = ((x / 5) | 0) + ((t * 2) | 0); put(x, Math.round(legTop(x)) - 1, [LIGHT, MAG, CYAN, FWG][k % 4]); }
}

/** The floodlights: lamp cages and long cones over the lot, on June nights only. */
function floodlights() {
  const on = festaNight();
  for (const m of MASTS) {
    for (let j = 0; j < 3; j++) for (let i = 0; i < 5; i++) rect(m.x - 3 + i * 4, m.top + 1 + j * 4, 3, 3, on ? (j === 1 ? WHITE : LEDW) : STONE);
    if (!on) continue;
    const cx = m.x + 6, toward = m.x < AX ? 1 : -1;
    for (let y = GROUND - 26; y < KERB; y++) {
      const d = (y - m.top) / (KERB - m.top), c0 = cx + toward * d * 70, half = 6 + d * 60;
      for (let x = Math.floor(c0 - half); x <= c0 + half; x++) {
        const c = getW(x, y);
        if (c === 255 || !HALOOK[c]) continue;
        if (bay(sx(x), sy(y)) < (1 - Math.abs(x - c0) / half) * (0.02 + 0.14 * d * d)) put(x, y, HALO);
      }
    }
    for (let j = -3; j <= 15; j++) for (let i = -8; i <= 20; i++) {
      const c = getW(m.x - 4 + i, m.top + j);
      if (c !== 255 && HALOOK[c] && bay(sx(m.x - 4 + i), sy(m.top + j)) < 0.3 * (1 - Math.hypot(i - 6, j - 6) / 11)) put(m.x - 4 + i, m.top + j, HALO);
    }
  }
}

function festoons() {
  if (!S.saoJoao) return;
  bandeirolas(MASTS[0].x + 6, MASTS[0].top + 14, AX, AY + 2, 10, 0);
  bandeirolas(AX, AY + 2, MASTS[1].x + 6, MASTS[1].top + 14, 10, 3);
  bandeirolas(0, 112, MASTS[0].x, 104, 3, 1); bandeirolas(146, 102, 322, 102, 8, 4); bandeirolas(322, 102, 466, 102, 6, 2);
  if (S.cal.hour >= 17 || S.cal.hour < 2) fogueira(444, 142);
}

function update(dt: number) {
  updateAnimals(dt);
  const h = S.cal.hour, density = S.saoJoao ? (h >= 18 || h < 2 ? 2.6 : 1.3) : 0.55;
  tickSpawns(dt, density); updatePeople(dt); updateCars(dt, 1.1);
}

const FOG = [{ y: 104, h: 10, sp: 0.5 }, { y: 136, h: 6, sp: -0.4 }];
function render() {
  drawSky(HORIZON); drawAnimalsSky(); drawLightning();
  blitLayer(far); drawTowerWins(wins); drawFireworks();
  blitLayer(mid); underRoof(); legWords();
  drawFarPrecip();
  blitLayer(front); floodlights();
  for (const l of LAMPS) lampLight(l);
  festoons();
  drawAnimalsPerched(); drawPeople(); drawAnimalsGround();
  drawStreet(street); drawCars(); drawRipples(); drawFog(FOG); drawNearPrecip();
}

let built = false;
export const piramide: Scene = {
  id: 'piramide-parque-do-povo',
  name: 'Pirâmide do Parque do Povo',
  build() {
    if (!built) { buildFar(); buildPyramid(); buildLeft(); buildRight(); buildFront(); buildGround(); built = true; }
    setLanes([{ y: 138 }, { y: 142 }, { y: 146 }]);
    setupAnimals({ ground: [140, 146], dogs: 2, sleepSpots: [96, 360],
      lamps: LAMPS.map((l) => ({ x: l.x + 14, y: l.top })),
      wires: [wireCurve(0, 92, 113, 86, 4), wireCurve(0, 96, 113, 90, 5)],
      walls: [{ x0: 0, x1: 68, y: 79 }, { x0: 386, x1: 478, y: 59 }, { x0: 72, x1: 94, y: 102 }] });
    setCarLanes(162, 175, 'br');
    configure({ roofs: [{ x0: 0, x1: 70, y: 80 }, { x0: 384, x1: WW, y: 60 }, { x0: 170, x1: 310, y: SKIN_B }], tips: [],
      lamps: LAMPS.map((l) => ({ x: l.x + 14, y: l.top })), ground0: GROUND, horizon: HORIZON });
    for (let i = 0; i < (S.saoJoao ? 1800 : 150); i++) update(1 / 30); // June nights start full
  },
  update,
  render,
  debug() { return `active  people x${peopleCount()}  são joão ${S.saoJoao}  refletores ${festaNight() ? 'on' : 'off'}`; },
};
