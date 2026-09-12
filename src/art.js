export const PRACTITIONER_POSES = Object.freeze(['idle', 'toss', 'cheer', 'worry']);

export const POSE_MOTION = Object.freeze({
  idle: Object.freeze({ lean: 0, lift: 0 }),
  toss: Object.freeze({ lean: -0.09, lift: -2.5 }),
  cheer: Object.freeze({ lean: 0.04, lift: -4.5 }),
  worry: Object.freeze({ lean: 0.06, lift: 1.5 }),
});

export const practitionerSpriteUrl = (doctor, pose) =>
  `./assets/practitioners/${doctor}-${pose}.png`;

/**
 * Starts loading every practitioner sprite; resolves once all have settled.
 * Failures are recorded, never thrown.
 */
export function loadPractitionerArt(doctorIds, { createImage = () => new Image() } = {}) {
  const art = new Map();
  const loads = [];

  for (const doctor of doctorIds) {
    for (const pose of PRACTITIONER_POSES) {
      const key = `${doctor}/${pose}`;
      loads.push(
        new Promise((resolve) => {
          let image;
          try {
            image = createImage();
          } catch {
            resolve();
            return;
          }
          if (!image) {
            resolve();
            return;
          }
          try {
            image.onload = () => {
              art.set(key, image);
              resolve();
            };
            image.onerror = () => resolve();
            image.onabort = () => resolve();
            image.src = practitionerSpriteUrl(doctor, pose);
          } catch {
            resolve();
          }
        }),
      );
    }
  }

  return Promise.all(loads).then(() => art);
}

export function practitionerSprite(art, doctor, pose) {
  if (!doctor) return null;
  return art.get(`${doctor}/${pose}`) ?? art.get(`${doctor}/idle`) ?? null;
}
