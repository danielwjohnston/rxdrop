# RxDrop

A Dr. Mario style falling-capsule puzzler that runs in the browser. Match four
of a colour to wipe out the viruses, and try not to fill the bottle.

No frameworks, no build step, no asset files: every pill, virus and sound
effect is drawn or synthesised at runtime, and the whole game is a few hundred
lines of plain ES modules.

![RxDrop in play](assets/screenshot.png)

## Play

Clone the repository and serve it:

```sh
git clone https://github.com/danielwjohnston/rxdrop.git
cd rxdrop
npm start          # http://localhost:8080
```

`npm start` runs a tiny static file server from `tools/serve.js` - ES modules
need a real origin, so opening `index.html` straight off disk will not work.
Any other static server does the job just as well.

A link can set up a specific game, which is handy for sharing a layout:

```
http://localhost:8080/?level=12&speed=HIGH&seed=8675309
```

## Controls

| Action | Keyboard | Touch | Gamepad |
| --- | --- | --- | --- |
| Move | <kbd>←</kbd> <kbd>→</kbd> or <kbd>A</kbd> <kbd>D</kbd> | buttons, or drag the bottle | d-pad / left stick |
| Rotate | <kbd>Z</kbd> / <kbd>X</kbd>, <kbd>↑</kbd> | buttons, or tap the bottle | A / B |
| Soft drop | <kbd>↓</kbd> or <kbd>S</kbd> | button, or swipe down | d-pad down |
| Hard drop | <kbd>Space</kbd> | DROP, or flick down | d-pad up / Y |
| Pause | <kbd>P</kbd> or <kbd>Esc</kbd> | Pause | Start |
| Restart level | <kbd>R</kbd> | Restart, on the pause card | Back / Select |
| Mute | <kbd>M</kbd> | Sound | X / Square |

Holding left or right auto-shifts after a short delay, so you can slide a
capsule across the bottle in one press.

Gamepads use the standard layout, so the face buttons are A/B on an Xbox pad
and cross/circle on a PlayStation one. Browsers only hand a page a gamepad
after a button is pressed on it, so give the pad one press before expecting it
to do anything. Restart sits on Back/Select rather than a face button, since it
throws the current run away.

## Rules

- The bottle is 8 columns by 16 rows and starts with `4 × (level + 1)` viruses,
  from 4 at level 0 up to 84 at level 20. Higher levels stack them closer to
  the neck.
- Capsules fall in two halves, each one of three colours. Line up **four or
  more** of one colour in a row or column and they are destroyed - viruses
  included.
- Clearing part of a capsule leaves the other half behind, and loose halves
  fall. If they complete another line the chain keeps going, and each extra
  stage in a cascade multiplies the score.
- Each virus in a single clear is worth double the last: at LOW speed one virus
  scores 100, two score 300, three score 700, and so on. MED and HI pay more.
- Gravity gets faster every ten capsules.
- Clear every virus to finish the level. If a new capsule cannot fit at the top
  of the bottle, the game is over.

## Development

```sh
npm test           # 83 unit tests, no dependencies, ~0.3s
npm run test:watch # re-run on change

# End-to-end checks in a real browser (Playwright is not a dependency):
npm i --no-save playwright && npx playwright install chromium
npm run test:browser  # 16 checks: menus, controls, clearing, endings, mobile
```

### Layout

```
index.html            markup for the bottle, HUD and menus
src/constants.js      board size, colours, speeds, timings
src/rng.js            seedable PRNG - one seed reproduces a whole game
src/board.js          the grid: matching, gravity, cascades, virus layouts
src/pill.js           capsule geometry, rotation with wall kicks, locking
src/game.js           the state machine: lock, clear, cascade, spawn, score
src/renderer.js       canvas drawing
src/audio.js          Web Audio synthesis: two chiptune loops and the effects
src/input.js          keyboard, touch, swipe and gamepad
src/main.js           screens, HUD, persistence and the animation loop
test/                 unit tests for the rules, plus randomised soak runs
tools/serve.js        the static server behind `npm start`
tools/browser-check.mjs  end-to-end smoke test
```

The rules live entirely in `board.js`, `pill.js` and `game.js`, which never
touch the DOM. That is what lets the test suite play thousands of frames
headlessly and assert that the board never floats a capsule half or leaves a
match unresolved.

## Deploying

`.github/workflows/pages.yml` publishes the repository to GitHub Pages on every
push to `main` - the game is already static, so there is nothing to build.

GitHub Pages has to be switched on once by a repository admin, under
**Settings -> Pages -> Source -> "GitHub Actions"**. The workflow asks the
`configure-pages` action to enable it automatically, but a workflow token is
not always allowed to create the Pages site, in which case the deploy fails
with `Create Pages site failed. Error: Resource not accessible by integration`
until the switch is flipped by hand. After that, re-run the workflow (or push
to `main`) and the game goes live at
https://danielwjohnston.github.io/rxdrop/.

## Licence

MIT - see [LICENSE](LICENSE). RxDrop is an original implementation inspired by
the falling-capsule genre; it contains no Nintendo code, artwork or audio.
