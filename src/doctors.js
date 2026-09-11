import './runtime-overhaul.js';

/**
 * Lightweight procedural fallbacks for the authored practitioner atlas.
 * Runtime-overhaul paints the sprite when it is available; these figures keep
 * the game readable in headless tests, during the first image-decode frame, or
 * if an asset request fails offline.
 */
export const POSE_HOLD = 620;

const POSES = Object.freeze({
  idle: { lean: 0, lift: 0, mouth: 0 },
  toss: { lean: -0.08, lift: -3, mouth: 0.2 },
  cheer: { lean: 0.04, lift: -5, mouth: 1 },
  worry: { lean: 0.06, lift: 2, mouth: -1 },
});

const STYLES = Object.freeze({
  shaman: { coat: '#6b4a30', skin: '#c08a5c', hair: '#2f1e14', head: 'band' },
  plague: { coat: '#171a24', skin: '#cfc3a8', hair: '#11131a', head: 'beak' },
  quack: { coat: '#5c2f3c', skin: '#e8bd97', hair: '#4a2c1c', head: 'hat' },
  physician: { coat: '#f2f5fb', skin: '#eec39c', hair: '#5a3a22', head: 'mirror' },
  technician: { coat: '#dfe6f2', skin: '#d7e5f5', hair: '#b8c6de', head: 'visor' },
});

export const DOCTOR_IDS = Object.freeze(Object.keys(STYLES));

export function drawDoctor(ctx, { x = 0, y = 0, size, era, pose = 'idle', now = 0 }) {
  if (!ctx || !size) return;
  const style = STYLES[era?.doctor] ?? STYLES.physician;
  const state = POSES[pose] ?? POSES.idle;
  const accent = era?.accent ?? '#8bd6ff';
  const breath = Math.sin(now / 740) * size * 0.006;

  ctx.save();
  ctx.translate(x + size / 2, y + size * 0.9 + breath + state.lift);
  ctx.rotate(state.lean + Math.sin(now / 1300) * 0.012);
  ctx.scale(size / 100, size / 100);

  // Shoulders.
  ctx.fillStyle = style.coat;
  ctx.beginPath();
  ctx.moveTo(-38, 8);
  ctx.quadraticCurveTo(-32, -27, 0, -31);
  ctx.quadraticCurveTo(32, -27, 38, 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.34;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Head / mask.
  ctx.fillStyle = style.skin;
  ctx.beginPath();
  ctx.ellipse(0, -55, 20, 23, 0, 0, Math.PI * 2);
  ctx.fill();

  if (style.head === 'band') {
    ctx.fillStyle = style.hair;
    ctx.beginPath();
    ctx.arc(0, -65, 20, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a8422e';
    ctx.fillRect(-21, -68, 42, 6);
  } else if (style.head === 'beak') {
    ctx.fillStyle = '#bdb096';
    ctx.beginPath();
    ctx.moveTo(-2, -58);
    ctx.quadraticCurveTo(26, -53, 17, -33);
    ctx.quadraticCurveTo(7, -40, -3, -45);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#101219';
    ctx.beginPath();
    ctx.ellipse(0, -75, 31, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (style.head === 'hat') {
    ctx.fillStyle = '#241722';
    ctx.fillRect(-14, -85, 28, 22);
    ctx.beginPath();
    ctx.ellipse(0, -64, 28, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.fillRect(-14, -68, 28, 4);
  } else if (style.head === 'mirror') {
    ctx.fillStyle = style.hair;
    ctx.beginPath();
    ctx.arc(0, -66, 20, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c6d2e6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -66, 20, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(0, -75, 7, 0, Math.PI * 2);
    ctx.fill();
  } else if (style.head === 'visor') {
    ctx.fillStyle = '#eef2f9';
    ctx.beginPath();
    ctx.ellipse(0, -57, 24, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#101a30';
    ctx.beginPath();
    ctx.ellipse(0, -57, 17, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.stroke();
  }

  if (style.head !== 'beak' && style.head !== 'visor') {
    // Eyes and expression.
    const blink = Math.sin(now / 1200) > 0.965;
    ctx.fillStyle = '#fff';
    for (const dx of [-8, 8]) {
      ctx.beginPath();
      ctx.ellipse(dx, -57, 4.3, blink ? 0.8 : 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!blink) {
      ctx.fillStyle = '#17131a';
      for (const dx of [-8, 8]) {
        ctx.beginPath();
        ctx.arc(dx + Math.sin(now / 1500), -56, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.strokeStyle = '#17131a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (state.mouth > 0.5) ctx.arc(0, -44, 5, 0, Math.PI);
    else ctx.arc(0, -40, 5, Math.PI, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}
