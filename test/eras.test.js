import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ERAS,
  HUES,
  HYBRID_HUES,
  entersEra,
  eraFor,
  paletteFor,
  paletteForLevel,
} from '../src/eras.js';
import { DOCTOR_IDS } from '../src/doctors.js';
import { MAX_LEVEL } from '../src/constants.js';

/** Pulls the numbers back out of an `hsl(h, s%, l%)` string. */
function parseHsl(value) {
  const m = /^hsl\((-?\d+(?:\.\d+)?), (\d+)%, (\d+)%\)$/.exec(value);
  assert.ok(m, `not an hsl colour: ${value}`);
  return { h: Number(m[1]), s: Number(m[2]), l: Number(m[3]) };
}

describe('the eras', () => {
  it('start at level 0 and run in ascending order', () => {
    assert.equal(ERAS[0].from, 0);
    for (let i = 1; i < ERAS.length; i += 1) {
      assert.ok(ERAS[i].from > ERAS[i - 1].from, `era ${i} starts before era ${i - 1}`);
    }
  });

  it('cover every level, and never move backwards', () => {
    let previous = -1;
    for (let level = 0; level <= MAX_LEVEL; level += 1) {
      const era = eraFor(level);
      assert.ok(ERAS.includes(era), `level ${level} has no era`);
      const index = ERAS.indexOf(era);
      assert.ok(index >= previous, `level ${level} went back to an earlier era`);
      previous = index;
    }
  });

  it('are total for levels outside the ladder', () => {
    assert.equal(eraFor(-5), ERAS[0]);
    assert.equal(eraFor(999), ERAS[ERAS.length - 1]);
  });

  it('announce themselves exactly on the first level of a band', () => {
    for (const era of ERAS) assert.ok(entersEra(era.from), `${era.id} does not announce`);
    const starts = new Set(ERAS.map((era) => era.from));
    for (let level = 0; level <= MAX_LEVEL; level += 1) {
      assert.equal(entersEra(level), starts.has(level), `level ${level} disagrees`);
    }
  });

  it('each carry a physician who exists and a note worth reading', () => {
    for (const era of ERAS) {
      assert.ok(DOCTOR_IDS.includes(era.doctor), `${era.id} wants a missing doctor`);
      assert.ok(era.note.text.length > 40, `${era.id} note is too thin`);
      assert.ok(era.note.place.length > 0, `${era.id} note has no place`);
      assert.match(era.accent, /^#[0-9a-f]{6}$/i, `${era.id} accent is not a hex colour`);
      assert.equal(era.backdrop.length, 2);
    }
  });
});

describe('era palettes', () => {
  it('keep every medicine on its own hue, in every era', () => {
    for (const era of ERAS) {
      const palette = paletteFor(era);
      HUES.forEach((hue, color) => {
        assert.equal(parseHsl(palette[color].base).h, hue, `${era.id} moved colour ${color}`);
      });
    }
  });

  it('carry a tone for every hybrid too, or a combined virus cannot be drawn', () => {
    for (const era of ERAS) {
      const palette = paletteFor(era);
      assert.equal(palette.length, HUES.length + HYBRID_HUES.length);
      HYBRID_HUES.forEach((hue, i) => {
        assert.equal(parseHsl(palette[HUES.length + i].base).h, hue);
      });
    }
  });

  it('keep the three medicines far apart on the wheel', () => {
    // The tightest pair is red and yellow. Anything under 40 degrees starts to
    // cost colour-blind players the distinction, so that is the floor.
    for (let a = 0; a < HUES.length; a += 1) {
      for (let b = a + 1; b < HUES.length; b += 1) {
        const gap = Math.abs(HUES[a] - HUES[b]);
        assert.ok(Math.min(gap, 360 - gap) >= 40, `hues ${a} and ${b} are too close`);
      }
    }
  });

  it('stay inside the legible band of saturation and lightness', () => {
    for (const era of ERAS) {
      for (const toneSet of paletteFor(era).slice(0, HUES.length)) {
        const { s, l } = parseHsl(toneSet.base);
        assert.ok(s >= 60, `${era.id} is too washed out to read at ${s}% saturation`);
        assert.ok(l >= 50 && l <= 74, `${era.id} sits at ${l}% lightness, outside the band`);
        // Light and dark have to actually separate, or the capsules go flat.
        assert.ok(parseHsl(toneSet.light).l - l >= 12, `${era.id} highlight is too weak`);
        assert.ok(l - parseHsl(toneSet.dark).l >= 20, `${era.id} shadow is too weak`);
      }
    }
  });

  it('hand back the same frozen palette for a level and its era', () => {
    assert.equal(paletteForLevel(0), paletteFor(ERAS[0]));
    assert.equal(paletteForLevel(MAX_LEVEL), paletteFor(ERAS[ERAS.length - 1]));
    assert.equal(paletteFor(ERAS[2]), paletteFor(ERAS[2]), 'palettes should be cached');
  });
});

describe('era vessels', () => {
  it('describe a drawable bottle in every era', () => {
    for (const { id, vessel } of ERAS) {
      assert.ok(vessel.shoulder >= 0 && vessel.shoulder <= 1, `${id} shoulder out of range`);
      assert.ok(vessel.radius > 0, `${id} has no base radius`);
      // The neck has to be wide enough for a horizontal capsule to sit in it.
      assert.ok(vessel.neckWidth >= 2, `${id} neck is narrower than a capsule`);
      assert.ok(vessel.spout > 0, `${id} has no spout`);
      assert.ok(typeof vessel.cap === 'string' && vessel.cap.length > 0);
      assert.ok(typeof vessel.surface === 'string' && vessel.surface.length > 0);
    }
  });

  it('give every era a virus silhouette of its own', () => {
    const seen = new Set();
    for (const { id, virus } of ERAS) {
      assert.ok(virus.arms >= 4, `${id} virus has too few arms to read`);
      assert.ok(['blob', 'spike'].includes(virus.armShape), `${id} arm shape is unknown`);
      assert.ok(['round', 'lumpy', 'hex'].includes(virus.bodyShape), `${id} body shape is unknown`);
      seen.add(`${virus.arms}:${virus.armShape}:${virus.bodyShape}`);
    }
    assert.ok(seen.size >= 4, 'the eras should not all look the same');
  });
});
