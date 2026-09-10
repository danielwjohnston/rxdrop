# The RxDrop UltraGauntlet

A test protocol built by combining two ideas, one of which turned out to be
real and one of which did not.

## What the two source ideas actually are

**Gauntlet prompting** is real and has a working definition: a *battery of
adversarial tests run in series* against a system, each attacking a different
weakness, with the results gated against a standard. The clearest published
example is the [AI Gauntlet](https://github.com/samugit83/redamon/wiki/AI-Gauntlet),
which runs an LLM endpoint through garak, PyRIT, Giskard and promptfoo and maps
what it finds onto the OWASP LLM Top 10. The useful part is the shape: many
independent attacks, run one after another, with a pass/fail gate at the end.

**Ultra prompting** is not an established technique. Searching the prompt
engineering literature turns up zero-shot, few-shot, chain-of-thought, self
consistency and role prompting - but nothing called "ultra prompting". The
nearest real thing is Claude Code's `ultrathink`, a keyword that raised the
model's thinking budget, and even that is
[now deprecated](https://decodeclaude.com/ultrathink-deprecated/) because
reasoning moved inside the flagship models. Worse for the naive reading,
[current guidance finds that exhaustive upfront prompts hurt](https://www.digitalapplied.com/blog/prompt-engineering-advanced-techniques-2026):
reasoning quality starts degrading past roughly 3,000 tokens.

So "ultra" cannot honestly mean *write more words*. Taken at its most useful,
it means **depth over breadth on the thing that matters** - spend the effort
where an error would actually cost you.

## The combination

> **UltraGauntlet:** a series of adversarial stages, each aimed at one specific
> assumption the system makes about itself, where every stage is a hard gate and
> the depth goes into *what could be wrong*, not into *how much is written*.

Three rules keep it honest:

1. **Every stage attacks an assumption, not a feature.** "Does versus work" is a
   demo. "Is garbage conserved between the two bottles" is a gauntlet stage.
2. **Every stage is executable.** A stage that cannot fail on its own is
   decoration. `node tools/gauntlet.mjs` exits non-zero.
3. **A stage that has never failed is suspect.** Each one below is listed with
   what it has actually caught.

## The stages

Run them all with `node tools/gauntlet.mjs`, or a few with
`node tools/gauntlet.mjs fuzz versus`. `--list` prints the set.

| # | Stage | The assumption it attacks |
| --- | --- | --- |
| 1 | `rules` | The rules are what the tests say they are. Runs the whole unit suite. |
| 2 | `determinism` | A seed reproduces a game. Replays solo, versus and the daily and compares boards and scores. |
| 3 | `timing` | The clock is well behaved. Feeds zero, negative, sub-millisecond and 60-second frames, pauses mid-cascade, and pokes input into phases that should refuse it. |
| 4 | `boundaries` | The interesting cases are in the middle. Checks all 21 levels for virus quota and ceiling, every speed, both walls, a blocked spawn and garbage aimed at a full column. |
| 5 | `fuzz` | Play is orderly. Runs long random games across four setups and asserts after every single frame that nothing floats, no match survives resolution, and viruses are conserved. |
| 6 | `resistance` | The new mechanic obeys the old rules. 200 seeded boards mutated repeatedly, checking a mutation never creates a free clear, never changes the virus count, and always hands play back. |
| 7 | `collateral` | No virus may become unanswerable. Sweeps every colour at every resistance level to prove something still kills it, checks that a collateral kill only ever takes tolerant viruses, and that resolution terminates on a board where everything shrugs. |
| 8 | `hybrid` | A combined strain must still come apart. Proves no capsule is ever dealt in a hybrid colour and no hybrid ever appears in a match; that both parents cure every strain in either order; that both in one cascade always synthesise an antibody; that one parent alone always breaks it in the end; and that a hybrid never forms anywhere it cannot be treated from. |
| 9 | `modifiers` | A modifier may change a run, never end it. Executes the bound each modifier writes down: outbreak's three caps and its gravity floor, blackout's self-ending timer and never-black floor and a light that is neither free nor spendable into a corner, rationing's rotation and the cost it has to impose, the contaminated batch washing out, quarantine's expiry and its placement-only reach - then plays every modifier alone and all five at once with the same bot the playtest uses, and finally plays the whole formulary at once to prove every discovery in the notebook is one that playing can actually trigger. |
| 10 | `versus` | Two games in one page stay separate. Asserts every attack sent is an attack received, that a match always resolves to exactly one winner, and that one player's input cannot touch the other's board. |
| 11 | `playtest` | The game is playable, not merely legal. Asserts a hurried capsule never falls faster than a hand can place a lateral into it, and that a capsule always lands with time to be steered. `npm run playtest` runs the full version: a bot plays whole games and reports reaction budgets, juggling room, hybrid cures and how far it gets. |
| 12 | `performance` | The rules are cheap. Measures worst-case and average `update()` cost at level 20 with resistance on against the 16.7 ms frame budget. |
| 13 | `browser` | It works in a browser, not just in Node. Runs the Playwright checks: menus, gamepad, touch gestures, versus, the daily, offline play, and a page with neither Web Audio nor localStorage. Skips cleanly if Playwright is not installed. |

## What it has caught

The stages are not ceremony. Building this set surfaced real defects:

- **`fuzz`** caught that `totalVirusesCleared` is a lifetime counter while
  `startingViruses` resets per level, so the conservation invariant silently
  broke the moment a player advanced a level. Fixed by splitting
  `virusesClearedThisLevel` from the run total.
- **`browser`** caught a `data-screen` name mismatch that left the pause card
  hidden behind a blank overlay with no way to resume.
- **`browser`** caught that both versus canvases sized themselves independently,
  giving player one a bottle three times the size of player two's.
- **`playtest`** caught two things the same day it was written: hurrying at the
  top speeds fell faster than a hand can place a lateral into, and the bot only
  ever considered horizontal placements because a vertical capsule does not fit
  on the spawn row - which had been quietly halving every measurement it made.
- **`collateral`** was written before the mechanic and caught the thing that
  mattered: removing the stack a shrugged clear sheds makes a tolerant virus
  unkillable on a board with no room for a collateral run. The stage goes red on
  exactly that.
- **`hybrid`** caught `applyMatch` booking a cure against a strain and then
  never removing it, because the game happened to delete the cell separately.
  Every unit test passed; the stage went red with "strain 3 survived both
  parents". It also caught the antibody window being one clear wide rather than
  one cascade, which made the single most rewarding play in the game - clear a
  run, let the other parent fall into the gap - pay nothing extra.
- **`modifiers`** was written alongside the modifiers and immediately caught the
  blackout reservoir oscillating on its own floor - empty, refill one frame,
  power one frame of light, empty again - which made the light infinite. The
  playtest saw the same defect from the other side, as a row of numbers
  identical to a plain game. Reintroduce any of the four bounds as a regression
  and the matching check goes red: uncap outbreak's generations, make the light
  restore instantly, stop washing out inert halves, or let a seal be permanent.
- **`modifiers`** caught rationing being a **relief** rather than a challenge.
  Two colours make runs easier to build, and that outweighed the wait by every
  measure: longer runs, more clears, more viruses killed per capsule, and the
  only setup that ever finished a level. The stage now holds it to the one claim
  that matters - viruses per capsule must be worse than a plain bottle - and the
  fix was to make a stock-out drive resistance in the colour it withholds.
- **`modifiers`** also caught something about checks rather than about the game.
  Its playability check first used a random-column hard-dropper as the player,
  which loses a level-4 bottle in ten capsules without clearing anything - so
  the check failed on the *unmodified* game. The fix was to lift the playtest
  bot into `tools/bot.mjs` so the gate and the measurement ask about the same
  player; a stand-in that cannot play says nothing about the rule under test.
- **`boundaries`** codifies the virus-ceiling rule after viruses were found
  spawning two rows below the neck by level 6.
- **`browser`** caught three checks that had hard-coded row 15 as the floor of
  the bottle. They kept passing on a 16-row board for the wrong reason and went
  red the moment the neck row made the board 17 rows tall - which is exactly
  what a check pinned to a constant should do.

## Using it

```sh
node tools/gauntlet.mjs           # everything, ~40s with Playwright installed
node tools/gauntlet.mjs --list    # the stages and what they attack
node tools/gauntlet.mjs fuzz      # one stage while iterating
```

The gauntlet is the merge gate for this repository: CI runs the same stages, and
a red stage means the change is not ready, whatever the feature looks like.
