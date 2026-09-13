# RxDrop — Comprehensive Creative and Systems Direction

> Captured 11 September 2026, in the author's own words. This is the standing
> creative direction for the project: what RxDrop is trying to become, and why.
> It is not a build plan and nothing in it is a commitment to a schedule.
>
> `docs/ideas.md` is the working inbox - individual mechanics, each argued and
> marked `proposed`, `shipped` or `cut`. This page is the thing those arguments
> are measured against. Where the two disagree, this page says what we *want*
> and that page says what is *true*.
>
> A dated note on what has moved since, and an addendum carrying direction that
> arrived later, are at the bottom. The body is left as written; where the
> addendum contradicts it, the addendum wins.

## Project Identity

RxDrop began as a browser-based falling-capsule puzzle game in the broad
tradition of Dr. Mario, but the project is becoming something more distinct.

The strongest direction is not to compete by adding more isolated mechanics. It
is to build a coherent world in which the existing mechanics interact with one
another, visibly affect the treatment environment, and evolve across the history
of medicine.

The central design idea is:

**The player is not simply clearing colored pieces. The player is treating an
evolving biological problem inside a contained treatment system.**

Medication, resistance, mutation, hybridization, antibodies, biofilm, outbreaks,
quarantine, contamination and phototherapy should all feel like different parts
of the same system rather than a collection of unrelated modifiers.

The visual and audio presentation should reinforce that same idea.

RxDrop should increasingly feel like a medical puzzle game with its own identity
rather than merely a technically competent Dr. Mario clone.

## Chains and multi-line clears

The scoring rule follows the original Dr. Mario shape: solo score counts
viruses, and each additional virus destroyed during one capsule drop doubles
the payout, including viruses removed by cascade stages. The Dr. Mario manual
describes the virus-only scoring table:
https://www.digitpress.com/library/manuals/nes/drmario.txt

The Dr. Mario 64 rule adds garbage for chain clears in versus:
https://www.mariowiki.com/Dr._Mario_(game)

RxDrop keeps the cumulative virus payout and adds a visible chain bonus from
stage two onward, even when a cascade clears capsule halves but no virus. Two
or more simultaneous runs also earn a multi-line bonus, and versus sends
garbage for both simultaneous lines and later chain stages, in the spirit of
Dr. Mario 64.

## 1. The Bottle and the Fiction

The game should stop talking as though the visible playfield is literally a
patient.

It is clearly a bottle or vessel.

The cleanest fiction is that the playfield is an abstract treatment vessel
containing an infected biological culture or specimen.

The player is not physically operating inside a human body.

The player is manipulating medication and other therapies inside a contained
biological system.

The ordinary player-facing word can remain **bottle**, while the in-world
terminology can evolve between eras.

In earlier historical periods, people may understand the vessel only as a
preparation, medicinal container or mysterious representation of sickness.

As medicine advances, it becomes more recognizably a specimen jar, laboratory
culture vessel, treatment chamber, bioreactor or programmable biological system.

This gives the game a strong historical narrative without requiring exposition.

The same fundamental playfield is gradually reinterpreted as humanity's
understanding of disease changes.

The player sees the progression from:

- mysterious illness
- to contagion
- to organisms
- to microbial cultures
- to molecular mechanisms
- to programmable biological systems.

That creates a much stronger reason for the game's "Apothecary Through Time"
concept to exist.

## 2. Historical Progression Across Ten Eras

The game now has ten medical eras:

1. Protomedicine, before 3000 BCE.
2. Egyptian medicine, 2600 - 1000 BCE.
3. Hippocratic medicine, 450 BCE - 200 CE.
4. Bimaristan medicine, 800 - 1200.
5. Apothecary medicine, 1231 - 1600.
6. Plague medicine, 1619 - 1799.
7. Patent medicine, 1800 - 1906.
8. Antisepsis, 1867 - 1927.
9. Pharmaceutical medicine, 1928 - 1999.
10. Genomic medicine, 2000 - onward.

Those ten eras are useful structurally, especially because the Formulary
already stores historical observations by era.

However, five visual changes over an entire campaign were not enough to make
the historical progression feel rich.

The better architecture is to use the ten stable eras or chapters for gameplay
data and Formulary compatibility while preserving the finer layer of
**visual periods**.

These periods should not merely swap costumes.

The practitioner, vessel, environment, visual treatment effects, typography
accents, background objects and music should all evolve.

The history itself becomes part of the reward structure.

Every few levels, the game should feel as though the player has moved into
another moment in humanity's attempt to understand and control disease.

## 3. Historical Credibility Matters

The visual history should be evocative without being sloppy.

For example, the classic beaked plague-doctor image is strongly associated with
the Black Death in popular culture but belongs substantially later than 1348.

The project should avoid using iconic historical imagery centuries out of place
simply because audiences recognize it.

The goal is not museum-level reenactment.

The goal is a visually exciting but credible interpretation of medical history.

That distinction matters because the historical progression is becoming one of
RxDrop's defining aesthetic features.

## 4. Authored Sprite Art Should Replace the "Everything Procedural" Philosophy

The previous runtime-generated art approach is technically impressive, but
technical cleverness is not automatically visual personality.

The comparison that crystallized this was Mortal Kombat.

What made those characters memorable was not merely animation code.

It was the sense that actual authored imagery existed behind them.

RxDrop should therefore use a hybrid approach.

The bottle, pills, particles, glass effects, lighting, board geometry and many
gameplay effects can remain procedurally drawn.

But the practitioners, environmental details and personality-driven characters
should use authored sprite assets.

The practitioner needs to look like a character rather than an algorithm drawing
a person.

The viruses need expressions and poses.

Historical environments need distinctive silhouettes and props.

Canvas can still render everything.

The PWA can still work completely offline.

The sprite assets can simply be cached by the service worker and drawn with
`drawImage()`.

Procedural rendering remains useful as a fallback if an asset fails to load.

The emerging philosophy is:

> Procedural effects for gameplay clarity.
> Authored sprites for personality.
> Short authored animation loops where motion itself is part of the reward.

## 5. Sprite Animation Can Be AI-Assisted, but the Final Game Assets Should Be Controlled

Modern image and video tools can help generate movement concepts, reference
poses and animation ideas.

A useful pipeline is:

1. Create a canonical character design.
2. Create a clean reference or turnaround.
3. Generate or manually create several meaningful poses.
4. Use AI-generated motion as reference when useful.
5. Extract or redraw the strongest frames.
6. Clean silhouettes and colors.
7. Assemble those frames into a deterministic sprite atlas.

The important thing is that the shipped game should not depend on unpredictable
generated motion at runtime.

The player should see authored, controlled animations that are readable and
repeatable.

This approach combines the speed of AI-assisted ideation with the clarity of
traditional game sprites.

## 6. The Viruses Need Personalities

One of the things missing from the current game is the personality of the
classic virus characters.

The original Dr. Mario viruses were memorable because they did not just occupy
cells.

They taunted the player. They celebrated. They reacted when one of their own was
hurt.

That emotional feedback should return in an original RxDrop form.

RxDrop should have three primary strain mascots corresponding to the three base
medicine colors.

These must be original characters, not reproductions of Nintendo's virus
designs.

They should persist outside or beside the main bottle as a small **virus
theatre**.

Their behavior can be driven by actual gameplay events.

- At rest, they can idle, whisper, mock the practitioner, watch the bottle or
  bother one another.
- When the player misplaces a capsule, they can laugh.
- When an outbreak occurs, they can become excited.
- When a virus survives a treatment through resistance, the matching mascot can
  swagger or shrug.
- When a virus mutates, the mascot can briefly distort.
- When a hybrid forms, two strains can visually react to the combination.
- When an antibody is produced, the mascots should panic.
- When quarantine activates, a mascot can bang against imaginary containment.
- When the game ends badly, the surviving viruses can celebrate.
- When the player clears one of their color, the corresponding mascot should
  recoil, squash, grimace or briefly disappear before returning.

The animation should be tightly connected to actual game state rather than
random decoration.

That creates emotional causality.

The player does something. The disease reacts.

## 7. Virus Theatre Must Survive Mobile

The current virus tally disappears on smaller screens.

That should not happen with the new personality system.

The virus characters are becoming part of the game's feedback language.

On phones they can become smaller, more compact or repositioned, but they should
remain present.

The game should not sacrifice its characters merely because the viewport
shrinks.

Reduced-motion accessibility should still be respected.

In reduced-motion mode, the reactions can be abbreviated into pose changes or
expression swaps instead of animated loops.

## 8. Gameplay Mechanics Should Have Character Reactions

Every major mechanic can reinforce the virus personalities.

- Resistance should produce a visible "that didn't hurt" response.
- Collateral sensitivity should surprise the affected strain.
- Mutation should look unstable.
- Hybridization should visually combine traits or trigger a special hybrid
  reaction.
- Outbreak should look like gleeful multiplication.
- Antibodies should terrify the mascots.
- Quarantine should visibly frustrate them.
- Biofilm should give them somewhere to hide and become smug.
- Phototherapy should make them shield their eyes, recoil and panic.

This transforms abstract state changes into things the player can feel without
reading a HUD.

## 9. Music Should Evolve With Medical History

The soundtrack should not remain generic chiptune.

It should remain recognizably part of one game, but each visual period should
add the cultural or technological atmosphere of its era.

The requested prehistoric direction is especially useful as a model.

The goal is not to imitate "In-A-Gadda-Da-Vida."

The goal is to capture abstract qualities such as:

- primitive weight,
- a hypnotic repeating ostinato,
- slow modal movement,
- heavy tom-like percussion,
- a low drone,
- and a strange organ-like lead translated into the language of a puzzle-game
  soundtrack.

That gives the prehistoric stage a ritualistic and psychedelic feeling while
still functioning as game music.

As the campaign advances, the same general RxDrop musical DNA can evolve.

Ancient periods can suggest reed, lyre or plucked intervals.

Medieval or early scientific periods can use drones, bells and sustained
harmonics.

Patent-medicine periods can become theatrical, parlor-like or mechanical.

Industrial and germ-theory eras can introduce clockwork and electrical textures.

The antibiotic era can become cleaner and more electronic.

Molecular and genomic eras can become increasingly precise, sequenced and
synthetic.

The result should sound like one musical lineage evolving alongside medicine.

## 10. Danger Music Should Still Matter

The current game switches between calmer and more urgent music based on danger.

The historical soundtrack should not eliminate that system.

Instead, every period should have both a normal and danger expression of its
musical identity.

The danger state can increase rhythm, harmonic tension, percussion density or
timbral harshness without abandoning the era's motif.

That way the player still learns an important gameplay cue while the soundtrack
remains historically themed.

## 11. Phototherapy Should Replace Blackout

The existing blackout mechanic works mechanically but is thematically weak.

The bottle gets dark on a timer. The player holds a light control. The light
reservoir drains. Eventually the bottle becomes visible again.

That is essentially weather.

Nothing the player does during the blackout feels like medicine.

The correct complaint is:

> "I'm supposed to be treating the infection."

The solution is not to tune the blackout again.

The solution is to replace it with a treatment system.

That system is Phototherapy.

## 12. Biofilm Is the Correct Cause of Lost Visibility

The strongest contribution from the current design notes is biofilm.

The bottle does not randomly lose brightness.

The infection itself changes the environment.

Colonies produce a protective matrix that gradually clouds the treatment vessel
and makes organisms harder to see.

That matrix can also explain why treatment becomes less effective around
resistant organisms.

The bottle should therefore appear to silt up from the disease outward.

That means poor visibility becomes information.

A heavily infected row becomes visibly dirty.

A resistant colony can cloud its local environment more aggressively.

A hybrid strain can produce particularly dense contamination.

An outbreak can cause a sudden increase.

When medication is shrugged off, the biofilm can visibly surge.

The player can look at the bottle and understand that the organisms are
defending themselves.

## 13. Visibility Should Be Per Row

The entire bottle should not become uniformly dark.

Each row should maintain its own Clarity value.

Rows containing active organisms accumulate biofilm faster.

Rows that were recently cleared remain clearer.

The contamination can bleed slowly into nearby rows if that proves visually
useful.

This produces a much richer board.

One section can be almost clear while another is heavily obscured.

The bottom of the bottle may be difficult to read while the top remains
pristine.

A cluster of resistant organisms may visibly create its own dense region.

The game world becomes spatially meaningful.

## 14. Phototherapy Is a Second Treatment Layer

The player activates Phototherapy mode.

The physical medication puzzle remains visible.

The organisms remain in place.

The bottle does not disappear.

But the controls shift to a second layer made of therapeutic light.

Falling shapes made from light descend through the vessel.

Their geometry can be tetromino-like or based on an original four-cell polyomino
set.

The inspiration from Tetris is useful, but the final design should visually and
structurally belong to RxDrop.

These light cells do not collide with medicine.

They are photons.

They pass through capsules, viruses and the medication stack.

The physical board and light board coexist in the same vessel.

Medication occupies matter-space. Phototherapy occupies light-space.

## 15. A Completed Light Line Treats That Physical Row

This is one of the most important design rules.

A horizontal line completed in the light layer should administer therapy to the
same row of the physical bottle.

The relationship is literal.

Complete a light line across row twelve. Row twelve receives phototherapy. Its
biofilm breaks down. Its Clarity rises. The organisms in that row react. The
glass catches the treatment flash.

Complete multiple lines at once and a wider band of the culture is treated.

The player therefore chooses where the light goes.

Phototherapy is not a generic brightness refill.

It is targeted treatment.

## 16. Light Should Not Block Medication

Phototherapy must never physically clog the ordinary puzzle.

Light pieces occupy their own logical grid.

They can pass through the medication board.

Completed light lines disappear after administering treatment.

This keeps the therapy helpful rather than turning it into another form of
garbage.

## 17. Unused Light Should Dissipate

> **Superseded in play, 11 September 2026.** Built as written, and it was wrong:
> *"lights disappear before i get a chance to line up for the tetris... i'm not
> expecting the tetris to go away at all unless through gameplay clearance or
> turning light therapy off."* Light now stands until a line clears it or you
> leave the lamp, and you may stay as long as you keep playing. What stops the
> chamber being a permanent safe room is not a timer but the bottle: standing at
> the lamp places no capsules and cures nothing. Drowning the chamber ends the
> session. The section below is kept as written for the record.


Incomplete light pieces should not remain forever.

They should gradually lose coherence and fade away.

That prevents the player from stockpiling a huge phototherapy structure and
using the mode as a permanent safe room.

The visual effect can reinforce the fiction.

Unused light can scatter through the biofilm, flicker out, diffuse into the
vessel or be absorbed by dense contamination.

The rule becomes: **use the photons or lose them.**

## 18. The Cost of Phototherapy Is Attention

This is the most interesting gameplay trade in the design.

Entering Phototherapy should not pause the medication side.

The current medication capsule continues to fall.

The player simply stops steering it while manipulating the therapeutic light.

If it lands, it lands.

If the player spends too long treating the biofilm, the medication stack may
become less organized.

The choice therefore becomes:

> Do I continue administering medication while visibility worsens, or temporarily
> redirect my attention to phototherapy and accept worse capsule placement?

That is a medical triage problem expressed as puzzle gameplay.

It is far stronger than asking the player to remember to press a flashlight
button.

If full-speed unattended medication proves too punishing during testing, it can
be tuned.

Gravity might slow slightly during phototherapy.

The next capsule might wait briefly after the current one locks.

But the medication side should never completely freeze.

The fundamental exchange is: **Phototherapy buys information by costing
attention.**

## 19. Biofilm Should Return Because of Infection, Not Because of a Timer

Phototherapy does not permanently fix the bottle.

The organisms are still alive.

As they survive, replicate, resist treatment or hybridize, they begin rebuilding
the biofilm.

A susceptible organism can produce contamination slowly.

A resistant organism can generate more.

A failed treatment can trigger a local contamination burst.

A hybrid can generate especially dense material.

An outbreak can rapidly contaminate newly occupied areas.

Killing organisms reduces the pressure producing the biofilm.

This creates a natural feedback loop:

- viruses create biofilm;
- biofilm reduces information;
- phototherapy restores visibility;
- improved visibility helps medication placement;
- medication eliminates organisms;
- fewer organisms produce less biofilm.

Nothing in that loop is arbitrary.

## 20. Phototherapy Can Eventually Affect More Than Visibility

Visibility should be the first and most understandable purpose.

But the long-term design can allow light to interact with other disease systems.

Phototherapy could temporarily weaken the protective state of resistant
organisms.

It could make collateral sensitivity more obvious.

It could expose the parent colors of hybrid strains.

It could amplify an antibody reaction in a freshly illuminated row.

It could suppress biofilm production for a short period.

It could interact with future pathogen behaviors.

The key principle is:

> Medication treats the organism.
> Phototherapy disrupts the protective environment around it.
> Combination treatment creates opportunities that neither therapy creates alone.

## 21. Visibility Must Never Become an Accessibility Trap

The biofilm system can obscure information, but it must never make the game
unknowable.

The falling medication capsule must remain visible.

Its relevant destination must remain readable.

Important shapes and color identity need a hard minimum level of contrast.

Biofilm accumulation should plateau.

Rows should never become completely black.

Phototherapy should always be available and capable of improving Clarity.

No organism should become mathematically impossible to treat because of
contamination.

The player should be able to win without ever using Phototherapy.

Ignoring it should mean:

> "I am choosing to operate with poor information."

It should never mean:

> "The game has removed my ability to play."

## 22. The Virus Mascots Should Participate in Phototherapy

Biofilm gives the virus theatre a particularly strong role.

When the bottle becomes contaminated, the mascots can look increasingly pleased.

They can hide behind haze. They can wipe condensation onto the glass. They can
lounge in the contamination. They can peer through it. They can mock the
practitioner.

When Phototherapy is activated, they should immediately notice.

They squint. They shield their eyes. They recoil as a completed row approaches.

A successful treatment line should create a direct reaction.

The affected strain can flinch. Nearby strains can panic. A multi-line treatment
can stun all three.

If the player enters Phototherapy and accomplishes nothing, the mascots can
laugh.

If the player executes a major treatment, they should look legitimately
frightened.

This turns the disease into a cast of antagonists instead of colored board
cells.

## 23. Phototherapy Should Be Visually Spectacular

Biofilm should not be represented by a simple transparent black rectangle.

It should feel like material accumulating inside glass.

Possible visual ingredients include suspended particles, cloudy colonies,
filaments, strands of matrix, bubbles, oily refraction, localized haze and
visible accumulation around organisms.

Phototherapy should produce a strong visual response.

A completed line can send a bright horizontal treatment sweep through the
vessel.

Light scatters through the contamination. Organisms fluoresce. Particles break
apart. Glass catches the flash. Colors become vivid again. The practitioner
reacts. The virus mascots recoil.

A large multi-line treatment can temporarily make the vessel look almost
sterilized.

That creates a powerful before-and-after reward.

## 24. Phototherapy Should Evolve Through the Historical Timeline

The underlying mechanic can remain constant while humanity's interpretation of
light changes.

In prehistoric stages, the treatment might look like sunlight, flame, glowing
mineral pigments or ritual illumination.

In ancient stages, it can use polished reflectors, lamps and symbolic geometry.

Classical medicine can introduce ordered sunlight and balanced forms.

The Islamic Golden Age can bring lenses, optics, reflection and geometric light
patterns.

Early-modern stages can use concentrated lantern light.

Patent-medicine stages can become theatrical, with polished brass, electrical
demonstrations and questionable miracle devices.

Germ-theory stages can become experimental and clinical.

The twentieth century can introduce UV lamps and recognizable phototherapy
hardware.

Molecular medicine can use fluorescence and laser-like illumination.

Genomic medicine can use programmable wavelengths and tightly targeted
photodynamic treatment.

Future periods can suggest cellular-scale emitters or programmable photonic
fields.

The player is therefore performing the same basic mechanic while watching
humanity gradually understand what light actually does.

## 25. Phototherapy Should Affect the Music Too

Entering Phototherapy should not start an unrelated minigame track.

The current era's music should transform.

Rhythmic identity should remain recognizable, but additional tones, filters,
drones or harmonics can enter.

The prehistoric treatment state might gain an eerie overtone or ritual pulse.

Ancient light treatment can brighten with plucked intervals.

Medieval periods can introduce bells or sustained harmonic drones.

Industrial treatment can add electrical hum or mechanical rhythm.

Pharmaceutical stages can become cleaner and synthetic.

Genomic stages can become highly sequenced and precise.

A successful light line can briefly brighten or resolve the harmony.

A four-line treatment should have a major musical response.

The sound design should make successful therapy feel physical.

## 26. Formulary and Discovery Opportunities

The Formulary is one of the strongest existing systems because it turns
mechanical interactions into discoveries.

Phototherapy gives it much richer material.

The current "worked blind" discovery can remain in some form because
successfully treating something under poor visibility is still interesting.

But a more meaningful discovery can now exist for deliberately illuminating and
then curing a row.

That could become a named observation such as:

- Combination Therapy.
- Photoactivated Treatment.
- See and Treat.
- Target Acquired.

A more advanced observation could require destroying a tolerant or hybrid strain
in a freshly illuminated region.

The historical Formulary notes can then describe the same phenomenon differently
depending on the era in which it is discovered.

That fits the game's existing philosophy beautifully.

## 27. The Game Should Tell the History of Medicine Through Interpretation

The historical practitioners should not all know the same truth while wearing
different clothes.

The player knows the rules.

The characters should understand them according to the medicine of their period.

A prehistoric healer may describe contamination in spiritual or elemental terms.

An ancient physician may describe imbalance or corrupted material.

A medieval practitioner may interpret the same observation differently.

A germ-theory physician can finally identify microorganisms.

A modern researcher can discuss matrix formation, resistance and photodynamic
effects directly.

The Formulary therefore becomes a historical record of humanity gradually
describing the same underlying phenomena with increasing accuracy.

That is a far richer narrative than simply changing backgrounds every four
levels.

## 28. Originality and Inspiration Boundaries

The project can openly draw inspiration from major puzzle and arcade games
without copying their protected expression.

The three virus mascots should capture the idea of taunting enemies but must be
original designs.

The light puzzle can use polyomino geometry without reproducing Tetris
presentation, branding or exact artistic language.

The sprite philosophy can take inspiration from Mortal Kombat's emphasis on
authored character imagery without imitating its fighters or digitized actors.

The prehistoric music can carry psychedelic, hypnotic, organ-heavy and ritual-
rock qualities without reproducing the melody or riff from "In-A-Gadda-Da-Vida."

The goal is not to hide influences.

The goal is to metabolize them into something that unmistakably belongs to
RxDrop.

## 29. Current Visual-Overhaul Branch

A dedicated branch currently exists for this work:

`openai/medical-eras-visual-overhaul`

The branch was created from the main game specifically so the new direction
could be explored without destabilizing the working build.

Several foundational pieces already exist there.

A new sprite-art loader has been added.

A medical-era sprite atlas has been created.

A new visual-period system has been started to support the finer historical
progression.

The current atlas contains authored practitioner and environment art intended to
replace or supplement the procedural character system.

The loader is designed to fall back gracefully if the sprite asset is
unavailable.

However, the branch should not yet be considered a completed visual overhaul.

The new art and period data are not fully integrated into the existing renderer,
practitioner logic, game UI, music or service-worker cache.

The primary game files still largely reflect the main branch.

The branch is currently infrastructure and direction, not the finished
implementation.

## 30. Technical Integration Still Needed

The visual-period system must be wired into the existing era architecture
without breaking saved Formulary data.

The renderer must learn to use the new period presentation.

Practitioner rendering should prefer the authored sprites while retaining the
procedural fallback.

The environment artwork needs to be connected to the game canvas or surrounding
presentation.

The service worker needs to cache the new JavaScript and sprite assets.

The PWA cache version needs to be bumped.

Documentation needs to stop claiming that all visuals are drawn entirely at
runtime.

The virus theatre requires its own presentation state and animation logic.

Clear events should expose enough information to identify which virus colors
were actually affected so the correct mascot can react.

The current blackout implementation must eventually be replaced by the new
biofilm/Phototherapy system.

That change will require updates to constants, state management, renderer
behavior, input handling, modifiers, Formulary text, audio and automated tests.

The current game assumes exactly one actively controlled falling piece, so
Phototherapy will require a deliberate architecture for the second light-piece
controller.

This is a meaningful feature, but it does not require rewriting the whole game.

The board and rendering layers are already separated enough to make the change
practical.

## 31. Testing Philosophy Should Remain

One of the strongest parts of RxDrop's current architecture is that modifiers
are required to have a bound that prevents them from creating impossible game
states.

That philosophy should stay.

Phototherapy needs explicit survivability guarantees.

Biofilm must plateau.

The capsule must remain readable enough to place.

Light pieces must always be available.

Phototherapy must always have a route to restoring visibility.

The player must still be able to finish a level without using it.

Any interaction involving resistance, hybrids or contamination must preserve at
least one answer.

The automated gauntlet should eventually test those guarantees rather than
relying on design intention.

## 32. The Larger Art Direction

The game should feel like a journey through humanity's relationship with
disease.

At the beginning, medicine is mysterious, ritualistic and approximate.

The vessel feels primitive. The healer does not fully understand what is
happening. The soundtrack is earthy and hypnotic. The organisms feel almost
supernatural.

As history progresses, the visuals become more observational.

Glass improves. Tools become more precise. Practitioners gain instruments. The
environments become laboratories. The soundtrack becomes increasingly structured
and technological.

By the end, the vessel can feel almost computational.

The practitioner has become a precision researcher. The organisms are understood
at molecular scale. The light treatment is programmable.

The player has mechanically been doing variations of the same thing all along,
but the civilization surrounding the puzzle has learned what those actions mean.

That is the emotional arc.

## 33. The Core Design Philosophy Going Forward

RxDrop is strongest when a new mechanic changes the meaning of an existing
mechanic.

Resistance should change how color matching works.

Collateral sensitivity should make the "wrong" medicine useful.

Hybridization should make cascades chemically meaningful.

Antibodies should reward mastery of those relationships.

Outbreak should make empty space dangerous.

Rationing should affect resistance.

Biofilm should make surviving infection degrade information.

Phototherapy should restore that information by costing player attention.

The virus theatre should turn those systems into visible personalities.

Historical progression should reinterpret those systems through changing medical
understanding.

The music should reinterpret them emotionally.

The art should make them memorable.

The game should therefore avoid accumulating disconnected "features."

Every new mechanic should ideally plug into several existing systems.

## 34. The Emerging RxDrop Identity

The project is becoming:

- A falling-capsule puzzle game about treating evolving organisms.
- A history-of-medicine game told through mechanics rather than exposition.
- A game where resistance and mutation change how colors behave.
- A game where disease can alter the treatment environment.
- A game where light itself becomes a second therapeutic puzzle.
- A game where pathogens have personalities and visibly respond to treatment.
- A game whose practitioner, vessel, environment and music evolve through
  centuries of medical history.
- A game where the same phenomenon can be interpreted differently depending on
  when humanity encounters it.
- A game where the visual spectacle is not separated from the mechanics.

The eventual player experience should feel less like:

> "Here is another Dr. Mario clone with more systems."

And more like:

> "I am managing an evolving infection in a strange treatment vessel while the
> entire history of medicine grows up around me."

That is the direction that feels worth pursuing.

## Final North Star

The bottle is not simply a board.

It is the place where every system meets.

The infection lives there.

The medication enters there.

Resistance emerges there.

Hybrids form there.

Biofilm spreads there.

Phototherapy clears it.

Antibodies attack through it.

The viruses perform around it.

The practitioner observes it.

History changes how humanity understands it.

The music changes how the player feels about it.

And the art should make every one of those things visible.

**RxDrop should feel like a living treatment system, not a stack of puzzle
mechanics.**

---

## Where this stands — 11 September 2026

Appended when the direction above was captured, so the page does not silently go
stale. The body is the direction; this is the reconciliation. Update it, do not
edit the body.

**Sections 11-25 (Phototherapy) are built and on `main`.** The blackout is cut.
The bottle silts up per row, worst where the disease is; the light chamber is a
second falling-piece game whose completed line lights that row of the patient;
light passes through the stack and dissipates unused. Six of the bounds in
section 21 are enforced by the UltraGauntlet rather than by intention, which is
what section 31 asks for.

Two places the build had to depart from the direction, both because measurement
said so, and both written up in `docs/ideas.md`:

- **Section 18's cost.** "The capsule keeps falling, unsteered" was tried and is
  a trap rather than a cost: every abandoned capsule lands in the spawn column,
  and eight visits top the bottle out. Going to the lamp now commits the dose
  where it stands and holds the next deal. The triage question is unchanged.
- **A cooldown the direction does not mention.** With the fog at its ceiling the
  case for going to the lamp is always true, so the playtest bot lived in the
  chamber 95% of a run. The lamp now rests between sessions.

**Section 26's discovery shipped** as *Light, delivered*.

**Section 17 was cut in play** &mdash; see the note under it. Light does not
dissipate. Three more things came back from the same session and are fixed:
light was hanging in mid-air where a faded piece had been holding it up (a real
defect &mdash; decay removed cells and nothing settled into the hole), the fog
was too thin at 18% visibility to make the lamp worth its cost and now floors at
7%, and the report that *"the medicine keeps coming while in light therapy
mode"* turned out to be the overhaul branch's build rather than this one, which
commits the dose and holds the next deal.

**Sonotherapy** - sound as a third therapy, breaking the membrane the way light
cuts the biofilm - is filed `proposed` in `docs/ideas.md`. It is the clearest
expression of section 33 on the page, and it is blocked on the audio engine
having no transport rather than on a decision.

**Section 29 is out of date.** The `openai/medical-eras-visual-overhaul` branch
has moved well past "infrastructure and direction": it now carries `periods.js`,
`music.js`, `virus-theatre.js`, sprite atlases for the eras and the mascots, and
its own `phototherapy.js` and `sonic-therapy.js`. It also predates the
phototherapy that shipped and deletes `src/light.js`, so the two are parallel
implementations of the same idea and reconciling them is a real piece of work,
not a merge. Nobody should assume that branch and `main` agree.

Not yet started: sections 1-10 (the finer visual periods, authored sprites, the
virus theatre, music per period) and sections 27, 32.

---

## Addendum — 12 September 2026

Direction that arrived after the body above was captured. Kept separate from it
rather than edited in, so the original stays readable as what was written on the
day. Where this contradicts the body, this wins.

### The frame is a laboratory, and every bottle is a sample

> "In my mind the bottles are samples, and the different loads and their
> behaviour are each kind of contagion that must be researched. We work on this
> in a lab, via bottles and petri dishes and whatever makes sense narratively
> that we can then work a sensible new-classic mechanic onto."

This sharpens section 1 rather than replacing it, and it is worth stating
plainly because it settles several things at once:

- **Why there are levels.** Each is a different sample, a different load, a
  different contagion. You are not fighting one disease through twenty rooms;
  you are working a caseload.
- **Why the formulary exists at all.** A researcher keeps a notebook. The
  notebook is not a UI convenience, it is the thing the job produces.
- **Why the player replays.** Research is repetition with variation. A daily
  challenge is the same sample sent to every lab in the world on the same day,
  which is a genuinely good reason for it to exist.
- **Why the practitioner changes but the work does not.** The bench is the
  constant. Ochre bowl, apothecary's jar, culture vessel, bioreactor - the
  vessel changes and the question does not.

It also gives the lamp its footing. Putting a sample under the light and holding
everything else still is exactly what a bench does, and it is why the light
chamber freezing the disease reads as correct rather than as a convenience.

The player-facing word stays **bottle**. The lab is the frame around it, not a
new noun to learn.

### The art style is the timeline

Thirty style explorations were produced across three sheets - game-native
(pixel through low-poly 3D), illustration and historical technique, and physical
through photoreal - each showing the same five practitioners.

**The finding: sheet two's rows are themselves a chronology.** Illuminated
manuscript, woodcut engraving, Victorian newspaper, pulp advertising,
mid-century editorial. That is the history of *print*, running alongside the
history of medicine, and they are the same timeline. Patent medicine **is** pulp
advertising. Germ theory **is** the mid-century editorial diagram.

So the direction is not to pick a row and apply it to eleven periods. It is to
walk **down the column** as the ladder advances: the medium changes with the era.
That is a far stronger signal than a costume change, and it is what section 2
is asking for when it says the periods must not merely swap costumes. How we
*depicted* medicine changed because how we *understood* it changed - which is
this game's whole thesis, rendered rather than narrated.

**Sheet three's lower half is wrong for this game.** Cinematic, ultra-photo and
futuristic HDR fight the product they would sit in: the bottle, capsules and
viruses are procedurally drawn shapes, and a photoreal portrait beside them
reads as two different games. The upper half - claymation, felt, carved wood,
porcelain - is *stylised physical* and could work; porcelain in particular sells
"specimen jar". But those say craft object, not medical history.

**Sheet one is the safe answer and should be resisted.** Pixel art survives small
sizes better than anything and is the cheapest to produce, but it says "retro
game" rather than "nine centuries of medicine", which flattens the one thing
that makes this project distinct. The 8-bit → 16-bit → 3D progression is a
chronology too, of *games* - a clever joke that undercuts the fiction instead of
serving it.

#### The constraint that decides it, and it is not taste

In game the practitioner renders at about **130 pixels**, in a side panel, and
smaller on a phone. The exploration sheets show them at roughly double that.
Woodcut engraving and illuminated manuscript are detail-dense and turn to grey
smudge at portrait size. Of sheet two, **ligne claire and comic book ink**
survive small sizes best: clean outlines, flat fills, high contrast.

**Nothing should be commissioned before it has been seen at 130px against the
real bottle.** That test is cheap and it is the only one that matters.

#### Consistency is the risk

Ten media across ten periods can read as ten different games. What holds
it together has to be decided up front and enforced: one palette system (the era
tints already exist and already do this job), one framing and silhouette rule,
one canvas treatment. Section 9 already says the soundtrack must remain
"recognizably part of one game" - the art needs the same sentence and the same
discipline.

### Historical credibility: two resolved instances

Section 3 warns against iconic imagery placed centuries out of position. Both
of the following are in the current work rather than hypothetical, and both are
cheap to fix now and expensive after thirty assets exist.

**The plague mask now sits in a band labelled 1619–1799.** The beaked costume is
documented from the 1600s - roughly three centuries after the Black Death it is
popularly attached to. The band's opening date and its practitioner now agree;
the historical mismatch is resolved in `src/eras.js` and the practitioner
sprites.

**The paleolithic war bonnet has been removed.** The rendered sprites use
ochre, hide, bone, antler, shell and cordage instead of Plains regalia. That
keeps a living culture's ceremonial dress out of a prehistoric shorthand and
uses real paleolithic material culture, which is more distinctive anyway.
