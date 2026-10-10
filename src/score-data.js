/**
 * RxDrop's score: every era's music as data. `docs/score.md` is the schema.
 *
 * This file is JSON in all but syntax - plain objects, arrays, strings,
 * numbers, booleans and null, nothing computed - so another engine can read
 * the same score from `JSON.stringify(SCORE)`. test/score.test.js holds it to
 * that, and holds src/audio.js to playing exactly what it says.
 *
 * Events are [pitch, ticks]: scientific pitch ("A4", "C#5", "Eb3") or null for
 * a rest, lasting a whole number of ticks. A tick is a sixteenth note: four to
 * a beat. A percussion pattern is one kit symbol or "." per tick.
 */
export const SCORE = {
  format: 'rxdrop-score',
  version: 1,
  ticksPerBeat: 4,

  // What the game may tell the music. Names only: how a game state becomes
  // one of these is the mixer's job (#41), never the score's.
  inputs: {
    danger: { kind: 'flag' },
    resistance: { kind: 'level' },
    outbreak: { kind: 'level' },
    phototherapy: { kind: 'level' },
    mutation: { kind: 'event' },
    antibody: { kind: 'event' },
  },

  kit: { x: 'kick', h: 'hat', t: 'tom' },

  // The Sonotherapy timing contract (#42), read by gameplay through the
  // transport's beatWindow. windowMs is the whole window, centred on the beat.
  timing: {
    sonotherapy: { windowMs: 90, strongBeat: 'downbeat' },
  },

  motifs: {
    'genetic-arpeggio': {
      events: [
        ['A3', 1], ['C4', 1], ['E4', 1], ['A4', 1], ['C4', 1], ['E4', 1], ['A4', 1], ['E4', 1],
        ['F3', 1], ['A3', 1], ['C4', 1], ['F4', 1], ['A3', 1], ['C4', 1], ['F4', 1], ['C4', 1],
        ['C4', 1], ['E4', 1], ['G4', 1], ['C5', 1], ['E4', 1], ['G4', 1], ['C5', 1], ['G4', 1],
        ['G3', 1], ['B3', 1], ['D4', 1], ['G4', 1], ['B3', 1], ['D4', 1], ['G4', 1], ['D4', 1],
      ],
    },
    'genetic-walk': {
      events: [['A2', 2], ['F2', 2], ['C2', 2], ['G2', 2]],
    },
  },

  // Danger, unless an arrangement writes its own: a fifth faster, with a hat
  // on every off-sixteenth the drums leave empty. The era stays recognisable.
  variants: [
    {
      id: 'danger',
      when: { input: 'danger' },
      transforms: [
        { op: 'scaleTempo', by: 1.2 },
        { op: 'fillRests', stem: 'drums', hit: 'h', every: 2, offset: 1 },
      ],
    },
  ],

  arrangements: {
    protomedicine: {
      era: 'protomedicine',
      bpm: 84,
      meter: [4, 4],
      stems: {
        lead: {
          role: 'melody',
          timbre: 'triangle',
          part: [
            ['A3', 4], ['C4', 4], ['D4', 2], ['C4', 2], ['A3', 4],
            ['A3', 4], ['E4', 4], ['G4', 2], ['E4', 2], ['D4', 4],
            ['A3', 4], ['C4', 4], ['D4', 2], ['E4', 2], ['D4', 4],
            ['G4', 4], ['E4', 4], ['D4', 2], ['C4', 2], ['A3', 4],
          ],
        },
        bass: {
          role: 'bass',
          timbre: 'triangle',
          part: [
            ['A2', 8], ['E2', 8], ['A2', 8], ['E2', 8],
            ['A2', 8], ['E2', 8], ['A2', 8], ['E2', 8],
          ],
        },
        drums: { role: 'percussion', pattern: 'x...t...x..t....' },
      },
    },
    egyptian: {
      era: 'egyptian',
      bpm: 108,
      meter: [4, 4],
      stems: {
        lead: {
          role: 'melody',
          timbre: 'square',
          part: [
            ['E4', 2], ['F4', 2], ['G#4', 2], ['A4', 2], ['B4', 2], ['A4', 2], ['G#4', 2], ['F4', 2],
            ['E4', 2], ['D#4', 2], ['E4', 2], ['B3', 2], ['C4', 2], ['B3', 2], ['A3', 2], ['G#3', 2],
            ['E4', 2], ['F4', 2], ['G#4', 2], ['B4', 2], ['A4', 2], ['G#4', 2], ['F4', 2], ['E4', 2],
            ['D#4', 2], ['E4', 2], ['G#4', 2], ['A4', 2], ['B4', 2], ['C5', 2], ['B4', 2], ['E4', 2],
          ],
        },
        bass: {
          role: 'bass',
          timbre: 'triangle',
          part: [
            ['E2', 4], ['B2', 4], ['E2', 4], ['B2', 4],
            ['E2', 4], ['B2', 4], ['E2', 4], ['B2', 4],
            ['E2', 4], ['B2', 4], ['E2', 4], ['B2', 4],
            ['E2', 4], ['B2', 4], ['E2', 4], ['B2', 4],
          ],
        },
        drums: { role: 'percussion', pattern: 'x.x..x.x.x..x.x.' },
      },
    },
    hippocratic: {
      era: 'hippocratic',
      bpm: 120,
      meter: [4, 4],
      stems: {
        lead: {
          role: 'melody',
          timbre: 'triangle',
          part: [
            ['D4', 2], ['F4', 2], ['A4', 2], ['F4', 2], ['C4', 2], ['E4', 2], ['G4', 2], ['E4', 2],
            ['A3', 2], ['C4', 2], ['E4', 2], ['C4', 2], ['G3', 2], ['B3', 2], ['D4', 2], ['B3', 2],
            ['D4', 2], ['F4', 2], ['A4', 2], ['C5', 2], ['G4', 2], ['E4', 2], ['C4', 2], ['E4', 2],
            ['A3', 2], ['C4', 2], ['E4', 2], ['G4', 2], ['D4', 2], ['F4', 2], ['A4', 2], ['F4', 2],
          ],
        },
        bass: {
          role: 'bass',
          timbre: 'triangle',
          part: [
            ['D2', 8], ['D2', 8], ['C2', 8], ['C2', 8],
            ['A2', 8], ['A2', 8], ['G2', 8], ['G2', 8],
          ],
        },
        drums: { role: 'percussion', pattern: 'x...h.x.x...h...' },
      },
    },
    bimaristan: {
      era: 'bimaristan',
      bpm: 114,
      meter: [4, 4],
      stems: {
        lead: {
          role: 'melody',
          timbre: 'square',
          part: [
            ['D4', 1], ['Eb4', 3], ['F#4', 4], ['G4', 2], ['F#4', 2], ['Eb4', 2], ['D4', 2],
            ['D4', 1], ['Eb4', 3], ['F#4', 2], ['G4', 4], ['A4', 2], ['G4', 2], ['F#4', 2],
            ['D4', 1], ['Eb4', 3], ['F#4', 4], ['A4', 2], ['Bb4', 2], ['A4', 2], ['G4', 2],
            ['F#4', 1], ['G4', 3], ['A4', 4], ['G4', 2], ['F#4', 2], ['Eb4', 2], ['D4', 2],
          ],
        },
        bass: {
          role: 'bass',
          timbre: 'triangle',
          part: [
            ['D2', 8], ['G2', 8], ['D2', 8], ['D2', 8],
            ['G2', 8], ['D2', 8], ['G2', 8], ['D2', 8],
          ],
        },
        drums: { role: 'percussion', pattern: 'x..x.x..x..x.tt.' },
      },
    },
    apothecary: {
      era: 'apothecary',
      bpm: 120,
      meter: [4, 4],
      stems: {
        lead: {
          role: 'melody',
          timbre: 'triangle',
          part: [
            ['G4', 4], ['A4', 4], ['Bb4', 4], ['A4', 4],
            ['C5', 4], ['D5', 4], ['C5', 4], ['Bb4', 4],
            ['G4', 4], ['Bb4', 4], ['A4', 4], ['G4', 4],
            ['D5', 4], ['C5', 4], ['Bb4', 4], ['G4', 4],
          ],
        },
        bass: {
          role: 'bass',
          timbre: 'triangle',
          part: [
            ['D4', 4], ['E4', 4], ['F4', 4], ['E4', 4],
            ['G4', 4], ['A4', 4], ['G4', 4], ['F4', 4],
            ['D4', 4], ['F4', 4], ['E4', 4], ['D4', 4],
            ['A4', 4], ['G4', 4], ['F4', 4], ['D4', 4],
          ],
        },
        drums: { role: 'percussion', pattern: 'x.x.x.x.x.x.x.x.' },
      },
    },
    plague: {
      era: 'plague',
      bpm: 90,
      meter: [4, 4],
      stems: {
        lead: {
          role: 'melody',
          timbre: 'sawtooth',
          part: [
            ['D5', 8], ['C5', 4], ['Bb4', 4], ['A4', 8], ['G4', 4], ['F4', 4],
            ['E4', 8], ['F4', 4], ['D4', 4], ['C5', 8], ['Bb4', 4], ['A4', 4],
          ],
        },
        bass: {
          role: 'bass',
          timbre: 'triangle',
          part: [
            ['D2', 8], ['A2', 8], ['D2', 8], ['A2', 8],
            ['D2', 8], ['A2', 8], ['D2', 8], ['A2', 8],
          ],
        },
        drums: { role: 'percussion', pattern: 'x.......x.....xx' },
      },
    },
    patent: {
      era: 'patent',
      bpm: 132,
      meter: [4, 4],
      stems: {
        lead: {
          role: 'melody',
          timbre: 'square',
          part: [
            ['C5', 2], [null, 2], ['E5', 2], ['G5', 2], ['A5', 2], ['G5', 2], ['E5', 2], ['D5', 2],
            ['C5', 2], ['E5', 2], ['F5', 2], ['G5', 2], ['A5', 2], ['G5', 2], ['E5', 2], ['C5', 2],
            ['D5', 2], [null, 2], ['F5', 2], ['A5', 2], ['B5', 2], ['A5', 2], ['F5', 2], ['D5', 2],
            ['C5', 2], ['E5', 2], ['G5', 2], ['B4', 2], ['C5', 2], ['D5', 2], ['E5', 2], ['G5', 2],
          ],
        },
        bass: {
          role: 'bass',
          timbre: 'triangle',
          part: [
            ['C2', 2], ['E3', 2], ['G3', 2], ['E3', 2], ['C2', 2], ['E3', 2], ['G3', 2], ['E3', 2],
            ['C2', 2], ['E3', 2], ['G3', 2], ['E3', 2], ['C2', 2], ['E3', 2], ['G3', 2], ['E3', 2],
            ['C2', 2], ['E3', 2], ['G3', 2], ['E3', 2], ['C2', 2], ['E3', 2], ['G3', 2], ['E3', 2],
            ['C2', 2], ['E3', 2], ['G3', 2], ['E3', 2], ['C2', 2], ['E3', 2], ['G3', 2], ['E3', 2],
          ],
        },
        drums: { role: 'percussion', pattern: 'x.h.x.h.x.h.x.h.' },
      },
    },
    antisepsis: {
      era: 'antisepsis',
      bpm: 120,
      meter: [3, 4],
      stems: {
        lead: {
          role: 'melody',
          timbre: 'triangle',
          part: [
            ['F4', 4], ['A4', 4], ['C5', 4], ['C5', 4], ['Bb4', 4], ['A4', 4],
            ['F4', 4], ['G4', 4], ['A4', 4], ['C5', 4], ['A4', 4], ['F4', 4],
            ['Bb4', 4], ['A4', 4], ['G4', 4], ['A4', 4], ['C5', 4], ['D5', 4],
            ['C5', 4], ['Bb4', 4], ['A4', 4], ['F4', 4], ['G4', 4], ['F4', 4],
          ],
        },
        bass: {
          role: 'bass',
          timbre: 'triangle',
          part: [
            ['F2', 4], ['C3', 4], ['A2', 4], ['C2', 4], ['G2', 4], ['E2', 4],
            ['Bb2', 4], ['F3', 4], ['D3', 4], ['F2', 4], ['C3', 4], ['A2', 4],
            ['D2', 4], ['A2', 4], ['F3', 4], ['C2', 4], ['G2', 4], ['E2', 4],
            ['F2', 4], ['C3', 4], ['A2', 4], ['Bb2', 4], ['F3', 4], ['D3', 4],
          ],
        },
        drums: { role: 'percussion', pattern: 'x..h..h..h..' },
      },
    },
    pharmaceutical: {
      era: 'pharmaceutical',
      bpm: 150,
      meter: [4, 4],
      stems: {
        lead: {
          role: 'melody',
          timbre: 'square',
          part: [
            ['C5', 4], ['E5', 2], ['G5', 2], ['F5', 4], ['E5', 4],
            ['D5', 4], ['F5', 2], ['A5', 2], ['G5', 4], ['E5', 4],
            ['C5', 4], ['G5', 2], ['E5', 2], ['D5', 4], ['C5', 4],
            ['B4', 4], ['D5', 2], ['G5', 2], ['A5', 6], [null, 2],
          ],
        },
        bass: {
          role: 'bass',
          timbre: 'triangle',
          part: [
            ['C3', 8], ['A2', 8], ['D3', 8], ['G2', 8],
            ['C3', 8], ['A2', 8], ['G2', 8], ['G3', 8],
          ],
        },
        drums: { role: 'percussion', pattern: 'x..x..x...x.x...' },
      },
      // Its danger is its own tune, not the generic one: denser and, at 120,
      // slower than the calm loop.
      variants: [
        {
          id: 'danger',
          when: { input: 'danger' },
          bpm: 120,
          stems: {
            lead: {
              part: [
                ['E5', 2], ['G5', 2], ['A5', 2], ['B5', 2], ['A5', 2], ['G5', 2], ['E5', 4],
                ['D5', 2], ['E5', 2], ['G5', 2], ['A5', 2], ['G5', 2], ['E5', 2], ['D5', 4],
                ['C5', 2], ['E5', 2], ['G5', 2], ['A5', 2], ['G5', 2], ['E5', 2], ['C5', 4],
                ['D5', 2], ['F5', 2], ['A5', 2], ['B5', 2], ['A5', 2], ['F5', 2], ['D5', 4],
              ],
            },
            bass: {
              part: [
                ['A2', 4], ['A3', 4], ['E2', 4], ['E3', 4],
                ['F2', 4], ['F3', 4], ['G2', 4], ['G3', 4],
                ['A2', 4], ['A3', 4], ['E2', 4], ['E3', 4],
                ['D2', 4], ['D3', 4], ['G2', 4], ['G3', 4],
              ],
            },
            drums: { pattern: 'x.x.x.xxx.x.x.x.' },
          },
        },
      ],
    },
    genetic: {
      era: 'genetic',
      bpm: 168,
      meter: [4, 4],
      stems: {
        lead: { role: 'melody', timbre: 'square', part: [{ motif: 'genetic-arpeggio', repeat: 2 }] },
        bass: { role: 'bass', timbre: 'sawtooth', part: [{ motif: 'genetic-walk', repeat: 8 }] },
        drums: { role: 'percussion', pattern: 'x.h.x.h.x.hhx.h.' },
      },
    },
  },

  // The two loops RxDrop shipped with, kept as names: the calm and the danger
  // pharmaceutical tune. An alias's inputs win, so chill never turns.
  aliases: {
    chill: { arrangement: 'pharmaceutical', inputs: { danger: false } },
    fever: { arrangement: 'pharmaceutical', inputs: { danger: true } },
  },
};
