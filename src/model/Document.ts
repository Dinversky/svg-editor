import { RootContainer } from './RootContainer.js';
import type { Shape } from './Shape.js';
import type { ShapeContainer } from './ShapeContainer.js';
import { ShapeRegistry } from './ShapeRegistry.js';

export class Document {
  private readonly canvasWidth: number;
  private readonly canvasHeight: number;
  private readonly shapeRegistry: ShapeRegistry;
  private readonly rootContainer: RootContainer;

  constructor(width: number, height: number) {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      throw new Error('canvas width and height must be positive');
    }

    this.canvasWidth = width;
    this.canvasHeight = height;
    this.shapeRegistry = new ShapeRegistry();
    this.rootContainer = new RootContainer(this.shapeRegistry);
  }

  public get width(): number {
    return this.canvasWidth;
  }

  public get height(): number {
    return this.canvasHeight;
  }

  public get root(): ShapeContainer {
    return this.rootContainer;
  }

  public addShape(shape: Shape): boolean {
    return this.rootContainer.add(shape);
  }

  public removeShape(shape: Shape): boolean {
    return this.rootContainer.remove(shape);
  }

  public findShape(id: string): Shape | undefined {
    return this.shapeRegistry.findById(id);
  }

  public hasShape(id: string): boolean {
    return this.shapeRegistry.has(id);
  }
}
