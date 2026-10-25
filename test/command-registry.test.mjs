import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const { CommandRegistry } = require('../dist/commands/CommandRegistry.js');

function createCommand(calls = []) {
  return {
    execute() {
      calls.push('execute');
    },
    undo() {
      calls.push('undo');
    },
  };
}

test('registers a factory and reports registered names', () => {
  const registry = new CommandRegistry();

  assert.equal(registry.has('demo'), false);
  registry.register('demo', () => createCommand());

  assert.equal(registry.has('demo'), true);
  assert.deepEqual(registry.names(), ['demo']);
});

test('creates a command by calling the factory once without executing it', () => {
  const registry = new CommandRegistry();
  const calls = [];
  const expected = createCommand(calls);
  let factoryCalls = 0;

  registry.register('demo', () => {
    factoryCalls += 1;
    return expected;
  });

  const command = registry.create('demo');

  assert.equal(factoryCalls, 1);
  assert.equal(command, expected);
  assert.equal(typeof command.execute, 'function');
  assert.equal(typeof command.undo, 'function');
  assert.deepEqual(calls, []);
});

test('rejects duplicate registration and keeps the original factory', () => {
  const registry = new CommandRegistry();
  const original = createCommand();
  const replacement = createCommand();
  let replacementCalls = 0;

  registry.register('demo', () => original);

  assert.throws(
    () =>
      registry.register('demo', () => {
        replacementCalls += 1;
        return replacement;
      }),
    { message: 'command already registered: demo' },
  );

  assert.equal(registry.create('demo'), original);
  assert.equal(replacementCalls, 0);
});

test('rejects empty and whitespace-only command names', () => {
  const registry = new CommandRegistry();
  const factory = () => createCommand();

  assert.throws(
    () => registry.register('', factory),
    { message: 'command name must not be empty' },
  );
  assert.throws(
    () => registry.register('   \t', factory),
    { message: 'command name must not be empty' },
  );
  assert.throws(
    () => registry.create(''),
    { message: 'command name must not be empty' },
  );
  assert.equal(registry.has(''), false);
});

test('throws a clear error for an unknown command', () => {
  const registry = new CommandRegistry();

  assert.throws(
    () => registry.create('missing'),
    { message: 'unknown command: missing' },
  );
});

test('does not swallow factory errors', () => {
  const registry = new CommandRegistry();

  registry.register('broken', () => {
    throw new Error('factory failed');
  });

  assert.throws(() => registry.create('broken'), { message: 'factory failed' });
});

test('keeps multiple registered commands independent', () => {
  const registry = new CommandRegistry();
  const first = createCommand();
  const second = createCommand();

  registry.register('first', () => first);
  registry.register('second', () => second);

  assert.deepEqual(registry.names(), ['first', 'second']);
  assert.equal(registry.create('first'), first);
  assert.equal(registry.create('second'), second);
  assert.equal(registry.has('third'), false);
});

test('returns a copy of registered names', () => {
  const registry = new CommandRegistry();
  registry.register('demo', () => createCommand());

  const names = registry.names();
  names.push('mutated');

  assert.deepEqual(registry.names(), ['demo']);
});
