import { Shape } from './Shape.js';
import type { AttributeValue } from './Shape.js';

export class Ellipse extends Shape {
  private centerX: number;
  private centerY: number;
  private horizontalRadius: number;
  private verticalRadius: number;

  public constructor(
    id: string,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    fill?: string,
  ) {
    super(id, fill);

    if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
      throw new Error('ellipse center coordinates must be finite numbers');
    }

    if (!Number.isFinite(rx) || !Number.isFinite(ry) || rx <= 0 || ry <= 0) {
      throw new Error('ellipse radii must be positive');
    }

    this.centerX = cx;
    this.centerY = cy;
    this.horizontalRadius = rx;
    this.verticalRadius = ry;
  }

  public get cx(): number {
    return this.centerX;
  }

  public get cy(): number {
    return this.centerY;
  }

  public get rx(): number {
    return this.horizontalRadius;
  }

  public get ry(): number {
    return this.verticalRadius;
  }

  public override getAttribute(name: string): AttributeValue | undefined {
    switch (name) {
      case 'cx':
        return this.centerX;
      case 'cy':
        return this.centerY;
      case 'rx':
        return this.horizontalRadius;
      case 'ry':
        return this.verticalRadius;
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
      case 'rx':
        this.requirePositiveAttribute(name, value, 'rx');
        return;
      case 'ry':
        this.requirePositiveAttribute(name, value, 'ry');
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
      case 'rx':
        this.horizontalRadius = value as number;
        return;
      case 'ry':
        this.verticalRadius = value as number;
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
    this.horizontalRadius *= factor;
    this.verticalRadius *= factor;
  }

  public canScaleBy(factor: number): boolean {
    const cx = this.centerX * factor;
    const cy = this.centerY * factor;
    const rx = this.horizontalRadius * factor;
    const ry = this.verticalRadius * factor;

    return Number.isFinite(cx)
      && Number.isFinite(cy)
      && Number.isFinite(rx) && rx > 0
      && Number.isFinite(ry) && ry > 0;
  }

  public captureGeometry(): readonly number[] {
    return [
      this.centerX,
      this.centerY,
      this.horizontalRadius,
      this.verticalRadius,
    ];
  }

  public restoreGeometry(values: readonly number[]): void {
    const [cx, cy, rx, ry] = values;

    this.centerX = cx;
    this.centerY = cy;
    this.horizontalRadius = rx;
    this.verticalRadius = ry;
  }

  public describe(): string {
    return `ellipse#${this.id} cx=${this.centerX} cy=${this.centerY} rx=${this.horizontalRadius} ry=${this.verticalRadius}${this.styleDescription()}`;
  }

  public toSvgElement(): string {
    return `<ellipse id="${this.escapeAttribute(this.id)}" cx="${this.centerX}" cy="${this.centerY}" rx="${this.horizontalRadius}" ry="${this.verticalRadius}"${this.styleSvgAttributes()}/>`;
  }
}
