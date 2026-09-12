import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ERAS } from '../src/eras.js';
import { TRACKS, noteToFreq, resolveTrack } from '../src/audio.js';

const OSCILLATORS = new Set(['sine', 'square', 'triangle', 'sawtooth']);
const duration = (notes) => notes.reduce((sum, [, length]) => sum + length, 0);

describe('era music', () => {
  it('has one track for every era and keeps the legacy aliases', () => {
    for (const era of ERAS) assert.ok(TRACKS[era.id], `missing track for ${era.id}`);
    assert.deepEqual(resolveTrack('chill').lead, TRACKS.pharmaceutical.lead);
    assert.deepEqual(resolveTrack('fever').lead, resolveTrack('pharmaceutical', true).lead);
  });

  it('uses parseable notes and valid synth voices', () => {
    for (const [id, track] of Object.entries(TRACKS)) {
      for (const [voice, notes] of [['lead', track.lead], ['bass', track.bass]]) {
        for (const [note] of notes) {
          if (note !== null) assert.ok(noteToFreq(note) > 0, `${id} ${voice} ${note}`);
        }
      }
      for (const dangerVoice of ['lead', 'bass']) {
        for (const [note] of track.danger?.[dangerVoice] ?? []) {
          if (note !== null) assert.ok(noteToFreq(note) > 0, `${id} danger ${note}`);
        }
      }
    }
  });

  it('keeps every loop aligned to its bar and drum grammar', () => {
    for (const [id, track] of Object.entries(TRACKS)) {
      assert.equal(duration(track.lead), duration(track.bass), `${id} voices drift`);
      assert.equal(duration(track.lead) % track.bar, 0, `${id} is not bar aligned`);
      assert.equal(track.drums.length, track.bar, `${id} drum bar is wrong`);
      assert.match(track.drums, /^[xht.]+$/, `${id} has an unknown drum step`);
      assert.ok(OSCILLATORS.has(track.leadType), `${id} lead voice is invalid`);
      assert.ok(OSCILLATORS.has(track.bassType), `${id} bass voice is invalid`);
    }
  });

  it('resolves era danger without losing the era identity', () => {
    const calm = resolveTrack('protomedicine', false);
    const danger = resolveTrack('protomedicine', true);
    assert.equal(danger.tempo, 0.7 * 1.2);
    assert.ok([...danger.drums].some((step, index) => step === 'h' && index % 2 === 1));
    assert.deepEqual(
      resolveTrack('pharmaceutical', true).lead,
      resolveTrack('fever').lead,
    );
    assert.equal(calm.leadType, 'triangle');
  });
});
