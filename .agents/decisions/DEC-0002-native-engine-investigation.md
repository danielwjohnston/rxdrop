# DEC-0002: Investigate a native engine; keep the runtime choice open

**Date:** 10 October 2026
**Status:** **accepted by the Principal** (scope below). It does not adopt a
runtime.
**Author:** `claude-opus-5`
**Evidence:** [`docs/portability.md`](../../docs/portability.md),
[`docs/native-roadmap.md`](../../docs/native-roadmap.md), and #58
**Supersedes:** nothing. Related to DEC-0001 only through the shared Phase B
plan in [`docs/branch-audit.md`](../../docs/branch-audit.md).

## Question

The Principal proposed a native C++17/SDL2 runtime for RxDrop on 9 October
2026, starting with the Anbernic RG351V handheld, with WebAssembly, desktop
and mobile targets and a reusable foundation. `.agents/PROTOCOL.md` §20 names
Godot as the secondary target, and `docs/branch-audit.md` Phase B is a Godot
plan.

What does the project commit to now?

## Options considered

1. **Adopt the native roadmap whole.** C++17/SDL2 becomes the secondary
   target and Godot is dropped.
2. **Approve investigation and Phase 0; keep the runtime open until there is
   hardware evidence.** ← **accepted**
3. **Decline. Stay with Godot Phase B as written.**

## Evidence

- **Phase 0 shows the expensive part of any port is engine-neutral.** It was
  measured and merged in #58.
  - 3,055 lines of rules form a closed, browser-free import set.
  - Nine reference traces and a rotation table now define "kept the rules"
    for any runtime.
- **The constraints that make a port hard are the same for C++ and GDScript:**
  - a fixed 16 ms step (2×8 ms against 1×16 ms diverges by frame 210);
  - binary64 floats;
  - explicit 32-bit integer arithmetic;
  - the UTC daily key.

  Neither runtime is favoured by the rules.
- **The two runtimes differ in things only hardware can answer:**
  - frame time, input latency and audio latency on the RG351V's RK3326 and
    Mali-G31;
  - whether the handheld's firmware and GPU driver run a given Godot version;
  - the cost of keeping a C++ toolchain beside a deliberately unbuilt web
    game.

  None of these is measured. The device specification is published, not
  verified here.
- **The web game is not frozen.** `docs/status.md` records no web-complete
  decision. Phase B gates porting `game.js` on one.

## Tradeoffs

- **Option 1** commits to a toolchain and amends §20 before any device has run
  a frame.
- **Option 3** ignores a real target the Principal named, the handheld, whose
  constraints Godot may or may not meet.
- **Option 2** spends only on the evidence both other options lack. It is one
  hardware spike, and Phase 0 is already spent and reusable either way.

## Principal decision

**Accepted by Daniel Johnston, Principal, on 9-10 October 2026**, in the
instruction that carried this work into the cloud session: investigation and
Phase 0 are approved, and the runtime choice stays open until there is hardware
evidence.

What this authorises:

- Phase 0, done in #58.
- Phase 1 of `docs/native-roadmap.md`: a minimal SDL2 build and a minimal
  Godot build of the same scene, each with the rng and digest ports, measured
  on the RG351V. Device steps are the Principal's.

What it does not authorise:

- choosing the runtime, which is **DEC-0003**, after Phase 1;
- porting `game.js` before the web-freeze decision;
- amending §20.

## Open questions for the Principal

1. **The original proposal text.** `docs/native-roadmap.md` is a
   reconstruction. The original was not available to the session that wrote
   it.
2. **May a native toolchain live in this repository?** `AGENTS.md` forbids
   build steps and dependencies for the web game. A `native/` directory with
   its own CMake build, outside the web game's load path and with a
   non-required CI job, would keep that rule's purpose. But it is still a
   second toolchain, and the rule's author should say whether it is allowed.

## Confidence

**High** that option 2 is the cheapest correct next step. **None yet** on
which runtime wins; that is the point.

## Conditions that justify revisiting

- Phase 1 numbers arrive. Then write DEC-0003.
- The Principal makes the web-freeze decision, which unblocks Phase 2 for
  whichever runtime DEC-0003 picks.
- The RG351V stops being the target device. Then the spike's question
  changes.
- The original proposal says something this record or the reconstruction got
  wrong. Correct by superseding, not by rewriting.
