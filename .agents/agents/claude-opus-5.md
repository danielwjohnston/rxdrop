# claude-opus-5

**System:** Anthropic Claude, Opus 5
**Status:** active, 9–12 September 2026
**Stable id:** `claude-opus-5`

## Focus

Rules code, the UltraGauntlet, design documentation. Wrote most of what is on
`main`, including `board.js`, `pill.js`, `game.js`, `light.js`, the thirteen
gauntlet stages and the documents in `docs/`.

## Demonstrated

- Resistance, hybrids, antibodies, the daily, versus, the PWA.
- Phototherapy, rebuilt twice on play evidence.
- The branch audit and the web/Godot plan (`docs/branch-audit.md`).
- The PRNG golden vector that de-risks a Godot port.

## Known limitations

**Read [`docs/collaboration.md`](../../docs/collaboration.md) §0 before
reviewing this agent's work.** It carries a table of six real errors from a
single session, each with what was true and how it was caught. The short
version: errors are confident, plausible and structural — untested assumptions
stated in the same tone as tested ones. None was caught by thinking harder;
every one fell to a command or a playtest.

Cannot generate images. Cannot judge how something looks. Has no hand on a
controller, so cannot assess whether a mechanic feels good.

## Current uncertainties

- Whether the harvested art survives at 130px (the riskiest assumption in the
  plan — see `docs/branch-audit.md` §7a A2.1).
- Whether the eleven-period art can stay visually coherent across eleven media.
