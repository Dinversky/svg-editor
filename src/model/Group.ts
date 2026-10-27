import { ChildShapeList } from './ChildShapeList.js';
import { Shape } from './Shape.js';
import type { ShapeContainer } from './ShapeContainer.js';
import type { ShapeRegistry } from './ShapeRegistry.js';

export class Group extends Shape implements ShapeContainer {
  private readonly childList: ChildShapeList;

  public constructor(id: string, registry: ShapeRegistry) {
    super(id);
    this.childList = new ChildShapeList(this, registry);
  }

  public get children(): readonly Shape[] {
    return this.childList.children;
  }

  public override asContainer(): ShapeContainer {
    return this;
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

  public translateBy(dx: number, dy: number): void {
    for (const child of this.childList.children) {
      child.translateBy(dx, dy);
    }
  }

  public canTranslateBy(dx: number, dy: number): boolean {
    return this.childList.children.every((child) => child.canTranslateBy(dx, dy));
  }

  public scaleBy(factor: number): void {
    for (const child of this.childList.children) {
      child.scaleBy(factor);
    }
  }

  public canScaleBy(factor: number): boolean {
    return this.childList.children.every((child) => child.canScaleBy(factor));
  }

  public captureGeometry(): readonly number[] {
    return [];
  }

  public restoreGeometry(_values: readonly number[]): void { }

  public describe(): string {
    return `g#${this.id}`;
  }

  public toSvgElement(): string {
    const id = this.escapeAttribute(this.id);
    const style = this.styleSvgAttributes();

    if (this.childList.children.length === 0) {
      return `<g id="${id}"${style}/>`;
    }

    const children = this.childList.children
      .map((child) => this.indentLines(child.toSvgElement(), 2))
      .join('\n');

    return `<g id="${id}"${style}>\n${children}\n</g>`;
  }

  private indentLines(value: string, spaces: number): string {
    const prefix = ' '.repeat(spaces);
    return value
      .split('\n')
      .map((line) => `${prefix}${line}`)
      .join('\n');
  }
}
