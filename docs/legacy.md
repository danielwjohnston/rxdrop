# RxDrop — The Making Of (documentary script)

> **Status: legacy record.** Nothing referenced from this page is loaded by the
> game. The `legacy/` folder holds the footage this script points at; the live
> game reads only `src/`, `assets/practitioners/`, `index.html`, `manifest.json`
> and `sw.js`. If a file is in `legacy/`, it is *history*, not *product*.
>
> Format: a documentary. Each act has narration (what the voice-over says), a
> shot list (what is on screen, with the commit or file to show), and the
> decision the scene turns on. Quotes attributed to Daniel are from the
> development sessions, lightly trimmed. Dates are commit dates.

---

## Cold open

**NARRATION.** A capsule falls into a bottle. Two colours, four viruses, a
grid eight wide and sixteen tall. Everyone who has held a controller knows this
picture. The question this project asked, over five days in September 2026, was
whether the picture could be made to mean something.

**SHOT LIST.**
- Slow push-in on the live game at level 0: the Protomedicine shaman in the side
  panel, the bottle, the first capsule. (Run `npm start`, `?seed=1`.)
- Cut to black. Title card: *RxDrop — Apothecary Through Time*.

---

## Act I — A clone that worked (9 September)

**NARRATION.** The first commit is a complete game. Not a prototype: versus
mode, a daily seed, offline play, a bot that plays the game, and a
thirteen-stage "UltraGauntlet" that refuses to pass a build the bot cannot
finish. The discipline arrived before the identity did.

Within the same day the game learned it was unfair — rotation drifted, the lock
timer cheated — and fixed it, and grew a neck row so a full bottle was a
warning instead of a loss.

**SHOT LIST.**
- `0423e40` *Build RxDrop: a Dr. Mario style puzzle game (#1)* — first commit,
  scroll the file list.
- `6780378` *Finish the game: versus, daily, offline, resistance and the
  UltraGauntlet (#4)* — show the gauntlet running, 13/13.
- `ee6b344` *Fix rotation drift and the lock timing that made the game unfair
  (#6)*; `6c9527f` *Add a neck row (#7)*.
- `assets/screenshot.png`, `assets/versus.png` — the two README screenshots,
  the only images the repository had for its first three days.

**DECISION.** Ship a finished clone first, then decide what it is. The
gauntlet stays as the gate for everything after.

---

## Act II — Medicine gets a history (9–11 September)

**NARRATION.** "Apothecary Through Time." The bottle became a treatment
system: resistance, collateral sensitivity, hybrid strains and antibodies,
rationing that turned out to be a relief and was rewritten as a stock-out that
drives resistance. A physician's formulary filled in as you played. Five eras
of medicine banded the levels, each with a procedurally drawn practitioner.

Then the dark. Blackout rounds were a switch you waited out. The author's note
at the time: *"lights disappear before I get a chance to line up the tetris."*
Phototherapy replaced it — light as a treatment you deliver, a falling
tetromino inside a narrow chamber. Three versions of that light were written
and two were falsified by play before the third stood.

**SHOT LIST.**
- `5449d3e` *Apothecary Through Time, and open the design up (#8)*.
- `01cc577` collateral sensitivity; `5c401a1` hybrids and antibodies;
  `e749dc1` *Rationing was a relief, not a challenge*; `9f5119a` the formulary.
- `731109a` → `de2f8c5` → `cc90377` → `354b545` — the four phototherapy PRs,
  shown as a strip; read their titles aloud, they are the argument.
- `docs/direction.md` — the 34-section creative direction captured on 11
  September, "in the author's own words". Hold on §11 *Phototherapy Should
  Replace Blackout* and §27 *The Game Should Tell the History of Medicine
  Through Interpretation*.
- The procedural five-era doctors from `src/doctors.js` at `782d324`, drawn at
  132 px — this is the art the game shipped with before any rendered sprite.

**DECISION.** The game is a medical world, not a list of modifiers.
Documentation is a first-class artefact: `docs/direction.md` says what we
*want*, `docs/ideas.md` says what is *true*.

---

## Act III — The other branches (10–12 September)

**NARRATION.** While `main` moved, two other lines of work ran beside it.

An OpenAI agent cut `openai/medical-eras-visual-overhaul` at PR #20 and built,
in one long push, eleven visual periods, two hand-authored SVG atlases, a virus
theatre, evolving music, and its own phototherapy. It was ambitious and it was
already stale: byte-identical `index.html` to a merge base seven PRs behind,
importing a symbol `main` no longer exported. Merged naively it would have
loaded nothing — silently.

Daniel then convened a multi-agent audit: Claude, an OpenAI agent, Gemini and
Devin were each asked to introduce themselves, audit both directions, and
cross-review across three cycles. Claude ran its audit on
`claude/rxdrop-setup-khf70o`. Devin's cycle-2 review (PR #28) re-ran every
measurable claim and confirmed the finding that decided the strategy.

**SHOT LIST.**
- `legacy/openai-visual-overhaul/medical-era-sprites.svg` and
  `virus-mascots.svg` — open in a browser, pan across the atlas. *These are
  the only OpenAI-drawn images in the repository's history.*
- `docs/branch-audit.md` §2 *The finding that decides the strategy* and §4
  *Three light systems on the branch, and a silent failure on merge*.
- `.agents/decisions/DEC-0001-harvest-not-merge.md` — the accepted decision.
- `docs/collaboration.md` — the three-cycle review log; show the cycle-3
  marker and the honest caveat that cycles 2–3 were Claude's internal
  reviewers, not the other vendors.
- `legacy/openai-master-protocol/README.md` — the 1,211-line collaboration
  protocol the OpenAI agent proposed (PR #30). Superseded by the shorter
  `.agents/PROTOCOL.md` that Claude folded in.
- Devin's cycle-2 report and the audit repo docs at `legacy/multi-agent/`.

**DECISION (DEC-0001).** *Harvest, don't merge.* Take the branch's art and
ideas; leave its mechanics, which play had already falsified on `main`. The
branch is preserved here as footage; it is not in the game.

**HONESTY CARD.** Only two vendors ever reviewed live (Claude and Devin, with
one OpenAI PR). No Gemini agent participated. The "three cycles" requirement
was met on paper by Claude's internal reviewers; the log says so.

---

## Act IV — The style sheets that were never in the repo (12 September)

**NARRATION.** Daniel arrived with three ChatGPT-rendered style sheets — thirty
art styles, each showing the five practitioners — and asked where the build
that used them was. There wasn't one. The sheets had been *discussed* in
`docs/direction.md` ("walk down sheet 2's column as eras advance") but never
committed, never rendered as individual elements, never tested at game size.

Two historical errors sat in those sheets: the plague band opened in 1347 but
the beaked costume is from the 1600s, and the shaman wore a Plains war bonnet
in half the panels.

**SHOT LIST.**
- `legacy/stills/chatgpt-style-sheets.png` — the screengrab Daniel shared.
  Pan slowly; stop on the "European ligne-claire" row of sheet 2.
- `docs/direction.md` §"The art style is the timeline".
- Quote card, Daniel: *"where is the build that used chatgpts renders?"*

**DECISION.** Render individual elements ourselves, in one style, with the two
history errors fixed in the prompt. Budget for everything at every style was
computed and filed (≈ $80 medium, ≈ $312–469 at maximum) and then set aside:
*"lets just continue with the existing style since we've already spent money
on it."*

---

## Act V — Ligne claire, and faces that react (12 September)

**NARRATION.** Twenty sprites first: five practitioners, four expressions —
idle, toss, cheer, worry — because the game already had a reaction system
wired to clears, outbreaks and blocked drops, and nobody had drawn faces for
it. Each passed a 130 px test against the real bottle before it was kept. The
procedural doctor stayed as the fallback if an image ever fails to load.

Then the roster question: *"I would like the full list of practitioners as
well as I want everything to be historically accurate."* The audit found three
wrong dates. Daniel chose to expand rather than trim: ten eras, ten
practitioners, and the last era renamed *Genomic Medicine, 2000 – onward*.
Old saved notebooks were migrated so a plague-era discovery did not land in
the new Apothecary band.

**SHOT LIST.**
- `fad6593` *Add ligne-claire practitioner sprites*; PR #32.
- `legacy/renders/five-era-set/` — the original five-era set, including the
  dark-suited physician that five re-renders never turned into a white coat.
  Cross-fade to the shipped `assets/practitioners/physician-idle.png` (still
  dark-suited; noted as a launch-art follow-up).
- `legacy/renders/130px-tests/` — the contact sheets used to pass or fail
  each render at game size.
- `03293c1` *Expand medicine eras and practitioners*; `7d0ef64` *Migrate
  five-era formulary saves to the ten-era ids*; PR #33.
- `docs/practitioners.md` — the dated roster, on screen while the ten portraits
  cycle.
- Quote card, Daniel, on the rendered doctors: *"do the doctors have
  expressions? a lot happens that could inspire reactions or emoting."*

**DECISION.** PNG over SVG (image models emit raster; the display slot is
fixed at 132 px; the rest of the game is already vector-procedural). AI
sprites are placeholders; **Jon Garcia (rokrjon.com) is the intended launch
artist**, whose pixel-world / comic-portrait split matches the game's own.

**SHOT.** `legacy/stills/rokrjon-reference.png` — the screengrab of Garcia's
game Daniel shared: pixel world, comic-ink character overlay in dialogue.

---

## Act VI — Chains, light, and music (12–13 September)

**NARRATION.** Playtesting produced three notes in one message.

*"The game does not seem to reward chaining."* Research into Dr. Mario's
manuals: viruses in one drop double cumulatively; capsule-only clears score
nothing; multiplayer sends garbage for multi-line clears. RxDrop went further:
a cascade bonus that pays even when no virus dies, a multi-line bonus, and
garbage that scales with chain stage.

*"I like tetris to be full bottle width and at the same speed of drop as the
current pill speed — it was too hard for me to play."* The light chamber
became full width by default and fell at capsule gravity.

*"Update the chiptunes to match the eras/practitioners."* Ten synthesized
loops, one per era, with a documented musical rationale and an honest caveat
where an association is conventional rather than evidenced.

**SHOT LIST.**
- PR #35 `ee2bc92` chain scoring; PR #36 `c4a5ab1` phototherapy; PR #37
  `0570831` ten chiptunes; PR #45 the review follow-ups.
- `docs/music.md` — scroll the era table while each loop plays.
- The `CHAIN ×3` toast firing on a real cascade.

**DECISION.** Every playtest note becomes a PR with a test, gated by the
gauntlet. The reviewer's findings (a hurry that jumped several rows, a timer
that expired before a piece could lock, danger music inherited by a fresh
bottle) were fixed after merge rather than argued.

---

## Act VII — One branch (13 September)

**NARRATION.** *"I want only one main branch after all this work, best of all
parties."* And then, a correction to how that should be done: *"think about it
like you're making a documentary."*

So the branches were not deleted; they were harvested. The multi-agent
process — protocol, decisions, audit, collaboration log, PR template, the
golden-RNG and precache tests — came onto `main` from the Claude line. The
OpenAI atlases and the long protocol came in as footage. The renders that were
never shipped came in as footage. Then the branches went.

**SHOT LIST.**
- `git branch -r` before: eleven branches. After: `origin/main`.
- The `legacy/` tree.
- Final shot: the live game, level 18, Genomic Medicine, the technician
  cheering a chain.

**DECISION.** History lives in `main`, labelled as history. The game reads
none of it.

---

## Appendix — what is where

| Footage | Path | Used by the game? |
|---|---|---|
| OpenAI SVG atlases (visual-overhaul branch) | `legacy/openai-visual-overhaul/` | No |
| OpenAI 1,211-line master protocol (PR #30) | `legacy/openai-master-protocol/` | No |
| Devin cycle-2 review report | `legacy/multi-agent/` | No |
| Original five-era ligne-claire renders + 130 px tests | `legacy/renders/` | No (superseded by `assets/practitioners/`) |
| ChatGPT style-sheet screengrab; Jon Garcia reference | `legacy/stills/` | No |
| Multi-agent protocol, decisions, audit, collaboration log | `.agents/`, `docs/branch-audit.md`, `docs/collaboration.md` | Process docs, not runtime |
| Ten practitioners × four poses | `assets/practitioners/` | **Yes** |

## Not yet filmed

- Pathogen sprites in ligne claire (24 renders, ≈ $0.90) — planned, not done.
- The Godot / Blender 3D direction — a plan in `docs/direction.md`, no code.
- Jon Garcia's launch art — the brief is `docs/practitioners.md` plus the
  132 px / 25 px display sizes.
