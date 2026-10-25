import type { Shape } from './Shape.js';

export class ShapeRegistry {
  private readonly shapesById = new Map<string, Shape>();

  public findById(id: string): Shape | undefined {
    return this.shapesById.get(id);
  }

  public has(id: string): boolean {
    return this.shapesById.has(id);
  }

  public register(shape: Shape): boolean {
    if (this.shapesById.has(shape.id)) {
      return false;
    }

    this.shapesById.set(shape.id, shape);
    return true;
  }

  public unregister(shape: Shape): boolean {
    if (this.shapesById.get(shape.id) !== shape) {
      return false;
    }

    this.shapesById.delete(shape.id);
    return true;
  }
}
