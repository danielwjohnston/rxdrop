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

/** Delayed auto-shift, so holding left or right slides the pill smoothly. */
const DAS_DELAY = 170;
const DAS_REPEAT = 45;

export class InputController {
  constructor({ onPress, onRelease }) {
    this.onPress = onPress;
    this.onRelease = onRelease;
    this.held = new Map();
    this.gamepadState = new Map();
    this.listeners = [];
  }

  attach(window_ = window) {
    this.window = window_;
    const onKeyDown = (event) => {
      const action = KEY_MAP[event.code];
      if (!action) return;
      event.preventDefault();
      if (event.repeat) return;
      this.press(action);
    };
    const onKeyUp = (event) => {
      const action = KEY_MAP[event.code];
      if (!action) return;
      event.preventDefault();
      this.release(action);
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
        this.press(action);
      };
      const up = (event) => {
        event.preventDefault();
        button.classList.remove('is-pressed');
        this.release(action);
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

  /** Swipes on the playfield: drag to move, flick down to drop, tap to rotate. */
  attachSwipe(element, { cellSize = 32 } = {}) {
    let start = null;
    let lastStepX = 0;
    let moved = false;

    const onDown = (event) => {
      start = { x: event.clientX, y: event.clientY, time: performance.now() };
      lastStepX = 0;
      moved = false;
      element.setPointerCapture?.(event.pointerId);
    };
    const onMove = (event) => {
      if (!start) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      const threshold = Math.max(24, cellSize * 0.8);
      const steps = Math.trunc(dx / threshold);
      if (steps !== lastStepX) {
        const direction = steps > lastStepX ? 'right' : 'left';
        for (let i = 0; i < Math.abs(steps - lastStepX); i += 1) this.tap(direction);
        lastStepX = steps;
        moved = true;
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
      else if (dy > cellSize * 3 && elapsed < 260 && Math.abs(dx) < cellSize) this.tap('hardDrop');
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

  press(action) {
    if (this.held.has(action)) return;
    this.held.set(action, { timer: 0, repeating: false });
    this.onPress?.(action);
  }

  release(action) {
    if (!this.held.delete(action)) return;
    this.onRelease?.(action);
  }

  tap(action) {
    this.onPress?.(action);
    this.onRelease?.(action);
  }

  releaseAll() {
    for (const action of [...this.held.keys()]) this.release(action);
  }

  isHeld(action) {
    return this.held.has(action);
  }

  /** Drives auto-repeat for the horizontal moves and polls any gamepad. */
  update(dt) {
    for (const action of ['left', 'right']) {
      const state = this.held.get(action);
      if (!state) continue;
      state.timer += dt;
      const threshold = state.repeating ? DAS_REPEAT : DAS_DELAY;
      while (state.timer >= threshold) {
        state.timer -= threshold;
        state.repeating = true;
        this.onPress?.(action, { repeat: true });
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
      };
      for (const [action, pressed] of Object.entries(buttons)) {
        const key = `${pad.index}:${action}`;
        const was = this.gamepadState.get(key) ?? false;
        if (pressed && !was) this.press(action);
        else if (!pressed && was) this.release(action);
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
