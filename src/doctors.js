/**
 * The physicians.
 *
 * One per era, drawn parametrically like everything else in this game - no
 * image files, no sprite sheet. Each is drawn into a 100 x 100 box with the
 * feet on the origin line and the head around y = -72, so they all sit the same
 * way in the panel however different they look.
 *
 * They react. The pose changes when a capsule is dealt, when a clear lands and
 * when the neck starts to fill, which is most of what makes them feel alive.
 */

/** How long a reaction pose holds before dropping back to idle. */
export const POSE_HOLD = 620;

const POSES = Object.freeze({
  idle: { lean: 0, lift: 0, brow: 0, mouth: 0 },
  toss: { lean: -0.09, lift: -2.5, brow: -1, mouth: 0.2 },
  cheer: { lean: 0.04, lift: -4.5, brow: -2.5, mouth: 1 },
  worry: { lean: 0.06, lift: 1.5, brow: 2.5, mouth: -1 },
});

/**
 * Draws the physician for an era into a size x size box at (x, y).
 * `pose` is one of idle, toss, cheer, worry.
 */
export function drawDoctor(ctx, { x = 0, y = 0, size, era, pose = 'idle', now = 0 }) {
  const shape = POSES[pose] ?? POSES.idle;
  const draw = DOCTORS[era?.doctor] ?? DOCTORS.physician;
  const breath = Math.sin(now / 700) * 1.1;
  const sway = Math.sin(now / 1100) * 0.02;

  ctx.save();
  ctx.translate(x + size / 2, y + size);
  // The figures are drawn feet-on-origin in a 100-unit space, but the tallest
  // hat reaches -120, so scale to that or the quack loses his crown.
  ctx.scale(size / 124, size / 124);
  ctx.translate(0, breath + shape.lift);
  ctx.rotate(shape.lean + sway);
  draw(ctx, { ...shape, now, accent: era?.accent ?? '#8bd6ff' });
  ctx.restore();
}

/** The shoulders and collar every physician sits on. */
function shoulders(ctx, { coat, collar, trim }) {
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.moveTo(-38, 0);
  ctx.quadraticCurveTo(-34, -40, 0, -44);
  ctx.quadraticCurveTo(34, -40, 38, 0);
  ctx.closePath();
  ctx.fill();

  if (trim) {
    ctx.strokeStyle = trim;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Collar: two lapels meeting under the chin.
  ctx.fillStyle = collar;
  ctx.beginPath();
  ctx.moveTo(-16, -42);
  ctx.lineTo(0, -22);
  ctx.lineTo(16, -42);
  ctx.quadraticCurveTo(0, -50, -16, -42);
  ctx.closePath();
  ctx.fill();
}

/** A face with eyes and a mouth whose curve follows the pose. */
function face(ctx, { brow, mouth, now, skin, ink, eyeY = -74, spread = 8 }) {
  const blink = Math.sin(now / 1300) > 0.965;
  ctx.fillStyle = '#ffffff';
  for (const dx of [-spread, spread]) {
    ctx.beginPath();
    if (blink) ctx.ellipse(dx, eyeY, 4.4, 0.9, 0, 0, Math.PI * 2);
    else ctx.ellipse(dx, eyeY, 4.4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (!blink) {
    ctx.fillStyle = ink;
    for (const dx of [-spread, spread]) {
      ctx.beginPath();
      ctx.arc(dx + Math.sin(now / 1600) * 1.1, eyeY + 0.8, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Brows say more than the eyes do.
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * (spread + 5), eyeY - 8 + brow * side * 0 + brow);
    ctx.lineTo(side * (spread - 4), eyeY - 9.5 - brow);
    ctx.stroke();
  }

  ctx.lineWidth = 2;
  ctx.beginPath();
  if (mouth > 0.5) {
    // An open, delighted mouth.
    ctx.fillStyle = ink;
    ctx.ellipse(0, eyeY + 13, 5, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const curve = eyeY + 13 + mouth * -3;
    ctx.moveTo(-5, eyeY + 13);
    ctx.quadraticCurveTo(0, curve + (mouth < 0 ? -4 : 4), 5, eyeY + 13);
    ctx.stroke();
  }
  void skin;
}

/** Rounded-rectangle helper in the physicians' own coordinate space. */
function roundBox(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

const DOCTORS = {
  /** Protomedicine: ochre paint, a bound headband, a bone in the hair. */
  shaman(ctx, state) {
    shoulders(ctx, { coat: '#6b4a30', collar: '#8d6742', trim: '#3c2717' });

    // Fur mantle over the shoulders.
    ctx.fillStyle = '#8d6742';
    for (let i = -3; i <= 3; i += 1) {
      ctx.beginPath();
      ctx.arc(i * 10, -40 + Math.abs(i) * 1.6, 6.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#c08a5c';
    ctx.beginPath();
    ctx.ellipse(0, -72, 21, 23, 0, 0, Math.PI * 2);
    ctx.fill();

    // Matted hair.
    ctx.fillStyle = '#2f1e14';
    ctx.beginPath();
    ctx.arc(0, -84, 20, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-19, -76, 5, 11, 0.3, 0, Math.PI * 2);
    ctx.ellipse(19, -76, 5, 11, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Headband with a bone through it.
    ctx.fillStyle = '#a8422e';
    roundBox(ctx, -21, -88, 42, 7, 3);
    ctx.fill();
    ctx.fillStyle = '#efe3cf';
    ctx.save();
    ctx.translate(13, -90);
    ctx.rotate(-0.5);
    roundBox(ctx, -9, -2, 18, 4, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-9, 0, 3, 0, Math.PI * 2);
    ctx.arc(9, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // War paint under the eyes.
    ctx.fillStyle = 'rgba(216, 92, 60, 0.75)';
    for (const dx of [-9, 9]) ctx.fillRect(dx - 5, -66, 10, 3);

    face(ctx, { ...state, skin: '#c08a5c', ink: '#2b1a12', eyeY: -74, spread: 8 });
  },

  /** The apothecary era: the beaked plague doctor. */
  plague(ctx, state) {
    shoulders(ctx, { coat: '#171a24', collar: '#e8e3d6', trim: '#2c3040' });

    // The waxed cape falling from the shoulders.
    ctx.fillStyle = '#101219';
    ctx.beginPath();
    ctx.moveTo(-38, 0);
    ctx.quadraticCurveTo(-30, -34, -14, -42);
    ctx.lineTo(-20, 0);
    ctx.closePath();
    ctx.moveTo(38, 0);
    ctx.quadraticCurveTo(30, -34, 14, -42);
    ctx.lineTo(20, 0);
    ctx.closePath();
    ctx.fill();

    // The mask: a pale hood shape, bone coloured.
    ctx.fillStyle = '#cfc3a8';
    ctx.beginPath();
    ctx.ellipse(0, -72, 19, 23, 0, 0, Math.PI * 2);
    ctx.fill();

    // The beak, curving down and forward.
    ctx.fillStyle = '#bdb096';
    ctx.beginPath();
    ctx.moveTo(-2, -76);
    ctx.quadraticCurveTo(20, -70, 15, -46);
    ctx.quadraticCurveTo(8, -54, -2, -60);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#8a7f68';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // Breathing holes in the tip, where the herbs are packed.
    ctx.fillStyle = '#6d6553';
    ctx.beginPath();
    ctx.arc(13.5, -52, 1.5, 0, Math.PI * 2);
    ctx.arc(13, -57, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Round glass goggles - the only part of him you can read.
    for (const dx of [-8.5, 7]) {
      ctx.fillStyle = '#0d1018';
      ctx.beginPath();
      ctx.arc(dx, -78, 7.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8a7f68';
      ctx.lineWidth = 2;
      ctx.stroke();
      // A glint that shifts with the pose, so he still emotes through glass.
      ctx.fillStyle = state.mouth > 0.5 ? state.accent : 'rgba(232, 227, 214, 0.85)';
      ctx.beginPath();
      ctx.arc(dx - 2.4, -80.4 + state.brow * 0.5, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // The wide brim and crown.
    ctx.fillStyle = '#12141c';
    ctx.beginPath();
    ctx.ellipse(0, -90, 33, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    roundBox(ctx, -15, -104, 30, 15, 3);
    ctx.fill();
    ctx.fillStyle = state.accent;
    ctx.globalAlpha = 0.75;
    ctx.fillRect(-15, -93, 30, 3);
    ctx.globalAlpha = 1;
  },

  /** Patent medicine: the man with nine hundred bottles to shift. */
  quack(ctx, state) {
    shoulders(ctx, { coat: '#5c2f3c', collar: '#f0e6d2', trim: '#8a4455' });

    // A loud checked waistcoat showing at the lapels.
    ctx.fillStyle = '#c9873f';
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 2; j += 1) {
        if ((i + j) % 2) continue;
        ctx.fillRect(-9 + i * 6, -38 + j * 6, 6, 6);
      }
    }

    ctx.fillStyle = '#e8bd97';
    ctx.beginPath();
    ctx.ellipse(0, -72, 20, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sideburns and hair.
    ctx.fillStyle = '#4a2c1c';
    ctx.beginPath();
    ctx.ellipse(-18, -76, 5, 12, 0.15, 0, Math.PI * 2);
    ctx.ellipse(18, -76, 5, 12, -0.15, 0, Math.PI * 2);
    ctx.fill();

    face(ctx, { ...state, skin: '#e8bd97', ink: '#3a2418', eyeY: -76, spread: 8 });

    // A monocle on the right eye, with its chain.
    ctx.strokeStyle = '#e6c463';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(8, -76, 7.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(14, -72);
    ctx.quadraticCurveTo(19, -60, 15, -46);
    ctx.stroke();

    // The moustache, waxed to a point on both sides.
    ctx.fillStyle = '#4a2c1c';
    ctx.beginPath();
    ctx.moveTo(0, -62);
    ctx.quadraticCurveTo(-11, -66, -17, -70);
    ctx.quadraticCurveTo(-12, -60, 0, -59);
    ctx.quadraticCurveTo(12, -60, 17, -70);
    ctx.quadraticCurveTo(11, -66, 0, -62);
    ctx.fill();

    // Top hat.
    ctx.fillStyle = '#241722';
    ctx.beginPath();
    ctx.ellipse(0, -90, 27, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    roundBox(ctx, -14, -116, 28, 27, 2.5);
    ctx.fill();
    ctx.fillStyle = state.accent;
    ctx.fillRect(-14, -95, 28, 4.5);
  },

  /** The pharmaceutical era, and the nod to the doctor who started all this. */
  physician(ctx, state) {
    shoulders(ctx, { coat: '#f2f5fb', collar: '#dbe4f2', trim: '#b9c6dd' });

    // Stethoscope round the neck.
    ctx.strokeStyle = '#2b3550';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-13, -40);
    ctx.quadraticCurveTo(0, -20, 15, -38);
    ctx.stroke();
    ctx.fillStyle = '#9fb2d0';
    ctx.beginPath();
    ctx.arc(16, -36, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#eec39c';
    ctx.beginPath();
    ctx.ellipse(0, -73, 20, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#5a3a22';
    ctx.beginPath();
    ctx.arc(0, -84, 20, Math.PI * 1.02, Math.PI * 1.98);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-18, -78, 4.5, 10, 0.2, 0, Math.PI * 2);
    ctx.ellipse(18, -78, 4.5, 10, -0.2, 0, Math.PI * 2);
    ctx.fill();

    face(ctx, { ...state, skin: '#eec39c', ink: '#33231a', eyeY: -75, spread: 8 });

    // A tidy moustache.
    ctx.fillStyle = '#5a3a22';
    ctx.beginPath();
    ctx.ellipse(0, -63, 9, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // The head mirror, because nothing says physician faster.
    ctx.strokeStyle = '#c6d2e6';
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.arc(0, -85, 20, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
    ctx.fillStyle = '#dfe9f7';
    ctx.beginPath();
    ctx.arc(0, -93, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = state.accent;
    ctx.beginPath();
    ctx.arc(0, -93, 4.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0d1424';
    ctx.beginPath();
    ctx.arc(0, -93, 1.9, 0, Math.PI * 2);
    ctx.fill();
  },

  /** Gene therapy: hooded, visored, lit from inside. */
  technician(ctx, state) {
    shoulders(ctx, { coat: '#dfe6f2', collar: '#c3d0e6', trim: '#9fb0cc' });

    // A sealed seam glowing along the shoulder line.
    ctx.strokeStyle = state.accent;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-30, -18);
    ctx.quadraticCurveTo(0, -34, 30, -18);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // The clean-room hood: one smooth shape over head and neck.
    ctx.fillStyle = '#eef2f9';
    ctx.beginPath();
    ctx.moveTo(-22, -44);
    ctx.quadraticCurveTo(-25, -98, 0, -98);
    ctx.quadraticCurveTo(25, -98, 22, -44);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#b8c6de';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // The visor.
    ctx.fillStyle = '#101a30';
    ctx.beginPath();
    ctx.ellipse(0, -74, 17, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = state.accent;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // A sweep of reflection, and a readout line that reacts to the pose.
    const glass = ctx.createLinearGradient(-17, -86, 12, -62);
    glass.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    glass.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
    glass.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = glass;
    ctx.beginPath();
    ctx.ellipse(0, -74, 17, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = state.accent;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    const amp = state.mouth > 0.5 ? 4 : 1.6 + Math.abs(state.brow) * 0.5;
    for (let i = 0; i <= 12; i += 1) {
      const px = -11 + i * 1.9;
      const py = -71 + Math.sin(i * 0.9 + state.now / 180) * amp;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Filter cartridge at the jaw.
    ctx.fillStyle = '#c3d0e6';
    roundBox(ctx, -8, -58, 16, 8, 3);
    ctx.fill();
    ctx.fillStyle = '#8fa2c0';
    for (let i = 0; i < 3; i += 1) ctx.fillRect(-5 + i * 4, -56, 2, 4);
  },
};

export const DOCTOR_IDS = Object.freeze(Object.keys(DOCTORS));
