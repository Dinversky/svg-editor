import { Shape } from './Shape.js';
import type { AttributeValue } from './Shape.js';

export class Text extends Shape {
  private positionX: number;
  private positionY: number;
  private textContent: string;

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

  public override getAttribute(name: string): AttributeValue | undefined {
    switch (name) {
      case 'x':
        return this.positionX;
      case 'y':
        return this.positionY;
      case 'text':
        return this.textContent;
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
      case 'text':
        this.requireStringAttribute(name, value);
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
      case 'text':
        this.textContent = value as string;
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
    return `text#${this.id} (${this.positionX},${this.positionY}) "${this.textContent}"${this.styleDescription()}`;
  }

  public toSvgElement(): string {
    return `<text id="${this.escapeAttribute(this.id)}" x="${this.positionX}" y="${this.positionY}"${this.styleSvgAttributes()}>${this.escapeText(this.textContent)}</text>`;
  }
}
