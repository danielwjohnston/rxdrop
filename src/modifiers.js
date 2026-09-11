/**
 * Run modifiers: the axis that makes one run different from the next.
 *
 * A modifier is a small, declarative description - a name, a line of copy, and
 * the rule it bends. The Game owns all the state they touch, because a mechanic
 * that keeps state outside the game object is a mechanic that breaks replays,
 * and a seed reproducing a game exactly is the first stage of the gauntlet.
 *
 * What is here is the description and the pure helpers. What is in game.js is
 * the four or five places a modifier is consulted.
 *
 * Every modifier carries a `bound`: the sentence that says why it cannot leave
 * a virus unanswerable. If you cannot write that sentence for a new modifier,
 * the modifier is not ready, whatever it does for variety.
 */
import {
  BOARD_WIDTH,
  COLOR_COUNT,
  LIGHT_SPILL,
  LIGHT_SPILL_BY_LINES,
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
    // Icons are drawn, not typed. A glyph is a bet on the reader's font
    // having it, and that bet loses: the first version of the picker showed
    // quarantine as a tofu box on a phone. These are paths in a 24x24 box.
    icon: 'M12 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6M5 15a3 3 0 1 1 0 6 3 3 0 0 1 0-6'
      + 'M19 15a3 3 0 1 1 0 6 3 3 0 0 1 0-6M12 10v4M12 14l-5 2M12 14l5 2',
    blurb: 'Viruses replicate. Capsules come twice as fast.',
    detail: 'Every few capsules a virus spreads into an empty cell beside it. '
      + 'Gravity halves to pay for it, so you place roughly twice as many '
      + 'capsules in the same minute. The empty space you were saving is now a '
      + 'liability.',
    bound: 'A virus replicates once and never again, never above the virus '
      + 'ceiling, and never past 1.6 times the viruses the level started with.',
  }),
  Object.freeze({
    id: 'phototherapy',
    name: 'Phototherapy',
    icon: 'M12 3v3M12 18v3M4.2 7.5l2.6 1.5M17.2 15l2.6 1.5M4.2 16.5l2.6-1.5'
      + 'M17.2 9l2.6-1.5M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
    blurb: 'The bottle silts up. Go make light to cut it.',
    detail: 'Colonies shield themselves behind a matrix, so the bottle clouds '
      + 'row by row, worst where the disease is worst. Cutting it is a second '
      + 'treatment you deliver rather than a switch you flip: enter the light '
      + 'chamber and tetromino-shaped light falls, and a completed line lights '
      + 'that ROW of the patient. The cost is the dose in your hand - going to '
      + 'the lamp places it where it would have landed, and the next capsule '
      + 'waits until you come back.',
    bound: 'The fog never hides the falling capsule or the column it will land '
      + 'in, a row never goes fully black, the fog plateaus rather than '
      + 'compounding, the lamp always comes back after its cooldown, and a run '
      + 'can be won without ever entering the chamber.',
  }),
  Object.freeze({
    id: 'rationing',
    name: 'Rationing',
    icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M6 6l12 12',
    blurb: 'Only two medicines are in stock at a time.',
    detail: 'One colour is out of stock for a spell, and the disease you cannot '
      + 'reach is the disease that gets worse: while a medicine is out of stock, '
      + 'viruses of that colour build tolerance every capsule. Two colours make '
      + 'runs easier to build, so without that the modifier would be a relief '
      + 'rather than a challenge - the playtest measured exactly that.',
    bound: `The withheld colour rotates every ${RATION_SPELL} capsules, so no `
      + 'colour is ever out of stock for longer than that, and tolerance always '
      + 'has an answer in the medicine it never built a defence against.',
  }),
  Object.freeze({
    id: 'contaminated',
    name: 'Contaminated batch',
    icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M8 8l8 8M16 8l-8 8',
    blurb: 'Some capsule halves are inert. They clear nothing.',
    detail: 'A bad batch stacks and falls like any other capsule but belongs to '
      + 'no run. Dumping it somewhere harmless is a skill of its own - and '
      + 'somewhere harmless turns out to be somewhere you plan to clear.',
    bound: 'An inert half washes out with any clear it is touching, so a bad '
      + 'batch is never permanent weight in the bottle.',
  }),
  Object.freeze({
    id: 'quarantine',
    name: 'Quarantine',
    icon: 'M8 3v18M16 3v18M8 7l8-4M8 13l8-4M8 19l8-4',
    blurb: 'A column is sealed off until you clear beside it.',
    detail: 'The bottle gets narrower and the shape of the board becomes the '
      + 'puzzle. Clear a cell in either neighbouring column to break the seal.',
    bound: `A seal lifts on its own after ${QUARANTINE_MAX} capsules and never `
      + 'takes a spawn column, so it can neither be permanent nor block the deal.',
  }),
]);

export const MODIFIER_IDS = Object.freeze(MODIFIERS.map((m) => m.id));

/** The modifier with this id, or undefined. */
export const modifierFor = (id) => MODIFIERS.find((m) => m.id === id);

/**
 * Normalises whatever the caller passed - an array, a Set, a single id, junk -
 * into a frozen array of known ids in declaration order, with no duplicates.
 * Order matters only so that two runs with the same modifiers describe
 * themselves the same way.
 */
/**
 * Ids that have been renamed, so a link someone shared before the rename still
 * opens the thing they meant.
 */
const RENAMED = Object.freeze({ blackout: 'phototherapy' });

export function normaliseModifiers(input) {
  if (!input) return Object.freeze([]);
  const raw = typeof input === 'string' ? [input] : [...input];
  const wanted = new Set(raw.map((id) => RENAMED[id] ?? id));
  return Object.freeze(MODIFIER_IDS.filter((id) => wanted.has(id)));
}

/** A short label for a set of modifiers, for the HUD and for share links. */
export function describeModifiers(ids) {
  const list = normaliseModifiers(ids);
  if (list.length === 0) return 'Standard';
  return list.map((id) => modifierFor(id).name).join(' + ');
}

// ---- outbreak -------------------------------------------------------------

/**
 * Picks the cells a replication tick would fill.
 *
 * A virus may replicate once in its life and only into an empty cell at or
 * below `topRow` - the same ceiling the level generator obeys - so an outbreak
 * can never seed the neck it would take the run away with. The caller enforces
 * the population ceiling.
 */
export function outbreakTargets(board, rng, limit, topRow) {
  const parents = [];
  board.forEachCell((c, x, y) => {
    if (c.type !== VIRUS || c.spread) return;
    parents.push({ x, y });
  });
  if (parents.length === 0) return [];
  // Shuffle so the outbreak is not always in the same corner of the bottle,
  // and so the choice is seeded like everything else.
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

/** The most viruses an outbreak may grow a level to. */
export const outbreakCeiling = (startingViruses) =>
  Math.ceil(startingViruses * OUTBREAK_CEILING);

// ---- rationing ------------------------------------------------------------

/**
 * Which colour is out of stock after this many capsules. Rotating rather than
 * re-rolling is deliberate: it makes the wait for the colour you need
 * predictable, which turns "the game is withholding it" into "three more
 * capsules and it is back".
 */
export const rationedOut = (pillsPlaced) =>
  Math.floor(pillsPlaced / RATION_SPELL) % COLOR_COUNT;

// ---- phototherapy ---------------------------------------------------------

/**
 * How much the fog lifts around a lit row.
 *
 * The row itself clears outright. Light scatters, so rows either side clear by
 * half as much again for each step out, and clearing several lines at once
 * reaches further than clearing them one at a time - the same shape as a
 * cascade, and the reason to stack rather than take every single line.
 */
export function lightSpill(row, lines, height) {
  const reach = LIGHT_SPILL_BY_LINES[Math.min(lines, LIGHT_SPILL_BY_LINES.length - 1)] * LIGHT_SPILL;
  const lifted = [];
  for (let y = Math.max(0, row - reach); y <= Math.min(height - 1, row + reach); y += 1) {
    const distance = Math.abs(y - row);
    lifted.push({ row: y, clears: distance === 0 ? 1 : 1 / (distance + 1) });
  }
  return lifted;
}

// ---- quarantine -----------------------------------------------------------

/**
 * Which column to seal next. Never a spawn column, and never the column the
 * last seal was in, so the bottle does not narrow in the same place twice.
 */
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
