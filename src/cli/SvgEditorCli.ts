import { createInterface, type Interface } from 'node:readline';
import { Canvas } from '../model/Canvas.js';
import { ShapeFactory } from '../model/ShapeFactory.js';
import { SvgFileWriter } from '../io/SvgFileWriter.js';
import { SvgSerializer } from '../io/SvgSerializer.js';
import { TreeFormatter } from './TreeFormatter.js';

export class SvgEditorCli {
  private readonly lineReader: Interface;
  private readonly treeFormatter = new TreeFormatter();
  private readonly shapeFactory = new ShapeFactory();
  private readonly svgSerializer = new SvgSerializer();
  private readonly svgFileWriter = new SvgFileWriter();
  private document: Canvas | null = null;
  private closing = false;

  constructor() {
    this.lineReader = createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'svg> ',
    });
  }

  public run(): void {
    console.log('Welcome to SVG Editor CLI.');
    console.log('Type "help" for available commands, or "exit" to quit.');

    this.lineReader.on('line', (line: string) => {
      this.handleLine(line);
    });

    this.lineReader.on('close', () => {
      console.log('Goodbye.');
    });

    this.lineReader.prompt();
  }

  private handleLine(line: string): void {
    const command = line.trim();

    if (command === '') {
      this.lineReader.prompt();
      return;
    }

    try {
      this.execute(command);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`error: ${message}`);
    }

    if (!this.closing) {
      this.lineReader.prompt();
    }
  }

  private execute(command: string): void {
    const tokens = command.split(/\s+/);
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
        console.log(`error: unknown command: ${name}`);
    }
  }

  private init(args: string[]): void {
    if (args.length > 2) {
      this.printUsageError('init [w] [h]');
      return;
    }

    const width = args.length >= 1 ? this.parseNumber(args[0], 'width') : 800;
    if (width === null) {
      return;
    }

    const height = args.length >= 2 ? this.parseNumber(args[1], 'height') : 600;
    if (height === null) {
      return;
    }

    if (width <= 0) {
      console.log('error: width must be positive');
      return;
    }

    if (height <= 0) {
      console.log('error: height must be positive');
      return;
    }

    this.document = new Canvas(width, height);
    console.log(`canvas ${width}x${height} created`);
  }

  private create(args: string[]): void {
    const document = this.requireDocument();
    if (document === null) {
      return;
    }

    if (args.length === 0) {
      this.printUsageError('create rect <id> <x> <y> <w> <h> [fill]');
      return;
    }

    const shapeType = args[0];
    if (!this.shapeFactory.supports(shapeType)) {
      console.log(`error: unknown shape type: ${shapeType} (is the plugin loaded?)`);
      return;
    }

    if (args.length < 6 || args.length > 7) {
      this.printUsageError('create rect <id> <x> <y> <w> <h> [fill]');
      return;
    }

    const id = args[1];
    if (document.hasShape(id)) {
      console.log(`error: id already exists: ${id}`);
      return;
    }

    const x = this.parseNumber(args[2], 'x');
    if (x === null) {
      return;
    }

    const y = this.parseNumber(args[3], 'y');
    if (y === null) {
      return;
    }

    const width = this.parseNumber(args[4], 'width');
    if (width === null) {
      return;
    }

    const height = this.parseNumber(args[5], 'height');
    if (height === null) {
      return;
    }

    if (width <= 0) {
      console.log('error: width must be positive');
      return;
    }

    if (height <= 0) {
      console.log('error: height must be positive');
      return;
    }

    const shape = this.shapeFactory.createRect(id, x, y, width, height, args[6]);
    document.addShape(shape);
    console.log(`rect#${id} created`);
  }

  private tree(args: string[]): void {
    const document = this.requireDocument();
    if (document === null) {
      return;
    }

    if (args.length > 0) {
      this.printUsageError('tree');
      return;
    }

    console.log(this.treeFormatter.format(document));
  }

  private save(args: string[]): void {
    const document = this.requireDocument();
    if (document === null) {
      return;
    }

    if (args.length > 1) {
      this.printUsageError('save [file.svg]');
      return;
    }

    if (args.length === 0) {
      console.log("error: no file path. use 'save <file.svg>'");
      return;
    }

    const filePath = args[0];
    const content = this.svgSerializer.serialize(document);

    try {
      this.svgFileWriter.write(filePath, content);
    } catch {
      console.log(`error: cannot write file: ${filePath}`);
      return;
    }

    const count = document.shapes.length;
    console.log(`saved to ${filePath} (${count} element${count === 1 ? '' : 's'})`);
  }

  private requireDocument(): Canvas | null {
    if (this.document === null) {
      console.log("error: no document. use 'init' or 'read' first");
      return null;
    }

    return this.document;
  }

  private parseNumber(token: string, fieldName: string): number | null {
    const value = Number(token);

    if (!Number.isFinite(value)) {
      console.log(`error: invalid number for ${fieldName}: ${token}`);
      return null;
    }

    return value;
  }

  private printUsageError(usage: string): void {
    console.log(`error: usage: ${usage}`);
  }

  private printHelp(): void {
    console.log('Available commands:');
    console.log('  init [w] [h]                                  Create a new canvas.');
    console.log('  create rect <id> <x> <y> <w> <h> [fill]       Create a rectangle.');
    console.log('  tree                                          Show the document tree.');
    console.log('  save [file.svg]                               Save the current document.');
    console.log('  help                                          Show this help message.');
    console.log('  exit                                          Exit the editor.');
  }
}
