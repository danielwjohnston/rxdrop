# RxDrop current project status

**Last reviewed:** 6 October 2026  
**Canonical implementation:** `main`  
**Primary target:** Web/PWA  
**Secondary target:** Godot, after the web version reaches a Principal-approved completion point

This page is the short, current-state companion to the historical audit material.
Use it before `docs/branch-audit.md` when the question is "what is true now?"

## Product state

The web version is the executable product. It currently has:

- solo, seeded daily and local-versus play;
- resistance/tolerance and collateral sensitivity;
- hybrid strains and antibodies;
- outbreak, phototherapy, rationing, contaminated-batch and quarantine modifiers;
- chain and multi-line scoring;
- a ten-era medical-history presentation with reactive practitioner art;
- ten era-specific synthesized music arrangements;
- the physician's formulary;
- an authoritative musical transport in `src/transport.js`;
- offline PWA deployment through GitHub Pages.

The campaign runs from level 0 through level 20. Level 20 is a terminal campaign
state: clearing it completes the campaign and returns the player to the title
instead of silently replaying level 20.

## Quality gate

Every branch and pull request is covered by CI.

The gate consists of:

- unit tests on Node 20 and Node 22;
- the thirteen-stage UltraGauntlet;
- browser checks covering menus, input, daily, versus, offline/mobile behavior,
  and the campaign-complete path.

The latest integrated `main` before this status refresh passed CI and deployed
successfully to GitHub Pages. New work should still report the checks actually
run for that change rather than inheriting an older green result.

## Current roadmap

### Web completion / refinement

- Keep the shipped rules deterministic and bounded.
- Keep repository-facing documentation synchronized with behavior.
- Continue evaluating the Historian / cross-era narrative host in issue #47.
- Treat additional mechanics as expansion work rather than requirements for
  declaring the existing campaign structurally complete.

### Audio

The authoritative transport requested by issue #39 is implemented. Remaining
architecture work is tracked separately:

- #40 — engine-neutral score schema;
- #41 — adaptive mixer and treatment-state mapping;
- #42 — Sonotherapy prototype;
- #43 — Godot audio implementation contract.

The parent architecture issue #38 remains open for the larger system.

### Godot

There is no Godot implementation in this repository yet. The web version remains
the reference implementation. Portability work should preserve deterministic
gameplay semantics and engine-neutral contracts rather than copy browser
architecture literally.

## Branch and history policy

`main` is the canonical integrated product state.

Feature and review branches may remain visible after their useful work has already
landed. A branch name alone is therefore not evidence of an active competing
implementation. Compare it with `main` and inspect its associated PR before
treating it as current work.

Archival or destructive branch operations remain Principal-authorized under
`.agents/PROTOCOL.md`. Superseded branches should not be merged merely to make
the branch list tidy.

`docs/branch-audit.md` is a dated historical audit. It remains useful evidence
for why earlier branch decisions were made, but it is not the live roadmap.

## Repository-facing metadata

Tracked repository files describe RxDrop as a medical-history treatment puzzle.
The GitHub repository settings should match that framing as well:

- description: **Medical-history puzzle game where treatments evolve and infections adapt**
- homepage: **https://danielwjohnston.github.io/rxdrop/**
- suggested topics: `puzzle-game`, `javascript`, `pwa`, `canvas`,
  `medical-history`, `game-development`, `godot`

These fields live in GitHub repository settings rather than tracked files.
