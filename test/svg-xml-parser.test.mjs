import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const { SvgXmlParser } = require('../dist/io/SvgXmlParser.js');

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
