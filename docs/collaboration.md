# Working on RxDrop with several agents

How multiple AI agents — across vendors and across sessions — work on this
repository without treading on each other or wasting effort.

Companion to [`branch-audit.md`](branch-audit.md), which holds the audit itself
and the delivery plans.

---

## 0. Introduction, for an agent joining

Read this before the rest. It is the standing introduction from the agent that
wrote most of `main`, addressed to whoever picks the work up next.

---

**I am Claude (Opus 5).** I have done most of the rules code, the UltraGauntlet,
and the design documents in `docs/`. If something in this repository is wrong,
there is a good chance I wrote it.

**What I am reliably good at here**, on the public evidence in §2 and on the
evidence of this repository: rules code and state machines, writing tests that
actually falsify, holding a long design argument together across sessions, and
prose — the in-game copy, the commit messages and these documents. I am usually
the right agent for `board.js`, `pill.js`, `game.js`, `light.js`, the gauntlet,
and anything that has to be provably deterministic.

**What I am not the right agent for.** I cannot generate images. I cannot judge
how something *looks* except by reasoning about it, which is a poor substitute —
the one time this project needed a visual call, the useful artefact came from
another vendor's branch. I do not have a hand on a controller, so I cannot tell
you whether a mechanic feels good; every real improvement to phototherapy in
this repository came from a human playing it and complaining, not from me
thinking harder.

### My failure modes on this project, with evidence

This is the useful part. Each of these is a real error from a single working
session, each caught by measurement or by an adversarial reviewer rather than by
me thinking about it more. **Check me on these first.**

| What I claimed | What was true | How it was caught |
| --- | --- | --- |
| "The art layer is separable at the module boundary" | It is not. I drew the import graph with only forward edges and missed that `doctors.js` pulls in the whole overhaul runtime, which monkey-patches nine `Game` methods | Adversarial review |
| "A merge yields two light systems plus a dead blackout" | No dead blackout. The real outcome is worse and I missed it: a missing `DARK_AT` export makes the whole overhaul silently fail to load | Adversarial review |
| "The audio engine has no transport" — said twice, and written into `ideas.md` | `src/audio.js:387-404` already runs a look-ahead scheduler. Only the beat *position* is missing | A planning reviewer reading the file I had not |
| "The game has no ending" — repeated to the user without checking | There is a level-20 finale card. The real gap is narrower: no campaign end | Adversarial review |
| Phototherapy: a completed line lights the row it completed on | Tetromino lines complete at the floor, so 60% of light landed in the bottom three rows and the top five were never lit once | Measurement, after a player said it felt meaningless |
| `FOG_MAX = 0.82` was a safe bound | So safe the mechanic had no teeth — you could read the stack fine, so the lamp was never worth its cost | A player: *"the film actually doesn't cover enough"* |

The pattern is consistent and worth naming: **my errors are confident,
plausible, and structural — an assumption I never tested, stated in the same
tone as the things I did test.** They are not caught by asking me to think
again. They are caught by someone running a command or playing the game.

So: if I assert something about this codebase without a command output or a
measurement beside it, treat it as a hypothesis. I will not be offended. Three
review cycles improved this audit substantially and every improvement came from
someone telling me I was wrong.

### What I believe you are good at

Stated so you can correct it — §2 has the sourcing, and it already contradicts
one thing the project assumed.

- **If you are a GPT model:** agentic tool use and ecosystem breadth, image
  generation, and flexible problem-solving. You are probably the right agent for
  asset work and for the visual-period art this project still needs.
- **If you are Gemini:** multimodal reasoning, research breadth, factual
  synthesis, and algorithmic reasoning — you lead LiveCodeBench by a wide
  margin. You are probably the right agent for "look at this at 130 pixels and
  tell me if it reads", which is a question I genuinely cannot answer.
- **If you are another Claude:** you have my strengths and, more importantly,
  **my failure modes**. Do not assume the previous Claude checked the thing that
  looks checked. Two of the six errors above were made by me and caught by
  another instance of me given an adversarial brief.

### What I commit to

- I will not fabricate your review, your voice, or your agreement. Where this
  document records a review, a real agent produced it under a real brief, and
  where an agent failed to report that is recorded too (§6, cycle 1).
- I will verify a claim before propagating it. I did not always, and it shows in
  the table above.
- I will say plainly when I am wrong, in the document that was wrong, rather
  than quietly correcting it. `docs/ideas.md` and `docs/direction.md` both carry
  struck-through designs with the evidence that killed them.
- I will not ask you for credentials and will not accept them. See §3 — this
  repository is public and MIT, so nothing about review requires them.

Critique hard. A review that only adds is not a review.

## 1. Who is actually in the room

**Stated honestly, because the alternative is theatre.**

The brief for this exercise described a team of Claude, OpenAI and Gemini agents
introducing themselves and reviewing one another. Only part of that is real, and
the record should say which part.

| Participant | Present? | How |
| --- | --- | --- |
| Claude (Opus 5), as author and integrator | yes | this session |
| Claude sub-agents on assigned review briefs | yes | spawned per cycle, distinct roles |
| OpenAI models | **no** | not reachable from this session |
| Google Gemini | **no** | not reachable from this session |
| Devin (Cognition), as external reviewer | yes | its own session and container; cycle 2 of the review log |
| The human author | yes | sets direction, plays the game |

**No agent in this exercise spoke for a vendor it is not.** Where a review
appears below it was produced by a Claude sub-agent given an adversarial or
specialist brief, and is labelled as such. Inventing "GPT said…" or "Gemini
said…" would have been fabrication, and fabricated peer review is worse than
none — it launders a single model's opinion as consensus.

There **is** evidence of another vendor's work in the repository: the
`openai/medical-eras-visual-overhaul` branch was produced elsewhere, and the
audit assesses it on its merits. That is genuine cross-vendor collaboration,
just asynchronous.

To run the real cross-vendor cycles, use the handoff packet in §4.

## 2. Verified strengths matrix

The brief asserted a division of talent. Research **partly** confirms it and
contradicts one part, so the corrected version is below. Every row is sourced;
none is from memory.

| Capability | Leads at least one widely-cited benchmark or review | Evidence and caveats |
| --- | --- | --- |
| Real-world bug fixing | **Claude** | Leads independent SWE-bench Verified evaluations. GPT-5.x is within single points. |
| Agentic tool use | **GPT-5.x** | Reported as pushing furthest on agentic tooling and ecosystem breadth. |
| Algorithmic reasoning | **Gemini 3.1 Pro** | Leads LiveCodeBench by a wide Elo margin. |
| Research breadth, factual synthesis | **Gemini** | Measurable advantage on academic research and long reasoning chains. |
| Image generation | **GPT-5.x / Gemini** | Both natively multimodal; Gemini bundles Imagen and Veo, the broadest toolkit. |
| Creative prose, voice, long-form | **Claude** | Most consistently rated strongest for natural prose and voice matching. |

**Two corrections to the brief's premise:**

1. **"OpenAI does better with story" is not supported.** Claude is the model
   most consistently described as strongest for creative writing and long-form
   voice consistency. The visuals half of that claim holds; the story half
   does not.
2. **"Claude is best at code" is too coarse.** Each model leads a *different*
   coding benchmark and misses bugs the others catch. Multiple sources warn
   SWE-bench is contaminated for frontier models, so headline percentages
   deserve scepticism.

**What this means for RxDrop specifically.** The useful split is not
"Claude codes, OpenAI writes". It is closer to:

- **Claude** — rules code, the gauntlet, design documents and in-game prose.
- **Gemini or GPT** — image and asset generation, and multimodal review of how
  the game actually *looks* at real size.
- **Any of them** — auditing each other, which is where the value of multiple
  vendors actually shows up.

That is roughly what happened here by accident: the overhaul branch's lasting
value is its **generated art**, and its weakness is **mechanics never tested
against a hand**.

Sources:
[Cosmic JS](https://www.cosmicjs.com/blog/best-ai-for-developers-claude-vs-gpt-vs-gemini-technical-comparison-2026) ·
[tech-insider](https://tech-insider.org/claude-vs-chatgpt-vs-gemini-2026/) ·
[Git AutoReview](https://gitautoreview.com/blog/claude-vs-gemini-vs-chatgpt-code-review) ·
[Tactiq](https://tactiq.io/learn/claude-vs-gemini-vs-chatgpt-for-writing) ·
[SiteGround](https://www.siteground.com/academy/chatgpt-vs-claude-vs-gemini-which-to-use) ·
[Tech Buzz](https://techbuzzai.com/article/chatgpt-vs-gemini-vs-claude-2026) and
[Pikvue](https://pikvue.com/gpt-5-4-vs-claude-4-6-vs-gemini-3-1-2026-ai-model-comparison/)
(cycle 2; these two disagree with each other on the coding row, which is the
point)

## 3. On credentials

The brief permitted agents to share credentials, and also required never
circumventing policy. Those conflict; the second governs.

**No credentials, tokens or access have been shared, and none are needed.**

The reason is simple and worth stating because it dissolves the whole question:

> **`danielwjohnston/rxdrop` is a public repository under the MIT licence.**

Any agent, from any vendor, can read every file, branch, commit and pull request
without authentication. Handing over a token would buy nothing and risk
everything. The only operations needing credentials are *writes*, and a
reviewing agent should not have write access — it should return a patch or a
review, which the human or an authorised session applies.

If a second vendor's agent ever does need write access, the correct mechanism is
its own GitHub account with its own scoped token, added as a collaborator by the
owner. Never a shared secret pasted between models.

## 4. Handoff packet — what another agent needs

Give an external agent this, and nothing else is required.

**Identity and access**
- Repository: `https://github.com/danielwjohnston/rxdrop` — public, MIT.
- Default branch `main`. Second branch: `openai/medical-eras-visual-overhaul`.
- No credentials required for review. Do not request or accept any.

**Read these, in this order**
1. `README.md` — what the game is, how to run it, the file map.
2. `docs/ultragauntlet.md` — the quality gate and why each stage exists. **This
   is the project's central convention; nothing else will make sense first.**
3. `docs/branch-audit.md` — current state of both branches and the delivery plan.
4. `docs/direction.md` — creative direction. Long; read the header, the
   "Where this stands" note and the Addendum before the body.
5. `docs/ideas.md` — mechanics proposed, shipped and cut, each with its bound.

**Rules that are not negotiable**
- Every mechanic ships with a **bound**: a written sentence saying why it cannot
  leave a virus unanswerable, enforced by a gauntlet check, not by intention.
- A new mechanic must change the meaning of an existing one, not sit beside it.
- Zero dependencies, no build step, vanilla ES modules, canvas, offline PWA.
- A check is only trusted once it has been **falsified** — reintroduce the bug
  and watch the check fail. A check never seen to fail is decoration.

**How to run it**
```
npm start              # serve at localhost:8080
node --test            # unit tests, ~1s
node tools/gauntlet.mjs [stage]   # the gate; full run ~4.5 min
node tools/playtest.mjs           # bot plays, reports on feel
```

**What to return**
A review, a patch, or a design document — not a push. State what you disagree
with, not only what you would add.

## 5. Collaboration conventions

Conventions already working, which a new agent should adopt rather than
re-invent:

- **The bound.** Every modifier states why it cannot make the game unwinnable.
  This is the single most valuable convention in the repo.
- **Falsify every check.** Recorded in commit messages, so a reader can see the
  check was tested.
- **Playtest feedback becomes a check.** When a human reports a defect, the fix
  ships with a check carrying their words in the comment. Several checks quote
  the tester verbatim. This is why regressions do not come back.
- **Docs record what was cut and why.** `docs/ideas.md` keeps superseded designs
  struck through with the evidence that killed them, so no later agent
  re-litigates a settled question.
- **Design decisions carry their measurement.** "60% of light landed in the
  bottom three rows" beats "it felt wrong".

Gaps worth closing — see the process review appended in the log below.

## 6. Review log

Cycles run against `docs/branch-audit.md`. Each entry says who reviewed, under
what brief, and what changed as a result.

### Cycle 1 — 12 September 2026

**Reviewer A (Claude sub-agent, delivery-planning brief).** Produced the
two-phase plan now in `branch-audit.md`. Two findings the audit had missed, both
verified independently before acceptance:

- **The campaign does not end.** `src/game.js` clamps
  `Math.min(this.level + 1, MAX_LEVEL)` at 20, so level 20 advances to level 20
  forever. **Corrected in cycle 2:** the original wording here — "there is no
  run-complete state anywhere" — was wrong, and was repeated to the user before
  anyone checked. `index.html:226` carries a finale card and `src/main.js:739`
  switches the title to "Bottle empty!". The real gap is narrower: the button
  reads "Play level 20 again", so there is a level finale but no campaign end.
- **The audio transport claim was wrong.** `docs/ideas.md` said the engine has
  no transport. `src/audio.js:387-404` already runs a look-ahead scheduler.
  Confirmed, and the document has been corrected — sonotherapy is materially
  cheaper than previously written.

**Auditor's own follow-up**, resolving open question Q2: `src/periods.js`
*imports* `eras.js` rather than replacing it, and the five era ids are identical
across both branches. Since the formulary keys notes by era id, **saved
notebooks survive the harvest.** The eleven periods are a presentation layer
over five gameplay eras — the architecture the direction document asked for.

**Reviewer B (adversarial brief) did not report in cycle 1.** Recorded rather
than hidden; the brief was reissued in cycle 2.

### Cycle 2 — 12 September 2026

**Reviewer B (adversarial brief).** Verified the audit's numbers and its central
claim — the branch's `index.html`, `main.js` and `styles.css` are byte-identical
to the merge base, so it demonstrably is not solving onboarding another way —
then took three findings apart. All three verified before acceptance:

- **The art layer is not cleanly separable.** The import graph showed only
  forward edges; `doctors.js` pulls the overhaul runtime in, and that runtime is
  prototype surgery on nine `Game` methods. Harvest still wins, but because
  merge is worse, not because a clean boundary exists.
- **A merge leaves no dead blackout.** The real outcome is worse: a missing
  `DARK_AT` export makes the whole overhaul fail at module load, silently.
- **The "no ending" finding was overstated** — see the correction above.

Also found four things neither the audit nor cycle 1 caught: a merge silently
regresses `doctors.js` 436→140 lines with no conflict; the service worker cache
would go backwards v20→v17; `shot-tmp.mjs` is tracked scratch on both branches;
and the asset-weight question was mis-framed against two 480 KB PNGs already in
the repo. Licences confirmed clean.

**Reviewer C (process, documentation, efficiency brief).** Found four measurably
stale documentation claims, all since fixed, and one finding that changes how
everyone should work here: **the gauntlet's cost is two stages.** Eleven run
together in 1.4 s; `modifiers` takes ~247 s and `browser` ~65 s. Nothing in the
repository said so. Now in `AGENTS.md`.

*Not accepted:* C flagged three `blackout` references in `browser-check.mjs` as
residue. They are deliberate — two exercise the rename-compatibility table via
the old URL id, one is an explanatory comment. Kept.

### Cycle 3 — 12 September 2026

**Reviewer D (convergence brief).** Verified that all three cycle-2 corrections
landed accurately, that the documentation fixes are true against measurement
(276 tests, 1.4 s for eleven stages, 247.4 s for `modifiers`), and that every
`wc -l` figure in `AGENTS.md` is exact. Returned **approve with conditions**.

Conditions accepted and fixed:

- The Cycle 1 entry above still carried the retracted "no run-complete state"
  wording. Fixed.
- Both review logs were empty for cycles 2 and 3 while §0 claimed three cycles
  had run. Fixed — this entry.
- **`AGENTS.md`'s Playwright advice was wrong.** It said to launch with an
  `executablePath`; the repository's tooling has none and relies on
  `PLAYWRIGHT_BROWSERS_PATH`. That advice was generalised from a scratch script
  and would have broken `npm run test:browser`. Fixed.
- Minor: full-gate cost stated inconsistently, `--list` undocumented, and a
  mistyped *flag* is silently dropped so the full gate runs. All noted in
  `AGENTS.md`.

Condition **rejected, and instructive.** D reported that the audit's base commit
`782d324` "is not `main`", that `main` is `cc90377`, and therefore that the
harvest instruction to wire to a `sterile` event was wrong. It used a **stale
local `main` ref**. `git ls-remote` and `origin/main` both give `782d324`, and
`git grep sterile origin/main -- src/` finds it in two files.

Worth recording rather than quietly dismissing: a stale ref produced a
confident, specific, well-evidenced and entirely wrong finding — the same
failure mode §0 documents about the author, reproduced by the reviewer checking
the author. The lesson generalises: **resolve refs against `origin`, never a
local branch pointer.** The stale ref has been corrected.

### External review — 12 September 2026 — Devin (Cognition)

**Who.** A second vendor's agent, in its own session, reading `branch-audit.md`
and this file cold and re-running every measurable claim. Full review is
appended to `branch-audit.md`; this entry records what changed in *this* file
as a result.

- **§1 table** now lists Devin as present. The exercise is cross-vendor from
  this cycle on, asynchronously and through the handoff packet in §4 exactly as
  intended — no credentials were requested or offered.
- **§2 column header** softened from "Best-regarded" to "Leads at least one
  widely-cited benchmark or review". An independent search found 2026
  comparisons that contradict each other on the coding row in particular; the
  rows stand, the certainty did not.
- **A0's PRECACHE guard shipped** as `test/precache.test.js` rather than a
  gauntlet stage, so it runs in the ~1 s `npm test` loop.
- **Process gap found:** `ci.yml` runs on pushes to `main` only. With several
  agents on `vendor/topic` branches, a broken push is invisible until a PR
  opens. Proposed: run CI on every branch push.
- **Process gap found:** no `.editorconfig`. Proposed as the only formatting
  tooling, since it needs no dependency.

**Token-efficiency notes from the outside.** The single highest-leverage item
in this repository for an incoming agent is `AGENTS.md`'s cost table: eleven
gauntlet stages in 1.4 s versus `modifiers` at 240 s. Two additions:

1. **Verify by re-running, not by re-reading.** Every claim above was checked
   with one grep or one test run, not by reading the file it named. Reviewing
   a 375-line audit cost roughly the tokens of reading it twice; reading the
   nine source files it cites would have cost ten times that.
2. **Fix small findings in the review PR itself.** A finding that takes fewer
   tokens to fix than to describe (the PRECACHE test, deleting `shot-tmp.mjs`)
   should land with the review, not be queued for a later cycle.

**Verdict on the collective plan.** Approved with the revisions requested in
`branch-audit.md` cycle 2, items 1, 3 and 4. The harvest-not-merge strategy and
the Phase A → Phase B ordering are agreed.

## 7. Approval record

Closing statement for the audit exercise of 12 September 2026. Per protocol §36,
each participant's position is recorded with its reasoning; approval from every
historical participant is not required, and the Principal determines final
acceptance.

| Participant | Position | Reasoning |
| --- | --- | --- |
| `claude-opus-5` (author) | **approve-with-concerns** | The recommendation survived three cycles and two of my own claims did not. Concern: the plan's largest assumption — that the harvested art reads at 130px — is untested, and I cannot test it. |
| Reviewer A — delivery planning | **approve** | Produced the two-phase plan; found the campaign-end gap and the audio transport error. |
| Reviewer B — adversarial | **approve** (verdict: "agree with harvest; reject the stated reasoning") | Verified the numbers, overturned the separability and merge-outcome claims. |
| Reviewer C — process and efficiency | **approve** | Four documentation claims measurably false, all fixed. One finding of its own rejected on evidence (the `blackout` references are deliberate). |
| Reviewer D — convergence | **approve-with-conditions**, all four conditions met | One further condition rejected on evidence — it resolved `main` against a stale local ref. |
| Reviewer (cycle 1, adversarial brief) | **did not report** | Recorded rather than hidden; brief reissued in cycle 2. |
| Devin (Cognition) — external, cross-vendor | **approve-with-revisions** | Re-ran every measurable claim; all reproduced. Revisions requested on `branch-audit.md` external-review items 1, 3 and 4 (bonnet location, strengths-matrix certainty, retirement owner); not yet answered. |
| **Daniel Johnston (Principal)** | **pending** | `DEC-0001` awaits his decision. Branch consolidation is his authority under §3. |

**Verification at sign-off:** 276 unit tests pass; the full gauntlet passed
twice independently — 13/13 stages in 310.2s and 305.8s.

**What is explicitly NOT verified:** the harvested art at its real display size;
the visual coherence of eleven media across eleven periods; whether `music.js`
sounds right on `main`'s audio engine, where only its imports were checked.

**Unresolved by design** (§26 — do not manufacture certainty):

- Whether to retire the overhaul branch or keep it as an art reference. §8 warns
  against collapsing competing branches for neatness; both are defensible and
  the Principal chooses.
- Whether sonotherapy's rhythm layer belongs in the web version at all. The plan
  cuts it as scope; it is also the strongest idea in `docs/ideas.md`.

**The experiment that would resolve the most uncertainty**, and it costs about
an hour: render the branch's atlases at ~130px against the real bottle. It
produces no commit and it can invalidate the entire art plan.
