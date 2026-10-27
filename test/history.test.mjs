import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const { CommandExecutor } = require('../dist/commands/CommandExecutor.js');
const { History } = require('../dist/commands/History.js');
const { Document } = require('../dist/model/Document.js');
const { Rect } = require('../dist/model/Rect.js');
const { Shape } = require('../dist/model/Shape.js');

function createLoggingCommand(options = {}) {
  const command = {
    methods: [],
    callers: [],
    execute() {
      command.methods.push('execute');
      command.callers.push(command);

      if (options.failExecute === true) {
        throw new Error('execute failed');
      }
    },
    undo() {
      command.methods.push('undo');
      command.callers.push(command);

      if (options.failUndo === true) {
        throw new Error('undo failed');
      }
    },
  };

  return command;
}

class MutableShape extends Shape {
  constructor(id, value) {
    super(id);
    this.currentValue = value;
  }

  get value() {
    return this.currentValue;
  }

  setValue(value) {
    this.currentValue = value;
  }

  describe() {
    return `mutable#${this.id} value=${this.currentValue}`;
  }

  toSvgElement() {
    return `<mutable id="${this.id}"/>`;
  }
}

class SetValueCommand {
  constructor(shape, nextValue) {
    this.shape = shape;
    this.nextValue = nextValue;
    this.oldValue = undefined;
    this.hasSnapshot = false;
  }

  execute() {
    if (!this.hasSnapshot) {
      this.oldValue = this.shape.value;
      this.hasSnapshot = true;
    }

    this.shape.setValue(this.nextValue);
  }

  undo() {
    this.shape.setValue(this.oldValue);
  }
}

class MoveShapeCommand {
  constructor(document, shape, target, index) {
    this.document = document;
    this.shape = shape;
    this.target = target;
    this.index = index;
    this.source = null;
    this.originalIndex = -1;
    this.hasSnapshot = false;
  }

  execute() {
    if (!this.hasSnapshot) {
      this.source = this.shape.parent;
      this.originalIndex = this.source.indexOf(this.shape);
      this.hasSnapshot = true;
    }

    if (!this.document.moveShape(this.shape, this.target, this.index)) {
      throw new Error('move failed');
    }
  }

  undo() {
    if (!this.document.moveShape(this.shape, this.source, this.originalIndex)) {
      throw new Error('undo move failed');
    }
  }
}

function ids(container) {
  return container.children.map((shape) => shape.id);
}

test('executes, records, undoes, and redoes the same command object', () => {
  const history = new History();
  const executor = new CommandExecutor(history);
  const command = createLoggingCommand();

  executor.execute(command);

  assert.deepEqual(command.methods, ['execute']);
  assert.equal(command.callers.every((caller) => caller === command), true);
  assert.equal(history.canUndo, true);
  assert.equal(history.canRedo, false);

  assert.equal(history.undo(), true);
  assert.deepEqual(command.methods, ['execute', 'undo']);
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, true);

  assert.equal(history.redo(), true);
  assert.deepEqual(command.methods, ['execute', 'undo', 'execute']);
  assert.equal(command.callers.every((caller) => caller === command), true);
  assert.equal(history.canUndo, true);
  assert.equal(history.canRedo, false);
});

test('does not record a failed command and keeps both stacks', () => {
  const history = new History();
  const executor = new CommandExecutor(history);
  const first = createLoggingCommand();
  const second = createLoggingCommand();
  const failing = createLoggingCommand({ failExecute: true });

  executor.execute(first);
  executor.execute(second);
  history.undo();

  assert.equal(history.canUndo, true);
  assert.equal(history.canRedo, true);

  assert.throws(() => executor.execute(failing), { message: 'execute failed' });
  assert.deepEqual(failing.methods, ['execute']);
  assert.equal(history.canUndo, true);
  assert.equal(history.canRedo, true);

  history.undo();
  assert.deepEqual(first.methods, ['execute', 'undo']);
  assert.deepEqual(second.methods, ['execute', 'undo']);
});

test('leaves the undo stack unchanged when undo throws', () => {
  const history = new History();
  const executor = new CommandExecutor(history);
  const command = createLoggingCommand({ failUndo: true });

  executor.execute(command);

  assert.throws(() => history.undo(), { message: 'undo failed' });
  assert.equal(history.canUndo, true);
  assert.equal(history.canRedo, false);
});

test('leaves the redo stack unchanged when redo throws', () => {
  const history = new History();
  const executor = new CommandExecutor(history);
  let executions = 0;
  const command = {
    execute() {
      executions += 1;

      if (executions > 1) {
        throw new Error('redo failed');
      }
    },
    undo() { },
  };

  executor.execute(command);
  history.undo();

  assert.throws(() => history.redo(), { message: 'redo failed' });
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, true);
});

test('clears redo history after a new successful command', () => {
  const history = new History();
  const executor = new CommandExecutor(history);
  const first = createLoggingCommand();
  const second = createLoggingCommand();

  executor.execute(first);
  history.undo();

  assert.equal(history.canRedo, true);

  executor.execute(second);

  assert.equal(history.canUndo, true);
  assert.equal(history.canRedo, false);

  history.undo();
  assert.deepEqual(second.methods, ['execute', 'undo']);
  assert.deepEqual(first.methods, ['execute', 'undo']);
});

test('returns false for undo and redo on empty stacks', () => {
  const history = new History();

  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, false);
  assert.equal(history.undo(), false);
  assert.equal(history.redo(), false);
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, false);

  const executor = new CommandExecutor(history);
  const command = createLoggingCommand();
  executor.execute(command);
  history.undo();
  history.redo();

  assert.equal(history.redo(), false);
  assert.equal(history.canUndo, true);
  assert.equal(history.canRedo, false);
});

test('restores exact old property values across repeated undo and redo', () => {
  const document = new Document(100, 100);
  const shape = new MutableShape('m1', 'original');
  document.addShape(shape);

  const history = new History();
  const executor = new CommandExecutor(history);
  const command = new SetValueCommand(shape, 'changed');

  executor.execute(command);
  assert.equal(shape.value, 'changed');
  assert.equal(command.oldValue, 'original');

  history.undo();
  assert.equal(shape.value, 'original');

  history.redo();
  assert.equal(shape.value, 'changed');
  assert.equal(command.oldValue, 'original');

  history.undo();
  assert.equal(shape.value, 'original');
});

test('restores parent, node order, and ID lookup across undo and redo', () => {
  const document = new Document(100, 100);
  const first = new Rect('r1', 0, 0, 10, 10);
  const second = new Rect('r2', 20, 0, 10, 10);
  const group = document.createGroup('g');

  document.addShape(first);
  document.addShape(second);
  document.addShape(group);

  const history = new History();
  const executor = new CommandExecutor(history);
  const command = new MoveShapeCommand(document, first, group, 0);

  executor.execute(command);
  assert.deepEqual(ids(document.root), ['r2', 'g']);
  assert.deepEqual(ids(group), ['r1']);
  assert.equal(first.parent, group);
  assert.equal(document.findShape('r1'), first);

  history.undo();
  assert.deepEqual(ids(document.root), ['r1', 'r2', 'g']);
  assert.deepEqual(ids(group), []);
  assert.equal(first.parent, document.root);
  assert.equal(document.findShape('r1'), first);

  history.redo();
  assert.deepEqual(ids(document.root), ['r2', 'g']);
  assert.deepEqual(ids(group), ['r1']);
  assert.equal(first.parent, group);

  history.undo();
  assert.deepEqual(ids(document.root), ['r1', 'r2', 'g']);
  assert.deepEqual(ids(group), []);
});

test('keeps sibling order through continuous undo and redo of two moves', () => {
  const document = new Document(100, 100);
  const first = new Rect('a', 0, 0, 10, 10);
  const second = new Rect('b', 10, 0, 10, 10);
  const third = new Rect('c', 20, 0, 10, 10);
  const group = document.createGroup('g');

  document.addShape(first);
  document.addShape(second);
  document.addShape(third);
  document.addShape(group);

  const history = new History();
  const executor = new CommandExecutor(history);
  const firstMove = new MoveShapeCommand(document, third, group, 0);
  const secondMove = new MoveShapeCommand(document, first, group, 1);

  executor.execute(firstMove);
  executor.execute(secondMove);
  assert.deepEqual(ids(document.root), ['b', 'g']);
  assert.deepEqual(ids(group), ['c', 'a']);

  history.undo();
  assert.deepEqual(ids(document.root), ['a', 'b', 'g']);
  assert.deepEqual(ids(group), ['c']);
  assert.equal(first.parent, document.root);
  assert.equal(third.parent, group);

  history.undo();
  assert.deepEqual(ids(document.root), ['a', 'b', 'c', 'g']);
  assert.deepEqual(ids(group), []);
  assert.equal(third.parent, document.root);

  history.redo();
  assert.deepEqual(ids(document.root), ['a', 'b', 'g']);
  assert.deepEqual(ids(group), ['c']);

  history.redo();
  assert.deepEqual(ids(document.root), ['b', 'g']);
  assert.deepEqual(ids(group), ['c', 'a']);
  assert.equal(document.findShape('a'), first);
  assert.equal(document.findShape('c'), third);
});

test('does not let a failed model edit pollute the document or history', () => {
  const document = new Document(100, 100);
  const first = new Rect('r1', 0, 0, 10, 10);
  const group = document.createGroup('g');

  document.addShape(first);
  document.addShape(group);

  const history = new History();
  const executor = new CommandExecutor(history);
  const failedMove = new MoveShapeCommand(document, first, group, 5);

  assert.throws(() => executor.execute(failedMove), { message: 'move failed' });
  assert.deepEqual(ids(document.root), ['r1', 'g']);
  assert.deepEqual(ids(group), []);
  assert.equal(first.parent, document.root);
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, false);
});
