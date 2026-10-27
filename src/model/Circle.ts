import { Shape } from './Shape.js';
import type { AttributeValue } from './Shape.js';

export class Circle extends Shape {
  private centerX: number;
  private centerY: number;
  private shapeRadius: number;

  public constructor(
    id: string,
    cx: number,
    cy: number,
    r: number,
    fill?: string,
  ) {
    super(id, fill);

    if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
      throw new Error('circle center coordinates must be finite numbers');
    }

    if (!Number.isFinite(r) || r <= 0) {
      throw new Error('circle radius must be positive');
    }

    this.centerX = cx;
    this.centerY = cy;
    this.shapeRadius = r;
  }

  public get cx(): number {
    return this.centerX;
  }

  public get cy(): number {
    return this.centerY;
  }

  public get r(): number {
    return this.shapeRadius;
  }

  public override getAttribute(name: string): AttributeValue | undefined {
    switch (name) {
      case 'cx':
        return this.centerX;
      case 'cy':
        return this.centerY;
      case 'r':
        return this.shapeRadius;
      default:
        return super.getAttribute(name);
    }
  }

  public override validateAttribute(name: string, value: AttributeValue): void {
    switch (name) {
      case 'cx':
      case 'cy':
        this.requireFiniteAttribute(name, value);
        return;
      case 'r':
        this.requirePositiveAttribute(name, value, 'radius');
        return;
      default:
        super.validateAttribute(name, value);
    }
  }

  public override restoreAttribute(name: string, value: AttributeValue | undefined): void {
    switch (name) {
      case 'cx':
        this.centerX = value as number;
        return;
      case 'cy':
        this.centerY = value as number;
        return;
      case 'r':
        this.shapeRadius = value as number;
        return;
      default:
        super.restoreAttribute(name, value);
    }
  }

  public translateBy(dx: number, dy: number): void {
    this.centerX += dx;
    this.centerY += dy;
  }

  public canTranslateBy(dx: number, dy: number): boolean {
    return Number.isFinite(this.centerX + dx)
      && Number.isFinite(this.centerY + dy);
  }

  public scaleBy(factor: number): void {
    this.centerX *= factor;
    this.centerY *= factor;
    this.shapeRadius *= factor;
  }

  public canScaleBy(factor: number): boolean {
    const cx = this.centerX * factor;
    const cy = this.centerY * factor;
    const radius = this.shapeRadius * factor;

    return Number.isFinite(cx)
      && Number.isFinite(cy)
      && Number.isFinite(radius) && radius > 0;
  }

  public captureGeometry(): readonly number[] {
    return [this.centerX, this.centerY, this.shapeRadius];
  }

  public restoreGeometry(values: readonly number[]): void {
    const [cx, cy, radius] = values;

    this.centerX = cx;
    this.centerY = cy;
    this.shapeRadius = radius;
  }

  public describe(): string {
    return `circle#${this.id} cx=${this.centerX} cy=${this.centerY} r=${this.shapeRadius}${this.styleDescription()}`;
  }

  public toSvgElement(): string {
    return `<circle id="${this.escapeAttribute(this.id)}" cx="${this.centerX}" cy="${this.centerY}" r="${this.shapeRadius}"${this.styleSvgAttributes()}/>`;
  }
}
