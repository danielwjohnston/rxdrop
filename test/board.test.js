import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Board, cell, generateLevel, virusTopRow } from '../src/board.js';
import { LINK, PILL, VIRUS } from '../src/constants.js';
import { createRng } from '../src/rng.js';

describe('Board.from', () => {
  it('round-trips through toStrings, uppercase meaning virus', () => {
    const rows = ['....', '.ry.', 'RRBB'];
    assert.deepEqual(Board.from(rows).toStrings(), rows);
  });
});

describe('findMatches', () => {
  it('finds a horizontal run of four', () => {
    const board = Board.from(['rrrr', '....']);
    assert.deepEqual([...board.findMatches()].sort(), ['0,0', '1,0', '2,0', '3,0']);
  });

  it('ignores runs of three', () => {
    const board = Board.from(['rrr.', 'r...', 'r...', 'y...']);
    assert.equal(board.findMatches().size, 0);
  });

  it('finds a vertical run and includes viruses', () => {
    const board = Board.from(['r...', 'r...', 'R...', 'r...']);
    assert.equal(board.findMatches().size, 4);
  });

  it('counts an intersection once and keeps both arms', () => {
    const board = Board.from(['...r', '...r', '...r', 'rrrr']);
    assert.equal(board.findMatches().size, 7);
  });

  it('does not match across a colour change', () => {
    const board = Board.from(['rrryrr', '......']);
    assert.equal(board.findMatches().size, 0);
  });
});

describe('clearCells', () => {
  it('reports viruses and halves separately and empties the cells', () => {
    const board = Board.from(['RRrr']);
    const result = board.clearCells(board.findMatches());
    assert.equal(result.viruses, 2);
    assert.equal(result.halves, 2);
    assert.deepEqual(board.toStrings(), ['....']);
  });

  it('orphans the surviving half of a broken pill', () => {
    const board = new Board(4, 2);
    board.set(0, 0, cell(0, PILL, LINK.DOWN));
    board.set(0, 1, cell(0, PILL, LINK.UP));
    board.clearCells(['0,0']);
    assert.equal(board.get(0, 1).link, null);
  });
});

describe('gravity', () => {
  it('drops a floating half to the floor', () => {
    const board = Board.from(['r...', '....', '....']);
    board.settle();
    assert.deepEqual(board.toStrings(), ['....', '....', 'r...']);
  });

  it('never moves viruses', () => {
    const board = Board.from(['R...', '....']);
    assert.equal(board.stepGravity(), false);
  });

  it('keeps a linked pair together when one half is over a hole', () => {
    const board = new Board(4, 3);
    board.set(0, 0, cell(0, PILL, LINK.RIGHT));
    board.set(1, 0, cell(1, PILL, LINK.LEFT));
    board.settle();
    assert.equal(board.get(0, 2).color, 0);
    assert.equal(board.get(1, 2).color, 1);
  });

  it('holds a pair up when only one half is supported', () => {
    const board = new Board(4, 3);
    board.set(0, 1, cell(0, PILL, LINK.RIGHT));
    board.set(1, 1, cell(1, PILL, LINK.LEFT));
    board.set(0, 2, cell(2, VIRUS));
    assert.equal(board.stepGravity(), false);
  });

  it('lets a stack fall in order', () => {
    const board = Board.from(['r...', 'y...', '....', '....']);
    board.settle();
    assert.deepEqual(board.toStrings(), ['....', '....', 'r...', 'y...']);
  });
});

describe('resolve', () => {
  it('cascades: a clear drops a stack that clears again', () => {
    const board = Board.from([
      '....',
      'y...',
      'y...',
      'y...',
      'rrrr',
      'y...',
      '....',
      '....',
    ]);
    const stages = board.resolve();
    assert.equal(stages.length, 2, 'the falling yellows should complete a second match');
    assert.equal(stages[0].halves, 4);
    assert.deepEqual(board.toStrings(), new Array(8).fill('....'));
  });
});

describe('generateLevel', () => {
  it('places 4 * (level + 1) viruses at every level', () => {
    for (let level = 0; level <= 20; level += 1) {
      for (const seed of [1, 77, 5150]) {
        const board = new Board();
        generateLevel(board, level, createRng(seed));
        assert.equal(
          board.countViruses(),
          4 * (level + 1),
          `level ${level} seed ${seed} came up short`,
        );
      }
    }
  });

  it('raises the virus ceiling with the level, but never past row 3', () => {
    const board = new Board();
    assert.equal(virusTopRow(board, 0), 6);
    assert.equal(virusTopRow(board, 3), 6);
    assert.equal(virusTopRow(board, 4), 5);
    assert.equal(virusTopRow(board, 8), 4);
    assert.equal(virusTopRow(board, 12), 3);
    assert.equal(virusTopRow(board, 20), 3);
  });

  it('keeps viruses below the level\'s ceiling', () => {
    for (const level of [0, 5, 11, 20]) {
      const board = new Board();
      generateLevel(board, level, createRng(level * 13 + 1));
      const ceiling = virusTopRow(board, level);
      board.forEachCell((c, x, y) => {
        if (c.type === VIRUS) assert.ok(y >= ceiling, `virus at row ${y}, ceiling ${ceiling}`);
      });
    }
  });

  it('is deterministic for a seed', () => {
    const a = new Board();
    const b = new Board();
    generateLevel(a, 7, createRng(1234));
    generateLevel(b, 7, createRng(1234));
    assert.deepEqual(a.toStrings(), b.toStrings());
  });

  it('never starts with a line of three or a ready-made match', () => {
    for (let seed = 0; seed < 25; seed += 1) {
      const board = new Board();
      generateLevel(board, 15, createRng(seed));
      assert.equal(board.findMatches(3).size, 0, `seed ${seed} had a run of three`);
    }
  });

  it('leaves the neck of the bottle clear', () => {
    const board = new Board();
    generateLevel(board, 20, createRng(9));
    for (let x = 0; x < board.width; x += 1) {
      for (let y = 0; y < 3; y += 1) assert.equal(board.get(x, y), null);
    }
  });
});
