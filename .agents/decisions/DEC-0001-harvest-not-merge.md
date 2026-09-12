# DEC-0001 — Harvest the overhaul branch's art; do not merge the branch

**Date:** 12 September 2026
**Status:** recommendation — **awaiting Principal decision**
**Author:** `claude-opus-5`
**Evidence:** [`docs/branch-audit.md`](../../docs/branch-audit.md)
**Review:** three cycles, [`docs/collaboration.md`](../../docs/collaboration.md) §6

## Question

`main` and `openai/medical-eras-visual-overhaul` are parallel implementations of
overlapping ideas. Which parts of which should survive?

## Options considered

1. **Merge the branch into `main`.**
2. **Harvest its art onto `main`, leave its mechanics.** ← recommended
3. **Keep both branches indefinitely as competing directions.**

## Evidence

- The branch was cut at `35eb061` (PR #20) and predates seven merged PRs.
- It lacks the PR #21 onboarding and start-button-reachability fixes, and the
  two browser checks protecting them. Its `index.html`, `main.js` and
  `styles.css` are **byte-identical to the merge base** — it is not solving the
  problem another way. A naive merge reinstates a defect a real tester hit and
  deletes the check that catches it.
- A merge does not conflict meaningfully (two files) but **fails silently**:
  `src/phototherapy.js:3` imports `DARK_AT`, which `main` does not export, so
  the whole overhaul never loads. Fixing that export instead lets the branch's
  patched `setLight`/`updateLight` silently override `main`'s tested system.
- The branch's light mechanics are the versions play has already falsified
  twice on `main` (capsule unsteered, ~1-drop light lifetime, lines mapped to
  the completing row, 26% film floor).
- Its art is genuinely valuable and `main` has no equivalent: two authored SVG
  atlases, all eleven visual periods, a virus theatre, evolving music.
- The art is **not** cleanly separable — `doctors.js` pulls in a runtime that
  monkey-patches nine `Game` methods — so glue must be written either way.

## Tradeoffs

Harvest costs: five leaf modules, two SVGs, new glue, and a rewrite of the virus
theatre's event switch — never touching core.

Merge-then-delete costs: the same event rewrite, **plus** stripping prototype
surgery from 755 lines, fixing the `DARK_AT` export, restoring a silently
regressed `doctors.js` (436→140 lines, no conflict raised), and resolving the
service worker cache upward — while touching `Game`, `Board` and
`InputController`, with a silent-override failure mode.

## Recommendation

**Option 2.** Confidence: **high** on the technical comparison; **medium** on
sequencing, which depends on an untested assumption (below).

## Principal decision

**Not yet given.** Two parts of this require the Principal under §3:

1. **Branch consolidation.** The plan's step "tag `archive/openai-medical-eras`
   and delete the branch" is a destructive repository operation over a branch
   this agent did not create. **No agent should do this without Daniel's
   explicit instruction.** Recorded here as a recommendation only.
2. **Whether to consolidate at all.** §8 warns against collapsing competing
   branches merely for neatness, and this one may be worth keeping as a
   reference for the art even after harvesting.

## Conditions that justify revisiting

- The 130px legibility test fails (`docs/branch-audit.md` §7a A2.1). Then the
  harvest is a commission, and merging buys nothing either — both options
  change.
- Someone continues work on the overhaul branch, making it no longer stale.
- The Principal decides the branch's phototherapy is preferable to `main`'s
  after playing both.
