/**
 * The physician's formulary: a notebook that fills in as you play.
 *
 * It records interactions you have TRIGGERED, never ones you have read about.
 * That distinction is the whole feature. A list of mechanics on a help screen
 * is documentation; a page that was blank until you made a hybrid come apart is
 * evidence that you did it.
 *
 * Each discovery collects a note per era. You see the note from the era you
 * were in when you found it, and finding the same thing again somewhere else on
 * the ladder adds that era's note beside it - so the notebook accumulates
 * observations of one phenomenon across ten eras of medicine, which is what a
 * case book actually looks like and gives every line here a reason to exist.
 *
 * Nothing in here changes the rules. It reads the events the game already
 * emits and writes to localStorage; with storage unavailable it degrades to a
 * notebook that forgets between runs, which is worth having anyway.
 */

/**
 * The discoveries, in the order they are worth finding. `what` is era-neutral
 * and says what you did. `notes` is the same observation in ten voices.
 */
export const DISCOVERIES = Object.freeze([
  Object.freeze({
    id: 'cascade',
    title: 'A chain reaction',
    what: 'A clear that knocked loose the halves for another one.',
    notes: Object.freeze({
      protomedicine: 'One good thing made another good thing. I did not plan the second.',
      egyptian: 'One remedy loosened what the next one needed. I have drawn both on the same line of the roll.',
      hippocratic: 'The first crisis brought on the second. Nature did the work; I only watched the days.',
      bimaristan: 'One draught settled the ward, and the settling cleared the bed beside it. Recorded for the students.',
      apothecary: 'The remedy worked twice from a single dose. I have written the hour down.',
      plague: 'Where one house emptied, the next fell quiet without my going in. I do not trust it, but I wrote it down.',
      patent: 'Two cures for the price of one. That line is going straight on the label.',
      antisepsis: 'Clean one wound and the next one drains on its own. Sepsis was a chain; I have found where it links.',
      pharmaceutical: 'The collapse propagated. Worth designing for rather than hoping for.',
      genetic: 'Cascade confirmed. The second clear came free out of the first one settling.',
    }),
  }),
  Object.freeze({
    id: 'tolerance',
    title: 'The medicine that stopped working',
    what: 'A virus shrugged off a run of its own colour.',
    notes: Object.freeze({
      protomedicine: 'The same paste. The same fever. It does nothing now. It did something before.',
      egyptian: 'The same measure of the same plant, and the fever does not move. The roll does not say why.',
      hippocratic: 'The humour has gone stubborn. Purge and diet that worked in spring do nothing in autumn.',
      bimaristan: 'Al-Razi warned of this: the body grows used to the drug and the drug grows useless to the body.',
      apothecary: 'The tincture rolls off it like water off wax. The dose was right. It did not matter.',
      plague: 'The vinegar, the clove, the beak - none of it holds this house. Whatever it is, it has learned us.',
      patent: 'Sold him the same bottle he swore by last spring. He came back angrier.',
      antisepsis: 'The organism thrives in the carbolic now. I have watched it under the lens. It is not the same beast it was.',
      pharmaceutical: 'Underdose them and you are teaching them. This one has learned the lesson.',
      genetic: 'Resistant. The target is still there; the drug just no longer binds it.',
    }),
  }),
  Object.freeze({
    id: 'collateral',
    title: 'The older medicine',
    what: 'Killed a tolerant virus with the drug it never built a defence against.',
    notes: Object.freeze({
      protomedicine: 'The old root, the one we stopped digging. It works on the ones the new one cannot touch.',
      egyptian: 'The old bitter root the elders used before the scroll was written. It reaches what the new one cannot.',
      hippocratic: 'Returned to the hellebore my teacher abandoned. The stubborn humour yielded to it at once.',
      bimaristan: 'A simple from the Greek shelf, out of fashion for centuries, and the hardened case answers it.',
      apothecary: 'What the apothecary before me used, and what I thought myself above using.',
      plague: 'A country receipt, older than the college, did what the college receipts would not.',
      patent: 'Dug out the old formula. Sells worse. Works better. There is a lesson there I will ignore.',
      antisepsis: 'The strain that laughs at carbolic dies in plain boric. It gave up one defence to buy the other.',
      pharmaceutical: 'Collateral sensitivity. Buying resistance to one drug can cost them another.',
      genetic: 'Cycling works because the escape mutation opens a door somewhere else.',
    }),
  }),
  Object.freeze({
    id: 'hybrid',
    title: 'A strain that combined',
    what: 'Left capped by the wrong colour too long, a virus became something new.',
    notes: Object.freeze({
      protomedicine: 'It has taken on the colour of the paste I left on it. It is not either thing now.',
      egyptian: 'Two sicknesses in one body have become a third. The roll has no picture for it. I am drawing one.',
      hippocratic: 'Two humours in excess have fused into a complexion I have never seen. I have named the day, not the thing.',
      bimaristan: 'Left too long under the wrong remedy, the illness took on the nature of the remedy. The students are afraid of it.',
      apothecary: 'The contagion has married the remedy. I do not have a word for what is in the jar.',
      plague: 'The pest and the physic have bred. What lies in the bed is neither, and worse than both.',
      patent: 'Whatever this is, I did not sell it to him. He got it from something I sold him.',
      antisepsis: 'A new organism on the plate where two were yesterday. Not a mixture - a species. I have no name.',
      pharmaceutical: 'It did not just resist the compound. It incorporated it.',
      genetic: 'Recombinant. Two lineages in one genome, and no single-agent therapy for it.',
    }),
  }),
  Object.freeze({
    id: 'cure',
    title: 'Both halves of the answer',
    what: 'Took a combined strain apart by delivering both its parent colours.',
    notes: Object.freeze({
      protomedicine: 'Neither leaf alone. Both leaves, and it let go.',
      egyptian: 'Both plants, in the same hour. Neither alone. The roll shall say so in red ink.',
      hippocratic: 'Purged one humour and warmed the other, together. Separate them and the patient is lost.',
      bimaristan: 'A compound of both parents, as Ibn Sina would prescribe: the compound answers where the simples do not.',
      apothecary: 'Two simples where one would not serve. The compound is the cure, not the parts.',
      plague: 'Two receipts at once. The college would strike me from the roll, and the house is standing.',
      patent: 'Mixed the two that failed separately. Charged for both. It actually worked.',
      antisepsis: 'Attacked both parents on the same plate and the hybrid collapsed. Combination is the whole method.',
      pharmaceutical: 'Combination therapy. What it has an answer for singly it has none for together.',
      genetic: 'Dual-target. It cannot escape both without losing what makes it viable.',
    }),
  }),
  Object.freeze({
    id: 'antibody',
    title: 'The compound it has no answer to',
    what: 'Both parents in one cascade, and what that made took the ring with it.',
    notes: Object.freeze({
      protomedicine: 'Something came out of the mixing that was in neither of them. It spread outward on its own.',
      egyptian: 'The two remedies met in the jar and made a third that cleared the house of it entirely.',
      hippocratic: 'Two treatments in one crisis and the body threw off the whole disorder at once. I have no theory. I have the day.',
      bimaristan: 'The compound formed on the ward, not in the pharmacy, and took the whole fever with it.',
      apothecary: 'The two met while both were still working. What followed I did not administer.',
      plague: 'Both physics working at once in one body, and the pest around it went out like a candle.',
      patent: 'Whatever happened there, I could retire on it if I could do it twice.',
      antisepsis: 'The two cultures met on the plate and what they made killed everything in the ring. Antitoxin, or something like it.',
      pharmaceutical: 'Synergy, not addition. The pair does something neither of them does.',
      genetic: 'Antibody synthesised. It found the neighbours without being aimed at them.',
    }),
  }),
  Object.freeze({
    id: 'outbreak',
    title: 'It spread',
    what: 'Watched a virus replicate into the space beside it.',
    notes: Object.freeze({
      protomedicine: 'There is one more than there was. Nobody brought it in.',
      egyptian: 'It went from the one bed to the next without a hand between them. I have set the beds apart.',
      hippocratic: 'From the sailor to his brother to the wife of the brother. It moves as a thing moves, not as a mood.',
      bimaristan: 'One case in the ward at dawn, three by night. We have moved the well to the far courtyard.',
      apothecary: 'It moves from the sick to the well without touching the road between.',
      plague: 'From the sick house to the well house without touching the road between. The quarantine is drawn wider.',
      patent: 'Business has never been better and I have never slept worse.',
      antisepsis: 'The organism from bed four is in bed five by morning. On my hands, most likely. Wash again.',
      pharmaceutical: 'The empty bed is not spare capacity. It is the next case.',
      genetic: 'R above one. Every hour of delay costs more than the hour before it.',
    }),
  }),
  Object.freeze({
    id: 'dark',
    title: 'Worked blind',
    what: 'Cleared a run with the lights out.',
    notes: Object.freeze({
      protomedicine: 'The fire went out. My hands knew where the bowl was.',
      egyptian: 'The lamp oil ran out. I mixed by touch and by the smell of each jar. It answered.',
      hippocratic: 'The lamp guttered and I finished the case by what I remembered of the pulse. It held.',
      bimaristan: 'The night ward, no lamp, the remedies known by the shape of their jars. The student was impressed. I was lucky.',
      apothecary: 'By feel, and by memory of where I set the jars down. It answered anyway.',
      plague: 'Candles are dear in a shut city. I dosed the house by feel and memory. It answered anyway.',
      patent: 'Lamp oil ran out mid-consultation. He never noticed. I am not proud of that.',
      antisepsis: 'Gas failed mid-operation. Carried on by touch through the carbolic mist. Wound is clean.',
      pharmaceutical: 'Power cut at the bench. Finished the plate from memory and the plate was right.',
      genetic: 'No readout, no assay. Ran it off the last state I had and it held.',
    }),
  }),
  Object.freeze({
    id: 'phototherapy',
    title: 'Light, delivered',
    what: 'Made a line in the chamber and lit a row of the patient with it.',
    notes: Object.freeze({
      protomedicine: 'I carried the fire closer and the shape of the sickness showed itself.',
      egyptian: 'Laid the sick man in the light of Ra at midday, the affected part bare. The clouding drew back.',
      hippocratic: 'Air and sun, as the Corpus says. The part exposed to the light healed before the part I wrapped.',
      bimaristan: 'A row of beds in the south court, faces to the sun. The scholars argue why. The beds empty faster.',
      apothecary: 'Sunlight through the good glass, held on the affected part. The clouding drew back.',
      plague: 'Sunlight through the good glass, held on the affected part. Something in the light the pest cannot bear.',
      patent: 'Sold it as a lamp cure and it embarrasses me that the lamp cure worked.',
      antisepsis: 'Finsen is right: the light itself kills the organism. A row of the ward lit, and a row of the ward cleared.',
      pharmaceutical: 'Photodynamic. The film over them is not armour against light the way it is against a dose.',
      genetic: 'Biofilm disrupted optically. What the drug could not reach, the wavelength did.',
    }),
  }),
  Object.freeze({
    id: 'washed',
    title: 'The bad batch, carried off',
    what: 'An inert half washed out with a clear it was touching.',
    notes: Object.freeze({
      protomedicine: 'The dead paste went with the living paste. Better there than underfoot.',
      egyptian: 'The spoiled jar went out with the good dose. I did not have to pour it away myself.',
      hippocratic: 'The inert draught was carried off in the same crisis that answered. Nature is tidy when it wants to be.',
      bimaristan: 'A bad batch from the pharmacy, gone with the treatment that worked beside it. Recorded, and the pharmacist spoken to.',
      apothecary: 'The adulterated jar is gone, taken out with a dose that worked.',
      plague: 'The adulterated physic is gone, taken out with a dose that worked. The shut city sells bad physic.',
      patent: 'Half my stock is coloured water. The trick is where you put it.',
      antisepsis: 'The contaminated dressing came away with the clean drain. One less thing on the ward to culture.',
      pharmaceutical: 'Failed lot, cleared with the good one beside it. Log it and move on.',
      genetic: 'Inert payload, flushed on an adjacent event. Waste disposal is part of the protocol.',
    }),
  }),
  Object.freeze({
    id: 'seal',
    title: 'The ward reopened',
    what: 'Broke a quarantine by clearing in the column beside it.',
    notes: Object.freeze({
      protomedicine: 'We kept away from that side of the cave. Today we did not have to.',
      egyptian: 'The house was closed by the priests. I cleared the bed beside it and they let me open the door.',
      hippocratic: 'The island quarantined the ship. A cure in the next berth, and the harbour master unbarred it.',
      bimaristan: 'The locked ward, opened: the cases beside it cleared and the qadi lifted the order.',
      apothecary: 'The house was shut up with a cross on the door. I have taken the cross down.',
      plague: 'The watchman took the cross off the door tonight. The house beside it is clean, and so this one is free.',
      patent: 'They roped off a whole street. Bad for trade. I worked the street next to it.',
      antisepsis: 'The isolation ward reopened. The bed beside it went clean and the matron unlocked the door.',
      pharmaceutical: 'Isolation lifted. You do not open a ward by arguing with it, you clear beside it.',
      genetic: 'Containment released. The lock was never on the column, it was on the work next to it.',
    }),
  }),
]);

export const DISCOVERY_IDS = Object.freeze(DISCOVERIES.map((d) => d.id));

/** The discovery with this id, or undefined. */
export const discoveryFor = (id) => DISCOVERIES.find((d) => d.id === id);

/**
 * Turns one game event into the discoveries it evidences.
 *
 * Deliberately a pure function of the event: the notebook is a reader of the
 * game, never a participant in it, so nothing here can affect a run.
 */
export function discoveriesIn(event) {
  const found = [];
  switch (event.type) {
    case 'clear':
      if (event.combo >= 2) found.push('cascade');
      if (event.collateral > 0) found.push('collateral');
      if (event.cured > 0) found.push('cure');
      if (event.washed > 0) found.push('washed');
      if (event.inTheDark) found.push('dark');
      break;
    case 'lit':
      found.push('phototherapy');
      break;
    case 'resist':
      found.push('tolerance');
      break;
    case 'mutate':
      if (event.hybrids > 0) found.push('hybrid');
      break;
    case 'antibody':
      found.push('antibody');
      break;
    case 'spread':
      found.push('outbreak');
      break;
    case 'unsealed':
      if (event.reason === 'cleared') found.push('seal');
      break;
    default:
      break;
  }
  return found;
}

/**
 * The notebook itself: which discoveries have been made, and in which eras.
 *
 * Shape is `{ [id]: { first: eraId, eras: [eraId, ...] } }`. Kept small and
 * plain so it survives a JSON round trip through localStorage without ceremony.
 */
export class Formulary {
  constructor(found = {}) {
    this.found = {};
    // Rebuilt rather than adopted, so a hand-edited or outdated store cannot
    // put an unknown id or a duplicate era into the notebook.
    for (const id of DISCOVERY_IDS) {
      const entry = found?.[id];
      if (!entry?.first) continue;
      const eras = [...new Set([entry.first, ...(entry.eras ?? [])])];
      this.found[id] = { first: entry.first, eras };
    }
  }

  static from(json) {
    try {
      return new Formulary(JSON.parse(json ?? '{}'));
    } catch {
      return new Formulary();
    }
  }

  toJSON() {
    return this.found;
  }

  has(id) {
    return Boolean(this.found[id]);
  }

  /** How many discoveries have been made at all. */
  get count() {
    return Object.keys(this.found).length;
  }

  /** Notes collected for a discovery, in era-ladder order. */
  notesFor(id, eraOrder) {
    const entry = this.found[id];
    if (!entry) return [];
    return eraOrder.filter((era) => entry.eras.includes(era));
  }

  /**
   * Records a discovery made in an era. Returns what is new: 'discovery' the
   * first time it is found at all, 'note' when it is found again somewhere new
   * on the ladder, and null when there is nothing to say.
   *
   * The caller decides what to do with that - the notebook does not announce
   * itself, because a toast on every clear would be worse than no notebook.
   */
  record(id, era) {
    if (!DISCOVERY_IDS.includes(id) || !era) return null;
    const entry = this.found[id];
    if (!entry) {
      this.found[id] = { first: era, eras: [era] };
      return 'discovery';
    }
    if (entry.eras.includes(era)) return null;
    entry.eras.push(era);
    return 'note';
  }
}
