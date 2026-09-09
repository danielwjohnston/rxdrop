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
| 7 | `versus` | Two games in one page stay separate. Asserts every attack sent is an attack received, that a match always resolves to exactly one winner, and that one player's input cannot touch the other's board. |
| 8 | `performance` | The rules are cheap. Measures worst-case and average `update()` cost at level 20 with resistance on against the 16.7 ms frame budget. |
| 9 | `browser` | It works in a browser, not just in Node. Runs the Playwright checks: menus, gamepad, touch gestures, versus, the daily, offline play, and a page with neither Web Audio nor localStorage. Skips cleanly if Playwright is not installed. |

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
- **`boundaries`** codifies the virus-ceiling rule after viruses were found
  spawning two rows below the neck by level 6.

## Using it

```sh
node tools/gauntlet.mjs           # everything, ~40s with Playwright installed
node tools/gauntlet.mjs --list    # the stages and what they attack
node tools/gauntlet.mjs fuzz      # one stage while iterating
```

The gauntlet is the merge gate for this repository: CI runs the same stages, and
a red stage means the change is not ready, whatever the feature looks like.
