import type { Shape } from './Shape.js';

export interface ShapeContainer {
  readonly children: readonly Shape[];
  readonly parent: ShapeContainer | null;
  describe(): string;
  add(shape: Shape): boolean;
  insert(shape: Shape, index: number): boolean;
  remove(shape: Shape): boolean;
  hasChild(shape: Shape): boolean;
  indexOf(shape: Shape): number;
}
