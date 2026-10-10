import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { ScoreError, parseScore, realize } from '../src/score.js';
import { SCORE } from '../src/score-data.js';
import { TRACKS, resolveTrack } from '../src/audio.js';
import { ERAS } from '../src/eras.js';

const fixture = (name) =>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const clone = (value) => JSON.parse(JSON.stringify(value));
const deepFreeze = (value) => {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
};

/** The minimal fixture with one change applied, expected to be refused at `path`. */
function refuses(change, path) {
  const score = fixture('score-minimal.json');
  change(score);
  assert.throws(
    () => parseScore(score),
    (error) => error instanceof ScoreError && path.test(error.path),
    `expected a ScoreError at ${path}`,
  );
}

describe('the score format', () => {
  it('holds the RxDrop score as plain JSON, so any engine can read it', () => {
    assert.deepEqual(JSON.parse(JSON.stringify(SCORE)), SCORE);
  });

  it('parses deterministically and never modifies what it reads', () => {
    const frozen = deepFreeze(clone(SCORE));
    const first = parseScore(frozen);
    assert.deepEqual(parseScore(frozen), first);
    assert.deepEqual(parseScore(clone(SCORE)), first);
    assert.deepEqual(realize(first, 'genetic', { danger: true }), realize(first, 'genetic', { danger: true }));
    const small = deepFreeze(fixture('score-minimal.json'));
    assert.deepEqual(parseScore(small), parseScore(fixture('score-minimal.json')));
  });

  it('has an arrangement for every era, and nothing else', () => {
    const model = parseScore(SCORE);
    assert.deepEqual(Object.keys(model.arrangements), ERAS.map((era) => era.id));
    for (const [id, arrangement] of Object.entries(model.arrangements)) {
      assert.equal(arrangement.era, id);
    }
  });

  it('realizes the fixture exactly as written', () => {
    const model = parseScore(fixture('score-minimal.json'));

    const ancient = realize(model, 'ancient');
    assert.equal(ancient.bpm, 90);
    assert.equal(ancient.barTicks, 16);
    assert.equal(ancient.stems.drums.pattern, 'x.h.x.h.x.h.x.h.');
    assert.deepEqual(ancient.stems.lead.events, [['A4', 4], ['C5', 4], ['E5', 4], ['C5', 4]]);
    assert.deepEqual(ancient.variants, []);

    // A level selects a variant at its threshold, not before.
    assert.deepEqual(realize(model, 'ancient', { resistance: 0.4 }).stems.bass.events, [['A2', 16]]);
    assert.deepEqual(realize(model, 'ancient', { resistance: 0.5 }).stems.bass.events, [['Bb2', 16]]);

    // The score-wide danger rule applies wherever an arrangement has no rule of its own.
    const fever = realize(model, 'ancient', { danger: true, resistance: 1 });
    assert.equal(fever.bpm, 112.5);
    assert.equal(fever.stems.drums.pattern, 'xxh.xxh.xxh.xxh.');
    assert.deepEqual(fever.variants, ['danger', 'tension']);

    // The same motif, shared by two eras, a fifth apart and in another metre.
    const modern = realize(model, 'modern');
    assert.equal(modern.barTicks, 12);
    assert.deepEqual(modern.stems.lead.events.slice(0, 4), [['E5', 4], ['G5', 4], ['B5', 4], ['G5', 4]]);
    assert.equal(modern.stems.drums.pattern, 'x..h..x.h.x.x..h..x..h..');
    assert.deepEqual(modern.sonotherapy, { windowMs: 120, strongBeat: 'none' });
    assert.deepEqual(ancient.sonotherapy, { windowMs: 90, strongBeat: 'downbeat' });

    // An alias's own inputs win over the caller's.
    assert.equal(realize(model, 'calm', { danger: true }).bpm, 140);
    assert.equal(realize(model, 'modern', { danger: true }).bpm, 175);

    assert.deepEqual(model.stingers, [{ on: 'mutation', motif: 'theme', quantize: 'bar' }]);
    assert.equal(realize(model, 'nowhere'), null);
  });

  it('refuses inputs the score never declared, or values of the wrong kind', () => {
    const model = parseScore(fixture('score-minimal.json'));
    assert.throws(() => realize(model, 'ancient', { panic: true }), ScoreError);
    assert.throws(() => realize(model, 'ancient', { danger: 1 }), ScoreError);
    assert.throws(() => realize(model, 'ancient', { resistance: 2 }), ScoreError);
    assert.throws(() => realize(model, 'ancient', { mutation: true }), ScoreError);
  });

  it('refuses a score it cannot play, and says where', () => {
    refuses((s) => { s.version = 2; }, /^version$/);
    refuses((s) => { s.arrangements.ancient.stems.bass.part = [['H2', 16]]; }, /ancient\.stems\.bass\.part\[0\]/);
    refuses((s) => { s.arrangements.ancient.stems.bass.part = [['A2', 0], ['A2', 16]]; }, /bass\.part\[0\]/);
    refuses((s) => { s.arrangements.ancient.stems.bass.part = [['A2', 12]]; }, /ancient\.stems\.bass$/);
    refuses((s) => { s.arrangements.ancient.stems.lead.part = [{ motif: 'chorus' }]; }, /lead\.part\[0\]/);
    refuses((s) => { s.arrangements.ancient.stems.lead.part = [{ motif: 'pulse' }]; }, /lead\.part\[0\]/);
    refuses((s) => { s.arrangements.ancient.stems.drums.pattern = 'x.q.x.h.x.h.x.h.'; }, /drums\.pattern/);
    refuses((s) => { s.arrangements.ancient.stems.lead.timbre = 'organ'; }, /lead\.timbre/);
    refuses((s) => { s.arrangements.ancient.stems.lead.role = 'solo'; }, /lead\.role/);
    refuses((s) => { s.arrangements.modern.meter = [3, 3]; }, /modern\.meter/);
    refuses((s) => { s.arrangements.ancient.variants[0].when = { input: 'panic' }; }, /variants\[0\]\.when/);
    refuses((s) => { s.arrangements.ancient.variants[0].when = { input: 'mutation' }; }, /variants\[0\]\.when/);
    refuses((s) => { s.arrangements.ancient.variants[0].when = { input: 'resistance' }; }, /when/);
    refuses((s) => { s.arrangements.ancient.variants[0].when.atLeast = 1.5; }, /when/);
    refuses((s) => { s.variants[0].when = { input: 'danger', atLeast: 0.5 }; }, /^variants\[0\]\.when/);
    refuses((s) => { s.variants[0].transforms[0].op = 'reverse'; }, /transforms\[0\]/);
    refuses((s) => { s.variants[0].transforms[1].stem = 'lead'; }, /variants\[danger\]/);
    refuses((s) => { s.variants[0].transforms[1].hit = 't'; }, /variants\[danger\]/);
    refuses((s) => { s.arrangements.ancient.variants[0].stems = { horns: { part: [['A4', 16]] } }; }, /stems\.horns/);
    refuses((s) => { s.arrangements.ancient.variants[0].stems.bass.role = 'melody'; }, /bass\.role/);
    refuses((s) => { s.aliases.calm.arrangement = 'future'; }, /^aliases\.calm$/);
    refuses((s) => { s.aliases.modern = { arrangement: 'ancient' }; }, /^aliases\.modern$/);
    refuses((s) => { s.aliases.calm.inputs = { danger: 'no' }; }, /aliases\.calm\.inputs\.danger/);
    refuses((s) => { s.stingers[0].on = 'danger'; }, /stingers\[0\]\.on/);
    refuses((s) => { s.motifs.pulse.events = [['A4', 4]]; }, /^motifs\.pulse$/);
  });

  // The bound. A beat window wider than half a beat makes most actions "on the
  // beat" by accident; it has to hold at the fastest tempo a variant can reach,
  // not only at the written one.
  it('bounds the Sonotherapy window by the fastest tempo the music can reach', () => {
    // 90bpm is a 667ms beat, so 300ms passes as written. Danger makes it
    // 112.5bpm, a 533ms beat, and 300ms is then more than half of it.
    refuses((s) => { s.arrangements.ancient.sonotherapy = { windowMs: 300 }; }, /ancient\.sonotherapy\.windowMs/);
    const score = fixture('score-minimal.json');
    score.arrangements.ancient.sonotherapy = { windowMs: 260 };
    assert.doesNotThrow(() => parseScore(score));
    refuses((s) => { s.timing.sonotherapy.windowMs = 0; }, /timing\.sonotherapy\.windowMs/);

    const model = parseScore(SCORE);
    for (const arrangement of Object.values(model.arrangements)) {
      assert.ok(arrangement.sonotherapy.windowMs > 0, arrangement.id);
    }
  });
});

describe('the score drives the music', () => {
  // test/fixtures/tracks-golden.json is what audio.js played before the notes
  // moved into the score, captured from the old hard-coded TRACKS. The move
  // must not change one note, drum or tempo.
  const golden = fixture('tracks-golden.json');
  const round = (bpm) => Math.round(bpm * 1e6) / 1e6;

  it('plays every era, calm and in danger, exactly as before the move', () => {
    for (const [key, expected] of Object.entries(golden)) {
      const [name, danger] = key.split(':');
      const track = resolveTrack(name, danger === 'danger');
      assert.ok(track, key);
      assert.deepEqual({ ...track, bpm: round(track.bpm) }, expected, key);
    }
  });

  it('covers every arrangement and alias in the golden record', () => {
    const covered = new Set(Object.keys(golden).map((key) => key.split(':')[0]));
    for (const id of Object.keys(TRACKS)) assert.ok(covered.has(id), id);
    for (const alias of Object.keys(parseScore(SCORE).aliases)) assert.ok(covered.has(alias), alias);
  });
});
