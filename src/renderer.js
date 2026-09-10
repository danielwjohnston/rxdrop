import {
  CLEAR_ANIMATION,
  LINK,
  MUTATION_ANIMATION,
  NECK_ROWS,
  RESISTANCE_MAX,
  VIRUS,
} from './constants.js';
import { pillCells } from './pill.js';
import { PHASE } from './game.js';
import { ERAS, eraFor, paletteFor } from './eras.js';
import { collateralOf, isTolerant } from './board.js';

/**
 * The default medicine tones - the pharmaceutical era's, which is the look the
 * game had before there were eras. Anything drawing inside a bottle should use
 * the renderer's own `palette`, which follows the level.
 */
export const PALETTE = paletteFor(ERAS[3]);

/**
 * How each era's vessel takes the light. Glass is lit and transparent, clay is
 * matte and swallows it, cryo is frosted and lit from below.
 */
const SURFACES = {
  clay: { fill: ['#3a2418', '#241509', '#2e1c10'], sheen: 0.05, grid: 0.07, glow: 0.18 },
  glass: { fill: ['#1a2748', '#0c1226', '#182042'], sheen: 0.16, grid: 0.1, glow: 0.42 },
  embossed: { fill: ['#2c2410', '#170f05', '#241a0c'], sheen: 0.1, grid: 0.08, glow: 0.3 },
  plastic: { fill: ['#142046', '#0a1028', '#180e38'], sheen: 0.12, grid: 0.09, glow: 0.5 },
  cryo: { fill: ['#141a3a', '#0a0c1e', '#1a1240'], sheen: 0.22, grid: 0.11, glow: 0.6 },
};

const BOTTLE_PAD = 0.35;

/** Turns an era accent (#rrggbb) into the same colour at a given alpha. */
function withAlpha(hex, alpha) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Draws the bottle, the stack and the pill in play onto a 2D canvas. */
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = 1;
    this.shake = 0;
    this.layout = null;
    this.setEra(ERAS[3]);
  }

  /** Points the renderer at an era: its palette, vessel and virus shapes. */
  setEra(era) {
    this.era = era ?? ERAS[3];
    this.palette = paletteFor(this.era);
  }

  /** Convenience for callers that only know the level. */
  setLevel(level) {
    this.setEra(eraFor(level));
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
        usableH / (board.height + this.era.vessel.spout + BOTTLE_PAD),
      ),
    );
    const fieldW = cell * board.width;
    const fieldH = cell * board.height;
    const originX = Math.round((this.cssWidth - fieldW) / 2);
    const spout = cell * this.era.vessel.spout;
    const originY = Math.round((this.cssHeight - fieldH - spout) / 2 + spout);
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
    this.drawResisted(game, layout);
    this.drawMutations(game, layout, now);
    ctx.restore();
  }

  drawBottle({ cell, fieldW, fieldH, originX, originY }, game) {
    const { ctx } = this;
    const { vessel, accent } = this.era;
    const surface = SURFACES[vessel.surface] ?? SURFACES.plastic;
    const shape = bottleShape({ cell, fieldW, fieldH, originX, originY }, vessel);

    tracePath(ctx, shape);
    const glass = ctx.createLinearGradient(shape.left, shape.top, shape.right, shape.bottom);
    glass.addColorStop(0, surface.fill[0]);
    glass.addColorStop(0.5, surface.fill[1]);
    glass.addColorStop(1, surface.fill[2]);
    ctx.fillStyle = glass;
    ctx.fill();

    ctx.save();
    tracePath(ctx, shape);
    ctx.clip();

    // The neck row sits above the lip: recessed, ungridded, never a virus's
    // home. Capsules pass through it, and the run only ends when one cannot.
    ctx.fillStyle = 'rgba(2, 5, 18, 0.72)';
    ctx.fillRect(shape.left, shape.top, shape.right - shape.left, shape.lip - shape.top);

    // Faint grid inside the bottle so the columns read clearly.
    ctx.strokeStyle = withAlpha(accent, surface.grid);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < game.board.width; i += 1) {
      ctx.moveTo(originX + i * cell, shape.lip);
      ctx.lineTo(originX + i * cell, originY + fieldH);
    }
    for (let j = NECK_ROWS + 1; j < game.board.height; j += 1) {
      ctx.moveTo(originX, originY + j * cell);
      ctx.lineTo(originX + fieldW, originY + j * cell);
    }
    ctx.stroke();

    // The lip itself, so the neck reads as separate from the bottle.
    ctx.strokeStyle = withAlpha(accent, 0.4);
    ctx.lineWidth = Math.max(1, cell * 0.06);
    ctx.beginPath();
    ctx.moveTo(shape.left, shape.lip);
    ctx.lineTo(shape.right, shape.lip);
    ctx.stroke();

    if (vessel.surface === 'embossed') this.drawEmbossing(shape, cell, accent);
    if (vessel.surface === 'cryo') this.drawFrost(shape, cell, accent);

    // Soft sheen hugging the inside of the left wall.
    const sheen = ctx.createLinearGradient(shape.left, 0, shape.left + cell * 1.2, 0);
    sheen.addColorStop(0, `rgba(255, 255, 255, ${surface.sheen})`);
    sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(shape.left, shape.neckTop, cell * 1.2, shape.bottom - shape.neckTop);
    ctx.restore();

    // The outline itself, glowing in the era's accent.
    ctx.save();
    tracePath(ctx, shape);
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(2, cell * 0.13);
    ctx.lineJoin = 'round';
    ctx.shadowColor = withAlpha(accent, surface.glow);
    ctx.shadowBlur = cell * 0.45;
    ctx.stroke();
    ctx.restore();

    this.drawCap(shape, cell, vessel.cap, accent);
  }

  /**
   * Mould seams down the sides of the patent-medicine bottle. A panel of raised
   * lettering across the middle is more authentic, but it sits behind the
   * playfield and reads as a stray box over the viruses - so the embossing goes
   * where a real two-piece mould leaves it, on the walls, out of the way.
   */
  drawEmbossing(shape, cell, accent) {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(1, cell * 0.05);
    for (const x of [shape.left + cell * 0.12, shape.right - cell * 0.12]) {
      ctx.beginPath();
      ctx.moveTo(x, shape.lip);
      ctx.lineTo(x, shape.bottom - cell * 0.6);
      ctx.stroke();
    }
    // A shallow shoulder step, the seam a mould leaves where the halves meet.
    ctx.globalAlpha = 0.14;
    ctx.beginPath();
    ctx.moveTo(shape.left + cell * 0.12, shape.lip + cell * 0.5);
    ctx.lineTo(shape.left + cell * 0.42, shape.lip + cell * 0.5);
    ctx.moveTo(shape.right - cell * 0.12, shape.lip + cell * 0.5);
    ctx.lineTo(shape.right - cell * 0.42, shape.lip + cell * 0.5);
    ctx.stroke();
    ctx.restore();
  }

  /** Frost creeping up the cryo-vial, and the light coming from under it. */
  drawFrost(shape, cell, accent) {
    const { ctx } = this;
    ctx.save();
    const under = ctx.createLinearGradient(0, shape.bottom, 0, shape.bottom - cell * 5);
    under.addColorStop(0, withAlpha(accent, 0.35));
    under.addColorStop(1, withAlpha(accent, 0));
    ctx.fillStyle = under;
    ctx.fillRect(shape.left, shape.bottom - cell * 5, shape.right - shape.left, cell * 5);
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 26; i += 1) {
      const fx = shape.left + ((i * 97) % 100) / 100 * (shape.right - shape.left);
      const fy = shape.bottom - ((i * 53) % 100) / 100 * (shape.bottom - shape.lip) * 0.7;
      ctx.beginPath();
      ctx.arc(fx, fy, cell * (0.06 + ((i * 31) % 7) / 60), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** Whatever is stopping this era's vessel. */
  drawCap(shape, cell, style, accent) {
    const { ctx } = this;
    const cx = (shape.neckLeft + shape.neckRight) / 2;
    ctx.save();
    if (style === 'wax') {
      // A poured seal, sagging unevenly over the mouth.
      ctx.fillStyle = '#b8503a';
      ctx.beginPath();
      ctx.moveTo(shape.neckLeft - cell * 0.24, shape.neckTop + cell * 0.1);
      for (let i = 0; i <= 6; i += 1) {
        const t = i / 6;
        const px = shape.neckLeft - cell * 0.24 + t * (shape.neckW + cell * 0.48);
        ctx.lineTo(px, shape.neckTop + cell * (0.1 + (i % 2 ? 0.22 : 0.05)));
      }
      ctx.lineTo(shape.neckRight + cell * 0.24, shape.neckTop - cell * 0.34);
      ctx.lineTo(shape.neckLeft - cell * 0.24, shape.neckTop - cell * 0.34);
      ctx.closePath();
      ctx.fill();
    } else if (style === 'stopper') {
      // Ground glass: a tapered plug under a round knob.
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(cx - shape.neckW * 0.34, shape.neckTop);
      ctx.lineTo(cx + shape.neckW * 0.34, shape.neckTop);
      ctx.lineTo(cx + shape.neckW * 0.24, shape.neckTop - cell * 0.4);
      ctx.lineTo(cx - shape.neckW * 0.24, shape.neckTop - cell * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, shape.neckTop - cell * 0.62, cell * 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (style === 'cork') {
      ctx.fillStyle = '#c99a5d';
      ctx.beginPath();
      ctx.moveTo(cx - shape.neckW * 0.4, shape.neckTop + cell * 0.12);
      ctx.lineTo(cx + shape.neckW * 0.4, shape.neckTop + cell * 0.12);
      ctx.lineTo(cx + shape.neckW * 0.48, shape.neckTop - cell * 0.44);
      ctx.lineTo(cx - shape.neckW * 0.48, shape.neckTop - cell * 0.44);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (style === 'ring') {
      // A screw collar: two bands and a flat seal. beginPath first - roundRect
      // only appends, so without it this fills the whole bottle outline.
      ctx.fillStyle = accent;
      ctx.beginPath();
      roundRect(ctx, shape.neckLeft - cell * 0.1, shape.neckTop - cell * 0.34,
        shape.neckW + cell * 0.2, cell * 0.16, cell * 0.06);
      ctx.fill();
      ctx.beginPath();
      roundRect(ctx, shape.neckLeft - cell * 0.1, shape.neckTop - cell * 0.14,
        shape.neckW + cell * 0.2, cell * 0.16, cell * 0.06);
      ctx.fill();
    } else {
      const capH = cell * 0.42;
      ctx.fillStyle = accent;
      ctx.beginPath();
      roundRect(ctx, shape.neckLeft - cell * 0.16, shape.neckTop - capH,
        shape.neckW + cell * 0.32, capH, cell * 0.16);
      ctx.fill();
    }
    ctx.restore();
  }

  drawStack(game, layout, now) {
    const clearing = new Set(game.clearingCells.map(({ x, y }) => `${x},${y}`));
    // Tolerance rides on the resistance rule, so the aura that announces it has
    // to as well - drawing "this needs a different colour" on a board where
    // that is not true would be a lie the player cannot check.
    const tolerance = Boolean(game.resistance);
    game.board.forEachCell((c, x, y) => {
      if (clearing.has(`${x},${y}`)) return;
      const px = layout.originX + x * layout.cell;
      const py = layout.originY + y * layout.cell;
      if (c.type === VIRUS) {
        const resistance = (c.resistance ?? 0) / RESISTANCE_MAX;
        const tolerant = tolerance && isTolerant(c);
        this.drawVirus(px, py, layout.cell, c.color, now, x, y, resistance, tolerant);
      }
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

  /**
   * The medicine bouncing off a tolerant virus. This animation is the whole
   * reason the mechanic is playable: a run that clears without killing the
   * virus reads as a bug unless the game visibly shows it being shrugged off.
   */
  drawResisted(game, layout) {
    if (game.phase !== PHASE.CLEARING || !game.resistedCells?.length) return;
    const { ctx } = this;
    const t = Math.min(1, game.phaseTimer / CLEAR_ANIMATION);
    for (const { x, y, color } of game.resistedCells) {
      const cx = layout.originX + (x + 0.5) * layout.cell;
      const cy = layout.originY + (y + 0.5) * layout.cell;
      const cure = this.palette[collateralOf(color)];
      ctx.save();
      // A hard shake that settles: the virus takes the hit and stays put.
      ctx.translate(cx + Math.sin(t * 34) * layout.cell * 0.14 * (1 - t), cy);

      // A ring thrown out by the impact that collapses back in - the medicine
      // arriving and failing, rather than the burst of a real clear.
      const bounce = Math.sin(t * Math.PI);
      ctx.globalAlpha = (1 - t) * 0.85;
      ctx.strokeStyle = this.palette[color].light;
      ctx.lineWidth = Math.max(1.5, layout.cell * 0.09 * (1 - t));
      ctx.beginPath();
      ctx.arc(0, 0, layout.cell * (0.34 + bounce * 0.26), 0, Math.PI * 2);
      ctx.stroke();

      // And a flash of the colour that WOULD have worked, so the failure
      // teaches the answer instead of just denying the player.
      ctx.globalAlpha = (1 - t) * 0.7;
      ctx.strokeStyle = cure.base;
      ctx.lineWidth = Math.max(1, layout.cell * 0.05);
      ctx.setLineDash([layout.cell * 0.1, layout.cell * 0.1]);
      ctx.lineDashOffset = -t * layout.cell;
      ctx.beginPath();
      ctx.arc(0, 0, layout.cell * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
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
      const tone = this.palette[color];
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

  /** A white flash over each virus that just changed colour. */
  drawMutations(game, layout, now) {
    if (!game.mutations || game.mutations.length === 0) return;
    const t = Math.min(1, (game.phaseTimer ?? 0) / MUTATION_ANIMATION);
    const { ctx } = this;
    for (const { x, y } of game.mutations) {
      const cx = layout.originX + (x + 0.5) * layout.cell;
      const cy = layout.originY + (y + 0.5) * layout.cell;
      ctx.save();
      ctx.globalAlpha = (1 - t) * 0.9;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.5, layout.cell * 0.08);
      ctx.beginPath();
      ctx.arc(cx, cy, layout.cell * (0.3 + t * 0.5), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = (1 - t) * 0.35;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, layout.cell * 0.42 * (1 - t), 0, Math.PI * 2);
      ctx.fill();
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

    const tone = this.palette[color];
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

  /**
   * A wobbling, blinking virus. `resistance` (0..1) fades in a warning aura and
   * speeds up the wobble, so a virus about to mutate looks agitated.
   */
  drawVirus(px, py, cell, color, now, gx, gy, resistance = 0, tolerant = false) {
    const { ctx } = this;
    const tone = this.palette[color];
    if (tolerant) {
      // A tolerant virus no longer answers to its own colour, so the aura stops
      // being a warning and becomes an instruction: it is drawn in the colour
      // that DOES kill it. The rule is learnable from one look at the bottle.
      const cure = this.palette[collateralOf(color)];
      const pulse = 0.5 + 0.5 * Math.sin(now / 260 + gx + gy);
      ctx.save();
      ctx.strokeStyle = cure.base;
      ctx.globalAlpha = 0.55 + 0.4 * pulse;
      ctx.lineWidth = Math.max(1.5, cell * 0.08);
      ctx.shadowColor = cure.glow;
      ctx.shadowBlur = cell * 0.35;
      ctx.beginPath();
      ctx.arc(px + cell / 2, py + cell / 2, cell * 0.46, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.28 + 0.2 * pulse;
      ctx.lineWidth = Math.max(1, cell * 0.04);
      ctx.beginPath();
      ctx.arc(px + cell / 2, py + cell / 2, cell * 0.38, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (resistance > 0) {
      const pulse = 0.5 + 0.5 * Math.sin(now / (240 - resistance * 140) + gx + gy);
      ctx.save();
      ctx.globalAlpha = 0.15 + resistance * 0.5 * pulse;
      ctx.strokeStyle = this.era.accent;
      ctx.lineWidth = Math.max(1, cell * 0.05);
      ctx.setLineDash([cell * 0.12, cell * 0.1]);
      ctx.lineDashOffset = now / 40;
      ctx.beginPath();
      ctx.arc(px + cell / 2, py + cell / 2, cell * 0.46, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    const phase = now / (260 - resistance * 120) + (gx * 3 + gy * 5);
    const bob = Math.sin(phase) * cell * 0.035;
    const squash = 1 + Math.sin(phase * 2) * 0.04;
    const cx = px + cell / 2;
    const cy = py + cell / 2 + bob;
    const r = cell * 0.36;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(squash, 2 - squash);

    // Arms: how many and what shape is the era's business. A cave-era humour
    // has soft lobes; a sequenced capsid has hard spikes.
    const style = this.era.virus;
    ctx.fillStyle = tone.dark;
    for (let i = 0; i < style.arms; i += 1) {
      const angle = (Math.PI * 2 * i) / style.arms + Math.sin(phase) * 0.12;
      const ax = Math.cos(angle);
      const ay = Math.sin(angle);
      ctx.beginPath();
      if (style.armShape === 'spike') {
        const tip = r * 1.42;
        ctx.moveTo(ax * tip, ay * tip);
        ctx.lineTo(-ay * r * 0.28 + ax * r * 0.7, ax * r * 0.28 + ay * r * 0.7);
        ctx.lineTo(ay * r * 0.28 + ax * r * 0.7, -ax * r * 0.28 + ay * r * 0.7);
        ctx.closePath();
      } else {
        ctx.ellipse(ax * r * 0.95, ay * r * 0.95, r * 0.32, r * 0.22, angle, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    // Body.
    const body = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.15, 0, 0, r);
    body.addColorStop(0, tone.light);
    body.addColorStop(0.6, tone.base);
    body.addColorStop(1, tone.dark);
    ctx.fillStyle = body;
    ctx.beginPath();
    if (style.bodyShape === 'hex') {
      for (let i = 0; i < 6; i += 1) {
        const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
        const px2 = Math.cos(a) * r * 1.04;
        const py2 = Math.sin(a) * r * 1.04;
        if (i === 0) ctx.moveTo(px2, py2);
        else ctx.lineTo(px2, py2);
      }
      ctx.closePath();
    } else if (style.bodyShape === 'lumpy') {
      for (let i = 0; i <= 14; i += 1) {
        const a = (Math.PI * 2 * i) / 14;
        const wobble = r * (1 + Math.sin(a * 3 + phase * 0.5) * 0.09);
        const px2 = Math.cos(a) * wobble;
        const py2 = Math.sin(a) * wobble;
        if (i === 0) ctx.moveTo(px2, py2);
        else ctx.lineTo(px2, py2);
      }
      ctx.closePath();
    } else {
      ctx.arc(0, 0, r, 0, Math.PI * 2);
    }
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
export function drawPillPreview(canvas, colors, era = ERAS[3]) {
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
  const renderer = { ctx, era, palette: paletteFor(era) };
  Renderer.prototype.drawHalf.call(renderer, x, y, cell, colors[0], LINK.RIGHT);
  Renderer.prototype.drawHalf.call(renderer, x + cell, y, cell, colors[1], LINK.LEFT);
  ctx.restore();
}

/** Draws the remaining viruses per colour, with their counts, in a panel. */
export function drawVirusTally(canvas, counts, now, era = ERAS[3]) {
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
  const palette = paletteFor(era);
  const renderer = { ctx, era, palette };
  counts.forEach((count, color) => {
    const x = slot * color + (slot - cell) / 2;
    const y = 2;
    ctx.globalAlpha = count === 0 ? 0.25 : 1;
    Renderer.prototype.drawVirus.call(renderer, x, y, cell, color, now, color * 4, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = count === 0 ? 'rgba(139, 160, 200, 0.6)' : palette[color].light;
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
function bottleShape({ cell, fieldW, fieldH, originX, originY }, vessel) {
  const pad = cell * BOTTLE_PAD;
  const neckW = cell * vessel.neckWidth;
  const left = originX - pad;
  const right = originX + fieldW + pad;
  // shoulder 0 is a square-shouldered jar, 1 an amphora that curves all the way
  // in to the neck. Everything between is a lerp, which is why one path can
  // draw five vessels.
  const span = (right - left) / 2;
  const shoulderR = cell * 0.3 + (span - neckW / 2) * vessel.shoulder;
  return {
    left,
    top: originY - pad,
    right,
    bottom: originY + fieldH + pad,
    baseR: cell * vessel.radius,
    shoulderR,
    neckW,
    neckR: cell * 0.3,
    neckLeft: originX + fieldW / 2 - neckW / 2,
    neckRight: originX + fieldW / 2 + neckW / 2,
    neckTop: originY - pad - cell * vessel.spout,
    // Bottom of the neck row: the lip capsules drop past to enter the bottle.
    lip: originY + cell * NECK_ROWS,
  };
}

/** Lays down the vessel outline as the current path (neck and body in one). */
function tracePath(ctx, s) {
  const shoulder = Math.min(s.shoulderR, (s.right - s.left) / 2, s.bottom - s.top);
  const base = Math.min(s.baseR, (s.right - s.left) / 2);
  ctx.beginPath();
  ctx.moveTo(s.neckLeft + s.neckR, s.neckTop);
  ctx.lineTo(s.neckRight - s.neckR, s.neckTop);
  ctx.arcTo(s.neckRight, s.neckTop, s.neckRight, s.neckTop + s.neckR, s.neckR);
  ctx.lineTo(s.neckRight, s.top);
  ctx.lineTo(s.right - shoulder, s.top);
  ctx.arcTo(s.right, s.top, s.right, s.top + shoulder, shoulder);
  ctx.lineTo(s.right, s.bottom - base);
  ctx.arcTo(s.right, s.bottom, s.right - base, s.bottom, base);
  ctx.lineTo(s.left + base, s.bottom);
  ctx.arcTo(s.left, s.bottom, s.left, s.bottom - base, base);
  ctx.lineTo(s.left, s.top + shoulder);
  ctx.arcTo(s.left, s.top, s.left + shoulder, s.top, shoulder);
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
