## Summary

<!-- What changed, in one or two sentences. Link the issue, play feedback or docs/ideas.md entry if there is one. -->

## Why

<!-- The problem, evidence, play feedback or decision behind this change. -->

## Type of change

- [ ] Bug fix
- [ ] New mechanic or rule change
- [ ] Refactor / cleanup
- [ ] Documentation
- [ ] Build, CI, PWA or tooling

## Verification

<!-- Tick only what was actually run. Name the gauntlet stages you ran and the ones you skipped. -->

- [ ] `npm test` passes
- [ ] Gauntlet stages run: <!-- e.g. rules determinism timing boundaries fuzz resistance collateral hybrid versus playtest performance -->
- [ ] `modifiers` stage run if `src/modifiers.js` or `src/light.js` changed
- [ ] `browser` stage run if `index.html`, `src/styles.css`, `src/main.js` or `sw.js` changed
- [ ] Full gauntlet run once before handoff
- [ ] New or changed checks were falsified (bug reintroduced, check failed, fixed again) and the commit message says so
- [ ] `node tools/reference-traces.mjs` still replays if rules code changed
- [ ] Browser or gameplay validation performed if the change affects UI or feel

## Mechanic bound

<!-- For any new or changed mechanic: the sentence that says why it cannot leave a virus unanswerable, and the gauntlet check that enforces it. Delete this section otherwise. -->

## Docs and housekeeping

- [ ] Rules files (`board.js`, `pill.js`, `game.js`, `light.js`, `modifiers.js`, `rng.js`) still import no browser API
- [ ] `docs/status.md` updated if what is true now changed
- [ ] `docs/ideas.md` updated if a mechanic's status or bound changed, including rejected designs struck through with evidence
- [ ] `README.md` updated if behaviour, controls, architecture, scope or test commands changed
- [ ] `AGENTS.md`, `CLAUDE.md` or `.agents/` updated if contributor or agent workflow changed
- [ ] CI job names and Node matrix in `ci.yml` unchanged, or the Principal has been told to update the ruleset
- [ ] No documentation change needed

## Risks / open questions

<!-- Anything unverified, branch-specific or intentionally deferred. -->

## Alternatives considered

<!-- What was considered and rejected, and why, so the next contributor does not re-litigate it. -->
