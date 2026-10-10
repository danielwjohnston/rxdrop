# The score

RxDrop's music is data. `src/score-data.js` holds every era's arrangement as a
plain JSON-shaped object. `src/score.js` validates it and realizes it, and
`src/audio.js` only voices what it is handed. This page is the schema, written
so that a Godot (or native) renderer can play the same file and be held to the
same notes. It closes issue #40 and is the input #41 (adaptive mixer), #42
(Sonotherapy) and #43 (Godot audio contract) build on.

The transport (`docs/transport.md`) says *when* a beat is. The score says *what*
plays on it.

## The shape

```js
{
  format: 'rxdrop-score',
  version: 1,
  ticksPerBeat: 4,            // a tick is a sixteenth note
  inputs: { danger: { kind: 'flag' }, resistance: { kind: 'level' }, ... },
  kit: { x: 'kick', h: 'hat', t: 'tom' },
  timing: { sonotherapy: { windowMs: 90, strongBeat: 'downbeat' } },
  motifs: { 'genetic-arpeggio': { events: [...] }, 'pulse': { pattern: 'x.h.' } },
  variants: [ /* score-wide rules, e.g. the generic danger treatment */ ],
  arrangements: { protomedicine: { ... }, ..., genetic: { ... } },
  aliases: { chill: {...}, fever: {...} },
  stingers: [ /* one-shot motifs for event inputs */ ],
}
```

| Field | Meaning |
| --- | --- |
| `ticksPerBeat` | Resolution of every duration in the file. RxDrop uses 4 (sixteenths). |
| `inputs` | The names the game may send the music, each a `flag` (true/false), a `level` (0..1) or an `event` (a moment, no standing value). |
| `kit` | The percussion alphabet: one character per sound. `.` is always a rest. |
| `timing.sonotherapy` | Default beat-window contract (below). An arrangement may override it. |
| `motifs` | Reusable material: either `events` (a melody) or `pattern` (a rhythm). |
| `variants` | Score-wide rules an arrangement inherits unless it defines a variant with the same `id`. |
| `arrangements` | One per era: `era`, `bpm`, `meter`, `stems`, optional `variants` and `sonotherapy`. |
| `aliases` | Another name for an arrangement with some inputs pinned. |
| `stingers` | A motif to play when an `event` input fires, quantized to the next `beat` or `bar`. |

### Events, patterns and motifs

- An **event** is `[pitch, ticks]`. Pitch is scientific notation (`"A4"`,
  `"C#5"`, `"Eb3"`) or `null` for a rest; ticks is a whole number above zero.
- A **pattern** is a string with one kit symbol or `.` per tick.
- A melodic **part** is a list of events and motif references:
  `{ motif: 'theme', repeat: 2, transpose: 7 }`. `transpose` is in semitones,
  and transposed notes are spelled with sharps.
- A percussion **pattern** may also be a list of strings and rhythm-motif
  references, joined in order.
- Motifs contain only plain events or a plain pattern. They never reference
  other motifs, so there are no cycles.

Two arrangements that reference the same motif share material by
construction, which is what "a shared motif/rhythm identity" across eras means
here. `test/fixtures/score-minimal.json` shows it: one motif, two eras, a fifth
apart and in different metres.

### Arrangements and stems

```js
antisepsis: {
  era: 'antisepsis',
  bpm: 120,
  meter: [3, 4],                                  // [beats per bar, beat unit]
  stems: {
    lead:  { role: 'melody',     timbre: 'triangle', part: [...] },
    bass:  { role: 'bass',       timbre: 'triangle', part: [...] },
    drums: { role: 'percussion', pattern: 'x..h..h..h..' },
  },
}
```

- `role` is one of `melody`, `bass`, `harmony`, `percussion`, `texture`. It
  says what the stem is *for*, so a renderer chooses an instrument by role and
  the mixer (#41) can address "the percussion" in any era.
- `timbre` is a waveform name (`square`, `triangle`, `sawtooth`, `sine`). It is
  not a Web Audio enum: every engine can synthesise these four.
- Every stem is a whole number of bars long. Stems may differ in length; the
  arrangement loops at their least common multiple, each stem repeating until
  it fills it. A longer form (A A B) is written as motif references inside a
  part.

### Variants: how inputs reach the music

A variant is how the score responds to a `flag` or `level` input:

```js
{ id: 'danger', when: { input: 'danger' },
  transforms: [{ op: 'scaleTempo', by: 1.2 },
               { op: 'fillRests', stem: 'drums', hit: 'h', every: 2, offset: 1 }] }

{ id: 'tension', when: { input: 'resistance', atLeast: 0.5 },
  stems: { bass: { part: [['Bb2', 16]] } } }
```

- `when` names one declared input. A flag matches when true. A level matches
  at or above `atLeast`. An event cannot select a variant, because it has no
  standing value; it fires a stinger instead.
- A variant may set `bpm`, replace any stem's `part`/`pattern`/`timbre` (never
  its `role`), and apply `transforms`. The two operations are `scaleTempo`
  (multiply bpm) and `fillRests` (put `hit` on every rest of a percussion stem
  where `index % every === offset`).
- Active variants apply in order: score-wide ones first, in declaration order,
  then the arrangement's own additions.
- An arrangement's variant with the same `id` *replaces* the score-wide one.
  That is how `pharmaceutical` has its own written danger tune while every other
  era gets the generic treatment.
- An arrangement has at most eight variants, defaults included.

**What the score never contains** is game logic. `danger` is a name; deciding
when the bottle is "in danger" is the game's job, and mapping game state to
inputs is the mixer's (#41). A score file can be read, validated and played
with no simulation present.

### `fever` and `chill`

The two loops RxDrop launched with are now aliases:

```js
chill: { arrangement: 'pharmaceutical', inputs: { danger: false } },
fever: { arrangement: 'pharmaceutical', inputs: { danger: true } },
```

An alias's inputs win over the caller's, so `chill` stays calm even while the
bottle is in danger. That is the behaviour `resolveTrack` had before the move.

## The Sonotherapy timing contract

```js
timing: { sonotherapy: { windowMs: 90, strongBeat: 'downbeat' } }
```

- `windowMs` is the **whole** window, centred on the beat: 90 means ±45 ms.
  That matches the transport's `beatWindow(t, windowMs)`.
- `strongBeat` is `downbeat` (the bar line is the strong beat, the same
  `downbeat` that `beatWindow` reports) or `none`.
- **The bound:** the window may cover at most half a beat at the *fastest*
  tempo the arrangement can reach, with every combination of its variants
  applied. Any wider and most actions land "on the beat" by accident, so the
  mark stops measuring timing. RxDrop's fastest arrangement is `genetic` in
  danger, at 201.6 bpm (a 298 ms beat). 90 ms is well inside the 149 ms limit.
  `parseScore` enforces this, and `test/score.test.js` covers it.

This is metadata only. Sonotherapy itself (#42) has not been built.

## Guarantees

`parseScore(score)` is pure: the same input always gives a deep-equal model, the
input is never modified, and any problem is a `ScoreError` whose `path` names the
offending field (`arrangements.egyptian.stems.lead.part[3]`). The model is
frozen. `realize(model, name, inputs)` is pure too, and refuses inputs the
score never declared or values of the wrong kind.

`test/score.test.js` holds:

- the RxDrop score to plain JSON, deep-equal after `JSON.stringify` and `parse`;
- parsing to determinism and immutability;
- one arrangement per era, matching `src/eras.js`;
- the fixture to exactly the output it describes;
- 25 malformed scores, each refused at the right path;
- the Sonotherapy bound at the fastest variant tempo;
- **the migration.** `test/fixtures/tracks-golden.json` is what `audio.js`
  played before the notes moved into the score. It covers every era, calm and
  in danger, plus both aliases. Moving the notes changed no note, drum or
  tempo.

## Specification versus web-only

**Specification**, which another engine must reproduce:

- the schema and its validation rules;
- variant order and replacement;
- `fillRests` and `scaleTempo` semantics;
- alias precedence;
- least-common-multiple looping;
- the Sonotherapy window and its bound.

Given the same score and inputs, a renderer must produce the same pitches,
durations, drum steps and bpm.

**Web-only**, free to differ:

- how a timbre or kit sound is synthesised. `audio.js` uses oscillators and
  short noise bursts (`DRUM_HIT`);
- the scheduler's look-ahead;
- the renderer voicing exactly three stems (`lead`, `bass`, `drums`). The
  schema allows more roles. `audio.js` refuses an arrangement it cannot voice,
  rather than silently dropping a stem.

## Not in version 1

- **Instrument definitions.** The score names a timbre or a kit sound, not how
  to synthesise it.
- **Dynamics, articulation and swing.** Every note plays at the renderer's
  fixed level. The old `0.85` and `0.8` length factors stay in `audio.js` as
  articulation.
- **Continuous mappings** (a level driving a filter cutoff, say). Those belong
  to the mixer (#41). The score only says which inputs exist and which variants
  they select.

A breaking change bumps `version`, and `parseScore` refuses versions it does not
know.
