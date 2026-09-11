/**
 * The light chamber: phototherapy, played as falling light.
 *
 * A second falling-piece game inside the same bottle. Tetromino-shaped light
 * falls; completing a horizontal line lights that ROW of the patient. The
 * mapping is literal and one-to-one, which is the whole point - light has a
 * target, so "which part of the patient do I need to see" is a question worth
 * answering rather than a brightness slider.
 *
 * Two rules keep it honest:
 *
 *   - Light never collides with medicine. These pieces fall through the capsule
 *     stack, because they are photons and not matter, and because an aid that
 *     sabotages the thing it is aiding is a trap.
 *   - Light STAYS until you clear it or leave. An earlier build faded it out
 *     from under you on a timer, which read as the chamber eating your work:
 *     "lights disappear before i get a chance to line up for the tetris". Stay
 *     an hour if you like - the cost of standing at the lamp is the capsules
 *     you are not placing, which is a cost the bottle already charges.
 *
 * Deliberately free of DOM and canvas, like the rest of the rules.
 */
import { LIGHT_FALL, LIGHT_FALL_FAST } from './constants.js';

/**
 * The seven tetrominoes, each as its cells in a square box. Rotations are
 * computed rather than tabulated: in a box of side `n`, a quarter turn takes
 * (x, y) to (n - 1 - y, x).
 */
const PIECES = Object.freeze([
  Object.freeze({ id: 'I', box: 4, cells: Object.freeze([[0, 1], [1, 1], [2, 1], [3, 1]]) }),
  Object.freeze({ id: 'O', box: 2, cells: Object.freeze([[0, 0], [1, 0], [0, 1], [1, 1]]) }),
  Object.freeze({ id: 'T', box: 3, cells: Object.freeze([[1, 0], [0, 1], [1, 1], [2, 1]]) }),
  Object.freeze({ id: 'S', box: 3, cells: Object.freeze([[1, 0], [2, 0], [0, 1], [1, 1]]) }),
  Object.freeze({ id: 'Z', box: 3, cells: Object.freeze([[0, 0], [1, 0], [1, 1], [2, 1]]) }),
  Object.freeze({ id: 'J', box: 3, cells: Object.freeze([[0, 0], [0, 1], [1, 1], [2, 1]]) }),
  Object.freeze({ id: 'L', box: 3, cells: Object.freeze([[2, 0], [0, 1], [1, 1], [2, 1]]) }),
]);

export const PIECE_IDS = Object.freeze(PIECES.map((p) => p.id));

/** The cells of a piece at a rotation, as offsets from its anchor. */
export function pieceCells(id, rotation = 0) {
  const piece = PIECES.find((p) => p.id === id) ?? PIECES[0];
  let cells = piece.cells.map(([x, y]) => [x, y]);
  const turns = ((rotation % 4) + 4) % 4;
  for (let t = 0; t < turns; t += 1) {
    cells = cells.map(([x, y]) => [piece.box - 1 - y, x]);
  }
  return cells;
}

/**
 * One session at the lamp.
 *
 * Owns its own grid, its own falling piece and its own clock, so nothing here
 * can reach into the medicine board by accident.
 */
export class LightChamber {
  constructor(width, height, rng) {
    this.width = width;
    this.height = height;
    this.rng = rng;
    /** null, or a marker object: light stands until cleared. */
    this.grid = new Array(width * height).fill(null);
    this.bag = [];
    this.piece = null;
    this.fallTimer = 0;
    this.hurrying = false;
    /** Pieces dealt. Moving a piece makes a new object, so counting those
        would count every nudge; this counts what the player actually got. */
    this.spawns = 0;
    /** Rows completed since the caller last drained them. */
    this.lit = [];
    this.spawn();
  }

  index(x, y) {
    return y * this.width + x;
  }

  at(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return undefined;
    return this.grid[this.index(x, y)];
  }

  /**
   * Seven-bag, like the genre it is borrowed from: each piece turns up once
   * before any turns up twice, so a run of light is never all S and Z.
   */
  draw() {
    if (this.bag.length === 0) {
      const ids = PIECE_IDS.map((id) => id);
      for (let i = ids.length - 1; i > 0; i -= 1) {
        const j = this.rng.int(i + 1);
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      this.bag = ids;
    }
    return this.bag.pop();
  }

  spawn() {
    const id = this.draw();
    const piece = { id, rotation: 0, x: Math.floor((this.width - 2) / 2), y: 0 };
    this.piece = this.fits(piece) ? piece : null;
    if (this.piece) this.spawns += 1;
    this.fallTimer = 0;
    return this.piece;
  }

  /** The absolute cells a piece occupies. */
  cellsOf(piece = this.piece) {
    if (!piece) return [];
    return pieceCells(piece.id, piece.rotation).map(([x, y]) => ({
      x: piece.x + x,
      y: piece.y + y,
    }));
  }

  fits(piece) {
    return this.cellsOf(piece).every(({ x, y }) =>
      x >= 0 && x < this.width && y >= 0 && y < this.height && this.at(x, y) === null);
  }

  move(dx) {
    if (!this.piece) return false;
    const next = { ...this.piece, x: this.piece.x + dx };
    if (!this.fits(next)) return false;
    this.piece = next;
    return true;
  }

  rotate(direction = 1) {
    if (!this.piece) return false;
    const turned = { ...this.piece, rotation: (this.piece.rotation + (direction === 1 ? 1 : 3)) % 4 };
    // Kicks are sideways only, for the same reason the capsule's are: nothing
    // in this game moves a piece upward, and a rotation that does is worse than
    // one that simply does not happen.
    for (const dx of [0, -1, 1, -2, 2]) {
      const candidate = { ...turned, x: turned.x + dx };
      if (this.fits(candidate)) {
        this.piece = candidate;
        return true;
      }
    }
    return false;
  }

  setHurry(on) {
    this.hurrying = Boolean(on);
  }

  get fallInterval() {
    return this.hurrying ? LIGHT_FALL_FAST : LIGHT_FALL;
  }

  /** Drops the piece one row, locking it where it cannot fall. */
  step() {
    if (!this.piece) {
      this.spawn();
      return;
    }
    const next = { ...this.piece, y: this.piece.y + 1 };
    if (this.fits(next)) {
      this.piece = next;
      return;
    }
    this.lock();
  }

  lock() {
    for (const { x, y } of this.cellsOf()) {
      this.grid[this.index(x, y)] = { lit: true };
    }
    this.piece = null;
    this.clearLines();
    this.spawn();
  }

  /**
   * Completed rows light the patient and come out of the chamber, with
   * everything above falling into the gap.
   */
  clearLines() {
    const full = [];
    for (let y = 0; y < this.height; y += 1) {
      let whole = true;
      for (let x = 0; x < this.width; x += 1) {
        if (this.at(x, y) === null) { whole = false; break; }
      }
      if (whole) full.push(y);
    }
    if (full.length === 0) return [];
    for (const y of full) {
      for (let row = y; row > 0; row -= 1) {
        for (let x = 0; x < this.width; x += 1) {
          this.grid[this.index(x, row)] = this.grid[this.index(x, row - 1)];
        }
      }
      for (let x = 0; x < this.width; x += 1) this.grid[this.index(x, 0)] = null;
    }
    // Whatever takes cells out of the middle of the chamber has to let the rest
    // come to rest, or light ends up hanging with nothing under it.
    this.settle();
    this.lit.push(...full);
    return full;
  }

  /** Rows lit since the last call, handed over and forgotten. */
  drainLit() {
    const lit = this.lit;
    this.lit = [];
    return lit;
  }

  /**
   * The connected clumps of standing light, four-way.
   *
   * Light settles as a CLUMP rather than a column, which is the difference
   * between this and a simple compaction. A piece that locks half over a gap is
   * a legitimate overhang and has to stay one - flattening every column would
   * quietly delete the whole point of having seven shapes.
   */
  clumps() {
    const seen = new Uint8Array(this.grid.length);
    const found = [];
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const start = this.index(x, y);
        if (seen[start] || this.grid[start] === null) continue;
        const clump = [];
        const queue = [[x, y]];
        seen[start] = 1;
        while (queue.length > 0) {
          const [cx, cy] = queue.pop();
          clump.push({ x: cx, y: cy });
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) continue;
            const i = this.index(nx, ny);
            if (seen[i] || this.grid[i] === null) continue;
            seen[i] = 1;
            queue.push([nx, ny]);
          }
        }
        found.push(clump);
      }
    }
    return found;
  }

  /**
   * Lets any clump of light that has nothing under it fall until something does.
   *
   * Decay takes cells one at a time, so without this a piece that fades out
   * from UNDER another leaves the one above hanging in mid-air - reported from
   * play as "sometimes it rests on the bottom and sometimes not even with
   * nothing below". Nothing clever is happening there; it is a hole in the
   * stack that nothing fell into.
   *
   * Overhangs survive, because a clump counts as supported the moment any one
   * of its cells is on the floor or on another clump. Only light with nothing
   * at all beneath it moves.
   */
  settle() {
    let moved = false;
    for (let pass = 0; pass < this.height; pass += 1) {
      let movedThisPass = false;
      for (const clump of this.clumps()) {
        const own = new Set(clump.map(({ x, y }) => this.index(x, y)));
        const supported = clump.some(({ x, y }) => {
          if (y + 1 >= this.height) return true;
          const below = this.index(x, y + 1);
          return this.grid[below] !== null && !own.has(below);
        });
        if (supported) continue;
        // Bottom-up, so a cell never overwrites one of its own clump.
        for (const { x, y } of [...clump].sort((a, b) => b.y - a.y)) {
          this.grid[this.index(x, y + 1)] = this.grid[this.index(x, y)];
          this.grid[this.index(x, y)] = null;
        }
        moved = movedThisPass = true;
      }
      if (!movedThisPass) break;
    }
    return moved;
  }

  update(dt) {
    this.fallTimer += dt;
    const interval = this.fallInterval;
    let guard = 0;
    while (this.fallTimer >= interval && guard < this.height + 2) {
      this.fallTimer -= interval;
      guard += 1;
      this.step();
    }
  }

  /**
   * True when the chamber is packed too tightly to deal into.
   *
   * Not a loss and not a dead end. Light no longer fades, so a flooded chamber
   * does not clear itself - instead the Game ends the session and hands you back
   * to the bottle. It is the chamber's own version of "you stacked badly", and
   * it costs you the session rather than the run.
   */
  get saturated() {
    return this.piece === null;
  }

  /** How much light is standing in the chamber, 0..1, for the HUD. */
  get charge() {
    let filled = 0;
    for (const cell of this.grid) if (cell) filled += 1;
    return filled / (this.width * this.height);
  }
}
