import type { Shape } from './Shape.js';

export interface ShapeContainer {
  readonly children: readonly Shape[];
  add(shape: Shape): boolean;
  remove(shape: Shape): boolean;
  hasChild(shape: Shape): boolean;
}
