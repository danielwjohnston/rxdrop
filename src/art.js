// Authored art assets for the Apothecary Through Time presentation layer.
//
// The game remains entirely playable without these sprites: callers get `false`
// until the sheet has loaded (or forever in a non-browser environment) and fall
// back to the procedural drawings. That keeps tests headless and keeps a bad
// asset request from taking the game down with it.

const TILE = 180;
const PORTRAIT_ROW = 0;
const SCENE_ROW = TILE;
const SHEET_URL = new URL('../assets/medical-era-sprites.svg', import.meta.url).href;

let sheet = null;
let failed = false;

function spriteSheet() {
  if (failed || typeof Image === 'undefined') return null;
  if (sheet) return sheet;
  sheet = new Image();
  sheet.decoding = 'async';
  sheet.onload = () => {};
  sheet.onerror = () => { failed = true; };
  sheet.src = SHEET_URL;
  return sheet;
}

function readyImage() {
  const image = spriteSheet();
  if (!image || !image.complete || image.naturalWidth === 0) return null;
  return image;
}

function indexFor(era) {
  const index = Number(era?.artIndex ?? 0);
  return Number.isFinite(index) ? Math.max(0, Math.min(10, Math.round(index))) : 0;
}

/**
 * Draws the authored practitioner sprite. Returns false when the asset is not
 * available yet so `doctors.js` can use its procedural fallback for this frame.
 */
export function drawPractitionerSprite(ctx, {
  x = 0,
  y = 0,
  size,
  era,
  pose = 'idle',
  now = 0,
}) {
  const image = readyImage();
  if (!image || !size) return false;
  const index = indexFor(era);
  const reactions = {
    idle: { lean: 0, lift: 0, scale: 1 },
    toss: { lean: -0.045, lift: -2.5, scale: 1.015 },
    cheer: { lean: 0.03, lift: -5, scale: 1.035 },
    worry: { lean: 0.04, lift: 1.5, scale: 0.985 },
  };
  const reaction = reactions[pose] ?? reactions.idle;
  const breathe = Math.sin(now / 760) * size * 0.006;
  const sway = Math.sin(now / 1250) * 0.008;

  ctx.save();
  ctx.translate(x + size / 2, y + size / 2 + reaction.lift + breathe);
  ctx.rotate(reaction.lean + sway);
  ctx.scale(reaction.scale, reaction.scale);
  ctx.drawImage(
    image,
    index * TILE,
    PORTRAIT_ROW,
    TILE,
    TILE,
    -size / 2,
    -size / 2,
    size,
    size,
  );
  ctx.restore();
  return true;
}

/** Draws the authored historical environment behind the bottle. */
export function drawEraBackdrop(ctx, { width, height, era, now = 0 }) {
  const image = readyImage();
  if (!image || width <= 0 || height <= 0) return false;
  const index = indexFor(era);

  // A very slow drift keeps the scene from reading as wallpaper without ever
  // moving enough to compete with the board.
  const drift = Math.sin(now / 9000 + index) * 0.018;
  const source = {
    x: index * TILE,
    y: SCENE_ROW,
    w: TILE,
    h: TILE,
  };
  const scale = Math.max(width / source.w, height / source.h) * (1.08 + Math.abs(drift));
  const dw = source.w * scale;
  const dh = source.h * scale;
  const dx = (width - dw) / 2 + drift * width;
  const dy = (height - dh) / 2;

  ctx.save();
  ctx.globalAlpha = 0.38;
  ctx.drawImage(image, source.x, source.y, source.w, source.h, dx, dy, dw, dh);

  // Readability veil: art around the bottle, never through the medicine.
  const vignette = ctx.createRadialGradient(
    width / 2,
    height * 0.46,
    Math.min(width, height) * 0.16,
    width / 2,
    height * 0.46,
    Math.max(width, height) * 0.62,
  );
  vignette.addColorStop(0, 'rgba(2, 5, 14, 0.04)');
  vignette.addColorStop(0.56, 'rgba(2, 5, 14, 0.22)');
  vignette.addColorStop(1, 'rgba(2, 5, 14, 0.72)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
  return true;
}

export const ART_TILE_SIZE = TILE;
