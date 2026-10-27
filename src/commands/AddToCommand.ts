import type { Document } from '../model/Document.js';
import type { Shape } from '../model/Shape.js';
import type { ShapeContainer } from '../model/ShapeContainer.js';
import type { Command } from './Command.js';

export class AddToCommand implements Command {
  private readonly sourceParent: ShapeContainer;
  private readonly originalIndex: number;

  public constructor(
    private readonly document: Document,
    private readonly target: Shape,
    private readonly container: ShapeContainer,
  ) {
    const parent = target.parent;

    if (parent === null || parent.indexOf(target) === -1) {
      throw new Error(`no such shape: ${target.id}`);
    }

    this.sourceParent = parent;
    this.originalIndex = parent.indexOf(target);
    this.assertNoCycle();
  }

  public execute(): void {
    const targetIndex = this.container === this.target.parent
      ? this.container.children.length - 1
      : this.container.children.length;

    if (!this.document.moveShape(this.target, this.container, targetIndex)) {
      throw new Error('cannot add shape to container');
    }
  }

  public undo(): void {
    if (!this.document.moveShape(this.target, this.sourceParent, this.originalIndex)) {
      throw new Error('cannot restore shape position');
    }
  }

  private assertNoCycle(): void {
    const targetContainer = this.target.asContainer();

    if (targetContainer === null) {
      return;
    }

    let ancestor: ShapeContainer | null = this.container;

    while (ancestor !== null) {
      if (ancestor === targetContainer) {
        throw new Error(
          `cannot move a container into its own descendant: ${this.target.id}`,
        );
      }

      ancestor = ancestor.parent;
    }
  }
}
