// The bus interior's pure rules (src/scenes/onibus-rules.ts): service hours, how full the bus is,
// the stop cycle, who boards only at stops, and which bus a tapped vehicle boards.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BRAKE_S, CYCLE_S, DRIVE_S, DWELL_S, MAX_STANDING, SEATS, boardable, defaultSkin, distance, drive, inService, load, riders, schoolRun,
  seating, skinForVehicle,
} from '../src/scenes/onibus-rules.ts';

const MON = 1, SAT = 6, SUN = 0;

test('city buses run within their hours, then park', () => {
  assert.ok(inService('sttp', MON, 4.5) && inService('sttp', MON, 23.4));
  assert.ok(!inService('sttp', MON, 4.4) && !inService('sttp', MON, 23.5) && !inService('sttp', MON, 2));
  assert.ok(inService('saojose', MON, 5) && !inService('saojose', MON, 23) && !inService('micro', MON, 4.9));
  for (const s of ['sttp', 'saojose', 'micro'] as const) assert.equal(riders(s, MON, 2).seated + riders(s, MON, 2).standing, 0);
});

test('the school bus runs only on weekdays around the shifts', () => {
  assert.ok(schoolRun(MON, 6.5) && schoolRun(MON, 12) && schoolRun(MON, 17.5));
  assert.ok(!schoolRun(MON, 9) && !schoolRun(MON, 15) && !schoolRun(MON, 20));
  assert.ok(!schoolRun(SAT, 6.5) && !schoolRun(SUN, 12));
  assert.equal(inService('escolar', MON, 9), false);
  const r = riders('escolar', MON, 7);
  assert.ok(r.seated >= SEATS.escolar - 1 && r.standing === 0, 'full of pupils, nobody standing');
});

test('packed at the rush hours, quiet at midday and late, lighter at the weekend', () => {
  const rush = riders('sttp', MON, 7), noon = riders('sttp', MON, 13), late = riders('sttp', MON, 22.5);
  assert.equal(rush.seated, SEATS.sttp);
  assert.ok(rush.standing > 0 && rush.standing <= MAX_STANDING.sttp);
  assert.equal(riders('sttp', MON, 18).seated, SEATS.sttp);
  assert.ok(noon.standing === 0 && noon.seated < SEATS.sttp && noon.seated > 0);
  assert.ok(late.seated <= 2 && late.standing === 0);
  assert.ok(load('sttp', SUN, 7) < load('sttp', MON, 7) && riders('sttp', SUN, 7).standing === 0);
  assert.ok(riders('micro', MON, 7).standing <= MAX_STANDING.micro);
});

test('the drive: cruise, brake, stand at the stop, pull away; distance never jumps', () => {
  assert.deepEqual(drive(1), { speed: 1, stop: 0, atStop: false });
  assert.ok(drive(DRIVE_S + BRAKE_S / 2).speed > 0 && drive(DRIVE_S + BRAKE_S / 2).speed < 1);
  assert.equal(drive(DRIVE_S + BRAKE_S + 1).atStop, true);
  assert.equal(drive(DRIVE_S + BRAKE_S + 1).speed, 0);
  assert.equal(drive(CYCLE_S + 1).stop, 1);
  let prev = distance(0);
  for (let t = 0.05; t < 3 * CYCLE_S; t += 0.05) {
    const d = distance(t), step = d - prev;
    assert.ok(step >= -1e-9 && step <= 0.05 + 1e-6, `smooth at ${t.toFixed(2)}: ${step}`);
    if (drive(t).atStop && drive(t - 0.05).atStop) assert.ok(step < 1e-9, 'standing still at the stop');
    prev = d;
  }
  assert.ok(DWELL_S > 0);
});

test('riders change only at a stop, and the counts are respected', () => {
  const a = seating(42, 3, 9, 5), b = seating(42, 3, 9, 5);
  assert.deepEqual(a, b, 'the same stop gives the same people');
  assert.equal(a.length, 5);
  assert.equal(new Set(a).size, 5);
  assert.ok(a.every((i) => i >= 0 && i < 9));
  assert.equal(seating(42, 3, 9, 20).length, 9);
  assert.equal(seating(42, 3, 9, 0).length, 0);
  const changes = Array.from({ length: 10 }, (_, s) => seating(42, s, 9, 5).join()).filter((v, i, arr) => i > 0 && v !== arr[i - 1]).length;
  assert.ok(changes > 0, 'people get on and off over the stops');
});

test('a tapped bus boards its own interior; Tokyo buses only honk', () => {
  assert.equal(skinForVehicle('bus'), 'saojose');
  assert.equal(skinForVehicle('micro'), 'micro');
  assert.equal(skinForVehicle('escolar'), 'escolar');
  assert.equal(skinForVehicle('hatch'), null);
  assert.equal(defaultSkin('campina'), 'sttp');
  assert.equal(defaultSkin('esperanca'), 'saojose');
  assert.equal(boardable('tokyo'), false);
  assert.ok(boardable('areia'));
});
