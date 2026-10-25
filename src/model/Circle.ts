import { Shape } from './Shape.js';

export class Circle extends Shape {
  private readonly centerX: number;
  private readonly centerY: number;
  private readonly shapeRadius: number;
  private readonly shapeFill: string | undefined;

  public constructor(
    id: string,
    cx: number,
    cy: number,
    r: number,
    fill?: string,
  ) {
    super(id);

    if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
      throw new Error('circle center coordinates must be finite numbers');
    }

    if (!Number.isFinite(r) || r <= 0) {
      throw new Error('circle radius must be positive');
    }

    this.centerX = cx;
    this.centerY = cy;
    this.shapeRadius = r;
    this.shapeFill = fill;
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

  public get fill(): string | undefined {
    return this.shapeFill;
  }

  public describe(): string {
    const fill = this.shapeFill === undefined ? '' : ` fill=${this.shapeFill}`;
    return `circle#${this.id} cx=${this.centerX} cy=${this.centerY} r=${this.shapeRadius}${fill}`;
  }

  public toSvgElement(): string {
    const fill = this.shapeFill === undefined
      ? ''
      : ` fill="${this.escapeAttribute(this.shapeFill)}"`;

    return `<circle id="${this.escapeAttribute(this.id)}" cx="${this.centerX}" cy="${this.centerY}" r="${this.shapeRadius}"${fill}/>`;
  }
}
