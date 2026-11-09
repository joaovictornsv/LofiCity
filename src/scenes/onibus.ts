/* ÔNIBUS: riding a city bus, seen from an aisle seat across to the far wall. Through the side windows
   the city scrolls past (Campina Grande's high-rises, the market streets of Esperança and Remígio,
   João Pessoa's seafront, Areia's colonial houses); inside, a row of seats along the wall, yellow or
   chrome poles, the handrail with its straps, the turnstile at the front, and the passengers: seated
   along the wall, and at the rush hours standing in the aisle, some looking out of the window, some
   facing us.

   Reached by tapping a bus in a street scene (that bus's interior: São José, micro-ônibus, the
   prefeitura school bus, or the STTP bus at Campina's terminal); "Sair do ônibus" goes back. In
   Campina Grande it is also one of the city's scenes. Drawn from Creative Commons photos of Brazilian
   city-bus interiors (credits in docs/DEVELOPING.md); the street outside is generic for each city.

   The real clock and the real weather: the sky in the windows is the city's sky, rain (only a genuine
   reading) runs down the glass and mists it, street lamps and lit windows pass at night. The cabin
   lights itself (grade()): daylight by day, warm lamps at night, dimmed in the garage outside service.
   Schedules, loads and the stop cycle are art direction, see onibus-rules.ts. */
import { L, Lp, WW, WY0, blitLayer, newLayer, put, rect, type Layer } from '../engine/gfx';
import { bay, hashf, mulberry32, type Rng } from '../engine/math';
import {
  AMB, AMBD, BARK, BFAR, BMID, BNEAR, CBEIGE, CBLUE, CGREEN, CHURCH, CHURCHD, CHURCHL, CNAVY, CORNG, CRED, CYAN, CYAND, CYELL,
  FARB, FBLUE, FGREEN, FLILAC, FOG, FORNG, FPINK, FWG, GOLD, HAIR1, HAIR2, HAIR3, HALO, LEAF1, LEAF2, LEAFG, LEAFGD, LIGHT, MAG, MAGD,
  MANTO, MOMIJI, PAL32, PETAL, RAIN, RAINB, SAKURA, SAKURAD, SIGR, SKIN1, SKIN2, SKIN3, SKIN4, SNOW, SNOWS, STEEL, STONE, STONEL,
  TERRA, TILEW, UMB, VOID, WDIM, WOOD, WWARM,
} from '../engine/palette';
import { setupAnimals } from '../actors/animals';
import { setBrLanes } from '../actors/br-traffic';
import { setCarLanes } from '../actors/cars';
import { S } from '../sky/state';
import { drawSky } from './common';
import {
  type BusCity, type BusSkin, CYCLE_S, LANDSCAPE, type Landscape, SEATS, defaultSkin, distance, drive, inService, load, riders, seating,
} from './onibus-rules';
import type { Scene } from './types';

// ---------- geometry (world space) ----------
/** Far wall: the window band, the floor line under the seats, the ceiling edge. Near (aisle): the floor
    at the bottom of the frame and the handrail. */
const CEIL = 12, WTOP = 25, SILL = 92, FLOOR = 150, RAILY = 18;
/** Cruising speed of the street right outside (px per second); far layers move slower. */
const SPEED = 26;

// ---------- the cabin's own colours (grade() overwrites these indices only) ----------
const P = {
  PANEL: SNOW, PANELD: SNOWS, LAMP: FWG, WALL: PETAL, WALLD: SAKURAD, FLOOR: UMB, FLOORD: CORNG,
  SEAT: MAG, SEATD: MAGD, SEATL: SAKURA, POLE: GOLD, POLEL: MOMIJI, POLED: AMBD, RAIL: CYAND, CAT: MANTO, SCREEN: CYAN,
};
const SHIRTS = [AMB, WOOD, LEAF1, LEAF2, CNAVY, CYELL], PANTS = [HAIR3, STEEL], SKINS = [SKIN1, SKIN2, SKIN3, SKIN4], HAIRS = [HAIR1, HAIR2];
const UNIFORM = TILEW, SHORTS = CNAVY;

const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
interface Look { name: string; panel: string; paneld: string; wall: string; walld: string; floor: string; floord: string; seat: string; seatd: string; seatl: string; pole: string; polel: string; poled: string; cat: string | null }
const CHROME = { pole: '#c8ccd0', polel: '#f0f2f4', poled: '#8a8e92' };
const YELLOW = { pole: '#f2c230', polel: '#ffe27a', poled: '#b88a10' };
const LOOKS: Record<BusSkin, Look> = {
  sttp: { name: 'Ônibus · STTP', panel: '#d4d7d0', paneld: '#a9ada6', wall: '#bfc3bb', walld: '#9a9e96', floor: '#45484b', floord: '#383b3e', seat: '#2f5fb0', seatd: '#23488a', seatl: '#f2c230', ...YELLOW, cat: '#b8302a' },
  saojose: { name: 'Ônibus · São José', panel: '#e8e2c8', paneld: '#bdb79e', wall: '#cfc7a4', walld: '#a9a184', floor: '#4a4436', floord: '#3c372b', seat: '#2d7a48', seatd: '#205a34', seatl: '#e8d070', ...CHROME, cat: '#2d6a3e' },
  micro: { name: 'Micro-ônibus', panel: '#d8d4cc', paneld: '#aca8a0', wall: '#b8b0a4', walld: '#948c80', floor: '#3e3a38', floord: '#312e2c', seat: '#8a2a2a', seatd: '#661e1e', seatl: '#c8a0a0', ...CHROME, cat: '#555a60' },
  escolar: { name: 'Ônibus escolar', panel: '#e6e0cc', paneld: '#bab4a0', wall: '#d8c890', walld: '#b0a270', floor: '#3a3a3a', floord: '#2e2e2e', seat: '#5a3a26', seatd: '#43291a', seatl: '#7a5236', ...CHROME, cat: null },
};
const PEOPLE: [number, string][] = [
  [AMB, '#d94a3a'], [WOOD, '#3a6fd9'], [LEAF1, '#2d8a4e'], [LEAF2, '#7a3fa0'], [CNAVY, '#24406a'], [CYELL, '#e8b830'],
  [HAIR3, '#2a3550'], [STEEL, '#5a4a3a'], [SKIN1, '#f1c9a5'], [SKIN2, '#d9a27a'], [SKIN3, '#a8714a'], [SKIN4, '#6e4630'],
  [HAIR1, '#1c1a20'], [HAIR2, '#5a3826'], [TILEW, '#f2f2ee'],
];

// ---------- who is on board, which bus ----------
let skin: BusSkin = 'sttp';
let from: string | null = null, pending: { skin: BusSkin; from: string } | null = null;
/** Board a bus tapped in another scene (call before switching to this scene). */
export function boardBus(s: BusSkin, fromScene: string) { pending = { skin: s, from: fromScene }; }
/** The scene to go back to when getting off, if the bus was boarded from one. */
export const busReturn = () => from;

const city = () => S.city.id as BusCity;
const running = () => inService(skin, S.cal.weekday, S.cal.hour);

// ---------- static cabin layers, per bus ----------
interface Cabin { room: Layer; front: Layer; wins: [number, number][]; seatX: number[]; door: [number, number] | null }
const cabins = new Map<BusSkin, Cabin>();

function buildCabin(s: BusSkin): Cabin {
  const look = LOOKS[s], micro = s === 'micro', room = newLayer(), front = newLayer();
  const n = micro ? 3 : 4, x0 = 10, x1 = micro ? 356 : 470, gap = 12, w = Math.floor((x1 - x0 - (n - 1) * gap) / n);
  const wins: [number, number][] = Array.from({ length: n }, (_, i) => [x0 + i * (w + gap), x0 + i * (w + gap) + w]);
  const door: [number, number] | null = micro ? [372, 452] : null;
  // ceiling: panels whose seams spread out towards the camera, lamp strips, vents, a roof hatch
  L(room, 0, WY0, WW, 180 - WY0, P.PANEL);
  for (const y of [8, 2, -8, -22, -42, -70, -110, -165, -240]) L(room, 0, y, WW, 1, P.PANELD);
  L(room, 0, CEIL - 3, WW, 3, P.LAMP); L(room, 0, CEIL, WW, 1, P.PANELD);
  L(room, 0, -58, WW, 5, P.LAMP); L(room, 0, -53, WW, 1, P.PANELD);
  L(room, 0, -190, WW, 8, P.LAMP); L(room, 0, -182, WW, 1, P.PANELD);
  for (let x = 30; x < WW; x += 96) { L(room, x, -34, 34, 6, P.PANELD); for (let i = 2; i < 34; i += 3) Lp(room, x + i, -32, P.PANEL); }
  L(room, 208, -128, 64, 30, P.PANELD); L(room, 211, -125, 58, 24, P.PANEL); L(room, 214, -122, 52, 2, P.PANELD);
  // ad cards above each window (blank: no invented text)
  wins.forEach(([a, b], i) => { const c = i % 2 ? CYELL : AMB, m = (a + b) >> 1; L(room, m - 18, 14, 36, 9, c); L(room, m - 15, 16, 20, 1, P.PANEL); L(room, m - 15, 19, 14, 1, P.PANEL); });
  // windows: holes in the layer framed in black rubber, with the sliding top pane
  for (const [a, b] of wins) {
    L(room, a - 2, WTOP - 2, b - a + 4, SILL - WTOP + 4, VOID);
    L(room, a, WTOP, b - a, SILL - WTOP, 255);
    L(room, a, WTOP + 16, b - a, 2, VOID); L(room, ((a + b) >> 1) - 1, WTOP, 2, 16, VOID);
  }
  // the micro's rear door: two glazed leaves
  if (door) {
    const [a, b] = door, m = (a + b) >> 1;
    L(room, a - 2, WTOP - 4, b - a + 4, FLOOR - WTOP + 4, VOID);
    for (const [l, r] of [[a, m - 1], [m + 1, b]]) { L(room, l, WTOP - 2, r - l, FLOOR - WTOP + 1, P.PANELD); L(room, l + 3, WTOP + 1, r - l - 6, 54, 255); L(room, l + 3, WTOP + 60, r - l - 6, 30, 255); }
  }
  // stop buttons on the pillars
  for (let i = 1; i < wins.length; i++) { const x = wins[i][0] - 8; L(room, x, 64, 5, 7, P.POLE); L(room, x + 1, 66, 3, 3, SIGR); }
  // lower wall, sill, kick strip, floor
  const wallR = door ? door[0] - 2 : WW;
  L(room, 0, SILL + 2, wallR, 4, P.WALLD); L(room, 0, SILL + 6, wallR, FLOOR - SILL - 6, P.WALL); L(room, 0, FLOOR - 6, wallR, 6, P.WALLD);
  if (door) L(room, door[1] + 2, SILL + 2, WW - door[1] - 2, FLOOR - SILL - 2, P.WALL);
  L(room, 0, FLOOR, WW, 180 - FLOOR, P.FLOOR);
  for (let y = FLOOR + 2; y < 180; y += 3) L(room, 0, y, WW, 1, P.FLOORD);
  // seats along the far wall, facing the front of the bus (right)
  const nSeats = SEATS[s], pitch = 50, seatX = Array.from({ length: nSeats }, (_, i) => 16 + i * pitch);
  for (const x of seatX) {
    if (s === 'escolar') {
      L(room, x, 76, 8, 48, P.SEAT); L(room, x, 76, 8, 2, P.SEATL); L(room, x + 7, 78, 1, 46, P.SEATD);
    } else {
      L(room, x - 1, 80, 9, 4, P.POLE); L(room, x + 1, 81, 5, 2, P.WALL);
      L(room, x, 84, 7, 38, P.SEAT); L(room, x + 6, 84, 1, 38, P.SEATD);
      for (let j = 0; j < 9; j++) Lp(room, x + 1 + ((j * 3) % 5), 87 + j * 4, j % 2 ? P.SEATL : P.SEATD);
    }
    L(room, x, 118, 31, 6, P.SEAT); L(room, x, 118, 31, 1, P.SEATL); L(room, x, 123, 31, 1, P.SEATD);
    L(room, x + 14, 124, 3, 24, P.RAIL); L(room, x + 8, 147, 16, 2, P.RAIL);
  }
  // near: the handrail with straps, the poles, the turnstile at the front
  // the other side's handrail, right overhead: closer, so bigger straps
  L(front, 0, -44, WW, 3, P.RAIL); L(front, 0, -41, WW, 1, P.PANELD);
  for (let x = 30; x < WW; x += 60) { L(front, x, -41, 2, 9, VOID); L(front, x - 4, -32, 10, 9, P.POLE); L(front, x - 2, -30, 6, 5, 255); }
  L(front, 0, RAILY, WW, 2, P.RAIL); L(front, 0, RAILY + 2, WW, 1, P.PANELD);
  for (let x = 14; x < WW; x += 30) { L(front, x, RAILY + 3, 1, 5, VOID); L(front, x - 2, RAILY + 8, 5, 5, P.POLE); L(front, x - 1, RAILY + 9, 3, 3, 255); }
  for (const x of micro ? [104, 238] : [104, 228, 352]) {
    L(front, x, RAILY, 4, 180 - RAILY, P.POLE); L(front, x, RAILY, 1, 180 - RAILY, P.POLEL); L(front, x + 3, RAILY, 1, 180 - RAILY, P.POLED);
    L(front, x - 1, 94, 6, 9, P.POLE); L(front, x, 96, 4, 4, SIGR);
  }
  if (look.cat) {
    L(front, 440, 100, 38, 80, P.CAT); L(front, 440, 100, 38, 2, P.POLEL); L(front, 444, 106, 22, 12, VOID); L(front, 446, 108, 9, 4, P.SCREEN);
    L(front, 408, 122, 32, 3, P.RAIL); L(front, 412, 133, 28, 3, P.RAIL); L(front, 474, 102, 2, 78, P.SEATD);
  }
  return { room, front, wins, seatX, door };
}
const cabin = () => { let c = cabins.get(skin); if (!c) { c = buildCabin(skin); cabins.set(skin, c); } return c; };

// ---------- the street outside ----------
const night = () => S.dayK < 0.45;
const hn = (k: number, salt: number) => mulberry32((Math.imul(k, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca6b)) >>> 0);
const pick = <T>(r: Rng, a: readonly T[]): T => a[(r() * a.length) | 0];
const FACADES = [FPINK, FBLUE, FGREEN, FORNG, FLILAC, CBEIGE, CHURCHL];

/** Draws a repeating band of segments s px wide, scrolled by off. */
function band(off: number, s: number, salt: number, fn: (x: number, r: Rng, k: number) => void) {
  for (let k = Math.floor(off / s) - 1; k <= Math.floor((off + WW) / s) + 1; k++) fn(Math.round(k * s - off), hn(k, salt), k);
}
function lit(x: number, y: number, w: number, h: number, r: Rng, on: number) {
  rect(x, y, w, h, night() && r() < on ? WWARM : WDIM);
}
function tower(x: number, top: number, base: number, w: number, r: Rng, body: number, on = 0.4) {
  rect(x, top, w, base - top, body);
  for (let y = top + 3; y < base - 3; y += 5) for (let i = x + 2; i < x + w - 3; i += 4) lit(i, y, 2, 3, r, on);
  rect(x, top, w, 1, body === FARB ? FARB : BNEAR);
}
function house(x: number, top: number, base: number, w: number, r: Rng) {
  rect(x, top, w, base - top, pick(r, FACADES));
  for (let i = 0; i < 4; i++) rect(x - 2 + i, top - 4 + i, w + 4 - 2 * i, 1, TERRA);
  rect(x + 6, top + 7, 13, 10, night() && r() < 0.6 ? WWARM : WDIM); for (let i = x + 7; i < x + 19; i += 3) rect(i, top + 7, 1, 10, VOID);
  rect(x + w - 20, top + 9, 13, base - top - 9, pick(r, [STONE, CBLUE, CRED, BNEAR]));
}
function shop(x: number, top: number, base: number, w: number, r: Rng) {
  rect(x, top, w, base - top, pick(r, FACADES));
  rect(x, top, w, 6, pick(r, [CRED, CBLUE, CGREEN])); for (let i = x + 3; i < x + w - 3; i += 5) rect(i, top + 2, 3, 2, STONEL); // sign (no lettering)
  const aw = pick(r, [CRED, CBLUE, CGREEN, FORNG]);
  for (let i = 0; i < w; i += 4) { rect(x + i, top + 8, 2, 4, aw); rect(x + i + 2, top + 8, 2, 4, STONEL); }
  rect(x + 4, top + 13, w - 8, base - top - 13, night() && S.cal.hour < 21 ? WWARM : VOID);
  for (let i = 0; i < 4; i++) rect(x + 7 + i * 10, base - 8, 6, 5, pick(r, [FORNG, CGREEN, CRED, CYELL]));
}
function stall(x: number, base: number, r: Rng) {
  const aw = pick(r, [CRED, CBLUE, FORNG, FPINK]);
  for (let i = 0; i < 26; i += 4) { rect(x + i, base - 22, 2, 4, aw); rect(x + i + 2, base - 22, 2, 4, STONEL); }
  rect(x + 1, base - 18, 1, 18, BARK); rect(x + 24, base - 18, 1, 18, BARK); rect(x, base - 9, 26, 3, BARK);
  for (let i = 0; i < 6; i++) rect(x + 2 + i * 4, base - 12, 3, 3, pick(r, [FORNG, CGREEN, CRED, CYELL]));
}
function church(x: number, base: number) {
  rect(x, base - 52, 16, 52, CHURCH); rect(x + 3, base - 62, 10, 10, CHURCH); rect(x + 7, base - 70, 2, 8, CHURCHD); rect(x + 5, base - 67, 6, 2, CHURCHD);
  rect(x + 16, base - 32, 30, 32, CHURCHL); rect(x + 27, base - 15, 9, 15, CHURCHD); rect(x + 5, base - 44, 6, 8, night() ? WWARM : CHURCHD);
}
function palm(x: number, base: number) {
  for (let y = base - 42; y < base; y++) rect(x + Math.round(Math.sin(y * 0.05) * 2), y, 3, 1, BARK);
  for (const [dx, dy] of [[-13, 5], [-9, -1], [0, -5], [9, -1], [13, 5], [-15, 9], [15, 9]]) for (let i = 0; i < 9; i++) rect(x + 1 + (dx * i) / 9, base - 42 + (dy * i) / 9 + (i * i) / 9, 2, 2, LEAFGD);
}
function sobrado(x: number, top: number, base: number, w: number, r: Rng) {
  rect(x, top, w, base - top, pick(r, FACADES)); rect(x, top, w, 3, STONEL); rect(x - 2, top - 3, w + 4, 3, TERRA);
  const sh = pick(r, [CBLUE, CGREEN, CRED]);
  for (const fy of [top + 6, top + 26]) for (let i = 0; i < 3; i++) { const wx = x + 5 + i * 17; rect(wx, fy, 9, 14, night() && r() < 0.5 ? WWARM : VOID); rect(wx - 2, fy, 2, 14, sh); rect(wx + 9, fy, 2, 14, sh); }
}
function hills(off: number, base: number, amp: number, c: number) {
  for (let x = 0; x < WW; x++) { const u = (x + off) * 0.02; rect(x, base - amp * (0.6 + 0.25 * Math.sin(u) + 0.15 * Math.sin(u * 2.3 + 1)), 1, amp, c); }
}

function far(kind: Landscape, d: number) {
  const o = d * SPEED * 0.12, base = SILL - 8;
  if (kind === 'towers') band(o, 26, 1, (x, r) => { if (r() < 0.85) tower(x, base - 28 - ((r() * 34) | 0), base, 14 + ((r() * 10) | 0), r, FARB, 0.3); });
  else if (kind === 'market') { hills(o, base, 22, LEAFGD); band(o, 180, 1, (x, r, k) => { if (k % 3 === 0) church(x + 60, base + 2); else if (r() < 0.5) house(x + 20, base - 14, base, 40, r); }); }
  else if (kind === 'coast') {
    rect(0, base - 22, WW, 18, CBLUE); rect(0, base - 22, WW, 1, STONEL);
    for (let y = base - 19; y < base - 4; y += 4) for (let x = 0; x < WW; x++) if (bay(x + Math.round(o * 2), y) < 0.08) put(x, y, STONEL);
  } else hills(o, base, 46, LEAFG), hills(o * 1.6 + 300, base, 28, LEAFGD);
}
function mid(kind: Landscape, d: number) {
  const o = d * SPEED, base = SILL - 4;
  if (kind === 'towers') band(o, 56, 2, (x, r) => { if (r() < 0.45) tower(x + 3, base - 50 - ((r() * 20) | 0), base, 48, r, pick(r, [BFAR, BMID, CBEIGE]), 0.55); else house(x + 3, base - 30 - ((r() * 8) | 0), base, 50, r); });
  else if (kind === 'market') band(o, 58, 2, (x, r) => { const k = r(); if (k < 0.45) shop(x + 1, base - 36, base, 56, r); else if (k < 0.72) { stall(x + 2, base, r); stall(x + 30, base, r); } else house(x + 2, base - 28, base, 54, r); });
  else if (kind === 'coast') { rect(0, base - 8, WW, 8, CBEIGE); band(o, 64, 2, (x, r) => { const k = r(); if (k < 0.5) palm(x + 30, base); else if (k < 0.7) { rect(x + 10, base - 18, 34, 14, pick(r, FACADES)); rect(x + 6, base - 22, 42, 4, TERRA); } }); }
  else band(o, 60, 2, (x, r, k) => { if (k % 7 === 3) church(x + 6, base); else sobrado(x + 1, base - 46, base, 58, r); });
}
function near(kind: Landscape, d: number) {
  const o = d * SPEED * 2.4;
  band(o, 160, 3, (x, r) => {
    if (kind === 'coast') palm(x + 80, SILL);
    else if (r() < 0.5) {
      const tx = x + 80; rect(tx, SILL - 34, 4, 34, BARK);
      for (let i = 0; i < 46; i++) { const a = r() * 6.28, q = r() * 18; rect(tx + 2 + Math.cos(a) * q * 1.5 - 3, SILL - 48 + Math.sin(a) * q * 0.8 - 3, 6, 6, r() < 0.5 ? LEAFG : LEAFGD); }
    }
    rect(x, WTOP - 4, 4, SILL - WTOP + 4, STONE); rect(x + 4, WTOP - 4, 1, SILL - WTOP + 4, STONEL); rect(x - 6, WTOP + 4, 16, 2, STONE);
    if (S.lampOn) {
      rect(x + 4, WTOP + 8, 8, 2, STONE); rect(x + 10, WTOP + 10, 3, 2, LIGHT);
      for (let y = WTOP + 11; y < WTOP + 32; y++) for (let i = x - 4; i < x + 26; i++) if (bay(i, y) < 0.18 - (y - WTOP - 11) * 0.008) put(i, y, HALO);
    }
    for (const wy of [WTOP + 2, WTOP + 7, WTOP + 12]) for (let i = 0; i < 160; i++) put(x + i, wy + Math.round(Math.sin((i / 160) * Math.PI) * 5), VOID);
  });
  rect(0, SILL - 4, WW, 4, STONEL);
}
function garage() {
  rect(0, WTOP - 4, WW, SILL - WTOP + 8, WDIM);
  for (let x = 0; x < WW; x += 44) rect(x, WTOP - 4, 2, SILL - WTOP + 8, BNEAR);
  rect(0, WTOP + 20, WW, SILL - WTOP - 20, STONEL); rect(0, SILL - 18, WW, 4, CBLUE); rect(0, SILL - 14, WW, 2, CGREEN);
  for (let x = 6; x < WW; x += 40) rect(x, WTOP + 24, 32, 18, VOID);
  rect(232, WTOP - 2, 10, 3, LIGHT);
  for (let y = WTOP + 1; y < WTOP + 24; y++) for (let x = 210; x < 266; x++) if (bay(x, y) < 0.16 - (y - WTOP) * 0.006) put(x, y, HALO);
}
/** Rain on the glass (only a real reading sets S.rain): drops slide down when standing, streak back while driving; mist low on the panes. */
function glassRain(wins: [number, number][], t: number, speed: number) {
  if (S.rain < 0.02) return;
  const n = Math.round(6 + S.rain * 40);
  wins.forEach(([a, b], w) => {
    const h = SILL - WTOP;
    for (let i = 0; i < n; i++) {
      const u = hashf(w * 977 + i * 13), v = hashf(w * 131 + i * 7 + 5), fall = 4 + 10 * hashf(i * 31 + w);
      const y = WTOP + ((v * h + t * (fall + speed * 18)) % h), x = a + ((u * (b - a) - t * speed * 30) % (b - a) + (b - a)) % (b - a);
      put(x, y, RAINB);
      for (let k = 1; k <= (speed > 0.3 ? 3 : 1); k++) put(x + (speed > 0.3 ? k : 0), y - k, RAIN);
    }
    for (let y = SILL - 12; y < SILL; y++) for (let x = a; x < b; x++) if (bay(x, y) < S.rain * 0.3 * ((y - SILL + 12) / 12)) put(x, y, FOG);
  });
}

// ---------- passengers ----------
interface Box { x: number; y: number; w: number; h: number; hx: number; hy: number; kid: boolean }
let boxes: Box[] = [];

function seated(x: number, seed: number, kid: boolean) {
  const r = mulberry32(seed), sk = pick(r, SKINS), hr = pick(r, HAIRS), sh = kid ? UNIFORM : pick(r, SHIRTS), pa = kid ? SHORTS : pick(r, PANTS);
  const d = kid ? 12 : 0, leg = kid ? 18 : 22;
  rect(x + 6, 116, leg + 4, 7, pa);                                 // thighs
  rect(x + leg + 6, 122, 5, kid ? 16 : 26, kid ? sk : pa);           // shins
  rect(x + leg + 6, kid ? 137 : 147, 9, 3, VOID);                    // shoes
  rect(x + 5, 88 + d, 13, 32 - d, sh);
  rect(x + 11, 94 + d, 5, 16 - d / 2, sh); rect(x + 15, 108 + d / 2, 7, 4, sk); // arm resting on the lap
  if (kid) rect(x + 2, 94 + d, 5, 14, pick(r, [CRED, CBLUE, CYELL]));   // backpack
  const hy = 70 + d;
  rect(x + 6, hy, 12, 16, sk); rect(x + 5, hy - 2, 13, 5, hr); rect(x + 5, hy, 4, 10, hr);
  put(x + 15, hy + 7, VOID); put(x + 18, hy + 9, sk);
  boxes.push({ x: x + 2, y: hy - 2, w: 30, h: 150 - hy, hx: x + 12, hy: hy - 3, kid });
}
function standing(x: number, seed: number, t: number, moving: boolean) {
  const r = mulberry32(seed), sk = pick(r, SKINS), hr = pick(r, HAIRS), sh = pick(r, SHIRTS), pa = pick(r, PANTS);
  const face = r() < 0.5 ? 'window' : 'us', sw = moving ? Math.round(Math.sin(t * 1.3 + seed)) : 0, X = x + sw;
  rect(x + 6, 120, 8, 56, pa); rect(x + 17, 120, 8, 56, pa); rect(x + 13, 120, 4, 6, pa);
  rect(x + 4, 175, 11, 4, VOID); rect(x + 16, 175, 11, 4, VOID);
  rect(X + 3, 64, 25, 58, sh); rect(X + 1, 60, 29, 6, sh);                    // torso and shoulders
  if (face === 'window') {
    // seen from behind, both hands on the rail, looking out
    rect(X + 2, RAILY + 2, 4, 60, sh); rect(X + 25, RAILY + 2, 4, 60, sh); rect(X + 2, RAILY - 1, 4, 4, sk); rect(X + 25, RAILY - 1, 4, 4, sk);
    rect(X + 9, 56, 13, 5, sk); rect(X + 8, 36, 15, 22, hr);
    if (r() < 0.6) { const bag = pick(r, [VOID, CBLUE, CRED]); rect(X + 7, 66, 17, 30, bag); rect(X + 8, 61, 2, 6, bag); rect(X + 21, 61, 2, 6, bag); }
  } else {
    // facing us: one hand on the rail, the other down (sometimes holding a phone)
    rect(X + 25, RAILY + 2, 4, 60, sh); rect(X + 25, RAILY - 1, 4, 4, sk);
    rect(X - 1, 62, 4, 36, sh); rect(X - 1, 97, 4, 5, sk);
    if (r() < 0.4) rect(X - 3, 92, 5, 9, VOID);
    rect(X + 12, 56, 7, 5, sk); rect(X + 8, 38, 15, 20, sk);
    rect(X + 7, 34, 17, 6, hr); rect(X + 7, 38, 2, 9, hr); rect(X + 22, 38, 2, 9, hr);
    rect(X + 11, 46, 2, 2, VOID); rect(X + 18, 46, 2, 2, VOID); rect(X + 14, 53, 3, 1, HAIR2);
  }
  boxes.push({ x: x - 3, y: 32, w: 36, h: 146, hx: X + 15, hy: 30, kid: false });
}

// seats keep their rider between stops: a rider's looks come from the stop where they got on
const boardedAt = new Map<string, number>();
function riderSeed(seat: number, stop: number, seats: number, n: number, seed: number) {
  const key = `${skin}:${seat}:${stop}`, hit = boardedAt.get(key);
  if (hit !== undefined) return hit;
  let s = stop;
  for (let k = 0; k < 30 && seating(seed, s - 1, seats, n).includes(seat); k++) s--;
  const v = (Math.imul(seat + 1, 0x27d4eb2d) ^ Math.imul(s, 0x165667b1) ^ seed) >>> 0;
  if (boardedAt.size > 400) boardedAt.clear();
  boardedAt.set(key, v);
  return v;
}

// ---------- the cabin light ----------
let light = { k: 1, warm: 0 };
function grade() {
  const L0 = LOOKS[skin], on = running(), dayK = S.dayK;
  light = on ? { k: 0.7 + 0.3 * dayK - 0.1 * S.cloud * dayK, warm: 1 - dayK } : { k: 0.3, warm: 0.2 };
  const set = (i: number, h: string) => {
    const c = hex(h), k = light.k, w = light.warm;
    const r = Math.min(255, c[0] * k + 14 * w) | 0, g = Math.min(255, c[1] * k + 6 * w) | 0, b = Math.max(0, Math.min(255, c[2] * k - 8 * w)) | 0;
    PAL32[i] = (255 << 24) | (b << 16) | (g << 8) | r;
  };
  const rail = '#c8ccd0';
  for (const [i, h] of [
    [P.PANEL, L0.panel], [P.PANELD, L0.paneld], [P.WALL, L0.wall], [P.WALLD, L0.walld], [P.FLOOR, L0.floor], [P.FLOORD, L0.floord],
    [P.SEAT, L0.seat], [P.SEATD, L0.seatd], [P.SEATL, L0.seatl], [P.POLE, L0.pole], [P.POLEL, L0.polel], [P.POLED, L0.poled],
    [P.RAIL, rail], [P.CAT, L0.cat ?? '#555a60'], ...PEOPLE,
  ] as [number, string][]) set(i, h);
  // lamp strips and the validator's screen are light sources
  const lamp = on ? (dayK > 0.6 ? '#eef0ea' : '#fff3cf') : '#4a4840';
  for (const [i, h] of [[P.LAMP, lamp], [P.SCREEN, on ? '#5ad07a' : '#1a3a22']] as const) { const c = hex(h); PAL32[i] = (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]; }
}

// ---------- scene ----------
let state = { stop: 0, atStop: false, speed: 0, seated: 0, standing: 0, load: 0 };
function render() {
  const c = cabin(), t = S.ms / 1000, on = running(), kind = LANDSCAPE[city()];
  const dv = on ? drive(t) : { speed: 0, stop: 0, atStop: true };
  // who is on board is fixed at the last stop: the counts come from the hour the bus stood there
  const stopHour = S.cal.hour - (t - dv.stop * CYCLE_S) / 3600;
  const n = on ? riders(skin, S.cal.weekday, stopHour) : { seated: 0, standing: 0 };
  state = { stop: dv.stop, atStop: dv.atStop, speed: dv.speed, ...n, load: load(skin, S.cal.weekday, S.cal.hour) };
  drawSky(SILL);
  if (on) { const d = distance(t); far(kind, d); mid(kind, d); near(kind, d); } else garage();
  glassRain(c.wins, t, dv.speed);
  blitLayer(c.room);
  boxes = [];
  const seed = (S.cal.day * 31 + S.cal.month * 373) | 0, seats = SEATS[skin];
  for (const i of seating(seed, dv.stop, seats, n.seated)) seated(c.seatX[i], riderSeed(i, dv.stop, seats, n.seated, seed), skin === 'escolar');
  const spots = [30, 140, 262, 380];
  for (let j = 0; j < n.standing; j++) standing(spots[j], (Math.imul(dv.stop + 1, 0x9e3779b1) ^ (j * 7919) ^ seed) >>> 0, t, dv.speed > 0);
  blitLayer(c.front);
}

export const onibus: Scene = {
  id: 'onibus',
  get name() { return LOOKS[skin].name; },
  build() {
    if (pending) { skin = pending.skin; from = pending.from; pending = null; }
    else {
      // #bus=micro (or sttp, saojose, escolar) opens that bus directly, for previews; like #car=, never in a shared link
      const want = /bus=(\w+)/.exec(location.hash)?.[1] as BusSkin | undefined;
      skin = want && want in LOOKS ? want : defaultSkin(city()); from = null;
    }
    setupAnimals({ ground: [], dogs: 0 });
    setCarLanes(-1000, -1000, 'br'); setBrLanes(-1000, -1000); // no street traffic left over to tap inside the bus
    boxes = [];
  },
  update() { /* a function of the clock: see render() */ },
  render,
  grade,
  seesSky: true,
  debug() {
    const s = state;
    return `ônibus  ${skin}  ${running() ? (s.atStop ? 'parado no ponto' : `rodando ${Math.round(s.speed * 100)}%`) : 'recolhido'}  parada ${s.stop}  sentados ${s.seated}  em pé ${s.standing}  carga ${Math.round(s.load * 100)}%  luz ${light.k.toFixed(2)}`;
  },
  hint() { return { x: 240, y: 40, text: 'Toque em SAIR DO ÔNIBUS pra descer' }; },
  tap(x, y) {
    for (let i = boxes.length - 1; i >= 0; i--) {
      const b = boxes[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return { x: b.hx, y: b.hy, speaker: { role: b.kid ? 'pupil' : 'rider' } };
    }
    return null;
  },
};
