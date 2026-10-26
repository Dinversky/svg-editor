import { Document } from '../model/Document.js';
import type { Shape } from '../model/Shape.js';

export class TreeFormatter {
  public format(document: Document): string {
    const children = document.root.children;
    const lines: string[] = [`svg (${document.width}x${document.height})`];

    if (children.length === 0) {
      lines.push('(empty)');
      return lines.join('\n');
    }

    this.appendChildren(children, '', lines);
    return lines.join('\n');
  }

  public formatSubtree(shape: Shape): string {
    const lines: string[] = [shape.describe()];
    const container = shape.asContainer();

    if (container !== null) {
      this.appendChildren(container.children, '', lines);
    }

    return lines.join('\n');
  }

  private appendChildren(
    children: readonly Shape[],
    prefix: string,
    lines: string[],
  ): void {
    children.forEach((shape, index) => {
      const last = index === children.length - 1;
      lines.push(`${prefix}${last ? '└──' : '├──'} ${shape.describe()}`);

      const container = shape.asContainer();
      if (container !== null) {
        this.appendChildren(
          container.children,
          `${prefix}${last ? '    ' : '│   '}`,
          lines,
        );
      }
    });
  }
}
