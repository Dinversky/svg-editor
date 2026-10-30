import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const { AddToCommand } = require('../dist/commands/AddToCommand.js');
const { BackCommand } = require('../dist/commands/BackCommand.js');
const { CommandExecutor } = require('../dist/commands/CommandExecutor.js');
const { DeleteCommand } = require('../dist/commands/DeleteCommand.js');
const { FrontCommand } = require('../dist/commands/FrontCommand.js');
const { GroupCommand } = require('../dist/commands/GroupCommand.js');
const { History } = require('../dist/commands/History.js');
const { MoveCommand } = require('../dist/commands/MoveCommand.js');
const { ScaleCommand } = require('../dist/commands/ScaleCommand.js');
const { SetCommand } = require('../dist/commands/SetCommand.js');
const { UngroupCommand } = require('../dist/commands/UngroupCommand.js');
const { ShowFormatter } = require('../dist/app/ShowFormatter.js');
const { Circle } = require('../dist/model/Circle.js');
const { Document } = require('../dist/model/Document.js');
const { Ellipse } = require('../dist/model/Ellipse.js');
const { Line } = require('../dist/model/Line.js');
const { Rect } = require('../dist/model/Rect.js');
const { Text } = require('../dist/model/Text.js');

// 所有命令对象测试共用：容器子节点 ID 顺序。
function ids(container) {
  return container.children.map((shape) => shape.id);
}

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

test('sets geometry and text attributes for every leaf shape type', () => {
  const rect = new Rect('r1', 0, 0, 10, 10);
  rect.setAttribute('x', 5);
  rect.setAttribute('y', -3);
  rect.setAttribute('width', 20);
  rect.setAttribute('height', 30);
  assert.deepEqual(
    [rect.x, rect.y, rect.width, rect.height],
    [5, -3, 20, 30],
  );
  assert.deepEqual(
    ['x', 'y', 'width', 'height'].map((name) => rect.getAttribute(name)),
    [5, -3, 20, 30],
  );

  const circle = new Circle('c1', 0, 0, 5);
  circle.setAttribute('cx', 2);
  circle.setAttribute('cy', 3);
  circle.setAttribute('r', 7);
  assert.deepEqual([circle.cx, circle.cy, circle.r], [2, 3, 7]);

  const ellipse = new Ellipse('e1', 0, 0, 5, 6);
  ellipse.setAttribute('cx', 1);
  ellipse.setAttribute('cy', 2);
  ellipse.setAttribute('rx', 8);
  ellipse.setAttribute('ry', 9);
  assert.deepEqual([ellipse.cx, ellipse.cy, ellipse.rx, ellipse.ry], [1, 2, 8, 9]);

  const line = new Line('l1', 0, 0, 1, 1);
  line.setAttribute('x1', 4);
  line.setAttribute('y1', 5);
  line.setAttribute('x2', 6);
  line.setAttribute('y2', 7);
  assert.deepEqual([line.x1, line.y1, line.x2, line.y2], [4, 5, 6, 7]);

  const text = new Text('t1', 0, 0, 'old');
  text.setAttribute('x', 8);
  text.setAttribute('y', 9);
  text.setAttribute('text', 'new label');
  assert.deepEqual([text.x, text.y], [8, 9]);
  assert.equal(text.content, 'new label');
  assert.equal(text.getAttribute('text'), 'new label');
});

test('sets common style attributes and serializes them in a fixed order', () => {
  const rect = new Rect('r1', 0, 0, 10, 10, 'red');
  rect.setAttribute('stroke', '#000');
  rect.setAttribute('stroke-width', 2);
  assert.equal(rect.fill, 'red');
  assert.equal(rect.stroke, '#000');
  assert.equal(rect.strokeWidth, 2);
  assert.equal(
    rect.toSvgElement(),
    '<rect id="r1" x="0" y="0" width="10" height="10" fill="red" stroke="#000" stroke-width="2"/>',
  );
  assert.equal(
    rect.describe(),
    'rect#r1 x=0 y=0 w=10 h=10 fill=red stroke=#000 stroke-width=2',
  );

  const line = new Line('l1', 0, 0, 10, 10, 'black');
  line.setAttribute('stroke-width', 3);
  assert.equal(
    line.toSvgElement(),
    '<line id="l1" x1="0" y1="0" x2="10" y2="10" stroke="black" stroke-width="3"/>',
  );

  const text = new Text('t1', 1, 2, 'Hi');
  text.setAttribute('fill', 'blue');
  assert.equal(
    text.toSvgElement(),
    '<text id="t1" x="1" y="2" fill="blue">Hi</text>',
  );

  const group = new Document(100, 100).createGroup('g1');
  group.setAttribute('fill', 'red');
  assert.equal(group.toSvgElement(), '<g id="g1" fill="red"/>');

  const child = new Rect('c1', 0, 0, 1, 1);
  group.add(child);
  assert.equal(
    group.toSvgElement(),
    '<g id="g1" fill="red">\n  <rect id="c1" x="0" y="0" width="1" height="1"/>\n</g>',
  );

  const circle = new Circle('c2', 1, 2, 3);
  circle.setAttribute('stroke-width', 0);
  assert.equal(circle.strokeWidth, 0);
  assert.equal(
    circle.toSvgElement(),
    '<circle id="c2" cx="1" cy="2" r="3" stroke-width="0"/>',
  );
});

test('rejects unknown and unsupported attributes without mutation', () => {
  const rect = new Rect('r1', 0, 0, 10, 10);
  const line = new Line('l1', 0, 0, 1, 1);
  const text = new Text('t1', 1, 2, 'hello');
  const group = new Document(100, 100).createGroup('g1');

  assert.throws(() => rect.setAttribute('foo', 1), { message: 'unknown attribute: foo' });
  assert.throws(() => rect.setAttribute('cx', 1), { message: 'unknown attribute: cx' });
  assert.throws(() => rect.setAttribute('text', 'x'), { message: 'unknown attribute: text' });
  assert.throws(() => line.setAttribute('width', 1), { message: 'unknown attribute: width' });
  assert.throws(() => text.setAttribute('width', 1), { message: 'unknown attribute: width' });
  assert.throws(() => group.setAttribute('x', 1), { message: 'unknown attribute: x' });

  assert.deepEqual([rect.x, rect.y, rect.width, rect.height], [0, 0, 10, 10]);
  assert.equal(text.content, 'hello');
  assert.equal(group.fill, undefined);
});

test('rejects invalid numeric, size, color, stroke-width, and text values', () => {
  const rect = new Rect('r1', 0, 0, 10, 10, 'red');
  const circle = new Circle('c1', 0, 0, 5);
  const ellipse = new Ellipse('e1', 0, 0, 5, 6);
  const text = new Text('t1', 1, 2, 'hello');

  for (const [name, value] of [
    ['x', '10'],
    ['x', NaN],
    ['x', Infinity],
    ['width', 0],
    ['width', -1],
    ['height', 0],
  ]) {
    assert.throws(() => rect.setAttribute(name, value));
  }

  assert.throws(() => circle.setAttribute('r', 0), { message: 'radius must be positive' });
  assert.throws(() => circle.setAttribute('cx', NaN), { message: 'invalid number for cx: NaN' });
  assert.throws(() => ellipse.setAttribute('rx', 0), { message: 'rx must be positive' });
  assert.throws(() => ellipse.setAttribute('ry', -1), { message: 'ry must be positive' });
  assert.throws(() => text.setAttribute('text', 123), { message: 'invalid value for text: 123' });

  assert.throws(() => rect.setAttribute('fill', 'notacolor'), { message: 'invalid color for fill: notacolor' });
  assert.throws(() => rect.setAttribute('stroke', '#ff'), { message: 'invalid color for stroke: #ff' });
  assert.throws(() => rect.setAttribute('stroke-width', -1), { message: 'stroke-width must be non-negative' });
  assert.throws(() => rect.setAttribute('stroke-width', '2'), { message: 'invalid number for stroke-width: 2' });
  assert.throws(() => rect.setAttribute('stroke-width', Infinity), { message: 'invalid number for stroke-width: Infinity' });

  assert.deepEqual([rect.x, rect.y, rect.width, rect.height], [0, 0, 10, 10]);
  assert.equal(rect.fill, 'red');
  assert.equal(rect.stroke, undefined);
  assert.equal(rect.strokeWidth, undefined);
  assert.deepEqual([circle.cx, circle.cy, circle.r], [0, 0, 5]);
  assert.deepEqual([ellipse.cx, ellipse.cy, ellipse.rx, ellipse.ry], [0, 0, 5, 6]);
  assert.deepEqual([text.x, text.y], [1, 2]);
  assert.equal(text.content, 'hello');
});

test('SetCommand updates geometry and undo/redo restores old values', () => {
  const document = new Document(100, 100);
  const rect = new Rect('r1', 10, 20, 30, 40);
  const history = new History();
  const executor = new CommandExecutor(history);

  document.addShape(rect);
  const command = new SetCommand(rect, 'x', 50);

  executor.execute(command);
  assert.equal(rect.x, 50);
  assert.equal(history.canUndo, true);
  assert.equal(history.canRedo, false);

  history.undo();
  assert.equal(rect.x, 10);

  history.redo();
  assert.equal(rect.x, 50);

  history.undo();
  assert.equal(rect.x, 10);
  assert.equal(document.findShape('r1'), rect);
  assert.equal(rect.parent, document.root);
});

test('SetCommand adds and removes optional styles on undo and redo', () => {
  const document = new Document(100, 100);
  const circle = new Circle('c1', 1, 2, 3);
  const history = new History();
  const executor = new CommandExecutor(history);

  document.addShape(circle);
  const command = new SetCommand(circle, 'fill', 'red');

  executor.execute(command);
  assert.equal(circle.fill, 'red');
  assert.equal(circle.toSvgElement(), '<circle id="c1" cx="1" cy="2" r="3" fill="red"/>');

  history.undo();
  assert.equal(circle.fill, undefined);
  assert.equal(circle.toSvgElement(), '<circle id="c1" cx="1" cy="2" r="3"/>');

  history.redo();
  assert.equal(circle.fill, 'red');

  history.undo();
  assert.equal(circle.fill, undefined);
});

test('SetCommand restores text content and stroke-width exactly', () => {
  const document = new Document(100, 100);
  const text = new Text('t1', 1, 2, 'old');
  const rect = new Rect('r1', 0, 0, 10, 10);
  const history = new History();
  const executor = new CommandExecutor(history);

  document.addShape(text);
  document.addShape(rect);

  executor.execute(new SetCommand(text, 'text', 'new value'));
  assert.equal(text.content, 'new value');
  history.undo();
  assert.equal(text.content, 'old');
  history.redo();
  assert.equal(text.content, 'new value');
  history.undo();
  assert.equal(text.content, 'old');

  executor.execute(new SetCommand(rect, 'stroke-width', 2));
  assert.equal(rect.strokeWidth, 2);
  assert.match(rect.toSvgElement(), / stroke-width="2"\/>$/);
  history.undo();
  assert.equal(rect.strokeWidth, undefined);
  assert.doesNotMatch(rect.toSvgElement(), /stroke-width/);
});

test('SetCommand restores an old value that would be invalid as new input', () => {
  const document = new Document(100, 100);
  const rect = new Rect('r1', 0, 0, 10, 10, 'red&"<>');
  const history = new History();
  const executor = new CommandExecutor(history);

  document.addShape(rect);
  executor.execute(new SetCommand(rect, 'fill', 'blue'));
  assert.equal(rect.fill, 'blue');

  history.undo();
  assert.equal(rect.fill, 'red&"<>');
  assert.equal(
    rect.toSvgElement(),
    '<rect id="r1" x="0" y="0" width="10" height="10" fill="red&amp;&quot;&lt;&gt;"/>',
  );
});

test('rejects invalid SetCommand construction without touching document or history', () => {
  const document = new Document(100, 100);
  const rect = new Rect('r1', 10, 20, 30, 40, 'red');
  const history = new History();
  const executor = new CommandExecutor(history);

  document.addShape(rect);

  assert.throws(
    () => new SetCommand(rect, 'foo', 1),
    { message: 'unknown attribute: foo' },
  );
  assert.throws(
    () => new SetCommand(rect, 'x', 'abc'),
    { message: 'invalid number for x: abc' },
  );
  assert.throws(
    () => new SetCommand(rect, 'width', 0),
    { message: 'width must be positive' },
  );
  assert.throws(
    () => new SetCommand(rect, 'fill', 'notacolor'),
    { message: 'invalid color for fill: notacolor' },
  );

  assert.deepEqual([rect.x, rect.y, rect.width, rect.height], [10, 20, 30, 40]);
  assert.equal(rect.fill, 'red');
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, false);

  executor.execute(new SetCommand(rect, 'x', 20));
  history.undo();
  assert.equal(history.canRedo, true);

  assert.throws(
    () => new SetCommand(rect, 'height', -1),
    { message: 'height must be positive' },
  );

  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, true);
  assert.equal(rect.x, 10);
});

test('set on a nested shape preserves parent, order, and ID lookup', () => {
  const document = new Document(100, 100);
  const group = document.createGroup('g1');
  const first = new Rect('r1', 10, 20, 30, 40);
  const second = new Rect('r2', 50, 60, 10, 10);
  const history = new History();
  const executor = new CommandExecutor(history);

  group.add(first);
  group.add(second);
  document.addShape(group);

  executor.execute(new SetCommand(first, 'x', 15));
  assert.equal(first.x, 15);
  assert.deepEqual(group.children.map((shape) => shape.id), ['r1', 'r2']);
  assert.equal(first.parent, group);
  assert.equal(document.findShape('r1'), first);

  history.undo();
  assert.equal(first.x, 10);
  assert.deepEqual(group.children.map((shape) => shape.id), ['r1', 'r2']);
});

test('show formats common styles for shapes, lines, and groups', () => {
  const formatter = new ShowFormatter();
  const document = new Document(100, 100);
  const rect = new Rect('r1', 0, 0, 10, 10, 'red');
  const line = new Line('l1', 0, 0, 10, 10, 'black');
  const group = document.createGroup('g1');

  rect.setAttribute('stroke', 'black');
  rect.setAttribute('stroke-width', 2);
  line.setAttribute('stroke-width', 3);
  group.setAttribute('fill', 'red');
  document.addShape(rect);
  document.addShape(line);
  document.addShape(group);

  assert.equal(
    formatter.format(rect),
    'rect#r1  parent=svg\n  x=0 y=0 w=10 h=10\n  fill=red stroke=black stroke-width=2',
  );
  assert.equal(
    formatter.format(line),
    'line#l1  parent=svg\n  (0,0) -> (10,10)\n  stroke=black stroke-width=3',
  );
  assert.equal(formatter.format(group), 'g#g1  parent=svg\n  fill=red');
});

test('sets styles on a group and undo clears them', () => {
  const document = new Document(100, 100);
  const group = document.createGroup('g1');
  const history = new History();
  const executor = new CommandExecutor(history);

  document.addShape(group);
  executor.execute(new SetCommand(group, 'fill', '#abc'));
  assert.equal(group.fill, '#abc');
  assert.equal(group.toSvgElement(), '<g id="g1" fill="#abc"/>');

  history.undo();
  assert.equal(group.fill, undefined);
  assert.equal(group.toSvgElement(), '<g id="g1"/>');
});

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
