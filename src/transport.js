/**
 * The musical transport: authoritative beat/bar time for RxDrop.
 *
 * Gameplay must never read `AudioContext.currentTime` directly, and music must
 * never read `requestAnimationFrame` or `Date.now()`. Both sides talk to this
 * object, which owns exactly one anchor: a clock timestamp and the beat count
 * at that timestamp. Every position is *derived* from the anchor, so there is
 * no accumulator to drift.
 *
 * The clock is injected (`() => ctx.currentTime` in the browser, a fake in
 * tests), which is what makes the transport deterministic and engine-neutral:
 * the Godot version can implement the same semantics over its own audio clock.
 *
 * Semantics:
 * - `start()` begins (or restarts) at beat 0. Restart is always a reset.
 * - `pause()` freezes the beat position; scheduled audio already in flight
 *   rings out, nothing new is dispatched.
 * - `resume()` continues from the frozen position, never from 0.
 * - `stop()` halts and resets to beat 0.
 * - `setTempo()` re-anchors at the current position, so a tempo change never
 *   skips or repeats a beat.
 *
 * Gameplay queries:
 * - `beatAt(t)`, `position(t)` for beat/bar/subdivision/phase.
 * - `beatWindow(t, windowMs)` for "did this action land on the beat" - the
 *   Sonotherapy hook. `windowMs` is the total symmetric window.
 *
 * Scheduling:
 * - `pump(ahead)` dispatches 'tick' (per subdivision), 'beat' and 'bar'
 *   listeners plus one-shot `scheduleCue` callbacks for everything due inside
 *   the look-ahead horizon. The audio engine calls it from its scheduler
 *   timer; the transport itself owns no timer and no frame loop.
 */

const SECONDS_PER_MINUTE = 60;

export class Transport {
  /**
   * @param {object} options
   * @param {number} [options.bpm] - quarter notes per minute.
   * @param {number} [options.beatsPerBar] - the top of the time signature.
   * @param {number} [options.subdivisions] - ticks per beat (4 = sixteenths).
   * @param {() => number} options.clock - seconds, e.g. `() => ctx.currentTime`.
   */
  constructor({ bpm = 120, beatsPerBar = 4, subdivisions = 4, clock } = {}) {
    if (typeof clock !== 'function') {
      throw new TypeError('Transport needs a clock: () => seconds');
    }
    this._clock = clock;
    this._bpm = bpm;
    this.beatsPerBar = beatsPerBar;
    this.subdivisions = subdivisions;

    this._anchorTime = 0;
    this._anchorBeat = 0;
    this._heldBeat = 0;
    this._running = false;
    this._started = false;

    this._listeners = { tick: new Set(), beat: new Set(), bar: new Set() };
    this._cues = new Map();
    this._nextCueId = 1;
    // Dispatch cursors are in ticks (subdivision index), so a beat or bar
    // boundary is just a divisibility check.
    this._dispatchedTick = -1;
  }

  get bpm() {
    return this._bpm;
  }

  get running() {
    return this._running;
  }

  /** Seconds per beat at the current tempo. */
  get beatDuration() {
    return SECONDS_PER_MINUTE / this._bpm;
  }

  /**
   * Begin at beat 0. `at` is the clock time beat 0 lands on; pass a small
   * offset into the future so the first scheduled notes are not already late.
   * Always a restart: cues and dispatch state reset with the position.
   */
  start(at = this._clock()) {
    this._anchorTime = at;
    this._anchorBeat = 0;
    this._heldBeat = 0;
    this._running = true;
    this._started = true;
    this._dispatchedTick = -1;
    this._cues.clear();
  }

  /** Freeze the position. No-op unless running. */
  pause() {
    if (!this._running) return;
    this._heldBeat = this.beatAt();
    this._running = false;
  }

  /**
   * Continue from the paused position. Returns false when there was nothing
   * paused to resume, so callers can fall back to `start()`.
   */
  resume() {
    if (this._running || !this._started) return false;
    this._anchorTime = this._clock();
    this._anchorBeat = this._heldBeat;
    this._running = true;
    return true;
  }

  /** Halt and reset to beat 0. */
  stop() {
    this._running = false;
    this._started = false;
    this._heldBeat = 0;
    this._dispatchedTick = -1;
    this._cues.clear();
  }

  /**
   * Change tempo without moving the position: the beat the player is on stays
   * the beat, only the spacing of what follows changes.
   */
  setTempo(bpm) {
    if (!(bpm > 0)) throw new RangeError(`bpm must be positive, got ${bpm}`);
    const position = this.beatAt();
    this._anchorTime = this._clock();
    this._anchorBeat = position;
    this._heldBeat = position;
    this._bpm = bpm;
  }

  /**
   * The position in beats at clock time `t` (now by default). A paused
   * transport reports the frozen position regardless of `t`.
   */
  beatAt(t = this._clock()) {
    if (!this._running) return this._heldBeat;
    return this._anchorBeat + (t - this._anchorTime) / this.beatDuration;
  }

  /**
   * The clock time at which `beat` occurs, derived from the current anchor.
   * While paused this maps through the pre-pause tempo onto the resume line;
   * it is only meaningful for scheduling while running.
   */
  timeOfBeat(beat) {
    return this._anchorTime + (beat - this._anchorBeat) * this.beatDuration;
  }

  /**
   * Structured position at clock time `t`: which bar, where in the bar, and
   * how far through the current beat (phase in [0, 1)).
   */
  position(t = this._clock()) {
    const beat = this.beatAt(t);
    const bar = Math.floor(beat / this.beatsPerBar);
    const beatInBar = beat - bar * this.beatsPerBar;
    return {
      beat,
      bar,
      beatInBar,
      phase: beat - Math.floor(beat),
      tick: Math.floor(beat * this.subdivisions),
      running: this._running,
    };
  }

  /**
   * Is clock time `t` within `windowMs` (total width, symmetric) of a beat?
   * Returns the nearest beat, the signed distance to it in milliseconds, and
   * whether that beat is a bar line - the strong/weak distinction Sonotherapy
   * asks about.
   */
  beatWindow(t = this._clock(), windowMs = 90) {
    const beat = this.beatAt(t);
    const nearest = Math.round(beat);
    const deltaMs = (t - this.timeOfBeat(nearest)) * 1000;
    return {
      onBeat: Math.abs(deltaMs) <= windowMs / 2,
      beat: nearest,
      deltaMs,
      downbeat: nearest % this.beatsPerBar === 0,
    };
  }

  /** Subscribe to 'tick' (every subdivision), 'beat' or 'bar'. */
  on(event, fn) {
    if (!this._listeners[event]) throw new RangeError(`unknown event: ${event}`);
    this._listeners[event].add(fn);
    return () => this._listeners[event].delete(fn);
  }

  off(event, fn) {
    this._listeners[event]?.delete(fn);
  }

  /**
   * One-shot callback at an exact beat. Returns an id for `cancelCue`.
   * The callback receives the scheduled clock time, not the fire time.
   */
  scheduleCue(beat, fn) {
    const id = this._nextCueId;
    this._nextCueId += 1;
    this._cues.set(id, { beat, fn });
    return id;
  }

  cancelCue(id) {
    this._cues.delete(id);
  }

  /**
   * Dispatch everything due between the last dispatch and `ahead` seconds
   * into the future. Events fire in tick order, each with its scheduled
   * clock time so a consumer can program audio sample-accurately.
   * A paused transport dispatches nothing.
   */
  pump(ahead = 0.15) {
    if (!this._running) return;
    const now = this._clock();
    const horizonTick = Math.floor(this.beatAt(now + ahead) * this.subdivisions);
    for (let tick = this._dispatchedTick + 1; tick <= horizonTick; tick += 1) {
      const beat = tick / this.subdivisions;
      const at = this.timeOfBeat(beat);
      for (const fn of this._listeners.tick) fn(tick, at);
      if (tick % this.subdivisions === 0) {
        for (const fn of this._listeners.beat) fn(tick / this.subdivisions, at);
        if (beat % this.beatsPerBar === 0) {
          for (const fn of this._listeners.bar) fn(beat / this.beatsPerBar, at);
        }
      }
      for (const [id, cue] of this._cues) {
        if (cue.beat <= beat) {
          this._cues.delete(id);
          cue.fn(cue.beat, this.timeOfBeat(cue.beat));
        }
      }
    }
    this._dispatchedTick = Math.max(this._dispatchedTick, horizonTick);
  }
}
