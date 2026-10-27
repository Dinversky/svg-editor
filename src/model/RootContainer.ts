import { ChildShapeList } from './ChildShapeList.js';
import type { Shape } from './Shape.js';
import type { ShapeContainer } from './ShapeContainer.js';
import { ShapeRegistry } from './ShapeRegistry.js';

export class RootContainer implements ShapeContainer {
  private readonly childList: ChildShapeList;

  constructor(registry: ShapeRegistry) {
    this.childList = new ChildShapeList(this, registry);
  }

  public get children(): readonly Shape[] {
    return this.childList.children;
  }

  public get parent(): ShapeContainer | null {
    return null;
  }

  public describe(): string {
    return 'svg';
  }

  public add(shape: Shape): boolean {
    return this.childList.add(shape);
  }

  public insert(shape: Shape, index: number): boolean {
    return this.childList.insert(shape, index);
  }

  public remove(shape: Shape): boolean {
    return this.childList.remove(shape);
  }

  public hasChild(shape: Shape): boolean {
    return this.childList.has(shape);
  }

  public indexOf(shape: Shape): number {
    return this.childList.indexOf(shape);
  }
}
