/**
 * End-to-end smoke test: boots the static server, drives the real page in
 * Chromium and asserts the whole loop works - title, controls, clearing,
 * level complete, game over and the mobile layout.
 *
 * Playwright is not a dependency of the game, so install it first:
 *   npm i --no-save playwright && npx playwright install chromium
 *   node tools/browser-check.mjs
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT ?? 8123);
const BASE = `http://localhost:${PORT}`;

const chromium = await loadChromium();
if (!chromium) {
  console.error(
    'Playwright is not installed. Run:\n' +
      '  npm i --no-save playwright && npx playwright install chromium',
  );
  process.exit(2);
}

/** Resolves Playwright from the project, or from a global install. */
async function loadChromium() {
  const globalRoots = [process.env.NODE_PATH, '/usr/lib/node_modules', '/opt/node22/lib/node_modules']
    .filter(Boolean);
  const candidates = ['playwright'];
  for (const root of globalRoots) {
    try {
      candidates.push(pathToFileURL(require.resolve('playwright', { paths: [root] })).href);
    } catch {
      /* not installed there */
    }
  }
  for (const specifier of candidates) {
    try {
      const module = await import(specifier);
      const browserType = module.chromium ?? module.default?.chromium;
      if (browserType) return browserType;
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}

const server = spawn(process.execPath, [resolve(ROOT, 'tools/serve.js'), String(PORT), ROOT], {
  stdio: 'ignore',
});
process.on('exit', () => server.kill());

await waitForServer();

const browser = await chromium.launch();
const checks = [];
const errors = [];

try {
  const page = await browser.newPage({ viewport: { width: 1024, height: 820 } });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });

  await page.goto(`${BASE}/?level=0&speed=LOW&seed=1234`, { waitUntil: 'networkidle' });
  await check('the title screen is shown', async () => {
    assert.equal(await page.isVisible('#screen-title'), true);
    assert.equal(await page.evaluate(() => window.rxdrop.screen), 'title');
  });

  await check('level and speed can be chosen', async () => {
    await page.click('[data-adjust="level"][data-delta="1"]');
    await page.click('[data-speed="MEDIUM"]');
    assert.equal((await page.textContent('#choose-level')).trim(), '1');
    assert.equal((await page.textContent('.segmented button.is-selected')).trim(), 'Med');
  });

  await check('starting deals a pill and the level\'s viruses', async () => {
    await page.click('[data-start]');
    await page.waitForTimeout(250);
    const state = await snapshot(page);
    assert.equal(state.screen, 'playing');
    assert.equal(state.level, 1);
    assert.equal(state.speed, 'MEDIUM');
    assert.equal(state.viruses, 8);
    assert.equal(state.hudViruses, '8');
    assert.ok(state.x !== null);
  });

  await check('the keyboard moves and rotates the pill', async () => {
    const before = await snapshot(page);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('KeyZ');
    const after = await snapshot(page);
    assert.equal(after.x, before.x - 1);
    assert.notEqual(after.orientation, before.orientation);
  });

  await check('holding a direction auto-shifts', async () => {
    const before = await snapshot(page);
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(500);
    await page.keyboard.up('ArrowRight');
    const after = await snapshot(page);
    assert.ok(after.x > before.x + 1, `expected auto-shift, moved ${before.x} -> ${after.x}`);
  });

  await check('pause stops the game and Enter resumes it', async () => {
    await page.keyboard.press('KeyP');
    await page.waitForTimeout(150);
    assert.equal(await page.isVisible('#screen-pause'), true);
    assert.equal((await snapshot(page)).paused, true);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    assert.equal((await snapshot(page)).paused, false);
    assert.equal(await page.isVisible('#screen-pause'), false);
  });

  await check('a run of four clears and scores', async () => {
    await page.evaluate(() => {
      const g = window.rxdrop.game;
      for (let y = 0; y < g.board.height; y += 1)
        for (let x = 0; x < g.board.width; x += 1) g.board.set(x, y, null);
      g.board.set(0, 15, { color: 2, type: 'virus', link: null });
      g.board.set(1, 15, { color: 2, type: 'virus', link: null });
      g.board.set(2, 15, { color: 2, type: 'pill', link: null });
      g.board.set(7, 15, { color: 0, type: 'virus', link: null });
      g.startingViruses = 3;
      g.score = 0;
      g.pill = { x: 3, y: 0, orientation: 0, colors: [2, 2] };
      g.hardDrop();
    });
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => window.rxdrop.game.phase), 'clearing');
    await page.waitForTimeout(700);
    const state = await snapshot(page);
    assert.equal(state.viruses, 1);
    assert.ok(state.score > 0, 'clearing viruses should score');
    assert.equal(state.hudScore, state.score.toLocaleString());
  });

  await check('clearing the last virus completes the level', async () => {
    await page.evaluate(() => {
      const g = window.rxdrop.game;
      for (let y = 0; y < g.board.height; y += 1)
        for (let x = 0; x < g.board.width; x += 1) g.board.set(x, y, null);
      g.board.set(0, 15, { color: 1, type: 'virus', link: null });
      g.board.set(1, 15, { color: 1, type: 'pill', link: null });
      g.board.set(2, 15, { color: 1, type: 'pill', link: null });
      g.pill = { x: 3, y: 0, orientation: 0, colors: [1, 1] };
      g.hardDrop();
    });
    await page.waitForTimeout(800);
    assert.equal(await page.isVisible('#screen-clear'), true);
    assert.equal((await page.textContent('#clear-level')).trim(), '1');
    await page.click('[data-next-level]');
    await page.waitForTimeout(250);
    const state = await snapshot(page);
    assert.equal(state.level, 2);
    assert.equal(state.viruses, 12);
    assert.equal(state.screen, 'playing');
  });

  await check('a blocked spawn ends the game and records a top score', async () => {
    await page.evaluate(() => {
      const g = window.rxdrop.game;
      g.board.set(3, 0, { color: 0, type: 'pill', link: null });
      g.spawnPill();
    });
    await page.waitForTimeout(300);
    assert.equal(await page.isVisible('#screen-over'), true);
    assert.match(await page.textContent('#over-summary'), /viruses cleared on level 2/);
    assert.notEqual((await page.textContent('#top-score')).trim(), '0');
  });

  await check('quitting returns to the title screen', async () => {
    await page.click('[data-retry]');
    await page.waitForTimeout(200);
    await page.keyboard.press('KeyP');
    await page.waitForTimeout(150);
    await page.click('#screen-pause [data-quit]');
    await page.waitForTimeout(200);
    assert.equal(await page.isVisible('#screen-title'), true);
  });

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 780 },
    isMobile: true,
    hasTouch: true,
  });
  mobile.on('pageerror', (error) => errors.push(`mobile pageerror: ${error.message}`));

  await check('a link can set up a specific game', async () => {
    await mobile.goto(`${BASE}/?level=3&speed=HIGH&seed=1234`, { waitUntil: 'networkidle' });
    await mobile.click('[data-start]');
    await mobile.waitForTimeout(300);
    const state = await snapshot(mobile);
    assert.equal(state.level, 3);
    assert.equal(state.speed, 'HIGH');
    assert.equal(state.seed, 1234);
  });

  await check('the touch pad moves the pill and the layout fits the screen', async () => {
    const before = await snapshot(mobile);
    await mobile.tap('[data-action="left"]');
    await mobile.waitForTimeout(120);
    const after = await snapshot(mobile);
    assert.equal(after.x, before.x - 1);
    const layout = await mobile.evaluate(() => ({
      touchpad: getComputedStyle(document.getElementById('touchpad')).display,
      scrollsX: document.documentElement.scrollWidth > window.innerWidth + 2,
      scrollsY: document.documentElement.scrollHeight > window.innerHeight + 2,
    }));
    assert.equal(layout.touchpad, 'grid');
    assert.equal(layout.scrollsX, false, 'the page should not scroll sideways');
    assert.equal(layout.scrollsY, false, 'the game should fit on one screen');
  });

  await check('dragging, tapping and flicking the bottle work', async () => {
    const box = await mobile.locator('#board').boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const { x: startX, cell } = await mobile.evaluate(() => ({
      x: window.rxdrop.game.pill.x,
      cell: window.rxdrop.renderer.layout.cell,
    }));

    await mobile.mouse.move(cx, cy);
    await mobile.mouse.down();
    for (let i = 1; i <= 4; i += 1) await mobile.mouse.move(cx + i * cell * 0.5, cy, { steps: 2 });
    await mobile.mouse.up();
    await mobile.waitForTimeout(120);
    const dragged = await mobile.evaluate(() => window.rxdrop.game.pill.x);
    assert.ok(dragged > startX, `drag should slide the pill right (${startX} -> ${dragged})`);

    const spun = await rotateByTap(mobile, cx, cy);
    assert.notEqual(spun.after, spun.before, 'a tap should rotate the pill');

    const before = await mobile.evaluate(() => window.rxdrop.game.pillsPlaced);
    await mobile.mouse.move(cx, cy - 80);
    await mobile.mouse.down();
    await mobile.mouse.move(cx, cy + 120, { steps: 3 });
    await mobile.mouse.up();
    await mobile.waitForTimeout(250);
    const after = await mobile.evaluate(() => window.rxdrop.game.pillsPlaced);
    assert.equal(after, before + 1, 'a downward flick should hard drop');
  });

  await check('it still plays without Web Audio or localStorage', async () => {
    const limited = await browser.newPage({ viewport: { width: 900, height: 800 } });
    const limitedErrors = [];
    limited.on('pageerror', (error) => limitedErrors.push(error.message));
    limited.on('console', (message) => {
      if (message.type() === 'error') limitedErrors.push(message.text());
    });
    await limited.addInitScript(() => {
      delete window.AudioContext;
      delete window.webkitAudioContext;
      const denied = () => {
        throw new Error('storage denied');
      };
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get: () => ({ getItem: denied, setItem: denied, removeItem: denied }),
      });
    });
    await limited.goto(`${BASE}/?level=1&seed=7`, { waitUntil: 'networkidle' });
    await limited.click('[data-start]');
    await limited.waitForTimeout(250);
    for (let i = 0; i < 3; i += 1) {
      await limited.keyboard.press('ArrowLeft');
      await limited.keyboard.press('KeyX');
      await limited.keyboard.press('Space');
      await limited.waitForTimeout(150);
    }
    await limited.click('#mute');
    const state = await limited.evaluate(() => ({
      screen: window.rxdrop.screen,
      pills: window.rxdrop.game.pillsPlaced,
      audio: window.rxdrop.audio.ctx,
    }));
    assert.equal(state.screen, 'playing');
    assert.ok(state.pills >= 3, 'the game should keep accepting pills');
    assert.equal(state.audio, null);
    assert.deepEqual(limitedErrors, []);
    await limited.close();
  });

  await check('nothing logged an error', () => {
    assert.deepEqual(errors, []);
  });
} finally {
  await browser.close();
  server.kill();
}

const failed = checks.filter((c) => c.error);
for (const { name, error } of checks) {
  console.log(`${error ? 'FAIL' : 'ok  '}  ${name}${error ? `\n      ${error}` : ''}`);
}
console.log(`\n${checks.length - failed.length}/${checks.length} browser checks passed`);
process.exit(failed.length === 0 ? 0 : 1);

async function check(name, fn) {
  try {
    await fn();
    checks.push({ name });
  } catch (error) {
    checks.push({ name, error: error.message.split('\n')[0] });
  }
}

async function rotateByTap(page, x, y) {
  const before = await page.evaluate(() => window.rxdrop.game.pill.orientation);
  await page.mouse.click(x, y);
  await page.waitForTimeout(120);
  const after = await page.evaluate(() => window.rxdrop.game.pill.orientation);
  return { before, after };
}

function snapshot(page) {
  return page.evaluate(() => ({
    screen: window.rxdrop.screen,
    level: window.rxdrop.game?.level ?? null,
    speed: window.rxdrop.game?.speedName ?? null,
    seed: window.rxdrop.game?.seed ?? null,
    viruses: window.rxdrop.game?.virusesLeft ?? null,
    score: window.rxdrop.game?.score ?? null,
    paused: window.rxdrop.game?.paused ?? null,
    x: window.rxdrop.game?.pill?.x ?? null,
    orientation: window.rxdrop.game?.pill?.orientation ?? null,
    hudScore: document.getElementById('score').textContent,
    hudViruses: document.getElementById('viruses').textContent,
  }));
}

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(BASE);
      if (response.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`the static server never came up on ${BASE}`);
}
