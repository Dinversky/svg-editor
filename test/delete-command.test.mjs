import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const { CommandExecutor } = require('../dist/commands/CommandExecutor.js');
const { DeleteCommand } = require('../dist/commands/DeleteCommand.js');
const { History } = require('../dist/commands/History.js');
const { Document } = require('../dist/model/Document.js');
const { Rect } = require('../dist/model/Rect.js');
const { Text } = require('../dist/model/Text.js');

function ids(container) {
  return container.children.map((shape) => shape.id);
}

test('deletes a root-level leaf and undo/redo restore order, parent, and lookup', () => {
  const document = new Document(100, 100);
  const first = new Rect('a', 0, 0, 10, 10);
  const second = new Rect('b', 10, 0, 10, 10);
  const third = new Rect('c', 20, 0, 10, 10);
  const history = new History();
  const executor = new CommandExecutor(history);

  document.addShape(first);
  document.addShape(second);
  document.addShape(third);

  executor.execute(new DeleteCommand(document, second));
  assert.deepEqual(ids(document.root), ['a', 'c']);
  assert.equal(document.findShape('b'), undefined);
  assert.equal(second.parent, null);
  assert.equal(document.countShapes(), 2);
  assert.equal(history.canUndo, true);
  assert.equal(history.canRedo, false);

  history.undo();
  assert.deepEqual(ids(document.root), ['a', 'b', 'c']);
  assert.equal(document.findShape('b'), second);
  assert.equal(second.parent, document.root);
  assert.equal(document.countShapes(), 3);

  history.redo();
  assert.deepEqual(ids(document.root), ['a', 'c']);
  assert.equal(document.findShape('b'), undefined);

  history.undo();
  assert.deepEqual(ids(document.root), ['a', 'b', 'c']);
  assert.equal(document.findShape('b'), second);
});

test('deletes a nested leaf and restores its position inside the group', () => {
  const document = new Document(100, 100);
  const group = document.createGroup('g');
  const first = new Rect('r1', 0, 0, 10, 10);
  const second = new Rect('r2', 10, 0, 10, 10);
  const third = new Rect('r3', 20, 0, 10, 10);
  const history = new History();
  const executor = new CommandExecutor(history);

  group.add(first);
  group.add(second);
  group.add(third);
  document.addShape(group);

  executor.execute(new DeleteCommand(document, second));
  assert.deepEqual(ids(group), ['r1', 'r3']);
  assert.equal(document.findShape('r2'), undefined);
  assert.equal(second.parent, null);

  history.undo();
  assert.deepEqual(ids(group), ['r1', 'r2', 'r3']);
  assert.equal(second.parent, group);
  assert.equal(document.findShape('r2'), second);
  assert.equal(document.root.children[0], group);

  history.redo();
  assert.deepEqual(ids(group), ['r1', 'r3']);
  assert.equal(document.findShape('r2'), undefined);

  history.undo();
  assert.deepEqual(ids(group), ['r1', 'r2', 'r3']);
});

test('deletes a non-empty group and restores the complete subtree and IDs', () => {
  const document = new Document(100, 100);
  const before = new Rect('before', 0, 0, 10, 10);
  const outer = document.createGroup('outer');
  const inner = document.createGroup('inner');
  const rect = new Rect('r1', 1, 2, 3, 4);
  const text = new Text('t1', 5, 6, 'label');
  const after = new Rect('after', 30, 0, 10, 10);
  const history = new History();
  const executor = new CommandExecutor(history);

  inner.add(rect);
  outer.add(inner);
  outer.add(text);
  document.addShape(before);
  document.addShape(outer);
  document.addShape(after);

  executor.execute(new DeleteCommand(document, outer));
  assert.deepEqual(ids(document.root), ['before', 'after']);
  for (const id of ['outer', 'inner', 'r1', 't1']) {
    assert.equal(document.findShape(id), undefined);
  }
  assert.equal(outer.parent, null);
  assert.equal(inner.parent, outer);
  assert.equal(rect.parent, inner);
  assert.equal(text.parent, outer);
  assert.deepEqual(ids(outer), ['inner', 't1']);
  assert.deepEqual(ids(inner), ['r1']);
  assert.equal(document.countShapes(), 2);

  history.undo();
  assert.deepEqual(ids(document.root), ['before', 'outer', 'after']);
  assert.equal(document.findShape('outer'), outer);
  assert.equal(document.findShape('inner'), inner);
  assert.equal(document.findShape('r1'), rect);
  assert.equal(document.findShape('t1'), text);
  assert.equal(outer.parent, document.root);
  assert.equal(inner.parent, outer);
  assert.equal(rect.parent, inner);
  assert.equal(text.parent, outer);
  assert.deepEqual(ids(outer), ['inner', 't1']);
  assert.deepEqual(ids(inner), ['r1']);
  assert.equal(document.countShapes(), 6);

  history.redo();
  assert.deepEqual(ids(document.root), ['before', 'after']);
  assert.equal(document.findShape('outer'), undefined);
  assert.equal(document.findShape('r1'), undefined);

  history.undo();
  assert.deepEqual(ids(document.root), ['before', 'outer', 'after']);
  assert.equal(document.findShape('r1'), rect);
});

test('deleting a subtree makes its IDs reusable for new shapes', () => {
  const document = new Document(100, 100);
  const outer = document.createGroup('outer');
  const inner = document.createGroup('inner');
  const history = new History();
  const executor = new CommandExecutor(history);

  outer.add(inner);
  document.addShape(outer);

  executor.execute(new DeleteCommand(document, outer));
  assert.equal(document.findShape('outer'), undefined);
  assert.equal(document.findShape('inner'), undefined);

  const replacementOuter = document.createGroup('outer');
  const replacementInner = new Rect('inner', 0, 0, 10, 10);
  assert.equal(document.addShape(replacementOuter), true);
  assert.equal(document.addShape(replacementInner), true);
  assert.equal(document.findShape('outer'), replacementOuter);
  assert.equal(document.findShape('inner'), replacementInner);
  assert.deepEqual(ids(document.root), ['outer', 'inner']);
});

test('rejects detached and already-deleted targets without mutation', () => {
  const document = new Document(100, 100);
  const detached = new Rect('r9', 0, 0, 10, 10);
  const target = new Rect('r1', 0, 0, 10, 10);
  const history = new History();
  const executor = new CommandExecutor(history);

  assert.throws(
    () => new DeleteCommand(document, detached),
    { message: 'no such shape: r9' },
  );
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, false);
  assert.equal(document.findShape('r9'), undefined);

  document.addShape(target);
  executor.execute(new DeleteCommand(document, target));
  assert.equal(document.findShape('r1'), undefined);
  assert.equal(document.root.children.length, 0);
  assert.equal(target.parent, null);
  assert.equal(history.canUndo, true);

  assert.throws(
    () => new DeleteCommand(document, target),
    { message: 'no such shape: r1' },
  );
  assert.equal(history.canUndo, true);
  assert.equal(history.canRedo, false);
  assert.equal(document.root.children.length, 0);

  history.undo();
  assert.equal(document.findShape('r1'), target);
  assert.equal(target.parent, document.root);
  assert.equal(history.canRedo, true);
});

test('failed delete construction preserves an existing redo stack', () => {
  const document = new Document(100, 100);
  const target = new Rect('r1', 0, 0, 10, 10);
  const detached = new Rect('r9', 0, 0, 10, 10);
  const history = new History();
  const executor = new CommandExecutor(history);

  document.addShape(target);
  executor.execute(new DeleteCommand(document, target));
  history.undo();

  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, true);
  assert.equal(document.findShape('r1'), target);

  assert.throws(
    () => new DeleteCommand(document, detached),
    { message: 'no such shape: r9' },
  );

  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, true);
  assert.equal(document.root.children[0], target);

  history.redo();
  assert.equal(document.findShape('r1'), undefined);
});

test('multiple deletes restore sibling order through LIFO undo and redo', () => {
  const document = new Document(100, 100);
  const first = new Rect('a', 0, 0, 10, 10);
  const second = new Rect('b', 10, 0, 10, 10);
  const third = new Rect('c', 20, 0, 10, 10);
  const history = new History();
  const executor = new CommandExecutor(history);

  document.addShape(first);
  document.addShape(second);
  document.addShape(third);

  executor.execute(new DeleteCommand(document, second));
  executor.execute(new DeleteCommand(document, third));
  assert.deepEqual(ids(document.root), ['a']);

  history.undo();
  assert.deepEqual(ids(document.root), ['a', 'c']);
  assert.equal(document.findShape('c'), third);

  history.undo();
  assert.deepEqual(ids(document.root), ['a', 'b', 'c']);
  assert.equal(document.findShape('b'), second);

  history.redo();
  assert.deepEqual(ids(document.root), ['a', 'c']);

  history.redo();
  assert.deepEqual(ids(document.root), ['a']);
});

test('document subtree registry helpers are atomic and preserve structure', () => {
  const document = new Document(100, 100);
  const outer = document.createGroup('outer');
  const inner = document.createGroup('inner');
  const rect = new Rect('r1', 0, 0, 10, 10);

  inner.add(rect);
  outer.add(inner);
  document.addShape(outer);

  assert.equal(document.unregisterDescendants(outer), true);
  assert.equal(document.findShape('outer'), outer);
  assert.equal(document.findShape('inner'), undefined);
  assert.equal(document.findShape('r1'), undefined);
  assert.equal(inner.parent, outer);
  assert.equal(rect.parent, inner);
  assert.deepEqual(ids(outer), ['inner']);
  assert.deepEqual(ids(inner), ['r1']);

  assert.equal(document.registerDescendants(outer), true);
  assert.equal(document.findShape('inner'), inner);
  assert.equal(document.findShape('r1'), rect);

  assert.equal(document.unregisterDescendants(rect), true);
  assert.equal(document.registerDescendants(rect), true);
  assert.equal(document.findShape('r1'), rect);
});

test('registerDescendants rejects ID conflicts without partial registration', () => {
  const document = new Document(100, 100);
  const outer = document.createGroup('outer');
  const inner = document.createGroup('inner');
  const rect = new Rect('r1', 0, 0, 10, 10);
  const replacement = new Rect('inner', 5, 5, 5, 5);

  inner.add(rect);
  outer.add(inner);
  document.addShape(outer);

  assert.equal(document.unregisterDescendants(outer), true);
  assert.equal(document.addShape(replacement), true);
  assert.equal(document.findShape('inner'), replacement);

  assert.equal(document.registerDescendants(outer), false);
  assert.equal(document.findShape('inner'), replacement);
  assert.equal(document.findShape('r1'), undefined);
  assert.equal(inner.parent, outer);
  assert.equal(rect.parent, inner);
});

test('deletes an empty group and restores it on undo', () => {
  const document = new Document(100, 100);
  const group = document.createGroup('g1');
  const history = new History();
  const executor = new CommandExecutor(history);

  document.addShape(group);
  executor.execute(new DeleteCommand(document, group));
  assert.equal(document.root.children.length, 0);
  assert.equal(document.findShape('g1'), undefined);
  assert.equal(group.parent, null);

  history.undo();
  assert.equal(document.root.children[0], group);
  assert.equal(document.findShape('g1'), group);
  assert.equal(group.parent, document.root);
});
