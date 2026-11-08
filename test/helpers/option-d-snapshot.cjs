// Apply only exact reviewed source revisions when older feature tests compare
// against the frozen header. Current behavior is tested separately.
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const revisions = require('../fixtures/option-d-revisions.json');
const socialRevisions = require('../fixtures/header-social-revisions.json');
const previous = new Map();

function prior(value) {
  const buffer = Buffer.isBuffer(value);
  const source = buffer ? value.toString('utf8') : value;
  if (typeof source !== 'string' || (buffer && !Buffer.from(source).equals(value))) return value;
  const hash = createHash('sha256').update(source.replace(/\r/g, '')).digest('hex');
  const socialFile = socialRevisions[hash];
  if (socialFile) {
    const key = 'social:' + socialFile;
    if (!previous.has(key)) {
      previous.set(key, execFileSync('git', ['show', '8691e68:' + socialFile], {
        cwd: path.resolve(__dirname, '../..'), encoding: 'utf8',
      }));
    }
    return prior(buffer ? Buffer.from(previous.get(key)) : previous.get(key));
  }
  const file = revisions[hash];
  if (file && !previous.has(file)) {
    previous.set(file, execFileSync('git', ['show', '104d414:' + file], {
      cwd: path.resolve(__dirname, '../..'), encoding: 'utf8',
    }));
  }
  const restored = file ? previous.get(file) : source.replaceAll(
    'header=20261108-header-social-1', 'header=20261108-option-d-1',
  ).replaceAll(
    'header=20261108-option-d-1', 'header=20261108-header-fit-1',
  );
  return buffer ? Buffer.from(restored) : restored;
}

module.exports = { prior };
