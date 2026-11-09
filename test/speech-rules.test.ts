// Run with `pnpm test` (node --test; Node >= 22.18 strips the TypeScript types natively).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BUBBLE_MS, BubbleQueue, COLD_C, HOT_C, MAX_BUBBLES, type SpeechCtx, type WxCtx, candidates, pickPhrase, placeBubble,
  remember, timeOfDay, weatherTags,
} from '../src/actors/speech-rules.ts';
import { PHRASES } from '../src/actors/phrases.ts';

const SCENES = {
  esperanca: ['praca-matriz', 'rua-comercio', 'capelinha', 'praca-cultura', 'campo-rodoviaria', 'centro-teatro', 'armazem-paraiba', 'rua-faustino', 'rua-jose-bezerra', 'rua-manoel-rodrigues'],
  campina: ['acude-velho', 'piramide-parque-do-povo', 'estacao-velha', 'parque-da-crianca', 'partage-shopping', 'terminal-integracao'],
  joaopessoa: ['cabo-branco'], areia: ['centro-areia'], remigio: ['lagoa-remigio', 'cinema-remigio', 'cinema-fachada-remigio'],
  tokyo: ['rain-corner', 'neon-alley', 'konbini', 'shrine'],
} as const;
type C = keyof typeof SCENES;
const ALL = Object.entries(SCENES).flatMap(([city, ss]) => ss.map((scene) => ({ city: city as C, scene })));
const HOURS = [1, 3, 6, 9, 11.5, 13, 16, 19, 22, 23.9];
const KINDS = ['live', 'stale', 'unavailable', 'override'] as const;
const WX_ID = new Set(PHRASES.filter((p) => p.wx).map((p) => p.t));
const wxOf = (tag: string) => new Set(PHRASES.filter((p) => p.wx === tag).map((p) => p.t));
const ctx = (o: Partial<SpeechCtx> & { wx?: Partial<WxCtx> } = {}): SpeechCtx => ({
  city: 'esperanca', scene: 'praca-matriz', hour: 10, role: 'passerby', ...o,
  wx: { kind: 'live', temp: 25, rain: 0, snow: 0, ...o.wx },
});
const texts = (c: SpeechCtx) => new Set(candidates(c).map((p) => p.t));
const seq = (vals: number[]) => { let i = 0; return () => vals[i++ % vals.length]; };

test('the pool is authored, non-empty, deduplicated and short enough for a bubble', () => {
  assert.ok(PHRASES.length >= 100, `only ${PHRASES.length} phrases`);
  const seen = new Set<string>();
  for (const p of PHRASES) {
    assert.ok(p.t.length > 0 && p.t.length <= 44, `too long for a bubble: ${p.t}`);
    assert.ok(!seen.has(p.t), `duplicate phrase: ${p.t}`); seen.add(p.t);
    assert.ok(p.scene || p.city, `phrase with no place: ${p.t}`);
  }
});

test('every scene, at every hour, has something to say for its speakers', () => {
  for (const { city, scene } of ALL) for (const hour of HOURS) {
    const roles = scene === 'capelinha' ? (['visitor', 'attendee', 'priest'] as const)
      : scene === 'campo-rodoviaria' ? (['passerby', 'player'] as const)
      : scene === 'praca-cultura' ? (['passerby', 'student', 'player', 'volley'] as const)
      : scene === 'cinema-remigio' ? (['attendee'] as const)
      : scene === 'onibus' ? (['rider', 'pupil'] as const)
      : scene === 'cinema-fachada-remigio' ? (['passerby', 'visitor', 'attendee'] as const) : (['passerby'] as const);
    for (const role of roles) {
      const c = ctx({ city, scene, hour, role, wx: { kind: 'unavailable', temp: null } });
      assert.ok(candidates(c).length >= 3, `${city}/${scene}/${role} at ${hour}h has too few phrases`);
      assert.ok(pickPhrase(c, [], Math.random));
    }
  }
});

test('unknown weather gives no weather phrases at all, whatever the numbers say', () => {
  for (const temp of [null, -5, 5, 20, 31, 40]) for (const [rain, snow] of [[0, 0], [1, 0], [0, 1]]) {
    const w: WxCtx = { kind: 'unavailable', temp, rain, snow };
    for (const { city, scene } of ALL) {
      assert.deepEqual(weatherTags(w, city), []);
      for (const hour of HOURS) for (const role of ['passerby', 'visitor', 'attendee', 'priest'] as const) {
        for (const t of texts(ctx({ city, scene, hour, role, wx: w }))) assert.ok(!WX_ID.has(t), `weather phrase with unknown weather: ${t}`);
      }
    }
  }
});

test('heat phrases only with a real temperature at or above the threshold', () => {
  const heat = wxOf('heat');
  assert.ok(heat.size > 0);
  for (const kind of KINDS) for (const temp of [null, 18, 25, HOT_C - 0.1, HOT_C, 34]) for (const { city, scene } of ALL) {
    const got = [...texts(ctx({ city, scene, hour: 13, wx: { kind, temp } }))].some((t) => heat.has(t));
    const allowed = kind !== 'unavailable' && temp !== null && temp >= HOT_C;
    if (!allowed) assert.equal(got, false, `${kind} ${temp}°C ${scene}`);
  }
  assert.ok([...texts(ctx({ wx: { kind: 'live', temp: 32 } }))].some((t) => heat.has(t)));
  assert.ok([...texts(ctx({ wx: { kind: 'stale', temp: 32 } }))].some((t) => heat.has(t)));
  // "esse sol" lines are for daytime only
  assert.ok(!texts(ctx({ hour: 22, wx: { kind: 'live', temp: 31 } })).has('Esse sol tá de lascar!'));
});

test('cold phrases only with a real low temperature (lower threshold for Tokyo)', () => {
  const cold = wxOf('cold');
  const has = (c: SpeechCtx) => [...texts(c)].some((t) => cold.has(t));
  assert.equal(has(ctx({ wx: { kind: 'live', temp: null } })), false);
  assert.equal(has(ctx({ wx: { kind: 'live', temp: COLD_C.br + 1 } })), false);
  assert.equal(has(ctx({ wx: { kind: 'live', temp: COLD_C.br } })), true);
  assert.equal(has(ctx({ city: 'tokyo', scene: 'konbini', wx: { kind: 'live', temp: 12 } })), false);
  assert.equal(has(ctx({ city: 'tokyo', scene: 'konbini', wx: { kind: 'live', temp: 3 } })), true);
});

test('rain phrases only with API precipitation (live / stale) or the explicit #wx= test', () => {
  const rain = wxOf('rain');
  const has = (c: SpeechCtx) => [...texts(c)].some((t) => rain.has(t));
  for (const kind of KINDS) {
    assert.equal(has(ctx({ wx: { kind, rain: 0 } })), false, `${kind} dry`);
    assert.equal(has(ctx({ wx: { kind, rain: 0.02 } })), false, `${kind} trace`);
    assert.equal(has(ctx({ wx: { kind, rain: 0.6 } })), kind !== 'unavailable', `${kind} rain`);
  }
  // snow is its own tag, never "chuva"
  assert.deepEqual(weatherTags({ kind: 'live', temp: -2, rain: 0, snow: 0.6 }, 'tokyo'), ['snow', 'cold']);
});

test('locality: scene lines stay in their scene, Nordeste lines stay out of Tokyo and vice versa', () => {
  const matriz = texts(ctx({ scene: 'praca-matriz' })), cultura = texts(ctx({ scene: 'praca-cultura' }));
  assert.ok(matriz.has('Já ouviu o sino da Matriz?'));
  assert.ok(!cultura.has('Já ouviu o sino da Matriz?'));
  assert.ok(texts(ctx({ scene: 'armazem-paraiba' })).has('Tem promoção no Armazém!'));
  assert.ok(!texts(ctx({ city: 'campina', scene: 'acude-velho' })).has('Tem promoção no Armazém!'));
  assert.ok(texts(ctx({ city: 'campina', scene: 'acude-velho' })).has('Campina, Rainha da Borborema!'));
  assert.ok(!matriz.has('Campina, Rainha da Borborema!'));
  const tokyo = texts(ctx({ city: 'tokyo', scene: 'neon-alley', hour: 21 }));
  assert.ok(tokyo.has('Konbanwa! Boa noite.'));
  for (const t of ['Oxente!', 'Boa noite, visse?', 'Arretado, né?']) assert.ok(!tokyo.has(t), t);
  for (const t of texts(ctx({ city: 'areia', scene: 'centro-areia', hour: 21 }))) assert.ok(!/Konbanwa|Arigatô/.test(t), t);
});

test('time of day: manhã, tarde, noite and madrugada lines only at their hours', () => {
  assert.deepEqual([4.9, 5, 11.9, 12, 17.9, 18, 23.9, 0].map(timeOfDay), ['madrugada', 'manha', 'manha', 'tarde', 'tarde', 'noite', 'noite', 'madrugada']);
  assert.ok(texts(ctx({ hour: 7 })).has('Bom dia, viu?'));
  assert.ok(!texts(ctx({ hour: 20 })).has('Bom dia, viu?'));
  assert.ok(texts(ctx({ hour: 2 })).has('Oxe, acordado essa hora?'));
});

test('Capelinha: no passer-by lines; the priest, congregation and visitors each get their own', () => {
  const priest = texts(ctx({ scene: 'capelinha', role: 'priest' })), crowd = texts(ctx({ scene: 'capelinha', role: 'attendee' }));
  const visitor = texts(ctx({ scene: 'capelinha', role: 'visitor' }));
  assert.ok(priest.has('A paz do Senhor!') && !priest.has('Oxente!') && !priest.has('Que vista lá de cima!'));
  assert.ok(crowd.has('Amém!') && !crowd.has('A paz do Senhor!'));
  assert.ok(visitor.has('Que vista lá de cima!') && !visitor.has('Amém!'));
  // and the Capelinha's own lines never leak to other scenes
  for (const t of texts(ctx({ scene: 'praca-matriz' }))) assert.ok(!priest.has(t) && !crowd.has(t), t);
});

test('no immediate repeat, and the recent ones are kept out while anything else fits', () => {
  const c = ctx();
  let recent: string[] = [];
  let prev = '';
  for (let i = 0; i < 300; i++) {
    const t = pickPhrase(c, recent, Math.random)!;
    assert.notEqual(t, prev);
    assert.ok(!recent.includes(t), `recent phrase repeated: ${t}`);
    recent = remember(recent, t); prev = t;
  }
  // a rnd that always returns the same value still never repeats back to back
  const pool = [{ t: 'a', city: 'br' }, { t: 'b', city: 'br' }];
  let r: string[] = [];
  const got: string[] = [];
  for (let i = 0; i < 6; i++) { const t = pickPhrase(c, r, () => 0, pool)!; got.push(t); r = remember(r, t); }
  assert.deepEqual(got, ['a', 'b', 'a', 'b', 'a', 'b']);
  // a single fitting phrase is still said (nothing else to choose)
  assert.equal(pickPhrase(c, ['x'], () => 0.5, [{ t: 'x', city: 'br' }]), 'x');
  assert.equal(pickPhrase(c, [], () => 0.5, [{ t: 'y', city: 'tokyo' }]), null);
  assert.deepEqual(remember(['a', 'b'], 'a', 3), ['b', 'a']);
  assert.equal(remember(Array.from({ length: 10 }, (_, i) => `${i}`), 'z').length, 6);
});

test('weighted pick is deterministic for a given rnd and covers the list', () => {
  const pool = [{ t: 'a', city: 'br' }, { t: 'b', city: 'br' }, { t: 'c', city: 'br' }];
  const c = ctx();
  assert.equal(pickPhrase(c, [], seq([0]), pool), 'a');
  assert.equal(pickPhrase(c, [], seq([0.99]), pool), 'c');
  assert.equal(pickPhrase(c, [], seq([1]), pool), 'c'); // out-of-range rnd is clamped
});

test('bubble placement: above the head, clamped inside the viewport, flipped below at the top', () => {
  const W = 400, H = 300, w = 120, h = 30;
  const mid = placeBubble(200, 150, w, h, W, H);
  assert.deepEqual(mid, { left: 140, top: 110, below: false, tail: 60 });
  const left = placeBubble(5, 150, w, h, W, H);
  assert.equal(left.left, 8); assert.equal(left.tail, 8);
  const right = placeBubble(398, 150, w, h, W, H);
  assert.equal(right.left, W - 8 - w); assert.equal(right.tail, w - 8);
  const top = placeBubble(200, 20, w, h, W, H);
  assert.equal(top.below, true); assert.equal(top.top, 30);
  const bottom = placeBubble(200, 1000, w, h, W, H);
  assert.ok(bottom.top + h <= H - 8);
  // a bubble wider than the viewport still starts at the margin
  assert.equal(placeBubble(50, 150, 500, h, W, H).left, 8);
  for (let i = 0; i < 200; i++) {
    const b = placeBubble(Math.random() * 600 - 100, Math.random() * 500 - 100, w, h, W, H);
    assert.ok(b.left >= 8 && b.left + w <= W - 8 && b.top >= 8 && b.top + h <= H - 8, JSON.stringify(b));
    assert.ok(b.tail >= 8 && b.tail <= w - 8);
  }
});

test('lifecycle: at most two bubbles, each gone after ~3 s, all cleared on scene change', () => {
  assert.equal(MAX_BUBBLES, 2); assert.equal(BUBBLE_MS, 3000);
  const q = new BubbleQueue<string>();
  q.add('a', 0);
  assert.deepEqual(q.expire(2999), []);
  q.add('b', 1000);
  const { dropped } = q.add('c', 1500);
  assert.deepEqual(dropped.map((d) => d.item), ['a']);
  assert.deepEqual(q.list.map((d) => d.item), ['b', 'c']);
  assert.deepEqual(q.expire(3999).map((d) => d.item), []);
  assert.deepEqual(q.expire(4000).map((d) => d.item), ['b']);
  assert.deepEqual(q.expire(4500).map((d) => d.item), ['c']);
  assert.equal(q.list.length, 0);
  q.add('d', 5000); q.add('e', 5001);
  assert.deepEqual(q.clear().map((d) => d.item), ['d', 'e']);
  assert.equal(q.list.length, 0);
});
