import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Board, cell } from '../src/board.js';
import { LINK, PILL, VIRUS } from '../src/constants.js';
import {
  createPill,
  fits,
  hardDropPosition,
  isHorizontal,
  lockPill,
  pillCells,
  tryMove,
  tryRotate,
} from '../src/pill.js';

const coords = (pill) => pillCells(pill).map(({ x, y }) => [x, y]);

describe('pill geometry', () => {
  it('starts horizontal with the second half to the right', () => {
    assert.deepEqual(coords(createPill([0, 1], 3, 0)), [[3, 0], [4, 0]]);
  });

  it('rotates clockwise to vertical with the second half on top', () => {
    const board = new Board();
    const rotated = tryRotate(board, createPill([0, 1], 3, 5), 1);
    assert.deepEqual(coords(rotated), [[3, 5], [3, 4]]);
    assert.equal(isHorizontal(rotated), false);
  });

  it('swaps the colours visually after two clockwise rotations', () => {
    const board = new Board();
    let pill = createPill([0, 1], 3, 5);
    pill = tryRotate(board, tryRotate(board, pill, 1), 1);
    const cells = pillCells(pill);
    assert.equal(isHorizontal(pill), true);
    const byX = [...cells].sort((a, b) => a.x - b.x);
    assert.deepEqual(byX.map((c) => c.color), [1, 0]);
  });

  it('returns to the start after four rotations, either way', () => {
    const board = new Board();
    for (const dir of [1, -1]) {
      let pill = createPill([0, 1], 3, 5);
      for (let i = 0; i < 4; i += 1) pill = tryRotate(board, pill, dir);
      assert.equal(pill.orientation, 0);
      assert.deepEqual(coords(pill), [[3, 5], [4, 5]]);
    }
  });
});

describe('rotation stays in its columns', () => {
  const columnsOf = (pill) => [...new Set(pillCells(pill).map((c) => c.x))].sort((a, b) => a - b);

  it('never walks a horizontal capsule into a third column', () => {
    // The bug this pins: with a pivot-and-orbit model, rotating twice moved the
    // capsule one column left, so you had to nudge it back after every flip.
    const board = new Board();
    let pill = createPill([0, 1], 3, 6);
    const spans = [];
    for (let i = 0; i < 8; i += 1) {
      spans.push(columnsOf(pill));
      pill = tryRotate(board, pill, 1);
    }
    const horizontal = spans.filter((s) => s.length === 2);
    const vertical = spans.filter((s) => s.length === 1);
    for (const span of horizontal) assert.deepEqual(span, [3, 4]);
    for (const span of vertical) assert.deepEqual(span, [3], 'vertical sits in the left column');
  });

  it('holds its columns rotating the other way too', () => {
    const board = new Board();
    let pill = createPill([2, 0], 5, 6);
    for (let i = 0; i < 8; i += 1) {
      pill = tryRotate(board, pill, -1);
      const span = columnsOf(pill);
      assert.ok(
        span.every((x) => x === 5 || x === 6),
        `counter-clockwise drifted to ${JSON.stringify(span)}`,
      );
    }
  });

  it('swaps the colours in place, without moving a cell', () => {
    const board = new Board();
    const pill = createPill([0, 2], 3, 6);
    const twice = tryRotate(board, tryRotate(board, pill, 1), 1);

    const before = pillCells(pill);
    const after = pillCells(twice);
    assert.deepEqual(
      after.map((c) => ({ x: c.x, y: c.y })),
      before.map((c) => ({ x: c.x, y: c.y })),
      'the cells must not move',
    );
    assert.deepEqual(after.map((c) => c.color), before.map((c) => c.color).reverse());
  });

  it('a full turn returns the exact same cells and colours', () => {
    const board = new Board();
    for (const direction of [1, -1]) {
      const pill = createPill([1, 2], 4, 8);
      let turned = pill;
      for (let i = 0; i < 4; i += 1) turned = tryRotate(board, turned, direction);
      assert.deepEqual(pillCells(turned), pillCells(pill));
    }
  });

  it('only ever takes two shapes', () => {
    const board = new Board();
    let pill = createPill([0, 1], 3, 6);
    const shapes = new Set();
    for (let i = 0; i < 4; i += 1) {
      shapes.add(JSON.stringify(pillCells(pill).map(({ x, y }) => [x, y])));
      pill = tryRotate(board, pill, 1);
    }
    assert.equal(shapes.size, 2, 'horizontal and vertical, nothing else');
  });

  it('a vertical capsule can sit against the right wall', () => {
    const board = new Board();
    const vertical = createPill([0, 1], board.width - 1, 6, 1);
    assert.equal(fits(board, vertical), true);
    assert.deepEqual(columnsOf(vertical), [board.width - 1]);
  });
});

describe('collision', () => {
  it('refuses to move into a wall', () => {
    const board = new Board();
    assert.equal(tryMove(board, createPill([0, 1], 0, 5), -1, 0), null);
    assert.equal(tryMove(board, createPill([0, 1], 6, 5), 1, 0), null);
  });

  it('refuses to move into an occupied cell', () => {
    const board = new Board();
    board.set(3, 6, cell(0, VIRUS));
    assert.equal(tryMove(board, createPill([0, 1], 3, 5), 0, 1), null);
  });

  it('kicks off the right wall when rotating to horizontal', () => {
    const board = new Board();
    // Orientation 3 (partner below) rotates clockwise to partner-on-the-right,
    // which only fits if the whole pill shifts a column left.
    const vertical = createPill([0, 1], board.width - 1, 5, 3);
    const rotated = tryRotate(board, vertical, 1);
    assert.ok(rotated, 'rotation should succeed via a kick');
    assert.ok(fits(board, rotated));
    assert.equal(rotated.x, board.width - 2);
  });

  it('kicks upward when rotating to vertical on the floor', () => {
    const board = new Board();
    const horizontal = createPill([0, 1], 3, board.height - 1, 0);
    const rotated = tryRotate(board, horizontal, 1);
    assert.ok(rotated);
    assert.ok(fits(board, rotated));
  });

  it('gives up when a rotation cannot be kicked anywhere', () => {
    const board = new Board(2, 2);
    board.set(0, 0, cell(0, VIRUS));
    board.set(1, 0, cell(0, VIRUS));
    const pill = createPill([0, 1], 0, 1, 0);
    assert.equal(tryRotate(board, pill, 1), null);
  });
});

describe('locking', () => {
  it('stamps both halves with links pointing at each other', () => {
    const board = new Board();
    lockPill(board, createPill([0, 1], 3, 5, 0));
    assert.deepEqual(board.get(3, 5), { color: 0, type: PILL, link: LINK.RIGHT });
    assert.deepEqual(board.get(4, 5), { color: 1, type: PILL, link: LINK.LEFT });
  });

  it('hard drop lands on top of the stack', () => {
    const board = new Board();
    board.set(3, 10, cell(0, VIRUS));
    const landed = hardDropPosition(board, createPill([0, 1], 3, 0, 0));
    assert.equal(landed.y, 9);
  });
});

describe('rotation kicks out of tight spots', () => {
  /** Fills a cell with a locked pill half, so it blocks like the stack does. */
  const block = (board, x, y) => board.set(x, y, cell(PILL, 0, null));

  it('lays a capsule down leftwards when the right wall is in the way', () => {
    const board = new Board();
    const rotated = tryRotate(board, createPill([0, 1], board.width - 1, 8, 1));
    assert.ok(rotated, 'a capsule against the wall should still turn');
    assert.deepEqual(coords(rotated), [[6, 8], [7, 8]]);
  });

  it('stands up in its own other column when the first one is capped', () => {
    // The classic annoyance: something sits above the left half, and the
    // capsule should stand up in the right half's column rather than refuse.
    const board = new Board();
    block(board, 3, 7);
    const rotated = tryRotate(board, createPill([0, 1], 3, 8, 0));
    assert.ok(rotated, 'a capped column should not block the turn');
    assert.deepEqual(coords(rotated), [[4, 8], [4, 7]]);
  });

  it('lifts a row when both sides are blocked', () => {
    const board = new Board();
    block(board, 2, 8);
    block(board, 4, 8);
    const rotated = tryRotate(board, createPill([0, 1], 3, 8, 1));
    assert.ok(rotated, 'a one-wide slot should still allow a turn upward');
    assert.deepEqual(coords(rotated), [[3, 7], [4, 7]]);
  });

  it('turns in the corner of a filled bottle', () => {
    const board = new Board();
    for (let y = 9; y < board.height; y += 1) {
      for (let x = 0; x < board.width; x += 1) block(board, x, y);
    }
    block(board, 6, 6);
    const rotated = tryRotate(board, createPill([0, 1], 6, 7, 0));
    assert.ok(rotated);
    assert.deepEqual(coords(rotated), [[7, 7], [7, 6]]);
  });

  it('kicks the same way turning either direction', () => {
    const board = new Board();
    block(board, 3, 7);
    const pill = createPill([0, 1], 3, 8, 0);
    const cw = tryRotate(board, pill, 1);
    const ccw = tryRotate(board, pill, -1);
    assert.ok(cw && ccw);
    assert.deepEqual(coords(cw), coords(ccw), 'a kick should not depend on the direction');
  });

  it('still refuses when there is genuinely nowhere to turn', () => {
    const board = new Board();
    for (let x = 2; x <= 4; x += 1) {
      for (let y = 7; y <= 9; y += 1) {
        if (x === 3 && y === 8) continue;
        block(board, x, y);
      }
    }
    assert.equal(tryRotate(board, createPill([0, 1], 3, 8, 0)), null);
  });

  it('never kicks a capsule outside the bottle', () => {
    // Every cell, both orientations, on a board with a ragged stack: a kick
    // must always land somewhere legal or not happen at all.
    const board = new Board();
    for (let x = 0; x < board.width; x += 1) {
      for (let y = board.height - (x % 4) - 1; y < board.height; y += 1) block(board, x, y);
    }
    for (let x = 0; x < board.width; x += 1) {
      for (let y = 0; y < board.height; y += 1) {
        for (const orientation of [0, 1, 2, 3]) {
          const pill = createPill([0, 1], x, y, orientation);
          if (!fits(board, pill)) continue;
          for (const direction of [1, -1]) {
            const rotated = tryRotate(board, pill, direction);
            if (rotated) assert.ok(fits(board, rotated), `illegal kick from ${x},${y}`);
          }
        }
      }
    }
  });
});
