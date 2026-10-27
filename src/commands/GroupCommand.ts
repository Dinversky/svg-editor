import type { Document } from '../model/Document.js';
import type { Group } from '../model/Group.js';
import type { Shape } from '../model/Shape.js';
import type { ShapeContainer } from '../model/ShapeContainer.js';
import type { Command } from './Command.js';

interface GroupEntry {
  readonly shape: Shape;
  readonly parent: ShapeContainer;
  readonly index: number;
}

export class GroupCommand implements Command {
  private readonly entries: GroupEntry[];
  private readonly groupParent: ShapeContainer;
  private readonly firstIndex: number;
  private readonly group: Group;

  public constructor(
    private readonly document: Document,
    newGroupId: string,
    private readonly shapes: readonly Shape[],
  ) {
    if (shapes.length === 0) {
      throw new Error('group requires at least one shape');
    }

    const seen = new Set<string>();
    for (const shape of shapes) {
      if (seen.has(shape.id)) {
        throw new Error(`duplicate shape: ${shape.id}`);
      }

      seen.add(shape.id);
    }

    this.entries = shapes.map((shape) => {
      const parent = shape.parent;

      if (parent === null || parent.indexOf(shape) === -1) {
        throw new Error(`no such shape: ${shape.id}`);
      }

      return { shape, parent, index: parent.indexOf(shape) };
    });

    if (document.hasShape(newGroupId)) {
      throw new Error(`id already exists: ${newGroupId}`);
    }

    this.assertNoSelectedAncestor(shapes);

    this.groupParent = this.entries[0].parent;
    this.firstIndex = this.entries[0].index;
    this.group = document.createGroup(newGroupId);
  }

  public execute(): void {
    if (this.document.hasShape(this.group.id)) {
      throw new Error(`id already exists: ${this.group.id}`);
    }

    if (this.group.parent !== null || this.group.children.length !== 0) {
      throw new Error('cannot group shapes');
    }

    for (const entry of this.entries) {
      if (
        entry.shape.parent !== entry.parent
        || entry.parent.indexOf(entry.shape) !== entry.index
      ) {
        throw new Error('cannot group shapes');
      }
    }

    for (const entry of this.entries) {
      if (!entry.parent.remove(entry.shape)) {
        this.restoreEntries();
        throw new Error('cannot group shapes');
      }
    }

    const insertionIndex = Math.min(
      this.firstIndex,
      this.groupParent.children.length,
    );

    for (const shape of this.shapes) {
      if (!this.group.add(shape)) {
        this.restoreEntries();
        throw new Error('cannot group shapes');
      }
    }

    if (!this.groupParent.insert(this.group, insertionIndex)) {
      this.restoreEntries();
      throw new Error('cannot group shapes');
    }
  }

  public undo(): void {
    if (
      this.group.parent !== this.groupParent
      || this.group.children.length !== this.shapes.length
    ) {
      throw new Error('cannot ungroup shapes');
    }

    for (const shape of this.shapes) {
      if (shape.parent !== this.group) {
        throw new Error('cannot ungroup shapes');
      }
    }

    this.restoreEntries();
  }

  private assertNoSelectedAncestor(shapes: readonly Shape[]): void {
    const selected = new Set<Shape>(shapes);

    for (const shape of shapes) {
      let ancestor: ShapeContainer | null = shape.parent;

      while (ancestor !== null) {
        const selectedAncestor = ancestor as unknown as Shape;

        if (selected.has(selectedAncestor)) {
          throw new Error(
            `cannot group a container into its own descendant: ${selectedAncestor.id}`,
          );
        }

        ancestor = ancestor.parent;
      }
    }
  }

  private restoreEntries(): void {
    for (const shape of this.shapes) {
      if (shape.parent === this.group) {
        this.group.remove(shape);
      }
    }

    if (this.group.parent !== null) {
      this.group.parent.remove(this.group);
    }

    const sorted = [...this.entries].sort((left, right) => left.index - right.index);

    for (const entry of sorted) {
      if (entry.shape.parent !== null) {
        continue;
      }

      if (!entry.parent.insert(entry.shape, entry.index)) {
        throw new Error('cannot restore grouped shapes');
      }
    }
  }
}
