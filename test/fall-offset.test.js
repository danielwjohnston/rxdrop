import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Renderer } from '../src/renderer.js';

/**
 * `fallOffset` only reads `game.dropProgress` and its own two fields, so it can
 * be exercised without a canvas. That is worth keeping true: the moment this
 * needs a real renderer, the rule it encodes stops being checkable here.
 */
const ease = () => {
  const state = {};
  return (progress, pill = 'same') =>
    Renderer.prototype.fallOffset.call(state, { dropProgress: progress, pill });
};

describe('the drawn fall offset', () => {
  it('follows the capsule down exactly', () => {
    // Falling is the ordinary case and must not lag: a capsule drawn behind
    // where it is would be worse than the jump this exists to smooth.
    const drawn = ease();
    for (const p of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
      assert.equal(drawn(p), p, `falling to ${p} was not drawn exactly`);
    }
  });

  it('never jumps upward in a single frame', () => {
    // Reported from play as a spring-back: walking a capsule sideways over a
    // ledge makes dropProgress fall to zero at once, because it has nowhere
    // left to fall - and the capsule leapt most of a cell up the screen while
    // its logical row never moved at all.
    const drawn = ease();
    drawn(0.9);
    const after = drawn(0);
    assert.ok(after > 0.2, `the capsule jumped from 0.90 to ${after.toFixed(2)} in one frame`);
    assert.ok(after < 0.9, 'and it does have to be on its way down');
  });

  it('settles on the true position quickly, and exactly', () => {
    const drawn = ease();
    drawn(0.9);
    let frames = 0;
    let value = 0.9;
    while (value !== 0 && frames < 60) {
      value = drawn(0);
      frames += 1;
    }
    assert.equal(value, 0, 'the offset must actually reach the truth, not approach it forever');
    assert.ok(frames <= 12, `it took ${frames} frames to settle, which is a visible drift`);
  });

  it('starts a new capsule from its own position, with no history', () => {
    // Otherwise the last capsule's offset eases into the next one's first
    // frame, which would draw a freshly dealt capsule below the neck.
    const drawn = ease();
    drawn(0.9);
    assert.equal(drawn(0, 'a different capsule'), 0, 'a new capsule inherited an offset');
  });
});
