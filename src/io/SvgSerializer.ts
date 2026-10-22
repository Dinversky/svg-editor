import { Canvas } from '../model/Canvas.js';

export class SvgSerializer {
  public serialize(canvas: Canvas): string {
    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">`,
    ];

    for (const rectangle of canvas.shapes) {
      const fill = rectangle.fill === undefined
        ? ''
        : ` fill="${this.escapeAttribute(rectangle.fill)}"`;

      lines.push(
        `  <rect id="${this.escapeAttribute(rectangle.id)}" x="${rectangle.x}" y="${rectangle.y}" width="${rectangle.width}" height="${rectangle.height}"${fill}/>`,
      );
    }

    lines.push('</svg>');
    return `${lines.join('\n')}\n`;
  }

  private escapeAttribute(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }
}
