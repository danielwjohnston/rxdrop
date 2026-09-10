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
 * Hurrying a capsule down. Soft drop is a MULTIPLE of the level's own gravity
 * rather than a fixed fast interval, so "a little faster" means the same thing
 * at every speed instead of jumping fifteenfold at level 0. The floor keeps it
 * from outrunning a hand at the top levels, where gravity is already quick.
 */
export const SOFT_DROP_FACTOR = 7;
// 70ms a row is about as fast as a capsule can fall while a player can still
// place a lateral into it. The playtest measures exactly this and fails below it.
export const SOFT_DROP_MIN = 70;

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

/**
 * Hybrid strains. A virus capped by the wrong medicine right to the end does
 * not merely mutate, it COMBINES with what has been sitting on it: blue under
 * yellow long enough becomes green.
 *
 * Hybrids are simply colours 3, 4 and 5 - colours no capsule is ever dealt in.
 * That single decision does all the work: the matching engine is untouched, and
 * a hybrid can never be part of a run, so no line of one colour clears it. What
 * kills it is delivering BOTH its parent colours in clears beside it.
 */
export const HYBRID_BASE = COLOR_COUNT;
export const HYBRIDS = Object.freeze([
  { color: 3, parents: Object.freeze([COLORS.RED, COLORS.YELLOW]), name: 'orange' },
  { color: 4, parents: Object.freeze([COLORS.YELLOW, COLORS.BLUE]), name: 'green' },
  { color: 5, parents: Object.freeze([COLORS.RED, COLORS.BLUE]), name: 'purple' },
]);

/**
 * Both parents in the SAME cascade synthesises an antibody: the hybrid dies and
 * takes the ring around it with it. Delivered across separate turns it still
 * dies - which is what keeps a hybrid answerable - but without the bonus.
 */
/**
 * The safety valve, mirroring the one tolerance has. Delivering the SAME parent
 * to a hybrid that has already had it wears the strain down; enough of that and
 * it decays back to an ordinary virus of that colour, which an ordinary line
 * clears. So a hybrid is answerable even when the other parent is unreachable.
 */
export const HYBRID_DECAY = 2;

export const ANTIBODY_RADIUS = 1;
export const HYBRID_BONUS = 4;

/** Milliseconds a mutation flashes before the new colour takes over. */
export const MUTATION_ANIMATION = 420;

/** Versus: how much garbage a clear sends, and the most one clear can send. */
export const ATTACK_PER_EXTRA_CELL = 1;
export const ATTACK_PER_COMBO = 2;
export const ATTACK_CAP = 6;

/**
 * Run modifiers.
 *
 * Each one bends a rule the game already has rather than sitting beside it, and
 * each pays for the pressure it adds. They stack with everything above and with
 * each other, which is where the depth comes from: three virus states times
 * three hybrid strains times a pair of modifiers is a large space built out of
 * a small rulebook.
 *
 * The constraint they all answer to is the same one the formulary is written
 * against - nothing here may leave a virus unanswerable - so every modifier
 * below has a bound on it, and the bound is what the gauntlet checks.
 */

/**
 * Outbreak: viruses replicate into empty cells every OUTBREAK_INTERVAL capsules,
 * at most OUTBREAK_MAX at a time. In exchange gravity halves, so you place
 * roughly twice as many capsules in the same minute - more disease, more
 * medicine.
 *
 * Replication compounds, so it is capped three ways: only a virus that has
 * never replicated may do so, only into a cell below the virus ceiling, and
 * never past OUTBREAK_CEILING times the viruses the level started with.
 */
export const OUTBREAK_INTERVAL = 6;
export const OUTBREAK_MAX = 2;
export const OUTBREAK_CEILING = 1.6;

/**
 * Blackout, and light therapy.
 *
 * The bottle is lit normally. Every BLACKOUT_EVERY milliseconds the lights go
 * out for BLACKOUT_LASTS, fading over BLACKOUT_FADE to BLACKOUT_FLOOR - dim
 * enough to be hard, never fully black. Holding the light-therapy control
 * brings the bottle back over LIGHT_RESTORE and spends a reservoir good for
 * LIGHT_CAPACITY milliseconds of holding, which refills over LIGHT_REFILL while
 * the lights are on.
 *
 * The numbers are chosen so the reservoir refills to roughly full in the gap
 * between blackouts and covers about two thirds of one - so every blackout is a
 * decision about WHEN to spend the light, and some of it is always played in
 * the dark. That is where the badge comes from.
 *
 * Two bounds, and they are the reason this is a mechanic rather than a
 * punishment: a blackout always ends on its own timer whatever the reservoir is
 * doing, and the bottle never fades past BLACKOUT_FLOOR. Nothing a player can
 * spend takes either of those away.
 *
 * This is the second design. The first faded the light continuously and refilled
 * it continuously, which cannot produce "mostly lit, briefly dark" at all: a
 * linear system like that drifts to one end or the other, and the playtest
 * showed it sitting at whichever end the tuning favoured - either free light or
 * half the run unreadable.
 */
export const BLACKOUT_EVERY = 14000;
export const BLACKOUT_LASTS = 5000;
export const BLACKOUT_FADE = 900;
export const BLACKOUT_FLOOR = 0.06;
export const LIGHT_RESTORE = 500;
export const LIGHT_CAPACITY = 3400;
export const LIGHT_REFILL = 9000;
/**
 * Once the reservoir is empty the light will not come on again until it has
 * climbed back to this much of a charge.
 *
 * Without that latch the reservoir oscillates on its own floor - it empties,
 * refills by one frame's worth, powers one more frame of light, empties again -
 * and the light is effectively free. That is not a hypothetical: it is how the
 * first version behaved, and holding the light forever kept the bottle at full
 * brightness the whole run.
 */
export const LIGHT_ARM = 0.35;
/** Below this the bottle counts as dark, which is what a badge is worth. */
export const DARK_AT = 0.35;

/**
 * Rationing: only two of the three medicines are dealt at a time. Every
 * RATION_SPELL capsules the withheld colour moves on, so no colour is ever
 * withheld for longer than that - which is the bound that keeps a virus of
 * the missing colour answerable.
 */
export const RATION_SPELL = 12;

/**
 * Contaminated batch: one capsule in CONTAMINATION_EVERY carries an inert half.
 * It stacks and falls like any other but belongs to no run, so dumping it
 * somewhere harmless is a skill of its own.
 *
 * Inert cells would otherwise pile up until the bottle filled, so they wash out
 * with any clear they are touching. That makes "somewhere harmless" and
 * "somewhere you will clear later" the same judgement, which is the good
 * version of the decision.
 */
export const CONTAMINATION_EVERY = 10;

/**
 * Quarantine: one column is sealed and refuses capsules. Clearing a cell in
 * either neighbouring column breaks the seal; failing that it lifts on its own
 * after QUARANTINE_MAX capsules, so a seal can never be permanent. The spawn
 * columns are never sealed, because a bottle you cannot deal into is not a
 * puzzle.
 */
export const QUARANTINE_INTERVAL = 16;
export const QUARANTINE_MAX = 6;
