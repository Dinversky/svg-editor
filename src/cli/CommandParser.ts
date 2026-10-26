import { EditorError } from '../errors/EditorError.js';
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

/** SVG 支持的命名颜色关键字（CSS 颜色关键字全集，匹配时大小写不敏感）。 */
const NAMED_COLORS: ReadonlySet<string> = new Set([
  'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige',
  'bisque', 'black', 'blanchedalmond', 'blue', 'blueviolet', 'brown',
  'burlywood', 'cadetblue', 'chartreuse', 'chocolate', 'coral',
  'cornflowerblue', 'cornsilk', 'crimson', 'cyan', 'darkblue', 'darkcyan',
  'darkgoldenrod', 'darkgray', 'darkgreen', 'darkgrey', 'darkkhaki',
  'darkmagenta', 'darkolivegreen', 'darkorange', 'darkorchid', 'darkred',
  'darksalmon', 'darkseagreen', 'darkslateblue', 'darkslategray',
  'darkslategrey', 'darkturquoise', 'darkviolet', 'deeppink', 'deepskyblue',
  'dimgray', 'dimgrey', 'dodgerblue', 'firebrick', 'floralwhite',
  'forestgreen', 'fuchsia', 'gainsboro', 'ghostwhite', 'gold', 'goldenrod',
  'gray', 'green', 'greenyellow', 'grey', 'honeydew', 'hotpink', 'indianred',
  'indigo', 'ivory', 'khaki', 'lavender', 'lavenderblush', 'lawngreen',
  'lemonchiffon', 'lightblue', 'lightcoral', 'lightcyan',
  'lightgoldenrodyellow', 'lightgray', 'lightgreen', 'lightgrey',
  'lightpink', 'lightsalmon', 'lightseagreen', 'lightskyblue',
  'lightslategray', 'lightslategrey', 'lightsteelblue', 'lightyellow',
  'lime', 'limegreen', 'linen', 'magenta', 'maroon', 'mediumaquamarine',
  'mediumblue', 'mediumorchid', 'mediumpurple', 'mediumseagreen',
  'mediumslateblue', 'mediumspringgreen', 'mediumturquoise',
  'mediumvioletred', 'midnightblue', 'mintcream', 'mistyrose', 'moccasin',
  'navajowhite', 'navy', 'oldlace', 'olive', 'olivedrab', 'orange',
  'orangered', 'orchid', 'palegoldenrod', 'palegreen', 'paleturquoise',
  'palevioletred', 'papayawhip', 'peachpuff', 'peru', 'pink', 'plum',
  'powderblue', 'purple', 'rebeccapurple', 'red', 'rosybrown', 'royalblue',
  'saddlebrown', 'salmon', 'sandybrown', 'seagreen', 'seashell', 'sienna',
  'silver', 'skyblue', 'slateblue', 'slategray', 'slategrey', 'snow',
  'springgreen', 'steelblue', 'tan', 'teal', 'thistle', 'tomato',
  'turquoise', 'violet', 'wheat', 'white', 'whitesmoke', 'yellow',
  'yellowgreen',
]);

/** SVG 支持的 3 位与 6 位十六进制颜色（大小写不敏感）。 */
const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export class CommandParser {
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

  public parseSave(args: string[]): string {
    if (args.length > 1) {
      this.failUsage('save [file.svg]');
    }

    if (args.length === 0) {
      throw new EditorError("no file path. use 'save <file.svg>'");
    }

    return args[0];
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

  private parseNumber(token: string, fieldName: string): number {
    const value = Number(token);

    if (!Number.isFinite(value)) {
      throw new EditorError(`invalid number for ${fieldName}: ${token}`);
    }

    return value;
  }

  private validateColor(value: string, field: 'fill' | 'stroke'): string {
    const isHex = HEX_COLOR_PATTERN.test(value);
    const isNamed = NAMED_COLORS.has(value.toLowerCase());

    if (!isHex && !isNamed) {
      throw new EditorError(`invalid color for ${field}: ${value}`);
    }

    return value;
  }

  private failUsage(usage: string): never {
    throw new EditorError(`usage: ${usage}`);
  }
}
