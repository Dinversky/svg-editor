import { RectangleShape } from './RectangleShape.js';

export class Canvas {
  private readonly canvasWidth: number;
  private readonly canvasHeight: number;
  private readonly rectangles: RectangleShape[] = [];

  constructor(width: number, height: number) {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      throw new Error('canvas width and height must be positive');
    }

    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public get width(): number {
    return this.canvasWidth;
  }

  public get height(): number {
    return this.canvasHeight;
  }

  public get shapes(): readonly RectangleShape[] {
    return this.rectangles;
  }

  public hasShape(id: string): boolean {
    return this.rectangles.some((shape) => shape.id === id);
  }

  public addShape(shape: RectangleShape): boolean {
    if (this.hasShape(shape.id)) {
      return false;
    }

    this.rectangles.push(shape);
    return true;
  }
}
