/**
 * All of RxDrop's sound is synthesised at runtime with the Web Audio API -
 * there are no audio files to download. The music is two original chiptune
 * loops; the effects are short envelopes on square, triangle and noise voices.
 */

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

const SIXTEENTH = 0.125; // seconds at 120bpm

/**
 * Tracks are [note, sixteenths] pairs. Both loops are written here rather than
 * sampled, so they are original tunes in the spirit of a puzzle game soundtrack.
 */
export const TRACKS = {
  fever: {
    tempo: 1,
    lead: [
      ['E5', 2], ['G5', 2], ['A5', 2], ['B5', 2], ['A5', 2], ['G5', 2], ['E5', 4],
      ['D5', 2], ['E5', 2], ['G5', 2], ['A5', 2], ['G5', 2], ['E5', 2], ['D5', 4],
      ['C5', 2], ['E5', 2], ['G5', 2], ['A5', 2], ['G5', 2], ['E5', 2], ['C5', 4],
      ['D5', 2], ['F5', 2], ['A5', 2], ['B5', 2], ['A5', 2], ['F5', 2], ['D5', 4],
    ],
    bass: [
      ['A2', 4], ['A3', 4], ['E2', 4], ['E3', 4],
      ['F2', 4], ['F3', 4], ['G2', 4], ['G3', 4],
      ['A2', 4], ['A3', 4], ['E2', 4], ['E3', 4],
      ['D2', 4], ['D3', 4], ['G2', 4], ['G3', 4],
    ],
    drums: 'x.x.x.xxx.x.x.x.',
  },
  chill: {
    tempo: 1.25,
    lead: [
      ['C5', 4], ['E5', 2], ['G5', 2], ['F5', 4], ['E5', 4],
      ['D5', 4], ['F5', 2], ['A5', 2], ['G5', 4], ['E5', 4],
      ['C5', 4], ['G5', 2], ['E5', 2], ['D5', 4], ['C5', 4],
      ['B4', 4], ['D5', 2], ['G5', 2], ['A5', 6], [null, 2],
    ],
    bass: [
      ['C3', 8], ['A2', 8], ['D3', 8], ['G2', 8],
      ['C3', 8], ['A2', 8], ['G2', 8], ['G3', 8],
    ],
    drums: 'x..x..x...x.x...',
  },
};

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.muted = false;
    /** Music can be turned off on its own, leaving the effects audible. */
    this.musicEnabled = true;
    this.trackName = 'fever';
    this.timer = null;
    this.nextNoteTime = 0;
    this.cursor = { lead: 0, bass: 0, step: 0 };
    this.playing = false;
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
    if (!TRACKS[name] || name === this.trackName) return;
    this.trackName = name;
    if (this.playing) {
      this.stopMusic();
      this.startMusic(name);
    }
  }

  startMusic(name = this.trackName) {
    if (!this.ctx || this.playing || !this.musicEnabled) return;
    this.trackName = TRACKS[name] ? name : 'fever';
    this.playing = true;
    this.cursor = { lead: 0, bass: 0, step: 0 };
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.leadTime = this.nextNoteTime;
    this.bassTime = this.nextNoteTime;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  stopMusic() {
    this.playing = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Look-ahead scheduler: queue anything due in the next 150ms. */
  schedule() {
    if (!this.ctx || !this.playing) return;
    const track = TRACKS[this.trackName];
    const beat = SIXTEENTH / track.tempo;
    const horizon = this.ctx.currentTime + 0.15;

    while (this.leadTime < horizon) {
      const [note, length] = track.lead[this.cursor.lead % track.lead.length];
      const duration = length * beat;
      if (note) {
        this.tone(noteToFreq(note), {
          start: this.leadTime - this.ctx.currentTime,
          duration: Math.max(0.05, duration * 0.85),
          gain: 0.22,
          type: 'square',
          target: this.musicGain,
        });
      }
      this.leadTime += duration;
      this.cursor.lead += 1;
    }

    while (this.bassTime < horizon) {
      const [note, length] = track.bass[this.cursor.bass % track.bass.length];
      const duration = length * beat;
      this.tone(noteToFreq(note), {
        start: this.bassTime - this.ctx.currentTime,
        duration: Math.max(0.06, duration * 0.8),
        gain: 0.3,
        type: 'triangle',
        target: this.musicGain,
      });
      const step = this.cursor.bass % track.drums.length;
      if (track.drums[step] === 'x') {
        this.noise({
          start: this.bassTime - this.ctx.currentTime,
          duration: 0.05,
          gain: 0.12,
          frequency: 3200,
          target: this.musicGain,
        });
      }
      this.bassTime += duration;
      this.cursor.bass += 1;
    }
  }
}
