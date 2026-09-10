/**
 * Shared constants for RxDrop.
 * The bottle is the original Dr. Mario's 8 columns x 16 rows, plus one row on
 * top for the neck. Capsules spawn in the neck and fall into the bottle proper,
 * so the stack has to actually back up into the neck before a run is over.
 */

export const BOARD_WIDTH = 8;
export const BOARD_BODY_HEIGHT = 16;
export const NECK_ROWS = 1;
export const BOARD_HEIGHT = BOARD_BODY_HEIGHT + NECK_ROWS;

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

/**
 * A beat between one capsule locking and the next taking gravity. Every action
 * wants a moment to read before the next one starts - without it a capsule is
 * already falling before the player has registered what they were dealt.
 * Input is live during it; only gravity and the lock clock wait.
 */
export const DEAL_DELAY = 110;

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

/**
 * Collateral sensitivity. Resistance to one drug can create vulnerability to
 * another - it is why antibiotic cycling works, and it is the reason a virus
 * you have been hammering with the same medicine is best answered by an older
 * one instead of more of the same.
 *
 * A virus at TOLERANCE_AT or above stops answering to its own colour: a run of
 * four still clears the medicine, but the virus shrugs it off and sheds a
 * stack. What kills it is its COLLATERAL colour, cleared in a line beside it.
 *
 * The mapping is one fixed cycle - red answers to blue, yellow to red, blue to
 * yellow - so it can be learned once. The aura shows it anyway.
 */
export const TOLERANCE_AT = 2;
export const COLLATERAL = Object.freeze([COLORS.BLUE, COLORS.RED, COLORS.YELLOW]);

/** A collateral kill pays its virus payout twice. */
export const COLLATERAL_BONUS = 2;

/** Milliseconds a mutation flashes before the new colour takes over. */
export const MUTATION_ANIMATION = 420;

/** Versus: how much garbage a clear sends, and the most one clear can send. */
export const ATTACK_PER_EXTRA_CELL = 1;
export const ATTACK_PER_COMBO = 2;
export const ATTACK_CAP = 6;
