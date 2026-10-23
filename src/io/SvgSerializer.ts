import { Canvas } from '../model/Canvas.js';

export class SvgSerializer {
  public serialize(canvas: Canvas): string {
    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">`,
    ];

    for (const shape of canvas.shapes) {
      lines.push(`  ${shape.toSvgElement()}`);
    }

    lines.push('</svg>');
    return `${lines.join('\n')}\n`;
  }
}
