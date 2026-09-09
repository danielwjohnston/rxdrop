import {
  ATTACK_CAP,
  ATTACK_PER_COMBO,
  ATTACK_PER_EXTRA_CELL,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  CLEAR_ANIMATION,
  COLOR_COUNT,
  LOCK_DELAY,
  MATCH_LENGTH,
  MAX_LEVEL,
  MUTATION_ANIMATION,
  PILLS_PER_SPEED_UP,
  RESISTANCE_INTERVAL,
  RESISTANCE_MAX,
  SETTLE_INTERVAL,
  SPAWN_X,
  SPAWN_Y,
  SPEEDS,
  VIRUS,
} from './constants.js';
import { Board, cell, generateLevel } from './board.js';
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
  WON: 'won',
  LOST: 'lost',
});

const SOFT_DROP_INTERVAL = 45;

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
  } = {}) {
    /** Antibiotic resistance: surviving viruses mutate. Off in classic play. */
    this.resistance = Boolean(resistance);
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
    this.lockTimer = 0;
    this.phaseTimer = 0;
    this.combo = 0;
    this.clearingCells = [];
    this.tossing = null;
    this.bag = [];
    this.queue = [this.drawColors(), this.drawColors()];
    /** Garbage capsules sent by an opponent, applied before the next spawn. */
    this.incoming = [];
    /** Garbage this player has earned and not yet handed to the opponent. */
    this.pendingAttack = [];
    this.mutations = [];
    this.phase = PHASE.FALLING;
    this.pill = null;
    this.spawnPill();
  }

  get virusesLeft() {
    return this.board.countViruses();
  }

  get nextColors() {
    return this.queue[0];
  }

  /**
   * How far the falling pill has travelled toward the next row (0..1), so the
   * renderer can slide it smoothly instead of snapping a whole cell at a time.
   */
  get dropProgress() {
    if (this.phase !== PHASE.FALLING || !this.pill) return 0;
    if (!tryMove(this.board, this.pill, 0, 1)) return 0;
    const interval = this.softDropping
      ? Math.min(SOFT_DROP_INTERVAL, this.dropInterval)
      : this.dropInterval;
    return Math.max(0, Math.min(1, this.dropTimer / interval));
  }

  get isOver() {
    return this.phase === PHASE.LOST || this.phase === PHASE.WON;
  }

  /** Gravity interval in ms, faster as more pills are placed. */
  get dropInterval() {
    const tier = Math.floor(this.pillsPlaced / PILLS_PER_SPEED_UP);
    const { baseInterval, minInterval, step } = this.speed;
    return Math.max(minInterval, baseInterval - tier * step);
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
    return this.bag.pop();
  }

  spawnPill() {
    const colors = this.queue.shift();
    this.queue.push(this.drawColors());
    const pill = createPill(colors, SPAWN_X, SPAWN_Y, 0);
    if (!fits(this.board, pill)) {
      this.pill = null;
      this.phase = PHASE.LOST;
      this.emit('gameOver');
      return;
    }
    this.pill = pill;
    this.dropTimer = 0;
    this.lockTimer = 0;
    this.phase = PHASE.FALLING;
    this.emit('spawn', { colors });
  }

  togglePause() {
    if (this.isOver) return this.paused;
    this.paused = !this.paused;
    this.emit(this.paused ? 'pause' : 'resume');
    return this.paused;
  }

  // ---- player input -------------------------------------------------------

  move(dx) {
    if (!this.canControl()) return false;
    const next = tryMove(this.board, this.pill, dx, 0);
    if (!next) return false;
    this.pill = next;
    this.resetLockTimerIfAirborne();
    this.emit('move');
    return true;
  }

  rotate(direction = 1) {
    if (!this.canControl()) return false;
    const next = tryRotate(this.board, this.pill, direction);
    if (!next) return false;
    this.pill = next;
    this.resetLockTimerIfAirborne();
    this.emit('rotate');
    return true;
  }

  setSoftDrop(active) {
    this.softDropping = Boolean(active) && this.canControl();
  }

  hardDrop() {
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

  resetLockTimerIfAirborne() {
    if (tryMove(this.board, this.pill, 0, 1)) this.lockTimer = 0;
  }

  // ---- simulation ---------------------------------------------------------

  /** Advances the game by `dt` milliseconds. */
  update(dt) {
    if (this.paused || this.isOver) return;
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
      default:
        break;
    }
  }

  updateFalling(dt) {
    if (!this.pill) return;
    const interval = this.softDropping
      ? Math.min(SOFT_DROP_INTERVAL, this.dropInterval)
      : this.dropInterval;

    this.dropTimer += dt;
    while (this.dropTimer >= interval) {
      this.dropTimer -= interval;
      const next = tryMove(this.board, this.pill, 0, 1);
      if (next) {
        this.pill = next;
        this.lockTimer = 0;
      } else {
        this.lockTimer += interval;
      }
    }

    if (!tryMove(this.board, this.pill, 0, 1)) {
      this.lockTimer += dt;
      if (this.lockTimer >= LOCK_DELAY) this.lockCurrentPill();
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
    this.combo += 1;
    this.clearingCells = [...matches].map((key) => {
      const [x, y] = key.split(',').map(Number);
      const c = this.board.get(x, y);
      return { x, y, color: c.color, type: c.type };
    });
    const viruses = this.clearingCells.filter((c) => c.type === VIRUS).length;
    this.score += this.scoreFor(viruses, this.combo);
    this.totalVirusesCleared += viruses;
    this.virusesClearedThisLevel += viruses;
    const attack = this.attackFor(this.clearingCells, this.combo);
    this.pendingAttack.push(...attack);
    this.phase = PHASE.CLEARING;
    this.phaseTimer = 0;
    this.emit('clear', {
      viruses,
      cells: this.clearingCells.length,
      combo: this.combo,
      attack: attack.length,
    });
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
    this.board.clearCells(this.clearingCells.map(({ x, y }) => `${x},${y}`));
    this.clearingCells = [];
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
    if (this.virusesLeft === 0) {
      this.phase = PHASE.WON;
      this.emit('levelComplete', { level: this.level });
      return;
    }
    if (this.tickResistance()) return;
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
    if (!this.resistance) return false;
    if (this.pillsPlaced === 0) return false;
    if (this.pillsPlaced % RESISTANCE_INTERVAL !== 0) return false;
    if (this.resistanceTickedAt === this.pillsPlaced) return false;
    this.resistanceTickedAt = this.pillsPlaced;
    const mutations = this.board.mutateViruses(this.rng, RESISTANCE_MAX);
    if (mutations.length === 0) return false;
    this.mutations = mutations;
    this.phase = PHASE.MUTATING;
    this.phaseTimer = 0;
    this.emit('mutate', { count: mutations.length });
    return true;
  }

  updateMutating(dt) {
    this.phaseTimer += dt;
    if (this.phaseTimer < MUTATION_ANIMATION) return;
    this.mutations = [];
    // A mutation never completes a run, so the board is still settled here.
    this.finishResolution();
  }

  /** How close the board is to its next mutation, as 0..1, for the HUD. */
  get resistanceLevel() {
    if (!this.resistance) return 0;
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
