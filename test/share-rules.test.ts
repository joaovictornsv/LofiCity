import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardFileName, parseHash, shareUrl, viewHash } from '../src/share-rules.ts';

test('view hash puts city and scene first and keeps the other options', () => {
  assert.equal(viewHash('', { city: 'esperanca', scene: 'praca-matriz' }), '#city=esperanca&scene=praca-matriz');
  assert.equal(viewHash('#debug&scene=capelinha&wx=rain', { city: 'esperanca', scene: 'praca-cultura' }),
    '#city=esperanca&scene=praca-cultura&debug&wx=rain');
});

test('a pinned moment stays in the hash, readable and round-trippable', () => {
  const h = viewHash('#at=2026-12-24T22:00', { city: 'tokyo', scene: 'shrine', at: '2026-12-24T22:00' });
  assert.equal(h, '#city=tokyo&scene=shrine&at=2026-12-24T22:00');
  assert.equal(new URLSearchParams(h.slice(1)).get('at'), '2026-12-24T22:00');
  assert.deepEqual(parseHash(h).map(([k]) => k), ['city', 'scene', 'at']);
});

test('the shared link drops test and developer options', () => {
  const url = shareUrl('https://loficity-lac.vercel.app/#debug&wx=storm&car=bus&bus=micro&scene=x', { city: 'campina', scene: 'acude-velho' });
  assert.equal(url, 'https://loficity-lac.vercel.app/#city=campina&scene=acude-velho');
  assert.ok(!/wx=|debug|car=|bus=/.test(url));
});

test('card file name is safe and carries the time', () => {
  assert.equal(cardFileName({ city: 'esperanca', scene: 'praca-matriz' }, 21.5), 'loficity-esperanca-praca-matriz-2130.png');
  assert.equal(cardFileName({ city: 'tokyo', scene: 'rain-corner' }, 7.999), 'loficity-tokyo-rain-corner-0759.png');
});
