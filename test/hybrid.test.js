import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  Board,
  cell,
  hybridOf,
  isHybrid,
  isTolerant,
  parentsOf,
  treatableFrom,
} from '../src/board.js';
import {
  COLORS,
  COLOR_COUNT,
  HYBRIDS,
  HYBRID_BASE,
  HYBRID_DECAY,
  PILL,
  RESISTANCE_MAX,
  VIRUS,
} from '../src/constants.js';
import { Game } from '../src/game.js';
import { createRng } from '../src/rng.js';

const GREEN = hybridOf(COLORS.YELLOW, COLORS.BLUE);

/** A hybrid virus with no deliveries against it yet. */
function strain(color = GREEN) {
  const c = cell(color, VIRUS, null);
  c.cured = [];
  c.decay = 0;
  return c;
}

function bareGame() {
  const game = new Game({ seed: 5, level: 0, resistance: true });
  game.board.forEachCell((c, x, y) => game.board.set(x, y, null));
  game.startingViruses = 0;
  game.virusesClearedThisLevel = 0;
  game.score = 0;
  return game;
}

const settle = (game, ms = 3000) => {
  for (let t = 0; t < ms; t += 16) game.update(16);
};

/** A run of four in a colour, laid where it touches (3, floor). */
function deliverRight(game, color) {
  const floor = game.board.height - 1;
  for (const x of [4, 5, 6, 7]) game.board.set(x, floor, cell(color, PILL, null));
}
function deliverAbove(game, color) {
  const floor = game.board.height - 1;
  for (let y = floor; y > floor - 4; y -= 1) game.board.set(2, y, cell(color, PILL, null));
}

describe('the hybrid set', () => {
  it('is one strain for each pair of medicines, and no more', () => {
    assert.equal(HYBRIDS.length, 3);
    const pairs = new Set(HYBRIDS.map((h) => [...h.parents].sort().join(',')));
    assert.equal(pairs.size, 3, 'each pair should combine to exactly one strain');
    for (const h of HYBRIDS) {
      assert.equal(h.parents.length, 2);
      assert.notEqual(h.parents[0], h.parents[1]);
      assert.ok(h.color >= HYBRID_BASE, 'a hybrid must not share a medicine colour');
    }
  });

  it('uses colours no capsule is ever dealt in', () => {
    // This is the whole trick: the matching engine is untouched, and a hybrid
    // simply can never be part of a run.
    const game = new Game({ seed: 3, level: 0 });
    for (let i = 0; i < 200; i += 1) {
      for (const color of game.drawColors()) {
        assert.ok(color < COLOR_COUNT, `a capsule was dealt in hybrid colour ${color}`);
      }
    }
  });

  it('combines in either order, and never with itself', () => {
    assert.equal(hybridOf(COLORS.YELLOW, COLORS.BLUE), hybridOf(COLORS.BLUE, COLORS.YELLOW));
    for (let color = 0; color < COLOR_COUNT; color += 1) {
      assert.equal(hybridOf(color, color), null);
    }
  });

  it('is not tolerant - it answers to a different rule entirely', () => {
    const c = strain();
    c.resistance = RESISTANCE_MAX;
    assert.equal(isTolerant(c), false);
    assert.equal(isHybrid(c), true);
  });
});

describe('a hybrid forming', () => {
  it('combines with the medicine that has been capping it', () => {
    const board = Board.from([
      '...b....',
      '...b....',
      '...b....',
      '...Y....',
    ]);
    board.get(3, 3).resistance = RESISTANCE_MAX - 1;
    const mutated = board.mutateViruses(createRng(1), RESISTANCE_MAX);
    assert.equal(mutated[0]?.hybrid, true);
    assert.equal(board.get(3, 3).color, GREEN, 'yellow under blue is green');
  });

  it('does not combine where it could never be treated from', () => {
    // Walled in by viruses on every side: a hybrid here would belong to no run
    // and have nowhere to deliver a parent, which is the one thing forbidden.
    const board = new Board(3, 3);
    board.set(1, 1, cell(COLORS.YELLOW, VIRUS, null));
    board.get(1, 1).resistance = RESISTANCE_MAX - 1;
    board.get(1, 1).cappedBy = COLORS.BLUE;
    for (const [x, y] of [[0, 1], [2, 1], [1, 0], [1, 2]]) {
      board.set(x, y, cell(COLORS.RED, VIRUS, null));
    }
    assert.equal(treatableFrom(board, 1, 1), 0);
    board.mutateViruses(createRng(2), RESISTANCE_MAX);
    assert.equal(isHybrid(board.get(1, 1)), false, 'it must mutate the old way instead');
  });

  it('stops ageing on the clock once it has combined', () => {
    const board = new Board(4, 4);
    board.set(1, 3, strain());
    board.mutateViruses(createRng(4), RESISTANCE_MAX);
    board.mutateViruses(createRng(5), RESISTANCE_MAX);
    assert.equal(isHybrid(board.get(1, 3)), true, 'a hybrid ages by delivery, not by time');
  });
});

describe('curing a hybrid', () => {
  it('shrugs off a line of one parent, but remembers it', () => {
    const game = bareGame();
    const floor = game.board.height - 1;
    game.board.set(3, floor, strain());
    deliverRight(game, COLORS.YELLOW);
    game.startingViruses = 1;

    game.beginResolution();
    assert.equal(game.cured.length, 0, 'one parent is not a cure');
    settle(game);
    const survivor = game.board.get(3, floor);
    assert.ok(survivor, 'it survives a single-colour clear');
    assert.deepEqual(survivor.cured, [COLORS.YELLOW], 'and books the delivery');
  });

  it('dies when the other parent arrives, even a turn later', () => {
    const game = bareGame();
    const floor = game.board.height - 1;
    game.board.set(3, floor, strain());
    deliverRight(game, COLORS.YELLOW);
    game.startingViruses = 1;
    game.beginResolution();
    settle(game);

    deliverRight(game, COLORS.BLUE);
    game.beginResolution();
    assert.equal(game.cured.length, 1);
    assert.equal(game.cured[0].antibody, false, 'delivered apart, so no compound');
    settle(game);
    assert.equal(game.board.get(3, floor), null, 'the strain is gone');
    assert.equal(game.virusesClearedThisLevel, 1, 'and counted');
  });

  it('synthesises an antibody when both parents land in one clear', () => {
    const game = bareGame();
    const floor = game.board.height - 1;
    game.board.set(3, floor, strain());
    deliverRight(game, COLORS.YELLOW);
    deliverAbove(game, COLORS.BLUE);
    // A bystander virus inside the ring the antibody takes.
    game.board.set(4, floor - 1, cell(COLORS.RED, VIRUS, null));
    game.startingViruses = 2;

    game.beginResolution();
    assert.equal(game.cured[0]?.antibody, true);
    assert.ok(game.score > 0, 'the hardest play in the game should pay');
    settle(game);
    assert.equal(game.board.get(3, floor), null, 'the strain is gone');
    assert.equal(game.board.get(4, floor - 1), null, 'and the ring around it with it');
    assert.equal(game.virusesClearedThisLevel, 2, 'both count toward the level');
  });

  it('synthesises an antibody across a cascade, not just a single clear', () => {
    // The play the design is actually about: a yellow run clears, blue halves
    // fall into the gap it left and complete a blue run of their own, and the
    // two parents delivered one stage apart are still one compound.
    const game = bareGame();
    const floor = game.board.height - 1;
    game.board.set(3, floor, strain());
    deliverRight(game, COLORS.YELLOW);
    // Four blues on four different rows: no run until the yellow underneath
    // them goes and they all land on the floor together.
    for (const [x, y] of [[4, 1], [5, 2], [6, 3], [7, 4]]) {
      game.board.set(x, floor - y, cell(COLORS.BLUE, PILL, null));
    }
    game.startingViruses = 1;

    game.beginResolution();
    assert.equal(game.cured.length, 0, 'the first stage only delivers yellow');
    let antibodies = 0;
    for (let t = 0; t < 3000; t += 16) {
      game.update(16);
      for (const e of game.drainEvents()) if (e.type === 'antibody') antibodies += e.count;
    }
    assert.equal(game.board.get(3, floor), null, 'the strain is gone');
    assert.equal(antibodies, 1, 'and it went to a compound, not two lone doses');
  });

  it('pays more for the compound than for the same cure delivered apart', () => {
    const apart = (() => {
      const game = bareGame();
      const floor = game.board.height - 1;
      game.board.set(3, floor, strain());
      deliverRight(game, COLORS.YELLOW);
      game.startingViruses = 1;
      game.beginResolution();
      settle(game);
      game.score = 0;
      deliverRight(game, COLORS.BLUE);
      game.beginResolution();
      return game.score;
    })();

    const together = (() => {
      const game = bareGame();
      const floor = game.board.height - 1;
      game.board.set(3, floor, strain());
      deliverRight(game, COLORS.YELLOW);
      deliverAbove(game, COLORS.BLUE);
      game.startingViruses = 1;
      game.beginResolution();
      return game.score;
    })();

    assert.ok(together > apart, `compound ${together} should beat apart ${apart}`);
  });
});

describe('a hybrid is never a dead end', () => {
  it('decays to an ordinary virus under one parent alone', () => {
    // The safety valve. If the other parent can never be delivered, hammering
    // with the one you have still wins in the end.
    const game = bareGame();
    const floor = game.board.height - 1;
    game.board.set(3, floor, strain());
    game.startingViruses = 1;

    for (let attempt = 0; attempt <= HYBRID_DECAY + 1; attempt += 1) {
      const here = game.board.get(3, floor);
      if (!here || !isHybrid(here)) break;
      deliverRight(game, COLORS.YELLOW);
      game.beginResolution();
      settle(game);
    }
    const final = game.board.get(3, floor);
    assert.ok(final, 'it should still be there, just no longer a hybrid');
    assert.equal(isHybrid(final), false, 'one colour alone must eventually break it');
    assert.equal(final.color, COLORS.YELLOW, 'into the colour that has been hitting it');
  });

  it('can then be cleared by an ordinary line, like any virus', () => {
    const game = bareGame();
    const floor = game.board.height - 1;
    const decayed = cell(COLORS.YELLOW, VIRUS, null);
    game.board.set(3, floor, decayed);
    for (const x of [0, 1, 2]) game.board.set(x, floor, cell(COLORS.YELLOW, PILL, null));
    game.startingViruses = 1;
    game.beginResolution();
    settle(game);
    assert.equal(game.board.get(3, floor), null);
  });

  it('every strain has both parents reachable as separate deliveries', () => {
    for (const { color } of HYBRIDS) {
      const parents = parentsOf(color);
      assert.equal(parents.length, 2);
      const game = bareGame();
      const floor = game.board.height - 1;
      game.board.set(3, floor, strain(color));
      game.startingViruses = 1;
      for (const parent of parents) {
        deliverRight(game, parent);
        game.beginResolution();
        settle(game);
      }
      assert.equal(game.board.get(3, floor), null, `strain ${color} survived both parents`);
    }
  });
});
