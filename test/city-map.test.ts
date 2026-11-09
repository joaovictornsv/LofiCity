// Run with `pnpm test`. Pure rules of the city map (src/ui/map-rules.ts); the dialog itself is DOM.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CITIES } from '../src/sky/cities.ts';
import { PARAIBA } from '../src/ui/paraiba.ts';
import { GRID, insidePolygon, mapStep, placeLabels, project, shortName, splitCities } from '../src/ui/map-rules.ts';

test('pins come from the city registry: every Paraíba city on the map, Tóquio in the elsewhere row', () => {
  const { onMap, elsewhere } = splitCities(CITIES);
  assert.deepEqual(onMap.map((c) => c.id), CITIES.filter((c) => c.br).map((c) => c.id));
  assert.deepEqual(elsewhere.map((c) => c.id), ['tokyo']);
  assert.equal(onMap.length + elsewhere.length, CITIES.length);
});

test('the dialog builds its buttons from CITIES, not from a list of its own', () => {
  const src = readFileSync(new URL('../src/ui/city-map.ts', import.meta.url), 'utf8');
  assert.match(src, /splitCities\(CITIES\)/);
  for (const c of CITIES) assert.ok(!src.includes(`'${c.id}'`), `${c.id} is not hard-coded`);
});

test('every Paraíba city lies on (or at the coast of) the state outline and inside the frame', () => {
  for (const c of splitCities(CITIES).onMap) {
    // João Pessoa's point is Cabo Branco, on the coastline itself: allow 0.02° (one map pixel)
    const near = [[0, 0], [-0.02, 0], [0.02, 0], [0, -0.02], [0, 0.02]].some(([dx, dy]) => insidePolygon(c.lon + dx, c.lat + dy, PARAIBA));
    assert.ok(near, `${c.id} inside Paraíba`);
    const p = project(c.lat, c.lon);
    assert.ok(p.x > 0 && p.x < 1 && p.y > 0 && p.y < 1, `${c.id} projected inside the map`);
  }
  assert.ok(!insidePolygon(139.69, 35.68, PARAIBA));
});

test('the projection keeps geography: João Pessoa east of Campina, Remígio north of Campina', () => {
  const at = (id: string) => { const c = CITIES.find((x) => x.id === id)!; return project(c.lat, c.lon); };
  assert.ok(at('joaopessoa').x > at('campina').x);
  assert.ok(at('remigio').y < at('campina').y);
  assert.ok(GRID.w > GRID.h, 'Paraíba is wider than tall');
});

test('shortName drops the state suffix', () => {
  assert.equal(shortName('Campina Grande · PB'), 'Campina Grande');
  assert.equal(shortName('Tóquio'), 'Tóquio');
});

const overlap = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

for (const [W, label] of [[740, 'desktop'], [520, 'landscape phone'], [340, 'upright phone']] as const) {
  test(`labels never overlap and stay inside the map (${label}, ${W}px)`, () => {
    const H = Math.round((W * GRID.h) / GRID.w);
    const cities = splitCities(CITIES).onMap;
    const pins = cities.map((c) => { const p = project(c.lat, c.lon); return { x: p.x * W, y: p.y * H }; });
    const sizes = cities.map((c) => ({ w: 16 + shortName(c.name).length * 8, h: 32 })); // 32px: the touch target
    const labels = placeLabels(pins, sizes, W, H);
    assert.equal(labels.length, cities.length);
    labels.forEach((r, i) => {
      assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.w <= W && r.y + r.h <= H, `${cities[i].id} inside`);
      assert.ok(r.h >= 32);
      labels.forEach((o, j) => { if (j > i) assert.ok(!overlap(r, o), `${cities[i].id} vs ${cities[j].id}`); });
      pins.forEach((p, j) => assert.ok(!overlap(r, { x: p.x - 3, y: p.y - 3, w: 6, h: 6 }), `${cities[i].id} label covers pin ${cities[j].id}`));
    });
    assert.deepEqual(placeLabels(pins, sizes, W, H), labels, 'deterministic');
  });
}

test('selection: picking another city switches and closes the map', () => {
  assert.deepEqual(mapStep('esperanca', { type: 'pick', id: 'tokyo' }), { open: false, switchTo: 'tokyo' });
});

test('picking the current city only closes the map', () => {
  assert.deepEqual(mapStep('campina', { type: 'pick', id: 'campina' }), { open: false, switchTo: null });
});

test('dismissal (close button, Esc, backdrop) closes without changing the city', () => {
  assert.deepEqual(mapStep('areia', { type: 'dismiss' }), { open: false, switchTo: null });
  assert.deepEqual(mapStep('areia', { type: 'open' }), { open: true, switchTo: null });
});
