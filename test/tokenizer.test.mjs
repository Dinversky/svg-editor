import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const { Tokenizer } = require('../dist/cli/Tokenizer.js');

const tokenizer = new Tokenizer();

test('splits tokens on ordinary whitespace', () => {
  assert.deepEqual(tokenizer.tokenize('create rect r1 10 20 30 40 blue'), [
    'create',
    'rect',
    'r1',
    '10',
    '20',
    '30',
    '40',
    'blue',
  ]);
});

test('ignores consecutive and surrounding whitespace', () => {
  assert.deepEqual(tokenizer.tokenize('  create\t\t rect   r1  '), [
    'create',
    'rect',
    'r1',
  ]);
});

test('keeps a quoted argument with spaces as one token', () => {
  assert.deepEqual(tokenizer.tokenize('save "my drawing.svg"'), [
    'save',
    'my drawing.svg',
  ]);
  assert.deepEqual(
    tokenizer.tokenize('create rect r1 10 20 30 40 "light blue"'),
    ['create', 'rect', 'r1', '10', '20', '30', '40', 'light blue'],
  );
});

test('keeps an empty quoted argument', () => {
  assert.deepEqual(tokenizer.tokenize('save ""'), ['save', '']);
});

test('rejects an unclosed double quote', () => {
  assert.throws(
    () => tokenizer.tokenize('save "my drawing.svg'),
    (error) => error instanceof Error && error.message === 'unclosed double quote',
  );
});

test('rejects text directly after a closing quote', () => {
  assert.throws(
    () => tokenizer.tokenize('save "my drawing.svg"x'),
    (error) => error instanceof Error && error.message === 'invalid quote syntax',
  );
});

test('rejects a quote that does not start a parameter', () => {
  assert.throws(
    () => tokenizer.tokenize('save abc"def"'),
    (error) => error instanceof Error && error.message === 'invalid quote syntax',
  );
});

test('returns no tokens for empty and whitespace-only lines', () => {
  assert.deepEqual(tokenizer.tokenize(''), []);
  assert.deepEqual(tokenizer.tokenize('   \t  '), []);
});

test('returns no tokens for full-line comments', () => {
  assert.deepEqual(tokenizer.tokenize('# this is a comment'), []);
  assert.deepEqual(tokenizer.tokenize('    # this is also a comment'), []);
});

test('keeps #fff as a normal argument outside the first position', () => {
  assert.deepEqual(
    tokenizer.tokenize('create rect r1 10 20 30 40 #fff'),
    ['create', 'rect', 'r1', '10', '20', '30', '40', '#fff'],
  );
});

test('does not truncate inline # characters', () => {
  assert.deepEqual(
    tokenizer.tokenize('create rect r1 10 20 30 40 red # comment'),
    ['create', 'rect', 'r1', '10', '20', '30', '40', 'red', '#', 'comment'],
  );
  assert.deepEqual(tokenizer.tokenize('save "#not-a-comment.svg"'), [
    'save',
    '#not-a-comment.svg',
  ]);
});

test('does not treat single quotes as quoting characters', () => {
  assert.deepEqual(tokenizer.tokenize("save 'my file.svg'"), [
    'save',
    "'my",
    "file.svg'",
  ]);
});
