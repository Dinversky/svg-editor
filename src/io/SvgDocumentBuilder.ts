import { Document } from '../model/Document.js';
import type { Shape } from '../model/Shape.js';
import type { ShapeContainer } from '../model/ShapeContainer.js';
import { ShapeFactory } from '../model/ShapeFactory.js';
import type { SvgXmlElement } from './SvgXmlParser.js';

export interface SvgDocumentBuildResult {
  readonly document: Document;
  readonly warnings: readonly string[];
}

const SUPPORTED_ELEMENTS = new Set(['rect', 'circle', 'ellipse', 'line', 'text', 'g']);

/** 把有序 XML 元素树转换为现有模型；只返回新文档，失败时不修改旧文档。 */
export class SvgDocumentBuilder {
  private readonly shapeFactory = new ShapeFactory();

  public build(root: SvgXmlElement): SvgDocumentBuildResult {
    const { width, height } = this.resolveSize(root.attributes);
    const document = new Document(width, height);
    const warnings: string[] = [];
    const counters = new Map<string, number>();

    for (const child of root.children) {
      this.buildElement(document, document.root, child, warnings, counters);
    }

    return { document, warnings };
  }

  private buildElement(
    document: Document,
    target: ShapeContainer,
    element: SvgXmlElement,
    warnings: string[],
    counters: Map<string, number>,
  ): void {
    if (!SUPPORTED_ELEMENTS.has(element.name)) {
      warnings.push(`skipping unsupported element: ${element.name}`);
      return;
    }

    const id = this.resolveId(document, element, warnings, counters);
    if (document.hasShape(id)) {
      throw new Error(`id already exists: ${id}`);
    }

    if (element.attributes.transform !== undefined) {
      warnings.push(`ignoring transform on ${element.name}#${id}`);
    }

    if (element.name === 'g') {
      const group = document.createGroup(id);
      if (!this.applyStyles(group, element)) {
        warnings.push(`skipping invalid element: <${element.name} id="${id}">`);
        return;
      }
      this.attach(target, group, id);

      for (const child of element.children) {
        this.buildElement(document, group, child, warnings, counters);
      }
      return;
    }

    const shape = this.createLeaf(document, id, element);
    if (shape === null) {
      warnings.push(`skipping invalid element: <${element.name} id="${id}">`);
      return;
    }

    if (!this.applyStyles(shape, element)) {
      warnings.push(`skipping invalid element: <${element.name} id="${id}">`);
      return;
    }
    this.attach(target, shape, id);

    if (element.name === 'text') {
      for (const child of element.children) {
        warnings.push(`skipping unsupported element: ${child.name}`);
      }
    }
  }

  private createLeaf(
    document: Document,
    id: string,
    element: SvgXmlElement,
  ): Shape | null {
    const attributes = element.attributes;

    switch (element.name) {
      case 'rect': {
        const x = this.readNumber(attributes, 'x', 0);
        const y = this.readNumber(attributes, 'y', 0);
        const width = this.readNumber(attributes, 'width');
        const height = this.readNumber(attributes, 'height');
        if (x === undefined || y === undefined
          || width === undefined || height === undefined
          || width <= 0 || height <= 0) {
          return null;
        }

        return this.shapeFactory.create('rect', { id, numbers: [x, y, width, height] });
      }
      case 'circle': {
        const cx = this.readNumber(attributes, 'cx', 0);
        const cy = this.readNumber(attributes, 'cy', 0);
        const r = this.readNumber(attributes, 'r');
        if (cx === undefined || cy === undefined || r === undefined || r <= 0) {
          return null;
        }

        return this.shapeFactory.create('circle', { id, numbers: [cx, cy, r] });
      }
      case 'ellipse': {
        const cx = this.readNumber(attributes, 'cx', 0);
        const cy = this.readNumber(attributes, 'cy', 0);
        const rx = this.readNumber(attributes, 'rx');
        const ry = this.readNumber(attributes, 'ry');
        if (cx === undefined || cy === undefined
          || rx === undefined || ry === undefined
          || rx <= 0 || ry <= 0) {
          return null;
        }

        return this.shapeFactory.create('ellipse', { id, numbers: [cx, cy, rx, ry] });
      }
      case 'line': {
        const x1 = this.readNumber(attributes, 'x1', 0);
        const y1 = this.readNumber(attributes, 'y1', 0);
        const x2 = this.readNumber(attributes, 'x2', 0);
        const y2 = this.readNumber(attributes, 'y2', 0);
        if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) {
          return null;
        }

        return this.shapeFactory.create('line', { id, numbers: [x1, y1, x2, y2] });
      }
      case 'text': {
        const x = this.readNumber(attributes, 'x', 0);
        const y = this.readNumber(attributes, 'y', 0);
        if (x === undefined || y === undefined) {
          return null;
        }

        return this.shapeFactory.create('text', {
          id,
          numbers: [x, y],
          content: element.text,
        });
      }
      default:
        return null;
    }
  }

  private applyStyles(shape: Shape, element: SvgXmlElement): boolean {
    const fill = element.attributes.fill;
    const stroke = element.attributes.stroke;
    const strokeWidth = element.attributes['stroke-width'];

    if (fill !== undefined) {
      shape.restoreAttribute('fill', fill);
    }

    if (stroke !== undefined) {
      shape.restoreAttribute('stroke', stroke);
    }

    if (strokeWidth !== undefined) {
      const value = this.readNumber(element.attributes, 'stroke-width');
      if (value === undefined || value < 0) {
        return false;
      }

      shape.restoreAttribute('stroke-width', value);
    }

    return true;
  }

  private resolveId(
    document: Document,
    element: SvgXmlElement,
    warnings: string[],
    counters: Map<string, number>,
  ): string {
    const provided = element.attributes.id?.trim();
    if (provided !== undefined && provided.length > 0) {
      return provided;
    }

    let counter = counters.get(element.name) ?? 1;
    let id = `${element.name}${counter}`;
    while (document.hasShape(id)) {
      counter += 1;
      id = `${element.name}${counter}`;
    }
    counters.set(element.name, counter + 1);
    warnings.push(`assigned id ${id} to unnamed <${element.name}>`);

    return id;
  }

  private resolveSize(attributes: Readonly<Record<string, string>>): {
    width: number;
    height: number;
  } {
    const width = this.readNumber(attributes, 'width');
    const height = this.readNumber(attributes, 'height');
    if (width !== undefined && height !== undefined && width > 0 && height > 0) {
      return { width, height };
    }

    const viewBox = attributes.viewBox;
    if (viewBox !== undefined) {
      const parts = viewBox.trim().split(/[,\s]+/).filter((part) => part.length > 0);
      if (parts.length === 4) {
        const viewWidth = Number(parts[2]);
        const viewHeight = Number(parts[3]);
        if (Number.isFinite(viewWidth) && Number.isFinite(viewHeight)
          && viewWidth > 0 && viewHeight > 0) {
          return { width: viewWidth, height: viewHeight };
        }
      }
    }

    return { width: 800, height: 600 };
  }

  private readNumber(
    attributes: Readonly<Record<string, string>>,
    name: string,
    fallback?: number,
  ): number | undefined {
    const raw = attributes[name];
    if (raw === undefined || raw.trim().length === 0) {
      return fallback;
    }

    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
  }

  private attach(target: ShapeContainer, shape: Shape, id: string): void {
    if (!target.add(shape)) {
      throw new Error(`id already exists: ${id}`);
    }
  }
}
