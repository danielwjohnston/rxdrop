import { Game, PHASE } from './game.js';

/**
 * A local two-player match. Both players get the same virus layout and the
 * same capsule sequence, so a win is about play rather than luck, and every
 * clear sends garbage to the other bottle.
 *
 * It holds two ordinary Games and routes attacks between them, so the rules
 * engine needs to know nothing about versus.
 */
export class VersusMatch {
  constructor({ level = 5, speed = 'MEDIUM', seed = Date.now(), resistance = false } = {}) {
    this.settings = { level, speed, seed: seed >>> 0, resistance };
    this.start();
  }

  start() {
    const { level, speed, seed, resistance } = this.settings;
    // The same seed for both: identical bottles, identical capsules.
    this.players = [
      new Game({ level, speed, seed, resistance }),
      new Game({ level, speed, seed, resistance }),
    ];
    this.winner = null;
    this.reason = null;
    this.events = [];
    this.attacksSent = [0, 0];
  }

  /** Restarts with a fresh layout so a rematch is not the same puzzle. */
  rematch() {
    this.settings.seed = (this.settings.seed + 0x9e3779b9) >>> 0;
    this.start();
  }

  get over() {
    return this.winner !== null;
  }

  get paused() {
    return this.players.every((player) => player.paused);
  }

  setPaused(paused) {
    for (const player of this.players) player.paused = Boolean(paused);
  }

  /** Player-tagged events, so the UI can shake the right bottle. */
  drainEvents() {
    const events = this.events;
    this.events = [];
    return events;
  }

  update(dt) {
    if (this.over) return;

    for (const [index, player] of this.players.entries()) {
      player.update(dt);
      for (const event of player.drainEvents()) this.events.push({ player: index, ...event });
    }

    // Everything cleared this frame becomes the opponent's problem.
    for (const [index, player] of this.players.entries()) {
      const attack = player.takeAttack();
      if (attack.length === 0) continue;
      const opponent = this.players[1 - index];
      if (opponent.isOver) continue;
      opponent.queueGarbage(attack);
      this.attacksSent[index] += attack.length;
      this.events.push({ player: index, type: 'attack', count: attack.length });
    }

    this.checkForWinner();
  }

  checkForWinner() {
    if (this.over) return;
    for (const [index, player] of this.players.entries()) {
      if (player.phase === PHASE.WON) {
        this.declare(index, 'cleared');
        return;
      }
      if (player.phase === PHASE.LOST) {
        this.declare(1 - index, 'topped-out');
        return;
      }
    }
  }

  declare(winner, reason) {
    this.winner = winner;
    this.reason = reason;
    this.events.push({ player: winner, type: 'matchOver', reason });
  }

  /** Routes an action to one player's game. */
  command(playerIndex, action) {
    const player = this.players[playerIndex];
    if (!player || this.over) return false;
    switch (action) {
      case 'left':
        return player.move(-1);
      case 'right':
        return player.move(1);
      case 'rotateCW':
        return player.rotate(1);
      case 'rotateCCW':
        return player.rotate(-1);
      case 'softDropOn':
        player.setSoftDrop(true);
        return true;
      case 'softDropOff':
        player.setSoftDrop(false);
        return true;
      case 'hardDrop':
        return player.hardDrop();
      case 'light':
        player.toggleLight();
        return true;
      default:
        return false;
    }
  }
}
