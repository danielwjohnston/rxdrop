import { paletteFor } from './eras.js';
import { parentsOf } from './board.js';

const HOLD = Object.freeze({
  hurt: 720,
  panic: 900,
  mutate: 900,
  smug: 850,
  celebrate: 1500,
  stunned: 1300,
});

const PERSONALITIES = Object.freeze([
  { phase: 0.2, brow: -1, grin: 0.25, tilt: -0.05 },
  { phase: 2.1, brow: 0.45, grin: 0.8, tilt: 0.035 },
  { phase: 4.2, brow: -0.2, grin: 0.45, tilt: 0.06 },
]);

/**
 * The little stage beside the bottle.
 *
 * Board viruses are information. These three are characters: they can afford
 * to exaggerate, taunt and get hurt without changing the readable geometry of
 * the playfield. Events drive the strong reactions; idle taunts happen on their
 * own timer so the stage never turns into three static tally icons.
 */
export class VirusTheatre {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas?.getContext?.('2d') ?? null;
    this.states = Array.from({ length: 3 }, () => ({ pose: 'idle', until: 0 }));
    this.tauntIndex = 0;
    this.nextTaunt = 0;
    this.dark = false;
  }

  setPose(color, pose, now = performance.now(), hold = HOLD[pose] ?? 700) {
    if (color < 0 || color > 2) return;
    this.states[color] = { pose, until: now + hold };
  }

  setAll(pose, now = performance.now(), hold = HOLD[pose] ?? 700) {
    for (let color = 0; color < 3; color += 1) this.setPose(color, pose, now, hold);
  }

  /** Translate game events into character acting. */
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
        this.setAll('panic', now);
        break;
      case 'resist':
        this.setAll('smug', now, 720);
        break;
      case 'mutate':
        this.setAll('mutate', now);
        break;
      case 'spread':
        this.setAll('celebrate', now, 900);
        break;
      case 'blackout':
        this.dark = true;
        this.setAll('smug', now, 1000);
        break;
      case 'lightsUp':
        this.dark = false;
        break;
      case 'sealed':
        this.setAll('celebrate', now, 700);
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
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    if (now >= this.nextTaunt && this.states.every((state) => now >= state.until)) {
      this.setPose(this.tauntIndex % 3, 'taunt', now, 1250);
      this.tauntIndex += 1;
      this.nextTaunt = now + 3300 + (this.tauntIndex % 3) * 730;
    }

    const ctx = this.ctx;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const palette = paletteFor(era);
    const stage = ctx.createLinearGradient(0, 0, 0, rect.height);
    stage.addColorStop(0, 'rgba(255,255,255,0.035)');
    stage.addColorStop(0.7, 'rgba(0,0,0,0.06)');
    stage.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = stage;
    roundRect(ctx, 0.5, 0.5, rect.width - 1, rect.height - 1, 12);
    ctx.fill();

    const slot = rect.width / 3;
    const size = Math.min(slot * 0.9, rect.height * 0.72);
    const baseline = rect.height * 0.73;
    for (let color = 0; color < 3; color += 1) {
      const state = this.states[color];
      if (now >= state.until && state.pose !== 'idle') state.pose = 'idle';
      const count = counts?.[color] ?? 0;
      const cx = slot * (color + 0.5);
      drawMascot(ctx, {
        cx,
        cy: baseline - size * 0.42,
        size,
        tone: palette[color],
        style: era?.virus,
        personality: PERSONALITIES[color],
        pose: count === 0 ? 'stunned' : state.pose,
        now,
        color,
        dark: this.dark,
      });

      ctx.font = `700 ${Math.max(9, Math.round(size * 0.18))}px ui-monospace, 'SFMono-Regular', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = count === 0 ? 'rgba(210,220,235,.34)' : palette[color].light;
      ctx.fillText(String(count), cx, rect.height - Math.max(8, size * 0.08));
    }
    ctx.restore();
  }
}

function drawMascot(ctx, { cx, cy, size, tone, style, personality, pose, now, color, dark }) {
  const phase = now / 430 + personality.phase;
  const bob = Math.sin(phase) * size * 0.035;
  const r = size * 0.29;
  let sx = 1;
  let sy = 1;
  let y = cy + bob;
  let rotation = personality.tilt + Math.sin(now / 1300 + color) * 0.025;

  if (pose === 'hurt') {
    sx = 1.22 - Math.sin((now % 260) / 260 * Math.PI) * 0.15;
    sy = 0.72;
    rotation += Math.sin(now / 32) * 0.1;
    y += size * 0.08;
  } else if (pose === 'panic') {
    sx = 0.88 + Math.sin(now / 45) * 0.07;
    sy = 1.12 - Math.sin(now / 45) * 0.07;
    rotation += Math.sin(now / 40) * 0.14;
  } else if (pose === 'mutate') {
    sx = 1 + Math.sin(now / 55) * 0.12;
    sy = 1 - Math.sin(now / 55) * 0.1;
    rotation += Math.sin(now / 30) * 0.08;
  } else if (pose === 'celebrate') {
    y -= Math.abs(Math.sin(now / 130)) * size * 0.14;
    rotation += Math.sin(now / 115) * 0.12;
  } else if (pose === 'taunt') {
    rotation += Math.sin(now / 150) * 0.08;
    y -= Math.abs(Math.sin(now / 230)) * size * 0.04;
  } else if (pose === 'stunned') {
    sx = 1.04;
    sy = 0.9;
    rotation = -0.07;
    y += size * 0.07;
  }

  ctx.save();
  ctx.translate(cx, y);
  ctx.rotate(rotation);
  ctx.scale(sx, sy);

  // Ground shadow makes the mascots feel planted in their little stage.
  ctx.save();
  ctx.scale(1 / sx, 1 / sy);
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath();
  ctx.ellipse(0, r * 1.34, r * 1.05, r * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const arms = Math.max(5, style?.arms ?? 6);
  ctx.fillStyle = tone.dark;
  for (let i = 0; i < arms; i += 1) {
    const a = (Math.PI * 2 * i) / arms + Math.sin(phase) * 0.1;
    const reach = r * (pose === 'panic' ? 1.46 : pose === 'celebrate' ? 1.36 : 1.22);
    const ax = Math.cos(a);
    const ay = Math.sin(a);
    ctx.beginPath();
    if (style?.armShape === 'spike' || pose === 'mutate') {
      ctx.moveTo(ax * reach, ay * reach);
      ctx.lineTo(ax * r * 0.68 - ay * r * 0.26, ay * r * 0.68 + ax * r * 0.26);
      ctx.lineTo(ax * r * 0.68 + ay * r * 0.26, ay * r * 0.68 - ax * r * 0.26);
      ctx.closePath();
    } else {
      ctx.ellipse(ax * reach * 0.78, ay * reach * 0.78, r * 0.32, r * 0.2, a, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  const body = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.12, 0, 0, r * 1.12);
  body.addColorStop(0, tone.light);
  body.addColorStop(0.52, tone.base);
  body.addColorStop(1, tone.dark);
  ctx.fillStyle = body;
  ctx.beginPath();
  if (style?.bodyShape === 'hex') {
    for (let i = 0; i < 6; i += 1) {
      const a = i * Math.PI / 3 - Math.PI / 2;
      const x = Math.cos(a) * r;
      const yy = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.closePath();
  } else if (style?.bodyShape === 'lumpy') {
    for (let i = 0; i <= 16; i += 1) {
      const a = i / 16 * Math.PI * 2;
      const rr = r * (1 + Math.sin(a * 3 + personality.phase) * 0.07);
      const x = Math.cos(a) * rr;
      const yy = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.closePath();
  } else {
    ctx.arc(0, 0, r, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.lineWidth = Math.max(1.5, size * 0.025);
  ctx.stroke();

  // Highlight / era glow.
  ctx.globalAlpha = dark ? 0.22 : 0.42;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(-r * 0.34, -r * 0.38, r * 0.24, r * 0.13, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  drawFace(ctx, { r, pose, personality, now, dark });

  // Tiny hands become expressive only off the board, where silhouette is not
  // carrying game-state information.
  if (pose === 'taunt' || pose === 'smug') {
    ctx.strokeStyle = '#10131c';
    ctx.lineWidth = Math.max(1.5, r * 0.1);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, r * 0.35);
    ctx.quadraticCurveTo(-r * 1.35, r * 0.15, -r * 1.18, -r * 0.3);
    ctx.stroke();
  }

  ctx.restore();
}

function drawFace(ctx, { r, pose, personality, now, dark }) {
  const blink = pose === 'stunned' ? false : Math.sin(now / 820 + personality.phase) > 0.965;
  const eyeY = -r * 0.17;
  const eyeDx = r * 0.34;
  const eyeH = pose === 'hurt' ? r * 0.16 : r * 0.27;

  if (pose === 'stunned') {
    ctx.strokeStyle = '#11131b';
    ctx.lineWidth = r * 0.11;
    for (const dx of [-eyeDx, eyeDx]) {
      ctx.beginPath();
      ctx.moveTo(dx - r * 0.14, eyeY - r * 0.13);
      ctx.lineTo(dx + r * 0.14, eyeY + r * 0.13);
      ctx.moveTo(dx + r * 0.14, eyeY - r * 0.13);
      ctx.lineTo(dx - r * 0.14, eyeY + r * 0.13);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = dark ? '#dff8ff' : '#ffffff';
    if (dark) {
      ctx.shadowColor = '#a7ecff';
      ctx.shadowBlur = r * 0.4;
    }
    for (const dx of [-eyeDx, eyeDx]) {
      ctx.beginPath();
      ctx.ellipse(dx, eyeY, r * 0.22, blink ? r * 0.035 : eyeH, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    if (!blink) {
      ctx.fillStyle = '#10131c';
      const look = pose === 'taunt' ? -r * 0.05 : Math.sin(now / 700) * r * 0.04;
      for (const dx of [-eyeDx, eyeDx]) {
        ctx.beginPath();
        ctx.arc(dx + look, eyeY + r * 0.045, r * 0.105, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.strokeStyle = '#10131c';
  ctx.lineWidth = Math.max(1.5, r * 0.095);
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    const lift = pose === 'panic' ? -r * 0.16 : personality.brow * r * 0.04;
    ctx.beginPath();
    ctx.moveTo(side * (eyeDx + r * 0.2), eyeY - r * 0.36 + lift);
    ctx.lineTo(side * (eyeDx - r * 0.16), eyeY - r * (pose === 'smug' || pose === 'taunt' ? 0.22 : 0.32) - lift);
    ctx.stroke();
  }

  ctx.beginPath();
  if (pose === 'hurt' || pose === 'panic') {
    ctx.ellipse(0, r * 0.42, r * 0.2, pose === 'panic' ? r * 0.22 : r * 0.13, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (pose === 'celebrate' || pose === 'smug' || pose === 'taunt') {
    ctx.arc(0, r * 0.18, r * (0.28 + personality.grin * 0.08), 0.08 * Math.PI, 0.92 * Math.PI);
    ctx.stroke();
  } else if (pose === 'mutate') {
    ctx.moveTo(-r * 0.25, r * 0.34);
    for (let i = 0; i <= 5; i += 1) {
      const x = -r * 0.25 + i * r * 0.1;
      const y = r * (0.34 + (i % 2 ? 0.09 : -0.04));
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  } else if (pose === 'stunned') {
    ctx.moveTo(-r * 0.22, r * 0.42);
    ctx.lineTo(r * 0.22, r * 0.42);
    ctx.stroke();
  } else {
    ctx.arc(0, r * 0.5, r * 0.24, 1.18 * Math.PI, 1.82 * Math.PI);
    ctx.stroke();
  }
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
