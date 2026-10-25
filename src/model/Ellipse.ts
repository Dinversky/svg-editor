import { Shape } from './Shape.js';

export class Ellipse extends Shape {
  private readonly centerX: number;
  private readonly centerY: number;
  private readonly horizontalRadius: number;
  private readonly verticalRadius: number;
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
