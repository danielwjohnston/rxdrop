import { MAX_LEVEL } from './constants.js';

/**
 * The daily challenge: one bottle a day, the same for everyone, derived from
 * the date alone. No server and no clock sync - your device's UTC date is the
 * whole input, so it works offline.
 */

/** The UTC date stamp that identifies a day's puzzle, as YYYY-MM-DD. */
export function dailyKey(date = new Date()) {
  return new Date(date).toISOString().slice(0, 10);
}

/** FNV-1a over the date stamp: a stable seed everyone computes identically. */
export function dailySeed(key) {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
  }
  return hash >>> 0;
}

/** The day's setup. Levels stay in a range that is a challenge, not a coin flip. */
export function dailySetup(key = dailyKey()) {
  const seed = dailySeed(key);
  const speeds = ['LOW', 'MEDIUM', 'HIGH'];
  return {
    key,
    seed,
    level: 3 + (seed % 11),
    speed: speeds[(seed >>> 8) % speeds.length],
    // Roughly one day in three asks you to outrun mutation as well.
    resistance: (seed >>> 16) % 3 === 0,
    daily: true,
  };
}

/** True when a stored daily result belongs to the day being played. */
export function isToday(result, key = dailyKey()) {
  return Boolean(result) && result.key === key;
}

/** A short result line to paste somewhere, with no board spoilers in it. */
export function shareText(result, origin = '') {
  const { key, level, speed, score, cleared, total, won, resistance } = result;
  const badges = [`Level ${Math.min(level, MAX_LEVEL)}`, speed];
  if (resistance) badges.push('Resistance');
  const outcome = won ? `Cleared ${total}/${total}` : `${cleared}/${total} viruses`;
  const lines = [
    `RxDrop Daily ${key}`,
    badges.join(' · '),
    `${outcome} · ${score.toLocaleString()}`,
  ];
  if (origin) lines.push(`${origin}?daily=${key}`);
  return lines.join('\n');
}
