import { Shape } from './Shape.js';
import type { AttributeValue } from './Shape.js';

export class Line extends Shape {
  private startX: number;
  private startY: number;
  private endX: number;
  private endY: number;

  public constructor(
    id: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    stroke?: string,
  ) {
    super(id, undefined, stroke);

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

  public override getAttribute(name: string): AttributeValue | undefined {
    switch (name) {
      case 'x1':
        return this.startX;
      case 'y1':
        return this.startY;
      case 'x2':
        return this.endX;
      case 'y2':
        return this.endY;
      default:
        return super.getAttribute(name);
    }
  }

  public override validateAttribute(name: string, value: AttributeValue): void {
    switch (name) {
      case 'x1':
      case 'y1':
      case 'x2':
      case 'y2':
        this.requireFiniteAttribute(name, value);
        return;
      default:
        super.validateAttribute(name, value);
    }
  }

  public override restoreAttribute(name: string, value: AttributeValue | undefined): void {
    switch (name) {
      case 'x1':
        this.startX = value as number;
        return;
      case 'y1':
        this.startY = value as number;
        return;
      case 'x2':
        this.endX = value as number;
        return;
      case 'y2':
        this.endY = value as number;
        return;
      default:
        super.restoreAttribute(name, value);
    }
  }

  public translateBy(dx: number, dy: number): void {
    this.startX += dx;
    this.startY += dy;
    this.endX += dx;
    this.endY += dy;
  }

  public canTranslateBy(dx: number, dy: number): boolean {
    return Number.isFinite(this.startX + dx)
      && Number.isFinite(this.startY + dy)
      && Number.isFinite(this.endX + dx)
      && Number.isFinite(this.endY + dy);
  }

  public scaleBy(factor: number): void {
    this.startX *= factor;
    this.startY *= factor;
    this.endX *= factor;
    this.endY *= factor;
  }

  public canScaleBy(factor: number): boolean {
    return Number.isFinite(this.startX * factor)
      && Number.isFinite(this.startY * factor)
      && Number.isFinite(this.endX * factor)
      && Number.isFinite(this.endY * factor);
  }

  public captureGeometry(): readonly number[] {
    return [this.startX, this.startY, this.endX, this.endY];
  }

  public restoreGeometry(values: readonly number[]): void {
    const [x1, y1, x2, y2] = values;

    this.startX = x1;
    this.startY = y1;
    this.endX = x2;
    this.endY = y2;
  }

  public describe(): string {
    return `line#${this.id} (${this.startX},${this.startY}) -> (${this.endX},${this.endY})`;
  }

  public toSvgElement(): string {
    return `<line id="${this.escapeAttribute(this.id)}" x1="${this.startX}" y1="${this.startY}" x2="${this.endX}" y2="${this.endY}"${this.styleSvgAttributes()}/>`;
  }
}
