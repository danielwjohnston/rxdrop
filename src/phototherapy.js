import {
  BOARD_WIDTH,
  DARK_AT,
  NECK_ROWS,
  RESISTANCE_MAX,
  TOLERANCE_AT,
  VIRUS,
} from './constants.js';
import { isHybrid } from './board.js';

/**
 * Phototherapy is intentionally its own deterministic layer. Medication still
 * lives on Board; these cells are projected light and collide only with one
 * another. That separation is the whole fiction: matter and photons share the
 * treatment vessel without one becoming garbage for the other.
 */
export const PHOTO = Object.freeze({
  clarityFloor: 0.26,
  darkAt: Math.max(DARK_AT, 0.38),
  baseVirusHazePerSecond: 0.009,
  resistanceHazePerSecond: 0.004,
  hybridHazePerSecond: 0.012,
  adjacentHazeFactor: 0.2,
  treatedPressureFactor: 0.28,
  lightFallInterval: 430,
  fastLightFallInterval: 78,
  lightLife: 7600,
  lineClarity: 0.48,
  neighbourClarity: 0.1,
  medicationClarity: 0.055,
  pulseContamination: 0.09,
  treatedFor: 5600,
  recentFor: 4200,
  flashFor: 520,
});

/**
 * Original four-cell treatment constellations. They deliberately share the
 * easy-to-learn polyomino vocabulary of falling-block games without making the
 * light layer look or score like a separate game of Tetris.
 */
export const LIGHT_SHAPES = Object.freeze([
  Object.freeze({ id: 'beam', cells: Object.freeze([[0, 0], [1, 0], [2, 0], [3, 0]]) }),
  Object.freeze({ id: 'corner', cells: Object.freeze([[0, 0], [0, 1], [0, 2], [1, 2]]) }),
  Object.freeze({ id: 'fork', cells: Object.freeze([[0, 0], [1, 0], [2, 0], [1, 1]]) }),
  Object.freeze({ id: 'step', cells: Object.freeze([[1, 0], [2, 0], [0, 1], [1, 1]]) }),
  Object.freeze({ id: 'window', cells: Object.freeze([[0, 0], [1, 0], [0, 1], [1, 1]]) }),
  Object.freeze({ id: 'hook', cells: Object.freeze([[1, 0], [1, 1], [1, 2], [0, 2]]) }),
]);

const cloneCells = (cells) => cells.map(([x, y]) => [x, y]);

function normaliseCells(cells) {
  const minX = Math.min(...cells.map(([x]) => x));
  const minY = Math.min(...cells.map(([, y]) => y));
  return cells.map(([x, y]) => [x - minX, y - minY]);
}

export function rotateLightCells(cells) {
  return normaliseCells(cells.map(([x, y]) => [-y, x]));
}

export function lightPieceCells(piece) {
  return piece.cells.map(([dx, dy]) => ({ x: piece.x + dx, y: piece.y + dy }));
}

function emptyGrid(width, height) {
  return Array.from({ length: height }, () => Array(width).fill(null));
}

/** Separate tiny PRNG so using the lamp never changes medication or mutation RNG. */
function nextPhotoRandom(state) {
  state.rngState = (Math.imul(state.rngState, 1664525) + 1013904223) >>> 0;
  return state.rngState / 0x100000000;
}

export function createPhototherapyState(game) {
  const width = game?.board?.width ?? BOARD_WIDTH;
  const height = game?.board?.height ?? 17;
  const seed = ((game?.seed ?? 1) ^ 0x50484f54) >>> 0; // "PHOT"
  return {
    width,
    height,
    active: false,
    fast: false,
    grid: emptyGrid(width, height),
    clarity: Array(height).fill(1),
    treated: Array(height).fill(0),
    recent: Array(height).fill(0),
    piece: null,
    fallTimer: 0,
    flashes: [],
    rngState: seed || 1,
    piecesDealt: 0,
    linesTreated: 0,
  };
}

export function ensurePhototherapy(game) {
  if (!game.phototherapy
      || game.phototherapy.width !== game.board.width
      || game.phototherapy.height !== game.board.height) {
    game.phototherapy = createPhototherapyState(game);
  }
  return game.phototherapy;
}

export function averageClarity(game) {
  const state = ensurePhototherapy(game);
  const rows = state.clarity.slice(NECK_ROWS);
  if (rows.length === 0) return 1;
  return rows.reduce((sum, value) => sum + value, 0) / rows.length;
}

export function rowIsObscured(game, row) {
  return (ensurePhototherapy(game).clarity[row] ?? 1) <= PHOTO.darkAt;
}

export function treatmentPiece(game) {
  const state = ensurePhototherapy(game);
  const shape = LIGHT_SHAPES[Math.floor(nextPhotoRandom(state) * LIGHT_SHAPES.length)];
  const cells = cloneCells(shape.cells);
  const width = Math.max(...cells.map(([x]) => x)) + 1;
  const piece = {
    id: shape.id,
    cells,
    x: Math.max(0, Math.floor((state.width - width) / 2)),
    y: 0,
    rotation: 0,
  };
  state.piecesDealt += 1;
  return piece;
}

export function lightFits(state, piece) {
  return lightPieceCells(piece).every(({ x, y }) => (
    x >= 0 && x < state.width && y >= 0 && y < state.height && !state.grid[y][x]
  ));
}

export function ensureLightPiece(game) {
  const state = ensurePhototherapy(game);
  if (!state.piece) {
    state.piece = treatmentPiece(game);
    // A pathological full light stack should never trap treatment. Expire the
    // oldest projected cells until the new piece has a legal start.
    if (!lightFits(state, state.piece)) {
      let oldest = null;
      for (let y = 0; y < state.height; y += 1) {
        for (let x = 0; x < state.width; x += 1) {
          const cell = state.grid[y][x];
          if (!cell) continue;
          if (!oldest || cell.life < oldest.cell.life) oldest = { x, y, cell };
        }
      }
      if (oldest) state.grid[oldest.y][oldest.x] = null;
    }
  }
  return state.piece;
}

export function moveLight(game, dx, dy = 0) {
  const state = ensurePhototherapy(game);
  const piece = ensureLightPiece(game);
  const moved = { ...piece, x: piece.x + dx, y: piece.y + dy };
  if (!lightFits(state, moved)) return false;
  state.piece = moved;
  return true;
}

export function rotateLight(game, direction = 1) {
  const state = ensurePhototherapy(game);
  const piece = ensureLightPiece(game);
  let cells = cloneCells(piece.cells);
  const turns = direction < 0 ? 3 : 1;
  for (let i = 0; i < turns; i += 1) cells = rotateLightCells(cells);
  for (const kick of [0, -1, 1, -2, 2]) {
    const turned = {
      ...piece,
      cells,
      x: piece.x + kick,
      rotation: (piece.rotation + (direction < 0 ? 3 : 1)) % 4,
    };
    if (lightFits(state, turned)) {
      state.piece = turned;
      return true;
    }
  }
  return false;
}

function shiftCompletedRows(state, completed) {
  const full = new Set(completed);
  const survivors = [];
  for (let y = 0; y < state.height; y += 1) {
    if (!full.has(y)) survivors.push(state.grid[y]);
  }
  while (survivors.length < state.height) survivors.unshift(Array(state.width).fill(null));
  state.grid = survivors;
}

export function administerRows(game, rows) {
  const state = ensurePhototherapy(game);
  const unique = [...new Set(rows.filter((row) => row >= NECK_ROWS && row < state.height))];
  let weakened = 0;
  for (const row of unique) {
    state.clarity[row] = Math.min(1, state.clarity[row] + PHOTO.lineClarity);
    state.treated[row] = PHOTO.treatedFor;
    state.recent[row] = PHOTO.recentFor;
    if (row > NECK_ROWS) state.clarity[row - 1] = Math.min(1, state.clarity[row - 1] + PHOTO.neighbourClarity);
    if (row + 1 < state.height) state.clarity[row + 1] = Math.min(1, state.clarity[row + 1] + PHOTO.neighbourClarity);

    for (let x = 0; x < game.board.width; x += 1) {
      const cell = game.board.get(x, row);
      if (!cell || cell.type !== VIRUS) continue;
      // Light disrupts the protective environment. It does not kill a pathogen
      // by itself, but it can knock one tolerance step off a resistant colony.
      if ((cell.resistance ?? 0) >= TOLERANCE_AT) {
        cell.resistance = Math.max(0, (cell.resistance ?? 0) - 1);
        weakened += 1;
      }
    }
  }
  state.linesTreated += unique.length;
  if (unique.length > 0) {
    state.flashes.push({ rows: unique, life: PHOTO.flashFor, lines: unique.length });
    game.emit?.('phototherapy', {
      rows: unique,
      lines: unique.length,
      weakened,
      clarity: averageClarity(game),
    });
  }
  return { rows: unique, weakened };
}

export function lockLight(game) {
  const state = ensurePhototherapy(game);
  const piece = ensureLightPiece(game);
  for (const { x, y } of lightPieceCells(piece)) {
    if (y >= 0 && y < state.height && x >= 0 && x < state.width) {
      state.grid[y][x] = { life: PHOTO.lightLife, born: PHOTO.lightLife };
    }
  }
  state.piece = null;
  state.fallTimer = 0;

  const completed = [];
  for (let y = NECK_ROWS; y < state.height; y += 1) {
    if (state.grid[y].every(Boolean)) completed.push(y);
  }
  if (completed.length > 0) {
    administerRows(game, completed);
    shiftCompletedRows(state, completed);
  }
  ensureLightPiece(game);
  return completed;
}

export function hardDropLight(game) {
  const state = ensurePhototherapy(game);
  ensureLightPiece(game);
  let distance = 0;
  while (moveLight(game, 0, 1)) distance += 1;
  const rows = lockLight(game);
  game.emit?.('photoDrop', { distance, lines: rows.length });
  return true;
}

export function setPhototherapyActive(game, active) {
  if (!game.has?.('blackout')) return false;
  const state = ensurePhototherapy(game);
  const next = Boolean(active);
  if (state.active === next) return state.active;
  state.active = next;
  state.fast = false;
  if (next) ensureLightPiece(game);
  game.emit?.(next ? 'phototherapyEnter' : 'phototherapyExit', {
    clarity: averageClarity(game),
  });
  return state.active;
}

export function togglePhototherapy(game) {
  return setPhototherapyActive(game, !ensurePhototherapy(game).active);
}

export function contaminateRows(game, rows, amount = PHOTO.pulseContamination) {
  const state = ensurePhototherapy(game);
  for (const row of new Set(rows)) {
    if (row < NECK_ROWS || row >= state.height) continue;
    state.clarity[row] = Math.max(PHOTO.clarityFloor, state.clarity[row] - amount);
    if (row > NECK_ROWS) {
      state.clarity[row - 1] = Math.max(
        PHOTO.clarityFloor,
        state.clarity[row - 1] - amount * PHOTO.adjacentHazeFactor,
      );
    }
    if (row + 1 < state.height) {
      state.clarity[row + 1] = Math.max(
        PHOTO.clarityFloor,
        state.clarity[row + 1] - amount * PHOTO.adjacentHazeFactor,
      );
    }
  }
}

export function medicationClearsBiofilm(game, rows) {
  const state = ensurePhototherapy(game);
  for (const row of new Set(rows)) {
    if (row < NECK_ROWS || row >= state.height) continue;
    state.clarity[row] = Math.min(1, state.clarity[row] + PHOTO.medicationClarity);
  }
}

export function decayLightCells(state, dt) {
  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      const cell = state.grid[y][x];
      if (!cell) continue;
      cell.life -= dt;
      if (cell.life <= 0) state.grid[y][x] = null;
    }
  }
}

function biofilmPressure(game) {
  const state = ensurePhototherapy(game);
  const pressure = Array(state.height).fill(0);
  game.board.forEachCell((cell, _x, y) => {
    if (cell.type !== VIRUS || y < NECK_ROWS) return;
    let rate = PHOTO.baseVirusHazePerSecond;
    rate += Math.min(RESISTANCE_MAX, cell.resistance ?? 0) * PHOTO.resistanceHazePerSecond;
    if (isHybrid(cell.color)) rate += PHOTO.hybridHazePerSecond;
    pressure[y] += rate;
  });
  const spread = pressure.slice();
  for (let y = NECK_ROWS; y < state.height; y += 1) {
    if (pressure[y] <= 0) continue;
    if (y > NECK_ROWS) spread[y - 1] += pressure[y] * PHOTO.adjacentHazeFactor;
    if (y + 1 < state.height) spread[y + 1] += pressure[y] * PHOTO.adjacentHazeFactor;
  }
  return spread;
}

/**
 * Advances contamination, light dissipation and the currently falling light
 * structure. Called from Game.update through the runtime integration layer.
 */
export function updatePhototherapy(game, dt) {
  if (!game.has?.('blackout')) {
    game.light = 1;
    game.lightCharge = 1;
    game.lighting = false;
    game.lightSpent = false;
    return;
  }
  const state = ensurePhototherapy(game);
  const safeDt = Math.max(0, Math.min(1000, Number(dt) || 0));
  const seconds = safeDt / 1000;

  decayLightCells(state, safeDt);
  state.flashes = state.flashes
    .map((flash) => ({ ...flash, life: flash.life - safeDt }))
    .filter((flash) => flash.life > 0);
  for (let y = 0; y < state.height; y += 1) {
    state.treated[y] = Math.max(0, state.treated[y] - safeDt);
    state.recent[y] = Math.max(0, state.recent[y] - safeDt);
  }

  const pressure = biofilmPressure(game);
  for (let y = NECK_ROWS; y < state.height; y += 1) {
    const treated = state.treated[y] > 0 ? PHOTO.treatedPressureFactor : 1;
    state.clarity[y] = Math.max(
      PHOTO.clarityFloor,
      state.clarity[y] - pressure[y] * treated * seconds,
    );
  }

  if (state.active && game.phase === 'falling' && !game.paused) {
    ensureLightPiece(game);
    state.fallTimer += safeDt;
    const interval = state.fast ? PHOTO.fastLightFallInterval : PHOTO.lightFallInterval;
    while (state.fallTimer >= interval) {
      state.fallTimer -= interval;
      if (!moveLight(game, 0, 1)) {
        lockLight(game);
        break;
      }
    }
  }

  // Compatibility with the existing HUD and the old discovery plumbing. The
  // bar now means overall clarity; there is no expendable light reservoir.
  const clarity = averageClarity(game);
  game.light = clarity;
  game.lightCharge = clarity;
  game.lighting = state.active;
  game.lightSpent = false;
  game.blackoutTimer = 0;
  game.blackoutFor = 0;
}

export function recentlyIlluminated(game, row) {
  return (ensurePhototherapy(game).recent[row] ?? 0) > 0;
}
