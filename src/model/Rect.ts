import { Shape } from './Shape.js';

export class Rect extends Shape {
  private positionX: number;
  private positionY: number;
  private shapeWidth: number;
  private shapeHeight: number;
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

  public translateBy(dx: number, dy: number): void {
    this.positionX += dx;
    this.positionY += dy;
  }

  public canTranslateBy(dx: number, dy: number): boolean {
    return Number.isFinite(this.positionX + dx)
      && Number.isFinite(this.positionY + dy);
  }

  public scaleBy(factor: number): void {
    this.positionX *= factor;
    this.positionY *= factor;
    this.shapeWidth *= factor;
    this.shapeHeight *= factor;
  }

  public canScaleBy(factor: number): boolean {
    const x = this.positionX * factor;
    const y = this.positionY * factor;
    const width = this.shapeWidth * factor;
    const height = this.shapeHeight * factor;

    return Number.isFinite(x)
      && Number.isFinite(y)
      && Number.isFinite(width) && width > 0
      && Number.isFinite(height) && height > 0;
  }

  public captureGeometry(): readonly number[] {
    return [this.positionX, this.positionY, this.shapeWidth, this.shapeHeight];
  }

  public restoreGeometry(values: readonly number[]): void {
    const [x, y, width, height] = values;

    this.positionX = x;
    this.positionY = y;
    this.shapeWidth = width;
    this.shapeHeight = height;
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
