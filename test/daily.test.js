import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { dailyKey, dailySeed, dailySetup, isToday, shareText } from '../src/daily.js';
import { SPEEDS } from '../src/constants.js';

describe('daily key', () => {
  it('is the UTC date, so everyone in the world gets the same puzzle', () => {
    assert.equal(dailyKey(new Date('2026-09-09T23:59:59Z')), '2026-09-09');
    assert.equal(dailyKey(new Date('2026-09-10T00:00:01Z')), '2026-09-10');
    // Late evening in UTC-7 is already tomorrow in UTC, and that is the point:
    // the puzzle rolls over at one instant for everybody.
    assert.equal(dailyKey(new Date('2026-09-10T04:00:00Z')), '2026-09-10');
  });
});

describe('daily setup', () => {
  it('is identical for the same day and different across days', () => {
    assert.deepEqual(dailySetup('2026-09-09'), dailySetup('2026-09-09'));
    assert.notEqual(dailySetup('2026-09-09').seed, dailySetup('2026-09-10').seed);
  });

  it('always lands on a playable level and a real speed', () => {
    for (let day = 1; day <= 60; day += 1) {
      const key = `2026-${String((day % 12) + 1).padStart(2, '0')}-${String(day % 28 + 1).padStart(2, '0')}`;
      const setup = dailySetup(key);
      assert.ok(setup.level >= 3 && setup.level <= 13, `level ${setup.level} on ${key}`);
      assert.ok(SPEEDS[setup.speed], `speed ${setup.speed} on ${key}`);
      assert.equal(typeof setup.resistance, 'boolean');
      assert.equal(setup.daily, true);
      assert.ok(Number.isInteger(setup.seed) && setup.seed >= 0);
    }
  });

  it('mixes up the speed and the resistance flag over time', () => {
    const speeds = new Set();
    const flags = new Set();
    for (let day = 1; day <= 40; day += 1) {
      const setup = dailySetup(`2026-01-${String(day % 28 + 1).padStart(2, '0')}`);
      speeds.add(setup.speed);
      flags.add(setup.resistance);
    }
    assert.ok(speeds.size > 1, 'every day should not be the same speed');
    assert.equal(flags.size, 2, 'resistance should turn up some days and not others');
  });
});

describe('daily seed', () => {
  it('is stable, unsigned and well spread', () => {
    assert.equal(dailySeed('2026-09-09'), dailySeed('2026-09-09'));
    const seen = new Set();
    for (let day = 1; day <= 31; day += 1) {
      const seed = dailySeed(`2026-03-${String(day).padStart(2, '0')}`);
      assert.ok(seed >= 0 && seed <= 0xffffffff);
      seen.add(seed);
    }
    assert.equal(seen.size, 31, 'no two days in a month should collide');
  });
});

describe('results', () => {
  const result = {
    key: '2026-09-09',
    level: 7,
    speed: 'MED',
    score: 12400,
    cleared: 32,
    total: 32,
    won: true,
    resistance: true,
  };

  it('knows whether a stored result is for today', () => {
    assert.equal(isToday(result, '2026-09-09'), true);
    assert.equal(isToday(result, '2026-09-10'), false);
    assert.equal(isToday(null, '2026-09-09'), false);
  });

  it('writes a share line without giving the board away', () => {
    const text = shareText(result, 'https://example.com/rxdrop/');
    assert.match(text, /RxDrop Daily 2026-09-09/);
    assert.match(text, /Level 7 · MED · Resistance/);
    assert.match(text, /Cleared 32\/32 · 12,400/);
    assert.match(text, /\?daily=2026-09-09/);
    assert.ok(!text.includes('seed'), 'the seed would spoil the layout');
  });

  it('reports a loss as progress rather than a clear', () => {
    const text = shareText({ ...result, won: false, cleared: 19 });
    assert.match(text, /19\/32 viruses/);
    assert.ok(!text.includes('Cleared'));
  });
});
