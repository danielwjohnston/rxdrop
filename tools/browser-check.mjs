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

// Gamepad polling and the phase timers live in requestAnimationFrame, which
// Chromium throttles in pages it considers backgrounded. These flags keep every
// page running at full speed so the checks measure the game, not the harness.
const browser = await chromium.launch({
  args: [
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
  ],
});
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
    assert.equal((await page.textContent('[data-speed].is-selected')).trim(), 'Med');
    assert.equal((await page.textContent('[data-mode].is-selected')).trim(), 'Solo');
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
      const floor = g.board.height - 1;
      g.board.set(0, floor, { color: 2, type: 'virus', link: null });
      g.board.set(1, floor, { color: 2, type: 'virus', link: null });
      g.board.set(2, floor, { color: 2, type: 'pill', link: null });
      g.board.set(7, floor, { color: 0, type: 'virus', link: null });
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
      const floor = g.board.height - 1;
      g.board.set(0, floor, { color: 1, type: 'virus', link: null });
      g.board.set(1, floor, { color: 1, type: 'pill', link: null });
      g.board.set(2, floor, { color: 1, type: 'pill', link: null });
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

  await check('a bottle full to the lip deals into the neck, not a game over', async () => {
    const state = await page.evaluate(() => {
      const g = window.rxdrop.game;
      const { NECK_ROWS } = window.rxdrop.constants;
      // Solid from the lip to the floor under the spawn columns: the bottle is
      // as full as it gets without anything having backed up into the neck.
      for (let y = NECK_ROWS; y < g.board.height; y += 1) {
        // Alternating colours so the fill is a wall, not a pending clear.
        for (const x of [3, 4]) g.board.set(x, y, { color: (x + y) % 3, type: 'pill', link: null });
      }
      g.spawnPill();
      return {
        phase: g.phase,
        rows: window.rxdrop.pillCells(g.pill).map((c) => c.y),
        neckRows: NECK_ROWS,
      };
    });
    assert.equal(state.phase, 'falling', 'a full bottle body is not a loss');
    assert.deepEqual(state.rows, [0, 0], 'the capsule waits in the neck');
    await page.waitForTimeout(150);
    // And it can still be steered out of the full columns.
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(400);
    await page.keyboard.up('ArrowLeft');
    const after = await snapshot(page);
    assert.ok(after.x < 3, `expected the capsule to slide left, at column ${after.x}`);
    assert.notEqual(after.phase, 'lost');
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

  await page.close();

  // The apothecary layer: the era has to follow the level, and the physician
  // has to actually paint - an empty canvas would look identical to a missing
  // one at a glance.
  const eraPage = await browser.newPage({ viewport: { width: 1024, height: 820 } });
  eraPage.on('pageerror', (error) => errors.push(`era pageerror: ${error.message}`));
  await eraPage.bringToFront();
  await eraPage.goto(`${BASE}/?level=16&speed=LOW&seed=7`, { waitUntil: 'networkidle' });
  await eraPage.click('[data-start]');
  await eraPage.waitForTimeout(400);

  await check('the era follows the level, vessel, palette and physician', async () => {
    const state = await eraPage.evaluate(() => {
      const canvas = document.getElementById('doctor');
      const ctx = canvas.getContext('2d');
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let painted = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] > 8) painted += 1;
      return {
        name: document.getElementById('era-name').textContent.trim(),
        period: document.getElementById('era-period').textContent.trim(),
        accent: getComputedStyle(document.body).getPropertyValue('--era-accent').trim(),
        eraAttr: document.body.dataset.era,
        painted,
        pixels: data.length / 4,
      };
    });
    assert.equal(state.name, 'Gene Therapy');
    assert.equal(state.eraAttr, 'genetic');
    assert.ok(state.period.length > 0, 'the era should show its period');
    assert.notEqual(state.accent, '', 'the era accent should be set on the body');
    assert.ok(
      state.painted > state.pixels * 0.05,
      `the physician barely painted: ${state.painted} of ${state.pixels} pixels`,
    );
  });

  await check('a new era announces itself with a physician\'s note', async () => {
    const note = await eraPage.evaluate(() => {
      const g = window.rxdrop.game;
      // Finish level 19 so the clear card carries the level-20 era check; the
      // note only shows on a level that crosses into a new era.
      g.board.forEachCell((c, x, y) => {
        if (c.type === 'virus') g.board.set(x, y, null);
      });
      g.level = 3;
      g.emit('levelComplete', { level: 3 });
      return null;
    });
    void note;
    await eraPage.waitForTimeout(200);
    const shown = await eraPage.evaluate(() => ({
      hidden: document.getElementById('clear-note').hidden,
      era: document.getElementById('note-era').textContent,
      text: document.getElementById('note-text').textContent,
      place: document.getElementById('note-place').textContent,
    }));
    assert.equal(shown.hidden, false, 'crossing into level 4 should show the note');
    assert.match(shown.era, /Apothecary/);
    assert.ok(shown.text.length > 40);
    assert.ok(shown.place.length > 0);
  });

  await eraPage.close();

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 780 },
    isMobile: true,
    hasTouch: true,
  });
  await mobile.bringToFront();
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

  await check('the bottle gets the lion\'s share of a phone screen', async () => {
    // The regression this pins: a tall HUD panel squeezed the bottle to a third
    // of the screen and the game became unplayable on a phone without anything
    // failing. The bottle is what you look at, so it gets the floor.
    const share = await mobile.evaluate(() => {
      const h = (sel) => {
        const el = document.querySelector(sel);
        return el ? el.getBoundingClientRect().height : 0;
      };
      const view = window.innerHeight;
      return {
        view,
        board: h('#board') / view,
        panels: (h('.panel--left') + h('.panel--right')) / view,
        doctor: h('#doctor'),
      };
    });
    assert.ok(
      share.board >= 0.5,
      `the bottle got ${(share.board * 100).toFixed(0)}% of the screen, wanted 50% or more`,
    );
    assert.ok(
      share.panels <= 0.25,
      `the panels took ${(share.panels * 100).toFixed(0)}% of the screen, wanted 25% or less`,
    );
    // The physician stays, but as a chip - a portrait is what caused the squeeze.
    assert.ok(
      share.doctor > 0 && share.doctor <= 56,
      `the physician is ${share.doctor}px tall on a phone; wanted a chip, not a portrait`,
    );
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

  await check('a gamepad drives the game', async () => {
    const pad = await browser.newPage({ viewport: { width: 900, height: 800 } });
    await pad.bringToFront();
    const padErrors = [];
    pad.on('pageerror', (error) => padErrors.push(error.message));
    // A synthetic standard-layout pad the checks can drive.
    await pad.addInitScript(() => {
      const gamepad = {
        index: 0,
        id: 'Synthetic Standard Pad',
        mapping: 'standard',
        connected: true,
        axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
      };
      window.__pad = gamepad;
      navigator.getGamepads = () => [gamepad, null, null, null];
    });
    const holdFrames = (page_, body) =>
      page_.evaluate(async (args) => {
        const waitFrames = (n) =>
          new Promise((resolve) => {
            let seen = 0;
            const step = () => (++seen >= n ? resolve() : requestAnimationFrame(step));
            requestAnimationFrame(step);
          });
        const { index, frames } = args;
        if (index !== undefined) window.__pad.buttons[index] = { pressed: true, value: 1 };
        if (args.axis !== undefined) window.__pad.axes[args.axis] = args.value;
        await waitFrames(frames);
        if (index !== undefined) window.__pad.buttons[index] = { pressed: false, value: 0 };
        if (args.axis !== undefined) window.__pad.axes[args.axis] = 0;
        await waitFrames(3);
      }, body);

    const tap = (index, frames = 5) => holdFrames(pad, { index, frames });

    await pad.goto(`${BASE}/?level=2&speed=LOW&seed=4242`, { waitUntil: 'networkidle' });
    await pad.click('[data-start]');
    await pad.waitForTimeout(250);

    const start = await pad.evaluate(() => ({
      x: window.rxdrop.game.pill.x,
      orientation: window.rxdrop.game.pill.orientation,
    }));
    await tap(14); // d-pad left
    const afterLeft = await pad.evaluate(() => window.rxdrop.game.pill.x);
    assert.ok(afterLeft < start.x, `d-pad left did not move it: ${start.x} -> ${afterLeft}`);
    await tap(0); // A rotates
    const afterRotate = await pad.evaluate(() => window.rxdrop.game.pill.orientation);
    assert.notEqual(afterRotate, start.orientation, `A did not rotate (${afterRotate})`);

    // Left stick held right auto-shifts more than one column. Park the capsule
    // at the left wall first so there is always room to travel.
    const beforeShift = await pad.evaluate(() => {
      window.rxdrop.game.pill.x = 0;
      return window.rxdrop.game.pill.x;
    });
    // Long enough for the auto-shift delay plus several repeats.
    await holdFrames(pad, { axis: 0, value: 1, frames: 45 });
    const afterShift = await pad.evaluate(() => window.rxdrop.game.pill.x);
    assert.ok(
      afterShift >= beforeShift + 2,
      `the stick should auto-shift (${beforeShift} -> ${afterShift})`,
    );

    const beforeDrop = await pad.evaluate(() => window.rxdrop.game.pillsPlaced);
    await tap(3); // Y hard drops
    assert.equal(await pad.evaluate(() => window.rxdrop.game.pillsPlaced), beforeDrop + 1);

    await tap(2); // X mutes, and again to unmute
    assert.equal(await pad.evaluate(() => window.rxdrop.audio.muted), true);
    await tap(2);
    assert.equal(await pad.evaluate(() => window.rxdrop.audio.muted), false);

    await tap(8); // Back/Select restarts the level
    await pad.waitForTimeout(200);
    assert.equal(await pad.evaluate(() => window.rxdrop.game.pillsPlaced), 0);
    assert.equal(await pad.evaluate(() => window.rxdrop.screen), 'playing');

    await tap(9, 8); // Start pauses, and again to resume
    assert.equal(await pad.isVisible('#screen-pause'), true);
    await tap(9, 8);
    assert.equal(await pad.evaluate(() => window.rxdrop.screen), 'playing');

    assert.deepEqual(padErrors, []);
    await pad.close();
  });

  await mobile.close();

  await check('music can be turned off from the title screen', async () => {
    const music = await browser.newPage({ viewport: { width: 1000, height: 900 } });
    await music.bringToFront();
    const musicErrors = [];
    music.on('pageerror', (error) => musicErrors.push(error.message));
    await music.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await music.waitForTimeout(200);

    assert.equal(await music.isVisible('label[for="music"]'), true, 'the toggle is on the title card');
    assert.equal(await music.isChecked('#music'), true, 'music is on by default');

    await music.click('label[for="music"]');
    await music.waitForTimeout(150);
    assert.equal(await music.evaluate(() => window.rxdrop.audio.musicEnabled), false);

    await music.click('[data-start]');
    await music.waitForTimeout(400);
    assert.equal(
      await music.evaluate(() => window.rxdrop.audio.playing),
      false,
      'no music should start with the toggle off',
    );
    // Effects and play carry on regardless.
    await music.keyboard.press('Space');
    await music.waitForTimeout(200);
    assert.ok(await music.evaluate(() => window.rxdrop.game.pillsPlaced >= 1));

    // And the choice survives a reload.
    await music.reload({ waitUntil: 'networkidle' });
    await music.waitForTimeout(250);
    assert.equal(await music.isChecked('#music'), false, 'the setting should persist');
    await music.click('label[for="music"]');
    await music.click('[data-start]');
    await music.waitForTimeout(500);
    assert.equal(await music.evaluate(() => window.rxdrop.audio.playing), true);

    assert.deepEqual(musicErrors, []);
    await music.close();
  });

  await check('rotating never walks the capsule into another column', async () => {
    const spin = await browser.newPage({ viewport: { width: 900, height: 800 } });
    await spin.bringToFront();
    await spin.goto(`${BASE}/?level=0&speed=LOW&seed=42`, { waitUntil: 'networkidle' });
    await spin.click('[data-start]');
    await spin.waitForTimeout(250);

    const spans = [];
    for (let i = 0; i < 8; i += 1) {
      spans.push(
        await spin.evaluate(() => {
          const { pillCells } = window.rxdrop;
          const cells = pillCells(window.rxdrop.game.pill);
          return [...new Set(cells.map((c) => c.x))].sort((a, b) => a - b);
        }),
      );
      await spin.keyboard.press('KeyX');
      await spin.waitForTimeout(80);
    }
    const columns = new Set(spans.flat());
    assert.equal(
      columns.size,
      2,
      `rotating drifted across columns ${[...columns].join(', ')}: ${JSON.stringify(spans)}`,
    );
    await spin.close();
  });

  await check('resistance mode mutates the board and recovers', async () => {
    const solo = await browser.newPage({ viewport: { width: 1000, height: 840 } });
    await solo.bringToFront();
    const soloErrors = [];
    solo.on('pageerror', (error) => soloErrors.push(error.message));
    await solo.goto(`${BASE}/?level=2&seed=99&resistance=1`, { waitUntil: 'networkidle' });
    await solo.click('[data-mode="solo"]');
    await solo.click('[data-start]');
    await solo.waitForTimeout(300);

    assert.equal(await solo.evaluate(() => window.rxdrop.game.resistance), true);
    assert.equal(await solo.isVisible('#resistance-meter'), true);

    // Ripen every virus and let the next resolution fire the mutation.
    await solo.evaluate(() => {
      const g = window.rxdrop.game;
      g.pillsPlaced = 8;
      g.resistanceTickedAt = null;
      g.board.forEachCell((c) => {
        if (c.type === 'virus') c.resistance = window.rxdrop.constants.RESISTANCE_MAX - 1;
      });
      g.finishResolution();
    });
    assert.equal(await solo.evaluate(() => window.rxdrop.game.phase), 'mutating');
    await solo.waitForTimeout(700);
    assert.equal(await solo.evaluate(() => window.rxdrop.game.phase), 'falling');
    assert.equal(
      await solo.evaluate(() => window.rxdrop.game.board.findMatches().size),
      0,
      'a mutation must not leave a free clear',
    );
    assert.deepEqual(soloErrors, []);
    await solo.close();
  });

  await check('the daily is fixed by the date and reports a result', async () => {
    const day = await browser.newPage({ viewport: { width: 1000, height: 840 } });
    await day.bringToFront();
    await day.goto(`${BASE}/?daily=2026-09-09`, { waitUntil: 'networkidle' });
    await day.waitForTimeout(200);
    assert.equal(await day.evaluate(() => window.rxdrop.mode), 'daily');
    assert.equal(await day.isVisible('#daily-note'), true);
    assert.equal(
      await day.evaluate(() => document.getElementById('tunables').hidden),
      true,
      'the daily sets its own level and speed',
    );

    await day.click('[data-start]');
    await day.waitForTimeout(300);
    const setup = await day.evaluate(() => ({
      level: window.rxdrop.game.level,
      seed: window.rxdrop.game.seed,
    }));

    // End the run and check the result card and share line.
    await day.evaluate(() => {
      const g = window.rxdrop.game;
      g.board.set(3, 0, { color: 0, type: 'pill', link: null });
      g.spawnPill();
    });
    await day.waitForTimeout(400);
    assert.equal(await day.isVisible('#screen-daily'), true);
    const share = await day.textContent('#daily-share');
    assert.match(share, /RxDrop Daily 2026-09-09/);
    assert.ok(!share.includes(String(setup.seed)), 'the share line must not leak the seed');

    // The same day reopened is the same puzzle.
    await day.goto(`${BASE}/?daily=2026-09-09`, { waitUntil: 'networkidle' });
    await day.click('[data-start]');
    await day.waitForTimeout(300);
    assert.deepEqual(
      await day.evaluate(() => ({
        level: window.rxdrop.game.level,
        seed: window.rxdrop.game.seed,
      })),
      setup,
    );
    await day.close();
  });

  await check('versus runs two bottles on one keyboard', async () => {
    const vs = await browser.newPage({ viewport: { width: 1000, height: 840 } });
    await vs.bringToFront();
    const vsErrors = [];
    vs.on('pageerror', (error) => vsErrors.push(error.message));
    await vs.goto(`${BASE}/?mode=versus`, { waitUntil: 'networkidle' });
    await vs.click('[data-start]');
    await vs.waitForTimeout(400);

    assert.equal(await vs.evaluate(() => window.rxdrop.match.players.length), 2);
    assert.equal(await vs.isVisible('#playfield-2'), true);
    assert.equal(
      await vs.evaluate(
        () =>
          window.rxdrop.match.players[0].board.toStrings().join('') ===
          window.rxdrop.match.players[1].board.toStrings().join(''),
      ),
      true,
      'both players get the same bottle',
    );

    // Both canvases must come out the same size, or one player is at a disadvantage.
    const sizes = await vs.evaluate(() =>
      ['board', 'board-2'].map((id) => {
        const { width, height } = document.getElementById(id).getBoundingClientRect();
        return { width: Math.round(width), height: Math.round(height) };
      }),
    );
    assert.deepEqual(sizes[0], sizes[1], `bottles differ in size: ${JSON.stringify(sizes)}`);

    const before = await vs.evaluate(() => window.rxdrop.match.players.map((p) => p.pill.x));
    await vs.keyboard.press('KeyA');
    await vs.keyboard.press('ArrowRight');
    await vs.waitForTimeout(120);
    const after = await vs.evaluate(() => window.rxdrop.match.players.map((p) => p.pill.x));
    assert.equal(after[0], before[0] - 1, 'A moves player one');
    assert.equal(after[1], before[1] + 1, 'the arrows move player two');

    await vs.keyboard.press('KeyE');
    await vs.keyboard.press('Slash');
    await vs.waitForTimeout(300);
    assert.deepEqual(
      await vs.evaluate(() => window.rxdrop.match.players.map((p) => p.pillsPlaced)),
      [1, 1],
      'each player has their own hard drop',
    );

    // Garbage lands on the opponent, and the winner card appears.
    await vs.evaluate(() => {
      window.rxdrop.match.players[0].phase = 'lost';
    });
    await vs.waitForTimeout(300);
    assert.equal(await vs.isVisible('#screen-versus'), true);
    assert.match(await vs.textContent('#versus-title'), /Player 2 wins/);
    assert.deepEqual(vsErrors, []);
    await vs.close();
  });

  await check('it installs and plays with the network off', async () => {
    const context = await browser.newContext({ viewport: { width: 900, height: 820 } });
    const offline = await context.newPage();
    await offline.bringToFront();
    const offlineErrors = [];
    offline.on('pageerror', (error) => offlineErrors.push(error.message));

    await offline.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await offline.evaluate(() => navigator.serviceWorker.ready);
    // Poll until precaching settles: a fixed sleep is load-dependent, and a
    // busy machine turns it into a phantom failure.
    const cached = await offline.evaluate(async () => {
      const countFiles = async () => {
        const names = await caches.keys();
        if (names.length === 0) return 0;
        const cache = await caches.open(names[0]);
        return (await cache.keys()).length;
      };
      for (let attempt = 0; attempt < 60; attempt += 1) {
        const files = await countFiles();
        if (files >= 15) return files;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return countFiles();
    });
    assert.ok(cached >= 15, `only ${cached} files were precached`);

    await context.setOffline(true);
    await offline.reload({ waitUntil: 'domcontentloaded' });
    await offline.waitForTimeout(900);
    assert.equal(await offline.evaluate(() => navigator.onLine), false);
    assert.equal(await offline.evaluate(() => Boolean(window.rxdrop)), true, 'the game booted offline');

    await offline.click('[data-start]');
    await offline.waitForTimeout(250);
    for (let i = 0; i < 3; i += 1) {
      await offline.keyboard.press('ArrowLeft');
      await offline.keyboard.press('Space');
      await offline.waitForTimeout(160);
    }
    assert.ok(
      (await offline.evaluate(() => window.rxdrop.game.pillsPlaced)) >= 3,
      'it should be playable with no network',
    );
    assert.deepEqual(offlineErrors, []);
    await context.close();
  });

  await check('it still plays without Web Audio or localStorage', async () => {
    const limited = await browser.newPage({ viewport: { width: 900, height: 800 } });
    await limited.bringToFront();
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
    phase: window.rxdrop.game?.phase ?? null,
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
