/* Pure rules behind the city map (no DOM, so test/city-map.test.ts can import them):
   the map frame and its projection, which cities get a pin and which go to the "elsewhere" row,
   where each pin's label goes so none overlap, and what a pick or a dismissal does. */

/** Geographic window the map shows: all of Paraíba plus a strip of the Atlantic to the east. */
export const FRAME = { west: -38.9, east: -34.5, north: -5.85, south: -8.45 } as const;
/** Map pixels: one cell is 0.025° (~2.8 km) on both axes, so the frame is 176 x 104 cells. */
export const CELL = 0.025;
export const GRID = { w: Math.round((FRAME.east - FRAME.west) / CELL), h: Math.round((FRAME.north - FRAME.south) / CELL) };

export interface Place { id: string; name: string; lat: number; lon: number }

/** Position inside the frame as fractions (0..1, x to the east, y to the south). */
export const project = (lat: number, lon: number) => ({
  x: (lon - FRAME.west) / (FRAME.east - FRAME.west),
  y: (FRAME.north - lat) / (FRAME.north - FRAME.south),
});

export const inFrame = (lat: number, lon: number) =>
  lon >= FRAME.west && lon <= FRAME.east && lat <= FRAME.north && lat >= FRAME.south;

/** Cities inside the frame get a pin on the map; the others (Tóquio) are listed beside it. Registry order is kept. */
export function splitCities<T extends Place>(cities: readonly T[]) {
  return { onMap: cities.filter((c) => inFrame(c.lat, c.lon)), elsewhere: cities.filter((c) => !inFrame(c.lat, c.lon)) };
}

/** "Esperança · PB" -> "Esperança": the state is implied by the map. */
export const shortName = (name: string) => name.split(' · ')[0];

/** Ray casting; ring is [lon, lat] pairs. */
export function insidePolygon(lon: number, lat: number, ring: readonly (readonly [number, number])[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export interface Rect { x: number; y: number; w: number; h: number }
export interface Label extends Rect { /** true when the label sits away from its pin and needs a leader line */ far: boolean }

const overlaps = (a: Rect, b: Rect, pad: number) =>
  a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;

/**
 * Places one label per pin (all in CSS pixels): tries the eight spots around the pin, then the same
 * spots on wider rings, and keeps the first that stays inside the map and clear of every other label
 * and pin. The Agreste cities sit a few pixels apart, so most of them end up on an outer ring with a
 * leader line. Deterministic: same input, same layout.
 */
export function placeLabels(pins: readonly { x: number; y: number }[], sizes: readonly { w: number; h: number }[], W: number, H: number, gap = 4): Label[] {
  const pinBox = (p: { x: number; y: number }): Rect => ({ x: p.x - 4, y: p.y - 4, w: 8, h: 8 });
  const placed: Label[] = [];
  pins.forEach((p, i) => {
    const { w, h } = sizes[i];
    let best: Label | null = null;
    for (let ring = 0; ring < 8 && !best; ring++) {
      const d = 8 + ring * (h + gap);
      const spots: [number, number][] = [
        [p.x + d, p.y - h / 2], [p.x - d - w, p.y - h / 2], // right, left
        [p.x + d * 0.7, p.y - d * 0.7 - h], [p.x + d * 0.7, p.y + d * 0.7], // up-right, down-right
        [p.x - d * 0.7 - w, p.y - d * 0.7 - h], [p.x - d * 0.7 - w, p.y + d * 0.7], // up-left, down-left
        [p.x - w / 2, p.y - d - h], [p.x - w / 2, p.y + d], // up, down
      ];
      for (const [x, y] of spots) {
        const r = { x: Math.round(x), y: Math.round(y), w, h, far: ring > 0 };
        if (r.x < 0 || r.y < 0 || r.x + w > W || r.y + h > H) continue;
        if (placed.some((o) => overlaps(r, o, gap)) || pins.some((q) => overlaps(r, pinBox(q), 0))) continue;
        best = r; break;
      }
    }
    // nothing fits (a tiny map): clamp beside the pin rather than drop the city
    placed.push(best ?? { x: Math.max(0, Math.min(W - w, Math.round(p.x + 8))), y: Math.max(0, Math.min(H - h, Math.round(p.y - h / 2))), w, h, far: false });
  });
  return placed;
}

export type MapEvent = { type: 'open' } | { type: 'pick'; id: string } | { type: 'dismiss' };
export interface MapStep { open: boolean; /** city to switch to, or null to keep the current one */ switchTo: string | null }

/** Picking another city switches and closes; picking the current one or dismissing only closes. */
export function mapStep(current: string, ev: MapEvent): MapStep {
  if (ev.type === 'open') return { open: true, switchTo: null };
  if (ev.type === 'pick' && ev.id !== current) return { open: false, switchTo: ev.id };
  return { open: false, switchTo: null };
}
