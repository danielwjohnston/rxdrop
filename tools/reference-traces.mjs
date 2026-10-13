/**
 * Records and checks the reference traces in test/fixtures/traces/.
 *
 *   node tools/reference-traces.mjs                  check every trace still replays
 *   node tools/reference-traces.mjs --write          re-record them all, and rotation-golden.json
 *   node tools/reference-traces.mjs --show NAME N    print the snapshot after frame N
 *
 * Re-record only after a deliberate rules change, and say so in the commit:
 * the traces are what a native or Godot port is held to, so changing them
 * changes the contract. test/reference-traces.test.js fails until you do.
 *
 * The bot (tools/bot.mjs) picks the moves, but it plays through the same eight
 * commands a player has (tools/trace.mjs COMMANDS) and the log records only
 * those. A port replays the log; it never needs the bot.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PHASE } from '../src/game.js';
import { dailySetup } from '../src/daily.js';
import { FRAME, plan, planLight } from './bot.mjs';
import {
  ROTATION_FORMAT, TRACE_FORMAT, TRACE_VERSION, command, observe, playersOf, replay,
  rotationCases, rotationResult, stage,
} from './trace.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const TRACE_DIR = resolve(ROOT, 'test/fixtures/traces');
export const ROTATION_FILE = resolve(ROOT, 'test/fixtures/rotation-golden.json');
const ROTATION_SEED = 20261010;
const ROTATION_CASES = 600;
const MAX_FRAMES = 3600; // 57.6 s of play at 16ms
const CHECKPOINT_EVERY = 8; // spawns between full snapshots

/**
 * One scenario per mechanic a port must reproduce. `style` varies how the bot
 * finishes a capsule so all eight commands appear somewhere.
 */
export const SCENARIOS = [
  {
    name: 'classic',
    purpose: 'Gravity, locking, matching and a level cleared, with no resistance.',
    setup: { level: 0, speed: 'LOW', seed: 11 },
    style: { settle: 'soft', turn: 'rotateCW' },
  },
  {
    name: 'resistance',
    purpose: 'Resistance, tolerance, collateral sensitivity and hybrids, at speed.',
    setup: { level: 10, speed: 'MEDIUM', seed: 20261010, resistance: true },
    style: { settle: 'hard', turn: 'rotateCCW' },
  },
  {
    name: 'outbreak-quarantine-rationing',
    purpose: 'Outbreak spread, a sealed column and rationed colours together.',
    setup: {
      level: 6, speed: 'MEDIUM', seed: 31337, resistance: true,
      modifiers: ['outbreak', 'quarantine', 'rationing'],
    },
    style: { settle: 'soft', turn: 'rotateCW' },
  },
  {
    name: 'contaminated',
    purpose: 'Inert capsule halves from a contaminated batch.',
    setup: { level: 5, speed: 'LOW', seed: 4242, resistance: true, modifiers: ['contaminated'] },
    style: { settle: 'soft', turn: 'rotateCCW' },
  },
  {
    name: 'phototherapy',
    purpose: 'Film, fog and the light chamber, worked until the sample is sterile.',
    setup: { level: 2, speed: 'LOW', seed: 1, resistance: true, modifiers: ['phototherapy'] },
    style: { settle: 'soft', turn: 'rotateCW', exitAt: 0, lampMs: 40000 },
  },
  {
    name: 'phototherapy-neglected',
    purpose: 'The lamp never used: clears in the dark, and a hybrid cured into an antibody.',
    setup: { level: 6, speed: 'LOW', seed: 1, resistance: true, modifiers: ['phototherapy'] },
    style: { settle: 'hard', turn: 'rotateCW', lamp: 'never' },
  },
  {
    name: 'phototherapy-flooded',
    purpose: 'Light dropped without aiming until the chamber floods, then the lamp again.',
    setup: { level: 3, speed: 'LOW', seed: 1, resistance: true, modifiers: ['phototherapy'] },
    style: { settle: 'soft', turn: 'rotateCW', lamp: 'clumsy' },
  },
  {
    name: 'daily-2026-10-10',
    purpose: 'The daily for 10 October 2026, set up exactly as the game deals it.',
    setup: (({ key, daily, ...options }) => options)(dailySetup('2026-10-10')),
    style: { settle: 'hard', turn: 'rotateCW' },
  },
  {
    name: 'versus',
    purpose: 'Two bottles, one deal, and garbage sent between them.',
    mode: 'versus',
    setup: { level: 5, speed: 'HIGH', seed: 55 },
    style: [{ settle: 'soft', turn: 'rotateCW' }, { settle: 'hard', turn: 'rotateCCW' }],
  },
];

/** A player the bot drives one command at a time, the way a hand would. */
function driver(style) {
  return { style, target: null, settled: false, lampMs: 0, lightPiece: -1, lightHurry: false };
}

/**
 * The commands the bot wants this frame, issued through `send` so each is
 * recorded. Mirrors tools/bot.mjs steer/workTheLamp, but never touches the
 * game except through a command.
 */
function act(game, me, send) {
  // lamp: 'clean' works the lamp well; 'never' leaves the bench in the dark;
  // 'clumsy' only hurries the light, which floods the chamber.
  const lamp = me.style.lamp ?? 'clean';
  if (game.has('phototherapy') && lamp !== 'never') {
    if (!game.inLight) {
      const ready = me.settled || game.pill === null;
      if (ready && game.lampReady && game.worstFog >= 0.5) {
        send('light');
        me.lampMs = 0;
        me.lightHurry = false;
        return;
      }
    } else {
      me.lampMs += FRAME;
      // Ten seconds at the lamp at most, so a minute's trace is not all chamber.
      if (game.worstFog <= (me.style.exitAt ?? 0.05) || me.lampMs >= (me.style.lampMs ?? 10000)) {
        send('light');
        return;
      }
      const { chamber } = game;
      // The chamber keeps its hurry from piece to piece, so let go for each
      // new piece and press again once it is lined up - as with a capsule.
      if (me.lightPiece !== chamber.spawns) {
        me.lightPiece = chamber.spawns;
        if (me.lightHurry) {
          me.lightHurry = false;
          send('softDropOff');
          return;
        }
      }
      const target = planLight(chamber);
      const piece = chamber.piece;
      if (!piece || !target || me.lightHurry) return;
      if (lamp === 'clumsy') {
        me.lightHurry = true;
        send('softDropOn');
        return;
      }
      if (piece.rotation !== target.rotation) send('rotateCW');
      else if (piece.x < target.x) send('right');
      else if (piece.x > target.x) send('left');
      else {
        me.lightHurry = true;
        send('softDropOn');
      }
      return;
    }
  }
  if (game.phase !== PHASE.FALLING || !game.pill || me.settled) return;
  const { pill } = game;
  if (!me.target) me.target = plan(game);
  const { target } = me;
  if (!target) return;
  if (pill.orientation !== target.orientation) {
    // Refused where it stands: shuffle away from the wall and try again.
    if (!send(me.style.turn)) send(pill.x > 0 ? 'left' : 'right');
    return;
  }
  if (pill.x < target.x) {
    send('right');
    return;
  }
  if (pill.x > target.x) {
    send('left');
    return;
  }
  me.settled = true;
  send(me.style.settle === 'hard' ? 'hardDrop' : 'softDropOn');
}

/** Plays a scenario with the bot and returns its input log. */
function record(scenario) {
  const trace = { mode: scenario.mode ?? 'solo', setup: scenario.setup };
  const staged = stage(trace);
  const players = playersOf(staged);
  const styles = Array.isArray(scenario.style) ? scenario.style : [scenario.style];
  const drivers = players.map((_, index) => driver(styles[index] ?? styles[0]));
  const inputs = [];
  let frame = 0;
  let end = MAX_FRAMES;
  const sendFor = (index) => (action) => {
    inputs.push([frame, index, action]);
    return trace.mode === 'versus' ? staged.command(index, action) : command(players[index], action);
  };
  for (; frame < MAX_FRAMES; ) {
    players.forEach((game, index) => act(game, drivers[index], sendFor(index)));
    staged.update(FRAME);
    const events = staged.drainEvents();
    frame += 1;
    // Reacting to a spawn happens after the update, so it lands on the next frame.
    for (const event of events) {
      if (event.type !== 'spawn') continue;
      const index = event.player ?? 0;
      const me = drivers[index];
      me.target = null;
      if (me.settled && me.style.settle === 'soft') sendFor(index)('softDropOff');
      me.settled = false;
    }
    const over = trace.mode === 'versus' ? staged.over : staged.isOver;
    if (over) {
      end = frame + 1;
      break;
    }
  }
  return { inputs: inputs.filter(([f]) => f < end), frames: end };
}

/** Thins the replay's spawn snapshots to every Nth, keeping the final frame. */
function thin(checkpoints, frames) {
  return checkpoints.filter((point, index) => index % CHECKPOINT_EVERY === 0 || point.frame === frames - 1);
}

export function build(scenario) {
  const { inputs, frames } = record(scenario);
  const trace = {
    format: TRACE_FORMAT,
    version: TRACE_VERSION,
    name: scenario.name,
    purpose: scenario.purpose,
    mode: scenario.mode ?? 'solo',
    setup: scenario.setup,
    frameMs: FRAME,
    frames,
    inputs,
  };
  const result = replay(trace);
  return { ...trace, ...result, checkpoints: thin(result.checkpoints, frames) };
}

/** JSON with one input, checkpoint row or event per line: diffable, not huge. */
export function format(trace) {
  const line = (value) => JSON.stringify(value);
  const list = (items, indent = '    ') => `[\n${items.map((item) => indent + line(item)).join(',\n')}\n  ]`;
  const checkpoints = trace.checkpoints.map(({ frame, state }) => {
    const { board, ...rest } = state.players ? { board: null, ...state } : state;
    return `    { "frame": ${frame}, "state": ${line(board ? { ...rest, board } : state)} }`;
  });
  return `{
  "format": ${line(trace.format)},
  "version": ${trace.version},
  "name": ${line(trace.name)},
  "purpose": ${line(trace.purpose)},
  "mode": ${line(trace.mode)},
  "setup": ${line(trace.setup)},
  "frameMs": ${trace.frameMs},
  "frames": ${trace.frames},
  "inputs": ${list(trace.inputs)},
  "events": ${list(trace.events)},
  "checkpoints": [\n${checkpoints.join(',\n')}\n  ],
  "digests": ${line(trace.digests)}
}
`;
}

export function readRotations() {
  return JSON.parse(readFileSync(ROTATION_FILE, 'utf8'));
}

export function readTraces() {
  return readdirSync(TRACE_DIR)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => JSON.parse(readFileSync(resolve(TRACE_DIR, file), 'utf8')));
}

function main(argv) {
  const [flag, ...rest] = argv;
  if (flag === undefined) {
    let failed = 0;
    for (const trace of readTraces()) {
      const again = replay(trace);
      const ours = again.digests.split(' ');
      const theirs = trace.digests.split(' ');
      const first = theirs.findIndex((d, i) => d !== ours[i]);
      if (first === -1 && ours.length === theirs.length) {
        console.log(`ok    ${trace.name} (${trace.frames} frames, ${trace.inputs.length} commands)`);
      } else {
        failed += 1;
        console.log(`FAIL  ${trace.name}: first differs at frame ${first}`);
      }
    }
    const { cases } = readRotations();
    const wrong = cases.filter((c) => rotationResult(c) !== c.result).length;
    if (wrong) failed += 1;
    console.log(`${wrong ? 'FAIL ' : 'ok   '} rotation-golden (${cases.length} turns, ${wrong} wrong)`);
    process.exitCode = failed ? 1 : 0;
    return;
  }
  if (flag === '--write' && rest.length === 0) {
    mkdirSync(TRACE_DIR, { recursive: true });
    for (const scenario of SCENARIOS) {
      const trace = build(scenario);
      writeFileSync(resolve(TRACE_DIR, `${trace.name}.json`), format(trace));
      console.log(`wrote ${trace.name}: ${trace.frames} frames, ${trace.inputs.length} commands`);
    }
    const cases = rotationCases(ROTATION_SEED, ROTATION_CASES);
    const golden = {
      format: ROTATION_FORMAT,
      version: TRACE_VERSION,
      seed: ROTATION_SEED,
      cases,
    };
    writeFileSync(
      ROTATION_FILE,
      `{\n  "format": ${JSON.stringify(golden.format)},\n  "version": ${golden.version},\n`
        + `  "seed": ${golden.seed},\n  "cases": [\n`
        + `${cases.map((c) => `    ${JSON.stringify(c)}`).join(',\n')}\n  ]\n}\n`,
    );
    console.log(`wrote rotation-golden: ${cases.length} turns`);
    return;
  }
  if (flag === '--show' && rest.length === 2) {
    const [name, at] = rest;
    const trace = readTraces().find((t) => t.name === name);
    if (!trace) throw new Error(`no trace named "${name}"`);
    const frame = Number(at);
    if (!Number.isInteger(frame) || frame < 0 || frame >= trace.frames) {
      throw new Error(`frame must be 0..${trace.frames - 1}`);
    }
    const state = observe(replayTo(trace, frame));
    console.log(JSON.stringify(state, null, 2));
    return;
  }
  // A mistyped flag is an error here, never a silent full run.
  throw new Error(`usage: reference-traces.mjs [--write | --show NAME FRAME], not "${argv.join(' ')}"`);
}

/** The staged game after `last` frames of a trace, for --show. */
function replayTo(trace, last) {
  const short = { ...trace, frames: last + 1 };
  const staged = stage(short);
  const players = playersOf(staged);
  for (let frame = 0; frame <= last; frame += 1) {
    for (const [f, player, action] of trace.inputs) {
      if (f !== frame) continue;
      if (short.mode === 'versus') staged.command(player, action);
      else command(players[player], action);
    }
    staged.update(trace.frameMs);
    staged.drainEvents();
  }
  return staged;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
