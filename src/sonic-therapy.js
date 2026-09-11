import { NECK_ROWS, RESISTANCE_MAX, TOLERANCE_AT, VIRUS } from './constants.js';
import { isHybrid, parentsOf } from './board.js';

export const SONIC = Object.freeze({
  lanes: 4,
  bpm: 112,
  travelMs: 1900,
  perfectMs: 82,
  goodMs: 175,
  missMs: 260,
  pulseCharge: 8,
  openFor: 6200,
  spawnLeadBeats: 0,
  maxNotes: 18,
});

/**
 * A separate deterministic rhythm clock. Like phototherapy, it never consumes
 * the medication RNG, so choosing a treatment cannot change which capsule or
 * mutation the seed would otherwise have produced.
 */
export function createSonicState(game) {
  return {
    active: false,
    clock: 0,
    beatTimer: 0,
    beat: 0,
    notes: [],
    charge: 0,
    combo: 0,
    bestCombo: 0,
    lastGrade: null,
    lastGradeFor: 0,
    lastPulseRows: [],
    pulseFor: 0,
    rngState: (((game?.seed ?? 1) ^ 0x534f4e49) >>> 0) || 1, // "SONI"
  };
}

export function ensureSonic(game) {
  if (!game.sonicTherapy) game.sonicTherapy = createSonicState(game);
  return game.sonicTherapy;
}

function random(state) {
  let x = state.rngState >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  state.rngState = x >>> 0;
  return state.rngState / 0x100000000;
}

function beatMs(state) {
  return 60000 / (state.bpm ?? SONIC.bpm);
}

/**
 * The lane stream is deliberately phrase-like rather than fully random: motifs
 * recur, invert and rotate, which makes the sequence learnable enough to feel
 * musical while the seeded variation keeps runs from being rote.
 */
const MOTIFS = Object.freeze([
  Object.freeze([0, 1, 2, 3]),
  Object.freeze([0, 2, 1, 3]),
  Object.freeze([3, 2, 1, 0]),
  Object.freeze([0, 1, 3, 1]),
  Object.freeze([2, 0, 2, 3]),
  Object.freeze([1, 3, 0, 2]),
]);

function laneForBeat(state) {
  const phrase = Math.floor(state.beat / 4);
  if (state.phraseIndex === undefined || state.phraseAt !== phrase) {
    state.phraseAt = phrase;
    state.phraseIndex = Math.floor(random(state) * MOTIFS.length);
    state.phraseShift = Math.floor(random(state) * SONIC.lanes);
  }
  const motif = MOTIFS[state.phraseIndex];
  return (motif[state.beat % 4] + state.phraseShift) % SONIC.lanes;
}

export function setSonicTempo(game, bpm) {
  const state = ensureSonic(game);
  if (Number.isFinite(bpm)) state.bpm = Math.max(72, Math.min(168, bpm));
  return state.bpm ?? SONIC.bpm;
}

export function setSonicActive(game, active) {
  if (!game.has?.('sonic')) return false;
  const state = ensureSonic(game);
  const next = Boolean(active);
  if (state.active === next) return state.active;
  state.active = next;
  state.lastGrade = null;
  state.lastGradeFor = 0;
  if (next) {
    state.beatTimer = 0;
    state.notes = [];
    state.beat = 0;
  }
  game.emit?.(next ? 'sonicEnter' : 'sonicExit', {
    charge: state.charge,
    combo: state.combo,
  });
  return state.active;
}

export function toggleSonic(game) {
  return setSonicActive(game, !ensureSonic(game).active);
}

function spawnNote(state) {
  state.notes.push({
    lane: laneForBeat(state),
    age: 0,
    beat: state.beat,
    judged: false,
  });
  state.beat += 1;
  if (state.notes.length > SONIC.maxNotes) state.notes.shift();
}

function chooseTargetRows(game) {
  const score = new Map();
  game.board.forEachCell((cell, _x, y) => {
    if (cell.type !== VIRUS || y < NECK_ROWS) return;
    let weight = 1;
    weight += Math.min(RESISTANCE_MAX, cell.resistance ?? 0) * 1.7;
    if (isHybrid(cell.color)) weight += 4.5;
    score.set(y, (score.get(y) ?? 0) + weight);
  });
  if (score.size === 0) return [];
  const ranked = [...score.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const best = ranked[0][1];
  // A strong pulse can catch two equally troublesome neighbouring bands, but
  // never becomes a global "delete difficulty" button.
  return ranked.filter(([, value]) => value >= best * 0.78).slice(0, 2).map(([row]) => row);
}

export function administerSonicPulse(game) {
  const state = ensureSonic(game);
  const rows = chooseTargetRows(game);
  let opened = 0;
  let weakened = 0;
  let hybrids = 0;
  for (const row of rows) {
    for (let x = 0; x < game.board.width; x += 1) {
      const cell = game.board.get(x, row);
      if (!cell || cell.type !== VIRUS) continue;
      cell.sonicOpen = SONIC.openFor;
      opened += 1;
      if (isHybrid(cell.color)) {
        hybrids += 1;
        // Sonoporation does not cure a hybrid. It primes the strain so the next
        // parent medicine counts as penetrating twice, implemented by the
        // integration layer when cureHybrids processes the delivery.
        cell.sonicPrimed = true;
      } else if ((cell.resistance ?? 0) >= TOLERANCE_AT) {
        cell.resistance = Math.max(0, (cell.resistance ?? 0) - 1);
        weakened += 1;
      }
    }
  }
  state.lastPulseRows = rows;
  state.pulseFor = 720;
  game.emit?.('sonicPulse', { rows, opened, weakened, hybrids });
  return { rows, opened, weakened, hybrids };
}

function gradeHit(delta) {
  const error = Math.abs(delta);
  if (error <= SONIC.perfectMs) return { name: 'perfect', value: 2 };
  if (error <= SONIC.goodMs) return { name: 'good', value: 1 };
  if (error <= SONIC.missMs) return { name: 'late', value: 0 };
  return null;
}

export function hitSonicLane(game, lane) {
  const state = ensureSonic(game);
  if (!state.active || lane < 0 || lane >= SONIC.lanes) return null;
  let candidate = null;
  let candidateIndex = -1;
  for (let i = 0; i < state.notes.length; i += 1) {
    const note = state.notes[i];
    if (note.judged || note.lane !== lane) continue;
    const delta = note.age - SONIC.travelMs;
    if (!candidate || Math.abs(delta) < Math.abs(candidate.delta)) {
      candidate = { note, delta };
      candidateIndex = i;
    }
  }
  const grade = candidate ? gradeHit(candidate.delta) : null;
  if (!grade || grade.value === 0) {
    state.combo = 0;
    state.charge = Math.max(0, state.charge - 1);
    state.lastGrade = 'miss';
    state.lastGradeFor = 420;
    if (candidate && Math.abs(candidate.delta) <= SONIC.missMs) candidate.note.judged = true;
    game.emit?.('sonicHit', { lane, grade: 'miss', combo: 0, charge: state.charge });
    return 'miss';
  }

  candidate.note.judged = true;
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.charge += grade.value;
  state.lastGrade = grade.name;
  state.lastGradeFor = 420;
  game.emit?.('sonicHit', {
    lane,
    grade: grade.name,
    combo: state.combo,
    charge: state.charge,
    timing: Math.round(candidate.delta),
  });
  if (state.charge >= SONIC.pulseCharge) {
    state.charge -= SONIC.pulseCharge;
    administerSonicPulse(game);
  }
  state.notes.splice(candidateIndex, 1);
  return grade.name;
}

function expireOpenWindows(game, dt) {
  game.board.forEachCell((cell) => {
    if (cell.type !== VIRUS || !(cell.sonicOpen > 0)) return;
    cell.sonicOpen = Math.max(0, cell.sonicOpen - dt);
    if (cell.sonicOpen === 0) {
      cell.sonicPrimed = false;
    }
  });
}

export function updateSonic(game, dt) {
  const state = ensureSonic(game);
  const safeDt = Math.max(0, Math.min(1000, Number(dt) || 0));
  expireOpenWindows(game, safeDt);
  state.lastGradeFor = Math.max(0, state.lastGradeFor - safeDt);
  state.pulseFor = Math.max(0, state.pulseFor - safeDt);
  if (!game.has?.('sonic') || !state.active || game.paused || game.isOver) return;

  for (const note of state.notes) note.age += safeDt;
  // Notes that travel past the hit window count as misses. Do this before the
  // next spawn so one bad frame cannot generate a pile of simultaneous misses.
  for (const note of state.notes) {
    if (note.judged || note.age <= SONIC.travelMs + SONIC.missMs) continue;
    note.judged = true;
    state.combo = 0;
    state.charge = Math.max(0, state.charge - 1);
    state.lastGrade = 'miss';
    state.lastGradeFor = 420;
    game.emit?.('sonicMiss', { lane: note.lane, charge: state.charge });
  }
  state.notes = state.notes.filter((note) => note.age <= SONIC.travelMs + SONIC.missMs + 180);

  state.beatTimer += safeDt;
  const interval = beatMs(state);
  while (state.beatTimer >= interval) {
    state.beatTimer -= interval;
    spawnNote(state);
  }
}

export function sonicOpenViruses(game) {
  const open = [];
  game.board.forEachCell((cell, x, y) => {
    if (cell.type === VIRUS && cell.sonicOpen > 0) open.push({ x, y, color: cell.color });
  });
  return open;
}

/**
 * Called immediately before Board.cureHybrids. A primed hybrid treats its next
 * parent delivery as a repeated penetration, so one successful medication hit
 * advances the strain's existing safe decay route instead of inventing a new
 * kill rule.
 */
export function primeHybridDeliveries(board, deliveries) {
  const changed = [];
  for (const delivery of deliveries ?? []) {
    const cell = board.get(delivery.x, delivery.y);
    if (!cell?.sonicPrimed || !isHybrid(cell.color)) continue;
    const [first] = [...delivery.colors];
    if (first === undefined || !parentsOf(cell.color).includes(first)) continue;
    const had = new Set(cell.cured ?? []);
    had.add(first);
    cell.cured = [...had];
    cell.sonicPrimed = false;
    changed.push({ x: delivery.x, y: delivery.y, color: cell.color });
  }
  return changed;
}
