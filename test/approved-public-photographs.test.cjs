const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { test } = require('node:test');
const { photos } = require('../home-hero-photos.js');

// Approved PR #12 release before the regression-coverage changes.
const approved = '065a8a481e4a80a68af9365909013c812761f698';

test('approved carousel and navigation photographs retain their original bytes', () => {
  const carousel = photos.flatMap(({ id, sources }) => {
    const variants = [
      sources.src,
      ...['srcset', 'phone', 'short'].flatMap(key =>
        sources[key].split(',').map(candidate => candidate.trim().split(/\s+/)[0])
      ),
    ];
    for (const file of variants) assert.ok(file.startsWith('assets/images/home/hero-' + id + '-'), file);
    return variants;
  });
  const navigation = ['services', 'life-events', 'visit', 'community', 'about']
    .map(category => `assets/images/navigation/${category}-480.webp`);
  const files = [...new Set([...carousel, ...navigation])];
  const git = args => execFileSync('git', args, { encoding: 'utf8' }).trim().split(/\r?\n/);
  assert.deepEqual(git(['hash-object', '--', ...files]), git(['rev-parse', ...files.map(file => `${approved}:${file}`)]));
});
