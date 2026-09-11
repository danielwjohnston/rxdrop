/**
 * Run modifiers. Each modifier bends an existing rule and carries a written
 * bound explaining why it cannot make a virus unanswerable.
 */
import {
  BOARD_WIDTH,
  COLOR_COUNT,
  OUTBREAK_CEILING,
  QUARANTINE_MAX,
  RATION_SPELL,
  SPAWN_X,
  VIRUS,
} from './constants.js';

export const MODIFIERS = Object.freeze([
  Object.freeze({
    id: 'outbreak',
    name: 'Outbreak',
    icon: 'M12 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6M5 15a3 3 0 1 1 0 6 3 3 0 0 1 0-6M19 15a3 3 0 1 1 0 6 3 3 0 0 1 0-6M12 10v4M12 14l-5 2M12 14l5 2',
    blurb: 'Viruses replicate. Capsules come twice as fast.',
    detail: 'Every few capsules a virus spreads into an empty cell beside it. Gravity halves to pay for it, so the empty space you were saving becomes a liability.',
    bound: 'A virus replicates once and never again, never above the virus ceiling, and never past 1.6 times the viruses the level started with.',
  }),
  Object.freeze({
    // Keep the durable id for old URLs and stored settings; the old timed
    // blackout mechanic itself is gone.
    id: 'blackout',
    name: 'Biofilm + Phototherapy',
    icon: 'M4 15c4-7 12-7 16 0M5 18h14M7 11c2-3 8-3 10 0M12 4v4',
    blurb: 'Colonies cloud their rows. Project light lines to clear the culture.',
    detail: 'Surviving organisms build biofilm instead of an arbitrary blackout timer. Each row has its own clarity. Shift or L toggles Phototherapy: projected four-cell light structures fall through the medication stack, and a completed horizontal light line treats that same row. Medication continues under gravity while your attention is on the lamp.',
    bound: 'Biofilm plateaus at a readable clarity floor, the active capsule is redrawn above the haze, light pieces never collide with medicine, and the level remains winnable without entering Phototherapy.',
  }),
  Object.freeze({
    id: 'sonic',
    name: 'Sonic Therapy',
    icon: 'M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4',
    blurb: 'Match the acoustic sequence to open resistant membranes for treatment.',
    detail: 'Press K to enter the rhythm chamber. Four falling acoustic cues map to left, down, up and right. Accurate hits build resonance; a full phrase sends a focused ultrasound pulse into the most entrenched infected rows. Sonoporation temporarily opens organisms to drug penetration, strips a resistance step, and primes hybrid strains for their next parent medicine.',
    bound: 'A missed rhythm only delays the acoustic pulse; it never removes medication access, never creates extra blockers, and Sonic Therapy is optional rather than a gate to finishing the bottle.',
  }),
  Object.freeze({
    id: 'rationing',
    name: 'Rationing',
    icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M6 6l12 12',
    blurb: 'Only two medicines are in stock at a time.',
    detail: 'One colour is out of stock for a spell, and the disease you cannot reach is the disease that gets worse: while a medicine is out of stock, viruses of that colour build tolerance every capsule.',
    bound: `The withheld colour rotates every ${RATION_SPELL} capsules, so no colour is ever out of stock for longer than that, and tolerance always retains an answer.`,
  }),
  Object.freeze({
    id: 'contaminated',
    name: 'Contaminated batch',
    icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M8 8l8 8M16 8l-8 8',
    blurb: 'Some capsule halves are inert. They clear nothing.',
    detail: 'A bad batch stacks and falls like any other capsule but belongs to no run. Dumping it somewhere harmless is a skill of its own — and somewhere harmless turns out to be somewhere you plan to clear.',
    bound: 'An inert half washes out with any clear it is touching, so a bad batch is never permanent weight in the bottle.',
  }),
  Object.freeze({
    id: 'quarantine',
    name: 'Quarantine',
    icon: 'M8 3v18M16 3v18M8 7l8-4M8 13l8-4M8 19l8-4',
    blurb: 'A column is sealed off until you clear beside it.',
    detail: 'The bottle gets narrower and the shape of the board becomes the puzzle. Clear a cell in either neighbouring column to break the seal.',
    bound: `A seal lifts on its own after ${QUARANTINE_MAX} capsules and never takes a spawn column, so it can neither be permanent nor block the deal.`,
  }),
]);

export const MODIFIER_IDS = Object.freeze(MODIFIERS.map((m) => m.id));
export const modifierFor = (id) => MODIFIERS.find((m) => m.id === id);

export function normaliseModifiers(input) {
  if (!input) return Object.freeze([]);
  const wanted = new Set(typeof input === 'string' ? [input] : input);
  return Object.freeze(MODIFIER_IDS.filter((id) => wanted.has(id)));
}

export function describeModifiers(ids) {
  const list = normaliseModifiers(ids);
  if (list.length === 0) return 'Standard';
  return list.map((id) => modifierFor(id).name).join(' + ');
}

export function outbreakTargets(board, rng, limit, topRow) {
  const parents = [];
  board.forEachCell((cell, x, y) => {
    if (cell.type !== VIRUS || cell.spread) return;
    parents.push({ x, y });
  });
  for (let i = parents.length - 1; i > 0; i -= 1) {
    const j = rng.int(i + 1);
    [parents[i], parents[j]] = [parents[j], parents[i]];
  }
  const taken = new Set();
  const picks = [];
  for (const { x, y } of parents) {
    if (picks.length >= limit) break;
    const open = [];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (ny < topRow || !board.inBounds(nx, ny)) continue;
      if (!board.isEmpty(nx, ny) || taken.has(`${nx},${ny}`)) continue;
      open.push({ x: nx, y: ny });
    }
    if (open.length === 0) continue;
    const target = open[rng.int(open.length)];
    taken.add(`${target.x},${target.y}`);
    picks.push({ from: { x, y }, ...target, color: board.get(x, y).color });
  }
  return picks;
}

export const outbreakCeiling = (startingViruses) => Math.ceil(startingViruses * OUTBREAK_CEILING);

export const rationedOut = (pillsPlaced) => Math.floor(pillsPlaced / RATION_SPELL) % COLOR_COUNT;

export function quarantineColumn(board, rng, previous = -1) {
  const spawn = new Set([SPAWN_X, SPAWN_X + 1]);
  const options = [];
  for (let x = 0; x < BOARD_WIDTH; x += 1) {
    if (spawn.has(x) || x === previous) continue;
    options.push(x);
  }
  if (options.length === 0) return null;
  return options[rng.int(options.length)];
}
