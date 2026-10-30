import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const { ApplicationCommandDispatcher } = require(
  '../dist/app/ApplicationCommandDispatcher.js',
);

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
