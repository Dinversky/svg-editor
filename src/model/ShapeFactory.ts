import { Circle } from './Circle.js';
import { Ellipse } from './Ellipse.js';
import { Line } from './Line.js';
import { Rect } from './Rect.js';
import { Text } from './Text.js';

export class ShapeFactory {
  public supports(type: string): boolean {
    return type === 'rect'
      || type === 'circle'
      || type === 'ellipse'
      || type === 'line'
      || type === 'text';
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

  public createLine(
    id: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    stroke?: string,
  ): Line {
    return new Line(id, x1, y1, x2, y2, stroke);
  }

  public createText(id: string, x: number, y: number, content: string): Text {
    return new Text(id, x, y, content);
  }
}
