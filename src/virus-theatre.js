import { parentsOf } from './board.js';

const TILE = 96;
const SHEET_URL = new URL('../assets/virus-mascots.svg', import.meta.url).href;
const FRAME = Object.freeze({ idle: 0, taunt: 1, hurt: 2, panic: 3, smug: 1, mutate: 3, celebrate: 4, stunned: 2 });
const HOLD = Object.freeze({ hurt: 720, panic: 900, mutate: 900, smug: 850, celebrate: 1500, stunned: 1300, taunt: 1100 });
let sheet = null;
let failed = false;

function spriteSheet() {
  if (failed || typeof Image === 'undefined') return null;
  if (sheet) return sheet;
  sheet = new Image();
  sheet.decoding = 'async';
  sheet.onerror = () => { failed = true; };
  sheet.src = SHEET_URL;
  return sheet;
}

function readyImage() {
  const image = spriteSheet();
  return image?.complete && image.naturalWidth > 0 ? image : null;
}

export class VirusTheatre {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas?.getContext?.('2d') ?? null;
    this.states = Array.from({ length: 3 }, () => ({ pose: 'idle', until: 0 }));
    this.tauntIndex = 0;
    this.nextTaunt = 0;
  }

  setPose(color, pose, now = performance.now(), hold = HOLD[pose] ?? 700) {
    if (color < 0 || color > 2) return;
    this.states[color] = { pose, until: now + hold };
  }

  setAll(pose, now = performance.now(), hold = HOLD[pose] ?? 700) {
    for (let color = 0; color < 3; color += 1) this.setPose(color, pose, now, hold);
  }

  react(type, detail = {}, now = performance.now()) {
    switch (type) {
      case 'clear': {
        const hit = new Set();
        for (const color of detail.virusColors ?? []) {
          if (color < 3) hit.add(color);
          else for (const parent of parentsOf(color)) hit.add(parent);
        }
        if (hit.size === 0 && detail.viruses > 0) this.setAll('hurt', now, 520);
        else for (const color of hit) this.setPose(color, 'hurt', now);
        break;
      }
      case 'antibody':
      case 'phototherapy':
      case 'phototherapyEnter':
        this.setAll('panic', now, type === 'phototherapy' ? 720 : 900);
        break;
      case 'resist':
        this.setAll('smug', now, 760);
        break;
      case 'mutate':
        this.setAll('mutate', now);
        break;
      case 'spread':
        this.setAll('celebrate', now, 900);
        break;
      case 'sonicPulse':
        this.setAll('stunned', now, 1000);
        break;
      case 'sealed':
        this.setAll('celebrate', now, 650);
        break;
      case 'unsealed':
        this.setAll('hurt', now, 500);
        break;
      case 'gameOver':
        this.setAll('celebrate', now, 2400);
        break;
      case 'levelComplete':
        this.setAll('stunned', now, 1800);
        break;
      default:
        break;
    }
  }

  draw(counts, now, era) {
    if (!this.ctx || !this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;

    if (!reduced && now >= this.nextTaunt && this.states.every((state) => now >= state.until)) {
      this.setPose(this.tauntIndex % 3, 'taunt', now, 1200);
      this.tauntIndex += 1;
      this.nextTaunt = now + 3400 + (this.tauntIndex % 3) * 650;
    }

    const ctx = this.ctx;
    const image = readyImage();
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const stage = ctx.createLinearGradient(0, 0, 0, rect.height);
    stage.addColorStop(0, 'rgba(255,255,255,.035)');
    stage.addColorStop(0.7, 'rgba(0,0,0,.05)');
    stage.addColorStop(1, 'rgba(0,0,0,.24)');
    ctx.fillStyle = stage;
    roundRect(ctx, 0.5, 0.5, rect.width - 1, rect.height - 1, 12);
    ctx.fill();

    const slot = rect.width / 3;
    const size = Math.min(slot * 0.94, rect.height * 0.78);
    const y = Math.max(0, rect.height * 0.02);
    for (let color = 0; color < 3; color += 1) {
      const state = this.states[color];
      if (now >= state.until && state.pose !== 'idle') state.pose = 'idle';
      const count = counts?.[color] ?? 0;
      const pose = count === 0 ? 'stunned' : state.pose;
      const frame = FRAME[pose] ?? 0;
      const x = color * slot + (slot - size) / 2;
      const bob = !reduced && pose === 'celebrate' ? Math.sin(now / 80 + color) * size * 0.06 : 0;
      const shake = !reduced && (pose === 'hurt' || pose === 'panic') ? Math.sin(now / 32 + color) * size * 0.025 : 0;

      ctx.save();
      ctx.globalAlpha = count === 0 ? 0.38 : 1;
      if (image) {
        ctx.drawImage(image, frame * TILE, color * TILE, TILE, TILE, x + shake, y + bob, size, size);
      } else {
        drawFallback(ctx, x + shake, y + bob, size, color, pose, era?.accent);
      }
      ctx.restore();

      ctx.fillStyle = count === 0 ? 'rgba(210,220,235,.42)' : '#f2f7ff';
      ctx.font = `700 ${Math.max(9, Math.round(size * 0.18))}px ui-monospace, 'SFMono-Regular', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(String(count), color * slot + slot / 2, rect.height - 2);
    }

    const hybrids = (counts ?? []).slice(3).reduce((sum, value) => sum + value, 0);
    if (hybrids > 0) {
      const label = `HYBRID ${hybrids}`;
      ctx.font = `700 ${Math.max(8, Math.round(rect.height * 0.11))}px ui-monospace, monospace`;
      const labelWidth = ctx.measureText(label).width + 12;
      ctx.fillStyle = 'rgba(4,8,18,.82)';
      roundRect(ctx, (rect.width - labelWidth) / 2, 2, labelWidth, 16, 8);
      ctx.fill();
      ctx.fillStyle = era?.accent ?? '#fff';
      ctx.textBaseline = 'top';
      ctx.fillText(label, rect.width / 2, 4);
    }
    ctx.restore();
  }
}

function drawFallback(ctx, x, y, size, color, pose, accent) {
  const fills = ['#d63842', '#e6b82a', '#278bc4'];
  const darks = ['#571018', '#71550b', '#0a4a78'];
  const cx = x + size / 2;
  const cy = y + size / 2;
  ctx.save();
  if (pose === 'hurt' || pose === 'stunned') {
    ctx.translate(0, size * 0.08);
    ctx.scale(1, 0.8);
  }
  ctx.fillStyle = fills[color];
  ctx.strokeStyle = darks[color];
  ctx.lineWidth = Math.max(2, size * 0.05);
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  for (const dx of [-0.11, 0.11]) {
    ctx.beginPath();
    ctx.arc(cx + size * dx, cy - size * 0.05, size * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#111522';
  ctx.beginPath();
  ctx.arc(cx - size * 0.095, cy - size * 0.04, size * 0.03, 0, Math.PI * 2);
  ctx.arc(cx + size * 0.095, cy - size * 0.04, size * 0.03, 0, Math.PI * 2);
  ctx.fill();
  if (pose === 'panic' || pose === 'mutate') {
    ctx.strokeStyle = accent ?? '#fff4b0';
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.41, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}
