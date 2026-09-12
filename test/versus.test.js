import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Board } from '../src/board.js';
import { ATTACK_CAP } from '../src/constants.js';
import { PHASE } from '../src/game.js';
import { VersusMatch } from '../src/versus.js';
import { createRng } from '../src/rng.js';

const cascadeBoard = () =>
  Board.from([
    '........', '........', '........', '........',
    '........', '........', '........', '........',
    '........', '........', 'y.......', 'y.......',
    'y.......', 'rrr.....', 'Y..b....', '...B....',
  ]);

/** Runs the match until the given player is taking input again, or time runs out. */
function settle(match, playerIndex, limit = 500) {
  for (let i = 0; i < limit; i += 1) {
    if (match.players[playerIndex].phase === PHASE.FALLING || match.over) return;
    match.update(16);
  }
}

describe('versus setup', () => {
  it('deals both players the same bottle and the same capsules', () => {
    const match = new VersusMatch({ level: 4, seed: 1234 });
    const [a, b] = match.players;
    assert.deepEqual(a.board.toStrings(), b.board.toStrings());
    assert.deepEqual(a.nextColors, b.nextColors);
    assert.deepEqual(a.pill.colors, b.pill.colors);
  });

  it('is deterministic for a seed', () => {
    const play = () => {
      const match = new VersusMatch({ level: 2, seed: 77, speed: 'HIGH' });
      for (let i = 0; i < 400; i += 1) {
        if (i % 20 === 0) match.command(i % 40 === 0 ? 0 : 1, 'hardDrop');
        match.update(16);
        match.drainEvents();
      }
      return match.players.map((p) => p.board.toStrings().join(''));
    };
    assert.deepEqual(play(), play());
  });

  it('a rematch deals a different bottle', () => {
    const match = new VersusMatch({ level: 4, seed: 5 });
    const first = match.players[0].board.toStrings().join('');
    match.rematch();
    assert.notEqual(match.players[0].board.toStrings().join(''), first);
    assert.equal(match.winner, null);
  });
});

describe('garbage', () => {
  it('sends a cascade to the opponent and leaves the sender alone', () => {
    const match = new VersusMatch({ level: 1, seed: 11 });
    const [attacker, defender] = match.players;
    attacker.board = cascadeBoard();
    attacker.pill = { x: 3, y: 0, orientation: 1, colors: [0, 0] };
    attacker.hardDrop();
    settle(match, 0);

    assert.ok(match.attacksSent[0] > 0, 'the cascade should send garbage');
    assert.equal(match.attacksSent[1], 0);
    assert.equal(attacker.incoming.length, 0, 'a player never garbages themselves');
    assert.ok(defender.incoming.length > 0);
  });

  it('lands the garbage as loose halves that then fall', () => {
    const match = new VersusMatch({ level: 1, seed: 3 });
    const [, defender] = match.players;
    defender.board = new Board();
    defender.queueGarbage([0, 1, 2]);
    const dropped = defender.dropGarbage();

    assert.equal(dropped.length, 3);
    assert.equal(new Set(dropped.map((d) => d.x)).size, 3, 'spread across columns');
    for (const { x } of dropped) assert.equal(defender.board.get(x, 0).link, null);

    defender.board.settle();
    assert.equal(defender.board.toStrings()[0], '........', 'garbage should not hang at the top');
    for (const { x } of dropped) assert.ok(defender.board.get(x, defender.board.height - 1));
  });

  it('caps a single clear\'s payload', () => {
    const match = new VersusMatch({ seed: 2 });
    const huge = Array.from({ length: 40 }, () => ({ color: 0 }));
    assert.equal(match.players[0].attackFor(huge, 4, 6).length, ATTACK_CAP);
  });

  it('sends nothing for a plain four-in-a-row', () => {
    const match = new VersusMatch({ seed: 2 });
    const minimal = Array.from({ length: 4 }, () => ({ color: 1 }));
    assert.deepEqual(match.players[0].attackFor(minimal, 1, 1), []);
  });

  it('sends one garbage piece per simultaneous run', () => {
    const match = new VersusMatch({ seed: 2 });
    const cells = Array.from({ length: 8 }, (_, i) => ({ color: i % 2 }));
    assert.equal(match.players[0].attackFor(cells, 3, 1).length, 3);
  });

  it('adds chain garbage after the first stage', () => {
    const match = new VersusMatch({ seed: 2 });
    const cells = Array.from({ length: 8 }, (_, i) => ({ color: i % 2 }));
    assert.equal(match.players[0].attackFor(cells, 2, 3).length, 4);
  });

  it('carries the colours that were cleared', () => {
    const match = new VersusMatch({ seed: 2 });
    const cells = Array.from({ length: 8 }, (_, i) => ({ color: i % 2 }));
    const attack = match.players[0].attackFor(cells, 3, 1);
    assert.ok(attack.length > 0);
    for (const color of attack) assert.ok(color === 0 || color === 1);
  });

  it('stops garbage once a player is out', () => {
    const match = new VersusMatch({ seed: 9 });
    const [attacker, defender] = match.players;
    defender.phase = PHASE.LOST;
    attacker.pendingAttack = [0, 1];
    match.update(16);
    assert.equal(defender.incoming.length, 0);
  });
});

describe('winning', () => {
  it('the survivor wins when the other tops out', () => {
    const match = new VersusMatch({ seed: 4 });
    match.players[0].phase = PHASE.LOST;
    match.update(16);
    assert.equal(match.winner, 1);
    assert.equal(match.reason, 'topped-out');
    assert.ok(match.drainEvents().some((e) => e.type === 'matchOver' && e.player === 1));
  });

  it('clearing your viruses first wins outright', () => {
    const match = new VersusMatch({ seed: 4 });
    match.players[1].phase = PHASE.WON;
    match.update(16);
    assert.equal(match.winner, 1);
    assert.equal(match.reason, 'cleared');
  });

  it('freezes both boards once the match is decided', () => {
    const match = new VersusMatch({ seed: 4, speed: 'HIGH' });
    match.players[0].phase = PHASE.LOST;
    match.update(16);
    const snapshot = match.players[1].board.toStrings();
    for (let i = 0; i < 100; i += 1) match.update(16);
    assert.deepEqual(match.players[1].board.toStrings(), snapshot);
    assert.equal(match.command(1, 'hardDrop'), false);
  });
});

describe('controls', () => {
  it('routes a command to one player only', () => {
    const match = new VersusMatch({ seed: 8 });
    const [a, b] = match.players;
    const startB = b.pill.x;
    match.command(0, 'left');
    assert.equal(a.pill.x, 3 - 1);
    assert.equal(b.pill.x, startB, 'the other bottle must not move');
    match.command(0, 'rotateCW');
    assert.equal(a.pill.orientation, 1);
    assert.equal(b.pill.orientation, 0);
  });

  it('holds and releases soft drop per player', () => {
    const match = new VersusMatch({ seed: 8, speed: 'LOW' });
    match.command(1, 'softDropOn');
    assert.equal(match.players[1].softDropping, true);
    assert.equal(match.players[0].softDropping, false);
    for (let i = 0; i < 20; i += 1) match.update(16);
    assert.ok(match.players[1].pill.y > match.players[0].pill.y);
    match.command(1, 'softDropOff');
    assert.equal(match.players[1].softDropping, false);
  });

  it('pauses and resumes both bottles together', () => {
    const match = new VersusMatch({ seed: 8, speed: 'HIGH' });
    match.setPaused(true);
    assert.equal(match.paused, true);
    const before = match.players.map((p) => p.pill.y);
    for (let i = 0; i < 60; i += 1) match.update(16);
    assert.deepEqual(match.players.map((p) => p.pill.y), before);
    match.setPaused(false);
    assert.equal(match.paused, false);
  });
});

describe('a full match', () => {
  it('always ends with exactly one winner', () => {
    for (const seed of [1, 42, 2024]) {
      const rng = createRng(seed);
      const match = new VersusMatch({ level: 3, speed: 'HIGH', seed });
      const targets = [3, 3];
      let frames = 0;
      while (!match.over && frames < 60000) {
        frames += 1;
        for (const [i, player] of match.players.entries()) {
          if (player.phase !== PHASE.FALLING) continue;
          if (player.pill.x < targets[i]) match.command(i, 'right');
          else if (player.pill.x > targets[i]) match.command(i, 'left');
          else if (rng.int(3) === 0) {
            match.command(i, 'hardDrop');
            targets[i] = rng.int(8);
          }
        }
        match.update(16);
        match.drainEvents();
      }
      assert.ok(match.over, `seed ${seed} never resolved`);
      assert.ok(match.winner === 0 || match.winner === 1);
      assert.ok(['topped-out', 'cleared'].includes(match.reason));
    }
  });
});
