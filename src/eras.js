/**
 * Apothecary Through Time.
 *
 * The twenty levels run through ten eras of medicine, from mud and herb paste
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
    period: 'before 3000 BCE',
    subtitle: 'Ochre, herb paste and hope',
    doctor: 'shaman',
    accent: '#d9a05b',
    backdrop: ['#2a1c14', '#150f0d'],
    tint: { saturation: 66, lightness: 57 },
    vessel: { shoulder: 0.85, radius: 1.15, neckWidth: 2.2, spout: 1.2, cap: 'wax', surface: 'clay' },
    virus: { arms: 5, armShape: 'blob', bodyShape: 'lumpy' },
    note: {
      place: 'A cave mouth, before writing',
      text: 'The paste of crushed leaves quiets the fever in some and not in others. '
        + 'I cannot say which, nor why, and so I make more of it.',
    },
  },
  {
    id: 'egyptian',
    from: 2,
    name: 'The Swnw',
    period: '2600 - 1000 BCE',
    subtitle: 'Papyrus, linen and measured remedies',
    doctor: 'swnw',
    accent: '#d7b44f',
    backdrop: ['#17363d', '#08191d'],
    tint: { saturation: 74, lightness: 58 },
    vessel: { shoulder: 0.74, radius: 0.9, neckWidth: 2.4, spout: 1.22, cap: 'stopper', surface: 'clay' },
    virus: { arms: 6, armShape: 'blob', bodyShape: 'lumpy' },
    note: {
      place: 'Thebes, c. 1550 BCE',
      text: 'I have copied the remedy onto the roll: the plant, the measure, the days. '
        + 'The next swnw need not remember me to use it.',
    },
  },
  {
    id: 'hippocratic',
    from: 4,
    name: 'Hippocratic',
    period: '450 BCE - 200 CE',
    subtitle: 'Four humours, and a case written down',
    doctor: 'hippocratic',
    accent: '#dac993',
    backdrop: ['#302d2a', '#111110'],
    tint: { saturation: 72, lightness: 60 },
    vessel: { shoulder: 0.62, radius: 0.82, neckWidth: 2.45, spout: 1.18, cap: 'stopper', surface: 'clay' },
    virus: { arms: 6, armShape: 'blob', bodyShape: 'round' },
    note: {
      place: 'Kos, c. 400 BCE',
      text: 'Fourth day: the fever broke at dawn, as it did in the fisherman last spring. '
        + 'I write the days down because the days, not the gods, are what repeat.',
    },
  },
  {
    id: 'bimaristan',
    from: 6,
    name: 'The Bimaristan',
    period: '800 - 1200',
    subtitle: 'Wards, pharmacies and translated books',
    doctor: 'bimaristan',
    accent: '#63c7b5',
    backdrop: ['#173e39', '#081a1a'],
    tint: { saturation: 78, lightness: 60 },
    vessel: { shoulder: 0.44, radius: 0.68, neckWidth: 2.7, spout: 1.08, cap: 'stopper', surface: 'glass' },
    virus: { arms: 7, armShape: 'blob', bodyShape: 'round' },
    note: {
      place: 'Baghdad, c. 1000',
      text: 'Hung meat in four quarters of the city and built the hospital where it spoiled slowest. '
        + 'The Greeks are on the shelf beside us, translated. We add to them.',
    },
  },
  {
    id: 'apothecary',
    from: 8,
    name: 'The Apothecary',
    period: '1231 - 1600',
    subtitle: 'Mortar, theriac and the drug jar',
    doctor: 'apothecary',
    accent: '#c9a26a',
    backdrop: ['#2e2416', '#130f0a'],
    tint: { saturation: 78, lightness: 59 },
    vessel: { shoulder: 0.5, radius: 0.72, neckWidth: 2.5, spout: 1.15, cap: 'cork', surface: 'glass' },
    virus: { arms: 6, armShape: 'blob', bodyShape: 'round' },
    note: {
      place: 'Florence, 1420',
      text: 'The Emperor split us from the physicians two centuries ago: they prescribe, we grind. '
        + 'The theriac has sixty ingredients. I could not tell you which one works.',
    },
  },
  {
    id: 'plague',
    from: 10,
    name: 'The Plague Years',
    period: '1619 - 1799',
    subtitle: 'Waxed coat, aromatic beak, quarantine',
    doctor: 'plague',
    accent: '#6f9fd8',
    backdrop: ['#1a2338', '#0c1018'],
    tint: { saturation: 80, lightness: 59 },
    vessel: { shoulder: 0.18, radius: 0.5, neckWidth: 3, spout: 1.15, cap: 'stopper', surface: 'glass' },
    virus: { arms: 7, armShape: 'spike', bodyShape: 'round' },
    note: {
      place: 'Marseille, 1720',
      text: 'The beak is packed with rosemary and clove against the bad air. '
        + 'I do not know that it answers. I know that I am still here to write.',
    },
  },
  {
    id: 'patent',
    from: 12,
    name: 'Patent Medicine',
    period: '1800 - 1906',
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
    id: 'antisepsis',
    from: 14,
    name: 'Germ Theory',
    period: '1867 - 1927',
    subtitle: 'Carbolic spray, the microscope, a named enemy',
    doctor: 'surgeon',
    accent: '#79c8d7',
    backdrop: ['#16333b', '#081419'],
    tint: { saturation: 90, lightness: 61 },
    vessel: { shoulder: 0.28, radius: 0.72, neckWidth: 2.55, spout: 1.08, cap: 'cap', surface: 'glass' },
    virus: { arms: 6, armShape: 'blob', bodyShape: 'round' },
    note: {
      place: 'Glasgow, 1867',
      text: 'Carbolic on the wound, the instruments and the hands. The ward smells of tar and the '
        + 'compound fractures are living. Pasteur was right: it is not the air, it is what is in it.',
    },
  },
  {
    id: 'pharmaceutical',
    from: 16,
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
    from: 18,
    name: 'Genomic Medicine',
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

export const DEFAULT_ERA = ERAS.find((era) => era.id === 'pharmaceutical');

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
    const resolved = ERAS.find((e) => e.id === key) ?? DEFAULT_ERA;
    const all = [...HUES, ...HYBRID_HUES];
    paletteCache.set(key, Object.freeze(all.map((hue) => tone(hue, resolved.tint))));
  }
  return paletteCache.get(key);
}

/** Shorthand for the palette at a level. */
export const paletteForLevel = (level) => paletteFor(eraFor(level));
