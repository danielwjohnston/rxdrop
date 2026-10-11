# Native engine and portable platform: roadmap

**Status:** proposal under review. Investigation and Phase 0 are approved;
the runtime choice is open (DEC-0002).
**Proposed by:** the Principal, 9 October 2026, as "RXDROP Native Engine &
Portable Gaming Platform".
**This text:** reconstructed on 10 October 2026, not transcribed, then
reviewed on 11 October. The review had three lenses (repo reality, governance,
feasibility) and a convergence pass. The original document was on the
Principal's machine and was not available to the cloud session that wrote
this. What is known of it comes from the summary relayed in the session
instruction, not checked against the original:

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

Measured on 10 October at `main` 252e4b3. Dates are UTC.

| | Proposal | Repository |
| --- | --- | --- |
| Unit tests | 318 | **333**. See note 1. |
| Quality gate | | 13-stage UltraGauntlet, 43 browser checks, required on `main` by ruleset |
| Native or Godot code | | **none**, on any branch |
| Port groundwork | | **Phase 0 done** (#58): `docs/portability.md`, nine reference traces, a rotation golden table |
| Music | | data since #57 (`src/score-data.js`, `docs/score.md`), so it ports without rewriting |
| Rules code | | 3,055 lines in a closed, browser-free import set |

**Note 1, the test count.** Without the original we cannot tell which 318 the
proposal meant:

- the docs said 318 from 6 October, which was a double count (CI said 313);
- #56 then genuinely took 313 to 318, merging at 00:13 UTC on 10 October,
  which was still the evening of 9 October at -05:00;
- #57 and #58 took it to 327 and then 333.

See `docs/status.md`, Quality gate.

## Constraints the proposal has to live with

1. **The web game stays dependency-free and unbuilt.**
   - `AGENTS.md` forbids a bundler, a framework or a package dependency. A
     native build needs a compiler, CMake and SDL2, so it must live in its own
     directory with its own build. It must never be on the web game's load
     path, in `sw.js`'s precache, or in `package.json`.
   - A separate directory alone does not keep it out of two things. `npm test`
     and the gauntlet's `rules` stage run a bare `node --test`, which finds
     test-named JS files and any JS under a `test/` folder anywhere in the
     tree, so `native/` must hold none, or the test script must name `test/`.
     And `pages.yml` publishes the whole checkout (`path: '.'`), so `native/`
     must be excluded from the Pages artifact.
   - Adding it is a Principal decision (DEC-0002, open question 2). Until he
     answers, Phase 1 code lives on a `claude/` spike branch or in a separate
     repository, and no PR proposes it for `main`. The ruleset requires CI
     checks, not review, so such a PR could merge without him.
2. **The required CI checks keep their names.** A native job can be added
   beside them, but not in place of them (`docs/status.md`, Quality gate).
3. **§20 names Godot as the secondary target.** Choosing a native C++ runtime
   instead would amend the Principal's protocol. That is why DEC-0002 keeps the
   runtime open rather than adopting this roadmap whole.
4. **No port before the web freeze.**
   - `docs/branch-audit.md` Phase B says "No Godot work starts before Phase A5
     (freeze)", because porting moving rules means porting them twice.
     `docs/status.md` lists the freeze as a critical blocker for Godot, and
     that decision is not yet made (`docs/status.md`, Next up).
   - Under that wording, Phase 1's Godot scene and its rng port are Godot
     work, and the rng port is Phase B's B0. But the audit is historical.
     `.agents/PROTOCOL.md` §20, the process authority, allows Godot to be
     explored as investigation, so the Godot half of Phase 1 rests on §20 and
     DEC-0002. §20 names no native target, so the SDL2 half rests on DEC-0002
     alone.
   - Either way, Phase 1 is spike code. Phase 2 is reviewed afresh rather than
     inherited from the spike, and it waits on the freeze and the runtime
     decision.

## Phases

*Phase 0, and hardware evidence before the runtime choice, are the
Principal's (DEC-0002). The content of Phases 1-5, their order, and the
deferrals in Phases 4 and 5 are this session's recommendations. They are
neither his proposal nor accepted. The proposal names WebAssembly, desktop,
mobile and a reusable foundation as targets, and demoting or deferring any of
them is his call (`.agents/PROTOCOL.md` §3).*

### Phase 0: groundwork. Done (#58).

- the audit, the parity matrix and the trace contract (`docs/portability.md`);
- `tools/trace.mjs`, which defines the snapshot and digest, and
  `tools/reference-traces.mjs`;
- `test/fixtures/traces/`, `test/fixtures/rotation-golden.json` and
  `test/reference-traces.test.js`.

These serve any runtime. All twelve findings that bind a port are in
`docs/portability.md` §1. Among them:

- a fixed 16 ms step;
- binary64 `double` with no floating-point contraction and no fast-math on
  every compiler: `-ffp-contract=off`, and never `-ffast-math`, on GCC and
  Clang; `/fp:precise`, never `/fp:fast` or `/fp:contract`, on MSVC;
- 32-bit integer operations exactly where the JavaScript uses `Math.imul` and
  `>>>` (the rng, the digest and the daily hash). Every other rules number is
  a double: the hurried fall interval, `dropInterval / SOFT_DROP_FACTOR`
  (`src/game.js:255`), is fractional;
- explicit seeds, kick order, and a cascade counter rather than object
  identity;
- the UTC daily key.

### Phase 1: the hardware spike

The question Phase 1 answers is whether RxDrop can hold 60 fps on the RG351V
in each candidate runtime, with input and audio latency good enough for the
game (and later for Sonotherapy). Until that is measured the runtime choice is
opinion, which is why DEC-0002 waits on it.

**Principal, on the device:**

1. **Before any build is made,** confirm the firmware (ArkOS or AmberELEC) and
   record:
   - `uname -m`;
   - `ldd --version` (glibc);
   - the installed `libSDL2` version;
   - the GPU driver (Mali blob or Panfrost);
   - the ALSA cards (`/proc/asound/cards`), and whether PulseAudio runs;
   - what provides the display: KMS/DRM, fbdev, or an X11 or Wayland server.
2. After a cold boot with Wi-Fi off, compare `date -u` with the real UTC time.
3. Install a candidate build and run it.
4. Film the button, the screen and the speaker at 240 fps or faster, for at
   least 20 presses per build. The median and p95 from the film are the
   latency.
5. Read off the numbers the build prints.

**Agent, on a spike branch** (not `main`, until DEC-0002 open question 2 is
answered):

- **Builds that load on the firmware.** These wait on the facts above.
  - The SDL2 build is cross-compiled for AArch64 against a sysroot whose
    glibc is no newer than the firmware's. libstdc++ is linked statically,
    and SDL2 is linked against the firmware's own.
  - At start it prints `SDL_GetCurrentVideoDriver()`,
    `SDL_GetCurrentAudioDriver()` and `GL_RENDERER`.
- **A worst-case scene in SDL2** at 640×480:
  - It draws a full 8×16 bottle of procedurally drawn viruses and capsule
    halves, fog on every row, the light overlay and one practitioner PNG.
  - It moves a capsule with the D-pad.
  - It synthesises live as many simultaneous voices (oscillators with
    envelopes, plus filtered noise) as the busiest arrangement in
    `src/score-data.js` uses.
  - It runs for ten minutes and reports audio underruns.
  - It prints frame-time percentiles (p50, p99) and the audio buffer size it
    obtained. Neither number is end-to-end latency: page-flip queueing, any
    compositor, scanout and the DAC all come after the program's last
    timestamp. So on a button press it flashes the screen and plays a click
    in the same frame, for the film to catch.
- **The same scene in Godot.**
  - Godot's Linux build expects an X11 or Wayland display server, which these
    firmwares are not known to ship. So it may run only through an extra
    layer: a platform port such as FRT, or a compositor runtime from
    PortMaster.
  - The findings record names the Godot version and the layer it ran on, and
    compares what would actually ship.
  - Which Godot versions each layer supports, and what the firmware's GPU
    driver can run, are unknown until measured.
- **The panel's real refresh**, measured by each build:
  - the mean and p99 vblank interval over 60 s with vsync on, beside the mode
    SDL reports;
  - whether vsync is honoured.

  The rules step a fixed 16 ms, which is 62.5 steps a second; a 60 Hz panel
  shows a frame every 16.67 ms.
- **The rng and digest ports** in both, checked against `rng-golden.json` and
  the FNV-1a vectors.
  - These are 32-bit integer code, so they prove the integer handling only. A
    build that fuses multiply-adds passes them unchanged.
- **A float probe** in both.
  - It steps two expressions over inputs recorded from the JavaScript:
    - the fog-growth expression (`src/game.js:638-641`,
      `fog + dt * FOG_RATE * weight * regrowth`, which a compiler can fuse);
    - the gravity-timer rescale (`src/game.js:437`, which catches `float`
      standing in for `double`).
  - It compares every intermediate value with a small golden file, bit for
    bit, as hex. It checks every step, not just the final value, because the
    cap at `FOG_MAX` erases a fused result.
  - Falsify it in the SDL2 build: compile for AArch64 with
    `-ffp-contract=fast` and show the probe fails, then with
    `-ffp-contract=off` and show it passes. The flags belong to the
    cross-compiler on the build host, not to the device.
  - GDScript takes no compiler flags, so the Godot build runs the probe as a
    check only.
- **Delivery to the device.** Candidate builds reach the Principal as
  workflow artifacts from the spike branch, or he builds them from source. No
  binary is committed, and no GitHub Release is made without him (§3).

**Exit:** a findings record in `.agents/findings/`, with measured numbers per
runtime. It must state:

- **The rules' own CPU cost is not measured**, because porting `game.js`
  waits on the freeze.
- **The live-loop policy.** There are two options, and either way the rules
  never receive the engine's delta:
  - one 16 ms step per vblank: on a 60 Hz panel the game then runs at 96% of
    the web game's speed, and drifts against the audio clock that Sonotherapy
    reads;
  - a wall-clock accumulator that steps a literal 16 ms, which adds an extra
    step about every 24 frames.

Then the Principal makes the runtime decision. It will be a new DEC record,
numbered when it is written.

Phases 2-5 below are written for the C++17/SDL2 candidate. Phase 2's order is
Phase B's B0-B5 (`docs/portability.md`, Order of work) and holds for either
runtime. Phases 3-5 assume SDL. If the runtime decision picks Godot, it says
how `docs/branch-audit.md` Phase B and this page combine.

### Phase 2: the rules, ported against the oracle

This waits on the web-freeze decision and the runtime decision. Port in the
order `docs/portability.md` gives:

1. `rng`;
2. the digest and snapshot;
3. `constants`, `board` and `pill`, against the rotation table;
4. `game` and the modifiers, against the traces;
5. `light`;
6. `versus` and `daily`.

The harness runs every trace headlessly and fails on the first frame that
diverges. It runs in CI as a separate, non-required job. Making it required is
a ruleset change, which only the Principal can make: propose it, never assume
it.

**Exit:** all nine traces and the rotation table pass on the native build, on
desktop and on the device.

### Phase 3: the platform layer

These are written natively, not translated:

- **Drawing.** Capsules, viruses and the bottle are procedural, so they are
  laid out from the screen size, 640×480 first. The 40 practitioner PNGs are
  reused.
- **Input.** Everything reduces to the eight commands plus pause, confirm,
  mute and restart. Left and right auto-repeat after 170 ms, then every 45 ms
  (`src/input.js:61-62`).
- **Audio.**
  - It reads the score as JSON, from `JSON.stringify(SCORE)`.
    `src/score-data.js` is JSON in all but syntax; adding the small export
    step is Phase 3's job.
  - It realizes arrangements per `docs/score.md`, ports `src/transport.js`'s
    semantics against the audio device's sample clock, and synthesises them.
- **Saves.**
- **The fixed-step loop**, with the policy Phase 1 chose.

**Exit:** a playable campaign, from level 0 through the level 20 finale, on
desktop and on the RG351V. It is judged by play, not traces, and its feel is
checked against the web game.

### Phase 4: the other targets, in value order

1. **Desktop:** Linux, then macOS and Windows. These come cheap once Phase 3
   runs on Linux.
2. **Other Linux handhelds** on the same firmware family. This is packaging
   plus layout: the RG351P and RG351M are 480×320.
3. **Mobile stores.** The PWA already runs on phones and installs to a home
   screen. A store build earns its upkeep only if the Principal wants store
   distribution.
4. **WebAssembly.** The JavaScript game *is* the web build. A WebAssembly
   build of the native core is useful mainly to run the native rules against
   the traces in a browser. Recommendation: last, and optional.

### Phase 5: the reusable foundation, when a second game exists

Recommendation: do not build a general engine up front. Keep the native code
split three ways:

- **Rules:** pure, deterministic, no SDL.
- **Platform:** SDL, files and audio devices.
- **Game shell:** menus and flow.

Extract the shared part when a second game needs it, so its shape comes from
two real uses rather than one guess.

## Risks

| Risk | Mitigation |
| --- | --- |
| Native work distracts from finishing the web game | Phase 2 waits on the web freeze, and Phase 0 is done. Phase 1 yields to the web-completion items in `docs/status.md`, Next up: if it starts to compete with them, stop and report rather than extend. |
| A float or step mismatch looks like a rules bug | The traces find the first frame that diverges. The flags and the fixed step are Phase 0 findings, and Phase 1's float probe checks the flags on the real cross-compiler. |
| The handheld's display stack or GPU driver cannot run a candidate runtime | Phase 1 records the firmware facts first and measures before choosing. |
| A 16 ms step on a 60 Hz panel runs slow or doubles a step, and drifts from the beat | Phase 1 measures the refresh, and its findings record picks the loop policy. |
| Audio latency on the handheld breaks Sonotherapy (#42) | Phase 1 measures it end to end, on film. The 90 ms window is the score's default, and no arrangement may widen it past half a beat (`docs/score.md`), so the window cannot absorb the latency. The calibration offset is what absorbs it, and `docs/ideas.md` already states that offset as a bound. |
| A wrong device clock gives the wrong daily | Phase 1 checks the clock. If it cannot be trusted, the daily needs network time or a date the player confirms. |
| A second toolchain to maintain forever | A separate directory and a non-required CI job, both subject to DEC-0002 open question 2. Phase 5 extraction waits on a second game. |
| Two runtimes evaluated, neither finished | The runtime decision picks one. The traces make a later switch cheaper, not free. |

## What needs the Principal

- the original proposal text, to reconcile with this page;
- confirmation of DEC-0002's scope (its two lists);
- the device steps in Phase 1;
- the web-freeze decision (`docs/status.md`, Next up);
- the runtime decision after Phase 1;
- whether a native toolchain, a Godot project or a native CI job may live in
  this repository at all (DEC-0002, open question 2).
