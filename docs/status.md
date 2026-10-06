# RxDrop project status

**Last reviewed:** 6 October 2026  
**Canonical integration branch:** `main`  
**Primary target:** Web  
**Secondary target:** Godot

This page is the current operational snapshot. It answers "what is true now?"
without requiring a reader to reconstruct the September branch audit or the
creative-direction archive. Update it when shipped behavior, priorities,
validation, or platform scope materially changes.

## Product state

RxDrop is a playable medical-history falling-capsule puzzle game delivered as a
static browser PWA. The web implementation currently includes:

- solo campaign, date-seeded daily challenge, and local two-player versus;
- resistance/tolerance and collateral sensitivity;
- hybrid strains, combination treatment, and antibodies;
- outbreak, rationing, contaminated-batch, quarantine, and phototherapy systems;
- chain and multi-line scoring;
- a ten-era medical-history presentation with ten practitioner sets;
- the physician's formulary with ten tracked discoveries;
- ten era-specific synthesized music arrangements;
- an authoritative musical transport in `src/transport.js`;
- offline installation through the service worker and GitHub Pages deployment.

The campaign now has a terminal state at level 20. Completing the final case
shows **Campaign complete!** and returns the player to the title rather than
silently offering level 20 again.

## Architecture

The current web runtime intentionally stays small:

- vanilla ES modules;
- Canvas rendering;
- no production package dependencies or build step;
- deterministic rules separated from DOM/browser presentation;
- static deployment to GitHub Pages.

Godot remains a planned second phase. There is no hidden Godot implementation
in this repository. Engine-neutral specifications should be preserved where
they help a later port, but web completion remains the current priority.

## Validation

The established gate is:

- `npm test` - 312 unit tests at the start of this review;
- `npm run test:browser` - 43 browser checks after the campaign-ending
  regression added in this convergence pass;
- `npm run gauntlet` - 13 stages, including the browser suite;
- GitHub Pages deployment from `main`.

GitHub Actions is the release gate: Node 20 and Node 22 unit tests plus the
full UltraGauntlet must pass for a change to be treated as shipped. The Pages
workflow then deploys pushes to `main`.

## Current roadmap

### Web completion

1. Keep repository-facing documentation and issue state synchronized with code.
2. Preserve the terminal campaign-complete behavior and its browser regression.
3. Finish or explicitly defer the remaining audio architecture:
   - #40 engine-neutral score schema;
   - #41 adaptive mixer / treatment-state mapping;
   - #42 Sonotherapy prototype;
   - #43 Godot audio implementation contract.
4. Decide when the cross-era Historian in #47 belongs in the web-complete scope
   versus a post-freeze narrative expansion.
5. Run the full gate and make an explicit Principal-approved web-complete/freeze
   decision before shifting primary effort to Godot.

### Audio status

Issue #39's authoritative transport work has shipped through PR #44:
`AudioContext.currentTime` is the clock, scheduling uses look-ahead, gameplay
can query beat windows, pause/resume semantics are documented, and transport
tests cover drift and boundary behavior. #39 is closed as completed; #40-#43
carry the remaining audio architecture and Godot-handoff work.

### Narrative status

The ten local era practitioners are implemented. The Historian proposed in #47
is a separate cross-era narrative/event layer and is not implemented.

## Branch and history policy

`main` is the canonical integration baseline for the shipped web product.
Feature branches may still contain experiments or history, but branch count is
not a roadmap.

The September 2026 branch comparison is preserved in
[`docs/branch-audit.md`](branch-audit.md) as a historical audit. Its counts and
delivery-plan labels are not current status.

DEC-0001 remains in force for
`openai/medical-eras-visual-overhaul`: do not merge that runtime wholesale.
Preserve or harvest useful art/history, and only delete the source branch after
the decision's verification conditions are satisfied.

Merged or superseded feature branches should be removed once the Principal has
authorized cleanup so stale refs cannot be mistaken for active alternatives.
Historically useful evidence can live in `legacy/`, documentation, or archival
tags instead of remaining an apparent development branch.

## Repository-facing metadata

The README and package metadata should describe RxDrop as the medical-history
treatment puzzle it is now, not merely as a clone. The GitHub repository
description, homepage, topics, and automatic branch-deletion setting should be
kept aligned through repository settings when tooling permits.

Recommended repository metadata:

- **Description:** Medical-history puzzle game where treatments evolve and
  infections adapt.
- **Homepage:** https://danielwjohnston.github.io/rxdrop/
- **Topics:** `puzzle-game`, `javascript`, `pwa`, `canvas`,
  `medical-history`, `game-development`, `godot`
- **Delete head branches on merge:** enabled for ordinary merged feature
  branches.

## Source hierarchy

When sources disagree:

1. explicit Principal decisions and the Principal-authored
   `.agents/PROTOCOL.md` govern process and product authority;
2. implementation, tests, and runtime evidence establish what the software
   actually does;
3. this file is the current operational summary;
4. `docs/direction.md` expresses creative intent;
5. `docs/ideas.md` tracks mechanic status and design arguments;
6. historical audits and collaboration records preserve evidence and learning
   but are not automatically current truth.
