# DEC-0003 — An outbreak never crowds a hybrid below two open sides

**Date:** 12 October 2026
**Status:** **accepted by the Principal**, 12 October 2026
**Author:** cloud agent session `session_01Rc4tj5755GWLcf4EtzATdM` (no profile
in `.agents/agents/`)
**Builds on:** the outbreak fix on `claude/serene-dirac-fu4vtk` (session
`session_01XMbTfLA6hUozucHh1VXevu`): a child never completes a run, and a hybrid
never replicates. That fix listed this question under "What is knowingly not
done" in `docs/ideas.md`.
**Supersedes:** nothing.

## Question

A hybrid forms only with two open sides to treat from (`Board.mutateViruses`,
`treatableFrom >= 2`). That bound governs *formation*. Afterwards, an outbreak
child can land orthogonally beside the strain and take away a side. Should a
strain keep two open sides for its whole life, at least against outbreak?
Outbreak is the only mechanic that adds viruses mid-game.

## Options considered

1. **Guard at 2.** `outbreakTargets` skips any cell that would leave an
   adjacent hybrid with fewer than two open sides. ← **accepted**
2. **Guard at 1.** Forbid only boxing a strain in completely.
3. **No guard.** Treat a crowded strain as slow rather than fatal, and record
   why.

## Evidence

All measurements below use the base fix, rebuilt in a scratch tree. The rebuild
reproduced the fix's own figure exactly: 296 outbreak ticks and four hybrids
going 2 → 1 for `level 4, LOW, resistance, ['outbreak']`, seeds 0–39, driven by
the gauntlet bot.

- **One tick can box a strain in completely.** `OUTBREAK_MAX` is 2. Put a
  hybrid in the bottom-left corner with its two open sides at right and above.
  Put one un-spread virus beside each of those cells, each with no other empty
  neighbour. One tick then fills both cells, and the strain goes from two open
  sides to **none**. This is the state the formation bound exists to forbid ("a
  boxed-in one would be unanswerable", `src/board.js`). It happens on `main`
  and with the base fix. Before this decision, no check stood in the way; luck
  did.
- **Erosion from 2 to 1 is common, and worse at higher levels.** Over 200
  seeds each at levels 4, 8, 12, 16 and 20 (1,000 bot games, 7,786 outbreak
  ticks), 295 ticks took a hybrid from two sides to one: 1.5% of ticks at
  level 4, and 4.0–4.7% at levels 8–20. None went to zero.
- **The case for "no" is real.** At one side a strain is still answerable:
  deliveries persist, and the same parent twice wears it down. In 197 of the
  295 cases the crowding child was itself one of the strain's parent colours,
  so clearing it counts as a delivery. The bot lost all 1,000 games, so how
  long strains stayed crowded measures the bot, not a person.
- **Guard at 1 is a no-op in play.** It closes the constructed box-in, but it
  changed nothing in all 7,786 measured ticks. It does not answer the question.
- **Guard at 2 is cheap.** No hybrid lost a side. 0.9% fewer children were
  placed (15,105 → 14,968). A parent that is skipped keeps its one replication
  for a later tick.
- **The reference trace.** The base fix already moves
  `outbreak-quarantine-rationing` (first difference at frame 1189). Once that
  trace is re-recorded with the fix, neither guard moves it further.

## Tradeoffs

The guard adds one more skip to `outbreakTargets`, beside the run guard and in
the same view of the board after this tick's earlier picks. A player cannot see
it happen: the outbreak simply goes somewhere else, or waits.

In return, viruses are only added by outbreak, so "a hybrid always has two open
sides" now holds for a strain's whole life, not only at formation. One gauntlet
check can scan for it on every frame. That check also catches any future
mechanic that adds viruses without going through `outbreakTargets`. The October
ward's zombie bite, which "rides the outbreak rule", is the first such
candidate.

## Recommendation and decision

The recommendation was option 1. The Principal chose option 1 on 12 October
2026.

## Confidence

High that zero open sides is reachable without the guard: it is constructed,
not inferred. High that the guard costs little: it was measured across 1,000
games. Medium on how much erosion to one side costs a human. The bot is a poor
proxy for that, and it is the question this decision makes moot.

## Revisit if

- A mechanic is proposed that should deliberately wall a strain in, such as a
  boss that encysts. It would need its own bound, and this one would have to
  make room for it.
- Play shows outbreak has gone soft. That would be a tuning question for
  `OUTBREAK_INTERVAL` / `OUTBREAK_MAX`, not a reason to reopen this.
