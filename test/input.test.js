import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { InputController, KEY_MAP } from '../src/input.js';

/** Minimal stand-in for `window`, so the controller can run under node. */
function fakeWindow(pads = []) {
  const listeners = new Map();
  return {
    navigator: { getGamepads: () => pads },
    addEventListener(type, fn) {
      listeners.set(type, [...(listeners.get(type) ?? []), fn]);
    },
    removeEventListener(type, fn) {
      listeners.set(type, (listeners.get(type) ?? []).filter((f) => f !== fn));
    },
    fire(type, event = {}) {
      for (const fn of listeners.get(type) ?? []) fn({ preventDefault() {}, ...event });
    },
  };
}

/** A standard-layout pad whose buttons and axes the test can set. */
function fakePad() {
  return {
    index: 0,
    mapping: 'standard',
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
    hold(index) {
      this.buttons[index] = { pressed: true, value: 1 };
      return this;
    },
    releaseAll() {
      this.buttons = this.buttons.map(() => ({ pressed: false, value: 0 }));
      this.axes = [0, 0, 0, 0];
      return this;
    },
  };
}

function harness(pads = []) {
  const pressed = [];
  const released = [];
  const controller = new InputController({
    onPress: (action, meta) => pressed.push(meta?.repeat ? `${action}:repeat` : action),
    onRelease: (action) => released.push(action),
  });
  const window_ = fakeWindow(pads);
  controller.attach(window_);
  return { controller, window: window_, pressed, released };
}

describe('keyboard', () => {
  it('maps the documented keys to actions', () => {
    const { window: w, pressed } = harness();
    for (const code of ['ArrowLeft', 'KeyD', 'Space', 'KeyZ', 'KeyP', 'KeyM', 'KeyR']) {
      w.fire('keydown', { code });
    }
    assert.deepEqual(pressed, ['left', 'right', 'hardDrop', 'rotateCCW', 'pause', 'mute', 'restart']);
  });

  it('releases on key up and ignores unknown keys', () => {
    const { window: w, pressed, released } = harness();
    w.fire('keydown', { code: 'ArrowLeft' });
    w.fire('keyup', { code: 'ArrowLeft' });
    w.fire('keydown', { code: 'F13' });
    assert.deepEqual(pressed, ['left']);
    assert.deepEqual(released, ['left']);
  });

  it('ignores the browser\'s own key repeat, so auto-shift stays ours', () => {
    const { window: w, pressed } = harness();
    w.fire('keydown', { code: 'ArrowRight' });
    w.fire('keydown', { code: 'ArrowRight', repeat: true });
    assert.deepEqual(pressed, ['right']);
  });

  it('drops every held key when the window loses focus', () => {
    const { window: w, released } = harness();
    w.fire('keydown', { code: 'ArrowLeft' });
    w.fire('keydown', { code: 'ArrowDown' });
    w.fire('blur');
    assert.deepEqual(released.sort(), ['left', 'softDrop']);
  });
});

describe('auto-shift', () => {
  it('repeats a held direction after the delay, then faster', () => {
    const { controller, window: w, pressed } = harness();
    w.fire('keydown', { code: 'ArrowLeft' });
    controller.update(100);
    assert.deepEqual(pressed, ['left'], 'no repeat before the delay');
    controller.update(100);
    assert.deepEqual(pressed, ['left', 'left:repeat']);
    controller.update(45);
    assert.deepEqual(pressed, ['left', 'left:repeat', 'left:repeat']);
  });

  it('does not auto-shift rotation or drops', () => {
    const { controller, window: w, pressed } = harness();
    w.fire('keydown', { code: 'KeyZ' });
    w.fire('keydown', { code: 'Space' });
    controller.update(1000);
    assert.deepEqual(pressed, ['rotateCCW', 'hardDrop']);
  });
});

describe('gamepad', () => {
  const BINDINGS = [
    [14, 'left'],
    [15, 'right'],
    [13, 'softDrop'],
    [0, 'rotateCW'],
    [1, 'rotateCCW'],
    [12, 'hardDrop'],
    [3, 'hardDrop'],
    [9, 'pause'],
    [2, 'mute'],
    [8, 'restart'],
  ];

  for (const [button, action] of BINDINGS) {
    it(`button ${button} presses ${action}`, () => {
      const pad = fakePad();
      const { controller, pressed, released } = harness([pad]);
      pad.hold(button);
      controller.update(16);
      assert.deepEqual(pressed, [action]);
      pad.releaseAll();
      controller.update(16);
      assert.deepEqual(released, [action]);
    });
  }

  it('fires once while a button stays down', () => {
    const pad = fakePad().hold(0);
    const { controller, pressed } = harness([pad]);
    controller.update(16);
    controller.update(16);
    controller.update(16);
    assert.deepEqual(pressed, ['rotateCW']);
  });

  it('reads the left stick past the dead zone', () => {
    const pad = fakePad();
    const { controller, pressed } = harness([pad]);
    pad.axes[0] = 0.4;
    controller.update(16);
    assert.deepEqual(pressed, [], 'inside the dead zone');
    pad.axes[0] = 0.9;
    controller.update(16);
    pad.axes[0] = 0;
    pad.axes[1] = 0.9;
    controller.update(16);
    assert.deepEqual(pressed, ['right', 'softDrop']);
  });

  it('a held stick direction auto-shifts like a held key', () => {
    const pad = fakePad();
    const { controller, pressed } = harness([pad]);
    pad.axes[0] = -1;
    controller.update(16);
    controller.update(200);
    assert.deepEqual(pressed, ['left', 'left:repeat']);
  });

  it('copes with empty slots and a missing Gamepad API', () => {
    const pad = fakePad().hold(15);
    const { controller, pressed } = harness([null, pad, null]);
    controller.update(16);
    assert.deepEqual(pressed, ['right']);

    const bare = new InputController({ onPress: () => {}, onRelease: () => {} });
    bare.attach({ navigator: {}, addEventListener() {}, removeEventListener() {} });
    assert.doesNotThrow(() => bare.update(16));
  });

  it('tracks two pads independently', () => {
    const one = fakePad();
    const two = { ...fakePad(), index: 1 };
    two.buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
    const { controller, pressed, released } = harness([one, two]);
    one.hold(14);
    two.buttons[15] = { pressed: true, value: 1 };
    controller.update(16);
    assert.deepEqual(pressed.sort(), ['left', 'right']);
    one.releaseAll();
    controller.update(16);
    assert.deepEqual(released, ['left']);
  });
});

describe('detach', () => {
  it('stops listening and releases what was held', () => {
    const { controller, window: w, pressed, released } = harness();
    w.fire('keydown', { code: 'ArrowLeft' });
    controller.detach();
    assert.deepEqual(released, ['left']);
    w.fire('keydown', { code: 'ArrowRight' });
    assert.deepEqual(pressed, ['left'], 'no further presses after detach');
  });
});

describe('KEY_MAP', () => {
  it('offers both arrows and WASD for every movement action', () => {
    for (const [arrow, wasd] of [
      ['ArrowLeft', 'KeyA'],
      ['ArrowRight', 'KeyD'],
      ['ArrowDown', 'KeyS'],
      ['ArrowUp', 'KeyW'],
    ]) {
      assert.equal(KEY_MAP[arrow], KEY_MAP[wasd], `${arrow} and ${wasd} should agree`);
    }
  });
});
