import type { ShapeContainer } from './ShapeContainer.js';

export abstract class Shape {
  private readonly shapeId: string;
  private parentContainer: ShapeContainer | null = null;

  protected constructor(id: string) {
    if (id.length === 0) {
      throw new Error('shape id must not be empty');
    }

    this.shapeId = id;
  }

  public get id(): string {
    return this.shapeId;
  }

  public get parent(): ShapeContainer | null {
    return this.parentContainer;
  }

  public asContainer(): ShapeContainer | null {
    return null;
  }

  /** 按增量平移自身几何；容器负责递归子节点。 */
  public abstract translateBy(dx: number, dy: number): void;

  /** 判断平移后的全部几何值是否仍然有效；容器递归检查子孙。 */
  public abstract canTranslateBy(dx: number, dy: number): boolean;

  /** 按正因子缩放自身几何；容器负责递归子节点。 */
  public abstract scaleBy(factor: number): void;

  /** 判断缩放后的全部几何值是否仍然有效；容器递归检查子孙。 */
  public abstract canScaleBy(factor: number): boolean;

  /** 返回按图形类型固定顺序排列的几何值，供命令保存撤销快照。 */
  public abstract captureGeometry(): readonly number[];

  /** 用 captureGeometry() 产生的同序数组精确恢复几何。 */
  public abstract restoreGeometry(values: readonly number[]): void;

  /** @internal 仅供容器的受控添加流程调用。 */
  public attachTo(container: ShapeContainer): boolean {
    if (this.parentContainer !== null) {
      return false;
    }

    this.parentContainer = container;
    return true;
  }

  /** @internal 仅供容器的受控移除流程调用。 */
  public detachFrom(container: ShapeContainer): boolean {
    if (this.parentContainer !== container) {
      return false;
    }

    this.parentContainer = null;
    return true;
  }

  public abstract describe(): string;

  public abstract toSvgElement(): string;

  protected escapeAttribute(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }

  protected escapeText(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }
}
