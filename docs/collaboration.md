# Working on RxDrop with several agents

How multiple AI agents — across vendors and across sessions — work on this
repository without treading on each other or wasting effort.

Companion to [`branch-audit.md`](branch-audit.md), which holds the audit itself
and the delivery plans.

---

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

| Capability | Best-regarded | Evidence and caveats |
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
[SiteGround](https://www.siteground.com/academy/chatgpt-vs-claude-vs-gemini-which-to-use)

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

- **The game has no ending.** `src/game.js` clamps
  `Math.min(this.level + 1, MAX_LEVEL)` at 20, so level 20 advances to level 20
  forever, and there is no run-complete state anywhere. Confirmed. This is now
  the highest-priority item for "web complete" and had gone unnoticed for the
  whole project.
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

<!-- CYCLE 2 AND 3 APPENDED BELOW -->
