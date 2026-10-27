import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const { CommandExecutor } = require('../dist/commands/CommandExecutor.js');
const { History } = require('../dist/commands/History.js');
const { MoveCommand } = require('../dist/commands/MoveCommand.js');
const { ScaleCommand } = require('../dist/commands/ScaleCommand.js');
const { Circle } = require('../dist/model/Circle.js');
const { Document } = require('../dist/model/Document.js');
const { Ellipse } = require('../dist/model/Ellipse.js');
const { Line } = require('../dist/model/Line.js');
const { Rect } = require('../dist/model/Rect.js');
const { Text } = require('../dist/model/Text.js');

test('rect translates and scales every geometry field without changing fill', () => {
  const rect = new Rect('r1', 10, 20, 30, 40, 'red');

  rect.translateBy(5, -3);
  assert.equal(rect.x, 15);
  assert.equal(rect.y, 17);
  assert.equal(rect.width, 30);
  assert.equal(rect.height, 40);
  assert.equal(rect.fill, 'red');

  rect.scaleBy(2);
  assert.equal(rect.x, 30);
  assert.equal(rect.y, 34);
  assert.equal(rect.width, 60);
  assert.equal(rect.height, 80);
  assert.equal(rect.fill, 'red');
});

test('circle and ellipse translate and scale centers and radii without changing fill', () => {
  const circle = new Circle('c1', 10, -20, 5, '#fff');
  circle.translateBy(-4, 6);
  assert.equal(circle.cx, 6);
  assert.equal(circle.cy, -14);
  assert.equal(circle.r, 5);
  circle.scaleBy(0.5);
  assert.equal(circle.cx, 3);
  assert.equal(circle.cy, -7);
  assert.equal(circle.r, 2.5);
  assert.equal(circle.fill, '#fff');

  const ellipse = new Ellipse('e1', 10, 20, 30, 40, 'blue');
  ellipse.translateBy(2, -2);
  assert.equal(ellipse.cx, 12);
  assert.equal(ellipse.cy, 18);
  assert.equal(ellipse.rx, 30);
  assert.equal(ellipse.ry, 40);
  ellipse.scaleBy(2);
  assert.equal(ellipse.cx, 24);
  assert.equal(ellipse.cy, 36);
  assert.equal(ellipse.rx, 60);
  assert.equal(ellipse.ry, 80);
  assert.equal(ellipse.fill, 'blue');
});

test('line translates and scales endpoints without changing stroke', () => {
  const line = new Line('l1', 0, 10, 100, 20, 'black');

  line.translateBy(5, -5);
  assert.deepEqual(
    [line.x1, line.y1, line.x2, line.y2],
    [5, 5, 105, 15],
  );
  assert.equal(line.stroke, 'black');

  line.scaleBy(2);
  assert.deepEqual(
    [line.x1, line.y1, line.x2, line.y2],
    [10, 10, 210, 30],
  );
  assert.equal(line.stroke, 'black');
});

test('text translates and scales position without changing content', () => {
  const text = new Text('t1', 10, 20, 'Hello & <SVG>');

  text.translateBy(-5, 3);
  assert.equal(text.x, 5);
  assert.equal(text.y, 23);
  assert.equal(text.content, 'Hello & <SVG>');

  text.scaleBy(2);
  assert.equal(text.x, 10);
  assert.equal(text.y, 46);
  assert.equal(text.content, 'Hello & <SVG>');
});

test('groups recursively translate and scale descendants exactly once', () => {
  const document = new Document(100, 100);
  const group = document.createGroup('g1');
  const nested = document.createGroup('g2');
  const rect = new Rect('r1', 10, 20, 30, 40);
  const circle = new Circle('c1', -5, 10, 4);
  const text = new Text('t1', 2, 3, 'hi');

  group.add(rect);
  group.add(nested);
  nested.add(circle);
  nested.add(text);
  document.addShape(group);

  group.translateBy(10, -5);
  assert.deepEqual(
    [rect.x, rect.y, circle.cx, circle.cy, text.x, text.y],
    [20, 15, 5, 5, 12, -2],
  );

  group.scaleBy(2);
  assert.deepEqual(
    [rect.x, rect.y, rect.width, rect.height],
    [40, 30, 60, 80],
  );
  assert.deepEqual([circle.cx, circle.cy, circle.r], [10, 10, 8]);
  assert.deepEqual([text.x, text.y], [24, -4]);
  assert.equal(text.content, 'hi');
  assert.equal(document.findShape('r1'), rect);
  assert.equal(document.findShape('c1'), circle);
  assert.equal(document.findShape('t1'), text);
});

test('captureGeometry and restoreGeometry round-trip every shape type', () => {
  const shapes = [
    new Rect('r1', 10.5, -20, 30, 40),
    new Circle('c1', -5.5, 10, 4),
    new Ellipse('e1', 1, 2, 3, 4),
    new Line('l1', 0, 1, 2, 3),
    new Text('t1', 4, 5, 'x'),
  ];

  for (const shape of shapes) {
    const snapshot = shape.captureGeometry();
    shape.translateBy(7, -3);
    shape.scaleBy(0.5);
    shape.restoreGeometry(snapshot);
    assert.deepEqual(shape.captureGeometry(), snapshot);
  }

  const group = new Document(10, 10).createGroup('g');
  assert.deepEqual(group.captureGeometry(), []);
  group.restoreGeometry([]);
});

test('MoveCommand moves a leaf and undo/redo restore exact geometry', () => {
  const document = new Document(100, 100);
  const rect = new Rect('r1', 10, 20, 30, 40, 'red');
  const history = new History();
  const executor = new CommandExecutor(history);

  document.addShape(rect);
  const command = new MoveCommand(rect, 30, -5);

  executor.execute(command);
  assert.deepEqual([rect.x, rect.y, rect.width, rect.height], [40, 15, 30, 40]);
  assert.equal(history.canUndo, true);
  assert.equal(history.canRedo, false);

  history.undo();
  assert.deepEqual([rect.x, rect.y, rect.width, rect.height], [10, 20, 30, 40]);

  history.redo();
  assert.deepEqual([rect.x, rect.y, rect.width, rect.height], [40, 15, 30, 40]);

  history.undo();
  assert.deepEqual([rect.x, rect.y, rect.width, rect.height], [10, 20, 30, 40]);
  assert.equal(document.findShape('r1'), rect);
  assert.equal(rect.parent, document.root);
});

test('ScaleCommand scales a group and undo restores every descendant exactly', () => {
  const document = new Document(100, 100);
  const group = document.createGroup('g');
  const nested = document.createGroup('n');
  const rect = new Rect('r1', 10, 20, 30, 40, 'red');
  const text = new Text('t1', 4, 6, 'label');
  const circle = new Circle('c1', -10, 5, 4, 'blue');
  const history = new History();
  const executor = new CommandExecutor(history);
  const factor = 0.3;

  group.add(rect);
  group.add(text);
  group.add(nested);
  nested.add(circle);
  document.addShape(group);

  executor.execute(new ScaleCommand(group, factor));

  assert.equal(rect.x, 10 * factor);
  assert.equal(rect.y, 20 * factor);
  assert.equal(rect.width, 30 * factor);
  assert.equal(rect.height, 40 * factor);
  assert.equal(text.x, 4 * factor);
  assert.equal(text.y, 6 * factor);
  assert.equal(text.content, 'label');
  assert.equal(circle.cx, -10 * factor);
  assert.equal(circle.cy, 5 * factor);
  assert.equal(circle.r, 4 * factor);

  history.undo();
  assert.deepEqual([rect.x, rect.y, rect.width, rect.height], [10, 20, 30, 40]);
  assert.deepEqual([text.x, text.y], [4, 6]);
  assert.deepEqual([circle.cx, circle.cy, circle.r], [-10, 5, 4]);
  assert.deepEqual(group.children.map((shape) => shape.id), ['r1', 't1', 'n']);
  assert.deepEqual(nested.children.map((shape) => shape.id), ['c1']);
  assert.equal(rect.parent, group);
  assert.equal(circle.parent, nested);

  history.redo();
  assert.equal(rect.x, 10 * factor);
  assert.equal(rect.width, 30 * factor);
  assert.equal(circle.r, 4 * factor);

  history.undo();
  assert.deepEqual([rect.x, rect.y, rect.width, rect.height], [10, 20, 30, 40]);
  assert.deepEqual([circle.cx, circle.cy, circle.r], [-10, 5, 4]);
});

test('ScaleCommand rejects zero, negative, and non-finite factors without mutation', () => {
  const document = new Document(100, 100);
  const rect = new Rect('r1', 10, 20, 30, 40);
  const history = new History();

  document.addShape(rect);

  for (const factor of [0, -1, -0.5, NaN, Infinity, -Infinity]) {
    assert.throws(
      () => new ScaleCommand(rect, factor),
      { message: 'scale factor must be positive' },
    );
  }

  assert.deepEqual([rect.x, rect.y, rect.width, rect.height], [10, 20, 30, 40]);
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, false);
});

test('MoveCommand rejects non-finite deltas without mutation', () => {
  const document = new Document(100, 100);
  const rect = new Rect('r1', 10, 20, 30, 40);
  const history = new History();

  document.addShape(rect);

  for (const [dx, dy] of [[NaN, 0], [0, NaN], [Infinity, 0], [-Infinity, 0], [0, Infinity]]) {
    assert.throws(
      () => new MoveCommand(rect, dx, dy),
      { message: 'move deltas must be finite numbers' },
    );
  }

  assert.deepEqual([rect.x, rect.y, rect.width, rect.height], [10, 20, 30, 40]);
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, false);
});

test('invalid command construction preserves an existing redo stack', () => {
  const document = new Document(100, 100);
  const rect = new Rect('r1', 10, 20, 30, 40);
  const history = new History();
  const executor = new CommandExecutor(history);

  document.addShape(rect);
  executor.execute(new MoveCommand(rect, 5, 5));
  history.undo();

  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, true);
  assert.deepEqual([rect.x, rect.y], [10, 20]);

  assert.throws(
    () => new ScaleCommand(rect, 0),
    { message: 'scale factor must be positive' },
  );

  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, true);
  assert.deepEqual([rect.x, rect.y], [10, 20]);

  history.redo();
  assert.deepEqual([rect.x, rect.y], [15, 25]);
});

test('move on a nested child preserves parent, order, and ID lookup', () => {
  const document = new Document(100, 100);
  const group = document.createGroup('g');
  const first = new Rect('r1', 10, 20, 30, 40);
  const second = new Rect('r2', 50, 60, 10, 10);
  const history = new History();
  const executor = new CommandExecutor(history);

  group.add(first);
  group.add(second);
  document.addShape(group);

  executor.execute(new MoveCommand(first, -5, 10));
  assert.deepEqual([first.x, first.y], [5, 30]);
  assert.deepEqual([second.x, second.y], [50, 60]);
  assert.deepEqual(group.children.map((shape) => shape.id), ['r1', 'r2']);
  assert.equal(first.parent, group);
  assert.equal(document.findShape('r1'), first);

  history.undo();
  assert.deepEqual([first.x, first.y], [10, 20]);
  assert.deepEqual(group.children.map((shape) => shape.id), ['r1', 'r2']);
});

test('commands reject invalid resulting geometry before capturing a snapshot', () => {
  const document = new Document(100, 100);
  const rect = new Rect('r1', 10, 20, 30, 40);
  const huge = new Rect('r2', Number.MAX_VALUE, 0, 10, 10);
  const tiny = new Rect('r3', 0, 0, Number.MIN_VALUE, Number.MIN_VALUE);
  const history = new History();
  const executor = new CommandExecutor(history);

  document.addShape(rect);
  document.addShape(huge);
  document.addShape(tiny);

  assert.throws(
    () => executor.execute(new ScaleCommand(rect, Number.MAX_VALUE)),
    { message: 'scale would produce invalid geometry' },
  );
  assert.throws(
    () => executor.execute(new ScaleCommand(tiny, Number.MIN_VALUE)),
    { message: 'scale would produce invalid geometry' },
  );
  assert.throws(
    () => executor.execute(new MoveCommand(huge, Number.MAX_VALUE, 0)),
    { message: 'move would produce invalid geometry' },
  );

  assert.deepEqual([rect.x, rect.y, rect.width, rect.height], [10, 20, 30, 40]);
  assert.deepEqual(
    [huge.x, huge.y, huge.width, huge.height],
    [Number.MAX_VALUE, 0, 10, 10],
  );
  assert.deepEqual(
    [tiny.x, tiny.y, tiny.width, tiny.height],
    [0, 0, Number.MIN_VALUE, Number.MIN_VALUE],
  );
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, false);
});

test('identity scale and zero move are valid and recorded', () => {
  const document = new Document(100, 100);
  const rect = new Rect('r1', 10, 20, 30, 40);
  const history = new History();
  const executor = new CommandExecutor(history);

  document.addShape(rect);

  executor.execute(new ScaleCommand(rect, 1));
  assert.deepEqual([rect.x, rect.y, rect.width, rect.height], [10, 20, 30, 40]);
  assert.equal(history.canUndo, true);

  history.undo();
  assert.deepEqual([rect.x, rect.y, rect.width, rect.height], [10, 20, 30, 40]);

  executor.execute(new MoveCommand(rect, 0, 0));
  assert.deepEqual([rect.x, rect.y], [10, 20]);
  assert.equal(history.canUndo, true);
});
