# DEC-0002: Investigate a native engine; keep the runtime choice open

**Date:** 10 October 2026 (UTC)
**Status:** **accepted by the Principal**, as relayed in a session handoff.
The scope reading below is this session's own, and awaits his confirmation.
It does not adopt a runtime.
**Author:** cloud agent session `session_014ayrCU3iJV1QJHK8E9cys1` (no
profile in `.agents/agents/`)
**Proposal:** [`docs/native-roadmap.md`](../../docs/native-roadmap.md), a
reconstruction
**Evidence:** [`docs/portability.md`](../../docs/portability.md) and #58
**Review:** three lenses (repo reality, governance and feasibility) and a
convergence pass, 11 October 2026. The accepted fixes are in the commit after
c16ee86.
**Supersedes:** nothing. It relates to DEC-0001 only through the shared Phase
B plan in [`docs/branch-audit.md`](../../docs/branch-audit.md).

## Question

On 9 October 2026 the Principal proposed a native C++17/SDL2 runtime for
RxDrop, starting with the Anbernic RG351V handheld, with WebAssembly, desktop
and mobile targets and a reusable foundation.

Two existing documents point elsewhere. `.agents/PROTOCOL.md` §20 names Godot
as the secondary target. `docs/branch-audit.md` Phase B is a Godot plan.

What does the project commit to now?

## Options considered

1. **Adopt the native roadmap whole.** C++17/SDL2 becomes the secondary
   target, and Godot is dropped.
2. **Approve investigation and Phase 0, and keep the runtime open until there
   is hardware evidence.** ← **accepted**
3. **Decline, and stay with Godot Phase B as written.**

## Evidence

- **Phase 0 makes the check engine-neutral, not the work.** It was measured
  and merged in #58.
  - 3,055 lines of rules form a closed, browser-free import set.
  - Nine reference traces and a rotation table now define "kept the rules"
    for any runtime.
  - The larger part of a port is not engine-neutral. About 5,700 lines of
    platform code (drawing, menus, input, audio synthesis, saves, the loop)
    are rewritten for the target. About 5,500 port as logic
    (`docs/portability.md` §1).
- **The same constraints bind C++ and GDScript, but each runtime makes a
  different one cheap:**
  - a fixed 16 ms step, in both (2×8 ms against 1×16 ms diverges by frame
    210);
  - binary64 floats: free in GDScript. C++ needs `double`, no contraction and
    no fast-math in every translation unit, because GCC and Clang fuse
    multiply-adds on AArch64 by default;
  - 32-bit integer arithmetic for the rng and the digest: free in C++
    (`uint32_t`), while GDScript must mask `imul` and `>>>` by hand;
  - the UTC daily key, in both.

  Neither runtime is favoured by the rules.
- **The two runtimes differ in:**
  - on the device: frame time, input latency and audio latency on the
    RG351V's RK3326 and Mali-G31, and whether the handheld's firmware,
    display stack and GPU driver run a given Godot version;
  - off the device: the cost of the platform rewrite in each, and the cost of
    keeping a C++ toolchain beside a deliberately unbuilt web game. Godot
    supplies a scene and UI system, input mapping and export to other
    targets; an SDL2 build writes or chooses those itself. Sound synthesis
    has to be written in either.

  None of these is measured. Phase 1 measures only the first group, and the
  runtime decision must weigh the second. The device specification is
  published, not verified here.
- **The web game is not frozen.**
  - `docs/status.md` records no web-complete decision.
  - `docs/branch-audit.md` Phase B gates all Godot work on one: "No Godot
    work starts before Phase A5 (freeze)".
  - `.agents/PROTOCOL.md` §20 still allows Godot to be explored as
    investigation. It names no native target.

## Tradeoffs

- **Option 1** commits to a toolchain and amends §20 before any device has
  run a frame.
- **Option 3** ignores a real target the Principal named, the handheld, whose
  constraints Godot may or may not meet.
- **Option 2** spends only on the evidence both other options lack: one
  hardware spike. Phase 0 is already spent, and reusable either way.

## Recommendation

**Option 2.** That follows from the evidence and tradeoffs above, independently
of the instruction. Confidence is below.

## Principal decision

**Accepted by Daniel Johnston, Principal**, in the instruction carried into
cloud session `session_014ayrCU3iJV1QJHK8E9cys1`. That session opened on 10
October 2026 (UTC); the local session it continued ended on 9 October at
-05:00.

- **No verbatim text survives in the repository.** The handoff that the
  previous agent session wrote records his instruction as "implement the
  native-engine roadmap after applying the review's suggestions".
- **The scope comes from that handoff, not from him directly.** The handoff
  gives it as "investigation and Phase 0 approved; the runtime choice stays
  open until there is hardware evidence".

The two lists below are this session's reading of that scope, for the
Principal to confirm. They describe Phase 1 by its content, and that content
governs if `docs/native-roadmap.md` is later reconciled with the original.

What this authorises:

- Phase 0, done in #58.
- Phase 1 of `docs/native-roadmap.md`:
  - a minimal SDL2 build and a minimal Godot build of the same worst-case
    scene, each with the rng and digest ports and a float probe;
  - measured on the RG351V. The device steps are the Principal's.
  - The code lives on a spike branch or in a separate repository. It is not
    proposed for `main` until open question 2 is answered.

What it does not authorise:

- **Choosing the runtime.** That is the runtime decision: a new record after
  Phase 1, numbered with the next free DEC id when it is written. The
  web-freeze decision may take the next id first.
- **Phase 2 or any later phase before the web-freeze decision and the runtime
  decision.** No rules module is ported as the port, and spike code is not
  carried into Phase 2 unreviewed.
- **Adding a C++ toolchain, a Godot project or a native CI job to `main`.**
  That is open question 2.
- **Amending §20.**

## Open questions for the Principal

1. **The original proposal text.** `docs/native-roadmap.md` is a
   reconstruction; the original was not available to the session that wrote
   it.
2. **May a native toolchain, a Godot project or a native CI job live in this
   repository?**
   - `AGENTS.md` forbids build steps and dependencies for the web game.
   - A `native/` directory with its own CMake build, outside the web game's
     load path and with a non-required CI job, would keep that rule's
     purpose. But it is still a second toolchain, and the rule's author
     should say whether it is allowed.
   - A yes also needs `native/` kept out of `node --test` discovery and out of
     the Pages artifact (`docs/native-roadmap.md`, constraint 1).

## Confidence

**High** that option 2 is the cheapest correct next step. **None yet** on
which runtime wins; that is the point.

## Conditions that justify revisiting

- **Phase 1 numbers arrive.** Then write the runtime decision.
- **The Principal makes the web-freeze decision.** That unblocks Phase 2 for
  whichever runtime the runtime decision picks.
- **The RG351V stops being the target device.** Then the spike's question
  changes.
- **The original proposal contradicts this record or the reconstruction.**
  Correct it by superseding, not by rewriting.
