import { Shape } from './Shape.js';

export class Line extends Shape {
  private readonly startX: number;
  private readonly startY: number;
  private readonly endX: number;
  private readonly endY: number;
  private readonly shapeStroke: string | undefined;

  public constructor(
    id: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    stroke?: string,
  ) {
    super(id);

    if (
      !Number.isFinite(x1)
      || !Number.isFinite(y1)
      || !Number.isFinite(x2)
      || !Number.isFinite(y2)
    ) {
      throw new Error('line endpoints must be finite numbers');
    }

    this.startX = x1;
    this.startY = y1;
    this.endX = x2;
    this.endY = y2;
    this.shapeStroke = stroke;
  }

  public get x1(): number {
    return this.startX;
  }

  public get y1(): number {
    return this.startY;
  }

  public get x2(): number {
    return this.endX;
  }

  public get y2(): number {
    return this.endY;
  }

  public get stroke(): string | undefined {
    return this.shapeStroke;
  }

  public describe(): string {
    return `line#${this.id} (${this.startX},${this.startY}) -> (${this.endX},${this.endY})`;
  }

  public toSvgElement(): string {
    const stroke = this.shapeStroke === undefined
      ? ''
      : ` stroke="${this.escapeAttribute(this.shapeStroke)}"`;

    return `<line id="${this.escapeAttribute(this.id)}" x1="${this.startX}" y1="${this.startY}" x2="${this.endX}" y2="${this.endY}"${stroke}/>`;
  }
}
