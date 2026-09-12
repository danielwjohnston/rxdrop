# DEC-0001 — Harvest the overhaul branch's art; do not merge the branch

**Date:** 12 September 2026
**Status:** **accepted by the Principal**
**Author:** `claude-opus-5`
**Evidence:** [`docs/branch-audit.md`](../../docs/branch-audit.md)
**Review:** three cycles, [`docs/collaboration.md`](../../docs/collaboration.md) §6

## Question

`main` and `openai/medical-eras-visual-overhaul` are parallel implementations of
overlapping ideas. Which parts of which should survive?

## Options considered

1. **Merge the branch into `main`.**
2. **Harvest its art onto `main`, leave its mechanics.** ← **accepted**
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

**Option 2 — accepted.** Confidence remains **high** on the technical comparison.
The sequencing guard below remains mandatory.

## Principal decision

**Accepted by Daniel Johnston, Principal, on 12 September 2026.**

The authoritative direction is:

1. Harvest the valuable art and presentation work from
   `openai/medical-eras-visual-overhaul` onto current `main`; do not merge the
   branch wholesale and do not port its superseded treatment mechanics.
2. Create the archival tag `archive/openai-medical-eras` at the audited branch
   tip, `40ebd8e4c22080fa497efb567cad325b13e9f5e7`.
3. Keep the source branch intact until the harvest has landed and passed its
   legibility, fallback/offline, and full-gauntlet verification.
4. After that verified harvest, delete
   `openai/medical-eras-visual-overhaul`. The archival tag preserves the exact
   source state and allows a branch to be recreated if later needed.

This decision explicitly authorizes the eventual branch deletion only after the
verification condition in item 3 is satisfied. It does not authorize deleting
the branch now.

## Conditions that justify revisiting

- The 130px legibility test fails (`docs/branch-audit.md` §7a A2.1). Then the
  harvest is a commission, and merging buys nothing either — both options
  change.
- Someone continues work on the overhaul branch, making it no longer stale.
- The Principal decides the branch's phototherapy is preferable to `main`'s
  after playing both.
