import { CLEAR_ANIMATION, LINK, VIRUS } from './constants.js';
import { pillCells } from './pill.js';
import { PHASE } from './game.js';

/** Body, highlight and shadow tones for each colour id. */
export const PALETTE = [
  { base: '#ff4b4b', light: '#ff9d9d', dark: '#96122a', glow: '#ff8080' },
  { base: '#ffd23f', light: '#fff29a', dark: '#a06a00', glow: '#ffe680' },
  { base: '#37b6ff', light: '#a7e4ff', dark: '#0a4f8a', glow: '#7fd4ff' },
];

const NECK_ROWS = 1.6;
const BOTTLE_PAD = 0.35;

/** Draws the bottle, the stack and the pill in play onto a 2D canvas. */
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = 1;
    this.shake = 0;
    this.layout = null;
  }

  /** Matches the backing store to the element's CSS size and the device DPR. */
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.dpr = dpr;
    this.cssWidth = rect.width;
    this.cssHeight = rect.height;
  }

  /** Adds a short screen shake, used when a clear lands. */
  addShake(amount) {
    this.shake = Math.min(12, this.shake + amount);
  }

  computeLayout(board) {
    const pad = 12;
    const usableW = this.cssWidth - pad * 2;
    const usableH = this.cssHeight - pad * 2;
    const cell = Math.floor(
      Math.min(
        usableW / (board.width + BOTTLE_PAD * 2),
        usableH / (board.height + NECK_ROWS + BOTTLE_PAD),
      ),
    );
    const fieldW = cell * board.width;
    const fieldH = cell * board.height;
    const originX = Math.round((this.cssWidth - fieldW) / 2);
    const originY = Math.round(
      (this.cssHeight - fieldH - cell * NECK_ROWS) / 2 + cell * NECK_ROWS,
    );
    return { cell, fieldW, fieldH, originX, originY };
  }

  draw(game, now) {
    const { ctx } = this;
    this.resize();
    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);

    const layout = this.computeLayout(game.board);
    this.layout = layout;

    if (this.shake > 0.1) {
      const angle = now / 18;
      ctx.translate(Math.cos(angle) * this.shake, Math.sin(angle * 1.7) * this.shake * 0.6);
      this.shake *= 0.88;
    } else {
      this.shake = 0;
    }

    this.drawBottle(layout, game);
    this.drawStack(game, layout, now);
    this.drawFallingPill(game, layout);
    this.drawClearing(game, layout);
    ctx.restore();
  }

  drawBottle({ cell, fieldW, fieldH, originX, originY }, game) {
    const { ctx } = this;
    const shape = bottleShape({ cell, fieldW, fieldH, originX, originY });

    tracePath(ctx, shape);
    const glass = ctx.createLinearGradient(shape.left, shape.top, shape.right, shape.bottom);
    glass.addColorStop(0, 'rgba(20, 32, 70, 0.85)');
    glass.addColorStop(0.5, 'rgba(10, 16, 40, 0.9)');
    glass.addColorStop(1, 'rgba(24, 14, 56, 0.85)');
    ctx.fillStyle = glass;
    ctx.fill();

    // Faint grid inside the bottle so the columns read clearly.
    ctx.save();
    tracePath(ctx, shape);
    ctx.clip();
    ctx.strokeStyle = 'rgba(139, 214, 255, 0.09)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < game.board.width; i += 1) {
      ctx.moveTo(originX + i * cell, originY);
      ctx.lineTo(originX + i * cell, originY + fieldH);
    }
    for (let j = 1; j < game.board.height; j += 1) {
      ctx.moveTo(originX, originY + j * cell);
      ctx.lineTo(originX + fieldW, originY + j * cell);
    }
    ctx.stroke();

    // Soft sheen hugging the inside of the left wall.
    const sheen = ctx.createLinearGradient(shape.left, 0, shape.left + cell * 1.2, 0);
    sheen.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
    sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(shape.left, shape.neckTop, cell * 1.2, shape.bottom - shape.neckTop);
    ctx.restore();

    // The outline itself, with a neon glow.
    ctx.save();
    tracePath(ctx, shape);
    ctx.strokeStyle = '#8bd6ff';
    ctx.lineWidth = Math.max(2, cell * 0.13);
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(55, 182, 255, 0.5)';
    ctx.shadowBlur = cell * 0.45;
    ctx.stroke();
    ctx.restore();

    // Cap on the neck.
    const capH = cell * 0.42;
    ctx.fillStyle = '#8bd6ff';
    ctx.beginPath();
    roundRect(
      ctx,
      shape.neckLeft - cell * 0.16,
      shape.neckTop - capH,
      shape.neckW + cell * 0.32,
      capH,
      cell * 0.16,
    );
    ctx.fill();
  }

  drawStack(game, layout, now) {
    const clearing = new Set(game.clearingCells.map(({ x, y }) => `${x},${y}`));
    game.board.forEachCell((c, x, y) => {
      if (clearing.has(`${x},${y}`)) return;
      const px = layout.originX + x * layout.cell;
      const py = layout.originY + y * layout.cell;
      if (c.type === VIRUS) this.drawVirus(px, py, layout.cell, c.color, now, x, y);
      else this.drawHalf(px, py, layout.cell, c.color, c.link);
    });
  }

  drawFallingPill(game, layout) {
    if (!game.pill || game.phase !== PHASE.FALLING) return;
    const offset = game.dropProgress * layout.cell;
    // Ghost showing where the pill will land.
    const ghost = landingCells(game);
    for (const { x, y, link } of ghost) {
      this.drawHalf(
        layout.originX + x * layout.cell,
        layout.originY + y * layout.cell,
        layout.cell,
        null,
        link,
        { ghost: true },
      );
    }
    for (const { x, y, color, link } of pillCells(game.pill)) {
      this.drawHalf(
        layout.originX + x * layout.cell,
        layout.originY + y * layout.cell + offset,
        layout.cell,
        color,
        link,
      );
    }
  }

  drawClearing(game, layout) {
    if (game.phase !== PHASE.CLEARING || game.clearingCells.length === 0) return;
    const t = Math.min(1, game.phaseTimer / CLEAR_ANIMATION);
    const { ctx } = this;
    for (const { x, y, color } of game.clearingCells) {
      const cx = layout.originX + (x + 0.5) * layout.cell;
      const cy = layout.originY + (y + 0.5) * layout.cell;
      const radius = layout.cell * (0.5 + t * 0.55);
      ctx.save();
      ctx.globalAlpha = 1 - t;
      const tone = PALETTE[color];
      const glow = ctx.createRadialGradient(cx, cy, layout.cell * 0.1, cx, cy, radius);
      glow.addColorStop(0, '#ffffff');
      glow.addColorStop(0.45, tone.glow);
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Sparks flying outward.
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, layout.cell * 0.06);
      ctx.globalAlpha = (1 - t) * 0.8;
      for (let i = 0; i < 4; i += 1) {
        const angle = (Math.PI / 2) * i + Math.PI / 4;
        const inner = layout.cell * (0.25 + t * 0.4);
        const outer = inner + layout.cell * 0.22;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
        ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  /**
   * One half of a capsule. `link` decides which end stays square so a joined
   * pill reads as a single lozenge; a null link draws a lone round pip.
   */
  drawHalf(px, py, cell, color, link, { ghost = false } = {}) {
    const { ctx } = this;
    const inset = cell * 0.07;
    const size = cell - inset * 2;
    const r = size / 2;
    const radii = {
      tl: r,
      tr: r,
      br: r,
      bl: r,
    };
    if (link === LINK.RIGHT) radii.tr = radii.br = cell * 0.08;
    if (link === LINK.LEFT) radii.tl = radii.bl = cell * 0.08;
    if (link === LINK.UP) radii.tl = radii.tr = cell * 0.08;
    if (link === LINK.DOWN) radii.bl = radii.br = cell * 0.08;

    const x = px + inset;
    const y = py + inset;

    ctx.save();
    if (ghost) {
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, cell * 0.06);
      ctx.beginPath();
      roundRectVariable(ctx, x, y, size, size, radii);
      ctx.stroke();
      ctx.restore();
      return;
    }

    const tone = PALETTE[color];
    const fill = ctx.createLinearGradient(x, y, x + size, y + size);
    fill.addColorStop(0, tone.light);
    fill.addColorStop(0.45, tone.base);
    fill.addColorStop(1, tone.dark);
    ctx.fillStyle = fill;
    ctx.beginPath();
    roundRectVariable(ctx, x, y, size, size, radii);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = Math.max(1, cell * 0.05);
    ctx.stroke();

    // Gloss.
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(
      x + size * 0.33,
      y + size * 0.28,
      size * 0.17,
      size * 0.11,
      -Math.PI / 5,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
  }

  /** A wobbling, blinking virus. */
  drawVirus(px, py, cell, color, now, gx, gy) {
    const { ctx } = this;
    const tone = PALETTE[color];
    const phase = now / 260 + (gx * 3 + gy * 5);
    const bob = Math.sin(phase) * cell * 0.035;
    const squash = 1 + Math.sin(phase * 2) * 0.04;
    const cx = px + cell / 2;
    const cy = py + cell / 2 + bob;
    const r = cell * 0.36;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(squash, 2 - squash);

    // Spiky arms.
    ctx.fillStyle = tone.dark;
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI * 2 * i) / 6 + Math.sin(phase) * 0.12;
      ctx.beginPath();
      ctx.ellipse(
        Math.cos(angle) * r * 0.95,
        Math.sin(angle) * r * 0.95,
        r * 0.32,
        r * 0.22,
        angle,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    // Body.
    const body = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.15, 0, 0, r);
    body.addColorStop(0, tone.light);
    body.addColorStop(0.6, tone.base);
    body.addColorStop(1, tone.dark);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = Math.max(1, cell * 0.045);
    ctx.stroke();

    // Face: eyes that blink on a slow cycle, plus a grumpy mouth.
    const blink = Math.sin(now / 900 + gx + gy) > 0.94;
    const eyeY = -r * 0.15;
    const eyeDx = r * 0.34;
    ctx.fillStyle = '#ffffff';
    for (const dx of [-eyeDx, eyeDx]) {
      ctx.beginPath();
      if (blink) {
        ctx.ellipse(dx, eyeY, r * 0.24, r * 0.05, 0, 0, Math.PI * 2);
      } else {
        ctx.ellipse(dx, eyeY, r * 0.24, r * 0.28, 0, 0, Math.PI * 2);
      }
      ctx.fill();
    }
    if (!blink) {
      ctx.fillStyle = '#101425';
      for (const dx of [-eyeDx, eyeDx]) {
        ctx.beginPath();
        ctx.arc(dx + Math.sin(phase) * r * 0.05, eyeY + r * 0.05, r * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.strokeStyle = '#101425';
    ctx.lineWidth = Math.max(1, cell * 0.05);
    ctx.beginPath();
    ctx.arc(0, r * 0.55, r * 0.3, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.restore();
  }
}

/** Draws a small preview of a pill, used for the "next" window. */
export function drawPillPreview(canvas, colors) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, rect.width, rect.height);
  if (!colors) {
    ctx.restore();
    return;
  }
  const cell = Math.min(rect.height * 0.8, rect.width / 2.3);
  const x = (rect.width - cell * 2) / 2;
  const y = (rect.height - cell) / 2;
  const renderer = { ctx };
  Renderer.prototype.drawHalf.call(renderer, x, y, cell, colors[0], LINK.RIGHT);
  Renderer.prototype.drawHalf.call(renderer, x + cell, y, cell, colors[1], LINK.LEFT);
  ctx.restore();
}

/** Draws the remaining viruses per colour, with their counts, in a panel. */
export function drawVirusTally(canvas, counts, now) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0) return;
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, rect.width, rect.height);
  const slot = rect.width / 3;
  const cell = Math.min(slot * 0.72, rect.height * 0.72);
  const renderer = { ctx };
  counts.forEach((count, color) => {
    const x = slot * color + (slot - cell) / 2;
    const y = 2;
    ctx.globalAlpha = count === 0 ? 0.25 : 1;
    Renderer.prototype.drawVirus.call(renderer, x, y, cell, color, now, color * 4, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = count === 0 ? 'rgba(139, 160, 200, 0.6)' : PALETTE[color].light;
    ctx.font = `600 ${Math.round(cell * 0.42)}px ui-monospace, 'SFMono-Regular', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(String(count), x + cell / 2, y + cell * 0.92);
  });
  ctx.restore();
}

/** Where the current pill would come to rest, for the drop ghost. */
function landingCells(game) {
  let pill = game.pill;
  for (;;) {
    const next = { ...pill, y: pill.y + 1 };
    const fitsThere = pillCells(next).every(
      ({ x, y }) => game.board.inBounds(x, y) && game.board.isEmpty(x, y),
    );
    if (!fitsThere) break;
    pill = next;
  }
  return pill.y === game.pill.y ? [] : pillCells(pill);
}

/** Geometry of the bottle: a body with a neck poking out of the top. */
function bottleShape({ cell, fieldW, fieldH, originX, originY }) {
  const pad = cell * BOTTLE_PAD;
  const neckW = cell * 2.6;
  return {
    left: originX - pad,
    top: originY - pad,
    right: originX + fieldW + pad,
    bottom: originY + fieldH + pad,
    radius: cell * 0.9,
    neckW,
    neckR: cell * 0.3,
    neckLeft: originX + fieldW / 2 - neckW / 2,
    neckRight: originX + fieldW / 2 + neckW / 2,
    neckTop: originY - pad - cell * NECK_ROWS,
  };
}

/** Lays down the bottle outline as the current path (neck and body in one). */
function tracePath(ctx, s) {
  ctx.beginPath();
  ctx.moveTo(s.neckLeft + s.neckR, s.neckTop);
  ctx.lineTo(s.neckRight - s.neckR, s.neckTop);
  ctx.arcTo(s.neckRight, s.neckTop, s.neckRight, s.neckTop + s.neckR, s.neckR);
  ctx.lineTo(s.neckRight, s.top);
  ctx.lineTo(s.right - s.radius, s.top);
  ctx.arcTo(s.right, s.top, s.right, s.top + s.radius, s.radius);
  ctx.lineTo(s.right, s.bottom - s.radius);
  ctx.arcTo(s.right, s.bottom, s.right - s.radius, s.bottom, s.radius);
  ctx.lineTo(s.left + s.radius, s.bottom);
  ctx.arcTo(s.left, s.bottom, s.left, s.bottom - s.radius, s.radius);
  ctx.lineTo(s.left, s.top + s.radius);
  ctx.arcTo(s.left, s.top, s.left + s.radius, s.top, s.radius);
  ctx.lineTo(s.neckLeft, s.top);
  ctx.lineTo(s.neckLeft, s.neckTop + s.neckR);
  ctx.arcTo(s.neckLeft, s.neckTop, s.neckLeft + s.neckR, s.neckTop, s.neckR);
  ctx.closePath();
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function roundRectVariable(ctx, x, y, w, h, { tl, tr, br, bl }) {
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  ctx.lineTo(x + bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
}
