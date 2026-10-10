/**
 * All of RxDrop's sound is synthesised at runtime with the Web Audio API -
 * there are no audio files to download. The music is ten original chiptune
 * loops, one for each medicine era, written as data in src/score-data.js; this
 * file voices them. The effects are short envelopes on square, triangle and
 * noise voices.
 *
 * Musical time comes from the Transport in transport.js: the engine renders
 * notes onto it, gameplay reads beat/bar position from it, and neither side
 * keeps its own clock.
 */
import { Transport } from './transport.js';
import { parseScore, realize } from './score.js';
import { SCORE } from './score-data.js';

const NOTES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "A4" / "C#5" / "Eb3" -> frequency in Hz. A rest is written as null. */
export function noteToFreq(name) {
  if (!name) return 0;
  const match = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!match) throw new Error(`Bad note: ${name}`);
  const [, letter, accidental, octave] = match;
  const semitone =
    NOTES[letter] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0);
  const midi = (Number(octave) + 1) * 12 + semitone;
  return 440 * 2 ** ((midi - 69) / 12);
}

const SUBS = 4; // sixteenth notes per beat, matching the [note, sixteenths] notation
const LOOKAHEAD = 0.15; // how far ahead of the clock the scheduler works, in seconds

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const lcm = (a, b) => (a * b) / gcd(a, b);

/** [note, sixteenths] pairs -> { events: [{step, note, len}], total }. */
function accumulate(entries) {
  const events = [];
  let step = 0;
  for (const [note, len] of entries) {
    events.push({ step, note, len });
    step += len;
  }
  return { events, total: step };
}

/** Drum voices per step character: x kick, h hat, t tom. */
const DRUM_HIT = {
  x: { duration: 0.05, gain: 0.12, frequency: 3200 },
  h: { duration: 0.03, gain: 0.08, frequency: 6000 },
  t: { duration: 0.08, gain: 0.14, frequency: 500 },
};

/**
 * Expands a resolved track into a slot per sixteenth of the loop, so the
 * scheduler can index it directly by transport tick. Stems may disagree on
 * length, so the loop is their least common multiple and each repeats until
 * it fills. Cached per resolved-track object: danger variants resolve to new
 * objects, and a WeakMap drops them when the engine does.
 */
const flattened = new WeakMap();
function flattenTrack(track) {
  if (flattened.has(track)) return flattened.get(track);
  const lead = accumulate(track.lead);
  const bass = accumulate(track.bass);
  const loop = lcm(lcm(lead.total, bass.total), track.drums.length);
  const slots = Array.from({ length: loop }, () => []);
  for (let base = 0; base < loop; base += lead.total) {
    for (const event of lead.events) {
      slots[base + event.step].push({ voice: 'lead', leadType: track.leadType, ...event });
    }
  }
  for (let base = 0; base < loop; base += bass.total) {
    for (const event of bass.events) {
      slots[base + event.step].push({ voice: 'bass', bassType: track.bassType, ...event });
    }
  }
  for (let base = 0; base < loop; base += track.drums.length) {
    [...track.drums].forEach((drum, index) => {
      if (DRUM_HIT[drum]) slots[base + index].push({ voice: 'drum', drum });
    });
  }
  const flat = { slots, loop };
  flattened.set(track, flat);
  return flat;
}

/** The score, validated once at load: a malformed score fails here, loudly. */
const MODEL = parseScore(SCORE);
if (MODEL.ticksPerBeat !== SUBS) {
  throw new Error(`the scheduler plays sixteenths, not ${MODEL.ticksPerBeat} ticks a beat`);
}

/** This renderer voices exactly three stems: a melody, a bass and a kit. */
function stem(arrangement, name, role) {
  const found = arrangement.stems[name];
  if (found?.role !== role) {
    throw new Error(`${arrangement.id}: audio.js needs a ${role} stem named "${name}"`);
  }
  return found;
}

/**
 * A realized arrangement in the shape the scheduler plays: [note, sixteenths]
 * pairs, one drum character per sixteenth, and the bar counted in sixteenths.
 * Fresh arrays every time, because the score's own are frozen.
 */
function toTrack(arrangement) {
  const lead = stem(arrangement, 'lead', 'melody');
  const bass = stem(arrangement, 'bass', 'bass');
  return {
    bpm: arrangement.bpm,
    bar: arrangement.barTicks,
    leadType: lead.timbre,
    bassType: bass.timbre,
    lead: lead.events.map(([note, length]) => [note, length]),
    bass: bass.events.map(([note, length]) => [note, length]),
    drums: stem(arrangement, 'drums', 'percussion').pattern,
  };
}

/**
 * Every era's calm loop, realized from the score in src/score-data.js. The
 * notes live there now, as data another engine can read; see docs/score.md.
 */
export const TRACKS = Object.freeze(
  Object.fromEntries(
    Object.keys(MODEL.arrangements).map((id) => [id, toTrack(realize(MODEL, id))]),
  ),
);

/** A name and danger -> the arrangement to play. Aliases pin their own danger. */
function requestedTrack(name, danger = false) {
  const alias = MODEL.aliases[name];
  if (!alias) return { id: name, danger };
  return { id: alias.arrangement, danger: alias.inputs.danger ?? danger };
}

/** Returns the effective era track, including the requested danger treatment. */
export function resolveTrack(name, danger = false) {
  const requested = requestedTrack(name, danger);
  const arrangement = realize(MODEL, requested.id, { danger: requested.danger });
  return arrangement ? toTrack(arrangement) : null;
}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.muted = false;
    /** Music can be turned off on its own, leaving the effects audible. */
    this.musicEnabled = true;
    this.trackName = 'pharmaceutical';
    this.danger = false;
    this.track = resolveTrack(this.trackName, this.danger);
    this.timer = null;
    this.nextStep = 0;
    this.playing = false;
    /**
     * Authoritative musical time, created with the AudioContext. Gameplay
     * reads beat/bar position and beat windows from here; it is null until
     * the first user gesture lets the context exist.
     */
    this.transport = null;
  }

  /** Web Audio needs a user gesture; call this from the first click or key. */
  resume() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.24;
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.5;
      this.sfxGain.connect(this.master);
    }
    if (!this.transport) {
      this.transport = new Transport({ clock: () => this.ctx.currentTime });
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  /**
   * Turns the music on or off without touching the sound effects. Returns the
   * new state so callers can persist it.
   */
  setMusicEnabled(enabled, { resume = true } = {}) {
    this.musicEnabled = Boolean(enabled);
    if (!this.musicEnabled) {
      this.stopMusic();
    } else if (resume && this.ctx) {
      this.startMusic();
    }
    return this.musicEnabled;
  }

  toggleMusic(options) {
    return this.setMusicEnabled(!this.musicEnabled, options);
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.9, this.ctx.currentTime, 0.02);
    }
    return this.muted;
  }

  toggleMute() {
    return this.setMuted(!this.muted);
  }

  /** A single enveloped voice. */
  tone(freq, { start = 0, duration = 0.12, type = 'square', gain = 0.3, target, slide }) {
    if (!this.ctx || !freq) return;
    const t0 = this.ctx.currentTime + start;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + duration);
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(env);
    env.connect(target ?? this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  noise({ start = 0, duration = 0.08, gain = 0.2, target, frequency = 1200 }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + start;
    const frames = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(gain, t0);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    source.connect(filter);
    filter.connect(env);
    env.connect(target ?? this.sfxGain);
    source.start(t0);
    source.stop(t0 + duration);
  }

  play(name, detail = {}) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'move':
        this.tone(noteToFreq('A4'), { duration: 0.05, gain: 0.16, type: 'square' });
        break;
      case 'rotate':
        this.tone(noteToFreq('E5'), { duration: 0.06, gain: 0.18, slide: noteToFreq('B5') });
        break;
      case 'hardDrop':
        this.tone(noteToFreq('C5'), { duration: 0.1, gain: 0.2, slide: noteToFreq('C3') });
        break;
      case 'lock':
        this.noise({ duration: 0.07, gain: 0.22, frequency: 500 });
        this.tone(noteToFreq('C3'), { duration: 0.09, gain: 0.2, type: 'triangle' });
        break;
      case 'clear': {
        const combo = Math.min(detail.combo ?? 1, 5);
        const scale = ['C5', 'E5', 'G5', 'B5', 'D6', 'F6'];
        const cells = Math.min(detail.cells ?? 4, 6);
        for (let i = 0; i < cells; i += 1) {
          const index = Math.min(scale.length - 1, i + combo - 1);
          this.tone(noteToFreq(scale[index]), {
            start: i * 0.045,
            duration: 0.14,
            gain: 0.22,
            type: 'square',
          });
        }
        if (detail.viruses > 0) {
          this.noise({ start: 0.02, duration: 0.16, gain: 0.18, frequency: 2400 });
        }
        break;
      }
      case 'chain': {
        const stage = Math.min(6, Math.max(2, detail.stage ?? 2));
        const roots = ['C5', 'G5', 'D6', 'A6', 'E7'];
        const root = noteToFreq(roots[stage - 2]);
        for (const [interval, start] of [[0, 0], [4, 0.08], [7, 0.16]]) {
          this.tone(root * 2 ** (interval / 12), {
            start,
            duration: 0.16,
            gain: 0.2,
            type: 'square',
          });
        }
        break;
      }
      case 'antibody': {
        // A rising two-note chime over a bright sweep: the one sound in the
        // game that says you did the hardest thing available.
        this.tone(noteToFreq('D5'), { duration: 0.18, gain: 0.24, type: 'square' });
        this.tone(noteToFreq('A5'), { start: 0.09, duration: 0.22, gain: 0.24, type: 'square' });
        this.tone(noteToFreq('D6'), {
          start: 0.18,
          duration: 0.34,
          gain: 0.2,
          type: 'triangle',
          slide: noteToFreq('A6'),
        });
        this.noise({ start: 0.02, duration: 0.3, gain: 0.14, frequency: 3200 });
        break;
      }
      case 'discovery': {
        // A pen scratch and a small, dry chime: something written down rather
        // than something won. Quieter than a clear on purpose - the notebook
        // should never be louder than the game.
        this.noise({ duration: 0.06, gain: 0.08, frequency: 5200 });
        this.tone(noteToFreq('E5'), { start: 0.05, duration: 0.1, gain: 0.13, type: 'sine' });
        this.tone(noteToFreq('B5'), { start: 0.12, duration: 0.2, gain: 0.11, type: 'sine' });
        break;
      }
      case 'spread': {
        // A wet, descending burble - replication as something spilling rather
        // than something arriving.
        this.tone(noteToFreq('F3'), {
          duration: 0.22,
          gain: 0.18,
          type: 'sawtooth',
          slide: noteToFreq('C3'),
        });
        this.noise({ start: 0.04, duration: 0.2, gain: 0.1, frequency: 700 });
        break;
      }
      case 'lightOn': {
        // The lamp striking: a rise, because going to it is a thing you chose.
        this.tone(noteToFreq('D3'), {
          duration: 0.28,
          gain: 0.18,
          type: 'triangle',
          slide: noteToFreq('A4'),
        });
        this.noise({ duration: 0.06, gain: 0.08, frequency: 2600 });
        break;
      }
      case 'lightOff': {
        // Coming back to the medicine. The same interval, downward.
        this.tone(noteToFreq('A4'), {
          duration: 0.22,
          gain: 0.14,
          type: 'triangle',
          slide: noteToFreq('D3'),
        });
        break;
      }
      case 'lit': {
        // A line of light landing on the patient. Brighter the more rows it
        // reached, so stacking for a bigger clear SOUNDS like the better play.
        const rows = Math.min(4, Math.max(1, event?.rows ?? 1));
        for (let i = 0; i < rows; i += 1) {
          this.tone(noteToFreq(['D5', 'F5', 'A5', 'D6'][i]), {
            start: i * 0.05,
            duration: 0.18,
            gain: 0.15,
            type: 'triangle',
          });
        }
        break;
      }
      case 'sealed': {
        // A shutter coming down.
        this.noise({ duration: 0.12, gain: 0.16, frequency: 1200 });
        this.tone(noteToFreq('G2'), { duration: 0.18, gain: 0.2, type: 'square' });
        break;
      }
      case 'unsealed': {
        this.tone(noteToFreq('G3'), { duration: 0.12, gain: 0.16, type: 'square' });
        this.tone(noteToFreq('D4'), { start: 0.07, duration: 0.16, gain: 0.16, type: 'square' });
        break;
      }
      case 'darkClear': {
        // The badge: a clear made blind. Brighter than the ordinary chime
        // because it is a harder thing done.
        this.tone(noteToFreq('A4'), { duration: 0.14, gain: 0.2, type: 'triangle' });
        this.tone(noteToFreq('E5'), { start: 0.08, duration: 0.16, gain: 0.2, type: 'triangle' });
        this.tone(noteToFreq('A5'), { start: 0.16, duration: 0.28, gain: 0.18, type: 'sine' });
        break;
      }
      case 'resist': {
        // A dull thud that goes nowhere: the medicine landing and doing
        // nothing. Deliberately unsatisfying next to the clear chime, so the
        // ear learns the difference before the eye has to.
        this.noise({ duration: 0.09, gain: 0.16, frequency: 900 });
        this.tone(noteToFreq('D3'), {
          duration: 0.16,
          gain: 0.2,
          type: 'triangle',
          slide: noteToFreq('A2'),
        });
        break;
      }
      case 'mutate': {
        // A sour, bending two-note figure: something on the board just changed
        // under you.
        this.tone(noteToFreq('B4'), {
          duration: 0.22,
          gain: 0.24,
          type: 'sawtooth',
          slide: noteToFreq('F4'),
        });
        this.tone(noteToFreq('F5'), {
          start: 0.12,
          duration: 0.26,
          gain: 0.2,
          type: 'square',
          slide: noteToFreq('B4'),
        });
        this.noise({ start: 0.02, duration: 0.22, gain: 0.14, frequency: 700 });
        break;
      }
      case 'speedUp':
        for (let i = 0; i < 3; i += 1) {
          this.tone(noteToFreq(['G4', 'B4', 'D5'][i]), {
            start: i * 0.06,
            duration: 0.1,
            gain: 0.18,
          });
        }
        break;
      case 'levelComplete': {
        const fanfare = ['C5', 'E5', 'G5', 'C6', 'G5', 'C6'];
        fanfare.forEach((note, i) => {
          this.tone(noteToFreq(note), {
            start: i * 0.11,
            duration: 0.22,
            gain: 0.26,
            type: 'square',
          });
        });
        break;
      }
      case 'gameOver': {
        const dirge = ['G4', 'F4', 'Eb4', 'D4', 'C4'];
        dirge.forEach((note, i) => {
          this.tone(noteToFreq(note), {
            start: i * 0.16,
            duration: 0.3,
            gain: 0.24,
            type: 'triangle',
          });
        });
        break;
      }
      case 'pause':
        this.tone(noteToFreq('E5'), { duration: 0.08, gain: 0.2 });
        this.tone(noteToFreq('C5'), { start: 0.08, duration: 0.12, gain: 0.2 });
        break;
      case 'resume':
        this.tone(noteToFreq('C5'), { duration: 0.08, gain: 0.2 });
        this.tone(noteToFreq('E5'), { start: 0.08, duration: 0.12, gain: 0.2 });
        break;
      case 'start':
        ['C5', 'G5', 'C6'].forEach((note, i) =>
          this.tone(noteToFreq(note), { start: i * 0.08, duration: 0.16, gain: 0.24 }),
        );
        break;
      default:
        break;
    }
  }

  setTrack(name) {
    const requested = requestedTrack(name, this.danger);
    if (!TRACKS[requested.id]) return;
    const changed = this.trackName !== requested.id || this.danger !== requested.danger;
    this.trackName = requested.id;
    this.danger = requested.danger;
    this.track = resolveTrack(this.trackName, this.danger);
    if (changed && this.playing) {
      this.stopMusic();
      this.startMusic();
    }
  }

  setDanger(on) {
    const danger = Boolean(on);
    if (danger === this.danger) return;
    this.danger = danger;
    this.track = resolveTrack(this.trackName, this.danger);
    if (this.playing) {
      this.stopMusic();
      this.startMusic();
    }
  }

  startMusic(name = this.trackName) {
    const requested = requestedTrack(name, this.danger);
    if (TRACKS[requested.id]) {
      this.trackName = requested.id;
      this.danger = requested.danger;
      this.track = resolveTrack(this.trackName, this.danger);
    }
    if (!this.ctx || this.playing || !this.musicEnabled) return;
    this.playing = true;
    // bar is counted in sixteenths, so the waltz's 12 means three beats to the bar.
    this.transport.setMeter(this.track.bar / SUBS);
    this.transport.setTempo(this.track.bpm);
    this.transport.start(this.ctx.currentTime + 0.1);
    this.nextStep = 0;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  stopMusic() {
    this.playing = false;
    this.transport?.stop();
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /**
   * Pausing freezes the transport instead of resetting it, so the tune picks
   * up mid-phrase rather than starting over on every interruption.
   */
  pauseMusic() {
    this.transport?.pause();
  }

  /** Resumes a paused transport. False when nothing was paused, so the
   * caller can fall back to startMusic. */
  resumeMusic() {
    return this.transport?.resume() ?? false;
  }

  /** Look-ahead scheduler: queue anything due in the next 150ms. */
  schedule() {
    if (!this.ctx || !this.playing || !this.transport?.running) return;
    const { slots, loop } = flattenTrack(this.track);
    const now = this.ctx.currentTime;
    const last = Math.floor(this.transport.beatAt(now + LOOKAHEAD) * SUBS + 1e-9);
    for (let step = this.nextStep; step <= last; step += 1) {
      const at = this.transport.timeOfBeat(step / SUBS) - now;
      for (const event of slots[step % loop]) {
        if (event.voice === 'lead') {
          if (event.note) {
            this.tone(noteToFreq(event.note), {
              start: at,
              duration: Math.max(0.05, event.len * (this.transport.beatDuration / SUBS) * 0.85),
              gain: 0.22,
              type: event.leadType,
              target: this.musicGain,
            });
          }
        } else if (event.voice === 'bass') {
          this.tone(noteToFreq(event.note), {
            start: at,
            duration: Math.max(0.06, event.len * (this.transport.beatDuration / SUBS) * 0.8),
            gain: 0.3,
            type: event.bassType,
            target: this.musicGain,
          });
        } else {
          this.noise({ start: at, target: this.musicGain, ...DRUM_HIT[event.drum] });
        }
      }
    }
    this.nextStep = Math.max(this.nextStep, last + 1);
  }
}
