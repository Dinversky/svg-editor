import { AddToCommand } from '../commands/AddToCommand.js';
import { BackCommand } from '../commands/BackCommand.js';
import { CommandExecutor } from '../commands/CommandExecutor.js';
import { CommandRegistry } from '../commands/CommandRegistry.js';
import type { Command } from '../commands/Command.js';
import { CreateCommand } from '../commands/CreateCommand.js';
import { DeleteCommand } from '../commands/DeleteCommand.js';
import { FrontCommand } from '../commands/FrontCommand.js';
import { GroupCommand } from '../commands/GroupCommand.js';
import { History } from '../commands/History.js';
import { MoveCommand } from '../commands/MoveCommand.js';
import { ScaleCommand } from '../commands/ScaleCommand.js';
import { SetCommand } from '../commands/SetCommand.js';
import { UngroupCommand } from '../commands/UngroupCommand.js';
import { EditorError } from '../errors/EditorError.js';
import { SvgFileWriter } from '../io/SvgFileWriter.js';
import { SvgSerializer } from '../io/SvgSerializer.js';
import { Document } from '../model/Document.js';
import type { AttributeValue, Shape } from '../model/Shape.js';
import type { ShapeContainer } from '../model/ShapeContainer.js';
import { ShapeFactory } from '../model/ShapeFactory.js';
import type { ApplicationCommandInput } from './ApplicationCommandHandler.js';
import { ApplicationCommandDispatcher } from './ApplicationCommandDispatcher.js';
import type {
  AddToRequest,
  BackRequest,
  CreateRequest,
  DeleteRequest,
  FrontRequest,
  GroupRequest,
  InitRequest,
  MoveRequest,
  RedoRequest,
  SaveRequest,
  ScaleRequest,
  SetRequest,
  ShowRequest,
  TreeRequest,
  UndoRequest,
  UngroupRequest,
} from './ApplicationRequest.js';
import { ShowFormatter } from './ShowFormatter.js';
import { TreeFormatter } from './TreeFormatter.js';

interface EditRequestBase {
  readonly document: Document;
}

interface CreateEditRequest extends EditRequestBase {
  readonly shape: Shape;
  readonly container: ShapeContainer;
}

interface MoveEditRequest extends EditRequestBase {
  readonly target: Shape;
  readonly dx: number;
  readonly dy: number;
}

interface ScaleEditRequest extends EditRequestBase {
  readonly target: Shape;
  readonly factor: number;
}

interface SetEditRequest extends EditRequestBase {
  readonly target: Shape;
  readonly attribute: string;
  readonly value: AttributeValue;
}

interface DeleteEditRequest extends EditRequestBase {
  readonly target: Shape;
}

interface GroupEditRequest extends EditRequestBase {
  readonly newGroupId: string;
  readonly shapes: readonly Shape[];
}

interface UngroupEditRequest extends EditRequestBase {
  readonly target: Shape;
}

interface AddToEditRequest extends EditRequestBase {
  readonly target: Shape;
  readonly container: ShapeContainer;
}

interface ReorderEditRequest extends EditRequestBase {
  readonly target: Shape;
}

type EditRequest =
  | CreateEditRequest
  | MoveEditRequest
  | ScaleEditRequest
  | SetEditRequest
  | DeleteEditRequest
  | GroupEditRequest
  | UngroupEditRequest
  | AddToEditRequest
  | ReorderEditRequest;

interface CommandFeedback {
  readonly undo: string;
  readonly redo: string;
}

interface Point {
  readonly x: number;
  readonly y: number;
}

export class SvgEditorApplication {
  private readonly dispatcher = new ApplicationCommandDispatcher();
  private readonly history = new History();
  private readonly executor = new CommandExecutor(this.history);
  private readonly commandRegistry = new CommandRegistry<EditRequest>();
  private readonly feedback = new Map<Command, CommandFeedback>();
  private readonly shapeFactory = new ShapeFactory();
  private readonly treeFormatter = new TreeFormatter();
  private readonly showFormatter = new ShowFormatter();
  private readonly svgSerializer = new SvgSerializer();
  private readonly svgFileWriter = new SvgFileWriter();
  private document: Document | null = null;

  public constructor() {
    this.registerEditCommands();
    this.registerHandlers();
  }

  public execute(input: ApplicationCommandInput): readonly string[] {
    return this.dispatcher.dispatch(input);
  }

  private registerHandlers(): void {
    this.dispatcher.register<InitRequest>('init', (parse) => this.init(parse));
    this.dispatcher.register<CreateRequest>('create', (parse) => this.create(parse));
    this.dispatcher.register<MoveRequest>('move', (parse) => this.move(parse));
    this.dispatcher.register<ScaleRequest>('scale', (parse) => this.scale(parse));
    this.dispatcher.register<SetRequest>('set', (parse) => this.set(parse));
    this.dispatcher.register<DeleteRequest>('delete', (parse) => this.delete(parse));
    this.dispatcher.register<GroupRequest>('group', (parse) => this.group(parse));
    this.dispatcher.register<UngroupRequest>('ungroup', (parse) => this.ungroup(parse));
    this.dispatcher.register<AddToRequest>('addto', (parse) => this.addTo(parse));
    this.dispatcher.register<FrontRequest>('front', (parse) => this.front(parse));
    this.dispatcher.register<BackRequest>('back', (parse) => this.back(parse));
    this.dispatcher.register<UndoRequest>('undo', (parse) => this.undo(parse));
    this.dispatcher.register<RedoRequest>('redo', (parse) => this.redo(parse));
    this.dispatcher.register<TreeRequest>('tree', (parse) => this.tree(parse));
    this.dispatcher.register<ShowRequest>('show', (parse) => this.show(parse));
    this.dispatcher.register<SaveRequest>('save', (parse) => this.save(parse));
  }

  private init(parse: () => InitRequest): readonly string[] {
    const request = parse();

    this.document = new Document(request.width, request.height);
    this.history.clear();
    this.history.lock();
    this.feedback.clear();
    return [`canvas ${request.width}x${request.height} created`];
  }

  private create(parse: () => CreateRequest): readonly string[] {
    const document = this.requireDocument();
    const request = parse();

    if (document.hasShape(request.id)) {
      throw new EditorError(`id already exists: ${request.id}`);
    }

    const target = this.resolveContainer(document, request.containerId);
    const shape = this.createShape(document, request);
    const location = request.containerId === undefined
      ? ''
      : ` in g#${request.containerId}`;
    const label = `${request.shapeType}#${shape.id}`;

    return this.runEdit(
      'create',
      { document, shape, container: target },
      `${label} creation undone`,
      `${label} created${location}`,
    );
  }

  private move(parse: () => MoveRequest): readonly string[] {
    const document = this.requireDocument();
    const request = parse();
    const target = this.requireShape(document, request.id);
    const label = this.shapeLabel(target);
    const position = this.positionOf(target);
    const undo = position === null
      ? `${label} moved back by (${-request.dx},${-request.dy})`
      : `${label} moved back to (${position.x},${position.y})`;
    const redo = position === null
      ? `${label} moved by (${request.dx},${request.dy})`
      : `${label} moved to (${position.x + request.dx},${position.y + request.dy})`;

    return this.runEdit(
      'move',
      { document, target, dx: request.dx, dy: request.dy },
      undo,
      redo,
    );
  }

  private scale(parse: () => ScaleRequest): readonly string[] {
    const document = this.requireDocument();
    const request = parse();
    const target = this.requireShape(document, request.id);
    const label = this.shapeLabel(target);

    return this.runEdit(
      'scale',
      { document, target, factor: request.factor },
      `${label} scaled back by ${request.factor}`,
      `${label} scaled by ${request.factor}`,
    );
  }

  private set(parse: () => SetRequest): readonly string[] {
    const document = this.requireDocument();
    const request = parse();
    const target = this.requireShape(document, request.id);
    const previous = target.getAttribute(request.attribute);
    const label = this.shapeLabel(target);
    const oldText = previous === undefined
      ? `${label} updated: ${request.attribute} removed`
      : `${label} updated: ${request.attribute}=${this.formatAttribute(request.attribute, previous)}`;

    return this.runEdit(
      'set',
      {
        document,
        target,
        attribute: request.attribute,
        value: request.value,
      },
      oldText,
      `${label} updated: ${request.attribute}=${this.formatAttribute(request.attribute, request.value)}`,
    );
  }

  private delete(parse: () => DeleteRequest): readonly string[] {
    const document = this.requireDocument();
    const request = parse();
    const target = this.requireShape(document, request.id);
    const label = this.shapeLabel(target);
    const parent = target.parent === null ? 'none' : target.parent.describe();

    return this.runEdit(
      'delete',
      { document, target },
      `${label} restored into ${parent}`,
      `${label} deleted`,
    );
  }

  private group(parse: () => GroupRequest): readonly string[] {
    const document = this.requireDocument();
    const request = parse();
    const shapes = request.ids.map((id) => this.requireShape(document, id));
    const label = `g#${request.newGroupId}`;
    const count = this.childrenLabel(shapes.length);

    return this.runEdit(
      'group',
      { document, newGroupId: request.newGroupId, shapes },
      `${label} removed with ${count} restored`,
      `${label} created with ${count}`,
    );
  }

  private ungroup(parse: () => UngroupRequest): readonly string[] {
    const document = this.requireDocument();
    const request = parse();
    const target = this.requireShape(document, request.id);
    const container = target.asContainer();
    if (container === null) {
      throw new EditorError(`not a container: ${request.id}`);
    }

    const label = this.shapeLabel(target);
    const count = this.childrenLabel(container.children.length);

    return this.runEdit(
      'ungroup',
      { document, target },
      `${label} restored with ${count}`,
      `${label} ungrouped with ${count}`,
    );
  }

  private addTo(parse: () => AddToRequest): readonly string[] {
    const document = this.requireDocument();
    const request = parse();
    const container = this.requireContainer(document, request.containerId);
    const target = this.requireShape(document, request.shapeId);
    const label = this.shapeLabel(target);
    const oldParent = target.parent === null ? 'none' : target.parent.describe();

    return this.runEdit(
      'addto',
      { document, target, container },
      `${label} moved back to ${oldParent}`,
      `${label} added to ${container.describe()}`,
    );
  }

  private front(parse: () => FrontRequest): readonly string[] {
    const document = this.requireDocument();
    const request = parse();
    const target = this.requireShape(document, request.id);
    const label = this.shapeLabel(target);

    return this.runEdit(
      'front',
      { document, target },
      `${label} order restored`,
      `${label} moved to front`,
    );
  }

  private back(parse: () => BackRequest): readonly string[] {
    const document = this.requireDocument();
    const request = parse();
    const target = this.requireShape(document, request.id);
    const label = this.shapeLabel(target);

    return this.runEdit(
      'back',
      { document, target },
      `${label} order restored`,
      `${label} moved to back`,
    );
  }

  private undo(parse: () => UndoRequest): readonly string[] {
    this.requireDocument();
    parse();
    this.assertHistoryUnlocked();
    const command = this.history.peekUndo();
    if (command === null) {
      throw new EditorError('nothing to undo');
    }

    this.history.undo();
    return [this.feedback.get(command)?.undo ?? 'undo'];
  }

  private redo(parse: () => RedoRequest): readonly string[] {
    this.requireDocument();
    parse();
    this.assertHistoryUnlocked();
    const command = this.history.peekRedo();
    if (command === null) {
      throw new EditorError('nothing to redo');
    }

    this.history.redo();
    return [this.feedback.get(command)?.redo ?? 'redo'];
  }

  private tree(parse: () => TreeRequest): readonly string[] {
    const document = this.requireDocument();
    const request = parse();

    if (request.id === undefined) {
      return [this.treeFormatter.format(document)];
    }

    const shape = this.requireShape(document, request.id);
    return [this.treeFormatter.formatSubtree(shape)];
  }

  private show(parse: () => ShowRequest): readonly string[] {
    const document = this.requireDocument();
    const request = parse();
    const shape = this.requireShape(document, request.id);

    return [this.showFormatter.format(shape)];
  }

  private save(parse: () => SaveRequest): readonly string[] {
    const document = this.requireDocument();
    const request = parse();
    const content = this.svgSerializer.serialize(document);

    try {
      this.svgFileWriter.write(request.filePath, content);
    } catch {
      throw new EditorError(`cannot write file: ${request.filePath}`);
    }

    const count = document.countShapes();
    this.history.lock();
    return [`saved to ${request.filePath} (${count} element${count === 1 ? '' : 's'})`];
  }

  private assertHistoryUnlocked(): void {
    if (this.history.isLocked) {
      throw new EditorError('undo not allowed after io command');
    }
  }

  private createShape(document: Document, request: CreateRequest): Shape {
    // g 的创建器需要文档级 registry，因此经由 Document.createGroup 委托工厂。
    if (request.shapeType === 'g') {
      return document.createGroup(request.id);
    }

    return this.shapeFactory.create(request.shapeType, request.creation);
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
  ): readonly string[] {
    const command = this.commandRegistry.create(name, request);
    this.executor.execute(command);
    this.feedback.set(command, { undo, redo });
    return [redo];
  }

  private registerEditCommands(): void {
    this.commandRegistry.register('create', (request) => {
      const edit = request as CreateEditRequest;
      return new CreateCommand(edit.shape, edit.container);
    });

    this.commandRegistry.register('move', (request) => {
      const edit = request as MoveEditRequest;
      return new MoveCommand(edit.target, edit.dx, edit.dy);
    });

    this.commandRegistry.register('scale', (request) => {
      const edit = request as ScaleEditRequest;
      return new ScaleCommand(edit.target, edit.factor);
    });

    this.commandRegistry.register('set', (request) => {
      const edit = request as SetEditRequest;
      return new SetCommand(edit.target, edit.attribute, edit.value);
    });

    this.commandRegistry.register('delete', (request) => {
      const edit = request as DeleteEditRequest;
      return new DeleteCommand(edit.document, edit.target);
    });

    this.commandRegistry.register('group', (request) => {
      const edit = request as GroupEditRequest;
      return new GroupCommand(edit.document, edit.newGroupId, edit.shapes);
    });

    this.commandRegistry.register('ungroup', (request) => {
      const edit = request as UngroupEditRequest;
      return new UngroupCommand(edit.document, edit.target);
    });

    this.commandRegistry.register('addto', (request) => {
      const edit = request as AddToEditRequest;
      return new AddToCommand(edit.document, edit.target, edit.container);
    });

    this.commandRegistry.register('front', (request) => {
      const edit = request as ReorderEditRequest;
      return new FrontCommand(edit.document, edit.target);
    });

    this.commandRegistry.register('back', (request) => {
      const edit = request as ReorderEditRequest;
      return new BackCommand(edit.document, edit.target);
    });
  }

  private shapeLabel(shape: Shape): string {
    const description = shape.describe();
    const separator = description.indexOf(' ');

    return separator === -1 ? description : description.slice(0, separator);
  }

  private positionOf(shape: Shape): Point | null {
    if (shape.asContainer() !== null) {
      return null;
    }

    const coordinatePairs: readonly (readonly [string, string])[] = [
      ['x', 'y'],
      ['cx', 'cy'],
      ['x1', 'y1'],
    ];

    for (const [xName, yName] of coordinatePairs) {
      const x = this.readCoordinate(shape, xName);
      const y = this.readCoordinate(shape, yName);
      if (x !== undefined && y !== undefined) {
        return { x, y };
      }
    }

    return null;
  }

  /**
   * 通过已有属性接口读取坐标；Shape.getAttribute 对不适用的属性抛错，
   * 因此把该情况视为“没有这个坐标”，不再从 describe() 的展示文本中提取。
   */
  private readCoordinate(shape: Shape, name: string): number | undefined {
    try {
      const value = shape.getAttribute(name);
      return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
    } catch {
      return undefined;
    }
  }

  private formatAttribute(attribute: string, value: AttributeValue): string {
    return attribute === 'text' ? `"${String(value)}"` : String(value);
  }

  private childrenLabel(count: number): string {
    return `${count} child${count === 1 ? '' : 'ren'}`;
  }
}
