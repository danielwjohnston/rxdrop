/**
 * The RxDrop UltraGauntlet.
 *
 * Nine stages run in series, each attacking a different assumption the game
 * makes about itself. Every stage is a hard gate: one failure fails the run.
 * See docs/ultragauntlet.md for what each stage is for and why.
 *
 *   node tools/gauntlet.mjs            run every stage
 *   node tools/gauntlet.mjs --list     show the stages
 *   node tools/gauntlet.mjs rules fuzz run named stages only
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  Board,
  cell,
  collateralOf,
  generateLevel,
  hybridOf,
  isHybrid,
  isTolerant,
  parentsOf,
  treatableFrom,
  virus,
  virusTopRow,
} from '../src/board.js';
import {
  COLOR_COUNT,
  HYBRIDS,
  HYBRID_BASE,
  HYBRID_DECAY,
  MATCH_LENGTH,
  MAX_LEVEL,
  PILL,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  DEAL_DELAY,
  LIGHT_COOLDOWN,
  LIGHT_WIDTH_NARROW,
  FOG_MAX,
  PILLS_PER_SPEED_UP,
  RESISTANCE_INTERVAL,
  RESISTANCE_MAX,
  SPEEDS,
  TOLERANCE_AT,
  VIRUS,
  QUARANTINE_MAX,
  RATION_SPELL,
  SPAWN_X,
  SOFT_DROP_MIN,
} from '../src/constants.js';
import { Game, PHASE } from '../src/game.js';
import { MODIFIERS, MODIFIER_IDS, normaliseModifiers } from '../src/modifiers.js';
import { DISCOVERY_IDS, Formulary, discoveriesIn } from '../src/formulary.js';
import { createPill, fits, pillCells, tryMove, tryRotate } from '../src/pill.js';
import { FRAME, plan, steer, steerLight, workTheLamp } from './bot.mjs';
import { VersusMatch } from '../src/versus.js';
import { dailySetup } from '../src/daily.js';
import { createRng } from '../src/rng.js';
import { LightChamber } from '../src/light.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ---- helpers ---------------------------------------------------------------

/** Plays a game with a player that spreads capsules instead of towering. */
function playSpread(game, { pills = 30, rng = createRng(1), limit = 200000 } = {}) {
  let frames = 0;
  let column = rng.int(game.board.width);
  while (!game.isOver && game.pillsPlaced < pills && frames < limit) {
    frames += 1;
    if (game.phase === PHASE.FALLING) {
      if (game.pill.x < column) game.move(1);
      else if (game.pill.x > column) game.move(-1);
      else {
        game.hardDrop();
        column = rng.int(game.board.width);
      }
    }
    game.update(16);
    game.drainEvents();
  }
  return game;
}

/** Every pill half must rest on the floor, a virus, or another half. */
function assertNothingFloats(board, context) {
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

// ---- stages ----------------------------------------------------------------

const stages = [];
const stage = (name, blurb, run) => stages.push({ name, blurb, run });

stage('rules', 'The unit suite: the rules themselves', (check) => {
  const output = execFileSync(process.execPath, ['--test'], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const pass = Number(/^# pass (\d+)$/m.exec(output)?.[1] ?? 0);
  const fail = Number(/^# fail (\d+)$/m.exec(output)?.[1] ?? 1);
  check('every unit test passes', () => {
    assert.equal(fail, 0, `${fail} unit tests failed`);
    assert.ok(pass > 100, `only ${pass} tests ran`);
  });
  return `${pass} unit tests`;
});

stage('determinism', 'A seed must reproduce a game exactly', (check) => {
  const replay = (options, script) => {
    const game = new Game(options);
    for (const step of script) {
      if (step === 'drop') game.hardDrop();
      else if (step === 'left') game.move(-1);
      else if (step === 'right') game.move(1);
      else if (step === 'spin') game.rotate(1);
      else game.update(step);
      game.drainEvents();
    }
    return { board: game.board.toStrings().join('|'), score: game.score };
  };
  const script = [];
  const rng = createRng(4);
  for (let i = 0; i < 400; i += 1) {
    script.push(['left', 'right', 'spin', 'drop', 16, 16, 33][rng.int(7)]);
  }

  check('solo replays identically', () => {
    const options = { level: 6, speed: 'MEDIUM', seed: 90210, resistance: true };
    assert.deepEqual(replay(options, script), replay(options, script));
  });

  check('a different seed gives a different game', () => {
    const a = replay({ level: 6, seed: 1 }, script);
    const b = replay({ level: 6, seed: 2 }, script);
    assert.notDeepEqual(a, b);
  });

  check('versus replays identically', () => {
    const play = () => {
      const match = new VersusMatch({ level: 4, speed: 'HIGH', seed: 55 });
      for (let i = 0; i < 600; i += 1) {
        if (i % 17 === 0) match.command(0, 'hardDrop');
        if (i % 23 === 0) match.command(1, 'hardDrop');
        match.update(16);
        match.drainEvents();
      }
      return match.players.map((p) => p.board.toStrings().join('|'));
    };
    assert.deepEqual(play(), play());
  });

  check('the daily is the same puzzle for everyone', () => {
    assert.deepEqual(dailySetup('2026-09-09'), dailySetup('2026-09-09'));
    const one = new Game(dailySetup('2026-09-09'));
    const two = new Game(dailySetup('2026-09-09'));
    assert.deepEqual(one.board.toStrings(), two.board.toStrings());
  });
  return 'solo, versus and daily all reproduce';
});

stage('timing', 'Hostile clocks must not corrupt the board', (check) => {
  check('survives a storm of absurd frame times', () => {
    const game = new Game({ level: 5, seed: 12, resistance: true });
    const deltas = [0, 0.0001, 1, 16, 16, 250, 1000, -5, Number.EPSILON, 100];
    for (let i = 0; i < 4000; i += 1) {
      if (game.phase === PHASE.FALLING && i % 40 === 0) game.hardDrop();
      game.update(deltas[i % deltas.length]);
      game.drainEvents();
      if (game.isOver) game.reset(game.level, game.seed);
    }
    assert.ok(Number.isFinite(game.score) && game.score >= 0);
    assertNothingFloats(game.board, 'after the clock storm');
  });

  check('a single giant step never skips resolution', () => {
    const game = new Game({ level: 3, seed: 8 });
    game.hardDrop();
    game.update(60000);
    game.drainEvents();
    assert.ok(
      game.phase === PHASE.FALLING || game.isOver,
      `stuck in ${game.phase} after a 60s frame`,
    );
    if (game.phase === PHASE.FALLING) assert.equal(game.board.findMatches().size, 0);
  });

  check('pausing mid-cascade freezes and resumes cleanly', () => {
    const game = new Game({ level: 1, seed: 4 });
    game.board = Board.from([
      '........', '........', '........', '........',
      '........', '........', '........', '........',
      '........', '........', 'y.......', 'y.......',
      'y.......', 'rrr.....', 'Y..b....', '...B....',
    ]);
    game.pill = { x: 3, y: 0, orientation: 1, colors: [0, 0] };
    game.hardDrop();
    game.paused = true;
    const frozen = game.board.toStrings();
    for (let i = 0; i < 200; i += 1) game.update(16);
    assert.deepEqual(game.board.toStrings(), frozen, 'a paused cascade must not advance');
    game.paused = false;
    for (let i = 0; i < 400 && game.phase !== PHASE.FALLING && !game.isOver; i += 1) game.update(16);
    assert.equal(game.board.findMatches().size, 0);
  });

  check('input outside the falling phase is refused', () => {
    const game = new Game({ level: 1, seed: 6 });
    game.hardDrop();
    game.phase = PHASE.CLEARING;
    assert.equal(game.move(-1), false);
    assert.equal(game.rotate(1), false);
    assert.equal(game.hardDrop(), false);
  });
  return 'clock storms, pauses and stray input all handled';
});

stage('boundaries', 'Every level, speed and edge of the board', (check) => {
  check('all 21 levels fill their quota under their ceiling', () => {
    for (let level = 0; level <= MAX_LEVEL; level += 1) {
      for (const seed of [1, 999]) {
        const board = new Board();
        generateLevel(board, level, createRng(seed));
        assert.equal(board.countViruses(), 4 * (level + 1), `level ${level} seed ${seed}`);
        const ceiling = virusTopRow(board, level);
        board.forEachCell((c, x, y) => {
          if (c.type === VIRUS) assert.ok(y >= ceiling, `level ${level}: virus above the ceiling`);
        });
        assert.equal(board.findMatches(3).size, 0, `level ${level}: starts with a line of three`);
      }
    }
  });

  check('every speed produces a sane drop interval', () => {
    for (const name of Object.keys(SPEEDS)) {
      const game = new Game({ speed: name });
      assert.ok(game.dropInterval > 0);
      game.pillsPlaced = 10000;
      assert.equal(game.dropInterval, SPEEDS[name].minInterval);
    }
  });

  check('a blocked spawn ends the game rather than corrupting it', () => {
    const game = new Game({ level: 0, seed: 3 });
    game.board.set(3, 0, virus(0));
    game.spawnPill();
    assert.equal(game.phase, PHASE.LOST);
    assert.equal(game.pill, null);
    const snapshot = game.board.toStrings();
    for (let i = 0; i < 100; i += 1) game.update(16);
    assert.deepEqual(game.board.toStrings(), snapshot);
  });

  check('the walls hold at both edges', () => {
    const game = new Game({ level: 0, seed: 3 });
    for (let i = 0; i < 20; i += 1) game.move(-1);
    assert.equal(game.pill.x, 0);
    for (let i = 0; i < 20; i += 1) game.move(1);
    assert.ok(game.pill.x <= game.board.width - 1);
  });

  check('garbage on a full column is dropped, not lost in space', () => {
    const game = new Game({ level: 0, seed: 3 });
    for (let x = 0; x < game.board.width; x += 1) game.board.set(x, 0, virus(0));
    game.queueGarbage([0, 1, 2]);
    const dropped = game.dropGarbage();
    assert.equal(dropped.length, 0, 'nowhere to put it');
    assert.equal(game.incoming.length, 0, 'and it must not queue up forever');
  });
  return `levels 0-${MAX_LEVEL}, all speeds, both walls`;
});

stage('fuzz', 'Long random games must keep the board legal', (check) => {
  const runs = [
    { level: 0, speed: 'LOW', resistance: false, seed: 1 },
    { level: 7, speed: 'MEDIUM', resistance: true, seed: 2 },
    { level: 14, speed: 'HIGH', resistance: true, seed: 3 },
    { level: 20, speed: 'HIGH', resistance: false, seed: 4 },
  ];
  let frames = 0;
  let games = 0;
  check('no floating halves and no unresolved matches, ever', () => {
    for (const setup of runs) {
      const rng = createRng(setup.seed * 31 + 7);
      const game = new Game(setup);
      games += 1;
      let column = 0;
      for (let i = 0; i < 12000; i += 1) {
        frames += 1;
        if (game.phase === PHASE.FALLING) {
          const roll = rng.int(8);
          if (roll === 0) game.rotate(1);
          else if (roll === 1) game.rotate(-1);
          if (game.pill.x < column) game.move(1);
          else if (game.pill.x > column) game.move(-1);
          else if (rng.int(3) === 0) {
            game.hardDrop();
            column = rng.int(game.board.width);
          }
          game.setSoftDrop(roll === 2);
        }
        game.update(16);
        game.drainEvents();
        if (game.phase === PHASE.FALLING) {
          assert.equal(game.board.findMatches().size, 0, `match survived (${JSON.stringify(setup)})`);
          assertNothingFloats(game.board, JSON.stringify(setup));
        }
        if (game.isOver) {
          assert.equal(
            game.virusesLeft + game.virusesClearedThisLevel,
            game.startingViruses,
            'viruses appeared or vanished',
          );
          game.reset(setup.level, (game.seed + 1) >>> 0);
          games += 1;
        }
      }
    }
  });
  return `${games} games, ${frames.toLocaleString()} frames`;
});

stage('resistance', 'The original mechanic must not break the rules', (check) => {
  check('a mutation never hands the player a free clear', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const board = new Board();
      generateLevel(board, 12, createRng(seed));
      for (let tick = 0; tick < 6; tick += 1) {
        board.mutateViruses(createRng(seed + tick), RESISTANCE_MAX);
        assert.equal(board.findMatches().size, 0, `seed ${seed} tick ${tick} created a match`);
      }
    }
  });

  check('mutation preserves the virus count', () => {
    const board = new Board();
    generateLevel(board, 9, createRng(21));
    const before = board.countViruses();
    for (let i = 0; i < 20; i += 1) board.mutateViruses(createRng(i), RESISTANCE_MAX);
    assert.equal(board.countViruses(), before);
  });

  check('play always resumes after a mutation', () => {
    for (const seed of [5, 15, 25]) {
      const game = new Game({ level: 2, seed, resistance: true });
      playSpread(game, { pills: RESISTANCE_INTERVAL * 2 + 1, rng: createRng(seed) });
      assert.ok(
        game.phase === PHASE.FALLING || game.isOver,
        `seed ${seed} stuck in ${game.phase}`,
      );
      assert.equal(game.virusesLeft + game.virusesClearedThisLevel, game.startingViruses);
    }
  });

  check('resistance off means no mutations at all', () => {
    const game = new Game({ level: 2, seed: 31 });
    const events = [];
    const original = game.emit.bind(game);
    game.emit = (type, detail) => {
      events.push(type);
      original(type, detail);
    };
    playSpread(game, { pills: RESISTANCE_INTERVAL * 3, rng: createRng(31) });
    assert.ok(!events.includes('mutate'));
    assert.equal(game.resistanceLevel, 0);
  });
  return 'mutation is a threat, never a gift';
});

stage('collateral', 'A virus must never become unanswerable', (check) => {
  /** A virus carrying a chosen amount of resistance. */
  const virusAt = (color, resistance) => {
    const c = cell(color, VIRUS, null);
    c.resistance = resistance;
    return c;
  };

  check('every virus, at every resistance, has an answer', () => {
    // The contraindication the whole mechanic is built around. Sweep every
    // colour and every resistance level, on a board with a stack under it, and
    // prove something still kills it.
    for (let color = 0; color < COLOR_COUNT; color += 1) {
      for (let r = 0; r <= RESISTANCE_MAX; r += 1) {
        const board = new Board();
        const floor = board.height - 1;
        board.set(3, floor, virusAt(color, r));
        const tolerant = isTolerant(board.get(3, floor));
        const medicine = tolerant ? collateralOf(color) : color;
        const columns = tolerant ? [4, 5, 6, 7] : [0, 1, 2];
        for (const x of columns) board.set(x, floor, cell(medicine, PILL, null));
        board.resolve({ tolerance: true });
        assert.equal(board.get(3, floor), null, `colour ${color} at r=${r} survived its answer`);
      }
    }
  });

  check('its own colour always wears the tolerance down', () => {
    // The second answer, for a board with no room for a collateral run.
    for (let color = 0; color < COLOR_COUNT; color += 1) {
      const board = new Board();
      const floor = board.height - 1;
      board.set(3, floor, virusAt(color, RESISTANCE_MAX));
      let attempts = 0;
      while (board.get(3, floor) && attempts < RESISTANCE_MAX + 3) {
        for (const x of [0, 1, 2]) board.set(x, floor, cell(color, PILL, null));
        board.resolve({ tolerance: true });
        attempts += 1;
      }
      assert.equal(board.get(3, floor), null, `colour ${color} never wore down`);
      assert.ok(attempts <= RESISTANCE_MAX + 1, `colour ${color} took ${attempts} clears`);
    }
  });

  check('a collateral kill only ever takes tolerant viruses', () => {
    for (let seed = 0; seed < 120; seed += 1) {
      const rng = createRng(seed);
      const board = new Board();
      generateLevel(board, 12, createRng(seed));
      // Age a random scattering of viruses into tolerance.
      board.forEachCell((c) => {
        if (c.type === VIRUS && rng.int(3) === 0) c.resistance = TOLERANCE_AT;
      });
      const before = new Map();
      board.forEachCell((c, x, y) => {
        if (c.type === VIRUS) before.set(`${x},${y}`, isTolerant(c));
      });
      const matches = board.findMatches();
      const outcome = board.matchOutcome(matches, true);
      for (const { x, y } of outcome.collateral) {
        assert.equal(before.get(`${x},${y}`), true, `seed ${seed} killed a susceptible virus`);
      }
    }
  });

  check('resolution always terminates, however many viruses shrug', () => {
    for (let seed = 0; seed < 120; seed += 1) {
      const board = new Board();
      generateLevel(board, 16, createRng(seed));
      board.forEachCell((c) => {
        if (c.type === VIRUS) c.resistance = TOLERANCE_AT;
      });
      // Drop medicine across the board and make it resolve.
      const rng = createRng(seed + 999);
      for (let x = 0; x < board.width; x += 1) {
        for (let y = board.height - 4; y < board.height; y += 1) {
          if (!board.get(x, y)) board.set(x, y, cell(rng.int(COLOR_COUNT), PILL, null));
        }
      }
      const stages = board.resolve({ tolerance: true });
      assert.ok(stages.length < 200, `seed ${seed} ran ${stages.length} cascade stages`);
      assert.equal(board.findMatches().size, 0, `seed ${seed} left a match on the board`);
    }
  });

  check('tolerance is off when resistance is off', () => {
    const board = new Board();
    const floor = board.height - 1;
    board.set(3, floor, virusAt(0, RESISTANCE_MAX));
    for (const x of [0, 1, 2]) board.set(x, floor, cell(0, PILL, null));
    board.resolve();
    assert.equal(board.get(3, floor), null, 'the plain rules must be untouched');
  });

  return 'the older medicine always works, and hammering always wears it down';
});

stage('hybrid', 'A combined strain must still come apart', (check) => {
  const strain = (color) => {
    const c = cell(color, VIRUS, null);
    c.cured = [];
    c.decay = 0;
    return c;
  };

  /** Lays a run of four in `color` touching (3, floor). */
  const deliver = (board, color) => {
    const floor = board.height - 1;
    for (const x of [4, 5, 6, 7]) board.set(x, floor, cell(color, PILL, null));
  };

  check('no capsule is ever dealt in a hybrid colour', () => {
    // The whole design rests on this: a hybrid belongs to no run because no run
    // can contain its colour. A capsule in one would break the rule silently.
    for (const seed of [1, 7, 19, 44]) {
      const game = new Game({ level: 5, seed });
      for (let i = 0; i < 400; i += 1) {
        for (const color of game.drawColors()) {
          assert.ok(color < HYBRID_BASE, `seed ${seed} dealt hybrid colour ${color}`);
        }
      }
    }
  });

  check('a hybrid never appears in a match', () => {
    for (let seed = 0; seed < 80; seed += 1) {
      const board = new Board();
      generateLevel(board, 14, createRng(seed));
      // Combine a scattering of them, then look for any match containing one.
      board.forEachCell((c, x, y) => {
        if (c.type !== VIRUS) return;
        if ((x + y + seed) % 3 !== 0) return;
        const other = (c.color + 1) % COLOR_COUNT;
        c.color = hybridOf(c.color, other);
        c.cured = [];
      });
      for (const key of board.findMatches()) {
        const [x, y] = key.split(',').map(Number);
        assert.ok(!isHybrid(board.get(x, y)), `seed ${seed} matched a hybrid at ${key}`);
      }
    }
  });

  check('both parents always cure it, in either order', () => {
    for (const { color } of HYBRIDS) {
      for (const order of [0, 1]) {
        const board = new Board();
        const floor = board.height - 1;
        board.set(3, floor, strain(color));
        const parents = [...parentsOf(color)];
        if (order) parents.reverse();
        for (const parent of parents) {
          deliver(board, parent);
          const outcome = board.matchOutcome(board.findMatches(), true);
          board.applyMatch(outcome);
          board.settle();
        }
        assert.equal(board.get(3, floor), null, `strain ${color} survived both parents`);
      }
    }
  });

  check('both parents in one cascade always synthesise an antibody', () => {
    // The top of the skill ladder has to be reachable for every strain, and it
    // has to survive being spread across a cascade - the first parent clears,
    // the second falls into the gap it left. Narrow that window back to a
    // single clear and this check goes red for all three strains.
    for (const { color } of HYBRIDS) {
      for (const order of [0, 1]) {
        const board = new Board();
        const floor = board.height - 1;
        board.set(3, floor, strain(color));
        const parents = [...parentsOf(color)];
        if (order) parents.reverse();
        deliver(board, parents[0]);
        // Four halves of the other parent on four different rows: no run of
        // their own until the first parent clears out from under them.
        for (const [x, up] of [[4, 1], [5, 2], [6, 3], [7, 4]]) {
          board.set(x, floor - up, cell(parents[1], PILL, null));
        }
        const stages = board.resolve({ tolerance: true });
        const antibodies = stages.reduce((n, st) => n + (st.antibodies ?? 0), 0);
        assert.equal(board.get(3, floor), null, `strain ${color} survived the compound`);
        assert.equal(antibodies, 1, `strain ${color} cured without an antibody`);
        assert.ok(stages.length >= 2, `strain ${color} did not actually cascade`);
      }
    }
  });

  check('one parent alone always breaks it in the end', () => {
    // The safety valve that makes a hybrid answerable even when the other
    // parent can never be delivered.
    for (const { color } of HYBRIDS) {
      for (const parent of parentsOf(color)) {
        const board = new Board();
        const floor = board.height - 1;
        board.set(3, floor, strain(color));
        let rounds = 0;
        while (isHybrid(board.get(3, floor)) && rounds < HYBRID_DECAY + 3) {
          deliver(board, parent);
          const outcome = board.matchOutcome(board.findMatches(), true);
          board.applyMatch(outcome);
          board.settle();
          rounds += 1;
        }
        const left = board.get(3, floor);
        assert.ok(!left || !isHybrid(left), `strain ${color} never broke under ${parent}`);
        assert.ok(rounds <= HYBRID_DECAY + 1, `strain ${color} took ${rounds} rounds`);
      }
    }
  });

  check('a hybrid only ever forms where it can be treated from', () => {
    for (let seed = 0; seed < 120; seed += 1) {
      const board = new Board();
      generateLevel(board, 16, createRng(seed));
      board.forEachCell((c) => {
        if (c.type !== VIRUS) return;
        c.resistance = RESISTANCE_MAX - 1;
        c.cappedBy = (c.color + 1) % COLOR_COUNT;
      });
      board.mutateViruses(createRng(seed + 500), RESISTANCE_MAX);
      board.forEachCell((c, x, y) => {
        if (!isHybrid(c)) return;
        assert.ok(
          treatableFrom(board, x, y) >= 1,
          `seed ${seed} combined a strain at ${x},${y} with nowhere to treat it from`,
        );
      });
    }
  });

  return 'both parents cure it, and one alone still wins in the end';
});

stage('modifiers', 'A modifier may change a run, never end it', (check) => {
  // Every modifier in src/modifiers.js writes down the bound that keeps it from
  // making a virus unanswerable. This stage is those sentences, executed.

  check('every modifier states a bound, and the set is well formed', () => {
    for (const mod of MODIFIERS) {
      assert.ok(mod.bound.length > 40, `${mod.id} does not state its bound`);
      assert.ok(mod.blurb.length > 20, `${mod.id} has no blurb`);
    }
    assert.equal(new Set(MODIFIER_IDS).size, MODIFIERS.length);
  });

  check('an unmodified run is untouched by any of it', () => {
    // The most important check here. Every modifier is opt-in, so a plain game
    // has to be bit-for-bit what it was before any of this existed.
    const play = (modifiers) => {
      const game = new Game({ level: 5, speed: 'LOW', seed: 909, resistance: true, modifiers });
      playSpread(game, { pills: 40, rng: createRng(4) });
      return { score: game.score, grid: JSON.stringify(game.board.grid) };
    };
    assert.deepEqual(play([]), play(['nonsense']), 'an unknown modifier must be ignored');
    assert.deepEqual(play([]), play(undefined));
  });

  check('a seed reproduces a modified game exactly', () => {
    for (const id of MODIFIER_IDS) {
      const play = () => {
        const game = new Game({
          level: 6, speed: 'MEDIUM', seed: 515, resistance: true, modifiers: [id],
        });
        for (let f = 0; f < 4000; f += 1) {
          game.setLight(f % 60 < 20);
          game.update(16);
          game.drainEvents();
        }
        return JSON.stringify({
          score: game.score, sealed: game.board.sealed, grid: game.board.grid,
        });
      };
      assert.equal(play(), play(), `${id} is not deterministic`);
    }
  });

  check('outbreak never grows a level past its ceiling', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const game = new Game({ level: 8, speed: 'LOW', seed, modifiers: ['outbreak'] });
      const cap = game.outbreakCap;
      const ceiling = virusTopRow(game.board, game.level);
      for (let i = 0; i < 300; i += 1) {
        game.pillsPlaced += 1;
        game.tickOutbreak();
        for (const { y } of game.spreading) {
          assert.ok(y >= ceiling, `seed ${seed} spread to row ${y}, above the ceiling`);
        }
        game.spreading = [];
        assert.ok(game.virusesLeft <= cap, `seed ${seed} grew to ${game.virusesLeft} past ${cap}`);
      }
    }
  });

  check('outbreak never deals faster than a hand can steer', () => {
    // The other half of the trade has to stay inside the same floor a held
    // hurry is held to, or "twice as fast" becomes "unplaceable".
    for (const speed of Object.keys(SPEEDS)) {
      for (let level = 0; level <= MAX_LEVEL; level += 1) {
        const game = new Game({ level, speed, seed: 3, modifiers: ['outbreak'] });
        game.pillsPlaced = 400;
        assert.ok(
          game.dropInterval >= SOFT_DROP_MIN,
          `${speed} level ${level} falls at ${game.dropInterval}ms a row`,
        );
      }
    }
  });

  check('the fog plateaus and never takes a row to black', () => {
    // The bound that makes phototherapy a mechanic rather than a slow loss:
    // ignore the lamp for an entire run and the bottle is hard to read, never
    // unplayable.
    for (let seed = 0; seed < 20; seed += 1) {
      const game = new Game({ level: 14, speed: 'LOW', seed, modifiers: ['phototherapy'] });
      for (let t = 0; t < 900000; t += 250) {
        game.updateLight(250);
        for (let y = 0; y < game.height; y += 1) {
          assert.ok(
            game.fog[y] <= FOG_MAX + 1e-9,
            `seed ${seed}: row ${y} fogged to ${game.fog[y].toFixed(3)}, past the ceiling`,
          );
          assert.ok(
            game.visibilityAt(y) >= 1 - FOG_MAX - 1e-9,
            `seed ${seed}: row ${y} went black`,
          );
        }
      }
    }
  });

  check('only rows with disease in them cloud', () => {
    // The fog is information: it silts up where the colonies are. A row that
    // clouds with nothing in it would be noise, and would teach nothing.
    for (let seed = 0; seed < 20; seed += 1) {
      const game = new Game({ level: 8, speed: 'LOW', seed, modifiers: ['phototherapy'] });
      for (let t = 0; t < 30000; t += 100) game.updateLight(100);
      for (let y = 0; y < game.height; y += 1) {
        let viruses = 0;
        for (let x = 0; x < game.width; x += 1) {
          if (game.board.get(x, y)?.type === VIRUS) viruses += 1;
        }
        if (viruses === 0) {
          assert.equal(game.fog[y], 0, `seed ${seed}: row ${y} clouded with nothing in it`);
        }
      }
    }
  });

  check('the chamber always deals, and never becomes a dead end', () => {
    // Light no longer fades, so a packed chamber cannot clear itself. The same
    // bound is reached the other way round: drowning it ends the SESSION and
    // hands you back to the bottle, and the lamp comes back after its cooldown.
    // It costs the session, never the run.
    for (const width of [LIGHT_WIDTH_NARROW, BOARD_WIDTH]) {
      const game = new Game({ level: 4, speed: 'LOW', seed: 3, modifiers: ['phototherapy'], lightWidth: width });
      assert.equal(game.enterLight(), true, `width ${width}: the lamp refused to open`);
      assert.equal(game.chamber.width, width);
      assert.ok(game.chamber.piece, `width ${width}: the chamber dealt nothing`);

      for (let i = 0; i < game.chamber.grid.length; i += 1) game.chamber.grid[i] = { lit: true };
      game.chamber.piece = null;
      game.updateLight(FRAME);
      assert.equal(game.inLight, false, `width ${width}: a flooded chamber trapped the player`);
      assert.equal(game.isOver, false, `width ${width}: a flood ended the run`);

      for (let t = 0; t < LIGHT_COOLDOWN + 200 && !game.lampReady; t += FRAME) game.updateLight(FRAME);
      assert.equal(game.lampReady, true, `width ${width}: the lamp never came back`);
      assert.equal(game.enterLight(), true, `width ${width}: the lamp refused to reopen`);
      assert.ok(game.chamber.piece, `width ${width}: the reopened chamber dealt nothing`);
    }
  });

  check('light never hangs in mid-air with nothing under it', () => {
    // Reported from play: "sometimes it rests on the bottom and sometimes not
    // even with nothing below."
    //
    // The invariant is about CLUMPS, not columns. A tetromino that locks half
    // over a gap is a legitimate overhang and has to stay one - asserting that
    // every cell has something directly beneath it would outlaw four of the
    // seven pieces. What must never happen is a connected clump of light with
    // nothing under any of it.
    const unsupported = (chamber) => {
      const held = new Set(chamber.cellsOf().map(({ x, y }) => chamber.index(x, y)));
      return chamber.clumps().filter((clump) => {
        // The piece in hand is allowed to be in the air. That is falling.
        if (clump.some(({ x, y }) => held.has(chamber.index(x, y)))) return false;
        const own = new Set(clump.map(({ x, y }) => chamber.index(x, y)));
        return !clump.some(({ x, y }) => {
          if (y + 1 >= chamber.height) return true;
          const below = chamber.index(x, y + 1);
          return chamber.grid[below] !== null && !own.has(below);
        });
      });
    };

    for (const width of [LIGHT_WIDTH_NARROW, BOARD_WIDTH]) {
      for (let seed = 0; seed < 6; seed += 1) {
        const chamber = new LightChamber(width, BOARD_HEIGHT, createRng(seed));
        for (let t = 0; t < 40000; t += FRAME) {
          if (chamber.piece && t % 240 === 0) chamber.move(seed % 2 ? 1 : -1);
          if (chamber.piece && t % 400 === 0) chamber.rotate(1);
          chamber.update(FRAME);
          chamber.drainLit();
          const floating = unsupported(chamber);
          assert.equal(
            floating.length, 0,
            `width ${width} seed ${seed}: ${floating.length} clump(s) hanging at t=${t}`,
          );
          if (chamber.saturated) break;
        }
      }
    }
  });

  check('a line always lights its own row, at every width and every row', () => {
    for (const width of [5, BOARD_WIDTH]) {
      for (let row = 0; row < BOARD_HEIGHT; row += 1) {
        const game = new Game({
          level: 4, speed: 'LOW', seed: 7, modifiers: ['phototherapy'], lightWidth: width,
        });
        game.fog = game.fog.map(() => FOG_MAX);
        game.lightRows([row]);
        assert.equal(game.fog[row], 0, `width ${width}: lighting row ${row} did not clear it`);
        // And the spill never reaches the whole bottle off a single line.
        const untouched = game.fog.filter((f) => f === FOG_MAX).length;
        assert.ok(untouched > 0, `width ${width}: one line at row ${row} flooded the bottle`);
      }
    }
  });

  check('going to the lamp commits the dose in your hand and holds the next', () => {
    // The cost, and the reason this is a decision rather than a chore: you
    // finish the dose or you lose the placement, and nothing new is dealt until
    // you come back. Letting capsules keep dealing into an unsteered bottle was
    // far worse - every one lands in the spawn column, and six of them top the
    // bottle out.
    const game = new Game({ level: 4, speed: 'LOW', seed: 5, modifiers: ['phototherapy'] });
    game.update(DEAL_DELAY + 20);
    const placed = game.pillsPlaced;
    assert.ok(game.pill, 'there should be a capsule in hand to commit');

    game.enterLight();
    assert.equal(game.inLight, true);
    assert.equal(game.pillsPlaced, placed + 1, 'the capsule in hand should have been committed');
    assert.equal(game.pill, null, 'and nothing new dealt while the lamp is lit');

    // It stays that way however long you stand there.
    for (let t = 0; t < 8000; t += 16) {
      game.update(16);
    }
    assert.equal(game.pill, null, 'a capsule was dealt into an unsteered bottle');
    assert.equal(game.dealHeld, true, 'the deal should be waiting on you');

    // And it arrives the moment you come back.
    game.leaveLight('done');
    assert.ok(game.pill, 'leaving the lamp should deal the capsule that was waiting');
    assert.equal(game.dealHeld, false);
  });

  check('the lamp rests between sessions, and always comes back', () => {
    // The abuse this closes, measured before it was closed: with the fog at its
    // ceiling the case for going to the lamp is ALWAYS true, so the playtest bot
    // lived in the chamber 95% of the run and placed a fifth of the capsules.
    // A lamp you would be a fool to ever leave is a room, not a decision.
    //
    // The bound on the bound: the cooldown is fixed, it is never running at the
    // start of a run, and it always expires - so the lamp can be made to wait
    // and can never be taken away.
    const game = new Game({ level: 4, speed: 'LOW', seed: 21, modifiers: ['phototherapy'] });
    assert.equal(game.lampReady, true, 'the lamp should be available from the first frame');
    assert.equal(game.enterLight(), true);
    game.leaveLight('done');
    assert.equal(game.lampReady, false, 'the lamp should be resting');
    assert.equal(game.enterLight(), false, 'and refuse to open while it rests');

    // It comes back on its own, without the player doing anything at all.
    let waited = 0;
    for (; waited < LIGHT_COOLDOWN * 3 && !game.lampReady; waited += 16) game.updateLight(16);
    assert.ok(game.lampReady, 'the lamp never came back');
    assert.ok(waited <= LIGHT_COOLDOWN + 32, `the lamp took ${waited}ms to come back`);
    assert.equal(game.enterLight(), true, 'and opens again once it has');

    // Nothing about the cooldown may touch a run without the modifier.
    const plain = new Game({ level: 4, speed: 'LOW', seed: 21 });
    assert.equal(plain.lampReady, false, 'there is no lamp without the modifier');
    assert.equal(plain.enterLight(), false);
  });

  check('a run can be won without ever touching the lamp', () => {
    // Phototherapy is an aid, not a gate.
    const game = new Game({ level: 0, speed: 'LOW', seed: 11, modifiers: ['phototherapy'] });
    game.board.forEachCell((c, x, y) => game.board.set(x, y, null));
    game.startingViruses = 1;
    game.virusesClearedThisLevel = 0;
    const floor = game.board.height - 1;
    game.board.set(3, floor, virus(0));
    for (const x of [4, 5, 6, 7]) game.board.set(x, floor, cell(0, PILL, null));
    game.board.set(2, floor, cell(0, PILL, null));
    game.beginResolution();
    for (let t = 0; t < 3000 && game.phase !== PHASE.WON; t += 16) {
      game.update(16);
    }
    assert.equal(game.inLight, false, 'the run should never have needed the chamber');
    assert.equal(game.phase, PHASE.WON, 'a level should be winnable with the lamp untouched');
  });

  check('rationing brings every colour back inside one spell', () => {
    const game = new Game({ level: 2, speed: 'LOW', seed: 9, modifiers: ['rationing'] });
    for (let pills = 0; pills < RATION_SPELL * COLOR_COUNT * 3; pills += 1) {
      game.pillsPlaced = pills;
      const dealt = new Set();
      for (let ahead = 0; ahead <= RATION_SPELL; ahead += 1) {
        game.pillsPlaced = pills + ahead;
        for (let draw = 0; draw < 9; draw += 1) for (const c of game.drawColors()) dealt.add(c);
      }
      assert.equal(dealt.size, COLOR_COUNT, `a colour was missing across a whole spell at ${pills}`);
    }
  });

  check('rationing costs something instead of making the bottle easier', () => {
    // The defect this check exists for: two colours make runs EASIER to build,
    // so rationing on its own improved every number the playtest took - longer
    // runs, more clears, faster virus kills and the only setup that finished
    // levels. A modifier that makes the bottle easier while claiming to make it
    // harder is a defect, not a preference.
    //
    // The measure is viruses killed per capsule placed, because that is what
    // the modifier is supposed to slow down. Surviving longer is not the same
    // as doing better, and the two moved in opposite directions here.
    // The frame budget has to be large enough for every run to END, not merely
    // to run for a while. Rationed games last two to three times longer, so a
    // budget that truncates them measures a different slice of each and the
    // comparison inverts - which is exactly what the first version of this
    // check reported.
    const rate = (modifiers) => {
      let viruses = 0;
      let capsules = 0;
      for (let seed = 0; seed < 10; seed += 1) {
        const game = new Game({ level: 4, speed: 'LOW', seed, modifiers });
        let target = plan(game);
        for (let f = 0; f < 250000 && !game.isOver; f += 1) {
          if (game.phase === PHASE.FALLING) game.setSoftDrop(!steer(game, target));
          game.update(FRAME);
          for (const event of game.drainEvents()) {
            if (event.type === 'clear') viruses += event.viruses ?? 0;
            if (event.type === 'spawn') {
              capsules += 1;
              target = plan(game);
              game.setSoftDrop(false);
            }
            if (event.type === 'levelComplete') {
              game.advanceLevel();
              target = plan(game);
            }
          }
        }
      }
      return capsules ? viruses / capsules : 0;
    };
    const plain = rate([]);
    const rationed = rate(['rationing']);
    assert.ok(plain > 0 && rationed > 0, 'both setups should clear something');
    assert.ok(
      rationed < plain,
      `rationing kills ${(rationed * 100).toFixed(1)} viruses per 100 capsules`
      + ` against ${(plain * 100).toFixed(1)} plain - it is making the bottle easier`,
    );
  });

  check('a contaminated batch never becomes permanent weight', () => {
    // Inert halves belong to no run, so if they could not be washed out they
    // would fill the bottle on their own however well it was played.
    for (let seed = 0; seed < 30; seed += 1) {
      const board = new Board();
      const rng = createRng(seed);
      const floor = board.height - 1;
      const color = rng.int(COLOR_COUNT);
      for (const x of [0, 1, 2, 3]) board.set(x, floor, cell(color, PILL, null));
      const bad = cell(rng.int(COLOR_COUNT), PILL, null);
      bad.inert = true;
      // Somewhere touching the run.
      board.set(4, floor, bad);
      const outcome = board.matchOutcome(board.findMatches(), true);
      board.applyMatch(outcome);
      assert.equal(board.get(4, floor), null, `seed ${seed} left an inert half behind`);
    }
  });

  check('an inert half is never part of a run', () => {
    for (let seed = 0; seed < 120; seed += 1) {
      const rng = createRng(seed + 700);
      const board = new Board();
      generateLevel(board, 10, createRng(seed));
      board.forEachCell((c, x, y) => {
        if (c.type === VIRUS || rng.int(4) !== 0) return;
        const half = cell(rng.int(COLOR_COUNT), PILL, null);
        half.inert = true;
        board.set(x, y, half);
      });
      // Fill the bottle with medicine so runs form everywhere.
      for (let y = 0; y < board.height; y += 1) {
        for (let x = 0; x < board.width; x += 1) {
          if (board.isEmpty(x, y)) board.set(x, y, cell(rng.int(COLOR_COUNT), PILL, null));
        }
      }
      for (const key of board.findMatches()) {
        const [x, y] = key.split(',').map(Number);
        assert.ok(!board.get(x, y)?.inert, `seed ${seed} matched an inert half at ${key}`);
      }
    }
  });

  check('a quarantine seal can never be permanent, and never blocks the deal', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const game = new Game({ level: 5, speed: 'LOW', seed, modifiers: ['quarantine'] });
      let sealedFor = 0;
      let worst = 0;
      for (let pills = 1; pills < 400; pills += 1) {
        game.pillsPlaced = pills;
        game.tickQuarantine();
        if (game.board.sealed === undefined) {
          sealedFor = 0;
          continue;
        }
        assert.notEqual(game.board.sealed, SPAWN_X, `seed ${seed} sealed a spawn column`);
        assert.notEqual(game.board.sealed, SPAWN_X + 1, `seed ${seed} sealed a spawn column`);
        sealedFor += 1;
        worst = Math.max(worst, sealedFor);
      }
      assert.ok(worst <= QUARANTINE_MAX + 1, `seed ${seed} held a seal for ${worst} capsules`);
    }
  });

  check('a sealed column blocks placement and nothing else', () => {
    const board = new Board();
    const floor = board.height - 1;
    board.set(1, floor, cell(0, PILL, null));
    board.sealed = 1;
    assert.equal(board.isEmpty(1, 4), true, 'gravity must still see the column');
    assert.equal(board.open(1, 4), false, 'but no capsule may rest in it');
    assert.equal(fits(board, createPill([0, 1], 1, 4, 1)), false);
    assert.equal(fits(board, createPill([0, 1], 0, 4, 0)), false, 'nor span it');
    assert.equal(fits(board, createPill([0, 1], 5, 4, 0)), true);
    // Matching is untouched: a run through the sealed column still clears.
    for (const x of [0, 1, 2, 3]) board.set(x, floor - 1, cell(0, PILL, null));
    const matched = board.findMatches();
    assert.ok(matched.has(`1,${floor - 1}`), 'a run through a sealed column must still match');
  });

  check('every modifier, alone and all at once, keeps the bottle playable', () => {
    // The whole point, measured rather than asserted: a modified bottle still
    // deals capsules, still clears, and still ends by the ordinary rules.
    const sets = [[], ...MODIFIER_IDS.map((id) => [id]), MODIFIER_IDS];
    for (const modifiers of sets) {
      const name = normaliseModifiers(modifiers).join('+') || 'none';
      for (let seed = 0; seed < 4; seed += 1) {
        const game = new Game({ level: 4, speed: 'LOW', seed, resistance: true, modifiers });
        // The same bot the playtest report uses, so the gate and the
        // measurement are asking about the same player. A random-column
        // hard-dropper loses a level-4 bottle in ten capsules without clearing
        // anything, which would say nothing about the modifier under test.
        let target = plan(game);
        const lampState = {};
        let cleared = 0;
        let capsules = 0;
        for (let f = 0; f < 90000 && !game.isOver; f += 1) {
          // While you are at the lamp the controls drive the LIGHT, so a bot
          // that goes on steering the capsule is really steering the light by
          // accident - and would report the modifier unplayable for a reason
          // that is about the bot.
          // Steer first, then decide about the lamp: a capsule that is where
          // you want it can be committed for free, and one mid-flight cannot.
          const settled = !game.inLight && game.phase === PHASE.FALLING
            ? !steer(game, target) : false;
          if (!game.inLight && game.phase === PHASE.FALLING) game.setSoftDrop(settled);
          const lamp = workTheLamp(game, lampState, { ready: settled });
          if (game.inLight) steerLight(game, lamp);
          game.update(FRAME);
          for (const e of game.drainEvents()) {
            if (e.type === 'clear') cleared += e.cells;
            if (e.type === 'spawn') {
              capsules += 1;
              target = plan(game);
              game.setSoftDrop(false);
            }
            if (e.type === 'levelComplete') {
              game.advanceLevel();
              target = plan(game);
            }
          }
        }
        // A stack of five legitimately shortens a run, and phototherapy
        // compounds with outbreak in particular: more viruses means more fog
        // means more time at the lamp means fewer capsules placed. The floor
        // here is "playable", not "as long as a plain bottle" - it is set to
        // catch a wedge or an instant death, not to encode an expectation
        // about how hard five modifiers at once ought to be.
        const floor = normaliseModifiers(modifiers).length >= 4 ? 15 : 30;
        assert.ok(capsules > floor, `${name} seed ${seed} only dealt ${capsules} capsules`);
        assert.ok(cleared > 20, `${name} seed ${seed} only cleared ${cleared} cells`);
        assert.ok(game.isOver || game.phase === PHASE.FALLING, `${name} seed ${seed} wedged`);
      }
    }
  });

  check('the formulary can actually be filled in by playing', () => {
    // The notebook is only worth having if the things it records happen. Play
    // the whole formulary at once with the real bot and check the discoveries
    // come in - a mechanic wired to nothing would show up here as a page that
    // can never be written.
    const book = new Formulary();
    // A mix of setups rather than one, because the discoveries do not all live
    // in the same kind of run. The whole formulary at once churns the board
    // hard enough that the rarest find - both parents of a strain in one
    // cascade - effectively never happens; resistance on its own is where that
    // one turns up.
    const setups = [
      { resistance: true, modifiers: MODIFIER_IDS },
      { resistance: true, modifiers: [] },
      { resistance: true, modifiers: ['outbreak', 'phototherapy'] },
    ];
    for (let seed = 0; seed < 18; seed += 1) {
      const game = new Game({
        level: 6, speed: 'LOW', seed, ...setups[seed % setups.length],
      });
      let target = plan(game);
      // Half the runs work the lamp and half never touch it. Both are real
      // players, and only the second kind ever clears a run in the dark - a bot
      // that always keeps the bottle clear can never earn that badge, which is
      // a fact about the bot rather than about the game.
      const worksTheLight = seed % 2 === 0;
      const lampState = {};
      for (let f = 0; f < 250000 && !game.isOver; f += 1) {
        const settled = !game.inLight && game.phase === PHASE.FALLING
          ? !steer(game, target) : false;
        if (!game.inLight && game.phase === PHASE.FALLING) game.setSoftDrop(settled);
        const lamp = worksTheLight ? workTheLamp(game, lampState, { ready: settled }) : null;
        if (game.inLight) steerLight(game, lamp);
        game.update(FRAME);
        for (const event of game.drainEvents()) {
          for (const id of discoveriesIn(event)) book.record(id, 'pharmaceutical');
          if (event.type === 'spawn') {
            target = plan(game);
            game.setSoftDrop(false);
          }
          if (event.type === 'levelComplete') {
            game.advanceLevel();
            target = plan(game);
          }
        }
      }
    }
    const missing = DISCOVERY_IDS.filter((id) => !book.has(id));
    assert.deepEqual(missing, [], `nothing in play ever triggers: ${missing.join(', ')}`);
  });

  return 'every modifier bends a rule and none of them breaks one';
});

stage('versus', 'Two bottles, one exchange of garbage', (check) => {
  check('every attack sent is an attack received', () => {
    const rng = createRng(88);
    const match = new VersusMatch({ level: 3, speed: 'HIGH', seed: 4242 });
    let queued = [0, 0];
    const targets = [3, 3];
    for (let i = 0; i < 40000 && !match.over; i += 1) {
      for (const [p, player] of match.players.entries()) {
        if (player.phase !== PHASE.FALLING) continue;
        if (player.pill.x < targets[p]) match.command(p, 'right');
        else if (player.pill.x > targets[p]) match.command(p, 'left');
        else if (rng.int(3) === 0) {
          match.command(p, 'hardDrop');
          targets[p] = rng.int(8);
        }
      }
      match.update(16);
      for (const event of match.drainEvents()) {
        if (event.type === 'garbageQueued') queued[event.player] += event.count;
      }
    }
    assert.equal(queued[0], match.attacksSent[1], 'player 1 received what player 2 sent');
    assert.equal(queued[1], match.attacksSent[0], 'player 2 received what player 1 sent');
  });

  check('a match always resolves to exactly one winner', () => {
    for (const seed of [1, 7, 13, 99]) {
      const rng = createRng(seed);
      const match = new VersusMatch({ level: 5, speed: 'HIGH', seed });
      const targets = [3, 3];
      let frames = 0;
      while (!match.over && frames < 60000) {
        frames += 1;
        for (const [p, player] of match.players.entries()) {
          if (player.phase !== PHASE.FALLING) continue;
          if (player.pill.x < targets[p]) match.command(p, 'right');
          else if (player.pill.x > targets[p]) match.command(p, 'left');
          else if (rng.int(3) === 0) {
            match.command(p, 'hardDrop');
            targets[p] = rng.int(8);
          }
        }
        match.update(16);
        match.drainEvents();
      }
      assert.ok(match.over, `seed ${seed} never resolved`);
      assert.ok([0, 1].includes(match.winner));
    }
  });

  check('one player\'s input never touches the other bottle', () => {
    const match = new VersusMatch({ seed: 6 });
    const snapshot = match.players[1].board.toStrings();
    for (let i = 0; i < 50; i += 1) {
      match.command(0, 'left');
      match.command(0, 'rotateCW');
      match.command(0, 'hardDrop');
      match.update(16);
      match.drainEvents();
      if (match.over) break;
    }
    assert.deepEqual(
      match.players[1].board.toStrings(),
      snapshot,
      'player two\'s board moved on its own',
    );
  });
  return 'garbage is conserved and the bottles stay separate';
});

stage('playtest', 'The game must be playable, not merely legal', (check) => {
  // A thinner version of tools/playtest.mjs: the gauntlet gate is that a
  // landed capsule is always steerable and a hurry never outruns a hand. The
  // full report, with a bot playing whole games, is `npm run playtest`.
  // An absolute floor, not SOFT_DROP_MIN: checking the tuning against the
  // constant it comes from is a check that cannot fail. 60ms a row is about
  // the fastest a capsule can fall with a lateral still placeable into it.
  const HAND_FLOOR = 60;

  check('a hurry never outruns a hand at any speed', () => {
    for (const speed of ['LOW', 'MEDIUM', 'HIGH']) {
      for (const level of [0, 10, 20]) {
        const game = new Game({ level, speed, seed: 3 });
        game.pillsPlaced = 80;
        game.setSoftDrop(true);
        assert.ok(
          game.fallInterval >= HAND_FLOOR,
          `${speed} level ${level} hurries at ${game.fallInterval}ms a row,`
          + ` under the ${HAND_FLOOR}ms a hand needs`,
        );
      }
    }
  });

  check('hurrying changes a speed and never moves the capsule', () => {
    // Three symptoms, one cause. The drop timer banked MILLISECONDS toward the
    // next row against an interval that pressing hurry could shrink sevenfold,
    // so a nearly-full cell was suddenly worth seven rows and got cashed in on
    // the next frame. Reported from play as "sometimes hurry is hurry and
    // sometimes it will still snap", as things "going really fast", and as the
    // capsule leaping on screen - and it felt random because how far it snapped
    // depended on where in the gravity cycle the key went down.
    for (const speed of Object.keys(SPEEDS)) {
      for (const tier of [0, 4, 8, 16]) {
        for (let share = 0.05; share < 1; share += 0.05) {
          const game = new Game({ level: 0, speed, seed: 11 });
          game.board.forEachCell((c, x, y) => game.board.set(x, y, null));
          game.pillsPlaced = tier * PILLS_PER_SPEED_UP;
          game.spawnPill();
          game.update(DEAL_DELAY + 2);
          game.dropTimer = 0;
          game.update(game.dropInterval * share);

          const row = game.pill.y;
          const drawn = game.dropProgress;
          game.setSoftDrop(true);
          assert.equal(game.pill.y, row, `${speed} t${tier}: the press itself moved the capsule`);
          assert.ok(
            Math.abs(game.dropProgress - drawn) < 0.02,
            `${speed} t${tier} at ${share.toFixed(2)}: the press jumped the capsule from`
            + ` ${drawn.toFixed(2)} to ${game.dropProgress.toFixed(2)} of a cell`,
          );
          game.update(16);
          assert.ok(
            game.pill.y - row <= 1,
            `${speed} t${tier} at ${share.toFixed(2)}: hurrying dropped`
            + ` ${game.pill.y - row} rows in one frame`,
          );
        }
      }
    }
  });

  check('a rotation never lifts the capsule', () => {
    // Reported from play: lining a capsule up with a notch, turning it, and
    // watching it hop ON TOP of the thing it was meant to slot beside. Two of
    // the kick tables had upward nudges in them. Nothing else in this game
    // moves a capsule up, and a rotation that does is worse than one that
    // simply does not happen - a refusal can be answered with a sideways nudge
    // and another try, a hop cannot be undone.
    const rng = createRng(4242);
    for (let seed = 0; seed < 60; seed += 1) {
      const board = new Board();
      generateLevel(board, 8 + (seed % 12), createRng(seed));
      for (let i = 0; i < 30; i += 1) {
        const x = rng.int(board.width);
        const y = 4 + rng.int(board.height - 4);
        if (board.isEmpty(x, y)) board.set(x, y, cell(rng.int(COLOR_COUNT), PILL, null));
      }
      for (let x = 0; x < board.width; x += 1) {
        for (let y = 0; y < board.height; y += 1) {
          for (let orientation = 0; orientation < 4; orientation += 1) {
            const pill = createPill([0, 1], x, y, orientation);
            if (!fits(board, pill)) continue;
            for (const direction of [1, -1]) {
              const turned = tryRotate(board, pill, direction);
              if (!turned) continue;
              const was = Math.max(...pillCells(pill).map((c) => c.y));
              const now = Math.max(...pillCells(turned).map((c) => c.y));
              assert.ok(
                turned.y >= pill.y && now >= was,
                `seed ${seed}: rotating at ${x},${y} o${orientation} lifted the capsule`,
              );
            }
          }
        }
      }
    }
  });

  check('a landed capsule always has time to be steered', () => {
    for (const speed of ['LOW', 'MEDIUM', 'HIGH']) {
      const game = new Game({ level: 12, speed, seed: 9 });
      for (let x = 0; x < game.board.width; x += 1) {
        for (let y = 3; y < game.board.height; y += 1) {
          if (!game.board.get(x, y)) game.board.set(x, y, cell((x + y) % 3, PILL, null));
        }
      }
      game.spawnPill();
      game.setSoftDrop(true);
      for (let i = 0; i < 200; i += 1) {
        game.update(16);
        if (game.phase !== PHASE.FALLING || !game.pill) break;
        if (!tryMove(game.board, game.pill, 0, 1)) {
          assert.ok(
            game.lockBudget - game.lockTimer > 150,
            `${speed} left only ${game.lockBudget - game.lockTimer}ms on landing`,
          );
          break;
        }
      }
    }
  });

  check('hurrying is faster than gravity but never instant', () => {
    for (const speed of ['LOW', 'MEDIUM', 'HIGH']) {
      const game = new Game({ level: 0, speed, seed: 4 });
      const gravity = game.dropInterval;
      game.setSoftDrop(true);
      assert.ok(game.fallInterval < gravity, `${speed} does not hurry`);
      assert.ok(game.fallInterval >= HAND_FLOOR, `${speed} hurry is a snap`);
    }
  });

  return 'a capsule can always be steered where it lands';
});

stage('performance', 'A frame must fit in a frame', (check) => {
  let worst = 0;
  let total = 0;
  let samples = 0;
  check('worst-case updates stay well inside the frame budget', () => {
    const game = new Game({ level: MAX_LEVEL, speed: 'HIGH', resistance: true, seed: 77 });
    const rng = createRng(5);
    let column = 0;
    for (let i = 0; i < 6000; i += 1) {
      if (game.phase === PHASE.FALLING) {
        if (game.pill.x < column) game.move(1);
        else if (game.pill.x > column) game.move(-1);
        else if (rng.int(2) === 0) {
          game.hardDrop();
          column = rng.int(8);
        }
      }
      const started = performance.now();
      game.update(16);
      const elapsed = performance.now() - started;
      worst = Math.max(worst, elapsed);
      total += elapsed;
      samples += 1;
      game.drainEvents();
      if (game.isOver) game.reset(MAX_LEVEL, (game.seed + 1) >>> 0);
    }
    // 16.7ms is one frame at 60Hz; the rules should use a sliver of it.
    assert.ok(worst < 8, `worst update took ${worst.toFixed(2)}ms`);
    assert.ok(total / samples < 0.5, `average update took ${(total / samples).toFixed(3)}ms`);
  });

  check('generating the hardest level is not a stall', () => {
    const started = performance.now();
    for (let i = 0; i < 50; i += 1) generateLevel(new Board(), MAX_LEVEL, createRng(i));
    const each = (performance.now() - started) / 50;
    assert.ok(each < 20, `level generation took ${each.toFixed(2)}ms`);
  });
  return `worst ${worst.toFixed(2)}ms, average ${(total / samples).toFixed(3)}ms per update`;
});

stage('browser', 'The real page in a real browser', (check) => {
  let output;
  try {
    output = execFileSync(process.execPath, ['tools/browser-check.mjs'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const combined = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    if (error.status === 2 || /Playwright is not installed/.test(combined)) {
      return { skipped: 'Playwright is not installed' };
    }
    // Surface the checks that actually failed, with their reasons, rather than
    // whatever happened to be at the end of the output.
    const lines = combined.split('\n');
    const failed = lines
      .map((line, i) => ({ line, next: lines[i + 1] ?? '' }))
      .filter(({ line }) => line.startsWith('FAIL'))
      .map(({ line, next }) => `${line.replace(/^FAIL\s+/, '')} — ${next.trim()}`);
    for (const failure of failed) {
      check(failure, () => assert.fail('failed in the browser'));
    }
    if (failed.length === 0) {
      check('the browser checks ran', () => assert.fail(combined.trim().split('\n').slice(-3).join(' ')));
    }
    return `${failed.length} browser check${failed.length === 1 ? '' : 's'} failed`;
  }
  const summary = /(\d+)\/(\d+) browser checks passed/.exec(output);
  check('every browser check passes', () => {
    assert.ok(summary, 'no summary line from the browser checks');
    assert.equal(summary[1], summary[2], `${summary[1]} of ${summary[2]} passed`);
  });
  return `${summary?.[2] ?? '?'} browser checks`;
});

// ---- runner ----------------------------------------------------------------

const args = process.argv.slice(2);
if (args.includes('--list')) {
  for (const { name, blurb } of stages) console.log(`${name.padEnd(14)} ${blurb}`);
  process.exit(0);
}
const wanted = args.filter((a) => !a.startsWith('-'));
const selected = wanted.length ? stages.filter((s) => wanted.includes(s.name)) : stages;
if (selected.length === 0) {
  console.error(`No stage matched ${wanted.join(', ')}. Try --list.`);
  process.exit(2);
}

console.log('RxDrop UltraGauntlet\n');
let failures = 0;
let skipped = 0;
const started = performance.now();

for (const [index, { name, blurb, run }] of selected.entries()) {
  const checks = [];
  const check = (label, fn) => {
    try {
      fn();
      checks.push({ label, ok: true });
    } catch (error) {
      checks.push({ label, ok: false, error: error.message.split('\n')[0] });
    }
  };
  const began = performance.now();
  let note = '';
  try {
    note = run(check) ?? '';
  } catch (error) {
    checks.push({ label: 'stage crashed', ok: false, error: error.message.split('\n')[0] });
  }
  const took = performance.now() - began;

  if (note && typeof note === 'object' && note.skipped) {
    skipped += 1;
    console.log(`${index + 1}. ${name} — SKIPPED (${note.skipped})`);
    continue;
  }

  const bad = checks.filter((c) => !c.ok);
  failures += bad.length;
  const badge = bad.length === 0 ? 'PASS' : 'FAIL';
  console.log(`${index + 1}. ${name} — ${badge}  (${blurb}, ${(took / 1000).toFixed(1)}s)`);
  for (const c of checks) {
    console.log(`     ${c.ok ? 'ok  ' : 'FAIL'} ${c.label}${c.ok ? '' : `\n          ${c.error}`}`);
  }
  if (note) console.log(`     · ${note}`);
}

const elapsed = ((performance.now() - started) / 1000).toFixed(1);
console.log(
  `\n${failures === 0 ? 'GAUNTLET PASSED' : `GAUNTLET FAILED (${failures} check${failures === 1 ? '' : 's'})`}` +
    ` — ${selected.length - skipped}/${selected.length} stages run in ${elapsed}s`,
);
process.exit(failures === 0 ? 0 : 1);
