import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const { Document } = require('../dist/model/Document.js');
const { Rect } = require('../dist/model/Rect.js');

function ids(container) {
  return container.children.map((shape) => shape.id);
}

function createRect(id, x = 0) {
  return new Rect(id, x, 0, 10, 10);
}

test('inserts shapes at controlled positions and keeps structure consistent', () => {
  const document = new Document(100, 100);
  const first = createRect('a', 0);
  const second = createRect('b', 20);
  const third = createRect('c', 40);
  const inserted = createRect('d', 10);

  document.addShape(first);
  document.addShape(second);
  document.addShape(third);

  assert.equal(document.root.insert(inserted, 1), true);
  assert.deepEqual(ids(document.root), ['a', 'd', 'b', 'c']);
  assert.equal(inserted.parent, document.root);
  assert.equal(document.findShape('d'), inserted);
  assert.equal(document.root.indexOf(inserted), 1);

  const group = document.createGroup('g');
  document.addShape(group);
  const nested = createRect('e', 0);
  assert.equal(group.insert(nested, 0), true);
  assert.deepEqual(ids(group), ['e']);
  assert.equal(nested.parent, group);
  assert.equal(document.findShape('e'), nested);
});

test('rejects invalid insert positions and attached or duplicate shapes', () => {
  const document = new Document(100, 100);
  const first = createRect('a', 0);
  const second = createRect('b', 20);

  document.addShape(first);
  document.addShape(second);

  assert.equal(document.root.insert(createRect('c'), -1), false);
  assert.equal(document.root.insert(createRect('c'), 1.5), false);
  assert.equal(document.root.insert(createRect('c'), 3), false);
  assert.equal(document.root.insert(first, 0), false);

  const duplicate = createRect('a', 40);
  assert.equal(document.root.insert(duplicate, 0), false);

  assert.deepEqual(ids(document.root), ['a', 'b']);
  assert.equal(document.findShape('a'), first);
  assert.equal(document.findShape('c'), undefined);
  assert.equal(duplicate.parent, null);
});

test('rejects self-containment and inserting an ancestor into a descendant', () => {
  const document = new Document(100, 100);
  const outer = document.createGroup('outer');
  const inner = document.createGroup('inner');

  document.addShape(outer);
  outer.add(inner);

  assert.equal(outer.insert(outer, 0), false);
  assert.equal(inner.insert(outer, 0), false);
  assert.deepEqual(ids(document.root), ['outer']);
  assert.deepEqual(ids(outer), ['inner']);
  assert.deepEqual(ids(inner), []);
  assert.equal(outer.parent, document.root);
  assert.equal(inner.parent, outer);
  assert.equal(document.findShape('outer'), outer);
  assert.equal(document.findShape('inner'), inner);
});

test('moves shapes across containers with insertion indexes', () => {
  const document = new Document(100, 100);
  const first = createRect('a', 0);
  const second = createRect('b', 20);
  const group = document.createGroup('g');
  const nested = createRect('c', 0);

  document.addShape(first);
  document.addShape(second);
  document.addShape(group);
  group.add(nested);

  assert.equal(document.moveShape(first, group, 1), true);
  assert.deepEqual(ids(document.root), ['b', 'g']);
  assert.deepEqual(ids(group), ['c', 'a']);
  assert.equal(first.parent, group);
  assert.equal(document.findShape('a'), first);

  assert.equal(document.moveShape(first, document.root, 0), true);
  assert.deepEqual(ids(document.root), ['a', 'b', 'g']);
  assert.deepEqual(ids(group), ['c']);
  assert.equal(first.parent, document.root);
});

test('moves shapes within one container using final positions', () => {
  const document = new Document(100, 100);
  const first = createRect('a', 0);
  const second = createRect('b', 10);
  const third = createRect('c', 20);
  const fourth = createRect('d', 30);

  document.addShape(first);
  document.addShape(second);
  document.addShape(third);
  document.addShape(fourth);

  assert.equal(document.moveShape(first, document.root, 2), true);
  assert.deepEqual(ids(document.root), ['b', 'c', 'a', 'd']);

  assert.equal(document.moveShape(fourth, document.root, 0), true);
  assert.deepEqual(ids(document.root), ['d', 'b', 'c', 'a']);

  assert.equal(document.moveShape(third, document.root, 3), true);
  assert.deepEqual(ids(document.root), ['d', 'b', 'a', 'c']);

  assert.equal(document.moveShape(second, document.root, 1), true);
  assert.deepEqual(ids(document.root), ['d', 'b', 'a', 'c']);
});

test('rejects invalid moves and restores the original structure', () => {
  const document = new Document(100, 100);
  const first = createRect('a', 0);
  const detached = createRect('b', 10);
  const outer = document.createGroup('outer');
  const inner = document.createGroup('inner');

  document.addShape(first);
  document.addShape(outer);
  outer.add(inner);

  assert.equal(document.moveShape(detached, document.root, 0), false);
  assert.equal(document.moveShape(first, document.root, 2), false);
  assert.equal(document.moveShape(first, document.root, 0.5), false);
  assert.equal(document.moveShape(first, document.root, -1), false);
  assert.equal(document.moveShape(outer, inner, 0), false);

  assert.deepEqual(ids(document.root), ['a', 'outer']);
  assert.deepEqual(ids(outer), ['inner']);
  assert.deepEqual(ids(inner), []);
  assert.equal(first.parent, document.root);
  assert.equal(outer.parent, document.root);
  assert.equal(inner.parent, outer);
  assert.equal(document.findShape('outer'), outer);
  assert.equal(document.findShape('inner'), inner);
  assert.equal(detached.parent, null);
});

test('reports indexes for attached shapes and rejects foreign shapes', () => {
  const document = new Document(100, 100);
  const first = createRect('a', 0);
  const group = document.createGroup('g');
  const detached = createRect('b', 0);
  const foreign = createRect('c', 0);

  document.addShape(first);
  document.addShape(group);
  group.add(foreign);

  assert.equal(document.root.indexOf(first), 0);
  assert.equal(document.root.indexOf(group), 1);
  assert.equal(document.root.indexOf(foreign), -1);
  assert.equal(group.indexOf(foreign), 0);
  assert.equal(group.indexOf(first), -1);
  assert.equal(document.root.indexOf(detached), -1);
});
