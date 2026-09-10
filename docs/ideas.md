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

### Blackout, and light therapy - `shipped`

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

### Rationing - `shipped`

For a stretch, only two of the three colours are dealt. Every board state that
needed the third one has to wait, and the stack you build in the meantime is the
cost.

*The bound:* the withheld colour rotates on a fixed timer rather than being
re-rolled, so the wait is always bounded and always predictable - "three more
capsules and it is back", not "the game is withholding it". Rationing draws from
the same shuffled bag and passes over the missing colour, so the other two keep
the bag's even spread instead of degenerating into a coin flip.

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

### The Formulary - `proposed`

A notebook that starts blank and fills in as you *trigger* interactions - not as
you read about them. First tolerant virus, first hybrid, first antibody, first
in-the-dark clear, first outbreak survived. Each entry is written in the voice
of the era you were in when you found it, so the same discovery reads
differently in the cave and in the clean room.

This is what turns "there are interactions" into "I am finding the
interactions", and it costs almost nothing: a set of flags, a line of copy each.

## What is already in

| Shipped | What it does |
| --- | --- |
| Antibiotic resistance | Viruses that survive build resistance and mutate to another colour. The arms race the whole theme rests on. |
| Collateral sensitivity | A tolerant virus stops answering to its own colour and starts answering to an older one, cleared beside it. |
| Hybrid strains | Capped by the wrong colour too long, a virus combines into a colour no capsule is dealt in. Both parents cure it; either one alone wears it down. |
| Run modifiers | Outbreak, blackout, rationing, contaminated batch and quarantine, choosable together, each with a bound the gauntlet enforces. |
| Antibodies | Both parents in one cascade synthesise a compound that takes the strain and the ring around it. |
| The neck row | A row above the bottle. Filling the bottle is not a loss until capsules back up into the neck. |
| Apothecary Through Time | Five eras, five vessels, five physicians, five notes. |
| Daily challenge | One seeded bottle a day, the same for everyone. |
| Versus | Two bottles on one keyboard, trading garbage. |
| Offline play | Installs as a PWA and plays with the network off. |

## How an idea gets in

1. Someone opens an issue - one of the forms, or a blank one for a "what if".
2. It gets argued against the goal at the top of this page - does it *combine*,
   and can the player *answer* it?
3. If it survives, it lands here as `proposed`, then gets built behind the
   UltraGauntlet like everything else. A red stage means it is not ready,
   whatever the idea was.

Ideas are cheap and the rules are not. Anything on this page can be cut for
making the bottle worse to play.
