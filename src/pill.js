import { COLOR_COUNT, LINK, PILL, SPAWN_X, SPAWN_Y } from './constants.js';
import { cell } from './board.js';

/**
 * A capsule in play. `orientation` places the second half relative to the
 * pivot half: 0 right, 1 up, 2 left, 3 down. Rotating clockwise walks 0->1->2->3,
 * which reproduces the original's "rotate twice to swap the colours" feel.
 */
export const ORIENTATION_OFFSETS = Object.freeze([
  [1, 0],
  [0, -1],
  [-1, 0],
  [0, 1],
]);

const LINK_FOR_ORIENTATION = [LINK.RIGHT, LINK.UP, LINK.LEFT, LINK.DOWN];
const PARTNER_LINK = [LINK.LEFT, LINK.DOWN, LINK.RIGHT, LINK.UP];

export function createPill(colors, x = SPAWN_X, y = SPAWN_Y, orientation = 0) {
  return { x, y, orientation, colors: [...colors] };
}

export function randomColors(rng) {
  return [rng.int(COLOR_COUNT), rng.int(COLOR_COUNT)];
}

/** The two board cells a pill currently occupies, pivot first. */
export function pillCells(pill) {
  const [dx, dy] = ORIENTATION_OFFSETS[pill.orientation];
  return [
    {
      x: pill.x,
      y: pill.y,
      color: pill.colors[0],
      link: LINK_FOR_ORIENTATION[pill.orientation],
    },
    {
      x: pill.x + dx,
      y: pill.y + dy,
      color: pill.colors[1],
      link: PARTNER_LINK[pill.orientation],
    },
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
