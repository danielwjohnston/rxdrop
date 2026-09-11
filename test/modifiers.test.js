import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MODIFIERS,
  MODIFIER_IDS,
  describeModifiers,
  normaliseModifiers,
  outbreakCeiling,
  outbreakTargets,
  quarantineColumn,
  rationedOut,
} from '../src/modifiers.js';
import { Board, cell } from '../src/board.js';
import { Game, PHASE } from '../src/game.js';
import { dailyModifiers, dailySeed, dailySetup } from '../src/daily.js';
import { createRng } from '../src/rng.js';
import { fits, createPill, hardDropPosition, pillCells } from '../src/pill.js';
import {
  COLORS,
  COLOR_COUNT,
  CONTAMINATION_EVERY,
  FOG_MAX,
  LIGHT_SESSION,
  PILL,
  QUARANTINE_MAX,
  RATION_SPELL,
  SPAWN_X,
  VIRUS,
} from '../src/constants.js';

const step = (game, ms, dt = 16) => {
  for (let t = 0; t < ms; t += dt) game.update(dt);
};

describe('the modifier set', () => {
  it('is declarative, complete, and says what it cannot do', () => {
    for (const mod of MODIFIERS) {
      assert.match(mod.id, /^[a-z]+$/, `${mod.id} is not a plain id`);
      assert.ok(mod.name.length > 0);
      assert.ok(mod.icon.length > 0, `${mod.id} has no icon`);
      assert.ok(mod.blurb.length > 20, `${mod.id} blurb is too thin`);
      assert.ok(mod.detail.length > 60, `${mod.id} detail is too thin`);
      // The contraindication, in writing. A modifier that cannot state why it
      // leaves a virus answerable has no business being in the bottle.
      assert.ok(mod.bound.length > 40, `${mod.id} does not state its bound`);
    }
    assert.equal(new Set(MODIFIER_IDS).size, MODIFIERS.length, 'ids must be unique');
  });

  it('normalises anything the caller hands it', () => {
    assert.deepEqual(normaliseModifiers(null), []);
    assert.deepEqual(normaliseModifiers('outbreak'), ['outbreak']);
    assert.deepEqual(normaliseModifiers(['nonsense']), []);
    assert.deepEqual(normaliseModifiers(['outbreak', 'outbreak']), ['outbreak']);
    // Declaration order, not argument order, so two runs with the same
    // modifiers always describe themselves the same way.
    assert.deepEqual(
      normaliseModifiers(['quarantine', 'outbreak']),
      normaliseModifiers(['outbreak', 'quarantine']),
    );
  });

  it('describes a set in words', () => {
    assert.equal(describeModifiers([]), 'Standard');
    assert.equal(describeModifiers(['outbreak']), 'Outbreak');
    assert.match(describeModifiers(['outbreak', 'blackout']), / \+ /);
  });
});

describe('outbreak', () => {
  const seeded = () => {
    const board = new Board();
    const floor = board.height - 1;
    board.set(3, floor, cell(COLORS.RED, VIRUS, null));
    return { board, floor };
  };

  it('spreads a virus into an empty cell beside it', () => {
    const { board, floor } = seeded();
    const picks = outbreakTargets(board, createRng(1), 4, 4);
    assert.equal(picks.length, 1);
    assert.equal(picks[0].color, COLORS.RED);
    assert.equal(Math.abs(picks[0].x - 3) + Math.abs(picks[0].y - floor), 1);
  });

  it('never spreads above the virus ceiling', () => {
    const board = new Board();
    board.set(3, 6, cell(COLORS.RED, VIRUS, null));
    for (let seed = 0; seed < 50; seed += 1) {
      for (const pick of outbreakTargets(board, createRng(seed), 4, 6)) {
        assert.ok(pick.y >= 6, `spread to row ${pick.y}, above the ceiling`);
      }
    }
  });

  it('never spreads the same virus twice', () => {
    const { board } = seeded();
    board.get(3, board.height - 1).spread = true;
    assert.deepEqual(outbreakTargets(board, createRng(1), 4, 4), []);
  });

  it('caps how far a level can grow', () => {
    assert.ok(outbreakCeiling(10) > 10, 'an outbreak should be able to grow');
    assert.ok(outbreakCeiling(10) < 20, 'but not without limit');
  });

  it('holds the level to its ceiling however long the game runs', () => {
    const game = new Game({ level: 6, speed: 'LOW', seed: 11, modifiers: ['outbreak'] });
    const cap = game.outbreakCap;
    for (let i = 0; i < 400; i += 1) {
      game.pillsPlaced += 1;
      game.tickOutbreak();
      game.spreading = [];
      assert.ok(game.virusesLeft <= cap, `grew to ${game.virusesLeft}, past ${cap}`);
    }
  });

  it('pays for the pressure with faster gravity', () => {
    const plain = new Game({ level: 3, speed: 'LOW', seed: 4 });
    const fast = new Game({ level: 3, speed: 'LOW', seed: 4, modifiers: ['outbreak'] });
    assert.ok(fast.dropInterval < plain.dropInterval, 'outbreak should deal faster');
    // And never faster than a hand can steer, which is the floor a held hurry
    // is already held to.
    assert.ok(fast.dropInterval >= 60, `${fast.dropInterval}ms a row outruns a hand`);
  });
});

describe('phototherapy: the fog, and the light you make to cut it', () => {
  const foggy = (options = {}) => new Game({
    level: 6, speed: 'LOW', seed: 9, modifiers: ['phototherapy'], ...options,
  });

  it('silts up row by row, worst where the disease is', () => {
    // Not a global dimmer. The bottle clouds where the colonies are, which is
    // what turns the dark from noise into information.
    const game = foggy();
    for (let t = 0; t < 20000; t += 16) game.updateLight(16);
    const withViruses = [];
    const without = [];
    for (let y = 0; y < game.height; y += 1) {
      let viruses = 0;
      for (let x = 0; x < game.width; x += 1) {
        if (game.board.get(x, y)?.type === VIRUS) viruses += 1;
      }
      (viruses > 0 ? withViruses : without).push(game.fog[y]);
    }
    assert.ok(withViruses.some((f) => f > 0.1), 'rows with viruses should have clouded');
    assert.ok(without.every((f) => f === 0), 'a row with no disease in it should stay clear');
  });

  it('plateaus rather than compounding to nothing', () => {
    // The bound. Ignore the lamp for a whole run and the bottle is hard to
    // read, never unplayable.
    const game = foggy();
    for (let t = 0; t < 600000; t += 100) game.updateLight(100);
    assert.ok(Math.max(...game.fog) <= FOG_MAX, 'the fog went past its ceiling');
    assert.ok(game.visibilityAt(game.height - 1) >= 1 - FOG_MAX, 'a row went fully black');
  });

  it('does nothing at all when the modifier is off', () => {
    const plain = new Game({ level: 6, speed: 'LOW', seed: 9 });
    for (let t = 0; t < 30000; t += 16) plain.updateLight(16);
    assert.ok(plain.fog.every((f) => f === 0));
    assert.equal(plain.visibilityAt(5), 1);
    assert.equal(plain.enterLight(), false, 'there is no chamber without the modifier');
  });

  it('going to the lamp suspends the bench: the dose waits for you', () => {
    // Everything is held while the sample is under the light. Two earlier rules
    // died here: letting the capsule fall unsteered dumped every one into the
    // spawn column, and committing it on the way in did the same thing more
    // slowly once the lamp became free to flick on and off.
    const game = foggy();
    game.update(200);
    const placed = game.pillsPlaced;
    const held = { ...game.pill };
    assert.ok(game.pill, 'there should be a dose in hand to suspend');

    assert.equal(game.enterLight(), true);
    assert.ok(game.chamber.piece, 'the chamber should deal a piece');
    assert.deepEqual({ ...game.pill }, held, 'the dose should be exactly where it was');

    // Steering drives the light, not the medicine.
    const lightColumn = game.chamber.piece.x;
    const moved = game.move(-1);
    assert.equal(game.chamber.piece.x, moved ? lightColumn - 1 : lightColumn,
      'left should have driven the light');
    assert.deepEqual({ ...game.pill }, held, 'and left the dose alone');

    for (let t = 0; t < 8000; t += 16) {
      game.update(16);
      if (game.chamber) game.chamber.grid.fill(null);
    }
    assert.deepEqual({ ...game.pill }, held, 'the dose should not have fallen while you were away');
    assert.equal(game.pillsPlaced, placed, 'and nothing should have been placed');

    // And it is yours again the moment you come back.
    game.leaveLight('done');
    assert.deepEqual({ ...game.pill }, held, 'the dose should still be there');
    for (let t = 0; t < 4000 && game.pillsPlaced === placed
      && (game.pill?.y ?? held.y) <= held.y; t += 16) game.update(16);
    assert.ok(
      (game.pill && game.pill.y > held.y) || game.pillsPlaced > placed,
      'the bench should start moving again once the lamp is off',
    );
  });

  it('the lamp can be flicked on and off without costing the bottle', () => {
    // The failure this closes, caught by the gauntlet: entering used to commit
    // the dose where it stood, so six visits stacked six capsules in the spawn
    // column and ended the run.
    const game = foggy();
    game.update(200);
    for (let i = 0; i < 20; i += 1) {
      assert.equal(game.enterLight(), true, `visit ${i}: the lamp refused to open`);
      game.update(64);
      game.leaveLight('done');
      assert.equal(game.isOver, false, `visit ${i}: toggling the lamp ended the run`);
    }
    assert.ok(game.pillsPlaced <= 1, 'toggling should not have placed capsules');
  });

  it('a line scrubs the lowest dirty row, wherever the line was made', () => {
    // The rule that makes the lamp legible. A tetromino line completes at the
    // floor of the WELL, which has nothing to do with which part of the sample
    // needs treating - so the line is not a coordinate, it is a dose, and the
    // bottle cleans from the bottom up.
    const game = foggy();
    game.fog = game.fog.map(() => 0.8);
    game.enterLight();

    game.scrubFilm(1);
    assert.equal(game.fog[16], 0, 'the lowest row should have been scrubbed');
    assert.equal(game.fog[15], 0.8, 'and nothing above it touched yet');

    game.scrubFilm(1);
    assert.equal(game.fog[15], 0, 'the next one up goes next');
    assert.equal(game.fog[14], 0.8);
  });

  it('four lines at once scrub four rows, still from the bottom', () => {
    const game = foggy();
    game.fog = game.fog.map(() => 0.8);
    game.enterLight();
    game.scrubFilm(4);
    for (const y of [13, 14, 15, 16]) assert.equal(game.fog[y], 0, `row ${y} should be clean`);
    assert.equal(game.fog[12], 0.8, 'and the fifth row up left alone');
  });

  it('enough lines sterilise the sample, and it says so', () => {
    const game = foggy();
    game.fog = game.fog.map(() => 0.8);
    game.enterLight();
    game.drainEvents();
    game.scrubFilm(game.height);
    assert.ok(game.fog.every((f) => f === 0), 'every row should be clean');
    assert.equal(game.lowestFilmedRow, -1);
    assert.ok(game.drainEvents().some((e) => e.type === 'sterile'), 'it should announce a sterile sample');
  });

  it('holds the disease while the lamp is on', () => {
    // Under the light you have stopped treating and started looking. Nothing
    // grows, nothing thickens: the cost of the lamp is progress, not ground.
    const game = foggy();
    for (let t = 0; t < 20000; t += 16) game.updateLight(16);
    const fogged = [...game.fog];
    assert.ok(Math.max(...fogged) > 0.1, 'the sample should have filmed over first');

    game.enterLight();
    // Keep the well clear so the session is not cut short by flooding it: this
    // is a test about what the film does while the lamp is on, and being thrown
    // out of the chamber ends that.
    let held = 0;
    for (let t = 0; t < 30000 && game.inLight; t += 16) {
      game.updateLight(16);
      if (game.chamber) game.chamber.grid.fill(null);
      held += 16;
    }
    assert.ok(held > 20000, `the lamp only stayed on for ${held}ms`);
    // Only scrubbing may have changed it, never growth.
    for (let y = 0; y < game.height; y += 1) {
      assert.ok(game.fog[y] <= fogged[y] + 1e-9, `row ${y} filmed over while the lamp was on`);
    }

    // And it resumes the moment you go back to the bench.
    game.leaveLight('done');
    for (let t = 0; t < 5000; t += 16) game.updateLight(16);
    assert.ok(Math.max(...game.fog) > Math.max(...fogged) - 1e-9, 'the film should resume once the lamp is off');
  });

  it('treating the patient clears the air; a shrug fouls it', () => {
    const game = foggy();
    const floor = game.height - 1;
    game.fog[floor] = 0.5;
    game.outcome = { cleared: [{ x: 3, y: floor, type: VIRUS }], collateral: [] };
    game.resistedCells = [];
    game.board.forEachCell((c, x, y) => game.board.set(x, y, null));
    const relieved = Math.max(0, 0.5 - 0.22);
    for (const { y, type } of game.outcome.cleared) {
      if (type === VIRUS) game.fog[y] = Math.max(0, game.fog[y] - 0.22);
    }
    assert.ok(Math.abs(game.fog[floor] - relieved) < 1e-9, 'a kill should clear its row');
  });

  it('the chamber is never a dead end: flooding it ends the session, not the run', () => {
    // Light used to fade, so a packed chamber cleared itself. It no longer
    // fades - it stands until you clear it or leave - so the bound is reached
    // the other way round: drown the chamber and you are handed back to the
    // bottle. Either way it costs the session and never the run.
    const game = foggy();
    game.enterLight();
    for (let i = 0; i < game.chamber.grid.length; i += 1) {
      game.chamber.grid[i] = { lit: true };
    }
    game.chamber.piece = null;
    assert.equal(game.chamber.saturated, true);

    const regrowth = game.filmRegrowth;
    game.updateLight(16);
    assert.equal(game.inLight, false, 'a flooded chamber should end the session');
    assert.equal(game.isOver, false, 'and never the run');
    // A failed attempt costs you the film coming back harder, never the lamp.
    assert.ok(game.filmRegrowth > regrowth, 'a flood should make the film regrow faster');
    assert.equal(game.lampReady, true, 'the lamp should be usable again at once');
    assert.equal(game.enterLight(), true, 'and open straight away');
  });

  it('light stands until it is cleared, however long you are in there', () => {
    // Reported from play: "lights disappear before i get a chance to line up
    // for the tetris". They do not any more. Lay one piece, wait out three
    // times what the old decay was, and it is exactly where you left it.
    const game = foggy();
    game.enterLight();
    const chamber = game.chamber;
    while (chamber.spawns < 2) chamber.step();
    const laid = chamber.grid.filter(Boolean).length;
    assert.ok(laid > 0, 'a piece should have locked');

    // Hold the fall clock at zero so nothing new is dealt: this is a test about
    // what happens to light that is ALREADY down, and pieces landing on top of
    // it would only muddy the count.
    for (let t = 0; t < 45000; t += 16) {
      chamber.fallTimer = 0;
      chamber.update(16);
    }
    assert.equal(chamber.grid.filter(Boolean).length, laid, 'the light faded away');
    assert.equal(chamber.spawns, 2, 'nothing new should have been dealt');
  });

  it('leaves on its own with the timer variant, and waits with the manual one', () => {
    const timed = foggy({ lightExit: 'timer' });
    timed.enterLight();
    for (let t = 0; t < LIGHT_SESSION + 500; t += 16) timed.updateLight(16);
    assert.equal(timed.inLight, false, 'the timer variant should end the session');

    // The manual variant waits to be told - but only for a player who is
    // actually playing. Light no longer fades, so an abandoned chamber fills up
    // and floods; clearing it as you go is what buys you the time.
    const manual = foggy({ lightExit: 'manual' });
    manual.enterLight();
    for (let t = 0; t < LIGHT_SESSION * 3; t += 16) {
      manual.updateLight(16);
      if (manual.chamber) manual.chamber.grid.fill(null);
    }
    assert.equal(manual.inLight, true, 'the manual variant should wait to be told');
    manual.toggleLight();
    assert.equal(manual.inLight, false);
  });

  it('takes the chamber width it is given', () => {
    assert.equal(foggy({ lightWidth: 5 }).enterLight() && 5, 5);
    const wide = foggy({ lightWidth: 8 });
    wide.enterLight();
    assert.equal(wide.chamber.width, 8);
    const narrow = foggy({ lightWidth: 5 });
    narrow.enterLight();
    assert.equal(narrow.chamber.width, 5);
  });
});
describe('rationing', () => {
  it('withholds one colour at a time, and moves on', () => {
    const seen = new Set();
    for (let pills = 0; pills < RATION_SPELL * COLOR_COUNT; pills += 1) {
      seen.add(rationedOut(pills));
    }
    assert.equal(seen.size, COLOR_COUNT, 'every colour must take its turn');
  });

  it('never deals the colour that is out of stock', () => {
    const game = new Game({ level: 0, speed: 'LOW', seed: 21, modifiers: ['rationing'] });
    for (let pills = 0; pills < 60; pills += 1) {
      game.pillsPlaced = pills;
      const out = rationedOut(pills);
      for (let draw = 0; draw < 12; draw += 1) {
        assert.ok(!game.drawColors().includes(out), `dealt ${out} while it was rationed`);
      }
    }
  });

  it('brings tolerance with it, because a stock-out is how tolerance arises', () => {
    // Without this rationing has no cost at all: two colours make runs EASIER
    // to build, and the playtest measured the modifier improving every number
    // it took - longer runs, more clears, faster virus kills and the only setup
    // that finished levels.
    const rationed = new Game({ level: 2, speed: 'LOW', seed: 23, modifiers: ['rationing'] });
    assert.equal(rationed.resistance, false, 'the resistance toggle is still off');
    assert.equal(rationed.tolerance, true, 'but tolerance is in play');
    const plain = new Game({ level: 2, speed: 'LOW', seed: 23 });
    assert.equal(plain.tolerance, false, 'and a plain run is untouched');
  });

  it('ages only the colour that is out of stock, and ages it every capsule', () => {
    const game = new Game({ level: 4, speed: 'LOW', seed: 24, modifiers: ['rationing'] });
    const out = rationedOut(1);
    // A level generates its viruses with a starting resistance already, so this
    // has to compare each cell against itself rather than against zero.
    const before = new Map();
    game.board.forEachCell((c, x, y) => {
      if (c.type === VIRUS) before.set(`${x},${y}`, { color: c.color, r: c.resistance ?? 0 });
    });
    game.pillsPlaced = 1;
    assert.equal(game.tickResistance(), true, 'a stock-out should age something');

    let agedRationed = 0;
    for (const [key, was] of before) {
      const [x, y] = key.split(',').map(Number);
      const now = game.board.get(x, y);
      // A virus that reached the limit mutated, so its colour or its
      // resistance changed; either way it is a cell that aged.
      const changed = now.color !== was.color || (now.resistance ?? 0) !== was.r;
      if (was.color === out) {
        if (changed) agedRationed += 1;
      } else {
        assert.equal(changed, false, `colour ${was.color} aged while it was in stock`);
      }
    }
    assert.ok(agedRationed > 0, 'the colour out of stock should have aged');
  });

  it('brings every colour back inside one spell', () => {
    // The bound: a virus of the missing colour is never unanswerable for
    // longer than a spell, because the rotation is fixed.
    const game = new Game({ level: 0, speed: 'LOW', seed: 22, modifiers: ['rationing'] });
    for (let start = 0; start < COLOR_COUNT * RATION_SPELL; start += 5) {
      const wanted = rationedOut(start);
      let back = -1;
      for (let ahead = 0; ahead <= RATION_SPELL; ahead += 1) {
        if (rationedOut(start + ahead) !== wanted) { back = ahead; break; }
      }
      assert.ok(back >= 0 && back <= RATION_SPELL, `colour ${wanted} waited too long`);
      void game;
    }
  });
});

describe('a contaminated batch', () => {
  it('marks one half of one capsule in the batch size', () => {
    const game = new Game({ level: 0, speed: 'LOW', seed: 31, modifiers: ['contaminated'] });
    let bad = 0;
    for (let i = 0; i < CONTAMINATION_EVERY * 4; i += 1) {
      if (game.contaminatedHalf(i) >= 0) bad += 1;
    }
    assert.equal(bad, 4, 'one capsule per batch should be contaminated');
  });

  it('deals none at all with the modifier off', () => {
    const game = new Game({ level: 0, speed: 'LOW', seed: 31 });
    for (let i = 0; i < 40; i += 1) assert.equal(game.contaminatedHalf(i), -1);
  });

  it('follows its own half through a rotation', () => {
    const pill = createPill([COLORS.RED, COLORS.BLUE], 3, 4, 0, 1);
    const before = pillCells(pill).find((c) => c.inert);
    assert.equal(before.color, COLORS.BLUE);
    const turned = pillCells({ ...pill, orientation: 2 });
    assert.equal(turned.find((c) => c.inert).color, COLORS.BLUE, 'the flag must follow its colour');
  });

  it('belongs to no run', () => {
    const board = new Board();
    const floor = board.height - 1;
    for (const x of [0, 1, 2, 3]) {
      const c = cell(COLORS.RED, PILL, null);
      if (x === 2) c.inert = true;
      board.set(x, floor, c);
    }
    assert.equal(board.findMatches().size, 0, 'an inert half must break the run');
  });

  it('washes out with a clear it is touching', () => {
    // The bound: without this, inert halves accumulate until the bottle fills.
    const board = new Board();
    const floor = board.height - 1;
    for (const x of [0, 1, 2, 3]) board.set(x, floor, cell(COLORS.RED, PILL, null));
    const bad = cell(COLORS.BLUE, PILL, null);
    bad.inert = true;
    board.set(4, floor, bad);
    const outcome = board.matchOutcome(board.findMatches());
    assert.equal(outcome.washed.length, 1);
    board.applyMatch(outcome);
    assert.equal(board.get(4, floor), null, 'the inert half should have washed out');
  });

  it('is left alone by a clear it is not touching', () => {
    const board = new Board();
    const floor = board.height - 1;
    for (const x of [0, 1, 2, 3]) board.set(x, floor, cell(COLORS.RED, PILL, null));
    const bad = cell(COLORS.BLUE, PILL, null);
    bad.inert = true;
    board.set(7, floor, bad);
    const outcome = board.matchOutcome(board.findMatches());
    assert.equal(outcome.washed.length, 0);
  });
});

describe('quarantine', () => {
  it('never seals a spawn column', () => {
    const board = new Board();
    for (let seed = 0; seed < 80; seed += 1) {
      const column = quarantineColumn(board, createRng(seed));
      assert.notEqual(column, SPAWN_X);
      assert.notEqual(column, SPAWN_X + 1);
    }
  });

  it('never seals the same column twice running', () => {
    const board = new Board();
    for (let seed = 0; seed < 80; seed += 1) {
      assert.notEqual(quarantineColumn(board, createRng(seed), 1), 1);
    }
  });

  it('refuses capsules in the sealed column but leaves everything else alone', () => {
    const board = new Board();
    board.sealed = 1;
    assert.equal(board.isEmpty(1, 5), true, 'gravity and matching still see it as empty');
    assert.equal(board.open(1, 5), false, 'but a capsule may not rest there');
    assert.equal(fits(board, createPill([0, 1], 0, 5, 0)), false, 'a capsule spanning it is blocked');
    assert.equal(fits(board, createPill([0, 1], 5, 5, 0)), true, 'other columns are untouched');
  });

  it('lifts on its own after enough capsules, even with no clear beside it', () => {
    // The bound. A seal that could outlast the run would be a narrower bottle
    // forever, which is a different game rather than a harder one.
    const game = new Game({ level: 2, speed: 'LOW', seed: 41, modifiers: ['quarantine'] });
    game.board.sealed = 1;
    game.sealedAt = 0;
    game.pillsPlaced = QUARANTINE_MAX;
    game.tickQuarantine();
    assert.equal(game.board.sealed, undefined, 'the seal should have expired');
  });

  it('breaks when a clear lands in a neighbouring column', () => {
    const game = new Game({ level: 0, speed: 'LOW', seed: 42, modifiers: ['quarantine'] });
    game.board.forEachCell((c, x, y) => game.board.set(x, y, null));
    game.startingViruses = 0;
    const floor = game.board.height - 1;
    game.board.set(0, floor, cell(COLORS.RED, VIRUS, null));
    for (const y of [floor - 1, floor - 2, floor - 3, floor - 4]) {
      game.board.set(2, y, cell(COLORS.RED, PILL, null));
    }
    game.startingViruses = 1;
    game.board.sealed = 1;
    game.sealedAt = 0;
    game.beginResolution();
    assert.equal(game.board.sealed, undefined, 'a clear next door breaks the seal');
  });

  it('leaves the seal alone for a clear nowhere near it', () => {
    const game = new Game({ level: 0, speed: 'LOW', seed: 43, modifiers: ['quarantine'] });
    game.board.forEachCell((c, x, y) => game.board.set(x, y, null));
    const floor = game.board.height - 1;
    for (const x of [4, 5, 6, 7]) game.board.set(x, floor, cell(COLORS.RED, PILL, null));
    game.board.set(0, floor - 6, cell(COLORS.BLUE, VIRUS, null));
    game.startingViruses = 1;
    game.board.sealed = 1;
    game.sealedAt = 0;
    game.beginResolution();
    assert.equal(game.board.sealed, 1, 'a clear across the bottle should not break it');
  });
});

describe('modifiers and the rest of the game', () => {
  it('a seed still reproduces a game exactly', () => {
    const play = () => {
      const game = new Game({
        level: 4, speed: 'LOW', seed: 77, resistance: true, modifiers: ['outbreak', 'quarantine'],
      });
      for (let f = 0; f < 3000; f += 1) {
        game.setLight(f % 40 < 10);
        game.update(16);
        game.drainEvents();
      }
      return {
        score: game.score,
        viruses: game.virusesLeft,
        sealed: game.board.sealed,
        grid: JSON.stringify(game.board.grid),
      };
    };
    assert.deepEqual(play(), play());
  });

  it('an unmodified run behaves as it always did', () => {
    const plain = new Game({ level: 4, speed: 'LOW', seed: 88 });
    assert.deepEqual(plain.modifiers, []);
    assert.equal(plain.board.sealed, undefined);
    assert.ok(plain.fog.every((f) => f === 0), 'an unmodified bottle never clouds');
    assert.equal(plain.visibilityAt(8), 1);
    assert.equal(plain.inLight, false);
    step(plain, 4000);
    assert.equal(plain.has('outbreak'), false);
    assert.ok(plain.phase !== PHASE.SPREADING);
  });
});

describe('the daily draws its own modifiers', () => {
  it('is decided by the date alone, like everything else about a day', () => {
    for (const key of ['2026-09-11', '2026-01-01', '2027-06-30']) {
      assert.deepEqual(dailySetup(key).modifiers, dailySetup(key).modifiers);
      assert.deepEqual(dailyModifiers(dailySeed(key)), dailySetup(key).modifiers);
    }
  });

  it('draws none, one or a pair, and never the same one twice', () => {
    for (let day = 1; day <= 400; day += 1) {
      const key = new Date(Date.UTC(2026, 0, day)).toISOString().slice(0, 10);
      const mods = dailySetup(key).modifiers;
      assert.ok(mods.length <= 2, `${key} drew ${mods.length} modifiers`);
      assert.equal(new Set(mods).size, mods.length, `${key} drew a duplicate`);
      for (const id of mods) assert.ok(MODIFIER_IDS.includes(id), `${key} drew "${id}"`);
    }
  });

  it('describes itself in the order the game will report', () => {
    // Otherwise the card and the run disagree about a pair for no reason a
    // player could ever see.
    for (let day = 1; day <= 200; day += 1) {
      const key = new Date(Date.UTC(2026, 0, day)).toISOString().slice(0, 10);
      const mods = dailySetup(key).modifiers;
      assert.deepEqual([...mods], [...normaliseModifiers(mods)], `${key} is out of order`);
    }
  });

  it('leaves roughly a third of days plain, so the daily still teaches the base game', () => {
    let plain = 0;
    const days = 365;
    for (let day = 1; day <= days; day += 1) {
      const key = new Date(Date.UTC(2026, 0, day)).toISOString().slice(0, 10);
      if (dailySetup(key).modifiers.length === 0) plain += 1;
    }
    const share = plain / days;
    assert.ok(share > 0.15 && share < 0.55, `${(share * 100).toFixed(0)}% of days are plain`);
  });

  it('reaches every modifier across a year', () => {
    const seen = new Set();
    for (let day = 1; day <= 365; day += 1) {
      const key = new Date(Date.UTC(2026, 0, day)).toISOString().slice(0, 10);
      for (const id of dailySetup(key).modifiers) seen.add(id);
    }
    assert.deepEqual([...seen].sort(), [...MODIFIER_IDS].sort(), 'a modifier never comes up');
  });
});
