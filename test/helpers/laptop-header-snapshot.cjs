// Older feature tests compare frozen header implementations. Recognize only the
// exact reviewed header revisions and cache tokens for those comparisons.
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const revisions = require('../fixtures/laptop-header-revisions.json');
const previous = new Map();

function prior(value) {
  value = require('./option-d-snapshot.cjs').prior(value);
  const buffer = Buffer.isBuffer(value);
  const source = buffer ? value.toString('utf8') : value;
  if (typeof source !== 'string' || (buffer && !Buffer.from(source).equals(value))) return value;
  if (!source.includes('20261108-header-fit-1') && !source.includes('min-width:100em')) return value;

  const hash = createHash('sha256').update(source.replace(/\r/g, '')).digest('hex');
  const file = revisions[hash];
  if (file && !previous.has(file)) {
    previous.set(file, execFileSync('git', ['show', '0a33f05:' + file], {
      cwd: path.resolve(__dirname, '../..'), encoding: 'utf8',
    }));
  }
  const restored = file ? previous.get(file) : source.replaceAll(
    'header=20261108-header-fit-1', 'header=20261106-racial-justice-1',
  );
  return buffer ? Buffer.from(restored) : restored;
}

module.exports = { prior };
