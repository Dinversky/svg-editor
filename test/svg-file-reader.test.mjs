import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const { SvgFileReader } = require('../dist/io/SvgFileReader.js');

function createTempDir(t) {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'svg-reader-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test('reads an SVG file as UTF-8 text', (t) => {
  const directory = createTempDir(t);
  const filePath = path.join(directory, 'sample.svg');
  const content = '<?xml version="1.0"?>\n<svg><text>你好</text></svg>\n';
  writeFileSync(filePath, content, 'utf8');

  assert.equal(new SvgFileReader().read(filePath), content);
});

test('reads an empty file without changing its content', (t) => {
  const directory = createTempDir(t);
  const filePath = path.join(directory, 'empty.svg');
  writeFileSync(filePath, '', 'utf8');

  assert.equal(new SvgFileReader().read(filePath), '');
});

test('propagates filesystem errors for missing files', (t) => {
  const directory = createTempDir(t);
  const filePath = path.join(directory, 'missing.svg');

  assert.throws(
    () => new SvgFileReader().read(filePath),
    (error) => error.code === 'ENOENT',
  );
});
