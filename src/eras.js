/**
 * Apothecary Through Time.
 *
 * The twenty levels run through five eras of medicine, from mud and herb paste
 * to sequenced therapy. Each era changes the vessel, the light, the shape of
 * the viruses and the physician holding the capsules - but never the rules, and
 * never the legibility of the three colours.
 *
 * That last point is the constraint everything here answers to. The three
 * medicine colours keep their hues in every era; an era shifts saturation,
 * lightness and surface, and does its real work in the glassware and the art
 * around them. A beautiful sepia palette that makes level 2 harder to read than
 * level 20 would be a worse game, however good the screenshot looked.
 */

/**
 * The hue of each medicine, in degrees, fixed for the life of the game.
 * Red, yellow, blue - roughly 45 degrees apart at the tightest, which is what
 * keeps them apart for colour-blind players as well as everyone else.
 */
export const HUES = Object.freeze([4, 46, 202]);

/**
 * Hybrid hues, in the order of HYBRIDS: orange, green, purple. They sit between
 * their parents on the wheel, which is what a combination should look like -
 * but the renderer does not lean on hue alone. A hybrid is drawn split down the
 * middle in BOTH parent colours, so it reads as two medicines fused rather than
 * as a fourth one, and stays legible for players who cannot separate the hues.
 */
export const HYBRID_HUES = Object.freeze([24, 128, 286]);

const hsl = (h, s, l) => `hsl(${h}, ${Math.round(s)}%, ${Math.round(l)}%)`;

/** Builds the four tones the renderer needs for one medicine in one era. */
function tone(hue, { saturation, lightness }) {
  return Object.freeze({
    base: hsl(hue, saturation, lightness),
    light: hsl(hue, saturation * 0.86, Math.min(94, lightness + 22)),
    dark: hsl(hue, Math.min(100, saturation * 1.08), Math.max(12, lightness - 30)),
    glow: hsl(hue, saturation, Math.min(90, lightness + 14)),
  });
}

/**
 * The eras, in order. `from` is the first level in the band; the last era runs
 * to the end. Everything else is presentation.
 */
export const ERAS = Object.freeze([
  {
    id: 'protomedicine',
    from: 0,
    name: 'Protomedicine',
    period: 'before record',
    subtitle: 'Mud, herb paste and hope',
    doctor: 'shaman',
    accent: '#d9a05b',
    backdrop: ['#2a1c14', '#150f0d'],
    tint: { saturation: 66, lightness: 57 },
    vessel: { shoulder: 0.85, radius: 1.15, neckWidth: 2.2, spout: 1.2, cap: 'wax', surface: 'clay' },
    virus: { arms: 5, armShape: 'blob', bodyShape: 'lumpy' },
    note: {
      place: 'A cave mouth, no date',
      text: 'The paste of crushed leaves quiets the fever in some and not in others. '
        + 'I cannot say which, nor why, and so I make more of it.',
    },
  },
  {
    id: 'apothecary',
    from: 4,
    name: 'The Apothecary',
    period: '1347 - 1799',
    subtitle: 'Tinctures, theriac and a beaked mask',
    doctor: 'plague',
    accent: '#6f9fd8',
    backdrop: ['#1a2338', '#0c1018'],
    tint: { saturation: 80, lightness: 59 },
    vessel: { shoulder: 0.18, radius: 0.5, neckWidth: 3, spout: 1.15, cap: 'stopper', surface: 'glass' },
    virus: { arms: 7, armShape: 'blob', bodyShape: 'round' },
    note: {
      place: 'Marseille, 1348',
      text: 'The beak is packed with rosemary and clove against the bad air. '
        + 'I do not know that it answers. I know that I am still here to write.',
    },
  },
  {
    id: 'patent',
    from: 8,
    name: 'Patent Medicine',
    period: '1800 - 1905',
    subtitle: 'Elixirs, tonics and outright snake oil',
    doctor: 'quack',
    accent: '#e0803c',
    backdrop: ['#33220f', '#160f08'],
    tint: { saturation: 96, lightness: 62 },
    vessel: { shoulder: 0.45, radius: 0.7, neckWidth: 2.1, spout: 1.5, cap: 'cork', surface: 'embossed' },
    virus: { arms: 6, armShape: 'spike', bodyShape: 'round' },
    note: {
      place: 'St. Louis, 1889',
      text: 'Sold nine hundred bottles of the Restorative this month. '
        + 'It is chiefly grain spirit. The testimonials are genuine, which troubles me most.',
    },
  },
  {
    id: 'pharmaceutical',
    from: 12,
    name: 'Pharmaceutical',
    period: '1928 - 1999',
    subtitle: 'The mould, the capsule, the arms race',
    doctor: 'physician',
    accent: '#8bd6ff',
    backdrop: ['#141d3a', '#0a0d1c'],
    tint: { saturation: 100, lightness: 63 },
    vessel: { shoulder: 0.3, radius: 0.9, neckWidth: 2.6, spout: 1.1, cap: 'cap', surface: 'plastic' },
    virus: { arms: 6, armShape: 'blob', bodyShape: 'round' },
    note: {
      place: 'London, 1945',
      text: 'The mould answers where nothing answered before. '
        + 'It will not answer forever - starve them of it and they come back changed. '
        + 'Underdose them and you are teaching them.',
    },
  },
  {
    id: 'genetic',
    from: 16,
    name: 'Gene Therapy',
    period: '2000 - onward',
    subtitle: 'Sequenced, printed, delivered',
    doctor: 'technician',
    accent: '#b98cff',
    backdrop: ['#1b1436', '#0b0818'],
    tint: { saturation: 92, lightness: 66 },
    vessel: { shoulder: 0.05, radius: 0.35, neckWidth: 3.4, spout: 0.9, cap: 'ring', surface: 'cryo' },
    virus: { arms: 6, armShape: 'spike', bodyShape: 'hex' },
    note: {
      place: 'Cambridge, 2021',
      text: 'We can read it now, and write it, and have it in an arm by Thursday. '
        + 'The cave paste and this vial are the same argument, several thousand years apart: '
        + 'it adapts, so we adapt faster.',
    },
  },
]);

/**
 * The era a level belongs to. Total over every integer level - anything below
 * the first band gets the first era, anything past the last gets the last.
 */
export function eraFor(level) {
  let found = ERAS[0];
  for (const era of ERAS) if (level >= era.from) found = era;
  return found;
}

/** True the first time a level enters a new era, which is when the note shows. */
export function entersEra(level) {
  return ERAS.some((era) => era.from === level);
}

const paletteCache = new Map();

/** The three medicine tones for an era, in colour-id order. Cached per era. */
export function paletteFor(era) {
  const key = era?.id ?? 'pharmaceutical';
  if (!paletteCache.has(key)) {
    const resolved = ERAS.find((e) => e.id === key) ?? ERAS[3];
    const all = [...HUES, ...HYBRID_HUES];
    paletteCache.set(key, Object.freeze(all.map((hue) => tone(hue, resolved.tint))));
  }
  return paletteCache.get(key);
}

/** Shorthand for the palette at a level. */
export const paletteForLevel = (level) => paletteFor(eraFor(level));
