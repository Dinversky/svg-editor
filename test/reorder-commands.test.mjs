import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const { AddToCommand } = require('../dist/commands/AddToCommand.js');
const { BackCommand } = require('../dist/commands/BackCommand.js');
const { CommandExecutor } = require('../dist/commands/CommandExecutor.js');
const { FrontCommand } = require('../dist/commands/FrontCommand.js');
const { History } = require('../dist/commands/History.js');
const { Document } = require('../dist/model/Document.js');
const { Rect } = require('../dist/model/Rect.js');

function ids(container) {
  return container.children.map((shape) => shape.id);
}

test('addto moves a root shape into a group as the last child', () => {
  const document = new Document(100, 100);
  const rootFirst = new Rect('a', 0, 0, 10, 10);
  const rootSecond = new Rect('b', 10, 0, 10, 10);
  const group = document.createGroup('g');
  const nestedFirst = new Rect('x', 20, 0, 10, 10);
  const nestedSecond = new Rect('y', 30, 0, 10, 10);
  const history = new History();
  const executor = new CommandExecutor(history);

  group.add(nestedFirst);
  group.add(nestedSecond);
  document.addShape(rootFirst);
  document.addShape(rootSecond);
  document.addShape(group);

  executor.execute(new AddToCommand(document, rootFirst, group));
  assert.deepEqual(ids(document.root), ['b', 'g']);
  assert.deepEqual(ids(group), ['x', 'y', 'a']);
  assert.equal(rootFirst.parent, group);
  assert.equal(document.findShape('a'), rootFirst);

  history.undo();
  assert.deepEqual(ids(document.root), ['a', 'b', 'g']);
  assert.deepEqual(ids(group), ['x', 'y']);
  assert.equal(rootFirst.parent, document.root);

  history.redo();
  assert.deepEqual(ids(document.root), ['b', 'g']);
  assert.deepEqual(ids(group), ['x', 'y', 'a']);
});

test('addto moves a nested shape into a nested group', () => {
  const document = new Document(100, 100);
  const outer = document.createGroup('outer');
  const inner = document.createGroup('inner');
  const first = new Rect('a', 0, 0, 10, 10);
  const second = new Rect('b', 10, 0, 10, 10);
  const nested = new Rect('c', 20, 0, 10, 10);
  const history = new History();
  const executor = new CommandExecutor(history);

  inner.add(nested);
  outer.add(first);
  outer.add(second);
  outer.add(inner);
  document.addShape(outer);

  executor.execute(new AddToCommand(document, first, inner));
  assert.deepEqual(ids(outer), ['b', 'inner']);
  assert.deepEqual(ids(inner), ['c', 'a']);
  assert.equal(first.parent, inner);

  history.undo();
  assert.deepEqual(ids(outer), ['a', 'b', 'inner']);
  assert.deepEqual(ids(inner), ['c']);
  assert.equal(first.parent, outer);

  history.redo();
  assert.deepEqual(ids(outer), ['b', 'inner']);
  assert.deepEqual(ids(inner), ['c', 'a']);
});

test('addto moves a group subtree and restores it on undo', () => {
  const document = new Document(100, 100);
  const outer = document.createGroup('outer');
  const inner = document.createGroup('inner');
  const rect = new Rect('r1', 0, 0, 10, 10);
  const target = document.createGroup('target');
  const history = new History();
  const executor = new CommandExecutor(history);

  inner.add(rect);
  outer.add(inner);
  document.addShape(outer);
  document.addShape(target);

  executor.execute(new AddToCommand(document, outer, target));
  assert.deepEqual(ids(document.root), ['target']);
  assert.deepEqual(ids(target), ['outer']);
  assert.deepEqual(ids(outer), ['inner']);
  assert.deepEqual(ids(inner), ['r1']);
  assert.equal(document.findShape('r1'), rect);

  history.undo();
  assert.deepEqual(ids(document.root), ['outer', 'target']);
  assert.deepEqual(ids(target), []);
  assert.deepEqual(ids(outer), ['inner']);
  assert.deepEqual(ids(inner), ['r1']);
});

test('addto in the same container moves the shape to the last position', () => {
  const document = new Document(100, 100);
  const group = document.createGroup('g');
  const first = new Rect('a', 0, 0, 10, 10);
  const second = new Rect('b', 10, 0, 10, 10);
  const third = new Rect('c', 20, 0, 10, 10);
  const history = new History();
  const executor = new CommandExecutor(history);

  group.add(first);
  group.add(second);
  group.add(third);
  document.addShape(group);

  executor.execute(new AddToCommand(document, first, group));
  assert.deepEqual(ids(group), ['b', 'c', 'a']);

  history.undo();
  assert.deepEqual(ids(group), ['a', 'b', 'c']);

  history.redo();
  assert.deepEqual(ids(group), ['b', 'c', 'a']);
});

test('addto already-last is still recorded and undo keeps the order', () => {
  const document = new Document(100, 100);
  const group = document.createGroup('g');
  const first = new Rect('a', 0, 0, 10, 10);
  const last = new Rect('b', 10, 0, 10, 10);
  const history = new History();
  const executor = new CommandExecutor(history);

  group.add(first);
  group.add(last);
  document.addShape(group);

  executor.execute(new AddToCommand(document, last, group));
  assert.deepEqual(ids(group), ['a', 'b']);
  assert.equal(history.canUndo, true);

  history.undo();
  assert.deepEqual(ids(group), ['a', 'b']);
});

test('addto rejects moving a container into itself or its descendant', () => {
  const document = new Document(100, 100);
  const outer = document.createGroup('outer');
  const inner = document.createGroup('inner');
  const rect = new Rect('r1', 0, 0, 10, 10);

  inner.add(rect);
  outer.add(inner);
  document.addShape(outer);

  assert.throws(
    () => new AddToCommand(document, outer, outer),
    { message: 'cannot move a container into its own descendant: outer' },
  );
  assert.throws(
    () => new AddToCommand(document, outer, inner),
    { message: 'cannot move a container into its own descendant: outer' },
  );

  assert.deepEqual(ids(document.root), ['outer']);
  assert.deepEqual(ids(outer), ['inner']);
  assert.deepEqual(ids(inner), ['r1']);
  assert.equal(outer.parent, document.root);
  assert.equal(inner.parent, outer);
});

test('addto rejects detached targets and preserves existing history', () => {
  const document = new Document(100, 100);
  const detached = new Rect('r9', 0, 0, 10, 10);
  const shape = new Rect('r1', 0, 0, 10, 10);
  const group = document.createGroup('g');
  const history = new History();
  const executor = new CommandExecutor(history);

  document.addShape(shape);
  document.addShape(group);

  assert.throws(
    () => new AddToCommand(document, detached, group),
    { message: 'no such shape: r9' },
  );
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, false);

  executor.execute(new AddToCommand(document, shape, group));
  history.undo();
  assert.equal(history.canRedo, true);

  assert.throws(
    () => new AddToCommand(document, detached, group),
    { message: 'no such shape: r9' },
  );

  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, true);
  assert.equal(document.findShape('r1'), shape);
});

test('front moves a root shape to the visual front and undo restores order', () => {
  const document = new Document(100, 100);
  const first = new Rect('a', 0, 0, 10, 10);
  const second = new Rect('b', 10, 0, 10, 10);
  const third = new Rect('c', 20, 0, 10, 10);
  const history = new History();
  const executor = new CommandExecutor(history);

  document.addShape(first);
  document.addShape(second);
  document.addShape(third);

  executor.execute(new FrontCommand(document, first));
  assert.deepEqual(ids(document.root), ['b', 'c', 'a']);

  history.undo();
  assert.deepEqual(ids(document.root), ['a', 'b', 'c']);

  history.redo();
  assert.deepEqual(ids(document.root), ['b', 'c', 'a']);
});

test('back moves a root shape to the visual back and undo restores order', () => {
  const document = new Document(100, 100);
  const first = new Rect('a', 0, 0, 10, 10);
  const second = new Rect('b', 10, 0, 10, 10);
  const third = new Rect('c', 20, 0, 10, 10);
  const history = new History();
  const executor = new CommandExecutor(history);

  document.addShape(first);
  document.addShape(second);
  document.addShape(third);

  executor.execute(new BackCommand(document, third));
  assert.deepEqual(ids(document.root), ['c', 'a', 'b']);

  history.undo();
  assert.deepEqual(ids(document.root), ['a', 'b', 'c']);

  history.redo();
  assert.deepEqual(ids(document.root), ['c', 'a', 'b']);
});

test('front and back work on nested siblings and preserve group structure', () => {
  const document = new Document(100, 100);
  const group = document.createGroup('g');
  const first = new Rect('a', 0, 0, 10, 10);
  const second = new Rect('b', 10, 0, 10, 10);
  const third = new Rect('c', 20, 0, 10, 10);
  const after = new Rect('d', 30, 0, 10, 10);
  const history = new History();
  const executor = new CommandExecutor(history);

  group.add(first);
  group.add(second);
  group.add(third);
  document.addShape(group);
  document.addShape(after);

  executor.execute(new FrontCommand(document, first));
  assert.deepEqual(ids(group), ['b', 'c', 'a']);
  assert.deepEqual(ids(document.root), ['g', 'd']);

  executor.execute(new BackCommand(document, third));
  assert.deepEqual(ids(group), ['c', 'b', 'a']);

  history.undo();
  assert.deepEqual(ids(group), ['b', 'c', 'a']);

  history.undo();
  assert.deepEqual(ids(group), ['a', 'b', 'c']);

  history.redo();
  assert.deepEqual(ids(group), ['b', 'c', 'a']);

  history.redo();
  assert.deepEqual(ids(group), ['c', 'b', 'a']);
});

test('front and back on group targets move the whole subtree', () => {
  const document = new Document(100, 100);
  const first = document.createGroup('g1');
  const second = document.createGroup('g2');
  const third = document.createGroup('g3');
  const child = new Rect('r1', 0, 0, 10, 10);
  const history = new History();
  const executor = new CommandExecutor(history);

  third.add(child);
  document.addShape(first);
  document.addShape(second);
  document.addShape(third);

  executor.execute(new FrontCommand(document, first));
  assert.deepEqual(ids(document.root), ['g2', 'g3', 'g1']);
  assert.deepEqual(ids(first), []);

  executor.execute(new BackCommand(document, third));
  assert.deepEqual(ids(document.root), ['g3', 'g2', 'g1']);
  assert.deepEqual(ids(third), ['r1']);
  assert.equal(child.parent, third);

  history.undo();
  assert.deepEqual(ids(document.root), ['g2', 'g3', 'g1']);

  history.undo();
  assert.deepEqual(ids(document.root), ['g1', 'g2', 'g3']);
});

test('front and back at boundaries are recorded and undo is exact', () => {
  const document = new Document(100, 100);
  const first = new Rect('a', 0, 0, 10, 10);
  const last = new Rect('b', 10, 0, 10, 10);
  const history = new History();
  const executor = new CommandExecutor(history);

  document.addShape(first);
  document.addShape(last);

  executor.execute(new FrontCommand(document, last));
  assert.deepEqual(ids(document.root), ['a', 'b']);
  assert.equal(history.canUndo, true);
  history.undo();
  assert.deepEqual(ids(document.root), ['a', 'b']);

  executor.execute(new BackCommand(document, first));
  assert.deepEqual(ids(document.root), ['a', 'b']);
  assert.equal(history.canUndo, true);
  history.undo();
  assert.deepEqual(ids(document.root), ['a', 'b']);
});

test('front and back reject detached targets without mutation', () => {
  const document = new Document(100, 100);
  const detached = new Rect('r9', 0, 0, 10, 10);
  const history = new History();

  assert.throws(
    () => new FrontCommand(document, detached),
    { message: 'no such shape: r9' },
  );
  assert.throws(
    () => new BackCommand(document, detached),
    { message: 'no such shape: r9' },
  );

  assert.equal(document.findShape('r9'), undefined);
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, false);
});

test('multiple reorder commands restore order through LIFO undo and redo', () => {
  const document = new Document(100, 100);
  const first = new Rect('a', 0, 0, 10, 10);
  const second = new Rect('b', 10, 0, 10, 10);
  const third = new Rect('c', 20, 0, 10, 10);
  const history = new History();
  const executor = new CommandExecutor(history);

  document.addShape(first);
  document.addShape(second);
  document.addShape(third);

  executor.execute(new FrontCommand(document, first));
  executor.execute(new BackCommand(document, third));
  assert.deepEqual(ids(document.root), ['c', 'b', 'a']);

  history.undo();
  assert.deepEqual(ids(document.root), ['b', 'c', 'a']);

  history.undo();
  assert.deepEqual(ids(document.root), ['a', 'b', 'c']);

  history.redo();
  assert.deepEqual(ids(document.root), ['b', 'c', 'a']);

  history.redo();
  assert.deepEqual(ids(document.root), ['c', 'b', 'a']);
});
