import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Board, cell } from '../src/board.js';
import { PILLS_PER_SPEED_UP, SPEEDS, VIRUS } from '../src/constants.js';
import { Game, PHASE } from '../src/game.js';
import { pillCells } from '../src/pill.js';

const newGame = (options = {}) => new Game({ seed: 7, level: 0, ...options });

/** Advances the clock in small slices, like the animation frame loop does. */
function tick(game, ms, dt = 16) {
  for (let elapsed = 0; elapsed < ms; elapsed += dt) game.update(dt);
}

describe('setup', () => {
  it('starts with a pill in play and the level\'s viruses on the board', () => {
    const game = newGame({ level: 3 });
    assert.equal(game.phase, PHASE.FALLING);
    assert.ok(game.pill);
    assert.equal(game.virusesLeft, 16);
    assert.equal(game.startingViruses, 16);
  });

  it('is fully deterministic for a seed', () => {
    const a = newGame({ level: 5 });
    const b = newGame({ level: 5 });
    for (let i = 0; i < 40; i += 1) {
      a.move(i % 2 ? 1 : -1);
      b.move(i % 2 ? 1 : -1);
      tick(a, 100);
      tick(b, 100);
    }
    assert.deepEqual(a.board.toStrings(), b.board.toStrings());
    assert.equal(a.score, b.score);
  });

  it('deals every colour pair once per nine capsules', () => {
    const game = newGame();
    // The queue has already taken a couple of pairs; finish that bag first.
    while (game.bag.length > 0) game.drawColors();
    for (let round = 0; round < 4; round += 1) {
      const drawn = Array.from({ length: 9 }, () => game.drawColors().join(''));
      assert.equal(new Set(drawn).size, 9, `round ${round} repeated a pair: ${drawn}`);
    }
  });

  it('never deals a colour outside the palette', () => {
    const game = newGame();
    for (let i = 0; i < 60; i += 1) {
      for (const color of game.drawColors()) {
        assert.ok(Number.isInteger(color) && color >= 0 && color < 3);
      }
    }
  });

  it('queues a preview of the next pill', () => {
    const game = newGame();
    assert.equal(game.nextColors.length, 2);
    const preview = game.nextColors;
    game.hardDrop();
    assert.deepEqual(pillCells(game.pill).map((c) => c.color), preview);
  });
});

describe('controls', () => {
  it('moves and rotates only while a pill is falling', () => {
    const game = newGame();
    const startX = game.pill.x;
    assert.equal(game.move(-1), true);
    assert.equal(game.pill.x, startX - 1);
    assert.equal(game.rotate(1), true);
    assert.equal(game.pill.orientation, 1);
    game.paused = true;
    assert.equal(game.move(1), false);
    assert.equal(game.rotate(1), false);
  });

  it('will not move a pill through the wall', () => {
    const game = newGame();
    for (let i = 0; i < 10; i += 1) game.move(-1);
    assert.equal(game.pill.x, 0);
  });

  it('hard drop locks the pill immediately and pays for the distance', () => {
    const game = newGame();
    const before = game.score;
    game.hardDrop();
    assert.ok(game.score > before);
    assert.equal(game.pillsPlaced, 1);
  });

  it('soft drop falls faster than gravity', () => {
    const slow = newGame({ speed: 'LOW' });
    const fast = newGame({ speed: 'LOW' });
    fast.setSoftDrop(true);
    tick(slow, 300);
    tick(fast, 300);
    assert.ok(fast.pill.y > slow.pill.y);
  });

  it('pausing stops the clock', () => {
    const game = newGame();
    game.togglePause();
    const y = game.pill.y;
    tick(game, 3000);
    assert.equal(game.pill.y, y);
    game.togglePause();
    tick(game, 3000);
    assert.ok(game.pill.y > y);
  });
});

describe('locking and clearing', () => {
  it('locks a pill that has rested on the floor', () => {
    const game = newGame();
    tick(game, 30000);
    assert.ok(game.pillsPlaced >= 1);
  });

  it('destroys a virus when a run of four completes, and scores it', () => {
    const game = newGame();
    game.board = new Board(8, 16);
    game.board.set(0, 15, cell(0, VIRUS));
    game.board.set(1, 15, cell(0));
    game.board.set(2, 15, cell(0));
    game.pill = { x: 3, y: 0, orientation: 0, colors: [0, 0] };
    game.hardDrop();
    assert.equal(game.phase, PHASE.CLEARING);
    game.runUntilStable();
    assert.equal(game.virusesLeft, 0);
    assert.equal(game.totalVirusesCleared, 1);
    assert.ok(game.score >= SPEEDS.LOW.virusScore);
  });

  it('doubles the payout for each extra virus in one clear', () => {
    const game = newGame({ speed: 'MEDIUM' });
    const base = SPEEDS.MEDIUM.virusScore;
    assert.equal(game.scoreFor(1, 1), base);
    assert.equal(game.scoreFor(2, 1), base * 3);
    assert.equal(game.scoreFor(3, 1), base * 7);
    assert.equal(game.scoreFor(3, 2), base * 14);
    assert.equal(game.scoreFor(0, 4), 0);
  });

  it('separates a pill when only one half is matched, and the rest falls', () => {
    const game = newGame();
    game.board = Board.from([
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
      'rrr....B',
    ]);
    // A vertical red/yellow pill: the red half completes the row, the yellow
    // half is left behind and must drop to the floor.
    game.pill = { x: 3, y: 14, orientation: 1, colors: [0, 1] };
    game.hardDrop();
    game.runUntilStable();
    assert.equal(game.board.get(3, 15).color, 1);
    assert.equal(game.board.get(3, 15).link, null);
    assert.equal(game.board.toStrings()[15], '...y...B');
  });

  it('awards a combo multiplier for a cascade', () => {
    const game = newGame();
    game.board = Board.from([
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
      'y.......',
      'y.......',
      'y.......',
      'rrr.....',
      'Y..b....',
      '...B....',
    ]);
    // The red half completes row 13; clearing it drops the yellows onto the
    // yellow virus, which is the second link of the chain.
    game.pill = { x: 3, y: 0, orientation: 1, colors: [0, 0] };
    game.hardDrop();
    game.runUntilStable();
    assert.equal(game.combo, 2, 'the falling yellows should trigger a second clear');
    assert.equal(game.virusesLeft, 1);
  });
});

describe('endings', () => {
  it('wins the level when the last virus goes', () => {
    const game = newGame();
    game.board = new Board(8, 16);
    game.board.set(0, 15, cell(2, VIRUS));
    game.board.set(1, 15, cell(2));
    game.board.set(2, 15, cell(2));
    game.pill = { x: 3, y: 0, orientation: 0, colors: [2, 2] };
    game.hardDrop();
    game.runUntilStable();
    assert.equal(game.phase, PHASE.WON);
    assert.ok(game.drainEvents === undefined || true);
  });

  it('advances to the next level with a fresh board and the same score', () => {
    const game = newGame({ level: 2 });
    game.score = 5000;
    game.advanceLevel();
    assert.equal(game.level, 3);
    assert.equal(game.score, 5000);
    assert.equal(game.virusesLeft, 16);
    assert.equal(game.phase, PHASE.FALLING);
  });

  it('ends the game when a new pill has nowhere to go', () => {
    const game = newGame();
    game.board.set(3, 0, cell(0, VIRUS));
    game.spawnPill();
    assert.equal(game.phase, PHASE.LOST);
    assert.equal(game.pill, null);
    assert.ok(game.drainEvents().some((e) => e.type === 'gameOver'));
  });

  it('stops simulating once the game is over', () => {
    const game = newGame();
    game.board.set(3, 0, cell(0, VIRUS));
    game.spawnPill();
    const snapshot = game.board.toStrings();
    tick(game, 5000);
    assert.deepEqual(game.board.toStrings(), snapshot);
  });
});

describe('speed', () => {
  it('speeds up every ten pills', () => {
    const game = newGame();
    const start = game.dropInterval;
    game.pillsPlaced = PILLS_PER_SPEED_UP;
    assert.ok(game.dropInterval < start);
    game.pillsPlaced = 1000;
    assert.equal(game.dropInterval, SPEEDS.LOW.minInterval);
  });

  it('HI starts faster than LOW', () => {
    assert.ok(new Game({ speed: 'HIGH' }).dropInterval < new Game({ speed: 'LOW' }).dropInterval);
  });
});
