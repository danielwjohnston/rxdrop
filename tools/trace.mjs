/**
 * Reference traces: the contract another engine is checked against.
 *
 * A trace is a seed, a fixed frame length and a log of player commands, with
 * what the JS rules did in response: a digest of the observable state after
 * every frame, a full snapshot at every spawn, and the events each frame
 * raised. Replay the log in a port, compute the same snapshot, and the first
 * frame whose digest differs is where the port changed the rules. That is the
 * differential oracle docs/branch-audit.md (Phase B, B2) calls for, and
 * docs/portability.md says what a port has to reproduce.
 *
 * Nothing here is part of the game, so it lives in tools/ beside the bot.
 */
import { Game } from '../src/game.js';
import { VersusMatch } from '../src/versus.js';
import { Board } from '../src/board.js';
import { createPill, fits, tryRotate } from '../src/pill.js';
import { createRng } from '../src/rng.js';
import { BOARD_HEIGHT, BOARD_WIDTH, FOGGED_AT, VIRUS } from '../src/constants.js';

export const TRACE_FORMAT = 'rxdrop-trace';
export const TRACE_VERSION = 1;

/**
 * The input vocabulary, the same one VersusMatch.command routes. A port maps
 * its own keys, pads and touches onto these and nothing else.
 */
export const COMMANDS = Object.freeze([
  'left',
  'right',
  'rotateCW',
  'rotateCCW',
  'softDropOn',
  'softDropOff',
  'hardDrop',
  'light',
]);

/** Applies one command to a solo game, exactly as VersusMatch.command does. */
export function command(game, action) {
  switch (action) {
    case 'left':
      return game.move(-1);
    case 'right':
      return game.move(1);
    case 'rotateCW':
      return game.rotate(1);
    case 'rotateCCW':
      return game.rotate(-1);
    case 'softDropOn':
      game.setSoftDrop(true);
      return true;
    case 'softDropOff':
      game.setSoftDrop(false);
      return true;
    case 'hardDrop':
      return game.hardDrop();
    case 'light':
      game.toggleLight();
      return true;
    default:
      throw new Error(`unknown command "${action}"`);
  }
}

const integer = (value, what) => {
  if (!Number.isSafeInteger(value)) throw new Error(`${what} is ${value}, not an integer`);
  return value;
};

/** Hybrid deliveries are kept as a set; the snapshot spells them in order. */
const colorSet = (colors, what) =>
  [...colors].map((c) => integer(c, what)).sort((a, b) => a - b).join('+');

/**
 * One cell as a token. Everything the rules can still read about a cell is
 * in it; nothing that only animates is.
 *
 *   .           empty
 *   V3 / P1     a virus / a capsule half of that colour (3-5 are hybrids)
 *   l r u d     the direction a capsule half is linked in
 *   rN          virus resistance
 *   kN          the colour a tolerance is capped by
 *   dN          hybrid decay, when above zero
 *   i           an inert half from a contaminated batch
 *   s           a virus that arrived by outbreak spread
 *   uA+B        hybrid parents delivered so far
 *   hA+B        hybrid parents delivered in the cascade still running
 */
function cellToken(cell, chain) {
  if (!cell) return '.';
  let token = `${cell.type === VIRUS ? 'V' : 'P'}${integer(cell.color, 'color')}`;
  if (cell.link) token += cell.link[0];
  if (cell.resistance !== undefined) token += `r${integer(cell.resistance, 'resistance')}`;
  if (cell.cappedBy !== undefined && cell.cappedBy !== null) {
    token += `k${integer(cell.cappedBy, 'cappedBy')}`;
  }
  if (cell.decay) token += `d${integer(cell.decay, 'decay')}`;
  if (cell.inert) token += 'i';
  if (cell.spread) token += 's';
  if (cell.cured?.length) token += `u${colorSet(cell.cured, 'cured')}`;
  if (cell.chain === chain && cell.chained?.length) token += `h${colorSet(cell.chained, 'chained')}`;
  return token;
}

/** A row's fog as the rules read it: F fogged, f filmed, . clear. */
const fogToken = (fog) => (fog >= FOGGED_AT ? 'F' : fog > 0 ? 'f' : '.');

/**
 * Everything about a game that a player could see, or that decides what
 * happens next, as integers, booleans and strings only. Floats never enter:
 * fog is read as the two thresholds the rules use, and the timers show up as
 * the capsule moving, a frame early or late.
 */
export function snapshot(game) {
  const { board, pill, chamber } = game;
  const rows = [];
  for (let y = 0; y < board.height; y += 1) {
    const row = [];
    for (let x = 0; x < board.width; x += 1) row.push(cellToken(board.get(x, y), game.chain));
    rows.push(row.join(' '));
  }
  let light = null;
  if (chamber) {
    const lit = [];
    for (let y = 0; y < chamber.height; y += 1) {
      let row = '';
      for (let x = 0; x < chamber.width; x += 1) row += chamber.at(x, y) ? '#' : '.';
      lit.push(row);
    }
    const piece = chamber.piece;
    light = {
      piece: piece
        ? `${piece.id}@${integer(piece.x, 'x')},${integer(piece.y, 'y')}/${integer(piece.rotation, 'rotation')}`
        : null,
      rows: lit,
    };
  }
  return {
    phase: game.phase,
    level: integer(game.level, 'level'),
    score: integer(game.score, 'score'),
    viruses: integer(game.virusesLeft, 'viruses'),
    over: game.isOver,
    pill: pill
      ? `${integer(pill.x, 'x')},${integer(pill.y, 'y')}/${integer(pill.orientation, 'orientation')}`
        + `:${pill.colors.map((c) => integer(c, 'color')).join('')}`
        + (Number.isInteger(pill.inert) && pill.inert >= 0 ? `i${pill.inert}` : '')
        // The nudge the last turn needed, owed back by the next one.
        + (pill.kick ? `k${pill.kick.map((n) => integer(n, 'kick')).join(',')}` : '')
      : null,
    next: (game.nextColors ?? []).map((c) => integer(c, 'next')).join(''),
    board: rows,
    sealed: board.sealed === undefined ? null : integer(board.sealed, 'sealed'),
    fog: game.fog.map(fogToken).join(''),
    incoming: game.incoming.map((c) => integer(c, 'incoming')).join(''),
    light,
  };
}

/**
 * FNV-1a, 32 bits, over the snapshot's JSON text. The text is ASCII by
 * construction and its keys come in the order written above, so another
 * engine can produce the same bytes and therefore the same digest.
 */
export function digest(state) {
  return fnv1a(JSON.stringify(state));
}

/** 32-bit FNV-1a of ASCII text, as eight hex digits. */
export function fnv1a(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code > 0x7f) throw new Error('a snapshot must be ASCII');
    hash = Math.imul(hash ^ code, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** What a trace records of one event: its type, and who raised it in versus. */
const eventTag = (event) => (event.player === undefined ? event.type : `${event.player}:${event.type}`);

/** A fresh solo game or versus match for a trace's setup. */
export function stage(trace) {
  if (trace.mode === 'versus') return new VersusMatch(trace.setup);
  return new Game(trace.setup);
}

/** The games a stage holds, in player order. */
export const playersOf = (staged) => (staged instanceof VersusMatch ? staged.players : [staged]);

/** The state a trace digests: a game's snapshot, or both players' and the result. */
export function observe(staged) {
  if (staged instanceof VersusMatch) {
    return { players: staged.players.map(snapshot), winner: staged.winner };
  }
  return snapshot(staged);
}

/**
 * Plays a trace's input log against the JS rules and returns what happened,
 * in the same shape the trace stores. Inputs for frame N are applied, in
 * order, before frame N's update.
 */
export function replay(trace) {
  const staged = stage(trace);
  const players = playersOf(staged);
  const byFrame = new Map();
  for (const [frame, player, action] of trace.inputs) {
    if (!COMMANDS.includes(action)) throw new Error(`frame ${frame}: unknown command "${action}"`);
    if (!byFrame.has(frame)) byFrame.set(frame, []);
    byFrame.get(frame).push([player, action]);
  }
  const digests = [];
  const checkpoints = [];
  const events = [];
  for (let frame = 0; frame < trace.frames; frame += 1) {
    for (const [player, action] of byFrame.get(frame) ?? []) {
      if (staged instanceof VersusMatch) staged.command(player, action);
      else command(players[player], action);
    }
    staged.update(trace.frameMs);
    const raised = staged.drainEvents();
    const state = observe(staged);
    digests.push(digest(state));
    if (raised.length) events.push([frame, ...raised.map(eventTag)]);
    if (raised.some((event) => event.type === 'spawn') || frame === trace.frames - 1) {
      checkpoints.push({ frame, state });
    }
  }
  return { digests: digests.join(' '), checkpoints, events };
}

// ---- rotation golden ------------------------------------------------------

/**
 * Rotation is the code a port most often gets almost right: the kick tables
 * are tried in a deliberate order, and a nudge owed by the last turn is tried
 * before any of them. Real play rarely reaches the branches where that order
 * decides the outcome, so the traces alone do not pin it. These cases do:
 * seeded random stacks, a capsule that fits somewhere in them, owing one of
 * the kicks or none, turned either way - and where it ended up.
 */
export const ROTATION_FORMAT = 'rxdrop-rotations';

const pillText = (pill) =>
  `${pill.x},${pill.y}/${pill.orientation}${pill.kick ? ` k${pill.kick.join(',')}` : ''}`;

function parsePill(text) {
  const match = /^(-?\d+),(-?\d+)\/(\d)(?: k(-?\d+),(-?\d+))?$/.exec(text);
  if (!match) throw new Error(`bad capsule "${text}"`);
  const [, x, y, orientation, kx, ky] = match;
  const pill = createPill([0, 1], Number(x), Number(y), Number(orientation));
  pill.kick = kx === undefined ? null : [Number(kx), Number(ky)];
  return pill;
}

/** Where a turn leaves the capsule, as the golden file spells it. */
export function rotationResult({ board, pill, direction }) {
  const turned = tryRotate(Board.from(board), parsePill(pill), direction);
  return turned ? pillText(turned) : null;
}

export function rotationCases(seed, count) {
  const rng = createRng(seed);
  const owed = [null, [1, 0], [-1, 0], [0, 1]];
  const cases = [];
  while (cases.length < count) {
    const density = 0.15 + rng() * 0.45;
    const board = [];
    for (let y = 0; y < BOARD_HEIGHT; y += 1) {
      let row = '';
      for (let x = 0; x < BOARD_WIDTH; x += 1) row += rng() < density ? rng.pick([...'rybRYB']) : '.';
      board.push(row);
    }
    const pill = createPill([0, 1], rng.int(BOARD_WIDTH), rng.int(BOARD_HEIGHT), rng.int(4));
    pill.kick = rng.pick(owed);
    if (!fits(Board.from(board), pill)) continue;
    const entry = { board, pill: pillText(pill), direction: rng() < 0.5 ? 1 : -1 };
    cases.push({ ...entry, result: rotationResult(entry) });
  }
  return cases;
}
