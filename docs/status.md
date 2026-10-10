# RxDrop current project status

**Last reviewed:** 10 October 2026, at `main` 4c8a9a5  
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

Since 9 October the gate is enforced on `main`. The repository ruleset
**main: require CI** blocks any change to `main` until three checks pass:
`Unit tests (Node 20.x)`, `Unit tests (Node 22.x)` and `UltraGauntlet`. Only
GitHub Actions can report those checks, and the ruleset has no bypass list. So
work reaches `main` through a branch and a pull request, never a direct push.
"Allow auto-merge" is on, so a PR can be queued to merge once its checks pass.

Two consequences:

- **The required checks are the CI job names.** Renaming a job in
  `.github/workflows/ci.yml` or changing its Node matrix stops that check
  reporting. Every PR would then wait on a check that never arrives. Update
  the ruleset in the same change; editing the ruleset is an admin action.
- **Only `pull_request` runs are the gate.** GitHub judges required checks
  per run, so a cancelled run carrying a required name blocks the PR even when
  another run of the same commit passed. That blocked #53 until the cancelled
  job was re-run. `ci.yml` now gives the required names only to
  `pull_request` runs, and never cancels them. Push runs still test every
  branch, but they report as `… [push]`, which the ruleset ignores. A red or
  cancelled `[push]` check makes `gh pr checks` exit non-zero without blocking
  the merge, so use `gh pr checks --required` to see the gate. A genuinely
  failed required check needs a fix or, if it was flaky, a re-run of that job;
  a re-run replaces its result.
- **Branches cut before this change** still produce required-named push runs
  until they merge `main`. A stale cancelled run on such a branch's head
  commit blocks its PR the old way. Re-run that job, or merge `main` in.

The gate consists of:

- **333 unit tests** on Node 20 and Node 22;
- the thirteen-stage UltraGauntlet;
- **43 browser checks** covering menus, input, daily, versus, offline/mobile
  behavior, and the campaign-complete path.

`main` at 583cf4e (PR #52, 6 October) passed CI — 313/313 unit tests on both
Node versions and 13/13 gauntlet stages including `browser` — and deployed to
GitHub Pages. On 9 October the unit suite (313/313) and the eleven fast gauntlet
stages were re-run locally on Node 22; `modifiers` and `browser` were not
re-run locally. New work should still report the checks actually run for that
change rather than inheriting an older green result.

> **Correction (9 October; resolved).** The 6 October docs reported 318 unit
> tests, but CI for that same `main` reports 313. The 318 was a double count,
> and no tests are missing:
>
> - #29 (6168262, 15 September) added `test/precache.test.js` and
>   `test/rng-golden.test.js`, three tests each, and the suite stood at 312.
> - #45's review fixes (5628906, merged in 777945e) added "gives a timer
>   session enough capsule-paced time to lock a light piece". That made 313,
>   though the docs were not bumped.
> - Commit c005985 ("Carry forward repository and portability regression
>   guards") changed no files. PR #48 described it as carrying forward the
>   precache and PRNG golden-vector guards. Those six tests were already on
>   `main`, so the docs went from 312 to 318.
> - No branch carries a test file or a test case that `main` lacks.
>
> The guards are present and green. The claim is retired, not recovered.
>
> **The suite was 318 again, genuinely, on 10 October.** `test/metadata.test.js`
> added five tests, taking 313 to 318. Both figures are correct for their
> dates, so do not "correct" that 318 back to 313. The score tests for #40 then
> took the suite to 327, and the Phase 0 reference-trace tests to 333.

## Current roadmap

No product code has landed since PR #52 on 6 October. #53 and #54 changed
only documentation and CI. The roadmap below is re-ordered by what is
unblocked now. The classifications follow
`.agents/PROTOCOL.md` §22 and are recommendations. Priority and scope remain
Principal decisions.

### Next up

| Item | Class | Waiting on |
| --- | --- | --- |
| Web-complete/freeze decision | critical blocker for Godot | Principal: decision, plus #47 scope call |
| #50 remainder: auto-delete, branch cleanup, social preview | high value, small | Principal: admin-only GitHub actions |
| #42 Sonotherapy prototype | normal implementation | Unblocked (#39 done); must land with a bound |
| #41 adaptive mixer | normal implementation | Unblocked (#40 done) |
| #43 Godot audio contract | normal implementation | Unblocked (#40 done) |
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

Most of issue #50 is applied. On 10 October the GitHub API showed the
description "Medical-history puzzle game where treatments evolve and infections
adapt.", the GitHub Pages homepage, and all seven topics. Separately, on 9
October the Principal applied "Allow auto-merge" and the **main: require CI**
ruleset described under Quality gate.

Four admin actions remain. Agent sessions so far have not had the access for
any of them:

- **Social preview.** `assets/social-preview.png` (1280×640) is committed and
  is already the page's `og:image`. GitHub's own social-preview setting has no
  API. Upload it under Settings → General → Social preview.
- **Automatically delete head branches after merge** is still off.
- **Delete the fully merged branches.** Each of these sixteen has a merged PR
  whose head is the branch's current tip, so nothing on them is missing from
  `main`: `claude/document-main-ci-ruleset` (#54),
  `claude/retire-c005985-guard-claim` (#55),
  `claude/roadmap-refresh-2026-10-09` (#53), `claude/rxdrop-setup-khf70o`
  (#29 and earlier), `devin/1789203310-cross-vendor-review` (#28),
  `devin/1789237782-practitioner-art` (#32), `devin/1789239438-ten-eras` (#33),
  `devin/1789244932-browser-testing-skill` (#34),
  `devin/1789245592-chain-scoring` (#35),
  `devin/1789245982-light-chamber-pace` (#36),
  `devin/1789247592-era-chiptunes` (#37),
  `devin/1789306513-review-fixes` (#45), `devin/audio-transport` (#44),
  `openai/project-state-followups-2026-10-06` (#52),
  `openai/project-state-sync-2026-10-06` (#48) and
  `openai/repository-surface-refresh` (#31).
- **Create the DEC-0001 archival tag.** DEC-0001 item 2 authorized
  `archive/openai-medical-eras` at `40ebd8e`. The repository has no tags, so
  that tag does not exist yet.

Three branches were closed without merging, and each still holds files that
`main` lacks. They are not fully merged, so deleting them needs a decision,
ideally with an archive tag first:

- `openai/project-state-convergence` (#51, the duplicate reconciled by #52);
- `devin/1789307833-consolidate-legacy` (#46, superseded);
- `openai/master-multi-agent-protocol` (#30). It alone carries
  `.agents/agents/openai-gpt-5.6-sol.md` and
  `.agents/tasks/TASK-0001-bootstrap-master-protocol.md`.

`openai/medical-eras-visual-overhaul` stays held under DEC-0001. Its deletion
waits on that decision's verification condition, not on tidiness.

### Audio

The authoritative transport requested by issue #39 is implemented. So is the
engine-neutral score schema of issue #40, on 10 October. The music is now data
in `src/score-data.js`, validated and realized by `src/score.js`, with the
contract in `docs/score.md`. A golden fixture proves the move changed no note,
drum or tempo. The remaining architecture work is tracked separately:

- #42 — Sonotherapy prototype. Unblocked. It is a new mechanic and ships only
  with a written bound and a gauntlet check. Its timing-window metadata and
  that window's bound already exist in the score.
- #41 — adaptive mixer and treatment-state mapping. Unblocked. The score
  declares the inputs (`danger`, `resistance`, `outbreak`, `phototherapy`,
  `mutation`, `antibody`) and how variants and stingers refer to them. The
  mixer maps game state to those inputs.
- #43 — Godot audio implementation contract. Unblocked. `docs/score.md`
  already separates specification from web-only behaviour for the score.

The parent architecture issue #38 remains open for the larger system.

### Narrative

The ten local era practitioners are implemented. The cross-era Historian proposed
in issue #47 is a separate narrative/event layer and is not implemented. Its
inclusion in the web-complete scope versus a later narrative expansion remains a
product decision rather than a technical blocker.

### Godot and native

There is no Godot or native implementation in this repository yet. The web
version remains the reference implementation. Portability work should preserve
deterministic gameplay semantics and engine-neutral contracts rather than copy
browser architecture literally.

Phase 0, the engine-neutral groundwork, landed on 10 October. It does not choose
an engine. `docs/portability.md` holds three things:

- the measured audit;
- a parity matrix;
- the contract a port is checked against: nine reference traces in
  `test/fixtures/traces/` plus `test/fixtures/rotation-golden.json`, recorded
  and checked by `tools/reference-traces.mjs`.

That is the JavaScript half of Phase B's differential oracle
(`docs/branch-audit.md`, B2).

Two findings bind any port:

- **The rules are deterministic per frame length, not per elapsed time.** Two
  8 ms steps diverge from one 16 ms step, so a port must use a fixed 16 ms step.
- **Rules state carries binary64 floats.** A C/C++ build needs
  `-ffp-contract=off`.

A native C++/SDL2 roadmap has been proposed. Its review and decision record wait
on the Principal supplying the roadmap text.

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

Tracked files and GitHub settings now both describe RxDrop as a medical-history
treatment puzzle:

- description: **Medical-history puzzle game where treatments evolve and infections adapt.**
  (applied);
- homepage: **https://danielwjohnston.github.io/rxdrop/** (applied);
- topics: `puzzle-game`, `javascript`, `pwa`, `canvas`, `medical-history`,
  `game-development`, `godot` (applied);
- `index.html` carries the matching meta description plus Open Graph and
  Twitter tags. Its `og:image` is `assets/social-preview.png`.
  `test/metadata.test.js` fails if that file goes missing, changes size or
  drifts out of step with the descriptions;
- the README screenshots `assets/screenshot.png` and `assets/versus.png` were
  re-captured on 10 October from the current game, with the bot playing level 9
  at seed 8675309. The September captures showed the old "Dr. Mario style"
  footer.

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
