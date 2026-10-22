import { RectangleShape } from './RectangleShape.js';

export class ShapeFactory {
  public supports(type: string): boolean {
    return type === 'rect';
  }

  public createRectangle(
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fill?: string,
  ): RectangleShape {
    return new RectangleShape(id, x, y, width, height, fill);
  }
}
