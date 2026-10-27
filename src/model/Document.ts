import type { Group } from './Group.js';
import { RootContainer } from './RootContainer.js';
import type { Shape } from './Shape.js';
import type { ShapeContainer } from './ShapeContainer.js';
import { ShapeFactory } from './ShapeFactory.js';
import { ShapeRegistry } from './ShapeRegistry.js';

export class Document {
  private readonly canvasWidth: number;
  private readonly canvasHeight: number;
  private readonly shapeRegistry: ShapeRegistry;
  private readonly shapeFactory = new ShapeFactory();
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

  public createGroup(id: string): Group {
    return this.shapeFactory.create('g', {
      id,
      registry: this.shapeRegistry,
    }) as Group;
  }

  public countShapes(): number {
    return this.countInContainer(this.rootContainer);
  }

  public addShape(shape: Shape): boolean {
    return this.rootContainer.add(shape);
  }

  public removeShape(shape: Shape): boolean {
    return this.rootContainer.remove(shape);
  }

  /**
   * 把已挂接的图形移动到目标容器。
   * 同一容器内 index 表示移动后的最终位置（0 到 children.length - 1）；
   * 跨容器时 index 表示插入位置（0 到目标 children.length）。
   * 非法目标或位置、自包含/祖先循环均返回 false，失败时尽量恢复原结构。
   */
  public moveShape(shape: Shape, target: ShapeContainer, index: number): boolean {
    const source = shape.parent;

    if (source === null || !Number.isInteger(index) || index < 0) {
      return false;
    }

    const originalIndex = source.indexOf(shape);
    if (originalIndex === -1) {
      return false;
    }

    if (source === target) {
      if (index >= source.children.length) {
        return false;
      }

      if (index === originalIndex) {
        return true;
      }

      if (!source.remove(shape)) {
        return false;
      }

      if (!source.insert(shape, index)) {
        source.insert(shape, originalIndex);
        return false;
      }

      return true;
    }

    if (index > target.children.length) {
      return false;
    }

    if (!source.remove(shape)) {
      return false;
    }

    if (!target.insert(shape, index)) {
      source.insert(shape, originalIndex);
      return false;
    }

    return true;
  }

  public findShape(id: string): Shape | undefined {
    return this.shapeRegistry.findById(id);
  }

  public hasShape(id: string): boolean {
    return this.shapeRegistry.has(id);
  }

  /**
   * 注销 shape 的全部后代（不含 shape 自身），保留子树关系与对象身份。
   * 返回 false 时已尝试恢复此前注销的后代。
   */
  public unregisterDescendants(shape: Shape): boolean {
    const descendants = this.collectDescendants(shape);
    const unregistered: Shape[] = [];

    for (const descendant of descendants) {
      if (!this.shapeRegistry.unregister(descendant)) {
        for (const registered of unregistered.reverse()) {
          this.shapeRegistry.register(registered);
        }

        return false;
      }

      unregistered.push(descendant);
    }

    return true;
  }

  /** 注册 shape 的全部后代（不含 shape 自身）；失败时回滚已注册部分。 */
  public registerDescendants(shape: Shape): boolean {
    const descendants = this.collectDescendants(shape);
    const registered: Shape[] = [];

    for (const descendant of descendants) {
      if (!this.shapeRegistry.register(descendant)) {
        for (const shapeToUnregister of registered.reverse()) {
          this.shapeRegistry.unregister(shapeToUnregister);
        }

        return false;
      }

      registered.push(descendant);
    }

    return true;
  }

  private collectDescendants(shape: Shape): Shape[] {
    const descendants: Shape[] = [];
    const container = shape.asContainer();

    if (container === null) {
      return descendants;
    }

    for (const child of container.children) {
      descendants.push(child);
      descendants.push(...this.collectDescendants(child));
    }

    return descendants;
  }

  private countInContainer(container: ShapeContainer): number {
    let count = 0;

    for (const child of container.children) {
      count += 1;
      const nested = child.asContainer();

      if (nested !== null) {
        count += this.countInContainer(nested);
      }
    }

    return count;
  }
}
