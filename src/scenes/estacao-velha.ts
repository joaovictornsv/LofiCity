/* ESTAÇÃO VELHA (Campina Grande, PB), drawn from Street View captures of R. Benjamin Constant (Dec
   2024) and Wikimedia Commons photos, used as reference only; none of the images are in the repo.
   The old Great Western of Brazil Railway station of 1907, now the Museu do Algodão, seen across the
   curving street: yellow walls with white quoins and a rough stone socle, the two-storey central
   block with its gable (the "GWBR" lettering), one-storey wings under a long terracotta roof on
   wooden brackets, arched and square doors and brown shuttered windows, and the gabled end with the
   raised "CAMPINA GRANDE" plaque. In front an iron railing on a low stone wall, steps and a ramp; to
   the right the gravel yard, a big castanhola and a concrete pole with its LED arm and wires, and
   beyond it the old steam locomotive under its little tiled pavilion. Campina's towers rise behind.

   Only the plaque and "GWBR" are lettered. The museum's opening hours are art direction, not its
   real timetable: Tuesday to Friday 8-17h, Saturday and Sunday 9-16h, closed on Mondays. */
import { L, Lp, WW, blitLayer, newLayer, put, rect } from '../engine/gfx';
import { bay, mulberry32 } from '../engine/math';
import {
  ASPH, BARK, BFAR, BMID, BNEAR, CBEIGE, CHURCH, CHURCHD, CRED, CYELL, LEAFG, LEAFGD, LIGHT, STEEL, STONE, STONEL, TERRA,
  TILEW, VOID, WDIM, WOOD, WWARM,
} from '../engine/palette';
import { configure, drawFarPrecip, drawNearPrecip, drawRipples, precip } from '../fx/precip';
import { drawFireworks, drawLightning } from '../fx/sky-events';
import { drawAnimalsGround, drawAnimalsPerched, drawAnimalsSky, setupAnimals, updateAnimals } from '../actors/animals';
import { drawPeople, peopleCount, setLanes, tickSpawns, updatePeople } from '../actors/people';
import { drawCars, setCarLanes, updateCars } from '../actors/cars';
import { S, hourIn } from '../sky/state';
import { drawFog, drawSky, drawStreet, type Street } from './common';
import {
  type Lamp, type TowerWin, bandeirolas, christmasStar, drawTowerWins, isNight, lampLight, lantern, pole, text, textW, tower, wire, wireCurve,
} from './br-kit';
import type { Scene } from './types';

const HORIZON = 112, STREET = 147, SH = 180 - STREET, GROUND = 128, WALL = 132, WALK = 140;
const wr = mulberry32(0x1907);
const far = newLayer(), mid = newLayer(), front = newLayer();
const street: Street = { y0: STREET, base: new Uint8Array(SH * WW), pud: new Uint8Array(SH * WW), jit: precip.jit };
const towers: TowerWin[] = [];

/** A door or window of the station: shuttered/closed in the layer, opened each frame when the museum is. */
interface Hole { x: number; y: number; w: number; h: number; arch: boolean; door: boolean; rank: number }
const holes: Hole[] = [];

const LW0 = 34, C0 = 150, C1 = 212, RW1 = 252, E0 = 252, E1 = 316; // left wing, centre block, right wing, gabled end
const ROOF0 = 84, EAVE = 95; // the long front roof
const POLE = 334;
const LAMP: Lamp = { x: POLE + 1, top: 62, ground: WALK, arms: 1 };

// ---------- building pieces ----------
/** White quoins: alternating long and short blocks. */
function quoins(x: number, y0: number, y1: number, w = 4) {
  for (let y = y0; y < y1; y += 3) { const long = ((y - y0) / 3) % 2 === 0; L(mid, long ? x : x + (x < 240 ? 0 : 1), y, long ? w : w - 1, 3, TILEW); L(mid, x, y + 2, w, 1, STONEL); }
}

/** Rough stone socle: irregular blocks of grey and brown with dark mortar. */
function socle(x0: number, x1: number, y0: number) {
  for (let y = y0; y < GROUND; y++) for (let x = x0; x < x1; x++) {
    const bx = Math.floor((x + ((y >> 2) % 2) * 3) / 6), by = y >> 2, n = (bx * 7 + by * 13) % 5;
    const edge = (x + ((y >> 2) % 2) * 3) % 6 === 0 || y % 4 === 0;
    Lp(mid, x, y, edge ? BMID : n === 0 ? WOOD : n < 3 ? STONE : STONEL);
  }
  L(mid, x0, y0 - 1, x1 - x0, 1, STONEL);
}

/** Opening with a white surround, brown shutters (windows) or plank doors; `arch` rounds the top. */
function opening(x: number, y: number, w: number, h: number, arch: boolean, door: boolean) {
  const r = w >> 1;
  for (let j = -2; j < h + 1; j++) for (let i = -2; i < w + 2; i++) {
    const yy = y + j;
    if (arch && j < r) { const d = Math.hypot(i - (w - 1) / 2, j - r); if (d > r + 2) continue; if (d > r) { Lp(mid, x + i, yy, TILEW); continue; } }
    if (i < 0 || i >= w || j < 0) { Lp(mid, x + i, yy, TILEW); continue; }
    const c = door ? (i === 0 || i === w - 1 || i === (w >> 1) ? BARK : WOOD) : j % 2 ? BARK : WOOD;
    Lp(mid, x + i, yy, c);
  }
  if (!door) L(mid, x - 2, y + h, w + 4, 1, STONEL); // sill
  holes.push({ x, y, w, h, arch, door, rank: wr() });
}

/** A gable: yellow tympanum, white cornice at the base and terracotta eaves overhanging the slopes. */
function gable(x0: number, x1: number, base: number, h: number) {
  const cx = (x0 + x1) / 2, half = (x1 - x0) / 2;
  for (let j = 0; j < h; j++) { const w = half * (1 - j / h); L(mid, Math.round(cx - w), base - j, Math.round(w * 2), 1, CHURCH); }
  L(mid, x0 - 1, base, x1 - x0 + 2, 2, TILEW);
  for (let i = -3; i <= half + 2; i++) {
    const y = Math.round(base - h + (i * h) / half);
    for (const s of [-1, 1]) { const x = Math.round(cx + s * i); Lp(mid, x, y - 1, TERRA); Lp(mid, x, y, TERRA); Lp(mid, x, y + 1, CRED); }
  }
}

/** The long front roof: terracotta courses seen from below the ridge, a dark eave and wooden brackets. */
function frontRoof(x0: number, x1: number, y0: number, y1: number) {
  for (let y = y0; y < y1; y++) for (let x = x0 - (y - y0 >> 2); x < x1 + (y - y0 >> 2); x++) {
    const course = (y - y0) % 3 === 0, joint = (x + ((y - y0) / 3 | 0) * 2) % 5 === 0;
    Lp(mid, x, y, course ? CRED : joint ? CHURCHD : TERRA);
  }
  const ex0 = x0 - ((y1 - y0) >> 2), ex1 = x1 + ((y1 - y0) >> 2);
  L(mid, ex0, y1, ex1 - ex0, 1, BARK); L(mid, ex0, y1 + 1, ex1 - ex0, 1, WOOD);
  for (let x = ex0 + 4; x < ex1 - 2; x += 13) for (let i = 0; i < 4; i++) { Lp(mid, x + i, y1 + 2 + i, WOOD); Lp(mid, x, y1 + 2 + i, WOOD); } // brackets
}

function buildFar() {
  // Campina's towers behind the station and the yard
  const spec: [number, number, number, number, number | null][] = [
    [-4, 24, 58, STONEL, null], [22, 18, 74, CBEIGE, null], [96, 20, 66, TILEW, null], [232, 16, 52, STONEL, null],
    [336, 22, 70, TILEW, CRED], [378, 18, 80, STONEL, null], [440, 26, 60, CBEIGE, null], [462, 18, 46, TILEW, null],
  ];
  for (const [x, w, top, c, band] of spec) tower(far, x, w, top, GROUND - 6, c, band, wr, towers);
  for (let x = -4; x < WW;) { const w = 10 + ((wr() * 18) | 0), top = 104 + ((wr() * 10) | 0); L(far, x, top, w, GROUND - top, BFAR); x += w + 2; }
  // a silo and low sheds across the yard, like the ones beyond the railway land
  L(far, 404, 92, 10, 26, STONEL); L(far, 404, 91, 10, 1, STONE); L(far, 416, 96, 8, 22, STONEL);
}

/** Broad-leaf castanhola: flat, spreading tiers of foliage on horizontal limbs (seeded, static). */
function castanhola(ly: Uint8Array, cx: number, ground: number, s: number, seed: number) {
  const tr = mulberry32(seed), top = ground - Math.round(66 * s);
  L(ly, cx - 2, ground - Math.round(42 * s), 4, Math.round(42 * s), BARK); L(ly, cx - 1, ground - Math.round(42 * s), 1, Math.round(42 * s), WOOD);
  const tiers: [number, number, number][] = [[top + 4 * s, 18 * s, 4], [top + 14 * s, 30 * s, 5], [top + 24 * s, 40 * s, 5], [top + 34 * s, 46 * s, 5]];
  tiers.forEach(([y0, half, th], k) => {
    const off = (tr() - 0.5) * 8 * s;
    for (let i = 0; i < half; i++) for (const sg of [-1, 1]) Lp(ly, Math.round(cx + sg * i * 0.9), Math.round(y0 + th + 1 + i * 0.12), BARK); // the limb
    for (let n = 0; n < 9 + k * 3; n++) {
      const bx = cx + off + (tr() * 2 - 1) * half, by = y0 + tr() * th, rx = 4 + tr() * 6 * s, ry = 2 + tr() * 2.5 * s;
      for (let y = Math.floor(by - ry); y <= by + ry; y++) for (let x = Math.floor(bx - rx); x <= bx + rx; x++) {
        const d = ((x - bx) / rx) ** 2 + ((y - by) / ry) ** 2;
        if (d > 1 || (d > 0.65 && bay(x, y) < 0.5)) continue;
        Lp(ly, x, y, y > by + ry * 0.3 ? LEAFGD : bay(x, y) < 0.15 ? LEAFGD : LEAFG);
      }
    }
  });
}

function buildStation() {
  // left wing and the stretch under the long roof: yellow wall, socle, openings
  L(mid, LW0, EAVE, RW1 - LW0, GROUND - EAVE, CHURCH);
  socle(LW0, RW1, 118);
  quoins(LW0, EAVE + 2, 118);
  for (const x of [46, 72, 98, 124]) opening(x, 102, 7, 16, false, x === 72);
  // the central block: arched doorway between white pilasters
  quoins(C0 - 2, EAVE + 2, 118, 5); quoins(C1 - 3, EAVE + 2, 118, 5);
  opening(173, 100, 14, 28, true, true);
  for (const x of [160, 194]) opening(x, 104, 7, 14, false, false);
  for (const x of [222, 240]) opening(x, 102, 7, 26, false, true);
  // the upper storey of the central block, its gable with GWBR and a roundel
  L(mid, C0, 54, C1 - C0, ROOF0 - 54, CHURCH);
  quoins(C0, 56, ROOF0); quoins(C1 - 4, 56, ROOF0);
  L(mid, C0, 74, C1 - C0, 1, CHURCHD); // a string course
  for (const x of [161, 178, 195]) opening(x, 60, 7, 11, false, false);
  gable(C0 - 2, C1 + 2, 54, 20);
  text(mid, 'GWBR', 181 - (textW('GWBR') >> 1), 47, BARK);
  for (let i = -2; i <= 2; i++) Lp(mid, 181 + i, 40, TILEW); // the vent in the apex
  frontRoof(LW0, RW1, ROOF0, EAVE);
  // the gabled end on the right with the raised plaque
  L(mid, E0, 74, E1 - E0, GROUND - 74, CHURCH);
  socle(E0, E1, 118);
  quoins(E0, 76, 118); quoins(E1 - 4, 76, 118);
  gable(E0 - 1, E1 + 1, 74, 15);
  L(mid, E0 + 1, 82, E1 - E0 - 2, 11, BARK); L(mid, E0 + 2, 83, E1 - E0 - 4, 9, CBEIGE);
  text(mid, 'CAMPINA GRANDE', E0 + (E1 - E0 - textW('CAMPINA GRANDE')) / 2, 85, BARK);
  for (const x of [264, 297]) opening(x, 100, 8, 18, true, false);
  // gravel yard around the building
  for (let y = GROUND; y < WALL; y++) for (let x = 0; x < WW; x++) Lp(mid, x, y, (x * 7 + y * 3) % 5 ? CBEIGE : STONEL);
  // the yard on the right: open gravel and the locomotive's pavilion
  for (let y = 116; y < GROUND; y++) for (let x = E1; x < WW; x++) Lp(mid, x, y, (x * 5 + y * 11) % 7 ? CBEIGE : STONE);
  castanhola(mid, 372, GROUND, 1, 0xca5);
  castanhola(mid, 8, GROUND, 0.9, 0x7a1);
  pavilion(420, 120);
}

/** The little pavilion: cream posts, a hipped tile roof, and the black steam locomotive inside. */
function pavilion(x: number, ground: number) {
  L(mid, x - 4, ground - 2, 62, 3, TILEW); L(mid, x - 4, ground + 1, 62, 1, STONEL);
  // locomotive: boiler, smokebox, chimney, dome, cab, red buffer beam, wheels
  const lx = x + 10;
  L(mid, lx, ground - 16, 26, 9, VOID); L(mid, lx, ground - 16, 26, 1, BMID); L(mid, lx + 26, ground - 15, 3, 7, BNEAR);
  L(mid, lx + 21, ground - 22, 3, 6, VOID); L(mid, lx + 20, ground - 23, 5, 1, VOID); L(mid, lx + 11, ground - 19, 4, 3, VOID);
  L(mid, lx - 10, ground - 22, 11, 15, VOID); L(mid, lx - 8, ground - 20, 6, 4, WDIM); L(mid, lx - 11, ground - 23, 13, 1, BNEAR);
  L(mid, lx + 28, ground - 8, 3, 2, CRED);
  for (const wx of [lx - 6, lx + 4, lx + 12, lx + 20]) { L(mid, wx, ground - 7, 5, 5, BNEAR); Lp(mid, wx + 2, ground - 5, CRED); }
  L(mid, lx - 10, ground - 6, 40, 1, STEEL);
  // posts and roof
  for (const px of [x, x + 25, x + 50]) { L(mid, px, ground - 26, 4, 24, CBEIGE); L(mid, px + 3, ground - 26, 1, 24, CHURCHD); }
  for (let j = 0; j < 9; j++) { const w = 66 - j * 6; L(mid, x + 27 - (w >> 1), ground - 27 - j, w, 1, j % 3 === 0 ? CRED : TERRA); }
  L(mid, x - 6, ground - 26, 66, 1, BARK);
}

function buildFront() {
  // low stone wall with a concrete cap, the iron railing on top of it
  L(front, 0, WALL, WW, 1, TILEW); L(front, 0, WALL + 1, WW, WALK - WALL - 1, STONEL);
  for (let x = 0; x < WW; x++) for (let y = WALL + 3; y < WALK; y++) if ((x * 3 + y * 7) % 11 === 0) Lp(front, x, y, STONE);
  L(front, 0, 119, WW, 1, VOID); L(front, 0, 129, WW, 1, BNEAR);
  for (let x = 0; x < WW; x += 3) L(front, x, 119, 1, WALL - 119, x % 30 === 0 ? VOID : BNEAR);
  for (let x = 0; x < WW; x += 30) L(front, x - 1, 117, 3, 2, VOID);
  // steps and the ramp up to the doorway (a gap in the railing)
  L(front, 150, 117, 46, WALL - 117 + 8, 255);
  for (let i = 0; i < 4; i++) { L(front, 150 + i * 2, WALL - 2 + i * 2, 30 - i * 4, 2, i % 2 ? STONEL : TILEW); }
  for (let i = 0; i < 16; i++) L(front, 180 + i, WALL - 1 + Math.round(i * 0.45), 1, WALK - WALL + 1 - Math.round(i * 0.45), i % 4 ? STONE : STONEL);
  L(front, 150, 121, 1, 12, VOID); L(front, 196, 121, 1, 12, VOID); for (let i = 0; i < 16; i++) Lp(front, 180 + i, 121 + Math.round(i * 0.4), VOID); // handrails
  // sidewalk with a white kerb
  for (let y = WALK; y < STREET - 1; y++) for (let x = 0; x < WW; x++) Lp(front, x, y, (x + y * 3) % 9 ? STONEL : STONE);
  L(front, 0, STREET - 1, WW, 1, TILEW);
  // the concrete pole, its LED arm and the wires across the street
  pole(front, POLE, WALK, 98);
  // the LED arm bolted to the concrete pole
  for (let i = 0; i < 12; i++) Lp(front, LAMP.x + 2 + i, LAMP.top + 3 - Math.round(Math.sqrt(i) * 1.2), TILEW);
  L(front, LAMP.x + 11, LAMP.top - 2, 7, 2, STEEL);
  for (const [x0, y0, x1, y1, s] of [[0, 34, POLE, 44, 4], [POLE, 44, WW, 30, 6], [POLE + 2, 46, WW, 40, 5], [0, 40, POLE, 48, 6]] as const) wire(front, x0, y0, x1, y1, s);
}

function buildGround() {
  for (let d = 0; d < SH; d++) for (let x = 0; x < WW; x++) street.base[d * WW + x] = wr() < 0.08 ? STONE : ASPH;
  for (let x = 6; x < WW; x += 28) { for (let i = 0; i < 12; i++) street.base[16 * WW + x + i] = TILEW; street.base[16 * WW + x + 20] = CYELL; } // dashes and cat's eyes
  for (let p = 0; p < 6; p++) {
    const cx = wr() * WW, cy = 2 + wr() * (SH - 4), rx = 8 + wr() * 18, ry = 2 + wr() * 2;
    for (let d = 0; d < SH; d++) for (let x = 0; x < WW; x++) { const a = (x - cx) / rx, b = (d - cy) / ry; if (a * a + b * b < 1) street.pud[d * WW + x] = 1; }
  }
}

// ---------- dynamic ----------
/** Art direction, not the museum's real hours: Tue-Fri 8-17h, Sat-Sun 9-16h, closed Mondays. */
function museumOpen() {
  const wd = S.cal.weekday, h = S.cal.hour;
  if (wd === 1) return false;
  return wd === 0 || wd === 6 ? hourIn(h, 9, 16) : hourIn(h, 8, 17);
}

/** Open doors and shutters show the exhibition rooms; at night a few shutters glow between the slats. */
function drawHoles() {
  const open = museumOpen(), n = isNight();
  for (const o of holes) {
    const r = o.w >> 1;
    const inside = (i: number, j: number) => !o.arch || j >= r || Math.hypot(i - (o.w - 1) / 2, j - r) <= r;
    if (open && (o.door || o.rank < 0.7)) {
      for (let j = 0; j < o.h; j++) for (let i = 0; i < o.w; i++) if (inside(i, j)) put(o.x + i, o.y + j, n ? WWARM : j > o.h * 0.6 ? WOOD : BNEAR);
      if (!n) { rect(o.x + 1, o.y + Math.round(o.h * 0.35), o.w - 2, 1, WDIM); if (o.door && o.w > 8) rect(o.x + 3, o.y + o.h - 9, 5, 6, BARK); } // a loom in the doorway
      else rect(o.x + 1, o.y + 1, o.w - 2, 1, LIGHT);
      if (o.door) { rect(o.x - 1, o.y + 2, 1, o.h - 2, WOOD); rect(o.x + o.w, o.y + 2, 1, o.h - 2, WOOD); } // leaves folded back
    } else if (n && !o.door && o.rank < 0.14) for (let j = 1; j < o.h; j += 2) for (let i = 0; i < o.w; i++) if (inside(i, j)) put(o.x + i, o.y + j, WWARM);
  }
}

function update(dt: number) {
  updateAnimals(dt);
  tickSpawns(dt, (museumOpen() ? 1.1 : 0.85) * (S.saoJoao && S.cal.hour >= 18 ? 1.5 : 1)); updatePeople(dt); updateCars(dt, 0.9);
}

const LANTERNS: [number, number][] = [[170, 101], [190, 101]];
const FOG = [{ y: 104, h: 9, sp: 0.5 }, { y: 134, h: 5, sp: -0.3 }];
function render() {
  drawSky(HORIZON); drawAnimalsSky(); drawLightning();
  blitLayer(far); drawTowerWins(towers); drawFireworks();
  blitLayer(mid); drawHoles();
  for (const [x, y] of LANTERNS) lantern(x, y);
  drawFarPrecip();
  blitLayer(front);
  lampLight(LAMP);
  if (S.natal) christmasStar(POLE + 1, 52, 1);
  if (S.saoJoao) { bandeirolas(0, 120, 150, 121, 3, 0); bandeirolas(196, 121, POLE, 120, 3, 2); bandeirolas(POLE, 48, 480, 40, 10, 4); }
  drawAnimalsPerched(); drawPeople(); drawAnimalsGround();
  drawStreet(street); drawCars(); drawRipples(); drawFog(FOG); drawNearPrecip();
}

let built = false;
export const estacaoVelha: Scene = {
  id: 'estacao-velha',
  name: 'Estação Velha',
  build() {
    if (!built) { buildFar(); buildStation(); buildFront(); buildGround(); built = true; }
    setLanes([{ y: 141 }, { y: 143 }, { y: 145 }]);
    setupAnimals({ ground: [142, 145], dogs: 2, sleepSpots: [60, 300, 430],
      wires: [wireCurve(POLE, 44, WW, 30, 6), wireCurve(0, 34, POLE, 44, 4), wireCurve(POLE + 2, 46, WW, 40, 5)],
      walls: [{ x0: 2, x1: WW - 2, y: 118 }, { x0: C0 + 4, x1: C1 - 4, y: 53 }], lamps: [{ x: LAMP.x + 14, y: LAMP.top }] });
    setCarLanes(162, 175, 'br');
    configure({ roofs: [{ x0: LW0 - 3, x1: RW1 + 3, y: ROOF0 }, { x0: C0, x1: C1, y: 36 }, { x0: E0, x1: E1, y: 60 }, { x0: 414, x1: 482, y: 85 }],
      tips: [{ x: LW0 - 2, y: EAVE + 1, end: GROUND }, { x: RW1 + 1, y: EAVE + 1, end: GROUND }, { x: 414, y: 94, end: 120 }],
      lamps: [{ x: LAMP.x + 14, y: LAMP.top }], ground0: WALK, horizon: HORIZON });
    for (let i = 0; i < 150; i++) update(1 / 30);
  },
  update,
  render,
  debug() { return `active  people x${peopleCount()}  museu ${museumOpen() ? 'aberto' : 'fechado'}`; },
};
