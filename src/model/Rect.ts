import { Shape } from './Shape.js';

export class Rect extends Shape {
  private readonly positionX: number;
  private readonly positionY: number;
  private readonly shapeWidth: number;
  private readonly shapeHeight: number;
  private readonly shapeFill: string | undefined;

  constructor(
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fill?: string,
  ) {
    super(id);

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error('rectangle coordinates must be finite numbers');
    }

    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      throw new Error('rectangle width and height must be positive');
    }

    this.positionX = x;
    this.positionY = y;
    this.shapeWidth = width;
    this.shapeHeight = height;
    this.shapeFill = fill;
  }

  public get x(): number {
    return this.positionX;
  }

  public get y(): number {
    return this.positionY;
  }

  public get width(): number {
    return this.shapeWidth;
  }

  public get height(): number {
    return this.shapeHeight;
  }

  public get fill(): string | undefined {
    return this.shapeFill;
  }

  public describe(): string {
    const fill = this.shapeFill === undefined ? '' : ` fill=${this.shapeFill}`;
    return `rect#${this.id} x=${this.positionX} y=${this.positionY} w=${this.shapeWidth} h=${this.shapeHeight}${fill}`;
  }

  public toSvgElement(): string {
    const fill = this.shapeFill === undefined
      ? ''
      : ` fill="${this.escapeAttribute(this.shapeFill)}"`;

    return `<rect id="${this.escapeAttribute(this.id)}" x="${this.positionX}" y="${this.positionY}" width="${this.shapeWidth}" height="${this.shapeHeight}"${fill}/>`;
  }
}
