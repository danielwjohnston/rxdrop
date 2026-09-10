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
import { FRAME, plan, steer } from './bot.mjs';
import { MODIFIER_IDS, describeModifiers } from '../src/modifiers.js';
import { BOARD_HEIGHT, LOCK_RESETS } from '../src/constants.js';

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
    darkFrames: 0,
    darkClears: 0,
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

  for (let frame = 0; frame < 90000; frame += 1) {
    stats.frames += 1;
    // Light therapy the way a player works it: spend the light once the bottle
    // has gone dim, hold until it is bright again, then let it refill. That is
    // the "when do I spend it" decision the mechanic is supposed to be about.
    if (game.has('blackout')) {
      if (game.light <= 0.45 && game.lightCharge > 0.2) game.setLight(true);
      else if (game.light >= 0.9 || game.lightCharge <= 0.02) game.setLight(false);
      if (game.isDark) stats.darkFrames += 1;
    }
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
 * The light economy under blackout: how much of the time a given policy keeps
 * the bottle out of the dark, and whether the light always comes back.
 *
 * A bot cannot be made to suffer for a dark bottle - it reads the board, not
 * the pixels - so the play numbers for blackout are identical to a plain run by
 * construction. What CAN be measured is the thing the mechanic actually rests
 * on: that the light is scarce enough to be a decision, and that it can never
 * be spent into a corner you cannot get out of.
 */
function lightEconomy(policy) {
  const game = new Game({ level: 4, speed: 'LOW', seed: 3, modifiers: ['blackout'] });
  let lit = 0;
  let dark = 0;
  let held = 0;
  let run = 0;
  let worst = 0;
  const frames = 3600;
  // Driving the light clock directly rather than through update(): a game left
  // to itself for a minute loses, and update() stops once it is over, so the
  // whole measurement would silently be of a parked page.
  for (let f = 0; f < frames; f += 1) {
    game.setLight(policy(game));
    if (game.spendingLight) held += 1;
    game.updateLight(FRAME);
    if (game.isDark) { dark += 1; run += 1; worst = Math.max(worst, run); } else {
      run = 0;
      if (game.light > 0.7) lit += 1;
    }
  }
  // The bound: a blackout ends on its own timer whatever the reservoir is
  // doing. Drop the bottle into a fresh blackout with the reservoir spent and
  // hands off the light entirely - the worst case a player can arrange - and it
  // still has to come back on its own.
  game.blackoutFor = 5000;
  game.lightCharge = 0;
  game.lightSpent = true;
  game.light = 0.06;
  let recovery = 0;
  for (; recovery < 4000; recovery += 1) {
    game.setLight(false);
    game.updateLight(FRAME);
    if (game.light >= 0.9) break;
  }
  return {
    held: held / frames,
    lit: lit / frames,
    dark: dark / frames,
    worstDarkMs: worst * FRAME,
    recovered: game.light >= 0.9,
    recoveryMs: recovery * FRAME,
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
  { level: 4, speed: 'LOW', resistance: true, modifiers: ['blackout'] },
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
  if (total('darkFrames') > 0) {
    const share = total('darkFrames') / Math.max(1, runs.reduce((n, r) => n + r.frames, 0));
    notes.push(`dark ${(share * 100).toFixed(0)}% of the time, ${total('darkClears')} clears in it`);
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

console.log('\nLight therapy: what the blackout light actually costs');
{
  const policies = [
    ['never touch it', () => false],
    ['hold it always', () => true],
    ['spend it early', (g) => g.blackoutFor > 1600],
  ];
  for (const [name, policy] of policies) {
    const e = lightEconomy(policy);
    console.log(
      `  ${name.padEnd(18)}`
      + ` held ${(e.held * 100).toFixed(0).padStart(3)}%`
      + ` | bright ${(e.lit * 100).toFixed(0).padStart(3)}%`
      + ` | dark ${(e.dark * 100).toFixed(0).padStart(3)}%`
      + ` | longest dark ${String(e.worstDarkMs).padStart(5)}ms`
      + `  ${e.recovered ? `hands off, back up in ${e.recoveryMs}ms` : 'NEVER RECOVERS'}`,
    );
    if (!e.recovered) {
      failures += 1;
      console.log(`      "${name}" can spend the light into a corner`);
    }
    // A blackout lasts five seconds. Anything much past that, hands off or not,
    // means a dark stretch has run into the next one.
    if (e.worstDarkMs > 7000) {
      failures += 1;
      console.log(`      "${name}" leaves the bottle dark for ${e.worstDarkMs}ms at a stretch`);
    }
  }
  // Holding it always is the most light anyone can have. If that keeps the
  // bottle bright the whole time, the reservoir is not a constraint and the
  // modifier is a nuisance rather than a decision - which is exactly how the
  // first tuning of this shipped.
  // Holding the light for every second of every blackout is the most anyone can
  // have. If that never leaves the bottle dark, the reservoir is not a
  // constraint and the modifier is a nuisance rather than a decision - which is
  // exactly how the first tuning of this behaved.
  const flat = lightEconomy(() => true);
  if (flat.dark < 0.04) {
    failures += 1;
    console.log('      the light is free: holding it always never goes dark');
  }
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
