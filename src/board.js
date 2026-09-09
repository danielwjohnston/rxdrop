import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  COLOR_COUNT,
  LINK,
  MATCH_LENGTH,
  OPPOSITE_LINK,
  PILL,
  VIRUS,
} from './constants.js';

/**
 * Creates a board cell. `link` points at the partner half of a pill and is
 * null for viruses and for halves whose partner has been destroyed.
 */
export function cell(color, type = PILL, link = null) {
  return { color, type, link };
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
  resolve() {
    const stages = [];
    for (;;) {
      const matches = this.findMatches();
      if (matches.size === 0) break;
      const cleared = this.clearCells(matches);
      stages.push({ ...cleared, cells: [...matches] });
      this.settle();
    }
    return stages;
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
 * Like the original, the number of viruses is 4 * (level + 1) and higher
 * levels stack them closer to the neck of the bottle. Placements that would
 * create three of a colour in a line are rejected so a level never starts
 * one move away from solving itself.
 */
export function generateLevel(board, level, rng) {
  const virusCount = Math.min(4 * (level + 1), 4 * (MAX_LEVEL_FOR_COUNT + 1));
  const topRow = Math.max(
    MIN_VIRUS_ROW,
    board.height - MIN_VIRUS_ROWS - Math.floor(Math.min(level, 16) / 2),
  );
  const usableRows = board.height - 1 - topRow + 1;
  const capacity = usableRows * board.width;
  const target = Math.min(virusCount, Math.floor(capacity * 0.75));

  let placed = 0;
  let guard = 0;
  while (placed < target && guard < 20000) {
    guard += 1;
    const x = rng.int(board.width);
    const y = topRow + rng.int(board.height - topRow);
    if (!board.isEmpty(x, y)) continue;
    // Cycle colours so each is used roughly evenly, as the NES game does.
    const color = (placed + rng.int(COLOR_COUNT)) % COLOR_COUNT;
    if (createsRun(board, x, y, color, 3)) continue;
    board.set(x, y, cell(color, VIRUS));
    placed += 1;
  }
  return placed;
}

const MIN_VIRUS_ROW = 3;
const MIN_VIRUS_ROWS = 10;
const MAX_LEVEL_FOR_COUNT = 20;

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
