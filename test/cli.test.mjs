import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { CommandParser } = require('../dist/cli/CommandParser.js');
const { Circle } = require('../dist/model/Circle.js');
const { Document } = require('../dist/model/Document.js');
const { Ellipse } = require('../dist/model/Ellipse.js');
const { Line } = require('../dist/model/Line.js');
const { Rect } = require('../dist/model/Rect.js');
const { ShapeFactory } = require('../dist/model/ShapeFactory.js');
const { ShapeRegistry } = require('../dist/model/ShapeRegistry.js');
const { Text } = require('../dist/model/Text.js');
const { SvgSerializer } = require('../dist/io/SvgSerializer.js');

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
    let settled = false;
    let timer;

    const finish = (action) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      action();
    };

    timer = setTimeout(() => {
      child.kill();
      finish(() => reject(new Error('CLI did not exit within 5000 ms')));
    }, 5000);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });

    child.on('error', (error) => {
      finish(() => reject(error));
    });
    child.on('close', (code) => {
      finish(() => resolve({ code, stdout, stderr }));
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

test('prints the exact banner, handles help, unknown commands, and exits', async () => {
  const result = await runCli('help\nunknown\nexit\n');

  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
  assert.equal(
    result.stdout.split('\n')[0],
    "svg-editor 0.1 — type 'help' for commands",
  );
  assert.equal(
    (result.stdout.match(/svg-editor 0\.1 — type 'help' for commands/g) ?? []).length,
    1,
  );
  assert.doesNotMatch(result.stdout, /Welcome to SVG Editor CLI/);
  assert.doesNotMatch(result.stdout, /Type "help" for available commands/);
  assert.match(result.stdout, /create rect <id> <x> <y> <w> <h> \[fill\]/);
  assert.match(result.stdout, /create circle <id> <cx> <cy> <r> \[fill\]/);
  assert.match(
    result.stdout,
    /create ellipse <id> <cx> <cy> <rx> <ry> \[fill\]/,
  );
  assert.match(
    result.stdout,
    /create line <id> <x1> <y1> <x2> <y2> \[stroke\]/,
  );
  assert.match(result.stdout, /create text <id> <x> <y> "content"/);
  assert.match(result.stdout, /create g <id>/);
  assert.match(result.stdout, /create <type> \.\.\. \[in <group>\]/);
  assert.match(result.stdout, /^error: unknown command: unknown$/m);
  assert.doesNotMatch(result.stdout, /error: error:/);
  assert.doesNotMatch(result.stdout, /svg> /);
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
  assert.doesNotMatch(result.stdout, /error: error:/);
  assert.doesNotMatch(result.stdout, /rect#r1 created/);
});

test('prints exactly one error prefix per failed command', async () => {
  const result = await runCli(
    'init\n' +
    'create rect r1 0 0 0 10\n' +
    'create rect r1 0 0 10 10\n' +
    'create rect r1 5 5 10 10\n' +
    'save "unfinished.svg\n' +
    'missing\n' +
    'exit\n',
  );

  assert.equal(result.code, 0);
  const errorLines = result.stdout
    .split('\n')
    .filter((line) => line.startsWith('error:'));
  assert.deepEqual(errorLines, [
    'error: width must be positive',
    'error: id already exists: r1',
    'error: unclosed double quote',
    'error: unknown command: missing',
  ]);
  assert.doesNotMatch(result.stdout, /error: error:/);
});

test('executes multi-line piped input and exits cleanly on EOF', async () => {
  const result = await runCli(
    'init 320 240\n' +
    'create rect r1 10 20 30 40\n' +
    'tree\n',
  );

  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /canvas 320x240 created/);
  assert.match(result.stdout, /svg \(320x240\)/);
  assert.match(result.stdout, /└── rect#r1 x=10 y=20 w=30 h=40/);
  assert.match(result.stdout, /Goodbye\./);
  assert.doesNotMatch(result.stdout, /error:/);
  assert.doesNotMatch(result.stdout, /svg> /);
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

test('creates circles and serializes them in document order', async (t) => {
  const tempDir = createTempDir(t);
  const filePath = path.join(tempDir, 'shapes.svg');

  const result = await runCli(
    'init 400 300\n' +
    'create rect r1 0 0 10 10\n' +
    'create circle c1 100 100 20 red\n' +
    'create circle c2 50.5 60.5 5\n' +
    'tree\n' +
    `save ${filePath}\n` +
    'exit\n',
  );

  assert.equal(result.code, 0);
  assert.match(result.stdout, /circle#c1 created/);
  assert.match(result.stdout, /circle#c2 created/);
  assert.ok(result.stdout.includes(`saved to ${filePath} (3 elements)`));

  const lines = withoutPrompt(result.stdout).split('\n');
  const treeIndex = lines.indexOf('svg (400x300)');
  assert.notEqual(treeIndex, -1);
  assert.equal(lines[treeIndex + 1], '├── rect#r1 x=0 y=0 w=10 h=10');
  assert.equal(lines[treeIndex + 2], '├── circle#c1 cx=100 cy=100 r=20 fill=red');
  assert.equal(lines[treeIndex + 3], '└── circle#c2 cx=50.5 cy=60.5 r=5');

  const expectedSvg = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">',
    '  <rect id="r1" x="0" y="0" width="10" height="10"/>',
    '  <circle id="c1" cx="100" cy="100" r="20" fill="red"/>',
    '  <circle id="c2" cx="50.5" cy="60.5" r="5"/>',
    '</svg>',
    '',
  ].join('\n');

  assert.equal(readFileSync(filePath, 'utf8'), expectedSvg);
});

test('rejects invalid circles and duplicate IDs without changing the document', async () => {
  const result = await runCli(
    'init\n' +
    'create rect keep 0 0 10 10\n' +
    'create circle c1 10 20 5 blue\n' +
    'create circle c1 30 40 6 red\n' +
    'create circle zero 10 20 0\n' +
    'create circle negative 10 20 -1\n' +
    'create circle bad-cx abc 20 5\n' +
    'create circle bad-cy 10 abc 5\n' +
    'create circle bad-r 10 20 abc\n' +
    'create circle missing 10 20\n' +
    'create circle extra 10 20 5 red extra\n' +
    'tree\n' +
    'exit\n',
  );

  assert.equal(result.code, 0);
  assert.match(result.stdout, /error: id already exists: c1/);
  assert.equal(
    (result.stdout.match(/error: radius must be positive/g) ?? []).length,
    2,
  );
  assert.match(result.stdout, /error: invalid number for cx: abc/);
  assert.match(result.stdout, /error: invalid number for cy: abc/);
  assert.match(result.stdout, /error: invalid number for r: abc/);
  assert.equal(
    (result.stdout.match(/error: usage: create circle/g) ?? []).length,
    2,
  );

  const lines = result.stdout.split('\n');
  assert.ok(lines.includes('├── rect#keep x=0 y=0 w=10 h=10'));
  assert.ok(lines.includes('└── circle#c1 cx=10 cy=20 r=5 fill=blue'));
  assert.equal(
    lines.filter((line) => line.startsWith('├──') || line.startsWith('└──')).length,
    2,
  );
  assert.doesNotMatch(result.stdout, /circle#c1 cx=30/);
});

test('creates ellipses and serializes them in document order', async (t) => {
  const tempDir = createTempDir(t);
  const filePath = path.join(tempDir, 'ellipses.svg');

  const result = await runCli(
    'init 500 400\n' +
    'create rect r1 0 0 10 10\n' +
    'create circle c1 10 10 5\n' +
    'create ellipse e1 100 100 30 20 blue\n' +
    'create ellipse e2 50.5 60.5 10 5\n' +
    'tree\n' +
    `save ${filePath}\n` +
    'exit\n',
  );

  assert.equal(result.code, 0);
  assert.match(result.stdout, /ellipse#e1 created/);
  assert.match(result.stdout, /ellipse#e2 created/);
  assert.ok(result.stdout.includes(`saved to ${filePath} (4 elements)`));

  const lines = withoutPrompt(result.stdout).split('\n');
  const treeIndex = lines.indexOf('svg (500x400)');
  assert.notEqual(treeIndex, -1);
  assert.equal(lines[treeIndex + 1], '├── rect#r1 x=0 y=0 w=10 h=10');
  assert.equal(lines[treeIndex + 2], '├── circle#c1 cx=10 cy=10 r=5');
  assert.equal(
    lines[treeIndex + 3],
    '├── ellipse#e1 cx=100 cy=100 rx=30 ry=20 fill=blue',
  );
  assert.equal(
    lines[treeIndex + 4],
    '└── ellipse#e2 cx=50.5 cy=60.5 rx=10 ry=5',
  );

  const expectedSvg = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="400" viewBox="0 0 500 400">',
    '  <rect id="r1" x="0" y="0" width="10" height="10"/>',
    '  <circle id="c1" cx="10" cy="10" r="5"/>',
    '  <ellipse id="e1" cx="100" cy="100" rx="30" ry="20" fill="blue"/>',
    '  <ellipse id="e2" cx="50.5" cy="60.5" rx="10" ry="5"/>',
    '</svg>',
    '',
  ].join('\n');

  assert.equal(readFileSync(filePath, 'utf8'), expectedSvg);
});

test('rejects invalid ellipses and duplicate IDs without changing the document', async () => {
  const result = await runCli(
    'init\n' +
    'create circle keep 5 6 7\n' +
    'create ellipse e1 10 20 30 40 blue\n' +
    'create ellipse e1 1 2 3 4 red\n' +
    'create ellipse zero-rx 10 20 0 5\n' +
    'create ellipse zero-ry 10 20 5 0\n' +
    'create ellipse negative-rx 10 20 -1 5\n' +
    'create ellipse negative-ry 10 20 5 -1\n' +
    'create ellipse bad-cx abc 20 5 6\n' +
    'create ellipse bad-cy 10 abc 5 6\n' +
    'create ellipse bad-rx 10 20 abc 6\n' +
    'create ellipse bad-ry 10 20 5 abc\n' +
    'create ellipse missing 10 20 5\n' +
    'create ellipse extra 10 20 5 6 red extra\n' +
    'tree\n' +
    'exit\n',
  );

  assert.equal(result.code, 0);
  assert.match(result.stdout, /error: id already exists: e1/);
  assert.equal(
    (result.stdout.match(/error: rx must be positive/g) ?? []).length,
    2,
  );
  assert.equal(
    (result.stdout.match(/error: ry must be positive/g) ?? []).length,
    2,
  );
  assert.match(result.stdout, /error: invalid number for cx: abc/);
  assert.match(result.stdout, /error: invalid number for cy: abc/);
  assert.match(result.stdout, /error: invalid number for rx: abc/);
  assert.match(result.stdout, /error: invalid number for ry: abc/);
  assert.equal(
    (result.stdout.match(/error: usage: create ellipse/g) ?? []).length,
    2,
  );

  const lines = result.stdout.split('\n');
  assert.ok(lines.includes('├── circle#keep cx=5 cy=6 r=7'));
  assert.ok(
    lines.includes('└── ellipse#e1 cx=10 cy=20 rx=30 ry=40 fill=blue'),
  );
  assert.equal(
    lines.filter((line) => line.startsWith('├──') || line.startsWith('└──')).length,
    2,
  );
  assert.doesNotMatch(result.stdout, /ellipse#e1 cx=1 cy=2/);
});

test('creates lines and serializes them in document order', async (t) => {
  const tempDir = createTempDir(t);
  const filePath = path.join(tempDir, 'lines.svg');

  const result = await runCli(
    'init 600 400\n' +
    'create rect r1 0 0 10 10\n' +
    'create line l1 10 20 30 40 red\n' +
    'create line l2 -5 50 100.5 200.5\n' +
    'tree\n' +
    `save ${filePath}\n` +
    'exit\n',
  );

  assert.equal(result.code, 0);
  assert.match(result.stdout, /line#l1 created/);
  assert.match(result.stdout, /line#l2 created/);
  assert.ok(result.stdout.includes(`saved to ${filePath} (3 elements)`));

  const lines = withoutPrompt(result.stdout).split('\n');
  const treeIndex = lines.indexOf('svg (600x400)');
  assert.notEqual(treeIndex, -1);
  assert.equal(lines[treeIndex + 1], '├── rect#r1 x=0 y=0 w=10 h=10');
  assert.equal(lines[treeIndex + 2], '├── line#l1 (10,20) -> (30,40)');
  assert.equal(lines[treeIndex + 3], '└── line#l2 (-5,50) -> (100.5,200.5)');

  const expectedSvg = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">',
    '  <rect id="r1" x="0" y="0" width="10" height="10"/>',
    '  <line id="l1" x1="10" y1="20" x2="30" y2="40" stroke="red"/>',
    '  <line id="l2" x1="-5" y1="50" x2="100.5" y2="200.5"/>',
    '</svg>',
    '',
  ].join('\n');

  assert.equal(readFileSync(filePath, 'utf8'), expectedSvg);
});

test('rejects invalid lines and duplicate IDs without changing the document', async () => {
  const result = await runCli(
    'init\n' +
    'create line keep 0 0 10 10 black\n' +
    'create line l1 1 2 3 4 red\n' +
    'create line l1 5 6 7 8 blue\n' +
    'create line bad-x1 abc 2 3 4\n' +
    'create line bad-y1 1 abc 3 4\n' +
    'create line bad-x2 1 2 abc 4\n' +
    'create line bad-y2 1 2 3 abc\n' +
    'create line missing 1 2 3\n' +
    'create line extra 1 2 3 4 red extra\n' +
    'tree\n' +
    'exit\n',
  );

  assert.equal(result.code, 0);
  assert.match(result.stdout, /error: id already exists: l1/);
  assert.match(result.stdout, /error: invalid number for x1: abc/);
  assert.match(result.stdout, /error: invalid number for y1: abc/);
  assert.match(result.stdout, /error: invalid number for x2: abc/);
  assert.match(result.stdout, /error: invalid number for y2: abc/);
  assert.equal(
    (result.stdout.match(/error: usage: create line/g) ?? []).length,
    2,
  );

  const lines = result.stdout.split('\n');
  assert.ok(lines.includes('├── line#keep (0,0) -> (10,10)'));
  assert.ok(lines.includes('└── line#l1 (1,2) -> (3,4)'));
  assert.equal(
    lines.filter((line) => line.startsWith('├──') || line.startsWith('└──')).length,
    2,
  );
  assert.doesNotMatch(result.stdout, /line#l1 \(5,6\)/);
});

test('creates texts and serializes their content in document order', async (t) => {
  const tempDir = createTempDir(t);
  const filePath = path.join(tempDir, 'texts.svg');

  const result = await runCli(
    'init 700 500\n' +
    'create rect r1 0 0 10 10\n' +
    'create text t1 20 40 "My Diagram"\n' +
    'create text t2 50.5 60.5 "Tom & Jerry <3 \'quoted\' > done"\n' +
    'create text empty 1 2 ""\n' +
    'tree\n' +
    `save ${filePath}\n` +
    'exit\n',
  );

  assert.equal(result.code, 0);
  assert.match(result.stdout, /text#t1 created/);
  assert.match(result.stdout, /text#t2 created/);
  assert.match(result.stdout, /text#empty created/);
  assert.ok(result.stdout.includes(`saved to ${filePath} (4 elements)`));

  const lines = withoutPrompt(result.stdout).split('\n');
  const treeIndex = lines.indexOf('svg (700x500)');
  assert.notEqual(treeIndex, -1);
  assert.equal(lines[treeIndex + 1], '├── rect#r1 x=0 y=0 w=10 h=10');
  assert.equal(lines[treeIndex + 2], '├── text#t1 (20,40) "My Diagram"');
  assert.equal(
    lines[treeIndex + 3],
    '├── text#t2 (50.5,60.5) "Tom & Jerry <3 \'quoted\' > done"',
  );
  assert.equal(lines[treeIndex + 4], '└── text#empty (1,2) ""');

  const expectedSvg = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="700" height="500" viewBox="0 0 700 500">',
    '  <rect id="r1" x="0" y="0" width="10" height="10"/>',
    '  <text id="t1" x="20" y="40">My Diagram</text>',
    '  <text id="t2" x="50.5" y="60.5">Tom &amp; Jerry &lt;3 \'quoted\' &gt; done</text>',
    '  <text id="empty" x="1" y="2"></text>',
    '</svg>',
    '',
  ].join('\n');

  assert.equal(readFileSync(filePath, 'utf8'), expectedSvg);
});

test('rejects invalid texts and duplicate IDs without changing the document', async () => {
  const result = await runCli(
    'init\n' +
    'create rect keep 0 0 10 10\n' +
    'create text t1 10 20 "hello"\n' +
    'create text t1 30 40 "again"\n' +
    'create text bad-x abc 20 "x"\n' +
    'create text bad-y 10 abc "x"\n' +
    'create text missing 10 20\n' +
    'create text extra 10 20 "x" extra\n' +
    'tree\n' +
    'exit\n',
  );

  assert.equal(result.code, 0);
  assert.match(result.stdout, /error: id already exists: t1/);
  assert.match(result.stdout, /error: invalid number for x: abc/);
  assert.match(result.stdout, /error: invalid number for y: abc/);
  assert.equal(
    (result.stdout.match(/error: usage: create text/g) ?? []).length,
    2,
  );

  const lines = result.stdout.split('\n');
  assert.ok(lines.includes('├── rect#keep x=0 y=0 w=10 h=10'));
  assert.ok(lines.includes('└── text#t1 (10,20) "hello"'));
  assert.equal(
    lines.filter((line) => line.startsWith('├──') || line.startsWith('└──')).length,
    2,
  );
  assert.doesNotMatch(result.stdout, /text#t1 \(30,40\)/);
});

test('creates empty groups and serializes them in document order', async (t) => {
  const tempDir = createTempDir(t);
  const filePath = path.join(tempDir, 'groups.svg');

  const result = await runCli(
    'init 400 300\n' +
    'create g g1\n' +
    'create rect r1 0 0 10 10\n' +
    'tree\n' +
    `save ${filePath}\n` +
    'exit\n',
  );

  assert.equal(result.code, 0);
  assert.match(result.stdout, /g#g1 created/);
  assert.ok(result.stdout.includes(`saved to ${filePath} (2 elements)`));

  const lines = withoutPrompt(result.stdout).split('\n');
  const treeIndex = lines.indexOf('svg (400x300)');
  assert.notEqual(treeIndex, -1);
  assert.equal(lines[treeIndex + 1], '├── g#g1');
  assert.equal(lines[treeIndex + 2], '└── rect#r1 x=0 y=0 w=10 h=10');

  const expectedSvg = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">',
    '  <g id="g1"/>',
    '  <rect id="r1" x="0" y="0" width="10" height="10"/>',
    '</svg>',
    '',
  ].join('\n');

  assert.equal(readFileSync(filePath, 'utf8'), expectedSvg);
});

test('rejects invalid groups and duplicate IDs without changing the document', async () => {
  const result = await runCli(
    'init\n' +
    'create rect keep 0 0 10 10\n' +
    'create g g1\n' +
    'create g g1\n' +
    'create g\n' +
    'create g extra extra\n' +
    'tree\n' +
    'exit\n',
  );

  assert.equal(result.code, 0);
  assert.match(result.stdout, /error: id already exists: g1/);
  assert.equal(
    (result.stdout.match(/error: usage: create g/g) ?? []).length,
    2,
  );

  const lines = result.stdout.split('\n');
  assert.ok(lines.includes('├── rect#keep x=0 y=0 w=10 h=10'));
  assert.ok(lines.includes('└── g#g1'));
  assert.equal(
    lines.filter((line) => line.startsWith('├──') || line.startsWith('└──')).length,
    2,
  );
});

test('creates shapes in specified and nested groups with the in clause', async (t) => {
  const tempDir = createTempDir(t);
  const filePath = path.join(tempDir, 'nested.svg');

  const result = await runCli(
    'init 800 600\n' +
    'create g outer\n' +
    'create g inner in outer\n' +
    'create rect r1 1 2 3 4 red in inner\n' +
    'create text t1 5 6 "Hello" in inner\n' +
    'create line l1 0 0 10 10 black in outer\n' +
    'create circle c1 10 20 5 in outer\n' +
    'create rect root1 0 0 5 5\n' +
    `save ${filePath}\n` +
    'exit\n',
  );

  assert.equal(result.code, 0);
  assert.match(result.stdout, /g#outer created$/m);
  assert.match(result.stdout, /g#inner created in g#outer$/m);
  assert.match(result.stdout, /rect#r1 created in g#inner$/m);
  assert.match(result.stdout, /text#t1 created in g#inner$/m);
  assert.match(result.stdout, /line#l1 created in g#outer$/m);
  assert.match(result.stdout, /circle#c1 created in g#outer$/m);
  assert.match(result.stdout, /rect#root1 created$/m);
  assert.ok(result.stdout.includes(`saved to ${filePath} (7 elements)`));

  const expectedSvg = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">',
    '  <g id="outer">',
    '    <g id="inner">',
    '      <rect id="r1" x="1" y="2" width="3" height="4" fill="red"/>',
    '      <text id="t1" x="5" y="6">Hello</text>',
    '    </g>',
    '    <line id="l1" x1="0" y1="0" x2="10" y2="10" stroke="black"/>',
    '    <circle id="c1" cx="10" cy="20" r="5"/>',
    '  </g>',
    '  <rect id="root1" x="0" y="0" width="5" height="5"/>',
    '</svg>',
    '',
  ].join('\n');

  assert.equal(readFileSync(filePath, 'utf8'), expectedSvg);
});

test('rejects missing or non-container in targets without mutation', async (t) => {
  const tempDir = createTempDir(t);
  const filePath = path.join(tempDir, 'invalid-targets.svg');

  const result = await runCli(
    'init\n' +
    'create rect keep 0 0 10 10\n' +
    'create g group1\n' +
    'create rect bad1 1 2 3 4 in missing\n' +
    'create rect bad2 1 2 3 4 in keep\n' +
    'create rect ok 1 2 3 4 in group1\n' +
    'create circle keep 1 2 3 in group1\n' +
    `save ${filePath}\n` +
    'exit\n',
  );

  assert.equal(result.code, 0);
  assert.match(result.stdout, /error: no such container: missing/);
  assert.match(result.stdout, /error: not a container: keep/);
  assert.match(result.stdout, /error: id already exists: keep/);
  assert.ok(result.stdout.includes(`saved to ${filePath} (3 elements)`));

  const svg = readFileSync(filePath, 'utf8');
  assert.doesNotMatch(svg, /bad1/);
  assert.doesNotMatch(svg, /bad2/);
  assert.equal(
    svg,
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">',
      '  <rect id="keep" x="0" y="0" width="10" height="10"/>',
      '  <g id="group1">',
      '    <rect id="ok" x="1" y="2" width="3" height="4"/>',
      '  </g>',
      '</svg>',
      '',
    ].join('\n'),
  );
});

test('accepts named and hex colors for fill and stroke', async (t) => {
  const tempDir = createTempDir(t);
  const filePath = path.join(tempDir, 'colors.svg');

  const result = await runCli(
    'init 500 400\n' +
    'create rect named 0 0 10 10 navy\n' +
    'create rect hex6 0 20 10 10 #4a90d9\n' +
    'create rect hex3 0 40 10 10 #ABC\n' +
    'create rect cased 0 60 10 10 Red\n' +
    'create circle c1 50 50 5 darkseagreen\n' +
    'create line l1 0 0 100 100 #f5a623\n' +
    `save ${filePath}\n` +
    'exit\n',
  );

  assert.equal(result.code, 0);
  assert.doesNotMatch(result.stdout, /error:/);
  assert.match(result.stdout, /rect#named created/);
  assert.match(result.stdout, /rect#hex6 created/);
  assert.match(result.stdout, /rect#hex3 created/);
  assert.match(result.stdout, /rect#cased created/);
  assert.ok(result.stdout.includes(`saved to ${filePath} (6 elements)`));

  const svg = readFileSync(filePath, 'utf8');
  assert.match(svg, /<rect id="named"[^>]* fill="navy"/);
  assert.match(svg, /<rect id="hex6"[^>]* fill="#4a90d9"/);
  assert.match(svg, /<rect id="hex3"[^>]* fill="#ABC"/);
  assert.match(svg, /<rect id="cased"[^>]* fill="Red"/);
  assert.match(svg, /<circle id="c1"[^>]* fill="darkseagreen"/);
  assert.match(svg, /<line id="l1"[^>]* stroke="#f5a623"/);
});

test('rejects invalid colors without changing the document', async () => {
  const result = await runCli(
    'init\n' +
    'create rect keep 0 0 10 10\n' +
    'create rect bad-named 1 2 3 4 notacolor\n' +
    'create rect bad-hex-short 1 2 3 4 #ff\n' +
    'create rect bad-hex-chars 1 2 3 4 #gggggg\n' +
    'create circle bad-circle 1 2 3 12red\n' +
    'create line bad-stroke 0 0 1 1 nope\n' +
    'tree\n' +
    'exit\n',
  );

  assert.equal(result.code, 0);
  assert.match(result.stdout, /error: invalid color for fill: notacolor/);
  assert.match(result.stdout, /error: invalid color for fill: #ff$/m);
  assert.match(result.stdout, /error: invalid color for fill: #gggggg/);
  assert.match(result.stdout, /error: invalid color for fill: 12red/);
  assert.match(result.stdout, /error: invalid color for stroke: nope/);
  assert.doesNotMatch(result.stdout, /error: error:/);

  const lines = result.stdout.split('\n');
  assert.ok(lines.includes('└── rect#keep x=0 y=0 w=10 h=10'));
  assert.equal(
    lines.filter((line) => line.startsWith('├──') || line.startsWith('└──')).length,
    1,
  );
});

test('CommandParser parses create commands into structured results', () => {
  const parser = new CommandParser();

  const rect = parser.parseCreate(
    ['rect', 'r1', '1', '2', '3', '4', 'red', 'in', 'g1'],
  );
  assert.equal(rect.shapeType, 'rect');
  assert.equal(rect.id, 'r1');
  assert.deepEqual(rect.creation.numbers, [1, 2, 3, 4]);
  assert.equal(rect.creation.fill, 'red');
  assert.equal(rect.creation.stroke, undefined);
  assert.equal(rect.creation.content, undefined);
  assert.equal(rect.containerId, 'g1');

  const line = parser.parseCreate(['line', 'l1', '0', '0', '1', '1']);
  assert.equal(line.id, 'l1');
  assert.deepEqual(line.creation.numbers, [0, 0, 1, 1]);
  assert.equal(line.creation.stroke, undefined);
  assert.equal(line.containerId, undefined);

  const text = parser.parseCreate(['text', 't1', '5', '6', 'Hello World']);
  assert.deepEqual(text.creation.numbers, [5, 6]);
  assert.equal(text.creation.content, 'Hello World');

  const group = parser.parseCreate(['g', 'g1']);
  assert.equal(group.shapeType, 'g');
  assert.equal(group.id, 'g1');
  assert.equal(group.creation.numbers, undefined);

  assert.throws(
    () => parser.parseCreate(['hexagon', 'h1', '0', '0', '10']),
    { message: 'unknown shape type: hexagon (is the plugin loaded?)' },
  );
  assert.throws(
    () => parser.parseCreate(['rect', 'r1', '1', '2']),
    { message: 'usage: create rect <id> <x> <y> <w> <h> [fill] [in <group>]' },
  );
  assert.throws(
    () => parser.parseCreate([]),
    { message: 'usage: create <type> <id> [params] [in <group>]' },
  );
  assert.throws(
    () => parser.parseCreate(['line', 'l1', '0', '0', '1', '1', 'notacolor']),
    { message: 'invalid color for stroke: notacolor' },
  );
  assert.throws(
    () => parser.parseCreate(['circle', 'c1', '1', '2', '0']),
    { message: 'radius must be positive' },
  );
});

test('CommandParser parses init, tree, and save arguments', () => {
  const parser = new CommandParser();

  assert.deepEqual(parser.parseInit([]), { width: 800, height: 600 });
  assert.deepEqual(parser.parseInit(['1024.5', '768']), {
    width: 1024.5,
    height: 768,
  });
  assert.throws(
    () => parser.parseInit(['abc', '300']),
    { message: 'invalid number for width: abc' },
  );
  assert.throws(
    () => parser.parseInit(['0', '300']),
    { message: 'width must be positive' },
  );
  assert.throws(
    () => parser.parseInit(['1', '2', '3']),
    { message: 'usage: init [w] [h]' },
  );

  parser.parseTree([]);
  assert.throws(
    () => parser.parseTree(['x']),
    { message: 'usage: tree' },
  );

  assert.equal(parser.parseSave(['a.svg']), 'a.svg');
  assert.throws(
    () => parser.parseSave([]),
    { message: "no file path. use 'save <file.svg>'" },
  );
  assert.throws(
    () => parser.parseSave(['a.svg', 'b.svg']),
    { message: 'usage: save [file.svg]' },
  );
});

test('ShapeFactory creates all registered shape types through one interface', () => {
  const factory = new ShapeFactory();
  const registry = new ShapeRegistry();
  const rect = factory.create('rect', {
    id: 'r1',
    numbers: [1, 2, 3, 4],
    fill: 'red',
  });
  const circle = factory.create('circle', {
    id: 'c1',
    numbers: [5, 6, 7],
  });
  const ellipse = factory.create('ellipse', {
    id: 'e1',
    numbers: [8, 9, 10, 11],
  });
  const line = factory.create('line', {
    id: 'l1',
    numbers: [12, 13, 14, 15],
  });
  const text = factory.create('text', {
    id: 't1',
    numbers: [16, 17],
    content: 'Hello',
  });
  const group = factory.create('g', { id: 'g1', registry });

  assert.ok(rect instanceof Rect);
  assert.ok(circle instanceof Circle);
  assert.ok(ellipse instanceof Ellipse);
  assert.ok(line instanceof Line);
  assert.ok(text instanceof Text);
  assert.equal(rect.describe(), 'rect#r1 x=1 y=2 w=3 h=4 fill=red');
  assert.equal(circle.describe(), 'circle#c1 cx=5 cy=6 r=7');
  assert.equal(ellipse.describe(), 'ellipse#e1 cx=8 cy=9 rx=10 ry=11');
  assert.equal(line.describe(), 'line#l1 (12,13) -> (14,15)');
  assert.equal(text.describe(), 'text#t1 (16,17) "Hello"');
  assert.equal(group.describe(), 'g#g1');
  assert.equal(factory.has('g'), true);

  assert.deepEqual(
    factory.types().sort(),
    ['circle', 'ellipse', 'g', 'line', 'rect', 'text'],
  );

  const types = factory.types();
  types.push('custom');
  assert.equal(factory.has('custom'), false);
  assert.equal(factory.types().includes('custom'), false);
});

test('ShapeFactory rejects unknown shape types with a stable error', () => {
  const factory = new ShapeFactory();

  assert.throws(
    () => factory.create('missing', { id: 'x' }),
    { message: 'unknown shape type: missing (is the plugin loaded?)' },
  );
  assert.equal(factory.has('missing'), false);
});

test('ShapeFactory rejects duplicate and empty registrations without overwriting', () => {
  const factory = new ShapeFactory();
  const creator = () => new Rect('x', 0, 0, 1, 1);

  assert.throws(
    () => factory.register('rect', creator),
    { message: 'shape type already registered: rect' },
  );
  assert.throws(
    () => factory.register('', creator),
    { message: 'shape type must not be empty' },
  );
  assert.throws(
    () => factory.register('   ', creator),
    { message: 'shape type must not be empty' },
  );

  const original = factory.create('rect', {
    id: 'r1',
    numbers: [0, 0, 1, 1],
  });
  assert.ok(original instanceof Rect);
  assert.equal(original.id, 'r1');

  factory.register('custom', creator);
  assert.equal(factory.has('custom'), true);
  assert.equal(factory.create('custom', { id: 'x' }).id, 'x');
  assert.throws(
    () => factory.register(' custom ', creator),
    { message: 'shape type already registered: custom' },
  );
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
    'create hexagon h1 0 0 10\n' +
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
  assert.match(result.stdout, /error: unknown shape type: hexagon/);

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

test('Rect rejects empty ids and invalid geometry', () => {
  assert.throws(() => new Rect('', 0, 0, 10, 10), /shape id must not be empty/);

  for (const [x, y] of [[NaN, 0], [0, NaN], [Infinity, 0], [0, -Infinity]]) {
    assert.throws(
      () => new Rect('r1', x, y, 10, 10),
      /rectangle coordinates must be finite numbers/,
    );
  }

  for (const [width, height] of [
    [NaN, 10],
    [10, NaN],
    [Infinity, 10],
    [10, -Infinity],
    [0, 10],
    [10, 0],
    [-1, 10],
    [10, -1],
  ]) {
    assert.throws(
      () => new Rect('r1', 0, 0, width, height),
      /rectangle width and height must be positive/,
    );
  }
});

test('Rect.toSvgElement preserves attribute order, optional fill, and escaping', () => {
  assert.equal(
    new Rect('r1', 100, 120, 200, 80, 'blue').toSvgElement(),
    '<rect id="r1" x="100" y="120" width="200" height="80" fill="blue"/>',
  );
  assert.equal(
    new Rect('r2', 1.5, 2.5, 3, 4).toSvgElement(),
    '<rect id="r2" x="1.5" y="2.5" width="3" height="4"/>',
  );
  assert.equal(
    new Rect('a"&<>', 1, 2, 3, 4, 'red&"<>').toSvgElement(),
    '<rect id="a&quot;&amp;&lt;&gt;" x="1" y="2" width="3" height="4" fill="red&amp;&quot;&lt;&gt;"/>',
  );
});

test('Circle rejects empty ids and invalid geometry', () => {
  assert.throws(() => new Circle('', 0, 0, 10), /shape id must not be empty/);

  for (const [cx, cy] of [[NaN, 0], [0, NaN], [Infinity, 0], [0, -Infinity]]) {
    assert.throws(
      () => new Circle('c1', cx, cy, 10),
      /circle center coordinates must be finite numbers/,
    );
  }

  for (const radius of [NaN, Infinity, -Infinity, 0, -1]) {
    assert.throws(
      () => new Circle('c1', 0, 0, radius),
      /circle radius must be positive/,
    );
  }
});

test('Circle.toSvgElement preserves attribute order, optional fill, and escaping', () => {
  assert.equal(
    new Circle('c1', 100, 100, 20, 'red').toSvgElement(),
    '<circle id="c1" cx="100" cy="100" r="20" fill="red"/>',
  );
  assert.equal(
    new Circle('c2', 1.5, 2.5, 3).toSvgElement(),
    '<circle id="c2" cx="1.5" cy="2.5" r="3"/>',
  );
  assert.equal(
    new Circle('a"&<>', 1, 2, 3, 'red&"<>').toSvgElement(),
    '<circle id="a&quot;&amp;&lt;&gt;" cx="1" cy="2" r="3" fill="red&amp;&quot;&lt;&gt;"/>',
  );
});

test('Ellipse rejects empty ids and invalid geometry', () => {
  assert.throws(() => new Ellipse('', 0, 0, 10, 20), /shape id must not be empty/);

  for (const [cx, cy] of [[NaN, 0], [0, NaN], [Infinity, 0], [0, -Infinity]]) {
    assert.throws(
      () => new Ellipse('e1', cx, cy, 10, 20),
      /ellipse center coordinates must be finite numbers/,
    );
  }

  for (const [rx, ry] of [
    [NaN, 20],
    [10, NaN],
    [Infinity, 20],
    [10, -Infinity],
    [0, 20],
    [10, 0],
    [-1, 20],
    [10, -1],
  ]) {
    assert.throws(
      () => new Ellipse('e1', 0, 0, rx, ry),
      /ellipse radii must be positive/,
    );
  }
});

test('Ellipse.toSvgElement preserves attribute order, optional fill, and escaping', () => {
  assert.equal(
    new Ellipse('e1', 100, 100, 30, 20, 'blue').toSvgElement(),
    '<ellipse id="e1" cx="100" cy="100" rx="30" ry="20" fill="blue"/>',
  );
  assert.equal(
    new Ellipse('e2', 1.5, 2.5, 3, 4).toSvgElement(),
    '<ellipse id="e2" cx="1.5" cy="2.5" rx="3" ry="4"/>',
  );
  assert.equal(
    new Ellipse('a"&<>', 1, 2, 3, 4, 'red&"<>').toSvgElement(),
    '<ellipse id="a&quot;&amp;&lt;&gt;" cx="1" cy="2" rx="3" ry="4" fill="red&amp;&quot;&lt;&gt;"/>',
  );
});

test('Line rejects empty ids and non-finite endpoints', () => {
  assert.throws(() => new Line('', 0, 0, 10, 10), /shape id must not be empty/);

  for (const [x1, y1, x2, y2] of [
    [NaN, 0, 0, 0],
    [0, NaN, 0, 0],
    [0, 0, NaN, 0],
    [0, 0, 0, Infinity],
  ]) {
    assert.throws(
      () => new Line('l1', x1, y1, x2, y2),
      /line endpoints must be finite numbers/,
    );
  }
});

test('Line.toSvgElement preserves attribute order, optional stroke, and escaping', () => {
  assert.equal(
    new Line('l1', 10, 20, 30, 40, 'red').toSvgElement(),
    '<line id="l1" x1="10" y1="20" x2="30" y2="40" stroke="red"/>',
  );
  assert.equal(
    new Line('l2', -5, 50, 100.5, 200.5).toSvgElement(),
    '<line id="l2" x1="-5" y1="50" x2="100.5" y2="200.5"/>',
  );
  assert.equal(
    new Line('a"&<>', 1, 2, 3, 4, 'red&"<>').toSvgElement(),
    '<line id="a&quot;&amp;&lt;&gt;" x1="1" y1="2" x2="3" y2="4" stroke="red&amp;&quot;&lt;&gt;"/>',
  );
});

test('Text rejects empty ids and non-finite coordinates', () => {
  assert.throws(() => new Text('', 0, 0, 'x'), /shape id must not be empty/);

  for (const [x, y] of [[NaN, 0], [0, NaN], [Infinity, 0], [0, -Infinity]]) {
    assert.throws(
      () => new Text('t1', x, y, 'x'),
      /text coordinates must be finite numbers/,
    );
  }
});

test('Text.toSvgElement escapes attributes and text content correctly', () => {
  assert.equal(
    new Text('t1', 20, 40, 'My Diagram').toSvgElement(),
    '<text id="t1" x="20" y="40">My Diagram</text>',
  );
  assert.equal(
    new Text('empty', 1, 2, '').toSvgElement(),
    '<text id="empty" x="1" y="2"></text>',
  );
  assert.equal(
    new Text('a"&<>', 1, 2, 'Tom & Jerry <3 "quoted"').toSvgElement(),
    '<text id="a&quot;&amp;&lt;&gt;" x="1" y="2">Tom &amp; Jerry &lt;3 "quoted"</text>',
  );
});

test('preserves negative and out-of-canvas rectangle geometry', async (t) => {
  const tempDir = createTempDir(t);
  const filePath = path.join(tempDir, 'outside.svg');

  const result = await runCli(
    'init 100 100\n' +
    'create rect negative -10 -20 30 40\n' +
    'create rect partial 50 50 100 100\n' +
    'create rect outside 200 200 10 10\n' +
    'tree\n' +
    `save ${filePath}\n` +
    'exit\n',
  );

  assert.equal(result.code, 0);
  const lines = withoutPrompt(result.stdout).split('\n');
  const treeIndex = lines.indexOf('svg (100x100)');
  assert.notEqual(treeIndex, -1);
  assert.equal(lines[treeIndex + 1], '├── rect#negative x=-10 y=-20 w=30 h=40');
  assert.equal(lines[treeIndex + 2], '├── rect#partial x=50 y=50 w=100 h=100');
  assert.equal(lines[treeIndex + 3], '└── rect#outside x=200 y=200 w=10 h=10');

  const svg = readFileSync(filePath, 'utf8');
  assert.match(svg, /<rect id="negative" x="-10" y="-20" width="30" height="40"\/>/);
  assert.match(svg, /<rect id="partial" x="50" y="50" width="100" height="100"\/>/);
  assert.match(svg, /<rect id="outside" x="200" y="200" width="10" height="10"\/>/);
});

test('Document exposes dimensions, an empty root, and no initial IDs', () => {
  const document = new Document(800, 600);

  assert.equal(document.width, 800);
  assert.equal(document.height, 600);
  assert.equal(document.root.children.length, 0);
  assert.equal(document.findShape('r1'), undefined);
  assert.equal(document.hasShape('r1'), false);
});

test('Document rejects invalid canvas dimensions', () => {
  for (const [width, height] of [
    [0, 600],
    [-1, 600],
    [NaN, 600],
    [Infinity, 600],
    [800, 0],
    [800, -1],
    [800, NaN],
    [800, -Infinity],
  ]) {
    assert.throws(
      () => new Document(width, height),
      /canvas width and height must be positive/,
    );
  }
});

test('Document adds shapes in order, indexes IDs, and sets parents', () => {
  const document = new Document(100, 100);
  const first = new Rect('r1', 0, 0, 10, 10);
  const second = new Rect('R1', 20, 20, 10, 10);

  assert.equal(document.addShape(first), true);
  assert.equal(document.addShape(second), true);
  assert.equal(document.root.children.length, 2);
  assert.equal(document.root.children[0], first);
  assert.equal(document.root.children[1], second);
  assert.equal(first.parent, document.root);
  assert.equal(second.parent, document.root);
  assert.equal(document.findShape('r1'), first);
  assert.equal(document.findShape('R1'), second);
  assert.equal(document.findShape('r2'), undefined);
});

test('Document removes shapes, clears parents, and allows ID reuse', () => {
  const document = new Document(100, 100);
  const original = new Rect('r1', 0, 0, 10, 10);

  assert.equal(document.addShape(original), true);
  assert.equal(document.removeShape(original), true);
  assert.equal(document.root.children.length, 0);
  assert.equal(document.findShape('r1'), undefined);
  assert.equal(original.parent, null);

  const replacement = new Rect('r1', 20, 20, 10, 10);
  assert.equal(document.addShape(replacement), true);
  assert.equal(document.findShape('r1'), replacement);
  assert.equal(replacement.parent, document.root);
});

test('Document rejects duplicate and cross-container attachment', () => {
  const firstDocument = new Document(100, 100);
  const secondDocument = new Document(100, 100);
  const shape = new Rect('r1', 0, 0, 10, 10);

  assert.equal(firstDocument.addShape(shape), true);
  assert.equal(firstDocument.addShape(shape), false);
  assert.equal(secondDocument.addShape(shape), false);
  assert.equal(firstDocument.root.children.length, 1);
  assert.equal(firstDocument.root.children[0], shape);
  assert.equal(shape.parent, firstDocument.root);
  assert.equal(secondDocument.root.children.length, 0);
  assert.equal(secondDocument.findShape('r1'), undefined);

  const missing = new Rect('r9', 0, 0, 10, 10);
  assert.equal(firstDocument.removeShape(missing), false);
  assert.equal(firstDocument.root.children.length, 1);
  assert.equal(firstDocument.findShape('r1'), shape);
  assert.equal(missing.parent, null);

  assert.equal(firstDocument.removeShape(shape), true);
  assert.equal(firstDocument.removeShape(shape), false);
  assert.equal(firstDocument.root.children.length, 0);
  assert.equal(firstDocument.findShape('r1'), undefined);
  assert.equal(shape.parent, null);
});

test('removing a shape preserves the order and index of the remaining shapes', () => {
  const document = new Document(100, 100);
  const first = new Rect('a', 0, 0, 1, 1);
  const second = new Rect('b', 0, 0, 1, 1);
  const third = new Rect('c', 0, 0, 1, 1);

  assert.equal(document.addShape(first), true);
  assert.equal(document.addShape(second), true);
  assert.equal(document.addShape(third), true);
  assert.equal(document.removeShape(second), true);

  assert.equal(document.root.children.length, 2);
  assert.equal(document.root.children[0], first);
  assert.equal(document.root.children[1], third);
  assert.equal(document.findShape('b'), undefined);
  assert.equal(document.findShape('a'), first);
  assert.equal(document.findShape('c'), third);
  assert.equal(first.parent, document.root);
  assert.equal(second.parent, null);
  assert.equal(third.parent, document.root);
});

test('Group adds children in order, sets parents, and shares the registry', () => {
  const document = new Document(100, 100);
  const group = document.createGroup('g1');

  assert.equal(group.id, 'g1');
  assert.equal(group.parent, null);
  assert.equal(group.children.length, 0);
  assert.equal(document.addShape(group), true);
  assert.equal(group.parent, document.root);

  const rect = new Rect('r1', 0, 0, 10, 10);
  const circle = new Circle('c1', 5, 5, 2);

  assert.equal(group.add(rect), true);
  assert.equal(group.add(circle), true);
  assert.equal(group.children.length, 2);
  assert.equal(group.children[0], rect);
  assert.equal(group.children[1], circle);
  assert.equal(rect.parent, group);
  assert.equal(circle.parent, group);
  assert.equal(group.hasChild(rect), true);
  assert.equal(document.findShape('r1'), rect);
  assert.equal(document.findShape('c1'), circle);
});

test('Group rejects duplicate IDs without changing children or registry', () => {
  const document = new Document(100, 100);
  const group = document.createGroup('g1');
  const rootRect = new Rect('r1', 0, 0, 10, 10);
  const child = new Circle('c1', 5, 5, 2);

  assert.equal(document.addShape(group), true);
  assert.equal(document.addShape(rootRect), true);
  assert.equal(group.add(child), true);

  const duplicate = new Rect('r1', 20, 20, 10, 10);
  assert.equal(group.add(duplicate), false);
  assert.equal(group.children.length, 1);
  assert.equal(group.children[0], child);
  assert.equal(duplicate.parent, null);
  assert.equal(document.findShape('r1'), rootRect);

  const duplicateGroup = document.createGroup('g1');
  assert.equal(document.addShape(duplicateGroup), false);
  assert.equal(duplicateGroup.parent, null);
  assert.equal(document.root.children.length, 2);
  assert.equal(document.root.children[0], group);
  assert.equal(document.root.children[1], rootRect);
});

test('nested groups preserve parent chains, ordering, and global IDs', () => {
  const document = new Document(100, 100);
  const outer = document.createGroup('outer');
  const inner = document.createGroup('inner');
  const deep = document.createGroup('deep');
  const rect = new Rect('r1', 0, 0, 10, 10);

  assert.equal(document.addShape(outer), true);
  assert.equal(outer.add(inner), true);
  assert.equal(inner.add(deep), true);
  assert.equal(deep.add(rect), true);

  assert.equal(document.root.children[0], outer);
  assert.equal(outer.children[0], inner);
  assert.equal(inner.children[0], deep);
  assert.equal(deep.children[0], rect);
  assert.equal(rect.parent, deep);
  assert.equal(deep.parent, inner);
  assert.equal(inner.parent, outer);
  assert.equal(outer.parent, document.root);
  assert.equal(document.findShape('outer'), outer);
  assert.equal(document.findShape('inner'), inner);
  assert.equal(document.findShape('deep'), deep);
  assert.equal(document.findShape('r1'), rect);
});

test('Group rejects self-containment and ancestor cycles without mutation', () => {
  const document = new Document(100, 100);
  const outer = document.createGroup('outer');
  const inner = document.createGroup('inner');

  assert.equal(outer.add(inner), true);
  assert.equal(inner.add(outer), false);
  assert.equal(outer.parent, null);
  assert.equal(inner.parent, outer);
  assert.equal(outer.children.length, 1);
  assert.equal(outer.children[0], inner);
  assert.equal(inner.children.length, 0);
  assert.equal(document.findShape('inner'), inner);
  assert.equal(document.findShape('outer'), undefined);

  const solo = document.createGroup('solo');
  assert.equal(solo.add(solo), false);
  assert.equal(solo.children.length, 0);
  assert.equal(solo.parent, null);
});

test('Group removes children, clears parents, and preserves order', () => {
  const document = new Document(100, 100);
  const group = document.createGroup('g1');
  const first = new Rect('a', 0, 0, 1, 1);
  const second = new Circle('b', 1, 1, 1);
  const third = new Ellipse('c', 2, 2, 1, 1);

  assert.equal(document.addShape(group), true);
  assert.equal(group.add(first), true);
  assert.equal(group.add(second), true);
  assert.equal(group.add(third), true);
  assert.equal(group.remove(second), true);

  assert.equal(group.children.length, 2);
  assert.equal(group.children[0], first);
  assert.equal(group.children[1], third);
  assert.equal(second.parent, null);
  assert.equal(document.findShape('b'), undefined);
  assert.equal(group.remove(second), false);
  assert.equal(group.children.length, 2);
});

test('SvgSerializer serializes nested and empty groups in order', () => {
  const document = new Document(200, 100);
  const outer = document.createGroup('outer');
  const inner = document.createGroup('inner');
  const empty = document.createGroup('empty');

  assert.equal(document.addShape(outer), true);
  assert.equal(outer.add(inner), true);
  assert.equal(inner.add(new Rect('r1', 1, 2, 3, 4)), true);
  assert.equal(document.addShape(new Circle('c1', 10, 20, 5, 'red')), true);
  assert.equal(document.addShape(empty), true);

  const expected = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100">',
    '  <g id="outer">',
    '    <g id="inner">',
    '      <rect id="r1" x="1" y="2" width="3" height="4"/>',
    '    </g>',
    '  </g>',
    '  <circle id="c1" cx="10" cy="20" r="5" fill="red"/>',
    '  <g id="empty"/>',
    '</svg>',
    '',
  ].join('\n');

  assert.equal(new SvgSerializer().serialize(document), expected);
});

test('ignores blank lines and full-line comments', async () => {
  const result = await runCli(
    '\n' +
    '# this is a comment\n' +
    '   \n' +
    'init 100 100\n' +
    'tree\n' +
    'exit\n',
  );

  assert.equal(result.code, 0);
  assert.match(result.stdout, /canvas 100x100 created/);
  assert.match(result.stdout, /svg \(100x100\)/);
  assert.doesNotMatch(result.stdout, /error:/);
});

test('does not treat #fff in create rect as an inline comment', async () => {
  const result = await runCli(
    'init\n' +
    'create rect r1 0 0 10 10 #fff\n' +
    'tree\n' +
    'exit\n',
  );

  assert.equal(result.code, 0);
  assert.match(result.stdout, /rect#r1 created/);
  assert.match(result.stdout, /rect#r1 x=0 y=0 w=10 h=10 fill=#fff/);
  assert.doesNotMatch(result.stdout, /error:/);
});

test('saves to a quoted file path containing spaces', async (t) => {
  const tempDir = createTempDir(t);
  const filePath = path.join(tempDir, 'my drawing.svg');

  const result = await runCli(
    'init\n' +
    'create rect r1 0 0 10 10\n' +
    `save "${filePath}"\n` +
    'exit\n',
  );

  assert.equal(result.code, 0);
  assert.ok(result.stdout.includes(`saved to ${filePath} (1 element)`));

  const svg = readFileSync(filePath, 'utf8');
  assert.match(svg, /<rect id="r1" x="0" y="0" width="10" height="10"\/>/);
});

test('reports an unclosed quote and continues with later commands', async () => {
  const result = await runCli(
    'init\n' +
    'save "unfinished.svg\n' +
    'create rect r1 0 0 10 10\n' +
    'tree\n' +
    'exit\n',
  );

  assert.equal(result.code, 0);
  assert.match(result.stdout, /error: unclosed double quote/);
  assert.match(result.stdout, /rect#r1 created/);
  assert.match(result.stdout, /rect#r1 x=0 y=0 w=10 h=10/);
});

test('reports invalid quote syntax and continues with later commands', async () => {
  const result = await runCli(
    'init\n' +
    'save "a"b\n' +
    'create rect r1 0 0 10 10\n' +
    'tree\n' +
    'exit\n',
  );

  assert.equal(result.code, 0);
  assert.match(result.stdout, /error: invalid quote syntax/);
  assert.match(result.stdout, /rect#r1 created/);
});
