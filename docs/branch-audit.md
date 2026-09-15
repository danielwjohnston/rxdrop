# Branch audit: `main` vs `openai/medical-eras-visual-overhaul`

**Audited 12 September 2026, at `origin/main` 782d324 and
`origin/openai/medical-eras-visual-overhaul` 40ebd8e.**
Refs are given against `origin` deliberately: a reviewer of this document
resolved `main` against a stale local pointer and produced a confident, wrong
finding as a result.
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

**The branch predates fourteen merged PRs — 31 commits.** *(Originally "seven
(#21–#27)", measured 12 September 2026 against `main` at `782d324`; re-measured
15 September against `f548356`.)* That single fact drives most
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
open instead of intrigued and onboarded into play".

**Corrected in cycle 4 — the original wording here was wrong.** It said
*"merging this branch naively reintroduces both failures and deletes the checks
that would catch them."* That is not what a merge does. The branch changes
thirteen files and **none of them is `index.html`, `src/main.js`,
`src/styles.css` or `tools/browser-check.mjs`** — all four are byte-identical to
the merge base (`index.html` `20102a8`, `src/main.js` `57aa671`,
`src/styles.css` `12e8d5e`, `browser-check.mjs` `c134397`). Where the branch
side equals the base, a three-way merge resolves to **ours**, so main's
onboarding fold and both browser checks survive a merge untouched.

This document already applied the correct reasoning two sections later — §4:
*"The branch never touched `game.js` or `constants.js`, so a merge takes
`main`'s versions of both."* The same logic was not applied here.

**What is true, and still sufficient:** the branch **as a standalone artifact**
lacks the onboarding fixes and the checks. That matters for a checkout, for
shipping the branch, or for any harvest that replaces main's files — not for a
merge. The recommendation below is unchanged, but it rests on the module-load
failure and the prototype patching in §4, **not** on this.

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

## 4. Three light systems on the branch, and a silent failure on merge

Taken on its own, the branch **kept the old blackout and layered on top of it**:

- 11 blackout constants still in `src/constants.js` (`LIGHT_CAPACITY`,
  `LIGHT_REFILL`, `LIGHT_ARM`, …)
- 16 references to blackout state in `src/game.js` (`blackoutFor`,
  `lightCharge`, `spendingLight`)
- plus its own `src/phototherapy.js` (406 lines)
- plus `src/sonic-therapy.js` (293 lines)

`main` cut blackout entirely and replaced it with `src/light.js` (326 lines).

**What a merge actually produces — corrected on review, and it is worse than
the original claim here.** The branch never touched `game.js` or
`constants.js`, so a merge takes `main`'s versions of both: no dead blackout
survives (`grep -cE 'LIGHT_CAPACITY|BLACKOUT'` on the merged `constants.js`
returns 0). Instead:

> `src/phototherapy.js:3` imports `DARK_AT`, which the branch exports and
> `main` does not. Post-merge that is
> `SyntaxError: The requested module './constants.js' does not provide an
> export named 'DARK_AT'` — **the entire overhaul silently never loads.**

A merge would look successful, pass a smoke test, and ship nothing. And if
someone "fixed" it by re-adding the export, the patched `setLight` and
`updateLight` would then silently override `main`'s tested light system. Silent
either way, which is the worst available failure mode.

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

**That graph was wrong, and adversarial review caught it.** It shows only
forward edges from the art modules. Two reverse edges break the claim:

- **`src/doctors.js:1-4`** — on the branch, a *mechanics* module pulls the whole
  overhaul in:
  ```js
  if (typeof window !== 'undefined') {
    import('./runtime-overhaul.js');
    import('./overhaul-ui.js');
  }
  ```
- **`src/runtime-overhaul.js:92-231` is prototype surgery.** It monkey-patches
  `Game.prototype.{reset,move,rotate,setSoftDrop,hardDrop,emit,drainEvents,
  updateLight,setLight}`, `Board.prototype.cureHybrids`, and
  `InputController.prototype.pollGamepad`.
- **`src/virus-theatre.js:56-72`** switches on event names (`phototherapy`,
  `phototherapyEnter`, `sonicPulse`) emitted *only* by that patched `emit`.
  `main` renamed the whole vocabulary to `lightOn`/`lightOff`/`lit`/`flooded`/
  `sterile`, so the switch must be rewritten whichever route is taken.

What *is* safe, and confirmed: `renderer.js`'s layout keys
(`originX`/`originY`/`cell`/`fieldW`) and every DOM id and class the art needs
all still exist on `main`.

**Corrected conclusion: the art layer is harvestable but not cleanly
separable.** The glue is prototype surgery and has to be rewritten either way.
That changes the reasoning for the recommendation, not the recommendation.

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

## 7a. The consensus plan

Converged across three review cycles. Sequenced by dependency, not by appeal.

### Phase A — finish the web version

**A0. Groundwork — mostly closed by `main`; two items remain.**

- ~~Fix the two historical-credibility problems in `src/eras.js`.~~ **Closed.**
  The plague band is now its own era at `src/eras.js:140-144`, `1619 - 1799`,
  and `test/eras.test.js:25` pins the full id and period lists verbatim, so
  reverting the date fails a unit test in about a second. The **war bonnet was
  never in `src/eras.js`** — `grep -rniE 'bonnet|feather|headdress' src/`
  returns nothing, and has not returned anything on `main` at any point. It is
  in the overhaul branch's `assets/medical-era-sprites.svg`, which makes it an
  **art** question inside A2, not a text fix here. *Devin filed this correction
  in the external review below and it was accepted and then never applied to
  the plan; cycle 4 found it still standing. Applied now.*
  The premise "cheap now, expensive after thirty assets exist" inverted
  harmlessly: forty assets now exist, but the corrections shipped **with** that
  art (`03293c1`, `d35db82`), so there is no wrongly-dated sprite to re-render.
- **Tag `archive/openai-medical-eras` at `40ebd8e` now — unconditionally.**
  This bullet previously read "tag *and delete* the branch once harvested",
  which is **stricter than `DEC-0001`** and has been holding back a zero-risk
  action. DEC-0001 items 2-4 separate them: create the tag now, keep the branch
  until the harvest is verified, delete only after. No tag currently exists
  (`git ls-remote --tags origin` is empty). Deletion remains the Principal's
  call under Protocol §3.
- **Precache guard — partially done.** `test/precache.test.js` covers every
  `src/*.js`, `styles.css`, and everything referenced from `index.html` and the
  manifest. It does **not** cover assets referenced from JavaScript, and
  `src/art.js:10-11` builds its URLs by template
  (`./assets/practitioners/${doctor}-${pose}.png`). Add an eleventh era and
  `test/art.test.js` will demand the four PNGs exist on disk while **nothing**
  requires them in `PRECACHE` — offline play silently degrades to the
  procedural fallback with no test failing. Close it by iterating
  `ERAS x POSES` through the same URL builder and asserting membership.

**A1. The campaign ends (independent — do it early).**
`main` has a level finale card, but the button reads "Play level 20 again". A
caseload needs a last case. Add a terminal state and a gauntlet check that
level 20 reaches it. This is the only item that changes what the game *is*.

**A2. Harvest the virus theatre — all that is left. `main` overtook the rest.**

*Rewritten in cycle 4. The previous version had five steps; `main` has since
shipped equivalents for three of them, and executing step 4 as written would
now make `main` **worse**.*

`main` commissioned its own practitioner art — ten eras x four poses in
`assets/practitioners/`, loaded by `src/art.js` with a tested fallback chain
(`src/art.js:57-60` degrades pose → idle → `null`; `src/main.js:575-587` falls
through to the procedural `drawDoctor()`), guarded by `test/art.test.js`. So:

| old step | status |
| --- | --- |
| 1. 130px test on the branch's atlas | **largely answered — and it misdiagnosed its own risk.** See below. |
| 2. `art.js` + atlas + fallback + check | **superseded**, and a same-name collision with a better-tested incumbent |
| 3. new glue from scratch | **superseded** for practitioners |
| 4. `periods.js` over the five eras, keeping era ids | **superseded, and actively harmful now** |
| 5. `virus-theatre.js`, event switch rewritten | **the only survivor** |

**Why step 4 is now harmful.** The overhaul's `periods.js` lays eleven visual
periods over the *old five* chapters, assigning a generic `physician` to four
bands because it had no art for them. `main` took the same two-level cadence
and made those bands **first-class eras** with correct dates and dedicated
art — `swnw`, `hippocratic`, `bimaristan` and `surgeon` all have sprites.
Layering `periods.js` on top would put a coarser, worse-dated map over a finer
correct one.

**And the invariant step 4 rested on is already gone.** "Keep the era ids" is no
longer true: `apothecary` **changed meaning** — it was the plague band, it is
now the guild apothecary. `main` handled it by *migration*, not immutability:
`src/formulary.js:216` `LEGACY_ERA_IDS = { apothecary: 'plague' }` and
`:291-312` `fromLegacy()` remap saved notebooks on load. Era ids are now a
**migration contract**, and changing one is a three-place edit — `eras.js`, the
legacy map, and the pinned list in `test/eras.test.js` — plus four PNGs and four
`sw.js` lines. A Godot port reimplementing save loading will trip on this.

**On the 130px test, which this document called "the riskiest assumption in the
whole plan".** That framing was wrong. `index.html:48` is a 132x132 canvas,
`src/styles.css:757-763` caps it at 132 CSS px, and main's sprites are
**264x264** — exactly 2x, which at `devicePixelRatio: 2` is *correct HiDPI
practice, not a defect*. "Generated at roughly double display size" described
the requirement, not the risk. The residual real question — does this much line
detail survive at 132 CSS px — has been answered affirmatively by the
ligne-claire PNGs that shipped and are on screen now.

**What actually remains unharvested:** `src/virus-theatre.js` (212 lines) and
`assets/virus-mascots.svg` — virus reaction faces
(`idle/taunt/hurt/panic/smug/mutate/celebrate/stunned`). `main` has no
equivalent; its only reaction system is the *practitioner's* four poses. Gate it
on **its own** legibility test — mascot frames at board-cell scale, which is a
different test from the portrait one — and on a **tone decision from the
Principal**, since DEC-0001's "harvest the valuable art" was decided when "the
art" meant portraits. Faces on the viruses change what this game feels like.

Also largely moot now: the branch's `music.js`. `src/audio.js:121-275` defines
ten era-keyed tracks and `src/transport.js` supplies the clock.
`assets/medical-era-sprites.svg` is superseded by the forty PNGs — and it is the
file that actually contains the war bonnet.

Explicitly do not port: `phototherapy.js`, `sonic-therapy.js`,
`runtime-overhaul.js`, the `doctors.js` import hunk. Resolve `sw.js` **upward**
to `main`'s cache version.

**A3. Expose the beat — `delivered on main`, 14 September 2026.**
Planned here as "expose beat index, bar position and next-beat time, and make
the clock injectable for headless tests". `src/transport.js` now does exactly
that: `beatAt()`, `position()`, `beatWindow()`, `timeOfBeat()`, and a `clock`
injected at construction so headless tests drive a virtual one. See
`docs/transport.md`. **A4 is therefore unblocked on this side.**

**A4. Music per period — `delivered in substance`.** `src/audio.js:121-275`
defines ten `makeTrack` entries keyed to the ten era ids, dispatched at
`src/main.js:542` on era change. **Its second dependency no longer exists:** the
music is keyed to era ids, not to A2's period map, and that map is not being
ported. What remains is the branch's evolving-arrangement idea, which is
optional and separable.

**A0.4. Answer the asset-weight question with the number that now exists.**
`PRECACHE` is 66 entries totalling ~2.95 MB, of which ~2.6 MB is
`assets/practitioners/`. Every install downloads that before the game is
offline-ready. Not a defect — it is the cost of the art, and the art is good —
but §7b previously dismissed asset weight as "22 KB of SVG… noise", which is no
longer the case. Record a decision: accept, ship WebP, or drop non-idle poses
from precache and lazy-load them.

**A5. Freeze.** Full gauntlet, ship, add no mechanics.

**Cut from "web complete", deliberately:** sonotherapy, the macro-organism boss,
heat/over-treatment. All three make the game *bigger*, not *done*. They are the
best ideas in `docs/ideas.md` and they belong after a shipped web version.

### Phase B — the Godot port

> **There is no Godot branch, and there never has been.** No `project.godot`,
> no `*.gd`, no `*.tscn`, on any branch. **Phase B *is* the Godot plan** — the
> brief's "Godot version" is this section, not a branch to check out. Devin
> asked for this sentence in its external review specifically so that an agent
> sent to "audit the Godot branch" would not go looking for one; it went
> unapplied, and a later reviewer duly concluded no Godot plan existed. It
> exists. It is below.

The separation is real and was checked, not assumed: `board.js`, `pill.js`,
`game.js`, `light.js`, `modifiers.js`, `rng.js`, `versus.js`, `eras.js` and
`constants.js` contain **zero** DOM references — **3,232 lines** (2,994
non-blank; re-measured 15 September, and they form a closed import set) of pure,
deterministic, seeded logic. Transliterating that to GDScript is tedious and
low-risk.

Rewritten, not ported: `renderer.js`, `main.js` (1,539 lines, 45 DOM
references, entirely throwaway), `input.js`, `audio.js`, the service worker, and
`formulary.js`'s storage layer.

**The gauntlet does not port, and pretending otherwise is the trap.** It is Node
ESM importing `src/*.js` directly. Rather than rewrite thirteen stages in
GDScript and lose the accumulated catch history, **keep the JS rules as a
differential oracle**: run one seed and one input log through both engines and
compare board hashes per frame. That reduces "did the port change the rules" to
a single automated question.

**Three amendments from cycle 4:**

1. **`src/transport.js` is in neither list, and belongs in the pure one.** It is
   254 lines with an injected clock (`:45-49` throws if it is not a function),
   no timer and no frame loop of its own, and nothing in the rules imports it —
   only `src/audio.js:359` and its test. It **ports as a pure module**. But its
   own header advertises `beatWindow()` as the sonotherapy hook, so note now:
   **the moment any rule reads it, musical time becomes a rules input and the
   differential oracle's input log must carry a clock trace.**
2. **Name the oracle's comparison unit.** The plan promises a board hash; there
   is no `hash` in `src/board.js` or `tools/gauntlet.mjs`. The determinism stage
   actually compares `Board.toStrings()` snapshots
   (`tools/gauntlet.mjs:266-268`). That is arguably the better primitive — a
   mismatch shows you *where* — but say so, or implement the hash. Leaving it
   unstated means the port invents its own, which is the exact failure this
   section exists to prevent.
3. **Three rules modules default their seed to wall-clock time**:
   `src/rng.js:5`, `src/game.js:84`, `src/versus.js:12` all take
   `seed = Date.now()`. Harmless today because every check passes a seed
   explicitly, and it is not a DOM reference — but a GDScript port that
   reproduces the default will produce non-reproducible runs that look like
   rules divergence. **Require an explicit seed in the port.**

It rests entirely on the ported PRNG being bit-exact, which is why
`test/fixtures/rng-golden.json` now exists.

#### The sequenced breakdown

*Added 15 September 2026. Phase B was prose where Phase A was a dependency
graph, and a reviewer fairly called it a plan outline rather than a plan.
Sequenced below on the same basis as Phase A: dependency order, with sizing
given as **measured line counts** rather than invented day estimates — nobody
here has written GDScript against this codebase, so a calendar figure would be
fiction. Line counts are real and they rank the work.*

| # | Item | Depends on | Size (measured) |
| --- | --- | --- | --- |
| **B0** | Port `rng.js` and check it against `test/fixtures/rng-golden.json`. **Nothing else moves until it matches.** | — | **17 lines**, and the highest-risk 17 in the project |
| **B1** | Port `constants.js`. Pure data; no logic to get wrong. | B0 | 325 |
| **B2** | Stand up the differential oracle harness: run one seed and one input log through both engines, compare `Board.toStrings()` per frame. Build it **before** the rules it checks. | B0, B1 | harness only |
| **B3** | Port the small pure modules: `pill.js`, `versus.js`, `modifiers.js`, `eras.js`. Each lands behind B2. | B2 | 754 total |
| **B4** | Port `light.js` and `board.js`. | B3 | 1,025 |
| **B5** | Port `game.js` — the largest and the one the oracle exists for. | B4 | 1,111 |
| **B6** | Rewrite the impure layer natively. Not a port: `renderer.js`, `main.js`, `input.js`, `audio.js`, `formulary.js`'s storage, the service worker. | B5 | 4,467 rewritten, not translated |
| **B7** | Port `transport.js` as a pure module. Separate because nothing depends on it until a mechanic reads the beat. | B0 | 254 |

**The ratio is the useful number.** 3,232 lines transliterate mechanically;
**4,521 are thrown away and rewritten natively.** The port is therefore *more
rewrite than port*, and anyone sizing it from "how much code is there" will
size it wrong. The 3,232 is tedious and low-risk. The 4,521 is where a Godot
version becomes a different piece of software — and the reason Phase B waits on
a shipped web version, because rewriting a moving target twice is the only way
to make this expensive.

**What does not port, stated plainly.** The gauntlet — thirteen stages of Node
ESM importing `src/*.js` directly. Rewriting it in GDScript would discard the
accumulated catch history, which is the single most valuable artifact this
repository has. B2 exists so that it does not have to be rewritten: the JS rules
stay as the oracle, and "did the port change the rules?" stays one automated
question.

**Gate.** No Godot work starts before Phase A5 (freeze). This is sequencing,
not deferral — the rules are still moving, and B5 ports `game.js`. **Port `src/rng.js` first, check it
against the fixture, and port nothing else until it matches.** mulberry32 ports
*almost* right — `Math.imul` is a signed 32-bit multiply and `>>>` is unsigned,
neither free in a 64-bit integer language — and an almost-right generator makes
the differential test fail far from the actual cause.

## 7b. Found on review, not in the first pass

- **A merge silently regresses `src/doctors.js` from 436 lines to 140** —
  `main`'s five parametric physicians replaced by the branch's flat fallback,
  **with no conflict raised**. Any harvest must drop that hunk.
- **`sw.js` cache regression.** Branch is `rxdrop-v17`, `main` is `rxdrop-v20`.
  The conflict must resolve upward or installed PWA users keep a stale cache.
- **`shot-tmp.mjs` is dead scrap on *both* branches** — hardcodes
  `/home/user/rxdrop`, spawns `python3 -m http.server`, and references the
  removed `blackout` modifier. Delete it.
- **Licence: clean.** Both SVG atlases are hand-written path data — no generator
  metadata, no embedded rasters. MIT throughout.
- **Q3 answered.** `music.js` needs only `TRACKS` and `noteToFreq`, both still
  exported from `main`'s `audio.js`. Shallow coupling; harvestable.
- **Q5 was mis-framed.** 22 KB of SVG is noise beside `assets/screenshot.png`
  (483 KB) and `assets/versus.png` (480 KB), both already in the repo and
  neither precached. The offline budget question is about those, not the art.
- **The "no ending" finding was overstated.** `main` *does* have a finale card —
  `index.html:226` "Level 20 beaten - the bottle is clean!" and `main.js:738`
  switches the title to "Bottle empty!". What is missing is narrower: the button
  reads **"Play level 20 again"**, so there is a level finale but no campaign
  end. Still worth fixing; not the hole first reported.

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

Three cycles ran on 12 September 2026. The log lives in
[`collaboration.md` §6](collaboration.md#6-review-log) so it sits beside the
conventions it exercises rather than being duplicated here.

**What review changed in this document:** the separability claim in §5 was
wrong and is corrected; the merge-outcome claim in §4 was wrong and the truth is
worse; the "no ending" finding was overstated and is narrowed in §7b; six
further findings were added that the first pass missed. The recommendation did
not change, but its reasoning did.

**Status: approved with conditions, all conditions met.** One condition was
rejected on evidence — a reviewer resolved `main` against a stale local ref and
reported a base-commit error that does not exist. Recorded in the log.

### External review — 12 September 2026 — Devin (Cognition)

Written against this branch at 7c1bc7d, before the cycle-3 close-out above
landed; the internal reviewers B–D in `collaboration.md` §6 are not Devin.

**Who.** Devin, Cognition AI's software-engineering agent, in its own session
and its own container. Not a Claude sub-agent: a different vendor reading this
document cold, with write access to a branch and none to `main`. That makes this
the first cross-vendor review in the log, so it is deliberately heavy on
re-verification and light on new opinion.

**Method.** Every factual claim in §§1–7b was re-run from scratch at `main`
782d324, the overhaul at 40ebd8e and this branch at 7c1bc7d: Node 22.23.2,
`npm test`, the full gauntlet, a scratch `git merge --no-commit`, and grep
against the files named. Reproduction commands are in the PR that carries this
section, not here.

**Attested — reproduced exactly as stated.**

- `main`: 273 unit tests green; gauntlet **13/13 in 250 s**, 42 browser checks.
  This branch: 276 green. Overhaul: 264 green.
- Divergence: merge base `35eb061`; `main` 7 ahead, overhaul 16 ahead.
- §4: overhaul `src/phototherapy.js:3` imports `DARK_AT`; `main`'s
  `constants.js` has no such export. The post-merge `SyntaxError` claim stands.
- §5: overhaul `src/doctors.js:1-4` is the guarded
  `import('./runtime-overhaul.js')`. The 436 → 140 line regression on merge is
  real and conflict-free.
- §6: scratch merge conflicts in exactly `src/modifiers.js` and `sw.js`.
- Phase B premise: `board.js pill.js game.js light.js modifiers.js rng.js
  versus.js eras.js constants.js` contain zero references to `window`,
  `document`, `navigator` or `localStorage`, and every `src/*.js` passes
  `node --check`.
- A3: `src/audio.js:390-403` — `startMusic` starts a 25 ms `setInterval`,
  `schedule()` is the 150 ms look-ahead. The transport correction is right.
- 7b: `screenshot.png` 483 KB and `versus.png` 480 KB, referenced only from the
  README, not precached. `shot-tmp.mjs` was dead on `main`; deleted here. Good.
- 7b: the finale is exactly as narrowed — `main.js:739` "Bottle empty!",
  `main.js:743` "Play level 20 again".
- Q2 resolution: era ids identical across branches, `periods.js` imports
  `eras.js`. Saved notebooks survive.
- `test/rng-golden.test.js` pins seeds `0` and `4294967295` explicitly, which is
  the right pair for a signed/unsigned 32-bit port bug.

**Disagree / correct.**

1. **A0 misplaces the war bonnet.** It says both historical-credibility problems
   are "in `src/eras.js`". Only the plague band is: `eras.js:71-81` opens the
   era at 1347 with a beak "packed with rosemary and clove". `main` has no
   bonnet, feather or headdress anywhere in `src/`. The bonnet is in the
   overhaul's **sprite sheet** (`assets/medical-era-sprites.svg`), as
   `direction.md:1198` itself says ("several sheet panels"). Consequence: the
   bonnet fix is an *art* fix that belongs inside A2 step 1, not a text fix in
   A0. The 1347 fix stays in A0 and is a one-line edit.
2. **A0's PRECACHE guard is done, not proposed.** `tools/browser-check.mjs:1610`
   only asserts `cached >= 15`, so the gap was real. This PR adds
   `test/precache.test.js`: every `src/*.js`, `src/styles.css`, every script and
   stylesheet in `index.html` and every manifest icon must be in `PRECACHE`,
   and every `PRECACHE` entry must exist on disk. Falsified by deleting an entry
   and watching it fail. It runs under `npm test`, so it costs nothing per
   iteration — better than a gauntlet stage for a list that changes with every
   new module.
3. **§9 / the strengths matrix is stated with more confidence than its sources
   carry.** I ran an independent search. Third-party 2026 comparisons
   contradict each other on the very rows the matrix decides: one names
   GPT-5 "best for coding", another names Claude, a third hands
   algorithmic reasoning to Gemini. The rows are defensible; the column header
   "Best-regarded" is not. Suggested wording: *"Leads at least one widely-cited
   benchmark or review"*, with the caveat promoted from footnote to header. The
   practical conclusion — Claude for rules and prose, GPT/Gemini for asset
   generation and multimodal review, everyone for auditing each other — is the
   part that survives the disagreement, and it is the part this project needs.
4. **§7 step 5 "retire the branch" needs an owner and a trigger.** As written
   it is advice. Make it a checklist item on the A2 PR: `git tag
   archive/openai-medical-eras 40ebd8e && git push origin
   archive/openai-medical-eras :openai/medical-eras-visual-overhaul`. Until that
   runs, `docs/direction.md §29` should carry a one-line "do not merge; see
   branch-audit §4" so the trap is labelled where people will read.

**Add — gaps neither pass mentioned.**

5. **CI does not run on feature-branch pushes** (`ci.yml` `on.push.branches:
   [main]`; PRs only). Every one of the 27 merged PRs came from one long-lived
   branch, so the first CI signal for a commit is the PR. Harmless with one
   author; with several agents pushing to `vendor/topic` branches it means a
   broken push sits unnoticed until someone opens a PR. Add `branches: ['**']`
   or drop the filter; the gauntlet is the cost, and it is already paid per PR.
6. **No lint or format configuration** — no eslint, prettier or `.editorconfig`.
   With one author the style is consistent by habit. With three vendors it will
   drift within a week. A single `.editorconfig` (2-space, LF, final newline) is
   zero-dependency and honours the no-tooling constraint; hold the line there.
7. **The Pages deploy publishes the whole repository** (`path: '.'`), including
   `test/`, `tools/`, `docs/` and the two ~480 KB PNGs. Not a defect — the game
   is static — but the offline budget question in Q5 is answered by *not*
   caching them, and the deploy-size question by an `upload-pages-artifact`
   path list or a `.nojekyll`-style exclusion once assets grow.
8. **`window.rxdrop` is the test seam and is undocumented** (`main.js:1410`).
   The browser checks and the deleted `shot-tmp.mjs` both drive the game
   through it. Say so in the README layout table so nobody "cleans it up".
9. **Godot: nothing exists yet, on any branch** — no `project.godot`, `*.gd` or
   `*.tscn`. Phase B is a plan, not a branch. The brief's "Godot branch"
   is this document's Phase B. State that at the top of Phase B so an agent
   sent to "audit the Godot branch" does not go looking for one.

**On the plan itself.** Phase A ordering is right and I would change one thing:
run **A2 step 1 (the 130 px test) before A0**, not after. It is the only item
that can triple the cost of the phase, it takes an hour, and nothing in A0
depends on its result. Learn the expensive fact first.

**Phase B, one addition.** The differential oracle compares board hashes per
frame. Define the hash *now*, in JS, as a pure function in `board.js`
(`Board.prototype.hash()`), and add it to the determinism stage so it is
already exercised and stable before anyone writes GDScript against it. A hash
invented on the Godot side first will encode Godot's cell layout, and the
oracle becomes a port of the port.

#### Answer to the external review — 15 September 2026

Devin asked for revision on items 1, 3 and 4 "before this is treated as the
consensus plan", and filed 5-9 as additions. It was treated as the consensus
plan anyway, with only item 2 absorbed. Closing that out now, point by point,
because an external review left hanging is worse than one never sought.

| # | Devin's item | Status |
| --- | --- | --- |
| 1 | A0 misplaces the war bonnet — it is an art fix, not a text fix | **Applied**, cycle 4. Accepted at the time and never applied; a cycle-4 reviewer found it still standing. Devin was right and was ignored for two days. |
| 2 | The PRECACHE guard is done, not proposed | **Correct when written.** Cycle 4 then found the remaining gap: it does not cover assets referenced from JavaScript (`src/art.js` builds URLs by template). A0 now says "partially done" with that gap named. |
| 3 | The strengths matrix is stated with more confidence than its sources carry | **Applied, and then some.** Cycle 4 went past Devin's suggested header rewording: the section is retitled, three supporting facts are deleted as stale or wrong, and the source audit found not one primary source among seven — one of which contradicts the row it was cited for. Devin's "the practical conclusion is the part that survives" is exactly what was kept. |
| 4 | "Retire the branch" needs an owner and a trigger | **Half applied.** The tag is now split out as unconditional per `DEC-0001` item 2 — Devin's command bundles the tag with `:openai/medical-eras-visual-overhaul`, and that deletion is reserved to the Principal under Protocol §3, so it is not run here. The second half — label the trap in `direction.md` §29 — **is now done**. |
| 5 | CI does not run on feature-branch pushes | **Applied.** `ci.yml` now triggers on `branches: ['**']`. Devin's reasoning holds exactly: harmless with one author, a silent trap with several agents pushing to `vendor/topic`. |
| 6 | No lint or format configuration | **Applied.** `.editorconfig` only — 2-space, LF, final newline — which is zero-dependency and holds the no-tooling line Devin asked to hold. No eslint, no prettier. |
| 7 | Pages deploy publishes the whole repository | **Answered, not changed.** The offline budget question Devin pointed at is now A0.4 with a real number: `PRECACHE` is 66 entries / ~2.95 MB, of which ~2.6 MB is practitioner art. The deploy-size question stays open and is recorded there. |
| 8 | `window.rxdrop` is the test seam and is undocumented | **Applied.** Added to the README file map so nobody "cleans it up". |
| 9 | Godot: nothing exists on any branch; Phase B is a plan, not a branch | **Applied**, and it should have been applied immediately. Devin asked for this one sentence so that "an agent sent to audit the Godot branch does not go looking for one" — it went unapplied, and a later reviewer went looking, found no branch, and concluded there was no Godot plan at all. Phase B now opens by saying so in a block quote. This is the clearest case in this repository of a cheap documentation fix being deferred and then costing exactly what its author predicted. |

**On Devin's plan changes.** Its "run A2 step 1 before A0" is moot as written —
A0's credibility work is done and A2.1's subject was overtaken by `main`'s own
art — but the principle it was defending survives and is worth restating:
*the cheapest fact that can invalidate a phase goes first.* Under the rewritten
A2 that fact is "do virus mascots read at board scale, and do they belong in
this game at all", not "do portraits read at 130px".

Its Phase B addition — define `Board.prototype.hash()` in JS now, before anyone
writes GDScript against it — is **not implemented**, and cycle 4 confirmed no
`hash` exists in `src/board.js` or `tools/gauntlet.mjs`. Phase B now names
`Board.toStrings()` as the comparison unit the determinism stage actually uses,
which resolves the ambiguity Devin was warning about; implementing the hash
remains an open option rather than a promise the plan makes and does not keep.

**Verdict.** Approve the audit and the harvest-not-merge recommendation. Q1 is
answered by §4 alone: a merge produces a build that silently loads nothing, and
"merge then delete" would spend its first day discovering what §4 already
states. Request revision on items 1, 3 and 4 above before this is treated as the
consensus plan; items 5–9 are additions, not blockers.
