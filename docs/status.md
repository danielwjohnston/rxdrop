# RxDrop current project status

**Last reviewed:** 9 October 2026, at `main` 583cf4e  
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

- **313 unit tests** on Node 20 and Node 22;
- the thirteen-stage UltraGauntlet;
- **43 browser checks** covering menus, input, daily, versus, offline/mobile
  behavior, and the campaign-complete path.

`main` at 583cf4e (PR #52, 6 October) passed CI — 313/313 unit tests on both
Node versions and 13/13 gauntlet stages including `browser` — and deployed to
GitHub Pages. On 9 October the unit suite (313/313) and the eleven fast gauntlet
stages were re-run locally on Node 22; `modifiers` and `browser` were not
re-run locally. New work should still report the checks actually run for that
change rather than inheriting an older green result.

> **Correction (9 October).** The 6 October docs reported 318 unit tests. CI
> for that same `main` reports 313. The bump from 312 to 318 accompanied commit
> c005985 ("Carry forward repository and portability regression guards"),
> which changed no files, and the guards it describes were not found on `main`,
> `openai/project-state-convergence` or `openai/repository-surface-refresh`.
> Whether those guards should be recovered or the claim retired is open below.

## Current roadmap

No product code has landed since PR #52 on 6 October. The roadmap below is
re-ordered by what is unblocked now. The classifications follow
`.agents/PROTOCOL.md` §22 and are recommendations. Priority and scope remain
Principal decisions.

### Next up

| Item | Class | Waiting on |
| --- | --- | --- |
| Web-complete/freeze decision | critical blocker for Godot | Principal: decision, plus #47 scope call |
| #50 repository settings and branch cleanup | high value, small | Principal: admin-only GitHub settings |
| Recover or retire the c005985 regression guards | high value, small | Any agent: locate or re-derive, then reconcile counts |
| #40 engine-neutral score schema | normal implementation | Unblocked; gates #41 and #43 |
| #42 Sonotherapy prototype | normal implementation | Unblocked (#39 done); must land with a bound |
| #41 adaptive mixer | normal implementation | #40 |
| #43 Godot audio contract | normal implementation | #40 |
| #47 cross-era Historian | product decision first | Principal: web-complete scope or later expansion |

### Web completion / refinement

- Keep the shipped rules deterministic and bounded.
- Keep repository-facing documentation synchronized with behavior.
- Treat additional mechanics as expansion work rather than requirements for
  declaring the existing campaign structurally complete.
- Run the full gate and make an explicit Principal-approved web-complete/freeze
  decision before shifting primary development effort to Godot. As of 9
  October, no such decision is recorded. `.agents/decisions/` holds only
  DEC-0001. The open scope question is whether #47 belongs inside web-complete.

### Repository administration

Issue #50 remains open, and none of its settings have been applied yet. As of 9
October the GitHub description still reads "A Dr. Mario clone". No homepage or
topics are set, and automatic deletion of merged head branches is off. #49 was
closed in favour of #50, but the settings it asked for are still unchanged.
These changes are admin-only, so they are Principal actions.

The PR #48 and #52 head branches (`openai/project-state-sync-2026-10-06`,
`openai/project-state-followups-2026-10-06`) are merged. The PR #51 duplicate
(`openai/project-state-convergence`) is closed and reconciled. Those three join
the cleanup candidates listed in #50. `openai/medical-eras-visual-overhaul`
stays held under DEC-0001.

### Audio

The authoritative transport requested by issue #39 is implemented. Remaining
architecture work is tracked separately, in dependency order:

- #40 — engine-neutral score schema. Unblocked, and gates #41 and #43.
- #42 — Sonotherapy prototype. Depends only on #39, so it is unblocked now. It
  is a new mechanic and ships only with a written bound and a gauntlet check.
- #41 — adaptive mixer and treatment-state mapping. Needs #40.
- #43 — Godot audio implementation contract. Needs #40.

The parent architecture issue #38 remains open for the larger system.

### Narrative

The ten local era practitioners are implemented. The cross-era Historian proposed
in issue #47 is a separate narrative/event layer and is not implemented. Its
inclusion in the web-complete scope versus a later narrative expansion remains a
product decision rather than a technical blocker.

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
As of 9 October they have not been applied. Issue #50 tracks them.

## Source hierarchy

When repository artifacts disagree:

1. Explicit Principal decisions and the Principal-authored
   `.agents/PROTOCOL.md` govern process and product authority.
2. Implementation, tests and runtime/deployment evidence establish what the
   software actually does.
3. This file is the current operational summary.
4. `docs/direction.md` expresses creative intent.
5. `docs/ideas.md` tracks mechanic status and design arguments.
6. Historical audits, collaboration records and `legacy/` preserve evidence
   and learning but are not automatically current product truth.
