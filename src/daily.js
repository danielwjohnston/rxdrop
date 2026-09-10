import { MAX_LEVEL } from './constants.js';
import { MODIFIER_IDS, describeModifiers, normaliseModifiers } from './modifiers.js';

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

/**
 * The modifiers a day is played with: none, one, or a pair, drawn from the date
 * like everything else.
 *
 * A pair rather than a single one is the point. One modifier changes a run; two
 * interact, and the interaction is what stops the daily being the same game at
 * a different level. Roughly a third of days are plain, so the daily is still
 * somewhere to learn the base game.
 */
export function dailyModifiers(seed) {
  const roll = (seed >>> 20) % 6;
  if (roll < 2) return Object.freeze([]);
  const first = MODIFIER_IDS[(seed >>> 4) % MODIFIER_IDS.length];
  if (roll < 4) return normaliseModifiers([first]);
  // Step by a co-prime so the second is never the first, and every pair is
  // reachable across the calendar.
  const step = 1 + ((seed >>> 12) % (MODIFIER_IDS.length - 1));
  const index = (MODIFIER_IDS.indexOf(first) + step) % MODIFIER_IDS.length;
  // Normalised, so the day describes itself in the same order the game will
  // report - otherwise the card and the run disagree about a pair for no
  // reason a player could ever see.
  return normaliseModifiers([first, MODIFIER_IDS[index]]);
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
    modifiers: dailyModifiers(seed),
    daily: true,
  };
}

/** True when a stored daily result belongs to the day being played. */
export function isToday(result, key = dailyKey()) {
  return Boolean(result) && result.key === key;
}

/** A short result line to paste somewhere, with no board spoilers in it. */
export function shareText(result, origin = '') {
  const { key, level, speed, score, cleared, total, won, resistance, modifiers } = result;
  const badges = [`Level ${Math.min(level, MAX_LEVEL)}`, speed];
  if (resistance) badges.push('Resistance');
  if (modifiers?.length) badges.push(describeModifiers(modifiers));
  const outcome = won ? `Cleared ${total}/${total}` : `${cleared}/${total} viruses`;
  const lines = [
    `RxDrop Daily ${key}`,
    badges.join(' · '),
    `${outcome} · ${score.toLocaleString()}`,
  ];
  if (origin) lines.push(`${origin}?daily=${key}`);
  return lines.join('\n');
}
