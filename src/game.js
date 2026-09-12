import {
  ATTACK_CAP,
  ATTACK_PER_COMBO,
  ATTACK_PER_EXTRA_CELL,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  CLEAR_ANIMATION,
  COLLATERAL_BONUS,
  HYBRID_BONUS,
  DEAL_DELAY,
  SOFT_DROP_FACTOR,
  SOFT_DROP_MIN,
  COLOR_COUNT,
  LOCK_DELAY,
  LOCK_RESETS,
  MATCH_LENGTH,
  MAX_LEVEL,
  MUTATION_ANIMATION,
  PILLS_PER_SPEED_UP,
  RESISTANCE_INTERVAL,
  RESISTANCE_MAX,
  SETTLE_INTERVAL,
  SPAWN_GRACE,
  SPAWN_X,
  SPAWN_Y,
  SPEEDS,
  VIRUS,
  CONTAMINATION_EVERY,
  FOGGED_AT,
  FOG_HYBRID,
  FOG_MAX,
  FOG_RATE,
  FOG_RELIEF,
  FOG_SHRUG,
  FILM_REGROWTH_MAX,
  FILM_REGROWTH_STEP,
  LIGHT_SESSION,
  LIGHT_WIDTH_FULL,
  OUTBREAK_INTERVAL,
  OUTBREAK_MAX,
  QUARANTINE_INTERVAL,
  QUARANTINE_MAX,
} from './constants.js';
import { Board, cell, generateLevel, isHybrid, virusTopRow } from './board.js';
import {
  normaliseModifiers,
  outbreakCeiling,
  outbreakTargets,
  quarantineColumn,
  rationedOut,
} from './modifiers.js';
import { LightChamber } from './light.js';
import {
  createPill,
  fits,
  hardDropPosition,
  lockPill,
  tryMove,
  tryRotate,
} from './pill.js';
import { createRng } from './rng.js';

export const PHASE = Object.freeze({
  FALLING: 'falling',
  CLEARING: 'clearing',
  SETTLING: 'settling',
  MUTATING: 'mutating',
  SPREADING: 'spreading',
  WON: 'won',
  LOST: 'lost',
});


/**
 * The playable game: board, current pill, timing, scoring and the little state
 * machine that runs lock -> clear -> cascade -> spawn. It is deliberately free
 * of DOM and canvas code so it can be exercised headlessly in tests.
 */
export class Game {
  constructor({
    level = 0,
    speed = 'LOW',
    seed = Date.now(),
    width = BOARD_WIDTH,
    height = BOARD_HEIGHT,
    resistance = false,
    modifiers = [],
    lightWidth = LIGHT_WIDTH_FULL,
    lightExit = 'manual',
  } = {}) {
    /**
     * The two phototherapy variants that are rules rather than presentation.
     * Both ship as toggles because which one plays better is a question for a
     * hand, not an argument - see docs/ideas.md.
     */
    this.lightWidth = Math.max(2, Math.min(width, lightWidth));
    this.lightExit = lightExit === 'timer' ? 'timer' : 'manual';
    /** Antibiotic resistance: surviving viruses mutate. Off in classic play. */
    this.resistance = Boolean(resistance);
    /** Run modifiers, in declaration order. See src/modifiers.js. */
    this.modifiers = normaliseModifiers(modifiers);
    this.level = Math.max(0, Math.min(level, MAX_LEVEL));
    this.speedName = SPEEDS[speed] ? speed : 'LOW';
    this.speed = SPEEDS[this.speedName];
    this.seed = seed >>> 0;
    this.width = width;
    this.height = height;
    this.score = 0;
    /** Lifetime across levels, like the score. Per level, see below. */
    this.totalVirusesCleared = 0;
    this.events = [];
    this.paused = false;
    this.reset(this.level, this.seed);
  }

  /** Rebuilds the board for a level. Score carries over between levels. */
  reset(level = this.level, seed = this.seed) {
    this.level = Math.max(0, Math.min(level, MAX_LEVEL));
    this.seed = seed >>> 0;
    this.rng = createRng(this.seed);
    this.board = new Board(this.width, this.height);
    generateLevel(this.board, this.level, this.rng);
    this.startingViruses = this.board.countViruses();
    /** Cleared on this board only, so it always pairs with startingViruses. */
    this.virusesClearedThisLevel = 0;
    this.pillsPlaced = 0;
    this.softDropping = false;
    this.dropTimer = 0;
    /** The interval `dropTimer` was banked against. See rescaleDropTimer. */
    this.lastFallInterval = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.phaseTimer = 0;
    this.combo = 0;
    this.chain = {};
    this.clearingCells = [];
    this.resistedCells = [];
    this.outcome = null;
    this.cured = [];
    this.dealTimer = 0;
    this.tossing = null;
    this.bag = [];
    this.queue = [this.drawColors(), this.drawColors()];
    /** Garbage capsules sent by an opponent, applied before the next spawn. */
    this.incoming = [];
    /** Garbage this player has earned and not yet handed to the opponent. */
    this.pendingAttack = [];
    this.mutations = [];
    // ---- modifier state. All of it lives here so a seed still reproduces a
    // game exactly, which is the first thing the gauntlet checks.
    /** Outbreak: viruses spread on a tick, capped by this population. */
    this.outbreakCap = outbreakCeiling(this.startingViruses);
    this.outbreakTickedAt = -1;
    this.spreading = [];
    /**
     * Phototherapy. Fog is PER ROW - the bottle silts up worst where the
     * disease is worst, which turns the dark from noise into information.
     */
    this.fog = new Array(this.height).fill(0);
    /** The light chamber, while you are in it. Null the rest of the time. */
    this.chamber = null;
    this.lightTimer = 0;
    /** How much harder the film comes back, after failed attempts at the lamp. */
    this.filmRegrowth = 1;
    this.rowsLit = 0;
    /** A deal that fell due while the player was at the lamp. */
    this.dealHeld = false;
    this.darkClears = 0;
    /** Quarantine: the sealed column and when it was sealed. */
    this.board.sealed = undefined;
    this.sealedAt = -1;
    this.lastSealed = -1;
    this.quarantineTickedAt = -1;
    this.phase = PHASE.FALLING;
    this.pill = null;
    this.spawnPill();
  }

  /** True if this run is playing with the named modifier. */
  has(id) {
    return this.modifiers.includes(id);
  }

  /**
   * Whether tolerance is in play - a virus that stops answering to its own
   * colour and starts answering to an older one.
   *
   * It rides on the resistance rule, and rationing brings it too. That is not
   * decoration: a stock-out of one medicine is exactly how tolerance arises, and
   * without it rationing has no cost at all. Two colours make runs EASIER to
   * build, so the playtest found the modifier improving every number it
   * measured - longer runs, more clears, faster virus kills and the only setup
   * that finished levels. A modifier that makes the bottle easier while
   * claiming to make it harder is a defect, not a preference.
   */
  get tolerance() {
    return this.resistance || this.has('rationing');
  }

  /** True while the player is at the lamp rather than at the bottle. */
  get inLight() {
    return this.chamber !== null;
  }

  /** How well a row can be seen, 0..1. */
  visibilityAt(y) {
    if (!this.has('phototherapy')) return 1;
    return 1 - (this.fog[y] ?? 0);
  }

  /** The worst row in the bottle, which is what the meter shows. */
  get worstFog() {
    if (!this.has('phototherapy')) return 0;
    return Math.max(...this.fog);
  }

  /**
   * True when the row the capsule is falling through has silted up. This is the
   * live reading, for the HUD and for how it feels in the hand.
   *
   * The BADGE cannot use this: by the time a clear resolves the capsule has
   * locked and gone, so it would always read false. What counts for the badge
   * is whether the run you cleared was in a row you could not see - see
   * `clearedInTheDark`.
   */
  get isDark() {
    if (!this.has('phototherapy') || !this.pill) return false;
    return (this.fog[this.pill.y] ?? 0) >= FOGGED_AT;
  }

  /** True if any virus in this outcome died in a row that was fogged over. */
  clearedInTheDark(outcome) {
    if (!this.has('phototherapy') || !outcome) return false;
    return outcome.cleared.some(({ y, type }) =>
      type === VIRUS && (this.fog[y] ?? 0) >= FOGGED_AT);
  }

  get virusesLeft() {
    return this.board.countViruses();
  }

  get nextColors() {
    return this.queue[0];
  }

  /**
   * How fast the capsule is falling right now: the level's gravity, or the
   * hurried version of it while soft drop is held.
   */
  get fallInterval() {
    if (!this.softDropping) return this.dropInterval;
    return Math.max(SOFT_DROP_MIN, Math.min(this.dropInterval, this.dropInterval / SOFT_DROP_FACTOR));
  }

  /**
   * How far the falling pill has travelled toward the next row (0..1), so the
   * renderer can slide it smoothly instead of snapping a whole cell at a time.
   */
  get dropProgress() {
    if (this.phase !== PHASE.FALLING || !this.pill) return 0;
    if (!tryMove(this.board, this.pill, 0, 1)) return 0;
    return Math.max(0, Math.min(1, this.dropTimer / this.fallInterval));
  }

  get isOver() {
    return this.phase === PHASE.LOST || this.phase === PHASE.WON;
  }

  /** Gravity interval in ms, faster as more pills are placed. */
  get dropInterval() {
    const tier = Math.floor(this.pillsPlaced / PILLS_PER_SPEED_UP);
    const { baseInterval, minInterval, step } = this.speed;
    const interval = Math.max(minInterval, baseInterval - tier * step);
    // Outbreak's half of the trade: more disease, but the medicine arrives
    // twice as fast. Floored at the same speed a held hurry is floored at, so
    // the capsule can never outrun a hand however deep the run goes.
    if (!this.has('outbreak')) return interval;
    return Math.max(SOFT_DROP_MIN, interval / 2);
  }

  emit(type, detail = {}) {
    this.events.push({ type, ...detail });
  }

  /** Returns and clears the queued events (sounds, screen shake, and so on). */
  drainEvents() {
    const events = this.events;
    this.events = [];
    return events;
  }

  /**
   * Capsule colours come from a shuffled bag holding each of the nine colour
   * pairs once, so every pair turns up in any nine capsules - the same trick
   * the original uses to avoid long runs of one colour.
   */
  drawColors() {
    if (this.bag.length === 0) {
      const combinations = [];
      for (let a = 0; a < COLOR_COUNT; a += 1) {
        for (let b = 0; b < COLOR_COUNT; b += 1) combinations.push([a, b]);
      }
      for (let i = combinations.length - 1; i > 0; i -= 1) {
        const j = this.rng.int(i + 1);
        [combinations[i], combinations[j]] = [combinations[j], combinations[i]];
      }
      this.bag = combinations;
    }
    if (!this.has('rationing')) return this.bag.pop();
    // Rationing draws from the same bag and simply passes over the colour that
    // is out of stock, so the other two still come in the bag's even spread
    // rather than degenerating into a coin flip. The bag is refilled rather
    // than searched, so this always terminates.
    const out = rationedOut(this.pillsPlaced);
    for (let i = this.bag.length - 1; i >= 0; i -= 1) {
      if (this.bag[i].includes(out)) continue;
      return this.bag.splice(i, 1)[0];
    }
    const stocked = [];
    for (let a = 0; a < COLOR_COUNT; a += 1) {
      for (let b = 0; b < COLOR_COUNT; b += 1) if (a !== out && b !== out) stocked.push([a, b]);
    }
    this.bag = [];
    return stocked[this.rng.int(stocked.length)];
  }

  /**
   * Which half of the next capsule, if any, comes out of a contaminated batch.
   * Returns 0, 1 or -1 for a clean capsule. Keyed off the capsule count so it
   * is as reproducible as everything else.
   */
  contaminatedHalf(index) {
    if (!this.has('contaminated')) return -1;
    if (index % CONTAMINATION_EVERY !== CONTAMINATION_EVERY - 1) return -1;
    return Math.floor(index / CONTAMINATION_EVERY) % 2;
  }

  spawnPill() {
    // The deal waits while you are at the lamp. You pay for the visit with the
    // capsule you abandoned in flight and with the seconds, which is a cost you
    // chose; dealing fresh capsules into an unsteered bottle is a different and
    // much worse cost, because every one of them lands in the spawn column and
    // tops the bottle out in a handful of visits. Measured: eight capsules to a
    // lost run.
    if (this.inLight) {
      this.dealHeld = true;
      this.pill = null;
      this.phase = PHASE.FALLING;
      return;
    }
    const colors = this.queue.shift();
    this.queue.push(this.drawColors());
    const inert = this.contaminatedHalf(this.pillsPlaced);
    const pill = createPill(colors, SPAWN_X, SPAWN_Y, 0, inert);
    if (!fits(this.board, pill)) {
      this.pill = null;
      this.phase = PHASE.LOST;
      this.emit('gameOver');
      return;
    }
    this.pill = pill;
    this.dropTimer = 0;
    this.lastFallInterval = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.dealTimer = DEAL_DELAY;
    // Spawning with nowhere to fall means the stack is at the neck; that
    // capsule gets a longer fuse, see SPAWN_GRACE.
    this.spawnedBlocked = !tryMove(this.board, pill, 0, 1);
    this.phase = PHASE.FALLING;
    this.emit('spawn', { colors, blocked: this.spawnedBlocked, inert });
  }

  togglePause() {
    if (this.isOver) return this.paused;
    this.paused = !this.paused;
    this.emit(this.paused ? 'pause' : 'resume');
    return this.paused;
  }

  // ---- player input -------------------------------------------------------

  move(dx) {
    if (this.inLight) return this.chamber.move(dx);
    if (!this.canControl()) return false;
    const next = tryMove(this.board, this.pill, dx, 0);
    if (!next) return false;
    this.pill = next;
    this.resetLockTimerIfAirborne();
    this.emit('move');
    return true;
  }

  rotate(direction = 1) {
    if (this.inLight) return this.chamber.rotate(direction);
    if (!this.canControl()) return false;
    const next = tryRotate(this.board, this.pill, direction);
    if (!next) return false;
    this.pill = next;
    this.resetLockTimerIfAirborne();
    this.emit('rotate');
    return true;
  }

  setSoftDrop(active) {
    if (this.inLight) {
      this.chamber.setHurry(active);
      return;
    }
    const next = Boolean(active) && this.canControl();
    if (next === this.softDropping) return;
    this.softDropping = next;
    this.rescaleDropTimer();
  }

  /**
   * Keeps the banked fall progress meaningful when the interval underneath it
   * changes - pressing or releasing hurry, or gravity stepping up a tier.
   *
   * `dropTimer` banks milliseconds toward the next row, but what it MEANS is a
   * fraction of a cell. Bank 695ms of a 700ms cell, press hurry so the interval
   * becomes 100ms, and that 695ms is suddenly worth almost seven rows - so the
   * capsule fell seven rows in a single frame. That is the "hurry sometimes
   * snaps" this is written against: how far it snapped depended on where in the
   * gravity cycle you happened to press, which is why it felt random.
   *
   * Rescaling holds the fraction fixed instead, so pressing hurry never moves
   * the capsule on its own - it only changes how fast the rest of the cell
   * takes.
   */
  rescaleDropTimer() {
    const interval = this.fallInterval;
    if (this.lastFallInterval > 0 && interval !== this.lastFallInterval) {
      this.dropTimer *= interval / this.lastFallInterval;
    }
    this.lastFallInterval = interval;
  }

  hardDrop() {
    // In the chamber the drop control hurries the light, same as it hurries a
    // capsule: one control, one meaning, wherever you are.
    if (this.inLight) {
      this.chamber.setHurry(true);
      return true;
    }
    if (!this.canControl()) return false;
    const landed = hardDropPosition(this.board, this.pill);
    const distance = landed.y - this.pill.y;
    this.pill = landed;
    this.score += distance;
    this.emit('hardDrop', { distance });
    this.lockCurrentPill();
    return true;
  }

  canControl() {
    return !this.paused && this.phase === PHASE.FALLING && this.pill !== null;
  }

  /** How long the current capsule may rest before it sets. */
  get lockBudget() {
    return this.spawnedBlocked ? SPAWN_GRACE : LOCK_DELAY;
  }

  /**
   * Keeps a capsule alive after a successful nudge. Airborne capsules always
   * reset; a resting one gets LOCK_RESETS reprieves so a move made in time is
   * never wasted, but it cannot be parked there indefinitely.
   */
  resetLockTimerIfAirborne() {
    if (tryMove(this.board, this.pill, 0, 1)) {
      this.lockTimer = 0;
      this.lockResets = 0;
      return;
    }
    if (this.lockResets < LOCK_RESETS) {
      this.lockResets += 1;
      this.lockTimer = 0;
    }
  }

  // ---- simulation ---------------------------------------------------------

  /** Advances the game by `dt` milliseconds. */
  update(dt) {
    if (this.paused || this.isOver) return;
    this.updateLight(dt);
    // Under the light the bench is held: no gravity, no lock clock, no
    // resolution, no spread. You are looking at the sample, not treating it.
    if (this.inLight) return;
    switch (this.phase) {
      case PHASE.FALLING:
        this.updateFalling(dt);
        break;
      case PHASE.CLEARING:
        this.updateClearing(dt);
        break;
      case PHASE.SETTLING:
        this.updateSettling(dt);
        break;
      case PHASE.MUTATING:
        this.updateMutating(dt);
        break;
      case PHASE.SPREADING:
        this.updateSpreading(dt);
        break;
      default:
        break;
    }
  }

  /**
   * The light-therapy control. A TOGGLE now, not a held key: entering the
   * chamber is a decision you commit to, and the thing you are committing is
   * the capsule you stop steering.
   */
  setLight(on) {
    const want = Boolean(on) && this.has('phototherapy');
    if (want === this.inLight) return;
    if (want) this.enterLight();
    else this.leaveLight('released');
  }

  /** Toggles the chamber, which is what a single key press or tap does. */
  toggleLight() {
    this.setLight(!this.inLight);
  }

  /**
   * True when the lamp can be switched on.
   *
   * There is no cooldown any more. A failed attempt costs you the film coming
   * back harder, not the lamp being taken away - flick it off and straight back
   * on and try again, which is what a bench actually lets you do.
   */
  get lampReady() {
    return this.has('phototherapy') && !this.inLight;
  }

  enterLight() {
    if (!this.has('phototherapy') || this.inLight) return false;
    if (this.isOver || this.paused) return false;

    // The whole bench is SUSPENDED, not spent. The sample goes under the light:
    // nothing grows, nothing spreads, and the dose in your hand waits exactly
    // where you left it until you come back to it.
    //
    // Two earlier rules died here. Letting the capsule fall unsteered was worst
    // - every abandoned one lands in the spawn column and a tower there tops
    // the bottle out in eight. Committing it on the way in was better but still
    // wrong once the lamp became free to flick on and off: six visits stacked
    // six dumped capsules in the neck and ended the run, which the gauntlet
    // caught as "attempt 6: a flood ended the run". Suspending costs nothing it
    // should not, and it is what the fiction says anyway.
    this.chamber = new LightChamber(
      this.lightWidth,
      this.height,
      this.rng,
      () => this.dropInterval,
    );
    this.lightTimer = this.lightExit === 'timer' ? LIGHT_SESSION : 0;
    this.emit('lightOn', { width: this.lightWidth, exit: this.lightExit });
    return true;
  }

  leaveLight(reason = 'released') {
    if (!this.inLight) return false;
    this.chamber = null;
    this.lightTimer = 0;
    this.emit('lightOff', { reason });
    // Whatever was waiting on you comes now.
    if (this.dealHeld) {
      this.dealHeld = false;
      if (!this.isOver) this.spawnPill();
    }
    return true;
  }

  /**
   * The lamp. Light falls, lines light rows of the patient, and the bottle
   * waits for you - the dose you were holding was committed on the way in.
   *
   * Called from update(), so the fog fouls and the lamp rests whether or not
   * anyone is at the chamber. Do not call it beside update() as well; that
   * ticks the chamber twice and was quietly halving the light's fall time in
   * two checks before it was noticed.
   */
  updateLight(dt) {
    if (!this.has('phototherapy')) return;
    // The disease is held while the lamp is on. Nothing grows, nothing spreads,
    // nothing thickens: you have stopped treating and started LOOKING, and the
    // sample is under the light rather than on the bench. That is what makes the
    // lamp a change of approach rather than a tax - and it is why standing in
    // there costs you progress rather than ground.
    if (!this.inLight) {
      this.foulAir(dt);
      return;
    }
    this.chamber.update(dt);
    const lines = this.chamber.drainLit().length;
    if (lines > 0) this.scrubFilm(lines);
    // Drowning the chamber is a failed attempt, not a lost run: it ends the
    // session and the film comes back harder next time. Turn the lamp straight
    // back on and try again if you like.
    if (this.chamber.saturated) {
      this.filmRegrowth = Math.min(FILM_REGROWTH_MAX, this.filmRegrowth + FILM_REGROWTH_STEP);
      this.emit('flooded', { regrowth: this.filmRegrowth });
      this.leaveLight('flooded');
      return;
    }
    if (this.lightExit === 'timer') {
      this.lightTimer -= dt;
      if (this.lightTimer <= 0) this.leaveLight('expired');
    }
  }

  /**
   * The fog itself. Every virus clouds its own row; a hybrid clouds hardest,
   * because it is the colony that has most thoroughly dug in.
   *
   * It PLATEAUS at FOG_MAX rather than compounding toward zero, which is the
   * bound: ignore the lamp for a whole run and the bottle is hard to read,
   * never unplayable.
   */
  foulAir(dt) {
    const weight = new Array(this.height).fill(0);
    this.board.forEachCell((c, x, y) => {
      if (c.type !== VIRUS) return;
      weight[y] += isHybrid(c) ? FOG_HYBRID : 1;
    });
    for (let y = 0; y < this.height; y += 1) {
      if (weight[y] === 0) continue;
      this.fog[y] = Math.min(
        FOG_MAX,
        this.fog[y] + dt * FOG_RATE * weight[y] * this.filmRegrowth,
      );
    }
  }

  /** The lowest row still carrying film, or -1 when the sample is sterile. */
  get lowestFilmedRow() {
    for (let y = this.height - 1; y >= 0; y -= 1) {
      if (this.fog[y] > 0) return y;
    }
    return -1;
  }

  /**
   * Lines completed at the lamp, spent on the film.
   *
   * One line scrubs ONE ROW, and always the lowest dirty one - never the row the
   * line happened to complete on. That was the first build's rule and it was
   * quietly broken: tetromino lines complete at the floor of the well, so 60% of
   * all light landed in the bottom three rows of the bottle and the top five
   * were never lit once in forty measured sessions. Gravity was choosing the
   * patient's treatment.
   *
   * As a queue it is simply legible instead: make a line anywhere, the bottle
   * cleans from the bottom up, and seventeen lines sterilise the sample.
   */
  scrubFilm(lines) {
    const cleaned = [];
    for (let i = 0; i < lines; i += 1) {
      const row = this.lowestFilmedRow;
      if (row < 0) break;
      this.fog[row] = 0;
      cleaned.push(row);
    }
    this.rowsLit += cleaned.length;
    this.emit('lit', {
      rows: cleaned.length,
      cleaned,
      sterile: this.lowestFilmedRow < 0,
    });
    if (cleaned.length > 0 && this.lowestFilmedRow < 0) this.emit('sterile', {});
  }

  updateFalling(dt) {
    // The capsule is steerable the instant it is dealt, but it does not fall or
    // start its lock clock until the beat has passed. That is the reaction time
    // every capsule is owed.
    if (this.dealTimer > 0) {
      this.dealTimer -= dt;
      if (this.dealTimer > 0) return;
      // Spend whatever is left of a long frame on the capsule rather than
      // dropping it, so one giant step still resolves.
      dt = -this.dealTimer;
      this.dealTimer = 0;
    }
    if (!this.pill) return;
    // Gravity steps up every few capsules, so the interval can change without
    // anyone touching a key. Same rescale, same reason.
    this.rescaleDropTimer();
    const interval = this.fallInterval;

    this.dropTimer += dt;
    while (this.dropTimer >= interval) {
      this.dropTimer -= interval;
      const next = tryMove(this.board, this.pill, 0, 1);
      if (!next) break;
      this.pill = next;
      this.lockTimer = 0;
      // Once it has fallen at all it is an ordinary capsule again.
      this.spawnedBlocked = false;
    }

    if (!tryMove(this.board, this.pill, 0, 1)) {
      this.lockTimer += dt;
      if (this.lockTimer >= this.lockBudget) this.lockCurrentPill();
    }
  }

  lockCurrentPill() {
    lockPill(this.board, this.pill);
    this.pill = null;
    this.pillsPlaced += 1;
    this.softDropping = false;
    this.combo = 0;
    this.emit('lock');
    if (this.pillsPlaced % PILLS_PER_SPEED_UP === 0) this.emit('speedUp');
    this.beginResolution();
  }

  /** Looks for matches; animates them if found, otherwise spawns the next pill. */
  beginResolution() {
    const matches = this.board.findMatches();
    if (matches.size === 0) {
      this.finishResolution();
      return;
    }
    // Tolerance rides on the resistance rule: with resistance off, a match
    // means exactly what it always did.
    this.outcome = this.board.matchOutcome(matches, this.tolerance);
    // A hybrid answers to both its parents. Book the deliveries in now so the
    // cells an antibody takes are part of the clear the player watches.
    this.cured = this.board.cureHybrids(this.outcome.deliveries ?? [], this.chain);
    this.outcome.cured = this.cured;
    const dying = new Set(this.outcome.cleared.map(({ x, y }) => `${x},${y}`));
    this.outcome.antibody = this.board
      .burstFor(this.cured)
      .filter(({ x, y }) => !dying.has(`${x},${y}`));
    this.clearingCells = [
      ...this.outcome.cleared,
      ...this.outcome.collateral,
      ...this.outcome.antibody,
      ...this.outcome.washed,
    ];
    this.resistedCells = this.outcome.resisted;
    this.phase = PHASE.CLEARING;
    this.phaseTimer = 0;

    if (this.resistedCells.length > 0) {
      this.emit('resist', { count: this.resistedCells.length });
    }
    // A match where every cell shrugged the clear off is not a clear: it scores
    // nothing, sends nothing and does not advance the cascade. It still plays
    // out on screen, because the player needs to SEE that the medicine bounced
    // rather than wonder whether the game dropped their move.
    if (this.clearingCells.length === 0) return;

    this.combo += 1;
    const viruses = this.outcome.cleared.filter((c) => c.type === VIRUS).length;
    const collateral = this.outcome.collateral.length;
    const fromAntibody = this.outcome.antibody.filter((c) => c.type === VIRUS).length;
    const killed = viruses + collateral + fromAntibody;
    this.score += this.scoreFor(killed, this.combo);
    // A collateral kill pays its payout again. Going back to the older
    // medicine is the play this whole mechanic exists to reward.
    if (collateral > 0) {
      this.score += this.scoreFor(collateral, this.combo) * (COLLATERAL_BONUS - 1);
    }
    // Synthesising a compound is the hardest play in the game and pays like it.
    const antibodies = this.cured.filter((h) => h.antibody).length;
    if (antibodies > 0) {
      this.score += this.scoreFor(antibodies, this.combo) * HYBRID_BONUS;
    }
    this.totalVirusesCleared += killed;
    this.virusesClearedThisLevel += killed;

    const attack = this.attackFor(this.clearingCells, this.combo);
    this.pendingAttack.push(...attack);
    // A clear in either column beside a seal breaks it. That is the whole
    // interaction: quarantine narrows the bottle, and clearing next to the seal
    // is how you get the column back.
    const sealed = this.board.sealed;
    if (sealed !== undefined
      && this.outcome.cleared.some(({ x }) => Math.abs(x - sealed) === 1)) {
      this.breakSeal('cleared');
    }
    // Read the dark BEFORE the relief below lifts it, or clearing a virus would
    // brighten the row and then be judged against the brightened row.
    const inTheDark = this.clearedInTheDark(this.outcome);
    // Treating the patient clears the air. Killing a virus lifts the fog in its
    // row; a clear it SHRUGS OFF fouls that row instead, because the colony has
    // just proved it is shielded. Medicine and light are the same argument.
    if (this.has('phototherapy')) {
      for (const { y, type } of this.outcome.cleared) {
        if (type === VIRUS) this.fog[y] = Math.max(0, this.fog[y] - FOG_RELIEF);
      }
      for (const { y } of this.outcome.collateral) {
        this.fog[y] = Math.max(0, this.fog[y] - FOG_RELIEF);
      }
      for (const { y } of this.resistedCells) {
        this.fog[y] = Math.min(FOG_MAX, this.fog[y] + FOG_SHRUG);
      }
    }
    if (inTheDark) this.darkClears += 1;
    this.emit('clear', {
      viruses: killed,
      collateral,
      resisted: this.resistedCells.length,
      cells: this.clearingCells.length,
      combo: this.combo,
      attack: attack.length,
      cured: this.cured.length,
      antibodies,
      washed: this.outcome.washed?.length ?? 0,
      inTheDark,
      inLight: this.inLight,
    });
    if (antibodies > 0) this.emit('antibody', { count: antibodies });
    if (inTheDark) this.emit('darkClear', { viruses: killed, total: this.darkClears });
  }

  /**
   * Dr. Mario's virus payout doubles for each extra virus removed at once;
   * cascades multiply it again.
   */
  scoreFor(viruses, combo) {
    if (viruses === 0) return 0;
    const base = this.speed.virusScore;
    let points = 0;
    for (let i = 0; i < viruses; i += 1) points += base * 2 ** i;
    return points * combo;
  }

  /**
   * Garbage a clear sends to an opponent: one capsule per cell past the
   * minimum run, plus a bonus for each cascade stage. Colours match what was
   * cleared, so the junk you receive tells you what your opponent is doing.
   */
  attackFor(cells, combo) {
    const extra = Math.max(0, cells.length - MATCH_LENGTH) * ATTACK_PER_EXTRA_CELL;
    const count = Math.min(ATTACK_CAP, extra + (combo - 1) * ATTACK_PER_COMBO);
    return Array.from({ length: count }, (_, i) => cells[i % cells.length].color);
  }

  /** Takes the garbage this player has earned, handing ownership to the caller. */
  takeAttack() {
    const attack = this.pendingAttack;
    this.pendingAttack = [];
    return attack;
  }

  /** Queues garbage from an opponent; it lands before the next capsule. */
  queueGarbage(colors) {
    if (!colors || colors.length === 0) return;
    this.incoming.push(...colors);
    this.emit('garbageQueued', { count: colors.length });
  }

  /**
   * Drops queued garbage in as loose halves, spread across distinct columns so
   * it lands as an awkward sprinkle rather than a single tower.
   */
  dropGarbage() {
    const columns = Array.from({ length: this.board.width }, (_, i) => i);
    for (let i = columns.length - 1; i > 0; i -= 1) {
      const j = this.rng.int(i + 1);
      [columns[i], columns[j]] = [columns[j], columns[i]];
    }
    const dropped = [];
    for (const color of this.incoming) {
      const x = columns.find((column) => this.board.isEmpty(column, 0));
      if (x === undefined) break;
      this.board.set(x, 0, cell(color));
      columns.splice(columns.indexOf(x), 1);
      dropped.push({ x, color });
      if (columns.length === 0) break;
    }
    this.incoming = [];
    if (dropped.length > 0) this.emit('garbage', { cells: dropped.length });
    return dropped;
  }

  updateClearing(dt) {
    this.phaseTimer += dt;
    if (this.phaseTimer < CLEAR_ANIMATION) return;
    // Applying the whole outcome at once keeps the shed tolerance in step with
    // the clear the player just watched.
    // The outcome carries the cured strains and their bursts, resolved when the
    // clear began so the player could watch them go; applyMatch takes the cells.
    if (this.outcome) this.board.applyMatch(this.outcome);
    const stalled = this.clearingCells.length === 0;
    this.clearingCells = [];
    this.resistedCells = [];
    this.outcome = null;
    if (stalled) {
      // Every matched cell shrugged it off, so nothing moved and nothing will
      // cascade. Their tolerance is one lower; hand the turn back.
      this.finishResolution();
      return;
    }
    if (this.virusesLeft === 0) {
      this.phase = PHASE.WON;
      this.emit('levelComplete', { level: this.level });
      return;
    }
    this.phase = PHASE.SETTLING;
    this.phaseTimer = 0;
  }

  updateSettling(dt) {
    this.phaseTimer += dt;
    while (this.phaseTimer >= SETTLE_INTERVAL) {
      this.phaseTimer -= SETTLE_INTERVAL;
      if (!this.board.stepGravity()) {
        this.beginResolution();
        return;
      }
    }
  }

  finishResolution() {
    // The cascade is over. Parents delivered from here belong to the next one,
    // so they no longer count as having arrived together.
    this.chain = {};
    if (this.virusesLeft === 0) {
      this.phase = PHASE.WON;
      this.emit('levelComplete', { level: this.level });
      return;
    }
    if (this.tickResistance()) return;
    if (this.tickOutbreak()) return;
    this.tickQuarantine();
    if (this.incoming.length > 0) {
      this.dropGarbage();
      this.phase = PHASE.SETTLING;
      this.phaseTimer = 0;
      return;
    }
    this.spawnPill();
  }

  /**
   * Ages the viruses every few capsules when resistance is on. Returns true if
   * a mutation is playing, which holds the next capsule until it finishes.
   */
  tickResistance() {
    if (!this.tolerance) return false;
    if (this.pillsPlaced === 0) return false;
    if (this.resistanceTickedAt === this.pillsPlaced) return false;
    // Two clocks, and a run with both on obeys whichever comes first. The
    // resistance clock ages everything slowly; the rationing clock ages only
    // the colour that is out of stock, and ages it every capsule - what you
    // cannot treat is what gets worse.
    const aged = this.resistance && this.pillsPlaced % RESISTANCE_INTERVAL === 0;
    const starved = this.has('rationing');
    if (!aged && !starved) return false;
    this.resistanceTickedAt = this.pillsPlaced;
    const mutations = this.board.mutateViruses(
      this.rng,
      RESISTANCE_MAX,
      aged ? null : rationedOut(this.pillsPlaced),
    );
    if (mutations.length === 0) return false;
    this.mutations = mutations;
    this.phase = PHASE.MUTATING;
    this.phaseTimer = 0;
    this.emit('mutate', {
      count: mutations.length,
      hybrids: mutations.filter((m) => m.hybrid).length,
    });
    return true;
  }

  updateMutating(dt) {
    this.phaseTimer += dt;
    if (this.phaseTimer < MUTATION_ANIMATION) return;
    this.mutations = [];
    // A mutation never completes a run, so the board is still settled here.
    this.finishResolution();
  }

  /**
   * Outbreak: a virus spreads into an empty cell beside it.
   *
   * Three caps, because replication compounds and an uncapped one eats the
   * bottle: a virus may spread once in its life, never above the level's own
   * virus ceiling, and never past the population ceiling set when the level
   * was built.
   */
  tickOutbreak() {
    if (!this.has('outbreak')) return false;
    if (this.pillsPlaced === 0) return false;
    if (this.pillsPlaced % OUTBREAK_INTERVAL !== 0) return false;
    if (this.outbreakTickedAt === this.pillsPlaced) return false;
    this.outbreakTickedAt = this.pillsPlaced;
    const room = this.outbreakCap - this.virusesLeft;
    if (room <= 0) return false;
    const targets = outbreakTargets(
      this.board,
      this.rng,
      Math.min(OUTBREAK_MAX, room),
      virusTopRow(this.board, this.level),
    );
    if (targets.length === 0) return false;
    for (const { from, x, y, color } of targets) {
      const parent = this.board.get(from.x, from.y);
      if (parent) parent.spread = true;
      const child = cell(color, VIRUS, null);
      // A replicated virus is newborn: no tolerance, and it may not go on to
      // replicate itself. One generation is the cap that keeps this bounded.
      child.spread = true;
      this.board.set(x, y, child);
    }
    this.spreading = targets;
    this.phase = PHASE.SPREADING;
    this.phaseTimer = 0;
    this.emit('spread', { count: targets.length });
    return true;
  }

  updateSpreading(dt) {
    this.phaseTimer += dt;
    if (this.phaseTimer < MUTATION_ANIMATION) return;
    this.spreading = [];
    // A new virus never lands where it completes a run, because it only ever
    // goes into an empty cell beside its parent - and a run through that cell
    // would have cleared the parent already. The board is still settled.
    this.finishResolution();
  }

  /**
   * Quarantine: seal a column, or lift a seal that has outstayed its bound.
   *
   * A seal breaks when a clear lands in either neighbouring column, and lifts
   * on its own after QUARANTINE_MAX capsules regardless, so it can never become
   * permanent. Spawn columns are never sealed.
   */
  tickQuarantine() {
    if (!this.has('quarantine')) return;
    if (this.board.sealed !== undefined) {
      if (this.pillsPlaced - this.sealedAt < QUARANTINE_MAX) return;
      this.breakSeal('expired');
      return;
    }
    if (this.pillsPlaced === 0) return;
    if (this.pillsPlaced % QUARANTINE_INTERVAL !== 0) return;
    if (this.quarantineTickedAt === this.pillsPlaced) return;
    this.quarantineTickedAt = this.pillsPlaced;
    const column = quarantineColumn(this.board, this.rng, this.lastSealed);
    if (column === null) return;
    this.board.sealed = column;
    this.lastSealed = column;
    this.sealedAt = this.pillsPlaced;
    this.emit('sealed', { column });
  }

  /** Lifts the seal, if there is one. */
  breakSeal(reason = 'cleared') {
    if (this.board.sealed === undefined) return;
    const column = this.board.sealed;
    this.board.sealed = undefined;
    this.sealedAt = -1;
    this.emit('unsealed', { column, reason });
  }

  /** How close the board is to its next mutation, as 0..1, for the HUD. */
  get resistanceLevel() {
    if (!this.tolerance) return 0;
    return this.board.peakResistance(RESISTANCE_MAX);
  }

  /** Starts the next level, keeping the score. */
  advanceLevel() {
    const next = Math.min(this.level + 1, MAX_LEVEL);
    this.reset(next, (this.seed + 0x9e3779b9) >>> 0);
  }

  /** Runs the simulation until it settles or `limit` ms elapse (used by tests). */
  runUntilStable(limit = 60000, dt = 16) {
    let elapsed = 0;
    while (elapsed < limit && this.phase !== PHASE.FALLING && !this.isOver) {
      this.update(dt);
      elapsed += dt;
    }
    return elapsed;
  }
}
