import { MAX_LEVEL, SPEEDS, VIRUS } from './constants.js';
import { Game } from './game.js';
import { Renderer, drawPillPreview, drawVirusTally } from './renderer.js';
import { AudioEngine } from './audio.js';
import { InputController } from './input.js';

const STORAGE_KEY = 'rxdrop.settings.v1';
const SPEED_ORDER = ['LOW', 'MEDIUM', 'HIGH'];

const el = (id) => document.getElementById(id);

const dom = {
  board: el('board'),
  next: el('next'),
  score: el('score'),
  topScore: el('top-score'),
  level: el('level'),
  speed: el('speed'),
  viruses: el('viruses'),
  virusBar: el('virus-bar'),
  virusTally: el('virus-tally'),
  seed: el('seed'),
  overlay: el('overlay'),
  chooseLevel: el('choose-level'),
  mute: el('mute'),
  pauseButton: el('pause-button'),
  touchpad: el('touchpad'),
  clearTitle: el('clear-title'),
  clearLevel: el('clear-level'),
  clearFinale: el('clear-finale'),
  nextLevelButton: el('next-level'),
  clearScore: el('clear-score'),
  overSummary: el('over-summary'),
  overBest: el('over-best'),
};

const screens = Object.fromEntries(
  [...document.querySelectorAll('[data-screen]')].map((node) => [node.dataset.screen, node]),
);

const settings = loadSettings();
const renderer = new Renderer(dom.board);
const audio = new AudioEngine();
audio.setMuted(settings.muted);

let game = null;
let screen = 'title';
let lastFrame = performance.now();
let dangerMusic = false;
/** The record to beat when the current game started, for the "new best" note. */
let topScoreAtStart = 0;
/** When the current card appeared, so a mashed key cannot skip it instantly. */
let screenShownAt = 0;
const CONFIRM_LOCKOUT = 550;
/** Only the end-of-game cards need the guard; pausing should resume at once. */
const LOCKOUT_SCREENS = new Set(['over', 'clear']);

const input = new InputController({
  onPress: (action, meta) => handlePress(action, meta),
  onRelease: (action) => handleRelease(action),
});

// ---- settings -------------------------------------------------------------

function loadSettings() {
  const defaults = { level: 0, speed: 'LOW', muted: false, topScore: 0 };
  let stored = {};
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    stored = {};
  }
  const merged = { ...defaults, ...stored };

  // A URL like ?level=5&speed=HIGH&seed=1234 sets up a specific game.
  const params = new URLSearchParams(location.search);
  if (params.has('level')) merged.level = clampLevel(Number(params.get('level')));
  if (params.has('speed')) {
    const speed = params.get('speed').toUpperCase();
    if (SPEEDS[speed]) merged.speed = speed;
  }
  if (params.has('seed')) merged.seed = Number(params.get('seed')) >>> 0;
  merged.level = clampLevel(merged.level);
  if (!SPEEDS[merged.speed]) merged.speed = 'LOW';
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
      }),
    );
  } catch {
    /* private browsing - just keep the values in memory */
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
  dom.pauseButton.disabled = !game || game.isOver;
  if (name !== 'playing') input.releaseAll();
}

function startGame({ level = settings.level, speed = settings.speed, seed } = {}) {
  audio.resume();
  const chosenSeed = seed ?? (settings.seed ?? (Math.random() * 0xffffffff) >>> 0);
  settings.seed = undefined;
  topScoreAtStart = settings.topScore;
  game = new Game({ level, speed, seed: chosenSeed });
  dangerMusic = false;
  audio.setTrack('chill');
  audio.startMusic('chill');
  audio.play('start');
  showScreen('playing');
  syncHud(true);
}

function quitToTitle() {
  audio.stopMusic();
  game = null;
  showScreen('title');
  syncHud(true);
}

// ---- HUD ------------------------------------------------------------------

function syncHud(force = false) {
  // On the title screen the readouts describe the level being previewed.
  const shown = game ?? (screen === 'title' ? titleBoardGame() : null);
  const score = game ? game.score : 0;
  if (score > settings.topScore) {
    settings.topScore = score;
    saveSettings();
  }
  dom.score.textContent = score.toLocaleString();
  dom.topScore.textContent = settings.topScore.toLocaleString();
  dom.level.textContent = game ? game.level : settings.level;
  dom.speed.textContent = SPEEDS[game ? game.speedName : settings.speed].name;
  dom.viruses.textContent = shown ? shown.virusesLeft : '-';
  dom.seed.textContent = game ? game.seed : '-';
  const ratio =
    shown && shown.startingViruses ? shown.virusesLeft / shown.startingViruses : 1;
  dom.virusBar.style.width = `${Math.round(ratio * 100)}%`;
  dom.chooseLevel.textContent = settings.level;
  if (force || game) drawPillPreview(dom.next, game ? game.nextColors : null);
}

/** How many viruses of each colour are left on the board. */
function virusCounts(board) {
  const counts = [0, 0, 0];
  board?.forEachCell((c) => {
    if (c.type === VIRUS) counts[c.color] += 1;
  });
  return counts;
}

/** Swaps to the tense track once the stack creeps toward the neck. */
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

function handleEvents() {
  for (const event of game.drainEvents()) {
    switch (event.type) {
      case 'clear':
        audio.play('clear', event);
        renderer.addShake(2 + Math.min(6, event.viruses * 2 + event.combo));
        break;
      case 'levelComplete': {
        audio.play('levelComplete');
        audio.stopMusic();
        const finale = event.level >= MAX_LEVEL;
        dom.clearTitle.textContent = finale ? 'Bottle empty!' : 'Level clear!';
        dom.clearLevel.textContent = event.level;
        dom.clearScore.textContent = game.score.toLocaleString();
        dom.clearFinale.hidden = !finale;
        dom.nextLevelButton.textContent = finale ? 'Play level 20 again' : 'Next level';
        showScreen('clear');
        break;
      }
      case 'gameOver':
        audio.play('gameOver');
        audio.stopMusic();
        dom.overSummary.textContent =
          `${game.startingViruses - game.virusesLeft} of ${game.startingViruses} viruses cleared ` +
          `on level ${game.level}. Final score ${game.score.toLocaleString()}.`;
        dom.overBest.hidden = game.score <= topScoreAtStart;
        showScreen('over');
        break;
      case 'spawn':
        drawPillPreview(dom.next, game.nextColors);
        break;
      default:
        audio.play(event.type, event);
        break;
    }
  }
}

// ---- input ----------------------------------------------------------------

function handlePress(action, meta = {}) {
  audio.resume();

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
      const card = screens[screen];
      card?.querySelector('.button--primary')?.click();
      return;
    }
    if (action === 'pause' && screen === 'paused') resumeGame();
    if (screen === 'title') {
      if (action === 'left') adjustLevel(-1);
      if (action === 'right') adjustLevel(1);
      if (action === 'rotateCW' || action === 'rotateCCW') cycleSpeed(action === 'rotateCW' ? 1 : -1);
    }
    return;
  }

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
    case 'pause':
      pauseGame();
      break;
    case 'restart':
      startGame({ level: game.level, speed: game.speedName });
      break;
    default:
      break;
  }
  handleEvents();
  syncHud();
}

function handleRelease(action) {
  if (action === 'softDrop' && game) game.setSoftDrop(false);
}

function pauseGame() {
  if (!game || game.isOver || screen !== 'playing') return;
  game.paused = true;
  audio.play('pause');
  audio.stopMusic();
  showScreen('paused');
}

function resumeGame() {
  if (!game || game.isOver) return;
  game.paused = false;
  audio.play('resume');
  audio.resume();
  audio.startMusic(dangerMusic ? 'fever' : 'chill');
  showScreen('playing');
  lastFrame = performance.now();
}

function setMuted(muted) {
  settings.muted = muted;
  saveSettings();
  dom.mute.textContent = `Sound: ${muted ? 'off' : 'on'}`;
  dom.mute.setAttribute('aria-pressed', String(muted));
  if (!muted && game && screen === 'playing') audio.startMusic();
}

function adjustLevel(delta) {
  settings.level = clampLevel(settings.level + delta);
  saveSettings();
  syncHud(true);
}

function cycleSpeed(delta) {
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

  if (target.dataset.start !== undefined) startGame();
  else if (target.dataset.resume !== undefined) resumeGame();
  else if (target.dataset.quit !== undefined) quitToTitle();
  else if (target.dataset.retry !== undefined || target.dataset.restart !== undefined) {
    startGame({ level: game?.level ?? settings.level, speed: game?.speedName ?? settings.speed });
  }
  else if (target.dataset.nextLevel !== undefined) {
    game.advanceLevel();
    settings.level = game.level;
    saveSettings();
    dangerMusic = false;
    audio.setTrack('chill');
    audio.startMusic('chill');
    showScreen('playing');
    syncHud(true);
  } else if (target.dataset.adjust === 'level') adjustLevel(Number(target.dataset.delta));
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

document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseGame();
});

input.attach(window);
input.attachTouch(dom.touchpad);
input.attachSwipe(dom.board, { cellSize: () => renderer.layout?.cell });

window.addEventListener('resize', () => renderer.resize());

// ---- main loop ------------------------------------------------------------

function frame(now) {
  const dt = Math.min(100, now - lastFrame);
  lastFrame = now;

  input.update(dt);

  if (game) {
    if (screen === 'playing') {
      game.update(dt);
      handleEvents();
      updateMusicMood();
      syncHud();
    }
    renderer.draw(game, now);
    drawVirusTally(dom.virusTally, virusCounts(game.board), now);
  } else {
    const board = titleBoardGame();
    renderer.draw(board, now);
    drawVirusTally(dom.virusTally, virusCounts(board.board), now);
  }

  requestAnimationFrame(frame);
}

/** The bottle behind the title card previews the level about to be played. */
let demo = null;
let demoLevel = -1;
function titleBoardGame() {
  if (!demo || demoLevel !== settings.level) {
    demo = new Game({ level: settings.level, speed: 'LOW', seed: 20260501 + settings.level });
    demo.pill = null;
    demoLevel = settings.level;
  }
  return demo;
}

// A small hook for debugging in the console (and for the browser smoke test).
window.rxdrop = {
  get game() {
    return game;
  },
  get screen() {
    return screen;
  },
  start: startGame,
  pause: pauseGame,
  resume: resumeGame,
  quit: quitToTitle,
  audio,
  renderer,
  settings,
};

setMuted(settings.muted);
syncSpeedButtons();
showScreen('title');
syncHud(true);
requestAnimationFrame((now) => {
  lastFrame = now;
  frame(now);
});
