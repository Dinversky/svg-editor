import { Shape } from './Shape.js';
import type { AttributeValue } from './Shape.js';

export class Rect extends Shape {
  private positionX: number;
  private positionY: number;
  private shapeWidth: number;
  private shapeHeight: number;

  constructor(
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fill?: string,
  ) {
    super(id, fill);

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

  public override getAttribute(name: string): AttributeValue | undefined {
    switch (name) {
      case 'x':
        return this.positionX;
      case 'y':
        return this.positionY;
      case 'width':
        return this.shapeWidth;
      case 'height':
        return this.shapeHeight;
      default:
        return super.getAttribute(name);
    }
  }

  public override validateAttribute(name: string, value: AttributeValue): void {
    switch (name) {
      case 'x':
      case 'y':
        this.requireFiniteAttribute(name, value);
        return;
      case 'width':
        this.requirePositiveAttribute(name, value, 'width');
        return;
      case 'height':
        this.requirePositiveAttribute(name, value, 'height');
        return;
      default:
        super.validateAttribute(name, value);
    }
  }

  public override restoreAttribute(name: string, value: AttributeValue | undefined): void {
    switch (name) {
      case 'x':
        this.positionX = value as number;
        return;
      case 'y':
        this.positionY = value as number;
        return;
      case 'width':
        this.shapeWidth = value as number;
        return;
      case 'height':
        this.shapeHeight = value as number;
        return;
      default:
        super.restoreAttribute(name, value);
    }
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
    return `rect#${this.id} x=${this.positionX} y=${this.positionY} w=${this.shapeWidth} h=${this.shapeHeight}${this.styleDescription()}`;
  }

  public toSvgElement(): string {
    return `<rect id="${this.escapeAttribute(this.id)}" x="${this.positionX}" y="${this.positionY}" width="${this.shapeWidth}" height="${this.shapeHeight}"${this.styleSvgAttributes()}/>`;
  }
}
