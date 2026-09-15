# Contributing to RxDrop

RxDrop accepts focused improvements to gameplay, accessibility, documentation,
testing, art, tooling and project direction. The repository is deliberately
small and evidence-driven; changes should stay reviewable and should not add
process for its own sake.

## Before changing anything

1. Read `README.md` for the current product and repository shape.
2. Read `AGENTS.md` if an AI agent will participate.
3. Read only the relevant sections of `docs/ideas.md`, `docs/direction.md` and
   `docs/branch-audit.md` for the work you are doing.
4. Check active pull requests and branches before substantial overlapping work.

The Principal-authored multi-agent rules live in `.agents/PROTOCOL.md`.

## Core project constraints

- The web version is the primary implementation today; Godot is a secondary,
  planned target.
- The web runtime stays dependency-light: vanilla ES modules, Canvas and the
  existing static PWA architecture unless the Principal explicitly changes that
  direction.
- Gameplay rules remain deterministic and separated from browser/UI concerns.
- Every mechanic needs a written bound explaining why it cannot leave a virus
  unanswerable, backed by a check when practical.
- A new check should be falsified: reproduce the failure or regression, observe
  the check fail, then verify it passes after the fix.
- Human play feedback that reveals a defect should become a durable regression
  check when practical.

## Documentation is part of the change

Do not update the software and leave GitHub describing the old project.

A pull request should update the relevant repository-facing material when it
changes any of the following:

- controls or player-visible behavior;
- supported modes or mechanics;
- architecture or file layout;
- test counts, commands or validation procedure;
- deployment behavior;
- project scope or target platforms;
- accepted design direction;
- branch/consolidation decisions;
- contributor or agent workflow.

That may mean updating `README.md`, `docs/`, `AGENTS.md`, `.agents/`, issue forms,
workflow files, or more than one of them.

## Verification

Use the smallest useful check while iterating. `AGENTS.md` documents current
costs and which UltraGauntlet stages apply to which files.

Before handing off substantial work, report exactly what was run and what was
not. Never claim a test passed if it was not executed successfully.

## Pull requests

Keep PRs focused and explain:

- what changed;
- why it changed;
- evidence supporting the change;
- tests or checks actually run;
- documentation updated with it;
- important alternatives considered and rejected;
- known risks or unverified assumptions.

For branch-wide strategy, major architecture or destructive repository
operations, preserve alternatives and leave the final decision to Daniel
Johnston as Principal.
