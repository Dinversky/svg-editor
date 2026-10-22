import { Canvas } from '../model/Canvas.js';

export class TreeFormatter {
  public format(canvas: Canvas): string {
    const lines: string[] = [`svg (${canvas.width}x${canvas.height})`];

    if (canvas.shapes.length === 0) {
      lines.push('(empty)');
      return lines.join('\n');
    }

    canvas.shapes.forEach((shape, index) => {
      const branch = index === canvas.shapes.length - 1 ? '└──' : '├──';
      const fill = shape.fill === undefined ? '' : ` fill=${shape.fill}`;
      lines.push(
        `${branch} rect#${shape.id} x=${shape.x} y=${shape.y} w=${shape.width} h=${shape.height}${fill}`,
      );
    });

    return lines.join('\n');
  }
}
