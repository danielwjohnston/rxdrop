import assert from 'node:assert/strict';
import { lstatSync, readFileSync, readdirSync, readlinkSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Deliberately a hand-rolled walk rather than fs.globSync: globSync landed in
// Node 22 and this repo's CI still runs the suite on Node 20, where importing
// it yields undefined and the check dies with a TypeError instead of testing
// anything. Caught by CI, not locally - the container runs Node 22.
const IGNORED = new Set(['node_modules', '.git']);
function findGuides(dir = ROOT) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...findGuides(full));
    else if (entry.name === 'CLAUDE.md') found.push(relative(ROOT, full));
  }
  return found;
}

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
 *
 * Cycle 4 broke the first version of this check two ways, and both are now
 * closed:
 *   1. A NESTED guide. The first version only ever looked at ROOT/CLAUDE.md, so
 *      adding src/CLAUDE.md or .claude/CLAUDE.md forked the guide with all
 *      three tests still green. Claude Code loads directory-scoped guide files,
 *      so an agent working under src/ would have read the fork - exactly the
 *      harm this file exists to prevent. Now globbed.
 *   2. A PARAPHRASE. The first version asserted against the literal sentence
 *      commit 9933ef5 happened to use, so rewording the identical bad advice
 *      passed. Now matched on the token that actually matters.
 */
describe('the day-one guide has exactly one copy', () => {
  it('has no second CLAUDE.md anywhere in the tree', () => {
    // Cycle 4's attack 1: a nested guide forks the day-one text without ever
    // touching the root symlink. Claude Code reads directory-scoped guides.
    const found = findGuides();
    assert.deepEqual(
      found.sort(), ['CLAUDE.md'],
      `the root CLAUDE.md symlink must be the only one - found: ${found.join(', ')}`,
    );
  });

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
    // Cycle 4's attack 2: the first version matched the one sentence 9933ef5
    // used, so a paraphrase of the identical bad advice passed. Match the
    // thing itself. The repo's tooling deliberately sets no executablePath and
    // relies on PLAYWRIGHT_BROWSERS_PATH, so any mention outside a prohibition
    // is the regression.
    const mentions = [...guide.matchAll(/executablePath/g)];
    assert.equal(
      mentions.length, 1,
      `executablePath should appear exactly once, in the sentence forbidding it - found ${mentions.length}`,
    );
    assert.match(guide, /do not add an `executablePath`/);
  });
});
