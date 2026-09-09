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
  return { x, y, orientation, colors: [...colors] };
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
  return fits(board, next) ? next : null;
}

/**
 * Rotates by a quarter turn (+1 clockwise, -1 counter-clockwise), kicking the
 * pill away from walls and the stack when the naive rotation does not fit.
 */
export function tryRotate(board, pill, direction = 1) {
  const orientation = (pill.orientation + (direction === 1 ? 1 : 3)) % 4;
  const rotated = { ...pill, orientation };
  const kicks = isHorizontal(rotated)
    ? [
        [0, 0],
        [-1, 0],
        [1, 0],
        [0, -1],
      ]
    : [
        [0, 0],
        [0, -1],
        [-1, 0],
        [1, 0],
        // Lets a freshly spawned pill stand up on the top row.
        [0, 1],
      ];
  for (const [dx, dy] of kicks) {
    const candidate = moved(rotated, dx, dy);
    if (fits(board, candidate)) return candidate;
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
