/* TERMINAL DE INTEGRAÇÃO (Campina Grande, PB), drawn from Street View captures of R. Dom Pedro II,
   R. Sebastião Donato and Av. Santa Clara (Dec 2024 and Jan 2025; reference only, not in the repo).
   The city's central bus terminal seen from across R. Dom Pedro II: a long, low shelter with a light
   corrugated roof on a trussed steel frame, tall slender concrete fins rising above it at intervals (one
   painted with a mural, drawn here as an abstract painted panel), green iron railings along the
   sidewalk with passengers on red benches behind them, and the white city buses with blue or green
   stripes pulling into the bays, waiting at the platform and pulling out. At the entrance on the left
   the big SITRANS / STTP board on its red lattice mast, half of it a blue TARIFA ZERO ad, and a purple
   TARIFA ZERO banner on the gate; flame trees and the high-rises of the centre behind.

   Only the lettering legible in the captures is used (SITRANS, STTP, TARIFA ZERO); the city crest on
   the board is drawn without its small lettering. The timetable is art direction, not the real one:
   buses run from 04:30 to 23:30, most often at the 6-9h and 17-19h rush hours, and the shelter lights
   stay on at night while the terminal operates. */
import { L, Lp, WW, blitLayer, getW, newLayer, put, rect, sx, sy } from '../engine/gfx';
import { bay, mulberry32 } from '../engine/math';
import {
  AMB, ASPH, BARK, BFAR, BMID, BNEAR, CBEIGE, CBLUE, CGREEN, CNAVY, CRED, CYELL, FLILAC, FPINK, HALO, HALOOK, HAIR1, HAIR2,
  LEAFG, LEAFGD, LEDW, LIGHT, SKIN1, SKIN2, SKIN3, SKIN4, STEEL, STONE, STONEL, TILEW, VOID, WCOOL, WDIM, WOOD,
} from '../engine/palette';
import { configure, drawFarPrecip, drawNearPrecip, drawRipples, precip } from '../fx/precip';
import { drawFireworks, drawLightning } from '../fx/sky-events';
import { drawAnimalsGround, drawAnimalsPerched, drawAnimalsSky, setupAnimals, updateAnimals } from '../actors/animals';
import { drawPeople, peopleCount, setLanes, tickSpawns, updatePeople } from '../actors/people';
import { drawCars, setCarLanes, updateCars } from '../actors/cars';
import { S, hourIn } from '../sky/state';
import { drawFog, drawSky, drawStreet, type Street } from './common';
import {
  type Lamp, type TowerWin, bandeirolas, drawTowerWins, isNight, lampLight, lampPost, pole, text, textW, tower, wire, wireCurve,
} from './br-kit';
import type { Scene } from './types';

const HORIZON = 112, STREET = 150, SH = 180 - STREET, GROUND = 140;
/** Shelter: roof from R0 to the right edge; eave line, railing, platform and the two bus lanes. */
const R0 = 54, EAVE = 92, RAIL_TOP = 125, RAIL_BOT = 139, FAR_LANE = 123, NEAR_LANE = 130;
const FINS = [74, 198, 334, 452];
const MURAL = 198;
const wr = mulberry32(0x7e1a);
const far = newLayer(), mid = newLayer(), rail = newLayer(), front = newLayer();
const street: Street = { y0: STREET, base: new Uint8Array(SH * WW), pud: new Uint8Array(SH * WW), jit: precip.jit };
const wins: TowerWin[] = [];
const LAMPS: Lamp[] = [{ x: 150, top: 96, ground: 147, arms: 1 }, { x: 392, top: 96, ground: 147, arms: 1 }];

// ---------- static ----------
function blob(ly: Uint8Array, cx: number, cy: number, rx: number, ry: number, c: number, c2: number) {
  for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
    const d = (x * x) / (rx * rx) + (y * y) / (ry * ry);
    if (d < 1 - wr() * 0.18) Lp(ly, cx + x, cy + y, y > ry * 0.3 || (x + y) % 5 === 0 ? c2 : c);
  }
}

function buildFar() {
  // the centre's high-rises behind the terminal (the white balconied block on the right, a red-brick one on the left)
  const spec: [number, number, number, number, number | null][] = [
    [6, 20, 40, CBEIGE, null], [30, 16, 62, STONEL, null], [92, 18, 30, CRED, null], [114, 14, 54, STONEL, null],
    [168, 20, 46, TILEW, null], [226, 16, 64, CBEIGE, null], [268, 22, 36, STONEL, CBLUE], [300, 14, 58, TILEW, null],
    [362, 34, 50, TILEW, null], [404, 18, 66, STONEL, null], [436, 24, 44, CBEIGE, CRED],
  ];
  for (const [x, w, top, c, band] of spec) tower(far, x, w, top, 104, c, band, wr, wins);
  // the white block's long balconies
  for (let y = 54; y < 100; y += 6) L(far, 360, y, 38, 1, STONE);
  for (let x = -4; x < WW;) { const w = 12 + ((wr() * 18) | 0), top = 86 + ((wr() * 12) | 0); L(far, x, top, w, 104 - top, BFAR); x += w + 2; }
  // the trees of the block behind the terminal
  for (const [cx, cy, rx, ry] of [[20, 92, 20, 12], [62, 88, 18, 13], [128, 94, 22, 10], [176, 90, 18, 12], [242, 92, 24, 12],
    [292, 88, 20, 13], [348, 94, 22, 10], [410, 90, 22, 13], [462, 92, 20, 11]] as const) {
    blob(far, cx, cy, rx, ry, LEAFG, LEAFGD);
    L(far, cx - 1, cy + ry - 2, 2, 104 - (cy + ry - 2), BARK);
  }
}

function buildMid() {
  // ground behind the railing: the bus lanes in asphalt, the platform kerb, the platform
  L(mid, 0, 98, WW, 8, BMID);
  L(mid, 0, 106, WW, NEAR_LANE - 106 + 1, ASPH);
  for (let x = 6; x < WW; x += 20) L(mid, x, FAR_LANE + 2, 9, 1, CYELL); // lane marking between the bays
  L(mid, 0, NEAR_LANE + 1, WW, 1, TILEW); L(mid, 0, NEAR_LANE + 2, WW, 1, STONE);
  for (let y = NEAR_LANE + 3; y < RAIL_BOT; y++) for (let x = 0; x < WW; x++) Lp(mid, x, y, (x + y * 3) % 11 ? STONEL : STONE);
  // the second shelter further in, a curved roof just showing over the first
  for (let x = R0 + 30; x < WW; x++) { const y = 88 + Math.round(Math.sin(((x - R0) / 60) * Math.PI) * 0.8); L(mid, x, y, 1, 3, x % 3 ? STONEL : STONE); }
  L(mid, R0 + 30, 91, WW, 2, BNEAR);
  for (let x = R0 + 36; x < WW; x += 30) L(mid, x, 93, 1, 5, STEEL);
  // red benches on the platform, in short rows facing the bays
  for (let x = R0 + 8; x < WW - 4; x += 26) if (!FINS.some((f) => Math.abs(f + 3 - (x + 7)) < 10)) {
    L(mid, x, 135, 14, 2, CRED); L(mid, x, 134, 14, 1, FPINK); L(mid, x + 1, 137, 1, 2, STEEL); L(mid, x + 12, 137, 1, 2, STEEL);
  }
}

/** The tall concrete fin with its top cut on a slant. */
function fin(ly: Uint8Array, x: number, top: number) {
  for (let i = 0; i < 7; i++) {
    const t = top + Math.round(i * 1.6);
    L(ly, x + i, t, 1, RAIL_BOT + 1 - t, i === 6 ? STONE : i === 0 ? TILEW : STONEL);
  }
  for (let y = top + 20; y < RAIL_BOT; y += 13) Lp(ly, x + 3, y, STONE); // formwork marks
}

/** The painted fin: an abstract mural (a face under a crowned headdress, cacti at the foot). */
function mural(ly: Uint8Array, x: number) {
  L(ly, x, 70, 7, 22, STONEL);
  for (let y = 74; y < 90; y++) { const w = y < 80 ? 1 : 2; Lp(ly, x + 2, y, CGREEN); if (y > 78) { Lp(ly, x + 4, y + 2, CGREEN); Lp(ly, x + 4 + (y % 4 === 0 ? w : 0), y, CGREEN); } }
  L(ly, x + 1, 92, 5, 4, FPINK); Lp(ly, x + 2, 91, CYELL); Lp(ly, x + 4, 91, CYELL); // the crown
  for (let y = 96; y < 112; y++) L(ly, x, y, 7, 1, y % 3 ? TILEW : CNAVY); // the headdress
  L(ly, x + 1, 112, 5, 7, SKIN2); Lp(ly, x + 2, 114, VOID); Lp(ly, x + 4, 114, VOID); Lp(ly, x + 3, 117, CRED); // the face
  L(ly, x, 112, 1, 10, CNAVY); L(ly, x + 6, 112, 1, 10, CNAVY);
  L(ly, x, 119, 7, 10, FPINK); L(ly, x + 3, 120, 1, 8, TILEW); // the blouse
  for (let y = 129; y < RAIL_BOT; y++) L(ly, x, y, 7, 1, (y + x) % 4 ? CBLUE : CGREEN);
  Lp(ly, x + 1, 131, CGREEN); Lp(ly, x + 1, 130, CGREEN); Lp(ly, x + 5, 132, CGREEN); Lp(ly, x + 5, 131, CGREEN);
}

function buildRail() {
  // roof edge: corrugated fascia, the truss under it, slim posts
  for (let x = R0; x < WW; x++) {
    const y = EAVE - 4 + Math.round(Math.sin(((x - R0) / (WW - R0)) * Math.PI) * -1);
    L(rail, x, y, 1, 2, x % 2 ? STONEL : TILEW); L(rail, x, y + 2, 1, EAVE - y, x % 3 ? STEEL : STONE);
  }
  L(rail, R0, EAVE, WW - R0, 1, BNEAR); L(rail, R0, EAVE + 6, WW - R0, 1, BNEAR);
  for (let x = R0; x + 12 <= WW; x += 12) for (let i = 0; i < 6; i++) { Lp(rail, x + i * 2, EAVE + 1 + i, STEEL); Lp(rail, x + 12 - i * 2, EAVE + 1 + i, STEEL); }
  for (let x = R0 + 2; x < WW; x += 48) L(rail, x, EAVE + 7, 2, RAIL_BOT - EAVE - 7, BNEAR);
  // green iron railing: two rails, bars every 3 px, a diagonal brace in each panel, posts every 24 px
  for (let x = 0; x < WW; x++) {
    if (x > 12 && x < 46) continue; // the bus gate under the board
    if (x % 3 === 0) L(rail, x, RAIL_TOP, 1, RAIL_BOT - RAIL_TOP, CGREEN);
    if (x % 24 === 0) L(rail, x, RAIL_TOP - 1, 2, RAIL_BOT - RAIL_TOP + 1, BNEAR);
    Lp(rail, x, RAIL_TOP, CGREEN); Lp(rail, x, RAIL_TOP + 6, CGREEN); Lp(rail, x, RAIL_BOT - 2, CGREEN);
    const k = x % 24; Lp(rail, x, RAIL_TOP + 6 + Math.round(k * 0.25), CGREEN);
  }
  L(rail, 0, RAIL_BOT, WW, 1, STONE);
  for (const x of FINS) if (x === MURAL) { fin(rail, x, 50); mural(rail, x); } else fin(rail, x, 44 + ((x * 7) % 9));
  // the gate posts and its open leaf
  L(rail, 11, RAIL_TOP - 4, 2, RAIL_BOT - RAIL_TOP + 4, CGREEN); L(rail, 46, RAIL_TOP - 4, 2, RAIL_BOT - RAIL_TOP + 4, CGREEN);
  // TARIFA ZERO banner on the railing by the gate
  L(rail, 52, 124, 38, 14, FLILAC); L(rail, 52, 124, 5, 14, CGREEN); L(rail, 52, 124, 38, 1, TILEW); L(rail, 52, 137, 38, 1, TILEW);
  L(rail, 59, 128, 9, 6, TILEW); L(rail, 60, 129, 3, 2, CBLUE); L(rail, 64, 129, 3, 2, CBLUE); Lp(rail, 60, 134, VOID); Lp(rail, 66, 134, VOID); // the bus on it
  text(rail, 'TARIFA', 66, 125, TILEW); text(rail, 'ZERO', 70, 131, CYELL);
}

function buildBoard() {
  // the red lattice mast
  const mx = 26;
  L(far, mx, 66, 1, RAIL_BOT - 66, CRED); L(far, mx + 7, 66, 1, RAIL_BOT - 66, CRED);
  for (let y = 66; y < RAIL_BOT; y += 8) { L(far, mx, y, 8, 1, CRED); for (let i = 0; i < 8; i++) { Lp(far, mx + i, y + i, CRED); Lp(far, mx + 7 - i, y + i, BARK); } }
  // the board: blue TARIFA ZERO half, white SITRANS / STTP half with the city crest
  const bx = 0, by = 40, bw = 88, bh = 26;
  L(far, bx, by, bw, bh, TILEW); L(far, bx, by, 38, bh, CBLUE);
  L(far, bx, by - 1, bw, 1, STONE); L(far, bx, by + bh, bw, 1, STONE);
  text(far, 'TARIFA', 4, by + 4, TILEW); text(far, 'ZERO', 4, by + 12, CGREEN, 2);
  L(far, 28, by + 2, 9, 9, CGREEN); L(far, 29, by + 4, 7, 5, TILEW); L(far, 30, by + 5, 2, 2, CBLUE); L(far, 33, by + 5, 2, 2, CBLUE); // bus pictogram
  const sw = textW('SITRANS', 2); text(far, 'SITRANS', 63 - (sw >> 1), by + 3, CNAVY, 2);
  for (let i = 0; i < 4; i++) L(far, 42 + i, by + 16 + i * 2, 9, 1, CNAVY); // the STTP speed lines
  text(far, 'STTP', 50, by + 16, CNAVY);
  L(far, 70, by + 15, 14, 9, CNAVY); L(far, 71, by + 16, 12, 7, TILEW); L(far, 79, by + 17, 3, 5, CNAVY); L(far, 72, by + 17, 6, 1, STONE); L(far, 72, by + 19, 6, 1, STONE); L(far, 72, by + 21, 6, 1, STONE); // crest
}

function buildFront() {
  // sidewalk: grey concrete slabs, white-painted kerb
  for (let y = GROUND; y < STREET - 1; y++) for (let x = 0; x < WW; x++) Lp(front, x, y, x % 16 === 0 || y === GROUND + 4 ? STONE : STONEL);
  L(front, 0, STREET - 1, WW, 1, TILEW);
  for (let x = 0; x < WW; x += 8) Lp(front, x, STREET - 1, STONE);
  // the driveway where the buses leave, ramped kerb under the board
  L(front, 12, GROUND, 34, STREET - GROUND, STONE); for (let x = 12; x < 46; x += 4) Lp(front, x, STREET - 1, BMID);
  for (const l of LAMPS) lampPost(front, l);
  pole(front, 278, GROUND + 4, 112); L(front, 282, 78, 4, 6, STEEL);
  for (const [x0, y0, x1, y1, s] of [[0, 34, 279, 36, 8], [279, 36, 480, 28, 9], [0, 40, 279, 38, 10], [279, 38, 480, 44, 7]] as const) wire(front, x0, y0, x1, y1, s);
}

function buildGround() {
  for (let d = 0; d < SH; d++) for (let x = 0; x < WW; x++) street.base[d * WW + x] = wr() < 0.07 ? STONE : ASPH;
  for (let x = 4; x < WW; x += 22) for (let i = 0; i < 10; i++) street.base[16 * WW + x + i] = TILEW; // R. Dom Pedro II's lane dashes
  for (let x = 12; x < 46; x++) for (let d = 0; d < 3; d++) street.base[d * WW + x] = STONE; // patched asphalt at the driveway
  for (let p = 0; p < 5; p++) {
    const cx = wr() * WW, cy = 2 + wr() * (SH - 4), rx = 8 + wr() * 18, ry = 2 + wr() * 2;
    for (let d = 0; d < SH; d++) for (let x = 0; x < WW; x++) { const a = (x - cx) / rx, b = (d - cy) / ry; if (a * a + b * b < 1) street.pud[d * WW + x] = 1; }
  }
}

// ---------- dynamic: timetable, buses in the bays, passengers ----------
const operating = () => hourIn(S.cal.hour, 4.5, 23.5);
const rush = () => { const h = S.cal.hour; return (h >= 6 && h < 9) || (h >= 17 && h < 19); };
/** Seconds between buses arriving: frequent at the rush hours, sparse early and late. */
function headway() {
  const h = S.cal.hour;
  if (!operating()) return Infinity;
  if (rush()) return 6;
  if (h < 5.5 || h >= 22) return 30;
  if (h >= 20) return 18;
  return 11;
}

interface Bus { on: boolean; x: number; lane: 0 | 1; st: 'in' | 'dwell' | 'out'; stop: number; t: number; sp: number; c: number; doors: number }
const LEN = 62;
const BUSES: Bus[] = Array.from({ length: 5 }, () => ({ on: false, x: 0, lane: 0 as 0 | 1, st: 'in' as const, stop: 0, t: 0, sp: 0, c: CBLUE, doors: 0 }));
const br = mulberry32(0xb05);
let nextBus = 2;
const laneY = (b: Bus) => (b.lane ? NEAR_LANE : FAR_LANE);
const dirOf = (b: Bus) => (b.lane ? 1 : -1);

function spawnBus() {
  const b = BUSES.find((o) => !o.on);
  if (!b) return;
  const lane: 0 | 1 = br() < 0.5 ? 0 : 1, d = lane ? 1 : -1;
  // don't enter on top of a bus still near the entry
  if (BUSES.some((o) => o.on && o.lane === lane && (d > 0 ? o.x < 10 : o.x > WW - LEN - 10))) return;
  b.on = true; b.lane = lane; b.x = d > 0 ? -LEN - 4 : WW + 4; b.st = 'in'; b.sp = 34; b.c = br() < 0.6 ? CBLUE : CGREEN; b.doors = 0;
  // berths along the platform; the bus stops with its front at the berth
  const berths = [130, 210, 290, 370, 450];
  b.stop = berths[(br() * berths.length) | 0] - (d > 0 ? 0 : LEN - 10);
  b.t = 7 + br() * (rush() ? 14 : 22);
}

function stepBus(b: Bus, dt: number) {
  const d = dirOf(b);
  // keep a gap behind the bus ahead in the same lane
  let limit = Infinity;
  for (const o of BUSES) {
    if (o === b || !o.on || o.lane !== b.lane) continue;
    const gap = d > 0 ? o.x - (b.x + LEN) : b.x - (o.x + LEN);
    if (gap > -LEN && gap < limit) limit = gap;
  }
  if (b.st === 'in') {
    const toStop = d > 0 ? b.stop + LEN - (b.x + LEN) : b.x - b.stop;
    const room = Math.min(toStop, limit - 6);
    b.sp = Math.max(0, Math.min(34, room * 1.2));
    if (toStop < 0.8) { b.st = 'dwell'; b.sp = 0; }
    else if (limit < 8 && b.sp < 2) { b.st = 'dwell'; b.sp = 0; b.t = Math.max(b.t, 5); } // queue behind and board there
  } else if (b.st === 'dwell') {
    b.t -= dt; b.doors = Math.min(1, b.doors + dt * 2);
    if (b.t <= 0) { b.doors = Math.max(0, b.doors - dt * 4); if (b.doors === 0) b.st = 'out'; }
  } else {
    b.sp = Math.min(36, b.sp + dt * 10);
    if (limit < 10) b.sp = Math.min(b.sp, Math.max(0, limit - 4));
  }
  b.x += d * b.sp * dt;
  if (b.x < -LEN - 20 || b.x > WW + 20) b.on = false;
}

function updateBuses(dt: number) {
  nextBus -= dt;
  if (nextBus <= 0) {
    if (operating()) { nextBus = headway() * (0.6 + br() * 0.8); spawnBus(); }
    else nextBus = 20; // closed: look again later
  }
  for (const b of BUSES) if (b.on) stepBus(b, dt);
}

function drawBus(b: Bus) {
  const f = dirOf(b), x0 = Math.round(b.x), y = laneY(b), H = 17, top = y - H - 2, n = isNight();
  rect(x0, top, LEN, H, TILEW); rect(x0 + 2, top - 1, LEN - 4, 1, STONEL);
  rect(x0 + (f > 0 ? 6 : LEN - 22), top - 3, 16, 2, STONE); // roof AC unit
  for (let wx = x0 + 4; wx < x0 + LEN - 12; wx += 6) rect(wx, top + 3, 5, 5, n ? LIGHT : WDIM);
  const ws = f > 0 ? x0 + LEN - 7 : x0 + 1;
  rect(ws, top + 2, 6, 9, n ? WCOOL : WDIM);
  rect(ws, top, 6, 2, n ? AMB : BNEAR); // destination display
  // the livery: a swoosh along the side and a thin second stripe
  for (let i = 0; i < LEN; i++) {
    const u = f > 0 ? i / LEN : 1 - i / LEN, yy = top + 10 + Math.round(Math.sin(u * Math.PI * 1.5) * 1.5);
    rect(x0 + i, yy, 1, 2, b.c);
    if (u > 0.55) put(x0 + i, yy - 2, b.c === CBLUE ? CGREEN : CBLUE);
  }
  // doors (front and middle) open into dark gaps while boarding
  for (const dx of f > 0 ? [LEN - 13, 26] : [9, LEN - 30]) rect(x0 + dx, top + 3, 4, H - 4, b.doors > 0.5 ? VOID : BNEAR);
  rect(x0, y - 4, LEN, 2, STONE);
  for (const wx of [x0 + 9, x0 + LEN - 12]) { rect(wx - 3, y - 4, 7, 4, VOID); put(wx, y - 2, STEEL); }
  if (n) { put(f > 0 ? x0 + LEN - 1 : x0, y - 6, LIGHT); put(f > 0 ? x0 : x0 + LEN - 1, y - 6, CRED); }
}

/** Passengers waiting on the platform: seated on the benches and standing, as many as the hour brings. */
const PAX = Array.from({ length: 34 }, (_, i) => {
  const x = R0 + 10 + Math.round((i / 34) * (WW - R0 - 18) + br() * 6);
  return { x, seat: br() < 0.55, rank: br(), shirt: [CRED, CBLUE, CYELL, CGREEN, TILEW, VOID, FPINK, CNAVY][(br() * 8) | 0], skin: [SKIN1, SKIN2, SKIN3, SKIN4][(br() * 4) | 0], hair: br() < 0.5 ? HAIR1 : HAIR2, ph: br() * 6 };
});
const paxLevel = () => (operating() ? Math.min(1, 0.12 + S.busy * 0.75 + (rush() ? 0.25 : 0)) : 0);

function drawPax() {
  const lv = paxLevel(), t = S.ms / 1000;
  for (const p of PAX) {
    if (p.rank >= lv || FINS.some((f) => p.x > f - 3 && p.x < f + 9)) continue;
    const look = Math.sin(t * 0.3 + p.ph) > 0.85 ? 1 : 0;
    if (p.seat) {
      const y = 134;
      rect(p.x, y - 7, 3, 2, p.skin); rect(p.x, y - 8, 3, 1, p.hair); put(p.x + (look ? 2 : 0), y - 7, p.hair);
      rect(p.x, y - 5, 3, 5, p.shirt); rect(p.x, y, 4, 2, CNAVY); rect(p.x + 3, y + 2, 1, 4, CNAVY);
    } else {
      const y = 138, sway = Math.sin(t * 0.8 + p.ph) > 0.7 ? 1 : 0;
      rect(p.x + sway, y - 15, 3, 3, p.skin); rect(p.x + sway, y - 16, 3, 1, p.hair);
      rect(p.x, y - 12, 3, 6, p.shirt); rect(p.x, y - 6, 1, 6, CNAVY); rect(p.x + 2, y - 6, 1, 6, CNAVY);
      if (p.rank < 0.1) rect(p.x + 3, y - 9, 2, 3, WOOD); // a bag
    }
  }
}

/** Fluorescent tubes under the roof, lit at night while the terminal runs, with light on the platform. */
function shelterLights() {
  const on = isNight() && operating();
  for (let x = R0 + 14; x < WW; x += 32) {
    rect(x, EAVE + 7, 6, 1, on ? LEDW : STONEL);
    if (!on) continue;
    // a pool of light on the platform floor and the kerb, not on the walls
    for (let y = NEAR_LANE + 1; y < RAIL_BOT; y++) {
      const d = (y - NEAR_LANE) / (RAIL_BOT - NEAR_LANE), half = 8 + d * 6;
      for (let i = Math.floor(x + 3 - half); i <= x + 3 + half; i++) {
        const c = getW(i, y);
        if (c === 255 || !HALOOK[c]) continue;
        if (bay(sx(i), sy(y)) < (1 - Math.abs(i - x - 3) / half) * 0.22) put(i, y, HALO);
      }
    }
    for (let i = -2; i <= 8; i++) { const c = getW(x + i, EAVE + 8); if (c !== 255 && HALOOK[c] && bay(sx(x + i), sy(EAVE + 8)) < 0.4) put(x + i, EAVE + 8, HALO); }
  }
}

/** The flame trees behind the terminal flower red from October to January. */
const BLOOM = Array.from({ length: 70 }, () => ({ t: (br() * 3) | 0, dx: (br() - 0.5) * 34, dy: (br() - 0.5) * 18 }));
function flameTrees() {
  const m = S.cal.month;
  if (!(m >= 9 || m === 0)) return;
  const at = [[62, 88], [242, 92], [410, 90]];
  for (const b of BLOOM) { const [cx, cy] = at[b.t]; const x = Math.round(cx + b.dx), y = Math.round(cy + b.dy * 0.8); if (getW(x, y) === LEAFG || getW(x, y) === LEAFGD) { put(x, y, CRED); put(x + 1, y, CRED); } }
}

function update(dt: number) {
  updateAnimals(dt);
  tickSpawns(dt, 1.2); updatePeople(dt); updateCars(dt, 1.3);
  updateBuses(dt);
}

const FOG = [{ y: 104, h: 9, sp: 0.5 }, { y: 140, h: 5, sp: -0.3 }];
function render() {
  drawSky(HORIZON); drawAnimalsSky(); drawLightning();
  blitLayer(far); drawTowerWins(wins); flameTrees(); drawFireworks();
  blitLayer(mid);
  for (const b of BUSES) if (b.on && b.lane === 0) drawBus(b);
  for (const b of BUSES) if (b.on && b.lane === 1) drawBus(b);
  drawPax();
  drawFarPrecip();
  blitLayer(rail);
  shelterLights();
  if (S.saoJoao) { bandeirolas(R0, EAVE + 7, 200, EAVE + 7, 4, 2); bandeirolas(200, EAVE + 7, 480, EAVE + 7, 4, 6); }
  blitLayer(front);
  for (const l of LAMPS) lampLight(l);
  drawAnimalsPerched(); drawPeople(); drawAnimalsGround();
  drawStreet(street); drawCars(); drawRipples(); drawFog(FOG); drawNearPrecip();
}

let built = false;
export const terminalIntegracao: Scene = {
  id: 'terminal-integracao',
  name: 'Terminal de Integração',
  build() {
    if (!built) { buildFar(); buildBoard(); buildMid(); buildRail(); buildFront(); buildGround(); built = true; }
    setLanes([{ y: 143 }, { y: 146 }]);
    setupAnimals({ ground: [143, 147], dogs: 2, sleepSpots: [30, 300],
      lamps: LAMPS.map((l) => ({ x: l.x + 14, y: l.top })),
      wires: [wireCurve(0, 34, 279, 36, 8), wireCurve(279, 36, 480, 28, 9), wireCurve(0, 40, 279, 38, 10)],
      walls: [{ x0: R0 + 4, x1: WW - 2, y: EAVE - 6 }, { x0: 2, x1: 86, y: 39 }] });
    setCarLanes(162, 175, 'br');
    configure({ roofs: [{ x0: R0, x1: WW, y: EAVE - 6 }, { x0: 0, x1: 88, y: 39 }],
      tips: [60, 140, 220, 300, 380, 460].map((x) => ({ x, y: EAVE + 1, end: RAIL_BOT })),
      lamps: LAMPS.map((l) => ({ x: l.x + 14, y: l.top })), ground0: GROUND, horizon: HORIZON });
    for (const b of BUSES) b.on = false;
    nextBus = 1;
    for (let i = 0; i < 600; i++) update(1 / 20);
  },
  update,
  render,
  debug() {
    const bays = BUSES.filter((b) => b.on);
    return `active  people x${peopleCount()}  ônibus x${bays.length} (${bays.filter((b) => b.st === 'dwell').length} na plataforma)  terminal ${operating() ? (rush() ? 'pico' : 'aberto') : 'fechado'}  pax ${Math.round(paxLevel() * 100)}%`;
  },
  // tap a bus in the bays and it honks
  tap(x, y) {
    for (const b of BUSES) {
      if (!b.on) continue;
      const ly = laneY(b);
      if (x >= b.x && x < b.x + LEN && y <= ly && y >= ly - 22) return { x: Math.round(b.x + LEN / 2), y: ly - 24, sfx: 'bus' };
    }
    return null;
  },
};
