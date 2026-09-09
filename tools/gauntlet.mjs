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

import { Board, generateLevel, virus, virusTopRow } from '../src/board.js';
import {
  MATCH_LENGTH,
  MAX_LEVEL,
  RESISTANCE_INTERVAL,
  RESISTANCE_MAX,
  SPEEDS,
  VIRUS,
} from '../src/constants.js';
import { Game, PHASE } from '../src/game.js';
import { VersusMatch } from '../src/versus.js';
import { dailySetup } from '../src/daily.js';
import { createRng } from '../src/rng.js';

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
