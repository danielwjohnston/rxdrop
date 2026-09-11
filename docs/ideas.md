# The formulary: mechanics under consideration

This is the design workshop for RxDrop. It exists so that ideas - mine, yours,
anyone's - can be argued about against something, rather than piling up as a
list of nice thoughts.

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

### Blackout, and light therapy - `shipped`, and superseded by Phototherapy below

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

### Phototherapy - `proposed`, and meant to replace the blackout above

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

**3. A line of light is a row of the patient.** Complete a horizontal line and
*that row is illuminated*. Four lines at once lights a band. The mapping is
one-to-one and literal: what you clear in the light chamber is what you can see
in the bottle. This is the part that makes the whole idea work - light has a
**target**, so "which part of the patient do I need to see" becomes a question
worth answering.

**4. Light does not collide with medicine.** Light pieces fall *through* the
capsule stack - they are photons, not matter - and settle on the floor among
themselves. Light therapy must never make the medicine side harder; it is an
aid, and an aid that sabotages you is a trap.

**5. Unused light dissipates.** A light piece that does not complete a line
fades after a few seconds. You cannot build a tower of light and bank it. Make
lines or lose it - which is what stops the light chamber being a safe room to
hide in when the bottle gets frightening.

**6. The cost is time, and the capsule does not wait.** While you are working
the lamp, the capsule *keeps falling* - under gravity, unsteered, locking
wherever it lands. You chose to look away.

That is the whole decision, and it is triage: **is it worth two badly-placed
capsules to see the bottom of the bottle again?** The shipped version asks "did
you remember to press the key". This one asks a question about the patient.

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
- **You can win without ever entering the light chamber.** It is an aid, not a
  gate.

#### What it is worth

The in-the-dark clear stays as a badge. But there is a better one available
now: **clear a run in a row you lit yourself**, in the same breath - the light
and the medicine landing together, which is the thing this mechanic is actually
about.

#### Forks worth deciding before building

Three, and they change the feel enough that guessing would be wrong:

1. **How wide is the light chamber?** The bottle is 8 wide, which is very wide
   for tetrominoes - lines would come easily and light would be cheap. A
   narrower chamber (4-5) inside the bottle makes each line worth something.
   Or full-width lines stay deliberately hard and rare.
2. **Do you leave the light chamber when you want, or on a timer?** Leaving when
   you want makes it a pure trade; a timer makes it a commitment.
3. **One bottle or two views?** The light piece and the capsule on screen at
   once is the most demanding and the most honest - you can see what your
   neglect is costing in real time. Switching the bottle's view is clearer and
   much easier to read.

*What it would cost to build:* a second piece type and a second falling-piece
controller, per-row visibility in the renderer, the fog model, the mode switch,
and a gauntlet stage for the bounds above. The board and renderer are already
cleanly separated, so this is a real piece of work but not a rewrite - the
awkward part is that `Game` currently owns exactly one falling piece.

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

*What shipped, and one change that made it better.* Ten discoveries, one for
every mechanic on this page, and each one collects a note **per era** rather
than a single note from wherever you happened to find it. Find a chain reaction
in the cave and the shaman writes it up; find one again in the clean room and
the technician writes it up beside them. So the notebook accumulates
observations of one phenomenon across five eras of medicine, which is what a
case book actually looks like - and it gives all fifty lines a reason to exist
rather than forty-five of them being unreachable.

A page you have not filled in says **nothing about itself**. It reads "Not yet
observed" and no more. A notebook that lists what you have not done yet is a
checklist, and a checklist is the opposite of finding something.

The gauntlet gates the thing that would otherwise rot silently: it plays the
whole formulary at once with the real bot and fails if any discovery is one that
playing can never trigger. Half the runs work the light and half never touch it,
because a bot that always spends the light can never clear a run in the dark -
which is a fact about the bot, not about the game.

## What is already in

| Shipped | What it does |
| --- | --- |
| Antibiotic resistance | Viruses that survive build resistance and mutate to another colour. The arms race the whole theme rests on. |
| Collateral sensitivity | A tolerant virus stops answering to its own colour and starts answering to an older one, cleared beside it. |
| Hybrid strains | Capped by the wrong colour too long, a virus combines into a colour no capsule is dealt in. Both parents cure it; either one alone wears it down. |
| Run modifiers | Outbreak, blackout, rationing, contaminated batch and quarantine, choosable together, each with a bound the gauntlet enforces. |
| The formulary | A notebook that fills in as you trigger interactions, collecting a note per era for each one. |
| Antibodies | Both parents in one cascade synthesise a compound that takes the strain and the ring around it. |
| The neck row | A row above the bottle. Filling the bottle is not a loss until capsules back up into the neck. |
| Apothecary Through Time | Five eras, five vessels, five physicians, five notes. |
| Daily challenge | One seeded bottle a day, the same for everyone, with a seeded pair of modifiers named on the card. |
| Versus | Two bottles on one keyboard, trading garbage. |
| Offline play | Installs as a PWA and plays with the network off. |

## What is open

**Phototherapy** is proposed and not built - see above. It is meant to replace
the shipped blackout, which works and does not mean anything.

Everything else on this page is built. That is not a finish line - it is an empty
inbox, and the whole point of the page is that anyone can fill it again.

### What is knowingly not done

Worth writing down so nobody has to rediscover it:

- **Versus does not take modifiers.** Two bottles trading garbage still play the
  plain rules. Some of them raise real questions for a two-player game - does a
  blackout hit both bottles at once, does an outbreak on your side feed the
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
