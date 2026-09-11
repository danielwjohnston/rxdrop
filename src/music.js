import { TRACKS, noteToFreq } from './audio.js';

const SIXTEENTH = 0.125;
const engines = new Set();
let installed = false;
let periodResolver = () => null;

const sequence = (notes, length = 2) => notes.map((note) => [note, length]);

/**
 * Original motifs for the eleven visual periods. They do not quote historical
 * music; each uses a small timbral/rhythmic idea to suggest the changing tools
 * and atmosphere around the same RxDrop puzzle vocabulary.
 */
export const MUSIC_PROFILES = Object.freeze({
  stone: {
    tempo: 0.76, leadType: 'sawtooth', bassType: 'triangle', drumFrequency: 430,
    chill: sequence(['A4', null, 'A4', 'C5', 'D5', null, 'E5', 'D5', 'C5', null, 'A4', 'G4'], 2),
    fever: sequence(['A4', 'A4', 'C5', 'D5', 'E5', 'D5', 'C5', 'A4', 'G4', 'A4', 'C5', 'E5', 'D5', 'C5', 'A4', null], 1),
    bass: [['A2', 8], ['A2', 4], ['G2', 4], ['A2', 8], ['E2', 8]],
    drums: 'x...x.x...x...x.',
  },
  nile: {
    tempo: 0.9, leadType: 'triangle', bassType: 'sine', drumFrequency: 820,
    chill: sequence(['D5', 'F5', 'G5', 'A5', 'G5', 'F5', 'D5', null, 'C5', 'D5', 'F5', null], 2),
    fever: sequence(['D5', 'F5', 'G5', 'A5', 'C6', 'A5', 'G5', 'F5', 'D5', 'C5', 'D5', 'F5', 'G5', 'A5', 'G5', 'D5'], 1),
    bass: [['D3', 8], ['C3', 8], ['Bb2', 8], ['C3', 8]],
    drums: 'x..x...x.x..x...',
  },
  aegean: {
    tempo: 0.96, leadType: 'triangle', bassType: 'triangle', drumFrequency: 1400,
    chill: sequence(['E5', 'G5', 'A5', 'B5', 'A5', 'G5', 'E5', null, 'D5', 'E5', 'G5', null], 2),
    fever: sequence(['E5', 'G5', 'A5', 'B5', 'D6', 'B5', 'A5', 'G5', 'E5', 'D5', 'E5', 'G5', 'A5', 'B5', 'A5', 'E5'], 1),
    bass: [['E3', 8], ['D3', 8], ['C3', 8], ['B2', 8]],
    drums: 'x...x...x.x...x.',
  },
  bimaristan: {
    tempo: 1.0, leadType: 'sine', bassType: 'triangle', drumFrequency: 1750,
    chill: sequence(['D5', 'Eb5', 'G5', 'A5', 'G5', 'Eb5', 'D5', null, 'C5', 'D5', 'Eb5', 'G5'], 2),
    fever: sequence(['D5', 'Eb5', 'G5', 'A5', 'Bb5', 'A5', 'G5', 'Eb5', 'D5', 'C5', 'D5', 'Eb5', 'G5', 'A5', 'G5', 'D5'], 1),
    bass: [['D3', 8], ['C3', 8], ['Bb2', 8], ['A2', 8]],
    drums: 'x..x..x...x.x...',
  },
  guild: {
    tempo: 1.04, leadType: 'square', bassType: 'triangle', drumFrequency: 1050,
    chill: sequence(['G4', 'D5', 'G5', 'A5', 'G5', 'D5', 'E5', 'C5', 'D5', null, 'G4', null], 2),
    fever: sequence(['G4', 'D5', 'G5', 'A5', 'B5', 'A5', 'G5', 'D5', 'E5', 'G5', 'A5', 'G5', 'D5', 'C5', 'D5', 'G4'], 1),
    bass: [['G2', 4], ['D3', 4], ['C3', 4], ['D3', 4], ['G2', 8], ['F2', 8]],
    drums: 'x.x...x.x.x...x.',
  },
  plague: {
    tempo: 0.86, leadType: 'sawtooth', bassType: 'sine', drumFrequency: 620,
    chill: sequence(['D5', null, 'F5', 'Eb5', 'D5', null, 'C5', 'Bb4', 'A4', null, 'D5', null], 2),
    fever: sequence(['D5', 'F5', 'Eb5', 'D5', 'C5', 'Bb4', 'A4', 'C5', 'D5', 'F5', 'G5', 'F5', 'Eb5', 'D5', 'C5', 'A4'], 1),
    bass: [['D2', 8], ['Bb1', 8], ['C2', 8], ['A1', 8]],
    drums: 'x....x..x....x..',
  },
  showman: {
    tempo: 1.16, leadType: 'square', bassType: 'triangle', drumFrequency: 2100,
    chill: sequence(['C5', 'E5', 'G5', 'A5', 'G5', 'E5', 'C5', 'D5', 'F5', 'A5', 'G5', null], 2),
    fever: sequence(['C5', 'E5', 'G5', 'A5', 'C6', 'A5', 'G5', 'E5', 'D5', 'F5', 'A5', 'B5', 'A5', 'G5', 'E5', 'C5'], 1),
    bass: [['C3', 4], ['G2', 4], ['A2', 4], ['E2', 4], ['F2', 4], ['G2', 4], ['C3', 8]],
    drums: 'x.x.x...x.x.x.x.',
  },
  asepsis: {
    tempo: 1.02, leadType: 'sine', bassType: 'triangle', drumFrequency: 3600,
    chill: sequence(['F5', 'A5', 'C6', 'A5', 'G5', 'F5', 'D5', null, 'F5', 'G5', 'A5', null], 2),
    fever: sequence(['F5', 'A5', 'C6', 'D6', 'C6', 'A5', 'G5', 'F5', 'D5', 'F5', 'G5', 'A5', 'C6', 'A5', 'G5', 'F5'], 1),
    bass: [['F2', 8], ['D3', 8], ['Bb2', 8], ['C3', 8]],
    drums: 'x...x...x...x.x.',
  },
  penicillin: {
    tempo: 1.12, leadType: 'square', bassType: 'triangle', drumFrequency: 3100,
    chill: sequence(['C5', 'E5', 'G5', 'F5', 'E5', 'D5', 'C5', null, 'G4', 'C5', 'D5', 'E5'], 2),
    fever: sequence(['C5', 'E5', 'G5', 'A5', 'G5', 'F5', 'E5', 'D5', 'C5', 'D5', 'E5', 'G5', 'A5', 'B5', 'G5', 'E5'], 1),
    bass: [['C3', 8], ['A2', 8], ['F2', 8], ['G2', 8]],
    drums: 'x..x..x.x.x...x.',
  },
  molecular: {
    tempo: 1.22, leadType: 'square', bassType: 'sine', drumFrequency: 4300,
    chill: sequence(['E5', 'B5', 'F#5', 'C#6', 'B5', 'G#5', 'F#5', null, 'E5', 'G#5', 'B5', null], 2),
    fever: sequence(['E5', 'B5', 'F#5', 'C#6', 'B5', 'G#5', 'F#5', 'E5', 'G#5', 'B5', 'D#6', 'C#6', 'B5', 'G#5', 'F#5', 'E5'], 1),
    bass: [['E2', 4], ['B2', 4], ['C#3', 4], ['G#2', 4], ['A2', 8], ['B2', 8]],
    drums: 'x.x..x.x.x..x.x.',
  },
  genomic: {
    tempo: 1.32, leadType: 'sine', bassType: 'square', drumFrequency: 5100,
    chill: sequence(['C#5', 'G#5', 'D#6', 'G#5', 'E5', 'B5', 'F#5', 'B5', 'C#6', null, 'G#5', null], 2),
    fever: sequence(['C#5', 'G#5', 'D#6', 'G#5', 'E5', 'B5', 'F#5', 'B5', 'C#6', 'G#5', 'E6', 'B5', 'F#6', 'C#6', 'G#5', 'D#5'], 1),
    bass: [['C#3', 4], ['G#2', 4], ['E2', 4], ['B2', 4], ['F#2', 4], ['C#3', 4], ['G#2', 8]],
    drums: 'x.xx.x.x.xx.x.x.',
  },
});

function photoLead(profile) {
  // Same motif, lifted and opened up. Phototherapy should sound like the
  // current piece of music entering a treatment state, not a minigame jingle.
  return profile.chill.map(([note, length], index) => [note, index % 3 === 0 ? Math.max(1, length - 1) : length]);
}

function installTracks() {
  for (const [id, profile] of Object.entries(MUSIC_PROFILES)) {
    const common = {
      bass: profile.bass,
      drums: profile.drums,
      leadType: profile.leadType,
      bassType: profile.bassType,
      drumFrequency: profile.drumFrequency,
    };
    TRACKS[`${id}:chill`] = {
      ...common,
      tempo: profile.tempo,
      lead: profile.chill,
      leadGain: 0.2,
      bassGain: 0.26,
    };
    TRACKS[`${id}:fever`] = {
      ...common,
      tempo: profile.tempo * 1.12,
      lead: profile.fever,
      leadGain: 0.22,
      bassGain: 0.3,
    };
    TRACKS[`${id}:photo`] = {
      ...common,
      tempo: profile.tempo * 1.04,
      lead: photoLead(profile),
      leadType: profile.leadType === 'sawtooth' ? 'triangle' : 'sine',
      drumFrequency: profile.drumFrequency * 1.28,
      leadGain: 0.18,
      bassGain: 0.22,
      photo: true,
    };
  }
}

function resolvedTrack(engine, requested) {
  const period = periodResolver?.();
  const music = period?.music ?? 'penicillin';
  const mood = requested === 'fever' || requested === 'chill'
    ? requested
    : (engine._rxMood ?? 'chill');
  engine._rxMood = mood;
  return `${music}:${engine._rxPhoto ? 'photo' : mood}`;
}

export function installEraMusic(AudioEngine, getPeriod) {
  periodResolver = getPeriod ?? periodResolver;
  if (installed) return;
  installed = true;
  installTracks();

  const originalSetTrack = AudioEngine.prototype.setTrack;
  const originalStartMusic = AudioEngine.prototype.startMusic;
  const originalPlay = AudioEngine.prototype.play;

  AudioEngine.prototype.setTrack = function setEraTrack(name) {
    engines.add(this);
    const resolved = resolvedTrack(this, name);
    return originalSetTrack.call(this, TRACKS[resolved] ? resolved : name);
  };

  AudioEngine.prototype.startMusic = function startEraMusic(name = this._rxMood ?? 'chill') {
    engines.add(this);
    const resolved = resolvedTrack(this, name);
    return originalStartMusic.call(this, TRACKS[resolved] ? resolved : name);
  };

  AudioEngine.prototype.play = function playEraSound(name, detail = {}) {
    engines.add(this);
    if (name === 'phototherapyEnter') {
      this._rxPhoto = true;
      this.setTrack(this._rxMood ?? 'chill');
      if (this.ctx && !this.muted) {
        this.tone(noteToFreq('A4'), { duration: 0.18, gain: 0.15, type: 'sine', slide: noteToFreq('E5') });
        this.tone(noteToFreq('A5'), { start: 0.08, duration: 0.28, gain: 0.11, type: 'sine' });
      }
      return;
    }
    if (name === 'phototherapyExit') {
      this._rxPhoto = false;
      this.setTrack(this._rxMood ?? 'chill');
      if (this.ctx && !this.muted) {
        this.tone(noteToFreq('E5'), { duration: 0.16, gain: 0.12, type: 'sine', slide: noteToFreq('A4') });
      }
      return;
    }
    if (name === 'phototherapy') {
      if (this.ctx && !this.muted) {
        const lines = Math.max(1, Math.min(4, detail.lines ?? 1));
        const scale = ['A4', 'C#5', 'E5', 'A5', 'C#6'];
        for (let i = 0; i <= lines; i += 1) {
          this.tone(noteToFreq(scale[i]), {
            start: i * 0.055,
            duration: 0.24 + i * 0.03,
            gain: 0.14 + i * 0.015,
            type: 'sine',
          });
        }
        this.noise({ duration: 0.18 + lines * 0.05, gain: 0.07, frequency: 5200, target: this.sfxGain });
      }
      return;
    }
    if (name === 'photoDrop') {
      if (this.ctx && !this.muted) this.tone(noteToFreq('D5'), { duration: 0.06, gain: 0.09, type: 'sine' });
      return;
    }
    return originalPlay.call(this, name, detail);
  };

  // Same look-ahead scheduler as AudioEngine, but the track may now describe
  // its historical timbre instead of every era being square + triangle.
  AudioEngine.prototype.schedule = function scheduleEraMusic() {
    if (!this.ctx || !this.playing) return;
    const track = TRACKS[this.trackName];
    if (!track) return;
    const beat = SIXTEENTH / track.tempo;
    const horizon = this.ctx.currentTime + 0.15;

    while (this.leadTime < horizon) {
      const [note, length] = track.lead[this.cursor.lead % track.lead.length];
      const duration = length * beat;
      if (note) {
        this.tone(noteToFreq(note), {
          start: this.leadTime - this.ctx.currentTime,
          duration: Math.max(0.05, duration * 0.85),
          gain: track.leadGain ?? 0.22,
          type: track.leadType ?? 'square',
          target: this.musicGain,
        });
      }
      this.leadTime += duration;
      this.cursor.lead += 1;
    }

    while (this.bassTime < horizon) {
      const [note, length] = track.bass[this.cursor.bass % track.bass.length];
      const duration = length * beat;
      if (note) {
        this.tone(noteToFreq(note), {
          start: this.bassTime - this.ctx.currentTime,
          duration: Math.max(0.06, duration * 0.8),
          gain: track.bassGain ?? 0.3,
          type: track.bassType ?? 'triangle',
          target: this.musicGain,
        });
      }
      const step = this.cursor.bass % track.drums.length;
      if (track.drums[step] === 'x') {
        this.noise({
          start: this.bassTime - this.ctx.currentTime,
          duration: track.photo ? 0.08 : 0.05,
          gain: track.photo ? 0.075 : 0.12,
          frequency: track.drumFrequency ?? 3200,
          target: this.musicGain,
        });
      }
      this.bassTime += duration;
      this.cursor.bass += 1;
    }
  };
}

export function refreshEraMusic() {
  for (const engine of engines) engine.setTrack(engine._rxMood ?? 'chill');
}

export function setPhototherapyMusic(active) {
  for (const engine of engines) {
    engine._rxPhoto = Boolean(active);
    engine.setTrack(engine._rxMood ?? 'chill');
  }
}
