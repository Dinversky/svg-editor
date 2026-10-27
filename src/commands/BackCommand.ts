import type { Document } from '../model/Document.js';
import type { Shape } from '../model/Shape.js';
import type { ShapeContainer } from '../model/ShapeContainer.js';
import type { Command } from './Command.js';

export class BackCommand implements Command {
  private readonly parent: ShapeContainer;
  private readonly originalIndex: number;

  public constructor(
    private readonly document: Document,
    private readonly target: Shape,
  ) {
    const parent = target.parent;

    if (parent === null || parent.indexOf(target) === -1) {
      throw new Error(`no such shape: ${target.id}`);
    }

    this.parent = parent;
    this.originalIndex = parent.indexOf(target);
  }

  public execute(): void {
    if (!this.document.moveShape(this.target, this.parent, 0)) {
      throw new Error('cannot reorder shape');
    }
  }

  public undo(): void {
    if (!this.document.moveShape(this.target, this.parent, this.originalIndex)) {
      throw new Error('cannot restore shape order');
    }
  }
}
