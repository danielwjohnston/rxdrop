import { ERAS, eraFor } from './eras.js';

/**
 * Fine-grained presentation periods layered over the five stable Formulary eras.
 *
 * `id` deliberately stays equal to the chapter id so paletteFor() and saved
 * Formulary data keep working. `visualId` is the finer art/music identity.
 */
const PERIODS = [
  {
    visualId: 'stone-healer', chapter: 'protomedicine', from: 0,
    name: 'Paleolithic Healer', period: 'before 10,000 BCE',
    subtitle: 'Firelight, ochre, gathered plants', doctor: 'shaman', music: 'stone',
    accent: '#e2a14e', backdrop: ['#321b10', '#0d0a09'],
    vessel: { shoulder: 0.92, radius: 1.18, neckWidth: 2.2, spout: 1.18, cap: 'wax', surface: 'clay' },
    virus: { arms: 5, armShape: 'blob', bodyShape: 'lumpy' },
    ui: { panel: 'rgba(48, 29, 19, .82)', edge: 'rgba(226, 161, 78, .34)', dim: '#c7aa86', warm: '#f2c76f' },
    note: { place: 'Long before written medicine', text: 'The first pharmacy is memory: which bark eased pain, which leaf made a wound worse, which ritual helped a frightened patient endure the night.' },
  },
  {
    visualId: 'egyptian-swnw', chapter: 'protomedicine', from: 2,
    name: 'Egyptian Swnw', period: 'c. 1550 BCE',
    subtitle: 'Papyrus, linen and measured remedies', doctor: 'physician', music: 'nile',
    accent: '#d7b44f', backdrop: ['#17363d', '#08191d'],
    vessel: { shoulder: 0.74, radius: 0.9, neckWidth: 2.4, spout: 1.22, cap: 'stopper', surface: 'glass' },
    virus: { arms: 6, armShape: 'blob', bodyShape: 'lumpy' },
    ui: { panel: 'rgba(18, 50, 55, .82)', edge: 'rgba(215, 180, 79, .36)', dim: '#b9c9bd', warm: '#edd779' },
    note: { place: 'Nile Valley, second millennium BCE', text: 'Remedies move from memory into writing. Symptoms, ingredients and procedures can now outlive the person who first observed them.' },
  },
  {
    visualId: 'hippocratic', chapter: 'apothecary', from: 4,
    name: 'Hippocratic Physician', period: 'c. 400 BCE',
    subtitle: 'Bedside observation and case history', doctor: 'physician', music: 'aegean',
    accent: '#dac993', backdrop: ['#302d2a', '#111110'],
    vessel: { shoulder: 0.62, radius: 0.82, neckWidth: 2.45, spout: 1.18, cap: 'stopper', surface: 'glass' },
    virus: { arms: 6, armShape: 'blob', bodyShape: 'round' },
    ui: { panel: 'rgba(44, 41, 37, .84)', edge: 'rgba(218, 201, 147, .34)', dim: '#beb6a6', warm: '#e9d79e' },
    note: { place: 'Classical Greece', text: 'The patient becomes a story observed over time: appetite, sleep, fever, stool, weather, crisis. Care grows more systematic even while the theory remains imperfect.' },
  },
  {
    visualId: 'bimaristan', chapter: 'apothecary', from: 6,
    name: 'Bimaristan Physician', period: 'c. 1000 CE',
    subtitle: 'Hospitals, pharmacy and scholarship', doctor: 'physician', music: 'bimaristan',
    accent: '#63c7b5', backdrop: ['#173e39', '#081a1a'],
    vessel: { shoulder: 0.44, radius: 0.68, neckWidth: 2.7, spout: 1.08, cap: 'stopper', surface: 'glass' },
    virus: { arms: 7, armShape: 'blob', bodyShape: 'round' },
    ui: { panel: 'rgba(18, 56, 51, .84)', edge: 'rgba(99, 199, 181, .34)', dim: '#a9c9c0', warm: '#dbcb78' },
    note: { place: 'Baghdad and the great medieval hospitals', text: 'Medicine becomes institutional: wards, teaching, pharmacies, translated texts and new observation gathered under one roof instead of one practitioner.' },
  },
  {
    visualId: 'barber-surgeon', chapter: 'patent', from: 8,
    name: 'Barber-Surgeon', period: 'c. 1500',
    subtitle: 'Steel tools, anatomy and practical hands', doctor: 'quack', music: 'guild',
    accent: '#c66b4d', backdrop: ['#382116', '#160d09'],
    vessel: { shoulder: 0.36, radius: 0.67, neckWidth: 2.45, spout: 1.14, cap: 'cork', surface: 'glass' },
    virus: { arms: 6, armShape: 'spike', bodyShape: 'round' },
    ui: { panel: 'rgba(57, 33, 23, .84)', edge: 'rgba(198, 107, 77, .38)', dim: '#c6aa9c', warm: '#e5b574' },
    note: { place: 'Europe, early sixteenth century', text: 'Anatomy is becoming something seen rather than inherited from a book. Surgery is direct, dangerous, skilled work performed long before anesthesia or antisepsis.' },
  },
  {
    visualId: 'plague-physician', chapter: 'patent', from: 10,
    name: 'Plague Physician', period: 'c. 1656',
    subtitle: 'Waxed coat, aromatic beak, quarantine', doctor: 'plague', music: 'plague',
    accent: '#8f9db8', backdrop: ['#1b1d25', '#07080c'],
    vessel: { shoulder: 0.2, radius: 0.52, neckWidth: 2.75, spout: 1.1, cap: 'stopper', surface: 'glass' },
    virus: { arms: 7, armShape: 'spike', bodyShape: 'round' },
    ui: { panel: 'rgba(23, 25, 33, .88)', edge: 'rgba(143, 157, 184, .34)', dim: '#a2adbf', warm: '#cabd8b' },
    note: { place: 'Europe, seventeenth century', text: 'The famous beaked costume belongs to the early modern plague physician, not the Black Death itself. The theory of bad air is wrong; separating the sick can still be useful.' },
  },
  {
    visualId: 'patent-showman', chapter: 'pharmaceutical', from: 12,
    name: 'Patent-Medicine Showman', period: 'c. 1880',
    subtitle: 'Brass labels, tonics and audacious claims', doctor: 'quack', music: 'showman',
    accent: '#df843f', backdrop: ['#3b260f', '#160e07'],
    vessel: { shoulder: 0.45, radius: 0.7, neckWidth: 2.1, spout: 1.5, cap: 'cork', surface: 'embossed' },
    virus: { arms: 6, armShape: 'spike', bodyShape: 'round' },
    ui: { panel: 'rgba(59, 38, 18, .86)', edge: 'rgba(223, 132, 63, .42)', dim: '#cbb083', warm: '#f0bd58' },
    note: { place: 'North America, late nineteenth century', text: 'Industrial manufacturing can bottle hope faster than evidence can test it. A beautiful label and a testimonial remain poor substitutes for a controlled result.' },
  },
  {
    visualId: 'germ-theory', chapter: 'pharmaceutical', from: 14,
    name: 'Germ-Theory Surgeon', period: 'c. 1895',
    subtitle: 'Antisepsis, microscopy and sterile technique', doctor: 'physician', music: 'asepsis',
    accent: '#79c8d7', backdrop: ['#16333b', '#081419'],
    vessel: { shoulder: 0.28, radius: 0.72, neckWidth: 2.55, spout: 1.08, cap: 'cap', surface: 'glass' },
    virus: { arms: 6, armShape: 'blob', bodyShape: 'round' },
    ui: { panel: 'rgba(18, 46, 53, .86)', edge: 'rgba(121, 200, 215, .36)', dim: '#aac7cc', warm: '#d9d38d' },
    note: { place: 'The antiseptic operating theatre', text: 'Once microbes become a mechanism rather than a vague corruption, cleanliness changes meaning. Washing hands and instruments becomes an intervention against an identified enemy.' },
  },
  {
    visualId: 'antibiotic-era', chapter: 'pharmaceutical', from: 16,
    name: 'Antibiotic-Era Physician', period: 'c. 1945',
    subtitle: 'Culture plates, penicillin and the arms race', doctor: 'physician', music: 'penicillin',
    accent: '#8bd6ff', backdrop: ['#141d3a', '#090d1c'],
    vessel: { shoulder: 0.3, radius: 0.9, neckWidth: 2.6, spout: 1.1, cap: 'cap', surface: 'plastic' },
    virus: { arms: 6, armShape: 'blob', bodyShape: 'round' },
    ui: { panel: 'rgba(18, 27, 58, .84)', edge: 'rgba(139, 214, 255, .30)', dim: '#91a8cf', warm: '#ffd66e' },
    note: { place: 'Hospital medicine, mid twentieth century', text: 'A bacterial infection can suddenly have a specific chemical answer. The victory creates its own pressure: every surviving organism is a lesson in how to resist the drug.' },
  },
  {
    visualId: 'molecular-lab', chapter: 'genetic', from: 18,
    name: 'Molecular Researcher', period: 'c. 1985',
    subtitle: 'DNA, receptors and targeted mechanisms', doctor: 'technician', music: 'molecular',
    accent: '#77c6ff', backdrop: ['#11263c', '#07101b'],
    vessel: { shoulder: 0.13, radius: 0.45, neckWidth: 3.05, spout: 0.95, cap: 'ring', surface: 'cryo' },
    virus: { arms: 6, armShape: 'spike', bodyShape: 'hex' },
    ui: { panel: 'rgba(14, 36, 58, .86)', edge: 'rgba(119, 198, 255, .34)', dim: '#9db8d0', warm: '#cfdc82' },
    note: { place: 'The molecular laboratory', text: 'Disease is increasingly described as pathway, receptor, sequence and target. Treatment becomes less about the organ alone and more about the mechanism underneath it.' },
  },
  {
    visualId: 'precision-clinic', chapter: 'genetic', from: 20,
    name: 'Precision Clinician', period: 'near future',
    subtitle: 'Sequencing, programmable therapy and feedback', doctor: 'technician', music: 'genomic',
    accent: '#bd91ff', backdrop: ['#1d153c', '#080715'],
    vessel: { shoulder: 0.04, radius: 0.34, neckWidth: 3.4, spout: 0.88, cap: 'ring', surface: 'cryo' },
    virus: { arms: 6, armShape: 'spike', bodyShape: 'hex' },
    ui: { panel: 'rgba(29, 20, 62, .86)', edge: 'rgba(189, 145, 255, .34)', dim: '#b0a5cc', warm: '#d9c8ff' },
    note: { place: 'The precision clinic', text: 'The loop is closing: measure the patient, choose a target, watch the response, revise. The tools are new; the ancient problem remains the same — living systems adapt.' },
  },
];

export const VISUAL_PERIODS = Object.freeze(PERIODS.map((period) => {
  const chapter = ERAS.find((era) => era.id === period.chapter) ?? eraFor(period.from);
  return Object.freeze({
    ...chapter,
    ...period,
    // Keep the stable era id for palette lookup and any code that treats an
    // era id as durable data. The finer identity lives beside it.
    id: chapter.id,
    tint: chapter.tint,
  });
}));

export function periodFor(level) {
  let found = VISUAL_PERIODS[0];
  for (const period of VISUAL_PERIODS) if (level >= period.from) found = period;
  return found;
}

export const entersPeriod = (level) => VISUAL_PERIODS.some((period) => period.from === level);
