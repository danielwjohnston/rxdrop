# RxDrop

A Dr. Mario style falling-capsule puzzler that runs in the browser. Match four
of a colour to wipe out the viruses, and try not to fill the bottle.

No frameworks and no build step: every pill, virus and sound effect is drawn or
synthesised at runtime. It installs to a home screen, plays with the network
off, has a daily challenge and local two-player versus, and adds one mechanic
the genre has not had before - **antibiotic resistance**.

![RxDrop in play](assets/screenshot.png)

Local versus, both bottles dealt the same layout and the same capsules:

![Two-player versus](assets/versus.png)

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

## Modes

**Solo** — the classic ladder. Pick a level from 0 to 20 and a speed, clear
every virus, move on to the next level.

**Daily** — one bottle a day, the same for everyone, derived from the UTC date
alone. No server and no accounts: your device computes the same seed as
everyone else's. Finishing gives you a spoiler-free result line to share, and
your best attempt of the day is kept.

**Versus** — two players on one keyboard (or a gamepad each). Both bottles get
the same layout and the same capsules, so it is a contest of play rather than
luck. Clear more than the minimum four, or set off a cascade, and the surplus
falls into your opponent's bottle as loose garbage halves. You win by clearing
your viruses first or by outlasting them.

## Antibiotic resistance

The optional twist, and the part that is new to this genre. Turn **Resistance**
on and the viruses stop being patient furniture:

- every virus carries a hidden resistance counter, seeded unevenly so they do
  not all ripen at once
- every eight capsules, all of them age by one
- a virus that reaches the limit **mutates to a different colour** and resets

A virus about to turn wears a pulsing dashed ring, and the panel shows how close
the board is to its next mutation. The setup you have been carefully building
around a red virus is worth nothing the moment it turns blue, so the mechanic
punishes hoarding and rewards clearing while you can. A mutation never completes
a run on its own: it is always a threat, never a free clear.

It fits the theme exactly - leave an infection half-treated and it develops
resistance.

## Offline

RxDrop is a progressive web app. Open it once and a service worker precaches
every file; after that it runs with no network at all, and browsers will offer
to install it to your home screen or desktop. The daily challenge works offline
too, since the puzzle comes from the date rather than a server.

**On iPhone and iPad**, Safari does not show an install prompt - installing is
manual: **Share → Add to Home Screen**. Launched from the home screen it runs
full screen with no browser chrome. Service workers and the Cache API have
worked on iOS since 11.3, so offline play works the same way; iOS 26 opens
home-screen sites as web apps by default, and the `apple-mobile-web-app-*`
tags here cover older versions. Two iOS quirks worth knowing: sound only starts
after your first tap (Safari requires a gesture before audio), and versus needs
a keyboard or two controllers, since the touch pad only drives player one.

## Controls

| Action | Keyboard | Touch | Gamepad |
| --- | --- | --- | --- |
| Move | <kbd>←</kbd> <kbd>→</kbd> or <kbd>A</kbd> <kbd>D</kbd> | buttons, or drag the bottle | d-pad / left stick |
| Rotate | <kbd>Z</kbd> / <kbd>X</kbd>, <kbd>↑</kbd> | buttons, tap the bottle, or slide up | A / B |

| Hurry down | <kbd>↓</kbd> or <kbd>S</kbd> | HURRY button, or drag down | d-pad down |
| Hard drop | <kbd>Space</kbd> | DROP, or flick down | d-pad up / Y |
| Pause | <kbd>P</kbd> or <kbd>Esc</kbd> | Pause | Start |
| Restart level | <kbd>R</kbd> | Restart, on the pause card | Back / Select |
| Mute | <kbd>M</kbd> | Sound | X / Square |

Holding left or right auto-shifts after a short delay, so you can slide a
capsule across the bottle in one press.

Rotation works as it does in the original: a capsule has two shapes, not four
positions. Horizontal always spans the same two columns and vertical always
sits in the left one of that pair, so rotating never walks the capsule sideways
- rotating twice just swaps the colours where they stand. Music can be turned
off on its own from the title screen; the sound effects stay.

In **versus** the keyboard splits in two, and a gamepad each works as well
(pad one drives player one):

| Action | Player 1 | Player 2 |
| --- | --- | --- |
| Move | <kbd>A</kbd> <kbd>D</kbd> | <kbd>&larr;</kbd> <kbd>&rarr;</kbd> |
| Rotate | <kbd>Q</kbd> / <kbd>W</kbd> | <kbd>,</kbd> / <kbd>.</kbd> |
| Soft drop | <kbd>S</kbd> | <kbd>&darr;</kbd> |
| Hard drop | <kbd>E</kbd> | <kbd>/</kbd> |

Gamepads use the standard layout, so the face buttons are A/B on an Xbox pad
and cross/circle on a PlayStation one. Browsers only hand a page a gamepad
after a button is pressed on it, so give the pad one press before expecting it
to do anything. Restart sits on Back/Select rather than a face button, since it
throws the current run away.

## Apothecary Through Time

The twenty levels run through five eras of medicine, and the bottle in front of
you changes with them: a wax-sealed clay vessel for the cave, an apothecary jar,
a snake-oil bottle, the pill bottle, a cryo-vial. A physician stands beside it -
a shaman, a beaked plague doctor, a moustachioed quack, a white-coated doctor, a
hooded technician - and reacts to what you do. Crossing into a new era brings one
line from that physician's notes, and nothing else; the story layer is five
sentences long on purpose.

The theme is not decoration over the mechanic, it is the mechanic's argument.
Viruses that survive your medicine build resistance and mutate, which is the same
arms race that runs from herb paste to sequenced therapy: the cure stops working,
so you need a new one.

One rule constrains all of it. The three medicine colours keep their exact hues
in every era - only saturation, surface and the glassware around them change. A
sepia palette that made level 2 harder to read than level 20 would be a worse
game however good the screenshot looked, and `test/eras.test.js` fails the build
if an era drifts a hue or washes out below the legible band.

## Suggesting mechanics, challenges and themes

The design workshop lives in [`docs/ideas.md`](docs/ideas.md): the mechanics
under consideration, what they combine with, and the one thing they all have to
survive - no interaction may leave a virus unanswerable.

Ideas go through GitHub, so anyone with an account can add one:
[a mechanic](https://github.com/danielwjohnston/rxdrop/issues/new?template=mechanic.yml),
[a challenge](https://github.com/danielwjohnston/rxdrop/issues/new?template=challenge.yml),
[a theme](https://github.com/danielwjohnston/rxdrop/issues/new?template=theme.yml),
or a
[blank issue](https://github.com/danielwjohnston/rxdrop/issues/new) for the
half-formed ones. (Discussions would suit the half-formed ones better, but it is
off for this repository - Settings, General, Features. Nothing here links to it
until it is on, because a link that 404s is worse than no link.) The forms ask the questions that decide whether an idea is
buildable - chiefly "what does it combine with?" and "how does the player answer
it?".

## Picking it up

The title screen is one sentence, a **Play** button, and two folds. On a first
visit the rules are open and show the one thing the genre assumes you already
know - four of a colour in a row bursts, and a virus counts toward the four -
drawn with the same code that draws the bottle, so the diagram cannot drift from
the game. The controls listed are the ones your device actually has: the on-screen
pad and swipes on a phone, keys on a keyboard, both players' halves in versus.

Everything else - level, speed, resistance, modifiers, drop style, music, the
formulary - is behind **Options**, folded away. That ordering is not a
preference. Two people opened this cold: one could not find the start button at
all on an iPhone, and the other's first reaction was "wtf is this". There were
twelve controls ahead of Play, and the card was taller than the screen it was
clipped inside.

## Rules

- The bottle is 8 columns by 16 rows, with one more row above it for the neck.
  It starts with `4 × (level + 1)` viruses, from 4 at level 0 up to 84 at level
  20. Higher levels stack them closer to the neck.
- Capsules fall in two halves, each one of three colours. Line up **four or
  more** of one colour in a row or column and they are destroyed - viruses
  included.
- Clearing part of a capsule leaves the other half behind, and loose halves
  fall. If they complete another line the chain keeps going, and each extra
  stage in a cascade multiplies the score.
- Each virus in a single clear is worth double the last: at LOW speed one virus
  scores 100, two score 300, three score 700, and so on. MED and HI pay more.
- Gravity gets faster every ten capsules.
- **Hurrying** a capsule holds it at a multiple of the level's own gravity, with
  a floor, so it is always fast enough to save time and never so fast you cannot
  place a last lateral. Pressing it changes a *speed* and never a position: the
  capsule does not move on the press itself, whatever point of the fall you
  press at. There is no snap to the bottom unless you ask for one: **Instant
  drop** is a setting on the title screen, off by default.
- **A rotation never lifts the capsule.** It will lay itself down sideways to
  make room, and a capsule in the neck will drop a row to stand up, but nothing
  turns a capsule upward - so lining one up with a notch and turning it can
  never hop it on top of what you were aiming beside.
- With **resistance** on, a virus that survives long enough turns tolerant: four
  of its own colour clears the medicine but the virus shrugs it off, shedding a
  stack. What kills it is its **collateral colour** - red answers to blue,
  yellow to red, blue to yellow - cleared in a line *beside* it, for double
  score. A tolerant virus draws its aura in the colour that kills it, so the
  rule never has to be memorised.
- Leave a virus capped by the wrong colour long enough and it does not just
  mutate, it **combines**: blue under yellow becomes green. A **hybrid** belongs
  to no run - no capsule is ever dealt in its colour - so four of anything
  passes straight through it. It answers only to its two parent colours, cleared
  *beside* it, and it remembers each one, so you never have to land both at
  once. Land both in the same cascade and the compound synthesises an
  **antibody**: it takes the strain where it stands and the ring of viruses
  around it with it, for four times the score. And a parent delivered twice
  wears the strain back down to an ordinary virus, so a hybrid whose other
  parent is walled off is never a dead end.
- **Run modifiers** are opt-in on the title screen and stack with each other and
  with everything above. Each one bends a rule rather than sitting beside it,
  and each states the bound that keeps it from making a virus unanswerable:

  | Modifier | What it does | Why it is survivable |
  | --- | --- | --- |
  | Outbreak | Viruses replicate into empty cells; gravity halves to pay for it | A virus spreads once and never again, never above the virus ceiling, never past 1.6x the starting population |
  | Phototherapy | The bottle silts up row by row, worst where the disease is; press Shift or L to go to the light chamber, where tetromino-shaped light falls and a completed line lights that row of the patient | The fog plateaus rather than compounding and a row never goes fully black, the lamp always comes back after its cooldown, and a run can be won without ever entering the chamber |
  | Rationing | Only two medicines in stock; viruses of the missing colour build tolerance every capsule while it is gone | The withheld colour rotates on a fixed timer, and tolerance always answers to the older medicine cleared beside it |
  | Contaminated batch | Some capsule halves are inert and belong to no run | An inert half washes out with any clear it is touching |
  | Quarantine | A column is sealed and refuses capsules | Clearing beside it breaks the seal, and it lifts on its own regardless; spawn columns are never sealed |

  The daily challenge draws a seeded pair - none, one or two, with roughly a
  third of days plain - and says on the card which ones it drew. That is what
  stops the daily being the same game at a different level.
- **The formulary** is a notebook that starts blank and fills in as you
  *trigger* interactions, never as you read about them. Eleven discoveries, one
  for every mechanic, and each collects a note per era: find a chain reaction in the
  cave and the shaman writes it up, find one again in the clean room and the
  technician writes it up beside them. A page you have not filled in says
  nothing about itself.
- Clear every virus to finish the level. Filling the bottle to the brim is not
  a loss on its own: capsules are dealt into the neck above it, and you get a
  long fuse to steer one clear. The run ends only once the neck is blocked too,
  which means capsules have genuinely backed up out of the bottle.

## Development

```sh
npm test           # 269 unit tests, no dependencies, well under a second
npm run test:watch # re-run on change

# End-to-end checks in a real browser (Playwright is not a dependency):
npm i --no-save playwright && npx playwright install chromium
npm run test:browser  # 42 checks: menus, controls, versus, daily, offline, mobile

npm run gauntlet   # the full protocol below: every stage, one gate
```

### The UltraGauntlet

`npm run gauntlet` runs thirteen adversarial stages in series - determinism,
hostile clocks, boundaries, fuzzing, resistance, collateral sensitivity, the
hybrid strains, the run modifiers, versus garbage conservation, a bot playtest,
a frame-budget check, and the browser suite - and fails the run if any stage
fails. [docs/ultragauntlet.md](docs/ultragauntlet.md) explains where
it comes from, what each stage attacks, and the defects it has already caught.

### Layout

```
index.html            markup for the bottle, HUD and menus
src/constants.js      board size, colours, speeds, timings
src/rng.js            seedable PRNG - one seed reproduces a whole game
src/board.js          the grid: matching, gravity, cascades, virus layouts
src/pill.js           capsule geometry, rotation with wall kicks, locking
src/game.js           the state machine: lock, clear, cascade, spawn, score
src/light.js          the light chamber: phototherapy, played as falling light
src/modifiers.js      the run modifiers, and the bound each one states
src/formulary.js      the notebook: which interactions you have triggered
src/eras.js           the five eras of medicine, and what each one calls things
src/doctors.js        the physician who signs each era's notes
src/versus.js         two games, garbage routed between them
src/daily.js          the date-seeded daily challenge
src/renderer.js       canvas drawing
src/audio.js          Web Audio synthesis: two chiptune loops and the effects
src/input.js          keyboard, touch, swipe and gamepad
src/main.js           screens, HUD, persistence and the animation loop
test/                 unit tests for the rules, plus randomised soak runs
sw.js                 service worker: precache everything, play offline
manifest.webmanifest  installable app metadata
tools/serve.js        the static server behind `npm start`
tools/browser-check.mjs  end-to-end checks in a real browser
tools/gauntlet.mjs    the UltraGauntlet: thirteen stages, one gate
docs/ultragauntlet.md what the gauntlet is and why each stage exists
docs/direction.md     the creative direction: what the project is becoming
docs/ideas.md         the design workshop: mechanics proposed, shipped and cut
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
