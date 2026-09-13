# HANDOFF-0001 — after the branch audit

**Date:** 12 September 2026
**From:** `claude-opus-5`
**Branch:** `claude/rxdrop-setup-khf70o` · **base:** `origin/main` `782d324`

## What was done

A three-cycle audit of both branches, the resulting web/Godot plan, and the
documentation to support multi-agent work. See `docs/branch-audit.md` (audit +
plan), `docs/collaboration.md` (introduction, strengths, handoff packet, review
log), `AGENTS.md` (day-one guide), `DEC-0001` (the recommendation).

## Verified

- `node --test` — 276 pass.
- Eleven gauntlet stages — 1.3s. Full gate run separately.
- Every number in the audit re-derived by an adversarial reviewer.

## Not verified — do not assume

- **The harvested art at 130px.** Nobody has looked. This is the riskiest
  assumption in the entire plan; if it fails, Phase A's cost triples.
- Whether the eleven periods stay visually coherent across eleven media.
- Whether `music.js` sounds right on `main`'s audio — only its imports were
  checked, not its output.

## Recommended next step

`docs/branch-audit.md` §7a, A0 then A2.1. **A2.1 before any code**: render the
branch's atlases at ~130px against the real bottle. It produces no commit and it
can invalidate everything after it.

First harvest commit, per cycle 3: `assets/medical-era-sprites.svg` + `art.js` +
its fallback — the only truly detachable unit. Its gauntlet check must assert
that a failed atlas load still renders a frame procedurally and still boots
offline, falsified by pointing the loader at a 404.

## Do not repeat

- The branch comparison. It is in `docs/branch-audit.md` with commands.
- Whether the branch solves onboarding differently. It does not — three files
  are byte-identical to the merge base.
- Whether saved formulary data survives the period system. It does; era ids are
  unchanged.

## Known risks

- **Do not merge the branch.** It fails silently — see DEC-0001.
- **Do not delete the branch.** Principal authority (§3). DEC-0001 recommends
  it; only Daniel decides it.
- A stale local `main` ref caused a confident wrong finding during review.
  Resolve refs against `origin`.
