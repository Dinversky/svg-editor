import { Document } from '../model/Document.js';

export class SvgSerializer {
  public serialize(document: Document): string {
    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<svg xmlns="http://www.w3.org/2000/svg" width="${document.width}" height="${document.height}" viewBox="0 0 ${document.width} ${document.height}">`,
    ];

    for (const shape of document.root.children) {
      lines.push(this.indentLines(shape.toSvgElement(), 2));
    }

    lines.push('</svg>');
    return `${lines.join('\n')}\n`;
  }

  private indentLines(value: string, spaces: number): string {
    const prefix = ' '.repeat(spaces);
    return value
      .split('\n')
      .map((line) => `${prefix}${line}`)
      .join('\n');
  }
}
