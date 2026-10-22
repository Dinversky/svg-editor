import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const cliPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'dist',
  'cli',
  'main.js',
);

function runCli(input) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });

    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    child.stdin.end(input);
  });
}

test('prints help, reports unknown input, and exits', async () => {
  const result = await runCli('help\nunknown\nexit\n');

  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /Welcome to SVG Editor CLI/);
  assert.match(result.stdout, /Available commands:/);
  assert.match(result.stdout, /Unknown command: unknown/);
  assert.match(result.stdout, /Goodbye\./);
});
