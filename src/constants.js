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
 * Phototherapy: the fog, and the light you make to cut it.
 *
 * The bottle does not "go dark" on a timer any more. It SILTS UP, row by row,
 * worst where the disease is worst - colonies shield themselves behind a
 * matrix, which is both why the fog exists and why it protects them. Cutting
 * it is a second treatment you deliver rather than a switch you flip: you enter
 * a light chamber, tetromino-shaped light falls, and a completed line lights
 * that ROW of the patient.
 *
 * The cost is the dose in your hand: going to the lamp commits the capsule
 * where it stands and holds the next deal until you come back. That is the
 * decision the old blackout never asked - is it worth the placement you are
 * holding to see the bottom of the bottle again. (Letting the capsule fall on
 * unsteered was tried first and was much worse: every abandoned one lands in
 * the spawn column, and eight visits top the bottle out.)
 *
 * Three of these are deliberately variants rather than settled numbers. Which
 * one plays best is a question for a hand, not for an argument, so all three
 * ship behind toggles and get cut or kept on evidence.
 */

/** How wide the light chamber is. Narrow makes each line cost something. */
export const LIGHT_WIDTH_NARROW = 5;
export const LIGHT_WIDTH_FULL = BOARD_WIDTH;

/**
 * Milliseconds per row a light piece falls, and the hurried version.
 *
 * Much faster than a capsule. You are in the chamber for seconds, not minutes,
 * and a session that only lands five pieces buys one line - which is a terrible
 * exchange for the capsules you are not steering while you are in there.
 */
export const LIGHT_FALL = 190;
export const LIGHT_FALL_FAST = 55;

/**
 * Light spills. A completed line clears the fog from its own row outright and
 * halves it this many rows either side, because light scatters and because one
 * row out of seventeen per visit is not worth the capsules a visit costs.
 */
export const LIGHT_SPILL = 1;

/**
 * Clearing several lines at once is worth more than clearing them one at a
 * time, the same way a cascade is: this is the multiplier on how far the spill
 * reaches, indexed by lines cleared together. Four at once floods the bottle.
 */
export const LIGHT_SPILL_BY_LINES = Object.freeze([0, 1, 2, 4, 99]);

/**
 * How long a locked light cell lasts before it fades.
 *
 * Light that does not become a line dissipates, so the chamber is never a safe
 * room to hide in when the bottle gets frightening: you make lines or you lose
 * what you put in.
 */
export const LIGHT_DECAY = 7000;

/** With the timer variant, how long one session in the chamber lasts. */
export const LIGHT_SESSION = 6000;

/**
 * How long after leaving the lamp before you can go back to it.
 *
 * This is the answer to the only real abuse the mechanic has: with the fog at
 * its ceiling the case for going to the lamp is ALWAYS true, so without a
 * cooldown the lamp is not a decision, it is a room - the playtest bot lived
 * in it 95% of the run and placed a fifth of the capsules it otherwise would.
 * A fixed cooldown makes the lamp a rhythm: work, go, work.
 *
 * It always expires, and it is never running at the start of a run, so the
 * lamp can never be taken away - only made to wait.
 */
export const LIGHT_COOLDOWN = 9000;

/**
 * The fog. Rate is per millisecond per virus in the row, so a row holding three
 * colonies silts three times as fast as one holding a single virus.
 */
export const FOG_RATE = 0.000022;
/** A clear a virus shrugs off: it has just proved it is shielded. */
export const FOG_SHRUG = 0.18;
/** A hybrid is the worst of them, and fogs whether or not you touch it. */
export const FOG_HYBRID = 2.5;
/** Killing a virus clears the air in its row. */
export const FOG_RELIEF = 0.22;
/**
 * The ceiling on fog, and the floor on what you can see through it.
 *
 * The fog PLATEAUS rather than compounding toward zero: ignore the lamp for a
 * whole run and the bottle is hard to read, never unplayable. And the falling
 * capsule is drawn over the fog rather than under it, so the dark costs you
 * information about the stack, never the ability to act.
 */
export const FOG_MAX = 0.82;
/** Above this a row counts as fogged, which is what a badge is worth. */
export const FOGGED_AT = 0.5;

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
