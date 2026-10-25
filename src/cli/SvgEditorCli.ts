import { createInterface, type Interface } from 'node:readline';
import { EditorError } from '../errors/EditorError.js';
import { Document } from '../model/Document.js';
import { ShapeFactory } from '../model/ShapeFactory.js';
import { SvgFileWriter } from '../io/SvgFileWriter.js';
import { SvgSerializer } from '../io/SvgSerializer.js';
import { Tokenizer } from './Tokenizer.js';
import { TreeFormatter } from './TreeFormatter.js';

export class SvgEditorCli {
  private readonly lineReader: Interface;
  private readonly interactive: boolean;
  private readonly tokenizer = new Tokenizer();
  private readonly treeFormatter = new TreeFormatter();
  private readonly shapeFactory = new ShapeFactory();
  private readonly svgSerializer = new SvgSerializer();
  private readonly svgFileWriter = new SvgFileWriter();
  private document: Document | null = null;
  private closing = false;

  constructor() {
    this.interactive = process.stdin.isTTY === true;
    this.lineReader = createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'svg> ',
    });
  }

  public run(): void {
    console.log("svg-editor 0.1 — type 'help' for commands");

    this.lineReader.on('line', (line: string) => {
      this.handleLine(line);
    });

    this.lineReader.on('close', () => {
      console.log('Goodbye.');
    });

    this.prompt();
  }

  private handleLine(line: string): void {
    try {
      const tokens = this.tokenizer.tokenize(line);

      if (tokens.length === 0) {
        this.prompt();
        return;
      }

      this.execute(tokens);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`error: ${message}`);
    }

    if (!this.closing) {
      this.prompt();
    }
  }

  private prompt(): void {
    if (this.interactive) {
      this.lineReader.prompt();
    }
  }

  private execute(tokens: string[]): void {
    const name = tokens[0];
    const args = tokens.slice(1);

    switch (name) {
      case 'help':
        this.printHelp();
        return;
      case 'exit':
        this.closing = true;
        this.lineReader.close();
        return;
      case 'init':
        this.init(args);
        return;
      case 'create':
        this.create(args);
        return;
      case 'tree':
        this.tree(args);
        return;
      case 'save':
        this.save(args);
        return;
      default:
        throw new EditorError(`unknown command: ${name}`);
    }
  }

  private init(args: string[]): void {
    if (args.length > 2) {
      this.failUsage('init [w] [h]');
    }

    const width = args.length >= 1 ? this.parseNumber(args[0], 'width') : 800;
    const height = args.length >= 2 ? this.parseNumber(args[1], 'height') : 600;

    if (width <= 0) {
      throw new EditorError('width must be positive');
    }

    if (height <= 0) {
      throw new EditorError('height must be positive');
    }

    this.document = new Document(width, height);
    console.log(`canvas ${width}x${height} created`);
  }

  private create(args: string[]): void {
    const document = this.requireDocument();

    if (args.length === 0) {
      this.failUsage('create <type> <id> [params]');
    }

    const shapeType = args[0];
    if (!this.shapeFactory.supports(shapeType)) {
      this.failUnknownShapeType(shapeType);
    }

    if (shapeType === 'rect') {
      this.createRect(document, args);
      return;
    }

    if (shapeType === 'circle') {
      this.createCircle(document, args);
      return;
    }

    if (shapeType === 'ellipse') {
      this.createEllipse(document, args);
      return;
    }

    if (shapeType === 'line') {
      this.createLine(document, args);
      return;
    }

    if (shapeType === 'text') {
      this.createText(document, args);
      return;
    }

    this.failUnknownShapeType(shapeType);
  }

  private createRect(document: Document, args: string[]): void {
    if (args.length < 6 || args.length > 7) {
      this.failUsage('create rect <id> <x> <y> <w> <h> [fill]');
    }

    const id = args[1];
    if (document.hasShape(id)) {
      throw new EditorError(`id already exists: ${id}`);
    }

    const x = this.parseNumber(args[2], 'x');
    const y = this.parseNumber(args[3], 'y');
    const width = this.parseNumber(args[4], 'width');
    const height = this.parseNumber(args[5], 'height');

    if (width <= 0) {
      throw new EditorError('width must be positive');
    }

    if (height <= 0) {
      throw new EditorError('height must be positive');
    }

    const shape = this.shapeFactory.createRect(id, x, y, width, height, args[6]);
    if (!document.addShape(shape)) {
      throw new EditorError(`id already exists: ${id}`);
    }

    console.log(`rect#${id} created`);
  }

  private createCircle(document: Document, args: string[]): void {
    if (args.length < 5 || args.length > 6) {
      this.failUsage('create circle <id> <cx> <cy> <r> [fill]');
    }

    const id = args[1];
    if (document.hasShape(id)) {
      throw new EditorError(`id already exists: ${id}`);
    }

    const cx = this.parseNumber(args[2], 'cx');
    const cy = this.parseNumber(args[3], 'cy');
    const radius = this.parseNumber(args[4], 'r');

    if (radius <= 0) {
      throw new EditorError('radius must be positive');
    }

    const shape = this.shapeFactory.createCircle(id, cx, cy, radius, args[5]);
    if (!document.addShape(shape)) {
      throw new EditorError(`id already exists: ${id}`);
    }

    console.log(`circle#${id} created`);
  }

  private createEllipse(document: Document, args: string[]): void {
    if (args.length < 6 || args.length > 7) {
      this.failUsage('create ellipse <id> <cx> <cy> <rx> <ry> [fill]');
    }

    const id = args[1];
    if (document.hasShape(id)) {
      throw new EditorError(`id already exists: ${id}`);
    }

    const cx = this.parseNumber(args[2], 'cx');
    const cy = this.parseNumber(args[3], 'cy');
    const rx = this.parseNumber(args[4], 'rx');
    const ry = this.parseNumber(args[5], 'ry');

    if (rx <= 0) {
      throw new EditorError('rx must be positive');
    }

    if (ry <= 0) {
      throw new EditorError('ry must be positive');
    }

    const shape = this.shapeFactory.createEllipse(id, cx, cy, rx, ry, args[6]);
    if (!document.addShape(shape)) {
      throw new EditorError(`id already exists: ${id}`);
    }

    console.log(`ellipse#${id} created`);
  }

  private createLine(document: Document, args: string[]): void {
    if (args.length < 6 || args.length > 7) {
      this.failUsage('create line <id> <x1> <y1> <x2> <y2> [stroke]');
    }

    const id = args[1];
    if (document.hasShape(id)) {
      throw new EditorError(`id already exists: ${id}`);
    }

    const x1 = this.parseNumber(args[2], 'x1');
    const y1 = this.parseNumber(args[3], 'y1');
    const x2 = this.parseNumber(args[4], 'x2');
    const y2 = this.parseNumber(args[5], 'y2');

    const shape = this.shapeFactory.createLine(id, x1, y1, x2, y2, args[6]);
    if (!document.addShape(shape)) {
      throw new EditorError(`id already exists: ${id}`);
    }

    console.log(`line#${id} created`);
  }

  private createText(document: Document, args: string[]): void {
    if (args.length !== 5) {
      this.failUsage('create text <id> <x> <y> "content"');
    }

    const id = args[1];
    if (document.hasShape(id)) {
      throw new EditorError(`id already exists: ${id}`);
    }

    const x = this.parseNumber(args[2], 'x');
    const y = this.parseNumber(args[3], 'y');
    const content = args[4];

    const shape = this.shapeFactory.createText(id, x, y, content);
    if (!document.addShape(shape)) {
      throw new EditorError(`id already exists: ${id}`);
    }

    console.log(`text#${id} created`);
  }

  private tree(args: string[]): void {
    const document = this.requireDocument();

    if (args.length > 0) {
      this.failUsage('tree');
    }

    console.log(this.treeFormatter.format(document));
  }

  private save(args: string[]): void {
    const document = this.requireDocument();

    if (args.length > 1) {
      this.failUsage('save [file.svg]');
    }

    if (args.length === 0) {
      throw new EditorError("no file path. use 'save <file.svg>'");
    }

    const filePath = args[0];
    const content = this.svgSerializer.serialize(document);

    try {
      this.svgFileWriter.write(filePath, content);
    } catch {
      throw new EditorError(`cannot write file: ${filePath}`);
    }

    const count = document.root.children.length;
    console.log(`saved to ${filePath} (${count} element${count === 1 ? '' : 's'})`);
  }

  private requireDocument(): Document {
    if (this.document === null) {
      throw new EditorError("no document. use 'init' or 'read' first");
    }

    return this.document;
  }

  private parseNumber(token: string, fieldName: string): number {
    const value = Number(token);

    if (!Number.isFinite(value)) {
      throw new EditorError(`invalid number for ${fieldName}: ${token}`);
    }

    return value;
  }

  private failUsage(usage: string): never {
    throw new EditorError(`usage: ${usage}`);
  }

  private failUnknownShapeType(shapeType: string): never {
    throw new EditorError(`unknown shape type: ${shapeType} (is the plugin loaded?)`);
  }

  private printHelp(): void {
    console.log('Available commands:');
    console.log('  init [w] [h]                                  Create a new canvas.');
    console.log('  create rect <id> <x> <y> <w> <h> [fill]       Create a rectangle.');
    console.log('  create circle <id> <cx> <cy> <r> [fill]       Create a circle.');
    console.log('  create ellipse <id> <cx> <cy> <rx> <ry> [fill] Create an ellipse.');
    console.log('  create line <id> <x1> <y1> <x2> <y2> [stroke] Create a line.');
    console.log('  create text <id> <x> <y> "content"             Create a text element.');
    console.log('  tree                                          Show the document tree.');
    console.log('  save [file.svg]                               Save the current document.');
    console.log('  help                                          Show this help message.');
    console.log('  exit                                          Exit the editor.');
  }
}
