import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createRng } from '../src/rng.js';

describe('createRng', () => {
  it('repeats exactly for the same seed', () => {
    const a = createRng(2024);
    const b = createRng(2024);
    const draw = (rng) => Array.from({ length: 50 }, () => rng());
    assert.deepEqual(draw(a), draw(b));
  });

  it('differs across seeds', () => {
    assert.notEqual(createRng(1)(), createRng(2)());
  });

  it('stays inside [0, 1) and int() inside [0, n)', () => {
    const rng = createRng(5);
    for (let i = 0; i < 1000; i += 1) {
      const value = rng();
      assert.ok(value >= 0 && value < 1);
      const n = rng.int(3);
      assert.ok(Number.isInteger(n) && n >= 0 && n < 3);
    }
  });

  it('covers every colour slot within a reasonable number of draws', () => {
    const rng = createRng(11);
    const seen = new Set();
    for (let i = 0; i < 200; i += 1) seen.add(rng.int(3));
    assert.deepEqual([...seen].sort(), [0, 1, 2]);
  });
});
