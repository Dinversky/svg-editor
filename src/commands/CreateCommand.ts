import type { Shape } from '../model/Shape.js';
import type { ShapeContainer } from '../model/ShapeContainer.js';
import type { Command } from './Command.js';

export class CreateCommand implements Command {
  public constructor(
    private readonly shape: Shape,
    private readonly container: ShapeContainer,
  ) { }

  public execute(): void {
    if (!this.container.add(this.shape)) {
      throw new Error(`id already exists: ${this.shape.id}`);
    }
  }

  public undo(): void {
    if (this.shape.parent !== this.container) {
      throw new Error('cannot undo creation');
    }

    const nested = this.shape.asContainer();
    if (nested !== null && nested.children.length > 0) {
      throw new Error('cannot undo creation of non-empty container');
    }

    if (!this.container.remove(this.shape)) {
      throw new Error('cannot undo creation');
    }
  }
}
