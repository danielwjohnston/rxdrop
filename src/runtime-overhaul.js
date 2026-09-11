import { AudioEngine } from './audio.js';
import { Board, isHybrid } from './board.js';
import { VIRUS } from './constants.js';
import { Game } from './game.js';
import { InputController } from './input.js';
import { drawPractitionerSprite } from './art.js';
import { VISUAL_PERIODS, periodFor } from './periods.js';
import {
  PHOTO,
  administerRows,
  contaminateRows,
  createPhototherapyState,
  ensurePhototherapy,
  hardDropLight,
  lightPieceCells,
  medicationClearsBiofilm,
  moveLight,
  recentlyIlluminated,
  rotateLight,
  setPhototherapyActive,
  togglePhototherapy,
  updatePhototherapy,
} from './phototherapy.js';
import { Renderer } from './renderer.js';
import {
  MUSIC_PROFILES,
  installEraMusic,
  refreshEraMusic,
  setPhototherapyMusic,
} from './music.js';
import {
  SONIC,
  createSonicState,
  ensureSonic,
  hitSonicLane,
  primeHybridDeliveries,
  setSonicActive,
  setSonicTempo,
  toggleSonic,
  updateSonic,
} from './sonic-therapy.js';
import { VirusTheatre } from './virus-theatre.js';

const PERIOD_SHEET = new URL('../assets/medical-era-sprites.svg', import.meta.url).href;
let installed = false;
let booted = false;
let theatre = null;
let sonicCanvas = null;
let sonicButton = null;
let sonicMeter = null;
let lastPeriodId = '';
let padState = new Map();

const artPeriod = (level) => {
  const period = periodFor(level);
  const artIndex = Math.max(0, VISUAL_PERIODS.indexOf(period));
  return period.artIndex === artIndex ? period : { ...period, artIndex };
};

const activeGame = () => {
  const rx = typeof window !== 'undefined' ? window.rxdrop : null;
  return rx?.screen === 'playing' && !rx.match ? rx.game : null;
};

const currentPeriod = () => {
  const rx = typeof window !== 'undefined' ? window.rxdrop : null;
  return artPeriod(rx?.game?.level ?? rx?.settings?.level ?? 0);
};

function haptic(kind = 'tick') {
  if (typeof navigator === 'undefined') return;
  const vibration = kind === 'pulse' ? [26, 22, 44] : kind === 'perfect' ? 18 : 10;
  try { navigator.vibrate?.(vibration); } catch { /* optional hardware */ }
  const pads = navigator.getGamepads?.() ?? [];
  for (const pad of pads) {
    const actuator = pad?.vibrationActuator ?? pad?.hapticActuators?.[0];
    if (!actuator?.playEffect) continue;
    const strongMagnitude = kind === 'pulse' ? 0.8 : kind === 'perfect' ? 0.45 : 0.22;
    actuator.playEffect('dual-rumble', {
      duration: kind === 'pulse' ? 120 : 55,
      startDelay: 0,
      strongMagnitude,
      weakMagnitude: Math.min(1, strongMagnitude + 0.12),
    }).catch?.(() => {});
  }
}

function installGameIntegration() {
  if (installed) return;
  installed = true;

  const originalReset = Game.prototype.reset;
  const originalMove = Game.prototype.move;
  const originalRotate = Game.prototype.rotate;
  const originalSoftDrop = Game.prototype.setSoftDrop;
  const originalHardDrop = Game.prototype.hardDrop;
  const originalEmit = Game.prototype.emit;
  const originalDrain = Game.prototype.drainEvents;
  const originalCureHybrids = Board.prototype.cureHybrids;
  const originalPollGamepad = InputController.prototype.pollGamepad;

  Game.prototype.reset = function resetWithTherapies(...args) {
    const result = originalReset.apply(this, args);
    this.phototherapy = createPhototherapyState(this);
    this.sonicTherapy = createSonicState(this);
    this._rxLightDown = false;
    return result;
  };

  // Game.update already calls updateLight once per frame. Keep that stable seam
  // and replace what "light" means rather than adding another simulation clock.
  Game.prototype.updateLight = function updateTreatmentSystems(dt) {
    updatePhototherapy(this, dt);
    updateSonic(this, dt);
  };

  // The legacy held-light input becomes a rising-edge toggle. Release is
  // deliberately ignored: phototherapy is a mode you enter, not a flashlight
  // you must keep a finger on while trying to play.
  Game.prototype.setLight = function setPhototherapyToggle(on) {
    const pressed = Boolean(on);
    if (pressed && !this._rxLightDown) {
      if (ensureSonic(this).active) setSonicActive(this, false);
      togglePhototherapy(this);
      setPhototherapyMusic(ensurePhototherapy(this).active);
    }
    this._rxLightDown = pressed;
    return ensurePhototherapy(this).active;
  };

  Game.prototype.move = function moveTreatmentAware(dx) {
    if (ensureSonic(this).active) return false;
    if (ensurePhototherapy(this).active) {
      const moved = moveLight(this, dx, 0);
      if (moved) originalEmit.call(this, 'move');
      return moved;
    }
    return originalMove.call(this, dx);
  };

  Game.prototype.rotate = function rotateTreatmentAware(direction = 1) {
    if (ensureSonic(this).active) return false;
    if (ensurePhototherapy(this).active) {
      const moved = rotateLight(this, direction);
      if (moved) originalEmit.call(this, 'rotate');
      return moved;
    }
    return originalRotate.call(this, direction);
  };

  Game.prototype.setSoftDrop = function setTreatmentSpeed(active) {
    if (ensureSonic(this).active) return;
    if (ensurePhototherapy(this).active) {
      ensurePhototherapy(this).fast = Boolean(active);
      return;
    }
    return originalSoftDrop.call(this, active);
  };

  Game.prototype.hardDrop = function hardDropTreatmentAware() {
    if (ensureSonic(this).active) return false;
    if (ensurePhototherapy(this).active) return hardDropLight(this);
    return originalHardDrop.call(this);
  };

  Board.prototype.cureHybrids = function cureSonicatedHybrids(deliveries, chain) {
    primeHybridDeliveries(this, deliveries);
    return originalCureHybrids.call(this, deliveries, chain);
  };

  Game.prototype.emit = function emitTreatmentAware(type, detail = {}) {
    let enriched = { ...detail };
    if (type === 'clear') {
      const virusCells = (this.clearingCells ?? []).filter((cell) => cell.type === VIRUS);
      const virusColors = [...new Set(virusCells.map((cell) => cell.color))];
      const virusRows = [...new Set(virusCells.map((cell) => cell.y))];
      const clearedRows = [...new Set((this.clearingCells ?? []).map((cell) => cell.y))];
      const photoCombo = virusRows.some((row) => recentlyIlluminated(this, row));
      const sonicCombo = virusCells.some(({ x, y }) => (this.board.get(x, y)?.sonicOpen ?? 0) > 0);
      enriched = { ...enriched, virusColors, virusRows, photoCombo, sonicCombo };
      medicationClearsBiofilm(this, clearedRows);
      if (photoCombo || sonicCombo) {
        originalEmit.call(this, 'therapyCombo', {
          phototherapy: photoCombo,
          sonic: sonicCombo,
          viruses: enriched.viruses ?? virusCells.length,
          rows: virusRows,
        });
      }
    } else if (type === 'resist') {
      const cells = this.resistedCells ?? [];
      enriched.virusColors = [...new Set(cells.map((cell) => cell.color))];
      enriched.rows = [...new Set(cells.map((cell) => cell.y))];
      contaminateRows(this, enriched.rows, PHOTO.pulseContamination * 1.35);
    } else if (type === 'spread') {
      const rows = [...new Set((this.spreading ?? []).map((entry) => entry.y))];
      contaminateRows(this, rows, PHOTO.pulseContamination * 1.15);
    } else if (type === 'mutate') {
      const rows = [...new Set((this.mutations ?? []).map((entry) => entry.y))];
      contaminateRows(this, rows, PHOTO.pulseContamination * 0.75);
    } else if (type === 'sonicHit') {
      haptic(enriched.grade === 'perfect' ? 'perfect' : 'tick');
    } else if (type === 'sonicPulse' || type === 'phototherapy') {
      haptic('pulse');
    }
    return originalEmit.call(this, type, enriched);
  };

  Game.prototype.drainEvents = function drainWithTheatre() {
    const events = originalDrain.call(this);
    if (theatre && this === activeGame()) {
      const now = performance.now();
      for (const event of events) {
        theatre.react(event.type, event, now);
        if (event.type === 'phototherapyEnter' || event.type === 'phototherapy') theatre.setAll('panic', now, 760);
        if (event.type === 'sonicPulse') theatre.setAll('stunned', now, 900);
        if (event.type === 'sonicHit' && event.grade === 'perfect') theatre.setPose(event.lane % 3, 'panic', now, 260);
      }
    }
    return events;
  };

  // While sonic therapy is open the D-pad is the instrument, not the capsule.
  // The runtime draws and judges it; suppress the normal gamepad commands so a
  // good rhythm phrase cannot also shove the unattended medicine sideways.
  InputController.prototype.pollGamepad = function pollTreatmentGamepad() {
    const game = activeGame();
    if (!game || !ensureSonic(game).active) return originalPollGamepad.call(this);
    const pads = this.window?.navigator?.getGamepads?.() ?? [];
    for (const pad of pads) {
      if (!pad) continue;
      const pressed = [
        pad.buttons[14]?.pressed || pad.axes[0] < -0.5,
        pad.buttons[13]?.pressed || pad.axes[1] > 0.5,
        pad.buttons[12]?.pressed || pad.axes[1] < -0.5,
        pad.buttons[15]?.pressed || pad.axes[0] > 0.5,
      ];
      pressed.forEach((on, lane) => {
        const key = `${pad.index}:${lane}`;
        const was = padState.get(key) ?? false;
        if (on && !was) hitSonicLane(game, lane);
        padState.set(key, on);
      });
    }
  };
}

function drawTreatmentOverlay(renderer, game, now) {
  if (!renderer?.layout || !renderer.ctx) return;
  const { ctx, layout, dpr } = renderer;
  const state = ensurePhototherapy(game);
  const sonic = ensureSonic(game);
  ctx.save();
  ctx.scale(dpr, dpr);

  if (game.has?.('blackout')) {
    // Biofilm is local information loss: each row has its own clarity, with
    // denser particles where the culture is worst instead of one global veil.
    for (let y = 1; y < game.board.height; y += 1) {
      const clarity = state.clarity[y] ?? 1;
      const opacity = Math.max(0, (1 - clarity) * 0.82);
      if (opacity < 0.015) continue;
      const top = layout.originY + y * layout.cell;
      const gradient = ctx.createLinearGradient(layout.originX, top, layout.originX + layout.fieldW, top + layout.cell);
      gradient.addColorStop(0, `rgba(126, 146, 118, ${opacity * 0.72})`);
      gradient.addColorStop(0.5, `rgba(70, 91, 72, ${opacity})`);
      gradient.addColorStop(1, `rgba(119, 94, 70, ${opacity * 0.7})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(layout.originX, top, layout.fieldW, layout.cell + 1);

      ctx.globalAlpha = opacity * 0.55;
      ctx.strokeStyle = 'rgba(211, 226, 190, .45)';
      ctx.lineWidth = Math.max(1, layout.cell * 0.035);
      for (let strand = 0; strand < 3; strand += 1) {
        const offset = ((y * 31 + strand * 47) % 100) / 100;
        const x = layout.originX + offset * layout.fieldW;
        ctx.beginPath();
        ctx.moveTo(x, top + layout.cell * 0.12);
        ctx.bezierCurveTo(
          x + Math.sin(now / 1700 + strand) * layout.cell * 0.35,
          top + layout.cell * 0.35,
          x - layout.cell * 0.28,
          top + layout.cell * 0.7,
          x + layout.cell * 0.12,
          top + layout.cell * 0.92,
        );
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Projected light cells live on their own grid and shine through the haze.
    for (let y = 0; y < state.height; y += 1) {
      for (let x = 0; x < state.width; x += 1) {
        const light = state.grid[y][x];
        if (!light) continue;
        drawLightCell(ctx, layout, x, y, Math.max(0.14, light.life / light.born), renderer.era.accent);
      }
    }
    if (state.active && state.piece) {
      for (const { x, y } of lightPieceCells(state.piece)) drawLightCell(ctx, layout, x, y, 0.95, '#fff4b0');
    }
    for (const flash of state.flashes) {
      const alpha = Math.max(0, flash.life / PHOTO.flashFor);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `rgba(255, 248, 194, ${alpha * 0.72})`;
      for (const row of flash.rows) {
        ctx.fillRect(layout.originX, layout.originY + row * layout.cell, layout.fieldW, layout.cell);
      }
      ctx.restore();
    }
  }

  // Sonicated organisms get a vibrating membrane ring. It conveys preparation,
  // not damage: the organism still needs medication after the acoustic pulse.
  game.board.forEachCell((cell, x, y) => {
    if (cell.type !== VIRUS || !(cell.sonicOpen > 0)) return;
    const t = cell.sonicOpen / SONIC.openFor;
    const cx = layout.originX + (x + 0.5) * layout.cell;
    const cy = layout.originY + (y + 0.5) * layout.cell;
    ctx.save();
    ctx.globalAlpha = 0.28 + t * 0.5;
    ctx.strokeStyle = '#7ff3ff';
    ctx.lineWidth = Math.max(1, layout.cell * 0.055);
    ctx.setLineDash([layout.cell * 0.08, layout.cell * 0.07]);
    ctx.lineDashOffset = -now / 34;
    ctx.beginPath();
    ctx.arc(cx, cy, layout.cell * (0.42 + Math.sin(now / 90 + x + y) * 0.025), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });

  // The medicine capsule is always readable even in filthy biofilm. Redrawing
  // only the active capsule after the haze preserves the information bound.
  if (game.pill && typeof renderer.drawFallingPill === 'function') renderer.drawFallingPill(game, layout);
  ctx.restore();

  void sonic;
}

function drawLightCell(ctx, layout, x, y, alpha, color) {
  if (y < 0) return;
  const px = layout.originX + x * layout.cell;
  const py = layout.originY + y * layout.cell;
  const inset = layout.cell * 0.12;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = alpha;
  ctx.shadowColor = color;
  ctx.shadowBlur = layout.cell * 0.45;
  ctx.fillStyle = color;
  ctx.fillRect(px + inset, py + inset, layout.cell - inset * 2, layout.cell - inset * 2);
  ctx.globalAlpha *= 0.42;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(px + inset * 1.5, py + inset * 1.5, layout.cell - inset * 3, layout.cell * 0.12);
  ctx.restore();
}

function installRendererIntegration() {
  const originalDraw = Renderer.prototype.draw;
  Renderer.prototype.draw = function drawHistoricalTreatment(game, now) {
    const period = artPeriod(game?.level ?? 0);
    this.setEra(period);
    originalDraw.call(this, game, now);
    drawTreatmentOverlay(this, game, now);
  };
}

function installAudioIntegration() {
  installEraMusic(AudioEngine, currentPeriod);
  const originalPlay = AudioEngine.prototype.play;
  AudioEngine.prototype.play = function playSonicAware(name, detail = {}) {
    if (!this.ctx || this.muted) return originalPlay.call(this, name, detail);
    if (name === 'sonicEnter') {
      this.tone(146.83, { duration: 0.24, gain: 0.14, type: 'sine', slide: 220 });
      this.tone(293.66, { start: 0.08, duration: 0.34, gain: 0.1, type: 'sine' });
      return;
    }
    if (name === 'sonicExit') {
      this.tone(220, { duration: 0.18, gain: 0.1, type: 'sine', slide: 146.83 });
      return;
    }
    if (name === 'sonicHit') {
      if (detail.grade === 'miss') {
        this.noise({ duration: 0.045, gain: 0.08, frequency: 430 });
      } else {
        const freq = [261.63, 329.63, 392, 523.25][detail.lane ?? 0];
        this.tone(freq, {
          duration: detail.grade === 'perfect' ? 0.13 : 0.09,
          gain: detail.grade === 'perfect' ? 0.16 : 0.11,
          type: detail.grade === 'perfect' ? 'sine' : 'triangle',
          target: this.sfxGain,
        });
      }
      return;
    }
    if (name === 'sonicMiss') {
      this.noise({ duration: 0.05, gain: 0.07, frequency: 360 });
      return;
    }
    if (name === 'sonicPulse') {
      [110, 164.81, 220, 329.63].forEach((freq, i) => this.tone(freq, {
        start: i * 0.045,
        duration: 0.34,
        gain: 0.12,
        type: 'sine',
        slide: freq * 1.45,
      }));
      this.noise({ duration: 0.22, gain: 0.08, frequency: 1800 });
      return;
    }
    if (name === 'therapyCombo') {
      this.tone(523.25, { duration: 0.13, gain: 0.14, type: 'sine' });
      this.tone(783.99, { start: 0.08, duration: 0.24, gain: 0.13, type: 'sine' });
      return;
    }
    return originalPlay.call(this, name, detail);
  };
}

function ensureTreatmentUi() {
  const tally = document.getElementById('virus-tally');
  if (tally && !theatre) theatre = new VirusTheatre(tally);

  const lightMeter = document.getElementById('light-meter');
  if (lightMeter) {
    const label = lightMeter.querySelector('.readout__label');
    const hint = lightMeter.querySelector('.meter__hint');
    if (label) label.textContent = 'Culture clarity';
    if (hint) hint.textContent = 'Shift / L toggles Phototherapy';
  }
  const lightButton = document.getElementById('light-button');
  if (lightButton) {
    lightButton.textContent = 'PHOTOTHERAPY';
    lightButton.setAttribute('aria-label', 'Toggle phototherapy');
  }

  if (!sonicMeter) {
    const right = document.querySelector('.panel--right');
    if (right) {
      sonicMeter = document.createElement('div');
      sonicMeter.className = 'meter rx-sonic-meter';
      sonicMeter.hidden = true;
      sonicMeter.innerHTML = '<span class="readout__label">Sonic resonance</span>'
        + '<div class="meter__track"><div class="meter__fill rx-sonic-fill"></div></div>'
        + '<small class="meter__hint rx-sonic-hint">K toggles Sonic Therapy</small>';
      right.insertBefore(sonicMeter, document.getElementById('hud-mods'));
    }
  }

  if (!sonicButton) {
    const touchpad = document.getElementById('touchpad');
    if (touchpad) {
      sonicButton = document.createElement('button');
      sonicButton.type = 'button';
      sonicButton.id = 'sonic-button';
      sonicButton.className = 'touchpad__wide';
      sonicButton.textContent = 'SONIC THERAPY';
      sonicButton.hidden = true;
      sonicButton.setAttribute('aria-label', 'Toggle sonic therapy');
      sonicButton.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        const game = activeGame();
        if (game) toggleSonicMode(game);
      });
      touchpad.append(sonicButton);
    }
  }

  if (!sonicCanvas) {
    const field = document.querySelector('.playfield');
    if (field) {
      sonicCanvas = document.createElement('canvas');
      sonicCanvas.id = 'sonic-therapy';
      sonicCanvas.hidden = true;
      sonicCanvas.setAttribute('aria-label', 'Sonic therapy rhythm lanes');
      Object.assign(sonicCanvas.style, {
        position: 'absolute',
        inset: '7% 6% 9%',
        zIndex: '2',
        width: '88%',
        height: '84%',
        touchAction: 'none',
        borderRadius: '14px',
      });
      sonicCanvas.addEventListener('pointerdown', (event) => {
        const game = activeGame();
        if (!game || !ensureSonic(game).active) return;
        event.preventDefault();
        const rect = sonicCanvas.getBoundingClientRect();
        const lane = Math.max(0, Math.min(3, Math.floor((event.clientX - rect.left) / (rect.width / 4))));
        hitSonicLane(game, lane);
      });
      field.append(sonicCanvas);
    }
  }
}

function toggleSonicMode(game) {
  if (!game?.has?.('sonic')) return false;
  if (ensurePhototherapy(game).active) {
    setPhototherapyActive(game, false);
    setPhototherapyMusic(false);
  }
  const active = toggleSonic(game);
  game.softDropping = false;
  document.body.classList.toggle('is-sonic-therapy', active);
  return active;
}

function installKeyboard() {
  window.addEventListener('keydown', (event) => {
    const game = activeGame();
    if (event.code === 'KeyK' && game?.has?.('sonic')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!event.repeat) toggleSonicMode(game);
      return;
    }
    if (!game || !ensureSonic(game).active) return;
    const lane = {
      ArrowLeft: 0, KeyA: 0,
      ArrowDown: 1, KeyS: 1,
      ArrowUp: 2, KeyW: 2,
      ArrowRight: 3, KeyD: 3,
    }[event.code];
    if (lane === undefined) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!event.repeat) hitSonicLane(game, lane);
  }, true);

  window.addEventListener('keyup', (event) => {
    const game = activeGame();
    if (!game || !ensureSonic(game).active) return;
    if (['ArrowLeft', 'ArrowDown', 'ArrowUp', 'ArrowRight', 'KeyA', 'KeyS', 'KeyW', 'KeyD'].includes(event.code)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
}

function setBoardBackdrop(period) {
  const board = document.getElementById('board');
  if (!board) return;
  const index = Math.max(0, VISUAL_PERIODS.findIndex((item) => item.visualId === period.visualId));
  const x = VISUAL_PERIODS.length <= 1 ? 0 : (index / (VISUAL_PERIODS.length - 1)) * 100;
  board.style.backgroundImage = `radial-gradient(circle at 50% 45%, rgba(3,7,18,.1), rgba(3,7,18,.7) 78%), url("${PERIOD_SHEET}")`;
  board.style.backgroundSize = `100% 100%, ${VISUAL_PERIODS.length * 100}% 200%`;
  board.style.backgroundPosition = `center, ${x}% 100%`;
  board.style.backgroundRepeat = 'no-repeat';
  board.style.borderRadius = '16px';
}

function syncPeriodPresentation(game, now) {
  const level = game?.level ?? window.rxdrop?.settings?.level ?? 0;
  const period = artPeriod(level);
  if (period.visualId !== lastPeriodId) {
    lastPeriodId = period.visualId;
    document.body.dataset.period = period.visualId;
    document.body.dataset.era = period.id;
    document.body.style.setProperty('--era-accent', period.accent);
    document.body.style.setProperty('--era-back-1', period.backdrop[0]);
    document.body.style.setProperty('--era-back-2', period.backdrop[1]);
    const name = document.getElementById('era-name');
    const dates = document.getElementById('era-period');
    if (name) name.textContent = period.name;
    if (dates) dates.textContent = period.period;
    setBoardBackdrop(period);
    refreshEraMusic();
  }

  // Main still draws its robust procedural fallback. Paint the authored sprite
  // over it when the atlas is available; if it is not, the fallback remains.
  const doctor = document.getElementById('doctor');
  if (doctor) {
    const rect = doctor.getBoundingClientRect();
    if (rect.width > 0) {
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const ctx = doctor.getContext('2d');
      const size = Math.min(rect.width, rect.height);
      ctx.save();
      ctx.scale(dpr, dpr);
      // A small opaque stage patch prevents two portraits from ghosting together.
      ctx.clearRect(0, 0, rect.width, rect.height);
      drawPractitionerSprite(ctx, {
        x: (rect.width - size) / 2,
        y: rect.height - size,
        size,
        era: period,
        pose: 'idle',
        now,
      });
      ctx.restore();
    }
  }
  return period;
}

function drawSonicCanvas(game, period) {
  if (!sonicCanvas) return;
  const state = ensureSonic(game);
  sonicCanvas.hidden = !state.active;
  if (!state.active) return;
  const rect = sonicCanvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  sonicCanvas.width = Math.max(1, Math.round(rect.width * dpr));
  sonicCanvas.height = Math.max(1, Math.round(rect.height * dpr));
  const ctx = sonicCanvas.getContext('2d');
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, rect.width, rect.height);
  ctx.fillStyle = 'rgba(4, 8, 20, .72)';
  ctx.fillRect(0, 0, rect.width, rect.height);

  const laneW = rect.width / 4;
  const targetY = rect.height * 0.82;
  for (let lane = 0; lane < 4; lane += 1) {
    ctx.fillStyle = lane % 2 ? 'rgba(255,255,255,.025)' : 'rgba(127,243,255,.035)';
    ctx.fillRect(lane * laneW, 0, laneW, rect.height);
    ctx.strokeStyle = 'rgba(170,225,242,.13)';
    ctx.strokeRect(lane * laneW, 0, laneW, rect.height);
  }
  ctx.strokeStyle = period.accent;
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, targetY);
  ctx.lineTo(rect.width, targetY);
  ctx.stroke();
  ctx.globalAlpha = 1;

  const symbols = ['◀', '▼', '▲', '▶'];
  for (let lane = 0; lane < 4; lane += 1) {
    ctx.fillStyle = 'rgba(255,255,255,.78)';
    ctx.font = `700 ${Math.max(16, laneW * 0.22)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbols[lane], lane * laneW + laneW / 2, targetY + laneW * 0.22);
  }

  for (const note of state.notes) {
    if (note.judged) continue;
    const progress = Math.max(0, Math.min(1.15, note.age / SONIC.travelMs));
    const y = 12 + progress * (targetY - 20);
    const x = note.lane * laneW + laneW / 2;
    const distance = Math.abs(note.age - SONIC.travelMs);
    const near = distance <= SONIC.goodMs;
    ctx.save();
    ctx.shadowColor = near ? '#ffffff' : period.accent;
    ctx.shadowBlur = near ? 18 : 9;
    ctx.fillStyle = near ? '#ffffff' : period.accent;
    ctx.beginPath();
    ctx.arc(x, y, Math.min(laneW * 0.19, 18), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const charge = Math.min(1, state.charge / SONIC.pulseCharge);
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  ctx.fillRect(10, 10, rect.width - 20, 7);
  ctx.fillStyle = '#7ff3ff';
  ctx.fillRect(10, 10, (rect.width - 20) * charge, 7);
  ctx.font = '700 12px ui-monospace, monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#eafcff';
  ctx.fillText(`RESONANCE ${Math.round(charge * 100)}%  COMBO ${state.combo}`, 10, 34);
  if (state.lastGradeFor > 0 && state.lastGrade) {
    ctx.textAlign = 'center';
    ctx.font = `800 ${Math.max(18, rect.width * 0.055)}px system-ui, sans-serif`;
    ctx.fillStyle = state.lastGrade === 'perfect' ? '#ffffff' : state.lastGrade === 'good' ? '#7ff3ff' : '#ff7474';
    ctx.fillText(state.lastGrade.toUpperCase(), rect.width / 2, targetY * 0.48);
  }
  if (state.pulseFor > 0) {
    ctx.globalAlpha = Math.min(0.65, state.pulseFor / 720);
    ctx.fillStyle = '#7ff3ff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#06131b';
    ctx.font = `900 ${Math.max(20, rect.width * 0.06)}px system-ui, sans-serif`;
    ctx.fillText('SONOPORATION', rect.width / 2, rect.height * 0.44);
  }
  ctx.restore();
}

function syncTreatmentUi(game) {
  if (!game) {
    if (sonicCanvas) sonicCanvas.hidden = true;
    if (sonicButton) sonicButton.hidden = true;
    if (sonicMeter) sonicMeter.hidden = true;
    document.body.classList.remove('is-sonic-therapy');
    return;
  }
  const photo = ensurePhototherapy(game);
  const sonic = ensureSonic(game);
  const hasSonic = game.has?.('sonic');
  if (sonicButton) {
    sonicButton.hidden = !hasSonic;
    sonicButton.classList.toggle('is-lit', sonic.active);
  }
  if (sonicMeter) {
    sonicMeter.hidden = !hasSonic;
    const fill = sonicMeter.querySelector('.rx-sonic-fill');
    if (fill) fill.style.width = `${Math.min(100, Math.round(sonic.charge / SONIC.pulseCharge * 100))}%`;
    const hint = sonicMeter.querySelector('.rx-sonic-hint');
    if (hint) hint.textContent = sonic.active
      ? `${sonic.lastGrade ?? 'listen'} · combo ${sonic.combo}`
      : 'K or SONIC enters the rhythm chamber';
  }
  const lightButton = document.getElementById('light-button');
  if (lightButton) lightButton.classList.toggle('is-lit', photo.active);
  document.body.classList.toggle('is-sonic-therapy', sonic.active);
}

function runtimeFrame(now) {
  ensureTreatmentUi();
  const game = activeGame();
  const shown = game ?? window.rxdrop?.game ?? null;
  const period = syncPeriodPresentation(shown, now);
  if (shown && theatre) {
    const counts = [0, 0, 0, 0, 0, 0];
    shown.board?.forEachCell((cell) => {
      if (cell.type === VIRUS && counts[cell.color] !== undefined) counts[cell.color] += 1;
    });
    theatre.draw(counts, now, period);
  }
  if (game) {
    const profile = MUSIC_PROFILES[period.music];
    setSonicTempo(game, 120 * (profile?.tempo ?? 1));
    syncTreatmentUi(game);
    drawSonicCanvas(game, period);
  } else {
    syncTreatmentUi(null);
  }
  requestAnimationFrame(runtimeFrame);
}

function bootstrap() {
  if (booted || !window.rxdrop) {
    if (!booted) requestAnimationFrame(bootstrap);
    return;
  }
  booted = true;
  ensureTreatmentUi();
  installKeyboard();
  requestAnimationFrame(runtimeFrame);
}

installGameIntegration();
installRendererIntegration();
installAudioIntegration();
requestAnimationFrame(bootstrap);
