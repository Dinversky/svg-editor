import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
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

function createTempDir(t) {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'svg-editor-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function withoutPrompt(output) {
  return output.replaceAll('svg> ', '');
}

test('prints help, reports unknown commands, and exits', async () => {
  const result = await runCli('help\nunknown\nexit\n');

  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /Welcome to SVG Editor CLI/);
  assert.match(result.stdout, /create rect <id> <x> <y> <w> <h> \[fill\]/);
  assert.match(result.stdout, /error: unknown command: unknown/);
  assert.match(result.stdout, /Goodbye\./);
});

test('init uses defaults, accepts explicit sizes, and replaces the document', async () => {
  const result = await runCli(
    'init\n' +
    'tree\n' +
    'create rect old 0 0 10 10\n' +
    'init 1024.5 768\n' +
    'tree\n' +
    'exit\n',
  );

  assert.equal(result.code, 0);
  assert.match(result.stdout, /canvas 800x600 created/);
  assert.match(result.stdout, /canvas 1024\.5x768 created/);

  const lines = withoutPrompt(result.stdout).split('\n');
  const defaultTreeIndex = lines.indexOf('svg (800x600)');
  assert.notEqual(defaultTreeIndex, -1);
  assert.equal(lines[defaultTreeIndex + 1], '(empty)');

  const resizedTreeIndex = lines.indexOf('svg (1024.5x768)');
  assert.notEqual(resizedTreeIndex, -1);
  assert.equal(lines[resizedTreeIndex + 1], '(empty)');
});

test('invalid init arguments leave the existing canvas unchanged', async () => {
  const result = await runCli(
    'init 400 300\n' +
    'init 0 300\n' +
    'init 400 -5\n' +
    'init abc 300\n' +
    'init 1 2 3\n' +
    'tree\n' +
    'exit\n',
  );

  assert.equal(result.code, 0);
  assert.match(result.stdout, /error: width must be positive/);
  assert.match(result.stdout, /error: height must be positive/);
  assert.match(result.stdout, /error: invalid number for width: abc/);
  assert.match(result.stdout, /error: usage: init \[w\] \[h\]/);
  assert.match(result.stdout, /svg \(400x300\)/);
  assert.doesNotMatch(result.stdout, /canvas 0x300 created/);
  assert.doesNotMatch(result.stdout, /canvas 400x-5 created/);
});

test('create, tree, and save require an initialized document', async () => {
  const result = await runCli(
    'create rect r1 0 0 10 10\n' +
    'tree\n' +
    'save demo.svg\n' +
    'exit\n',
  );

  assert.equal(result.code, 0);
  const errors = result.stdout.match(/error: no document\. use 'init' or 'read' first/g);
  assert.equal(errors?.length, 3);
  assert.doesNotMatch(result.stdout, /rect#r1 created/);
});

test('creates rectangles and shows them in insertion order', async () => {
  const result = await runCli(
    'init 800 600\n' +
    'create rect r1 100 120 200 80 blue\n' +
    'create rect r2 10.5 20.5 30 40\n' +
    'tree\n' +
    'exit\n',
  );

  assert.equal(result.code, 0);
  assert.match(result.stdout, /rect#r1 created/);
  assert.match(result.stdout, /rect#r2 created/);

  const lines = withoutPrompt(result.stdout).split('\n');
  const treeIndex = lines.indexOf('svg (800x600)');
  assert.notEqual(treeIndex, -1);
  assert.equal(lines[treeIndex + 1], '├── rect#r1 x=100 y=120 w=200 h=80 fill=blue');
  assert.equal(lines[treeIndex + 2], '└── rect#r2 x=10.5 y=20.5 w=30 h=40');
});

test('rejects duplicate IDs without changing the document', async () => {
  const result = await runCli(
    'init\n' +
    'create rect r1 0 0 10 10 red\n' +
    'create rect r1 5 5 50 50 blue\n' +
    'tree\n' +
    'exit\n',
  );

  assert.equal(result.code, 0);
  assert.match(result.stdout, /error: id already exists: r1/);
  assert.match(result.stdout, /rect#r1 x=0 y=0 w=10 h=10 fill=red/);
  assert.doesNotMatch(result.stdout, /rect#r1 x=5 y=5 w=50 h=50 fill=blue/);
});

test('treats shape IDs as case-sensitive', async () => {
  const result = await runCli(
    'init\n' +
    'create rect r1 0 0 10 10\n' +
    'create rect R1 20 20 10 10\n' +
    'tree\n' +
    'exit\n',
  );

  assert.equal(result.code, 0);
  assert.match(result.stdout, /rect#r1 created/);
  assert.match(result.stdout, /rect#R1 created/);
  assert.match(result.stdout, /rect#r1 x=0 y=0 w=10 h=10/);
  assert.match(result.stdout, /rect#R1 x=20 y=20 w=10 h=10/);
});

test('rejects invalid geometry and missing arguments without mutation', async () => {
  const result = await runCli(
    'init\n' +
    'create rect base 0 0 10 10\n' +
    'create rect negative 0 0 -1 10\n' +
    'create rect zero 0 0 10 0\n' +
    'create rect bad-coordinate abc 0 10 10\n' +
    'create rect missing 0 0 10\n' +
    'create rect extra 0 0 10 10 red extra\n' +
    'create circle c1 0 0 10\n' +
    'tree\n' +
    'exit\n',
  );

  assert.equal(result.code, 0);
  assert.match(result.stdout, /error: width must be positive/);
  assert.match(result.stdout, /error: height must be positive/);
  assert.match(result.stdout, /error: invalid number for x: abc/);
  assert.match(
    result.stdout,
    /error: usage: create rect <id> <x> <y> <w> <h> \[fill\]/,
  );
  assert.match(result.stdout, /error: unknown shape type: circle/);

  const lines = result.stdout.split('\n');
  assert.ok(lines.includes('└── rect#base x=0 y=0 w=10 h=10'));
  assert.ok(!lines.some((line) => line.includes('rect#negative')));
  assert.ok(!lines.some((line) => line.includes('rect#zero')));
  assert.ok(!lines.some((line) => line.includes('rect#bad-coordinate')));
  assert.ok(!lines.some((line) => line.includes('rect#missing')));
  assert.ok(!lines.some((line) => line.includes('rect#extra')));
});

test('saves a valid SVG with canvas, geometry, and optional fill', async (t) => {
  const tempDir = createTempDir(t);
  const filePath = path.join(tempDir, 'demo.svg');

  const result = await runCli(
    'init 800 600\n' +
    'create rect r1 100 120 200 80 blue\n' +
    'create rect r2 1.5 2.5 3 4\n' +
    `save ${filePath}\n` +
    'exit\n',
  );

  assert.equal(result.code, 0);
  assert.ok(result.stdout.includes(`saved to ${filePath} (2 elements)`));

  const expectedSvg = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">',
    '  <rect id="r1" x="100" y="120" width="200" height="80" fill="blue"/>',
    '  <rect id="r2" x="1.5" y="2.5" width="3" height="4"/>',
    '</svg>',
    '',
  ].join('\n');

  assert.equal(readFileSync(filePath, 'utf8'), expectedSvg);
});

test('save reports write failures without claiming success', async (t) => {
  const tempDir = createTempDir(t);
  const filePath = path.join(tempDir, 'missing', 'demo.svg');

  const result = await runCli(
    'init\n' +
    'create rect r1 0 0 10 10\n' +
    `save ${filePath}\n` +
    'exit\n',
  );

  assert.equal(result.code, 0);
  assert.match(result.stdout, /error: cannot write file:/);
  assert.ok(result.stdout.includes(filePath));
  assert.doesNotMatch(result.stdout, /saved to/);
});

test('save without a filename reports a clear error', async () => {
  const result = await runCli('init\nsave\nexit\n');

  assert.equal(result.code, 0);
  assert.match(result.stdout, /error: no file path\. use 'save <file\.svg>'/);
  assert.doesNotMatch(result.stdout, /saved to/);
});

test('completes init -> create rect -> tree -> save', async (t) => {
  const tempDir = createTempDir(t);
  const filePath = path.join(tempDir, 'complete.svg');

  const result = await runCli(
    'init 800 600\n' +
    'create rect r1 100 120 200 80 blue\n' +
    'tree\n' +
    `save ${filePath}\n` +
    'exit\n',
  );

  assert.equal(result.code, 0);
  assert.match(result.stdout, /canvas 800x600 created/);
  assert.match(result.stdout, /rect#r1 created/);
  assert.match(result.stdout, /svg \(800x600\)/);
  assert.match(result.stdout, /└── rect#r1 x=100 y=120 w=200 h=80 fill=blue/);
  assert.ok(result.stdout.includes(`saved to ${filePath} (1 element)`));

  const svg = readFileSync(filePath, 'utf8');
  assert.match(svg, /<svg[^>]*width="800"[^>]*height="600"[^>]*viewBox="0 0 800 600"/);
  assert.match(
    svg,
    /<rect id="r1" x="100" y="120" width="200" height="80" fill="blue"\/>/,
  );
});
