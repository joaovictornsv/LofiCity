/* Traffic. Tokyo: taxis with roof signs, kei cars, sedans, kei trucks and buses.
   Esperança: motorcycles and mototáxis, hatchbacks, small pickups and the odd bus.
   Two lanes (far lane leftbound, near lane rightbound); headlights and tail lights at night. */
import { G, put, rect } from '../engine/gfx';
import { bay, mulberry32 } from '../engine/math';
import { CBLUE, CGREEN, CNAVY, CRED, CYELL, HALO, LIGHT, MAG, MAGD, STEEL, VOID, WCOOL, WDIM, WHITE, CBEIGE, SNOW } from '../engine/palette';
import { S } from '../sky/state';
import { drawBr, setBrLanes, tapBr, updateBr } from './br-traffic';
import type { BusSkin } from '../scenes/onibus-rules';

type CarKind = 'taxi' | 'kei' | 'sedan' | 'truck' | 'bus' | 'moto';
interface Car { on: boolean; x: number; dir: number; sp: number; lane: number; kind: CarKind; body: number; len: number; rider: number; pillion: boolean }

const r = mulberry32(0xca75);
const POOL = 6;
const C: Car[] = Array.from({ length: POOL }, () => ({ on: false, x: 0, dir: 1, sp: 0, lane: 0, kind: 'sedan', body: WHITE, len: 30, rider: CRED, pillion: false }));
let laneY = [158, 172], style: 'jp' | 'br' = 'jp';
let spawnT = 3;

export function setCarLanes(far: number, near: number, s: 'jp' | 'br' = 'jp') {
  laneY = [far, near]; style = s; for (const c of C) c.on = false;
  if (s === 'br') setBrLanes(far, near); // Esperança has its own traffic (br-traffic.ts)
}

function pickBr(c: Car) {
  const k = r(), h = S.cal.hour;
  // hatchbacks share the compact-car shape ('kei'), small pickups the kei-truck one
  c.kind = k < 0.5 ? 'moto' : k < 0.8 ? 'kei' : k < 0.95 || h < 6 || h > 22 ? 'truck' : 'bus';
  c.len = c.kind === 'moto' ? 12 : c.kind === 'bus' ? 56 : c.kind === 'truck' ? 32 : 28;
  c.body = c.kind === 'moto' ? [CRED, VOID, CBLUE, STEEL, WHITE][(r() * 5) | 0] : c.kind === 'bus' ? WHITE
    : [WHITE, WHITE, STEEL, STEEL, CRED, VOID, CBLUE, CBEIGE][(r() * 8) | 0];
  c.rider = [CRED, CBLUE, VOID, CYELL, WHITE, CGREEN][(r() * 6) | 0]; c.pillion = r() < 0.3;
}

function spawn() {
  const lane = r() < 0.5 ? 0 : 1, dir = lane === 0 ? -1 : 1;
  for (const c of C) {
    if (c.on || C.some((o) => o.on && o.lane === lane && Math.abs((dir > 0 ? G.camX - o.x : o.x - G.camX - G.W)) < 60)) continue;
    if (style === 'br') { pickBr(c); c.on = true; c.lane = lane; c.dir = dir; c.sp = (c.kind === 'moto' ? 55 : c.kind === 'bus' ? 34 : 45) + r() * 22; c.x = dir > 0 ? G.camX - c.len - 4 : G.camX + G.W + 4; return; }
    const k = r(), h = S.cal.hour;
    c.kind = k < (h >= 20 || h < 5 ? 0.45 : 0.25) ? 'taxi' : k < 0.5 ? 'kei' : k < 0.75 ? 'sedan' : k < 0.9 ? 'truck' : 'bus';
    if (c.kind === 'bus' && (h < 6 || h > 23)) c.kind = 'taxi';
    c.len = c.kind === 'bus' ? 56 : c.kind === 'kei' ? 24 : c.kind === 'truck' ? 28 : 32;
    c.body = c.kind === 'taxi' ? [CYELL, CGREEN, VOID, CNAVY][(r() * 4) | 0] : c.kind === 'kei' || c.kind === 'truck' ? (r() < 0.7 ? WHITE : CBEIGE)
      : c.kind === 'bus' ? WHITE : [WHITE, STEEL, CRED, CBLUE, VOID, CNAVY][(r() * 6) | 0];
    c.on = true; c.lane = lane; c.dir = dir; c.sp = (c.kind === 'bus' ? 38 : 50) + r() * 25;
    c.x = dir > 0 ? G.camX - c.len - 4 : G.camX + G.W + 4;
    return;
  }
}

export function updateCars(dt: number, density = 1) {
  if (style === 'br') { updateBr(dt, density); return; }
  spawnT -= dt * (0.02 + 0.12 * S.busy) * density * (1 - 0.5 * S.snowCover);
  if (spawnT <= 0) { spawnT = 0.4 + r(); spawn(); }
  for (const c of C) {
    if (!c.on) continue;
    c.x += c.dir * c.sp * dt * (1 - 0.35 * S.snowCover);
    if (c.x < G.camX - c.len - 40 || c.x > G.camX + G.W + 40) c.on = false;
  }
}

/** Motorcycle side view: two wheels, tank, rider with helmet; headlight cone at night. */
function drawMoto(c: Car) {
  const y = laneY[c.lane], f = c.dir, x0 = Math.round(c.x), night = S.dayK < 0.55;
  const front = f > 0 ? x0 + 11 : x0, back = f > 0 ? x0 : x0 + 11;
  for (const wx of [x0 + 1, x0 + 8]) { rect(wx, y - 3, 3, 3, VOID); put(wx + 1, y - 2, STEEL); }
  rect(x0 + 2, y - 5, 8, 2, c.body); rect(x0 + 3, y - 4, 6, 1, STEEL);
  put(front - f, y - 6, STEEL); put(front - f, y - 7, STEEL);
  const rx = x0 + (f > 0 ? 5 : 5);
  rect(rx, y - 10, 2, 5, c.rider); rect(rx + f, y - 8, 2, 1, c.rider);
  rect(rx, y - 13, 3, 3, VOID); put(rx + (f > 0 ? 2 : 0), y - 12, WDIM);
  if (c.pillion) { const px = rx - 3 * f; rect(px, y - 9, 2, 4, CBEIGE); rect(px, y - 12, 2, 3, CNAVY); }
  put(front, y - 6, night ? WHITE : CBEIGE); put(back, y - 5, night ? MAG : MAGD);
  if (night) for (let i = 1; i < 18; i++) for (let j = -1; j <= 1; j++) {
    const x = front + i * f, yy = y - 5 + j + Math.round(i * 0.15);
    if (bay(x - G.camX, yy + G.oy) < 0.3 * (1 - i / 18)) put(x, yy, HALO);
  }
}

function drawCar(c: Car) {
  if (c.kind === 'moto') { drawMoto(c); return; }
  const y = laneY[c.lane], f = c.dir, x0 = Math.round(c.x), L = c.len, night = S.dayK < 0.55;
  const front = f > 0 ? x0 + L - 1 : x0, back = f > 0 ? x0 : x0 + L - 1;
  const H = c.kind === 'bus' ? 16 : c.kind === 'truck' ? 9 : 10;
  const bodyTop = y - H;
  // body
  rect(x0, bodyTop + (c.kind === 'bus' ? 0 : 4), L, H - (c.kind === 'bus' ? 2 : 6), c.body);
  if (c.kind === 'bus') {
    for (let wx = x0 + 3; wx < x0 + L - 5; wx += 6) rect(wx, bodyTop + 3, 4, 5, night ? LIGHT : WDIM);
    rect(x0, bodyTop + 10, L, 1, CGREEN);
  } else if (c.kind === 'truck') {
    const cab = f > 0 ? x0 + L - 11 : x0;
    rect(cab, bodyTop, 11, 6, c.body); rect(cab + (f > 0 ? 5 : 1), bodyTop + 1, 5, 3, night ? WDIM : WCOOL);
    rect(f > 0 ? x0 : x0 + 11, bodyTop + 3, L - 11, 1, STEEL);
  } else {
    // cabin
    const cx0 = x0 + (c.kind === 'kei' ? 3 : 7), cw = L - (c.kind === 'kei' ? 6 : 14);
    rect(cx0, bodyTop, cw, 4, c.body);
    rect(cx0 + 1, bodyTop + 1, cw - 2, 3, night ? WDIM : WCOOL);
    put(cx0 + (cw >> 1), bodyTop + 1, c.body); put(cx0 + (cw >> 1), bodyTop + 2, c.body);
    if (c.kind === 'taxi') {
      rect(cx0 + (cw >> 1) - 2, bodyTop - 2, 4, 2, night ? LIGHT : CBEIGE);
      rect(x0, bodyTop + 6, L, 1, c.body === CYELL ? CRED : CYELL);
    }
  }
  if (S.snowCover > 0.3 && S.snow > 0.02) rect(x0 + 6, bodyTop - (c.kind === 'taxi' ? 3 : 1), L - 12, 1, SNOW);
  // wheels
  for (const wx of [x0 + 5, x0 + L - 7]) { rect(wx, y - 3, 3, 3, VOID); put(wx + 1, y - 2, STEEL); }
  // lights
  put(front, y - 5, night ? WHITE : CBEIGE); put(back, y - 5, night ? MAG : MAGD);
  if (night) {
    for (let i = 1; i < 26; i++) for (let j = -2; j <= 2; j++) {
      const x = front + i * f, yy = y - 4 + j + Math.round(i * 0.12);
      if (bay(x - G.camX, yy + G.oy) < 0.32 * (1 - i / 26) * (1 - Math.abs(j) / 3)) put(x, yy, HALO);
    }
    for (let i = 1; i < 5; i++) if (bay(back - i * f, y - 5) < 0.4 * (1 - i / 5)) put(back - i * f, y - 5, MAGD);
  }
}

/** A tapped car or bus (either city's traffic). */
export function tapCars(x: number, y: number): { sound: 'moto' | 'car' | 'kombi' | 'bus' | 'truck' | 'bray' | 'som'; x: number; y: number; board?: BusSkin | null } | null {
  if (style === 'br') return tapBr(x, y);
  for (const c of C) {
    if (!c.on) continue;
    const gy = laneY[c.lane], h = c.kind === 'bus' ? 18 : 12;
    if (x >= c.x - 2 && x <= c.x + c.len + 2 && y >= gy - h && y <= gy + 2) return { sound: c.kind === 'bus' ? 'bus' : c.kind === 'kei' ? 'kombi' : 'car', x: c.x + c.len / 2, y: gy - h };
  }
  return null;
}

export function drawCars() {
  if (style === 'br') { drawBr(); return; }
  for (const c of C) if (c.on && c.lane === 0) drawCar(c);
  for (const c of C) if (c.on && c.lane === 1) drawCar(c);
}
