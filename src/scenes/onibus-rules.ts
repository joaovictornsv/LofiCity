/* Pure rules for the bus interior (src/scenes/onibus.ts), unit-tested in test/onibus-rules.test.ts.
   No DOM and no framebuffer here.

   Art direction (owner's), not an official timetable:
   - which bus you are in: tapping a city bus, micro-ônibus or school bus in a street scene boards that
     bus; the STTP bus at Campina's Terminal de Integração boards an STTP bus. Reached any other way
     (the scene list, #scene=onibus) it is the city's usual bus: STTP in Campina Grande, São José elsewhere.
   - service: STTP 04:30-23:30 (the terminal's hours); São José and the micro 05:00-23:00 (the hours
     they drive in the street scenes); the school bus only on weekdays around the school shifts.
     Outside service the bus is parked at the garage, lights dimmed, nobody on board.
   - how full it is follows a commuter curve: packed at 06-08h and 17-19h (people standing), quiet at
     midday, nearly empty late; lighter on Saturdays and Sundays. The school bus is full of pupils.
   - it drives and stops on a fixed cycle; people only get on and off while it stands at a stop. */

export type BusSkin = 'sttp' | 'saojose' | 'micro' | 'escolar';
export type Landscape = 'towers' | 'market' | 'coast' | 'colonial';
export type BusCity = 'esperanca' | 'campina' | 'joaopessoa' | 'areia' | 'remigio' | 'tokyo';

/** Seats along the far wall and the most people standing in the aisle, per bus. */
export const SEATS: Readonly<Record<BusSkin, number>> = { sttp: 9, saojose: 9, micro: 6, escolar: 9 };
export const MAX_STANDING: Readonly<Record<BusSkin, number>> = { sttp: 4, saojose: 4, micro: 2, escolar: 0 };

const within = (h: number, a: number, b: number) => h >= a && h < b;

/** Hours the city buses run, [from, to) local time. */
export const SERVICE: Readonly<Record<Exclude<BusSkin, 'escolar'>, readonly [number, number]>> = {
  sttp: [4.5, 23.5], saojose: [5, 23], micro: [5, 23],
};
/** Weekday windows when the prefeitura school buses carry pupils (to and from the two shifts). */
export const SCHOOL_RUNS: readonly (readonly [number, number])[] = [[6, 7.8], [11, 13.5], [17, 18.5]];
export const schoolRun = (weekday: number, hour: number) => weekday >= 1 && weekday <= 5 && SCHOOL_RUNS.some(([a, b]) => within(hour, a, b));

/** Whether this bus is running at that moment (weekday 0 = Sunday, hour local). */
export function inService(skin: BusSkin, weekday: number, hour: number): boolean {
  if (skin === 'escolar') return schoolRun(weekday, hour);
  const [a, b] = SERVICE[skin];
  return within(hour, a, b);
}

/** Commuter load (0..1) at each hour, index 24 = midnight again; linear in between. */
const LOAD = [
  0, 0, 0, 0, 0.05, 0.3, 0.8, 1, 0.9, 0.55, 0.4, 0.4,
  0.5, 0.45, 0.35, 0.35, 0.5, 0.85, 1, 0.7, 0.45, 0.3, 0.2, 0.12, 0,
];
const WEEKEND = [0.45, 1, 1, 1, 1, 1, 0.65]; // Sunday .. Saturday

/** How full the bus is (0..1) while running; 0 out of service. */
export function load(skin: BusSkin, weekday: number, hour: number): number {
  if (!inService(skin, weekday, hour)) return 0;
  if (skin === 'escolar') return 0.9;
  const h = ((hour % 24) + 24) % 24, i = Math.floor(h), t = h - i;
  return (LOAD[i] + (LOAD[i + 1] - LOAD[i]) * t) * WEEKEND[weekday];
}

/** Seated and standing passengers for a load: the seats fill first, people stand only when it is packed. */
export function riders(skin: BusSkin, weekday: number, hour: number): { seated: number; standing: number } {
  const k = load(skin, weekday, hour), n = SEATS[skin];
  const seated = Math.min(n, Math.round(n * Math.min(1, k * 1.15)));
  const standing = k > 0.8 ? Math.min(MAX_STANDING[skin], Math.round(((k - 0.8) / 0.2) * MAX_STANDING[skin])) : 0;
  return { seated, standing };
}

// ---------- the drive ----------
/** One stop cycle (seconds): driving, braking, standing at the stop, pulling away. */
export const DRIVE_S = 34, BRAKE_S = 3, DWELL_S = 7, PULL_S = 3;
export const CYCLE_S = DRIVE_S + BRAKE_S + DWELL_S + PULL_S;

/** Speed (0..1 of cruising) at time t (seconds), the stop count so far, and whether the bus stands at a stop. */
export function drive(t: number): { speed: number; stop: number; atStop: boolean } {
  const stop = Math.floor(t / CYCLE_S), u = t - stop * CYCLE_S;
  if (u < DRIVE_S) return { speed: 1, stop, atStop: false };
  if (u < DRIVE_S + BRAKE_S) return { speed: 1 - (u - DRIVE_S) / BRAKE_S, stop, atStop: false };
  if (u < DRIVE_S + BRAKE_S + DWELL_S) return { speed: 0, stop, atStop: true };
  return { speed: (u - DRIVE_S - BRAKE_S - DWELL_S) / PULL_S, stop, atStop: false };
}

/** Distance driven (in cruising-seconds) by time t: the integral of drive().speed, so scenery never jumps. */
export function distance(t: number): number {
  const stop = Math.floor(t / CYCLE_S), u = t - stop * CYCLE_S;
  const per = DRIVE_S + BRAKE_S / 2 + PULL_S / 2;
  let d = Math.min(u, DRIVE_S);
  if (u > DRIVE_S) d += Math.min(u - DRIVE_S, BRAKE_S) - Math.min(u - DRIVE_S, BRAKE_S) ** 2 / (2 * BRAKE_S);
  if (u > DRIVE_S + BRAKE_S + DWELL_S) { const p = u - DRIVE_S - BRAKE_S - DWELL_S; d += p * p / (2 * PULL_S); }
  return stop * per + d;
}

/** Which people ride between two stops: who boards changes only at a stop (the passenger set is a
    function of the stop count), so nobody pops in or out while the bus is moving. Returns the seat
    indices taken (sorted) and one seed per rider so they keep their looks while on board. */
export function seating(seed: number, stop: number, seats: number, seated: number): number[] {
  const order = Array.from({ length: seats }, (_, i) => i);
  let s = (Math.imul(seed ^ 0x5b0, 0x9e3779b1) + Math.imul(stop, 0x85ebca6b)) >>> 0;
  for (let i = seats - 1; i > 0; i--) {
    s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) >>> 0;
    const j = s % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order.slice(0, Math.max(0, Math.min(seats, seated))).sort((a, b) => a - b);
}

// ---------- which bus, which view ----------
/** The bus a street vehicle kind boards (br-traffic kinds), or null for anything else. */
export function skinForVehicle(kind: string): BusSkin | null {
  return kind === 'bus' ? 'saojose' : kind === 'micro' ? 'micro' : kind === 'escolar' ? 'escolar' : null;
}
/** The bus you are in when the scene is reached without tapping one. */
export const defaultSkin = (city: BusCity): BusSkin => (city === 'campina' ? 'sttp' : 'saojose');
/** Cities whose streets have buses you can board (Tokyo's buses only honk). */
export const boardable = (city: BusCity) => city !== 'tokyo';

/** What goes past the window in each city: Campina's high-rises, the market streets of the small
    towns, João Pessoa's seafront, Areia's colonial houses on the hills. */
export const LANDSCAPE: Readonly<Record<BusCity, Landscape>> = {
  campina: 'towers', esperanca: 'market', remigio: 'market', joaopessoa: 'coast', areia: 'colonial', tokyo: 'towers',
};
