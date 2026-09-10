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
 * observations of one phenomenon across five eras of medicine, which is what a
 * case book actually looks like and gives every line here a reason to exist.
 *
 * Nothing in here changes the rules. It reads the events the game already
 * emits and writes to localStorage; with storage unavailable it degrades to a
 * notebook that forgets between runs, which is worth having anyway.
 */

/**
 * The discoveries, in the order they are worth finding. `what` is era-neutral
 * and says what you did. `notes` is the same observation in five voices.
 */
export const DISCOVERIES = Object.freeze([
  Object.freeze({
    id: 'cascade',
    title: 'A chain reaction',
    what: 'A clear that knocked loose the halves for another one.',
    notes: Object.freeze({
      protomedicine: 'One good thing made another good thing. I did not plan the second.',
      apothecary: 'The remedy worked twice from a single dose. I have written the hour down.',
      patent: 'Two cures for the price of one. That line is going straight on the label.',
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
      apothecary: 'The tincture rolls off it like water off wax. The dose was right. It did not matter.',
      patent: 'Sold him the same bottle he swore by last spring. He came back angrier.',
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
      apothecary: 'What the apothecary before me used, and what I thought myself above using.',
      patent: 'Dug out the old formula. Sells worse. Works better. There is a lesson there I will ignore.',
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
      apothecary: 'The contagion has married the remedy. I do not have a word for what is in the jar.',
      patent: 'Whatever this is, I did not sell it to him. He got it from something I sold him.',
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
      apothecary: 'Two simples where one would not serve. The compound is the cure, not the parts.',
      patent: 'Mixed the two that failed separately. Charged for both. It actually worked.',
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
      apothecary: 'The two met while both were still working. What followed I did not administer.',
      patent: 'Whatever happened there, I could retire on it if I could do it twice.',
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
      apothecary: 'It moves from the sick to the well without touching the road between.',
      patent: 'Business has never been better and I have never slept worse.',
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
      apothecary: 'By feel, and by memory of where I set the jars down. It answered anyway.',
      patent: 'Lamp oil ran out mid-consultation. He never noticed. I am not proud of that.',
      pharmaceutical: 'Power cut at the bench. Finished the plate from memory and the plate was right.',
      genetic: 'No readout, no assay. Ran it off the last state I had and it held.',
    }),
  }),
  Object.freeze({
    id: 'washed',
    title: 'The bad batch, carried off',
    what: 'An inert half washed out with a clear it was touching.',
    notes: Object.freeze({
      protomedicine: 'The dead paste went with the living paste. Better there than underfoot.',
      apothecary: 'The adulterated jar is gone, taken out with a dose that worked.',
      patent: 'Half my stock is coloured water. The trick is where you put it.',
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
      apothecary: 'The house was shut up with a cross on the door. I have taken the cross down.',
      patent: 'They roped off a whole street. Bad for trade. I worked the street next to it.',
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
