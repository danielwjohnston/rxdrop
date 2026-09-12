import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { createRng } from '../src/rng.js';

/**
 * The golden vector exists for the Godot port, not for this game.
 *
 * Stage 2 of the gauntlet is "a seed reproduces a game exactly", and the whole
 * plan for verifying a port rests on running the same seed through both engines
 * and comparing. That only works if the ported PRNG is bit-identical, and
 * mulberry32 is exactly the kind of thing that ports ALMOST right: `Math.imul`
 * is a signed 32-bit multiply and `>>>` is an unsigned shift, neither of which
 * a 64-bit integer language gives you for free. A port that masks one step
 * wrong produces a plausible-looking sequence that diverges from ours, and the
 * differential test then fails somewhere far away and for no visible reason.
 *
 * So: port `src/rng.js` FIRST, check it against `test/fixtures/rng-golden.json`,
 * and port nothing else until it matches.
 *
 * This test guards the other direction - that the fixture still describes the
 * generator this game actually uses. A fixture that has drifted from the
 * implementation certifies nothing.
 */
const golden = JSON.parse(
  readFileSync(new URL('./fixtures/rng-golden.json', import.meta.url), 'utf8'),
);

describe('the seeded generator, pinned for anything that has to reproduce it', () => {
  it('still produces the golden vector', () => {
    for (const [seed, expected] of Object.entries(golden.seeds)) {
      const floats = createRng(Number(seed));
      for (const [i, want] of expected.floats.entries()) {
        assert.equal(
          Number(floats().toFixed(12)), want,
          `seed ${seed}: float ${i} drifted from the fixture`,
        );
      }
      const ints = createRng(Number(seed));
      for (const [i, want] of expected.ints_mod_8.entries()) {
        assert.equal(ints.int(8), want, `seed ${seed}: int ${i} drifted from the fixture`);
      }
    }
  });

  it('covers the edges a 32-bit port is most likely to get wrong', () => {
    // Zero, and the top of the unsigned range: a port that treats state as
    // signed, or forgets to mask the add, breaks on these before anywhere else.
    for (const seed of [0, 4294967295]) {
      assert.ok(golden.seeds[seed], `the fixture should pin seed ${seed}`);
    }
  });

  it('stays inside [0, 1) and int() inside its bound', () => {
    const rng = createRng(12345);
    for (let i = 0; i < 5000; i += 1) {
      const value = rng();
      assert.ok(value >= 0 && value < 1, `float out of range: ${value}`);
      const n = rng.int(7);
      assert.ok(Number.isInteger(n) && n >= 0 && n < 7, `int out of range: ${n}`);
    }
  });
});
