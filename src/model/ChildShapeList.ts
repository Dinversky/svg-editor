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
    return this.insert(shape, this.childShapes.length);
  }

  public insert(shape: Shape, index: number): boolean {
    if (!Number.isInteger(index) || index < 0 || index > this.childShapes.length) {
      return false;
    }

    if (shape.parent !== null || this.createsCycle(shape)) {
      return false;
    }

    if (!this.registry.register(shape)) {
      return false;
    }

    if (!shape.attachTo(this.owner)) {
      this.registry.unregister(shape);
      return false;
    }

    this.childShapes.splice(index, 0, shape);
    return true;
  }

  public indexOf(shape: Shape): number {
    return this.childShapes.indexOf(shape);
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

  private createsCycle(shape: Shape): boolean {
    let ancestor: ShapeContainer | null = this.owner;

    while (ancestor !== null) {
      // 容器祖先可能是 Group；Shape 与 ShapeContainer 类型不重叠，按对象身份比较。
      if (ancestor === (shape as unknown)) {
        return true;
      }

      ancestor = ancestor.parent;
    }

    return false;
  }
}
