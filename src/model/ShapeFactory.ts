import { Rect } from './Rect.js';

export class ShapeFactory {
  public supports(type: string): boolean {
    return type === 'rect';
  }

  public createRect(
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fill?: string,
  ): Rect {
    return new Rect(id, x, y, width, height, fill);
  }
}
