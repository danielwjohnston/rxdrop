import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { ERAS } from '../src/eras.js';
import {
  loadPractitionerArt,
  PRACTITIONER_POSES,
  practitionerSprite,
  practitionerSpriteUrl,
} from '../src/art.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('practitioner art', () => {
  it('has a valid PNG for every era and pose', () => {
    for (const era of ERAS) {
      for (const pose of PRACTITIONER_POSES) {
        const path = resolve(ROOT, 'assets', 'practitioners', `${era.doctor}-${pose}.png`);
        const bytes = readFileSync(path);
        assert.deepEqual(bytes.subarray(0, PNG_MAGIC.length), PNG_MAGIC, path);
      }
    }
  });

  it('falls back from a missing pose to idle, then null', () => {
    const idle = {};
    const cheer = {};
    const art = new Map([
      ['shaman/idle', idle],
      ['shaman/cheer', cheer],
    ]);

    assert.equal(practitionerSprite(art, 'shaman', 'cheer'), cheer);
    assert.equal(practitionerSprite(art, 'shaman', 'worry'), idle);
    assert.equal(practitionerSprite(art, 'plague', 'idle'), null);
    assert.equal(
      practitionerSpriteUrl('shaman', 'idle'),
      './assets/practitioners/shaman-idle.png',
    );
  });

  it('loads successes and ignores image failures', async () => {
    const createImage = () => {
      const image = { onload: null, onerror: null, onabort: null };
      Object.defineProperty(image, 'src', {
        set(url) {
          queueMicrotask(() => {
            if (url.endsWith('shaman-idle.png') || url.endsWith('shaman-cheer.png')) {
              image.onload();
            } else {
              image.onerror(new Error('fixture failure'));
            }
          });
        },
      });
      return image;
    };

    const art = await loadPractitionerArt(['shaman'], { createImage });
    assert.deepEqual([...art.keys()].sort(), ['shaman/cheer', 'shaman/idle']);
  });
});
