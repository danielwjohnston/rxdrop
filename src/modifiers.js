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
    icon: '☣',
    blurb: 'Viruses replicate. Capsules come twice as fast.',
    detail: 'Every few capsules a virus spreads into an empty cell beside it. '
      + 'Gravity halves to pay for it, so you place roughly twice as many '
      + 'capsules in the same minute. The empty space you were saving is now a '
      + 'liability.',
    bound: 'A virus replicates once and never again, never above the virus '
      + 'ceiling, and never past 1.6 times the viruses the level started with.',
  }),
  Object.freeze({
    id: 'blackout',
    name: 'Blackout',
    icon: '◐',
    blurb: 'The bottle goes dark. Hold the light to bring it back.',
    detail: 'Light drains away and the bottle fades. The light-therapy control '
      + 'is held, not pressed, and it spends a reservoir that refills while you '
      + 'play - so the question is when to spend it, never whether you '
      + 'remembered it. Clear a run while the bottle is dark for the badge.',
    bound: 'The reservoir always refills, so light is always available given '
      + 'time, and the bottle never fades to fully black.',
  }),
  Object.freeze({
    id: 'rationing',
    name: 'Rationing',
    icon: '⊘',
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
    icon: '✖',
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
    icon: '⌷',
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
export function normaliseModifiers(input) {
  if (!input) return Object.freeze([]);
  const wanted = new Set(typeof input === 'string' ? [input] : input);
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
