import { createInterface, type Interface } from 'node:readline';
import { CommandExecutor } from '../commands/CommandExecutor.js';
import { CommandRegistry } from '../commands/CommandRegistry.js';
import { CreateCommand } from '../commands/CreateCommand.js';
import { DeleteCommand } from '../commands/DeleteCommand.js';
import { FrontCommand } from '../commands/FrontCommand.js';
import { BackCommand } from '../commands/BackCommand.js';
import { GroupCommand } from '../commands/GroupCommand.js';
import { History } from '../commands/History.js';
import { MoveCommand } from '../commands/MoveCommand.js';
import { ScaleCommand } from '../commands/ScaleCommand.js';
import { SetCommand } from '../commands/SetCommand.js';
import { UngroupCommand } from '../commands/UngroupCommand.js';
import { AddToCommand } from '../commands/AddToCommand.js';
import type { Command } from '../commands/Command.js';
import { EditorError } from '../errors/EditorError.js';
import { Document } from '../model/Document.js';
import type { AttributeValue, Shape } from '../model/Shape.js';
import type { ShapeContainer } from '../model/ShapeContainer.js';
import { ShapeFactory } from '../model/ShapeFactory.js';
import { SvgFileWriter } from '../io/SvgFileWriter.js';
import { SvgSerializer } from '../io/SvgSerializer.js';
import { CommandParser, type ParsedCreate } from './CommandParser.js';
import { ShowFormatter } from './ShowFormatter.js';
import { Tokenizer } from './Tokenizer.js';
import { TreeFormatter } from './TreeFormatter.js';

interface EditRequestBase {
  readonly document: Document;
}

interface CreateRequest extends EditRequestBase {
  readonly shape: Shape;
  readonly container: ShapeContainer;
}

interface MoveRequest extends EditRequestBase {
  readonly target: Shape;
  readonly dx: number;
  readonly dy: number;
}

interface ScaleRequest extends EditRequestBase {
  readonly target: Shape;
  readonly factor: number;
}

interface SetRequest extends EditRequestBase {
  readonly target: Shape;
  readonly attribute: string;
  readonly value: AttributeValue;
}

interface DeleteRequest extends EditRequestBase {
  readonly target: Shape;
}

interface GroupRequest extends EditRequestBase {
  readonly newGroupId: string;
  readonly shapes: readonly Shape[];
}

interface UngroupRequest extends EditRequestBase {
  readonly target: Shape;
}

interface AddToRequest extends EditRequestBase {
  readonly target: Shape;
  readonly container: ShapeContainer;
}

interface ReorderRequest extends EditRequestBase {
  readonly target: Shape;
}

type EditRequest =
  | CreateRequest
  | MoveRequest
  | ScaleRequest
  | SetRequest
  | DeleteRequest
  | GroupRequest
  | UngroupRequest
  | AddToRequest
  | ReorderRequest;

interface CommandFeedback {
  readonly undo: string;
  readonly redo: string;
}

interface Point {
  readonly x: number;
  readonly y: number;
}

export class SvgEditorCli {
  private readonly lineReader: Interface;
  private readonly interactive: boolean;
  private readonly tokenizer = new Tokenizer();
  private readonly commandParser = new CommandParser();
  private readonly treeFormatter = new TreeFormatter();
  private readonly showFormatter = new ShowFormatter();
  private readonly shapeFactory = new ShapeFactory();
  private readonly svgSerializer = new SvgSerializer();
  private readonly svgFileWriter = new SvgFileWriter();
  private readonly history = new History();
  private readonly executor = new CommandExecutor(this.history);
  private readonly commandRegistry = new CommandRegistry<EditRequest>();
  private readonly feedback = new Map<Command, CommandFeedback>();
  private document: Document | null = null;
  private closing = false;

  constructor() {
    this.registerEditCommands();
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
      case 'move':
        this.move(args);
        return;
      case 'scale':
        this.scale(args);
        return;
      case 'set':
        this.set(args);
        return;
      case 'delete':
        this.delete(args);
        return;
      case 'group':
        this.group(args);
        return;
      case 'ungroup':
        this.ungroup(args);
        return;
      case 'addto':
        this.addTo(args);
        return;
      case 'front':
        this.front(args);
        return;
      case 'back':
        this.back(args);
        return;
      case 'undo':
        this.undoCommand(args);
        return;
      case 'redo':
        this.redoCommand(args);
        return;
      case 'tree':
        this.tree(args);
        return;
      case 'show':
        this.show(args);
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
    this.history.clear();
    this.history.lock();
    this.feedback.clear();
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
    const location = parsed.containerId === undefined
      ? ''
      : ` in g#${parsed.containerId}`;
    const label = `${parsed.shapeType}#${shape.id}`;

    this.runEdit(
      'create',
      { document, shape, container: target },
      `${label} creation undone`,
      `${label} created${location}`,
    );
  }

  private move(args: string[]): void {
    const document = this.requireDocument();
    const parsed = this.commandParser.parseMove(args);
    const target = this.requireShape(document, parsed.id);
    const label = this.shapeLabel(target);
    const position = this.positionOf(target);
    const undo = position === null
      ? `${label} moved back by (${-parsed.dx},${-parsed.dy})`
      : `${label} moved back to (${position.x},${position.y})`;
    const redo = position === null
      ? `${label} moved by (${parsed.dx},${parsed.dy})`
      : `${label} moved to (${position.x + parsed.dx},${position.y + parsed.dy})`;

    this.runEdit(
      'move',
      { document, target, dx: parsed.dx, dy: parsed.dy },
      undo,
      redo,
    );
  }

  private scale(args: string[]): void {
    const document = this.requireDocument();
    const parsed = this.commandParser.parseScale(args);
    const target = this.requireShape(document, parsed.id);
    const label = this.shapeLabel(target);

    this.runEdit(
      'scale',
      { document, target, factor: parsed.factor },
      `${label} scaled back by ${parsed.factor}`,
      `${label} scaled by ${parsed.factor}`,
    );
  }

  private set(args: string[]): void {
    const document = this.requireDocument();
    const parsed = this.commandParser.parseSet(args);
    const target = this.requireShape(document, parsed.id);
    const previous = target.getAttribute(parsed.attribute);
    const label = this.shapeLabel(target);
    const oldText = previous === undefined
      ? `${label} updated: ${parsed.attribute} removed`
      : `${label} updated: ${parsed.attribute}=${this.formatAttribute(parsed.attribute, previous)}`;

    this.runEdit(
      'set',
      {
        document,
        target,
        attribute: parsed.attribute,
        value: parsed.value,
      },
      oldText,
      `${label} updated: ${parsed.attribute}=${this.formatAttribute(parsed.attribute, parsed.value)}`,
    );
  }

  private delete(args: string[]): void {
    const document = this.requireDocument();
    const id = this.commandParser.parseDelete(args);
    const target = this.requireShape(document, id);
    const label = this.shapeLabel(target);
    const parent = target.parent === null ? 'none' : target.parent.describe();

    this.runEdit(
      'delete',
      { document, target },
      `${label} restored into ${parent}`,
      `${label} deleted`,
    );
  }

  private group(args: string[]): void {
    const document = this.requireDocument();
    const parsed = this.commandParser.parseGroup(args);
    const shapes = parsed.ids.map((id) => this.requireShape(document, id));
    const label = `g#${parsed.newGroupId}`;
    const count = this.childrenLabel(shapes.length);

    this.runEdit(
      'group',
      { document, newGroupId: parsed.newGroupId, shapes },
      `${label} removed with ${count} restored`,
      `${label} created with ${count}`,
    );
  }

  private ungroup(args: string[]): void {
    const document = this.requireDocument();
    const id = this.commandParser.parseUngroup(args);
    const target = this.requireShape(document, id);
    const container = target.asContainer();
    if (container === null) {
      throw new EditorError(`not a container: ${id}`);
    }

    const label = this.shapeLabel(target);
    const count = this.childrenLabel(container.children.length);

    this.runEdit(
      'ungroup',
      { document, target },
      `${label} restored with ${count}`,
      `${label} ungrouped with ${count}`,
    );
  }

  private addTo(args: string[]): void {
    const document = this.requireDocument();
    const parsed = this.commandParser.parseAddTo(args);
    const container = this.requireContainer(document, parsed.containerId);
    const target = this.requireShape(document, parsed.shapeId);
    const label = this.shapeLabel(target);
    const oldParent = target.parent === null ? 'none' : target.parent.describe();

    this.runEdit(
      'addto',
      { document, target, container },
      `${label} moved back to ${oldParent}`,
      `${label} added to ${container.describe()}`,
    );
  }

  private front(args: string[]): void {
    const document = this.requireDocument();
    const id = this.commandParser.parseFront(args);
    const target = this.requireShape(document, id);
    const label = this.shapeLabel(target);

    this.runEdit(
      'front',
      { document, target },
      `${label} order restored`,
      `${label} moved to front`,
    );
  }

  private back(args: string[]): void {
    const document = this.requireDocument();
    const id = this.commandParser.parseBack(args);
    const target = this.requireShape(document, id);
    const label = this.shapeLabel(target);

    this.runEdit(
      'back',
      { document, target },
      `${label} order restored`,
      `${label} moved to back`,
    );
  }

  private undoCommand(args: string[]): void {
    this.requireDocument();
    this.commandParser.parseNoArgs(args, 'undo');
    this.assertHistoryUnlocked();
    const command = this.history.peekUndo();
    if (command === null) {
      throw new EditorError('nothing to undo');
    }

    this.history.undo();
    console.log(this.feedback.get(command)?.undo ?? 'undo');
  }

  private redoCommand(args: string[]): void {
    this.requireDocument();
    this.commandParser.parseNoArgs(args, 'redo');
    this.assertHistoryUnlocked();
    const command = this.history.peekRedo();
    if (command === null) {
      throw new EditorError('nothing to redo');
    }

    this.history.redo();
    console.log(this.feedback.get(command)?.redo ?? 'redo');
  }

  private assertHistoryUnlocked(): void {
    if (this.history.isLocked) {
      throw new EditorError('undo not allowed after io command');
    }
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

    return this.requireContainer(document, containerId);
  }

  private requireShape(document: Document, id: string): Shape {
    const shape = document.findShape(id);
    if (shape === undefined) {
      throw new EditorError(`no such shape: ${id}`);
    }

    return shape;
  }

  private requireContainer(document: Document, id: string): ShapeContainer {
    const shape = document.findShape(id);
    if (shape === undefined) {
      throw new EditorError(`no such container: ${id}`);
    }

    const container = shape.asContainer();
    if (container === null) {
      throw new EditorError(`not a container: ${id}`);
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

    const shape = this.requireShape(document, id);
    console.log(this.treeFormatter.formatSubtree(shape));
  }

  private show(args: string[]): void {
    const document = this.requireDocument();
    const id = this.commandParser.parseShow(args);
    const shape = this.requireShape(document, id);

    console.log(this.showFormatter.format(shape));
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
    this.history.lock();
    console.log(`saved to ${filePath} (${count} element${count === 1 ? '' : 's'})`);
  }

  private requireDocument(): Document {
    if (this.document === null) {
      throw new EditorError("no document. use 'init' or 'read' first");
    }

    return this.document;
  }

  private runEdit(
    name: string,
    request: EditRequest,
    undo: string,
    redo: string,
  ): void {
    const command = this.commandRegistry.create(name, request);
    this.executor.execute(command);
    this.feedback.set(command, { undo, redo });
    console.log(redo);
  }

  private registerEditCommands(): void {
    this.commandRegistry.register('create', (request) => {
      const edit = request as CreateRequest;
      return new CreateCommand(edit.shape, edit.container);
    });

    this.commandRegistry.register('move', (request) => {
      const edit = request as MoveRequest;
      return new MoveCommand(edit.target, edit.dx, edit.dy);
    });

    this.commandRegistry.register('scale', (request) => {
      const edit = request as ScaleRequest;
      return new ScaleCommand(edit.target, edit.factor);
    });

    this.commandRegistry.register('set', (request) => {
      const edit = request as SetRequest;
      return new SetCommand(edit.target, edit.attribute, edit.value);
    });

    this.commandRegistry.register('delete', (request) => {
      const edit = request as DeleteRequest;
      return new DeleteCommand(edit.document, edit.target);
    });

    this.commandRegistry.register('group', (request) => {
      const edit = request as GroupRequest;
      return new GroupCommand(edit.document, edit.newGroupId, edit.shapes);
    });

    this.commandRegistry.register('ungroup', (request) => {
      const edit = request as UngroupRequest;
      return new UngroupCommand(edit.document, edit.target);
    });

    this.commandRegistry.register('addto', (request) => {
      const edit = request as AddToRequest;
      return new AddToCommand(edit.document, edit.target, edit.container);
    });

    this.commandRegistry.register('front', (request) => {
      const edit = request as ReorderRequest;
      return new FrontCommand(edit.document, edit.target);
    });

    this.commandRegistry.register('back', (request) => {
      const edit = request as ReorderRequest;
      return new BackCommand(edit.document, edit.target);
    });
  }

  private shapeLabel(shape: Shape): string {
    const description = shape.describe();
    const separator = description.indexOf(' ');

    return separator === -1 ? description : description.slice(0, separator);
  }

  private positionOf(shape: Shape): Point | null {
    const description = shape.describe();
    const values = new Map<string, string>();

    for (const token of description.split(' ')) {
      const separator = token.indexOf('=');
      if (separator > 0) {
        values.set(token.slice(0, separator), token.slice(separator + 1));
      }
    }

    const xText = values.get('x') ?? values.get('cx');
    const yText = values.get('y') ?? values.get('cy');
    if (xText !== undefined && yText !== undefined) {
      const x = Number(xText);
      const y = Number(yText);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        return { x, y };
      }
    }

    const pair = description.match(/\((-?\d+(?:\.\d+)?(?:e[+-]?\d+)?),(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)\)/i);
    if (pair !== null) {
      const x = Number(pair[1]);
      const y = Number(pair[2]);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        return { x, y };
      }
    }

    return null;
  }

  private formatAttribute(attribute: string, value: AttributeValue): string {
    return attribute === 'text' ? `"${String(value)}"` : String(value);
  }

  private childrenLabel(count: number): string {
    return `${count} child${count === 1 ? '' : 'ren'}`;
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
    console.log('  move <id> <dx> <dy>                            Move a shape or group.');
    console.log('  scale <id> <factor>                            Scale a shape or group.');
    console.log('  set <id> <attr> <value>                        Set an attribute.');
    console.log('  delete <id>                                    Delete a shape or group.');
    console.log('  group <newGid> <id1> <id2>...                  Group existing shapes.');
    console.log('  ungroup <gid>                                  Dissolve a nested group.');
    console.log('  addto <gid> <id>                               Move a shape into a group.');
    console.log('  front <id>                                     Move a shape to the front.');
    console.log('  back <id>                                      Move a shape to the back.');
    console.log('  undo                                           Undo the last edit command.');
    console.log('  redo                                           Redo the last undone command.');
    console.log('  tree [id]                                     Show the document tree or a node subtree.');
    console.log('  show <id>                                     Show a shape or group in detail.');
    console.log('  save [file.svg]                               Save the current document.');
    console.log('  help                                          Show this help message.');
    console.log('  exit                                          Exit the editor.');
  }
}
