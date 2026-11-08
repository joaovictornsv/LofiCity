/* PARTAGE SHOPPING (Campina Grande, PB), drawn from Street View captures on Av. Prefeito Severino
   Bezerra Cabral (Dec and Aug 2024; used as reference only, they are not in the repo). On the left
   the tall grey wall stacked with the anchor stores' boards (RCHLO, RENNER, KALUNGA, LEITURA, MARISA
   and two more whose lettering is too small to read, left blank), and under them the parking
   entrance with "ESTACIONAMENTO", "SAÍDA" and "ENTRADA" in big spaced letters. Then the white tiled
   entrance block with the red flower emblem and "PARTAGE SHOPPING / CAMPINA GRANDE", a green hedge
   at its foot, and the long façade of salmon louvre bands in white frames over a glazed ground floor
   with the pink-papered doors. In front: the light concrete forecourt with a yellow kerb, red and
   white cones on a chain and plastic barriers, a pipoca cart, motorcycles and bicycles parked at the
   doors, royal palms and a bus shelter along the avenue, high-rises of the Catolé behind.

   Opening hours are art direction, not the mall's real timetable: Monday to Saturday 10h-22h,
   Sundays 14h-20h. While open the doors and shop windows are lit after dark and the signs glow;
   closed, the signs go dark except a dim emblem and few people pass. */
import { L, Lp, WW, blitLayer, newLayer, put, rect } from '../engine/gfx';
import { mulberry32 } from '../engine/math';
import {
  ASPH, BFAR, BMID, BNEAR, CBLUE, CNAVY, CORNG, CRED, CYELL, FBLUE, FORNG, FPINK, LEAFG, LEAFGD, LEDW, LIGHT, MAG, MAGD,
  STEEL, STONE, STONEL, TILEW, VOID, WDIM, WHITE, WWARM, WOOD, CBEIGE,
} from '../engine/palette';
import { configure, drawFarPrecip, drawNearPrecip, drawRipples, precip } from '../fx/precip';
import { drawFireworks, drawLightning } from '../fx/sky-events';
import { drawAnimalsGround, drawAnimalsPerched, drawAnimalsSky, setupAnimals, updateAnimals } from '../actors/animals';
import { drawPeople, peopleCount, setLanes, tickSpawns, updatePeople } from '../actors/people';
import { drawCars, setCarLanes, updateCars } from '../actors/cars';
import { S, hourIn } from '../sky/state';
import { drawFog, drawSky, drawStreet, type Street } from './common';
import {
  type Lamp, type Palm, type TowerWin, bandeirolas, christmasStar, drawPalm, drawTowerWins, isNight, lampLight, lampPost, text, textW, tower,
} from './br-kit';
import type { Scene } from './types';

const HORIZON = 112, STREET = 150, SH = 180 - STREET, GROUND = 140;
const WALL0 = 0, WALL1 = 150, LOGO0 = 150, LOGO1 = 240, LOUV = 240; // the three blocks of the front
const WALL_TOP = 40, LOGO_TOP = 28, LOUV_TOP = 48, GLASS_TOP = 104;
const wr = mulberry32(0x9a47a6e);
const far = newLayer(), mid = newLayer(), front = newLayer();
const street: Street = { y0: STREET, base: new Uint8Array(SH * WW), pud: new Uint8Array(SH * WW), jit: precip.jit };
const wins: TowerWin[] = [];
const LAMPS: Lamp[] = [{ x: 146, top: 92, ground: 149, arms: 1 }, { x: 356, top: 92, ground: 149, arms: 1 }];
const PALMS: Palm[] = [{ x: 246, ground: 149, h: 88, lean: 0, ph: 0.4, imperial: true }, { x: 416, ground: 149, h: 84, lean: 1, ph: 1.7, imperial: true },
  { x: 468, ground: 149, h: 92, lean: -1, ph: 2.9, imperial: true }];

/** An anchor store's board on the grey wall: coloured ground, its name in the store's colours. */
interface Board { x: number; y: number; w: number; h: number; bg: number; fg: number; txt: string; s: number }
const BOARDS: Board[] = [
  { x: 8, y: 46, w: 40, h: 14, bg: TILEW, fg: CRED, txt: '', s: 1 }, // the round logo at the top left is not legible
  { x: 54, y: 44, w: 44, h: 16, bg: VOID, fg: TILEW, txt: 'RCHLO', s: 2 },
  { x: 104, y: 48, w: 40, h: 14, bg: CRED, fg: TILEW, txt: 'RENNER', s: 1 },
  { x: 54, y: 64, w: 44, h: 13, bg: TILEW, fg: CNAVY, txt: 'KALUNGA', s: 1 },
  { x: 104, y: 66, w: 40, h: 14, bg: CBLUE, fg: TILEW, txt: 'LEITURA', s: 1 },
  { x: 6, y: 70, w: 44, h: 14, bg: FPINK, fg: TILEW, txt: 'MARISA', s: 1 },
  { x: 54, y: 81, w: 44, h: 10, bg: CORNG, fg: CYELL, txt: '', s: 1 }, // too small to read in the photo
  { x: 104, y: 83, w: 40, h: 10, bg: CBLUE, fg: TILEW, txt: '', s: 1 },
];

// ---------- static ----------
function buildFar() {
  for (let x = -4; x < WW;) { const w = 14 + ((wr() * 22) | 0), top = 30 + ((wr() * 14) | 0); L(far, x, top, w, GROUND - top, BFAR); x += w + ((wr() * 4) | 0); }
  const spec: [number, number, number, number, number | null][] = [[262, 18, 14, TILEW, null], [284, 14, 22, STONEL, null], [430, 20, 4, TILEW, null], [454, 16, 18, STONEL, CBLUE], [370, 14, 30, CBEIGE, null]];
  for (const [x, w, top, c, band] of spec) tower(far, x, w, top, LOUV_TOP + 2, c, band, wr, wins);
}

function buildWall() {
  // grey cladding panels
  L(mid, WALL0, WALL_TOP, WALL1 - WALL0, GROUND - WALL_TOP, STONEL); L(mid, WALL0, WALL_TOP, WALL1 - WALL0, 1, STONE);
  for (let y = WALL_TOP + 8; y < 96; y += 9) L(mid, WALL0, y, WALL1 - WALL0, 1, STONE);
  for (let x = 10; x < WALL1; x += 16) L(mid, x, WALL_TOP, 1, 96 - WALL_TOP, STONE);
  for (const b of BOARDS) { L(mid, b.x - 1, b.y - 1, b.w + 2, b.h + 2, BMID); L(mid, b.x, b.y, b.w, b.h, b.bg); }
  // the lettering band over the parking: white, then the dark opening with red jambs
  L(mid, WALL0, 96, WALL1 - WALL0, 20, TILEW); L(mid, WALL0, 116, WALL1 - WALL0, 1, STONE);
  const word = 'ESTACIONAMENTO';
  for (let i = 0; i < word.length; i++) text(mid, word[i], 12 + i * 9, 99, BNEAR);
  text(mid, 'SAIDA', 24, 108, BNEAR); Lp(mid, 24 + 2 * 4 + 1, 106, BNEAR); Lp(mid, 24 + 2 * 4 + 2, 105, BNEAR); // the accent of SAÍDA
  text(mid, 'ENTRADA', 86, 108, BNEAR);
  L(mid, 14, 117, 122, GROUND - 117, VOID); L(mid, 14, 117, 122, 2, BNEAR);
  L(mid, 10, 117, 4, GROUND - 117, CRED); L(mid, 136, 117, 4, GROUND - 117, CRED); L(mid, 73, 117, 4, GROUND - 117, STONEL);
  L(mid, 40, 120, 6, 4, TILEW); Lp(mid, 42, 121, CRED); Lp(mid, 43, 122, CRED); // a no-entry plate inside
  L(mid, 0, 117, 10, GROUND - 117, STONE); L(mid, 140, 117, 10, GROUND - 117, STONE);
}

function buildLogoBlock() {
  // white tiled block, standing taller than its neighbours
  L(mid, LOGO0, LOGO_TOP, LOGO1 - LOGO0, GROUND - LOGO_TOP, TILEW);
  for (let y = LOGO_TOP + 6; y < 116; y += 7) L(mid, LOGO0, y, LOGO1 - LOGO0, 1, STONEL);
  for (let x = LOGO0 + 9; x < LOGO1; x += 10) L(mid, x, LOGO_TOP, 1, 116 - LOGO_TOP, STONEL);
  L(mid, LOGO0, LOGO_TOP, LOGO1 - LOGO0, 1, STONE); L(mid, LOGO0, LOGO_TOP, 1, GROUND - LOGO_TOP, STONE);
  // the hedge at its foot
  for (let y = 112; y < GROUND; y++) for (let x = LOGO0 + 2; x < LOGO1 + 10; x++) {
    const top = 112 + Math.round(Math.abs(Math.sin(x * 0.7)) * 2);
    if (y >= top) Lp(mid, x, y, wr() < 0.35 ? LEAFGD : (x + y) % 5 ? LEAFG : LEAFGD);
  }
  L(mid, LOGO0 + 2, GROUND - 4, LOGO1 - LOGO0 + 8, 4, STONE); // planter kerb
}

function buildLouvres() {
  // the long façade: a glazed strip at the top, salmon louvre bands in white frames, glazed ground floor
  L(mid, LOUV, LOUV_TOP, WW - LOUV, GROUND - LOUV_TOP, TILEW);
  L(mid, LOUV, LOUV_TOP, WW - LOUV, 5, FBLUE); for (let x = LOUV; x < WW; x += 6) L(mid, x, LOUV_TOP, 1, 5, STONEL);
  for (let r = 0; r < 5; r++) {
    const y = LOUV_TOP + 7 + r * 10;
    for (let x = LOUV; x < WW; x++) {
      // a few bays show the dark parking decks behind the louvres
      const bay = Math.floor((x - LOUV) / 26), gap = (bay * 7 + r * 3) % 9 === 0;
      for (let j = 0; j < 6; j++) Lp(mid, x, y + j, gap ? BNEAR : (x + j) % 2 ? FPINK : FORNG); // salmon: orange and pink dithered
      Lp(mid, x, y + 6, CORNG);
    }
    L(mid, LOUV, y + 7, WW - LOUV, 1, STONEL);
  }
  for (let x = LOUV; x < WW; x += 26) L(mid, x, LOUV_TOP, 2, GROUND - LOUV_TOP, TILEW); // white frames
  L(mid, LOUV, GLASS_TOP - 3, WW - LOUV, 3, TILEW);
  L(mid, LOUV, GROUND - 2, WW - LOUV, 2, STONE);
  // the glass marquee over the doors, on slender white posts
  L(mid, 252, 98, 64, 2, TILEW); for (let x = 252; x < 316; x += 4) Lp(mid, x, 97, STEEL);
  for (const x of [254, 312]) L(mid, x, 100, 1, GROUND - 100, TILEW);
}

function buildFront() {
  // forecourt: light concrete slabs, yellow kerb
  for (let y = GROUND; y < 148; y++) for (let x = 0; x < WW; x++) Lp(front, x, y, (x % 17 === 0 || (y - GROUND) % 4 === 3) ? STONE : STONEL);
  L(front, 0, 148, WW, 2, CYELL); L(front, 0, 149, WW, 1, CORNG);
  for (const l of LAMPS) lampPost(front, l);
  // bus shelter: thin roof, posts, an advertising panel
  L(front, 430, 118, 44, 2, STEEL); L(front, 430, 120, 44, 1, BMID);
  for (const x of [432, 451, 471]) L(front, x, 120, 1, 28, STEEL);
  L(front, 434, 124, 16, 14, CBLUE); L(front, 436, 126, 12, 4, CYELL); L(front, 436, 132, 8, 4, TILEW);
  L(front, 453, 139, 17, 2, WOOD); L(front, 454, 141, 1, 5, STEEL); L(front, 468, 141, 1, 5, STEEL); // bench
}

function buildGround() {
  for (let d = 0; d < SH; d++) for (let x = 0; x < WW; x++) street.base[d * WW + x] = wr() < 0.07 ? STONE : ASPH;
  for (const row of [9, 20]) for (let x = 6; x < WW; x += 22) for (let i = 0; i < 10; i++) street.base[row * WW + x + i] = TILEW; // lane dashes
  for (let p = 0; p < 6; p++) {
    const cx = wr() * WW, cy = 2 + wr() * (SH - 4), rx = 8 + wr() * 18, ry = 2 + wr() * 2;
    for (let d = 0; d < SH; d++) for (let x = 0; x < WW; x++) { const a = (x - cx) / rx, b = (d - cy) / ry; if (a * a + b * b < 1) street.pud[d * WW + x] = 1; }
  }
}

// ---------- dynamic ----------
const open = () => (S.cal.weekday === 0 ? hourIn(S.cal.hour, 14, 20) : hourIn(S.cal.hour, 10, 22));
/** Shoppers out: more in the evening and at weekends while open; a trickle when closed. */
function crowd() {
  if (!open()) return 0.45;
  const h = S.cal.hour, eve = h >= 17 ? 1.5 : 1, wkend = S.cal.weekday === 0 || S.cal.weekday === 6 ? 1.3 : 1;
  return 1.1 * eve * wkend;
}

/** The red flower: eight petals around a ring. Lit pink at night while open, dim when closed. */
function emblem(cx: number, cy: number) {
  const n = isNight(), o = open(), c = n ? (o ? MAG : MAGD) : CRED, core = n ? (o ? LIGHT : MAGD) : CRED;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2, px = cx + Math.round(Math.cos(a) * 5), py = cy + Math.round(Math.sin(a) * 5);
    rect(px - 1, py - 1, 3, 3, c); put(px, py, n ? c : TILEW);
  }
  rect(cx - 1, cy - 1, 3, 3, core);
}

function signs() {
  const n = isNight(), lit = n && open();
  // the mall's name: dark letters by day, white light while open at night, unlit after closing
  const name = lit ? LEDW : n ? BMID : BNEAR;
  emblem(195, 44);
  text(null, 'PARTAGE', 195 - (textW('PARTAGE') >> 1), 58, name);
  text(null, 'SHOPPING', 195 - (textW('SHOPPING') >> 1), 65, name);
  text(null, 'CAMPINA GRANDE', 195 - (textW('CAMPINA GRANDE') >> 1), 73, lit ? LIGHT : n ? BMID : STONE);
  for (const b of BOARDS) {
    if (!b.txt) continue;
    const tx = b.x + ((b.w - textW(b.txt, b.s)) >> 1), ty = b.y + ((b.h - 5 * b.s) >> 1);
    text(null, b.txt, tx, ty, lit ? (b.bg === TILEW ? WWARM : WHITE) : b.fg, b.s);
  }
}

/** The glazed ground floor: shops and the doors, lit at night while open; shutters when closed. */
function groundFloor() {
  const n = isNight(), o = open();
  for (let x = LOUV + 2; x < WW; x += 26) {
    const w = 24, y = GLASS_TOP, h = GROUND - 2 - GLASS_TOP;
    const doors = x === LOUV + 2 || x === LOUV + 28; // the main doors under the marquee
    if (o) {
      rect(x, y, w, h, n ? WWARM : WDIM);
      if (n) for (let i = 4; i < w; i += 12) rect(x + i, y + 2, 1, h - 2, LIGHT);
      if (doors) { rect(x + 3, y + 8, 6, h - 8, FPINK); rect(x + 15, y + 8, 6, h - 8, FPINK); rect(x + 5, y + 12, 2, 4, n ? WWARM : TILEW); }
    } else {
      rect(x, y, w, h, BNEAR);
      if (doors && n) rect(x + 10, y + 4, 4, 2, WDIM); // a security light inside
    }
    rect(x, y + 10, w, 1, TILEW); rect(x + 11, y, 1, h, TILEW);
    if (!doors) for (const px of [x + 4, x + 18]) { rect(px - 2, GROUND - 6, 5, 4, WOOD); rect(px - 2, GROUND - 9, 5, 3, LEAFG); put(px, GROUND - 10, LEAFGD); } // potted plants
  }
  // the upper louvre gaps: deck lights at night
  if (n) for (let r = 0; r < 5; r++) for (let bay = 0; bay < 10; bay++) if ((bay * 7 + r * 3) % 9 === 0) put(LOUV + bay * 26 + 13, LOUV_TOP + 10 + r * 10, o ? LEDW : WDIM);
}

/** The parking entrance: dim ramp lights, headlights of a car leaving now and then while open. */
function parking() {
  const n = isNight(), o = open(), t = S.ms / 1000;
  for (let x = 20; x < 132; x += 14) put(x, 120, n || o ? (o ? WWARM : WDIM) : BNEAR);
  if (o && Math.sin(t * 0.21) > 0.75) { rect(30, 132, 18, 6, STONEL); rect(33, 129, 12, 3, WDIM); put(30, 135, n ? LIGHT : TILEW); put(47, 135, n ? LIGHT : TILEW); }
}

/** Cones on a chain, plastic barriers, the pipoca cart, parked motorcycles and bicycles. */
function forecourt() {
  const n = isNight(), o = open(), h = S.cal.hour;
  for (let i = 0; i < 6; i++) {
    const x = 150 + i * 16;
    rect(x, 146, 5, 1, CRED); rect(x + 1, 141, 3, 5, CRED); rect(x + 1, 143, 3, 1, TILEW); put(x + 2, 140, CRED);
    if (i < 5) for (let k = 1; k < 16; k++) put(x + 2 + k, 142 + Math.round(Math.sin((k / 16) * Math.PI) * 2), BNEAR);
  }
  for (let i = 0; i < 5; i++) { const x = 330 + i * 14; rect(x, 141, 10, 6, FPINK); rect(x, 141, 10, 1, TILEW); rect(x + 2, 143, 2, 2, TILEW); rect(x + 6, 143, 2, 2, TILEW); }
  // motorcycles at the doors: more while the mall is open
  const motos = o ? 3 + Math.round(2 * Math.sin(h)) + (h >= 17 ? 2 : 0) : 1;
  const cols = [CRED, VOID, TILEW, CBLUE, STONEL, VOID, CRED];
  for (let i = 0; i < motos; i++) {
    const x = 262 + i * 13, c = cols[i % cols.length];
    rect(x, 144, 3, 3, VOID); rect(x + 8, 144, 3, 3, VOID); rect(x + 2, 141, 8, 3, c); rect(x + 4, 139, 4, 2, VOID); rect(x + 9, 137, 1, 4, STEEL);
  }
  // bicycles leaning on the rack by the palm
  for (const x of [394, 401]) { for (let k = 0; k < 4; k++) { put(x + k, 146 - (k === 0 || k === 3 ? 1 : 0), BNEAR); put(x + 5 + k, 146 - (k === 0 || k === 3 ? 1 : 0), BNEAR); } rect(x + 2, 142, 6, 1, CRED); put(x + 7, 141, STEEL); }
  rect(392, 146, 18, 1, STEEL);
  // the pipoca cart: steel box, orange umbrella; open afternoons and evenings while the mall is
  if (o && h >= 14) {
    const x = 120, g = 147;
    rect(x, g - 12, 14, 9, STONEL); rect(x + 1, g - 11, 12, 4, n ? WWARM : TILEW); rect(x + 2, g - 10, 10, 2, CYELL);
    rect(x + 1, g - 3, 3, 3, VOID); rect(x + 10, g - 3, 3, 3, VOID); rect(x - 4, g - 6, 4, 6, CBLUE); // gas bottle
    rect(x + 6, g - 26, 1, 14, STEEL);
    for (let i = -10; i <= 10; i++) { const y = g - 27 + Math.round((i * i) / 28); put(x + 6 + i, y, (i + 10) % 6 < 3 ? FORNG : CORNG); if (Math.abs(i) < 8) put(x + 6 + i, y - 1, FORNG); }
    if (n) put(x + 6, g - 24, LIGHT);
  }
}

function update(dt: number) {
  updateAnimals(dt);
  tickSpawns(dt, crowd()); updatePeople(dt); updateCars(dt, 1.5);
}

const FOG = [{ y: 104, h: 10, sp: 0.4 }, { y: 140, h: 6, sp: -0.3 }];
function render() {
  drawSky(HORIZON); drawAnimalsSky(); drawLightning();
  blitLayer(far); drawTowerWins(wins); drawFireworks();
  blitLayer(mid);
  groundFloor(); parking(); signs();
  if (S.natal && isNight()) christmasStar(195, 92, 1.4);
  drawFarPrecip();
  blitLayer(front);
  for (const p of PALMS) drawPalm(p);
  for (const l of LAMPS) lampLight(l);
  if (S.saoJoao) { bandeirolas(LOGO1, 96, 316, 96, 6, 2); bandeirolas(316, 96, 420, 92, 8, 5); }
  forecourt();
  drawAnimalsPerched(); drawPeople(); drawAnimalsGround();
  drawStreet(street); drawCars(); drawRipples(); drawFog(FOG); drawNearPrecip();
}

let built = false;
export const partage: Scene = {
  id: 'partage-shopping',
  name: 'Partage Shopping',
  build() {
    if (!built) { buildFar(); buildWall(); buildLogoBlock(); buildLouvres(); buildFront(); buildGround(); built = true; }
    setLanes([{ y: 142 }, { y: 145 }, { y: 147 }]);
    setupAnimals({ ground: [143, 147], dogs: 1, sleepSpots: [150, 470], lamps: LAMPS.map((l) => ({ x: l.x + 14, y: l.top })),
      walls: [{ x0: WALL0 + 4, x1: WALL1 - 4, y: WALL_TOP - 1 }, { x0: LOUV + 4, x1: WW - 4, y: LOUV_TOP - 1 }, { x0: 432, x1: 472, y: 117 }] });
    setCarLanes(162, 175, 'br');
    configure({ roofs: [{ x0: WALL0, x1: WALL1, y: WALL_TOP - 1 }, { x0: LOGO0, x1: LOGO1, y: LOGO_TOP - 1 }, { x0: LOUV, x1: WW, y: LOUV_TOP - 1 }, { x0: 252, x1: 316, y: 97 }, { x0: 430, x1: 474, y: 117 }],
      tips: [{ x: 253, y: 100, end: GROUND }, { x: 315, y: 100, end: GROUND }, { x: 431, y: 120, end: 148 }, { x: 473, y: 120, end: 148 }],
      lamps: LAMPS.map((l) => ({ x: l.x + 14, y: l.top })), ground0: GROUND, horizon: HORIZON });
    for (let i = 0; i < 150; i++) update(1 / 30);
  },
  update,
  render,
  debug() { return `active  people x${peopleCount()}  shopping ${open() ? 'aberto' : 'fechado'}`; },
};
