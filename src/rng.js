/**
 * Small seedable PRNG (mulberry32) so virus layouts and pill sequences can be
 * reproduced exactly - handy for tests and for sharing a seed with a friend.
 */
export function createRng(seed = Date.now()) {
  let state = seed >>> 0;
  const rng = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.int = (maxExclusive) => Math.floor(rng() * maxExclusive);
  rng.pick = (items) => items[rng.int(items.length)];
  return rng;
}
