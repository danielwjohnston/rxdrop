import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const normalise = (path) => `./${path.replace(/^\.?\//, '')}`;
const read = (path) => readFileSync(resolve(ROOT, path), 'utf8');

const precache = (() => {
  const source = read('sw.js');
  const match = source.match(/const PRECACHE = \[([\s\S]*?)\];/);
  assert.ok(match, 'sw.js must define a PRECACHE array');
  return [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((entry) => entry[1]);
})();

const precached = new Set(precache);
const index = read('index.html');
const manifest = JSON.parse(read('manifest.webmanifest'));

const tags = (tag) =>
  [...index.matchAll(new RegExp(`<${tag}\\b[^>]*>`, 'gi'))].map((match) => match[0]);
const attribute = (tag, name) =>
  tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, 'i'))?.[1] ?? null;
const isRelative = (value) =>
  value && !/^[a-z][a-z\d+.-]*:/i.test(value) && !value.startsWith('//') && !value.startsWith('/');
const relativePaths = (values) =>
  values
    .filter(isRelative)
    .map((value) => normalise(value.split(/[?#]/, 1)[0]));

describe('service-worker precache', () => {
  it('contains every source file', () => {
    const sourceFiles = readdirSync(resolve(ROOT, 'src'))
      .filter((name) => name.endsWith('.js') || name === 'styles.css')
      .map((name) => `./src/${name}`);

    for (const file of sourceFiles) {
      assert.ok(precached.has(file), `PRECACHE is missing source file ${file}`);
    }
  });

  it('contains only files that exist on disk', () => {
    for (const entry of precache) {
      if (entry === './') continue;
      assert.ok(existsSync(resolve(ROOT, entry)), `PRECACHE entry does not exist: ${entry}`);
    }
  });

  it('contains page and manifest resources', () => {
    const scripts = relativePaths(tags('script').map((tag) => attribute(tag, 'src')));
    const stylesheets = relativePaths(
      tags('link')
        .filter((tag) => /\brel\s*=\s*["']stylesheet["']/i.test(tag))
        .map((tag) => attribute(tag, 'href')),
    );
    const icons = relativePaths((manifest.icons ?? []).map((icon) => icon.src));

    for (const file of [...scripts, ...stylesheets, ...icons]) {
      assert.ok(precached.has(file), `PRECACHE is missing referenced file ${file}`);
    }
  });
});
