import { SvgColor } from './SvgColor.js';
import type { ShapeContainer } from './ShapeContainer.js';

export type AttributeValue = string | number;

export abstract class Shape {
  private readonly shapeId: string;
  private parentContainer: ShapeContainer | null = null;
  private fillValue: string | undefined;
  private strokeValue: string | undefined;
  private strokeWidthValue: number | undefined;

  protected constructor(id: string, fill?: string, stroke?: string) {
    if (id.length === 0) {
      throw new Error('shape id must not be empty');
    }

    this.shapeId = id;
    this.fillValue = fill;
    this.strokeValue = stroke;
  }

  public get id(): string {
    return this.shapeId;
  }

  public get parent(): ShapeContainer | null {
    return this.parentContainer;
  }

  public get fill(): string | undefined {
    return this.fillValue;
  }

  public get stroke(): string | undefined {
    return this.strokeValue;
  }

  public get strokeWidth(): number | undefined {
    return this.strokeWidthValue;
  }

  public asContainer(): ShapeContainer | null {
    return null;
  }

  public getAttribute(name: string): AttributeValue | undefined {
    switch (name) {
      case 'fill':
        return this.fillValue;
      case 'stroke':
        return this.strokeValue;
      case 'stroke-width':
        return this.strokeWidthValue;
      default:
        throw new Error(`unknown attribute: ${name}`);
    }
  }

  public validateAttribute(name: string, value: AttributeValue): void {
    switch (name) {
      case 'fill':
      case 'stroke':
        if (typeof value !== 'string' || !SvgColor.isValid(value)) {
          throw new Error(`invalid color for ${name}: ${String(value)}`);
        }
        return;
      case 'stroke-width':
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          throw new Error(`invalid number for stroke-width: ${String(value)}`);
        }

        if (value < 0) {
          throw new Error('stroke-width must be non-negative');
        }
        return;
      default:
        throw new Error(`unknown attribute: ${name}`);
    }
  }

  public setAttribute(name: string, value: AttributeValue): void {
    this.validateAttribute(name, value);
    this.restoreAttribute(name, value);
  }

  public restoreAttribute(name: string, value: AttributeValue | undefined): void {
    switch (name) {
      case 'fill':
        this.fillValue = value as string | undefined;
        return;
      case 'stroke':
        this.strokeValue = value as string | undefined;
        return;
      case 'stroke-width':
        this.strokeWidthValue = value as number | undefined;
        return;
      default:
        throw new Error(`unknown attribute: ${name}`);
    }
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

  protected requireFiniteAttribute(
    name: string,
    value: AttributeValue | undefined,
  ): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`invalid number for ${name}: ${String(value)}`);
    }

    return value;
  }

  protected requirePositiveAttribute(
    name: string,
    value: AttributeValue | undefined,
    label: string,
  ): number {
    const number = this.requireFiniteAttribute(name, value);

    if (number <= 0) {
      throw new Error(`${label} must be positive`);
    }

    return number;
  }

  protected requireStringAttribute(
    name: string,
    value: AttributeValue | undefined,
  ): string {
    if (typeof value !== 'string') {
      throw new Error(`invalid value for ${name}: ${String(value)}`);
    }

    return value;
  }

  protected styleSvgAttributes(): string {
    const fill = this.fillValue === undefined
      ? ''
      : ` fill="${this.escapeAttribute(this.fillValue)}"`;
    const stroke = this.strokeValue === undefined
      ? ''
      : ` stroke="${this.escapeAttribute(this.strokeValue)}"`;
    const strokeWidth = this.strokeWidthValue === undefined
      ? ''
      : ` stroke-width="${this.strokeWidthValue}"`;

    return `${fill}${stroke}${strokeWidth}`;
  }

  protected styleDescription(): string {
    const fill = this.fillValue === undefined ? '' : ` fill=${this.fillValue}`;
    const stroke = this.strokeValue === undefined ? '' : ` stroke=${this.strokeValue}`;
    const strokeWidth = this.strokeWidthValue === undefined
      ? ''
      : ` stroke-width=${this.strokeWidthValue}`;

    return `${fill}${stroke}${strokeWidth}`;
  }

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
