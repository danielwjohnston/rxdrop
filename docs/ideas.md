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

### Tolerance, and collateral sensitivity - `proposed`

A virus that has been sat under the *wrong* medicine builds tolerance to it.
Today that ends in a mutation. Instead, let tolerance cut both ways:

| Virus state | Its own colour | Its collateral colour |
| --- | --- | --- |
| Susceptible | 4 clears it | 4 clears it |
| Tolerant | 4 no longer clears it - it survives and sheds a stack | 4 clears it, and pays double |

This is real: it is called **collateral sensitivity**, and it is why antibiotic
cycling works. Resistance to one drug can *create* vulnerability to another.
The game teaches it by making the answer to a tolerant virus "go back to the
old medicine" rather than "bring more of the same".

It reads on the board because the resistance aura already exists - tint it
toward the colour that now kills it easily and the player learns the rule from
one look, without a tutorial.

*Why it might not work:* it makes a clear fail, and a clear that does not clear
is the most frustrating thing a puzzle game can do. It has to be signposted so
hard that it never feels like a bug.

### Hybrid viruses - `proposed`

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
through no fault the player can see. Two guardrails:

- A hybrid never forms where it cannot be reached - if capping it would bury it,
  it mutates the old way instead.
- The compound below is always obtainable, because any two-colour cascade makes
  one.

### Antibodies - `proposed`

The reward for a combination clear: an **antibody** with the hybrid's colour.
It does not need a line. It crosses the bottle and takes the hybrid out where it
stands, and clears the ring around it - the bonus for cleaning up a mess you let
sit too long.

This is the top of the skill ladder. Dr. Mario already rewards cascade
engineering with score; this rewards it with the only answer to the hardest
thing on the board.

## Axis 2 - what makes one run different from the next

Modifiers stack with everything above and with each other. The daily challenge
picks a seeded pair, which is what stops the daily from being "the same game at
a different level".

### Outbreak - `proposed`

Viruses replicate into adjacent empty cells on a timer. In exchange, capsules
deal twice as fast. More disease, more medicine - a real trade rather than a
punishment, and it turns the empty space you were saving into a liability.

*The tuning risk:* replication compounds, so it has to be capped - by generation
count, or by the virus needing two clear neighbours, or it eats the bottle.

### Blackout, and light therapy - `proposed`

The bottle goes dark. A light-therapy switch brings it back for a few seconds,
so you are playing and re-lighting at the same time. Clearing a run while the
lights are out is the achievement.

*Design note:* as written, this competes for the same hand that is playing the
game, which is the difference between tense and annoying. Better as a **held
key or a pedal** than a button you must remember to press - the memory load
should be "when do I spend the light", not "did I forget the light". And the
in-the-dark clear should be a badge, never the only way to win.

### Rationing - `proposed`

For a stretch, only two of the three colours are dealt. Every board state that
needed the third one has to wait, and the stack you build in the meantime is the
cost.

### Contaminated batch - `proposed`

Some capsules are inert - they stack, they fall, they clear nothing. Dumping
them somewhere harmless is a skill of its own, and it is exactly what a bad
supply chain feels like.

### Quarantine - `proposed`

A column is sealed off and refuses capsules until you clear beside it. The
bottle gets narrower, and the shape of the board becomes the puzzle.

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
