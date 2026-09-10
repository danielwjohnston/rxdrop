import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DISCOVERIES,
  DISCOVERY_IDS,
  Formulary,
  discoveriesIn,
  discoveryFor,
} from '../src/formulary.js';
import { ERAS } from '../src/eras.js';

describe('the discoveries', () => {
  it('cover every mechanic in a voice for every era', () => {
    for (const discovery of DISCOVERIES) {
      assert.match(discovery.id, /^[a-z]+$/);
      assert.ok(discovery.title.length > 3, `${discovery.id} has no title`);
      assert.ok(discovery.what.length > 20, `${discovery.id} does not say what you did`);
      for (const era of ERAS) {
        const note = discovery.notes[era.id];
        assert.ok(note, `${discovery.id} has nothing to say in ${era.id}`);
        assert.ok(note.length > 30, `${discovery.id} in ${era.id} is too thin`);
      }
      assert.equal(
        Object.keys(discovery.notes).length,
        ERAS.length,
        `${discovery.id} has a note for an era that does not exist`,
      );
    }
    assert.equal(new Set(DISCOVERY_IDS).size, DISCOVERIES.length, 'ids must be unique');
  });

  it('says something different in each era', () => {
    for (const discovery of DISCOVERIES) {
      const notes = Object.values(discovery.notes);
      assert.equal(new Set(notes).size, notes.length, `${discovery.id} repeats itself`);
    }
  });

  it('finds one by id', () => {
    assert.equal(discoveryFor('antibody').id, 'antibody');
    assert.equal(discoveryFor('nonsense'), undefined);
  });
});

describe('reading an event for discoveries', () => {
  it('notices what a clear evidences, and only what it evidences', () => {
    assert.deepEqual(discoveriesIn({ type: 'clear', combo: 1, collateral: 0, cured: 0 }), []);
    assert.deepEqual(discoveriesIn({ type: 'clear', combo: 2 }), ['cascade']);
    assert.deepEqual(discoveriesIn({ type: 'clear', combo: 1, collateral: 1 }), ['collateral']);
    assert.deepEqual(discoveriesIn({ type: 'clear', combo: 1, cured: 1 }), ['cure']);
    assert.deepEqual(discoveriesIn({ type: 'clear', combo: 1, washed: 2 }), ['washed']);
    assert.deepEqual(discoveriesIn({ type: 'clear', combo: 1, inTheDark: true }), ['dark']);
  });

  it('notices the rest of the mechanics', () => {
    assert.deepEqual(discoveriesIn({ type: 'resist', count: 1 }), ['tolerance']);
    assert.deepEqual(discoveriesIn({ type: 'mutate', count: 2, hybrids: 1 }), ['hybrid']);
    assert.deepEqual(discoveriesIn({ type: 'mutate', count: 2, hybrids: 0 }), []);
    assert.deepEqual(discoveriesIn({ type: 'antibody', count: 1 }), ['antibody']);
    assert.deepEqual(discoveriesIn({ type: 'spread', count: 1 }), ['outbreak']);
    assert.deepEqual(discoveriesIn({ type: 'unsealed', reason: 'cleared' }), ['seal']);
    // Expiring on its own is not something you did.
    assert.deepEqual(discoveriesIn({ type: 'unsealed', reason: 'expired' }), []);
  });

  it('ignores the events that are not discoveries', () => {
    for (const type of ['spawn', 'lock', 'move', 'rotate', 'pause', 'gameOver']) {
      assert.deepEqual(discoveriesIn({ type }), [], `${type} should not write anything down`);
    }
  });

  it('only ever names discoveries that exist', () => {
    const events = [
      { type: 'clear', combo: 4, collateral: 2, cured: 1, washed: 1, inTheDark: true },
      { type: 'resist', count: 3 },
      { type: 'mutate', count: 1, hybrids: 1 },
      { type: 'antibody', count: 1 },
      { type: 'spread', count: 2 },
      { type: 'unsealed', reason: 'cleared' },
    ];
    for (const event of events) {
      for (const id of discoveriesIn(event)) {
        assert.ok(DISCOVERY_IDS.includes(id), `${id} is not a discovery`);
      }
    }
  });
});

describe('the notebook', () => {
  it('starts blank', () => {
    const book = new Formulary();
    assert.equal(book.count, 0);
    assert.equal(book.has('antibody'), false);
    assert.deepEqual(book.notesFor('antibody', ['genetic']), []);
  });

  it('records a discovery once, then collects a note per era', () => {
    const book = new Formulary();
    assert.equal(book.record('hybrid', 'apothecary'), 'discovery');
    assert.equal(book.record('hybrid', 'apothecary'), null, 'the same era adds nothing');
    assert.equal(book.record('hybrid', 'genetic'), 'note');
    assert.equal(book.count, 1, 'a note is not a new discovery');
    assert.deepEqual(
      book.notesFor('hybrid', ['protomedicine', 'apothecary', 'patent', 'pharmaceutical', 'genetic']),
      ['apothecary', 'genetic'],
      'notes come back in ladder order, not the order they were found',
    );
  });

  it('refuses anything that is not a discovery in an era', () => {
    const book = new Formulary();
    assert.equal(book.record('nonsense', 'genetic'), null);
    assert.equal(book.record('hybrid', null), null);
    assert.equal(book.count, 0);
  });

  it('survives a round trip through storage', () => {
    const book = new Formulary();
    book.record('antibody', 'patent');
    book.record('antibody', 'genetic');
    book.record('dark', 'protomedicine');
    const back = Formulary.from(JSON.stringify(book));
    assert.equal(back.count, 2);
    assert.deepEqual(back.found.antibody.eras, ['patent', 'genetic']);
    assert.equal(back.found.antibody.first, 'patent');
  });

  it('shrugs off a store that is missing, broken or tampered with', () => {
    assert.equal(Formulary.from(null).count, 0);
    assert.equal(Formulary.from('not json at all').count, 0);
    assert.equal(Formulary.from('{"nonsense":{"first":"genetic"}}').count, 0);
    // An entry with no era is not an entry.
    assert.equal(Formulary.from('{"hybrid":{"eras":["genetic"]}}').count, 0);
    // Duplicates in a hand-edited store must not become duplicate notes.
    const dupes = Formulary.from('{"hybrid":{"first":"genetic","eras":["genetic","genetic"]}}');
    assert.deepEqual(dupes.found.hybrid.eras, ['genetic']);
  });

  it('can be filled in completely', () => {
    const book = new Formulary();
    for (const id of DISCOVERY_IDS) for (const era of ERAS) book.record(id, era.id);
    assert.equal(book.count, DISCOVERIES.length);
    for (const id of DISCOVERY_IDS) {
      assert.equal(book.notesFor(id, ERAS.map((e) => e.id)).length, ERAS.length);
    }
  });
});
