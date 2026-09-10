import {
  MAX_LEVEL,
  NECK_ROWS,
  RESISTANCE_MAX,
  SPEEDS,
  TOLERANCE_AT,
  VIRUS,
} from './constants.js';
import { Game } from './game.js';
import { VersusMatch } from './versus.js';
import { dailyKey, dailySetup, isToday, shareText } from './daily.js';
import { Renderer, drawPillPreview, drawVirusTally } from './renderer.js';
import { eraFor, entersEra } from './eras.js';
import { collateralOf } from './board.js';
import { drawDoctor, POSE_HOLD } from './doctors.js';
import { pillCells } from './pill.js';
import { AudioEngine } from './audio.js';
import { InputController, KEY_MAP, VERSUS_KEY_MAP } from './input.js';

const STORAGE_KEY = 'rxdrop.settings.v1';
const DAILY_KEY = 'rxdrop.daily.v1';
const SPEED_ORDER = ['LOW', 'MEDIUM', 'HIGH'];
const CONFIRM_LOCKOUT = 550;
const LOCKOUT_SCREENS = new Set(['over', 'clear', 'daily', 'versus']);

const el = (id) => document.getElementById(id);

const dom = {
  board: el('board'),
  board2: el('board-2'),
  playfield2: el('playfield-2'),
  next: el('next'),
  score: el('score'),
  topScore: el('top-score'),
  level: el('level'),
  speed: el('speed'),
  viruses: el('viruses'),
  virusBar: el('virus-bar'),
  virusTally: el('virus-tally'),
  resistanceMeter: el('resistance-meter'),
  resistanceFill: el('resistance-fill'),
  resistanceToggle: el('resistance'),
  musicToggle: el('music'),
  seed: el('seed'),
  overlay: el('overlay'),
  chooseLevel: el('choose-level'),
  tunables: el('tunables'),
  modeBlurb: el('mode-blurb'),
  dailyNote: el('daily-note'),
  controlsHint: el('controls-hint'),
  mute: el('mute'),
  pauseButton: el('pause-button'),
  touchpad: el('touchpad'),
  clearTitle: el('clear-title'),
  clearLevel: el('clear-level'),
  doctor: el('doctor'),
  eraName: el('era-name'),
  eraPeriod: el('era-period'),
  clearNote: el('clear-note'),
  noteEra: el('note-era'),
  noteText: el('note-text'),
  notePlace: el('note-place'),
  clearScore: el('clear-score'),
  clearFinale: el('clear-finale'),
  nextLevelButton: el('next-level'),
  overSummary: el('over-summary'),
  overBest: el('over-best'),
  dailyTitle: el('daily-title'),
  dailySummary: el('daily-summary'),
  dailyShare: el('daily-share'),
  versusTitle: el('versus-title'),
  versusSummary: el('versus-summary'),
  vsHud: [el('vs-hud-0'), el('vs-hud-1')],
  vsViruses: [el('vs-viruses-0'), el('vs-viruses-1')],
  vsIncoming: [el('vs-incoming-0'), el('vs-incoming-1')],
  offlineNote: el('offline-note'),
};

const screens = Object.fromEntries(
  [...document.querySelectorAll('[data-screen]')].map((node) => [node.dataset.screen, node]),
);

const MODE_BLURBS = {
  solo: 'Rotate the capsules and stack four of a colour in a row to wipe out the viruses.',
  daily: 'One bottle a day, the same for everyone. Your result is worth sharing.',
  versus: 'Two players, one keyboard. Clear more than four at once to dump garbage on your rival.',
};

/**
 * Versus needs two sets of controls, and the touch pad only drives one player.
 * Say so up front on a touch device rather than letting someone start a match
 * they cannot play.
 */
const TOUCH_ONLY = typeof window.matchMedia === 'function'
  && window.matchMedia('(pointer: coarse)').matches
  && !window.matchMedia('(any-pointer: fine)').matches;

const settings = loadSettings();
const renderers = [new Renderer(dom.board), new Renderer(dom.board2)];
const audio = new AudioEngine();
audio.setMuted(settings.muted);

let mode = settings.mode;
let game = null;
let match = null;
let screen = 'title';
let lastFrame = performance.now();
let dangerMusic = false;
let topScoreAtStart = 0;
let screenShownAt = 0;

const input = new InputController({
  onPress: (action, meta) => handlePress(action, meta),
  onRelease: (action, meta) => handleRelease(action, meta),
});

// ---- settings -------------------------------------------------------------

function loadSettings() {
  const defaults = {
    level: 0,
    speed: 'LOW',
    muted: false,
    topScore: 0,
    resistance: false,
    mode: 'solo',
    music: true,
  };
  let stored = {};
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    stored = {};
  }
  const merged = { ...defaults, ...stored };

  // ?level=&speed=&seed= sets up a specific game; ?daily= opens a shared day.
  const params = new URLSearchParams(location.search);
  if (params.has('level')) merged.level = clampLevel(Number(params.get('level')));
  if (params.has('speed')) {
    const speed = params.get('speed').toUpperCase();
    if (SPEEDS[speed]) merged.speed = speed;
  }
  if (params.has('seed')) merged.seed = Number(params.get('seed')) >>> 0;
  if (params.has('resistance')) merged.resistance = params.get('resistance') !== '0';
  if (params.has('music')) merged.music = params.get('music') !== '0';
  if (params.has('daily')) {
    merged.mode = 'daily';
    merged.dailyKey = params.get('daily');
  }
  if (params.has('mode') && MODE_BLURBS[params.get('mode')]) merged.mode = params.get('mode');
  merged.level = clampLevel(merged.level);
  if (!SPEEDS[merged.speed]) merged.speed = 'LOW';
  if (!MODE_BLURBS[merged.mode]) merged.mode = 'solo';
  return merged;
}

function saveSettings() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        level: settings.level,
        speed: settings.speed,
        muted: settings.muted,
        topScore: settings.topScore,
        resistance: settings.resistance,
        music: settings.music,
        mode,
      }),
    );
  } catch {
    /* private browsing - keep the values in memory only */
  }
}

function loadDailyResult() {
  try {
    return JSON.parse(localStorage.getItem(DAILY_KEY) ?? 'null');
  } catch {
    return null;
  }
}

function saveDailyResult(result) {
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify(result));
  } catch {
    /* nothing to do */
  }
}

function clampLevel(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(MAX_LEVEL, Math.round(value)));
}

// ---- screens --------------------------------------------------------------

function showScreen(name) {
  screen = name;
  screenShownAt = performance.now();
  for (const [key, node] of Object.entries(screens)) node.hidden = key !== name;
  dom.overlay.hidden = name === 'playing';
  dom.pauseButton.textContent = name === 'paused' ? 'Resume' : 'Pause';
  dom.pauseButton.disabled = !game && !match;
  if (name !== 'playing') input.releaseAll();
}

function setMode(next) {
  if (!MODE_BLURBS[next]) return;
  mode = next;
  settings.mode = next;
  saveSettings();
  for (const button of document.querySelectorAll('[data-mode]')) {
    button.classList.toggle('is-selected', button.dataset.mode === next);
  }
  dom.modeBlurb.textContent =
    next === 'versus' && TOUCH_ONLY
      ? `${MODE_BLURBS[next]} On this device you will need a keyboard or two gamepads.`
      : MODE_BLURBS[next];
  // The daily's level, speed and resistance come from the date.
  dom.tunables.hidden = next === 'daily';
  dom.controlsHint.hidden = next === 'versus';
  refreshDailyNote();
  syncHud(true);
}

function refreshDailyNote() {
  if (mode !== 'daily') {
    dom.dailyNote.hidden = true;
    return;
  }
  const setup = dailySetup(settings.dailyKey ?? dailyKey());
  const bits = [`Level ${setup.level}`, SPEEDS[setup.speed].name];
  if (setup.resistance) bits.push('Resistance');
  const previous = loadDailyResult();
  dom.dailyNote.textContent = isToday(previous, setup.key)
    ? `${setup.key} · ${bits.join(' · ')} — you scored ${previous.score.toLocaleString()}`
    : `${setup.key} · ${bits.join(' · ')}`;
  dom.dailyNote.hidden = false;
}

function startGame(options = {}) {
  audio.resume();
  document.body.classList.remove('is-versus');
  match = null;
  dom.playfield2.hidden = true;
  for (const hud of dom.vsHud) hud.hidden = true;

  let setup;
  if (mode === 'daily') {
    const daily = dailySetup(settings.dailyKey ?? dailyKey());
    setup = { ...daily, ...options };
    settings.activeDaily = daily;
  } else {
    const seed = options.seed ?? settings.seed ?? (Math.random() * 0xffffffff) >>> 0;
    settings.seed = undefined;
    setup = {
      level: options.level ?? settings.level,
      speed: options.speed ?? settings.speed,
      resistance: options.resistance ?? settings.resistance,
      seed,
    };
    settings.activeDaily = null;
  }

  topScoreAtStart = settings.topScore;
  game = new Game(setup);
  input.setKeyMap(KEY_MAP);
  dangerMusic = false;
  audio.setTrack('chill');
  audio.startMusic('chill');
  audio.play('start');
  showScreen('playing');
  syncHud(true);
}

function startVersus() {
  audio.resume();
  document.body.classList.add('is-versus');
  game = null;
  match = new VersusMatch({
    level: settings.level > 0 ? settings.level : 5,
    speed: settings.speed,
    resistance: settings.resistance,
    seed: (Math.random() * 0xffffffff) >>> 0,
  });
  input.setKeyMap(VERSUS_KEY_MAP, { padsArePlayers: true });
  dom.playfield2.hidden = false;
  for (const hud of dom.vsHud) hud.hidden = false;
  dangerMusic = false;
  audio.setTrack('fever');
  audio.startMusic('fever');
  audio.play('start');
  showScreen('playing');
  syncHud(true);
}

function beginSelectedMode() {
  if (mode === 'versus') startVersus();
  else startGame();
}

function quitToTitle() {
  audio.stopMusic();
  game = null;
  match = null;
  document.body.classList.remove('is-versus');
  dom.playfield2.hidden = true;
  for (const hud of dom.vsHud) hud.hidden = true;
  input.setKeyMap(KEY_MAP);
  refreshDailyNote();
  showScreen('title');
  syncHud(true);
}

// ---- the apothecary -------------------------------------------------------

/**
 * The era on screen, and the physician's pose. The pose is a short-lived
 * reaction: a capsule dealt, a clear landed, the neck filling up.
 */
let era = eraFor(0);
let appliedEra = null;
let pose = 'idle';
let poseUntil = 0;

function setEra(next) {
  era = next;
  // Guard on what has actually been applied, not on `era` - the first call is
  // for the era the page starts on, and it still has to paint everything.
  if (appliedEra === next) return;
  appliedEra = next;
  for (const renderer of renderers) renderer.setEra(era);
  document.body.dataset.era = era.id;
  document.body.style.setProperty('--era-accent', era.accent);
  document.body.style.setProperty('--era-back-1', era.backdrop[0]);
  document.body.style.setProperty('--era-back-2', era.backdrop[1]);
  dom.eraName.textContent = era.name;
  dom.eraPeriod.textContent = era.period;
  drawPillPreview(dom.next, game ? game.nextColors : null, era);
}

/** Holds a reaction pose for a beat, then it falls back to idle on its own. */
function react(next) {
  pose = next;
  poseUntil = performance.now() + POSE_HOLD;
}

function drawPhysician(now) {
  if (pose !== 'idle' && now > poseUntil) pose = 'idle';
  const canvas = dom.doctor;
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, rect.width, rect.height);
  const size = Math.min(rect.width, rect.height);
  drawDoctor(ctx, { x: (rect.width - size) / 2, y: rect.height - size, size, era, pose, now });
  ctx.restore();
}

// ---- HUD ------------------------------------------------------------------

function syncHud(force = false) {
  if (match) {
    for (const [index, player] of match.players.entries()) {
      dom.vsViruses[index].textContent = player.virusesLeft;
      const incoming = player.incoming.length;
      dom.vsIncoming[index].textContent = incoming > 0 ? `+${incoming}` : '';
    }
    return;
  }

  const shown = game ?? (screen === 'title' ? titleBoardGame() : null);
  const score = game ? game.score : 0;
  if (score > settings.topScore) {
    settings.topScore = score;
    saveSettings();
  }
  dom.score.textContent = score.toLocaleString();
  dom.topScore.textContent = settings.topScore.toLocaleString();
  const level = game ? game.level : previewLevel();
  setEra(eraFor(level));
  dom.level.textContent = level;
  dom.speed.textContent = SPEEDS[game ? game.speedName : previewSpeed()].name;
  dom.viruses.textContent = shown ? shown.virusesLeft : '-';
  dom.seed.textContent = game ? game.seed : '-';
  const ratio = shown && shown.startingViruses ? shown.virusesLeft / shown.startingViruses : 1;
  dom.virusBar.style.width = `${Math.round(ratio * 100)}%`;
  dom.chooseLevel.textContent = settings.level;

  const resistant = Boolean(shown && shown.resistance);
  dom.resistanceMeter.hidden = !resistant;
  if (resistant) {
    dom.resistanceFill.style.width = `${Math.round(shown.resistanceLevel * 100)}%`;
  }
  if (force || game) drawPillPreview(dom.next, game ? game.nextColors : null, era);
}

function previewLevel() {
  if (mode === 'daily') return dailySetup(settings.dailyKey ?? dailyKey()).level;
  return settings.level;
}

function previewSpeed() {
  if (mode === 'daily') return dailySetup(settings.dailyKey ?? dailyKey()).speed;
  return settings.speed;
}

function virusCounts(board) {
  const counts = [0, 0, 0];
  board?.forEachCell((c) => {
    if (c.type === VIRUS) counts[c.color] += 1;
  });
  return counts;
}

function updateMusicMood() {
  if (!game) return;
  let danger = false;
  for (let y = 0; y < 5 && !danger; y += 1) {
    for (let x = 0; x < game.board.width; x += 1) {
      if (game.board.get(x, y)) {
        danger = true;
        break;
      }
    }
  }
  if (danger !== dangerMusic) {
    dangerMusic = danger;
    audio.setTrack(danger ? 'fever' : 'chill');
  }
}

// ---- events ---------------------------------------------------------------

function handleGameEvents() {
  for (const event of game.drainEvents()) {
    switch (event.type) {
      case 'clear':
        audio.play('clear', event);
        renderers[0].addShake(2 + Math.min(6, event.viruses * 2 + event.combo));
        if (event.viruses > 0) react('cheer');
        if (event.collateral > 0) renderers[0].addShake(4);
        break;
      case 'resist':
        audio.play('resist', event);
        renderers[0].addShake(1.5);
        react('worry');
        break;
      case 'mutate':
        audio.play('mutate', event);
        renderers[0].addShake(3);
        break;
      case 'levelComplete':
        finishLevel(event);
        break;
      case 'gameOver':
        finishGameOver();
        break;
      case 'spawn':
        drawPillPreview(dom.next, game.nextColors, era);
        react(event.blocked ? 'worry' : 'toss');
        // A direction still held from wedging the last capsule must serve its
        // auto-shift delay again, or it slams the new one into the wall.
        input.rearmRepeat();
        break;
      default:
        audio.play(event.type, event);
        break;
    }
  }
}

function finishLevel(event) {
  audio.play('levelComplete');
  audio.stopMusic();
  if (mode === 'daily') {
    recordDaily(true);
    return;
  }
  const finale = event.level >= MAX_LEVEL;
  dom.clearTitle.textContent = finale ? 'Bottle empty!' : 'Level clear!';
  dom.clearLevel.textContent = event.level;
  dom.clearScore.textContent = game.score.toLocaleString();
  dom.clearFinale.hidden = !finale;
  dom.nextLevelButton.textContent = finale ? 'Play level 20 again' : 'Next level';
  showNote(finale ? event.level : event.level + 1);
  showScreen('clear');
}

/**
 * A physician's note, shown only on the level that carries you into a new era.
 * Twenty sentences is the whole story layer; it earns its place by being short.
 */
function showNote(level) {
  if (!entersEra(level)) {
    dom.clearNote.hidden = true;
    return;
  }
  const next = eraFor(level);
  dom.noteEra.textContent = `${next.name} - ${next.subtitle}`;
  dom.noteText.textContent = next.note.text;
  dom.notePlace.textContent = next.note.place;
  dom.clearNote.hidden = false;
}

function finishGameOver() {
  audio.play('gameOver');
  audio.stopMusic();
  if (mode === 'daily') {
    recordDaily(false);
    return;
  }
  dom.overSummary.textContent =
    `${game.startingViruses - game.virusesLeft} of ${game.startingViruses} viruses cleared ` +
    `on level ${game.level}. Final score ${game.score.toLocaleString()}.`;
  dom.overBest.hidden = game.score <= topScoreAtStart;
  showScreen('over');
}

function recordDaily(won) {
  const daily = settings.activeDaily ?? dailySetup(dailyKey());
  const result = {
    key: daily.key,
    level: game.level,
    speed: SPEEDS[game.speedName].name,
    score: game.score,
    cleared: game.startingViruses - game.virusesLeft,
    total: game.startingViruses,
    won,
    resistance: Boolean(game.resistance),
  };
  const previous = loadDailyResult();
  // Keep the best attempt of the day rather than the most recent.
  if (!isToday(previous, result.key) || previous.score < result.score) saveDailyResult(result);

  dom.dailyTitle.textContent = won ? 'Daily cleared!' : 'Daily over';
  dom.dailySummary.textContent = won
    ? `Every virus gone on ${result.key}.`
    : `${result.cleared} of ${result.total} viruses on ${result.key}.`;
  dom.dailyShare.textContent = shareText(result, `${location.origin}${location.pathname}`);
  showScreen('daily');
}

function handleMatchEvents() {
  for (const event of match.drainEvents()) {
    const renderer = renderers[event.player] ?? renderers[0];
    switch (event.type) {
      case 'clear':
        audio.play('clear', event);
        renderer.addShake(2 + Math.min(6, event.viruses * 2 + event.combo));
        break;
      case 'garbage':
        audio.play('lock');
        renderer.addShake(4);
        dom.vsHud[event.player]?.classList.add('is-hit');
        setTimeout(() => dom.vsHud[event.player]?.classList.remove('is-hit'), 320);
        break;
      case 'resist':
        audio.play('resist', event);
        renderer.addShake(1.5);
        break;
      case 'mutate':
        audio.play('mutate', event);
        renderer.addShake(3);
        break;
      case 'spawn':
        // Per player: one player's held direction must not carry its repeat
        // into their next capsule any more than it does in solo.
        input.rearmRepeat(event.player);
        break;
      case 'matchOver':
        audio.play(event.reason === 'cleared' ? 'levelComplete' : 'gameOver');
        audio.stopMusic();
        dom.versusTitle.textContent = `Player ${event.player + 1} wins`;
        dom.versusSummary.textContent =
          event.reason === 'cleared'
            ? 'Bottle cleared first.'
            : `Player ${2 - event.player} filled up.`;
        showScreen('versus');
        break;
      default:
        break;
    }
  }
}

// ---- input ----------------------------------------------------------------

/** True while the given player's capsule is still in its opening beat. */
function dealing(player) {
  const target = match ? match.players[player] : game;
  return Boolean(target && target.dealTimer > 0);
}

function handlePress(action, meta = {}) {
  audio.resume();
  const player = meta.player ?? 0;

  // Auto-repeat is muted for the opening beat of a capsule. Re-arming the
  // delay on the spawn event is not enough on its own: input is polled before
  // the event is drained, so one repeat can slip through and nudge the new
  // capsule before the player has even seen it.
  if (meta.repeat && dealing(player)) return;

  if (action === 'mute') {
    setMuted(audio.toggleMute());
    return;
  }

  if (screen !== 'playing') {
    if (meta.repeat) return;
    if (action === 'confirm' || action === 'hardDrop') {
      if (LOCKOUT_SCREENS.has(screen) && performance.now() - screenShownAt < CONFIRM_LOCKOUT) {
        return;
      }
      screens[screen]?.querySelector('.button--primary')?.click();
      return;
    }
    if (action === 'pause' && screen === 'paused') resumeGame();
    if (screen === 'title') {
      if (action === 'left') adjustLevel(-1);
      if (action === 'right') adjustLevel(1);
      if (action === 'rotateCW' || action === 'rotateCCW') {
        cycleSpeed(action === 'rotateCW' ? 1 : -1);
      }
    }
    return;
  }

  if (action === 'pause') {
    pauseGame();
    return;
  }

  if (match) {
    if (action === 'softDrop') match.command(player, 'softDropOn');
    else match.command(player, action);
    handleMatchEvents();
    syncHud();
    return;
  }

  if (!game) return;
  switch (action) {
    case 'left':
      game.move(-1);
      break;
    case 'right':
      game.move(1);
      break;
    case 'rotateCW':
      game.rotate(1);
      break;
    case 'rotateCCW':
      game.rotate(-1);
      break;
    case 'softDrop':
      game.setSoftDrop(true);
      break;
    case 'hardDrop':
      game.hardDrop();
      break;
    case 'restart':
      startGame({ level: game.level, speed: game.speedName });
      break;
    default:
      break;
  }
  handleGameEvents();
  syncHud();
}

function handleRelease(action, meta = {}) {
  if (action !== 'softDrop') return;
  if (match) match.command(meta.player ?? 0, 'softDropOff');
  else if (game) game.setSoftDrop(false);
}

function pauseGame() {
  if (screen !== 'playing') return;
  if (match) {
    if (match.over) return;
    match.setPaused(true);
  } else if (game && !game.isOver) {
    game.paused = true;
  } else {
    return;
  }
  audio.play('pause');
  audio.stopMusic();
  showScreen('paused');
}

function resumeGame() {
  if (match) match.setPaused(false);
  else if (game && !game.isOver) game.paused = false;
  else return;
  audio.play('resume');
  audio.resume();
  audio.startMusic(match ? 'fever' : dangerMusic ? 'fever' : 'chill');
  showScreen('playing');
  lastFrame = performance.now();
}

function setMuted(muted) {
  settings.muted = muted;
  saveSettings();
  dom.mute.textContent = `Sound: ${muted ? 'off' : 'on'}`;
  dom.mute.setAttribute('aria-pressed', String(muted));
  if (!muted && (game || match) && screen === 'playing') audio.startMusic();
}

function adjustLevel(delta) {
  if (mode === 'daily') return;
  settings.level = clampLevel(settings.level + delta);
  saveSettings();
  syncHud(true);
}

function cycleSpeed(delta) {
  if (mode === 'daily') return;
  const index = SPEED_ORDER.indexOf(settings.speed);
  settings.speed = SPEED_ORDER[(index + delta + SPEED_ORDER.length) % SPEED_ORDER.length];
  saveSettings();
  syncSpeedButtons();
  syncHud(true);
}

function syncSpeedButtons() {
  for (const button of document.querySelectorAll('[data-speed]')) {
    button.classList.toggle('is-selected', button.dataset.speed === settings.speed);
  }
}

// ---- wiring ---------------------------------------------------------------

document.addEventListener('click', (event) => {
  const target = event.target.closest('button');
  if (!target) return;
  audio.resume();

  if (target.dataset.start !== undefined) beginSelectedMode();
  else if (target.dataset.resume !== undefined) resumeGame();
  else if (target.dataset.quit !== undefined) quitToTitle();
  else if (target.dataset.rematch !== undefined) {
    match.rematch();
    audio.startMusic('fever');
    showScreen('playing');
  } else if (target.dataset.retry !== undefined || target.dataset.restart !== undefined) {
    if (match) {
      match.rematch();
      audio.startMusic('fever');
      showScreen('playing');
    } else {
      startGame({ level: game?.level ?? settings.level, speed: game?.speedName ?? settings.speed });
    }
  } else if (target.dataset.nextLevel !== undefined) {
    game.advanceLevel();
    settings.level = game.level;
    saveSettings();
    dangerMusic = false;
    audio.setTrack('chill');
    audio.startMusic('chill');
    showScreen('playing');
    syncHud(true);
  } else if (target.dataset.copy !== undefined) copyShare(target);
  else if (target.dataset.mode) setMode(target.dataset.mode);
  else if (target.dataset.adjust === 'level') adjustLevel(Number(target.dataset.delta));
  else if (target.dataset.speed) {
    settings.speed = target.dataset.speed;
    saveSettings();
    syncSpeedButtons();
    syncHud(true);
  } else if (target === dom.mute) setMuted(audio.toggleMute());
  else if (target === dom.pauseButton) {
    if (screen === 'paused') resumeGame();
    else pauseGame();
  }
});

async function copyShare(button) {
  const text = dom.dailyShare.textContent;
  const label = button.textContent;
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = 'Copied!';
  } catch {
    // Clipboard access is often blocked; select it so it can be copied by hand.
    const range = document.createRange();
    range.selectNodeContents(dom.dailyShare);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    button.textContent = 'Press Ctrl+C';
  }
  setTimeout(() => {
    button.textContent = label;
  }, 1600);
}

dom.musicToggle.addEventListener('change', () => {
  audio.resume();
  settings.music = dom.musicToggle.checked;
  saveSettings();
  // Only pick the music back up if there is a game to score.
  audio.setMusicEnabled(settings.music, { resume: screen === 'playing' });
});

dom.resistanceToggle.addEventListener('change', () => {
  settings.resistance = dom.resistanceToggle.checked;
  saveSettings();
  demo = null;
  syncHud(true);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseGame();
});

input.attach(window);
input.attachTouch(dom.touchpad);
input.attachSwipe(dom.board, { cellSize: () => renderers[0].layout?.cell });

window.addEventListener('resize', () => {
  for (const renderer of renderers) renderer.resize();
});

// ---- main loop ------------------------------------------------------------

function frame(now) {
  const dt = Math.min(100, now - lastFrame);
  lastFrame = now;
  input.update(dt);

  if (match) {
    if (screen === 'playing') {
      match.update(dt);
      handleMatchEvents();
      syncHud();
    }
    renderers[0].draw(match.players[0], now);
    renderers[1].draw(match.players[1], now);
  } else if (game) {
    if (screen === 'playing') {
      game.update(dt);
      handleGameEvents();
      updateMusicMood();
      syncHud();
    }
    renderers[0].draw(game, now);
    drawVirusTally(dom.virusTally, virusCounts(game.board), now, era);
  } else {
    const preview = titleBoardGame();
    renderers[0].draw(preview, now);
    drawVirusTally(dom.virusTally, virusCounts(preview.board), now, era);
  }

  drawPhysician(now);
  requestAnimationFrame(frame);
}

/** The bottle behind the title card previews the level about to be played. */
let demo = null;
let demoKey = '';
function titleBoardGame() {
  const level = previewLevel();
  const key = `${level}:${settings.resistance}:${mode}`;
  if (!demo || demoKey !== key) {
    demo = new Game({
      level,
      speed: 'LOW',
      seed: 20260501 + level,
      resistance: mode === 'daily' ? dailySetup(settings.dailyKey ?? dailyKey()).resistance : settings.resistance,
    });
    demo.pill = null;
    demoKey = key;
  }
  return demo;
}

// ---- offline --------------------------------------------------------------

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('../sw.js', import.meta.url)).catch((error) => {
      console.warn('[rxdrop] offline support unavailable', error);
    });
  });
}

window.addEventListener('offline', () => {
  dom.offlineNote.textContent = 'Offline - and still playable. That is the point.';
});
window.addEventListener('online', () => {
  dom.offlineNote.textContent =
    'An original Dr. Mario style puzzler. No dependencies - drawn and synthesised in the browser.';
});

// A small hook for debugging in the console (and for the browser checks).
window.rxdrop = {
  get game() {
    return game;
  },
  get match() {
    return match;
  },
  get screen() {
    return screen;
  },
  get mode() {
    return mode;
  },
  setMode,
  start: startGame,
  startVersus,
  pause: pauseGame,
  resume: resumeGame,
  quit: quitToTitle,
  audio,
  renderer: renderers[0],
  renderers,
  settings,
  pillCells,
  collateralOf,
  constants: { NECK_ROWS, RESISTANCE_MAX, TOLERANCE_AT },
};

setMuted(settings.muted);
syncSpeedButtons();
dom.musicToggle.checked = settings.music;
audio.setMusicEnabled(settings.music, { resume: false });
dom.resistanceToggle.checked = settings.resistance;
setMode(settings.mode);
showScreen('title');
syncHud(true);
requestAnimationFrame((now) => {
  lastFrame = now;
  frame(now);
});
