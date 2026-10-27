import { Shape } from './Shape.js';

export class Ellipse extends Shape {
  private centerX: number;
  private centerY: number;
  private horizontalRadius: number;
  private verticalRadius: number;
  private readonly shapeFill: string | undefined;

  public constructor(
    id: string,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    fill?: string,
  ) {
    super(id);

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
    this.shapeFill = fill;
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

  public get fill(): string | undefined {
    return this.shapeFill;
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
    const fill = this.shapeFill === undefined ? '' : ` fill=${this.shapeFill}`;
    return `ellipse#${this.id} cx=${this.centerX} cy=${this.centerY} rx=${this.horizontalRadius} ry=${this.verticalRadius}${fill}`;
  }

  public toSvgElement(): string {
    const fill = this.shapeFill === undefined
      ? ''
      : ` fill="${this.escapeAttribute(this.shapeFill)}"`;

    return `<ellipse id="${this.escapeAttribute(this.id)}" cx="${this.centerX}" cy="${this.centerY}" rx="${this.horizontalRadius}" ry="${this.verticalRadius}"${fill}/>`;
  }
}
