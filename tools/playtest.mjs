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
import { tryMove } from '../src/pill.js';
import { FRAME, plan, steer, steerLight, workTheLamp } from './bot.mjs';
import { MODIFIER_IDS, describeModifiers } from '../src/modifiers.js';
import { BOARD_HEIGHT, FOG_MAX, LOCK_RESETS } from '../src/constants.js';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(args[i + 1]);
};
const VERBOSE = args.includes('--verbose');
const GAMES = flag('games', 6);

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

function playOne({ level, speed, resistance, seed, modifiers = [] }) {
  const game = new Game({ level, speed, resistance, seed, modifiers });
  const rng = createRng(seed * 7 + 3);
  const stats = {
    capsules: 0,
    clears: 0,
    cascades: 0,
    collateral: 0,
    viruses: 0,
    shrugs: 0,
    hybrids: 0,
    cured: 0,
    antibodies: 0,
    spread: 0,
    seals: 0,
    sealsCleared: 0,
    lampFrames: 0,
    lampVisits: 0,
    rowsLit: 0,
    darkClears: 0,
    fog: [],
    inert: 0,
    washed: 0,
    levelsCleared: 0,
    budgets: [],
    laterals: [],
    frames: 0,
  };
  let target = plan(game);
  let hurrying = false;
  let grounded = false;
  const lamp = {};

  for (let frame = 0; frame < 90000; frame += 1) {
    stats.frames += 1;
    // Phototherapy the way a player works it: place the dose you are holding,
    // then go to the lamp once the bottle has silted up, win a couple of lines
    // and come back. Going mid-capsule dumps it, so the bot only leaves when
    // its capsule is already where it wants to be.
    if (game.has('phototherapy')) {
      const wasIn = game.inLight;
      const lightPlan = workTheLamp(game, lamp, { ready: hurrying || game.pill === null });
      if (game.inLight) {
        if (!wasIn) stats.lampVisits += 1;
        stats.lampFrames += 1;
        steerLight(game, lightPlan);
      }
      if (frame % 60 === 0) stats.fog.push(game.worstFog);
    }
    if (!game.inLight && game.phase === PHASE.FALLING) {
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
        if (event.inert >= 0) stats.inert += 1;
        target = plan(game);
        hurrying = false;
        grounded = false;
        game.setSoftDrop(false);
      } else if (event.type === 'clear') {
        stats.clears += 1;
        stats.viruses += event.viruses ?? 0;
        if (event.combo > 1) stats.cascades += 1;
        stats.collateral += event.collateral ?? 0;
        stats.cured += event.cured ?? 0;
        stats.antibodies += event.antibodies ?? 0;
        stats.washed += event.washed ?? 0;
        if (event.inTheDark) stats.darkClears += 1;
      } else if (event.type === 'lit') {
        stats.rowsLit += event.rows ?? 0;
      } else if (event.type === 'spread') {
        stats.spread += event.count;
      } else if (event.type === 'sealed') {
        stats.seals += 1;
      } else if (event.type === 'unsealed') {
        if (event.reason === 'cleared') stats.sealsCleared += 1;
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

/**
 * What a session at the lamp actually buys, and what it costs.
 *
 * A bot cannot be made to suffer for a foggy bottle - it reads the board, not
 * the pixels - so the play numbers under phototherapy would be identical to a
 * plain run by construction. What CAN be measured is the exchange rate, which
 * is the whole design: a visit wins you rows of light and costs you capsules
 * you did not place. If a visit wins nothing the modifier is a tax; if it costs
 * nothing it is a free button and the fog is decoration.
 *
 * The first tuning measured one row per six-second visit. That is a bad trade
 * and the numbers said so before a player had to.
 */
function lampExchange({ width = 5, lines = 2, maxMs = 5000, seed = 3, go = true } = {}) {
  const game = new Game({
    level: 4, speed: 'LOW', seed, modifiers: ['phototherapy'], lightWidth: width,
  });
  const lamp = {};
  let target = plan(game);
  let hurrying = false;
  let visits = 0;
  let lampFrames = 0;
  let capsules = 0;
  let peakFog = 0;
  const frames = 8000;

  for (let f = 0; f < frames; f += 1) {
    const wasIn = game.inLight;
    const lightPlan = go
      ? workTheLamp(game, lamp, { lines, maxMs, ready: hurrying || game.pill === null })
      : null;
    if (game.inLight) {
      if (!wasIn) visits += 1;
      lampFrames += 1;
      steerLight(game, lightPlan);
    } else if (game.phase === PHASE.FALLING) {
      const settled = !steer(game, target);
      if (settled !== hurrying) {
        hurrying = settled;
        game.setSoftDrop(settled);
      }
    }
    game.update(FRAME);
    peakFog = Math.max(peakFog, game.worstFog);
    for (const event of game.drainEvents()) {
      if (event.type === 'spawn') {
        capsules += 1;
        target = plan(game);
        hurrying = false;
        game.setSoftDrop(false);
      } else if (event.type === 'levelComplete') {
        game.advanceLevel();
        target = plan(game);
      }
    }
    if (game.phase === PHASE.LOST) break;
  }
  return {
    visits,
    rowsLit: game.rowsLit,
    rowsPerVisit: visits ? game.rowsLit / visits : 0,
    lampShare: lampFrames / frames,
    capsules,
    peakFog,
    fog: game.worstFog,
  };
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

// One run per modifier against the same baseline, plus the whole formulary at
// once. The point is not that the bot wins - it is that each modifier changes
// the shape of the run without making it unplayable, and that the bound each
// one claims actually holds when something is playing against it.
const modified = [
  { level: 4, speed: 'LOW', resistance: true, modifiers: [] },
  { level: 4, speed: 'LOW', resistance: true, modifiers: ['outbreak'] },
  { level: 4, speed: 'LOW', resistance: true, modifiers: ['phototherapy'] },
  { level: 4, speed: 'LOW', resistance: true, modifiers: ['rationing'] },
  { level: 4, speed: 'LOW', resistance: true, modifiers: ['contaminated'] },
  { level: 4, speed: 'LOW', resistance: true, modifiers: ['quarantine'] },
  { level: 4, speed: 'LOW', resistance: true, modifiers: MODIFIER_IDS },
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

console.log('\nModifiers: what each one does to the same bottle');
for (const setup of modified) {
  const runs = [];
  for (let i = 0; i < GAMES; i += 1) runs.push(playOne({ ...setup, seed: 4000 + i * 31 }));
  const label = describeModifiers(setup.modifiers);
  const total = (key) => runs.reduce((n, r) => n + r[key], 0);
  const notes = [];
  if (total('spread') > 0) notes.push(`spread ${total('spread')}`);
  if (total('seals') > 0) notes.push(`seals ${total('seals')}/${total('sealsCleared')} cleared`);
  if (total('inert') > 0) notes.push(`inert ${total('inert')}/${total('washed')} washed`);
  if (total('lampVisits') > 0) {
    const share = total('lampFrames') / Math.max(1, runs.reduce((n, r) => n + r.frames, 0));
    notes.push(
      `lamp ${total('lampVisits')} visits, ${(share * 100).toFixed(0)}% of the time,`
      + ` ${total('rowsLit')} rows lit, ${total('darkClears')} clears in the fog`,
    );
  }
  // Viruses per hundred capsules is the number that matters. Survival alone is
  // misleading: a modifier can make the bottle easier to keep alive while making
  // the level harder to actually finish, and only this column shows that.
  const rate = mean(runs.map((r) => (r.capsules ? (r.viruses / r.capsules) * 100 : 0)));
  console.log(
    `  ${label.padEnd(34)}`
    + ` capsules ${String(Math.round(mean(runs.map((r) => r.capsules)))).padStart(4)}`
    + ` | clears ${String(Math.round(mean(runs.map((r) => r.clears)))).padStart(3)}`
    + ` | viruses/100 ${rate.toFixed(1).padStart(4)}`
    + ` | levels ${mean(runs.map((r) => r.levelsCleared)).toFixed(1)}`
    + (notes.length ? `\n      ${notes.join(' · ')}` : ''),
  );
  // The bound every modifier claims: it changes the run, it does not end it.
  if (mean(runs.map((r) => r.capsules)) < 20) {
    failures += 1;
    console.log(`      ${label} leaves the bottle unplayable`);
  }
}

console.log('\nPhototherapy: what a session at the lamp buys, and what it costs');
{
  const sessions = [
    ['narrow chamber (5)', { width: 5 }],
    ['full-width chamber', { width: 8 }],
    ['take one line and go', { width: 5, lines: 1 }],
    ['stay for four', { width: 5, lines: 4, maxMs: 9000 }],
  ];
  for (const [name, options] of sessions) {
    const e = lampExchange(options);
    console.log(
      `  ${name.padEnd(22)}`
      + ` visits ${String(e.visits).padStart(3)}`
      + ` | rows lit ${String(e.rowsLit).padStart(3)}`
      + ` (${e.rowsPerVisit.toFixed(1)}/visit)`
      + ` | at the lamp ${(e.lampShare * 100).toFixed(0).padStart(3)}%`
      + ` | capsules ${String(e.capsules).padStart(3)}`
      + ` | peak fog ${e.peakFog.toFixed(2)}`,
    );
    // A visit has to win something. One row for a whole session was the first
    // tuning of this, and it was a trade nobody would take twice.
    if (e.visits > 0 && e.rowsPerVisit < 1) {
      failures += 1;
      console.log(`      "${name}" buys less than a row a visit - the lamp is a tax`);
    }
    // The other way it goes wrong, and the one that actually happened: with the
    // fog at its ceiling the case for going is always true, so without a
    // cooldown the bot lived at the lamp 95% of the run. A lamp you would be a
    // fool to ever leave is a room, not a decision.
    if (e.lampShare > 0.6) {
      failures += 1;
      console.log(`      "${name}" spends ${(e.lampShare * 100).toFixed(0)}% of the run at the lamp`);
    }
  }
  // The bound, measured rather than asserted: leave the lamp alone entirely and
  // the bottle silts up to a ceiling and stays there. It never goes black, and
  // a player who ignores phototherapy is playing a harder game, not a lost one.
  const ignored = lampExchange({ go: false });
  console.log(
    `  ${'never go at all'.padEnd(22)}`
    + ` visits   0 | rows lit   0 (0.0/visit) | at the lamp   0%`
    + ` | capsules ${String(ignored.capsules).padStart(3)}`
    + ` | fog settles at ${ignored.peakFog.toFixed(2)}`,
  );
  if (ignored.peakFog > FOG_MAX + 0.001) {
    failures += 1;
    console.log(`      the fog went past its ceiling (${ignored.peakFog.toFixed(3)})`);
  }
  if (ignored.capsules < 20) {
    failures += 1;
    console.log('      ignoring the lamp is not survivable, so it is not optional');
  }
}

// The complaint this measures: "sometimes hurry is hurry and sometimes it will
// still snap". A press must change the SPEED and never the position, wherever in
// the gravity cycle it lands.
console.log('\nHurry: what pressing it does at each point in a cell');
for (const speed of ['LOW', 'MEDIUM', 'HIGH']) {
  let worstRows = 0;
  let worstJump = 0;
  for (let share = 0.05; share < 1; share += 0.05) {
    const game = new Game({ level: 0, speed, seed: 11 });
    game.board.forEachCell((c, x, y) => game.board.set(x, y, null));
    game.spawnPill();
    game.update(200);
    game.dropTimer = 0;
    game.update(game.dropInterval * share);
    const row = game.pill.y;
    const drawn = game.dropProgress;
    game.setSoftDrop(true);
    worstJump = Math.max(worstJump, Math.abs(game.dropProgress - drawn));
    game.update(16);
    worstRows = Math.max(worstRows, game.pill.y - row);
  }
  const verdict = worstRows <= 1 && worstJump < 0.02 ? 'a speed, not a move' : 'STILL SNAPS';
  if (worstRows > 1 || worstJump >= 0.02) failures += 1;
  console.log(
    `  ${speed.padEnd(7)} worst ${worstRows} row(s) in the frame after the press`
    + ` | worst on-screen jump ${worstJump.toFixed(3)} of a cell  ${verdict}`,
  );
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
