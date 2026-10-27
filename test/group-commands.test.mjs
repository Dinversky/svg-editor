import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const { CommandExecutor } = require('../dist/commands/CommandExecutor.js');
const { GroupCommand } = require('../dist/commands/GroupCommand.js');
const { History } = require('../dist/commands/History.js');
const { UngroupCommand } = require('../dist/commands/UngroupCommand.js');
const { Document } = require('../dist/model/Document.js');
const { Rect } = require('../dist/model/Rect.js');

function ids(container) {
  return container.children.map((shape) => shape.id);
}

test('groups root shapes at the first selected position and undo/redo restores them', () => {
  const document = new Document(100, 100);
  const first = new Rect('a', 0, 0, 10, 10);
  const second = new Rect('b', 10, 0, 10, 10);
  const third = new Rect('c', 20, 0, 10, 10);
  const fourth = new Rect('d', 30, 0, 10, 10);
  const history = new History();
  const executor = new CommandExecutor(history);

  document.addShape(first);
  document.addShape(second);
  document.addShape(third);
  document.addShape(fourth);

  executor.execute(new GroupCommand(document, 'g', [second, fourth]));
  const group = document.findShape('g');
  assert.notEqual(group, undefined);
  assert.deepEqual(ids(document.root), ['a', 'g', 'c']);
  assert.deepEqual(ids(group), ['b', 'd']);
  assert.equal(second.parent, group);
  assert.equal(fourth.parent, group);
  assert.equal(document.countShapes(), 5);

  history.undo();
  assert.deepEqual(ids(document.root), ['a', 'b', 'c', 'd']);
  assert.equal(document.findShape('g'), undefined);
  assert.equal(second.parent, document.root);
  assert.equal(fourth.parent, document.root);

  history.redo();
  assert.deepEqual(ids(document.root), ['a', 'g', 'c']);
  assert.equal(document.findShape('g'), group);
  assert.deepEqual(ids(group), ['b', 'd']);

  history.undo();
  assert.deepEqual(ids(document.root), ['a', 'b', 'c', 'd']);
});

test('group keeps command order and restores original sibling indices', () => {
  const document = new Document(100, 100);
  const first = new Rect('a', 0, 0, 10, 10);
  const second = new Rect('b', 10, 0, 10, 10);
  const third = new Rect('c', 20, 0, 10, 10);
  const fourth = new Rect('d', 30, 0, 10, 10);
  const history = new History();
  const executor = new CommandExecutor(history);

  document.addShape(first);
  document.addShape(second);
  document.addShape(third);
  document.addShape(fourth);

  executor.execute(new GroupCommand(document, 'g', [fourth, second]));
  assert.deepEqual(ids(document.root), ['a', 'c', 'g']);
  assert.deepEqual(ids(document.findShape('g')), ['d', 'b']);

  history.undo();
  assert.deepEqual(ids(document.root), ['a', 'b', 'c', 'd']);

  history.redo();
  assert.deepEqual(ids(document.root), ['a', 'c', 'g']);
  assert.deepEqual(ids(document.findShape('g')), ['d', 'b']);
});

test('groups shapes from different parents and restores each parent and index', () => {
  const document = new Document(100, 100);
  const rootFirst = new Rect('a', 0, 0, 10, 10);
  const outer = document.createGroup('outer');
  const nested = new Rect('x', 10, 0, 10, 10);
  const sibling = new Rect('y', 20, 0, 10, 10);
  const rootLast = new Rect('z', 30, 0, 10, 10);
  const history = new History();
  const executor = new CommandExecutor(history);

  outer.add(nested);
  outer.add(sibling);
  document.addShape(rootFirst);
  document.addShape(outer);
  document.addShape(rootLast);

  executor.execute(new GroupCommand(document, 'inner', [nested, rootLast]));
  assert.deepEqual(ids(document.root), ['a', 'outer']);
  assert.deepEqual(ids(outer), ['inner', 'y']);
  assert.deepEqual(ids(document.findShape('inner')), ['x', 'z']);
  assert.equal(nested.parent, document.findShape('inner'));
  assert.equal(rootLast.parent, document.findShape('inner'));

  history.undo();
  assert.deepEqual(ids(document.root), ['a', 'outer', 'z']);
  assert.deepEqual(ids(outer), ['x', 'y']);
  assert.equal(nested.parent, outer);
  assert.equal(rootLast.parent, document.root);
  assert.equal(document.findShape('inner'), undefined);

  history.redo();
  assert.deepEqual(ids(document.root), ['a', 'outer']);
  assert.deepEqual(ids(outer), ['inner', 'y']);
  assert.deepEqual(ids(document.findShape('inner')), ['x', 'z']);
});

test('rejects grouping a container with one of its descendants', () => {
  const document = new Document(100, 100);
  const markers = document.createGroup('markers');
  const circle = new Rect('c1', 0, 0, 10, 10);
  const history = new History();

  markers.add(circle);
  document.addShape(markers);

  assert.throws(
    () => new GroupCommand(document, 'bad', [circle, markers]),
    { message: 'cannot group a container into its own descendant: markers' },
  );

  assert.deepEqual(ids(document.root), ['markers']);
  assert.deepEqual(ids(markers), ['c1']);
  assert.equal(document.findShape('bad'), undefined);
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, false);
});

test('rejects invalid group construction without mutation', () => {
  const document = new Document(100, 100);
  const first = new Rect('a', 0, 0, 10, 10);
  const second = new Rect('b', 10, 0, 10, 10);
  const detached = new Rect('r9', 0, 0, 10, 10);
  const history = new History();

  document.addShape(first);
  document.addShape(second);

  assert.throws(
    () => new GroupCommand(document, 'a', [second]),
    { message: 'id already exists: a' },
  );
  assert.throws(
    () => new GroupCommand(document, 'g', [second, second]),
    { message: 'duplicate shape: b' },
  );
  assert.throws(
    () => new GroupCommand(document, 'g', [detached]),
    { message: 'no such shape: r9' },
  );
  assert.throws(
    () => new GroupCommand(document, 'g', []),
    { message: 'group requires at least one shape' },
  );

  assert.deepEqual(ids(document.root), ['a', 'b']);
  assert.equal(document.findShape('g'), undefined);
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, false);
});

test('failed group construction preserves an existing redo stack', () => {
  const document = new Document(100, 100);
  const first = new Rect('a', 0, 0, 10, 10);
  const second = new Rect('b', 10, 0, 10, 10);
  const history = new History();
  const executor = new CommandExecutor(history);

  document.addShape(first);
  document.addShape(second);
  executor.execute(new GroupCommand(document, 'g', [second]));
  history.undo();

  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, true);
  assert.deepEqual(ids(document.root), ['a', 'b']);

  assert.throws(
    () => new GroupCommand(document, 'missing', []),
    { message: 'group requires at least one shape' },
  );

  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, true);

  history.redo();
  assert.deepEqual(ids(document.root), ['a', 'g']);
  assert.deepEqual(ids(document.findShape('g')), ['b']);
});

test('ungroups a nested group at its position and undo/redo restores it', () => {
  const document = new Document(100, 100);
  const outer = document.createGroup('outer');
  const before = new Rect('before', 0, 0, 10, 10);
  const group = document.createGroup('g');
  const first = new Rect('x', 10, 0, 10, 10);
  const second = new Rect('y', 20, 0, 10, 10);
  const after = new Rect('after', 30, 0, 10, 10);
  const history = new History();
  const executor = new CommandExecutor(history);

  group.add(first);
  group.add(second);
  outer.add(before);
  outer.add(group);
  outer.add(after);
  document.addShape(outer);

  executor.execute(new UngroupCommand(document, group));
  assert.deepEqual(ids(outer), ['before', 'x', 'y', 'after']);
  assert.deepEqual([first.parent, second.parent], [outer, outer]);
  assert.equal(group.parent, null);
  assert.equal(document.findShape('g'), undefined);
  assert.equal(document.countShapes(), 5);

  history.undo();
  assert.deepEqual(ids(outer), ['before', 'g', 'after']);
  assert.equal(document.findShape('g'), group);
  assert.deepEqual(ids(group), ['x', 'y']);
  assert.deepEqual([first.parent, second.parent], [group, group]);

  history.redo();
  assert.deepEqual(ids(outer), ['before', 'x', 'y', 'after']);
  assert.equal(document.findShape('g'), undefined);

  history.undo();
  assert.deepEqual(ids(outer), ['before', 'g', 'after']);
  assert.deepEqual(ids(group), ['x', 'y']);
});

test('ungroups an empty nested group and restores it on undo', () => {
  const document = new Document(100, 100);
  const outer = document.createGroup('outer');
  const empty = document.createGroup('empty');
  const before = new Rect('a', 0, 0, 10, 10);
  const after = new Rect('b', 10, 0, 10, 10);
  const history = new History();
  const executor = new CommandExecutor(history);

  outer.add(before);
  outer.add(empty);
  outer.add(after);
  document.addShape(outer);

  executor.execute(new UngroupCommand(document, empty));
  assert.deepEqual(ids(outer), ['a', 'b']);
  assert.equal(document.findShape('empty'), undefined);

  history.undo();
  assert.deepEqual(ids(outer), ['a', 'empty', 'b']);
  assert.equal(document.findShape('empty'), empty);
  assert.equal(empty.children.length, 0);
});

test('rejects ungrouping a top-level container without mutation', () => {
  const document = new Document(100, 100);
  const scene = document.createGroup('scene');
  const child = new Rect('r1', 0, 0, 10, 10);
  const history = new History();

  scene.add(child);
  document.addShape(scene);

  assert.throws(
    () => new UngroupCommand(document, scene),
    { message: 'cannot ungroup top-level container: scene' },
  );

  assert.deepEqual(ids(document.root), ['scene']);
  assert.deepEqual(ids(scene), ['r1']);
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, false);
});

test('rejects ungrouping leaves and detached containers without mutation', () => {
  const document = new Document(100, 100);
  const leaf = new Rect('leaf', 0, 0, 10, 10);
  const detached = document.createGroup('g9');
  const history = new History();

  document.addShape(leaf);

  assert.throws(
    () => new UngroupCommand(document, leaf),
    { message: 'not a container: leaf' },
  );
  assert.throws(
    () => new UngroupCommand(document, detached),
    { message: 'no such shape: g9' },
  );

  assert.deepEqual(ids(document.root), ['leaf']);
  assert.equal(detached.parent, null);
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, false);
});

test('promotes nested child groups as siblings without recursive ungrouping', () => {
  const document = new Document(100, 100);
  const outer = document.createGroup('outer');
  const group = document.createGroup('g');
  const first = new Rect('a', 0, 0, 10, 10);
  const inner = document.createGroup('inner');
  const deep = new Rect('b', 10, 0, 10, 10);
  const last = new Rect('c', 20, 0, 10, 10);
  const history = new History();
  const executor = new CommandExecutor(history);

  inner.add(deep);
  group.add(first);
  group.add(inner);
  group.add(last);
  outer.add(group);
  document.addShape(outer);

  executor.execute(new UngroupCommand(document, group));
  assert.deepEqual(ids(outer), ['a', 'inner', 'c']);
  assert.equal(inner.parent, outer);
  assert.deepEqual(ids(inner), ['b']);
  assert.equal(deep.parent, inner);
  assert.equal(document.findShape('g'), undefined);
  assert.equal(document.findShape('inner'), inner);

  history.undo();
  assert.deepEqual(ids(outer), ['g']);
  assert.deepEqual(ids(group), ['a', 'inner', 'c']);
  assert.equal(inner.parent, group);
  assert.equal(deep.parent, inner);
});
