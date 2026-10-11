# The formulary: mechanics under consideration

This is the design workshop for RxDrop. It exists so that ideas - mine, yours,
anyone's - can be argued about against something, rather than piling up as a
list of nice thoughts.

The something they are argued against is the goal below, and behind that
[the creative direction](direction.md) - what the project is trying to become.
This page is the inbox; that one is the north star. Where they disagree, this
page says what is *true* and that one says what we *want*.

**Suggest one:** [mechanic](https://github.com/danielwjohnston/rxdrop/issues/new?template=mechanic.yml)
· [challenge](https://github.com/danielwjohnston/rxdrop/issues/new?template=challenge.yml)
· [theme](https://github.com/danielwjohnston/rxdrop/issues/new?template=theme.yml)
· [something half-formed](https://github.com/danielwjohnston/rxdrop/issues/new)

## The goal these are aimed at

**Recurring but novel.** A small set of rules you can learn, whose
*combinations* you keep discovering. Not a long list of features, and not
randomness: a system with more interactions in it than any one run can show you.

That points at a specific shape:

- **Few axes, many products.** Three virus states times three hybrid colours
  times a handful of run modifiers is a large space built from a small rulebook.
- **Every rule bends an existing one.** A rule that sits beside the others adds
  length. A rule that changes what an existing rule *means* adds depth.
- **Discovery is the content.** If the interactions are the point, the game has
  to notice when you find one - see the Formulary below.

And one constraint that outranks all of it: **nothing may make a virus
unanswerable.** An interaction you cannot beat is not difficulty, it is a
death sentence with extra steps.

## Axis 1 - what a virus can become

The game already has resistance: viruses that survive long enough build it and
mutate to a colour you were not planning for. These extend that same idea rather
than sitting next to it.

### Tolerance, and collateral sensitivity - `shipped`

A virus that survives long enough builds tolerance, and tolerance cuts both
ways:

| Virus state | Its own colour | Its collateral colour |
| --- | --- | --- |
| Susceptible | 4 clears it | nothing - an ordinary clear beside it does nothing |
| Tolerant | 4 clears the medicine, the virus shrugs it off and sheds a stack | 4 cleared **beside** it kills it, and pays double |

This is real: it is called **collateral sensitivity**, and it is why antibiotic
cycling works. Resistance to one drug can *create* vulnerability to another.

The cycle is fixed and learnable - red answers to blue, yellow to red, blue to
yellow - and you never have to memorise it, because a tolerant virus draws its
aura in the colour that now kills it. Because a virus can only ever be part of a
run of its own colour, the collateral clear works by **adjacency**: you build
the older medicine in a line touching the virus rather than through it, which is
a genuinely different play pattern from anything else in the game.

Two answers, so a tolerant virus is never a dead end:

- The collateral colour beside it kills it outright, and pays double.
- Its own colour still wears the tolerance down one stack at a time. Slow, but
  it always works, which is what keeps the contraindication satisfied even on a
  board with no room for a collateral run.

*What it cost:* a clear that does not clear is the most frustrating thing a
puzzle game can do, so the shrug is signposted hard - the medicine visibly
bounces off, a dull thud replaces the clear chime, the physician winces, and the
ring flashes the colour that would have worked. The failure teaches the answer
instead of just denying you.

### Hybrid viruses - `shipped`

Leave a virus capped by the wrong colour too long and it does not just mutate,
it **combines**: blue under yellow long enough becomes green. Three colours give
exactly three hybrids - green, orange, purple - which is a tidy, complete set.

A hybrid cannot be cleared by four of any single colour. A yellow run passing
through a green virus clears the yellow and leaves the virus, flinching. To kill
it you need a **combination clear**: both parent colours clearing within the same
cascade. Yellow matches, a blue half falls into the gap and completes a blue run
- and the compound that makes is what the virus has no answer to.

This is the single best idea on this page and also the most dangerous one. A
virus you cannot clear by ordinary means, buried under a stack, ends the run
through no fault the player can see. Three guardrails, all of them enforced by
the gauntlet rather than by good intentions:

- A hybrid never forms where it cannot be reached. Combining requires two open
  sides to treat from; with fewer, the virus mutates the old way instead.
- **Deliveries persist.** Each parent cleared beside the strain is remembered,
  so the two never have to arrive together. Landing both at once is the skilled
  version, not the only version.
- **One parent alone still wins.** Deliver the same parent twice and the strain
  wears back down to an ordinary virus of that colour, which an ordinary line
  clears. So a hybrid whose other parent is walled off behind a stack is slow,
  never fatal.

*What shipped differently:* the antibody window is a whole **cascade**, not a
single clear. A yellow run goes, blue halves fall into the gap and complete a
blue run, and those two stages count as one compound - which is exactly the play
the paragraph above describes, and would not have been rewarded if the window
had stayed one clear wide.

### Antibodies - `shipped`

The reward for a combination clear: an **antibody** with the hybrid's colour.
It does not need a line. It crosses the bottle and takes the hybrid out where it
stands, and clears the ring around it - the bonus for cleaning up a mess you let
sit too long.

This is the top of the skill ladder. Dr. Mario already rewards cascade
engineering with score; this rewards it with the only answer to the hardest
thing on the board - and pays four times a plain cure for it.

*What the playtest says:* a bot that understands the mechanic well enough to
aim a parent colour at a strain cures roughly a third of the hybrids that form,
and almost never synthesises an antibody, because it almost never cascades on
purpose. That gap between "answerable" and "mastered" is the point of the
mechanic; if the bot started earning antibodies by accident, the reward would be
mistuned.

## Axis 2 - what makes one run different from the next

Modifiers stack with everything above and with each other. The daily challenge
picks a seeded pair, which is what stops the daily from being "the same game at
a different level".

Every one of them carries a **bound**: the sentence saying why it cannot leave a
virus unanswerable. Those sentences live next to the code in `src/modifiers.js`,
they are printed on the picker, and the gauntlet executes them. If you cannot
write that sentence for a new modifier, the modifier is not ready, whatever it
does for variety.

### Outbreak - `shipped`

Viruses replicate into adjacent empty cells on a timer. In exchange, capsules
deal twice as fast. More disease, more medicine - a real trade rather than a
punishment, and it turns the empty space you were saving into a liability.

*What shipped:* capped three ways, because replication compounds and an
uncapped one eats the bottle - a virus spreads once and never again, never above
the level's own virus ceiling, and never past 1.6 times the viruses the level
started with. The trade is gravity halving, floored at the same speed a held
hurry is floored at, so "twice as fast" never becomes "unplaceable".

Take the generation cap out and the gauntlet's playability check goes red: the
bot stops being able to keep up at all.

### Blackout, and light therapy - `cut`, and replaced by Phototherapy below

The bottle goes dark. A light-therapy switch brings it back for a few seconds,
so you are playing and re-lighting at the same time. Clearing a run while the
lights are out is the achievement.

*Design note:* as written, this competes for the same hand that is playing the
game, which is the difference between tense and annoying. Better as a **held
key or a pedal** than a button you must remember to press - the memory load
should be "when do I spend the light", not "did I forget the light". And the
in-the-dark clear should be a badge, never the only way to win.

*What shipped, and what it took two goes to get right.* The light is held -
Shift, or L - and spends a reservoir that refills while the lights are on. The
first version faded the light continuously and refilled it continuously, and
that shape simply cannot produce "mostly lit, briefly dark": a linear system
drifts to one end or the other, and the playtest found it sitting at whichever
end the tuning favoured. Tuned one way the light was free and the modifier was a
nuisance; tuned the other, half the run was unreadable.

So blackouts are **events** instead. The bottle is lit; every fourteen seconds
the lights go out for five. The reservoir refills to roughly full in the gap and
covers about two thirds of one blackout, so every blackout is a question of when
to spend the light, and some of it is always played blind. Two bounds hold it
open: a blackout ends on its own timer whatever the reservoir is doing, and the
bottle never fades past a dim floor - it goes hard to read, never black.

There was a bug worth recording. The reservoir originally oscillated on its own
floor: it emptied, refilled by one frame's worth, powered one more frame of
light, emptied again - so the light was effectively infinite and holding it
forever kept the bottle at full brightness for a whole run. The playtest caught
it as a row of numbers identical to a plain game. The fix is a latch: once
spent, the light will not come on again until the reservoir has climbed back to
a third.

### Phototherapy - `shipped`, and it replaced the blackout above

*The complaint that started this:* "It just goes dark and comes back. I'm
supposed to be treating the patient."

That is correct and it is not a tuning problem. What shipped is **weather**.
The bottle dims on a timer and you hold a key to make it stop dimming; nothing
you do during a blackout is treatment, and the decision it asks for is about the
interface rather than about the patient. The light is a resource you spend, not
a therapy you administer. Two goes at the numbers made it work; neither could
make it *mean* anything, because the shape was wrong from the start.

#### The reframe

**Light is a second medicine, and you have to deliver it.**

Not a switch. A treatment, given inside the same bottle, costing the same things
everything else costs: the board, your hands, and time you do not have.

#### Why the bottle clouds

The fiction in the original note was "gases emitted by the viruses". The real
thing is better and it is sitting right there in the theme: **biofilm.**
Colonies secrete a matrix that both hides them and shields them from what you
are dosing them with, and it is why chronic infections resist treatment long
after the right drug has been chosen. Antimicrobial **photodynamic therapy** is
a genuine line of work against exactly that.

So the bottle does not "go dark". It **silts up**, worst where the disease is
worst - which turns the fog from noise into information. And it explains why the
fog protects them, which the blackout never did.

#### The mechanic

**1. Visibility is per row, not global.** Every row of the bottle has its own
clarity. A row holding viruses clouds faster; a row you have just cleared stays
clear longer. The bottle silts from the colonies outward rather than dimming all
at once.

**2. Light therapy is a mode, not a button.** Toggle it and the bottle becomes
the light chamber. **Tetromino-shaped light falls**, and your controls drive the
light piece instead of the capsule.

**3. A line of light is a DOSE, not a coordinate.** *Revised in play.* The rule
below - a line lights the row it completed on - sounds targeted and is not:
tetromino lines complete at the floor of the well, so a measurement of forty
sessions found 60% of all light landing in the bottom three rows of the bottle
and the top five never lit once. Gravity was choosing the treatment, which is
exactly why the lamp read as a minigame with a pipe attached rather than a
therapy: *"what's the point of playing tetris if it's not meaningful to be a
therapy? otherwise just stick with the pills."*

What ships: a completed line scrubs the film from the **lowest dirty row**,
wherever in the well you made it. The bottle cleans from the bottom up and
seventeen lines sterilise the sample. And the disease is **held** while the lamp
is on - nothing grows, nothing spreads, and the dose in your hand waits where you
left it - so a session costs you progress rather than ground, and you may stay as
long as you keep playing. The original wording is kept below for the record.

**3a. (superseded) A line of light is a row of the patient.** Complete a horizontal line and
*that row is illuminated*. Four lines at once lights a band. The mapping is
one-to-one and literal: what you clear in the light chamber is what you can see
in the bottle. This is the part that makes the whole idea work - light has a
**target**, so "which part of the patient do I need to see" becomes a question
worth answering.

**4. Light does not collide with medicine.** Light pieces fall *through* the
capsule stack - they are photons, not matter - and settle on the floor among
themselves. Light therapy must never make the medicine side harder; it is an
aid, and an aid that sabotages you is a trap.

**5. Unused light dissipates.** ~~A light piece that does not complete a line
fades after a few seconds.~~ *Cut in play.* Built as written and it ate the
player's work: "lights disappear before i get a chance to line up for the
tetris". Light now **stands until a line clears it or you leave**, and a session
can last as long as you keep playing.

What stops the chamber being a safe room turns out not to need a timer. Standing
at the lamp places no capsules and cures no viruses, so the run does not advance
while you are in there - the bottle charges for the time by itself. And the
chamber can still be lost: light no longer clears itself, so pack it to the lip
and it **floods**, which ends the session and hands you back to the bottle. The
lamp then returns after its cooldown, so a flood is a setback and never a loss.

**6. The cost is the dose in your hand.** *Changed during the build.* The design
said the capsule keeps falling, unsteered, while you work the lamp. It was
measured and it was much worse than it sounds: every abandoned capsule lands in
the **spawn column**, so eight visits build a tower in the neck and top the
bottle out. That is not a cost, it is a trap with a delay on it.

What ships instead: going to the lamp **commits the capsule where it stands** -
exactly where a hard drop would have put it - and **holds the next deal** until
you come back. Same triage question, and it rewards the same thing: **is it
worth the placement you are holding to see the bottom of the bottle again?** A
player who plans places the dose first and then goes. A player who panics dumps
it. The shipped blackout asked "did you remember to press the key". This asks a
question about the patient.

**7. It gets dirty again from play, not from a clock.** Each virus fogs its own
row over time. A clear a virus *shrugs off* fogs harder - the colony has just
proved it is shielded. A hybrid fogs hardest of all. So the mechanics already in
the bottle feed the fog, which is the recurring-but-novel property this whole
page is aimed at rather than another rule sitting beside the others.

#### The bounds

Nothing here may make a virus unanswerable, so:

- **The fog never hides the falling capsule or the column it will land in.** You
  can always choose to place blind. The dark costs you information, never the
  ability to act.
- **A row never goes fully black**, and the fog **plateaus** rather than
  compounding toward zero. Ignore light therapy for a whole run and the bottle
  gets hard to read, not unplayable.
- **Light mode always deals a piece and always accepts a line.** There is no
  state where the lamp refuses to work.
- **The lamp rests between sessions and always comes back.** *Added during the
  build*, and the only real abuse the mechanic had: with the fog at its ceiling
  the case for going to the lamp is *always* true, so the playtest bot lived in
  the chamber 95% of the run and placed a fifth of the capsules it otherwise
  would. A lamp you would be a fool to ever leave is a room, not a decision. A
  fixed cooldown makes it a rhythm - work, go, work - and because it is fixed,
  never running at the start of a run, and always expires, the lamp can be made
  to wait and can never be taken away.
- **You can win without ever entering the light chamber.** It is an aid, not a
  gate.

#### What it is worth

The in-the-dark clear stays as a badge, and the formulary gained a page beside
it: **Light, delivered** - made a line in the chamber and lit a row of the
patient with it. Like every other page it is written by the event the game
already emits, so it is evidence that you did it rather than something you read
about.

#### The three forks, shipped as toggles

Three questions changed the feel enough that guessing would have been wrong, and
the answer was that a hand has to decide them, not an argument. All three ship
behind segmented controls in Options (and as `lightWidth`, `lightExit` and
`lightView` on the URL), to be kept, cut or tuned on evidence:

1. **How wide is the light chamber?** The bottle is 8 wide, which is very wide
   for tetrominoes - lines come easily and light is cheap. Narrow (5) makes each
   line worth something. *Measured:* narrow buys ~1.9 rows a visit, full-width
   ~1.3, for the same time spent.
2. **Do you leave when you want, or on a timer?** Leaving when you want is a
   pure trade; a timer is a commitment.
3. **One bottle or two views?** Both at once is the most demanding and the most
   honest - you see what your neglect is costing in real time. Switching the
   view is much easier to read.

#### What the build actually taught

Worth writing down, because none of it was visible from the design:

- **Dumb play wins no lines at all.** The first measurement of reachability used
  a bot that dropped light in a random column; it never completed a line, which
  said nothing about the mechanic. Verifying an aid is reachable needs a player
  who can use it, so `tools/bot.mjs` grew a greedy light planner and the gate
  and the report now ask about the same player.
- **One line a session is a bad exchange rate.** The first tuning had a five-
  piece session buying a single row out of seventeen. Light falls more than
  twice as fast now (`LIGHT_FALL` 520 → 190). The spill that once widened a
  line into its neighbours is **cut**: the respec made one line clear one row -
  the *lowest filmed* row, wherever the line was made - so the exchange rate is
  now flat and legible rather than bonus-shaped (`game.js:scrubFilm`).
- **An unbounded visit is not a visit.** A bot told to leave when the worst row
  was clear never left: with viruses across a dozen rows there is always a row
  re-fogging. Visits are bounded by lines won or time spent, whichever comes
  first.
- **The order of operations was load-bearing.** Committing the capsule before
  opening the chamber deals a fresh capsule into an unsteered bottle, because
  the lock resolves and asks for the next one. The chamber opens *first*, so the
  deal finds the lamp already lit and waits.

*What it cost to build:* `src/light.js` (a second falling-piece controller with
its own seven-bag and its own grid), per-row fog in the model and a clipped
gradient veil in the renderer, input routing at the top of every command, the
three variant axes, six gauntlet checks and a lamp section in the playtest. The
board and renderer were already cleanly separated, so it was a real piece of
work and not a rewrite - the awkward part was that `Game` owned exactly one
falling piece.

### The macro-organism - `proposed`

*The idea:* "A macro organism comprised of reformulated virus proteins and
nanobots that have been corrupted by viruses to have med resistance, and make
the mechwarrior virus possible. Could be a final boss fight?"

Yes, and it is the strongest piece of new content proposed for this game so far.
Not because a boss is novel - puzzle games have done it for thirty years, and
*Panel de Pon*, *Puyo Puyo*, *Puzzle Quest* and *Dr. Mario World* all built
story modes on boss opponents - but because of what this one is **made of**.

#### Why it is earned

Every other idea on this page adds a rule. This one collects a debt.

The spine of RxDrop is a nine-hundred-year arms race: you dose, it survives, it
builds tolerance, it takes the colour of the drug you left on it, it recombines.
The player spends twenty levels teaching the disease. A macro-organism assembled
out of reformulated viral protein and **your own corrupted nanobots** is what
that teaching produces.

The boss is the player's medical history, walking. Nothing else in the game
could carry that meaning, because nothing else has spent twenty levels earning
it - and it lands exactly where the era ladder ends, at the point the direction
document says the vessel should "feel almost computational".

It also fills a real structural gap. The ladder currently runs 0-20 and then
stops. There is no destination.

#### The shape, built only from what exists

The discipline this page is held to is that a mechanic must change the meaning
of an existing mechanic rather than sit beside it. A boss is where puzzle games
usually stop being themselves, so the test here is strict: **if it needs a new
verb, it is the wrong design.** Everything below is an arrangement of rules the
player already knows.

**1. The first thing in the bottle that is not one cell.** Everything to date is
1x1. A contiguous multi-cell body is genuinely new *shape* without being a new
system, and it makes the bottle's geometry the puzzle in a way nothing else has.

**2. Plated, with a core.** The outer segments answer to ordinary colours and
clear like anything else. The core is hybrid-coloured and needs both parents in
one breath - combination therapy, the hardest thing the game already teaches,
as the final exam.

**3. Resistance on a visible clock.** Its tolerance rotates through the colours
on a cycle you can read, so you time doses to it. That is collateral sensitivity
turned into rhythm - and it is the same shape as the sonotherapy proposal above,
which is a point in favour of building that first.

**4. It regenerates.** Cleared plating grows back unless pressure is kept up, so
it is a race against your own placement speed rather than a puzzle that can be
solved slowly. This is the part that makes it a *fight*.

**5. It films hard.** It generates biofilm fast enough that phototherapy stops
being optional, which finally gives the lamp a reason to exist at the climax and
pays off the whole light system at the moment it matters most.

**6. It eats your bad batches.** Inert halves from the contaminated batch are its
raw material: dump one carelessly near it and you have fed it. That takes the
game's most annoying piece and makes it frightening, which is the best thing a
boss can do to an existing mechanic.

#### The bound

The constraint that outranks everything on this page: **nothing may make a virus
unanswerable.** For a multi-cell organism that becomes:

> At every moment, at least one segment is answerable by a colour currently in
> the deal - and the core is always reachable once the plating over it is gone.

Enforced by sweep across seeds, levels and modifier combinations, not by
intention. Regeneration must never outrun the fastest legal placement rate, or
the fight is a wall rather than a race.

#### What is deliberately not decided

- **Where it sits.** A twenty-first level, an endless-mode finale, or a rare
  event on the ladder. Each makes it a different kind of thing.
- **Whether it is the only one.** One final boss, or a boss per era that gets
  harder as medicine improves - the second is far more work and would make the
  era ladder a campaign rather than a backdrop.
- **What beating it means.** The formulary is the obvious home for the payoff:
  the last page, written in the voice of whichever era finally managed it.

*What it would cost to build:* multi-cell entities in `board.js` (the single
largest assumption in the codebase is that a cell is a cell), regeneration and
a rotation clock in `game.js`, a renderer that can draw a body rather than a
grid of dots, and a gauntlet stage of its own for the bound above. This is the
biggest thing on the page and should not start until sonotherapy's transport
question is settled, because the rotation clock wants the same beat.

### Heat, and over-treatment - `workshop`

*The idea, offered tentatively:* "Light makes heat. Maybe doing multiple
concurrent 17-row full tetris clears, like twice full bottle amounts, makes the
bottle glow and the viruses get the ability to make more film neutralised - or
maybe it lightly irradiates the viruses and makes them mutate. I'm not sure if
positive or negative, or maybe find differing scenarios depending on era,
scenario, virus type, difficulty level - not crazy behaviour swings, but
differences that actually have weight."

Filed at `workshop` rather than `proposed` because the author is not confident
in it and neither is this page. What follows is the argument for why it is worth
keeping, and the one thing that would have to be true.

#### What it is reaching for

The lamp currently has a floor and no ceiling. You clean the sample and stop;
there is nothing above "clean". Heat gives the mechanic a second half - a reason
to keep going past sterile, and a reason not to.

That shape is good. **Over-treatment is real medicine**, and it is the honest
counterpart to everything else in this game: the whole theme is that doing the
right thing badly - underdosing - teaches the disease. Doing the right thing
*too much* having a different cost is the same lesson from the other side, and
no mechanic in the game currently says it.

#### The fork the author already spotted

Positive or negative? Both are defensible and they are different games:

- **Neutralising** (heat suppresses film production for a spell) makes heat a
  reward for excellence, and the lamp a thing you master rather than survive.
- **Irradiating** (heat mutates the colonies) makes it a genuine risk, and turns
  the lamp into a tool that can hurt the patient - which is much more interesting
  thematically and much more likely to feel unfair.

The instinct to vary it by era, strain and difficulty is right, and the caveat
attached to it is the important half: *differences that have weight, not crazy
behaviour swings.* A mechanic whose sign flips unpredictably is not depth, it is
noise. If it varies, the variation has to be **legible before you commit** -
the era tells you, or the strain does, and the player can read it.

#### What would have to be true

- **The player can see it coming.** A heat gauge, or the bottle visibly glowing,
  before anything happens. A consequence that arrives unannounced from doing well
  is the worst outcome available here.
- **It cannot make a virus unanswerable.** A heat-driven mutation must land
  inside the existing hybrid rules, which already guarantee both parents cure it.
- **It is never mandatory.** Same bound as the rest of phototherapy: a run must
  be winnable without ever reaching it.
- **Twice the bottle is the right threshold, roughly.** Thirty-four lines is a
  long session and a real achievement. Cheap heat would be noise.

#### The reason to wait

Phototherapy has been rebuilt twice on play evidence, and both rebuilds came from
someone holding a controller rather than reading a spec. Heat should be tuned
against a version of the lamp that people have actually played for a while. It
is the right idea at the wrong time, which is what `workshop` means here.

### The October ward - seasonal pathogens - `workshop`

*The idea, from the author:* "seasonal halloween ghost / undead / vampire /
zombie viruses" - workshop the design cues and the mechanics.

Filed at `workshop`. The costume half is cheap and safe; the mechanic half is
four candidates, each of which bends one rule the game already has, and each
of which needs its bound falsified in the gauntlet before it is `proposed`.

#### What it is reaching for

Every mechanic above changes what a virus *is*. A season should do the same
thing with a wink: the same three colours, the same bottle, but for one week
the pathogens are the monsters people already know the rules of. That is the
design cue - **the player already knows what a ghost does.** Do not explain it;
let the folklore be the tutorial, and pick the folklore rule that maps onto a
rule the game has.

#### The four, each mapped onto an existing rule

| Monster | Folklore rule | Game rule it bends | The bound |
| --- | --- | --- | --- |
| **Ghost** | passes through walls | *Placement.* On alternate turns the ghost is intangible: a capsule falls **through** it and lands below. On solid turns it matches and clears as normal. | Phase is period-2 and shown (translucent vs. solid), so it is solid every other capsule; a ghost is never intangible two turns running. |
| **Zombie** | bites, spreads | *Clearing.* When a zombie is cleared, one orthogonally adjacent capsule half of the *same colour* becomes a zombie virus. | At most one bite per clear, same colour only, never into the top two rows or the neck. A bite that has no same-colour neighbour does nothing. It rides the outbreak rule, so `virusesLeft` stays honest. |
| **Vampire** | dies in light, strong in dark | *Phototherapy.* A vampire ignores matching while unlit; a light row that touches it kills it outright. | The lamp already exists and is already bounded; a vampire is answerable by exactly the resource the era hands you, and it becomes an ordinary virus once lit. Cap: two vampires per bottle. |
| **Revenant** (undead) | comes back once | *Clear-permanence.* A cleared revenant returns one turn later, one cell lower, as an ordinary virus - unless it was cleared in a line of five or more. | One return only, telegraphed (the cell stays marked for the turn between), and it drops one row, so it is never further from the player than it was. |

Two of these are the strongest and should go first: **ghost** (a new
placement rule, pure `board.js`) and **vampire** (it makes the lamp mean
something new, which is the depth test this page applies to everything).
Zombie is an outbreak reskin with a twist; revenant is the weakest, because
"clear it again" is length, not depth.

#### Design cues

- **It is a modifier pair, not a mode.** During 24 Oct - 1 Nov the daily picks
  one monster plus one ordinary modifier, the way it picks any pair. Outside
  the window the monsters sit in the picker under "October ward" once seen.
  Nothing else changes, so nothing else needs re-verifying.
- **The era does the costume, not new sprites per colour.** Each monster is a
  *state* overlay on the three colours (a sheet of 4 monsters x 3 colours, the
  same states the renderer already draws: idle, agitated, shrug, dying), not a
  sixth virus family. Hybrids get a jack-o'-lantern face; the colours stay.
- **The apothecary era is the host.** The plague doctor already reads as
  Halloween. Lean in: the era note during the window is his; the bottle glass
  goes violet-grey, the neck row grows a cobweb, the lamp becomes a candle.
- **A holy practitioner for the week** (author's addition). Before germ theory
  the healer and the priest were often one person: the druid, the exorcist, the
  hedge-witch, the monk with the herbal. During the window the portrait swaps
  to a seasonal holy healer - one sprite set in the same ligne claire, four
  poses - and it is the right foil for the monsters, because the folklore
  already says what answers a vampire or a revenant. Keep it a costume: the
  `doctor` id on the era does not change, so saved Formulary notes survive.
- **Sound:** minor-key variant of the era track on the existing scheduler -
  one tempo, one mode change, no new engine work.
- **The Formulary notices it.** Four entries in "the October notebook", so the
  week leaves something behind when it ends.

#### What must be true first

1. Ghost intangibility interacts with gravity and with the lamp's "light stands
   until you clear it" rule. Both need a falsified check before anything else.
2. Zombie + outbreak in the same bottle must not compound past the outbreak
   cap. One shared cap, not two.
3. Vampire + phototherapy off (an era before the lamp) is a contradiction: the
   modifier must refuse to pair with a lampless era, the way quarantine refuses
   pairs today.

#### Rejected

- **A separate Halloween rule set.** Doubles the gauntlet for one week a year.
- **Gore or body horror.** The game's register is a wink, not a shock; the
  monsters are the friendly kind on the mascot sheets, or they are not in.
- **A werewolf.** The only mapping is "changes on a timer", which is
  resistance, which is already in.
### Sonotherapy - `proposed`

*The idea:* "Sonic therapy, and the gameplay could be beat matching like Tap Tap
Revolution or DDR. Falling things and you gotta do the sonics in the right
sequence to destabilise them enough for treatment. Like they have cell membranes
that have to be sonically broken."

This is the strongest proposal on the page, and not because rhythm is fun. It is
the strongest because of **where it plugs in**. Every other idea here changes one
or two things. This one changes *all of them*, and it does it by giving the
soundtrack - which is currently atmosphere - a job.

#### The medicine is real, and it is the sibling of the one already built

**Sonodynamic therapy** is the acoustic twin of the photodynamic therapy the
bottle already runs on. Low-frequency ultrasound permeabilises bacterial
membranes and drives antibiotics through them - the **bioacoustic effect** - and
it is studied against exactly the biofilm phototherapy was built to cut. PDT and
SDT are genuinely paired modalities in the literature.

So the two therapies are not two flavours of "special move". They do different
work on different parts of the problem:

| | Targets | Restores |
| --- | --- | --- |
| **Medicine** | the organism | - |
| **Phototherapy** | the biofilm hiding it | **information** - you can see |
| **Sonotherapy** | the membrane protecting it | **efficacy** - the drug binds |

That table is the whole design. Light tells you where the disease is.
Sound makes the disease answerable. Medicine finishes it.

*On the name:* "sonic" is somebody else's blue hedgehog. **Sonotherapy** is the
real word, parallels Phototherapy exactly, and the player-facing verb can just be
**resonate**.

#### The shape: a layer, not a chamber

The obvious build is a second chamber - enter it, tap lanes, leave. That would be
wrong, and the reason is worth stating because it is the same mistake the
blackout made.

Phototherapy already owns "stop playing the bottle and go play a second puzzle".
Building sonotherapy the same way gives the game two mechanics with one shape,
and the second one will feel like the first one wearing a hat.

**Sonotherapy is the opposite shape: it never takes your hands off the capsule.**
The beat is always running - the music is already there - and what sonotherapy
adds is that *the timing of what you were already doing now means something.*

- A capsule that **locks on the beat** sonicates the row it landed in.
- A rotation on the beat counts. A hurry released on the beat counts.
- Miss the beat and nothing happens. It was just a capsule, which is what it is
  today.

You are not interrupted, you are *graded*. Phototherapy costs you the dose in
your hand. Sonotherapy costs you nothing but demands everything, which is a
completely different feeling and the reason to have both.

#### The sequence

"The right sequence" is the part that makes this a game rather than a metronome.

Each strain has a **resonant frequency** - the three medicine colours are three
tones - and breaking a membrane takes a **phrase**, not a hit: four or eight
beats, shown approaching a hit line, in the era's own musical language. The
phrase tells you which strain you are tuned to. Play it clean and that strain
**resonates**: its membrane goes, and everything in the section listening to that
frequency is suddenly treatable.

Which means the era soundtrack stops being decoration and becomes **the
interface**. The prehistoric phrase is heavy toms on a modal drone. The genomic
phrase is a sequenced arpeggio. Same mechanic, and the player learns ten
musical dialects because each era is a control scheme.

That is the strongest argument on this page for building out the music-per-period
system: it would no longer be paint.

#### What it does to every system already in the bottle

This is the test from the top of the page - does it *combine* - and it passes it
harder than anything here:

- **Tolerance** gets its second answer. Today a virus that shrugs off its colour
  answers only to the older medicine cleared beside it. Sonicate it and the
  shield is stripped: it answers to its own colour again. Two routes to the same
  cure with different costs, which is what a formulary is for.
- **Hybrids** come apart. A hybrid needs both parents in one breath. A resonated
  hybrid separates into halves you can treat singly - the hardest thing in the
  game gets a skill-priced escape hatch.
- **Biofilm damps sound.** A fogged row *cannot* be sonicated. Light first, then
  sound, then the drug. A three-step protocol with a required **ordering**, which
  is a genuinely new kind of puzzle for this bottle and the best single
  interaction in the proposal.
- **Outbreak gets a clock you can hear.** Replication lands on the downbeat. The
  bar is now a threat timer, and a player who can count knows when the next one
  is coming.
- **Rationing gets a verb.** While a colour is out of stock you currently wait.
  Instead you spend the spell resonating the strain you cannot dose, so it is
  ready the moment stock returns.
- **Quarantine stops being a dead zone.** A seal blocks matter. Sound goes
  through it. You can treat into quarantine even while you cannot place into it.
- **The contaminated batch is redeemed.** An inert half carries no drug - but it
  carries vibration perfectly well. The worst piece in the game becomes the best
  drumstick, which is exactly the kind of reversal this page is for.
- **Antibodies** already fire on a cascade of both parents. On the downbeat, the
  ring travels further.
- **The virus theatre keeps the beat.** The mascots are the metronome - they bob
  on it, flinch on a hit, and mock you when you drift. That solves the
  accessibility requirement below with the thing the art direction already wants.

#### The bounds

Every modifier here states why it cannot leave a virus unanswerable. This one
needs more than usual, because rhythm is the most exclusionary mechanic in games:

- **A run can be won without ever hitting a beat.** Every virus keeps its
  existing answer - its own colour, or the older medicine beside it. Sonotherapy
  is a second route, never a gate. Same bound phototherapy states.
- **A miss is a non-event, never a penalty.** Nothing gets harder for being
  off-beat. The moment a missed beat *costs* something, the mechanic becomes a
  tax on players who cannot hear it, and the fun of the whole thing is upside
  only.
- **The beat is always on at least two channels.** Audible *and* visible, so it
  is playable with the sound off and playable without watching for it. Haptics,
  where they exist, are a third - never the only one.
- **Latency is calibrated, not assumed.** Bluetooth headphones run 150-300ms
  behind. Without an offset calibration this mechanic is broken for a large
  fraction of players and they will read it as the game being wrong. A
  calibration screen is not polish here, it is a bound.
- **The timing window is a setting**, with a wide option, and the wide option is
  not a lesser mode.
- **Sound never makes a virus harder to reach**, and never adds resistance.

#### Forks

1. **Layer or chamber?** Recommended: layer, for the reason above. A chamber
   would duplicate phototherapy's shape. If playtesting says the layer is too
   subtle to notice, the fallback is a chamber - but try the layer first.
2. **Dedicated tap, or reuse the lock?** A dedicated key is unmissable and
   teaches itself; reusing the capsule lock is far more elegant and means the
   rhythm is never a second thing to do. Ship both behind a toggle, like the
   phototherapy variants, and decide with a hand.
3. **Does the beat drive the game's other clocks?** Quantising gravity to the bar
   would make RxDrop a rhythm game outright. That is a bigger swing than this
   entry is proposing and should be argued for separately - but it is the
   interesting version, and worth a prototype before it is dismissed.
4. **How much does a phrase buy?** One strain in one row, or every virus of that
   colour in the band? Cheap and frequent, or rare and enormous.

#### Haptics, honestly

`navigator.vibrate()` works on Android Chrome. Gamepads can rumble through
`vibrationActuator.playEffect('dual-rumble', ...)` in Chromium browsers. **iOS
Safari has no web vibration API at all**, and neither does anything else on iOS,
because every iOS browser is Safari underneath - which covers at least one of the
people currently playtesting this game. So haptics ship as a third channel that
makes a good thing better, and the mechanic has to be complete without them.

#### What it would cost to build, without flattering it

More than phototherapy, and the expensive part is not the gameplay:

- ~~**A transport.**~~ *`shipped` 14 September 2026 - `src/transport.js`.*
  This entry twice claimed the audio engine had no transport. That was wrong
  both times: `src/audio.js:387-404` already ran the textbook look-ahead
  scheduler. The audit narrowed the real gap to the beat *position* being
  private and the clock not being injectable - and that gap is now closed.
  `Transport` exposes `beatAt()`, `position()` (beat index and bar position),
  `beatWindow()` and `timeOfBeat()`, and takes a `clock` at construction so
  tests and the bot drive a virtual one. See `docs/transport.md`.
  **Sonotherapy no longer waits on audio infrastructure.**
- **Music as data.** Eras would each need a score - a timeline the transport
  reads - rather than imperative loops. That is the same refactor the
  ten-era music direction needs anyway, so it gets paid for twice.
- **Input timestamps at the event, not the frame.** A 60Hz frame is 16ms of slop,
  which is most of a tight timing window. Hits have to be judged against
  `event.timeStamp`, mapped into audio time.
- **A determinism problem that has to be designed in, not retrofitted.** Stage 2
  of the gauntlet is "a seed reproduces a game exactly", and wall-clock audio
  time is not reproducible. The answer is that the *score* is seeded and the
  player's hits are inputs like any other - but it means the beat clock must be
  **injectable**, so tests and the bot can run on a virtual transport. That
  injectable clock now exists (`Transport({ clock })`), so the design-in has
  been paid for; what remains is the decision about seeding the *score*.

The bottle, the board and the renderer are already separated enough that the
gameplay side is tractable, and the audio engine now has its clock. What is left
here is score-as-data and input timestamping, not infrastructure.

### Rationing - `shipped`

For a stretch, only two of the three colours are dealt. Every board state that
needed the third one has to wait, and the stack you build in the meantime is the
cost.

*The bound:* the withheld colour rotates on a fixed timer rather than being
re-rolled, so the wait is always bounded and always predictable - "three more
capsules and it is back", not "the game is withholding it". Rationing draws from
the same shuffled bag and passes over the missing colour, so the other two keep
the bag's even spread instead of degenerating into a coin flip.

*What the playtest caught, after this shipped.* As first built, rationing was a
**relief**. Two colours make runs easier to build, and that outweighed the wait
by every measure the bot took: longer runs, more clears, more viruses killed per
capsule, and the only setup that ever finished a level. A modifier that makes
the bottle easier while claiming to make it harder is a defect, not a
preference.

The fix is the thing the theme was pointing at the whole time: **a stock-out
drives resistance.** While a medicine is out of stock, viruses of that colour
build tolerance every capsule - the disease you cannot reach is the disease that
gets worse - and rationing therefore brings tolerance with it whether or not
resistance is switched on. It reuses a rule the game already has rather than
adding one, and it converts "clearing is easier" into "the thing you cannot
reach is getting worse".

Be honest about what that produces: rationing is now the **slow grind**, not the
deadly one. Runs last two to three times longer and finish more levels; each
virus simply costs more capsules. That is a distinct texture rather than a
difficulty setting, and the gauntlet holds it to the one claim that matters -
viruses killed per capsule has to be *worse* than a plain bottle. Take the
tolerance rule back out and that check goes red.

*A second thing the check caught about itself:* the first version measured over
a frame budget too small for a rationed run to end. Rationed games last far
longer, so the budget truncated them mid-run and the comparison inverted - the
check reported rationing as easier when it was not, for a reason that had
nothing to do with the game.

### Contaminated batch - `shipped`

Some capsules are inert - they stack, they fall, they clear nothing. Dumping
them somewhere harmless is a skill of its own, and it is exactly what a bad
supply chain feels like.

*The bound:* an inert half washes out with any clear it is touching. Without
that they accumulate until the bottle fills however well it is played, which
would make a bad batch a slow death sentence rather than a problem. With it,
"somewhere harmless" and "somewhere you plan to clear" become the same
judgement - which is the version of the decision worth having.

### Quarantine - `shipped`

A column is sealed off and refuses capsules until you clear beside it. The
bottle gets narrower, and the shape of the board becomes the puzzle.

*The bound:* a seal lifts on its own after ten capsules whatever you do, and
never takes a spawn column. And it blocks *placement only* - gravity, matching
and clearing all still see straight through it, so a run that passes through a
sealed column still clears and whatever was in there before the seal is still
in play. A sealed column is a narrower bottle, not a frozen one.

## Axis 3 - noticing what you found

### The Formulary - `shipped`

A notebook that starts blank and fills in as you *trigger* interactions - not as
you read about them. First tolerant virus, first hybrid, first antibody, first
in-the-dark clear, first outbreak survived. Each entry is written in the voice
of the era you were in when you found it, so the same discovery reads
differently in the cave and in the clean room.

This is what turns "there are interactions" into "I am finding the
interactions", and it costs almost nothing: a set of flags, a line of copy each.

*What shipped, and one change that made it better.* Eleven discoveries, one for
every tracked interaction in the notebook, and each one collects a note **per
era** rather than a single note from wherever you happened to find it. Find a
chain reaction in the cave and the shaman writes it up; find one again in the
clean room and the technician writes it up beside them. So the notebook
accumulates observations of one phenomenon across ten eras of medicine, which is
what a case book actually looks like - and it gives every one of those lines a reason to exist
rather than forty-five of them being unreachable.

A page you have not filled in says **nothing about itself**. It reads "Not yet
observed" and no more. A notebook that lists what you have not done yet is a
checklist, and a checklist is the opposite of finding something.

The gauntlet gates the thing that would otherwise rot silently: it plays the
whole formulary at once with the real bot and fails if any discovery is one that
playing can never trigger. Half the runs work the light and half never touch it,
because a bot that always spends the light can never clear a run in the dark -
which is a fact about the bot, not about the game.

### The pharmacopoeia - period sources for the Plague Years - `workshop`

*The idea, from the author:* "anything useful to pull from these
https://github.com/topics/medical-history ?" The one useful answer on that
topic page was `Shannon-Goddard/pharmacopeia-extemporanea-archive`, an online
archive of 977 eighteenth-century medicinal recipes searchable by ailment,
ingredient and preparation. Then: "yes, add the pharmacopoeia idea to
ideas.md."

The idea is to use that archive as an **index** into the three period sources
behind it: two printed books and a manuscript, which it took from a modern web
transcription. The aim is that the Plague Years speak in words physicians of
the period actually wrote. Nothing in the archive is copied: not its data, its
tags or its transcriptions.

Filed at `workshop` rather than `proposed`. The licence question is answered,
and the two printed books have clean public-domain scans. Five things are not
yet done:

- the check that holds the line, which has not been written;
- a page-image reading of every quotation;
- three decisions the sources raise: the place, the date, and the beak's
  herbs.

Nothing here touches a rule, so every check it needs is a unit test in
`npm test`.

#### What it is reaching for

[practitioners.md](practitioners.md) dates the Plague Years costume: de Lorme
1619, Rome 1656, Marseille 1720. That file cites nothing, though, and the de
Lorme attribution is contested. The words have even less footing. "Receipt",
"the college", "physic", the watchman's cross, and the rosemary and clove in
the beak are all plausible, but nothing in the repository ties any of them to
a text. This idea gives the words a source and a page, and it would be fair to
give the costume the same treatment.

It is **a voice, not a mechanic.** It lives in the slots the era already has:
one era note, one subtitle, and the eleven `plague` notes in the Formulary. It
rewrites what is in those slots and never adds one. The era notes are ten
sentences long on purpose (README), and the Formulary has exactly one slot per
era per discovery. A mechanic built on remedies is a separate entry,
**Compounding**, which carries its own bound.

It also fits the theme better than invented colour can, because the sources
argue about this game's own subject. Both fall inside the era's dates:

- **Fuller, 1710**, defends the many-ingredient antidote: "I would not have
  this most noble Antidote thought the worse of, because its jumbled up of
  such a vast number of Ingredients" (p. 368, read against the page image).
- **Buchan, 1784**, calls such compounds "those amazing farragos which have so
  long disgraced the medical art".

Inside one era, the trusted cure becomes the discredited one. That is the arms
race the game rests on, in the words of two physicians seventy-odd years apart.

Fuller also says something the game says. His alexipharmacks are "generous",
and in a malignant fever they "sometimes snatch the Sick out of the very Jaws
of Death". In "the small Pox, Measles, and all those Inflammatory Fevers that
partake of Malignity" they "are to be look'd upon as no better than Poisons".
So in 1710 the right medicine for one fever is the wrong one for the next.

One overlap to respect. The Apothecary's era note already says "The theriac has
sixty ingredients. I could not tell you which one works." That joke belongs to
that era. The Plague Years should take the *argument* (the antidote defended,
then mocked) and not repeat the joke.

#### What the books offer

These are candidates only. Each must be checked against its page image before
it goes anywhere.

- **Fuller:**
  - the "Antiloimic Decoction", an anti-plague remedy (Decoctions, pp. 48-49,
    per OCR);
  - the "Alexipharmac Powder", "a Champion against malignant and pestilential
    Fevers, for it encourageth the Spirits, and drives out the Enemy";
  - Epidemial Water, Treacle Water, Diascordium, Venice Treacle, Mithridate,
    Water of Snails, Glyster, Cataplasm;
  - his form names, to be read from the scan in original spelling: Cawdle,
    Electuary, Julep, Lohoch, Ptisan and others. The archive's list of them is
    the transcriber's index, and it modernises "Cawdle" to "Caudle".
  - His preface uses "Receipts" and "Physic", which gives those two words a
    source.
- **Buchan, "Of Infection":**
  - Those who wait on the sick "should stuff their noses with tobacco, or some
    other strong smelling herb, as rue, tansy, or the like ... sprinkle the
    room where he lies with vinegar". That gives the `tolerance` note's vinegar
    a source.
  - The putrid-fever chapter names "rue, tansy, rosemary, wormwood" to be
    smelled by those near the patient.
  - Also: "Some attention indeed is generally paid to the plague; but other
    diseases pass unregarded."
- **Buchan, the balsam of many names:** "The Commander's Balsam, Persian
  Balsam, Balsam of Berne, Wade's Balsam, Friar's Balsam, Jesuit's Drops,
  Turlington's Drops". He says it "does not deserve the extravagant encomiums
  which have been bestowed on it". This is a bridge to the patent-medicine era
  that follows.

#### The bound: the archive is an index, never a source

The archive's `LICENSE.md` is byte-identical on `main`, `master` and the
`v1.0.0` tag. It reads: "This work is licensed under the Creative Commons
Attribution-NonCommercial-ShareAlike 4.0 International License." It applies
that licence to "the digitization, structuring, annotation, and tooling". It
also says the original texts are "in the public domain due to their age".

Copying from it into an MIT project fails on the licence's own text:

- **NonCommercial.** RxDrop could not offer that material under MIT at all. It
  would have to ship under NC-SA terms, and the commercial use MIT invites
  would breach them.
- **ShareAlike.** Adaptations must be released under BY-NC-SA, or a licence
  compatible with it. MIT is neither.
- **Section 4.** Where database rights apply, as they do in the EU and UK,
  extracting "all or a substantial portion" of the database is allowed for
  "NonCommercial purposes only".

The problem runs two layers deep. The archive's transcriptions were scraped
from pascalbonenfant.com, whose pages read "© Stephen Hart 2026" and carry no
licence. Nothing found says Hart permitted relicensing.

Separately, the same licensor's Zenodo record (DOI 10.5281/zenodo.20576814)
lists `cc-by-4.0`, while the deposited files say BY-NC-SA. Conflicting
statements are not a permission to rely on, and Hart's layer sits under both.

This is a reading of the licence text, not legal advice. Where
"insubstantial" ends depends on jurisdiction.

**What may be taken:**

- What reading the archive privately tells you: which recipe exists, in which
  book, and for which complaint. Reading needs no licence.
- Wording and facts from a public-domain scan of the book itself (below), read
  at the page image and cited by edition and page.
- A handful of recipe titles, checked against the scan and kept in the
  original spelling. A handful, not a list.
- Original period-voice lines written here, informed by what was found.
- A credit to the archive in docs as a research aid. This entry is that credit.

**What must not be taken:**

- Anything from the archive's `data/` (the recipe and ingredient CSV and JSON
  files), including any subset. That holds everywhere in the repository, test
  fixtures and reference traces included.
- The 89-category ailment taxonomy or its assignments, the parsed ingredients,
  or the metric conversions.
- The `instructions`, `notes` and `full_text` transcriptions, **even where they
  look like the original wording**. They are Hart's digitisation, claimed
  under the archive's licence. Take the words from a scan instead.
- Any of the archive's code or site.
- Its selection or arrangement in bulk, even of bare facts.
- Anything at runtime: no fetch, and no entry in `sw.js`.
- Its bibliographic labels as fact. See Buchan, below.

**The check.** Unit tests beside the notes they guard, in
`test/formulary.test.js` and `test/eras.test.js`. Sources are data stored
beside the text, never inside it. A discovery gets `sources: { plague: {...} }`
next to `notes`, because `src/main.js` renders `notes[era]` as plain text. The
era entry gets `note.source`. Each source is `{ author, title, year, edition,
ref }`. The check covers the `plague` era only, and has four rules:

1. **A trigger needs a source.** A note needs a source if it contains a
   quotation mark or a term from `PERIOD_TERMS`. The starting list is
   `receipt`, `college`, `physic`, `pest` and `cross`. Every source must also
   be attached to a note. On today's text, rule 1 fails on seven `plague`
   notes: `collateral`, `hybrid`, `cure`, `antibody`, `phototherapy`, `washed`
   and `seal`. The source pass cites or rewords each one. That first red run
   is the check's first falsification.
2. **The date is in the era.** `year` is an integer inside the era's band,
   parsed from `era.period`: 1619 to 1799. Because the band ends before 1800,
   any cited edition is long out of copyright.
3. **The scan is known and clean.**
   - *Allowlist:* `ref` must be one of the scans listed in the test itself,
     each with its rights statement. `practitioners.md` mirrors that list for
     readers, but the gate does not parse `docs/`.
   - *Denylist:* `ref` must not contain `github.com`, `githubusercontent`,
     `github.io`, `zenodo`, `pharmacopeia-extemporanea-archive`,
     `pascalbonenfant` or `americanrevolution`.
4. **No trace of the archive in the source.** No file under `src/` contains
   `pharmacopeia-extemporanea-archive` or `pascalbonenfant`.

Falsify each rule with a case that trips only that rule:

| Rule | Falsifying case |
| --- | --- |
| 1 | A quoted Fuller phrase with no source |
| 2 | A year of 1810 |
| 3, allowlist | A plain `ref` that is not on the list, such as another archive.org identifier |
| 3, denylist | A `ref` pointing at a pascalbonenfant page |
| 4 | The archive's name in a plain comment in `src/eras.js`, with no `ref` |

Watch each fail, revert, and say so in the commit message.

To be frank about the gap: the check cannot see a borrowed word nobody put on
the list, so review still has to catch those. What it makes impossible is a
shipped citation that points at the archive, at a modern transcription, or at
a date outside the era. Whether the notebook ever shows a citation to the
player is not decided, and the check works either way.

Two smaller bounds ride along. Neither is enforced today, so both need checks
written:

- **It adds no text.**
  - Pin `DISCOVERY_IDS` to today's eleven ids.
  - Cap each `plague` note at 120 characters. The longest today is 105.
  - Cap the plague era note at 150 characters. It is 132 today.
  - Falsify with a twelfth discovery, and with a third sentence in one note.
- **No note gives a dose.** Period receipts are full of opium, mercury and
  antimony. Use names and voice only.
  - The `plague` notes must match no number-and-unit pattern. Numbers count as
    digits or spelled numerals ("one" to "twenty", "half"). Units count as
    grain, `gr.`, scruple, drachm, dram, ounce, or the apothecary signs ℈, ʒ
    and ℥.
  - Falsify with "ten grains of".

The bound every mechanic carries also holds, by construction. `formulary.js` is
"a reader of the game, never a participant in it", so nothing here can make a
virus unanswerable.

#### The sources, and where to read them free

| Work | Edition to cite | Free scan | Rights |
| --- | --- | --- | --- |
| Thomas Fuller, M.D. (1654-1734), *Pharmacopoeia Extemporanea: or, a Body of Prescripts* | London: Benj. Walford, 1710 (ESTC T120387) | [Wellcome](https://wellcomecollection.org/works/yncqc3km); the same scan with OCR at the [Internet Archive](https://archive.org/details/b30508630) | Public Domain Mark 1.0 |
| William Buchan, M.D. (1729-1805), *Domestic Medicine* | London, 1784, 8th edition | [Wellcome](https://wellcomecollection.org/works/y8t5vd94); [Internet Archive](https://archive.org/details/b28764377) | Public Domain Mark 1.0 |
| The "Rev. William Twigge, Notebook" | None. It is an unpublished manuscript | None found | Director's written consent required on its face (National Archives Act 1986, s.17), plus a fee |

**Fuller**

- This is not the seventeenth-century churchman of the same name.
- The 1710 book is Fuller's own English version of his Latin work, which was
  first published in 1701 and reached a 4th Latin edition by 1708. The English
  title page says "With large Additions and Emendations". His preface says he
  wrote it in English to forestall pirated translations.
- Which copy the archive's upstream transcribed is unverified, so cite the
  Wellcome 1710 scan by page.
- Also free on Wellcome: the English 2nd edition, 1714
  ([Wellcome](https://wellcomecollection.org/works/d4egjhqx)), and the Latin
  first edition, 1701
  ([Wellcome](https://wellcomecollection.org/works/n4g38n4y)).

**Buchan**

- The archive labels its source "1785 (2nd ed.)". That conflicts with the
  record:
  - The first edition is Edinburgh, 1769
    ([Wellcome](https://wellcomecollection.org/works/f662mavr)).
  - The second edition is London, 1772.
  - No English 1785 edition was found.
- The 1784 8th edition is one of two scanned London editions either side of
  the archive's "1785". The other is the 9th, of 1786 (Wellcome `prxc6nnp`).
- The archive's Buchan recipes come from the appendix "containing a
  dispensatory". That appendix is first named on the title page of the 3rd
  edition, 1774 ([Wellcome](https://wellcomecollection.org/works/fwp7hhg8)).
  Confidence in that date is medium: it rests on title pages and poor OCR.
- Cite a scanned edition and page, never the archive's label.
- Avoid the Google-digitised Philadelphia 1784 copy. The book is public
  domain, but Google's usage guidelines, prepended to the scan, ask for
  non-commercial use.

**"Twigge's notebook"**

- It is not a printed book. It is a manuscript in the National Archives of
  Ireland, reference M 6231, according to the archivist Aideen Ireland's 2008
  article
  ([PDF](https://www.nationalarchives.ie/wp-content/uploads/2019/03/Medical_sources_AideenIreland.pdf)).
- That article attributes it to Diana Wray Twigg, wife of the Archdeacon of
  Limerick, not to the Rev. William Twigge.
- Two things are unverified: the reference did not turn up in the live
  catalogue, and the archive's "c.1715" is unconfirmed.
- There is no free scan.
- The National Archives' own
  [permissions page](https://nationalarchives.ie/help-with-research/copies-publication-and-copyright/permission-to-publish/)
  requires permission and a fee to publish. On its face, the National
  Archives Act 1986, s.17(3) makes publishing any part of records in its
  custody without the Director's written consent an offence. Whether M 6231
  falls within that section is not confirmed.
- Every online transcription is a modern copyrighted work.
- **It stays out of shipped text**, or appears as bare facts at most.

Most quotations on this page come from Internet Archive OCR, with the long s
restored. One, Fuller p. 368, has been checked against its page image.
Fuller's recipe headings are blackletter, which OCR garbles. None of it ships
until it has been read against the page image.

The public-domain conclusions rest on publication and death dates, and on
Wellcome's rights statements. They are not legal advice.

#### Where it plugs in

- **`src/formulary.js`: the eleven `plague` notes.** Rewrite them in place.
  - `tolerance` already has the vinegar that Buchan supports.
  - `collateral` reads "A country receipt, older than the college, did what
    the college receipts would not." Fuller's preface uses "Receipts". The
    college is not yet sourced.
  - Measured on 11 October 2026, three notes (`outbreak`, `phototherapy`,
    `washed`) share a run of five or more words with their Apothecary
    counterparts, and `dark` paraphrases its counterpart. This is probably
    left over from splitting one era into two: `LEGACY_ERA_IDS` maps
    `apothecary` to `plague`. A source pass is the chance to fix that.
  - A second check, that no two eras' notes for one discovery share a
    five-word run, fails on today's text, so its falsification comes free.
- **`src/eras.js`: the plague `note` and `subtitle`.** The period stays
  exactly `1619 - 1799`, which `test/eras.test.js` pins.
- **`docs/practitioners.md`:** a short sources table after Part B. It mirrors
  the test's allowlist for readers.
- **`docs/music.md`** is not a plug-in point. It is the register to copy: link
  the source, and say what is not being claimed.
- **Not `src/doctors.js`.** It draws the plague doctor; it does not speak, so
  there are no practitioner lines to enrich.
- **Not a new module.** A `src/sources.js` would have to join `PRECACHE` in
  `sw.js`, which `test/precache.test.js` enforces. Citations live as data
  beside the notes: stored, never fetched.

#### What must be true first

1. **The check exists,** written and seen to fail all five ways above. The
   two smaller bounds' checks exist too.
2. **Every quotation has been read against its page image,** not taken from
   OCR.
3. **The place is decided.**
   - The era note is set in Marseille, 1720, under a French and Italian
     costume. All three sources are in English, from London, Edinburgh and
     Limerick.
   - The Formulary's plague voice is already English (receipt, the college,
     physic), so the sources belong there.
   - The Marseille note either stays source-free or changes place. That is the
     author's call, not this page's.
4. **The date is decided.**
   - practitioners.md dates the beaked doctor 1619 - c. 1720, though, as
     above, it cites nothing for that window. That nothing beaked is attested
     after c. 1720 is the repository's own claim, unverified.
   - Fuller (1710) sits inside the window. Buchan (1769 on) sits in the era's
     tail.
   - *Domestic Medicine* is household Enlightenment medicine, arguably nearer
     the voice of Patent Medicine. Check 2 settles half the question: a 1784
     edition cannot be cited from the 1800 - 1906 era. Whether the farrago
     turn belongs in this era's notes at all is still a decision.
5. **The beak's herbs are sourced or dropped.**
   - Buchan names rue, tansy, rosemary and wormwood for those near the sick
     (1784, putrid-fever chapter), and tobacco and vinegar in "Of Infection".
     None of that is about a beak.
   - Clove in the beak has only secondary support.
   - Either a primary source turns up, or the era note falls back to the
     subtitle's "aromatic beak", which is safe.

#### Rejected

- **Copying the archive's data, even a filtered handful of rows.** It is
  CC BY-NC-SA 4.0; see the bound.
- **Fetching the archive at runtime, or caching it in the PWA.** That hands the
  same licence to every player, and it would make an offline game need the
  network.
- **Practitioner lines.** `doctors.js` has none, and adding a speaking surface
  breaks the ten-sentence story layer.
- **A remedy codex:** more notes, a recipe page, a collection. That adds
  length, not depth. The slot count is the design.
- **Remedies as a mechanic, inside this entry.** A rule built on ingredients
  needs its own bound and its own gauntlet check. That is **Compounding**, a
  separate entry. This one stays a voice, which is what keeps it cheap.
- **Twigge's notebook in shipped text.** There is no free scan, publishing
  needs the Director's consent and a fee, the transcriptions are copyrighted,
  and the attribution is in doubt.
- **Doses.** Names and voice only.
- **pascalbonenfant.com or americanrevolution.org as substitute sources.**
  Both carry their own copyright notices.
- **The Zenodo record's `cc-by-4.0` as permission.** It conflicts with the
  same licensor's deposited files.

## What is already in

| Shipped | What it does |
| --- | --- |
| Antibiotic resistance | Viruses that survive build resistance and mutate to another colour. The arms race the whole theme rests on. |
| Collateral sensitivity | A tolerant virus stops answering to its own colour and starts answering to an older one, cleared beside it. |
| Hybrid strains | Capped by the wrong colour too long, a virus combines into a colour no capsule is dealt in. Both parents cure it; either one alone wears it down. |
| Run modifiers | Outbreak, phototherapy, rationing, contaminated batch and quarantine, choosable together, each with a bound the gauntlet enforces. |
| The formulary | A notebook that fills in as you trigger interactions, collecting a note per era for each one. |
| Antibodies | Both parents in one cascade synthesise a compound that takes the strain and the ring around it. |
| The neck row | A row above the bottle. Filling the bottle is not a loss until capsules back up into the neck. |
| Apothecary Through Time | Ten eras, ten vessels, ten practitioners, ten notes. |
| Daily challenge | One seeded bottle a day, the same for everyone, with a seeded pair of modifiers named on the card. |
| Versus | Two bottles on one keyboard, trading garbage. |
| Offline play | Installs as a PWA and plays with the network off. |

## What is open

**The macro-organism** is proposed and not built - see above. A final boss made
of reformulated viral protein and the player's own corrupted nanobots: the arms
race's logical endpoint, and the only proposal here that collects a debt the
game has already spent twenty levels running up. It is also the biggest, and it
wants the same beat clock sonotherapy needs.

**Heat and over-treatment** is at `workshop` - the right idea at the wrong time.
It gives the lamp a ceiling and says the thing no mechanic here says yet, that
doing the right thing too much has its own cost. It should be tuned against a
version of phototherapy people have played for a while, and phototherapy has
been rebuilt twice on play evidence already.

**Sonotherapy** is proposed and not built - see above. It is the sibling of the
phototherapy that shipped: light cuts the biofilm hiding the disease, sound
breaks the membrane protecting it, and the drug finishes what the other two
opened up. It is the only proposal on this page that touches every system already
in the bottle, and the only one blocked on a piece of engineering rather than a
decision - the audio scheduler keeps its beat position private, and a rhythm
mechanic needs that position queryable and the clock injectable before it is
anything else. Smaller than first written: see the corrected note above.

**The pharmacopoeia** is at `workshop`. It is a voice for the Plague Years, not
a mechanic. It would ground the era's note and its eleven Formulary notes in
two eighteenth-century books that argue about this game's own subject: Fuller
in 1710 defending the many-ingredient antidote, and Buchan in 1784 calling such
compounds "amazing farragos". The archive that found them is CC BY-NC-SA 4.0,
so it serves as an index only. The bound is a unit check that rejects any
quotation without a public-domain citation dated inside the era. Promotion
waits on the check, a page-image reading of each quotation, and three
decisions: the place, the date, and the beak's herbs.

**Phototherapy** shipped and replaced the blackout, which worked and did not
mean anything. Its three open forks ship as toggles rather than as decisions -
see above.

Everything else on this page is built, apart from the October ward, which is at
`workshop`. That is not a finish line - it is an inbox, and the whole point of the
page is that anyone can fill it again.

### What is knowingly not done

Worth writing down so nobody has to rediscover it:

- **Versus does not take modifiers.** Two bottles trading garbage still play the
  plain rules. Some of them raise real questions for a two-player game - does a
  fogged bottle hit both players at once, does an outbreak on your side feed the
  other one - and guessing at those answers is a worse outcome than leaving it
  open.
- **Rationing is the slow grind, not the deadly one.** It is honest about that
  above. If the wanted texture is a difficulty spike rather than a longer game,
  that is a different modifier and should be argued for as one.

**Suggest one:** [mechanic](https://github.com/danielwjohnston/rxdrop/issues/new?template=mechanic.yml)
· [challenge](https://github.com/danielwjohnston/rxdrop/issues/new?template=challenge.yml)
· [theme](https://github.com/danielwjohnston/rxdrop/issues/new?template=theme.yml)

## How an idea gets in

1. Someone opens an issue - one of the forms, or a blank one for a "what if".
2. It gets argued against the goal at the top of this page - does it *combine*,
   and can the player *answer* it?
3. If it survives, it lands here as `proposed`, then gets built behind the
   UltraGauntlet like everything else. A red stage means it is not ready,
   whatever the idea was.

Ideas are cheap and the rules are not. Anything on this page can be cut for
making the bottle worse to play.
