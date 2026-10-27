import type { Document } from '../model/Document.js';
import type { Shape } from '../model/Shape.js';
import type { ShapeContainer } from '../model/ShapeContainer.js';
import type { Command } from './Command.js';

export class UngroupCommand implements Command {
  private readonly parent: ShapeContainer;
  private readonly index: number;
  private readonly children: readonly Shape[];
  private readonly container: ShapeContainer;

  public constructor(
    private readonly document: Document,
    private readonly target: Shape,
  ) {
    const parent = target.parent;

    if (parent === null) {
      throw new Error(`no such shape: ${target.id}`);
    }

    const container = target.asContainer();
    if (container === null) {
      throw new Error(`not a container: ${target.id}`);
    }

    if (parent === document.root) {
      throw new Error(`cannot ungroup top-level container: ${target.id}`);
    }

    const index = parent.indexOf(target);
    if (index === -1) {
      throw new Error(`no such shape: ${target.id}`);
    }

    this.parent = parent;
    this.index = index;
    this.container = container;
    this.children = [...container.children];
  }

  public execute(): void {
    if (
      this.target.parent !== this.parent
      || this.parent.indexOf(this.target) !== this.index
    ) {
      throw new Error('cannot ungroup container');
    }

    this.assertChildrenInsideContainer();

    if (!this.parent.remove(this.target)) {
      throw new Error('cannot ungroup container');
    }

    for (let offset = 0; offset < this.children.length; offset += 1) {
      const child = this.children[offset];

      if (!this.container.remove(child)) {
        this.restoreGroup();
        throw new Error('cannot ungroup container');
      }

      if (!this.parent.insert(child, this.index + offset)) {
        this.restoreGroup();
        throw new Error('cannot ungroup container');
      }
    }
  }

  public undo(): void {
    if (this.target.parent !== null || this.container.children.length !== 0) {
      throw new Error('cannot regroup shapes');
    }

    for (let offset = 0; offset < this.children.length; offset += 1) {
      const child = this.children[offset];

      if (
        child.parent !== this.parent
        || this.parent.indexOf(child) !== this.index + offset
      ) {
        throw new Error('cannot regroup shapes');
      }
    }

    for (const child of this.children) {
      if (!this.parent.remove(child)) {
        throw new Error('cannot regroup shapes');
      }
    }

    if (!this.parent.insert(this.target, this.index)) {
      throw new Error('cannot regroup shapes');
    }

    for (const child of this.children) {
      if (!this.container.add(child)) {
        throw new Error('cannot regroup shapes');
      }
    }
  }

  private assertChildrenInsideContainer(): void {
    if (this.container.children.length !== this.children.length) {
      throw new Error('cannot ungroup container');
    }

    for (let offset = 0; offset < this.children.length; offset += 1) {
      if (
        this.container.children[offset] !== this.children[offset]
        || this.children[offset].parent !== this.container
      ) {
        throw new Error('cannot ungroup container');
      }
    }
  }

  private restoreGroup(): void {
    for (let offset = 0; offset < this.children.length; offset += 1) {
      const child = this.children[offset];

      if (child.parent === this.parent) {
        this.parent.remove(child);
      }
    }

    for (const child of this.children) {
      if (child.parent === null) {
        this.container.add(child);
      }
    }

    if (this.target.parent === null) {
      this.parent.insert(this.target, this.index);
    }
  }
}
