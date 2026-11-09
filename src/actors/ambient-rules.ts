/* Pure rules for rare, calm ambient life events (no DOM, unit-tested in test/ambient-rules.test.ts):
   a street dog that tags along behind someone, a picolé / pipoca / água de coco vendor who stops for
   a moment, a kid kicking a ball on the sidewalk, a cat crossing a wall, someone feeding pigeons, a
   delivery moto pulling over at a shop. Peaceful only.

   Scheduling is a function of the clock alone (epoch ms, so #at= is respected): each local hour is
   cut into fixed slots, and a hash of (scene, slot) decides whether that slot holds an event, which
   kind, when it starts and how long it lasts. Every event fits inside its own slot with a gap
   before the next, so a scene never has two at once, and the same instant always gives the same
   answer (no flicker, no Math.random). The kind is picked from the hour alone, never from the
   weather; the weather can only cancel a slot, using the real state only: precipitation from a
   genuine reading (or the #wx= test) keeps fair-weather events away, and unknown weather
   ('unavailable') never counts as a dry day either.

   Keep this file free of TS-only runtime syntax: `node --test` runs it by stripping the types. */
import { type CityId, cityById } from '../sky/cities.ts';
import { density } from '../sky/rhythm.ts';
import { type WxState, raining } from './rain-rules.ts';

export type AmbientKind = 'dog-follow' | 'vendor' | 'kid-ball' | 'cat-wall' | 'pigeons' | 'moto-delivery';
export type VendorKind = 'picole' | 'pipoca' | 'coco';

/** Scenes that host ambient events, their city, and which kinds fit there. Scenes left out on
    purpose: the Capelinha (quiet, its own schedule), the Praça da Matriz (its crowd rules keep bikes
    and anything else out in front of the church), the perspective streets with their own actors
    (Rua Faustino, Rua José Bezerra, Rua Manoel Rodrigues), the Campo (its match schedule owns the scene)
    and the cinema in Remígio (an indoor room) and its street front (the crowd at its door follows the session schedule), and the inside of the bus.
    'moto-delivery' only appears where the scene has a side-on road for it to ride on. */
export const AMBIENT_SCENES: Readonly<Record<string, { city: CityId; kinds: readonly AmbientKind[] }>> = {
  'rua-comercio': { city: 'esperanca', kinds: ['dog-follow', 'vendor', 'kid-ball', 'cat-wall', 'moto-delivery'] },
  'praca-cultura': { city: 'esperanca', kinds: ['dog-follow', 'vendor', 'kid-ball', 'cat-wall', 'pigeons'] },
  'estacao-velha': { city: 'campina', kinds: ['dog-follow', 'vendor', 'cat-wall', 'pigeons', 'moto-delivery'] },
  'parque-da-crianca': { city: 'campina', kinds: ['dog-follow', 'vendor', 'pigeons'] },
  'cabo-branco': { city: 'joaopessoa', kinds: ['dog-follow', 'vendor', 'kid-ball', 'moto-delivery'] },
};

/** Never hosts ambient events (documented above; checked by the tests). */
export const AMBIENT_EXCLUDED = ['capelinha', 'praca-matriz', 'rua-faustino', 'rua-jose-bezerra', 'rua-manoel-rodrigues', 'campo-rodoviaria', 'cinema-remigio', 'cinema-fachada-remigio', 'onibus'] as const;

/** Kinds that need a known dry spell: a real reading (live or stale) or the #wx= test, without rain. */
const FAIR = new Set<AmbientKind>(['vendor', 'kid-ball', 'pigeons']);
/** Kinds that just don't happen in the rain but don't claim anything about the sky otherwise. */
const NO_RAIN = new Set<AmbientKind>(['cat-wall']);

/** Local hours [from, to) in which each kind can start. The dog can also appear at madrugada. */
export const HOURS: Readonly<Record<AmbientKind, readonly [number, number]>> = {
  'dog-follow': [0, 24],
  vendor: [8, 20],
  'kid-ball': [8, 18],
  'cat-wall': [6, 23],
  pigeons: [6, 17],
  'moto-delivery': [9, 23],
};
/** Seconds each kind lasts [min, max]. All far shorter than a slot. */
const DUR: Readonly<Record<AmbientKind, readonly [number, number]>> = {
  'dog-follow': [60, 100],
  vendor: [100, 140],
  'kid-ball': [70, 110],
  'cat-wall': [30, 50],
  pigeons: [110, 160],
  'moto-delivery': [50, 70],
};

/** madrugada 0–5 (city time), as in speech-rules.ts. */
export const MADRUGADA_END = 5;
export const SLOT_MIN = 12;
export const SLOT_MS = SLOT_MIN * 60_000;
export const SLOTS_PER_HOUR = 60 / SLOT_MIN;
/** Quiet time kept free at the end of every slot, so whatever leaves the screen is gone before the next. */
export const SLOT_GAP_MS = 60_000;
/** Chance that a slot holds an event at the busiest hour; scaled down with the hour's crowd level. */
export const SLOT_P = 0.5;
/** Chance per madrugada slot of the occasional dog. */
export const MADRUGADA_P = 0.1;

const HOUR_MS = 3_600_000;

export interface AmbientWx { kind: WxState; rain: number; snow: number }

export interface AmbientEvent {
  kind: AmbientKind;
  scene: string;
  /** Epoch ms when it starts and ends. */
  start: number;
  end: number;
  /** Stable per event: picks sides, colours, spots. */
  seed: number;
  /** Only for 'vendor'. */
  vendor?: VendorKind;
}

function strHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mix(x: number): number {
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d); x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}
/** Uniform [0, 1) from a seed and a stream number. */
const u = (seed: number, k: number) => mix(seed + Math.imul(k, 0x9e3779b9)) / 4294967296;

const inHours = (k: AmbientKind, h: number) => h >= HOURS[k][0] && h < HOURS[k][1];
const localMs = (ms: number, city: CityId) => ms + cityById(city).utc * HOUR_MS;

/** Which vendor walks by: água de coco on the João Pessoa seafront, picolé in the heat of the day,
    pipoca from mid-afternoon. */
function vendorFor(city: CityId, hour: number, r: number): VendorKind {
  if (city === 'joaopessoa') return r < 0.7 ? 'coco' : 'picole';
  if (hour >= 15) return r < 0.7 ? 'pipoca' : 'picole';
  return r < 0.8 ? 'picole' : 'pipoca';
}

/** The event planned for a slot (index counted on the city's local clock), before the weather is
    consulted; null if the slot stays quiet. Same scene + slot -> same answer, always. */
export function plannedEvent(scene: string, slot: number): AmbientEvent | null {
  const cfg = AMBIENT_SCENES[scene];
  if (!cfg) return null;
  const startLocal = slot * SLOT_MS, hour = ((startLocal % (24 * HOUR_MS)) + 24 * HOUR_MS) % (24 * HOUR_MS) / HOUR_MS;
  const seed = mix(strHash(scene) ^ mix(slot));
  const madrugada = hour < MADRUGADA_END;
  let kinds = cfg.kinds.filter((k) => inHours(k, hour));
  let p: number;
  if (madrugada) { kinds = kinds.filter((k) => k === 'dog-follow'); p = MADRUGADA_P; }
  else {
    const toUtc = startLocal - cityById(cfg.city).utc * HOUR_MS, level = density(cfg.city, scene, toUtc + SLOT_MS / 2).people;
    p = SLOT_P * (0.35 + 0.65 * Math.min(1, level / 0.6));
  }
  if (!kinds.length || u(seed, 1) >= p) return null;
  const kind = kinds[Math.floor(u(seed, 2) * kinds.length)];
  const [d0, d1] = DUR[kind], dur = (d0 + (d1 - d0) * u(seed, 3)) * 1000;
  const off = u(seed, 4) * (SLOT_MS - SLOT_GAP_MS - dur);
  const start = startLocal - cityById(cfg.city).utc * HOUR_MS + off;
  const ev: AmbientEvent = { kind, scene, start, end: start + dur, seed };
  if (kind === 'vendor') ev.vendor = vendorFor(cfg.city, hour, u(seed, 5));
  return ev;
}

/** Whether the real weather state lets this kind happen now. */
export function weatherAllows(kind: AmbientKind, wx: AmbientWx): boolean {
  const wet = raining(wx.kind, wx.rain, wx.snow);
  if (FAIR.has(kind)) return wx.kind !== 'unavailable' && !wet;
  if (NO_RAIN.has(kind)) return !wet;
  return true;
}

/** The slot index (city-local) containing an instant. */
export function slotAt(scene: string, ms: number): number {
  const cfg = AMBIENT_SCENES[scene];
  return Math.floor(localMs(ms, cfg ? cfg.city : 'esperanca') / SLOT_MS);
}

/** The ambient event running in a scene at an instant, or null. At most one, by construction. */
export function ambientAt(scene: string, ms: number, wx: AmbientWx): AmbientEvent | null {
  if (!AMBIENT_SCENES[scene]) return null;
  const ev = plannedEvent(scene, slotAt(scene, ms));
  return ev && ms >= ev.start && ms < ev.end && weatherAllows(ev.kind, wx) ? ev : null;
}

/** The next planned event starting after `ms` within `withinMs` (debug panel; weather not applied). */
export function nextPlanned(scene: string, ms: number, withinMs = 6 * HOUR_MS): AmbientEvent | null {
  if (!AMBIENT_SCENES[scene]) return null;
  const s0 = slotAt(scene, ms), n = Math.ceil(withinMs / SLOT_MS);
  for (let s = s0; s <= s0 + n; s++) {
    const ev = plannedEvent(scene, s);
    if (ev && ev.start > ms) return ev;
  }
  return null;
}

/** Whether an ambient sound cue may play: ambience switched on, audio unlocked by a gesture, and the
    radio off (the cue never competes with the music; it is simply skipped). */
export function cueAllowed(c: { soundOn: boolean; unlocked: boolean; radioOn: boolean }): boolean {
  return c.soundOn && c.unlocked && !c.radioOn;
}
