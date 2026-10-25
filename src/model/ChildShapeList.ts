import type { Shape } from './Shape.js';
import type { ShapeContainer } from './ShapeContainer.js';
import { ShapeRegistry } from './ShapeRegistry.js';

export class ChildShapeList {
  private readonly childShapes: Shape[] = [];

  constructor(
    private readonly owner: ShapeContainer,
    private readonly registry: ShapeRegistry,
  ) { }

  public get children(): readonly Shape[] {
    return [...this.childShapes];
  }

  public add(shape: Shape): boolean {
    if (shape.parent !== null) {
      return false;
    }

    if (!this.registry.register(shape)) {
      return false;
    }

    if (!shape.attachTo(this.owner)) {
      this.registry.unregister(shape);
      return false;
    }

    this.childShapes.push(shape);
    return true;
  }

  public remove(shape: Shape): boolean {
    const index = this.childShapes.indexOf(shape);
    if (index === -1 || shape.parent !== this.owner) {
      return false;
    }

    if (!this.registry.unregister(shape)) {
      return false;
    }

    this.childShapes.splice(index, 1);
    shape.detachFrom(this.owner);
    return true;
  }

  public has(shape: Shape): boolean {
    return this.childShapes.includes(shape);
  }
}
