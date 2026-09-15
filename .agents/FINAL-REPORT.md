# Final report — the multi-agent collaboration on RxDrop

**Status:** four review cycles complete; **two vendor seats never filled**, and
this report does not pretend otherwise. Cycle 4 overturned two of my own
load-bearing claims — see §3.
**Date:** 14 September 2026 · **Compiled by:** `claude-opus-5`

This is the consolidated answer to the Principal's brief. The brief asked for
eight artifacts. Each has a section here. Detail lives in the documents this
points at rather than being copied into them — see §7, which is not an excuse
but the actual requested strategy.

---

## 0. Read this first: what did not happen

The brief specified a team spanning Anthropic, OpenAI and Google, three review
cycles, and a final approval statement "from all agents".

**Eight agents joined across four cycles. All eight are Anthropic models.** No
OpenAI or Gemini participant ever entered the room, because this session has no
route to one:

| Route checked | Result |
| --- | --- |
| `ListAgents` | Only in-session Anthropic subagents; no cross-vendor agents |
| `ListConnectors` | Gmail, Google Calendar, Google Drive, Microsoft 365, Microsoft Learn — no model-to-model connector |
| Tool inventory | No cross-vendor invocation tool of any kind |

Three checks, one answer. The two open seats are recorded as **open** in
`.agents/messages/MSG-0001-team-introduction.md` §"Slots 6-7".

**I did not write their introductions for them.** Fabricating another agent's
voice or its agreement would have satisfied the brief's letter and destroyed the
thing the brief was for — an independent check on work I did myself. The brief's
own affirmation clause asks each agent to "refrain from fabricating another
agent's voice or agreement"; inventing two is not a loophole in that clause, it
is the thing it prohibits.

**What unblocks it:** the Principal pastes
`.agents/messages/INTRODUCTION-PROMPT.md` into ChatGPT and Gemini and returns
the replies. That prompt is self-contained and needs no credentials — the
repository is public and MIT. Roughly five minutes.

**Two things make that drought less total than it sounds, and cycle 4 was right
to insist both be said here rather than buried.**

One external non-Anthropic reviewer *did* participate: **Devin (Cognition)**,
whose independent verification is filed in `docs/branch-audit.md`
§"External review". **Three of its revisions were left unanswered**, and cycle 4
found one of them — the misplaced war bonnet — still standing in the plan after
being accepted. Now applied.

And the repository already contains another vendor's work: the
`openai/medical-eras-visual-overhaul` branch was produced elsewhere, and §3 of
this report is an audit of it. That is genuine cross-vendor collaboration, just
**asynchronous** rather than live. Saying only "no OpenAI participant entered
the room" made the drought starker than the record supports.

---

## 1. Unified multi-agent introduction summary

Eight introductions — five in cycles 1-3, filed verbatim in
[`MSG-0001`](messages/MSG-0001-team-introduction.md), and three more in cycle 4.
Every agent was required
to name **a specific error it had actually made on this project** — a generic
"I sometimes hallucinate" was rejected and sent back.

| Slot | Agent | Role | The error it owned |
| --- | --- | --- | --- |
| 1 | `claude-opus-5` | Built most of `main`; compiled this report | Six, tabulated in `docs/collaboration.md` §0 — including asserting twice that the audio engine had no transport, and writing it into `ideas.md` |
| 2 | `claude-reviewer-adversarial` | Attack the audit's claims | — (found the `doctors.js` → `runtime-overhaul.js` import that disproved my "art is separable" claim) |
| 3 | `claude-reviewer-process` | Check conventions and residue | Found the dead blackout `updateLight` shadowed in `game.js` |
| 4 | `claude-reviewer-convergence` | Force a single plan | Rejected my attribution of a finding to the wrong reviewer |
| 5 | `claude-reviewer-planning` | Sequence the delivery | Caught the transport error above |
| 6 | `claude-reviewer-adversarial-c4` | Cycle 4: attack the report's facts | Over-trusts its own reading of git merge semantics when it reasons instead of running the command — so it backed its central finding with three independent artifacts |
| 7 | `claude-reviewer-attestation-c4` | Cycle 4: attest the matrix | Over-produces "REFINE" verdicts as a way of appearing to decide without deciding |
| 8 | `claude-reviewer-planning-c4` | Cycle 4: re-review the plan post-merge | Over-trusts a document's own status markers ("delivered") instead of re-deriving them from the file |
| — | (cycle 1, adversarial brief) | — | **seat went dark, never reported** — recorded in `docs/collaboration.md` §7 and previously omitted from this tally |
| — | **open** | OpenAI, Gemini | **never joined** |

The most useful single artifact to come out of this phase is the failure-mode
table in `docs/collaboration.md` §0: six errors I actually made here and how each
was caught. A reviewer of my work should start there, because it says where to
look.

---

## 2. Researched strengths matrix, with known gaps

Full section, with the cycle-4 corrections: [`docs/collaboration.md` §2](../docs/collaboration.md).
**Snapshot date: 14 September 2026** — frontier standings move within a quarter,
so treat any undated row here as expired.

It was titled "Verified strengths matrix" until review cycle 4. **"Verified"
claimed more than the evidence delivers**, and the retitle is the honest
version.

**The brief's three claims, as attested:**

| Claim in the brief | Verdict |
| --- | --- |
| Claude excels at reasoning, analysis, code structure | **Too coarse.** The flagships sit within single percentage points and each leads a different coding benchmark. |
| OpenAI excels at creativity, **visuals, narrative**, flexible problem-solving | **Splits — and not where the first version said.** See below. |
| Gemini excels at multimodal reasoning, research breadth, factual synthesis | **Supported, scope narrowed** — leads *video and audio* specifically, not multimodality as a category. |

**Cycle 4 corrected my own work in four places, three of them against
Anthropic's interest:**

1. **I overshot on narrative.** I wrote that "narrative does not hold" for
   OpenAI. Refined: **prose, voice and long-form consistency** do not belong to
   OpenAI, but **structural narrative — outlining, pacing, plot coherence —
   substantially does.** "Narrative" ordinarily includes structure, so the
   Principal was more right than I allowed.
2. **"Claude, not OpenAI" was selective.** Gemini also outranks GPT on
   human-preference writing. Naming only the half that favours Claude was
   self-serving.
3. **Three supporting facts were stale or wrong** and are now deleted rather
   than replaced — including the Claude-favourable "leads real-world bug
   fixing" row, which was the most flattering claim in the table and the one
   that checked out worst. They were deleted rather than swapped for cycle 4's
   newer numbers because those were sourced to aggregators the reviewer itself
   labelled unverified.
4. **The evidence base is materially weaker than the tone was.** Not one of the
   seven original citations is a benchmark maintainer, model card, vendor eval
   post or peer-reviewed paper — all seven are content marketing. One of them
   **contradicts the row it was cited for.**

**The most important correction, because it changes what this project is
waiting on.** I had described the two open vendor seats as the keystone this
work needed. Cycle 4 rejected that, correctly: a GPT agent asserting it is good
at narrative is **vendor self-report, the least reliable evidence class
available** — below the marketing blogs it would replace. The gap here is
evidence quality, and **primary sources close it today, with no new agents.**
The vendor seats remain valuable for the 130px art test (§4), which needs
multimodal capability rather than self-description. They were never going to
fix this section.

**Three exposures, where I had disclosed only the first:** the research rests on
one agent; that agent shares a vendor with the model its boldest verdict
favours; and cycle 4's reviewer was a fourth Anthropic model, which makes the
second exposure worse rather than better. It volunteered that itself.

**Where I pushed back on the reviewer:** its top-priority revision was to
disclose that EQ-Bench is adjudicated by an Anthropic model. The finding is
real and useful, but **this matrix has never cited EQ-Bench** — the reviewer
researched it independently and then attributed it to us. That attribution is
rejected; the warning is kept, as a trap for whoever next tries to strengthen
the prose sourcing.

**What it means for RxDrop**, unchanged because it never rested on the
benchmark rows:

- **Claude** — rules code, the gauntlet, design docs, in-game prose.
- **Gemini or GPT** — asset generation, and multimodal review of how the game
  *looks at real size*.
- **Any of them** — auditing each other. Cycle 4 is the evidence for that: it
  corrected its own vendor's work in four places.

---

## 3. Audit of both branches

Full audit: [`docs/branch-audit.md`](../docs/branch-audit.md).

**The finding that decided the strategy.** `openai/medical-eras-visual-overhaul`
was cut at PR #20 and **predates fourteen merged PRs** (31 commits; "seven" was
correct when written and was not re-measured). Its `index.html`,
`main.js` and `styles.css` are byte-identical to the merge base — so it is not
solving the onboarding problem differently, it simply does not have the fix. **That is a statement about the branch as an artifact, not about a merge** —
see the correction below.

**Corrected in cycle 4 — I had this wrong, and it was the claim I called "the
finding that decided the strategy".** I wrote that a naive merge reinstates the
Start-button defect and deletes the browser check. It does not. The branch
changes thirteen files, and `index.html`, `src/main.js`, `src/styles.css` and
`tools/browser-check.mjs` are **all byte-identical to the merge base**, so a
three-way merge takes main's side and the onboarding fix and both checks
survive. What is true is narrower: the branch **standalone** lacks them, which
matters for a checkout or a replace-main harvest, not for a merge.

**The recommendation survives on the other two grounds, which do hold:**

- **It fails on merge.** `src/phototherapy.js` imports `DARK_AT`. The *branch*
  exports it at its own `constants.js:239`, so the branch is fine standalone —
  but **`main` does not**, so **post-merge** it is a `SyntaxError` and the
  overhaul runtime silently never loads. My earlier wording dropped the "on
  merge" qualifier and asserted the branch was dead on arrival. It isn't.
- **Fixing that export is worse than leaving it**: it lets
  `runtime-overhaul.js` monkey-patch nine `Game.prototype` methods — thirteen
  prototype methods in all, counting `Board`, `InputController`, `Renderer` and
  `AudioEngine`.

**Recommendation, accepted as `DEC-0001`:** harvest the art and period work; do
not merge the branch wholesale. **Do not delete the branch** until the harvest
has landed and passed the 130px check — that call is the Principal's alone
(Protocol §3).

**Six** claims in the audit were wrong and were corrected by review, not
preserved for neatness — the last two found in cycle 4, in this report itself:

1. "The art is separable at the module boundary" — false; `doctors.js` pulls in
   the overhaul runtime.
2. "A merge yields two light systems" — understated; it is a module-load failure.
3. "The audio engine has no transport" — false, said twice.
4. "The game has no ending" — overstated; there is a finale card, the real gap
   is narrower.
5. **"A naive merge reinstates the Start defect"** — false, as above. The
   branch touches none of those files.
6. **"The war bonnet is in `src/eras.js`"** — false, and worse than a simple
   error: Devin filed this correction, it was accepted, and it was never
   applied. Cycle 4 found it still in the plan. It is in the branch's sprite
   sheet, making it an art question, not a text fix.

---

## 4. Consensus plan — web version first

Full plan with dependencies: [`docs/branch-audit.md` §7a](../docs/branch-audit.md).
Sequenced by dependency, not appeal.

| Item | What | State |
| --- | --- | --- |
| **A0** | ~~Fix two historical-credibility errors in `eras.js`.~~ **Closed** — the plague band is now `1619 - 1799` (`eras.js:140-144`), pinned by `test/eras.test.js:25`. The war bonnet was **never in `eras.js`**; it is in the branch's sprite sheet, so it is an art question inside A2. Remaining: create the `archive/openai-medical-eras` tag (unconditional per DEC-0001), and close the precache gap for assets referenced from JS. | partly **done** |
| **A1** | The campaign ends. There is a finale card, but the button says "Play level 20 again". A caseload needs a last case. **The only item that changes what the game is.** | open |
| **A2** | Harvest the art — **130px test first** | open, **riskiest** |
| **A3** | Expose the beat: beat index, bar position, injectable clock | **delivered** — `src/transport.js` |
| **A4** | Music per period. Blocked on A3 (now clear) and A2's period map | unblocked on the A3 side |
| **A5** | Freeze. Full gauntlet, ship, add no mechanics. | — |

**A2.1 is the plan's riskiest assumption and it is still unchecked:** the
overhaul's assets were generated at roughly double their display size, and they
appear at ~130px in a side panel. If they fail to read at true size, A2 is a
commission rather than a harvest and Phase A's cost roughly triples. It produces
no commit, which is exactly why it keeps getting deferred. **A multimodal agent
could settle it in minutes — it is the single most valuable thing an OpenAI or
Gemini participant could contribute on day one**, and it is written into the
introduction prompt for that reason.

**Deliberately cut from "web complete":** sonotherapy, the macro-organism boss,
heat/over-treatment. They are the best ideas in `docs/ideas.md` and they make the
game *bigger*, not *done*. They belong after a shipped web version.

---

## 5. Consensus plan — Godot port

Full plan: [`docs/branch-audit.md` §7a Phase B](../docs/branch-audit.md).

**The separation is real and was verified, not assumed.** `board.js`, `pill.js`,
`game.js`, `light.js`, `modifiers.js`, `rng.js`, `versus.js`, `eras.js` and
`constants.js` contain **zero** references to `window`, `document`, `navigator`
or `localStorage` — **3,232 lines** (2,994 non-blank) of pure, deterministic,
seeded logic. Cycle 4 also found something stronger than the original claim:
those nine form a **closed import set**, importing only from each other.
Transliterating that to GDScript is tedious and low-risk. `renderer.js`,
`main.js`, `input.js`, `audio.js`, the service worker and `formulary.js`'s
storage layer are rewritten, not ported.

**The trap is the gauntlet.** It is Node ESM importing `src/*.js` directly. It
does not port, and rewriting thirteen stages in GDScript would discard the
accumulated catch history. Instead, **keep the JS rules as a differential
oracle**: run one seed and one input log through both engines, compare board
hashes per frame. "Did the port change the rules?" becomes one automated
question.

**This rests entirely on the ported PRNG being bit-exact**, which is why
`test/fixtures/rng-golden.json` exists. **Port `src/rng.js` first, check it
against the fixture, port nothing else until it matches.** mulberry32 ports
*almost* right — `Math.imul` is a signed 32-bit multiply, `>>>` is unsigned,
neither free in a 64-bit integer language — and an almost-right generator makes
the differential test fail far from its actual cause.

---

## 6. Collaboration improvement guide

Conventions in `docs/collaboration.md` §5, and **§5a for cross-vendor work
specifically** — what a non-Anthropic agent needs (no credentials; the
repository is public and MIT), why the *artifact* rather than a shared session
is the interface between vendors, and four failure modes this project actually
hit. The four general conventions that carry the most weight:

- **Every mechanic ships with a bound** — a written sentence saying why it cannot
  leave a virus unanswerable, enforced by a check rather than by intention. The
  single most valuable convention in this repo.
- **Falsify every check**, and say so in the commit message. A check never seen
  to fail is decoration.
- **Player feedback becomes a check**, quoting the human verbatim in the comment.
  This is why regressions do not come back.
- **Docs record what was cut and why.** `ideas.md` keeps dead designs struck
  through with the evidence that killed them, so the next agent does not
  re-litigate a settled question.

**Added this cycle, from things that actually went wrong:**

- **A handoff names what was *rejected*, not just what was done** — the fourth
  item people forget, now required by `AGENTS.md`.
- **Structure beats discipline.** `CLAUDE.md` was a symlink to `AGENTS.md` until
  a commit replaced it with a copy; the copy went stale within days, and what it
  went stale on was the Playwright advice specifically — telling readers to set
  an `executablePath` the repo's tooling deliberately does not use. It is a
  symlink again, plus `test/guides.test.js` so a future fork fails loudly. Prefer
  making drift impossible over asking people not to drift.
- **An agent that declines to exceed its evidence is behaving well.** Three
  reviewers refused to characterise vendors they had not observed. Record the
  refusal; do not pressure it into a guess.

---

## 7. Token-efficiency strategy

Measured, not estimated.

**The gauntlet's cost is wildly uneven** — this is the single biggest saving
available:

| stage(s) | time |
| --- | --- |
| **eleven stages together** | **1.4 s** |
| `modifiers` | ~240 s |
| `browser` | ~65 s |
| full gate, thirteen | ~310 s |

So: run the eleven-stage line while iterating; add `modifiers` only when
touching `src/modifiers.js` or `src/light.js`; add `browser` only when touching
`index.html`, `src/styles.css`, `src/main.js` or `sw.js`. Run all thirteen once,
before handing off. **Never run the full gauntlet to check a one-line edit.**
`npm test` is ~1 s and is the cheapest useful check.

**Two traps, both of which cost five minutes each time:** a mistyped *stage name*
errors out loudly, but a mistyped *flag* is silently dropped and the full gate
runs. Check the stage count in the output line.

**Reading:** eight files exceed ~800 lines and are listed with their line counts
in `AGENTS.md`. Do not read them whole.
`grep -n '^#\{1,3\} '` gives a document's entire shape for ~600 tokens;
`grep -n "check('" tools/gauntlet.mjs` lists every check without bodies;
`grep -n` then `sed -n 'A,Bp'` reads the twenty lines you need instead of the
twelve hundred you don't.

**Documents:** this report points at its sources rather than restating them.
Duplicated prose is not just wasteful, it *desynchronises* — which is exactly the
`CLAUDE.md` failure above, in document form.

---

## 8. Final approval statement

**Approved by the agents that participated** — but the approvals are dated, and
cycle 4 was right that presenting them beside a fresh verification implied more
than was true. **The cycles 1-3 sign-off is dated 12 September 2026 and was
given against a 276-test tree, before PR #44 and before the merge described
above.** The verification figures below are from 14 September and were *not*
what those five agents approved. Recorded with each agent's verdict and
reasoning in `docs/collaboration.md` §7.

**Cycle 4, 14 September, re-reviewed the current tree and all three reviewers
returned REQUEST REVISIONS, not approval.** Their findings are applied
throughout this report and in `docs/branch-audit.md` — including two claims of
mine that were simply wrong, one of which I had called "the finding that
decides the strategy". **Devin's three revisions from the external review remain
partly unanswered**; one, the misplaced war bonnet, was accepted and left
unapplied until cycle 4 caught it.

Four cycles ran against `docs/branch-audit.md`; the log in `docs/collaboration.md`
§6 records who reviewed, under what brief, and what changed. Review **changed
the conclusions in six places** rather than ratifying them — see §3.

**This is eight-eighths of the agents present and eight-tenths of the agents the
brief called for** — and cycle 4's three did not approve, they requested
revisions, which are now applied. It is not the unanimous multi-vendor sign-off the
brief specified, and it should not be read as one. The missing signatures are
OpenAI's and Gemini's, the seats are held open in `MSG-0001`, and the route to
filling them is one paste of `INTRODUCTION-PROMPT.md` per vendor.

**Verification on the current tree, 14 September:** 312 unit tests pass; full
gauntlet **13/13 in 322.9 s**, including 42 browser checks (the browser stage
and the eleven-stage line were independently re-run by cycle 4's adversarial
reviewer: 42/42, and 11/11 in 1.6 s).

**Decisions reserved to the Principal** and deliberately not taken here
(Protocol §3): whether to harvest, merge or keep both branches (`DEC-0001`, its
decision field filled on acceptance); and whether the overhaul branch is ever
retired. `docs/branch-audit.md` §8 warns specifically against collapsing
competing branches for tidiness.
