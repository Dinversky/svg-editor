import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const { SvgFileReader } = require('../dist/io/SvgFileReader.js');
const { SvgXmlParser } = require('../dist/io/SvgXmlParser.js');
const { SvgDocumentBuilder } = require('../dist/io/SvgDocumentBuilder.js');
const { TreeFormatter } = require('../dist/app/TreeFormatter.js');

function createTempDir(t) {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'svg-reader-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test('reads an SVG file as UTF-8 text', (t) => {
  const directory = createTempDir(t);
  const filePath = path.join(directory, 'sample.svg');
  const content = '<?xml version="1.0"?>\n<svg><text>你好</text></svg>\n';
  writeFileSync(filePath, content, 'utf8');

  assert.equal(new SvgFileReader().read(filePath), content);
});

test('reads an empty file without changing its content', (t) => {
  const directory = createTempDir(t);
  const filePath = path.join(directory, 'empty.svg');
  writeFileSync(filePath, '', 'utf8');

  assert.equal(new SvgFileReader().read(filePath), '');
});

test('propagates filesystem errors for missing files', (t) => {
  const directory = createTempDir(t);
  const filePath = path.join(directory, 'missing.svg');

  assert.throws(
    () => new SvgFileReader().read(filePath),
    (error) => error.code === 'ENOENT',
  );
});

test('parses SVG into ordered local-name elements with attributes and text', () => {
  const parser = new SvgXmlParser();
  const root = parser.parse(
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<svg:svg xmlns:svg="http://www.w3.org/2000/svg" width="400" height="300">\n'
    + '  <svg:rect id="r1" x="0" y="0" width="10" height="20"/>\n'
    + '  <!-- ignored -->\n'
    + '  <svg:text id="t1" x="5" y="6"> imported </svg:text>\n'
    + '</svg:svg>\n',
  );

  assert.equal(root.name, 'svg');
  assert.equal(root.attributes.width, '400');
  assert.equal(root.attributes.height, '300');
  assert.deepEqual(root.children.map((child) => child.name), ['rect', 'text']);
  assert.equal(root.children[0].attributes.id, 'r1');
  assert.equal(root.children[0].attributes.x, '0');
  assert.equal(root.children[1].attributes.id, 't1');
  assert.equal(root.children[1].text, 'imported');
});

test('preserves nested child order and ignores inter-element whitespace', () => {
  const parser = new SvgXmlParser();
  const root = parser.parse(
    '<svg width="10" height="10">\n'
    + '  <g id="g1">\n'
    + '    <rect id="r1" width="1" height="1"/>\n'
    + '    <circle id="c1" cx="1" cy="1" r="1"/>\n'
    + '  </g>\n'
    + '  <ellipse id="e1" cx="0" cy="0" rx="1" ry="1"/>\n'
    + '</svg>',
  );

  assert.deepEqual(root.children.map((child) => child.name), ['g', 'ellipse']);
  assert.deepEqual(root.children[0].children.map((child) => child.name), ['rect', 'circle']);
  assert.deepEqual(
    root.children[0].children.map((child) => child.attributes.id),
    ['r1', 'c1'],
  );
});

test('rejects malformed, empty, and non-svg XML without changing state', () => {
  const parser = new SvgXmlParser();

  assert.throws(() => parser.parse('<svg><rect></svg>'), {
    message: 'invalid XML',
  });
  assert.throws(() => parser.parse('   '), {
    message: 'empty XML document',
  });
  assert.throws(() => parser.parse('<html><body/></html>'), {
    message: 'root element must be svg',
  });
  assert.throws(() => parser.parse('<svg/><svg/>'), {
    message: 'XML document must contain exactly one root element',
  });
});

function build(xml) {
  const root = new SvgXmlParser().parse(xml);
  return new SvgDocumentBuilder().build(root);
}

test('builds the assignment other.svg document with a generated id warning', () => {
  const result = build(
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">\n'
    + '  <rect x="0" y="0" width="400" height="300" fill="#ffffff"/>\n'
    + '  <text id="t1" x="10" y="290">imported</text>\n'
    + '  <circle id="c1" cx="50" cy="50" r="10"/>\n'
    + '  <g id="g1">\n'
    + '    <rect id="r2" x="0" y="0" width="10" height="10"/>\n'
    + '    <circle id="c2" cx="5" cy="5" r="2"/>\n'
    + '  </g>\n'
    + '  <ellipse id="e1" cx="1" cy="2" rx="3" ry="4"/>\n'
    + '</svg>',
  );

  assert.equal(result.document.width, 400);
  assert.equal(result.document.height, 300);
  assert.deepEqual(result.warnings, ['assigned id rect1 to unnamed <rect>']);
  assert.equal(
    new TreeFormatter().format(result.document),
    'svg (400x300)\n'
    + '├── rect#rect1 x=0 y=0 w=400 h=300 fill=#ffffff\n'
    + '├── text#t1 (10,290) "imported"\n'
    + '├── circle#c1 cx=50 cy=50 r=10\n'
    + '├── g#g1\n'
    + '│   ├── rect#r2 x=0 y=0 w=10 h=10\n'
    + '│   └── circle#c2 cx=5 cy=5 r=2\n'
    + '└── ellipse#e1 cx=1 cy=2 rx=3 ry=4',
  );
});

test('resolves canvas size from width/height, viewBox, then defaults', () => {
  const viewBox = build(
    '<svg width="100%" height="50%" viewBox="0 0 320 240"><rect width="1" height="1"/></svg>',
  );
  assert.equal(viewBox.document.width, 320);
  assert.equal(viewBox.document.height, 240);

  const fallback = build('<svg><rect width="1" height="1"/></svg>');
  assert.equal(fallback.document.width, 800);
  assert.equal(fallback.document.height, 600);
});

test('skips unsupported and invalid elements with warnings while preserving order', () => {
  const result = build(
    '<svg width="100" height="100">\n'
    + '  <path d="M0 0"/>'
    + '  <rect id="bad" x="0" y="0" width="0" height="10"/>'
    + '  <rect id="badStyle" width="1" height="1" stroke-width="bad"/>'
    + '  <g id="g1"><circle id="c1" r="1"/><polygon/></g>'
    + '  <text id="t1">hello<tspan>world</tspan></text>'
    + '</svg>',
  );

  assert.deepEqual(result.warnings, [
    'skipping unsupported element: path',
    'skipping invalid element: <rect id="bad">',
    'skipping invalid element: <rect id="badStyle">',
    'skipping unsupported element: polygon',
    'skipping unsupported element: tspan',
  ]);
  assert.deepEqual(
    result.document.root.children.map((shape) => shape.id),
    ['g1', 't1'],
  );
  assert.deepEqual(
    result.document.findShape('g1').children.map((shape) => shape.id),
    ['c1'],
  );
  assert.equal(result.document.findShape('t1').content, 'hello');
});

test('fails the whole read when ids are duplicated', () => {
  assert.throws(
    () => build(
      '<svg width="10" height="10">'
      + '<rect id="r1" width="1" height="1"/>'
      + '<circle id="r1" r="1"/>'
      + '</svg>',
    ),
    { message: 'id already exists: r1' },
  );

  assert.throws(
    () => build(
      '<svg width="10" height="10">'
      + '<rect width="1" height="1"/>'
      + '<rect id="rect1" width="1" height="1"/>'
      + '</svg>',
    ),
    { message: 'id already exists: rect1' },
  );
});

test('applies styles, transform warnings, and SVG coordinate defaults', () => {
  const result = build(
    '<svg width="10" height="20">'
    + '<rect id="r1" width="5" height="6" fill="none" stroke="url(#g)" stroke-width="2.5" transform="translate(1,2)"/>'
    + '<circle id="c1" r="3"/>'
    + '<line id="l1"/>'
    + '<g id="g1" fill="#fff"><text id="t1">x</text></g>'
    + '</svg>',
  );

  const rect = result.document.findShape('r1');
  assert.equal(rect.x, 0);
  assert.equal(rect.y, 0);
  assert.equal(rect.width, 5);
  assert.equal(rect.height, 6);
  assert.equal(rect.fill, 'none');
  assert.equal(rect.stroke, 'url(#g)');
  assert.equal(rect.strokeWidth, 2.5);

  const circle = result.document.findShape('c1');
  assert.equal(circle.cx, 0);
  assert.equal(circle.cy, 0);
  assert.equal(circle.r, 3);

  const line = result.document.findShape('l1');
  assert.deepEqual([line.x1, line.y1, line.x2, line.y2], [0, 0, 0, 0]);

  const group = result.document.findShape('g1');
  assert.equal(group.fill, '#fff');
  assert.equal(result.document.findShape('t1').content, 'x');
  assert.deepEqual(result.warnings, ['ignoring transform on rect#r1']);
});
