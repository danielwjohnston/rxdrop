/**
 * Playtest: a bot that actually plays RxDrop, and a report on how it felt.
 *
 * The gauntlet proves the rules are legal. This asks a different question -
 * whether the game is PLAYABLE - by driving the real input surface (move,
 * rotate, soft drop) over many games and measuring the things a player
 * complains about when they are wrong:
 *
 *   - the reaction budget: how long a capsule rests, steerable, before it locks
 *   - juggling room: how far it can still be walked sideways after it lands
 *   - hurry: how long a held soft drop takes to cross an empty bottle
 *   - whether a competent player actually gets anywhere
 *
 * Run: node tools/playtest.mjs [--games N] [--verbose]
 */
import { performance } from 'node:perf_hooks';

import { Game, PHASE } from '../src/game.js';
import { createRng } from '../src/rng.js';
import { fits, pillCells, tryMove, tryRotate } from '../src/pill.js';
import { isHybrid, parentsOf } from '../src/board.js';
import { BOARD_HEIGHT, LOCK_RESETS, VIRUS } from '../src/constants.js';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(args[i + 1]);
};
const VERBOSE = args.includes('--verbose');
const GAMES = flag('games', 6);
const FRAME = 16;

// ---- the bot --------------------------------------------------------------

/** Column heights, and the count of covered gaps under them. */
function survey(board) {
  const heights = [];
  let holes = 0;
  for (let x = 0; x < board.width; x += 1) {
    let top = board.height;
    for (let y = 0; y < board.height; y += 1) {
      if (board.get(x, y)) {
        top = y;
        break;
      }
    }
    heights.push(board.height - top);
    for (let y = top + 1; y < board.height; y += 1) if (!board.get(x, y)) holes += 1;
  }
  return { heights, holes };
}

/**
 * Scores a candidate landing. Deliberately simple: sit next to viruses of your
 * own colour, keep the stack low and un-pocketed. A great player it is not; a
 * consistent one it is, which is what a measurement needs.
 */
function scorePlacement(board, cells) {
  let score = 0;
  for (const { x, y, color } of cells) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const near = board.get(x + dx, y + dy);
      if (!near) continue;
      if (near.color === color) score += near.type === VIRUS ? 22 : 6;
      // A hybrid answers to no run of its own, so building a parent colour
      // alongside one is the only approach that leads anywhere.
      else if (isHybrid(near) && parentsOf(near.color).includes(color)) score += 16;
    }
    score += (y / board.height) * 14;
  }
  return score;
}

/**
 * Viruses this placement would actually kill, which is the whole game - plus
 * the parent colours it would deliver to a hybrid alongside.
 *
 * A hybrid belongs to no run, so a bot that only counts matched viruses never
 * treats one and the report would say hybrids are unanswerable when what is
 * really unanswerable is the bot. Delivering a parent is worth about half a
 * kill; landing both at once synthesises an antibody and is worth more than
 * either.
 */
function killsFrom(board, tolerance) {
  const matched = board.findMatches();
  if (matched.size === 0) return 0;
  let viruses = 0;
  const cleared = [];
  for (const key of matched) {
    const [x, y] = key.split(',').map(Number);
    const c = board.get(x, y);
    if (c?.type === VIRUS) viruses += 1;
    if (c) cleared.push({ x, y, color: c.color });
  }
  let delivered = 0;
  if (tolerance) {
    for (const { x, y, colors } of board.hybridDeliveries(cleared)) {
      const had = new Set(board.get(x, y)?.cured ?? []);
      const both = parentsOf(board.get(x, y).color).every((p) => had.has(p) || colors.has(p));
      delivered += both ? 260 : 90;
    }
  }
  return viruses * 200 + matched.size * 12 + delivered;
}

/** Picks a landing for the capsule in play. */
function plan(game) {
  const board = game.board;
  const before = survey(board);
  let best = null;
  for (let orientation = 0; orientation < 4; orientation += 1) {
    for (let x = -1; x <= board.width; x += 1) {
      // Start from the first row this shape actually fits in. A vertical
      // capsule on the spawn row has its partner at y = -1, so anchoring the
      // search at the capsule's own row silently drops every vertical
      // placement - which is half the game.
      let candidate = null;
      for (let y = 0; y < board.height; y += 1) {
        const probe = { ...game.pill, x, y, orientation, kick: null };
        if (fits(board, probe)) {
          candidate = probe;
          break;
        }
      }
      if (!candidate) continue;
      // Drop it and see where it settles.
      for (;;) {
        const next = tryMove(board, candidate, 0, 1);
        if (!next) break;
        candidate = next;
      }
      const cells = pillCells(candidate);
      const stamped = cells.map(({ x: cx, y: cy }) => `${cx},${cy}`);
      for (const { x: cx, y: cy, color } of cells) board.set(cx, cy, { color, type: 'pill', link: null });
      const kills = killsFrom(board, game.resistance);
      const after = survey(board);
      for (const key of stamped) {
        const [cx, cy] = key.split(',').map(Number);
        board.set(cx, cy, null);
      }
      const peak = Math.max(...after.heights);
      const value =
        kills
        + scorePlacement(board, cells)
        - (after.holes - before.holes) * 40
        - peak * 3;
      if (!best || value > best.value) best = { value, x, orientation };
    }
  }
  return best;
}

/**
 * Drives the capsule toward a plan with real inputs, one frame at a time.
 * Returns true while it still has work to do. Rotation comes first because a
 * turn can kick the capsule sideways, so steering afterwards is what makes the
 * column stick; and it only reports "settled" when it is genuinely in place,
 * not when a rotation happened to be refused.
 */
function steer(game, target) {
  if (!target || !game.pill) return false;
  if (game.pill.orientation !== target.orientation) {
    if (game.rotate(1)) return true;
    // Rotation refused where it stands: shuffle out and try again next frame.
    game.move(game.pill.x > 0 ? -1 : 1);
    return true;
  }
  if (game.pill.x < target.x) {
    game.move(1);
    return true;
  }
  if (game.pill.x > target.x) {
    game.move(-1);
    return true;
  }
  return false;
}

// ---- measurement ----------------------------------------------------------

/**
 * How long the capsule where it now rests could still be steered, and how far
 * sideways it could still be walked. Both are what "juggling" means in
 * practice: a landing you can still change your mind about.
 */
function reactionBudget(game) {
  if (!game.pill || game.phase !== PHASE.FALLING) return null;
  if (tryMove(game.board, game.pill, 0, 1)) return null;
  let lateral = 0;
  for (const dir of [-1, 1]) {
    let probe = game.pill;
    for (let step = 0; step < game.board.width; step += 1) {
      const next = tryMove(game.board, probe, dir, 0);
      if (!next) break;
      probe = next;
      lateral += 1;
    }
  }
  return { ms: game.lockBudget - game.lockTimer, lateral };
}

function playOne({ level, speed, resistance, seed }) {
  const game = new Game({ level, speed, resistance, seed });
  const rng = createRng(seed * 7 + 3);
  const stats = {
    capsules: 0,
    clears: 0,
    cascades: 0,
    collateral: 0,
    shrugs: 0,
    hybrids: 0,
    cured: 0,
    antibodies: 0,
    levelsCleared: 0,
    budgets: [],
    laterals: [],
    frames: 0,
  };
  let target = plan(game);
  let hurrying = false;
  let grounded = false;

  for (let frame = 0; frame < 90000; frame += 1) {
    stats.frames += 1;
    if (game.phase === PHASE.FALLING) {
      const settled = !steer(game, target);
      // Once it is where it wants to be, hold the hurry - which is exactly the
      // input a player uses, and the one the drop-style change is about.
      if (settled !== hurrying) {
        hurrying = settled;
        game.setSoftDrop(settled);
      }
      const budget = reactionBudget(game);
      if (budget && !grounded) {
        grounded = true;
        stats.budgets.push(budget.ms);
        stats.laterals.push(budget.lateral);
      } else if (!budget) {
        grounded = false;
      }
    }
    const wasFalling = game.phase === PHASE.FALLING;
    game.update(FRAME);
    for (const event of game.drainEvents()) {
      if (event.type === 'spawn') {
        stats.capsules += 1;
        target = plan(game);
        hurrying = false;
        grounded = false;
        game.setSoftDrop(false);
      } else if (event.type === 'clear') {
        stats.clears += 1;
        if (event.combo > 1) stats.cascades += 1;
        stats.collateral += event.collateral ?? 0;
        stats.cured += event.cured ?? 0;
        stats.antibodies += event.antibodies ?? 0;
      } else if (event.type === 'resist') {
        stats.shrugs += event.count;
      } else if (event.type === 'mutate') {
        stats.hybrids += event.hybrids ?? 0;
      } else if (event.type === 'levelComplete') {
        stats.levelsCleared += 1;
        if (game.level >= 20) return stats;
        game.advanceLevel();
        target = plan(game);
      }
    }
    if (!wasFalling && game.phase === PHASE.FALLING && !target) target = plan(game);
    if (game.phase === PHASE.LOST) break;
  }
  return stats;
}

/** How long a held hurry takes to cross an empty bottle, in seconds. */
function hurryCrossing(speed, level) {
  const game = new Game({ level, speed, seed: 1 });
  game.board.forEachCell((c, x, y) => game.board.set(x, y, null));
  game.spawnPill();
  game.setSoftDrop(true);
  let ms = 0;
  const startY = game.pill.y;
  while (game.phase === PHASE.FALLING && ms < 30000) {
    game.update(FRAME);
    ms += FRAME;
    if (!game.pill) break;
    if (game.pill.y >= game.board.height - 1) break;
  }
  return { seconds: ms / 1000, rows: (game.pill?.y ?? BOARD_HEIGHT) - startY };
}

/**
 * Threading: can a capsule actually be walked down a narrow channel?
 *
 * This is the "juggling" complaint made measurable. A one-wide shaft jogs a
 * column every four rows, with the rows at each jog opened out so a capsule can
 * step across - a corridor that turns in a single row is impossible for any
 * two-cell piece and would measure nothing. The capsule is steered down using
 * only real moves, one frame at a time. If gravity outruns the steering it gets
 * stranded on a ledge, and the depth reached says how far you could thread it.
 */
const shaftFor = (y) => 2 + (Math.floor(y / 4) % 2) * 3;

function threading(speed, { hurry }) {
  const game = new Game({ level: 0, speed, seed: 2 });
  const board = game.board;
  board.forEachCell((c, x, y) => board.set(x, y, null));

  for (let y = 4; y < board.height; y += 1) {
    const open = new Set([shaftFor(y)]);
    if (y % 4 === 0 || (y + 1) % 4 === 0) {
      const from = Math.min(shaftFor(y - 2), shaftFor(y + 2));
      const to = Math.max(shaftFor(y - 2), shaftFor(y + 2));
      for (let x = from; x <= to; x += 1) open.add(x);
    }
    for (let x = 0; x < board.width; x += 1) {
      if (!open.has(x)) board.set(x, y, { color: (x + y) % 3, type: 'pill', link: null });
    }
  }

  game.spawnPill();
  // Vertical, so it fits a one-wide shaft at all.
  if (game.pill && game.pill.orientation % 2 === 0) game.rotate(1);
  game.setSoftDrop(Boolean(hurry));

  let deepest = game.pill?.y ?? 0;
  for (let frame = 0; frame < 3000 && game.phase === PHASE.FALLING && game.pill; frame += 1) {
    const want = shaftFor(Math.min(board.height - 1, game.pill.y + 2));
    if (game.pill.x < want) game.move(1);
    else if (game.pill.x > want) game.move(-1);
    game.update(FRAME);
    if (game.pill) deepest = Math.max(deepest, game.pill.y);
  }
  return { depth: deepest, of: board.height - 1 };
}

// ---- report ---------------------------------------------------------------

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const min = (xs) => (xs.length ? Math.min(...xs) : 0);

const setups = [
  { level: 0, speed: 'LOW', resistance: false },
  { level: 5, speed: 'LOW', resistance: true },
  { level: 10, speed: 'MEDIUM', resistance: true },
  { level: 16, speed: 'HIGH', resistance: true },
];

console.log('RxDrop playtest\n');
const started = performance.now();
let failures = 0;

console.log('Hurry: how long a held soft drop takes to cross an empty bottle');
for (const speed of ['LOW', 'MEDIUM', 'HIGH']) {
  const { seconds, rows } = hurryCrossing(speed, 0);
  const perRow = (seconds / Math.max(1, rows)) * 1000;
  const verdict = perRow >= 60 ? 'steerable' : 'TOO FAST TO STEER';
  if (perRow < 60) failures += 1;
  console.log(
    `  ${speed.padEnd(7)} ${seconds.toFixed(2)}s for ${rows} rows`
    + `  (${perRow.toFixed(0)}ms a row, ${verdict})`,
  );
}

console.log('\nPlay: a bot steering with real inputs');
const allBudgets = [];
const allLaterals = [];
const hybridRows = [];
for (const setup of setups) {
  const runs = [];
  for (let i = 0; i < GAMES; i += 1) runs.push(playOne({ ...setup, seed: 1000 + i * 17 }));
  const label = `L${setup.level} ${setup.speed}${setup.resistance ? ' +res' : ''}`;
  const budgets = runs.flatMap((r) => r.budgets);
  const laterals = runs.flatMap((r) => r.laterals);
  allBudgets.push(...budgets);
  allLaterals.push(...laterals);
  console.log(
    `  ${label.padEnd(16)}`
    + ` capsules ${String(Math.round(mean(runs.map((r) => r.capsules)))).padStart(4)}`
    + ` | clears ${String(Math.round(mean(runs.map((r) => r.clears)))).padStart(3)}`
    + ` | cascades ${String(Math.round(mean(runs.map((r) => r.cascades)))).padStart(3)}`
    + ` | levels ${mean(runs.map((r) => r.levelsCleared)).toFixed(1)}`
    + (setup.resistance
      ? ` | shrugs ${String(Math.round(mean(runs.map((r) => r.shrugs)))).padStart(3)}`
        + ` | collateral ${String(Math.round(mean(runs.map((r) => r.collateral)))).padStart(3)}`
      : ''),
  );
  if (setup.resistance) {
    hybridRows.push({
      label,
      formed: runs.reduce((n, r) => n + r.hybrids, 0),
      cured: runs.reduce((n, r) => n + r.cured, 0),
      antibodies: runs.reduce((n, r) => n + r.antibodies, 0),
    });
  }
  if (VERBOSE) {
    console.log(`      reaction budget mean ${mean(budgets).toFixed(0)}ms, worst ${min(budgets).toFixed(0)}ms`);
  }
}

// A hybrid that forms and is never treated is the contraindication the whole
// formulary is written against: an interaction the player cannot answer. The
// bot understands the mechanic well enough to deliver a parent colour, so if it
// never cures one across every run, the mechanic is unanswerable in practice
// however clean the unit tests are.
console.log('\nHybrids: strains that combined, and what came apart again');
const formed = hybridRows.reduce((n, r) => n + r.formed, 0);
const treated = hybridRows.reduce((n, r) => n + r.cured, 0);
for (const row of hybridRows) {
  const verdict = row.formed === 0 ? 'none formed' : row.cured > 0 ? 'answered' : 'UNANSWERED';
  console.log(
    `  ${row.label.padEnd(16)}`
    + ` formed ${String(row.formed).padStart(3)}`
    + ` | cured ${String(row.cured).padStart(3)}`
    + ` | antibodies ${String(row.antibodies).padStart(3)}`
    + `  ${verdict}`,
  );
}
if (formed > 0 && treated === 0) {
  failures += 1;
  console.log('  a hybrid formed in every run and none was ever treated');
}

console.log('\nThreading: steering a capsule down a one-wide zigzag corridor');
for (const speed of ['LOW', 'MEDIUM', 'HIGH']) {
  for (const hurry of [false, true]) {
    const { depth, of } = threading(speed, { hurry });
    const share = depth / of;
    const verdict = share >= 0.9 ? 'threaded' : share >= 0.6 ? 'partly' : 'STRANDED';
    if (share < 0.6) failures += 1;
    console.log(
      `  ${speed.padEnd(7)}${hurry ? 'hurrying' : 'gravity '}`
      + `  reached row ${String(depth).padStart(2)}/${of}  ${verdict}`,
    );
  }
}

console.log('\nJuggling: what you can still do once a capsule has landed');
console.log(`  reaction budget   mean ${mean(allBudgets).toFixed(0)}ms, worst ${min(allBudgets).toFixed(0)}ms`);
console.log(`  lateral room      mean ${mean(allLaterals).toFixed(1)} columns still reachable`);
console.log(`  lock resets       ${LOCK_RESETS} nudges, each buying the full window back`);

// A landing you cannot react to is the complaint this tool exists to catch.
if (mean(allBudgets) < 200) {
  console.log('\n  FAIL a landed capsule averages under 200ms of thinking time');
  failures += 1;
}
if (min(allBudgets) < 60) {
  console.log('\n  FAIL some landings gave under 60ms to react');
  failures += 1;
}
if (mean(allLaterals) < 1) {
  console.log('\n  FAIL a landed capsule usually cannot be walked anywhere');
  failures += 1;
}

const elapsed = ((performance.now() - started) / 1000).toFixed(1);
console.log(`\n${failures === 0 ? 'PLAYTEST PASSED' : `PLAYTEST FAILED (${failures})`} in ${elapsed}s`);
process.exit(failures === 0 ? 0 : 1);
