import { EditorError } from '../errors/EditorError.js';
import type { ApplicationRequest } from '../app/ApplicationRequest.js';
import type { AttributeValue } from '../model/Shape.js';
import { SvgColor } from '../model/SvgColor.js';
import type { ShapeCreation } from '../model/ShapeFactory.js';

/** `create` 命令的结构化解析结果，供 CLI 协调文档操作时使用。 */
export interface ParsedCreate {
  readonly shapeType: string;
  readonly id: string;
  readonly creation: ShapeCreation;
  readonly containerId?: string;
}

/** 各图形类型的 create 参数语法描述。 */
interface CreateParameterSpec {
  readonly usage: string;
  readonly numberNames?: readonly string[];
  readonly positiveNumbers?: readonly {
    readonly name: string;
    readonly label: string;
  }[];
  readonly contentIndex?: number;
  readonly colorField?: 'fill' | 'stroke';
}

export class CommandParser {
  private readonly numericAttributes = new Set([
    'x',
    'y',
    'width',
    'height',
    'cx',
    'cy',
    'r',
    'rx',
    'ry',
    'x1',
    'y1',
    'x2',
    'y2',
    'stroke-width',
  ]);

  private readonly createSpecs: Readonly<Record<string, CreateParameterSpec>> = {
    rect: {
      usage: 'create rect <id> <x> <y> <w> <h> [fill] [in <group>]',
      numberNames: ['x', 'y', 'width', 'height'],
      positiveNumbers: [
        { name: 'width', label: 'width' },
        { name: 'height', label: 'height' },
      ],
      colorField: 'fill',
    },
    circle: {
      usage: 'create circle <id> <cx> <cy> <r> [fill] [in <group>]',
      numberNames: ['cx', 'cy', 'r'],
      positiveNumbers: [{ name: 'r', label: 'radius' }],
      colorField: 'fill',
    },
    ellipse: {
      usage: 'create ellipse <id> <cx> <cy> <rx> <ry> [fill] [in <group>]',
      numberNames: ['cx', 'cy', 'rx', 'ry'],
      positiveNumbers: [
        { name: 'rx', label: 'rx' },
        { name: 'ry', label: 'ry' },
      ],
      colorField: 'fill',
    },
    line: {
      usage: 'create line <id> <x1> <y1> <x2> <y2> [stroke] [in <group>]',
      numberNames: ['x1', 'y1', 'x2', 'y2'],
      colorField: 'stroke',
    },
    text: {
      usage: 'create text <id> <x> <y> "content" [in <group>]',
      numberNames: ['x', 'y'],
      contentIndex: 4,
    },
    g: {
      usage: 'create g <id> [in <group>]',
    },
  };

  public parseInit(args: string[]): { width: number; height: number } {
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

    return { width, height };
  }

  public parseRead(args: string[]): string {
    if (args.length !== 1) {
      this.failUsage('read <file.svg>');
    }

    return args[0];
  }

  public parseCanvas(args: string[]): { width?: number; height?: number } {
    if (args.length > 2) {
      this.failUsage('canvas [w] [h]');
    }

    const width = args.length >= 1 ? this.parseNumber(args[0], 'width') : undefined;
    const height = args.length >= 2 ? this.parseNumber(args[1], 'height') : undefined;

    if (width !== undefined && width <= 0) {
      throw new EditorError('width must be positive');
    }

    if (height !== undefined && height <= 0) {
      throw new EditorError('height must be positive');
    }

    return { width, height };
  }

  public parseCreate(args: string[]): ParsedCreate {
    if (args.length === 0) {
      this.failUsage('create <type> <id> [params] [in <group>]');
    }

    const shapeType = args[0];
    const spec = this.createSpecs[shapeType];
    if (spec === undefined) {
      throw new EditorError(
        `unknown shape type: ${shapeType} (is the plugin loaded?)`,
      );
    }

    const { shapeArgs, containerId } = this.splitContainerClause(args);

    const numberNames = spec.numberNames ?? [];
    const requiredCount = 2
      + numberNames.length
      + (spec.contentIndex === undefined ? 0 : 1);
    const maxCount = requiredCount + (spec.colorField === undefined ? 0 : 1);

    if (shapeArgs.length < requiredCount || shapeArgs.length > maxCount) {
      this.failUsage(spec.usage);
    }

    const numbers = numberNames.map((name, index) =>
      this.parseNumber(shapeArgs[2 + index], name),
    );

    for (const rule of spec.positiveNumbers ?? []) {
      if (numbers[numberNames.indexOf(rule.name)] <= 0) {
        throw new EditorError(`${rule.label} must be positive`);
      }
    }

    let fill: string | undefined;
    let stroke: string | undefined;
    if (spec.colorField !== undefined && shapeArgs.length > requiredCount) {
      const color = this.validateColor(shapeArgs[requiredCount], spec.colorField);
      if (spec.colorField === 'fill') {
        fill = color;
      } else {
        stroke = color;
      }
    }

    const creation: ShapeCreation = {
      id: shapeArgs[1],
      numbers: numbers.length > 0 ? numbers : undefined,
      content: spec.contentIndex === undefined ? undefined : shapeArgs[spec.contentIndex],
      fill,
      stroke,
    };

    return { shapeType, id: shapeArgs[1], creation, containerId };
  }

  public parseTree(args: string[]): string | undefined {
    if (args.length > 1) {
      this.failUsage('tree [id]');
    }

    return args[0];
  }

  public parseShow(args: string[]): string {
    if (args.length !== 1) {
      this.failUsage('show <id>');
    }

    return args[0];
  }

  public parseSave(args: string[]): string | undefined {
    if (args.length > 1) {
      this.failUsage('save [file.svg]');
    }

    return args[0];
  }

  public parseMove(args: string[]): { id: string; dx: number; dy: number } {
    if (args.length !== 3) {
      this.failUsage('move <id> <dx> <dy>');
    }

    return {
      id: args[0],
      dx: this.parseNumber(args[1], 'dx'),
      dy: this.parseNumber(args[2], 'dy'),
    };
  }

  public parseScale(args: string[]): { id: string; factor: number } {
    if (args.length !== 2) {
      this.failUsage('scale <id> <factor>');
    }

    return {
      id: args[0],
      factor: this.parseNumber(args[1], 'factor'),
    };
  }

  public parseSet(args: string[]): {
    id: string;
    attribute: string;
    value: AttributeValue;
  } {
    if (args.length !== 3) {
      this.failUsage('set <id> <attr> <value>');
    }

    const attribute = args[1];
    const value = this.numericAttributes.has(attribute)
      ? this.parseNumber(args[2], attribute)
      : args[2];

    return { id: args[0], attribute, value };
  }

  public parseDelete(args: string[]): string {
    return this.parseRequiredId(args, 'delete <id>');
  }

  public parseGroup(args: string[]): {
    newGroupId: string;
    ids: readonly string[];
  } {
    if (args.length < 2) {
      this.failUsage('group <newGid> <id1> <id2>...');
    }

    return { newGroupId: args[0], ids: args.slice(1) };
  }

  public parseUngroup(args: string[]): string {
    return this.parseRequiredId(args, 'ungroup <gid>');
  }

  public parseAddTo(args: string[]): {
    containerId: string;
    shapeId: string;
  } {
    if (args.length !== 2) {
      this.failUsage('addto <gid> <id>');
    }

    return { containerId: args[0], shapeId: args[1] };
  }

  public parseFront(args: string[]): string {
    return this.parseRequiredId(args, 'front <id>');
  }

  public parseBack(args: string[]): string {
    return this.parseRequiredId(args, 'back <id>');
  }

  public parseNoArgs(args: string[], usage: string): void {
    if (args.length !== 0) {
      this.failUsage(usage);
    }
  }

  /** 把命令行参数转换为应用层请求；不访问文档，也不执行命令。 */
  public parseCommand(name: string, args: string[]): ApplicationRequest {
    switch (name) {
      case 'init':
        return { command: 'init', ...this.parseInit(args) };
      case 'read':
        return { command: 'read', filePath: this.parseRead(args) };
      case 'canvas':
        return { command: 'canvas', ...this.parseCanvas(args) };
      case 'create':
        return { command: 'create', ...this.parseCreate(args) };
      case 'move':
        return { command: 'move', ...this.parseMove(args) };
      case 'scale':
        return { command: 'scale', ...this.parseScale(args) };
      case 'set':
        return { command: 'set', ...this.parseSet(args) };
      case 'delete':
        return { command: 'delete', id: this.parseDelete(args) };
      case 'group':
        return { command: 'group', ...this.parseGroup(args) };
      case 'ungroup':
        return { command: 'ungroup', id: this.parseUngroup(args) };
      case 'addto':
        return { command: 'addto', ...this.parseAddTo(args) };
      case 'front':
        return { command: 'front', id: this.parseFront(args) };
      case 'back':
        return { command: 'back', id: this.parseBack(args) };
      case 'undo':
        this.parseNoArgs(args, 'undo');
        return { command: 'undo' };
      case 'redo':
        this.parseNoArgs(args, 'redo');
        return { command: 'redo' };
      case 'tree':
        return { command: 'tree', id: this.parseTree(args) };
      case 'show':
        return { command: 'show', id: this.parseShow(args) };
      case 'save':
        return { command: 'save', filePath: this.parseSave(args) };
      default:
        throw new EditorError(`unknown command: ${name}`);
    }
  }

  /** 末尾的 `in <containerId>` 子句属于命令结构，样式值中的单个 `in` 不受影响。 */
  private splitContainerClause(args: string[]): {
    shapeArgs: string[];
    containerId?: string;
  } {
    if (args.length >= 3 && args[args.length - 2] === 'in') {
      return {
        shapeArgs: args.slice(0, -2),
        containerId: args[args.length - 1],
      };
    }

    return { shapeArgs: args };
  }

  private parseRequiredId(args: string[], usage: string): string {
    if (args.length !== 1) {
      this.failUsage(usage);
    }

    return args[0];
  }

  private parseNumber(token: string, fieldName: string): number {
    const value = Number(token);

    if (!Number.isFinite(value)) {
      throw new EditorError(`invalid number for ${fieldName}: ${token}`);
    }

    return value;
  }

  private validateColor(value: string, field: 'fill' | 'stroke'): string {
    if (!SvgColor.isValid(value)) {
      throw new EditorError(`invalid color for ${field}: ${value}`);
    }

    return value;
  }

  private failUsage(usage: string): never {
    throw new EditorError(`usage: ${usage}`);
  }
}
