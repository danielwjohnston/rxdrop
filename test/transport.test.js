import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Transport } from '../src/transport.js';

/** A clock the test controls by hand - the point is that nothing else can. */
function fakeClock() {
  const state = { t: 0 };
  return { state, now: () => state.t };
}

const EPS = 1e-9;

describe('Transport', () => {
  it('refuses to run without a clock', () => {
    assert.throws(() => new Transport(), TypeError);
  });

  it('derives beats from the clock alone: 120bpm is 2 beats a second', () => {
    const { state, now } = fakeClock();
    const t = new Transport({ bpm: 120, clock: now });
    t.start();
    state.t = 1.5;
    assert.ok(Math.abs(t.beatAt() - 3) < EPS);
    state.t = 0.25;
    assert.ok(Math.abs(t.beatAt() - 0.5) < EPS);
  });

  it('does not drift: position is exact after simulated hours', () => {
    const { state, now } = fakeClock();
    const t = new Transport({ bpm: 120, clock: now });
    t.start();
    state.t = 3600; // one hour: 7200 beats at 2 beats a second
    const beat = t.beatAt();
    assert.equal(beat, 7200);
    // And the mapping inverts exactly - no accumulated scheduling error.
    assert.ok(Math.abs(t.timeOfBeat(beat) - 3600) < EPS);
  });

  it('pauses on the beat it froze at, however long the pause lasts', () => {
    const { state, now } = fakeClock();
    const t = new Transport({ bpm: 120, clock: now });
    t.start();
    state.t = 1;
    t.pause(); // frozen at beat 2
    state.t = 60;
    assert.equal(t.beatAt(), 2);
    assert.equal(t.running, false);
  });

  it('resumes from the frozen position, not from the top', () => {
    const { state, now } = fakeClock();
    const t = new Transport({ bpm: 120, clock: now });
    t.start();
    state.t = 1;
    t.pause();
    state.t = 60;
    assert.equal(t.resume(), true);
    state.t = 60.5;
    assert.ok(Math.abs(t.beatAt() - 3) < EPS);
  });

  it('restarting always resets to beat 0', () => {
    const { state, now } = fakeClock();
    const t = new Transport({ bpm: 120, clock: now });
    t.start();
    state.t = 10;
    t.start();
    assert.equal(t.beatAt(), 0);
    state.t = 11;
    assert.ok(Math.abs(t.beatAt() - 2) < EPS);
  });

  it('resume() is false when there is nothing paused', () => {
    const { now } = fakeClock();
    const t = new Transport({ bpm: 120, clock: now });
    assert.equal(t.resume(), false);
    t.start();
    t.stop();
    assert.equal(t.resume(), false);
  });

  it('changes tempo without moving the position', () => {
    const { state, now } = fakeClock();
    const t = new Transport({ bpm: 120, clock: now });
    t.start();
    state.t = 1; // beat 2
    t.setTempo(60); // now 1 beat a second
    assert.equal(t.beatAt(), 2);
    state.t = 2;
    assert.equal(t.beatAt(), 3);
  });

  it('reports bar, beat-in-bar, phase and tick in position()', () => {
    const { state, now } = fakeClock();
    const t = new Transport({ bpm: 120, beatsPerBar: 4, clock: now });
    t.start();
    state.t = 2.75; // beat 5.5 -> bar 1, beat 1.5 of the bar
    const p = t.position();
    assert.equal(p.bar, 1);
    assert.equal(Math.floor(p.beatInBar), 1);
    assert.ok(Math.abs(p.phase - 0.5) < EPS);
    assert.equal(p.tick, 22); // 5.5 beats * 4 subdivisions
  });

  it('answers "was that on the beat" inside a symmetric window', () => {
    const { state, now } = fakeClock();
    const t = new Transport({ bpm: 120, clock: now });
    t.start();
    // Beat 4 lands at t = 2.0. A 90ms window reaches +/-45ms.
    state.t = 2.0;
    assert.equal(t.beatWindow(state.t, 90).onBeat, true);
    state.t = 2.045;
    assert.equal(t.beatWindow(state.t, 90).onBeat, true);
    state.t = 2.046;
    assert.equal(t.beatWindow(state.t, 90).onBeat, false);
    state.t = 1.954;
    const w = t.beatWindow(state.t, 90);
    assert.equal(w.onBeat, false);
    assert.equal(w.beat, 4); // still the nearest beat
    assert.ok(w.deltaMs < 0); // early
    assert.equal(w.downbeat, true); // beat 4 opens bar 1
  });

  it('pumps tick, beat and bar events in order, each exactly once', () => {
    const { state, now } = fakeClock();
    const t = new Transport({ bpm: 120, beatsPerBar: 4, clock: now });
    const ticks = [];
    const beats = [];
    const bars = [];
    t.on('tick', (tick) => ticks.push(tick));
    t.on('beat', (beat) => beats.push(beat));
    t.on('bar', (bar) => bars.push(bar));
    t.start();
    state.t = 2.0; // beat 4 = bar 1 line; horizon reaches beat 4.3, tick 17
    t.pump(0.15);
    assert.deepEqual(ticks, Array.from({ length: 18 }, (_, i) => i));
    assert.deepEqual(beats, [0, 1, 2, 3, 4]);
    assert.deepEqual(bars, [0, 1]);
    t.pump(0.15); // same horizon: nothing refires
    assert.equal(ticks.length, 18);
  });

  it('dispatches nothing while paused, then catches up cleanly', () => {
    const { state, now } = fakeClock();
    const t = new Transport({ bpm: 120, clock: now });
    const ticks = [];
    t.on('tick', (tick) => ticks.push(tick));
    t.start();
    state.t = 0.5;
    t.pump();
    const fired = ticks.length;
    t.pause();
    state.t = 100;
    t.pump();
    assert.equal(ticks.length, fired); // frozen horizon, nothing new
    t.resume();
    state.t = 100.1;
    t.pump();
    // The position only moved 0.1s past the freeze point, so the events that
    // fire are the ones immediately after - not a hundred seconds' worth.
    assert.ok(ticks.length <= fired + 1);
  });

  it('fires cues at their scheduled beat with the scheduled time', () => {
    const { state, now } = fakeClock();
    const t = new Transport({ bpm: 120, clock: now });
    const hits = [];
    t.start();
    t.scheduleCue(3, (beat, at) => hits.push([beat, at]));
    const cancelled = t.scheduleCue(2, () => hits.push(['oops']));
    t.cancelCue(cancelled);
    state.t = 1.5; // horizon covers beat 3
    t.pump();
    assert.deepEqual(hits, [[3, 1.5]]);
  });

  it('keeps working when the music is conceptually off', () => {
    // Music-disabled playability: the transport is a clock with no audio of
    // its own, so gameplay queries behave the same whether or not any gain
    // node is audible.
    const { state, now } = fakeClock();
    const t = new Transport({ bpm: 120, clock: now });
    t.start();
    state.t = 0.5;
    assert.equal(t.position().beat, 1);
  });
});
