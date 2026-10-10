# Portability: what another engine has to reproduce

This is Phase 0 of moving RxDrop to another engine, measured on 10 October 2026
at `main` 3c86d48. It does not choose an engine. It is meant to serve either:

- the Godot plan (`docs/branch-audit.md`, Phase B);
- the proposed native C++/SDL2 build.

Phase 0 has three parts:

1. **The audit:** what the JavaScript actually depends on, measured.
2. **The parity matrix:** for each feature, how exact a port has to be, and what
   checks it.
3. **The reference traces:** recorded games that a port replays to prove it kept
   the rules. This is the JavaScript half of Phase B's "differential oracle"
   (B2), built before the rules it checks.

No port exists yet. Nothing here touches the web game.

## 1. The audit

### The layers

| Layer | Files | Lines | Browser APIs in code |
| --- | --- | ---: | ---: |
| Rules | `constants` `rng` `board` `pill` `light` `modifiers` `game` `versus` `daily` | 3,055 | 0 |
| Presentation data | `eras` `doctors` `formulary` | 1,301 | 0 |
| Music | `transport` `score` `score-data` | 1,132 | 0 |
| Platform | `main` `renderer` `input` `audio` `art`, plus `sw.js`, `styles.css`, `index.html` | 5,673 | 81 |

The rules form a closed import set: `game` imports `constants`, `board`,
`modifiers`, `light`, `pill` and `rng`, and nothing in the set imports outside
it. The browser-API count is code lines naming `document.`, `window.`,
`localStorage`, `requestAnimationFrame`, `AudioContext`, `new Image`, timers or
similar; comments are excluded. It splits `main` 71, `renderer` 4, `audio` 3,
`input` 2 and `art` 1, and the `art` one is an injectable default.

About 5,500 lines port as logic. About 5,700 are rewritten for the target.
That ratio, not the total, sizes a port.

### Findings that bind a port

1. **The rules are deterministic for a sequence of frame lengths, not for an
   amount of time.**
   - Replaying the `classic` trace in two 8 ms steps per frame instead of one
     16 ms step first diverges at frame 210. The `resistance` trace diverges at
     frame 138.
   - The web game feeds the rules a variable `requestAnimationFrame` delta,
     clamped to 100 ms (`src/main.js:1427`). So live web play reproduces from
     its inputs only if the same deltas are replayed.
   - A port must therefore step the rules at a **fixed 16 ms** to replay a
     trace, and it should step its live loop the same way. Replays, a saved
     ghost or netplay then fall out for free.
   - Moving the web loop to a fixed step is worth doing too, but it is a web
     change and is not made here.
2. **Floats must be IEEE-754 binary64, bit for bit.** Rules state carries
   doubles:
   - the gravity timer, rescaled by `interval / lastInterval` when hurry
     changes;
   - fog, which grows by `dt * rate * weight * regrowth`;
   - the lamp timers.

   GDScript's `float` is binary64. C and C++ need `double`, `-ffp-contract=off`
   and no `-ffast-math`. GCC and Clang both fuse multiply-adds into FMA on
   AArch64 by default, and the RG351V's Cortex-A35 is AArch64. A fused
   multiply-add rounds once where JavaScript rounds twice, and the trace
   diverges a few hundred frames later for no visible reason.
3. **32-bit integer arithmetic must be explicit.** `src/rng.js` relies on
   `Math.imul` (a signed 32-bit multiply) and `>>>` (an unsigned shift). Port
   it first, check it against `test/fixtures/rng-golden.json`, and port nothing
   else until it matches (Phase B, B0). The trace digest uses the same two
   operations.
4. **Three constructors default their seed to the wall clock**:
   `src/rng.js:5`, `src/game.js:84` and `src/versus.js:12`. A port should
   require an explicit seed. Only the platform layer chooses one (`src/main.js`
   uses `Math.random` there), and `Math.random` appears nowhere in the rules.
5. **The daily is keyed by the UTC calendar date.** `dailyKey()` is
   `new Date().toISOString().slice(0, 10)`. A port that uses local time gives
   players east or west of UTC a different daily puzzle.
6. **Turn order is part of the rules.** A turn first tries to repay the nudge
   owed by the previous turn, then the kick table in order
   (`src/pill.js:125`). Real play rarely reaches the turns where that order
   decides the outcome, so the traces alone let a port reorder the vertical
   kicks and still pass. This was found by falsifying the traces.
   `test/fixtures/rotation-golden.json` pins it with 600 seeded turns.
7. **One kick can never succeed.**
   - `HORIZONTAL_KICKS` lists `[1, 0]` ("blocked to the left"). But a capsule
     that fit before turning already holds the cell the horizontal turn
     anchors on. So when `[0, 0]` fails, the right-hand cell is blocked and
     `[1, 0]` fails with it.
   - In 20,000 seeded turns it was used zero times; `[-1, 0]` was used 1,613
     times.
   - A port may keep the entry or drop it. No test can tell the difference.
   - Recorded here, not removed, because it is harmless and documents intent.
8. **`Board.toStrings()` is not a complete board.** It keeps colour and
   virus-or-capsule. It drops resistance, tolerance caps, hybrid deliveries,
   decay, inert halves, outbreak spread and capsule links, all of which decide
   later turns. The gauntlet's determinism stage compares it, which is fine
   within one engine. Across engines the comparison unit is the trace snapshot
   below.
9. **A cascade is tracked by object identity.** Hybrids remember which
   parents arrived "in the same cascade" by comparing `cell.chain` to the
   game's current token object (`src/board.js:360`). A port needs a cascade
   counter, not a pointer. The snapshot exposes only what that identity means:
   deliveries in the cascade still running.
10. **Campaign progression is driven by the interface.** Clearing a level
    sets the phase to `won`, and `src/main.js:1133` calls
    `game.advanceLevel()` when the player moves on. The rules decide what a
    new level contains; the platform decides when to ask. The traces stop at
    a level's end.
11. **Saves are a web format.** Settings, the daily result and the formulary
    live in `localStorage` under `rxdrop.settings.v1`, `rxdrop.daily.v1` and
    `rxdrop.formulary.v2`. The last migrates `rxdrop.formulary.v1` through
    `LEGACY_ERA_IDS` (`src/formulary.js`). A port needs none of this unless it
    imports web saves. Era ids are still a migration contract
    (`docs/branch-audit.md` §7b), so a port's own saves should key on them.
12. **Assets are few.**
    - 40 practitioner PNGs: 10 eras × 4 poses, 264×264, drawn at half size.
    - 3 PNG icons and `favicon.svg`.
    - Every capsule, virus, bottle and effect is drawn by `src/renderer.js`,
      and every sound is synthesised.
    - The music is data (`src/score-data.js`, contract in `docs/score.md`) and
      ports as-is. Synthesis is the platform's.

### What the rules tell the rest of the game

The rules raise events, and audio and visuals react to them. A port should
raise the same ones, because the traces record them per frame:

`spawn` `move` `rotate` `hardDrop` `lock` `clear` `chain` `antibody` `resist`
`mutate` `speedUp` `levelComplete` `gameOver` `spread` `sealed` `unsealed`
`lightOn` `lit` `sterile` `lightOff` `flooded` `darkClear` `garbageQueued`
`garbage`, and from versus `attack` and `matchOver`.

## 2. The parity matrix

**Exact** means frame-identical: a reference trace or golden file fails if it
differs. **Equivalent** means the same behaviour for the player, built however
suits the engine. **Platform** means each target decides.

| Feature | Rules home | Parity | Pinned by | Notes for a native target |
| --- | --- | --- | --- | --- |
| Seeded generator | `rng.js` | Exact | `rng-golden.json` | Port first. 32-bit multiply and unsigned shift. |
| Virus layouts, levels 0-20 | `board.js` | Exact | every trace's first frames | |
| Capsule colours and the deal | `game.js` | Exact | traces (`next`) | |
| Moving, turning, kicks, owed kicks | `pill.js` | Exact | `rotation-golden.json`, traces | See findings 6 and 7. |
| Gravity, hurry, speed tiers | `game.js` | Exact | traces (capsule position per frame) | Binary64, fixed 16 ms step. |
| Lock delay and lock resets | `game.js` | Exact | traces | |
| Matching, clears, cascades | `board.js` | Exact | traces | |
| Scoring and chains | `game.js` | Exact | traces (`score`) | |
| Resistance, tolerance, collateral sensitivity | `board.js`, `game.js` | Exact | `resistance`, `daily` | |
| Hybrids, decay, antibodies | `board.js` | Exact | `resistance`, `phototherapy-neglected` | Cascade identity, finding 9. |
| Outbreak, quarantine, rationing | `game.js`, `modifiers.js` | Exact | `outbreak-quarantine-rationing` | |
| Contaminated batch | `game.js` | Exact | `contaminated` | |
| Phototherapy: film, chamber, lamp | `game.js`, `light.js` | Exact | `phototherapy`, `-neglected`, `-flooded` | Fog is binary64. |
| Versus garbage and result | `versus.js` | Exact | `versus` | Local only, as on the web. |
| Daily set-up | `daily.js` | Exact | `daily-2026-10-10`, `test/daily.test.js` | UTC date, finding 5. |
| Campaign 0-20, level 20 terminal | `game.js` and the platform | Equivalent | unit tests | Finding 10. |
| Eras, practitioners, vocabulary | `eras.js`, `doctors.js` | Equivalent | `test/eras.test.js` | Data ports as-is. |
| Formulary | `formulary.js` | Equivalent | `test/formulary.test.js` | Storage is the platform's. |
| Music notes and tempo | `score.js`, `score-data.js` | Exact | `tracks-golden.json`, `docs/score.md` | |
| Musical clock | `transport.js` | Exact semantics | `test/transport.test.js`, `docs/transport.md` | |
| Synthesis and effects | `audio.js` | Platform | none | |
| Drawing | `renderer.js` | Platform | none | A rewrite. Handheld: 640×480 screen. |
| Input | `input.js` | Equivalent | the eight commands | Handheld: D-pad and buttons, no touch. |
| Settings and saves | `main.js` | Platform | none | Finding 11. |
| Offline install | `sw.js` | Web only | `test/precache.test.js` | Native builds are offline anyway. |
| Frame loop | `main.js` | Platform, fixed step | none | Finding 1. |

Handheld notes come from the RG351V's published specification and are
unverified on hardware.

## 3. The reference traces

`test/fixtures/traces/*.json` holds nine games recorded from the JavaScript
rules, and `test/fixtures/rotation-golden.json` holds 600 turns. Together:

- they use all eight commands;
- they raise every event above;
- the rules reach a hybrid, an inert half, a sealed column, a repaid kick, a
  part-cured hybrid, outbreak spread, a won level, a lost game and a versus
  result.

`test/reference-traces.test.js` checks that the files still describe these
rules, and that the coverage above still holds.

### A trace

```js
{
  "format": "rxdrop-trace", "version": 1,
  "name": "resistance", "purpose": "...",
  "mode": "solo",                           // or "versus"
  "setup": { "level": 10, "speed": "MEDIUM", "seed": 20261010, "resistance": true },
  "frameMs": 16,
  "frames": 1932,
  "inputs": [[0, 0, "rotateCCW"], [1, 0, "rotateCCW"], ...], // [frame, player, command]
  "events": [[0, "spawn", "rotate"], [1, "rotate"], ...],     // [frame, ...types]; versus as "1:clear"
  "checkpoints": [{ "frame": 0, "state": { ... } }, ...],     // every 8th spawn and the last frame
  "digests": "7af715ae d82e2b7e ..."                        // one per frame, space-separated
}
```

`setup` is the constructor input for `Game`, or for `VersusMatch` in versus
mode.

### Replaying one

```text
game = new Game(setup)                         (or VersusMatch)
for frame in 0 .. frames-1:
    for each [f, player, command] in inputs where f == frame, in file order:
        apply command to player                (VersusMatch.command semantics)
    game.update(frameMs)
    compare digest(snapshot(game)) with digests[frame]
```

The eight commands are `left` `right` `rotateCW` `rotateCCW` `softDropOn`
`softDropOff` `hardDrop` `light`, exactly as `VersusMatch.command` routes them.
`light` toggles the lamp.

The first frame whose digest differs is where the port changed the rules. To
see what the JavaScript held at that frame:

```
node tools/reference-traces.mjs --show resistance 812
```

### The snapshot

`snapshot()` in `tools/trace.mjs` is the definition. It is a JSON object with
these keys, in this order, holding only integers, booleans, `null` and ASCII
strings:

| Key | Value |
| --- | --- |
| `phase` | `falling`, `clearing`, `settling`, `mutating`, `spreading`, `won`, `lost` |
| `level` `score` `viruses` | integers |
| `over` | boolean |
| `pill` | `null`, or `x,y/orientation:colours` with `iN` for an inert half and ` kX,Y` for an owed kick |
| `next` | the next capsule's two colours |
| `board` | one string per row, cells separated by spaces (tokens below) |
| `sealed` | the quarantined column, or `null` |
| `fog` | one character per row: `F` fogged (≥ 0.5), `f` filmed (> 0), `.` clear |
| `incoming` | queued garbage colours |
| `light` | `null`, or `{ "piece": "id@x,y/rotation", "rows": ["#..", ...] }` |

A versus snapshot is `{ "players": [snapshot, snapshot], "winner": n }`.

Cell tokens:

- `.` is an empty cell.
- `V` (virus) or `P` (capsule half), followed by the colour. Colours 0-2 are
  red, yellow and blue; 3-5 are hybrids.
- Then, in this order, only when present:
  - a link direction letter (`l` `r` `u` `d`);
  - `rN`, the virus's resistance;
  - `kN`, the colour that capped its tolerance;
  - `dN`, hybrid decay above zero;
  - `i`, an inert half;
  - `s`, a virus that arrived by spread;
  - `uA+B`, hybrid parents delivered so far, sorted;
  - `hA+B`, parents delivered in the cascade still running, sorted.

Floats never enter. Fog appears only as the two thresholds the rules test, and
the gravity timer shows up as the capsule moving a frame early or late. A
float difference is therefore caught one frame after it changes something,
which is the right moment.

### The digest

32-bit FNV-1a over the snapshot's `JSON.stringify` text: offset `0x811c9dc5`,
prime `0x01000193`, as eight lowercase hex digits. Check the port's hash
against the published vectors first: `""` → `811c9dc5`, `"a"` → `e40c292c`,
`"foobar"` → `bf9cf968`. The test holds the JavaScript to them.

### Rotation golden

```js
{ "board": ["........", ...], "pill": "2,13/3 k-1,0", "direction": -1, "result": "3,13/2" }
```

`board` uses `Board.from` notation: `r y b` capsule halves and `R Y B` viruses.
`pill` is `x,y/orientation`, plus ` kX,Y` for an owed kick. `result` is where
`tryRotate` leaves the capsule, or `null` if it refuses.

### Changing the rules

The traces are a contract. A deliberate rules change fails
`test/reference-traces.test.js`. Re-record with:

```
node tools/reference-traces.mjs --write
```

Then say in the commit which rule changed and why the traces moved. Re-record
nothing to make an accidental change pass. A trace that drifted from the rules
certifies nothing, and one regenerated to hide a regression certifies the
regression.

`node tools/reference-traces.mjs` with no flag checks every trace and the
rotation table, the same as the test. Any other argument is an error, never a
silent full run.

### What the traces do not cover

- **Drawing, sound, input feel** (repeat rates, touch gestures) and menus are
  platform, not rules.
- **Moving between levels:** finding 10. A port's campaign wiring needs its
  own test.
- **Live timing:** a trace pins a fixed 16 ms step. A variable step is not
  reproducible, here or anywhere.
- **The daily for other dates:** one date is traced. `test/daily.test.js`
  covers the derivation.

## Order of work for a port

1. `rng.js` against `rng-golden.json`.
2. The trace digest against the FNV-1a vectors, then `snapshot()`.
3. `constants`, `board` and `pill`, against `rotation-golden.json`.
4. `game` and the modifiers. Replay `classic` until it passes, then the rest.
5. `light`: the three phototherapy traces.
6. `versus` and `daily`: their traces.
7. The platform layer, judged by play rather than by traces.

This is Phase B's B0-B5 with the harness made concrete, and it applies
unchanged to a C++ build.
