import { Shape } from './Shape.js';

export class Text extends Shape {
  private readonly positionX: number;
  private readonly positionY: number;
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

  public describe(): string {
    return `text#${this.id} (${this.positionX},${this.positionY}) "${this.textContent}"`;
  }

  public toSvgElement(): string {
    return `<text id="${this.escapeAttribute(this.id)}" x="${this.positionX}" y="${this.positionY}">${this.escapeText(this.textContent)}</text>`;
  }
}
