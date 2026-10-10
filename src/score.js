/**
 * The score: RxDrop's music as data, read the same way by any engine.
 *
 * `docs/score.md` is the contract this file implements. A score is plain JSON
 * (no functions, no classes), so the Web Audio renderer in audio.js and a
 * future Godot one read the same file and must hear the same notes. This
 * module never touches Web Audio, the DOM or a clock: it validates a score,
 * expands its motifs, and answers one question -
 *
 *   realize(score, arrangement, inputs) -> bpm, meter and the notes of each stem
 *
 * for a given set of adaptive inputs. How a stem is voiced, and how the mixer
 * turns an input into sound beyond choosing a variant, belongs to the renderer.
 */

export const SCORE_FORMAT = 'rxdrop-score';
export const SCORE_VERSION = 1;

/** What a stem does in the arrangement. Engines map roles to instruments. */
export const ROLES = Object.freeze(['melody', 'bass', 'harmony', 'percussion', 'texture']);
/** Waveform names, not an API enum: every engine can synthesise these four. */
export const TIMBRES = Object.freeze(['square', 'triangle', 'sawtooth', 'sine']);
/** How a game-to-music input behaves. Only flags and levels can select a variant. */
export const INPUT_KINDS = Object.freeze(['flag', 'level', 'event']);
/** The only transformations a variant may apply. */
export const TRANSFORM_OPS = Object.freeze(['scaleTempo', 'fillRests']);
export const QUANTIZE = Object.freeze(['beat', 'bar']);
/** Per arrangement, defaults included. The tempo bound tries every combination. */
export const MAX_VARIANTS = 8;

const PITCH = /^([A-G])([#b]?)(-?\d)$/;
const SEMITONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const REST = '.';

export class ScoreError extends Error {
  constructor(path, message) {
    super(`${path}: ${message}`);
    this.name = 'ScoreError';
    this.path = path;
  }
}

const fail = (path, message) => {
  throw new ScoreError(path, message);
};
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isWhole = (value) => Number.isInteger(value) && value > 0;
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

/** "A4" -> 69. Throws on anything that is not scientific pitch notation. */
export function pitchToMidi(name, path = 'pitch') {
  const match = typeof name === 'string' ? PITCH.exec(name) : null;
  if (!match) fail(path, `"${name}" is not a pitch like A4, C#5 or Eb3`);
  const [, letter, accidental, octave] = match;
  const shift = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
  return (Number(octave) + 1) * 12 + SEMITONE[letter] + shift;
}

/** 69 -> "A4". Sharps are the canonical spelling of a transposed note. */
export function midiToPitch(midi) {
  return `${SHARP_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

function transposePitch(pitch, semitones) {
  if (pitch === null || semitones === 0) return pitch;
  return midiToPitch(pitchToMidi(pitch) + semitones);
}

/** Total ticks of a list of [pitch, ticks] events. */
const eventTicks = (events) => events.reduce((sum, [, ticks]) => sum + ticks, 0);

function checkEvent(event, path) {
  if (!Array.isArray(event) || event.length !== 2) fail(path, 'an event is [pitch, ticks]');
  const [pitch, ticks] = event;
  if (pitch !== null) pitchToMidi(pitch, path);
  if (!isWhole(ticks)) fail(path, `duration ${ticks} is not a whole number of ticks`);
  return [pitch, ticks];
}

function checkPattern(pattern, kit, path) {
  if (typeof pattern !== 'string' || pattern.length === 0) {
    fail(path, 'a pattern is a non-empty string');
  }
  for (const step of pattern) {
    if (step !== REST && !own(kit, step)) fail(path, `"${step}" is not in the kit`);
  }
  return pattern;
}

function checkRepeat(item, path) {
  const repeat = item.repeat ?? 1;
  if (!isWhole(repeat)) fail(`${path}.repeat`, 'repeat is a whole number');
  return repeat;
}

/** A melodic part: events and motif references, expanded to plain events. */
function expandPart(part, motifs, path) {
  if (!Array.isArray(part) || part.length === 0) fail(path, 'a part is a non-empty list');
  const events = [];
  part.forEach((item, index) => {
    const at = `${path}[${index}]`;
    if (Array.isArray(item)) {
      events.push(checkEvent(item, at));
      return;
    }
    if (!isObject(item) || typeof item.motif !== 'string') {
      fail(at, 'expected [pitch, ticks] or { motif }');
    }
    const motif = motifs[item.motif];
    if (!motif) fail(at, `unknown motif "${item.motif}"`);
    if (!motif.events) fail(at, `motif "${item.motif}" is a rhythm, not a melody`);
    const semitones = item.transpose ?? 0;
    if (!Number.isInteger(semitones)) fail(`${at}.transpose`, 'transpose is whole semitones');
    for (let n = checkRepeat(item, at); n > 0; n -= 1) {
      for (const [pitch, ticks] of motif.events) {
        events.push([transposePitch(pitch, semitones), ticks]);
      }
    }
  });
  return events;
}

/** A percussion pattern: a string, or a list of strings and rhythm motifs. */
function expandPattern(pattern, motifs, kit, path) {
  if (typeof pattern === 'string') return checkPattern(pattern, kit, path);
  if (!Array.isArray(pattern) || pattern.length === 0) {
    fail(path, 'a pattern is a string or a list');
  }
  return pattern
    .map((item, index) => {
      const at = `${path}[${index}]`;
      if (typeof item === 'string') return checkPattern(item, kit, at);
      if (!isObject(item) || typeof item.motif !== 'string') {
        fail(at, 'expected a string or { motif }');
      }
      const motif = motifs[item.motif];
      if (!motif) fail(at, `unknown motif "${item.motif}"`);
      if (motif.pattern === undefined) fail(at, `motif "${item.motif}" is a melody, not a rhythm`);
      return motif.pattern.repeat(checkRepeat(item, at));
    })
    .join('');
}

function parseMeter(meter, ticksPerBeat, path) {
  if (!Array.isArray(meter) || meter.length !== 2) {
    fail(path, 'meter is [beats, unit], e.g. [3, 4]');
  }
  const [beats, unit] = meter;
  if (!isWhole(beats)) fail(path, 'beats per bar is a whole number');
  if (unit !== 4 && unit !== 8) fail(path, 'the beat unit is 4 or 8');
  const barTicks = (beats * ticksPerBeat * 4) / unit;
  if (!Number.isInteger(barTicks)) fail(path, `${beats}/${unit} is not a whole number of ticks`);
  return { meter: [beats, unit], barTicks };
}

/** A stem as written (base or variant override) -> its expanded form. */
function parseStem(stem, context, path, base = null) {
  if (!isObject(stem)) fail(path, 'a stem is an object');
  const role = stem.role ?? base?.role;
  if (!ROLES.includes(role)) fail(`${path}.role`, `role must be one of ${ROLES.join(', ')}`);
  if (base && role !== base.role) {
    fail(`${path}.role`, 'a variant cannot change what a stem is for');
  }
  if (role === 'percussion') {
    if (stem.pattern === undefined && !base) fail(path, 'a percussion stem needs a pattern');
    const pattern =
      stem.pattern === undefined
        ? base.pattern
        : expandPattern(stem.pattern, context.motifs, context.kit, `${path}.pattern`);
    return { role, pattern, ticks: pattern.length };
  }
  const timbre = stem.timbre ?? base?.timbre;
  if (!TIMBRES.includes(timbre)) {
    fail(`${path}.timbre`, `timbre must be one of ${TIMBRES.join(', ')}`);
  }
  if (stem.part === undefined && !base) fail(path, 'a melodic stem needs a part');
  const events =
    stem.part === undefined ? base.events : expandPart(stem.part, context.motifs, `${path}.part`);
  return { role, timbre, events, ticks: eventTicks(events) };
}

function checkBars(stems, barTicks, path) {
  for (const [name, stem] of Object.entries(stems)) {
    if (stem.ticks % barTicks !== 0) {
      fail(`${path}.${name}`, `${stem.ticks} ticks is not a whole number of ${barTicks}-tick bars`);
    }
  }
}

function parseWhen(when, inputs, path) {
  if (!isObject(when) || typeof when.input !== 'string') fail(path, 'when is { input }');
  const input = inputs[when.input];
  if (!input) fail(path, `"${when.input}" is not a declared input`);
  if (input.kind === 'event') {
    fail(path, `"${when.input}" is an event; use a stinger, not a variant`);
  }
  if (input.kind === 'flag') {
    if (own(when, 'atLeast')) fail(path, `"${when.input}" is a flag and has no level`);
    return { input: when.input };
  }
  if (typeof when.atLeast !== 'number' || when.atLeast < 0 || when.atLeast > 1) {
    fail(path, `"${when.input}" is a level; atLeast must be between 0 and 1`);
  }
  return { input: when.input, atLeast: when.atLeast };
}

function parseTransform(transform, path) {
  if (!isObject(transform) || !TRANSFORM_OPS.includes(transform.op)) {
    fail(path, `op must be one of ${TRANSFORM_OPS.join(', ')}`);
  }
  if (transform.op === 'scaleTempo') {
    if (typeof transform.by !== 'number' || !(transform.by > 0)) {
      fail(path, 'scaleTempo needs by > 0');
    }
    return { op: 'scaleTempo', by: transform.by };
  }
  const { stem, hit, every, offset = 0 } = transform;
  if (typeof stem !== 'string') fail(path, 'fillRests names a stem');
  if (typeof hit !== 'string' || hit.length !== 1) fail(path, 'fillRests hit is one kit symbol');
  if (!isWhole(every) || !Number.isInteger(offset) || offset < 0 || offset >= every) {
    fail(path, 'fillRests needs every >= 1 and 0 <= offset < every');
  }
  return { op: 'fillRests', stem, hit, every, offset };
}

/** A variant's shape is checked here; its stems are checked per arrangement. */
function parseVariant(variant, inputs, path) {
  if (!isObject(variant) || typeof variant.id !== 'string') fail(path, 'a variant has an id');
  const parsed = { id: variant.id, when: parseWhen(variant.when, inputs, `${path}.when`) };
  if (own(variant, 'bpm')) {
    if (typeof variant.bpm !== 'number' || !(variant.bpm > 0)) {
      fail(`${path}.bpm`, 'bpm must be positive');
    }
    parsed.bpm = variant.bpm;
  }
  if (own(variant, 'stems')) {
    if (!isObject(variant.stems)) fail(`${path}.stems`, 'stems is an object');
    parsed.stems = variant.stems;
  }
  parsed.transforms = (variant.transforms ?? []).map((t, i) =>
    parseTransform(t, `${path}.transforms[${i}]`),
  );
  return parsed;
}

function parseSonotherapy(value, path) {
  if (!isObject(value)) fail(path, 'sonotherapy is { windowMs, strongBeat }');
  const { windowMs, strongBeat = 'downbeat' } = value;
  if (typeof windowMs !== 'number' || !(windowMs > 0)) {
    fail(`${path}.windowMs`, 'windowMs must be positive');
  }
  if (strongBeat !== 'downbeat' && strongBeat !== 'none') {
    fail(`${path}.strongBeat`, 'strongBeat is downbeat or none');
  }
  return { windowMs, strongBeat };
}

const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
};

/**
 * Validates a score and returns its expanded, frozen model. Pure: the same
 * input always yields a deep-equal model, the input is never modified, and
 * every problem is reported as a ScoreError naming the path that caused it.
 */
export function parseScore(score) {
  if (!isObject(score)) fail('score', 'a score is an object');
  if (score.format !== SCORE_FORMAT) fail('format', `expected "${SCORE_FORMAT}"`);
  if (score.version !== SCORE_VERSION) {
    fail('version', `this reader understands version ${SCORE_VERSION}`);
  }
  const { ticksPerBeat } = score;
  if (!isWhole(ticksPerBeat)) fail('ticksPerBeat', 'a whole number of ticks per beat');

  const inputs = {};
  for (const [name, input] of Object.entries(score.inputs ?? {})) {
    if (!isObject(input) || !INPUT_KINDS.includes(input.kind)) {
      fail(`inputs.${name}`, `kind must be one of ${INPUT_KINDS.join(', ')}`);
    }
    inputs[name] = { kind: input.kind };
  }

  const kit = {};
  for (const [symbol, sound] of Object.entries(score.kit ?? {})) {
    if (symbol.length !== 1 || symbol === REST) {
      fail(`kit.${symbol}`, 'a kit symbol is one character other than "."');
    }
    if (typeof sound !== 'string') fail(`kit.${symbol}`, 'a kit symbol names a sound');
    kit[symbol] = sound;
  }

  // Motifs hold only plain events or a plain pattern: no nesting, so no cycles.
  const motifs = {};
  for (const [id, motif] of Object.entries(score.motifs ?? {})) {
    const path = `motifs.${id}`;
    if (!isObject(motif) || own(motif, 'events') === own(motif, 'pattern')) {
      fail(path, 'a motif has either events or a pattern');
    }
    if (own(motif, 'pattern')) {
      motifs[id] = { pattern: checkPattern(motif.pattern, kit, `${path}.pattern`) };
    } else {
      if (!Array.isArray(motif.events) || motif.events.length === 0) {
        fail(`${path}.events`, 'a motif has events');
      }
      motifs[id] = { events: motif.events.map((e, i) => checkEvent(e, `${path}.events[${i}]`)) };
    }
  }

  const sonotherapy = parseSonotherapy(
    score.timing?.sonotherapy ?? { windowMs: 90 },
    'timing.sonotherapy',
  );
  const defaults = (score.variants ?? []).map((v, i) => parseVariant(v, inputs, `variants[${i}]`));
  const context = { motifs, kit };

  if (!isObject(score.arrangements) || Object.keys(score.arrangements).length === 0) {
    fail('arrangements', 'a score has at least one arrangement');
  }
  const arrangements = {};
  for (const [id, arrangement] of Object.entries(score.arrangements)) {
    const path = `arrangements.${id}`;
    if (!isObject(arrangement)) fail(path, 'an arrangement is an object');
    if (typeof arrangement.era !== 'string') fail(`${path}.era`, 'an arrangement names its era');
    if (typeof arrangement.bpm !== 'number' || !(arrangement.bpm > 0)) {
      fail(`${path}.bpm`, 'bpm must be positive');
    }
    const { meter, barTicks } = parseMeter(arrangement.meter, ticksPerBeat, `${path}.meter`);
    if (!isObject(arrangement.stems) || Object.keys(arrangement.stems).length === 0) {
      fail(`${path}.stems`, 'an arrangement has stems');
    }
    const stems = {};
    for (const [name, stem] of Object.entries(arrangement.stems)) {
      stems[name] = parseStem(stem, context, `${path}.stems.${name}`);
    }
    checkBars(stems, barTicks, `${path}.stems`);

    // An arrangement's variant replaces the score default with the same id.
    const local = (arrangement.variants ?? []).map((v, i) =>
      parseVariant(v, inputs, `${path}.variants[${i}]`),
    );
    const merged = defaults.map((d) => local.find((v) => v.id === d.id) ?? d);
    for (const v of local) if (!defaults.some((d) => d.id === v.id)) merged.push(v);
    if (merged.length > MAX_VARIANTS) fail(`${path}.variants`, `at most ${MAX_VARIANTS} variants`);
    const variants = merged.map((variant) => {
      const at = `${path}.variants[${variant.id}]`;
      const resolved = { ...variant };
      if (variant.stems) {
        resolved.stems = {};
        for (const [name, stem] of Object.entries(variant.stems)) {
          if (!stems[name]) {
            fail(`${at}.stems.${name}`, 'a variant can only change stems the arrangement has');
          }
          resolved.stems[name] = parseStem(stem, context, `${at}.stems.${name}`, stems[name]);
        }
        checkBars(resolved.stems, barTicks, `${at}.stems`);
      }
      for (const transform of variant.transforms) {
        if (transform.op !== 'fillRests') continue;
        const target = stems[transform.stem];
        if (!target || target.role !== 'percussion') {
          fail(at, `fillRests needs a percussion stem "${transform.stem}" in ${id}`);
        }
        if (!own(kit, transform.hit)) {
          fail(at, `fillRests hit "${transform.hit}" is not in the kit`);
        }
      }
      return resolved;
    });

    const timing = arrangement.sonotherapy
      ? parseSonotherapy(arrangement.sonotherapy, `${path}.sonotherapy`)
      : sonotherapy;
    arrangements[id] = {
      id,
      era: arrangement.era,
      bpm: arrangement.bpm,
      meter,
      barTicks,
      stems,
      variants,
      sonotherapy: timing,
    };
  }

  const aliases = {};
  for (const [name, alias] of Object.entries(score.aliases ?? {})) {
    const path = `aliases.${name}`;
    if (!isObject(alias) || !arrangements[alias.arrangement]) {
      fail(path, 'an alias names an arrangement');
    }
    if (arrangements[name]) fail(path, 'an alias cannot shadow an arrangement');
    aliases[name] = {
      arrangement: alias.arrangement,
      inputs: checkInputs(alias.inputs ?? {}, inputs, `${path}.inputs`),
    };
  }

  const stingers = (score.stingers ?? []).map((stinger, index) => {
    const path = `stingers[${index}]`;
    if (!isObject(stinger)) fail(path, 'a stinger is { on, motif, quantize }');
    if (inputs[stinger.on]?.kind !== 'event') {
      fail(`${path}.on`, `"${stinger.on}" is not a declared event input`);
    }
    if (!motifs[stinger.motif]) fail(`${path}.motif`, `unknown motif "${stinger.motif}"`);
    const quantize = stinger.quantize ?? 'beat';
    if (!QUANTIZE.includes(quantize)) {
      fail(`${path}.quantize`, `quantize is ${QUANTIZE.join(' or ')}`);
    }
    return { on: stinger.on, motif: stinger.motif, quantize };
  });

  const model = {
    format: SCORE_FORMAT,
    version: SCORE_VERSION,
    ticksPerBeat,
    inputs,
    kit,
    motifs,
    arrangements,
    aliases,
    stingers,
  };

  // The bound: a Sonotherapy window may cover at most half of a beat at the
  // fastest tempo the arrangement can reach. Wider, and more than half of all
  // actions land "on the beat" by accident, so the mark stops meaning timing.
  for (const arrangement of Object.values(arrangements)) {
    const beatMs = 60000 / fastestBpm(arrangement);
    if (arrangement.sonotherapy.windowMs > beatMs / 2) {
      fail(
        `arrangements.${arrangement.id}.sonotherapy.windowMs`,
        `${arrangement.sonotherapy.windowMs}ms is more than half of a ${beatMs.toFixed(1)}ms beat`,
      );
    }
  }
  return deepFreeze(model);
}

/** Validates an { input: value } map against the declared inputs. */
function checkInputs(values, inputs, path) {
  if (!isObject(values)) fail(path, 'inputs is an object');
  const checked = {};
  for (const [name, value] of Object.entries(values)) {
    const input = inputs[name];
    if (!input) fail(`${path}.${name}`, `"${name}" is not a declared input`);
    if (input.kind === 'event') fail(`${path}.${name}`, 'an event has no standing value');
    if (input.kind === 'flag' && typeof value !== 'boolean') {
      fail(`${path}.${name}`, 'a flag is true or false');
    }
    if (input.kind === 'level' && (typeof value !== 'number' || value < 0 || value > 1)) {
      fail(`${path}.${name}`, 'a level is between 0 and 1');
    }
    checked[name] = value;
  }
  return checked;
}

const active = (when, inputs) =>
  own(when, 'atLeast') ? (inputs[when.input] ?? 0) >= when.atLeast : inputs[when.input] === true;

function applyVariants(arrangement, variants) {
  let bpm = arrangement.bpm;
  const stems = { ...arrangement.stems };
  for (const variant of variants) {
    if (variant.bpm !== undefined) bpm = variant.bpm;
    if (variant.stems) Object.assign(stems, variant.stems);
    for (const transform of variant.transforms) {
      if (transform.op === 'scaleTempo') {
        bpm *= transform.by;
      } else {
        const stem = stems[transform.stem];
        const { every, offset, hit } = transform;
        const pattern = [...stem.pattern]
          .map((step, index) => (step === REST && index % every === offset ? hit : step))
          .join('');
        stems[transform.stem] = { ...stem, pattern };
      }
    }
  }
  return { bpm, stems };
}

/**
 * The highest bpm any combination of this arrangement's variants produces.
 * Every combination is tried, which is why an arrangement has few variants.
 */
function fastestBpm(arrangement) {
  const { variants } = arrangement;
  let fastest = arrangement.bpm;
  for (let mask = 1; mask < 1 << variants.length; mask += 1) {
    const chosen = variants.filter((_, bit) => mask & (1 << bit));
    fastest = Math.max(fastest, applyVariants(arrangement, chosen).bpm);
  }
  return fastest;
}

/**
 * The arrangement as it should sound for these inputs. `name` may be an
 * arrangement id or an alias; an alias's own inputs win over the caller's,
 * which is what lets "chill" stay calm when the bottle is in danger.
 * Returns null for an unknown name.
 */
export function realize(model, name, inputs = {}) {
  const alias = model.aliases[name];
  const arrangement = model.arrangements[alias ? alias.arrangement : name];
  if (!arrangement) return null;
  const values = { ...checkInputs(inputs, model.inputs, 'inputs'), ...(alias?.inputs ?? {}) };
  const chosen = arrangement.variants.filter((variant) => active(variant.when, values));
  const { bpm, stems } = applyVariants(arrangement, chosen);
  return {
    id: arrangement.id,
    era: arrangement.era,
    bpm,
    meter: arrangement.meter,
    ticksPerBeat: model.ticksPerBeat,
    barTicks: arrangement.barTicks,
    stems,
    variants: chosen.map((variant) => variant.id),
    sonotherapy: arrangement.sonotherapy,
  };
}
