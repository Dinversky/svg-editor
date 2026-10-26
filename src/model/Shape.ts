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
