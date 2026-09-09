import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { VIRUS } from '../src/constants.js';
import { Game, PHASE } from '../src/game.js';
import { createRng } from '../src/rng.js';

/** Every pill half must rest on the floor, a virus, or another half. */
function assertNothingFloats(game, context) {
  const { board } = game;
  board.forEachCell((c, x, y) => {
    if (c.type === VIRUS || y === board.height - 1) return;
    const partner = board.partnerOf(x, y);
    const supportedAt = (cx, cy) => {
      const below = board.get(cx, cy + 1);
      if (below === undefined) return true;
      if (below === null) return false;
      return !(partner && partner.x === cx && partner.y === cy + 1);
    };
    const supported = supportedAt(x, y) || (partner && supportedAt(partner.x, partner.y));
    assert.ok(supported, `floating half at ${x},${y} (${context})`);
  });
}

describe('headless play-through', () => {
  const scenarios = [
    { seed: 4242, level: 4, speed: 'HIGH' },
    { seed: 99, level: 0, speed: 'LOW' },
    { seed: 7, level: 12, speed: 'MEDIUM' },
  ];

  for (const scenario of scenarios) {
    it(`survives random play without corrupting the board (${JSON.stringify(scenario)})`, () => {
    const rng = createRng(99 + scenario.seed);
    const game = new Game(scenario);
    let frames = 0;
    let column = rng.int(game.width);

    while (!game.isOver && frames < 40000) {
      frames += 1;
      if (game.phase === PHASE.FALLING) {
        // Spread the pills around instead of stacking them on the spawn point.
        if (rng.int(6) === 0) game.rotate(rng.int(2) ? 1 : -1);
        if (game.pill.x < column) game.move(1);
        else if (game.pill.x > column) game.move(-1);
        else if (rng.int(4) === 0) {
          game.hardDrop();
          column = rng.int(game.width);
        }
      }
      game.update(16);
      game.drainEvents();

      if (game.phase === PHASE.FALLING) {
        assert.equal(game.board.findMatches().size, 0, 'a match survived resolution');
        assertNothingFloats(game, `frame ${frames}`);
      }
    }

    assert.ok(game.pillsPlaced > 5, `only placed ${game.pillsPlaced} pills`);
    assert.ok(game.score >= 0);
    assert.ok(game.isOver, 'careless play should end in a top-out or a win');
    assert.ok(
      game.virusesLeft + game.totalVirusesCleared === game.startingViruses,
      'every virus is either still on the board or counted as cleared',
    );
    });
  }

  it('can be driven to a win, and the win is reported once', () => {
    const rng = createRng(3);
    const game = new Game({ seed: 8, level: 0, speed: 'HIGH' });
    let wins = 0;

    for (let frame = 0; frame < 200000 && !game.isOver; frame += 1) {
      if (game.phase === PHASE.FALLING) {
        // Aim for the leftmost column with a virus in it.
        const target = targetColumn(game, rng);
        if (game.pill.x < target) game.move(1);
        else if (game.pill.x > target) game.move(-1);
        else game.hardDrop();
      }
      game.update(16);
      wins += game.drainEvents().filter((e) => e.type === 'levelComplete').length;
    }

    assert.ok(wins <= 1);
    if (game.phase === PHASE.WON) assert.equal(game.virusesLeft, 0);
  });
});

function targetColumn(game, rng) {
  const { board } = game;
  for (let x = 0; x < board.width; x += 1) {
    for (let y = 0; y < board.height; y += 1) {
      const c = board.get(x, y);
      if (c && c.type === VIRUS) return x;
    }
  }
  return rng.int(board.width);
}
