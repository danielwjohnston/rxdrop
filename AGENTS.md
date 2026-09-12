# Working on RxDrop

For any agent or contributor picking this repository up cold. Read this first;
it is short on purpose.

## What this is

A Dr. Mario–style falling-capsule game about treating an evolving infection.
Zero dependencies, no build step, vanilla ES modules, canvas, offline PWA.
Those are deliberate constraints, not accidents — do not add a bundler, a
framework, or a package dependency.

## Read in this order

1. **`README.md`** — what the game is, how to run it, the file map.
2. **`docs/ultragauntlet.md`** — the quality gate and why each stage exists.
   Nothing else here makes sense before this one.
3. **Only the section you need** of `docs/ideas.md` (mechanics, each with its
   status and its bound) and `docs/branch-audit.md` (branch state, delivery plan).
4. **`docs/collaboration.md`** — multi-agent conventions and the handoff packet.
   Its §0 is a standing introduction from the agent that wrote most of `main`,
   including **a table of the errors it has actually made here and how each was
   caught**. If you are reviewing its work, start there — it will tell you where
   to look.

**Do not read `docs/direction.md` whole.** It is ~1200 lines of creative
direction, much of it since superseded by play. Read its header, its
"Where this stands" note, and its Addendum, then grep for the section you need.
The same goes for any file over ~800 lines — see the token budget below.

## The rules that are not negotiable

- **Every mechanic ships with a bound.** A written sentence saying why it cannot
  leave a virus unanswerable, enforced by a gauntlet check — not by intention.
  If you cannot write that sentence, the mechanic is not ready.
- **A new mechanic changes the meaning of an existing one.** A rule that sits
  beside the others adds length; a rule that changes what an existing rule
  *means* adds depth.
- **Falsify every check you write.** Reintroduce the bug, watch the check fail,
  then fix it again. A check never seen to fail is decoration. Say so in the
  commit message.
- **The rules never touch the DOM.** `board.js`, `pill.js`, `game.js`,
  `light.js`, `modifiers.js`, `rng.js` are pure and deterministic. That is what
  lets the gauntlet play thousands of headless frames — and what will make a
  Godot port tractable. Do not import a browser API into them.
- **Player feedback becomes a check.** When a human reports a defect, the fix
  ships with a check quoting their words verbatim in the comment. That is why
  regressions do not come back.

## Commands, and what they cost

```
npm start                     # serve at localhost:8080
npm test                      # 279 unit tests, ~0.9s   <- cheapest useful check
node tools/playtest.mjs       # the bot plays; reports on feel, not legality
node tools/gauntlet.mjs       # the full gate, ~5 minutes
```

**The gauntlet's cost is not evenly spread.** Measured:

| stage(s) | time |
| --- | --- |
| eleven stages together | **1.4 s** |
| `modifiers` | ~240 s |
| `browser` | ~65 s |

Full gate, all thirteen: **~5 minutes**.

So while iterating:

```
node tools/gauntlet.mjs rules determinism timing boundaries fuzz \
  resistance collateral hybrid versus playtest performance
```

That is 11 of 13 stages in under two seconds. Add `modifiers` when you touch
`src/modifiers.js` or `src/light.js`; add `browser` when you touch
`index.html`, `src/styles.css`, `src/main.js` or `sw.js`. Run the whole thing
once, before handing off. Never run the full gauntlet to check a one-line edit.

`node tools/gauntlet.mjs --list` prints every stage and what it is for.

**Two traps in that command line.** A mistyped *stage name* errors out, but a
mistyped *flag* is silently dropped (`gauntlet.mjs:1469` filters anything
starting with `-`) and the full five-minute gate runs instead — exactly the
mistake this section is trying to save you. Check the stage count in the output
line matches what you asked for.

Playwright is installed on demand (`npm i --no-save playwright`), not a
dependency. In this container the browsers are pre-installed and found through
`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`, which is already set — so do **not**
run `playwright install`, and do not add an `executablePath`: the repo's tooling
deliberately has none and relies on that variable. If you install a Playwright
version whose bundled browser revision differs from the pre-installed one, the
launch fails; pin to the installed revision rather than downloading.

## Token budget

Do not read these whole; grep and slice instead:

`tools/browser-check.mjs` (1748) · `tools/gauntlet.mjs` (1521) ·
`src/main.js` (1468) · `docs/direction.md` (1205) · `src/renderer.js` (1153) ·
`src/game.js` (1085) · `docs/ideas.md` (886)

Useful moves:
- `grep -n '^#\{1,3\} ' docs/whatever.md` — the whole shape of a doc for ~600
  tokens.
- `grep -n "check('" tools/gauntlet.mjs` — every check name without the bodies.
- `grep -n 'thing' file` then `sed -n 'A,Bp' file` — read the twenty lines you
  need, not the twelve hundred you don't.

## Handing off

A handoff needs four things, and the fourth is the one people forget:

1. Branch and HEAD sha.
2. Which gauntlet stages were run, and which were skipped.
3. What is left to do.
4. **What was considered and rejected, and why.** This is what stops the next
   agent re-litigating a settled question. `docs/ideas.md` keeps cut designs
   struck through with the evidence that killed them for exactly this reason.

## Branches

`main` is the truth. Feature branches are `vendor/topic` or
`claude/topic`. A branch that loses an audit gets tagged `archive/<name>` and
deleted the same day — a stale branch that looks mergeable is a trap, and this
repository has already been bitten by one.
