import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const server = spawn('python3', ['-m', 'http.server', '8899'], { cwd: '/home/user/rxdrop', stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 900 } });
await page.goto('http://localhost:8899/?level=6&speed=LOW&seed=17&mods=outbreak,blackout,contaminated,quarantine', { waitUntil: 'networkidle' });
await page.screenshot({ path: '/tmp/claude-0/-home-user-rxdrop/278839c1-db6e-5e93-8bd7-0719abc48d26/scratchpad/title.png' });
await page.click('[data-start]');
await page.waitForTimeout(600);
await page.evaluate(() => {
  const g = window.rxdrop.game;
  const floor = g.board.height - 1;
  // A contaminated half and a spread in progress, so the shot shows them.
  const bad = { color: 1, type: 'pill', link: null, inert: true };
  g.board.set(6, floor, bad);
  g.board.set(7, floor, { color: 0, type: 'pill', link: null });
  g.board.sealed = 2;
  g.spreading = [{ from: { x: 4, y: floor - 3 }, x: 5, y: floor - 3, color: 2 }];
  g.phaseTimer = 200;
});
await page.waitForTimeout(120);
await page.screenshot({ path: '/tmp/claude-0/-home-user-rxdrop/278839c1-db6e-5e93-8bd7-0719abc48d26/scratchpad/lit.png' });
await page.evaluate(() => { const g = window.rxdrop.game; g.blackoutFor = 5000; g.light = 0.12; });
await page.waitForTimeout(200);
await page.screenshot({ path: '/tmp/claude-0/-home-user-rxdrop/278839c1-db6e-5e93-8bd7-0719abc48d26/scratchpad/dark.png' });
await browser.close();
server.kill();
