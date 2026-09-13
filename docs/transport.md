# The transport

`src/transport.js` is the game's authoritative musical clock. It exists because
a rhythm-aware mechanic (Sonotherapy, issue #38's family) cannot be built on
`requestAnimationFrame` or `Date.now()`: musical time has to come from the
audio clock and nowhere else.

## The one idea

The transport owns a single anchor - a clock timestamp and the beat count at
that timestamp - and *derives* every position from it:

```
beatAt(t) = anchorBeat + (t - anchorTime) / beatDuration
```

Nothing accumulates. A tick that fires ten thousand times cannot drift,
because position is a function of the clock, not a sum of elapsed frames.

The clock is injected. In the browser it is `() => ctx.currentTime`; in tests
it is a fake the test advances by hand; in Godot it will be whatever that
engine's audio clock is. The transport never touches `Date.now()`,
`requestAnimationFrame`, or the DOM, which is what makes it the portable part
of the audio system.

## Lifecycle semantics

| Call | Effect |
| --- | --- |
| `start(at?)` | Begins at beat 0. Always a restart: cues and dispatch state reset. `at` is the clock time beat 0 lands on. |
| `pause()` | Freezes the position. Scheduled audio in flight rings out; `pump()` dispatches nothing. |
| `resume()` | Continues from the frozen position, never from 0. Returns `false` when nothing was paused, so callers can fall back to `start()`. |
| `stop()` | Halts and resets to beat 0. |
| `setTempo(bpm)` | Re-anchors at the current position: the beat the player is on stays the beat; only the spacing of what follows changes. |

Pausing the game pauses the transport, so the tune resumes mid-phrase instead
of starting over on every interruption. Ending a game stops it.

## What gameplay may ask

- `beatAt(t?)` - the position in beats at clock time `t` (now by default).
- `position(t?)` - `{ beat, bar, beatInBar, phase, tick, running }`.
- `beatWindow(t?, windowMs)` - "was this action on the beat": the nearest beat,
  the signed distance in milliseconds, whether it sits inside the symmetric
  window, and whether that beat is a bar line (the strong/weak distinction).
- `timeOfBeat(beat)` - the clock time a beat lands on, for scheduling.

Gameplay reads all of this through `audio.transport`; it never reaches into
`audio.js` internals.

## What the scheduler does

`pump(ahead)` dispatches everything due inside the look-ahead horizon -
`'tick'` listeners per subdivision, `'beat'` per quarter note, `'bar'` per
bar line, and one-shot `scheduleCue` callbacks - each with its *scheduled*
clock time so audio can be programmed sample-accurately. The transport owns no
timer: `AudioEngine` queries `beatAt`/`timeOfBeat` inside its existing 25ms
look-ahead scheduler, and `pump` is there for consumers that want events
rather than queries - beat-synced visuals, Sonotherapy cues.

## What is specification versus web-only

**Specification** (the Godot version must reproduce): the anchor derivation,
the lifecycle table above, beat/bar/subdivision queries, the beat-window
query including its symmetric-window semantics, and dispatch-once ordering of
events inside a horizon.

**Web-only** (free to differ): the injected clock being
`AudioContext.currentTime`, `pump` being driven by a `setInterval` scheduler,
and the 150ms horizon.
