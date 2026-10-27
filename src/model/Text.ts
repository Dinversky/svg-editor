import { Shape } from './Shape.js';

export class Text extends Shape {
  private positionX: number;
  private positionY: number;
  private readonly textContent: string;

  public constructor(id: string, x: number, y: number, content: string) {
    super(id);

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error('text coordinates must be finite numbers');
    }

    this.positionX = x;
    this.positionY = y;
    this.textContent = content;
  }

  public get x(): number {
    return this.positionX;
  }

  public get y(): number {
    return this.positionY;
  }

  public get content(): string {
    return this.textContent;
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
  }

  public canScaleBy(factor: number): boolean {
    return Number.isFinite(this.positionX * factor)
      && Number.isFinite(this.positionY * factor);
  }

  public captureGeometry(): readonly number[] {
    return [this.positionX, this.positionY];
  }

  public restoreGeometry(values: readonly number[]): void {
    const [x, y] = values;

    this.positionX = x;
    this.positionY = y;
  }

  public describe(): string {
    return `text#${this.id} (${this.positionX},${this.positionY}) "${this.textContent}"`;
  }

  public toSvgElement(): string {
    return `<text id="${this.escapeAttribute(this.id)}" x="${this.positionX}" y="${this.positionY}">${this.escapeText(this.textContent)}</text>`;
  }
}
