import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  COMMANDS, ROTATION_FORMAT, TRACE_FORMAT, TRACE_VERSION, fnv1a, replay, rotationResult,
} from '../tools/trace.mjs';
import { SCENARIOS, readRotations, readTraces } from '../tools/reference-traces.mjs';

/**
 * The reference traces exist for a port, not for this game: they are what a
 * native or Godot build replays to prove it kept the rules (docs/portability.md).
 * This test guards the other direction, the same way rng-golden.test.js does:
 * that the traces still describe the rules this game actually runs. If a rules
 * change is deliberate, re-record with `node tools/reference-traces.mjs --write`
 * and say so in the commit, because that changes the contract.
 */
const traces = readTraces();

describe('the reference traces', () => {
  it('are one per scenario, recorded from the setup the scenario names', () => {
    assert.deepEqual(traces.map((t) => t.name).sort(), SCENARIOS.map((s) => s.name).sort());
    for (const trace of traces) {
      const scenario = SCENARIOS.find((s) => s.name === trace.name);
      assert.deepEqual(trace.setup, JSON.parse(JSON.stringify(scenario.setup)), trace.name);
      assert.equal(trace.format, TRACE_FORMAT);
      assert.equal(trace.version, TRACE_VERSION);
      assert.equal(trace.frameMs, 16);
    }
  });

  it('use only the eight player commands, in frame order', () => {
    for (const trace of traces) {
      let last = 0;
      for (const [frame, player, action] of trace.inputs) {
        assert.ok(COMMANDS.includes(action), `${trace.name}: ${action}`);
        assert.ok(Number.isInteger(frame) && frame >= last && frame < trace.frames, `${trace.name}: frame ${frame}`);
        assert.ok(player === 0 || (trace.mode === 'versus' && player === 1), `${trace.name}: player ${player}`);
        last = frame;
      }
    }
  });

  it('still replay frame for frame against the rules', () => {
    for (const trace of traces) {
      const again = replay(trace);
      const ours = again.digests.split(' ');
      const theirs = trace.digests.split(' ');
      assert.equal(ours.length, trace.frames, trace.name);
      const first = theirs.findIndex((d, i) => d !== ours[i]);
      assert.equal(first, -1, `${trace.name}: the rules diverge from the trace at frame ${first}`);
      assert.deepEqual(again.events, trace.events, `${trace.name}: events`);
      const byFrame = new Map(again.checkpoints.map((c) => [c.frame, c.state]));
      for (const { frame, state } of trace.checkpoints) {
        assert.deepEqual(byFrame.get(frame), state, `${trace.name}: snapshot at frame ${frame}`);
      }
    }
  });

  it('between them exercise every command and every mechanic a port must keep', () => {
    const commands = new Set(traces.flatMap((t) => t.inputs.map(([, , action]) => action)));
    assert.deepEqual([...commands].sort(), [...COMMANDS].sort());
    const events = new Set(
      traces.flatMap((t) => t.events.flatMap(([, ...tags]) => tags.map((tag) => tag.split(':').at(-1)))),
    );
    for (const type of [
      'clear', 'levelComplete', 'gameOver', 'mutate', 'resist', 'spread', 'sealed', 'unsealed',
      'lightOn', 'lit', 'lightOff', 'sterile', 'flooded', 'darkClear', 'antibody', 'garbage',
      'matchOver', 'hardDrop', 'speedUp', 'chain',
    ]) {
      assert.ok(events.has(type), `no trace raises "${type}"`);
    }
    const states = JSON.stringify(traces.map((t) => t.checkpoints));
    assert.match(states, /V[345]/, 'no trace holds a hybrid');
    assert.match(states, /P\d[lrud]?i/, 'no trace holds an inert half');
    assert.match(states, /k-?\d,-?\d/, 'no trace holds a kicked capsule');
    assert.match(states, /u\d/, 'no trace holds a part-cured hybrid');
  });

  // Play almost never reaches the turns where the kick order decides where the
  // capsule ends up, so the traces alone let a port reorder the kick tables and
  // still pass. Found by falsifying the traces; this table is the answer.
  it('pin every rotation outcome in the golden table, kick order included', () => {
    const golden = readRotations();
    assert.equal(golden.format, ROTATION_FORMAT);
    assert.ok(golden.cases.length >= 500);
    for (const [index, turn] of golden.cases.entries()) {
      assert.equal(rotationResult(turn), turn.result, `turn ${index}: ${turn.pill} turned ${turn.direction}`);
    }
    assert.ok(golden.cases.some((turn) => turn.result === null), 'no refused turn');
    assert.ok(golden.cases.some((turn) => / k/.test(turn.pill) && turn.result && !/ k/.test(turn.result)), 'no kick repaid');
  });

  it('digest with plain 32-bit FNV-1a, so a port can check its hash first', () => {
    // The published FNV-1a test vectors.
    assert.equal(fnv1a(''), '811c9dc5');
    assert.equal(fnv1a('a'), 'e40c292c');
    assert.equal(fnv1a('foobar'), 'bf9cf968');
  });
});
