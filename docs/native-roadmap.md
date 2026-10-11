# Native engine and portable platform: roadmap

**Status:** proposal under review. Investigation and Phase 0 are approved;
the runtime choice is open (DEC-0002).
**Proposed by:** the Principal, 9 October 2026, as "RXDROP Native Engine &
Portable Gaming Platform".
**This text:** reconstructed on 10 October 2026, not transcribed. The original
document was on the Principal's machine and was not available to the cloud
session that wrote this. What is known of it:

- a native C++17/SDL2 runtime;
- the Anbernic RG351V handheld as the first device;
- WebAssembly, desktop and mobile targets;
- a reusable foundation for later games;
- a stated baseline of 318 unit tests.

This page restates that intent, corrected against the repository. When the
original is supplied, reconcile it here and record what changed. Do not treat
this page as a transcript.

## What it is for

The proposal is a native RxDrop: one program that runs on a desktop, in a
browser through WebAssembly, on a phone, and on Linux handhelds starting with
the RG351V. It would be built on a small foundation that a later game could
reuse.

It does not replace the web game. `.agents/PROTOCOL.md` §20 makes the web
version primary until the Principal declares it mature, and nothing here
changes that.

## The baseline, corrected

The proposal predates several facts. Measured on 10 October at `main`
252e4b3:

| | Proposal | Repository |
| --- | --- | --- |
| Unit tests | 318 | **333**. 318 was a double count on 6 October; the real figure was 313 on 9 October; #56, #57 and #58 then added 20. See `docs/status.md`. |
| Quality gate | | 13-stage UltraGauntlet, 43 browser checks, required on `main` by ruleset |
| Native or Godot code | | **none**, on any branch |
| Port groundwork | | **Phase 0 done** (#58): `docs/portability.md`, nine reference traces, a rotation golden table |
| Music | | data since #57 (`src/score-data.js`, `docs/score.md`), so it ports without rewriting |
| Rules code | | 3,055 lines in a closed, browser-free import set |

## Constraints the proposal has to live with

1. **The web game stays dependency-free and unbuilt.** `AGENTS.md` forbids a
   bundler, a framework or a package dependency. A native build needs a
   compiler, CMake and SDL2, so it must live in its own directory, with its own
   build. It must never be on the web game's load path, in `sw.js`'s precache,
   or in `package.json`. Adding it is a Principal decision (DEC-0002, open
   question 2).
2. **The required CI checks keep their names.** A native job can be added
   beside them but not in place of them (`docs/status.md`, Quality gate).
3. **§20 names Godot as the secondary target.** Choosing a native C++ runtime
   instead would amend the Principal's protocol. That is why DEC-0002 keeps the
   runtime open rather than adopting this roadmap whole.
4. **No port of `game.js` before the web freeze.** `docs/branch-audit.md`
   Phase B gates porting the rules on a Principal-approved web-complete point,
   because porting moving rules means porting them twice. That decision is not
   yet made (`docs/status.md`, Next up). Phases 0 and 1 below are
   investigation, which §20 allows. Phase 2 is not.

## Phases

### Phase 0: groundwork. Done (#58).

- the audit, the parity matrix and the trace contract (`docs/portability.md`);
- `tools/reference-traces.mjs`;
- `test/fixtures/traces/` and `test/fixtures/rotation-golden.json`.

These serve any runtime. The findings that bind a port:

- a fixed 16 ms step;
- binary64 floats with `-ffp-contract=off`;
- explicit 32-bit integer arithmetic;
- the UTC daily key.

### Phase 1: the hardware spike

The question Phase 1 answers is whether RxDrop can hold 60 fps, with input and
audio latency good enough for the game (and later for Sonotherapy), on the
RG351V in each candidate runtime. Until that is measured the runtime choice is
opinion, which is why DEC-0002 waits on it.

**Principal, on the device:**

- confirm the firmware (ArkOS or AmberELEC) and whether it ships SDL2, and
  which version;
- install a candidate build;
- run it;
- read off the numbers the build prints.

**Agent, in the repository:**

- **A minimal SDL2 program.** It draws a bottle at 640×480 and moves a capsule
  with the D-pad. It prints frame time, input-to-photon estimates and audio
  buffer latency, and is cross-compiled for AArch64.
- **The same minimal scene in Godot**, for whichever Godot version the
  firmware's GPU driver can run. That is unknown until measured.
- **The rng and digest ports** in both, checked against `rng-golden.json` and
  the FNV-1a vectors, so the spike also proves the determinism flags work on
  the device's compiler.

The device facts this phase relies on come from published specifications and
are **unverified on hardware**:

- an RK3326 SoC: four Cortex-A35 cores (AArch64) and a Mali-G31 GPU;
- 1 GB of RAM;
- a 640×480 screen;
- a D-pad with face and shoulder buttons, and no touch.

**Exit:** a findings record, `F-0001`, with measured numbers per runtime. Then
the Principal makes the runtime decision, DEC-0003.

### Phase 2: the rules, ported against the oracle

This waits on the web-freeze decision and DEC-0003. Port in the order
`docs/portability.md` gives:

1. `rng`;
2. the digest and snapshot;
3. `constants`, `board` and `pill`, against the rotation table;
4. `game` and the modifiers, against the traces;
5. `light`;
6. `versus` and `daily`.

The harness runs every trace headlessly and fails on the first diverging
frame. It runs in CI as a separate, non-required job until it is stable.

**Exit:** all nine traces and the rotation table pass on the native build, on
desktop and on the device.

### Phase 3: the platform layer

These are written natively, not translated:

- **Drawing.** Capsules, viruses and the bottle are procedural, so they are
  redrawn at 640×480. The 40 practitioner PNGs are reused.
- **Input.** Everything reduces to the eight commands plus pause, mute and
  restart.
- **Audio.** It reads `src/score-data.js` through its JSON export, realizes
  arrangements per `docs/score.md`, and synthesises them.
- **Saves.**
- **The fixed-step loop.**

**Exit:** a playable campaign, from level 0 through the level 20 finale, on
desktop and on the RG351V. It is judged by play, not traces, and its feel is
checked against the web game.

### Phase 4: the other targets, in value order

1. **Desktop:** Linux, then macOS and Windows. These come cheap once Phase 3
   runs on Linux.
2. **Other Linux handhelds** on the same firmware family. Mostly a packaging
   question.
3. **Mobile stores.** The PWA already runs on phones and installs to a home
   screen. A store build earns its upkeep only if the Principal wants store
   distribution.
4. **WebAssembly.** The JavaScript game *is* the web build. A WebAssembly
   build of the native core is useful mainly to run the native rules against
   the traces in a browser. It is last, and optional.

### Phase 5: the reusable foundation, when a second game exists

Do not build a general engine up front. Keep the native code split three ways:

- **Rules:** pure, deterministic, no SDL.
- **Platform:** SDL, files and audio devices.
- **Game shell:** menus and flow.

Extract the shared part when a second game needs it, so its shape comes from
two real uses rather than one guess.

## Risks

| Risk | Mitigation |
| --- | --- |
| Native work distracts from finishing the web game | Phase 2 waits on the web freeze, and Phases 0-1 are small |
| A float or step mismatch looks like a rules bug | The traces find the first diverging frame. The flags and the fixed step are Phase 0 findings. |
| The handheld's GPU driver cannot run a candidate runtime | Phase 1 measures before choosing |
| Audio latency on the handheld breaks Sonotherapy (#42) | Phase 1 measures it. The score's 90 ms window is per-arrangement metadata, and calibration is already a stated bound in `docs/ideas.md`. |
| A second toolchain to maintain forever | A separate directory and a non-required CI job. Phase 5 extraction waits on a second game. |
| Two runtimes evaluated, neither finished | DEC-0003 picks one. The traces make a later switch cheaper, not free. |

## What needs the Principal

- the original proposal text, to reconcile with this page;
- the device steps in Phase 1;
- the web-freeze decision (`docs/status.md`, Next up);
- DEC-0003 after Phase 1;
- whether a native toolchain may live in this repository at all (DEC-0002,
  open question 2).
