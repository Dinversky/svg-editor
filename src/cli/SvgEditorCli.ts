import { createInterface, type Interface } from 'node:readline';
import { EditorError } from '../errors/EditorError.js';
import { Document } from '../model/Document.js';
import type { Shape } from '../model/Shape.js';
import type { ShapeContainer } from '../model/ShapeContainer.js';
import { ShapeFactory } from '../model/ShapeFactory.js';
import { SvgFileWriter } from '../io/SvgFileWriter.js';
import { SvgSerializer } from '../io/SvgSerializer.js';
import { CommandParser, type ParsedCreate } from './CommandParser.js';
import { Tokenizer } from './Tokenizer.js';
import { TreeFormatter } from './TreeFormatter.js';

export class SvgEditorCli {
  private readonly lineReader: Interface;
  private readonly interactive: boolean;
  private readonly tokenizer = new Tokenizer();
  private readonly commandParser = new CommandParser();
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
    const { width, height } = this.commandParser.parseInit(args);

    this.document = new Document(width, height);
    console.log(`canvas ${width}x${height} created`);
  }

  private create(args: string[]): void {
    const document = this.requireDocument();
    const parsed = this.commandParser.parseCreate(args);

    if (document.hasShape(parsed.id)) {
      throw new EditorError(`id already exists: ${parsed.id}`);
    }

    const target = this.resolveContainer(document, parsed.containerId);
    const shape = this.createShape(document, parsed);
    if (!target.add(shape)) {
      throw new EditorError(`id already exists: ${parsed.id}`);
    }

    const location = parsed.containerId === undefined
      ? ''
      : ` in g#${parsed.containerId}`;
    console.log(`${parsed.shapeType}#${shape.id} created${location}`);
  }

  private createShape(document: Document, parsed: ParsedCreate): Shape {
    // g 的创建器需要文档级 registry，因此经由 Document.createGroup 委托工厂。
    if (parsed.shapeType === 'g') {
      return document.createGroup(parsed.id);
    }

    return this.shapeFactory.create(parsed.shapeType, parsed.creation);
  }

  private resolveContainer(
    document: Document,
    containerId?: string,
  ): ShapeContainer {
    if (containerId === undefined) {
      return document.root;
    }

    const shape = document.findShape(containerId);
    if (shape === undefined) {
      throw new EditorError(`no such container: ${containerId}`);
    }

    const container = shape.asContainer();
    if (container === null) {
      throw new EditorError(`not a container: ${containerId}`);
    }

    return container;
  }

  private tree(args: string[]): void {
    const document = this.requireDocument();
    const id = this.commandParser.parseTree(args);

    if (id === undefined) {
      console.log(this.treeFormatter.format(document));
      return;
    }

    const shape = document.findShape(id);
    if (shape === undefined) {
      throw new EditorError(`no such shape: ${id}`);
    }

    console.log(this.treeFormatter.formatSubtree(shape));
  }

  private save(args: string[]): void {
    const document = this.requireDocument();
    const filePath = this.commandParser.parseSave(args);
    const content = this.svgSerializer.serialize(document);

    try {
      this.svgFileWriter.write(filePath, content);
    } catch {
      throw new EditorError(`cannot write file: ${filePath}`);
    }

    const count = document.countShapes();
    console.log(`saved to ${filePath} (${count} element${count === 1 ? '' : 's'})`);
  }

  private requireDocument(): Document {
    if (this.document === null) {
      throw new EditorError("no document. use 'init' or 'read' first");
    }

    return this.document;
  }

  private printHelp(): void {
    console.log('Available commands:');
    console.log('  init [w] [h]                                  Create a new canvas.');
    console.log('  create rect <id> <x> <y> <w> <h> [fill]       Create a rectangle.');
    console.log('  create circle <id> <cx> <cy> <r> [fill]       Create a circle.');
    console.log('  create ellipse <id> <cx> <cy> <rx> <ry> [fill] Create an ellipse.');
    console.log('  create line <id> <x1> <y1> <x2> <y2> [stroke] Create a line.');
    console.log('  create text <id> <x> <y> "content"             Create a text element.');
    console.log('  create g <id>                                  Create an empty group.');
    console.log('  create <type> ... [in <group>]                 Add a shape to the root or an existing group.');
    console.log('  tree [id]                                     Show the document tree or a node subtree.');
    console.log('  save [file.svg]                               Save the current document.');
    console.log('  help                                          Show this help message.');
    console.log('  exit                                          Exit the editor.');
  }
}
