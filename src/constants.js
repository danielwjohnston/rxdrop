/**
 * Shared constants for RxDrop.
 * The playfield matches the original Dr. Mario bottle: 8 columns x 16 rows.
 */

export const BOARD_WIDTH = 8;
export const BOARD_HEIGHT = 16;

/** Colour ids. The renderer and audio layers key off these. */
export const COLORS = Object.freeze({ RED: 0, YELLOW: 1, BLUE: 2 });
export const COLOR_COUNT = 3;
export const COLOR_NAMES = Object.freeze(['red', 'yellow', 'blue']);

/** Cell kinds. */
export const VIRUS = 'virus';
export const PILL = 'pill';

/** Link direction of a pill half to its partner (null once the partner is gone). */
export const LINK = Object.freeze({
  LEFT: 'left',
  RIGHT: 'right',
  UP: 'up',
  DOWN: 'down',
});

export const OPPOSITE_LINK = Object.freeze({
  left: LINK.RIGHT,
  right: LINK.LEFT,
  up: LINK.DOWN,
  down: LINK.UP,
});

/** A run of this many same-coloured cells in a line is destroyed. */
export const MATCH_LENGTH = 4;

/** Column the pivot half of a new pill spawns in (row 0). */
export const SPAWN_X = 3;
export const SPAWN_Y = 0;

export const MAX_LEVEL = 20;

/** Drop speed presets: base milliseconds per row of gravity. */
export const SPEEDS = Object.freeze({
  LOW: { name: 'LOW', baseInterval: 700, minInterval: 130, step: 26, virusScore: 100 },
  MEDIUM: { name: 'MED', baseInterval: 500, minInterval: 100, step: 22, virusScore: 200 },
  HIGH: { name: 'HI', baseInterval: 330, minInterval: 70, step: 16, virusScore: 300 },
});

/** Gravity gets faster every N pills placed. */
export const PILLS_PER_SPEED_UP = 10;

/** Milliseconds a piece may rest on the stack before it locks. */
export const LOCK_DELAY = 420;

/**
 * Moving or rotating a resting capsule buys another LOCK_DELAY, so a nudge you
 * started in time always lands. Capped so the capsule cannot be stalled there
 * forever.
 */
export const LOCK_RESETS = 8;

/**
 * A capsule that spawns with nowhere to fall gets longer, because the stack is
 * at the neck and the whole run rides on one reaction to a capsule the player
 * has had no chance to plan for. This never fires in ordinary play.
 */
export const SPAWN_GRACE = 1200;

/** Milliseconds cleared cells stay on screen popping before they vanish. */
export const CLEAR_ANIMATION = 320;

/** Milliseconds between gravity steps while the stack settles after a clear. */
export const SETTLE_INTERVAL = 70;

/**
 * Antibiotic resistance. Viruses that survive build resistance every
 * RESISTANCE_INTERVAL capsules, and mutate to another colour on reaching
 * RESISTANCE_MAX - so a setup you leave too long stops being a setup.
 */
export const RESISTANCE_INTERVAL = 8;
export const RESISTANCE_MAX = 3;

/** Milliseconds a mutation flashes before the new colour takes over. */
export const MUTATION_ANIMATION = 420;

/** Versus: how much garbage a clear sends, and the most one clear can send. */
export const ATTACK_PER_EXTRA_CELL = 1;
export const ATTACK_PER_COMBO = 2;
export const ATTACK_CAP = 6;
