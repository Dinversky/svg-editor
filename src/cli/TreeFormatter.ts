import { Document } from '../model/Document.js';

export class TreeFormatter {
  public format(document: Document): string {
    const children = document.root.children;
    const lines: string[] = [`svg (${document.width}x${document.height})`];

    if (children.length === 0) {
      lines.push('(empty)');
      return lines.join('\n');
    }

    children.forEach((shape, index) => {
      const branch = index === children.length - 1 ? '└──' : '├──';
      lines.push(`${branch} ${shape.describe()}`);
    });

    return lines.join('\n');
  }
}
