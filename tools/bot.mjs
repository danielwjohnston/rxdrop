/**
 * The RxDrop bot: a competent, deterministic player.
 *
 * It exists so that two different things can ask the same question. The
 * playtest report (tools/playtest.mjs) uses it to measure how a run feels; the
 * gauntlet uses it to gate whether a rule leaves the bottle playable at all.
 * Those have to be the same player, or a modifier could pass the gate and still
 * be miserable, or fail it because the check's stand-in was hopeless.
 *
 * A great player it is not. A consistent one it is, which is what a measurement
 * needs: it drives the real input surface - move, rotate, soft drop - one frame
 * at a time, exactly as a hand would.
 */
import { fits, pillCells, tryMove, tryRotate } from '../src/pill.js';
import { isHybrid, parentsOf } from '../src/board.js';
import { BOARD_HEIGHT, LOCK_RESETS, VIRUS } from '../src/constants.js';

/** One frame, in milliseconds. Everything here is stepped at this rate. */
export const FRAME = 16;

// ---- the bot --------------------------------------------------------------

/** Column heights, and the count of covered gaps under them. */
export function survey(board) {
  const heights = [];
  let holes = 0;
  for (let x = 0; x < board.width; x += 1) {
    let top = board.height;
    for (let y = 0; y < board.height; y += 1) {
      if (board.get(x, y)) {
        top = y;
        break;
      }
    }
    heights.push(board.height - top);
    for (let y = top + 1; y < board.height; y += 1) if (!board.get(x, y)) holes += 1;
  }
  return { heights, holes };
}

/**
 * Scores a candidate landing. Deliberately simple: sit next to viruses of your
 * own colour, keep the stack low and un-pocketed. A great player it is not; a
 * consistent one it is, which is what a measurement needs.
 */
export function scorePlacement(board, cells) {
  let score = 0;
  for (const { x, y, color, inert } of cells) {
    if (inert) {
      // A bad batch is dead weight. Get it low, and never park it on top of a
      // virus - that is the mistake the modifier is there to punish.
      score += (y / board.height) * 20;
      for (let below = y + 1; below < board.height; below += 1) {
        if (board.get(x, below)?.type === VIRUS) { score -= 30; break; }
      }
      continue;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const near = board.get(x + dx, y + dy);
      if (!near) continue;
      if (near.color === color) score += near.type === VIRUS ? 22 : 6;
      // A hybrid answers to no run of its own, so building a parent colour
      // alongside one is the only approach that leads anywhere.
      else if (isHybrid(near) && parentsOf(near.color).includes(color)) score += 16;
    }
    score += (y / board.height) * 14;
  }
  return score;
}

/**
 * Viruses this placement would actually kill, which is the whole game - plus
 * the parent colours it would deliver to a hybrid alongside.
 *
 * A hybrid belongs to no run, so a bot that only counts matched viruses never
 * treats one and the report would say hybrids are unanswerable when what is
 * really unanswerable is the bot. Delivering a parent is worth about half a
 * kill; landing both at once synthesises an antibody and is worth more than
 * either.
 */
export function killsFrom(board, tolerance) {
  const matched = board.findMatches();
  if (matched.size === 0) return 0;
  let viruses = 0;
  const cleared = [];
  for (const key of matched) {
    const [x, y] = key.split(',').map(Number);
    const c = board.get(x, y);
    if (c?.type === VIRUS) viruses += 1;
    if (c) cleared.push({ x, y, color: c.color });
  }
  let delivered = 0;
  if (tolerance) {
    for (const { x, y, colors } of board.hybridDeliveries(cleared)) {
      const had = new Set(board.get(x, y)?.cured ?? []);
      const both = parentsOf(board.get(x, y).color).every((p) => had.has(p) || colors.has(p));
      delivered += both ? 260 : 90;
    }
  }
  return viruses * 200 + matched.size * 12 + delivered;
}

/** Picks a landing for the capsule in play. */
export function plan(game) {
  const board = game.board;
  const before = survey(board);
  let best = null;
  for (let orientation = 0; orientation < 4; orientation += 1) {
    for (let x = -1; x <= board.width; x += 1) {
      // Start from the first row this shape actually fits in. A vertical
      // capsule on the spawn row has its partner at y = -1, so anchoring the
      // search at the capsule's own row silently drops every vertical
      // placement - which is half the game.
      let candidate = null;
      for (let y = 0; y < board.height; y += 1) {
        const probe = { ...game.pill, x, y, orientation, kick: null };
        if (fits(board, probe)) {
          candidate = probe;
          break;
        }
      }
      if (!candidate) continue;
      // Drop it and see where it settles.
      for (;;) {
        const next = tryMove(board, candidate, 0, 1);
        if (!next) break;
        candidate = next;
      }
      const cells = pillCells(candidate);
      const stamped = cells.map(({ x: cx, y: cy }) => `${cx},${cy}`);
      for (const { x: cx, y: cy, color, inert } of cells) {
        board.set(cx, cy, { color, type: 'pill', link: null, inert });
      }
      const kills = killsFrom(board, game.resistance);
      const after = survey(board);
      for (const key of stamped) {
        const [cx, cy] = key.split(',').map(Number);
        board.set(cx, cy, null);
      }
      const peak = Math.max(...after.heights);
      const value =
        kills
        + scorePlacement(board, cells)
        - (after.holes - before.holes) * 40
        - peak * 3;
      if (!best || value > best.value) best = { value, x, orientation };
    }
  }
  return best;
}

/**
 * Drives the capsule toward a plan with real inputs, one frame at a time.
 * Returns true while it still has work to do. Rotation comes first because a
 * turn can kick the capsule sideways, so steering afterwards is what makes the
 * column stick; and it only reports "settled" when it is genuinely in place,
 * not when a rotation happened to be refused.
 */
export function steer(game, target) {
  if (!target || !game.pill) return false;
  if (game.pill.orientation !== target.orientation) {
    if (game.rotate(1)) return true;
    // Rotation refused where it stands: shuffle out and try again next frame.
    game.move(game.pill.x > 0 ? -1 : 1);
    return true;
  }
  if (game.pill.x < target.x) {
    game.move(1);
    return true;
  }
  if (game.pill.x > target.x) {
    game.move(-1);
    return true;
  }
  return false;
}

