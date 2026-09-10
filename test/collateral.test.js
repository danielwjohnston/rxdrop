import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Board, cell, collateralOf, isTolerant } from '../src/board.js';
import {
  COLLATERAL,
  COLLATERAL_BONUS,
  COLORS,
  COLOR_COUNT,
  PILL,
  RESISTANCE_MAX,
  TOLERANCE_AT,
  VIRUS,
} from '../src/constants.js';
import { Game, PHASE } from '../src/game.js';

/** A virus with a chosen amount of resistance already built up. */
function virusAt(color, resistance) {
  const c = cell(color, VIRUS, null);
  c.resistance = resistance;
  return c;
}

/** An empty bottle with a game around it, resistance on. */
function bareGame(options = {}) {
  const game = new Game({ seed: 5, level: 0, resistance: true, ...options });
  game.board.forEachCell((c, x, y) => game.board.set(x, y, null));
  game.startingViruses = 0;
  game.virusesClearedThisLevel = 0;
  game.totalVirusesCleared = 0;
  game.score = 0;
  return game;
}

const settle = (game, ms = 4000) => {
  for (let elapsed = 0; elapsed < ms; elapsed += 16) game.update(16);
};

describe('the collateral cycle', () => {
  it('sends every colour to a different one, and covers them all', () => {
    assert.equal(COLLATERAL.length, COLOR_COUNT);
    for (let color = 0; color < COLOR_COUNT; color += 1) {
      assert.notEqual(collateralOf(color), color, `colour ${color} answers to itself`);
    }
    assert.equal(new Set(COLLATERAL).size, COLOR_COUNT, 'the cycle must be a permutation');
  });

  it('takes two colours to get back where you started, never one', () => {
    // A cycle of three means the answer to a virus is never simply the virus
    // that answers to it - which keeps the rule from collapsing into a pair.
    for (let color = 0; color < COLOR_COUNT; color += 1) {
      assert.notEqual(collateralOf(collateralOf(color)), color);
      assert.equal(collateralOf(collateralOf(collateralOf(color))), color);
    }
  });
});

describe('tolerance', () => {
  it('starts below the mutation limit, so there is a window to use it', () => {
    assert.ok(TOLERANCE_AT > 0, 'a fresh virus is never already tolerant');
    assert.ok(TOLERANCE_AT < RESISTANCE_MAX, 'tolerance must arrive before the mutation');
  });

  it('only counts for viruses, and only past the threshold', () => {
    assert.equal(isTolerant(virusAt(COLORS.RED, TOLERANCE_AT - 1)), false);
    assert.equal(isTolerant(virusAt(COLORS.RED, TOLERANCE_AT)), true);
    assert.equal(isTolerant(cell(COLORS.RED, PILL, null)), false);
    assert.equal(isTolerant(null), false);
  });
});

describe('a tolerant virus and its own colour', () => {
  it('clears the medicine but leaves the virus standing', () => {
    const game = bareGame();
    const floor = game.board.height - 1;
    game.board.set(3, floor, virusAt(COLORS.RED, TOLERANCE_AT));
    for (const x of [0, 1, 2]) game.board.set(x, floor, cell(COLORS.RED, PILL, null));
    game.startingViruses = 1;

    game.beginResolution();
    assert.equal(game.resistedCells.length, 1, 'the virus should shrug the clear off');
    assert.equal(game.clearingCells.length, 3, 'the medicine still clears');

    settle(game);
    assert.ok(game.board.get(3, floor), 'the virus survives');
    assert.equal(game.virusesClearedThisLevel, 0, 'and is not counted as cured');
  });

  it('wears the tolerance down by one, so hammering is slow but never useless', () => {
    const game = bareGame();
    const floor = game.board.height - 1;
    game.board.set(3, floor, virusAt(COLORS.RED, TOLERANCE_AT));
    for (const x of [0, 1, 2]) game.board.set(x, floor, cell(COLORS.RED, PILL, null));
    game.startingViruses = 1;
    game.beginResolution();
    settle(game);
    assert.equal(game.board.get(3, floor).resistance, TOLERANCE_AT - 1);
    assert.equal(isTolerant(game.board.get(3, floor)), false, 'it is susceptible again');
  });

  it('scores nothing and breaks no cascade when the whole match shrugs', () => {
    const game = bareGame();
    const floor = game.board.height - 1;
    // Four tolerant viruses would never occur in play, but the rule has to hold
    // rather than spin: nothing dies, nothing scores, the turn comes back.
    for (const x of [0, 1, 2, 3]) game.board.set(x, floor, virusAt(COLORS.RED, TOLERANCE_AT));
    game.startingViruses = 4;

    game.beginResolution();
    assert.equal(game.clearingCells.length, 0);
    assert.equal(game.combo, 0, 'a shrug does not advance the cascade');
    assert.equal(game.score, 0);

    settle(game);
    assert.notEqual(game.phase, PHASE.CLEARING, 'it must not sit there forever');
    for (const x of [0, 1, 2, 3]) {
      assert.equal(game.board.get(x, floor).resistance, TOLERANCE_AT - 1);
    }
  });
});

describe('a tolerant virus and its collateral colour', () => {
  it('dies to a run of the older medicine cleared beside it', () => {
    const game = bareGame();
    const floor = game.board.height - 1;
    const cure = collateralOf(COLORS.RED);
    game.board.set(3, floor, virusAt(COLORS.RED, TOLERANCE_AT));
    for (const x of [4, 5, 6, 7]) game.board.set(x, floor, cell(cure, PILL, null));
    game.startingViruses = 1;

    game.beginResolution();
    assert.equal(game.outcome.collateral.length, 1);
    settle(game);
    assert.equal(game.board.get(3, floor), null, 'the virus is cured');
    assert.equal(game.virusesClearedThisLevel, 1, 'and counted, or the tally drifts');
  });

  it('pays double for it', () => {
    const collateralScore = (() => {
      const game = bareGame();
      const floor = game.board.height - 1;
      const cure = collateralOf(COLORS.RED);
      game.board.set(3, floor, virusAt(COLORS.RED, TOLERANCE_AT));
      for (const x of [4, 5, 6, 7]) game.board.set(x, floor, cell(cure, PILL, null));
      game.startingViruses = 1;
      game.beginResolution();
      return game.score;
    })();

    const plainScore = (() => {
      const game = bareGame();
      const floor = game.board.height - 1;
      game.board.set(3, floor, cell(COLORS.RED, VIRUS, null));
      for (const x of [0, 1, 2]) game.board.set(x, floor, cell(COLORS.RED, PILL, null));
      game.startingViruses = 1;
      game.beginResolution();
      return game.score;
    })();

    assert.ok(plainScore > 0);
    assert.equal(collateralScore, plainScore * COLLATERAL_BONUS);
  });

  it('does not touch a virus the clear never reached', () => {
    const game = bareGame();
    const floor = game.board.height - 1;
    const cure = collateralOf(COLORS.RED);
    // The run is two columns away, so it never touches the virus.
    game.board.set(0, floor, virusAt(COLORS.RED, TOLERANCE_AT));
    for (const x of [3, 4, 5, 6]) game.board.set(x, floor, cell(cure, PILL, null));
    game.startingViruses = 1;
    game.beginResolution();
    assert.equal(game.outcome.collateral.length, 0, 'a collateral clear has to touch');
  });

  it('leaves a susceptible virus alone - this is a tolerance rule, not a new clear', () => {
    const game = bareGame();
    const floor = game.board.height - 1;
    const cure = collateralOf(COLORS.RED);
    game.board.set(3, floor, cell(COLORS.RED, VIRUS, null));
    for (const x of [4, 5, 6, 7]) game.board.set(x, floor, cell(cure, PILL, null));
    game.startingViruses = 1;
    game.beginResolution();
    assert.equal(game.outcome.collateral.length, 0);
    settle(game);
    assert.ok(game.board.get(3, floor), 'an ordinary virus is untouched by a clear beside it');
  });

  it('kills a virus that was also shrugging off its own colour in the same match', () => {
    const game = bareGame();
    const floor = game.board.height - 1;
    const cure = collateralOf(COLORS.RED);
    // A red run through the virus, and a cure run directly above it.
    game.board.set(3, floor, virusAt(COLORS.RED, TOLERANCE_AT));
    for (const x of [0, 1, 2]) game.board.set(x, floor, cell(COLORS.RED, PILL, null));
    for (const x of [2, 3, 4, 5]) game.board.set(x, floor - 1, cell(cure, PILL, null));
    game.startingViruses = 1;

    game.beginResolution();
    assert.equal(game.outcome.collateral.length, 1, 'the older drug wins the argument');
    assert.equal(game.resistedCells.length, 0, 'so it is not also counted as shrugging');
    settle(game);
    assert.equal(game.board.get(3, floor), null);
  });
});

describe('the rule stays off when resistance is off', () => {
  it('clears a tolerant virus normally, because tolerance rides on resistance', () => {
    const game = bareGame({ resistance: false });
    const floor = game.board.height - 1;
    game.board.set(3, floor, virusAt(COLORS.RED, TOLERANCE_AT));
    for (const x of [0, 1, 2]) game.board.set(x, floor, cell(COLORS.RED, PILL, null));
    game.startingViruses = 1;
    game.beginResolution();
    assert.equal(game.resistedCells.length, 0);
    settle(game);
    assert.equal(game.board.get(3, floor), null);
    assert.equal(game.virusesClearedThisLevel, 1);
  });
});

describe('no virus is ever unanswerable', () => {
  it('always has at least one answer, whatever its state', () => {
    // The contraindication the whole formulary is built around. Every virus,
    // at every resistance level, must be killable by SOMETHING.
    for (let color = 0; color < COLOR_COUNT; color += 1) {
      for (let resistance = 0; resistance <= RESISTANCE_MAX; resistance += 1) {
        const board = new Board();
        const floor = board.height - 1;
        board.set(3, floor, virusAt(color, resistance));

        if (!isTolerant(board.get(3, floor))) {
          // Susceptible: its own colour still works.
          for (const x of [0, 1, 2]) board.set(x, floor, cell(color, PILL, null));
          board.resolve({ tolerance: true });
          assert.equal(board.get(3, floor), null, `plain clear failed at r=${resistance}`);
          continue;
        }

        // Tolerant: the collateral colour beside it works.
        const cure = collateralOf(color);
        for (const x of [4, 5, 6, 7]) board.set(x, floor, cell(cure, PILL, null));
        board.resolve({ tolerance: true });
        assert.equal(board.get(3, floor), null, `collateral clear failed at r=${resistance}`);
      }
    }
  });

  it('can always be worn back down to susceptible by its own colour alone', () => {
    // The second answer, for a board where no collateral run is available.
    const board = new Board();
    const floor = board.height - 1;
    board.set(3, floor, virusAt(COLORS.RED, RESISTANCE_MAX));
    for (let attempt = 0; attempt < RESISTANCE_MAX + 2; attempt += 1) {
      if (!board.get(3, floor)) break;
      for (const x of [0, 1, 2]) board.set(x, floor, cell(COLORS.RED, PILL, null));
      board.resolve({ tolerance: true });
    }
    assert.equal(board.get(3, floor), null, 'hammering with its own colour must eventually win');
  });

  it('terminates: resolve never spins on a board that only shrugs', () => {
    const board = new Board();
    const floor = board.height - 1;
    for (const x of [0, 1, 2, 3]) board.set(x, floor, virusAt(COLORS.RED, TOLERANCE_AT));
    const stages = board.resolve({ tolerance: true });
    assert.ok(stages.length <= 2, `resolve should stop, ran ${stages.length} stages`);
  });
});
