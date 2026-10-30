import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const { ApplicationCommandDispatcher } = require('../dist/app/ApplicationCommandDispatcher.js');
const { SvgEditorApplication } = require('../dist/app/SvgEditorApplication.js');
const { CommandParser } = require('../dist/cli/CommandParser.js');

function createHarness() {
  const application = new SvgEditorApplication();
  const parser = new CommandParser();

  return (name, ...args) => application.execute({
    name,
    parse: () => parser.parseCommand(name, args),
  });
}

test('runs existing commands through the application layer', () => {
  const run = createHarness();

  assert.deepEqual(run('init', '20', '10'), ['canvas 20x10 created']);
  assert.deepEqual(
    run('create', 'rect', 'r1', '1', '2', '3', '4'),
    ['rect#r1 created'],
  );
  assert.deepEqual(run('tree'), [
    'svg (20x10)\n└── rect#r1 x=1 y=2 w=3 h=4',
  ]);
  assert.deepEqual(run('show', 'r1'), [
    'rect#r1  parent=svg\n  x=1 y=2 w=3 h=4',
  ]);

  assert.deepEqual(run('undo'), ['rect#r1 creation undone']);
  assert.deepEqual(run('tree'), ['svg (20x10)\n(empty)']);
  assert.deepEqual(run('redo'), ['rect#r1 created']);

  assert.throws(
    () => run('missing'),
    { message: 'unknown command: missing' },
  );
});

test('move feedback reads model coordinates for every shape type', () => {
  const run = createHarness();

  run('init', '100', '100');
  run('create', 'rect', 'r1', '10', '20', '30', '40');
  run('create', 'circle', 'c1', '5.5', '-2', '3');
  run('create', 'ellipse', 'e1', '1', '2', '3', '4');
  run('create', 'text', 't1', '7', '8', 'hello');
  run('create', 'line', 'l1', '1', '2', '3', '4');
  run('create', 'g', 'g1');

  assert.deepEqual(run('move', 'r1', '5', '-3'), ['rect#r1 moved to (15,17)']);
  assert.deepEqual(run('move', 'c1', '2', '3'), ['circle#c1 moved to (7.5,1)']);
  assert.deepEqual(run('move', 'e1', '-1', '-2'), ['ellipse#e1 moved to (0,0)']);
  assert.deepEqual(run('move', 't1', '1', '2'), ['text#t1 moved to (8,10)']);
  assert.deepEqual(run('move', 'l1', '3', '4'), ['line#l1 moved to (4,6)']);
  assert.deepEqual(run('move', 'g1', '5', '-5'), ['g#g1 moved by (5,-5)']);

  assert.deepEqual(run('undo'), ['g#g1 moved back by (-5,5)']);
  assert.deepEqual(run('undo'), ['line#l1 moved back to (1,2)']);
  assert.deepEqual(run('redo'), ['line#l1 moved to (4,6)']);

  assert.deepEqual(run('tree'), [
    'svg (100x100)\n'
    + '├── rect#r1 x=15 y=17 w=30 h=40\n'
    + '├── circle#c1 cx=7.5 cy=1 r=3\n'
    + '├── ellipse#e1 cx=0 cy=0 rx=3 ry=4\n'
    + '├── text#t1 (8,10) "hello"\n'
    + '├── line#l1 (4,6) -> (6,8)\n'
    + '└── g#g1',
  ]);
});

test('checks application state before parsing arguments', () => {
  const run = createHarness();

  assert.throws(
    () => run('show'),
    { message: "no document. use 'init' or 'read' first" },
  );
  assert.throws(
    () => run('move', 'r1'),
    { message: "no document. use 'init' or 'read' first" },
  );

  run('init');

  assert.throws(() => run('show'), { message: 'usage: show <id>' });
  assert.throws(
    () => run('move', 'missing', '1', '1'),
    { message: 'no such shape: missing' },
  );
});

test('keeps parser and application command registration consistent', () => {
  const application = new SvgEditorApplication();
  const parser = new CommandParser();
  const expected = [
    'init', 'read', 'canvas', 'create', 'move', 'scale', 'set', 'delete',
    'group', 'ungroup', 'addto', 'front', 'back', 'undo', 'redo', 'tree',
    'show', 'save',
  ];
  const argsByName = {
    init: [],
    read: ['a.svg'],
    canvas: [],
    create: ['rect', 'r1', '0', '0', '1', '1'],
    move: ['r1', '1', '1'],
    scale: ['r1', '2'],
    set: ['r1', 'x', '1'],
    delete: ['r1'],
    group: ['g1', 'r1'],
    ungroup: ['g1'],
    addto: ['g1', 'r1'],
    front: ['r1'],
    back: ['r1'],
    undo: [],
    redo: [],
    tree: [],
    show: ['r1'],
    save: [],
  };

  assert.deepEqual(application.commandNames().sort(), [...expected].sort());

  for (const name of expected) {
    assert.equal(parser.parseCommand(name, argsByName[name]).command, name);
  }

  assert.equal(application.commandNames().includes('box'), false);
});

test('registers handlers, reports names, and dispatches lazily parsed requests', () => {
  const dispatcher = new ApplicationCommandDispatcher();
  const calls = [];

  assert.equal(dispatcher.has('demo'), false);
  dispatcher.register('demo', (parse) => {
    calls.push('handle');
    const request = parse();
    calls.push(request.command);
    return [`handled ${request.command}`];
  });

  assert.equal(dispatcher.has('demo'), true);
  assert.deepEqual(dispatcher.names(), ['demo']);

  let parseCalls = 0;
  const output = dispatcher.dispatch({
    name: 'demo',
    parse: () => {
      parseCalls += 1;
      return { command: 'undo' };
    },
  });

  assert.deepEqual(output, ['handled undo']);
  assert.equal(parseCalls, 1);
  assert.deepEqual(calls, ['handle', 'undo']);
});

test('rejects unknown commands without parsing arguments', () => {
  const dispatcher = new ApplicationCommandDispatcher();
  let parseCalls = 0;

  assert.throws(
    () =>
      dispatcher.dispatch({
        name: 'missing',
        parse: () => {
          parseCalls += 1;
          return { command: 'undo' };
        },
      }),
    { message: 'unknown command: missing' },
  );
  assert.equal(parseCalls, 0);
});

test('rejects duplicate, empty, and whitespace-only handler names', () => {
  const dispatcher = new ApplicationCommandDispatcher();

  dispatcher.register('demo', () => []);

  assert.throws(
    () => dispatcher.register('demo', () => []),
    { message: 'command already registered: demo' },
  );
  assert.throws(
    () => dispatcher.register('', () => []),
    { message: 'command name must not be empty' },
  );
  assert.throws(
    () => dispatcher.register('   ', () => []),
    { message: 'command name must not be empty' },
  );
  assert.deepEqual(dispatcher.names(), ['demo']);
});

test('propagates handler and parse errors without converting them to success', () => {
  const dispatcher = new ApplicationCommandDispatcher();

  dispatcher.register('broken', (parse) => {
    parse();
    return ['should not be returned'];
  });

  assert.throws(
    () =>
      dispatcher.dispatch({
        name: 'broken',
        parse: () => {
          throw new Error('parse failed');
        },
      }),
    { message: 'parse failed' },
  );
});
