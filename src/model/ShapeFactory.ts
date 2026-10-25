import { Circle } from './Circle.js';
import { Ellipse } from './Ellipse.js';
import { Rect } from './Rect.js';

export class ShapeFactory {
  public supports(type: string): boolean {
    return type === 'rect' || type === 'circle' || type === 'ellipse';
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

  public createCircle(
    id: string,
    cx: number,
    cy: number,
    radius: number,
    fill?: string,
  ): Circle {
    return new Circle(id, cx, cy, radius, fill);
  }

  public createEllipse(
    id: string,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    fill?: string,
  ): Ellipse {
    return new Ellipse(id, cx, cy, rx, ry, fill);
  }
}
