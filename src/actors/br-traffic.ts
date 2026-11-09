/* Traffic of a town in the Paraíba Agreste. Motorcycles dominate (mototáxis in vests with a
   passenger, delivery boxes, the gas man with a botijão, scooters, trail bikes and quiet
   electric scooters with no exhaust); most riders wear a helmet, some don't. Then hatchbacks,
   sedans, SUVs and small pickups carrying botijões, melons or a wardrobe from the furniture shops;
   the odd Fusca, Veraneio or Kombi; white passenger vans; the carro de som crawling by with
   speakers on the roof; carros-pipa bringing water in the dry season; donkey carts; and Viação
   São José buses and micro-buses.
   Two lanes: the far lane drives left, the near lane right. Slower vehicles hold up the cars
   behind them; motorcycles weave past, riding beside (drawn between the lanes) while level with a
   bigger vehicle. At a zebra crossing everyone queues without overlapping (street-rules.ts).
   A scene may make its road one-way and put a traffic light at the crossing (signal-rules.ts). */
import { G, put, rect } from '../engine/gfx';
import { bay, mulberry32 } from '../engine/math';
import {
  BARK, BNEAR, CBEIGE, CBLUE, CGREEN, CNAVY, CORNG, CRED, CYELL, HAIR1, HAIR2, HALO, LEDW, LIGHT, MAG, MAGD, SKIN1, SKIN2, SKIN3, SKIN4,
  STEEL, STONE, STONEL, TILEW, VOID, WCOOL, WDIM, WOOD, AMB,
} from '../engine/palette';
import { S, hourIn } from '../sky/state';
import { PAST_LINE, type Phase, mayGo, nextCommitted, spawnDir } from './signal-rules';
import { inService, schoolRun, skinForVehicle } from '../scenes/onibus-rules';
import { besideAny, holdLimit, leadX, overlaps, queueLimit, yieldLimit } from './street-rules';

type Kind = 'moto' | 'hatch' | 'sedan' | 'suv' | 'pickup' | 'fusca' | 'veraneio' | 'kombi' | 'van' | 'som' | 'pipa' | 'carroca' | 'bus' | 'micro' | 'escolar';
type MotoKind = 'plain' | 'mototaxi' | 'delivery' | 'gas' | 'scooter' | 'trail' | 'eletrica';
type Load = 'none' | 'gas' | 'melon' | 'furniture' | 'sacks';
interface V {
  on: boolean; kind: Kind; x: number; dir: number; sp: number; cruise: number; lane: number; len: number;
  body: number; body2: number; rider: number; helmet: number; pillion: boolean; pHelmet: boolean; mk: MotoKind; load: Load; ph: number;
  skin: number; hair: number; pTop: number; pSkin: number;
  /** A motorcycle (for the queue rules), whether it rides beside a bigger vehicle, and how far it has moved aside (0..1, drawing). */
  moto: boolean; beside: boolean; sideK: number;
  /** At a traffic light: it decided to go on yellow and carries on through (signal-rules.ts). */
  committed: boolean;
}
/** No helmet: the rider's hair and face show. */
const NO_HELMET = 255;

const r = mulberry32(0xb4a1);
const pick = <T>(a: readonly T[]): T => a[(r() * a.length) | 0];
const POOL = 11;
const VS: V[] = Array.from({ length: POOL }, () => ({
  on: false, kind: 'hatch' as Kind, x: 0, dir: 1, sp: 0, cruise: 0, lane: 0, len: 26, body: TILEW, body2: TILEW, rider: CRED,
  helmet: VOID, pillion: false, pHelmet: true, mk: 'plain' as MotoKind, load: 'none' as Load, ph: 0, skin: SKIN2, hair: HAIR1, pTop: CBEIGE, pSkin: SKIN2,
  moto: false, beside: false, sideK: 0, committed: false,
}));
let laneY = [158, 172], spawnT = 0.3;

/** A zebra crossing across both lanes between world x0 and x1; `occupied` says whether a pedestrian
    is on it or about to step on. Off unless a scene sets one (setBrLanes clears it). */
export interface BrCrossing { x0: number; x1: number; occupied: () => boolean }
let crossing: BrCrossing | null = null;
/** Gap between a stop line and the stripes. */
const STOP_GAP = 3;

/** One-way road: every vehicle drives this way (+1 = left to right); 0 = two-way (the default). */
let oneWay: 1 | -1 | 0 = 0;
/** A traffic light at the crossing, for a one-way road: the phase vehicles see now. */
let signal: (() => Phase) | null = null;
/** Vehicles that drove the wrong way or crossed the stop line on red without having committed on
    yellow (both should stay 0; shown in the debug text). */
let wrongWay = 0, redRuns = 0;

export function setBrLanes(far: number, near: number) {
  laneY = [far, near]; crossing = null; oneWay = 0; signal = null; wrongWay = 0; redRuns = 0;
  for (const v of VS) v.on = false;
}
export function setBrCrossing(c: BrCrossing | null) { crossing = c; }
/** Make the road one-way (call after setBrLanes, which resets it to two-way). */
export function setBrOneWay(dir: 1 | -1) { oneWay = dir; }
/** A traffic light controlling the crossing (call after setBrCrossing and setBrOneWay). Vehicles stop
    at the crossing's stop line on red, and on yellow when they can stop in time. */
export function setBrSignal(phase: (() => Phase) | null) { signal = phase; }
export const brSignalStats = () => ({ wrongWay, redRuns });
/** Vehicles standing still (queued at a crossing or a light; debug). */
export const brQueued = () => VS.filter((v) => v.on && v.sp < 1).length;
/** Whether any vehicle's body is on the crossing or between its stop lines (a pedestrian waits for this to clear). */
export const vehicleNearCrossing = () => !!crossing && VS.some((v) => v.on && overlaps(v.x, v.len, crossing!.x0 - STOP_GAP, crossing!.x1 + STOP_GAP));
/** Whether any vehicle's body overlaps world x0..x1 (debug check). */
export const vehicleBetween = (x0: number, x1: number) => VS.some((v) => v.on && overlaps(v.x, v.len, x0, x1));

const LEN: Record<Kind, number> = { moto: 12, hatch: 26, sedan: 31, suv: 31, pickup: 31, fusca: 24, veraneio: 34, kombi: 28, van: 38, som: 27, pipa: 42, carroca: 34, bus: 66, micro: 44, escolar: 50 };
const CAR_COLORS = [TILEW, TILEW, TILEW, STONEL, STONEL, VOID, CRED, CBLUE, CNAVY, STONE, CBEIGE];

function choose(v: V) {
  const h = S.cal.hour, day = hourIn(h, 6, 18.5);
  const w: [Kind, number][] = [
    ['moto', 44], ['hatch', 18], ['sedan', 6], ['suv', 5], ['pickup', 8], ['fusca', 1.5], ['veraneio', 1.5], ['kombi', 2], ['van', 2.5],
    ['som', day ? 2.5 : 0], ['pipa', day ? (S.cal.month >= 8 || S.cal.month <= 1 ? 4 : 1.5) : 0], ['carroca', day ? 4 : 0],
    // the city buses' hours and the school runs are shared with the bus interior (scenes/onibus-rules.ts)
    ['bus', inService('saojose', S.cal.weekday, h) ? 3 : 0], ['micro', inService('micro', S.cal.weekday, h) ? 2 : 0],
    // prefeitura school buses at the start and end of each school shift on weekdays
    ['escolar', schoolRun(S.cal.weekday, h) ? 6 : 0],
  ];
  // #car=bus (or any kind) makes most spawns that kind, for previews
  const want = /car=(\w+)/.exec(location.hash)?.[1] as Kind | undefined;
  if (want && want in LEN) w.push([want, 400]);
  let t = 0; for (const [, x] of w) t += x;
  let q = r() * t; v.kind = 'hatch';
  for (const [k, x] of w) { q -= x; if (q <= 0) { v.kind = k; break; } }
  v.len = LEN[v.kind]; v.body = pick(CAR_COLORS); v.body2 = TILEW; v.pillion = false; v.load = 'none'; v.ph = r() * 6;
  v.moto = v.kind === 'moto'; v.beside = false; v.sideK = 0;
  switch (v.kind) {
    case 'moto': {
      v.mk = pick(['plain', 'plain', 'plain', 'mototaxi', 'mototaxi', 'delivery', 'gas', 'scooter', 'trail', 'eletrica'] as const);
      v.body = v.mk === 'eletrica' ? pick([TILEW, CBLUE, VOID, CRED, STONEL]) : pick([CRED, CRED, VOID, CBLUE, STONEL, TILEW, CNAVY]);
      v.rider = pick([CRED, CBLUE, VOID, CYELL, TILEW, CGREEN, STONE]);
      v.skin = pick([SKIN1, SKIN2, SKIN2, SKIN3, SKIN3, SKIN4]); v.hair = pick([HAIR1, HAIR1, HAIR2]);
      // most riders wear a helmet: mototáxi drivers always; least often on the electric scooters
      const helmetP = v.mk === 'mototaxi' ? 1 : v.mk === 'eletrica' ? 0.5 : v.mk === 'delivery' || v.mk === 'gas' ? 0.92 : 0.82;
      v.helmet = r() < helmetP ? pick([VOID, VOID, TILEW, CRED, CBLUE, CYELL]) : NO_HELMET;
      v.pillion = v.mk === 'mototaxi' || ((v.mk === 'plain' || v.mk === 'trail') && r() < 0.3) || (v.mk === 'eletrica' && r() < 0.12);
      v.pHelmet = r() < (v.mk === 'mototaxi' ? 0.75 : 0.6);
      v.pTop = pick([CBEIGE, CRED, TILEW, CBLUE]); v.pSkin = pick([SKIN1, SKIN2, SKIN3, SKIN4]);
      if (v.mk === 'mototaxi') v.rider = pick([CYELL, CORNG]);
      v.cruise = v.mk === 'eletrica' ? 30 + r() * 10 : v.mk === 'scooter' ? 42 : 52 + r() * 22; break;
    }
    case 'pickup': v.load = pick(['none', 'gas', 'melon', 'furniture', 'sacks'] as const); v.cruise = 42 + r() * 12; break;
    case 'fusca': v.body = pick([CBEIGE, CBLUE, CRED, TILEW, CGREEN, CYELL, STONEL]); v.cruise = 38 + r() * 10; break;
    case 'van': v.body = pick([TILEW, TILEW, TILEW, STONEL]); v.cruise = 44 + r() * 10; break;
    case 'veraneio': v.body = pick([CBEIGE, CGREEN, WOOD, CRED, CNAVY]); v.cruise = 36 + r() * 8; break;
    case 'kombi': v.body = pick([CBLUE, CRED, CBEIGE, CGREEN]); v.cruise = 34 + r() * 8; break;
    case 'som': v.body = pick([TILEW, CRED, CBLUE]); v.cruise = 14 + r() * 4; break;
    case 'pipa': v.body = pick([TILEW, CRED, CBLUE]); v.cruise = 30 + r() * 6; break;
    case 'carroca': v.body = pick([STONE, BARK, STONEL]); v.cruise = 11 + r() * 4; v.load = pick(['sacks', 'melon', 'none'] as const); break;
    case 'bus': v.cruise = 34 + r() * 6; break;
    case 'micro': v.cruise = 38 + r() * 6; break;
    case 'escolar': v.cruise = 32 + r() * 6; break;
    default: v.cruise = 42 + r() * 14;
  }
  v.sp = v.cruise;
}

function spawn() {
  const lane = r() < 0.5 ? 0 : 1, dir = spawnDir(lane, oneWay);
  // with a traffic light, vehicles always enter before its stop line, even when the view starts past it
  const left = signal && crossing ? Math.min(G.camX, crossing.x0 - STOP_GAP - 60) : G.camX;
  const entry = dir > 0 ? left - 70 : G.camX + G.W + 4;
  if (VS.some((o) => o.on && o.lane === lane && Math.abs(o.x - entry) < 80)) return;
  const v = VS.find((o) => !o.on);
  if (!v) return;
  choose(v);
  v.on = true; v.lane = lane; v.dir = dir; v.committed = false; v.x = dir > 0 ? left - v.len - 4 : G.camX + G.W + 4;
}

export function updateBr(dt: number, density = 1) {
  // roughly one vehicle every 2-6 s at a busy hour, a trickle late at night
  spawnT -= dt * (0.02 + 0.5 * S.traffic) * density;
  if (spawnT <= 0) { spawnT = 0.6 + r() * 1.2; spawn(); }
  const on = VS.filter((v) => v.on);
  const zc = crossing, occupied = !!zc && zc.occupied(), held: V[] = [];
  const sig = zc && signal ? signal() : null, stopping = occupied || (sig !== null && sig !== 'green');
  // a motorcycle level with a bigger vehicle in its lane rides beside it, between the lanes; one
  // coming up to a queue at an occupied crossing (or a light that is not green) stops behind instead
  // (it only stays beside if it already was)
  for (const v of on) {
    const queuing = !!zc && stopping && !v.beside && yieldLimit(leadX(v), v.dir, zc.x0 - STOP_GAP, zc.x1 + STOP_GAP, true) < Infinity;
    v.beside = besideAny(v, on, queuing ? 0 : 6);
  }
  // with a zebra crossing, vehicles are moved front-first so each sees where the one ahead stopped
  if (zc) on.sort((a, b) => leadX(b) * b.dir - leadX(a) * a.dir);
  for (const v of on) {
    // follow a slower vehicle ahead in the same lane: cars follow the bigger vehicles (they overtake
    // motorcycles, which then ride beside); motorcycles weave past those but follow other motorcycles in their row
    let sp = v.cruise;
    for (const o of on) {
      if (o === v || o.lane !== v.lane || (v.moto ? !o.moto || o.beside !== v.beside : o.moto)) continue;
      const gap = v.dir > 0 ? o.x - (v.x + v.len) : v.x - (o.x + o.len);
      if (gap > 0 && gap < 14) sp = Math.min(sp, o.sp * (gap < 6 ? 0.6 : 1));
    }
    let lim = Infinity;
    if (zc) {
      // stop before the stripes while someone is on (or stepping onto) them; queue behind anyone
      // held in the same row, a few px back, never overlapping
      lim = holdLimit(v, held, zc.x0 - STOP_GAP, zc.x1 + STOP_GAP, occupied);
      if (sig) {
        if (v.dir > 0) {
          // the traffic light (one-way road, left to right): stop at the line on red, and on yellow when it can stop in time
          const dist = zc.x0 - STOP_GAP - leadX(v), go = mayGo(sig, dist, v.sp, v.committed);
          v.committed = nextCommitted(sig, dist, go, v.committed);
          if (!go) lim = Math.min(lim, Math.max(0, dist));
        }
        // and never run into a vehicle held ahead in the same row, even when going on yellow
        lim = Math.min(lim, queueLimit(v, held));
      }
      if (lim < Infinity) { held.push(v); sp = Math.min(sp, lim * 1.5); } // ease down toward the line
    }
    if (oneWay !== 0 && v.dir !== oneWay) wrongWay++;
    const before = zc && sig ? zc.x0 - STOP_GAP - leadX(v) : 0;
    v.sideK += ((v.beside ? 1 : 0) - v.sideK) * Math.min(1, dt * 6);
    v.sp += (sp - v.sp) * Math.min(1, dt * 2);
    const move = Math.min(v.sp * dt, lim);
    if (move < v.sp * dt) v.sp = move / dt;
    v.x += v.dir * move; v.ph += v.sp * dt * 0.25;
    if (zc && sig === 'red' && v.dir > 0 && !v.committed && before >= -PAST_LINE && zc.x0 - STOP_GAP - leadX(v) < -PAST_LINE) redRuns++;
    // gone once it has driven off the side it was heading for
    if (v.dir > 0 ? v.x > G.camX + G.W + 80 : v.x < G.camX - v.len - 80) v.on = false;
  }
}

/** Big vehicles passing at x scare birds off the wires. */
export function bigVehicleNear(): number | null {
  for (const v of VS) if (v.on && (v.kind === 'bus' || v.kind === 'pipa' || v.kind === 'som' || v.kind === 'escolar')) return v.x + v.len / 2;
  return null;
}

// ---------- drawing ----------
const night = () => S.dayK < 0.55;

function wheel(x: number, y: number, rad = 2) {
  rect(x - rad, y - rad * 2 + 1, rad * 2 + 1, rad * 2, VOID); put(x, y - rad, STEEL);
}
function lights(front: number, back: number, y: number, f: number, cone = 26) {
  const n = night();
  put(front, y, n ? LEDW : STONEL); put(back, y, n ? MAG : MAGD);
  if (!n) return;
  for (let i = 1; i < cone; i++) for (let j = -2; j <= 2; j++) {
    const x = front + i * f, yy = y + j + Math.round(i * 0.12);
    if (bay(x - G.camX, yy + G.oy) < 0.3 * (1 - i / cone) * (1 - Math.abs(j) / 3)) put(x, yy, HALO);
  }
  for (let i = 1; i < 5; i++) if (bay(back - i * f, y) < 0.4 * (1 - i / 5)) put(back - i * f, y, MAGD);
}

/** A car in profile. `cab` is [start, end] of the cabin along the body (front = 1), `hood` how far the nose slopes. */
function car(x0: number, y: number, L: number, f: number, body: number, opt: { h?: number; roof?: number; cab?: [number, number]; roofC?: number; boxy?: boolean; wins?: number } = {}) {
  const h = opt.h ?? 5, roof = opt.roof ?? 4, [a, b] = opt.cab ?? [0.22, 0.7], n = night();
  const top = y - 3 - h;
  rect(x0, top, L, h, body);
  if (!opt.boxy) put(f > 0 ? x0 + L - 1 : x0, top, BNEAR); // rounded nose
  // cabin with sloped pillars
  const c0 = Math.round(x0 + L * (f > 0 ? a : 1 - b)), c1 = Math.round(x0 + L * (f > 0 ? b : 1 - a));
  const rt = top - roof;
  for (let j = 0; j < roof; j++) {
    const inset = opt.boxy ? 0 : roof - j - 1;
    rect(c0 + (f > 0 ? 0 : inset), rt + j, c1 - c0 - inset, 1, opt.roofC ?? body);
  }
  // windows
  const wins = opt.wins ?? 2, ww = (c1 - c0 - 2) / wins;
  for (let i = 0; i < wins; i++) rect(Math.round(c0 + 1 + i * ww + (i ? 1 : 0)), rt + 1, Math.max(1, Math.round(ww) - 1), roof - 1, n ? WDIM : WCOOL);
  // bumpers, wheels, lights
  rect(x0, y - 4, L, 1, STONE);
  wheel(x0 + 5, y); wheel(x0 + L - 6, y);
  lights(f > 0 ? x0 + L - 1 : x0, f > 0 ? x0 : x0 + L - 1, y - 5, f);
}

function drawMoto(v: V, y: number) {
  const f = v.dir, x0 = Math.round(v.x), n = night(), k = v.mk;
  const front = f > 0 ? x0 + 11 : x0, back = f > 0 ? x0 : x0 + 11;
  const up = k === 'trail' ? 1 : 0; // trail bikes sit taller
  wheel(x0 + 2, y, 1); wheel(x0 + 9, y, 1);
  if (k === 'scooter' || k === 'eletrica') {
    rect(x0 + 2, y - 4, 8, 2, v.body); rect(front - 2 * f, y - 7, 2, 4, v.body);
    if (k === 'scooter') put(back + 2 * f, y - 2, STEEL); // small muffler by the rear wheel
    else { rect(x0 + 4, y - 3, 4, 1, STEEL); put(x0 + 5, y - 4, n ? LEDW : CGREEN); } // battery under the deck, charge light; no exhaust
  } else {
    rect(x0 + 3, y - 5 - up, 6, 2, v.body); rect(x0 + 4, y - 6 - up, 3, 1, v.body);
    put(front - f, y - 6 - up, STEEL); put(front - f, y - 7 - up, STEEL);
    if (k === 'trail') { put(front, y - 4, v.body); put(front - f, y - 4, v.body); rect(x0 + 3, y - 4, 5, 1, STEEL); put(back + f, y - 5, STEEL); } // high fender, exhaust up the side
    else rect(x0 + 3, y - 3, 5, 1, STEEL);
  }
  const rx = x0 + 5 + (f > 0 ? 0 : 1), ry = y - up;
  rect(rx, ry - 11, 2, 6, v.rider); rect(rx + f, ry - 9, 2, 1, v.rider); put(rx + 2 * f, ry - 8, v.skin);
  rect(rx + (f > 0 ? 1 : -1), ry - 6, 2, 1, CNAVY);
  if (v.helmet !== NO_HELMET) { rect(rx, ry - 14, 3, 3, v.helmet); put(rx + (f > 0 ? 2 : 0), ry - 13, n ? STONEL : WCOOL); }
  else { rect(rx, ry - 13, 3, 2, v.skin); rect(rx, ry - 14, 3, 1, v.hair); put(rx + (f > 0 ? 0 : 2), ry - 13, v.hair); } // bare head
  if (k === 'mototaxi') { put(rx, ry - 10, VOID); put(rx + 1, ry - 9, VOID); } // vest number
  if (v.pillion) {
    const px = rx - 3 * f;
    rect(px, ry - 10, 2, 5, v.pTop);
    if (v.pHelmet) rect(px, ry - 13, 2, 3, VOID);
    else { rect(px, ry - 12, 2, 2, v.pSkin); rect(px, ry - 13, 2, 1, v.hair === HAIR1 ? HAIR2 : HAIR1); }
  }
  if (k === 'delivery') { rect(back + (f > 0 ? -1 : -3), y - 12, 5, 5, CRED); rect(back + (f > 0 ? 0 : -2), y - 11, 3, 1, TILEW); }
  if (k === 'gas') { rect(back + (f > 0 ? -1 : -2), y - 10, 4, 5, CBLUE); rect(back + (f > 0 ? 0 : -1), y - 11, 2, 1, STEEL); }
  put(front, y - 6, n ? LEDW : STONEL); put(back, y - 5, n ? MAG : MAGD);
  if (n) for (let i = 1; i < 18; i++) for (let j = -1; j <= 1; j++) { const x = front + i * f, yy = y - 5 + j + Math.round(i * 0.15); if (bay(x - G.camX, yy + G.oy) < 0.28 * (1 - i / 18)) put(x, yy, HALO); }
}

function drawPickup(v: V, y: number) {
  const f = v.dir, x0 = Math.round(v.x), L = v.len;
  car(x0, y, L, f, v.body, { cab: [0.5, 0.78], wins: 1 });
  const bx0 = f > 0 ? x0 + 1 : x0 + Math.round(L * 0.5), bw = Math.round(L * 0.48) - 2, top = y - 8;
  rect(bx0, top - 1, bw, 1, v.body); // bed rail
  if (v.load === 'gas') for (let i = 0; i < 3; i++) { rect(bx0 + 1 + i * 4, top - 5, 3, 4, CBLUE); put(bx0 + 2 + i * 4, top - 6, STEEL); }
  if (v.load === 'melon') for (let i = 0; i < 4; i++) { rect(bx0 + 1 + i * 3, top - 3 - (i % 2), 3, 2, CGREEN); }
  if (v.load === 'furniture') { rect(bx0 + 1, top - 12, 9, 11, WOOD); rect(bx0 + 5, top - 11, 1, 9, BARK); put(bx0 + 4, top - 7, AMB); put(bx0 + 6, top - 7, AMB); rect(bx0 + 1, top - 6, 9, 1, CYELL); }
  if (v.load === 'sacks') for (let i = 0; i < 3; i++) rect(bx0 + 1 + i * 4, top - 4, 4, 3, CBEIGE);
}

function drawVeraneio(v: V, y: number) {
  const f = v.dir, x0 = Math.round(v.x), L = v.len;
  car(x0, y, L, f, v.body, { h: 6, roof: 5, cab: [0.08, 0.78], roofC: TILEW, boxy: true, wins: 3 });
  rect(x0, y - 6, L, 1, STONEL); // chrome strip
  put(f > 0 ? x0 + L - 1 : x0, y - 7, night() ? LEDW : TILEW); // round headlamp
}

/** Fusca: round fenders and a domed cabin, round headlamp. */
function drawFusca(v: V, y: number) {
  const f = v.dir, x0 = Math.round(v.x), L = v.len, n = night();
  rect(x0 + 1, y - 8, L - 2, 5, v.body); rect(x0, y - 6, L, 2, v.body);
  const c0 = x0 + 5, c1 = x0 + L - 5, w = c1 - c0;
  rect(c0 + 2, y - 13, w - 4, 1, v.body); rect(c0 + 1, y - 12, w - 2, 1, v.body); rect(c0, y - 11, w, 3, v.body);
  const half = (w >> 1) - 2;
  rect(c0 + 2, y - 11, half, 2, n ? WDIM : WCOOL); rect(c0 + 3 + half, y - 11, half, 2, n ? WDIM : WCOOL);
  rect(x0, y - 4, L, 1, STONE);
  wheel(x0 + 5, y); wheel(x0 + L - 6, y);
  put(f > 0 ? x0 + L - 2 : x0 + 1, y - 8, n ? LEDW : TILEW); // round headlamp on the fender
  lights(f > 0 ? x0 + L - 1 : x0, f > 0 ? x0 : x0 + L - 1, y - 5, f);
}

/** White passenger van (transporte alternativo): tall box, short sloped nose, a row of windows. */
function drawVan(v: V, y: number) {
  const f = v.dir, x0 = Math.round(v.x), L = v.len, n = night(), top = y - 18;
  const box0 = f > 0 ? x0 : x0 + 6, bw = L - 6, nose = f > 0 ? x0 + L - 6 : x0;
  rect(box0, top, bw, 15, v.body); rect(nose, top + 7, 6, 8, v.body);
  for (let j = 0; j < 6; j++) rect(f > 0 ? nose + j : nose + 5 - j, top + 1 + j, 1, 6 - j, v.body); // windscreen slope
  rect(f > 0 ? box0 + bw - 3 : box0, top + 2, 3, 5, n ? WDIM : WCOOL); // windscreen
  for (let wx = box0 + (f > 0 ? 3 : 5); wx < box0 + bw - 8; wx += 7) rect(wx, top + 2, 5, 4, n ? WDIM : WCOOL);
  rect(x0, top + 9, L, 1, STONEL);
  rect(x0, y - 4, L, 1, STONE);
  wheel(x0 + 6, y); wheel(x0 + L - 7, y);
  lights(f > 0 ? x0 + L - 1 : x0, f > 0 ? x0 : x0 + L - 1, y - 6, f);
}

function drawKombi(v: V, y: number) {
  const f = v.dir, x0 = Math.round(v.x), L = v.len, n = night();
  const top = y - 15;
  rect(x0, top + 6, L, 7, v.body); rect(x0, top, L, 7, TILEW);
  for (let i = 0; i < 4; i++) rect(x0 + 3 + i * 6, top + 1, 4, 4, n ? WDIM : WCOOL);
  const nose = f > 0 ? x0 + L - 3 : x0; rect(nose, top + 6, 3, 2, TILEW); // V on the front
  put(f > 0 ? x0 + L - 1 : x0, top, BNEAR);
  wheel(x0 + 5, y); wheel(x0 + L - 6, y);
  lights(f > 0 ? x0 + L - 1 : x0, f > 0 ? x0 : x0 + L - 1, y - 6, f);
}

function drawSom(v: V, y: number) {
  const f = v.dir, x0 = Math.round(v.x), L = v.len, t = S.ms / 1000;
  car(x0, y, L, f, v.body, { cab: [0.22, 0.68] });
  // speaker boxes on a roof rack, and the sound rolling out
  rect(x0 + 6, y - 18, L - 12, 1, STEEL);
  for (let i = 0; i < 3; i++) { rect(x0 + 6 + i * 5, y - 23, 4, 5, VOID); put(x0 + 7 + i * 5, y - 21, STEEL); }
  for (let k = 0; k < 3; k++) {
    const rad = 4 + (((t * 14) + k * 6) % 18);
    for (let a = -0.7; a <= 0.7; a += 0.18) put(x0 + L / 2 + Math.sin(a) * rad * f * 1.4, y - 22 - Math.cos(a) * rad * 0.5, rad < 14 ? STONEL : STONE);
  }
}

function drawPipa(v: V, y: number) {
  const f = v.dir, x0 = Math.round(v.x), L = v.len, n = night();
  const cab = f > 0 ? x0 + L - 11 : x0;
  rect(cab, y - 14, 11, 10, v.body); rect(cab + (f > 0 ? 5 : 1), y - 13, 5, 4, n ? WDIM : WCOOL);
  const t0 = f > 0 ? x0 : x0 + 12, tw = L - 13;
  rect(t0, y - 15, tw, 9, CBLUE); rect(t0 + 1, y - 16, tw - 2, 1, CBLUE); rect(t0, y - 7, tw, 1, STEEL);
  drawText4('AGUA', t0 + (tw >> 1) - 7, y - 14, TILEW);
  rect(x0, y - 5, L, 1, STONE);
  wheel(x0 + 5, y); wheel(x0 + 12, y); wheel(x0 + L - 6, y);
  lights(f > 0 ? x0 + L - 1 : x0, f > 0 ? x0 : x0 + L - 1, y - 6, f);
}

/** Tiny 3x5 text for vehicle signs (only the letters these signs need). */
const G4: Record<string, string> = {
  A: '010101111101101', G: '011100101101011', U: '101101101101111', S: '011100010001110', O: '010101101101010', J: '001001001101010',
  E: '111100110100111', L: '100100100100111', P: '110101110100100', R: '110101110101101', N: '110101101101101', C: '011100100100011', M: '101111111101101',
  I: '111010010010111', D: '110101101101110', ' ': '000000000000000',
};
function drawText4(s: string, x: number, y: number, c: number) {
  for (const ch of s) { const g = G4[ch] ?? G4[' ']; for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (g[j * 3 + i] === '1') put(x + i, y + j, c); x += 4; }
}

/** Donkey (jumento) pulling a two-wheeled cart, driver in a leather hat. */
function drawCarroca(v: V, y: number) {
  const f = v.dir, x0 = Math.round(v.x), step = Math.sin(v.ph * 2.5);
  const dx = f > 0 ? x0 + 20 : x0, cx = f > 0 ? x0 : x0 + 14; // donkey ahead, cart behind
  // donkey
  rect(dx, y - 9, 9, 4, v.body); rect(dx + (f > 0 ? 8 : -2), y - 12, 3, 4, v.body); // body, neck+head
  put(dx + (f > 0 ? 9 : -1), y - 14, v.body); put(dx + (f > 0 ? 10 : -2), y - 14, v.body); // long ears
  put(dx + (f > 0 ? 10 : -2), y - 9, CBEIGE); // muzzle
  for (const [lx, ph] of [[1, 1], [3, -1], [6, 1], [8, -1]]) { const o = Math.round(step * ph); rect(dx + lx + o, y - 5, 1, 5, v.body); }
  put(dx + (f > 0 ? -1 : 9), y - 8, BARK); // tail
  // shafts + cart
  for (let i = 0; i < 8; i++) put(f > 0 ? dx - 8 + i : dx + 9 + i, y - 8, WOOD);
  rect(cx, y - 11, 14, 5, WOOD); rect(cx, y - 11, 14, 1, BARK);
  for (let a = 0; a < 16; a++) { const t = (a / 16) * Math.PI * 2; put(cx + 7 + Math.cos(t) * 4, y - 4 + Math.sin(t) * 4, BARK); }
  put(cx + 7 + Math.cos(v.ph) * 3, y - 4 + Math.sin(v.ph) * 3, WOOD);
  if (v.load === 'sacks') for (let i = 0; i < 3; i++) rect(cx + 1 + i * 4, y - 14, 4, 3, CBEIGE);
  if (v.load === 'melon') for (let i = 0; i < 4; i++) rect(cx + 1 + i * 3, y - 13 - (i % 2), 3, 2, CGREEN);
  // driver with chapéu de couro
  const px = cx + (f > 0 ? 11 : 1);
  rect(px, y - 18, 3, 7, CBEIGE); rect(px, y - 21, 3, 3, SKIN3); rect(px - 1, y - 22, 5, 1, WOOD); rect(px, y - 23, 3, 1, WOOD);
}

/** Viação São José buses and micro-buses, painted after the company's own photo of car 0853 on
    empresasaojosetransporte.com.br: yellow body and roof, a dark window band, green low at the
    front sweeping up toward the rear, a yellow "S" mark on the green and "São José" in green on the
    yellow. No destination text: none is legible in a source we could check, so there is no
    roof board and the top of the windscreen stays blank. */
function drawBus(v: V, y: number, micro: boolean) {
  const f = v.dir, x0 = Math.round(v.x), L = v.len, n = night(), H = micro ? 15 : 18, top = y - H - 3;
  rect(x0, top, L, H, CYELL);
  // dark window band, windows lit at night
  const wh = micro ? 5 : 6;
  rect(x0 + 1, top + 1, L - 2, wh, VOID);
  for (let wx = x0 + 3; wx < x0 + L - 9; wx += 7) rect(wx, top + 2, 5, wh - 2, n ? LIGHT : WDIM);
  // green sweep: full height below the windows at the front, rising to a thin band at the rear
  const g0 = top + wh + 2, bot = y - 4;
  for (let i = 0; i < L; i++) {
    const u = f > 0 ? (L - 1 - i) / (L - 1) : i / (L - 1); // 0 at the nose, 1 at the tail
    const gb = Math.round(bot - (bot - g0 - 1) * Math.min(1, Math.max(0, (u - 0.2) / 0.4)));
    rect(x0 + i, g0, 1, gb - g0 + 1, CGREEN);
  }
  const wsx = f > 0 ? x0 + L - 7 : x0 + 1;
  rect(wsx, top + 1, 6, 1, VOID); rect(wsx, top + 2, 6, H - 8, n ? WCOOL : WDIM); // windscreen, blank top
  const door = f > 0 ? x0 + L - 14 : x0 + 9;
  rect(door, top + 3, 4, H - 4, BNEAR);
  drawText4('S', f > 0 ? door - 4 : door + 5, micro ? g0 : g0 + 1, CYELL); // the company's S mark behind the door
  if (!micro) drawText4('SAO JOSE', f > 0 ? x0 + 2 : x0 + L - 33, bot - 5, CGREEN); // on the yellow near the tail
  wheel(x0 + 8, y, 3); wheel(x0 + L - 10, y, 3);
  lights(f > 0 ? x0 + L - 1 : x0, f > 0 ? x0 : x0 + L - 1, y - 6, f, 30);
}

/** Prefeitura school bus: yellow, black band with ESCOLAR, kids at the windows. */
function drawEscolar(v: V, y: number) {
  const f = v.dir, x0 = Math.round(v.x), L = v.len, n = night(), H = 16, top = y - H - 3;
  rect(x0, top, L, H, CYELL); rect(x0, top + H - 9, L, 7, VOID);
  drawText4('ESCOLAR', x0 + (L >> 1) - 14, top + H - 8, CYELL);
  for (let wx = x0 + 3; wx < x0 + L - 9; wx += 6) { rect(wx, top + 1, 4, 5, n ? LIGHT : WDIM); if (((wx + (S.ms / 900 | 0)) % 3) === 0) rect(wx + 1, top + 3, 2, 3, SKIN2); }
  const wsx = f > 0 ? x0 + L - 7 : x0 + 1; rect(wsx, top + 2, 6, H - 9, n ? WCOOL : WDIM);
  rect(x0, y - 5, L, 2, VOID);
  wheel(x0 + 8, y, 3); wheel(x0 + L - 10, y, 3);
  lights(f > 0 ? x0 + L - 1 : x0, f > 0 ? x0 : x0 + L - 1, y - 6, f, 28);
}

/** How far a motorcycle riding beside moves toward the other lane: into the gap between the lanes. */
const besideOffset = (v: V) => Math.round(v.sideK * (laneY[1] - laneY[0]) * 0.45) * (v.lane === 0 ? 1 : -1);

function drawV(v: V) {
  const y = laneY[v.lane] + (v.moto ? besideOffset(v) : 0), x0 = Math.round(v.x), f = v.dir;
  switch (v.kind) {
    case 'moto': drawMoto(v, y); break;
    case 'hatch': car(x0, y, v.len, f, v.body, { cab: [0.15, 0.72] }); break;
    case 'sedan': car(x0, y, v.len, f, v.body, { cab: [0.25, 0.66] }); break;
    case 'suv': car(x0, y, v.len, f, v.body, { h: 6, roof: 5, cab: [0.12, 0.72], boxy: true, wins: 3 }); rect(x0 + 6, y - 15, v.len - 12, 1, STEEL); break;
    case 'pickup': drawPickup(v, y); break;
    case 'fusca': drawFusca(v, y); break;
    case 'veraneio': drawVeraneio(v, y); break;
    case 'kombi': drawKombi(v, y); break;
    case 'van': drawVan(v, y); break;
    case 'som': drawSom(v, y); break;
    case 'pipa': drawPipa(v, y); break;
    case 'carroca': drawCarroca(v, y); break;
    case 'bus': drawBus(v, y, false); break;
    case 'micro': drawBus(v, y, true); break;
    case 'escolar': drawEscolar(v, y); break;
  }
}

const HORN: Record<Kind, 'moto' | 'car' | 'kombi' | 'bus' | 'truck' | 'bray' | 'som'> = {
  moto: 'moto', hatch: 'car', sedan: 'car', suv: 'car', pickup: 'car', fusca: 'kombi', veraneio: 'kombi', kombi: 'kombi', van: 'car', som: 'som',
  pipa: 'truck', carroca: 'bray', bus: 'bus', micro: 'bus', escolar: 'bus',
};
const TALL: Record<Kind, number> = { moto: 15, hatch: 13, sedan: 13, suv: 15, pickup: 14, fusca: 13, veraneio: 15, kombi: 16, van: 18, som: 24, pipa: 17, carroca: 24, bus: 22, micro: 19, escolar: 24 };
/** A tapped vehicle: which horn to play, where to show the reaction, and the bus to board if it is one. */
export function tapBr(x: number, y: number) {
  for (const v of VS) {
    if (!v.on) continue;
    const gy = laneY[v.lane];
    if (x >= v.x - 2 && x <= v.x + v.len + 2 && y >= gy - TALL[v.kind] && y <= gy + 2) return { sound: HORN[v.kind], x: v.x + v.len / 2, y: gy - TALL[v.kind], board: skinForVehicle(v.kind) };
  }
  return null;
}

/** Far lane, then the motorcycles riding beside (between the lanes), then the near lane. */
export function drawBr() {
  const aside = (v: V) => v.moto && v.sideK > 0.05;
  for (const v of VS) if (v.on && v.lane === 0 && !aside(v)) drawV(v);
  for (const v of VS) if (v.on && v.lane === 0 && aside(v)) drawV(v);
  for (const v of VS) if (v.on && v.lane === 1 && aside(v)) drawV(v);
  for (const v of VS) if (v.on && v.lane === 1 && !aside(v)) drawV(v);
}

/** Vehicles on screen (debug panel): `-` marks a rider without a helmet, `^` one riding beside. */
export const brTrafficDebug = () => VS.filter((v) => v.on)
  .map((v) => (v.moto ? `${v.mk}${v.helmet === NO_HELMET ? '-' : ''}${v.beside ? '^' : ''}` : v.kind)).join(',');
