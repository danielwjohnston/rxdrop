/**
 * Keyboard, touch and gamepad handling. The controller only turns raw events
 * into named actions - what an action does is up to main.js.
 */

const KEY_MAP = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowDown: 'softDrop',
  KeyS: 'softDrop',
  ArrowUp: 'rotateCW',
  KeyW: 'rotateCW',
  KeyX: 'rotateCW',
  KeyZ: 'rotateCCW',
  KeyQ: 'rotateCCW',
  Space: 'hardDrop',
  KeyP: 'pause',
  Escape: 'pause',
  Enter: 'confirm',
  KeyM: 'mute',
  KeyR: 'restart',
};

/**
 * Versus splits the keyboard down the middle: player one on the left hand,
 * player two on the arrows and the punctuation cluster.
 */
export const VERSUS_KEY_MAP = {
  KeyQ: { player: 0, action: 'rotateCCW' },
  KeyW: { player: 0, action: 'rotateCW' },
  KeyA: { player: 0, action: 'left' },
  KeyD: { player: 0, action: 'right' },
  KeyS: { player: 0, action: 'softDrop' },
  KeyE: { player: 0, action: 'hardDrop' },

  ArrowLeft: { player: 1, action: 'left' },
  ArrowRight: { player: 1, action: 'right' },
  ArrowDown: { player: 1, action: 'softDrop' },
  Comma: { player: 1, action: 'rotateCCW' },
  Period: { player: 1, action: 'rotateCW' },
  Slash: { player: 1, action: 'hardDrop' },

  KeyP: { player: 0, action: 'pause' },
  Escape: { player: 0, action: 'pause' },
  Enter: { player: 0, action: 'confirm' },
  KeyM: { player: 0, action: 'mute' },
};

/** Delayed auto-shift, so holding left or right slides the pill smoothly. */
const DAS_DELAY = 170;
const DAS_REPEAT = 45;
const REPEATING = new Set(['left', 'right']);

export class InputController {
  constructor({ onPress, onRelease }) {
    this.onPress = onPress;
    this.onRelease = onRelease;
    this.held = new Map();
    this.gamepadState = new Map();
    this.listeners = [];
    this.keyMap = KEY_MAP;
    /** In versus each gamepad drives its own player. */
    this.padsArePlayers = false;
  }

  /**
   * Swaps the keyboard layout. Entries are either a plain action for player
   * one, or { player, action } when the two players share the keyboard.
   */
  setKeyMap(map, { padsArePlayers = false } = {}) {
    this.releaseAll();
    this.keyMap = map;
    this.padsArePlayers = padsArePlayers;
  }

  /** Resolves a key code to { player, action }, or null. */
  binding(code) {
    const entry = this.keyMap[code];
    if (!entry) return null;
    return typeof entry === 'string' ? { player: 0, action: entry } : entry;
  }

  attach(window_ = window) {
    this.window = window_;
    const onKeyDown = (event) => {
      const bound = this.binding(event.code);
      if (!bound) return;
      event.preventDefault();
      if (event.repeat) return;
      this.press(bound.action, bound.player);
    };
    const onKeyUp = (event) => {
      const bound = this.binding(event.code);
      if (!bound) return;
      event.preventDefault();
      this.release(bound.action, bound.player);
    };
    const onBlur = () => this.releaseAll();

    window_.addEventListener('keydown', onKeyDown);
    window_.addEventListener('keyup', onKeyUp);
    window_.addEventListener('blur', onBlur);
    this.listeners.push(
      () => window_.removeEventListener('keydown', onKeyDown),
      () => window_.removeEventListener('keyup', onKeyUp),
      () => window_.removeEventListener('blur', onBlur),
    );
  }

  /** Wires up on-screen buttons carrying a data-action attribute. */
  attachTouch(root) {
    const buttons = root.querySelectorAll('[data-action]');
    for (const button of buttons) {
      const action = button.dataset.action;
      const down = (event) => {
        event.preventDefault();
        button.classList.add('is-pressed');
        this.press(action, 0);
      };
      const up = (event) => {
        event.preventDefault();
        button.classList.remove('is-pressed');
        this.release(action, 0);
      };
      button.addEventListener('pointerdown', down);
      button.addEventListener('pointerup', up);
      button.addEventListener('pointercancel', up);
      button.addEventListener('pointerleave', up);
      this.listeners.push(
        () => button.removeEventListener('pointerdown', down),
        () => button.removeEventListener('pointerup', up),
        () => button.removeEventListener('pointercancel', up),
        () => button.removeEventListener('pointerleave', up),
      );
    }
  }

  /**
   * Swipes on the playfield: drag sideways to move, slide up to rotate, hold
   * down to soft drop, flick down to hard drop, tap to rotate.
   * `cellSize` may be a function, so the thresholds follow the rendered board.
   */
  attachSwipe(element, { cellSize = 32 } = {}) {
    const cell = () => (typeof cellSize === 'function' ? cellSize() || 32 : cellSize);
    let start = null;
    let lastStepX = 0;
    let lastStepUp = 0;
    let moved = false;

    const onDown = (event) => {
      start = { x: event.clientX, y: event.clientY, time: performance.now() };
      lastStepX = 0;
      lastStepUp = 0;
      moved = false;
      element.setPointerCapture?.(event.pointerId);
      // Belt and braces with the CSS: some browsers still begin a selection
      // from a pointerdown on a canvas.
      event.preventDefault?.();
    };
    const onMove = (event) => {
      if (!start) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      const threshold = Math.max(24, cell() * 0.8);
      const steps = Math.trunc(dx / threshold);
      if (steps !== lastStepX) {
        const direction = steps > lastStepX ? 'right' : 'left';
        for (let i = 0; i < Math.abs(steps - lastStepX); i += 1) this.tap(direction);
        lastStepX = steps;
        moved = true;
      }
      // Sliding UP rotates, one turn per cell travelled. A tap rotates too, but
      // a swipe is easier to aim mid-drag than lifting a finger to tap, and the
      // gesture reads as standing the capsule up. Guarded on dx so a sloppy
      // sideways drag never spins the capsule.
      if (Math.abs(dx) < threshold) {
        const up = Math.trunc(-dy / threshold);
        if (up > lastStepUp) {
          for (let i = 0; i < up - lastStepUp; i += 1) this.tap('rotateCW');
          moved = true;
        }
        lastStepUp = Math.max(0, up);
      }
      if (dy > threshold * 1.5 && Math.abs(dx) < threshold) {
        this.press('softDrop');
        moved = true;
      }
    };
    const onUp = (event) => {
      if (!start) return;
      const dy = event.clientY - start.y;
      const dx = event.clientX - start.x;
      const elapsed = performance.now() - start.time;
      this.release('softDrop');
      if (!moved && Math.hypot(dx, dy) < 12 && elapsed < 350) this.tap('rotateCW');
      else if (dy > cell() * 3 && elapsed < 260 && Math.abs(dx) < cell()) this.tap('hardDrop');
      start = null;
    };

    element.addEventListener('pointerdown', onDown);
    element.addEventListener('pointermove', onMove);
    element.addEventListener('pointerup', onUp);
    element.addEventListener('pointercancel', onUp);
    this.listeners.push(
      () => element.removeEventListener('pointerdown', onDown),
      () => element.removeEventListener('pointermove', onMove),
      () => element.removeEventListener('pointerup', onUp),
      () => element.removeEventListener('pointercancel', onUp),
    );
  }

  press(action, player = 0) {
    const key = `${player}:${action}`;
    if (this.held.has(key)) return;
    this.held.set(key, { action, player, timer: 0, repeating: false });
    this.onPress?.(action, { player });
  }

  release(action, player = 0) {
    const key = `${player}:${action}`;
    if (!this.held.delete(key)) return;
    this.onRelease?.(action, { player });
  }

  tap(action, player = 0) {
    this.onPress?.(action, { player });
    this.onRelease?.(action, { player });
  }

  releaseAll() {
    for (const { action, player } of [...this.held.values()]) this.release(action, player);
  }

  isHeld(action, player = 0) {
    return this.held.has(`${player}:${action}`);
  }

  /** Drives auto-repeat for the horizontal moves and polls any gamepad. */
  update(dt) {
    for (const state of this.held.values()) {
      if (!REPEATING.has(state.action)) continue;
      state.timer += dt;
      const threshold = state.repeating ? DAS_REPEAT : DAS_DELAY;
      while (state.timer >= threshold) {
        state.timer -= threshold;
        state.repeating = true;
        this.onPress?.(state.action, { player: state.player, repeat: true });
      }
    }
    this.pollGamepad();
  }

  pollGamepad() {
    const pads = this.window?.navigator?.getGamepads?.();
    if (!pads) return;
    for (const pad of pads) {
      if (!pad) continue;
      const buttons = {
        left: pad.buttons[14]?.pressed || pad.axes[0] < -0.5,
        right: pad.buttons[15]?.pressed || pad.axes[0] > 0.5,
        softDrop: pad.buttons[13]?.pressed || pad.axes[1] > 0.5,
        rotateCW: pad.buttons[0]?.pressed,
        rotateCCW: pad.buttons[1]?.pressed,
        hardDrop: pad.buttons[12]?.pressed || pad.buttons[3]?.pressed,
        pause: pad.buttons[9]?.pressed,
        mute: pad.buttons[2]?.pressed,
        // Restart throws the current run away, so it sits on Back/Select
        // rather than a face button that is easy to catch mid-game.
        restart: pad.buttons[8]?.pressed,
      };
      const player = this.padsArePlayers ? Math.min(pad.index, 1) : 0;
      for (const [action, pressed] of Object.entries(buttons)) {
        const key = `${pad.index}:${action}`;
        const was = this.gamepadState.get(key) ?? false;
        if (pressed && !was) this.press(action, player);
        else if (!pressed && was) this.release(action, player);
        this.gamepadState.set(key, pressed);
      }
    }
  }

  detach() {
    this.releaseAll();
    for (const off of this.listeners) off();
    this.listeners = [];
  }
}

export { KEY_MAP };
