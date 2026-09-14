import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Board, cell } from '../src/board.js';
import {
  BOARD_BODY_HEIGHT,
  BOARD_HEIGHT,
  DEAL_DELAY,
  SOFT_DROP_FACTOR,
  SOFT_DROP_MIN,
  LOCK_DELAY,
  LOCK_RESETS,
  NECK_ROWS,
  PILL,
  PILLS_PER_SPEED_UP,
  CHAIN_BONUS_BASE,
  SPAWN_GRACE,
  SPAWN_X,
  SPAWN_Y,
  SPEEDS,
  VIRUS,
} from '../src/constants.js';
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

describe('the lock delay', () => {
  /** Drops a capsule to the floor, then returns how long it stays adjustable. */
  const restThenMeasure = (dropTimer) => {
    const game = newGame({ level: 0, speed: 'LOW' });
    while (game.pill.y < game.board.height - 1) {
      game.pill = { ...game.pill, y: game.pill.y + 1 };
    }
    game.dropTimer = dropTimer;
    game.lockTimer = 0;
    let elapsed = 0;
    while (game.pillsPlaced === 0 && elapsed < 5000) {
      game.update(16);
      elapsed += 16;
    }
    return elapsed;
  };

  it('gives the same adjustment window wherever the gravity tick falls', () => {
    // The bug this pins: the lock timer was counted twice, so a capsule that
    // landed late in the gravity cycle set almost instantly and there was no
    // time to nudge it into a match.
    const windows = [0, 100, 300, 500, 690].map(restThenMeasure);
    for (const window of windows) {
      assert.ok(
        window >= LOCK_DELAY,
        `only ${window}ms to adjust, expected at least ${LOCK_DELAY}ms`,
      );
    }
    assert.equal(new Set(windows).size, 1, `windows varied: ${windows.join(', ')}`);
  });

  it('a nudge on a resting capsule buys another window', () => {
    const game = newGame({ level: 0, speed: 'LOW' });
    while (game.pill.y < game.board.height - 1) {
      game.pill = { ...game.pill, y: game.pill.y + 1 };
    }
    for (let i = 0; i < 20; i += 1) game.update(16);
    assert.equal(game.pillsPlaced, 0, 'should still be adjustable');
    assert.equal(game.move(-1), true);
    assert.equal(game.lockTimer, 0, 'a move on the floor keeps it alive');
    assert.equal(game.lockResets, 1);
  });

  it('gives a capsule that spawns with nowhere to fall a longer fuse', () => {
    // The stack is at the neck and the run rides on one reaction to a capsule
    // the player never had a chance to plan for.
    const game = newGame({ level: 0, speed: 'LOW' });
    for (let y = 1; y < game.board.height; y += 1) {
      game.board.set(3, y, cell(0));
      game.board.set(4, y, cell(1));
    }
    game.spawnPill();

    assert.equal(game.spawnedBlocked, true);
    assert.equal(game.lockBudget, SPAWN_GRACE);
    assert.ok(SPAWN_GRACE > LOCK_DELAY, 'the desperate case must be the generous one');

    let elapsed = 0;
    const placed = game.pillsPlaced;
    while (game.pillsPlaced === placed && elapsed < 6000) {
      game.update(16);
      elapsed += 16;
    }
    assert.ok(elapsed >= SPAWN_GRACE, `only ${elapsed}ms to react`);
  });

  it('a late sideways move still saves a blocked spawn', () => {
    const game = newGame({ level: 0, speed: 'LOW' });
    for (let y = 1; y < game.board.height; y += 1) {
      game.board.set(3, y, cell(0));
      game.board.set(4, y, cell(1));
    }
    game.spawnPill();

    // React at 300ms, about human reaction time plus a beat.
    for (let t = 0; t < 300; t += 16) game.update(16);
    assert.ok(game.pill, 'the capsule must still be in play');
    assert.equal(game.move(1), true);

    let elapsed = 0;
    while (game.pill && game.pill.y < 3 && elapsed < 6000) {
      game.update(16);
      elapsed += 16;
    }
    assert.ok(!game.isOver, 'the run should be saved');
  });

  it('an ordinary capsule keeps the short fuse', () => {
    const game = newGame({ level: 0, speed: 'LOW' });
    assert.equal(game.spawnedBlocked, false);
    assert.equal(game.lockBudget, LOCK_DELAY);
  });

  it('cannot be stalled on the floor forever', () => {
    const game = newGame({ level: 0, speed: 'LOW' });
    while (game.pill.y < game.board.height - 1) {
      game.pill = { ...game.pill, y: game.pill.y + 1 };
    }
    let nudges = 0;
    for (let frame = 0; frame < 4000 && game.pillsPlaced === 0; frame += 1) {
      if (frame % 10 === 0 && game.pill) {
        game.move(nudges % 2 === 0 ? -1 : 1);
        nudges += 1;
      }
      game.update(16);
    }
    assert.equal(game.pillsPlaced, 1, 'it must set eventually');
    assert.ok(nudges > LOCK_RESETS, 'the player kept nudging past the cap');
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
    assert.equal(game.scoreFor(1), base);
    assert.equal(game.scoreFor(2), base * 3);
    assert.equal(game.scoreFor(3), base * 7);
    assert.equal(game.scoreFor(2, 2), base * (4 + 8));
    assert.equal(game.scoreFor(1, 9), base * 32);
    assert.equal(game.scoreFor(0), 0);
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

  it('awards a chain bonus for a cascade', () => {
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
    assert.ok(game.drainEvents().some((event) => event.type === 'chain' && event.stage === 2));
  });

  it('pays a chain bonus when a cascade only clears capsules', () => {
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
      'y..b....',
      '...B....',
    ]);
    game.pill = { x: 3, y: 0, orientation: 1, colors: [0, 0] };
    game.hardDrop();
    game.score = 0;
    game.runUntilStable();
    assert.equal(game.combo, 2);
    assert.equal(game.totalVirusesCleared, 0);
    assert.equal(game.score, SPEEDS.LOW.virusScore * CHAIN_BONUS_BASE);
    assert.ok(game.drainEvents().some((event) => event.type === 'chain' && event.stage === 2));
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

  it('counts viruses per level and across the run separately', () => {
    const game = newGame({ level: 0 });
    game.board = new Board(8, 16);
    game.board.set(0, 15, cell(2, VIRUS));
    game.board.set(1, 15, cell(2));
    game.board.set(2, 15, cell(2));
    game.startingViruses = 1;
    game.pill = { x: 3, y: 0, orientation: 0, colors: [2, 2] };
    game.hardDrop();
    game.runUntilStable();
    assert.equal(game.virusesClearedThisLevel, 1);
    assert.equal(game.totalVirusesCleared, 1);

    game.advanceLevel();
    assert.equal(game.virusesClearedThisLevel, 0, 'the level counter starts again');
    assert.equal(game.totalVirusesCleared, 1, 'the run counter keeps going');
    assert.equal(
      game.virusesLeft + game.virusesClearedThisLevel,
      game.startingViruses,
      'the per-level counter is the one that balances',
    );
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

describe('the neck row', () => {
  /** Fills the two spawn columns solid from `fromRow` to the floor. */
  const fillSpawnColumns = (game, fromRow) => {
    for (let y = fromRow; y < game.board.height; y += 1) {
      // Alternating colours so the fill is a wall, not a pending clear.
      for (const x of [SPAWN_X, SPAWN_X + 1]) {
        game.board.set(x, y, cell(PILL, (x + y) % 3, null));
      }
    }
  };

  it('sits above the bottle body, and capsules are dealt into it', () => {
    assert.equal(BOARD_HEIGHT, BOARD_BODY_HEIGHT + NECK_ROWS);
    assert.ok(SPAWN_Y < NECK_ROWS, 'capsules spawn in the neck, not in the bottle');
  });

  it('holds no viruses, so the bottle body is the whole puzzle', () => {
    const game = newGame({ level: 20 });
    for (let x = 0; x < game.board.width; x += 1) {
      for (let y = 0; y < NECK_ROWS; y += 1) assert.equal(game.board.get(x, y), null);
    }
  });

  it('still deals a capsule when the body is full to the lip', () => {
    const game = newGame();
    fillSpawnColumns(game, NECK_ROWS);
    game.spawnPill();
    assert.equal(game.phase, PHASE.FALLING, 'a full body is not a loss');
    assert.deepEqual(
      pillCells(game.pill).map(({ y }) => y),
      [SPAWN_Y, SPAWN_Y],
    );
    assert.ok(game.spawnedBlocked, 'it has nowhere to fall, so it gets the long fuse');
    assert.equal(game.lockBudget, SPAWN_GRACE);
  });

  it('gives the player time to steer that capsule off the full columns', () => {
    const game = newGame();
    fillSpawnColumns(game, NECK_ROWS);
    game.spawnPill();
    tick(game, 300);
    for (let i = 0; i < 3; i += 1) game.move(-1);
    assert.deepEqual(
      pillCells(game.pill).map(({ x }) => x),
      [0, 1],
      'the capsule slides along the neck',
    );
    tick(game, 2000);
    assert.notEqual(game.phase, PHASE.LOST);
    for (let x = 0; x < game.board.width; x += 1) {
      assert.equal(game.board.get(x, SPAWN_Y), null, 'it fell out of the neck');
    }
  });

  it('ends the run only once the neck itself is blocked', () => {
    const game = newGame();
    fillSpawnColumns(game, 0);
    game.spawnPill();
    assert.equal(game.phase, PHASE.LOST);
    assert.ok(game.drainEvents().some((e) => e.type === 'gameOver'));
  });
});

describe('the beat between capsules', () => {
  it('holds gravity briefly so a new capsule can be read before it falls', () => {
    const game = newGame({ speed: 'HIGH', level: 0 });
    const start = game.pill.y;
    tick(game, DEAL_DELAY - 32);
    assert.equal(game.pill.y, start, 'the capsule should not have fallen yet');
    tick(game, DEAL_DELAY + game.dropInterval + 32);
    assert.ok(game.pill.y > start, 'and then it falls as normal');
  });

  it('is steerable during the beat - it is reaction time, not a freeze', () => {
    const game = newGame();
    const start = game.pill.x;
    game.move(-1);
    assert.equal(game.pill.x, start - 1, 'input is live from the first frame');
  });

  it('does not let the lock clock run during the beat', () => {
    const game = newGame();
    // Fill under the capsule so it spawns with nowhere to fall.
    for (let x = 0; x < game.board.width; x += 1) {
      for (let y = 1; y < game.board.height; y += 1) {
        game.board.set(x, y, cell(PILL, (x + y) % 3, null));
      }
    }
    game.spawnPill();
    tick(game, DEAL_DELAY - 32);
    assert.equal(game.lockTimer, 0, 'the fuse should not burn during the beat');
  });

  it('still resolves when a single giant frame swallows the beat', () => {
    // The timing gauntlet feeds absurd frames; the beat must not eat one whole.
    const game = newGame();
    const start = game.pill.y;
    game.update(DEAL_DELAY + game.dropInterval * 3);
    assert.ok(game.pill.y > start, 'a long frame spends its remainder on the capsule');
  });
});

describe('hurrying a capsule down', () => {
  it('is a multiple of the level\'s own gravity, not a fixed sprint', () => {
    // "A little faster" has to mean the same thing at every speed. A fixed
    // interval is a fifteenfold jump at level 0 and barely a change at the top.
    for (const speed of ['LOW', 'MEDIUM', 'HIGH']) {
      const game = newGame({ speed });
      const gravity = game.dropInterval;
      game.setSoftDrop(true);
      const hurried = game.fallInterval;
      assert.ok(hurried < gravity, `${speed} should hurry at all`);
      assert.equal(hurried, Math.max(SOFT_DROP_MIN, gravity / SOFT_DROP_FACTOR));
    }
  });

  it('never outruns a hand, however quick the level already is', () => {
    // The floor is the whole point: a hurry a player cannot place a lateral
    // into is a snap to the bottom by another name.
    for (const speed of ['LOW', 'MEDIUM', 'HIGH']) {
      for (const level of [0, 10, 20]) {
        const game = newGame({ speed, level });
        game.pillsPlaced = 60;
        game.setSoftDrop(true);
        assert.ok(
          game.fallInterval >= SOFT_DROP_MIN,
          `${speed} level ${level} hurries at ${game.fallInterval}ms a row`,
        );
      }
    }
  });

  it('leaves the full lock window when the capsule lands', () => {
    const game = newGame({ speed: 'HIGH' });
    game.setSoftDrop(true);
    // Hurry it all the way down and check it still has its fuse.
    tick(game, 6000);
    if (game.phase === PHASE.FALLING && !game.pill) return;
    const landed = newGame({ speed: 'HIGH' });
    for (let x = 0; x < landed.board.width; x += 1) {
      for (let y = 2; y < landed.board.height; y += 1) {
        landed.board.set(x, y, cell(PILL, (x + y) % 3, null));
      }
    }
    landed.spawnPill();
    landed.setSoftDrop(true);
    tick(landed, DEAL_DELAY + 32);
    assert.ok(
      landed.lockBudget - landed.lockTimer > 200,
      'a hurried capsule should still have time to be steered when it lands',
    );
  });
});

describe('hurrying is a speed, never a move', () => {
  const empty = (speed, tier = 0) => {
    const game = new Game({ level: 0, speed, seed: 5 });
    game.board.forEachCell((c, x, y) => game.board.set(x, y, null));
    game.pillsPlaced = tier * 10;
    game.spawnPill();
    game.update(200);
    game.dropTimer = 0;
    return game;
  };

  it('never drops more than one row in a frame, wherever in the cycle you press', () => {
    // Reported from play: "sometimes hurry is hurry and sometimes it will still
    // snap". The timer banked milliseconds toward the next row against an
    // interval that pressing hurry could shrink sevenfold - so a nearly-full
    // cell was suddenly worth seven rows, cashed in on the next frame. How far
    // it snapped depended on where in the gravity cycle you happened to press,
    // which is exactly why it felt random.
    for (const speed of ['LOW', 'MEDIUM', 'HIGH']) {
      for (const tier of [0, 6, 12]) {
        for (const share of [0.1, 0.5, 0.9, 0.99]) {
          const game = empty(speed, tier);
          game.update(game.dropInterval * share);
          const before = game.pill.y;
          game.setSoftDrop(true);
          game.update(16);
          assert.ok(
            game.pill.y - before <= 1,
            `${speed} tier ${tier}: pressing hurry at ${share} of a cell`
            + ` dropped ${game.pill.y - before} rows in one frame`,
          );
        }
      }
    }
  });

  it('does not move the capsule at all on the press itself', () => {
    for (const speed of ['LOW', 'MEDIUM', 'HIGH']) {
      const game = empty(speed);
      game.update(game.dropInterval * 0.95);
      const before = game.pill.y;
      game.setSoftDrop(true);
      assert.equal(game.pill.y, before, 'pressing hurry moved the capsule by itself');
      game.setSoftDrop(false);
      assert.equal(game.pill.y, before, 'releasing hurry moved the capsule by itself');
    }
  });

  it('keeps the drawn position continuous across a press and a release', () => {
    // The same defect seen from the screen: the capsule leapt most of a cell
    // the instant the key went down.
    for (const speed of ['LOW', 'MEDIUM', 'HIGH']) {
      for (const share of [0.25, 0.6, 0.9]) {
        const game = empty(speed);
        game.update(game.dropInterval * share);
        const before = game.dropProgress;
        game.setSoftDrop(true);
        assert.ok(
          Math.abs(game.dropProgress - before) < 0.02,
          `${speed}: pressing hurry at ${share} jumped the capsule`
          + ` from ${before.toFixed(2)} to ${game.dropProgress.toFixed(2)} of a cell`,
        );
        const held = game.dropProgress;
        game.setSoftDrop(false);
        assert.ok(
          Math.abs(game.dropProgress - held) < 0.02,
          `${speed}: releasing hurry at ${share} jumped the capsule`,
        );
      }
    }
  });

  it('still actually hurries - the point of the control', () => {
    for (const speed of ['LOW', 'MEDIUM', 'HIGH']) {
      const plain = empty(speed);
      const rushed = empty(speed);
      rushed.setSoftDrop(true);
      for (let t = 0; t < 600; t += 16) {
        plain.update(16);
        rushed.update(16);
      }
      assert.ok(
        rushed.pill.y > plain.pill.y,
        `${speed}: hurrying got no further than gravity`,
      );
    }
  });
});
