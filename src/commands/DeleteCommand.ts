import type { Document } from '../model/Document.js';
import type { Shape } from '../model/Shape.js';
import type { ShapeContainer } from '../model/ShapeContainer.js';
import type { Command } from './Command.js';

export class DeleteCommand implements Command {
  private readonly parent: ShapeContainer;
  private readonly index: number;

  public constructor(
    private readonly document: Document,
    private readonly target: Shape,
  ) {
    const parent = target.parent;

    if (parent === null) {
      throw new Error(`no such shape: ${target.id}`);
    }

    const index = parent.indexOf(target);
    if (index === -1) {
      throw new Error(`no such shape: ${target.id}`);
    }

    this.parent = parent;
    this.index = index;
  }

  public execute(): void {
    if (!this.parent.remove(this.target)) {
      throw new Error(`no such shape: ${this.target.id}`);
    }

    if (!this.document.unregisterDescendants(this.target)) {
      this.parent.insert(this.target, this.index);
      throw new Error('cannot delete shape subtree');
    }
  }

  public undo(): void {
    if (!this.document.registerDescendants(this.target)) {
      throw new Error('cannot restore deleted shape subtree');
    }

    if (!this.parent.insert(this.target, this.index)) {
      this.document.unregisterDescendants(this.target);
      throw new Error(`no such shape: ${this.target.id}`);
    }
  }
}
