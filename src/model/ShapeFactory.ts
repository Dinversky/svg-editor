import { Circle } from './Circle.js';
import { Ellipse } from './Ellipse.js';
import { Group } from './Group.js';
import { Line } from './Line.js';
import { Rect } from './Rect.js';
import type { Shape } from './Shape.js';
import type { ShapeRegistry } from './ShapeRegistry.js';
import { Text } from './Text.js';

export interface ShapeCreation {
  readonly id: string;
  readonly numbers?: readonly number[];
  readonly fill?: string;
  readonly stroke?: string;
  readonly content?: string;
  readonly registry?: ShapeRegistry;
}

export type ShapeCreator = (creation: ShapeCreation) => Shape;

export class ShapeFactory {
  private readonly creators = new Map<string, ShapeCreator>();

  public constructor() {
    this.register('rect', (creation) => new Rect(
      creation.id,
      this.requireNumber(creation, 0, 'x'),
      this.requireNumber(creation, 1, 'y'),
      this.requireNumber(creation, 2, 'width'),
      this.requireNumber(creation, 3, 'height'),
      creation.fill,
    ));

    this.register('circle', (creation) => new Circle(
      creation.id,
      this.requireNumber(creation, 0, 'cx'),
      this.requireNumber(creation, 1, 'cy'),
      this.requireNumber(creation, 2, 'r'),
      creation.fill,
    ));

    this.register('ellipse', (creation) => new Ellipse(
      creation.id,
      this.requireNumber(creation, 0, 'cx'),
      this.requireNumber(creation, 1, 'cy'),
      this.requireNumber(creation, 2, 'rx'),
      this.requireNumber(creation, 3, 'ry'),
      creation.fill,
    ));

    this.register('line', (creation) => new Line(
      creation.id,
      this.requireNumber(creation, 0, 'x1'),
      this.requireNumber(creation, 1, 'y1'),
      this.requireNumber(creation, 2, 'x2'),
      this.requireNumber(creation, 3, 'y2'),
      creation.stroke,
    ));

    this.register('text', (creation) => new Text(
      creation.id,
      this.requireNumber(creation, 0, 'x'),
      this.requireNumber(creation, 1, 'y'),
      this.requireContent(creation),
    ));

    this.register('g', (creation) => new Group(
      creation.id,
      this.requireRegistry(creation),
    ));
  }

  public register(type: string, creator: ShapeCreator): void {
    const name = type.trim();

    if (name.length === 0) {
      throw new Error('shape type must not be empty');
    }

    if (this.creators.has(name)) {
      throw new Error(`shape type already registered: ${name}`);
    }

    this.creators.set(name, creator);
  }

  public has(type: string): boolean {
    return this.creators.has(type.trim());
  }

  public create(type: string, creation: ShapeCreation): Shape {
    const name = type.trim();
    const creator = this.creators.get(name);

    if (creator === undefined) {
      throw new Error(`unknown shape type: ${name} (is the plugin loaded?)`);
    }

    return creator(creation);
  }

  public types(): string[] {
    return [...this.creators.keys()];
  }

  private requireNumber(
    creation: ShapeCreation,
    index: number,
    name: string,
  ): number {
    const value = creation.numbers?.[index];

    if (value === undefined) {
      throw new Error(`missing shape parameter: ${name}`);
    }

    return value;
  }

  private requireContent(creation: ShapeCreation): string {
    if (creation.content === undefined) {
      throw new Error('missing shape parameter: content');
    }

    return creation.content;
  }

  private requireRegistry(creation: ShapeCreation): ShapeRegistry {
    if (creation.registry === undefined) {
      throw new Error('missing shape parameter: registry');
    }

    return creation.registry;
  }
}
