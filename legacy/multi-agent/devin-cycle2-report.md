# rxdrop — multi-agent audit, Devin's cycle-2 contribution

Date: 12 September 2026. Reviewer: Devin (Cognition AI), own session, own container.
PR: https://github.com/danielwjohnston/rxdrop/pull/28 (into `claude/rxdrop-setup-khf70o`).

## 1. Who is actually in the room

| Participant | Present | Evidence |
| --- | --- | --- |
| Claude (Opus 5) | yes | 27 merged PRs from `claude/rxdrop-setup-khf70o`; cycle-1 audit in `docs/branch-audit.md`, `docs/collaboration.md`, `AGENTS.md` |
| OpenAI agent | asynchronously | the `openai/medical-eras-visual-overhaul` branch (16 commits, cut at `35eb061`) |
| Gemini | no | no artefacts found |
| Devin (Cognition) | yes | this review, cycle 2 |
| Human author | yes | direction and playtesting |

No agent spoke for a vendor it is not. No credentials were requested, offered or shared —
the repo is public/MIT and a reviewer needs only read access and a branch.

## 2. Strengths matrix (verified)

Rows as in `docs/collaboration.md §2`. Column header corrected from "Best-regarded" to
"Leads at least one widely-cited benchmark or review": two independently found 2026
comparisons (Tech Buzz, Pikvue) disagree with each other on the coding row. The robust
conclusion is the practical split — Claude for rules code and prose, GPT/Gemini for asset
generation and multimodal review, every vendor for auditing the others.

## 3. Audit of both branches — status

**`main` (web version):** 273 unit tests green; UltraGauntlet 13/13 in 250 s (42 browser
checks). Nine rules modules contain zero browser globals. Complete except: no campaign end
(button reads "Play level 20 again"), art direction not started, music per period not started.

**`openai/medical-eras-visual-overhaul`:** 264 tests green in isolation, but 7 PRs behind
`main` and *not mergeable*: a text merge conflicts in only two files yet produces a build
where `phototherapy.js` imports a `DARK_AT` that `main` no longer exports, so the whole
overhaul silently fails to load; `doctors.js` regresses 436 → 140 lines conflict-free.
Its mechanics are the versions playtesting already rejected. Its art (`periods.js`, two SVG
atlases, `virus-theatre.js`, `music.js`) is the valuable part. **Harvest, don't merge.**

**`claude/rxdrop-setup-khf70o`:** 7 commits ahead of `main` (docs + RNG golden test +
`shot-tmp.mjs` removal), 276 green. This is where the audit and plans live.

**Godot branch:** does not exist on any branch (`project.godot`, `*.gd`, `*.tscn`: none).
Phase B in `docs/branch-audit.md §7a` is the Godot plan.

Corrections I requested to the cycle-1 audit: (1) the war-bonnet fix is in the overhaul's
sprite sheet, not `src/eras.js`; (2) strengths matrix over-claims; (3) branch retirement
needs an owner and an exact command. Gaps added: CI runs on `main` pushes only; no
`.editorconfig`; Pages deploys the whole repo incl. two ~480 KB PNGs; `window.rxdrop` test
seam undocumented; Godot artefacts absent.

## 4. Consensus plan — web version (agreed, with one reorder)

A2-step-1 first: render the overhaul atlases at ~130 px against the real bottle — the only
item that can triple the phase. Then A0 groundwork (1347 → correct plague-mask date;
archive the overhaul branch; **PRECACHE guard — shipped in PR #28 as
`test/precache.test.js`**), A1 campaign ending + gauntlet check, A2 harvest the art with new
glue (no `runtime-overhaul.js` monkey-patching), A3 expose the beat from `audio.js`'s
existing look-ahead scheduler, A4 music per period, A5 freeze and ship. Cut from "done":
sonotherapy, boss, heat.

## 5. Consensus plan — Godot version (agreed, with one addition)

Port `rng.js` first and match `test/fixtures/rng-golden.json` bit-exactly before anything
else. Transliterate the ~2,800 lines of pure rules; rewrite renderer/main/input/audio/SW.
Keep the JS rules as a differential oracle (same seed + input log → per-frame board hash in
both engines). Addition: define `Board.prototype.hash()` in JS now and add it to the
determinism stage, so the oracle's hash is stable before any GDScript exists.

## 6. Collaboration guide

`AGENTS.md` + `docs/collaboration.md §4` handoff packet, plus from cycle 2: run CI on every
branch push; add `.editorconfig` as the only formatting tool; retire audited-out branches
with a tagged `archive/*` and an owner; label `direction.md §29` "do not merge".

## 7. Token-efficiency strategy

`AGENTS.md` cost table (11 gauntlet stages in 1.4 s vs `modifiers` 240 s) is the biggest
lever. Additions: verify claims by re-running one grep/test, not by re-reading files;
fix findings cheaper to fix than to describe inside the review PR; review per numbered
finding (approve/revise) rather than rewriting sections.

## 8. Approval status

- Claude (cycle 1): audit + plan authored.
- Devin (cycle 2): **approve** harvest-not-merge and Phase A → B; **revision requested** on
  items 1, 3, 4 above. Both review logs updated; `<!-- CYCLE 3 APPENDED BELOW -->` left open.
- Cycle 3 (convergence) is pending: Claude should respond to the three requested revisions;
  an OpenAI or Gemini agent, if given the handoff packet, should append its own dated entry.
  A unanimous "final approval statement" cannot honestly be written until they do.
