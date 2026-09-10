import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Board, generateLevel, hybridOf, virus } from '../src/board.js';
import { RESISTANCE_INTERVAL, RESISTANCE_MAX, VIRUS } from '../src/constants.js';
import { Game, PHASE } from '../src/game.js';
import { createRng } from '../src/rng.js';

describe('mutation', () => {
  it('ages every virus and flips the ones that reach the limit', () => {
    const board = new Board(4, 4);
    board.set(0, 3, virus(0, RESISTANCE_MAX - 1));
    board.set(2, 3, virus(1, 0));
    const mutated = board.mutateViruses(createRng(1), RESISTANCE_MAX);

    assert.equal(mutated.length, 1, 'only the ripe virus mutates');
    assert.equal(mutated[0].from, 0);
    assert.notEqual(board.get(0, 3).color, 0);
    assert.equal(board.get(0, 3).resistance, 0, 'mutating resets the clock');
    assert.equal(board.get(2, 3).resistance, 1, 'the other one just ages');
  });

  it('never mutates into a free clear', () => {
    // Three reds waiting, and a virus that would complete the row if it turned red.
    const board = Board.from(['....', '....', '....', 'rrrY']);
    board.set(3, 3, virus(1, RESISTANCE_MAX - 1));
    board.mutateViruses(createRng(2), RESISTANCE_MAX);
    assert.equal(board.findMatches().size, 0);
  });

  it('combines rather than mutating when the wrong medicine has been capping it', () => {
    // A yellow virus under blue. Turning red would complete the row and turning
    // blue the column, so it has nowhere to mutate - but it does have somewhere
    // to go: blue has been sitting on it, so it becomes green.
    const board = Board.from([
      '...b....',
      '...b....',
      '...b....',
      'rrrY....',
    ]);
    board.get(3, 3).resistance = RESISTANCE_MAX - 1;
    const mutated = board.mutateViruses(createRng(3), RESISTANCE_MAX);
    assert.equal(mutated.length, 1);
    assert.equal(mutated[0].hybrid, true);
    assert.equal(board.get(3, 3).color, hybridOf(1, 2), 'yellow under blue is green');
    assert.equal(board.findMatches().size, 0, 'and a hybrid completes no run, ever');
  });

  it('holds a virus at the limit when it can neither mutate nor combine', () => {
    // The same box, but nothing foreign has been capping it, so there is no
    // strain to combine with and every mutation would hand over a free clear.
    // Red completes the run on its left, blue the run on its right, and the
    // cell above is empty so nothing has been capping it to combine with.
    const board = Board.from([
      '........',
      '........',
      '........',
      'rrrYbbb.',
    ]);
    const virusCell = board.get(3, 3);
    virusCell.resistance = RESISTANCE_MAX - 1;
    const mutated = board.mutateViruses(createRng(3), RESISTANCE_MAX);
    assert.equal(mutated.length, 0);
    assert.equal(board.get(3, 3).color, 1, 'colour is unchanged');
    assert.equal(board.get(3, 3).resistance, RESISTANCE_MAX - 1, 'it waits, ripe');
    assert.equal(board.findMatches().size, 0);
  });

  it('reports how close the board is to mutating', () => {
    const board = new Board(4, 4);
    assert.equal(board.peakResistance(RESISTANCE_MAX), 0);
    board.set(0, 3, virus(0, 0));
    board.set(1, 3, virus(1, RESISTANCE_MAX - 1));
    assert.equal(board.peakResistance(RESISTANCE_MAX), (RESISTANCE_MAX - 1) / RESISTANCE_MAX);
  });

  it('staggers a generated level so they do not all flip at once', () => {
    const board = new Board();
    generateLevel(board, 10, createRng(5));
    const spread = new Set();
    board.forEachCell((c) => {
      if (c.type === VIRUS) spread.add(c.resistance);
    });
    assert.ok(spread.size > 1, `expected a spread of starting resistance, got ${[...spread]}`);
    for (const value of spread) assert.ok(value >= 0 && value < RESISTANCE_MAX);
  });
});

describe('resistance in play', () => {
  /**
   * Places capsules across the whole bottle rather than stacking them all on
   * the spawn column, so the board survives long enough to see a mutation.
   */
  const play = (game, pills) => {
    let frames = 0;
    let column = 0;
    while (game.pillsPlaced < pills && !game.isOver && frames < 60000) {
      frames += 1;
      if (game.phase === PHASE.FALLING) {
        if (game.pill.x < column) game.move(1);
        else if (game.pill.x > column) game.move(-1);
        else {
          game.hardDrop();
          column = (column + 3) % game.board.width;
        }
      }
      game.update(16);
    }
    return game;
  };

  it('is off unless the mode asks for it', () => {
    const game = new Game({ level: 3, seed: 21 });
    assert.equal(game.resistance, false);
    assert.equal(game.resistanceLevel, 0);
    play(game, RESISTANCE_INTERVAL + 2);
    assert.ok(!game.drainEvents().some((e) => e.type === 'mutate'));
  });

  it('mutates on the interval when it is on', () => {
    const game = new Game({ level: 3, seed: 21, resistance: true });
    play(game, RESISTANCE_INTERVAL + 2);
    const mutations = game.drainEvents().filter((e) => e.type === 'mutate');
    assert.ok(mutations.length > 0, 'a mutation should have fired by now');
    assert.ok(mutations[0].count > 0);
  });

  it('holds the next capsule while a mutation plays, then carries on', () => {
    const game = new Game({ level: 0, seed: 21, resistance: true });
    let sawMutating = false;
    let frames = 0;
    let column = 0;
    while (frames < 60000 && game.pillsPlaced < RESISTANCE_INTERVAL + 1 && !game.isOver) {
      frames += 1;
      if (game.phase === PHASE.FALLING) {
        if (game.pill.x < column) game.move(1);
        else if (game.pill.x > column) game.move(-1);
        else {
          game.hardDrop();
          column = (column + 3) % game.board.width;
        }
      }
      game.update(16);
      if (game.phase === PHASE.MUTATING) {
        sawMutating = true;
        assert.equal(game.pill, null, 'no capsule is in play mid-mutation');
      }
    }
    assert.ok(sawMutating, 'the mutation phase should be observable');
    assert.ok(!game.isOver, 'the run should still be alive');
    assert.equal(game.phase, PHASE.FALLING);
    assert.ok(game.pill, 'play resumes after the flash');
  });

  it('keeps the virus count honest across mutations', () => {
    const game = new Game({ level: 2, seed: 8, resistance: true });
    const start = game.startingViruses;
    play(game, RESISTANCE_INTERVAL * 2 + 1);
    assert.equal(game.virusesLeft + game.virusesClearedThisLevel, start);
  });

  it('never leaves an unresolved match after a mutation', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const game = new Game({ level: 8, seed, resistance: true });
      let frames = 0;
      let column = 0;
      while (frames < 60000 && !game.isOver && game.pillsPlaced < RESISTANCE_INTERVAL * 2) {
        frames += 1;
        if (game.phase === PHASE.FALLING) {
          if (game.pill.x < column) game.move(1);
          else if (game.pill.x > column) game.move(-1);
          else {
            game.hardDrop();
            column = (column + 3) % game.board.width;
          }
        }
        game.update(16);
        game.drainEvents();
        if (game.phase === PHASE.FALLING) {
          assert.equal(game.board.findMatches().size, 0, `seed ${seed} left a match`);
        }
      }
    }
  });
});
