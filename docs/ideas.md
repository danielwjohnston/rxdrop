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
  sides to treat from; with fewer, the virus mutates the old way instead. And it
  keeps them: an outbreak child never lands where it would leave a strain with
  fewer than two.
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

*What measurement found, 11 October:* outbreak broke two promises that mutation
keeps, and the gauntlet missed both. First, a child could complete a run. Being
beside its parent does not keep it out of a line: a row along the floor under
the parent runs through the child and not the parent. Nothing resolved that
run, so the next capsule fell onto a free clear. Bot play hit this on 24 of 319
outbreak ticks over 40 seeds. Second, a hybrid could replicate, which skipped
the two-open-sides guard that combining obeys: 20 of 71 copies were born with
fewer than two. Now a child never lands where it completes a run, alone or together
with another child from the same tick, and a hybrid never replicates. The
same-tick case is real, not theoretical: without it, bot play still produced
one such clear per 300 or so ticks. `fuzz` now plays outbreak, and the
`hybrid` stage's formation check covers copies as well as combining.

*What was decided, 12 October:* a strain keeps its two open sides for its whole
life, not only where it forms. An ordinary child could still land beside an
existing strain and take a side away. Over 1,000 bot games that happened on 295
of 7,786 outbreak ticks, never down to zero. But one tick places up to two
children, and a constructed board shows them landing on both open sides of one
strain at once, boxing it in. Now a child never takes a side that would leave a strain
fewer than two, alone or together with another child from the same tick. It
cost 0.9% of children and moved no reference trace. `hybrid` checks it tick by
tick, and `modifiers` checks it on every frame of play. The evidence, and the
alternatives turned down, are in
[DEC-0003](../.agents/decisions/DEC-0003-outbreak-keeps-hybrids-reachable.md).

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

*A third finding, 11 October 2026: the check measures one configuration.* It
builds `new Game({ level: 4, speed: 'LOW', seed, modifiers })`, so it only ever
runs with resistance off, at level 4. Run the same loop and the same bot with
level and resistance exposed, and the claim holds only where the check looks.
The Organ Trial design panel found this, and it was reproduced for this note.

| LOW, the check's own loop | plain | rationing |
| --- | --- | --- |
| level 4, resistance off (10 seeds): viruses per capsule | 0.031 | 0.023 |
| level 4, resistance on (10 seeds): viruses per capsule | 0.023 | **0.031** |
| level 0, resistance off (6 seeds): viruses per capsule | 0.025 | **0.029** |

With resistance on, or at level 0, rationing kills viruses *faster* per capsule
than the plain bottle. That is the relief this entry says was fixed. The check
should sweep resistance on and more than one level before any design leans on
rationing again. Until it does, "worse than a plain bottle" is true of one
configuration, not of the modifier.

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

*The bound:* a seal lifts on its own after six capsules (`QUARANTINE_MAX`)
whatever you do, and never takes a spawn column. And it blocks *placement only*
- gravity, matching and clearing all still see straight through it, so a run
that passes through a sealed column still clears and whatever was in there
before the seal is still in play. A sealed column is a narrower bottle, not a
frozen one. (This bound said "ten capsules" until 11 October 2026;
`src/constants.js` is the authority.)

### The Organ Trial - `workshop`

*The idea, from the author:* "oregon trail by organ trial?", then "yes, add the
organ trial too." The pun came with three threads:

- **the trail:** the Oregon Trail's loop of landmarks, supplies that run out,
  hazards, a choice of pace and provisions, and a tombstone;
- **organ:** a body map where each stop is an organ with its own twist;
- **trial:** the clinical trial, from James Lind's scurvy comparison to the
  1948 streptomycin trial.

Filed at `workshop`. Three designs were drafted, one led by each thread. A
designer and an engineer judged them against the code. This entry builds on the
**trial** and grafts the organ and the tombstone onto it. The other two designs
are under Rejected, with the evidence against each. Nothing here is built.

#### What it is reaching for

On about a third of days the daily already draws exactly one modifier (rolls
2-3 of 6 in `dailyModifiers`). On those days everyone plays the same condition,
and the question is *can you beat it*. The trial asks a different question of
the same bottle: *what does this condition do to this patient?*

That takes the laboratory frame of the 12 September addendum a step further.
The same sample still goes to every lab, but each lab is handed one regimen.

It is also the tool this page keeps asking for and does not have:

- Phototherapy's forks ship as toggles because they have to be settled "on
  evidence" by "a hand".
- Rationing's verdict has already inverted once, on a badly chosen measure.

A matched comparison on one patient is how that evidence gets gathered, and the
gauntlet's determinism makes the match exact. Lind could only approximate a
matched pair, "as similar as I could have them". A seed hands both arms the
identical patient.

From the Oregon Trail it keeps the pun and the tombstone. A journey version was
designed and cut; see Rejected.

#### Where the judges split

The designer chose the trial: it found no fatal flaw, and it called the
open-label second arm the most novel and cheapest feature in any of the three
designs. The engineer chose the body map, whose strain carries tolerance from
stop to stop.

The tie broke on one fact, checked against `src/constants.js`: the body map's
memory does not survive one resistance tick. A carried virus arrives at
`TOLERANCE_AT` (2). With resistance forced on, it reaches `RESISTANCE_MAX` (3)
at `RESISTANCE_INTERVAL` (8) capsules, and then mutates like any other.

The engineer's objections to the trial still stand, and are listed under
"What must be true first":

- it changes no rule inside the bottle;
- it bends the daily's "same for everyone" promise on a third of days;
- intention-to-treat makes the daily harsher;
- its comparisons are small numbers.

#### The shape: one patient, two arms, a sealed envelope

1. **The card.** A trial day's card reads, for example: "Trial: outbreak
   against standard care. The patient presents at the lungs. Level 8 · LOW ·
   Resistance. Open the envelope to enrol." Pair days and plain days look
   exactly as they do now.
2. **The envelope.** Confirm opens it, and **opening it enrols the patient.**
   - It reads either *standard care* or the day's modifier.
   - The arm comes from a per-device series seed and the UTC date key. It is
     fixed for that day on that device, and a reload cannot re-roll it.
   - Once opened, the attempt is registered whatever happens: this is
     intention-to-treat.
   - In 1948 the envelope was opened only after the patient had been accepted,
     so nobody could see the allocation and then decline to enrol. Enrolling
     at the envelope keeps that property. A design that enrolled at the first
     locked capsule would let a player read their arm and walk away.
3. **The patient.** Both arms share seed, level, speed, resistance flag and
   starting grid, cell for cell, because `generateLevel(board, level, rng)`
   never reads the modifiers. Standard care is the plain bottle, 1948's "bed
   rest alone". The intervention is the same bottle plus the day's one
   modifier.
4. **Withdrawal.** Any exit after the envelope opens withdraws the patient,
   recorded as "not cured at dose N". That covers restart, quit to title,
   reload, closing the tab, and `pagehide`. Every later attempt that day is
   open-label and never replaces the registered one.
5. **The endpoints.**
   - Primary: cured or lost.
   - Secondary: doses (capsules placed) and cures (`virusesClearedThisLevel`).
   - "Resistance emerged ×N", counted from `mutate` events.
   - "The older medicine used ×N", counted from `clear` events' `collateral`.
   - "The slow answer used ×N", counted from `resist` events: clears that
     bounced off tolerant viruses.

   The reducer that counts these reads events only and is never given the arm.
   That is a property of the code, not blinding: the player knows their arm.
6. **The case report.** The registered attempt is the share line, led by the
   arm and the site: "RxDrop Trial 2026-10-15 · Outbreak arm · Lungs · Lost at
   dose 63 · 18 cured · resistance emerged ×3". Score leaves the trial line.
7. **The other arm.** After the case report, a follow-on screen offers the
   other arm, open-label: the same patient under the other regimen. It is shown
   beside the registered result, and is never registered or shared. No real
   trial can observe that counterfactual; a seeded game can.

On a phototherapy day the protocol pins the lamp's width and exit to the
shipped defaults, so every centre gives the same regimen. See "What it bends".

#### The organ: where the patient presents

Grafted from the body map, **as copy only**. The day's single modifier names
the site the patient presents at. No geometry changes, and the era still follows
the level.

The card and the HUD show **only the site's name**. The dated anchors below are
protocol-voice footnotes for the case report and the ledger, outside the era
frame. They do not belong to the bottle's era, and daily bottles run from the
Swnw to Patent Medicine, so an anchor shown on the card could put 1948 over an
Egyptian bottle. An anchor that falls where two era bands overlap is never
attributed to either one.

| Site | Intervention arm | Anchor, for the case report | Confidence |
| --- | --- | --- | --- |
| Lungs | outbreak | the MRC streptomycin trial in pulmonary tuberculosis, 1948; Koch's identification of the tubercle bacillus, 1882 | confident |
| Gut | contaminated batch | Snow and the Broad Street pump, Soho, 1854; the US Pure Food and Drug Act, 1906, on adulterated nostrums | confident. Do not claim that removing the pump handle ended the outbreak: it was already waning |
| Skin | phototherapy | Finsen's Nobel Prize, 1903, for light treatment of lupus vulgaris | confident; `src/formulary.js` already names him |
| Heart | rationing | Harvey, *De motu cordis*, 1628 | confident on the book. Fairly confident on his argument from quantity; check before quoting |
| Skull | quarantine | Neolithic trepanned skulls, many with healed edges, showing the patient lived | confident. Why it was done is unknown, and the copy says so |

The anchors speak in a neutral protocol voice, never in the era practitioner's
mouth. Most of the daily bottles' practitioners predate the controlled trial as
1948 knew it, though comparisons were made earlier (al-Razi, c. 900; Paré,
1537; see "The history it may lean on"). #47's Historian could take that voice
later; this entry does not wait for it.

#### The tombstone and the ledger

Grafted from the trail.

**The tombstone.** The registered attempt is kept on the device as the
patient's record: what happened to the patient you enrolled, even after twenty
better attempts that day. It carries one line about the patient, in the voice of
the era the bottle was in. The line is chosen with left and right, the way the
title's level picker works, because a D-pad has no keyboard. Anything about the
protocol stays in the protocol voice.

**The ledger.** Beside it sits a per-device ledger by arm across your trial
days, for example "Outbreak arm: 3 cured, 2 lost · standard care: 4 cured, 1
lost". It reports outcomes and never computes a verdict or a "significance". A
group chat's pooled table is noise, and learning to read it as noise is part of
the lesson; the game does not get to make that claim itself.

**Storage.** The series seed, the register by day and the ledger live under a
new key, `rxdrop.trial.v1`. They do not go into `rxdrop.daily.v1`, which holds
one day's result, is overwritten whole on every attempt, and would lose an extra
field to an older cached build. This is a save-format addition under portability
finding 11.

#### What it bends

| Existing rule | What it comes to mean |
| --- | --- |
| `dailyModifiers`: a day is plain, one modifier, or a pair | A one-modifier day becomes a trial. The modifier is the intervention, and the plain bottle on the same patient is the control. Pair days stay as they are: a pair varies two things at once, so a result could not name a cause. Lind gave each pair one supplement on a common diet, which is what lets his comparison name a cause. |
| `recordDaily`: "Keep the best attempt of the day rather than the most recent" | The first enrolled attempt is registered. Best-of-N is selective reporting, the investigator's hand on the scale, and registering the first attempt is the protection a modern protocol uses. The 1948 envelopes took away a different hand: choosing who got which treatment. A best-of-twenty line is also not comparable between players. |
| `shareText`: badges, viruses cleared, score | The line leads with the arm and the site. Chains still count as cures, but a setup that spends six capsules for style becomes a worse treatment on the form. |
| `mutate` and the resistance meter | Each mutation is an adverse outcome on the form. The player treats the viruses closest to mutating first, not whatever is convenient. |
| The shrug (`resist`) and collateral sensitivity | Both become secondary endpoints: whether the older medicine was used, or the slow answer. |
| The phototherapy variants (the lamp's width and exit, today the player's choice) | On a phototherapy trial day both are pinned to the shipped defaults, which is also what the playability check plays. |
| The `determinism` stage: "A seed must reproduce a game exactly" | A developer guarantee becomes a player-facing promise that both arms are the same patient, and the open-label arm lets you see it. |

To be honest about what is missing: **none of this changes a rule inside the
bottle.** Both judges scored its depth at 2. What changes is what the player
optimises for. By this page's own test that is the entry's weakest point, and it
is the price of a bound that costs nothing.

#### The bound

> A trial varies exactly one thing and invents no bottle. Both arms are the
> same patient (level, speed, resistance flag, seed and starting grid, cell for
> cell), and both are bottles the game already deals: the plain bottle, and the
> same bottle with a single shipped modifier. So neither arm can strand a virus.
> The plain rules have their own checks, and each modifier's bound in
> `src/modifiers.js` holds whatever the configuration. The endpoint, the
> register, the site, the tombstone and the ledger read the game's events and
> never write to it. The envelope decides which bottle you are handed, never
> whether its viruses have an answer.

The gate's playability check ("every modifier, alone and all at once, keeps the
bottle playable") measures each single modifier at one configuration, not at
every trial day's level and speed. Before promotion, either add a sampled sweep
of real trial-day setups (both arms) to the `modifiers` stage, or keep saying
plainly that the gate certifies one configuration.

"Same patient" means the same starting state, not the same course. The arms
share one `rng`, so the capsule stream diverges from the first draw that play or
the modifier causes: a spread, a seal, a lamp visit, a stock-out pick, or a
recolouring mutation. Copy must never claim "the same capsules". On a rationing
day with resistance off, the two arms also look different from the first
capsule: rationing switches tolerance on, and the third of viruses the generator
seeded at the threshold refuse their own colour in the intervention arm only.
The card must say that a stock-out patient presents with tolerance.

#### The check

Three new checks, one existing check tightened, and one browser check.

1. **'both arms of a trial are the same patient, one shipped modifier apart'**
   (`determinism` stage). For every UTC day of 2028 (366 keys, the leap day
   included), build `dailySetup`. On a trial day, build a `Game` for each arm
   and assert:
   - `JSON.stringify(board.grid)` is equal across arms. That compares full
     cells, because `toStrings()` drops resistance (portability finding 8);
   - level, speed, resistance and seed are equal;
   - the control's modifiers are `[]`;
   - the intervention's modifiers are one id from `MODIFIER_IDS`.

   On any other day, `armSetup` must return `dailySetup` unchanged.

   **The arm.** `trialArm(series, key)` is FNV-1a over the series and the key,
   then a 32-bit avalanche finaliser (murmur3's `fmix32`, with `Math.imul`).
   The arm is the top bit (`>>> 31`). Over about 1,000 series seeds, assert
   that each arm's mean share of the year's trial days is about 0.5, and that
   day-by-day agreement between any two series is 0.4-0.6.

   Measure the stage, so the eleven fast stages stay near three seconds.
2. **'the trial endpoint is blind and read-only'** (`determinism` stage, capped
   at 2,000 frames per bottle; the read-only property does not need a finished
   game). If it costs more than half a second, move it to `modifiers`. Play the
   plain bottle and each single modifier with the existing bot twice: once
   feeding events through `tallyEndpoint`, once not. Assert:
   - grid, score and event sequence are identical;
   - doses equal `pillsPlaced`;
   - cures equal `virusesClearedThisLevel`;
   - mutations, collateral kills and shrugs equal the summed `mutate`,
     `clear.collateral` and `resist` counts.

   `tallyEndpoint` takes events and nothing else.
3. **'a registered trial result is the first enrolled attempt, whatever comes
   after'.** This tests the pure reducer `registerAttempt`:
   - an attempt whose envelope was never opened does not register;
   - the first enrolled loss does, even at dose 0;
   - a later cure with a higher score does not replace it;
   - an open-label attempt never registers and never reaches the ledger;
   - a `?daily=` key other than today's plays open-label;
   - the next day registers fresh;
   - non-trial days keep best-of, exactly as now.
4. **Tightened:** "the daily is the same puzzle for everyone" compares the
   grid, not `toStrings()`.
5. **Browser:** open the envelope, lock one capsule, then do each of restart,
   reload and quit to title, and finish a better attempt after each. The share
   line shown must still be the first attempt's.

Falsify each one, and say so in the commit:

- Seed the intervention arm with `seed ^ 1`: check 1 fails on the first trial
  day.
- Re-roll starting resistance in one arm: a `toStrings`-only version of check 1
  still passes, while the grid compare fails. That is why the grid compare is
  there.
- Let pair days through as trials: the one-modifier assertion fails.
- Pick the arm from the raw FNV-1a hash with `& 1`: the agreement assertion
  fails, because every device then gets one of two complementary schedules set
  by the date.
- Make the tally drain the game's events itself, or touch the score: check 2
  fails.
- Restore best-score registration: check 3 fails.
- Write the enrolment only at level end: the browser check fails on reload.

A unit test also pins that the site table covers `MODIFIER_IDS` exactly; delete
a row and it fails.

`tools/reference-traces.mjs` must pass all nine traces without `--write`.
`src/daily.js` is in the rules layer of the porting contract. It gains pure
functions, but `dailySetup` does not change, so the traces still replay. The
`daily-2026-10-10` trace is itself a trial day (one modifier, rationing). Once
this is built, that trace's purpose line and `docs/portability.md` §3 should
name it as the intervention arm.

While iterating, run the eleven fast stages. Add `browser` once, because
`main.js`, `index.html` and `sw.js` change. Add `modifiers` if check 2 moves
there.

#### Determinism and input

- **The rules are untouched.** `board.js`, `pill.js`, `game.js`, `light.js`,
  `modifiers.js` and `rng.js` do not change. Versus, every daily that is not a
  trial, and the nine reference traces stay byte-identical.
- **The arm is an input, like the seed.**
  - The platform layer picks one series seed per device, once, with
    `Math.random`. That is how `main.js` already picks non-daily seeds
    (portability finding 4).
  - `trialArm` is pure, lives in `daily.js`, and never draws from `game.rng`.
- **The reducers port as logic.**
  - Endpoint, register and ledger are pure functions in `daily.js`.
  - They read events the rules already raise: `lock`, `clear`, `resist`,
    `mutate`, `levelComplete` and `gameOver`.
  - A port needs only its own save in place of `localStorage`. The tombstone
    and ledger are platform state, as the formulary is (finding 11).
- **No new command, and no new kind of navigation.**
  - The envelope opens on confirm.
  - Withdrawing asks for restart to be pressed twice.
  - The other arm is offered on a follow-on screen after the case report,
    taken with confirm.
  - The tombstone line is chosen with left and right.

  Nothing assumes D-pad focus navigation on the result screens, which those
  screens do not have today.

#### What it would cost

About a day for the trial, by its designer's estimate. Almost all of it is in
`main.js`'s daily flow rather than the rules:

- about 70 pure lines in `src/daily.js`: `isTrialDay`, `trialArm`, `armSetup`,
  `registerAttempt`, `tallyEndpoint`, and a trial branch in `shareText`;
- about 60 lines in `test/daily.test.js`;
- 60-90 lines in four places in `src/main.js`: `startGame`'s daily branch, the
  daily card, `recordDaily`, and the `restart` case;
- a line and a screen in `index.html`, and a rule or two of CSS;
- a cache bump in `sw.js`.

The grafts (site table, tombstone and ledger) are presentation and storage on
top of that. Nobody has estimated their cost.

#### What must be true first

1. **A Principal call on the daily's promise.**
   - "One bottle a day, the same for everyone" is written in four places:
     `src/daily.js`, the daily card in `src/main.js`, `README.md`, and this
     page's table.
   - On a trial day the patient is the same everywhere, but the regimen
     differs by device, so half the players on a single-modifier day never see
     that day's modifier.
   - The designer read this as still "the same sample sent to every lab". The
     engineer read it as breaking the daily's identity on a third of days.
     That disagreement is the Principal's to settle.
2. **A Principal call on the title and the scope.**
   - *The Oregon Trail* is a trademark, so even the pun needs a decision.
   - Per direction §28 nothing else is borrowed: no "You have died of", no
     wagon, no MECC art, no typed epitaph.
   - `docs/status.md` treats new mechanics as expansion work, so this must not
     delay the web-complete/freeze decision.
   - It overlaps #47 but does not depend on it.
3. **Intention-to-treat tuned by hand.** Enrolling at the envelope is harsh on
   an accidental exit. Opening the envelope is an explicit confirm, and
   withdrawing asks for restart twice. Whether that is enough is a playtest
   question.
4. **The edges that would let the allocation be gamed are closed.**
   - The enrolment is written to storage when the envelope opens, before play.
   - When storage is unavailable, the trial runs open-label and never
     registers, rather than re-rolling on every reload.
   - A `?daily=` link to any day but today plays open-label and carries no
     arm.
   - The arm stays visible on the HUD for the whole attempt.
   - Clearing site data, or a private window, starts a fresh series. That is
     like tampering with a real trial, and it is accepted as such.
5. **Survival stays the primary endpoint.** It is the outcome nobody can
   misread, and the one that does not reward style. Doses are a biased measure:
   the lamp places no capsules, so the lamp is free on that measure, and
   outbreak breeds extra viruses to cure.
6. **Every flagged historical line below is checked** before it reaches copy.
7. **The two `recordDaily` quirks are fixed first** (issue #60), because
   the trial reuses that code. *Done on 13 October 2026:*
   - it counted cleared viruses as `startingViruses - virusesLeft`, which
     undercounts under outbreak. The count is now out of every virus the board
     held, bred ones included (`Game.virusesThisLevel`);
   - it saved the best attempt but built the share line from the latest one. It
     still shares the attempt just played, and now says so when an earlier one
     stays the day's best (`keptResult` in `src/daily.js`).

#### The history it may lean on

- **The Oregon Trail** was created in 1971 by Don Rawitsch, Bill Heinemann and
  Paul Dillenberger, student teachers at Carleton College, and first played in
  December 1971. MECC, founded in 1973, distributed it from the mid-1970s.
  - The 1985 Apple II version (MECC; lead designer R. Philip Bouchard) has the
    landmarks; the river crossings (ford, caulk the wagon and float it, or take
    a ferry); the pace and rations settings; and the tombstones.
  - The player-written epitaph shown to later players is documented. It is
    still not borrowed (direction §28).
  - *Unverified, keep out of copy:* that the banker, carpenter and farmer were
    paid ×1, ×2 and ×3 at the finish.
- **James Lind, HMS *Salisbury*, 20 May 1747** (Old Style; 31 May in the
  Gregorian calendar).
  - Twelve scurvy patients in six pairs, on a common diet. Each pair was given
    one supplement: cider, elixir of vitriol, vinegar, seawater, two oranges
    and a lemon, or an electuary. The citrus pair recovered fastest.
  - Published in *A Treatise of the Scurvy*, 1753. It sits in the Plague Years
    band (1619-1799).
  - "As similar as I could have them" is his phrase; check the wording against
    the 1753 page images.
  - Lind allocated by hand, and every pair received something. Never call his
    trial randomised, and never call any of his arms a control or a placebo.
- **Lind's citrus ran out.** "Continued but six days under this course, having
  consumed the quantity that could be spared" is confirmed in several
  transcriptions of the *Treatise*. Check the wording against the page image
  before copy uses it. If it holds, the trail's "supplies run out" thread is
  already inside Lind's own trial.
- **Earlier comparisons, as era-native anchors.** Both need checking against a
  primary source before copy uses them:
  - al-Razi (c. 900), a hospital physician in the Bimaristan band, describes
    leaving one group of brain-fever patients unbled "to remove doubt". The
    James Lind Library records this as an early comparison with a control
    group.
  - Paré at Turin, 1537 (some sources give 1536), in the Apothecary band. His
    boiling oil ran out, and he compared the oil with a dressing of egg yolk,
    oil of roses and turpentine.
- **The MRC streptomycin trial, *BMJ*, 30 October 1948.** Streptomycin with bed
  rest against bed rest alone, in pulmonary tuberculosis. It sits in the
  Pharmaceutical band (1928-1999).
  - Confident:
    - Austin Bradford Hill was the statistician; Philip D'Arcy Hart and Marc
      Daniels were on the team.
    - Allocation was by numbered sealed envelopes, a series per sex per
      centre, each holding a card marked S or C. An envelope was opened only
      after the patient had been accepted.
    - Every patient was graded at six months on one scale, from considerable
      improvement down to death.
    - Copy may say "resistant strains emerged during treatment".
  - Secondary source only (Crofton's memoir); check *BMJ* 1948;2:769-82 before
    copy uses any of these:
    - that resistance emerged especially after the fourth month;
    - that three specialists, blind to allocation, read the X-rays;
    - that the government had bought only a limited amount of the drug;
    - that the course was cut from six months to four.
  - Call it a landmark trial, never "the first", and attribute no quotation to
    Hill.
- **The 1948 deaths: 4 of 55 against 14 of 52, within six months.** Those
  figures reproduce the chi-square of 7.38 (6.04 with continuity correction)
  reported in Armitage P (2009), *A statistical note on the analysis of the
  1948 MRC streptomycin trial*, James Lind Library; 15 would give 8.52. Both
  arms had more deaths by twelve months. Read the primary paper before copy
  quotes either number.
- **Streptomycin with PAS** reduced resistance in later MRC trials. The first
  full MRC report appeared in the *BMJ*, 11 November 1950, and a combined
  analysis followed in the *BMJ* in 1952. It is the natural future link to
  hybrids and antibodies, as combination therapy. It is not copy yet.
- **Cholera among overland emigrants**, around 1849 to the early 1850s, is
  widely reported. We are confident about 1849-50, but not the end year or any
  numbers. That puts the Oregon Trail's killer in the Patent Medicine band.
  Typhoid on the trail is not confirmed, so keep it out.

#### Rejected

- ~~**The trail: a chest of doses, and a crossing at every era.**~~ This design
  played the campaign as a journey:
  - ten landmarks at the era entries (levels 0, 2 ... 18);
  - a chest of doses, one drawn per capsule and refilled at each landmark;
  - a card at each crossing: Push (a faster leg), Trade (a seeded hazard,
    accepted in exchange for doses) or Pay (a plain leg, paid for in doses);
  - an empty chest that put the leg on "bare bones", which was simply
    rationing.

  It lost because **the punishment helps**. With the shipped bot, rationing
  finishes more levels than the plain bottle, not fewer (see the note in the
  Rationing entry). So doses are worth nothing, Trade is dominated, and the
  crossing collapses to Push or Pay. That cannot be repaired inside the
  design's own premise, that an empty chest only ever switches on a rule that
  is already bounded.

  **Kept, for any future journey:**
  - its crossing interface: left, right and confirm at a level boundary,
    handed to `advanceLevel` as a platform input (portability finding 10);
  - its getter that leaves the shipped rule exactly as it is when there is no
    chest.
- ~~**The body map: five organs, five modifiers, a strain that remembers.**~~
  Skull/quarantine, heart/rationing, gut/contaminated batch, skin/phototherapy
  and lungs/outbreak, visited in any order from an anatomical chart. Each stop
  handed up to three tolerant viruses to the next. It was the engineer's winner
  and the closest call here. It lost on:
  - the memory dying on capsule 8 (above);
  - the heart. Rationing ages red from the first capsule, so it neutralises a
    red carry;
  - its bound sentence. Its bound claimed that a stop's layout and deal match
    the same stop played without the carry. That is false once play starts,
    because mutation, the bag shuffle and every modifier share `this.rng`;
  - the frame. One patient through five rooms contradicts the addendum's
    caseload;
  - Restart and Retry, which rebuild through `startGame`'s non-daily branch and
    erase the carry.

  **Kept:** the site-to-modifier mapping, as copy, and the shrug tally, as an
  endpoint.

  **If a journey is wanted after all, start here, with these repairs:**
  - eras by level;
  - a ward-round frame. `src/formulary.js` already says "The organism from bed
    four is in bed five by morning";
  - registration at enrolment;
  - a whole-run replay check from seed, route and inputs.
- **A supply that ends the run when it runs out.** A supply that can run dry
  makes a virus unanswerable however well the bottle is played. Rationing is
  already the bounded supply.
- **Restart or Retry as a free re-roll, or party members as lives.** Both are a
  continue system, and both make the tombstone cheap. Hence enrolment at the
  envelope.
- **Enrolment at the first locked capsule.** It is gentler on accidents, but it
  lets a player see their arm and decline to enrol. That is the selection bias
  the 1948 envelopes were designed to prevent.
- **Typed epitaphs.** A D-pad has no keyboard.
- **Organ-shaped or variable-width bottles.** `BOARD_WIDTH` is part of the trace
  contract. Quarantine is already the narrower bottle, and in a trial a bottle
  shape would be a second variable.
- **New organ modifiers** (kidney filtration, liver detox). Each is a parallel
  rule needing its own bound, when five shipped modifiers already map onto five
  sites.
- **Two bottles driven by one set of inputs.** They diverge at the first
  collision that differs. From then on, a virus in one bottle is answerable only
  by ruining the other.
- **Pair days as a head-to-head.** It deletes the interaction the pair exists
  for, and varies two things at once.
- **One arm for everyone on a given day.** It keeps "the same for everyone", but
  it is alternation by date, with no concurrent control.
- **A placebo arm through the contaminated batch.** Inert halves come on a fixed
  schedule, so they are not blind.
- **The bot as the control arm, or as par.** It ships `tools/bot.mjs` into the
  game, and lets bot tuning silently move every player's comparison.
- **A separate `rng` stream, so both arms get identical capsules.** It is a
  better match, but it changes `game.js`'s rng contract and every reference
  trace. The divergence is stated instead.
- **Score, cures per dose or time-to-cure as the primary endpoint.** Score
  rewards style. Cures per dose is inflated by outbreak. Time-to-cure rides the
  web's variable frame deltas (portability finding 1).
- **Stopping rules, or "rest or continue".** They would be a parallel
  push-your-luck rule.
- **"Under-dosing breeds resistance" as a rule.** Making 1948's lesson
  mechanical would punish the setups that are the core of play.
- **Random hazards between or during bottles.** That is randomness rather than
  interaction.
- **Lind's trial as a stop.** Scurvy is a deficiency, not an infection, so Lind
  survives as the trial's shape and not as a patient.
- **A versus Organ Trial.** Versus takes no modifiers, which is knowingly not
  done.
- **A Formulary page for the trial.** Deferred. A trial compares bottles, so it
  would be the first page the rules cannot write.
- *Deferred, not rejected:* **putting phototherapy's three forks to trial.**
  This page says they must be settled on evidence by a hand. A trial is how,
  once the format has proved itself on the daily.

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

**The Organ Trial** is at `workshop` - see above. On the third of days when the
daily already draws one modifier, that modifier would become one arm of a
two-arm trial on the identical patient. The patient presents at an organ, is
enrolled when the envelope opens, and is kept on the device as a case report;
nothing inside the bottle changes. It waits on Principal calls about the daily's
"same for everyone" promise, the title, and its place behind the web-complete
decision.

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
