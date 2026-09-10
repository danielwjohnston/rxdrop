import { LINK, PILL, SPAWN_X, SPAWN_Y } from './constants.js';
import { cell } from './board.js';

/**
 * A capsule in play. There are four rotation states but only two shapes, which
 * is how the original behaves and why it feels predictable:
 *
 *   0  horizontal, colours as dealt      cells (x, y) and (x + 1, y)
 *   1  vertical,   colours as dealt      cells (x, y) and (x, y - 1)
 *   2  horizontal, colours swapped       cells (x, y) and (x + 1, y)
 *   3  vertical,   colours swapped       cells (x, y) and (x, y - 1)
 *
 * States 2 and 3 occupy exactly the same cells as 0 and 1 and only reverse the
 * colours. A capsule therefore never walks sideways as you rotate it: horizontal
 * always spans the same two columns, and vertical always sits in the left one of
 * that pair. Rotating twice swaps the colours in place, as it should.
 */
export const HORIZONTAL_OFFSET = Object.freeze([1, 0]);
export const VERTICAL_OFFSET = Object.freeze([0, -1]);

export function createPill(colors, x = SPAWN_X, y = SPAWN_Y, orientation = 0) {
  // `kick` remembers the nudge the last rotation needed, so the next rotation
  // can undo it. Without that, turning a capsule in a tight spot and turning it
  // back leaves it a column over, and repeating it walks the capsule across the
  // bottle - which is the single worst thing rotation can do.
  return { x, y, orientation, colors: [...colors], kick: null };
}

/** The two board cells a pill currently occupies, anchor first. */
export function pillCells(pill) {
  // States 2 and 3 are states 0 and 1 with the colours the other way round.
  const swapped = pill.orientation >= 2;
  const first = swapped ? pill.colors[1] : pill.colors[0];
  const second = swapped ? pill.colors[0] : pill.colors[1];

  if (isHorizontal(pill)) {
    const [dx, dy] = HORIZONTAL_OFFSET;
    return [
      { x: pill.x, y: pill.y, color: first, link: LINK.RIGHT },
      { x: pill.x + dx, y: pill.y + dy, color: second, link: LINK.LEFT },
    ];
  }
  const [dx, dy] = VERTICAL_OFFSET;
  return [
    { x: pill.x, y: pill.y, color: first, link: LINK.UP },
    { x: pill.x + dx, y: pill.y + dy, color: second, link: LINK.DOWN },
  ];
}

export function isHorizontal(pill) {
  return pill.orientation % 2 === 0;
}

/** True if the pill can occupy its current position on the board. */
export function fits(board, pill) {
  return pillCells(pill).every(
    ({ x, y }) => board.inBounds(x, y) && board.isEmpty(x, y),
  );
}

function moved(pill, dx, dy) {
  return { ...pill, x: pill.x + dx, y: pill.y + dy };
}

/** Returns the moved pill, or null when the move is blocked. */
export function tryMove(board, pill, dx, dy) {
  const next = moved(pill, dx, dy);
  if (!fits(board, next)) return null;
  // Steering sideways re-homes the capsule, so any kick owed from an earlier
  // rotation is forgotten. Falling does not: a capsule that turns, drops a row
  // and turns back should still land where it started.
  return dx !== 0 ? { ...next, kick: null } : next;
}

/**
 * Where a rotation may land when the naive turn does not fit, in the order it
 * is tried. Being generous here matters more than being pure: a player who is
 * up against a wall or the stack and presses rotate means "turn me", and
 * refusing is far more annoying than nudging them a column.
 *
 * The order is the point. Each list tries the capsule's OWN two columns before
 * stepping outside them, so a nudge lands where you were already looking.
 */

/** Turning to horizontal: cells (x, y) and (x + 1, y). */
const HORIZONTAL_KICKS = Object.freeze([
  [0, 0],
  [-1, 0], // Blocked to the right, by a wall or the stack: lay down leftwards.
  [1, 0], // Blocked to the left.
  [0, -1], // Both sides blocked: lift a row and lay down there.
  [-1, -1], // Lift and shift, for a capsule wedged into a corner.
  [1, -1],
]);

/** Turning to vertical: cells (x, y) and (x, y - 1). */
const VERTICAL_KICKS = Object.freeze([
  [0, 0],
  // The left column is blocked overhead, so stand up in the column the other
  // half is already in. Trying this before stepping outside the capsule is what
  // makes the nudge feel like the capsule rather than a teleport.
  [1, 0],
  [-1, 0], // Both of its own columns blocked: step out one.
  [0, -1],
  [1, -1],
  [-1, -1],
  // Last, because kicking downwards can drop a capsule onto the stack: this is
  // what lets a freshly dealt capsule stand up in the neck row.
  [0, 1],
]);

/**
 * Rotates by a quarter turn (+1 clockwise, -1 counter-clockwise), kicking the
 * pill away from walls and the stack when the naive rotation does not fit.
 * Returns null only when there is genuinely nowhere for the capsule to turn.
 */
export function tryRotate(board, pill, direction = 1) {
  const orientation = (pill.orientation + (direction === 1 ? 1 : 3)) % 4;
  const rotated = { ...pill, orientation, kick: null };
  const table = isHorizontal(rotated) ? HORIZONTAL_KICKS : VERTICAL_KICKS;
  // Undoing the previous kick comes first. That is what makes rotation
  // reversible: turn a capsule in a tight spot, turn it back, and it is exactly
  // where it started rather than a column over.
  const owed = pill.kick ? [[-pill.kick[0], -pill.kick[1]]] : [];
  for (const [dx, dy] of [...owed, ...table]) {
    const candidate = moved(rotated, dx, dy);
    if (!fits(board, candidate)) continue;
    // Only a nudge away from home is owed back; landing on the spot owes
    // nothing, and undoing a kick settles the debt.
    const settled = pill.kick && dx === -pill.kick[0] && dy === -pill.kick[1];
    const kick = settled || (dx === 0 && dy === 0) ? null : [dx, dy];
    return { ...candidate, kick };
  }
  return null;
}

/** Stamps the pill into the board. */
export function lockPill(board, pill) {
  for (const { x, y, color, link } of pillCells(pill)) {
    board.set(x, y, cell(color, PILL, link));
  }
}

/** Drops the pill as far as it will go without locking it. */
export function hardDropPosition(board, pill) {
  let current = pill;
  for (;;) {
    const next = tryMove(board, current, 0, 1);
    if (!next) return current;
    current = next;
  }
}
