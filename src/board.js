import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  COLLATERAL,
  COLOR_COUNT,
  LINK,
  MATCH_LENGTH,
  OPPOSITE_LINK,
  PILL,
  RESISTANCE_MAX,
  TOLERANCE_AT,
  VIRUS,
} from './constants.js';

/**
 * Creates a board cell. `link` points at the partner half of a pill and is
 * null for viruses and for halves whose partner has been destroyed.
 */
export function cell(color, type = PILL, link = null) {
  return { color, type, link };
}

/** A virus, optionally already part-way to mutating. */
export function virus(color, resistance = 0) {
  return { color, type: VIRUS, link: null, resistance };
}

/** The playfield: a flat grid of cells (or null) plus the rules that act on it. */
export class Board {
  constructor(width = BOARD_WIDTH, height = BOARD_HEIGHT) {
    this.width = width;
    this.height = height;
    this.grid = new Array(width * height).fill(null);
  }

  static from(rows, legend = { r: 0, y: 1, b: 2 }) {
    // Test/debug helper: build a board from strings, uppercase = virus.
    const board = new Board(rows[0].length, rows.length);
    rows.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        if (ch === '.' || ch === ' ') return;
        const lower = ch.toLowerCase();
        const color = legend[lower];
        if (color === undefined) throw new Error(`Unknown cell "${ch}"`);
        board.set(x, y, cell(color, ch === lower ? PILL : VIRUS));
      });
    });
    return board;
  }

  index(x, y) {
    return y * this.width + x;
  }

  inBounds(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  get(x, y) {
    return this.inBounds(x, y) ? this.grid[this.index(x, y)] : undefined;
  }

  set(x, y, value) {
    if (!this.inBounds(x, y)) return;
    this.grid[this.index(x, y)] = value;
  }

  isEmpty(x, y) {
    return this.inBounds(x, y) && this.grid[this.index(x, y)] === null;
  }

  clone() {
    const copy = new Board(this.width, this.height);
    copy.grid = this.grid.map((c) => (c ? { ...c } : null));
    return copy;
  }

  countViruses() {
    let n = 0;
    for (const c of this.grid) if (c && c.type === VIRUS) n += 1;
    return n;
  }

  forEachCell(fn) {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const c = this.grid[this.index(x, y)];
        if (c) fn(c, x, y);
      }
    }
  }

  /** Coordinates of a cell's linked partner, or null. */
  partnerOf(x, y) {
    const c = this.get(x, y);
    if (!c || !c.link) return null;
    const delta = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[c.link];
    const [px, py] = [x + delta[0], y + delta[1]];
    return this.inBounds(px, py) ? { x: px, y: py } : null;
  }

  /** Severs the link from the partner of (x, y) - used when a half is cleared. */
  orphanPartner(x, y) {
    const partner = this.partnerOf(x, y);
    if (!partner) return;
    const c = this.get(partner.x, partner.y);
    if (c && c.link === OPPOSITE_LINK[this.get(x, y).link]) c.link = null;
  }

  /**
   * Finds every cell belonging to a horizontal or vertical run of at least
   * MATCH_LENGTH cells of one colour. Returns a Set of "x,y" keys.
   */
  findMatches(minRun = MATCH_LENGTH) {
    const matched = new Set();

    const scan = (length, at) => {
      let runStart = 0;
      let runColor = -1;
      for (let i = 0; i <= length; i += 1) {
        const c = i < length ? at(i) : null;
        const color = c ? c.color : -1;
        if (color !== runColor || color === -1) {
          const runLength = i - runStart;
          if (runColor !== -1 && runLength >= minRun) {
            for (let j = runStart; j < i; j += 1) matched.add(at.key(j));
          }
          runStart = i;
          runColor = color;
        }
      }
    };

    for (let y = 0; y < this.height; y += 1) {
      const at = (x) => this.get(x, y);
      at.key = (x) => `${x},${y}`;
      scan(this.width, at);
    }
    for (let x = 0; x < this.width; x += 1) {
      const at = (y) => this.get(x, y);
      at.key = (y) => `${x},${y}`;
      scan(this.height, at);
    }
    return matched;
  }

  /**
   * Removes the given "x,y" keys, unlinking any surviving partners.
   * Returns a tally of what was destroyed.
   */
  /**
   * What a match actually does once tolerance is in play, worked out without
   * touching the board.
   *
   * A tolerant virus does not answer to its own colour any more: the run still
   * clears the medicine around it, but the virus shrugs it off. What kills it
   * is its collateral colour cleared in a line beside it - the older drug it
   * never built a defence against.
   */
  matchOutcome(keys, tolerance = false) {
    const coords = [...keys].map((key) => key.split(',').map(Number));
    const cleared = [];
    const shrugged = [];
    for (const [x, y] of coords) {
      const c = this.get(x, y);
      if (!c) continue;
      const entry = { x, y, color: c.color, type: c.type };
      if (tolerance && isTolerant(c)) shrugged.push(entry);
      else cleared.push(entry);
    }

    const collateral = tolerance ? this.collateralKills(cleared) : [];
    // A virus killed by its collateral colour dies even if it was also in the
    // match shrugging off its own colour: the older drug wins the argument.
    const killed = new Set(collateral.map(({ x, y }) => `${x},${y}`));
    const resisted = shrugged.filter(({ x, y }) => !killed.has(`${x},${y}`));
    return { cleared, resisted, collateral };
  }

  /**
   * Tolerant viruses standing next to medicine of the colour they are now
   * vulnerable to. This is the answer to a tolerant virus - not more of the
   * same drug, a different one - and it is why you clear BESIDE such a virus
   * rather than through it.
   */
  collateralKills(cleared) {
    const kills = new Map();
    for (const { x, y, color } of cleared) {
      for (const [dx, dy] of NEIGHBOURS) {
        const nx = x + dx;
        const ny = y + dy;
        const c = this.get(nx, ny);
        if (!c || !isTolerant(c)) continue;
        if (collateralOf(c.color) !== color) continue;
        kills.set(`${nx},${ny}`, { x: nx, y: ny, color: c.color, type: c.type });
      }
    }
    return [...kills.values()];
  }

  /**
   * Applies a `matchOutcome`: the dead go, and everything that shrugged the
   * clear off sheds a stack of tolerance. Hammering a tolerant virus with the
   * wrong medicine is slow, but it is never useless - which is what keeps such
   * a virus answerable even with no collateral clear available.
   */
  applyMatch(outcome) {
    const dead = [...outcome.cleared, ...outcome.collateral];
    const result = this.clearCells(dead.map(({ x, y }) => `${x},${y}`));
    for (const { x, y } of outcome.resisted) {
      const c = this.get(x, y);
      if (c) c.resistance = Math.max(0, (c.resistance ?? 0) - 1);
    }
    result.resisted = outcome.resisted.length;
    result.collateral = outcome.collateral.length;
    return result;
  }

  clearCells(keys) {
    const result = { viruses: 0, halves: 0, colors: new Set() };
    const coords = [...keys].map((key) => key.split(',').map(Number));
    for (const [x, y] of coords) {
      const c = this.get(x, y);
      if (!c) continue;
      result.colors.add(c.color);
      if (c.type === VIRUS) result.viruses += 1;
      else result.halves += 1;
      this.orphanPartner(x, y);
    }
    for (const [x, y] of coords) this.set(x, y, null);
    return result;
  }

  /**
   * Moves every unsupported pill cell down one row. Linked halves fall as a
   * pair; viruses never move. Returns true if anything moved.
   */
  stepGravity() {
    const moving = [];
    const seen = new Set();

    for (let y = this.height - 2; y >= 0; y -= 1) {
      for (let x = 0; x < this.width; x += 1) {
        const key = `${x},${y}`;
        if (seen.has(key)) continue;
        const c = this.get(x, y);
        if (!c || c.type === VIRUS) continue;

        const group = [{ x, y }];
        const partner = this.partnerOf(x, y);
        if (partner) group.push(partner);
        for (const g of group) seen.add(`${g.x},${g.y}`);

        const inGroup = (gx, gy) => group.some((g) => g.x === gx && g.y === gy);
        const supported = group.some(({ x: gx, y: gy }) => {
          const below = this.get(gx, gy + 1);
          return below === undefined || (below !== null && !inGroup(gx, gy + 1));
        });
        if (!supported) moving.push(group);
      }
    }

    if (moving.length === 0) return false;
    // Clear first, then write, so a falling pair never overwrites itself.
    const payload = moving.map((group) =>
      group.map(({ x, y }) => ({ x, y, value: this.get(x, y) })),
    );
    for (const group of payload) for (const { x, y } of group) this.set(x, y, null);
    for (const group of payload) for (const { x, y, value } of group) this.set(x, y + 1, value);
    return true;
  }

  /** Runs gravity to completion. Returns the number of steps taken. */
  settle() {
    let steps = 0;
    while (this.stepGravity()) steps += 1;
    return steps;
  }

  /**
   * Repeatedly clears matches and settles the stack, as happens after a pill
   * locks. Returns one entry per cascade stage.
   */
  resolve({ tolerance = false } = {}) {
    const stages = [];
    for (;;) {
      const matches = this.findMatches();
      if (matches.size === 0) break;
      const outcome = this.matchOutcome(matches, tolerance);
      const cleared = this.applyMatch(outcome);
      stages.push({ ...cleared, cells: [...matches] });
      // Every matched cell shrugged it off, so the board is otherwise
      // unchanged. Stop rather than rescan the same match: their tolerance has
      // been worn down by one, and the next clear will land.
      if (outcome.cleared.length === 0 && outcome.collateral.length === 0) break;
      this.settle();
    }
    return stages;
  }

  /**
   * Ages every virus by one step of resistance and mutates the ones that have
   * reached the limit. A mutation never completes a run on its own - the
   * threat is that your setup no longer matches, not a free clear.
   * Returns the cells that changed.
   */
  mutateViruses(rng, limit) {
    const mutated = [];
    this.forEachCell((c, x, y) => {
      if (c.type !== VIRUS) return;
      c.resistance = (c.resistance ?? 0) + 1;
      if (c.resistance < limit) return;
      const options = [];
      for (let color = 0; color < 3; color += 1) {
        if (color === c.color) continue;
        if (createsRun(this, x, y, color, MATCH_LENGTH)) continue;
        options.push(color);
      }
      if (options.length === 0) {
        // Boxed in on every colour: hold at the limit and try again later.
        c.resistance = limit - 1;
        return;
      }
      const from = c.color;
      c.color = options[rng.int(options.length)];
      c.resistance = 0;
      mutated.push({ x, y, from, to: c.color });
    });
    return mutated;
  }

  /** How close the most stubborn virus is to mutating, as 0..1. */
  peakResistance(limit) {
    let peak = 0;
    this.forEachCell((c) => {
      if (c.type === VIRUS) peak = Math.max(peak, (c.resistance ?? 0) / limit);
    });
    return Math.min(1, peak);
  }

  toStrings() {
    const chars = ['r', 'y', 'b'];
    const rows = [];
    for (let y = 0; y < this.height; y += 1) {
      let row = '';
      for (let x = 0; x < this.width; x += 1) {
        const c = this.get(x, y);
        if (!c) row += '.';
        else row += c.type === VIRUS ? chars[c.color].toUpperCase() : chars[c.color];
      }
      rows.push(row);
    }
    return rows;
  }
}

/**
 * Fills the bottom of the board with viruses for the given level.
 *
 * As in the original, a level holds 4 * (level + 1) viruses and higher levels
 * stack them closer to the neck of the bottle. Placements that would put three
 * of a colour in a line are rejected, so no level starts one move from solving
 * itself; every colour is tried for a cell before the cell is abandoned.
 */
export function generateLevel(board, level, rng) {
  const topRow = virusTopRow(board, level);
  const capacity = (board.height - topRow) * board.width;
  const target = Math.min(4 * (level + 1), Math.floor(capacity * 0.85));

  let placed = 0;
  let attempts = 0;
  const limit = capacity * 400;
  while (placed < target && attempts < limit) {
    attempts += 1;
    const x = rng.int(board.width);
    const y = topRow + rng.int(board.height - topRow);
    if (!board.isEmpty(x, y)) continue;
    // Rotate the starting colour so no single colour dominates a layout.
    const first = (placed + rng.int(COLOR_COUNT)) % COLOR_COUNT;
    for (let i = 0; i < COLOR_COUNT; i += 1) {
      const color = (first + i) % COLOR_COUNT;
      if (createsRun(board, x, y, color, 3)) continue;
      // A spread of starting resistance staggers the mutations instead of
      // detonating every virus on the same capsule.
      board.set(x, y, virus(color, rng.int(RESISTANCE_MAX)));
      placed += 1;
      break;
    }
  }
  return placed;
}

/**
 * The highest row viruses may occupy: ten rows at first, thirteen by level 12.
 * Measured from the bottom, so the neck row on top never holds a virus and the
 * ceiling sits where it always did.
 */
export function virusTopRow(board, level) {
  const rows = Math.min(MAX_VIRUS_ROWS, MIN_VIRUS_ROWS + Math.floor(level / 4));
  return Math.max(MIN_VIRUS_ROW, board.height - rows);
}

/** Orthogonal neighbours - a collateral clear has to actually touch the virus. */
const NEIGHBOURS = Object.freeze([[1, 0], [-1, 0], [0, 1], [0, -1]]);

/** The colour a virus answers to once it has stopped answering to its own. */
export function collateralOf(color) {
  return COLLATERAL[color];
}

/** True once a virus has built enough resistance to shrug off its own colour. */
export function isTolerant(c, threshold = TOLERANCE_AT) {
  return Boolean(c) && c.type === VIRUS && (c.resistance ?? 0) >= threshold;
}

const MIN_VIRUS_ROW = 4;
const MIN_VIRUS_ROWS = 10;
const MAX_VIRUS_ROWS = 13;

/** True if putting `color` at (x, y) would make a line of `runLength`. */
function createsRun(board, x, y, color, runLength) {
  const count = (dx, dy) => {
    let n = 0;
    let cx = x + dx;
    let cy = y + dy;
    while (board.inBounds(cx, cy)) {
      const c = board.get(cx, cy);
      if (!c || c.color !== color) break;
      n += 1;
      cx += dx;
      cy += dy;
    }
    return n;
  };
  const horizontal = 1 + count(-1, 0) + count(1, 0);
  const vertical = 1 + count(0, -1) + count(0, 1);
  return horizontal >= runLength || vertical >= runLength;
}

export { LINK, VIRUS, PILL };
