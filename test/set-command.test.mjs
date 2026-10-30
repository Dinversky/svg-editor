import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const { CommandExecutor } = require('../dist/commands/CommandExecutor.js');
const { History } = require('../dist/commands/History.js');
const { SetCommand } = require('../dist/commands/SetCommand.js');
const { ShowFormatter } = require('../dist/app/ShowFormatter.js');
const { Circle } = require('../dist/model/Circle.js');
const { Document } = require('../dist/model/Document.js');
const { Ellipse } = require('../dist/model/Ellipse.js');
const { Line } = require('../dist/model/Line.js');
const { Rect } = require('../dist/model/Rect.js');
const { Text } = require('../dist/model/Text.js');

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
