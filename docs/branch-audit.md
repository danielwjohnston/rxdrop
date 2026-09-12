# Branch audit: `main` vs `openai/medical-eras-visual-overhaul`

**Audited 12 September 2026, at `main` 782d324 and overhaul `40ebd8e`.**
Open for review and comment — see [Review log](#review-log) at the bottom.

This exists because the two branches are now parallel implementations of
overlapping ideas, and nobody could say which parts of which should survive. It
answers that, and states what it is not sure about so a reviewer can attack it.

---

## 1. The shape of the divergence

The overhaul branch was cut at **`35eb061`** — PR #20, "Hurry is a speed, not a
move". Since then:

| | commits ahead of the merge base |
| --- | --- |
| `main` | 7 |
| `openai/medical-eras-visual-overhaul` | 16 |

**The branch predates seven merged PRs (#21–#27).** That single fact drives most
of what follows, because two of those PRs were fixes for defects real people hit
in playtesting.

## 2. The finding that decides the strategy

**The overhaul branch does not carry the PR #21 onboarding and reachability
fixes, and it does not carry the checks that protect them.**

| marker | `main` | overhaul |
| --- | --- | --- |
| `how-to-play` fold | 2 | **0** |
| `how__goal` (the one-line rules statement) | 1 | **0** |
| `how-diagram` (the worked match diagram) | 3 | **0** |
| `openHowToPlayOnFirstVisit` | 2 | **0** |
| `hasPlayed` (first-visit detection) | 5 | **0** |

Browser checks present on `main` and absent from the branch:

- `Play is reachable and tappable on every phone worth caring about`
- `a first visit says what the game is before asking anything of you`

Those two checks are not hygiene. They were written because **a tester could not
find the Start button on an iPhone**, and a second tester was "overwhelmed on
open instead of intrigued and onboarded into play". Merging this branch naively
reintroduces both failures *and* deletes the checks that would catch them.

The branch does carry the PR #20 fixes (`rescaleDropTimer`, `fallOffset`,
`lastFallInterval` all present), because those landed at the merge base.

## 3. Gate coverage

| | `main` | overhaul |
| --- | --- | --- |
| gauntlet stages | 13 | 13 |
| gauntlet checks | **64** | 59 |
| browser checks | **42** | 40 |
| unit test files | 15 | 15 |
| `tools/gauntlet.mjs` | 1521 lines | 1315 |
| `tools/browser-check.mjs` | 1748 lines | 1507 |
| `tools/bot.mjs` | 272 lines | 177 |

The branch is not "gutting the gauntlet" — stage count is intact and its own
tests pass (264 unit tests green, boots clean, playable). But it is **five
gauntlet checks and two browser checks lighter**, and the missing ones are not
arbitrary: they are the bounds `main` added for phototherapy plus the two
playtest checks above.

Checks the branch has that `main` does not are all **blackout** checks — see §4.

## 4. Three light systems, not one

The branch **kept the old blackout and layered on top of it**:

- 11 blackout constants still in `src/constants.js` (`LIGHT_CAPACITY`,
  `LIGHT_REFILL`, `LIGHT_ARM`, …)
- 16 references to blackout state in `src/game.js` (`blackoutFor`,
  `lightCharge`, `spendingLight`)
- plus its own `src/phototherapy.js` (406 lines)
- plus `src/sonic-therapy.js` (293 lines)

`main` cut blackout entirely and replaced it with `src/light.js` (326 lines).

So a merge yields **two complete, competing phototherapy implementations plus a
dead blackout**. The two-file textual conflict surface (§6) badly understates
this: the code merges cleanly and the *result* is incoherent.

Worse, the branch's phototherapy is the version the design originally specified,
which play has since falsified twice on `main`:

| behaviour | branch | `main`, after playtesting |
| --- | --- | --- |
| capsule while at the lamp | keeps falling unsteered | bench is suspended |
| light lifetime | 7.6s (≈1 full drop) | never fades |
| line → which row | the row it completed on | the lowest filmed row |
| film floor | 26% visible | 7% visible |

Every one of those differences is a reported defect the user hit in play:
*"lights disappear before i get a chance to line up"*, *"the medicine keeps
coming while in light therapy mode"*, *"the film actually doesn't cover enough"*.

**The branch's mechanics are not older-but-equivalent. They are the versions
already tested and rejected.**

## 5. What the branch has that is genuinely valuable

This is real work and `main` has no equivalent:

| file | what it is |
| --- | --- |
| `assets/medical-era-sprites.svg` | authored practitioner + scenery atlas (16 KB) |
| `assets/virus-mascots.svg` | authored virus mascot atlas (5.7 KB) |
| `src/periods.js` | **all eleven visual periods**, exactly as the direction doc asks |
| `src/art.js` | sprite loader with procedural fallback |
| `src/virus-theatre.js` | mascot reactions driven by game events |
| `src/music.js` | evolving historical arrangements |
| `src/overhaul-ui.js` | responsive presentation styles |

The eleven periods are named and implemented: Paleolithic Healer, Egyptian Swnw,
Hippocratic Physician, Bimaristan Physician, Barber-Surgeon, Plague Physician,
Patent-Medicine Showman, Germ-Theory Surgeon, Antibiotic-Era Physician,
Molecular Researcher, Precision Clinician.

**And the coupling is favourable.** Import graph of the branch's art modules:

```
art.js           -> (nothing)
periods.js       -> eras.js
virus-theatre.js -> board.js
music.js         -> audio.js
overhaul-ui.js   -> (nothing)
runtime-overhaul.js -> art, audio, board, constants, game, input, music,
                       periods, phototherapy, renderer, sonic-therapy,
                       virus-theatre
```

Only `runtime-overhaul.js` — the glue — touches the branch's mechanics.
**The art layer is separable from the mechanics layer at the module boundary.**

## 6. Merge mechanics

A test merge of the branch into `main` conflicts in exactly two files:

- `src/modifiers.js`
- `sw.js`

That is misleadingly cheap. See §4: a clean text merge produces a codebase with
two light systems and a dead third.

## 7. Recommendation

**Do not merge the branch. Harvest it.**

Take the art and presentation layer onto `main`; leave the mechanics behind.

1. **Port** `assets/*.svg`, `art.js`, `periods.js`, `virus-theatre.js`,
   `music.js`, `overhaul-ui.js` onto `main`.
2. **Write a new glue module** in place of `runtime-overhaul.js`, wiring the art
   to `main`'s renderer, `main`'s `light.js`, and `main`'s event stream. This is
   the only genuinely new code required.
3. **Do not port** `phototherapy.js`, `sonic-therapy.js`, or any blackout
   remnant. `main`'s light system is two rounds of play evidence ahead.
4. **Add gate coverage for the art layer** as it lands — the sprite loader's
   fallback path especially, since a missing atlas must degrade rather than
   break offline play.
5. **Retire the branch** once harvested, so it cannot be merged by accident.

Rationale: `main` is ahead on everything that was tested against a human, and
behind on everything that was drawn. Those are disjoint, and the module boundary
happens to fall in the right place.

## 8. Open questions for reviewers

These are genuinely undecided. Argue with them.

- **Q1.** Is harvest-not-merge right, or is it sunk-cost bias toward `main`
  (which this auditor wrote)? What would a merge-and-then-delete-the-old-system
  approach cost instead?
- **Q2.** `src/periods.js` gives eleven visual periods over five gameplay eras.
  Does the era→period mapping preserve saved formulary data? Untested here.
- **Q3.** The branch's `music.js` is an evolving-arrangement system. `main`'s
  audio is two chiptune loops. Is the branch's music harvestable without its
  `audio.js` changes, or is that coupling deeper than the import graph suggests?
- **Q4.** Sonic therapy exists on the branch as working code and on `main` only
  as a design proposal. Should the branch's implementation be read as a
  prototype to learn from before building `main`'s version?
- **Q5.** Asset weight is ~22 KB of SVG. The PWA precaches everything. At what
  point does the offline budget become a real constraint?

## 9. Model-strength research (as requested)

The premise under review was: *Claude better at code, OpenAI better at visuals
and story, Gemini has other talents.* Current reporting is **partly** consistent.

- **Code.** Claude leads independent SWE-bench evaluations; GPT-5.x matches on
  raw bug-fixing while leading on agentic tooling; Gemini 3.1 Pro leads
  LiveCodeBench. Each leads a *different* benchmark. Multiple sources caution
  that SWE-bench is contaminated for frontier models, so headline numbers should
  be treated with scepticism.
- **Visuals.** Supported. GPT-5.5 and Gemini 3.1 Pro are natively multimodal;
  Gemini bundles Imagen/Veo, making it the broadest creative toolkit.
- **Story.** **Not** supported. Claude is the one most consistently described as
  strongest for creative prose, voice matching, and long-form consistency.

**Practical reading for this project:** the split is not "Claude codes, OpenAI
writes". It is closer to *Claude for code and prose, Gemini or GPT for image
generation and multimodal asset work* — which is roughly what already happened
here by accident: the overhaul branch's value is its **generated art**, and its
weakness is **mechanics that were never play-tested**.

Sources: [Cosmic JS](https://www.cosmicjs.com/blog/best-ai-for-developers-claude-vs-gpt-vs-gemini-technical-comparison-2026),
[tech-insider](https://tech-insider.org/claude-vs-chatgpt-vs-gemini-2026/),
[Git AutoReview](https://gitautoreview.com/blog/claude-vs-gemini-vs-chatgpt-code-review),
[Tactiq](https://tactiq.io/learn/claude-vs-gemini-vs-chatgpt-for-writing),
[SiteGround](https://www.siteground.com/academy/chatgpt-vs-claude-vs-gemini-which-to-use).

## 10. A note on credentials

The brief permitted sharing access and credentials between agents, and also
required working within policy and guardrails. Those conflict, and the second
governs: **no credentials, tokens, or access have been shared with any agent or
external service**, and none should be. Cross-model collaboration on this repo
should happen by handing another model *this document* and the public repository
URL — never by handing it a token.

---

## Review log

Reviewers: append a dated section. State what you disagree with, not just what
you would add. An empty review is worse than none.

<!-- REVIEW CYCLES APPENDED BELOW -->
