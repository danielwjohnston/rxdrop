import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

// What a link preview and the README show of the game. None of it is played,
// so nothing else notices when it goes stale: the description said "Dr. Mario
// style" for a month after the game stopped being one.

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(ROOT, path), 'utf8');
const index = read('index.html');

/** The content of the <meta> whose name or property is `key`, or null. */
function meta(key) {
  for (const [tag] of index.matchAll(/<meta\b[^>]*>/gi)) {
    const named = tag.match(/\b(?:name|property)\s*=\s*"([^"]+)"/i)?.[1];
    if (named === key) return tag.match(/\bcontent\s*=\s*"([^"]*)"/i)?.[1] ?? null;
  }
  return null;
}

/** Width and height from a PNG's IHDR chunk. */
function pngSize(path) {
  const bytes = readFileSync(resolve(ROOT, path));
  assert.equal(bytes.toString('latin1', 1, 4), 'PNG', `${path} is not a PNG`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

describe('page metadata', () => {
  const SITE = meta('og:url');

  it('has a description and a full set of link-preview tags', () => {
    for (const key of [
      'description',
      'og:type',
      'og:title',
      'og:description',
      'og:url',
      'og:image',
      'og:image:width',
      'og:image:height',
      'og:image:alt',
      'twitter:card',
      'twitter:image',
    ]) {
      assert.ok(meta(key), `index.html is missing <meta> ${key}`);
    }
    assert.equal(meta('twitter:card'), 'summary_large_image');
  });

  it('describes the game as it is now', () => {
    assert.doesNotMatch(meta('description'), /dr\.? mario/i);
    assert.match(meta('description'), /medical-history/i);
  });

  it('says the same thing everywhere a preview might read it', () => {
    assert.equal(meta('og:description'), meta('description'));
    assert.equal(meta('twitter:description'), meta('description'));
    assert.equal(meta('twitter:image'), meta('og:image'));
  });

  it('points the preview image at a file this site actually serves, at its real size', () => {
    assert.match(SITE, /^https:\/\/[^/]+\/.*\/$/, 'og:url must be the absolute site root');
    const image = meta('og:image');
    assert.ok(image.startsWith(SITE), `og:image ${image} is not under ${SITE}`);
    const path = image.slice(SITE.length);
    assert.ok(existsSync(resolve(ROOT, path)), `og:image names ${path}, which is not in the repo`);
    const { width, height } = pngSize(path);
    assert.equal(Number(meta('og:image:width')), width);
    assert.equal(Number(meta('og:image:height')), height);
  });
});

describe('README images', () => {
  it('names only images that exist', () => {
    const images = [...read('README.md').matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)].map((m) => m[1]);
    assert.ok(images.length >= 2, 'the README should show the game');
    for (const path of images.filter((p) => !/^[a-z]+:/i.test(p))) {
      assert.ok(existsSync(resolve(ROOT, path)), `README shows ${path}, which is not in the repo`);
    }
  });
});
