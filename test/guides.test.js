import assert from 'node:assert/strict';
import { lstatSync, readFileSync, readlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * CLAUDE.md is a symlink to AGENTS.md, and that is load-bearing.
 *
 * It was a symlink, then commit 9933ef5 replaced it with a real file. The copy
 * immediately went stale, and what it went stale ON was the Playwright advice:
 * AGENTS.md says the repo relies on PLAYWRIGHT_BROWSERS_PATH and that you must
 * NOT add an executablePath, while the frozen copy still told the reader to
 * launch with `executablePath: '/opt/pw-browsers/chromium'`. An agent reading
 * CLAUDE.md - which is the one most agents read, because the harness loads it
 * automatically - got advice the repo's own tooling contradicts.
 *
 * A symlink makes that drift impossible rather than merely discouraged. This
 * check exists so that converting it back to a copy fails loudly instead of
 * quietly re-forking the day-one guide.
 */
describe('the day-one guide has exactly one copy', () => {
  it('keeps CLAUDE.md a symlink to AGENTS.md', () => {
    const stats = lstatSync(resolve(ROOT, 'CLAUDE.md'));
    assert.ok(
      stats.isSymbolicLink(),
      'CLAUDE.md must stay a symlink to AGENTS.md - a real file forks the guide and it has already gone stale once',
    );
    assert.equal(readlinkSync(resolve(ROOT, 'CLAUDE.md')), 'AGENTS.md');
  });

  it('serves the same text under both names', () => {
    const agents = readFileSync(resolve(ROOT, 'AGENTS.md'), 'utf8');
    const claude = readFileSync(resolve(ROOT, 'CLAUDE.md'), 'utf8');
    assert.equal(claude, agents);
  });

  it('does not tell anyone to set an executablePath', () => {
    // The specific regression 9933ef5 reintroduced. The repo's tooling
    // deliberately has no executablePath and relies on the env var.
    const guide = readFileSync(resolve(ROOT, 'AGENTS.md'), 'utf8');
    assert.match(guide, /PLAYWRIGHT_BROWSERS_PATH/);
    assert.doesNotMatch(
      guide,
      /launch with `executablePath/,
      'the guide must not resurrect the executablePath advice',
    );
  });
});
