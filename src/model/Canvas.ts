import { Shape } from './Shape.js';

export class Canvas {
  private readonly canvasWidth: number;
  private readonly canvasHeight: number;
  private readonly shapeList: Shape[] = [];

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

  public get shapes(): readonly Shape[] {
    return this.shapeList;
  }

  public hasShape(id: string): boolean {
    return this.shapeList.some((shape) => shape.id === id);
  }

  public addShape(shape: Shape): boolean {
    if (this.hasShape(shape.id)) {
      return false;
    }

    this.shapeList.push(shape);
    return true;
  }
}
