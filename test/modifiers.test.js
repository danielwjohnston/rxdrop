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
import { fits, createPill, pillCells } from '../src/pill.js';
import {
  BLACKOUT_EVERY,
  BLACKOUT_FLOOR,
  BLACKOUT_LASTS,
  COLORS,
  COLOR_COUNT,
  CONTAMINATION_EVERY,
  DARK_AT,
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

describe('blackout and light therapy', () => {
  const dim = () => new Game({ level: 2, speed: 'LOW', seed: 9, modifiers: ['blackout'] });

  it('starts lit and goes dark on its own timer', () => {
    const game = dim();
    assert.equal(game.light, 1);
    assert.equal(game.isDark, false);
    game.updateLight(BLACKOUT_EVERY);
    assert.ok(game.blackoutFor > 0, 'a blackout should have started');
    for (let t = 0; t < 2000; t += 16) game.updateLight(16);
    assert.equal(game.isDark, true, 'the bottle should be dark by now');
    assert.ok(game.light >= BLACKOUT_FLOOR, 'and never fully black');
  });

  it('comes back on its own with the light untouched', () => {
    // The bound. A player who never presses anything still gets the bottle back.
    const game = dim();
    game.updateLight(BLACKOUT_EVERY);
    for (let t = 0; t < BLACKOUT_LASTS + 2000; t += 16) game.updateLight(16);
    assert.equal(game.blackoutFor, 0, 'the blackout should have ended');
    assert.ok(game.light > DARK_AT, 'and the bottle should be readable again');
  });

  it('holding the light lifts the bottle and spends the reservoir', () => {
    const game = dim();
    game.updateLight(BLACKOUT_EVERY);
    for (let t = 0; t < 1200; t += 16) game.updateLight(16);
    const dark = game.light;
    const charge = game.lightCharge;
    game.setLight(true);
    for (let t = 0; t < 800; t += 16) game.updateLight(16);
    assert.ok(game.light > dark, 'holding the light should brighten the bottle');
    assert.ok(game.lightCharge < charge, 'and cost the reservoir');
  });

  it('the reservoir runs out, and stays out until it re-arms', () => {
    // Without the latch the reservoir oscillates on empty and the light is
    // free, which is exactly how the first version of this behaved.
    const game = dim();
    game.updateLight(BLACKOUT_EVERY);
    game.setLight(true);
    game.lightCharge = 0.001;
    game.updateLight(100);
    assert.equal(game.lightSpent, true, 'the reservoir should be spent');
    const spent = game.light;
    game.updateLight(200);
    assert.ok(game.light <= spent, 'a spent light must not keep working');
  });

  it('does nothing at all when the modifier is off', () => {
    const game = new Game({ level: 2, speed: 'LOW', seed: 9 });
    game.setLight(true);
    game.updateLight(60000);
    assert.equal(game.light, 1);
    assert.equal(game.isDark, false);
    assert.equal(game.lighting, false, 'the light should not even arm');
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
    assert.equal(plain.light, 1);
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
