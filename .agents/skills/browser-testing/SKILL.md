---
name: rxdrop-browser-playtesting
description: Run RxDrop locally and capture real canvas gameplay, practitioner reactions, migration, and image-fallback evidence.
---

# RxDrop browser playtesting

## Setup
- Serve the repository root with `python3 -m http.server 8000`; this is a static ES-module site with no build step.
- Use Node through `source ~/.nvm/nvm.sh` when necessary. Playwright can connect to the environment's Chrome CDP endpoint; discover the current port rather than hardcoding it.
- Use a clean browser context for initial asset/network and service-worker checks. Inspect the current `sw.js` cache name rather than assuming a version.

## Browser flows
- `/?level=N&seed=17` selects a repeatable start. Click Play to begin.
- Options contains Instant drop and Music. Their inputs may be visually hidden; click `label[for="instant-drop"]` or `label[for="music"]` rather than using checkbox `.check()`.
- Arrow keys steer/rotate; Space drops with Instant drop enabled. `tools/bot.mjs` can plan on a cloned board; drive the live game with real keyboard input, not board mutation.
- Bound automated gameplay. A greedy planner can repeatedly preserve an isolated virus without finishing; report real clears separately from partial play.
- `window.rxdrop` exposes runtime state. For user-authorized transition scenarios, consult `tools/browser-check.mjs`; label staged level-completion events separately from real wins.
- Canvas portraits have no image element to inspect. Observe `drawImage` sources and capture screenshots during the short reaction window. An idle-return screenshot may accidentally capture the next spawn's toss; use timestamps plus an immediate canvas snapshot to distinguish them.
- For a missing-asset scenario, use a fresh context with `serviceWorkers: 'block'` and route-abort the desired PNG so the cache cannot hide the fault. Browser `ERR_FAILED` output from the deliberate abort is expected; distinguish it from application exceptions. Unroute and reload to demonstrate restoration.
- For formulary migration, back up both `rxdrop.formulary.v1` and `rxdrop.formulary.v2`, remove v2, seed v1, and reload (v2 is read first, so an existing v2 hides the migration). Afterwards restore each original value, or remove the key if it was originally absent.
- Use 390×850 for the narrow layout and check both actual pixels and document scroll width.

## Devin Secrets Needed
None for local static playtesting.
